import { useMemo } from 'react';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMonitorStore } from '@/store/useStore';

export default function Sidebar() {
  const buildings = useMonitorStore((state) => state.buildings);
  const areas = useMonitorStore((state) => state.areas);
  const selectedBuildingId = useMonitorStore((state) => state.selectedBuildingId);
  const selectBuilding = useMonitorStore((state) => state.selectBuilding);

  const buildingStats = useMemo(() => {
    return buildings.map((building) => {
      const buildingAreas = areas.filter((a) => a.buildingId === building.id);
      const alarmCount = buildingAreas.filter((a) => a.status === 'alarm').length;
      const warningCount = buildingAreas.filter((a) => a.status === 'warning').length;
      return {
        ...building,
        areasCount: buildingAreas.length,
        alarmCount,
        warningCount,
      };
    });
  }, [buildings, areas]);

  return (
    <div className="w-64 bg-cockpit-bg2/50 backdrop-blur-sm border-r border-cockpit-border/50 flex flex-col">
      <div className="p-4 border-b border-cockpit-border/50">
        <h2 className="text-lg font-bold text-cockpit-text flex items-center gap-2">
          <Building2 className="w-5 h-5 text-accent-blue" />
          楼栋列表
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">
        {buildingStats.map((building) => {
          const isSelected = selectedBuildingId === building.id;

          return (
            <button
              key={building.id}
              onClick={() => selectBuilding(building.id)}
              className={cn(
                'w-full text-left p-3 rounded-lg transition-all duration-200',
                'hover:bg-accent-blue/10',
                isSelected
                  ? 'bg-accent-blue/20 border border-accent-blue/40'
                  : 'border border-transparent'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  'font-medium',
                  isSelected ? 'text-accent-blue' : 'text-cockpit-text'
                )}>
                  {building.name}
                </span>
                {building.alarmCount > 0 && (
                  <span className="bg-risk-alarm/20 text-risk-alarm text-xs px-2 py-0.5 rounded-full">
                    {building.alarmCount}处报警
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-cockpit-muted mb-2">
                <span>共{building.areasCount}个监测面</span>
                {building.warningCount > 0 && (
                  <span className="text-risk-warning">{building.warningCount}处预警</span>
                )}
              </div>

              <div className="relative h-1.5 bg-cockpit-bg3 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent-blue to-accent-cyan rounded-full transition-all duration-500"
                  style={{ width: `${building.progress}%` }}
                />
              </div>
              <div className="text-right text-xs text-cockpit-muted mt-1">
                施工进度 {building.progress}%
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
