import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { TrendData } from '@/types';
import { getRiskColor } from '@/utils/riskCalculator';

interface TrendChartProps {
  data: TrendData[];
  title: string;
  unit: string;
  warningThreshold: number;
  alarmThreshold: number;
  level: 'normal' | 'warning' | 'alarm';
  height?: number;
}

export default function TrendChart({
  data,
  title,
  unit,
  warningThreshold,
  alarmThreshold,
  level,
  height = 200,
}: TrendChartProps) {
  const color = getRiskColor(level);

  const option = useMemo(() => {
    const times = data.map((d) => {
      const date = new Date(d.time);
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    });
    const values = data.map((d) => d.value);
    const maxValue = Math.max(...values, alarmThreshold) * 1.1;

    return {
      backgroundColor: 'transparent',
      title: {
        text: title,
        textStyle: {
          color: '#E2E8F0',
          fontSize: 14,
          fontWeight: 500,
        },
        left: 0,
        top: 0,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        borderColor: 'rgba(59, 130, 246, 0.3)',
        textStyle: {
          color: '#E2E8F0',
        },
        formatter: (params: any) => {
          const param = params[0];
          return `<div style="padding: 4px 8px;">
            <div style="margin-bottom: 4px; font-weight: 500;">${param.axisValue}</div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${color};"></span>
              <span>${title}: <b style="color: ${color};">${param.value} ${unit}</b></span>
            </div>
          </div>`;
        },
        axisPointer: {
          type: 'cross',
          lineStyle: {
            color: 'rgba(59, 130, 246, 0.5)',
            type: 'dashed',
          },
        },
      },
      grid: {
        left: '3%',
        right: '3%',
        top: '18%',
        bottom: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: times,
        axisLine: {
          lineStyle: {
            color: '#334155',
          },
        },
        axisLabel: {
          color: '#94A3B8',
          fontSize: 11,
          interval: Math.floor(data.length / 6),
        },
        splitLine: {
          show: false,
        },
      },
      yAxis: {
        type: 'value',
        max: maxValue,
        axisLine: {
          show: false,
        },
        axisLabel: {
          color: '#94A3B8',
          fontSize: 11,
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(51, 65, 85, 0.3)',
            type: 'dashed',
          },
        },
      },
      series: [
        {
          name: title,
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          showSymbol: false,
          data: values,
          lineStyle: {
            color: color,
            width: 2,
          },
          itemStyle: {
            color: color,
            borderWidth: 2,
            borderColor: '#1E293B',
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: `${color}40` },
                { offset: 1, color: `${color}05` },
              ],
            },
          },
          markLine: {
            silent: true,
            symbol: 'none',
            data: [
              {
                yAxis: warningThreshold,
                lineStyle: {
                  color: '#F59E0B',
                  type: 'dashed',
                  width: 1,
                },
                label: {
                  formatter: `预警: ${warningThreshold}${unit}`,
                  color: '#F59E0B',
                  fontSize: 10,
                  position: 'insideEndTop',
                },
              },
              {
                yAxis: alarmThreshold,
                lineStyle: {
                  color: '#EF4444',
                  type: 'dashed',
                  width: 1,
                },
                label: {
                  formatter: `报警: ${alarmThreshold}${unit}`,
                  color: '#EF4444',
                  fontSize: 10,
                  position: 'insideEndTop',
                },
              },
            ],
          },
        },
      ],
    };
  }, [data, title, unit, warningThreshold, alarmThreshold, color]);

  return (
    <ReactECharts
      option={option}
      style={{ height: `${height}px`, width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
}
