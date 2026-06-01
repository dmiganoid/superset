import { RankFlowChartPlugin } from 'plugin-chart-rank-flow';

console.log('[Rank Flow] bundle loaded');

new RankFlowChartPlugin()
  .configure({ key: 'plugin-chart-rank-flow' })
  .register();

console.log('[Rank Flow] plugin registered');