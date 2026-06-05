import type {
  QueryFormMetric,
  SqlaFormData,
} from '@superset-ui/core';

export type BulletChartColorMode = 'status' | 'single';
export type BulletChartColorSource = 'palette' | 'custom';
export type BulletChartCategoryLabelAlign = 'left' | 'center' | 'right';

export type BulletChartColorPickerValue =
  | string
  | {
      r: number;
      g: number;
      b: number;
      a?: number;
    };

export type BulletChartColors = {
  good: string;
  bad: string;
  target: string;
};

export type BulletChartFormData = SqlaFormData & {
  actualMetric?: QueryFormMetric;
  targetMetric?: QueryFormMetric;

  color_scheme?: string;
  colorScheme?: string;

  colorSource?: BulletChartColorSource;
  colorMode?: BulletChartColorMode;

  goodColor?: BulletChartColorPickerValue;
  badColor?: BulletChartColorPickerValue;
  targetColor?: BulletChartColorPickerValue;

  sortByPercent?: boolean;
  showValues?: boolean;
  showPercent?: boolean;
  numberFormat?: string;
  percentDecimals?: number;
  barThickness?: number;
  rowGap?: number;
  targetLineWidth?: number;
  categoryLabelAlign?: BulletChartCategoryLabelAlign;
};

export type BulletChartDatum = {
  label: string;
  actual: number;
  target: number;
  percent: number | null;
  isGood: boolean;
};

export type BulletChartProps = {
  width: number;
  height: number;
  data: BulletChartDatum[];

  chartColors: BulletChartColors;
  colorMode: BulletChartColorMode;

  showValues: boolean;
  showPercent: boolean;
  numberFormat: string;
  percentDecimals: number;
  barThickness: number;
  rowGap: number;
  targetLineWidth: number;
  categoryLabelAlign: BulletChartCategoryLabelAlign;
};