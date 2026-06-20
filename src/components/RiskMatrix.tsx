import { useState, Fragment } from 'react';
import { cn } from '@/lib/utils';
import type { PouringArea, Building } from '@/types';
import { getRiskGlowClass } from '@/utils/riskCalculator';
import TrendModal from './TrendModal';

interface RiskMatrixProps {
  building: Building;
  areas: PouringArea[];
}

const riskBgColors = {
  normal: 'bg-risk-normal/80 hover:bg-risk-normal',
  warning: 'bg-risk-warning/80 hover:bg-risk-warning',
  alarm: 'bg-risk-alarm/80 hover:bg-risk-alarm',
};

export default function RiskMatrix({ building, areas }: RiskMatrixProps) {
  const [selectedArea, setSelectedArea] = useState<PouringArea | null>(null);
  const [hoveredArea, setHoveredArea] = useState<PouringArea | null>(null);

  const floors = [...new Set(areas.map((a) => a.floor))].sort((a, b) => b - a);
  const axes = building.axes;

  const getArea = (floor: number, axis: string) => {
    return areas.find((a) => a.floor === floor && a.axis === axis);
  };

  return (
    <Fragment>
      <div className="cockpit-card p-5 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-cockpit-text">{building.name} - 风险矩阵</h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-risk-normal" />
              <span className="text-cockpit-muted">正常</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-risk-warning" />
              <span className="text-cockpit-muted">预警</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-risk-alarm" />
              <span className="text-cockpit-muted">报警</span>
            </div>
          </div>
        </div>

        <div className="min-w-max">
          <div className="grid gap-1" style={{ gridTemplateColumns: `80px repeat(${axes.length}, minmax(80px, 1fr))` }}>
            <div className="h-10 flex items-center justify-center text-cockpit-muted text-xs font-medium">
              楼层\轴线
            </div>
            {axes.map((axis) => (
              <div
                key={axis}
                className="h-10 flex items-center justify-center text-cockpit-muted text-xs font-medium border-b border-cockpit-border/50"
              >
                {axis}
              </div>
            ))}

            {floors.map((floor) => (
              <Fragment key={`floor-${floor}`}>
                <div
                  className="h-16 flex items-center justify-center text-cockpit-text text-sm font-medium border-r border-cockpit-border/50"
                >
                  {floor}层
                </div>
                {axes.map((axis) => {
                  const area = getArea(floor, axis);
                  const isHovered = hoveredArea?.id === area?.id;

                  if (!area) {
                    return (
                      <div
                        key={`empty-${floor}-${axis}`}
                        className="h-16 bg-cockpit-bg3/30 rounded border border-dashed border-cockpit-border/30"
                      />
                    );
                  }

                  return (
                    <button
                      key={area.id}
                      onClick={() => setSelectedArea(area)}
                      onMouseEnter={() => setHoveredArea(area)}
                      onMouseLeave={() => setHoveredArea(null)}
                      className={cn(
                        'h-16 rounded border border-transparent relative',
                        'transition-all duration-200 transform',
                        riskBgColors[area.status],
                        getRiskGlowClass(area.status),
                        isHovered && 'scale-105 z-10'
                      )}
                    >
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                        <span className="text-xs font-medium">{area.pouringProgress}%</span>
                        <div className="w-10 h-1 bg-white/30 rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-white rounded-full"
                            style={{ width: `${area.pouringProgress}%` }}
                          />
                        </div>
                      </div>

                      {(area.alarmCount24h > 0 || area.warningCount24h > 0) && (
                        <div className="absolute -top-1 -right-1 flex gap-0.5">
                          {area.alarmCount24h > 0 && (
                            <span className="bg-risk-alarm text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                              {area.alarmCount24h}
                            </span>
                          )}
                          {area.warningCount24h > 0 && (
                            <span className="bg-risk-warning text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                              {area.warningCount24h}
                            </span>
                          )}
                        </div>
                      )}

                      {isHovered && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-56 cockpit-card p-3 text-left animate-fade-in pointer-events-none">
                          <div className="text-sm font-medium text-cockpit-text mb-2">
                            {building.name} {floor}层 {axis}
                          </div>
                          <div className="space-y-1 text-xs text-cockpit-muted">
                            <div className="flex justify-between">
                              <span>立杆沉降:</span>
                              <span className="text-cockpit-text">{area.settlement} mm</span>
                            </div>
                            <div className="flex justify-between">
                              <span>模板侧移:</span>
                              <span className="text-cockpit-text">{area.lateralDisplacement} mm</span>
                            </div>
                            <div className="flex justify-between">
                              <span>架体倾斜:</span>
                              <span className="text-cockpit-text">{area.inclination}°</span>
                            </div>
                            <div className="flex justify-between">
                              <span>浇筑进度:</span>
                              <span className="text-cockpit-text">{area.pouringProgress}%</span>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-cockpit-border/50 text-[10px] text-cockpit-muted">
                            点击查看24小时趋势
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      {selectedArea && (
        <TrendModal
          area={selectedArea}
          building={building}
          onClose={() => setSelectedArea(null)}
        />
      )}
    </Fragment>
  );
}
