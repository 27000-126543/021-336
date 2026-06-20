import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, Calendar, Filter, AlertCircle, CheckCircle2, PauseCircle, FileText } from 'lucide-react';
import { useMonitorStore } from '@/store/useStore';
import { DEFAULT_THRESHOLDS } from '@/types';
import type { RiskLevel } from '@/types';
import { getSettlementTrend, getLateralTrend, getInclinationTrend, sensorPoints, componentIds } from '@/data/mockSensorData';
import { getRiskLevel, generateSuggestion, calculateRate, getPeakValue, getRiskBgClass } from '@/utils/riskCalculator';
import TrendChart from '@/components/TrendChart';
import StatusBadge from '@/components/StatusBadge';
import { useNavigate } from 'react-router-dom';

export default function Detail() {
  const location = useLocation();
  const navigate = useNavigate();
  const areas = useMonitorStore((state) => state.areas);
  const buildings = useMonitorStore((state) => state.buildings);

  const [selectedMetric, setSelectedMetric] = useState<'settlement' | 'lateral' | 'inclination'>('settlement');
  const [queryType, setQueryType] = useState<'component' | 'sensor' | 'area'>('area');
  const [queryValue, setQueryValue] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');

  useEffect(() => {
    if (location.state?.areaId) {
      setSelectedAreaId(location.state.areaId);
      setQueryType('area');
    }
  }, [location.state]);

  const selectedArea = useMemo(() => {
    if (selectedAreaId) {
      return areas.find(a => a.id === selectedAreaId);
    }
    return areas[0];
  }, [areas, selectedAreaId]);

  const building = useMemo(() => {
    if (!selectedArea) return null;
    return buildings.find((b) => b.id === selectedArea.buildingId);
  }, [buildings, selectedArea]);

  const trendData = useMemo(() => {
    if (!selectedArea) return { settlement: [], lateral: [], inclination: [] };
    return {
      settlement: getSettlementTrend(selectedArea.id),
      lateral: getLateralTrend(selectedArea.id),
      inclination: getInclinationTrend(selectedArea.id),
    };
  }, [selectedArea]);

  const analysis = useMemo(() => {
    if (!selectedArea) return null;

    const data = trendData[selectedMetric];
    const threshold = DEFAULT_THRESHOLDS[selectedMetric];
    const currentValue = selectedMetric === 'settlement' 
      ? selectedArea.settlement 
      : selectedMetric === 'lateral' 
        ? selectedArea.lateralDisplacement 
        : selectedArea.inclination;

    const level = getRiskLevel(currentValue, threshold);
    const peak = getPeakValue(data);
    const rate = calculateRate(data);
    const suggestion = generateSuggestion(level);

    return {
      currentValue,
      peak,
      rate,
      level,
      threshold,
      suggestion,
      thresholdPercentage: (currentValue / threshold.alarm) * 100,
    };
  }, [selectedArea, selectedMetric, trendData]);

  const metricConfig = {
    settlement: { label: '立杆沉降', unit: 'mm', data: trendData.settlement },
    lateral: { label: '模板侧移', unit: 'mm', data: trendData.lateral },
    inclination: { label: '架体倾斜', unit: '°', data: trendData.inclination },
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!selectedArea || !building || !analysis) return null;

  const handleAddRecord = () => {
    navigate('/records', { 
      state: { 
        prefill: {
          areaId: selectedArea.id,
          buildingName: building.name,
          floor: selectedArea.floor,
          axis: selectedArea.axis,
          riskLevel: selectedArea.status,
          issueDescription: `${building.name}${selectedArea.floor}层${selectedArea.axis} ${metricConfig[selectedMetric].label}${analysis.currentValue.toFixed(selectedMetric === 'inclination' ? 2 : 1)}${metricConfig[selectedMetric].unit}，${analysis.level === 'alarm' ? '超过报警阈值' : '接近预警阈值'}`,
        }
      } 
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cockpit-text font-display flex items-center gap-3">
            <Search className="w-7 h-7 text-accent-blue" />
            监测详情
          </h1>
          <p className="text-cockpit-muted text-sm mt-1">多维度查询监测数据，进行深入分析</p>
        </div>
      </div>

      <div className="cockpit-card p-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-cockpit-muted">查询方式:</span>
            <div className="flex rounded-lg bg-cockpit-bg3 p-1">
              {[
                { value: 'area', label: '浇筑面' },
                { value: 'component', label: '构件编号' },
                { value: 'sensor', label: '传感器' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setQueryType(opt.value as any)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    queryType === opt.value
                      ? 'bg-accent-blue text-white'
                      : 'text-cockpit-muted hover:text-cockpit-text'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {queryType === 'area' && (
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text text-sm focus:outline-none focus:border-accent-blue"
            >
              {areas.map((area) => {
                const b = buildings.find((b) => b.id === area.buildingId);
                return (
                  <option key={area.id} value={area.id}>
                    {b?.name} {area.floor}层 {area.axis}
                  </option>
                );
              })}
            </select>
          )}

          {queryType === 'component' && (
            <select
              value={queryValue}
              onChange={(e) => setQueryValue(e.target.value)}
              className="px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text text-sm focus:outline-none focus:border-accent-blue min-w-[180px]"
            >
              <option value="">选择构件编号</option>
              {componentIds.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          )}

          {queryType === 'sensor' && (
            <select
              value={queryValue}
              onChange={(e) => setQueryValue(e.target.value)}
              className="px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text text-sm focus:outline-none focus:border-accent-blue min-w-[220px]"
            >
              <option value="">选择传感器</option>
              {sensorPoints.map((s) => (
                <option key={s.id} value={s.id}>{s.id} - {s.name}</option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cockpit-muted" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text text-sm focus:outline-none focus:border-accent-blue"
            />
            <span className="text-cockpit-muted">至</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text text-sm focus:outline-none focus:border-accent-blue"
            />
          </div>

          <button className="flex items-center gap-2 px-4 py-2 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg text-sm font-medium transition-colors">
            <Filter className="w-4 h-4" />
            查询
          </button>
        </div>
      </div>

      <div className="cockpit-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-cockpit-text">
              {building.name} {selectedArea.floor}层 {selectedArea.axis}
            </h3>
            <p className="text-sm text-cockpit-muted mt-1">
              数据更新: {formatTime(selectedArea.updateTime)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge level={selectedArea.status} size="lg" />
            <button
              onClick={handleAddRecord}
              className="flex items-center gap-2 px-4 py-2 bg-risk-warning/20 hover:bg-risk-warning/30 text-risk-warning rounded-lg text-sm font-medium transition-colors"
            >
              <FileText className="w-4 h-4" />
              登记处置记录
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {(Object.keys(metricConfig) as Array<keyof typeof metricConfig>).map((key) => (
            <button
              key={key}
              onClick={() => setSelectedMetric(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedMetric === key
                  ? 'bg-accent-blue text-white'
                  : 'bg-cockpit-bg3 text-cockpit-muted hover:text-cockpit-text'
              }`}
            >
              {metricConfig[key].label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="cockpit-card p-4">
            <div className="text-sm text-cockpit-muted mb-2">当前值</div>
            <div className="text-3xl font-bold font-display" style={{ color: analysis.level === 'alarm' ? '#EF4444' : analysis.level === 'warning' ? '#F59E0B' : '#10B981' }}>
              {analysis.currentValue.toFixed(selectedMetric === 'inclination' ? 2 : 1)}
              <span className="text-sm text-cockpit-muted ml-1">{metricConfig[selectedMetric].unit}</span>
            </div>
          </div>
          <div className="cockpit-card p-4">
            <div className="text-sm text-cockpit-muted mb-2">峰值</div>
            <div className="text-3xl font-bold text-cockpit-text font-display">
              {analysis.peak.toFixed(selectedMetric === 'inclination' ? 2 : 1)}
              <span className="text-sm text-cockpit-muted ml-1">{metricConfig[selectedMetric].unit}</span>
            </div>
          </div>
          <div className="cockpit-card p-4">
            <div className="text-sm text-cockpit-muted mb-2">平均变化速率</div>
            <div className={`text-3xl font-bold font-display ${analysis.rate > 0 ? 'text-risk-alarm' : 'text-risk-normal'}`}>
              {analysis.rate.toFixed(selectedMetric === 'inclination' ? 3 : 2)}
              <span className="text-sm text-cockpit-muted ml-1">{metricConfig[selectedMetric].unit}/h</span>
            </div>
          </div>
          <div className="cockpit-card p-4">
            <div className="text-sm text-cockpit-muted mb-2">阈值占比</div>
            <div className="text-3xl font-bold font-display" style={{ color: analysis.thresholdPercentage > 100 ? '#EF4444' : analysis.thresholdPercentage > 80 ? '#F59E0B' : '#10B981' }}>
              {analysis.thresholdPercentage.toFixed(0)}
              <span className="text-sm text-cockpit-muted ml-1">%</span>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="h-3 bg-cockpit-bg3 rounded-full overflow-hidden mb-2">
            <div className="relative h-full">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, analysis.thresholdPercentage)}%`,
                  backgroundColor: analysis.level === 'alarm' ? '#EF4444' : analysis.level === 'warning' ? '#F59E0B' : '#10B981',
                }}
              />
              <div
                className="absolute inset-y-0 w-0.5 bg-risk-warning"
                style={{ left: `${(analysis.threshold.warning / analysis.threshold.alarm) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between text-xs text-cockpit-muted">
            <span>0</span>
            <span className="text-risk-warning">预警: {analysis.threshold.warning}{metricConfig[selectedMetric].unit}</span>
            <span className="text-risk-alarm">报警: {analysis.threshold.alarm}{metricConfig[selectedMetric].unit}</span>
          </div>
        </div>

        <TrendChart
          data={metricConfig[selectedMetric].data}
          title={metricConfig[selectedMetric].label}
          unit={metricConfig[selectedMetric].unit}
          warningThreshold={analysis.threshold.warning}
          alarmThreshold={analysis.threshold.alarm}
          level={analysis.level as RiskLevel}
          height={300}
        />
      </div>

      <div className={`cockpit-card p-5 border-l-4 ${getRiskBgClass(analysis.level)}`} style={{ borderLeftColor: analysis.suggestion.action === 'pause' ? '#EF4444' : analysis.suggestion.action === 'review' ? '#F59E0B' : '#10B981' }}>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-full bg-cockpit-bg3">
            {analysis.suggestion.action === 'observe' && <CheckCircle2 className="w-8 h-8 text-risk-normal" />}
            {analysis.suggestion.action === 'review' && <AlertCircle className="w-8 h-8 text-risk-warning" />}
            {analysis.suggestion.action === 'pause' && <PauseCircle className="w-8 h-8 text-risk-alarm" />}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-cockpit-text mb-2">
              处置建议: {analysis.suggestion.title}
            </h3>
            <p className="text-cockpit-text/90 mb-3">{analysis.suggestion.description}</p>
            <p className="text-sm text-cockpit-muted/70">{analysis.suggestion.basis}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
