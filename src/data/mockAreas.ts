import type { PouringArea } from '@/types';

function generateAreasForBuilding(buildingId: string, floors: number, axes: string[]): PouringArea[] {
  const areas: PouringArea[] = [];
  const now = new Date();

  for (let floor = 1; floor <= Math.min(floors, 10); floor++) {
    axes.forEach((axis, axisIndex) => {
      const id = `${buildingId}-f${floor}-a${axisIndex}`;
      const baseSettlement = 3 + Math.random() * 8;
      const baseLateral = 2 + Math.random() * 6;
      const baseInclination = 0.1 + Math.random() * 0.35;

      let status: 'normal' | 'warning' | 'alarm' = 'normal';
      if (baseSettlement > 12 || baseLateral > 8 || baseInclination > 0.42) {
        status = 'alarm';
      } else if (baseSettlement > 7 || baseLateral > 4.5 || baseInclination > 0.28) {
        status = 'warning';
      }

      areas.push({
        id,
        buildingId,
        floor,
        axis,
        status,
        settlement: Math.round(baseSettlement * 10) / 10,
        lateralDisplacement: Math.round(baseLateral * 10) / 10,
        inclination: Math.round(baseInclination * 100) / 100,
        pouringProgress: Math.min(100, Math.round(30 + Math.random() * 70)),
        alarmCount24h: status === 'alarm' ? Math.floor(Math.random() * 5) + 1 : 0,
        warningCount24h: status === 'warning' ? Math.floor(Math.random() * 3) + 1 : status === 'alarm' ? Math.floor(Math.random() * 2) : 0,
        updateTime: new Date(now.getTime() - Math.random() * 30 * 60 * 1000).toISOString(),
      });
    });
  }

  return areas;
}

export const mockAreas: PouringArea[] = [
  ...generateAreasForBuilding('b1', 28, ['1-2轴', '2-3轴', '3-4轴', '4-5轴', '5-6轴', '6-7轴', '7-8轴']),
  ...generateAreasForBuilding('b2', 32, ['A-B轴', 'B-C轴', 'C-D轴', 'D-E轴', 'E-F轴']),
  ...generateAreasForBuilding('b3', 25, ['1-2轴', '2-3轴', '3-4轴', '4-5轴', '5-6轴']),
  ...generateAreasForBuilding('b4', 30, ['1-2轴', '2-3轴', '3-4轴', '4-5轴', '5-6轴', '6-7轴']),
];
