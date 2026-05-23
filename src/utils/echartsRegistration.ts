import { LineChart as ELineChart } from 'echarts/charts';
import type { LineSeriesOption } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  MarkAreaComponent,
  DataZoomComponent,
  DataZoomInsideComponent,
  DataZoomSliderComponent,
  GraphicComponent,
  ToolboxComponent,
  TitleComponent,
} from 'echarts/components';
import type {
  GridComponentOption,
  TooltipComponentOption,
  LegendComponentOption,
  MarkLineComponentOption,
  MarkAreaComponentOption,
  DataZoomComponentOption,
  GraphicComponentOption,
  ToolboxComponentOption,
  TitleComponentOption,
} from 'echarts/components';
import { use as echartsUse, ComposeOption } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

echartsUse([
  CanvasRenderer,
  ELineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
  MarkAreaComponent,
  DataZoomComponent,
  DataZoomInsideComponent,
  DataZoomSliderComponent,
  GraphicComponent,
  ToolboxComponent,
  TitleComponent,
]);

export type EChartsOption = ComposeOption<
  | LineSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
  | MarkLineComponentOption
  | MarkAreaComponentOption
  | DataZoomComponentOption
  | GraphicComponentOption
  | ToolboxComponentOption
  | TitleComponentOption
>;
