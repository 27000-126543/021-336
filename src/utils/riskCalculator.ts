import type { RiskLevel, PouringArea, ThresholdConfig, TrendData, DisposalSuggestion } from '@/types';

export function getRiskLevel(
  value: number,
  thresholds: { warning: number; alarm: number }
): RiskLevel {
  if (value >= thresholds.alarm) return 'alarm';
  if (value >= thresholds.warning) return 'warning';
  return 'normal';
}

export function getOverallRiskLevel(
  area: PouringArea,
  thresholds: ThresholdConfig
): RiskLevel {
  const levels = [
    getRiskLevel(area.settlement, thresholds.settlement),
    getRiskLevel(area.lateralDisplacement, thresholds.lateral),
    getRiskLevel(area.inclination, thresholds.inclination),
  ];
  if (levels.includes('alarm')) return 'alarm';
  if (levels.includes('warning')) return 'warning';
  return 'normal';
}

export function calculateRate(data: TrendData[]): number {
  if (data.length < 2) return 0;
  const first = data[0];
  const last = data[data.length - 1];
  const hours =
    (new Date(last.time).getTime() - new Date(first.time).getTime()) /
    (1000 * 60 * 60);
  return hours > 0 ? (last.value - first.value) / hours : 0;
}

export function getPeakValue(data: TrendData[]): number {
  if (data.length === 0) return 0;
  return Math.max(...data.map((d) => d.value));
}

export function generateSuggestion(level: RiskLevel): DisposalSuggestion {
  const suggestions: Record<RiskLevel, DisposalSuggestion> = {
    normal: {
      level: 'normal',
      action: 'observe',
      title: '继续观察',
      description: '当前各项指标在安全范围内，可继续正常施工。',
      basis: '依据《建筑施工临时支撑结构技术规范》JGJ300-2013',
    },
    warning: {
      level: 'warning',
      action: 'review',
      title: '组织复核',
      description: '部分指标接近预警阈值，应立即组织技术人员现场复核，加密监测频率。',
      basis: '预警值达到阈值80%，需启动二级响应机制',
    },
    alarm: {
      level: 'alarm',
      action: 'pause',
      title: '暂停浇筑',
      description: '指标超出安全阈值，应立即暂停浇筑作业，疏散作业人员，启动应急预案。',
      basis: '监测值超过报警阈值，依据应急预案需暂停施工',
    },
  };
  return suggestions[level];
}

export function getRiskColor(level: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    normal: '#10B981',
    warning: '#F59E0B',
    alarm: '#EF4444',
  };
  return colors[level];
}

export function getRiskBgClass(level: RiskLevel): string {
  const classes: Record<RiskLevel, string> = {
    normal: 'bg-risk-normal/20 text-risk-normal',
    warning: 'bg-risk-warning/20 text-risk-warning',
    alarm: 'bg-risk-alarm/20 text-risk-alarm',
  };
  return classes[level];
}

export function getRiskGlowClass(level: RiskLevel): string {
  const classes: Record<RiskLevel, string> = {
    normal: 'glow-border-normal',
    warning: 'glow-border-warning',
    alarm: 'glow-border-alarm',
  };
  return classes[level];
}
