import type { RiskLevel } from '@/types';
import { getRiskBgClass } from '@/utils/riskCalculator';

interface StatusBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
  lg: 'px-4 py-1.5 text-base',
};

const labels: Record<RiskLevel, string> = {
  normal: '正常',
  warning: '预警',
  alarm: '报警',
};

export default function StatusBadge({ level, size = 'md' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-medium ${getRiskBgClass(level)} ${sizeClasses[size]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full bg-current mr-1.5 ${level === 'alarm' ? 'animate-pulse' : ''}`} />
      {labels[level]}
    </span>
  );
}
