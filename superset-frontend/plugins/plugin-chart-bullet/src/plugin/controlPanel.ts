import { t, validateNonEmpty } from '@superset-ui/core';
import {
  ControlPanelConfig,
  sharedControls,
} from '@superset-ui/chart-controls';

const isCustomColorSource = ({
  controls,
}: {
  controls?: Record<string, { value?: unknown }>;
}) => controls?.colorSource?.value === 'custom';

const config: ControlPanelConfig = {
  controlPanelSections: [
    {
      label: t('Запрос'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'groupby',
            config: {
              ...sharedControls.groupby,
              label: t('Группировка'),
              description: t(
                'Поле или выражение, по которому будут построены строки bullet chart',
              ),
              validators: [validateNonEmpty],
            },
          },
        ],
        [
          {
            name: 'actualMetric',
            config: {
              ...sharedControls.metric,
              label: t('Текущее значение'),
              description: t('Метрика для фактического или текущего значения'),
              validators: [validateNonEmpty],
            },
          },
        ],
        [
          {
            name: 'targetMetric',
            config: {
              ...sharedControls.metric,
              label: t('Целевое значение'),
              description: t('Метрика для целевого или планового значения'),
              validators: [validateNonEmpty],
            },
          },
        ],
        [
          {
            name: 'adhoc_filters',
            config: {
              ...sharedControls.adhoc_filters,
              label: t('Фильтры'),
            },
          },
        ],
        [
          {
            name: 'row_limit',
            config: {
              ...sharedControls.row_limit,
              label: t('Лимит строк'),
              description: t('Максимальное количество строк в результате'),
            },
          },
        ],
      ],
    },
    {
      label: t('Оформление'),
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'color_scheme',
            config: {
              ...sharedControls.color_scheme,
              label: t('Цветовая схема'),
              description: t('Палитра цветов Superset для графика'),
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'colorSource',
            config: {
              type: 'SelectControl',
              label: t('Источник цветов'),
              description: t(
                'Использовать выбранную цветовую схему или пользовательские цвета',
              ),
              default: 'palette',
              choices: [
                ['palette', t('Цветовая схема')],
                ['custom', t('Пользовательские цвета')],
              ],
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'colorMode',
            config: {
              type: 'SelectControl',
              label: t('Режим окраски'),
              description: t('Как применять цвета к полосам графика'),
              default: 'status',
              choices: [
                ['status', t('По выполнению цели')],
                ['single', t('Один цвет')],
              ],
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'goodColor',
            config: {
              type: 'ColorPickerControl',
              label: t('Цвет выполненной цели'),
              description: t(
                'Используется, когда текущее значение больше или равно целевому',
              ),
              default: {
                r: 31,
                g: 168,
                b: 201,
                a: 1,
              },
              renderTrigger: true,
              visibility: isCustomColorSource,
            },
          },
        ],
        [
          {
            name: 'badColor',
            config: {
              type: 'ColorPickerControl',
              label: t('Цвет невыполненной цели'),
              description: t(
                'Используется, когда текущее значение меньше целевого',
              ),
              default: {
                r: 69,
                g: 78,
                b: 124,
                a: 1,
              },
              renderTrigger: true,
              visibility: isCustomColorSource,
            },
          },
        ],
        [
          {
            name: 'targetColor',
            config: {
              type: 'ColorPickerControl',
              label: t('Цвет целевой линии'),
              description: t('Используется для вертикального маркера цели'),
              default: {
                r: 102,
                g: 102,
                b: 102,
                a: 1,
              },
              renderTrigger: true,
              visibility: isCustomColorSource,
            },
          },
        ],
        [
          {
            name: 'categoryLabelAlign',
            config: {
              type: 'SelectControl',
              label: t('Выравнивание категорий'),
              description: t('Выравнивание названий категорий в строках графика'),
              default: 'right',
              choices: [
                ['left', t('По левому краю')],
                ['center', t('По центру')],
                ['right', t('По правому краю')],
              ],
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'sortByPercent',
            config: {
              type: 'CheckboxControl',
              label: t('Сортировать по проценту выполнения'),
              default: true,
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'showValues',
            config: {
              type: 'CheckboxControl',
              label: t('Показывать значения'),
              default: true,
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'showPercent',
            config: {
              type: 'CheckboxControl',
              label: t('Показывать процент'),
              default: true,
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'numberFormat',
            config: {
              type: 'TextControl',
              label: t('Формат чисел'),
              description: t('D3-формат чисел, например: ,d, ,.0f, .2s'),
              default: ',d',
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'percentDecimals',
            config: {
              type: 'SelectControl',
              label: t('Знаков после запятой в процентах'),
              default: 1,
              choices: [
                [0, '0'],
                [1, '1'],
                [2, '2'],
              ],
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'barThickness',
            config: {
              type: 'SliderControl',
              label: t('Толщина полосы'),
              default: 10,
              min: 4,
              max: 24,
              step: 1,
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'rowGap',
            config: {
              type: 'SliderControl',
              label: t('Расстояние между строками'),
              default: 10,
              min: 4,
              max: 24,
              step: 1,
              renderTrigger: true,
            },
          },
        ],
        [
          {
            name: 'targetLineWidth',
            config: {
              type: 'SliderControl',
              label: t('Толщина целевой линии'),
              default: 2,
              min: 1,
              max: 6,
              step: 1,
              renderTrigger: true,
            },
          },
        ],
      ],
    },
  ],
};

export default config;