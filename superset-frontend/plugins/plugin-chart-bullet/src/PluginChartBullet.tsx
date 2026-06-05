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
import React, { useMemo } from 'react';
import { getNumberFormatter } from '@superset-ui/core';
import styled from '@emotion/styled';

import {
  BulletChartColorMode,
  BulletChartColors,
  BulletChartProps,
  BulletChartCategoryLabelAlign,
} from './types';

type ThemedProps = {
  theme?: unknown;
};

type RootProps = {
  $width: number;
  $height: number;
};

type BodyProps = {
  $rowGap: number;
};

type RowProps = {
  $compact: boolean;
  $showValues: boolean;
  $showPercent: boolean;
};

type LabelProps = {
  $compact: boolean;
  $labelAlign: BulletChartCategoryLabelAlign;
};

type ColorStateProps = {
  $isGood: boolean;
  $colorMode: BulletChartColorMode;
  $chartColors: BulletChartColors;
};

type ValueProps = ColorStateProps & {
  $compact: boolean;
};

type PercentProps = ColorStateProps;

type TrackProps = {
  $barThickness: number;
};

type BarProps = ColorStateProps & {
  $widthPercent: string;
  $barThickness: number;
};

type TargetProps = {
  $leftPercent: string;
  $targetLineWidth: number;
  $chartColors: BulletChartColors;
};

function getToken(theme: unknown, path: string[], fallback: string): string {
  let current: unknown = theme;

  for (const key of path) {
    if (typeof current !== 'object' || current === null) {
      return fallback;
    }

    current = (current as Record<string, unknown>)[key];

    if (current === undefined || current === null) {
      return fallback;
    }
  }

  return typeof current === 'string' ? current : fallback;
}

function getActualColor(
  colors: BulletChartColors,
  colorMode: BulletChartColorMode,
  isGood: boolean,
): string {
  if (colorMode === 'single') {
    return colors.good;
  }

  return isGood ? colors.good : colors.bad;
}

const fallbackChartColors: BulletChartColors = {
  good: '#1FA8C9',
  bad: '#454E7C',
  target: '#666666',
};

const Root = styled.div<RootProps>`
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: ${({ $width }: RootProps) => $width}px;
  height: ${({ $height }: RootProps) => $height}px;
  padding: 8px 12px;
  overflow: hidden;
  color: ${({ theme }: ThemedProps) =>
    getToken(theme, ['colors', 'grayscale', 'dark2'], '#262626')};
  font-family: inherit;
`;

const EmptyRoot = styled(Root)`
  align-items: center;
  justify-content: center;
  color: ${({ theme }: ThemedProps) =>
    getToken(theme, ['colors', 'grayscale', 'base'], '#8c8c8c')};
  font-size: 14px;
`;

const Body = styled.div<BodyProps>`
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: ${({ $rowGap }: BodyProps) => $rowGap}px;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
`;

function getGridTemplateColumns(props: RowProps) {
  const columns = ['minmax(80px, 150px)'];

  if (props.$showValues) {
    columns.push('minmax(120px, 200px)');
  }

  if (props.$showPercent) {
    columns.push('68px');
  }

  columns.push('minmax(120px, 1fr)');

  return columns.join(' ');
}

function getGridTemplateAreas(props: RowProps) {
  if (props.$compact) {
    if (props.$showValues && props.$showPercent) {
      return `
        "label percent"
        "value value"
        "track track"
      `;
    }

    if (props.$showValues && !props.$showPercent) {
      return `
        "label label"
        "value value"
        "track track"
      `;
    }

    if (!props.$showValues && props.$showPercent) {
      return `
        "label percent"
        "track track"
      `;
    }

    return `
      "label label"
      "track track"
    `;
  }

  const areas = ['label'];

  if (props.$showValues) {
    areas.push('value');
  }

  if (props.$showPercent) {
    areas.push('percent');
  }

  areas.push('track');

  return `"${areas.join(' ')}"`;
}

const Row = styled.div<RowProps>`
  display: grid;
  grid-template-columns: ${({
  $compact,
  $showValues,
  $showPercent,
}: RowProps) =>
    $compact
      ? $showPercent
        ? 'minmax(0, 1fr) 68px'
        : 'minmax(0, 1fr)'
      : getGridTemplateColumns({ $compact, $showValues, $showPercent })};
  grid-template-areas: ${({
        $compact,
        $showValues,
        $showPercent,
      }: RowProps) =>
    getGridTemplateAreas({ $compact, $showValues, $showPercent })};
  gap: ${({ $compact }: RowProps) => ($compact ? '4px 8px' : '10px')};
  align-items: center;
  min-width: 0;
  margin: -2px -4px;
  padding: 2px 4px;
  border-radius: 4px;
  transition:
    background-color 120ms ease,
    box-shadow 120ms ease;

  &:hover {
    background-color: ${({ theme }: ThemedProps) =>
    getToken(theme, ['colors', 'grayscale', 'light4'], '#fafafa')};
  }

  &:hover .plugin-chart-bullet__track {
    box-shadow: inset 0 0 0 1px
      ${({ theme }: ThemedProps) =>
    getToken(theme, ['colors', 'grayscale', 'light1'], '#d9d9d9')};
  }

  &:hover .plugin-chart-bullet__bar {
    filter: brightness(0.96);
  }

  &:hover .plugin-chart-bullet__target {
    opacity: 0.9;
  }
`;

const Label = styled.div<LabelProps>`
  grid-area: label;
  min-width: 0;
  overflow: hidden;
  text-align: ${({ $labelAlign }: LabelProps) => $labelAlign};
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
`;

