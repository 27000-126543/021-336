import { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Search, Calendar, Filter, AlertCircle, CheckCircle2, PauseCircle, 
  FileText, BarChart2, GitCompare, Clock, User, Plus, ChevronDown 
} from 'lucide-react';
import { useMonitorStore } from '@/store/useStore';
import { DEFAULT_THRESHOLDS } from '@/types';
import type { RiskLevel, AlarmRecord, DisposalRecord } from '@/types';
import { 
  getSettlementTrend, getLateralTrend, getInclinationTrend, 
  getSensorTrend, getComponentTrend, filterTrendByDateRange,
  getDateRangeHours 
} from '@/data/mockSensorData';
import { 
  getRiskLevel, generateSuggestion, calculateRate, 
  getPeakValue, getRiskBgClass 
} from '@/utils/riskCalculator';
import TrendChart from '@/components/TrendChart';
import StatusBadge from '@/components/StatusBadge';

type QueryType = 'area' | 'component' | 'sensor';
type MetricType = 'settlement' | 'lateral' | 'inclination';
type ViewMode = 'single' | 'compare';
type CompareType = 'area' | 'sensor';

export default function Detail() {
  const location = useLocation();
  const navigate = useNavigate();
  const areas = useMonitorStore((state) => state.areas);
  const buildings = useMonitorStore((state) => state.buildings);
  const sensors = useMonitorStore((state) => state.sensors);
  const components = useMonitorStore((state) => state.components);
  const alarmRecords = useMonitorStore((state) => state.alarmRecords);
  const disposalRecords = useMonitorStore((state) => state.records);
  const addRecord = useMonitorStore((state) => state.addRecord);
  const linkRecordToAlarm = useMonitorStore((state) => state.linkRecordToAlarm);

  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [queryType, setQueryType] = useState<QueryType>('area');
  const [queryValue, setQueryValue] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('settlement');
  const [appliedQuery, setAppliedQuery] = useState<{
    type: QueryType;
    value: string;
    start: string;
    end: string;
  } | null>(null);
  const [compareAreaIds, setCompareAreaIds] = useState<string[]>([]);
  const [compareSensorIds, setCompareSensorIds] = useState<string[]>([]);
  const [compareType, setCompareType] = useState<CompareType>('area');
  const [showComparePanel, setShowComparePanel] = useState(false);

  useEffect(() => {
    if (location.state?.areaId) {
      setSelectedAreaId(location.state.areaId);
      setQueryType('area');
      setQueryValue(location.state.areaId);
      setAppliedQuery({
        type: 'area',
        value: location.state.areaId,
        start: '',
        end: '',
      });
    }
  }, [location.state]);

  const currentArea = useMemo(() => {
    if (queryType === 'area' && appliedQuery?.value) {
      return areas.find((a) => a.id === appliedQuery.value);
    }
    if (queryType === 'component' && appliedQuery?.value) {
      const comp = components.find((c) => c.id === appliedQuery.value);
      if (comp) return areas.find((a) => a.id === comp.areaId);
    }
    if (queryType === 'sensor' && appliedQuery?.value) {
      const sensor = sensors.find((s) => s.id === appliedQuery.value);
      if (sensor) return areas.find((a) => a.id === sensor.areaId);
    }
    return null;
  }, [appliedQuery, areas, components, sensors, queryType]);

  const building = useMemo(() => {
    if (!currentArea) return null;
    return buildings.find((b) => b.id === currentArea.buildingId);
  }, [buildings, currentArea]);

  const currentSensor = useMemo(() => {
    if (queryType === 'sensor' && appliedQuery?.value) {
      return sensors.find((s) => s.id === appliedQuery.value);
    }
    return null;
  }, [appliedQuery, sensors, queryType]);

  const currentComponent = useMemo(() => {
    if (queryType === 'component' && appliedQuery?.value) {
      return components.find((c) => c.id === appliedQuery.value);
    }
    return null;
  }, [appliedQuery, components, queryType]);

  const hours = useMemo(() => {
    if (appliedQuery?.start && appliedQuery?.end) {
      return getDateRangeHours(appliedQuery.start, appliedQuery.end);
    }
    return 24;
  }, [appliedQuery]);

  const trendData = useMemo(() => {
    let data: { settlement: any[]; lateral: any[]; inclination: any[] } = {
      settlement: [],
      lateral: [],
      inclination: [],
    };

    if (!appliedQuery) return data;

    if (queryType === 'area' && currentArea) {
      data = {
        settlement: getSettlementTrend(currentArea.id, hours),
        lateral: getLateralTrend(currentArea.id, hours),
        inclination: getInclinationTrend(currentArea.id, hours),
      };
    } else if (queryType === 'component' && currentComponent) {
      data = {
        settlement: getComponentTrend(currentComponent.id, 'settlement', hours),
        lateral: getComponentTrend(currentComponent.id, 'lateral', hours),
        inclination: getComponentTrend(currentComponent.id, 'inclination', hours),
      };
    } else if (queryType === 'sensor' && currentSensor) {
      const sensorData = getSensorTrend(currentSensor.id, hours);
      if (currentSensor.type === 'settlement') {
        data.settlement = sensorData;
      } else if (currentSensor.type === 'lateral') {
        data.lateral = sensorData;
      } else {
        data.inclination = sensorData;
      }
    }

    if (appliedQuery.start && appliedQuery.end) {
      data.settlement = filterTrendByDateRange(data.settlement, appliedQuery.start, appliedQuery.end);
      data.lateral = filterTrendByDateRange(data.lateral, appliedQuery.start, appliedQuery.end);
      data.inclination = filterTrendByDateRange(data.inclination, appliedQuery.start, appliedQuery.end);
    }

    return data;
  }, [appliedQuery, queryType, currentArea, currentComponent, currentSensor, hours]);

  const analysis = useMemo(() => {
    if (!appliedQuery) return null;

    const data = trendData[selectedMetric];
    if (data.length === 0) return null;

    const threshold = DEFAULT_THRESHOLDS[selectedMetric];
    
    let currentValue = 0;
    if (currentArea) {
      currentValue = selectedMetric === 'settlement' 
        ? currentArea.settlement 
        : selectedMetric === 'lateral' 
          ? currentArea.lateralDisplacement 
          : currentArea.inclination;
    } else if (data.length > 0) {
      currentValue = data[data.length - 1].value;
    }

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
  }, [trendData, selectedMetric, currentArea, appliedQuery]);

  const areaAlarms = useMemo((): AlarmRecord[] => {
    if (!currentArea) return [];
    return alarmRecords.filter((a) => a.areaId === currentArea.id)
      .sort((a, b) => new Date(b.triggerTime).getTime() - new Date(a.triggerTime).getTime());
  }, [currentArea, alarmRecords]);

  const areaRecords = useMemo((): DisposalRecord[] => {
    if (!currentArea) return [];
    return disposalRecords.filter((r) => r.areaId === currentArea.id)
      .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
  }, [currentArea, disposalRecords]);

  const compareAreas = useMemo(() => {
    if (!currentArea || compareAreaIds.length === 0) return [];
    return areas.filter((a) => compareAreaIds.includes(a.id) && a.id !== currentArea.id);
  }, [areas, currentArea, compareAreaIds]);

  const sameBuildingAreas = useMemo(() => {
    if (!currentArea) return [];
    return areas.filter((a) => a.buildingId === currentArea.buildingId && a.id !== currentArea.id).slice(0, 10);
  }, [areas, currentArea]);

  const sameAreaSensors = useMemo(() => {
    if (!currentArea) return [];
    return sensors.filter((s) => s.areaId === currentArea.id);
  }, [sensors, currentArea]);

  const sameBuildingSensors = useMemo(() => {
    if (!currentArea) return [];
    return sensors.filter((s) => s.buildingId === currentArea.buildingId && s.areaId !== currentArea.id).slice(0, 20);
  }, [sensors, currentArea]);

  const compareSensors = useMemo(() => {
    return sensors.filter((s) => compareSensorIds.includes(s.id));
  }, [sensors, compareSensorIds]);

  const currentBaseSensor = useMemo(() => {
    if (compareType === 'sensor' && currentArea) {
      return sameAreaSensors.find((s) => s.type === selectedMetric) || sameAreaSensors[0];
    }
    return null;
  }, [compareType, currentArea, sameAreaSensors, selectedMetric]);

  const metricConfig = {
    settlement: { label: '立杆沉降', unit: 'mm', data: trendData.settlement },
    lateral: { label: '模板侧移', unit: 'mm', data: trendData.lateral },
    inclination: { label: '架体倾斜', unit: '°', data: trendData.inclination },
  };

  const queryTitle = useMemo(() => {
    if (!appliedQuery) return '请选择查询条件';
    if (queryType === 'area' && currentArea && building) {
      return `${building.name} ${currentArea.floor}层 ${currentArea.axis}`;
    }
    if (queryType === 'component' && currentComponent && building) {
      return `构件: ${currentComponent.id} (${building.name} ${currentArea?.floor}层)`;
    }
    if (queryType === 'sensor' && currentSensor && building) {
      return `传感器: ${currentSensor.id} (${building.name} ${currentArea?.floor}层)`;
    }
    return '查询结果';
  }, [appliedQuery, queryType, currentArea, building, currentComponent, currentSensor]);

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

  const handleQuery = () => {
    let value = '';
    if (queryType === 'area') {
      value = selectedAreaId;
    } else {
      value = queryValue;
    }
    
    if (!value) {
      alert('请选择查询对象');
      return;
    }
    
    if (queryType === 'sensor') {
      const sensor = sensors.find((s) => s.id === value);
      if (sensor) {
        setSelectedMetric(sensor.type);
      }
    }
    
    setAppliedQuery({
      type: queryType,
      value,
      start: dateRange.start,
      end: dateRange.end,
    });
  };

  const handleAddRecord = (alarmId?: string) => {
    if (!currentArea || !building || !analysis) return;
    
    const newRecord = {
      areaId: currentArea.id,
      buildingName: building.name,
      floor: currentArea.floor,
      axis: currentArea.axis,
      issueDescription: `${building.name}${currentArea.floor}层${currentArea.axis} ${metricConfig[selectedMetric].label}${analysis.currentValue.toFixed(selectedMetric === 'inclination' ? 2 : 1)}${metricConfig[selectedMetric].unit}，${analysis.level === 'alarm' ? '超过报警阈值' : '接近预警阈值'}`,
      riskLevel: analysis.level as RiskLevel,
      personInCharge: '',
      reviewer: '',
      rectificationMeasures: '',
      photoUrls: [],
      photoDescription: '',
      status: 'pending' as const,
    };
    
    addRecord(newRecord);
    
    if (alarmId) {
      const newRecordId = disposalRecords.length > 0 ? `r${Date.now()}` : '';
      if (newRecordId) {
        setTimeout(() => linkRecordToAlarm(alarmId, newRecordId), 100);
      }
    }
  };

  const toggleCompareArea = (areaId: string) => {
    setCompareAreaIds((prev) => {
      if (prev.includes(areaId)) {
        return prev.filter((id) => id !== areaId);
      }
      if (prev.length >= 5) {
        return [...prev.slice(1), areaId];
      }
      return [...prev, areaId];
    });
  };

  const toggleCompareSensor = (sensorId: string) => {
    setCompareSensorIds((prev) => {
      if (prev.includes(sensorId)) {
        return prev.filter((id) => id !== sensorId);
      }
      if (prev.length >= 5) {
        return [...prev.slice(1), sensorId];
      }
      return [...prev, sensorId];
    });
  };

  if (!appliedQuery) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-cockpit-text font-display flex items-center gap-3">
            <Search className="w-7 h-7 text-accent-blue" />
            监测详情
          </h1>
          <p className="text-cockpit-muted text-sm mt-1">多维度查询监测数据，进行深入分析</p>
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
                    onClick={() => setQueryType(opt.value as QueryType)}
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
                className="px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text text-sm focus:outline-none focus:border-accent-blue min-w-[200px]"
              >
                <option value="">请选择浇筑面</option>
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
                className="px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text text-sm focus:outline-none focus:border-accent-blue min-w-[220px]"
              >
                <option value="">选择构件编号</option>
                {components.map((c) => (
                  <option key={c.id} value={c.id}>{c.id} - {c.name}</option>
                ))}
              </select>
            )}

            {queryType === 'sensor' && (
              <select
                value={queryValue}
                onChange={(e) => setQueryValue(e.target.value)}
                className="px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text text-sm focus:outline-none focus:border-accent-blue min-w-[280px]"
              >
                <option value="">选择传感器</option>
                {sensors.map((s) => (
                  <option key={s.id} value={s.id}>{s.id} - {s.name}</option>
                ))}
              </select>
            )}

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cockpit-muted" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text text-sm focus:outline-none focus:border-accent-blue"
              />
              <span className="text-cockpit-muted">至</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text text-sm focus:outline-none focus:border-accent-blue"
              />
            </div>

            <button
              onClick={handleQuery}
              className="flex items-center gap-2 px-4 py-2 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Filter className="w-4 h-4" />
              查询
            </button>
          </div>
        </div>

        <div className="cockpit-card p-16 text-center">
          <Search className="w-20 h-20 text-cockpit-muted/20 mx-auto mb-4" />
          <p className="text-cockpit-muted text-lg">请选择查询条件后点击查询按钮</p>
          <p className="text-cockpit-muted/60 text-sm mt-2">支持按浇筑面、构件编号、传感器点位查询</p>
        </div>
      </div>
    );
  }

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('single')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'single'
                ? 'bg-accent-blue text-white'
                : 'bg-cockpit-bg3 text-cockpit-muted hover:text-cockpit-text'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            单目标分析
          </button>
          <button
            onClick={() => {
              setViewMode('compare');
              setShowComparePanel(true);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'compare'
                ? 'bg-accent-blue text-white'
                : 'bg-cockpit-bg3 text-cockpit-muted hover:text-cockpit-text'
            }`}
          >
            <GitCompare className="w-4 h-4" />
            对比分析
          </button>
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
                  onClick={() => setQueryType(opt.value as QueryType)}
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
              className="px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text text-sm focus:outline-none focus:border-accent-blue min-w-[200px]"
            >
              <option value="">请选择浇筑面</option>
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
              className="px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text text-sm focus:outline-none focus:border-accent-blue min-w-[220px]"
            >
              <option value="">选择构件编号</option>
              {components.map((c) => (
                <option key={c.id} value={c.id}>{c.id} - {c.name}</option>
              ))}
            </select>
          )}

          {queryType === 'sensor' && (
            <select
              value={queryValue}
              onChange={(e) => setQueryValue(e.target.value)}
              className="px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text text-sm focus:outline-none focus:border-accent-blue min-w-[280px]"
            >
              <option value="">选择传感器</option>
              {sensors.map((s) => (
                <option key={s.id} value={s.id}>{s.id} - {s.name}</option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cockpit-muted" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text text-sm focus:outline-none focus:border-accent-blue"
            />
            <span className="text-cockpit-muted">至</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text text-sm focus:outline-none focus:border-accent-blue"
            />
          </div>

          <button
            onClick={handleQuery}
            className="flex items-center gap-2 px-4 py-2 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Filter className="w-4 h-4" />
            查询
          </button>
        </div>
      </div>

      {viewMode === 'single' ? (
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-6">
            <div className="cockpit-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-cockpit-text">{queryTitle}</h3>
                  <p className="text-sm text-cockpit-muted mt-1">
                    数据更新: {currentArea ? formatTime(currentArea.updateTime) : '-'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {currentArea && <StatusBadge level={currentArea.status} size="lg" />}
                  <button
                    onClick={() => handleAddRecord()}
                    className="flex items-center gap-2 px-4 py-2 bg-risk-warning/20 hover:bg-risk-warning/30 text-risk-warning rounded-lg text-sm font-medium transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    登记处置记录
                  </button>
                </div>
              </div>

              <div className="flex gap-2 mb-6">
                {((queryType === 'sensor' && currentSensor)
                  ? [currentSensor.type]
                  : (Object.keys(metricConfig) as Array<keyof typeof metricConfig>)
                ).map((key) => (
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

              {analysis ? (
                <>
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="cockpit-card p-4">
                      <div className="text-sm text-cockpit-muted mb-2">当前值</div>
                      <div
                        className="text-3xl font-bold font-display"
                        style={{
                          color:
                            analysis.level === 'alarm'
                              ? '#EF4444'
                              : analysis.level === 'warning'
                              ? '#F59E0B'
                              : '#10B981',
                        }}
                      >
                        {analysis.currentValue.toFixed(selectedMetric === 'inclination' ? 2 : 1)}
                        <span className="text-sm text-cockpit-muted ml-1">
                          {metricConfig[selectedMetric].unit}
                        </span>
                      </div>
                    </div>
                    <div className="cockpit-card p-4">
                      <div className="text-sm text-cockpit-muted mb-2">峰值</div>
                      <div className="text-3xl font-bold text-cockpit-text font-display">
                        {analysis.peak.toFixed(selectedMetric === 'inclination' ? 2 : 1)}
                        <span className="text-sm text-cockpit-muted ml-1">
                          {metricConfig[selectedMetric].unit}
                        </span>
                      </div>
                    </div>
                    <div className="cockpit-card p-4">
                      <div className="text-sm text-cockpit-muted mb-2">平均变化速率</div>
                      <div
                        className={`text-3xl font-bold font-display ${
                          analysis.rate > 0 ? 'text-risk-alarm' : 'text-risk-normal'
                        }`}
                      >
                        {analysis.rate.toFixed(selectedMetric === 'inclination' ? 3 : 2)}
                        <span className="text-sm text-cockpit-muted ml-1">
                          {metricConfig[selectedMetric].unit}/h
                        </span>
                      </div>
                    </div>
                    <div className="cockpit-card p-4">
                      <div className="text-sm text-cockpit-muted mb-2">阈值占比</div>
                      <div
                        className="text-3xl font-bold font-display"
                        style={{
                          color:
                            analysis.thresholdPercentage > 100
                              ? '#EF4444'
                              : analysis.thresholdPercentage > 80
                              ? '#F59E0B'
                              : '#10B981',
                        }}
                      >
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
                            backgroundColor:
                              analysis.level === 'alarm'
                                ? '#EF4444'
                                : analysis.level === 'warning'
                                ? '#F59E0B'
                                : '#10B981',
                          }}
                        />
                        <div
                          className="absolute inset-y-0 w-0.5 bg-risk-warning"
                          style={{
                            left: `${(analysis.threshold.warning / analysis.threshold.alarm) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-cockpit-muted">
                      <span>0</span>
                      <span className="text-risk-warning">
                        预警: {analysis.threshold.warning}
                        {metricConfig[selectedMetric].unit}
                      </span>
                      <span className="text-risk-alarm">
                        报警: {analysis.threshold.alarm}
                        {metricConfig[selectedMetric].unit}
                      </span>
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
                </>
              ) : (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-cockpit-muted/30 mx-auto mb-3" />
                  <p className="text-cockpit-muted">请选择有效的查询条件</p>
                </div>
              )}
            </div>

            {analysis ? (
              <div
                className={`cockpit-card p-5 border-l-4 ${getRiskBgClass(analysis.level)}`}
                style={{
                  borderLeftColor:
                    analysis.suggestion.action === 'pause'
                      ? '#EF4444'
                      : analysis.suggestion.action === 'review'
                      ? '#F59E0B'
                      : '#10B981',
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-cockpit-bg3">
                    {analysis.suggestion.action === 'observe' && (
                      <CheckCircle2 className="w-8 h-8 text-risk-normal" />
                    )}
                    {analysis.suggestion.action === 'review' && (
                      <AlertCircle className="w-8 h-8 text-risk-warning" />
                    )}
                    {analysis.suggestion.action === 'pause' && (
                      <PauseCircle className="w-8 h-8 text-risk-alarm" />
                    )}
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
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="cockpit-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-cockpit-text flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-risk-alarm" />
                  最近报警
                </h3>
                <span className="text-xs text-cockpit-muted">共 {areaAlarms.length} 条</span>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin">
                {areaAlarms.length === 0 ? (
                  <div className="text-center py-6 text-cockpit-muted">
                    暂无报警记录
                  </div>
                ) : (
                  areaAlarms.slice(0, 10).map((alarm) => (
                    <div
                      key={alarm.id}
                      className="p-3 rounded-lg bg-cockpit-bg3/30 border border-cockpit-border/30"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-cockpit-text">
                          {alarm.metricName}
                        </span>
                        <StatusBadge level={alarm.level} size="sm" />
                      </div>
                      <div className="text-xs text-cockpit-muted mb-2">
                        触发时间: {formatTime(alarm.triggerTime)}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-cockpit-muted">
                          当前值: <span className={alarm.level === 'alarm' ? 'text-risk-alarm font-medium' : 'text-risk-warning font-medium'}>
                            {alarm.value.toFixed(alarm.metricType === 'inclination' ? 2 : 1)}
                          </span> / 阈值: {alarm.threshold}
                        </span>
                        {alarm.isClosed ? (
                          <span className="text-risk-normal text-xs">已处置</span>
                        ) : (
                          <button
                            onClick={() => handleAddRecord(alarm.id)}
                            className="text-accent-blue hover:underline text-xs"
                          >
                            快速处置
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="cockpit-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-cockpit-text flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent-blue" />
                  关联处置记录
                </h3>
                <button
                  onClick={() => handleAddRecord()}
                  className="text-accent-blue hover:underline text-xs flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  新增
                </button>
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin">
                {areaRecords.length === 0 ? (
                  <div className="text-center py-6 text-cockpit-muted">
                    暂无处置记录
                  </div>
                ) : (
                  areaRecords.map((record) => (
                    <div
                      key={record.id}
                      className="p-3 rounded-lg bg-cockpit-bg3/30 border border-cockpit-border/30"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            record.status === 'completed'
                              ? 'bg-risk-normal/20 text-risk-normal'
                              : record.status === 'reviewing'
                              ? 'bg-accent-blue/20 text-accent-blue'
                              : 'bg-risk-warning/20 text-risk-warning'
                          }`}
                        >
                          {record.status === 'completed'
                            ? '已完成'
                            : record.status === 'reviewing'
                            ? '复核中'
                            : '待处理'}
                        </span>
                        <span className="text-xs text-cockpit-muted">
                          {formatDate(record.createTime)}
                        </span>
                      </div>
                      <p className="text-sm text-cockpit-text/90 mb-2 line-clamp-2">
                        {record.issueDescription}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-cockpit-muted">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {record.personInCharge}
                        </span>
                        {record.reviewTime && (
                          <span className="flex items-center gap-1 text-risk-normal">
                            <CheckCircle2 className="w-3 h-3" />
                            已复核
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="cockpit-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-bold text-cockpit-text flex items-center gap-2">
                  <GitCompare className="w-5 h-5 text-accent-blue" />
                  对比分析
                  {compareType === 'area' && compareAreaIds.length > 0 && (
                    <span className="text-sm font-normal text-cockpit-muted">
                      (已选 {compareAreaIds.length + 1} 个对象)
                    </span>
                  )}
                  {compareType === 'sensor' && compareSensorIds.length > 0 && (
                    <span className="text-sm font-normal text-cockpit-muted">
                      (已选 {compareSensorIds.length + 1} 个对象)
                    </span>
                  )}
                </h3>
                <div className="flex rounded-lg bg-cockpit-bg3 p-1">
                  <button
                    onClick={() => {
                      setCompareType('area');
                      setCompareSensorIds([]);
                    }}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      compareType === 'area'
                        ? 'bg-accent-blue text-white'
                        : 'text-cockpit-muted hover:text-cockpit-text'
                    }`}
                  >
                    按浇筑面
                  </button>
                  <button
                    onClick={() => {
                      setCompareType('sensor');
                      setCompareAreaIds([]);
                    }}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      compareType === 'sensor'
                        ? 'bg-accent-blue text-white'
                        : 'text-cockpit-muted hover:text-cockpit-text'
                    }`}
                  >
                    按传感器
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowComparePanel(!showComparePanel)}
                className="flex items-center gap-2 text-sm text-accent-blue hover:underline"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showComparePanel ? 'rotate-180' : ''}`} />
                选择对比对象
              </button>
            </div>

            {showComparePanel && (
              <div className="mb-4 p-4 bg-cockpit-bg3/30 rounded-lg">
                {compareType === 'area' ? (
                  <>
                    <div className="text-sm text-cockpit-muted mb-3">
                      同楼栋其他浇筑面 (最多对比5个):
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {sameBuildingAreas.map((area) => (
                        <button
                          key={area.id}
                          onClick={() => toggleCompareArea(area.id)}
                          className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                            compareAreaIds.includes(area.id)
                              ? 'bg-accent-blue text-white'
                              : 'bg-cockpit-bg3 text-cockpit-muted hover:text-cockpit-text'
                          }`}
                        >
                          {area.floor}层 {area.axis}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-3">
                      <div className="text-sm text-cockpit-muted mb-2">
                        本浇筑面传感器:
                      </div>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {sameAreaSensors.map((sensor) => (
                          <button
                            key={sensor.id}
                            onClick={() => toggleCompareSensor(sensor.id)}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                              compareSensorIds.includes(sensor.id) || sensor.id === currentBaseSensor?.id
                                ? 'bg-accent-blue text-white'
                                : 'bg-cockpit-bg3 text-cockpit-muted hover:text-cockpit-text'
                            }`}
                          >
                            {sensor.name.split('-')[0]}
                          </button>
                        ))}
                      </div>
                      <div className="text-sm text-cockpit-muted mb-2">
                        同楼栋其他传感器 (最多对比5个):
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {sameBuildingSensors.map((sensor) => (
                          <button
                            key={sensor.id}
                            onClick={() => toggleCompareSensor(sensor.id)}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                              compareSensorIds.includes(sensor.id)
                                ? 'bg-accent-blue text-white'
                                : 'bg-cockpit-bg3 text-cockpit-muted hover:text-cockpit-text'
                            }`}
                          >
                            {sensor.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {compareType === 'area' ? (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div
                    className={`p-4 rounded-lg border-2 transition-all ${
                      viewMode === 'compare'
                        ? 'border-accent-blue bg-accent-blue/10'
                        : 'border-transparent bg-cockpit-bg3/50'
                    }`}
                  >
                    <div className="text-xs text-cockpit-muted mb-1">基准对象</div>
                    <div className="text-sm font-medium text-cockpit-text">
                      {currentArea?.floor}层 {currentArea?.axis}
                    </div>
                  </div>
                  {compareAreas.map((area) => (
                    <div
                      key={area.id}
                      className="p-4 rounded-lg bg-cockpit-bg3/50 border border-cockpit-border/50"
                    >
                      <div className="text-xs text-cockpit-muted mb-1">对比对象</div>
                      <div className="text-sm font-medium text-cockpit-text flex items-center justify-between">
                        <span>{area.floor}层 {area.axis}</span>
                        <button
                          onClick={() => toggleCompareArea(area.id)}
                          className="text-cockpit-muted hover:text-risk-alarm text-xs"
                        >
                          移除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-6">
                  {(['settlement', 'lateral', 'inclination'] as MetricType[]).map((metric) => {
                    const metricLabel = metric === 'settlement' ? '立杆沉降' : metric === 'lateral' ? '模板侧移' : '架体倾斜';
                    const metricUnit = metric === 'inclination' ? '°' : 'mm';
                    
                    const mainData = currentArea 
                      ? (metric === 'settlement' ? getSettlementTrend(currentArea.id) 
                        : metric === 'lateral' ? getLateralTrend(currentArea.id) 
                        : getInclinationTrend(currentArea.id))
                      : [];
                    
                    const compareDatasets = compareAreas.map((area) => ({
                      name: `${area.floor}层 ${area.axis}`,
                      data: metric === 'settlement' ? getSettlementTrend(area.id) 
                        : metric === 'lateral' ? getLateralTrend(area.id) 
                        : getInclinationTrend(area.id),
                    }));

                    return (
                      <div key={metric} className="cockpit-card p-4">
                        <h4 className="font-medium text-cockpit-text mb-3">{metricLabel} 对比</h4>
                        <div className="h-64">
                          <TrendChart
                            data={mainData}
                            title=""
                            unit={metricUnit}
                            warningThreshold={DEFAULT_THRESHOLDS[metric].warning}
                            alarmThreshold={DEFAULT_THRESHOLDS[metric].alarm}
                            level="normal"
                            height={240}
                            compareData={compareDatasets}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="cockpit-card p-4">
                    <h4 className="text-sm font-medium text-cockpit-text mb-3">阈值占比对比</h4>
                    <div className="space-y-3">
                      {currentArea && (
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-accent-blue font-medium">基准对象</span>
                            <span className="text-cockpit-text">
                              {((currentArea.settlement / DEFAULT_THRESHOLDS.settlement.alarm) * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-2 bg-cockpit-bg3 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent-blue rounded-full"
                              style={{ width: `${Math.min(100, (currentArea.settlement / DEFAULT_THRESHOLDS.settlement.alarm) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {compareAreas.map((area) => (
                        <div key={area.id}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-cockpit-muted">{area.floor}层 {area.axis}</span>
                            <span className="text-cockpit-text">
                              {((area.settlement / DEFAULT_THRESHOLDS.settlement.alarm) * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="h-2 bg-cockpit-bg3 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                area.status === 'alarm' ? 'bg-risk-alarm' : area.status === 'warning' ? 'bg-risk-warning' : 'bg-risk-normal'
                              }`}
                              style={{ width: `${Math.min(100, (area.settlement / DEFAULT_THRESHOLDS.settlement.alarm) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="cockpit-card p-4">
                    <h4 className="text-sm font-medium text-cockpit-text mb-3">峰值对比</h4>
                    <div className="space-y-2 text-sm">
                      {currentArea && (
                        <div className="flex justify-between items-center py-1">
                          <span className="text-cockpit-muted">基准对象</span>
                          <span className="text-accent-blue font-medium">{currentArea.settlement.toFixed(1)} mm</span>
                        </div>
                      )}
                      {compareAreas.map((area) => (
                        <div key={area.id} className="flex justify-between items-center py-1">
                          <span className="text-cockpit-muted">{area.floor}层 {area.axis}</span>
                          <span className={`font-medium ${
                            area.status === 'alarm' ? 'text-risk-alarm' : area.status === 'warning' ? 'text-risk-warning' : 'text-risk-normal'
                          }`}>
                            {area.settlement.toFixed(1)} mm
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="cockpit-card p-4">
                    <h4 className="text-sm font-medium text-cockpit-text mb-3">风险状态</h4>
                    <div className="space-y-2 text-sm">
                      {currentArea && (
                        <div className="flex justify-between items-center py-1">
                          <span className="text-cockpit-muted">基准对象</span>
                          <StatusBadge level={currentArea.status} size="sm" />
                        </div>
                      )}
                      {compareAreas.map((area) => (
                        <div key={area.id} className="flex justify-between items-center py-1">
                          <span className="text-cockpit-muted">{area.floor}层 {area.axis}</span>
                          <StatusBadge level={area.status} size="sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="mb-6 p-4 bg-cockpit-bg3/30 rounded-lg">
                  <div className="text-sm text-cockpit-muted mb-3">已选传感器 ({compareSensorIds.length + 1} 个):</div>
                  <div className="flex flex-wrap gap-2">
                    {currentBaseSensor && (
                      <span className="px-3 py-1.5 text-sm rounded-lg bg-accent-blue text-white flex items-center gap-2">
                        {currentBaseSensor.name}
                        <span className="text-xs opacity-70">
                          [{currentBaseSensor.type === 'settlement' ? '沉降' : currentBaseSensor.type === 'lateral' ? '侧移' : '倾斜'}]
                        </span>
                      </span>
                    )}
                    {compareSensors.map((sensor) => (
                      <span
                        key={sensor.id}
                        className="px-3 py-1.5 text-sm rounded-lg bg-cockpit-bg3 text-cockpit-text flex items-center gap-2"
                      >
                        {sensor.name}
                        <span className="text-xs text-cockpit-muted">
                          [{sensor.type === 'settlement' ? '沉降' : sensor.type === 'lateral' ? '侧移' : '倾斜'}]
                        </span>
                        <button
                          onClick={() => toggleCompareSensor(sensor.id)}
                          className="text-cockpit-muted hover:text-risk-alarm text-xs ml-1"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {(['settlement', 'lateral', 'inclination'] as MetricType[]).map((metricType) => {
                  const metricLabel = metricType === 'settlement' ? '立杆沉降' : metricType === 'lateral' ? '模板侧移' : '架体倾斜';
                  const metricUnit = metricType === 'inclination' ? '°' : 'mm';
                  const thresholdConfig = DEFAULT_THRESHOLDS[metricType];

                  const allSensors = [
                    ...(currentBaseSensor ? [currentBaseSensor] : []),
                    ...compareSensors,
                  ];
                  const typedSensors = allSensors.filter((s) => s.type === metricType);

                  if (typedSensors.length === 0) return null;

                  const baseTypedSensor = typedSensors[0];
                  const compareTypedSensors = typedSensors.slice(1);

                  return (
                    <div key={metricType} className="space-y-4 mb-6">
                      <div className="cockpit-card p-4">
                        <h4 className="font-medium text-cockpit-text mb-3 flex items-center gap-2">
                          {metricLabel}
                          <span className="text-xs font-normal text-cockpit-muted">
                            (单位: {metricUnit}，预警: {thresholdConfig.warning}，报警: {thresholdConfig.alarm})
                          </span>
                        </h4>
                        <div className="h-64">
                          <TrendChart
                            data={getSensorTrend(baseTypedSensor.id)}
                            title=""
                            unit={metricUnit}
                            warningThreshold={thresholdConfig.warning}
                            alarmThreshold={thresholdConfig.alarm}
                            level="normal"
                            height={240}
                            compareData={compareTypedSensors.map((sensor) => ({
                              name: sensor.name,
                              data: getSensorTrend(sensor.id),
                            }))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="cockpit-card p-4">
                          <h4 className="text-sm font-medium text-cockpit-text mb-3">阈值占比对比 ({metricLabel})</h4>
                          <div className="space-y-3">
                            {typedSensors.map((sensor, idx) => {
                              const data = getSensorTrend(sensor.id);
                              const peak = getPeakValue(data);
                              const level = getRiskLevel(peak, thresholdConfig);
                              const isBase = idx === 0;
                              return (
                                <div key={sensor.id}>
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className={isBase ? 'text-accent-blue font-medium' : 'text-cockpit-muted'}>
                                      {sensor.name}
                                      {isBase && ' (基准)'}
                                    </span>
                                    <span className="text-cockpit-text">
                                      {((peak / thresholdConfig.alarm) * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  <div className="h-2 bg-cockpit-bg3 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        isBase ? 'bg-accent-blue' :
                                        level === 'alarm' ? 'bg-risk-alarm' : level === 'warning' ? 'bg-risk-warning' : 'bg-risk-normal'
                                      }`}
                                      style={{ width: `${Math.min(100, (peak / thresholdConfig.alarm) * 100)}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="cockpit-card p-4">
                          <h4 className="text-sm font-medium text-cockpit-text mb-3">峰值对比 ({metricLabel})</h4>
                          <div className="space-y-2 text-sm">
                            {typedSensors.map((sensor, idx) => {
                              const peak = getPeakValue(getSensorTrend(sensor.id));
                              const level = getRiskLevel(peak, thresholdConfig);
                              const isBase = idx === 0;
                              return (
                                <div key={sensor.id} className="flex justify-between items-center py-1">
                                  <span className={isBase ? 'text-accent-blue font-medium' : 'text-cockpit-muted'}>
                                    {sensor.name}
                                    {isBase && ' (基准)'}
                                  </span>
                                  <span className={`font-medium ${
                                    isBase ? 'text-accent-blue' :
                                    level === 'alarm' ? 'text-risk-alarm' : level === 'warning' ? 'text-risk-warning' : 'text-risk-normal'
                                  }`}>
                                    {peak.toFixed(metricType === 'inclination' ? 2 : 1)} {metricUnit}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
