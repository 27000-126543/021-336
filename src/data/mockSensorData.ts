import type { TrendData } from '@/types';

export function generateTrendData(
  baseValue: number,
  variance: number,
  hours: number = 24,
  seed: number = 0
): TrendData[] {
  const data: TrendData[] = [];
  const now = new Date();

  let s = seed || 12345;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  for (let i = hours; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const trend = (hours - i) * (variance / hours);
    const noise = (rand() - 0.5) * variance * 0.3;
    const value = baseValue + trend + noise;

    data.push({
      time: time.toISOString(),
      value: Math.round(value * 100) / 100,
    });
  }

  return data;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function getSettlementTrend(areaId: string, hours?: number): TrendData[] {
  const hash = hashString(areaId);
  const base = 4 + (hash % 8);
  const variance = 2 + (hash % 4);
  return generateTrendData(base, variance, hours || 24, hash);
}

export function getLateralTrend(areaId: string, hours?: number): TrendData[] {
  const hash = hashString(areaId + '-lateral');
  const base = 2 + (hash % 6);
  const variance = 1.5 + (hash % 3);
  return generateTrendData(base, variance, hours || 24, hash);
}

export function getInclinationTrend(areaId: string, hours?: number): TrendData[] {
  const hash = hashString(areaId + '-inclination');
  const base = 0.12 + (hash % 30) / 100;
  const variance = 0.08 + (hash % 15) / 100;
  return generateTrendData(base, variance, hours || 24, hash);
}

export function getSensorTrend(sensorId: string, hours?: number): TrendData[] {
  const hash = hashString(sensorId);
  const base = 3 + (hash % 10);
  const variance = 1.5 + (hash % 3);
  return generateTrendData(base, variance, hours || 24, hash);
}

export function getComponentTrend(componentId: string, metricType: string, hours?: number): TrendData[] {
  const hash = hashString(componentId + '-' + metricType);
  
  let base: number;
  let variance: number;
  
  switch (metricType) {
    case 'settlement':
      base = 4 + (hash % 8);
      variance = 2 + (hash % 4);
      break;
    case 'lateral':
      base = 2 + (hash % 6);
      variance = 1.5 + (hash % 3);
      break;
    case 'inclination':
      base = 0.12 + (hash % 30) / 100;
      variance = 0.08 + (hash % 15) / 100;
      break;
    default:
      base = 5;
      variance = 2;
  }
  
  return generateTrendData(base, variance, hours || 24, hash);
}

export function filterTrendByDateRange(
  data: TrendData[],
  startDate: string,
  endDate: string
): TrendData[] {
  if (!startDate && !endDate) return data;
  
  const start = startDate ? new Date(startDate) : new Date(0);
  const end = endDate ? new Date(endDate + 'T23:59:59') : new Date();
  
  return data.filter((d) => {
    const t = new Date(d.time);
    return t >= start && t <= end;
  });
}

export function getDateRangeHours(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 24;
  const start = new Date(startDate);
  const end = new Date(endDate + 'T23:59:59');
  const diffMs = end.getTime() - start.getTime();
  return Math.max(24, Math.ceil(diffMs / (1000 * 60 * 60)));
}