const Value = styled.div<ValueProps>`
  grid-area: value;
  min-width: 0;
  overflow: hidden;
  color: ${({ $chartColors, $colorMode, $isGood }: ValueProps) =>
    getActualColor($chartColors, $colorMode, $isGood)};
  text-align: ${({ $compact }: ValueProps) =>
    $compact ? 'left' : 'center'};
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 600;
`;

const Percent = styled.div<PercentProps>`
  box-sizing: border-box;
  grid-area: percent;
  min-width: 60px;
  padding: 1px 6px;
  border: 1px solid
    ${({ $chartColors, $colorMode, $isGood }: PercentProps) =>
    getActualColor($chartColors, $colorMode, $isGood)};
  border-radius: 4px;
  color: ${({ $chartColors, $colorMode, $isGood }: PercentProps) =>
    getActualColor($chartColors, $colorMode, $isGood)};
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
`;

const Track = styled.div<TrackProps>`
  position: relative;
  grid-area: track;
  min-width: 100px;
  height: ${({ $barThickness }: TrackProps) =>
    Math.max($barThickness * 2, 18)}px;
  overflow: hidden;
  background: ${({ theme }: ThemedProps) =>
    getToken(theme, ['colors', 'grayscale', 'light3'], '#f5f5f5')};
  border-radius: 3px;
  transition: box-shadow 120ms ease;
`;

const Bar = styled.div<BarProps>`
  position: absolute;
  top: 50%;
  left: 0;
  width: ${({ $widthPercent }: BarProps) => $widthPercent};
  height: ${({ $barThickness }: BarProps) => $barThickness}px;
  border-radius: 2px;
  background-color: ${({ $chartColors, $colorMode, $isGood }: BarProps) =>
    getActualColor($chartColors, $colorMode, $isGood)};
  transform: translateY(-50%);
  transition:
    width 160ms ease,
    filter 120ms ease;
`;

const Target = styled.div<TargetProps>`
  position: absolute;
  top: 0;
  left: ${({ $leftPercent }: TargetProps) => $leftPercent};
  z-index: 2;
  width: ${({ $targetLineWidth }: TargetProps) => $targetLineWidth}px;
  height: 100%;
  background-color: ${({ $chartColors }: TargetProps) => $chartColors.target};
  transform: translateX(-50%);
  transition: opacity 120ms ease;
`;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatPercent(value: number | null, decimals: number) {
  if (value === null) {
    return '—';
  }

  return `${value.toFixed(decimals)}%`;
}

function getSafeNumberFormatter(format: string) {
  try {
    return getNumberFormatter(format || ',d');
  } catch {
    return getNumberFormatter(',d');
  }
}

export default function PluginChartBullet(props: BulletChartProps) {
  const {
    width,
    height,
    data,
    chartColors = fallbackChartColors,
    colorMode = 'status',
    showValues,
    showPercent,
    numberFormat,
    percentDecimals,
    barThickness,
    rowGap,
    targetLineWidth,
    categoryLabelAlign,
  } = props;

  const compact = width < 560;

  const numberFormatter = useMemo(
    () => getSafeNumberFormatter(numberFormat || ',d'),
    [numberFormat],
  );

  const scaleMax = useMemo(() => {
    const maxValue = Math.max(
      0,
      ...data.flatMap(row => [row.actual, row.target]),
    );

    return maxValue > 0 ? maxValue * 1.05 : 1;
  }, [data]);

  if (!data.length) {
    return (
      <EmptyRoot $width={width} $height={height}>
        Нет данных
      </EmptyRoot>
    );
  }

  return (
    <Root $width={width} $height={height}>
      <Body $rowGap={rowGap}>
        {data.map((row, index) => {
          const barWidth = `${clamp((row.actual / scaleMax) * 100, 0, 100)}%`;
          const targetLeft = `${clamp((row.target / scaleMax) * 100, 0, 100)}%`;

          return (
            <Row
              key={`${row.label}-${index}`}
              $compact={compact}
              $showValues={showValues}
              $showPercent={showPercent}
              title={`${row.label}: ${numberFormatter(row.actual)} / ${numberFormatter(
                row.target,
              )} (${formatPercent(row.percent, percentDecimals)})`}
            >
              <Label $compact={compact} $labelAlign={categoryLabelAlign}>
                {row.label}
              </Label>

              {showValues && (
                <Value
                  $compact={compact}
                  $isGood={row.isGood}
                  $colorMode={colorMode}
                  $chartColors={chartColors}
                >
                  {numberFormatter(row.actual)} / {numberFormatter(row.target)}
                </Value>
              )}

              {showPercent && (
                <Percent
                  $isGood={row.isGood}
                  $colorMode={colorMode}
                  $chartColors={chartColors}
                >
                  {formatPercent(row.percent, percentDecimals)}
                </Percent>
              )}

              <Track
                className="plugin-chart-bullet__track"
                $barThickness={barThickness}
              >
                <Target
                  className="plugin-chart-bullet__target"
                  $leftPercent={targetLeft}
                  $targetLineWidth={targetLineWidth}
                  $chartColors={chartColors}
                />

                <Bar
                  className="plugin-chart-bullet__bar"
                  $widthPercent={barWidth}
                  $barThickness={barThickness}
                  $isGood={row.isGood}
                  $colorMode={colorMode}
                  $chartColors={chartColors}
                />
              </Track>
            </Row>
          );
        })}
      </Body>
    </Root>
  );
}