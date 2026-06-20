import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  FileText, Plus, Search, Filter, Clock, User, CheckCircle, 
  XCircle, AlertTriangle, Camera, Send, Download, FileSpreadsheet,
  ChevronDown, Building2, CalendarDays
} from 'lucide-react';
import { useMonitorStore } from '@/store/useStore';
import type { DisposalRecord, RiskLevel } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import { getRiskBgClass } from '@/utils/riskCalculator';

export default function Records() {
  const location = useLocation();
  const records = useMonitorStore((state) => state.records);
  const addRecord = useMonitorStore((state) => state.addRecord);
  const updateRecord = useMonitorStore((state) => state.updateRecord);
  const areas = useMonitorStore((state) => state.areas);
  const buildings = useMonitorStore((state) => state.buildings);

  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<DisposalRecord | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewConclusion, setReviewConclusion] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

  const [formData, setFormData] = useState({
    areaId: '',
    buildingName: '',
    floor: 1,
    axis: '',
    issueDescription: '',
    riskLevel: 'warning' as RiskLevel,
    personInCharge: '',
    reviewer: '',
    rectificationMeasures: '',
    photoDescription: '',
    recoveryTime: '',
  });

  useMemo(() => {
    if (location.state?.prefill) {
      setFormData(location.state.prefill);
      setShowModal(true);
    }
  }, [location.state]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchBuilding = buildingFilter === 'all' || r.buildingName === buildingFilter;
      const matchSearch = !searchQuery || 
        r.buildingName.includes(searchQuery) ||
        r.issueDescription.includes(searchQuery) ||
        r.personInCharge.includes(searchQuery);
      
      let matchDate = true;
      if (dateFilter.start) {
        matchDate = matchDate && new Date(r.createTime) >= new Date(dateFilter.start);
      }
      if (dateFilter.end) {
        const endDate = new Date(dateFilter.end);
        endDate.setHours(23, 59, 59);
        matchDate = matchDate && new Date(r.createTime) <= endDate;
      }
      
      return matchStatus && matchBuilding && matchSearch && matchDate;
    }).sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
  }, [records, statusFilter, buildingFilter, searchQuery, dateFilter]);

  const weeklyReportData = useMemo(() => {
    const sourceRecords = filteredRecords.length > 0 ? filteredRecords : records;
    
    const byBuilding: Record<string, { total: number; pending: number; reviewing: number; completed: number; alarm: number; warning: number }> = {};
    let totalPending = 0;
    let totalCompleted = 0;
    let totalReviewing = 0;
    let totalAlarms = 0;
    let totalWarnings = 0;

    sourceRecords.forEach((r) => {
      if (!byBuilding[r.buildingName]) {
        byBuilding[r.buildingName] = { total: 0, pending: 0, reviewing: 0, completed: 0, alarm: 0, warning: 0 };
      }
      byBuilding[r.buildingName].total++;
      if (r.status === 'pending') { byBuilding[r.buildingName].pending++; totalPending++; }
      if (r.status === 'reviewing') { byBuilding[r.buildingName].reviewing++; totalReviewing++; }
      if (r.status === 'completed') { byBuilding[r.buildingName].completed++; totalCompleted++; }
      if (r.riskLevel === 'alarm') { byBuilding[r.buildingName].alarm++; totalAlarms++; }
      if (r.riskLevel === 'warning') { byBuilding[r.buildingName].warning++; totalWarnings++; }
    });

    const unclosedRecords = sourceRecords.filter((r) => r.status !== 'completed');

    return {
      weekRecords: sourceRecords,
      byBuilding,
      totalRecords: sourceRecords.length,
      totalPending,
      totalReviewing,
      totalCompleted,
      totalAlarms,
      totalWarnings,
      unclosedRecords,
      completionRate: sourceRecords.length > 0 ? ((totalCompleted / sourceRecords.length) * 100).toFixed(1) : '0',
    };
  }, [filteredRecords, records]);

  const statusLabels: Record<string, string> = {
    all: '全部',
    pending: '待处理',
    reviewing: '复核中',
    completed: '已完成',
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-risk-warning/20 text-risk-warning',
    reviewing: 'bg-accent-blue/20 text-accent-blue',
    completed: 'bg-risk-normal/20 text-risk-normal',
  };

  const buildingNames = useMemo(() => {
    return [...new Set(records.map((r) => r.buildingName))];
  }, [records]);

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addRecord({
      ...formData,
      photoUrls: [],
      status: 'pending',
    });
    setShowModal(false);
    setFormData({
      areaId: '',
      buildingName: '',
      floor: 1,
      axis: '',
      issueDescription: '',
      riskLevel: 'warning',
      personInCharge: '',
      reviewer: '',
      rectificationMeasures: '',
      photoDescription: '',
      recoveryTime: '',
    });
  };

  const handleStartReview = (record: DisposalRecord) => {
    updateRecord(record.id, { status: 'reviewing' });
  };

  const handleReview = (record: DisposalRecord) => {
    setSelectedRecord(record);
    setShowReviewModal(true);
    setReviewConclusion('');
    if (record.recoveryTime) {
      setFormData((prev) => ({ ...prev, recoveryTime: record.recoveryTime!.slice(0, 16) }));
    } else {
      setFormData((prev) => ({ ...prev, recoveryTime: '' }));
    }
  };

  const handleCompleteReview = () => {
    if (selectedRecord && reviewConclusion) {
      let finalRecoveryTime: string;
      if (formData.recoveryTime) {
        finalRecoveryTime = new Date(formData.recoveryTime).toISOString();
      } else if (selectedRecord.recoveryTime) {
        finalRecoveryTime = selectedRecord.recoveryTime;
      } else {
        finalRecoveryTime = new Date().toISOString();
      }
      
      updateRecord(selectedRecord.id, {
        status: 'completed',
        reviewTime: new Date().toISOString(),
        recoveryTime: finalRecoveryTime,
        reviewConclusion,
      });
      setShowReviewModal(false);
      setSelectedRecord(null);
      setFormData((prev) => ({ ...prev, recoveryTime: '' }));
    }
  };

  const areaOptions = useMemo(() => {
    return areas.map((area) => {
      const b = buildings.find((b) => b.id === area.buildingId);
      return {
        value: area.id,
        label: `${b?.name} ${area.floor}层 ${area.axis}`,
        buildingName: b?.name || '',
        floor: area.floor,
        axis: area.axis,
      };
    });
  }, [areas, buildings]);

  const handleAreaChange = (areaId: string) => {
    const area = areaOptions.find((a) => a.value === areaId);
    if (area) {
      setFormData({
        ...formData,
        areaId,
        buildingName: area.buildingName,
        floor: area.floor,
        axis: area.axis,
      });
    }
  };

  const handleViewDetail = (record: DisposalRecord) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  const getTimeline = (record: DisposalRecord) => {
    const timeline: { time: string; event: string; status: string }[] = [];
    
    timeline.push({
      time: record.createTime,
      event: '问题登记',
      status: 'created',
    });

    if (record.status === 'reviewing' || record.status === 'completed') {
      timeline.push({
        time: record.reviewTime || record.createTime,
        event: '开始复核',
        status: 'reviewing',
      });
    }

    if (record.status === 'completed') {
      timeline.push({
        time: record.reviewTime || new Date().toISOString(),
        event: '复核完成，闭环',
        status: 'completed',
      });
    }

    if (record.recoveryTime) {
      timeline.push({
        time: record.recoveryTime,
        event: '恢复正常',
        status: 'recovered',
      });
    }

    return timeline.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cockpit-text font-display flex items-center gap-3">
            <FileText className="w-7 h-7 text-accent-blue" />
            处置记录
          </h1>
          <p className="text-cockpit-muted text-sm mt-1">管理整改过程，追溯责任闭环</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cockpit-bg3 hover:bg-cockpit-bg3/80 text-cockpit-text rounded-lg font-medium transition-colors"
          >
            <FileSpreadsheet className="w-5 h-5" />
            周报预览
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            新增记录
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="cockpit-card p-5">
          <div className="text-cockpit-muted text-sm mb-2">本周登记</div>
          <div className="text-3xl font-bold font-display text-cockpit-text">
            {weeklyReportData.totalRecords}
          </div>
          <div className="text-xs text-cockpit-muted mt-1">条记录</div>
        </div>
        <div className="cockpit-card p-5">
          <div className="text-cockpit-muted text-sm mb-2">待处理</div>
          <div className="text-3xl font-bold font-display text-risk-warning">
            {weeklyReportData.totalPending}
          </div>
          <div className="text-xs text-cockpit-muted mt-1">需要处理</div>
        </div>
        <div className="cockpit-card p-5">
          <div className="text-cockpit-muted text-sm mb-2">已完成</div>
          <div className="text-3xl font-bold font-display text-risk-normal">
            {weeklyReportData.totalCompleted}
          </div>
          <div className="text-xs text-cockpit-muted mt-1">闭环率 {weeklyReportData.completionRate}%</div>
        </div>
        <div className="cockpit-card p-5">
          <div className="text-cockpit-muted text-sm mb-2">未闭环</div>
          <div className="text-3xl font-bold font-display text-risk-alarm">
            {weeklyReportData.unclosedRecords.length}
          </div>
          <div className="text-xs text-cockpit-muted mt-1">需要跟进</div>
        </div>
      </div>

      <div className="cockpit-card p-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cockpit-muted" />
            <input
              type="text"
              placeholder="搜索楼栋、问题描述、责任人..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text text-sm focus:outline-none focus:border-accent-blue"
            />
          </div>

          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-cockpit-muted" />
            <select
              value={buildingFilter}
              onChange={(e) => setBuildingFilter(e.target.value)}
              className="px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text text-sm focus:outline-none focus:border-accent-blue"
            >
              <option value="all">全部楼栋</option>
              {buildingNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-cockpit-muted" />
            <div className="flex rounded-lg bg-cockpit-bg3 p-1">
              {Object.entries(statusLabels).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    statusFilter === value
                      ? 'bg-accent-blue text-white'
                      : 'text-cockpit-muted hover:text-cockpit-text'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-cockpit-muted" />
            <input
              type="date"
              value={dateFilter.start}
              onChange={(e) => setDateFilter((prev) => ({ ...prev, start: e.target.value }))}
              className="px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text text-sm focus:outline-none focus:border-accent-blue"
            />
            <span className="text-cockpit-muted">至</span>
            <input
              type="date"
              value={dateFilter.end}
              onChange={(e) => setDateFilter((prev) => ({ ...prev, end: e.target.value }))}
              className="px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text text-sm focus:outline-none focus:border-accent-blue"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredRecords.length === 0 ? (
          <div className="cockpit-card p-12 text-center">
            <FileText className="w-16 h-16 text-cockpit-muted/30 mx-auto mb-4" />
            <p className="text-cockpit-muted">暂无处置记录</p>
          </div>
        ) : (
          filteredRecords.map((record, index) => (
            <div
              key={record.id}
              className="cockpit-card p-5 animate-slide-up cursor-pointer hover:border-accent-blue/50 transition-all"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => handleViewDetail(record)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full ${getRiskBgClass(record.riskLevel)}`}>
                    {record.riskLevel === 'alarm' ? (
                      <XCircle className="w-6 h-6" />
                    ) : (
                      <AlertTriangle className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-cockpit-text">
                        {record.buildingName} {record.floor}层 {record.axis}
                      </h3>
                      <StatusBadge level={record.riskLevel} size="sm" />
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[record.status]}`}>
                        {statusLabels[record.status]}
                      </span>
                    </div>
                    <p className="text-cockpit-text/90 text-sm mb-3 line-clamp-2">{record.issueDescription}</p>
                    <div className="flex items-center gap-6 text-xs text-cockpit-muted">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        创建: {formatDate(record.createTime)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        责任人: {record.personInCharge}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        复核人: {record.reviewer}
                      </span>
                      {record.reviewTime && (
                        <span className="flex items-center gap-1.5 text-risk-normal">
                          <CheckCircle className="w-3.5 h-3.5" />
                          复核: {formatDate(record.reviewTime)}
                        </span>
                      )}
                      {record.recoveryTime && (
                        <span className="flex items-center gap-1.5 text-accent-blue">
                          <Clock className="w-3.5 h-3.5" />
                          恢复: {formatDate(record.recoveryTime)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {record.status === 'pending' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartReview(record);
                      }}
                      className="px-4 py-2 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      开始复核
                    </button>
                  )}
                  {record.status === 'reviewing' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReview(record);
                      }}
                      className="px-4 py-2 bg-risk-warning hover:bg-risk-warning/80 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      完成复核
                    </button>
                  )}
                  {record.status === 'completed' && (
                    <span className="px-4 py-2 bg-risk-normal/20 text-risk-normal rounded-lg text-sm font-medium">
                      已闭环
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-cockpit-border/50 grid grid-cols-2 gap-6">
                <div>
                  <div className="text-xs text-cockpit-muted mb-1">整改措施</div>
                  <p className="text-sm text-cockpit-text/80 line-clamp-2">{record.rectificationMeasures || '-'}</p>
                </div>
                <div>
                  <div className="text-xs text-cockpit-muted mb-1">照片说明</div>
                  <p className="text-sm text-cockpit-text/80 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" />
                    {record.photoDescription || '无'}
                  </p>
                </div>
              </div>

              {record.reviewConclusion && (
                <div className="mt-4 pt-4 border-t border-cockpit-border/50">
                  <div className="text-xs text-cockpit-muted mb-1">复核结论</div>
                  <p className="text-sm text-risk-normal">{record.reviewConclusion}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden cockpit-card animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-cockpit-border/50">
              <h2 className="text-xl font-bold text-cockpit-text">新增处置记录</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-bg3/50 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto scrollbar-thin max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-cockpit-muted mb-2">选择浇筑面</label>
                  <select
                    value={formData.areaId}
                    onChange={(e) => handleAreaChange(e.target.value)}
                    className="w-full px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text focus:outline-none focus:border-accent-blue"
                    required
                  >
                    <option value="">请选择</option>
                    {areaOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-cockpit-muted mb-2">风险等级</label>
                  <select
                    value={formData.riskLevel}
                    onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value as RiskLevel })}
                    className="w-full px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text focus:outline-none focus:border-accent-blue"
                    required
                  >
                    <option value="warning">预警</option>
                    <option value="alarm">报警</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-cockpit-muted mb-2">问题描述</label>
                <textarea
                  value={formData.issueDescription}
                  onChange={(e) => setFormData({ ...formData, issueDescription: e.target.value })}
                  className="w-full px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text focus:outline-none focus:border-accent-blue min-h-[80px]"
                  placeholder="请详细描述问题情况..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-cockpit-muted mb-2">责任人</label>
                  <input
                    type="text"
                    value={formData.personInCharge}
                    onChange={(e) => setFormData({ ...formData, personInCharge: e.target.value })}
                    className="w-full px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text focus:outline-none focus:border-accent-blue"
                    placeholder="请输入责任人姓名"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-cockpit-muted mb-2">复核人</label>
                  <input
                    type="text"
                    value={formData.reviewer}
                    onChange={(e) => setFormData({ ...formData, reviewer: e.target.value })}
                    className="w-full px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text focus:outline-none focus:border-accent-blue"
                    placeholder="请输入复核人姓名"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-cockpit-muted mb-2">整改措施</label>
                <textarea
                  value={formData.rectificationMeasures}
                  onChange={(e) => setFormData({ ...formData, rectificationMeasures: e.target.value })}
                  className="w-full px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text focus:outline-none focus:border-accent-blue min-h-[80px]"
                  placeholder="请描述已采取的整改措施..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-cockpit-muted mb-2">照片说明</label>
                  <input
                    type="text"
                    value={formData.photoDescription}
                    onChange={(e) => setFormData({ ...formData, photoDescription: e.target.value })}
                    className="w-full px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text focus:outline-none focus:border-accent-blue"
                    placeholder="请描述现场照片内容..."
                  />
                </div>
                <div>
                  <label className="block text-sm text-cockpit-muted mb-2">实际恢复时间</label>
                  <input
                    type="datetime-local"
                    value={formData.recoveryTime}
                    onChange={(e) => setFormData({ ...formData, recoveryTime: e.target.value })}
                    className="w-full px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text focus:outline-none focus:border-accent-blue"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-cockpit-border/50">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 bg-cockpit-bg3 text-cockpit-text rounded-lg font-medium hover:bg-cockpit-bg3/80 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg font-medium transition-colors"
                >
                  <Send className="w-4 h-4" />
                  提交记录
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReviewModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowReviewModal(false)} />
          <div className="relative w-full max-w-lg cockpit-card animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-cockpit-border/50">
              <h2 className="text-xl font-bold text-cockpit-text">完成复核</h2>
              <button
                onClick={() => setShowReviewModal(false)}
                className="p-2 rounded-lg text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-bg3/50 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="cockpit-card p-4 bg-cockpit-bg3/30">
                <div className="font-medium text-cockpit-text mb-1">
                  {selectedRecord.buildingName} {selectedRecord.floor}层 {selectedRecord.axis}
                </div>
                <p className="text-sm text-cockpit-muted">{selectedRecord.issueDescription}</p>
              </div>

              <div>
                <label className="block text-sm text-cockpit-muted mb-2">实际恢复时间</label>
                <input
                  type="datetime-local"
                  value={formData.recoveryTime}
                  onChange={(e) => setFormData({ ...formData, recoveryTime: e.target.value })}
                  className="w-full px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text focus:outline-none focus:border-accent-blue"
                />
              </div>

              <div>
                <label className="block text-sm text-cockpit-muted mb-2">复核结论</label>
                <textarea
                  value={reviewConclusion}
                  onChange={(e) => setReviewConclusion(e.target.value)}
                  className="w-full px-3 py-2 bg-cockpit-bg3 border border-cockpit-border/50 rounded-lg text-cockpit-text focus:outline-none focus:border-accent-blue min-h-[100px]"
                  placeholder="请输入复核结论，确认整改是否到位..."
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-cockpit-border/50">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="px-5 py-2 bg-cockpit-bg3 text-cockpit-text rounded-lg font-medium hover:bg-cockpit-bg3/80 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCompleteReview}
                  disabled={!reviewConclusion}
                  className="flex items-center gap-2 px-5 py-2 bg-risk-normal hover:bg-risk-normal/80 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  确认完成
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDetailModal(false)} />
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden cockpit-card animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-cockpit-border/50">
              <h2 className="text-xl font-bold text-cockpit-text">记录详情</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 rounded-lg text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-bg3/50 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto scrollbar-thin max-h-[calc(85vh-70px)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${getRiskBgClass(selectedRecord.riskLevel)}`}>
                    {selectedRecord.riskLevel === 'alarm' ? (
                      <XCircle className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-cockpit-text text-lg">
                      {selectedRecord.buildingName} {selectedRecord.floor}层 {selectedRecord.axis}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge level={selectedRecord.riskLevel} size="sm" />
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[selectedRecord.status]}`}>
                        {statusLabels[selectedRecord.status]}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-cockpit-text mb-2">问题描述</h4>
                <p className="text-cockpit-text/80 text-sm bg-cockpit-bg3/30 p-3 rounded-lg">
                  {selectedRecord.issueDescription}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-cockpit-text mb-3">处置时间线</h4>
                <div className="relative pl-6 space-y-4">
                  {getTimeline(selectedRecord).map((item, idx) => (
                    <div key={idx} className="relative">
                      <div className={`absolute -left-6 top-1 w-3 h-3 rounded-full ${
                        item.status === 'completed' || item.status === 'recovered'
                          ? 'bg-risk-normal'
                          : item.status === 'reviewing'
                          ? 'bg-accent-blue'
                          : 'bg-risk-warning'
                      }`} />
                      {idx < getTimeline(selectedRecord).length - 1 && (
                        <div className="absolute -left-[22px] top-4 w-0.5 h-full bg-cockpit-border/50" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-cockpit-text">{item.event}</div>
                        <div className="text-xs text-cockpit-muted mt-0.5">{formatTime(item.time)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-cockpit-text mb-2">责任人</h4>
                  <p className="text-cockpit-text/80 text-sm">{selectedRecord.personInCharge}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-cockpit-text mb-2">复核人</h4>
                  <p className="text-cockpit-text/80 text-sm">{selectedRecord.reviewer}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-cockpit-text mb-2">整改措施</h4>
                <p className="text-cockpit-text/80 text-sm bg-cockpit-bg3/30 p-3 rounded-lg">
                  {selectedRecord.rectificationMeasures || '-'}
                </p>
              </div>

              {selectedRecord.photoDescription && (
                <div>
                  <h4 className="text-sm font-medium text-cockpit-text mb-2">照片说明</h4>
                  <p className="text-cockpit-text/80 text-sm flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    {selectedRecord.photoDescription}
                  </p>
                </div>
              )}

              {selectedRecord.reviewConclusion && (
                <div>
                  <h4 className="text-sm font-medium text-cockpit-text mb-2">复核结论</h4>
                  <p className="text-risk-normal text-sm bg-risk-normal/10 p-3 rounded-lg border border-risk-normal/30">
                    {selectedRecord.reviewConclusion}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowReportModal(false)} />
          <div className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden cockpit-card animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-cockpit-border/50">
              <h2 className="text-xl font-bold text-cockpit-text flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6 text-accent-blue" />
                每周风险处置周报
              </h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-2 rounded-lg text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-bg3/50 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-6 overflow-y-auto scrollbar-thin max-h-[calc(85vh-70px)]">
              <div className="text-center pb-4 border-b border-cockpit-border/50">
                <h3 className="text-2xl font-bold text-cockpit-text font-display">高支模监测风险处置周报</h3>
                <p className="text-cockpit-muted text-sm mt-2">
                  统计周期: {dateFilter.start || '不限'} - {dateFilter.end || '不限'}
                  {buildingFilter !== 'all' && ` | 楼栋: ${buildingFilter}`}
                  {statusFilter !== 'all' && ` | 状态: ${statusLabels[statusFilter]}`}
                  {searchQuery && ` | 搜索: ${searchQuery}`}
                </p>
                <p className="text-xs text-cockpit-muted/60 mt-1">
                  * 预览内容与页面筛选条件一致
                </p>
              </div>

              <div className="grid grid-cols-5 gap-4">
                <div className="text-center p-4 bg-cockpit-bg3/50 rounded-lg">
                  <div className="text-3xl font-bold font-display text-cockpit-text">{weeklyReportData.totalRecords}</div>
                  <div className="text-xs text-cockpit-muted mt-1">本周登记</div>
                </div>
                <div className="text-center p-4 bg-risk-alarm/10 rounded-lg">
                  <div className="text-3xl font-bold font-display text-risk-alarm">{weeklyReportData.totalAlarms}</div>
                  <div className="text-xs text-cockpit-muted mt-1">报警等级</div>
                </div>
                <div className="text-center p-4 bg-risk-warning/10 rounded-lg">
                  <div className="text-3xl font-bold font-display text-risk-warning">{weeklyReportData.totalWarnings}</div>
                  <div className="text-xs text-cockpit-muted mt-1">预警等级</div>
                </div>
                <div className="text-center p-4 bg-risk-normal/10 rounded-lg">
                  <div className="text-3xl font-bold font-display text-risk-normal">{weeklyReportData.totalCompleted}</div>
                  <div className="text-xs text-cockpit-muted mt-1">已闭环</div>
                </div>
                <div className="text-center p-4 bg-accent-blue/10 rounded-lg">
                  <div className="text-3xl font-bold font-display text-accent-blue">{weeklyReportData.completionRate}%</div>
                  <div className="text-xs text-cockpit-muted mt-1">闭环率</div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-bold text-cockpit-text mb-3">按楼栋统计</h4>
                <div className="space-y-3">
                  {Object.entries(weeklyReportData.byBuilding).map(([building, stats]) => (
                    <div key={building} className="p-4 bg-cockpit-bg3/30 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-cockpit-text">{building}</span>
                        <span className="text-sm text-cockpit-muted">共 {stats.total} 条记录</span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-cockpit-muted">待处理: </span>
                          <span className={stats.pending > 0 ? 'text-risk-warning font-medium' : 'text-cockpit-text'}>
                            {stats.pending}
                          </span>
                        </div>
                        <div>
                          <span className="text-cockpit-muted">复核中: </span>
                          <span className={stats.reviewing > 0 ? 'text-accent-blue font-medium' : 'text-cockpit-text'}>
                            {stats.reviewing}
                          </span>
                        </div>
                        <div>
                          <span className="text-cockpit-muted">已完成: </span>
                          <span className={stats.completed > 0 ? 'text-risk-normal font-medium' : 'text-cockpit-text'}>
                            {stats.completed}
                          </span>
                        </div>
                        <div>
                          <span className="text-cockpit-muted">闭环率: </span>
                          <span className="text-cockpit-text font-medium">
                            {stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-lg font-bold text-cockpit-text mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-risk-warning" />
                  未闭环项清单
                  {weeklyReportData.unclosedRecords.length > 0 && (
                    <span className="text-sm font-normal text-risk-alarm">
                      ({weeklyReportData.unclosedRecords.length}项待处理)
                    </span>
                  )}
                </h4>
                <div className="space-y-2">
                  {weeklyReportData.unclosedRecords.length === 0 ? (
                    <div className="text-center py-8 text-cockpit-muted bg-cockpit-bg3/20 rounded-lg">
                      <CheckCircle className="w-12 h-12 text-risk-normal/50 mx-auto mb-2" />
                      <p>所有问题均已闭环，真棒！</p>
                    </div>
                  ) : (
                    weeklyReportData.unclosedRecords.map((record) => (
                      <div key={record.id} className="p-3 bg-cockpit-bg3/30 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <StatusBadge level={record.riskLevel} size="sm" />
                          <div>
                            <div className="text-sm font-medium text-cockpit-text">
                              {record.buildingName} {record.floor}层 {record.axis}
                            </div>
                            <div className="text-xs text-cockpit-muted mt-0.5 line-clamp-1">
                              {record.issueDescription}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xs px-2 py-0.5 rounded-full ${statusColors[record.status]}`}>
                            {statusLabels[record.status]}
                          </div>
                          <div className="text-xs text-cockpit-muted mt-1">
                            责任人: {record.personInCharge}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-cockpit-border/50 flex justify-end gap-3">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-5 py-2 bg-cockpit-bg3 text-cockpit-text rounded-lg font-medium hover:bg-cockpit-bg3/80 transition-colors"
                >
                  关闭
                </button>
                <button
                  onClick={() => {
                    alert('导出功能开发中，将导出为Excel格式');
                  }}
                  className="flex items-center gap-2 px-5 py-2 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  导出Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
