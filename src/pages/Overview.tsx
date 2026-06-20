import { useMemo } from 'react';
import { Activity, TrendingUp, AlertTriangle, Calendar, Clock } from 'lucide-react';
import { useMonitorStore, useAlarmStats, useAreasByBuilding } from '@/store/useStore';
import { DEFAULT_THRESHOLDS } from '@/types';
import MetricCard from '@/components/MetricCard';
import RiskMatrix from '@/components/RiskMatrix';
import StatusBadge from '@/components/StatusBadge';

export default function Overview() {
  const selectedBuildingId = useMonitorStore((state) => state.selectedBuildingId);
  const buildings = useMonitorStore((state) => state.buildings);
  const areas = useMonitorStore((state) => state.areas);
  const alarmStats = useAlarmStats();
  const buildingAreas = useAreasByBuilding(selectedBuildingId);
  
  const building = useMemo(() => {
    return buildings.find((b) => b.id === selectedBuildingId);
  }, [buildings, selectedBuildingId]);

  const avgMetrics = useMemo(() => {
    if (buildingAreas.length === 0) {
      return { settlement: 0, lateral: 0, inclination: 0, progress: 0 };
    }
    const sum = buildingAreas.reduce(
      (acc, area) => ({
        settlement: acc.settlement + area.settlement,
        lateral: acc.lateral + area.lateralDisplacement,
        inclination: acc.inclination + area.inclination,
        progress: acc.progress + area.pouringProgress,
      }),
      { settlement: 0, lateral: 0, inclination: 0, progress: 0 }
    );
    return {
      settlement: sum.settlement / buildingAreas.length,
      lateral: sum.lateral / buildingAreas.length,
      inclination: sum.inclination / buildingAreas.length,
      progress: sum.progress / buildingAreas.length,
    };
  }, [buildingAreas]);

  const recentAlarms = useMemo(() => {
    return areas
      .filter((a) => a.status !== 'normal')
      .sort((a, b) => new Date(b.updateTime).getTime() - new Date(a.updateTime).getTime())
      .slice(0, 5);
  }, [areas]);

  if (!building) return null;

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cockpit-text font-display flex items-center gap-3">
            <Activity className="w-7 h-7 text-accent-blue" />
            项目总览
          </h1>
          <p className="text-cockpit-muted text-sm mt-1">实时监控各楼栋高支模风险状态</p>
        </div>
        <div className="flex items-center gap-4 text-sm text-cockpit-muted">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>今日报警 {alarmStats.today} 次</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>本周报警 {alarmStats.week} 次</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="平均立杆沉降"
          value={avgMetrics.settlement}
          unit="mm"
          threshold={DEFAULT_THRESHOLDS.settlement}
          trend="stable"
          change={0.2}
        />
        <MetricCard
          title="平均模板侧移"
          value={avgMetrics.lateral}
          unit="mm"
          threshold={DEFAULT_THRESHOLDS.lateral}
          trend="up"
          change={0.15}
        />
        <MetricCard
          title="平均架体倾斜"
          value={avgMetrics.inclination}
          unit="°"
          threshold={DEFAULT_THRESHOLDS.inclination}
          decimals={2}
          trend="stable"
          change={0.02}
        />
        <div className="cockpit-card p-5 cockpit-card-hover">
          <div className="flex items-start justify-between mb-3">
            <span className="text-cockpit-muted text-sm">平均浇筑进度</span>
            <TrendingUp className="w-4 h-4 text-accent-blue" />
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="font-display text-3xl font-bold text-accent-blue">
              {avgMetrics.progress.toFixed(0)}
            </span>
            <span className="text-cockpit-muted text-sm">%</span>
          </div>
          <div className="mb-2">
            <div className="h-2 bg-cockpit-bg3 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-cyan transition-all duration-700"
                style={{ width: `${avgMetrics.progress}%` }}
              />
            </div>
          </div>
          <div className="flex justify-between text-xs text-cockpit-muted">
            <span>已浇筑 {buildingAreas.filter(a => a.pouringProgress >= 100).length} 面</span>
            <span>共 {buildingAreas.length} 面</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <RiskMatrix building={building} areas={buildingAreas} />
        </div>

        <div className="space-y-6">
          <div className="cockpit-card p-5">
            <h3 className="text-lg font-bold text-cockpit-text mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-risk-warning" />
              风险区域排行
            </h3>
            <div className="space-y-3">
              {recentAlarms.length === 0 ? (
                <div className="text-center py-8 text-cockpit-muted">
                  暂无风险区域
                </div>
              ) : (
                recentAlarms.map((area) => {
                  const b = buildings.find((b) => b.id === area.buildingId);
                  return (
                    <div
                      key={area.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-cockpit-bg3/30 hover:bg-cockpit-bg3/50 transition-colors"
                    >
                      <div>
                        <div className="text-sm font-medium text-cockpit-text">
                          {b?.name} {area.floor}层 {area.axis}
                        </div>
                        <div className="text-xs text-cockpit-muted mt-1 flex items-center gap-2">
                          <span>沉降 {area.settlement}mm</span>
                          <span>侧移 {area.lateralDisplacement}mm</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge level={area.status} size="sm" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="cockpit-card p-5">
            <h3 className="text-lg font-bold text-cockpit-text mb-4">状态分布</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-cockpit-muted flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-risk-normal" />
                    正常
                  </span>
                  <span className="text-risk-normal font-medium">{alarmStats.normal} 个区域</span>
                </div>
                <div className="h-2 bg-cockpit-bg3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-risk-normal rounded-full transition-all duration-700"
                    style={{ width: `${(alarmStats.normal / areas.length) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-cockpit-muted flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-risk-warning" />
                    预警
                  </span>
                  <span className="text-risk-warning font-medium">{alarmStats.warning} 个区域</span>
                </div>
                <div className="h-2 bg-cockpit-bg3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-risk-warning rounded-full transition-all duration-700"
                    style={{ width: `${(alarmStats.warning / areas.length) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-cockpit-muted flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-risk-alarm" />
                    报警
                  </span>
                  <span className="text-risk-alarm font-medium">{alarmStats.alarm} 个区域</span>
                </div>
                <div className="h-2 bg-cockpit-bg3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-risk-alarm rounded-full transition-all duration-700"
                    style={{ width: `${(alarmStats.alarm / areas.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-cockpit-border/50">
              <div className="text-xs text-cockpit-muted">
                最近更新: {formatTime(new Date().toISOString())}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
