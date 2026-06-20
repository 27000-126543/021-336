import { useState, useMemo } from 'react';
import { X, AlertTriangle, Bell, Clock, ArrowRight, FileText, Plus, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMonitorStore } from '@/store/useStore';
import type { PouringArea, Building, AlarmRecord, DisposalRecord, RiskLevel } from '@/types';
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
  const alarmRecords = useMonitorStore((state) => state.alarmRecords);
  const disposalRecords = useMonitorStore((state) => state.records);
  const addRecord = useMonitorStore((state) => state.addRecord);
  const linkRecordToAlarm = useMonitorStore((state) => state.linkRecordToAlarm);

  const [activeTab, setActiveTab] = useState<'trend' | 'alarms' | 'records'>('trend');
  const [showQuickRecord, setShowQuickRecord] = useState(false);
  const [quickRecordForm, setQuickRecordForm] = useState({
    personInCharge: '',
    reviewer: '',
    rectificationMeasures: '',
  });

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

  const areaAlarms = useMemo((): AlarmRecord[] => {
    return alarmRecords
      .filter((a) => a.areaId === area.id)
      .sort((a, b) => new Date(b.triggerTime).getTime() - new Date(a.triggerTime).getTime());
  }, [alarmRecords, area.id]);

  const areaRecords = useMemo((): DisposalRecord[] => {
    return disposalRecords
      .filter((r) => r.areaId === area.id)
      .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
  }, [disposalRecords, area.id]);

  const unclosedAlarms = useMemo(() => {
    return areaAlarms.filter((a) => !a.isClosed);
  }, [areaAlarms]);

  const isClosedLoop = useMemo(() => {
    const hasCompletedRecord = areaRecords.some((r) => r.status === 'completed');
    const allAlarmsClosed = areaAlarms.length === 0 || areaAlarms.every((a) => a.isClosed);
    return hasCompletedRecord && allAlarmsClosed;
  }, [areaRecords, areaAlarms]);

  const loopStatusText = useMemo(() => {
    if (areaAlarms.length === 0 && areaRecords.length === 0) return '未开始';
    if (unclosedAlarms.length > 0) {
      if (areaRecords.length > 0) return '处理中';
      return '未闭环';
    }
    if (isClosedLoop) return '已闭环';
    if (areaRecords.length > 0) return '处理中';
    return '未闭环';
  }, [areaAlarms, areaRecords, unclosedAlarms, isClosedLoop]);

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const goToDetail = () => {
    navigate('/detail', { state: { areaId: area.id } });
    onClose();
  };

  const handleQuickAddRecord = () => {
    if (!quickRecordForm.personInCharge) {
      alert('请填写责任人');
      return;
    }

    const maxMetric = Math.max(
      area.settlement / DEFAULT_THRESHOLDS.settlement.alarm,
      area.lateralDisplacement / DEFAULT_THRESHOLDS.lateralDisplacement.alarm,
      area.inclination / DEFAULT_THRESHOLDS.inclination.alarm
    );
    const level: RiskLevel = maxMetric >= 1 ? 'alarm' : maxMetric >= 0.8 ? 'warning' : 'normal';

    const newRecord = {
      areaId: area.id,
      buildingName: building.name,
      floor: area.floor,
      axis: area.axis,
      issueDescription: `${building.name}${area.floor}层${area.axis} 高支模监测数据异常，沉降${area.settlement}mm、侧移${area.lateralDisplacement}mm、倾斜${area.inclination}°`,
      riskLevel: level,
      personInCharge: quickRecordForm.personInCharge,
      reviewer: quickRecordForm.reviewer,
      rectificationMeasures: quickRecordForm.rectificationMeasures,
      photoUrls: [],
      photoDescription: '',
      status: 'pending' as const,
    };

    addRecord(newRecord);

    const firstUnclosed = unclosedAlarms[0];
    if (firstUnclosed) {
      setTimeout(() => {
        const records = useMonitorStore.getState().records;
        const latest = records.find((r) => r.areaId === area.id);
        if (latest) {
          linkRecordToAlarm(firstUnclosed.id, latest.id);
        }
      }, 50);
    }

    setShowQuickRecord(false);
    setQuickRecordForm({ personInCharge: '', reviewer: '', rectificationMeasures: '' });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待处理';
      case 'reviewing': return '复核中';
      case 'completed': return '已完成';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-risk-normal/20 text-risk-normal';
      case 'reviewing': return 'bg-accent-blue/20 text-accent-blue';
      case 'pending': return 'bg-risk-warning/20 text-risk-warning';
      default: return 'bg-cockpit-bg3 text-cockpit-muted';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden cockpit-card animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-cockpit-border/50">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-xl font-bold text-cockpit-text flex items-center gap-3">
                  {building.name} {area.floor}层 {area.axis}
                  <StatusBadge level={area.status} size="md" />
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    loopStatusText === '已闭环' 
                      ? 'bg-risk-normal/20 text-risk-normal'
                      : loopStatusText === '处理中'
                        ? 'bg-accent-blue/20 text-accent-blue'
                        : loopStatusText === '未开始'
                          ? 'bg-cockpit-bg3 text-cockpit-muted'
                          : 'bg-risk-warning/20 text-risk-warning'
                  }`}>
                    {loopStatusText === '已闭环' && <CheckCircle2 className="w-3 h-3" />}
                    {loopStatusText}
                  </span>
                </h2>
                <p className="text-sm text-cockpit-muted mt-1 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  数据更新时间: {formatTime(area.updateTime)}
                  <span className="mx-2">|</span>
                  <span className={unclosedAlarms.length > 0 ? 'text-risk-alarm' : 'text-risk-normal'}>
                    未闭环报警: {unclosedAlarms.length} 条
                  </span>
                </p>
              </div>
            </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQuickRecord(true)}
              className="flex items-center gap-2 px-4 py-2 bg-risk-warning/20 hover:bg-risk-warning/30 text-risk-warning rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              快速登记
            </button>
            <button
              onClick={goToDetail}
              className="flex items-center gap-2 px-4 py-2 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg text-sm font-medium transition-colors"
            >
              查看详情
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-bg3/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex border-b border-cockpit-border/50 px-5">
          {[
            { key: 'trend', label: '趋势分析', icon: Bell },
            { key: 'alarms', label: `报警记录 (${areaAlarms.length})`, icon: AlertCircle },
            { key: 'records', label: `处置记录 (${areaRecords.length})`, icon: FileText },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-cockpit-muted hover:text-cockpit-text'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto scrollbar-thin max-h-[calc(90vh-150px)]">
          {activeTab === 'trend' && (
            <div className="p-5 space-y-6">
              <div className="grid grid-cols-4 gap-4">
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
                <div className="cockpit-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-cockpit-muted">闭环状态</span>
                    {loopStatusText === '已闭环' && <CheckCircle2 className="w-4 h-4 text-risk-normal" />}
                    {loopStatusText === '处理中' && <Clock className="w-4 h-4 text-accent-blue" />}
                    {loopStatusText === '未闭环' && <AlertCircle className="w-4 h-4 text-risk-warning" />}
                    {loopStatusText === '未开始' && <Clock className="w-4 h-4 text-cockpit-muted/40" />}
                  </div>
                  <div className={`text-2xl font-bold font-display ${
                    loopStatusText === '已闭环' 
                      ? 'text-risk-normal' 
                      : loopStatusText === '处理中'
                        ? 'text-accent-blue'
                        : loopStatusText === '未开始'
                          ? 'text-cockpit-muted'
                          : 'text-risk-warning'
                  }`}>
                    {loopStatusText}
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
                    onClick={() => setShowQuickRecord(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    登记处置
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'alarms' && (
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-cockpit-text flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-risk-alarm" />
                  报警记录
                </h3>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-cockpit-muted">
                    共 <span className="text-cockpit-text font-medium">{areaAlarms.length}</span> 条
                  </span>
                  <span className="text-risk-warning">
                    未闭环 <span className="font-medium">{unclosedAlarms.length}</span> 条
                  </span>
                </div>
              </div>

              {areaAlarms.length === 0 ? (
                <div className="text-center py-12 text-cockpit-muted">
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  暂无报警记录
                </div>
              ) : (
                <div className="space-y-3">
                  {areaAlarms.map((alarm) => (
                    <div
                      key={alarm.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        alarm.isClosed
                          ? 'bg-cockpit-bg3/20 border-cockpit-border/30'
                          : 'bg-risk-alarm/5 border-risk-alarm/30'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <StatusBadge level={alarm.level} size="sm" />
                          <span className="font-medium text-cockpit-text">{alarm.metricName}</span>
                          {alarm.isClosed && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-risk-normal/20 text-risk-normal text-xs">
                              <CheckCircle2 className="w-3 h-3" />
                              已处置
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-cockpit-muted">
                          {formatTime(alarm.triggerTime)}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-cockpit-muted text-xs">当前值</span>
                          <div className={`font-medium ${alarm.level === 'alarm' ? 'text-risk-alarm' : 'text-risk-warning'}`}>
                            {alarm.value.toFixed(alarm.metricType === 'inclination' ? 2 : 1)}
                            <span className="text-cockpit-muted text-xs ml-1">
                              {alarm.metricType === 'inclination' ? '°' : 'mm'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-cockpit-muted text-xs">报警阈值</span>
                          <div className="text-cockpit-text font-medium">
                            {alarm.threshold}
                            <span className="text-cockpit-muted text-xs ml-1">
                              {alarm.metricType === 'inclination' ? '°' : 'mm'}
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-cockpit-muted text-xs">超出比例</span>
                          <div className={`font-medium ${alarm.level === 'alarm' ? 'text-risk-alarm' : 'text-risk-warning'}`}>
                            {((alarm.value / alarm.threshold) * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                      {!alarm.isClosed && (
                        <div className="mt-3 pt-3 border-t border-cockpit-border/30 flex justify-end">
                          <button
                            onClick={() => setShowQuickRecord(true)}
                            className="text-xs text-accent-blue hover:underline flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            快速处置
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'records' && (
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-cockpit-text flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent-blue" />
                  处置记录
                </h3>
                <button
                  onClick={() => setShowQuickRecord(true)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-accent-blue/20 hover:bg-accent-blue/30 text-accent-blue rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  新增记录
                </button>
              </div>

              {areaRecords.length === 0 ? (
                <div className="text-center py-12 text-cockpit-muted">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="mb-2">暂无处置记录</p>
                  <button
                    onClick={() => setShowQuickRecord(true)}
                    className="text-accent-blue hover:underline text-sm"
                  >
                    立即登记第一条记录
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {areaRecords.map((record) => (
                    <div
                      key={record.id}
                      className="p-4 rounded-lg bg-cockpit-bg3/30 border border-cockpit-border/30"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                            {getStatusText(record.status)}
                          </span>
                          <span className="text-sm text-cockpit-text font-medium">
                            {record.issueDescription}
                          </span>
                        </div>
                        <span className="text-xs text-cockpit-muted">
                          {formatDate(record.createTime)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-cockpit-muted" />
                          <span className="text-cockpit-muted">责任人:</span>
                          <span className="text-cockpit-text">{record.personInCharge || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-cockpit-muted" />
                          <span className="text-cockpit-muted">复核人:</span>
                          <span className="text-cockpit-text">{record.reviewer || '-'}</span>
                        </div>
                      </div>
                      {record.rectificationMeasures && (
                        <div className="text-sm text-cockpit-muted">
                          <span className="text-cockpit-text">整改措施: </span>
                          {record.rectificationMeasures}
                        </div>
                      )}
                      {record.reviewConclusion && (
                        <div className="mt-2 text-sm text-cockpit-muted">
                          <span className="text-risk-normal">复核结论: </span>
                          {record.reviewConclusion}
                        </div>
                      )}
                      {record.recoveryTime && (
                        <div className="mt-2 text-xs text-cockpit-muted flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-risk-normal" />
                          恢复时间: {formatDate(record.recoveryTime)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showQuickRecord && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowQuickRecord(false)}
          />
          <div className="relative w-full max-w-lg cockpit-card animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-cockpit-border/50">
              <h3 className="text-lg font-bold text-cockpit-text">快速登记处置记录</h3>
              <button
                onClick={() => setShowQuickRecord(false)}
                className="p-1.5 rounded-lg text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-bg3/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-cockpit-muted mb-2">
                  位置
                </label>
                <div className="px-3 py-2 bg-cockpit-bg3/50 rounded-lg text-cockpit-text text-sm">
                  {building.name} {area.floor}层 {area.axis}
                </div>
              </div>
              <div>
                <label className="block text-sm text-cockpit-muted mb-2">
                  责任人 <span className="text-risk-alarm">*</span>
                </label>
                <input
                  type="text"
                  value={quickRecordForm.personInCharge}
                  onChange={(e) => setQuickRecordForm((prev) => ({ ...prev, personInCharge: e.target.value }))}
                  placeholder="请输入责任人姓名"
                  className="w-full px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text text-sm focus:outline-none focus:border-accent-blue"
                />
              </div>
              <div>
                <label className="block text-sm text-cockpit-muted mb-2">
                  复核人
                </label>
                <input
                  type="text"
                  value={quickRecordForm.reviewer}
                  onChange={(e) => setQuickRecordForm((prev) => ({ ...prev, reviewer: e.target.value }))}
                  placeholder="请输入复核人姓名"
                  className="w-full px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text text-sm focus:outline-none focus:border-accent-blue"
                />
              </div>
              <div>
                <label className="block text-sm text-cockpit-muted mb-2">
                  整改措施
                </label>
                <textarea
                  value={quickRecordForm.rectificationMeasures}
                  onChange={(e) => setQuickRecordForm((prev) => ({ ...prev, rectificationMeasures: e.target.value }))}
                  placeholder="请简要描述整改措施"
                  rows={3}
                  className="w-full px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text text-sm focus:outline-none focus:border-accent-blue resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-cockpit-border/50">
              <button
                onClick={() => setShowQuickRecord(false)}
                className="px-4 py-2 bg-cockpit-bg3 hover:bg-cockpit-bg3/80 text-cockpit-text rounded-lg text-sm font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleQuickAddRecord}
                className="px-4 py-2 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg text-sm font-medium transition-colors"
              >
                提交登记
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
