/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import {
  ChartProps,
  DataRecord,
  getCategoricalSchemeRegistry,
  getMetricLabel,
} from '@superset-ui/core';

import type {
  QueryFormColumn,
  QueryFormMetric,
} from '@superset-ui/core';

import {
  BulletChartColorMode,
  BulletChartColors,
  BulletChartDatum,
  BulletChartFormData,
  BulletChartProps,
  BulletChartCategoryLabelAlign,
} from '../types';

function normalizeCategoryLabelAlign(
  value: unknown,
): BulletChartCategoryLabelAlign {
  if (value === 'left' || value === 'center' || value === 'right') {
    return value;
  }

  return 'right';
}

function isQueryFormColumn(column: unknown): column is QueryFormColumn {
  if (typeof column === 'string') {
    return column.length > 0;
  }

  return typeof column === 'object' && column !== null;
}

function normalizeGroupby(groupby: unknown): QueryFormColumn[] {
  if (!groupby) {
    return [];
  }

  if (Array.isArray(groupby)) {
    return groupby.filter(isQueryFormColumn);
  }

  return isQueryFormColumn(groupby) ? [groupby] : [];
}

function getColumnKey(column: QueryFormColumn): string {
  if (typeof column === 'string') {
    return column;
  }

  const adhocColumn = column as unknown as {
    label?: string;
    sqlExpression?: string;
    column_name?: string;
  };

  return String(
    adhocColumn.label ||
      adhocColumn.sqlExpression ||
      adhocColumn.column_name ||
      '',
  );
}

function buildLabel(row: DataRecord, groupby: QueryFormColumn[]): string {
  if (!groupby.length) {
    return 'Total';
  }

  return groupby
    .map(getColumnKey)
    .map(key => row[key])
    .filter(value => value !== null && value !== undefined && value !== '')
    .map(String)
    .join(' / ');
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const normalized = String(value)
    .replace(/\s/g, '')
    .replace(',', '.');

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeNumber(
  value: unknown,
  fallback: number,
  min?: number,
  max?: number,
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  if (min !== undefined && parsed < min) {
    return min;
  }

  if (max !== undefined && parsed > max) {
    return max;
  }

  return parsed;
}

function metricKey(metric: QueryFormMetric | undefined): string {
  if (!metric) {
    return '';
  }

  return getMetricLabel(metric);
}

function getMetricValue(
  row: DataRecord,
  metric: QueryFormMetric | undefined,
  fallbackIndex: number,
  groupby: QueryFormColumn[],
): unknown {
  const key = metricKey(metric);

  if (key && row[key] !== undefined) {
    return row[key];
  }

  const groupbyKeys = groupby.map(getColumnKey).filter(Boolean);
  const nonGroupKeys = Object.keys(row).filter(
    rowKey => !groupbyKeys.includes(rowKey),
  );

  const fallbackKey = nonGroupKeys[fallbackIndex];

  return fallbackKey ? row[fallbackKey] : undefined;
}

function getPaletteColors(colorScheme?: string): string[] {
  const fallbackColors = ['#1FA8C9', '#454E7C', '#666666'];

  try {
    const registry = getCategoricalSchemeRegistry();
    const defaultKey = registry.getDefaultKey();
    const schemeKey = colorScheme || defaultKey;
    const scheme = registry.get(schemeKey) as unknown as
      | { colors?: string[] }
      | undefined;

    if (Array.isArray(scheme?.colors) && scheme.colors.length > 0) {
      return scheme.colors;
    }

    return fallbackColors;
  } catch {
    return fallbackColors;
  }
}

function colorPickerToCss(value: unknown, fallback: string): string {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'string') {
    return value;
  }

  const color = value as Partial<{
    r: number;
    g: number;
    b: number;
    a: number;
    hex: string;
    value: string;
  }>;

  if (typeof color.hex === 'string' && color.hex.length > 0) {
    return color.hex;
  }

  if (typeof color.value === 'string' && color.value.length > 0) {
    return color.value;
  }

  const { r, g, b } = color;
  const a = color.a ?? 1;

  if (
    typeof r !== 'number' ||
    typeof g !== 'number' ||
    typeof b !== 'number'
  ) {
    return fallback;
  }

  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function getSelectedColorScheme(
  formData: BulletChartFormData,
): string | undefined {
  return formData.color_scheme || formData.colorScheme;
}

function getChartColors(formData: BulletChartFormData): BulletChartColors {
  const palette = getPaletteColors(getSelectedColorScheme(formData));

  const paletteColors: BulletChartColors = {
    good: palette[0] || '#1FA8C9',
    bad: palette[1] || palette[0] || '#454E7C',
    target: palette[2] || palette[1] || palette[0] || '#666666',
  };

  if (formData.colorSource !== 'custom') {
    return paletteColors;
  }

  return {
    good: colorPickerToCss(formData.goodColor, paletteColors.good),
    bad: colorPickerToCss(formData.badColor, paletteColors.bad),
    target: colorPickerToCss(formData.targetColor, paletteColors.target),
  };
}

function normalizeColorMode(value: unknown): BulletChartColorMode {
  return value === 'single' ? 'single' : 'status';
}

export default function transformProps(
  chartProps: ChartProps,
): BulletChartProps {
  const { width, height, formData, queriesData } = chartProps;

  const bulletFormData = formData as BulletChartFormData;

  const {
    actualMetric,
    targetMetric,
    sortByPercent,
  } = bulletFormData;

  const groupby = normalizeGroupby(bulletFormData.groupby);
  const rawData = (queriesData?.[0]?.data || []) as DataRecord[];

  const data: BulletChartDatum[] = rawData
    .map((row: DataRecord): BulletChartDatum => {
      const actual = toNumber(
        getMetricValue(row, actualMetric, 0, groupby),
      );

      const target = toNumber(
        getMetricValue(row, targetMetric, 1, groupby),
      );

      const percent = target > 0 ? (actual / target) * 100 : null;

      return {
        label: buildLabel(row, groupby),
        actual,
        target,
        percent,
        isGood: target > 0 && actual >= target,
      };
    })
    .filter((row: BulletChartDatum) => row.label);

  if (sortByPercent !== false) {
    data.sort(
      (a: BulletChartDatum, b: BulletChartDatum) =>
        (b.percent ?? -Infinity) - (a.percent ?? -Infinity),
    );
  }

  return {
    width,
    height,
    data,

    chartColors: getChartColors(bulletFormData),
    colorMode: normalizeColorMode(bulletFormData.colorMode),

    showValues: bulletFormData.showValues !== false,
    showPercent: bulletFormData.showPercent !== false,
    numberFormat: String(bulletFormData.numberFormat || ',d'),
    percentDecimals: normalizeNumber(
      bulletFormData.percentDecimals,
      1,
      0,
      4,
    ),
    barThickness: normalizeNumber(
      bulletFormData.barThickness,
      10,
      4,
      24,
    ),
    rowGap: normalizeNumber(bulletFormData.rowGap, 10, 4, 24),
    targetLineWidth: normalizeNumber(
      bulletFormData.targetLineWidth,
      2,
      1,
      6,
    ),
    categoryLabelAlign: normalizeCategoryLabelAlign(
      bulletFormData.categoryLabelAlign,
    ),
  };
}