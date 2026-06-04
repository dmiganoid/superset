import type { EChartsCoreOption } from 'echarts/core';
import type { SeriesOption } from 'echarts';

type RangeAxis = 'x' | 'y';

type RangeColor =
  | string
  | {
      r: number;
      g: number;
      b: number;
      a?: number;
    };

type RangeBounds = [
  number | string | null | undefined,
  number | string | null | undefined,
];

type MarkLineDatum = Record<string, unknown>;

const FALLBACK_SERIES_COLORS = [
  '#1f77b4',
  '#ff7f0e',
  '#2ca02c',
  '#d62728',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#7f7f7f',
  '#bcbd22',
  '#17becf',
];

function colorToString(color: RangeColor | undefined, fallback: string) {
  if (!color) {
    return fallback;
  }

  if (typeof color === 'string') {
    return color;
  }

  const { r, g, b, a = 1 } = color;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function withAlpha(color: string, alpha: number) {
  const value = color.trim();

  const shortHexMatch = value.match(/^#([0-9a-f]{3})$/i);
  if (shortHexMatch) {
    const [r, g, b] = shortHexMatch[1]
      .split('')
      .map(char => parseInt(`${char}${char}`, 16));

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const hexMatch = value.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];

    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const rgbMatch = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbMatch) {
    const [r, g, b] = rgbMatch[1]
      .split(',')
      .slice(0, 3)
      .map(part => Number(part.trim()));

    if ([r, g, b].every(Number.isFinite)) {
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }

  return color;
}

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? timestamp : undefined;
  }

  if (typeof value === 'string') {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) {
      return asNumber;
    }

    const asDate = Date.parse(value);
    if (Number.isFinite(asDate)) {
      return asDate;
    }
  }

  return undefined;
}

function normalizeBounds(bounds?: RangeBounds): [number, number] | undefined {
  const [rawMin, rawMax] = bounds || [];

  const min = toNumber(rawMin);
  const max = toNumber(rawMax);

  if (min === undefined || max === undefined) {
    return undefined;
  }

  return min <= max ? [min, max] : [max, min];
}

function getDatumValue(datum: unknown): unknown[] | undefined {
  if (Array.isArray(datum)) {
    return datum;
  }

  if (
    datum &&
    typeof datum === 'object' &&
    'value' in datum &&
    Array.isArray((datum as { value?: unknown }).value)
  ) {
    return (datum as { value: unknown[] }).value;
  }

  return undefined;
}

function setDatumValue(datum: unknown, value: unknown[]) {
  if (
    datum &&
    typeof datum === 'object' &&
    !Array.isArray(datum) &&
    'value' in datum
  ) {
    return {
      ...(datum as object),
      value,
    };
  }

  return value;
}

function addBaseEncode(series: SeriesOption): SeriesOption {
  return {
    ...series,
    encode: {
      ...((series as any).encode || {}),
      x: 0,
      y: 1,
    },
  };
}

function getSeriesColor(series: SeriesOption, fallback: string) {
  const lineStyleColor = (series as any)?.lineStyle?.color;
  const itemStyleColor = (series as any)?.itemStyle?.color;

  if (typeof lineStyleColor === 'string') {
    return lineStyleColor;
  }

  if (typeof itemStyleColor === 'string') {
    return itemStyleColor;
  }

  return fallback;
}

function normalizeDatumX(datum: unknown, isHorizontal: boolean) {
  const value = getDatumValue(datum);

  if (!value) {
    return datum;
  }

  const xIndex = isHorizontal ? 1 : 0;
  const normalizedX = toNumber(value[xIndex]);

  if (normalizedX === undefined) {
    return datum;
  }

  const nextValue = [...value];
  nextValue[xIndex] = normalizedX;

  return setDatumValue(datum, nextValue);
}

