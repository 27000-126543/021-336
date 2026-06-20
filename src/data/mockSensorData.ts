import type { TrendData } from '@/types';

export function generateTrendData(baseValue: number, variance: number, hours: number = 24): TrendData[] {
  const data: TrendData[] = [];
  const now = new Date();

  for (let i = hours; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const trend = (hours - i) * (variance / hours);
    const noise = (Math.random() - 0.5) * variance * 0.3;
    const value = baseValue + trend + noise;

    data.push({
      time: time.toISOString(),
      value: Math.round(value * 100) / 100,
    });
  }

  return data;
}

export function getSettlementTrend(areaId: string): TrendData[] {
  const hash = areaId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const base = 4 + (hash % 8);
  const variance = 2 + (hash % 4);
  return generateTrendData(base, variance);
}

export function getLateralTrend(areaId: string): TrendData[] {
  const hash = areaId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const base = 2 + (hash % 6);
  const variance = 1.5 + (hash % 3);
  return generateTrendData(base, variance);
}

export function getInclinationTrend(areaId: string): TrendData[] {
  const hash = areaId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const base = 0.12 + (hash % 30) / 100;
  const variance = 0.08 + (hash % 15) / 100;
  return generateTrendData(base, variance);
}

export const sensorPoints = [
  { id: 'S001', name: '立杆沉降传感器-01', componentId: 'GJ-001', type: 'settlement' },
  { id: 'S002', name: '立杆沉降传感器-02', componentId: 'GJ-001', type: 'settlement' },
  { id: 'S003', name: '立杆沉降传感器-03', componentId: 'GJ-002', type: 'settlement' },
  { id: 'S004', name: '模板侧移传感器-01', componentId: 'MB-001', type: 'lateral' },
  { id: 'S005', name: '模板侧移传感器-02', componentId: 'MB-001', type: 'lateral' },
  { id: 'S006', name: '模板侧移传感器-03', componentId: 'MB-002', type: 'lateral' },
  { id: 'S007', name: '架体倾斜传感器-01', componentId: 'JT-001', type: 'inclination' },
  { id: 'S008', name: '架体倾斜传感器-02', componentId: 'JT-001', type: 'inclination' },
  { id: 'S009', name: '架体倾斜传感器-03', componentId: 'JT-002', type: 'inclination' },
  { id: 'S010', name: '立杆沉降传感器-04', componentId: 'GJ-003', type: 'settlement' },
  { id: 'S011', name: '模板侧移传感器-04', componentId: 'MB-003', type: 'lateral' },
  { id: 'S012', name: '架体倾斜传感器-04', componentId: 'JT-003', type: 'inclination' },
];

export const componentIds = ['GJ-001', 'GJ-002', 'GJ-003', 'MB-001', 'MB-002', 'MB-003', 'JT-001', 'JT-002', 'JT-003'];
