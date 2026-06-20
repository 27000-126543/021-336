import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RiskLevel } from '@/types';
import { getRiskColor } from '@/utils/riskCalculator';

interface MetricCardProps {
  title: string;
  value: number;
  unit: string;
  threshold: { warning: number; alarm: number };
  trend?: 'up' | 'down' | 'stable';
  change?: number;
  decimals?: number;
}

export default function MetricCard({
  title,
  value,
  unit,
  threshold,
  trend = 'stable',
  change,
  decimals = 1,
}: MetricCardProps) {
  let level: RiskLevel = 'normal';
  if (value >= threshold.alarm) level = 'alarm';
  else if (value >= threshold.warning) level = 'warning';

  const color = getRiskColor(level);
  const percentage = Math.min(100, (value / threshold.alarm) * 100);

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-risk-alarm' : trend === 'down' ? 'text-risk-normal' : 'text-cockpit-muted';

  return (
    <div className="cockpit-card p-5 cockpit-card-hover">
      <div className="flex items-start justify-between mb-3">
        <span className="text-cockpit-muted text-sm">{title}</span>
        <TrendIcon className={cn('w-4 h-4', trendColor)} />
      </div>
      
      <div className="flex items-baseline gap-2 mb-3">
        <span 
          className="font-display text-3xl font-bold"
          style={{ color }}
        >
          {value.toFixed(decimals)}
        </span>
        <span className="text-cockpit-muted text-sm">{unit}</span>
      </div>

      <div className="mb-2">
        <div className="h-2 bg-cockpit-bg3 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${percentage}%`, backgroundColor: color }}
          />
        </div>
      </div>

      <div className="flex justify-between text-xs text-cockpit-muted">
        <span>预警: {threshold.warning}{unit}</span>
        <span>报警: {threshold.alarm}{unit}</span>
        {change !== undefined && (
          <span className={trendColor}>
            {change >= 0 ? '+' : ''}{change.toFixed(decimals)}{unit}
          </span>
        )}
      </div>
    </div>
  );
}