function normalizeXCoordinate(
  series: SeriesOption,
  isHorizontal: boolean,
): SeriesOption {
  const encodedSeries = addBaseEncode(series);

  if (!Array.isArray((series as any).data)) {
    return encodedSeries;
  }

  return {
    ...(encodedSeries as any),
    data: ((series as any).data as unknown[]).map(datum =>
      normalizeDatumX(datum, isHorizontal),
    ),
  } as SeriesOption;
}

function nullMetricDatum(datum: unknown, isHorizontal: boolean) {
  const value = getDatumValue(datum);

  if (!value) {
    return datum;
  }

  const metricIndex = isHorizontal ? 0 : 1;
  const nextValue = [...value];

  nextValue[metricIndex] = null;

  return setDatumValue(datum, nextValue);
}

function createBoundaryDatum(
  previousDatum: unknown,
  nextDatum: unknown,
  splitX: number,
  isHorizontal: boolean,
) {
  const previousValue = getDatumValue(previousDatum);
  const nextValue = getDatumValue(nextDatum);

  if (!previousValue || !nextValue) {
    return undefined;
  }

  const xIndex = isHorizontal ? 1 : 0;
  const metricIndex = isHorizontal ? 0 : 1;

  const x0 = toNumber(previousValue[xIndex]);
  const x1 = toNumber(nextValue[xIndex]);
  const y0 = toNumber(previousValue[metricIndex]);
  const y1 = toNumber(nextValue[metricIndex]);

  if (
    x0 === undefined ||
    x1 === undefined ||
    y0 === undefined ||
    y1 === undefined ||
    x0 === x1
  ) {
    return undefined;
  }

  const t = (splitX - x0) / (x1 - x0);

  if (t <= 0 || t >= 1) {
    return undefined;
  }

  const boundaryValue = [...previousValue];

  boundaryValue[xIndex] = splitX;
  boundaryValue[metricIndex] = y0 + (y1 - y0) * t;

  return setDatumValue(previousDatum, boundaryValue);
}

function insertBoundaryDatum(
  data: unknown[],
  splitX: number,
  isHorizontal: boolean,
) {
  const normalizedData = data.map(datum => normalizeDatumX(datum, isHorizontal));
  const result: unknown[] = [];

  normalizedData.forEach((datum, index) => {
    if (index > 0) {
      const previousDatum = normalizedData[index - 1];

      const previousValue = getDatumValue(previousDatum);
      const currentValue = getDatumValue(datum);

      const xIndex = isHorizontal ? 1 : 0;

      const previousX = previousValue
        ? toNumber(previousValue[xIndex])
        : undefined;

      const currentX = currentValue
        ? toNumber(currentValue[xIndex])
        : undefined;

      if (
        previousX !== undefined &&
        currentX !== undefined &&
        (previousX - splitX) * (currentX - splitX) < 0
      ) {
        const boundaryDatum = createBoundaryDatum(
          previousDatum,
          datum,
          splitX,
          isHorizontal,
        );

        if (boundaryDatum) {
          result.push(boundaryDatum);
        }
      }
    }

    result.push(datum);
  });

  return result;
}

