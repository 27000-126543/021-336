import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { FileText, Plus, Search, Filter, Clock, User, CheckCircle, XCircle, AlertTriangle, Camera, Send } from 'lucide-react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<DisposalRecord | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewConclusion, setReviewConclusion] = useState('');

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
      const matchSearch = !searchQuery || 
        r.buildingName.includes(searchQuery) ||
        r.issueDescription.includes(searchQuery) ||
        r.personInCharge.includes(searchQuery);
      return matchStatus && matchSearch;
    });
  }, [records, statusFilter, searchQuery]);

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
    });
  };

  const handleReview = (record: DisposalRecord) => {
    setSelectedRecord(record);
    setShowReviewModal(true);
    setReviewConclusion('');
  };

  const handleCompleteReview = () => {
    if (selectedRecord && reviewConclusion) {
      updateRecord(selectedRecord.id, {
        status: 'completed',
        reviewTime: new Date().toISOString(),
        recoveryTime: new Date().toISOString(),
        reviewConclusion,
      });
      setShowReviewModal(false);
      setSelectedRecord(null);
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
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          新增记录
        </button>
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
              className="cockpit-card p-5 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
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
                    <p className="text-cockpit-text/90 text-sm mb-3">{record.issueDescription}</p>
                    <div className="flex items-center gap-6 text-xs text-cockpit-muted">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        创建时间: {formatTime(record.createTime)}
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
                        <span className="flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-risk-normal" />
                          复核时间: {formatTime(record.reviewTime)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {record.status === 'pending' && (
                    <button
                      onClick={() => handleReview(record)}
                      className="px-4 py-2 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      开始复核
                    </button>
                  )}
                  {record.status === 'reviewing' && (
                    <button
                      onClick={() => handleReview(record)}
                      className="px-4 py-2 bg-risk-warning hover:bg-risk-warning/80 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      完成复核
                    </button>
                  )}
                  {record.status === 'completed' && (
                    <button className="px-4 py-2 bg-cockpit-bg3 text-cockpit-muted rounded-lg text-sm font-medium cursor-not-allowed">
                      已完成
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-cockpit-border/50 grid grid-cols-2 gap-6">
                <div>
                  <div className="text-xs text-cockpit-muted mb-1">整改措施</div>
                  <p className="text-sm text-cockpit-text/80">{record.rectificationMeasures}</p>
                </div>
                <div>
                  <div className="text-xs text-cockpit-muted mb-1">照片说明</div>
                  <p className="text-sm text-cockpit-text/80 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" />
                    {record.photoDescription}
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
    </div>
  );
}
