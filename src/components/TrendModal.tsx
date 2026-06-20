import { X, AlertTriangle, Bell, Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { PouringArea, Building } from '@/types';
import { DEFAULT_THRESHOLDS } from '@/types';
import { getSettlementTrend, getLateralTrend, getInclinationTrend } from '@/data/mockSensorData';
import { getRiskLevel, generateSuggestion, getRiskBgClass, calculateRate, getPeakValue } from '@/utils/riskCalculator';
import TrendChart from './TrendChart';
import StatusBadge from './StatusBadge';

interface TrendModalProps {
  area: PouringArea;
  building: Building;
  onClose: () => void;
}

export default function TrendModal({ area, building, onClose }: TrendModalProps) {
  const navigate = useNavigate();

  const settlementData = getSettlementTrend(area.id);
  const lateralData = getLateralTrend(area.id);
  const inclinationData = getInclinationTrend(area.id);

  const settlementLevel = getRiskLevel(area.settlement, DEFAULT_THRESHOLDS.settlement);
  const lateralLevel = getRiskLevel(area.lateralDisplacement, DEFAULT_THRESHOLDS.lateralDisplacement);
  const inclinationLevel = getRiskLevel(area.inclination, DEFAULT_THRESHOLDS.inclination);

  const settlementRate = calculateRate(settlementData);
  const lateralRate = calculateRate(lateralData);
  const inclinationRate = calculateRate(inclinationData);

  const settlementPeak = getPeakValue(settlementData);
  const lateralPeak = getPeakValue(lateralData);
  const inclinationPeak = getPeakValue(inclinationData);

  const suggestion = generateSuggestion(area.status);

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const goToDetail = () => {
    navigate('/detail', { state: { areaId: area.id } });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden cockpit-card animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-cockpit-border/50">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-cockpit-text flex items-center gap-3">
                {building.name} {area.floor}层 {area.axis}
                <StatusBadge level={area.status} size="md" />
              </h2>
              <p className="text-sm text-cockpit-muted mt-1 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                数据更新时间: {formatTime(area.updateTime)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-bg3/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto scrollbar-thin max-h-[calc(90vh-80px)]">
          <div className="p-5 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="cockpit-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-cockpit-muted">24h报警次数</span>
                  <Bell className="w-4 h-4 text-risk-alarm" />
                </div>
                <div className="text-2xl font-bold text-risk-alarm font-display">
                  {area.alarmCount24h}
                  <span className="text-sm text-cockpit-muted ml-1">次</span>
                </div>
              </div>
              <div className="cockpit-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-cockpit-muted">24h预警次数</span>
                  <AlertTriangle className="w-4 h-4 text-risk-warning" />
                </div>
                <div className="text-2xl font-bold text-risk-warning font-display">
                  {area.warningCount24h}
                  <span className="text-sm text-cockpit-muted ml-1">次</span>
                </div>
              </div>
              <div className="cockpit-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-cockpit-muted">浇筑进度</span>
                </div>
                <div className="text-2xl font-bold text-accent-blue font-display">
                  {area.pouringProgress}
                  <span className="text-sm text-cockpit-muted ml-1">%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="cockpit-card p-4">
                <div className="mb-3">
                  <TrendChart
                    data={settlementData}
                    title="立杆沉降"
                    unit="mm"
                    warningThreshold={DEFAULT_THRESHOLDS.settlement.warning}
                    alarmThreshold={DEFAULT_THRESHOLDS.settlement.alarm}
                    level={settlementLevel}
                    height={180}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-cockpit-muted">当前值</span>
                    <div className="text-lg font-bold text-cockpit-text font-display">
                      {area.settlement} mm
                    </div>
                  </div>
                  <div>
                    <span className="text-cockpit-muted">峰值</span>
                    <div className="text-lg font-bold text-cockpit-text font-display">
                      {settlementPeak.toFixed(1)} mm
                    </div>
                  </div>
                  <div>
                    <span className="text-cockpit-muted">变化速率</span>
                    <div className="text-lg font-bold text-cockpit-text font-display">
                      {settlementRate.toFixed(2)} mm/h
                    </div>
                  </div>
                  <div>
                    <span className="text-cockpit-muted">状态</span>
                    <div className="mt-1">
                      <StatusBadge level={settlementLevel} size="sm" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="cockpit-card p-4">
                <div className="mb-3">
                  <TrendChart
                    data={lateralData}
                    title="模板侧移"
                    unit="mm"
                    warningThreshold={DEFAULT_THRESHOLDS.lateralDisplacement.warning}
                    alarmThreshold={DEFAULT_THRESHOLDS.lateralDisplacement.alarm}
                    level={lateralLevel}
                    height={180}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-cockpit-muted">当前值</span>
                    <div className="text-lg font-bold text-cockpit-text font-display">
                      {area.lateralDisplacement} mm
                    </div>
                  </div>
                  <div>
                    <span className="text-cockpit-muted">峰值</span>
                    <div className="text-lg font-bold text-cockpit-text font-display">
                      {lateralPeak.toFixed(1)} mm
                    </div>
                  </div>
                  <div>
                    <span className="text-cockpit-muted">变化速率</span>
                    <div className="text-lg font-bold text-cockpit-text font-display">
                      {lateralRate.toFixed(2)} mm/h
                    </div>
                  </div>
                  <div>
                    <span className="text-cockpit-muted">状态</span>
                    <div className="mt-1">
                      <StatusBadge level={lateralLevel} size="sm" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="cockpit-card p-4">
                <div className="mb-3">
                  <TrendChart
                    data={inclinationData}
                    title="架体倾斜"
                    unit="°"
                    warningThreshold={DEFAULT_THRESHOLDS.inclination.warning}
                    alarmThreshold={DEFAULT_THRESHOLDS.inclination.alarm}
                    level={inclinationLevel}
                    height={180}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-cockpit-muted">当前值</span>
                    <div className="text-lg font-bold text-cockpit-text font-display">
                      {area.inclination}°
                    </div>
                  </div>
                  <div>
                    <span className="text-cockpit-muted">峰值</span>
                    <div className="text-lg font-bold text-cockpit-text font-display">
                      {inclinationPeak.toFixed(2)}°
                    </div>
                  </div>
                  <div>
                    <span className="text-cockpit-muted">变化速率</span>
                    <div className="text-lg font-bold text-cockpit-text font-display">
                      {inclinationRate.toFixed(3)}°/h
                    </div>
                  </div>
                  <div>
                    <span className="text-cockpit-muted">状态</span>
                    <div className="mt-1">
                      <StatusBadge level={inclinationLevel} size="sm" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`cockpit-card p-5 border-l-4 ${getRiskBgClass(area.status)}`} style={{ borderLeftColor: suggestion.action === 'pause' ? '#EF4444' : suggestion.action === 'review' ? '#F59E0B' : '#10B981' }}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-cockpit-text mb-2">
                    处置建议: {suggestion.title}
                  </h3>
                  <p className="text-cockpit-muted text-sm mb-2">{suggestion.description}</p>
                  <p className="text-xs text-cockpit-muted/70">{suggestion.basis}</p>
                </div>
                <button
                  onClick={goToDetail}
                  className="flex items-center gap-2 px-4 py-2 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  查看详情
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