function splitSeriesByX(args: {
  series: SeriesOption;
  splitX: number;
  isHorizontal: boolean;
  pastColor: string;
}): {
  pastSeries?: SeriesOption;
  futureSeries: SeriesOption;
} {
  const { series, splitX, isHorizontal, pastColor } = args;

  const encodedSeries = addBaseEncode(series);
  const encodedSeriesAny = encodedSeries as any;

  if (!Array.isArray(encodedSeriesAny.data)) {
    return {
      pastSeries: undefined,
      futureSeries: encodedSeries,
    };
  }

  const xIndex = isHorizontal ? 1 : 0;
  const dataWithBoundary = insertBoundaryDatum(
    encodedSeriesAny.data as unknown[],
    splitX,
    isHorizontal,
  );

  const pastData: any[] = [];
  const futureData: any[] = [];

  dataWithBoundary.forEach(datum => {
    const value = getDatumValue(datum);
    const xValue = value ? toNumber(value[xIndex]) : undefined;

    if (xValue === undefined) {
      pastData.push(nullMetricDatum(datum, isHorizontal));
      futureData.push(nullMetricDatum(datum, isHorizontal));
      return;
    }

    if (xValue < splitX) {
      pastData.push(datum);
      futureData.push(nullMetricDatum(datum, isHorizontal));
    } else if (xValue === splitX) {
      pastData.push(datum);
      futureData.push(datum);
    } else {
      pastData.push(nullMetricDatum(datum, isHorizontal));
      futureData.push(datum);
    }
  });

  const id = String(encodedSeriesAny.id || series.name || 'series');

  const pastSeries = {
    ...encodedSeriesAny,
    id: `${id}__range_past`,
    name: series.name,
    data: pastData,
    itemStyle: {
      ...(encodedSeriesAny.itemStyle || {}),
      color: pastColor,
    },
    lineStyle: {
      ...(encodedSeriesAny.lineStyle || {}),
      color: pastColor,
    },
    z: (encodedSeriesAny.z || 0) + 1,
  } as SeriesOption;

  const futureSeries = {
    ...encodedSeriesAny,
    id: `${id}__range_future`,
    name: series.name,
    data: futureData,
    z: (encodedSeriesAny.z || 0) + 2,
  } as SeriesOption;

  return {
    pastSeries,
    futureSeries,
  };
}

export function applyRangeColoring(args: {
  series: SeriesOption[];
  enabled?: boolean;
  rangeAxis?: RangeAxis;
  bounds?: RangeBounds;
  isHorizontal: boolean;
  insideColor?: RangeColor;
  outsideColor?: RangeColor;
  xSeparatorEnabled?: boolean;
  xSeparatorValue?: number;
  pastColor?: RangeColor;
}): {
  series: SeriesOption[];
  visualMap?: EChartsCoreOption['visualMap'];
} {
  const {
    series,
    enabled,
    rangeAxis = 'y',
    bounds,
    isHorizontal,
    insideColor,
    outsideColor,
    xSeparatorEnabled,
    xSeparatorValue,
    pastColor,
  } = args;

  const normalizedBounds = normalizeBounds(bounds);

  const shouldApplyRangeColor = Boolean(enabled && normalizedBounds);

  const splitX =
    xSeparatorEnabled && xSeparatorValue !== undefined
      ? xSeparatorValue
      : undefined;

  if (!shouldApplyRangeColor && splitX === undefined) {
    return { series };
  }

  const lineSeriesMeta: {
    seriesIndex: number;
    series: SeriesOption;
    order: number;
  }[] = [];

  const nextSeries: SeriesOption[] = [];

  series.forEach(item => {
    if (item.type !== 'line' || !Array.isArray(item.data)) {
      nextSeries.push(item);
      return;
    }

    const preparedSeries =
      rangeAxis === 'x' || splitX !== undefined
        ? normalizeXCoordinate(item, isHorizontal)
        : addBaseEncode(item);

    let finalSeries = preparedSeries;

    if (splitX !== undefined) {
      const pastColorString = colorToString(pastColor, '#a0a0a0');

      const { pastSeries, futureSeries } = splitSeriesByX({
        series: preparedSeries,
        splitX,
        isHorizontal,
        pastColor: pastColorString,
      });

      if (pastSeries) {
        nextSeries.push(pastSeries);
      }

      finalSeries = futureSeries;
    }

    const visualMapSeriesIndex = nextSeries.length;
    nextSeries.push(finalSeries);

    if (shouldApplyRangeColor) {
      lineSeriesMeta.push({
        seriesIndex: visualMapSeriesIndex,
        series: finalSeries,
        order: lineSeriesMeta.length,
      });
    }
  });

  if (!shouldApplyRangeColor || !normalizedBounds || !lineSeriesMeta.length) {
    return { series: nextSeries };
  }

  const [min, max] = normalizedBounds;

  const dimension =
    rangeAxis === 'x'
      ? isHorizontal
        ? 1
        : 0
      : isHorizontal
        ? 0
        : 1;

  const useOriginalSeriesColors = lineSeriesMeta.length > 1;

  const visualMaps = lineSeriesMeta.map(({ seriesIndex, series, order }) => {
    const baseColor = getSeriesColor(
      series,
      FALLBACK_SERIES_COLORS[order % FALLBACK_SERIES_COLORS.length],
    );

    const currentInsideColor = useOriginalSeriesColors
      ? baseColor
      : colorToString(insideColor, baseColor);

    const currentOutsideColor = useOriginalSeriesColors
      ? withAlpha(baseColor, 0.3)
      : colorToString(outsideColor, withAlpha(baseColor, 0.3));

    return {
      show: false,
      type: 'piecewise',
      dimension,
      seriesIndex,
      pieces: [
        {
          lt: min,
          color: currentOutsideColor,
        },
        {
          gte: min,
          lte: max,
          color: currentInsideColor,
        },
        {
          gt: max,
          color: currentOutsideColor,
        },
      ],
      outOfRange: {
        color: currentOutsideColor,
      },
    };
  });

  return {
    series: nextSeries,
    visualMap: visualMaps.length === 1 ? visualMaps[0] : visualMaps,
  };
}

