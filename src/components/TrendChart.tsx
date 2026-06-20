import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { TrendData } from '@/types';
import { getRiskColor } from '@/utils/riskCalculator';

interface CompareDataset {
  name: string;
  data: TrendData[];
  color?: string;
}

interface TrendChartProps {
  data: TrendData[];
  title: string;
  unit: string;
  warningThreshold: number;
  alarmThreshold: number;
  level: 'normal' | 'warning' | 'alarm';
  height?: number;
  compareData?: CompareDataset[];
}

const COMPARE_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
];

export default function TrendChart({
  data,
  title,
  unit,
  warningThreshold,
  alarmThreshold,
  level,
  height = 200,
  compareData = [],
}: TrendChartProps) {
  const mainColor = getRiskColor(level);

  const option = useMemo(() => {
    const hasCompare = compareData.length > 0;
    
    const times = data.map((d) => {
      const date = new Date(d.time);
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    });
    const values = data.map((d) => d.value);
    
    const allValues = [...values];
    compareData.forEach((ds) => {
      ds.data.forEach((d) => allValues.push(d.value));
    });
    
    const maxValue = Math.max(...allValues, alarmThreshold) * 1.1;

    const series: any[] = [
      {
        name: title || '主数据',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        data: values,
        lineStyle: {
          color: hasCompare ? COMPARE_COLORS[0] : mainColor,
          width: hasCompare ? 2 : 2.5,
        },
        itemStyle: {
          color: hasCompare ? COMPARE_COLORS[0] : mainColor,
          borderWidth: 2,
          borderColor: '#1E293B',
        },
        areaStyle: hasCompare ? undefined : {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${mainColor}40` },
              { offset: 1, color: `${mainColor}05` },
            ],
          },
        },
        z: compareData.length,
      },
    ];

    compareData.forEach((ds, index) => {
      const dsTimes = ds.data.map((d) => {
        const date = new Date(d.time);
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      });
      const dsValues = ds.data.map((d) => d.value);
      
      series.push({
        name: ds.name,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 5,
        showSymbol: false,
        data: dsValues,
        lineStyle: {
          color: ds.color || COMPARE_COLORS[(index + 1) % COMPARE_COLORS.length],
          width: 2,
          type: 'solid',
        },
        itemStyle: {
          color: ds.color || COMPARE_COLORS[(index + 1) % COMPARE_COLORS.length],
          borderWidth: 2,
          borderColor: '#1E293B',
        },
        z: compareData.length - index - 1,
      });
    });

    if (series[0] && !hasCompare) {
      series[0].markLine = {
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
      };
    }

    return {
      backgroundColor: 'transparent',
      title: title ? {
        text: title,
        textStyle: {
          color: '#E2E8F0',
          fontSize: 14,
          fontWeight: 500,
        },
        left: 0,
        top: 0,
      } : undefined,
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(30, 41, 59, 0.95)',
        borderColor: 'rgba(59, 130, 246, 0.3)',
        textStyle: {
          color: '#E2E8F0',
        },
        formatter: (params: any) => {
          let html = `<div style="padding: 4px 8px;">`;
          html += `<div style="margin-bottom: 4px; font-weight: 500;">${params[0].axisValue}</div>`;
          
          params.forEach((param: any, idx: number) => {
            const color = hasCompare 
              ? COMPARE_COLORS[idx % COMPARE_COLORS.length] 
              : mainColor;
            html += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${color};"></span>
              <span>${param.seriesName}: <b style="color: ${color};">${param.value} ${unit}</b></span>
            </div>`;
          });
          
          html += `</div>`;
          return html;
        },
        axisPointer: {
          type: 'cross',
          lineStyle: {
            color: 'rgba(59, 130, 246, 0.5)',
            type: 'dashed',
          },
        },
      },
      legend: hasCompare ? {
        show: true,
        top: 0,
        right: 0,
        textStyle: {
          color: '#94A3B8',
          fontSize: 11,
        },
        itemWidth: 16,
        itemHeight: 8,
      } : undefined,
      grid: {
        left: '3%',
        right: '3%',
        top: hasCompare ? '18%' : '18%',
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
      series,
    };
  }, [data, title, unit, warningThreshold, alarmThreshold, mainColor, compareData]);

  return (
    <ReactECharts
      option={option}
      style={{ height: `${height}px`, width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
}