export function createRangeBoundaryMarkLines(args: {
  enabled?: boolean;
  rangeAxis?: RangeAxis;
  bounds?: RangeBounds;
  isHorizontal: boolean;
}): MarkLineDatum[] {
  const {
    enabled,
    rangeAxis = 'y',
    bounds,
    isHorizontal,
  } = args;

  const normalizedBounds = normalizeBounds(bounds);

  if (!enabled || !normalizedBounds) {
    return [];
  }

  const [min, max] = normalizedBounds;

  const axisKey =
    rangeAxis === 'y'
      ? isHorizontal
        ? 'xAxis'
        : 'yAxis'
      : isHorizontal
        ? 'yAxis'
        : 'xAxis';

  return [
    {
      name: 'Lower bound',
      [axisKey]: min,
      label: {
        show: false,
      },
      lineStyle: {
        type: 'dashed',
        color: '#888',
        width: 1,
      },
    },
    {
      name: 'Upper bound',
      [axisKey]: max,
      label: {
        show: false,
      },
      lineStyle: {
        type: 'dashed',
        color: '#888',
        width: 1,
      },
    },
  ];
}

export function createXSeparatorMarkLine(args: {
  enabled?: boolean;
  separatorValue?: number;
  isHorizontal: boolean;
  color?: RangeColor;
  label?: string;
}): MarkLineDatum | undefined {
  const {
    enabled,
    separatorValue,
    isHorizontal,
    color,
    label = 'Separator',
  } = args;

  if (!enabled || separatorValue === undefined) {
    return undefined;
  }

  const axisKey = isHorizontal ? 'yAxis' : 'xAxis';
  const separatorColor = colorToString(color, '#5a5a5a');

  return {
    name: label,
    [axisKey]: separatorValue,
    label: {
      formatter: label,
    },
    lineStyle: {
      type: 'dashed',
      color: separatorColor,
      width: 1,
    },
  };
}

export function appendMarkLinesToFirstLineSeries(
  series: SeriesOption[],
  markLines: MarkLineDatum[],
): SeriesOption[] {
  if (!markLines.length) {
    return series;
  }

  const targetIndex = series.findIndex(item => item.type === 'line');

  if (targetIndex === -1) {
    return series;
  }

  return series.map((item, index) => {
    if (index !== targetIndex) {
      return item;
    }

    const currentMarkLine = (item as any).markLine || {};
    const currentData = Array.isArray(currentMarkLine.data)
      ? currentMarkLine.data
      : [];

    return {
      ...item,
      markLine: {
        ...currentMarkLine,
        silent: true,
        symbol: 'none',
        data: [...currentData, ...markLines],
      },
    };
  });
}