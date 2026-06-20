import type { PouringArea, AlarmRecord, SensorPoint, Component } from '@/types';
import { mockBuildings } from './mockBuildings';
import { DEFAULT_THRESHOLDS } from '@/types';

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateAreasForBuilding(buildingId: string, floors: number, axes: string[], seed: number): PouringArea[] {
  const areas: PouringArea[] = [];
  const now = new Date();
  const rand = seededRandom(seed);

  for (let floor = 1; floor <= Math.min(floors, 10); floor++) {
    axes.forEach((axis, axisIndex) => {
      const id = `${buildingId}-f${floor}-a${axisIndex}`;
      const baseSettlement = 3 + rand() * 8;
      const baseLateral = 2 + rand() * 6;
      const baseInclination = 0.1 + rand() * 0.35;

      let status: 'normal' | 'warning' | 'alarm' = 'normal';
      if (baseSettlement > 12 || baseLateral > 8 || baseInclination > 0.42) {
        status = 'alarm';
      } else if (baseSettlement > 7 || baseLateral > 4.5 || baseInclination > 0.28) {
        status = 'warning';
      }

      const componentId = `GJ-${buildingId.toUpperCase()}-${floor}-${axisIndex + 1}`;
      const sensorIds = [
        `S-${buildingId.toUpperCase()}-${floor}-${axisIndex + 1}-1`,
        `S-${buildingId.toUpperCase()}-${floor}-${axisIndex + 1}-2`,
        `S-${buildingId.toUpperCase()}-${floor}-${axisIndex + 1}-3`,
      ];

      areas.push({
        id,
        buildingId,
        floor,
        axis,
        componentId,
        sensorIds,
        status,
        settlement: Math.round(baseSettlement * 10) / 10,
        lateralDisplacement: Math.round(baseLateral * 10) / 10,
        inclination: Math.round(baseInclination * 100) / 100,
        pouringProgress: Math.min(100, Math.round(30 + rand() * 70)),
        alarmCount24h: status === 'alarm' ? Math.floor(rand() * 5) + 1 : 0,
        warningCount24h: status === 'warning' ? Math.floor(rand() * 3) + 1 : status === 'alarm' ? Math.floor(rand() * 2) : 0,
        updateTime: new Date(now.getTime() - rand() * 30 * 60 * 1000).toISOString(),
      });
    });
  }

  return areas;
}

export const mockAreas: PouringArea[] = [
  ...generateAreasForBuilding('b1', 28, ['1-2轴', '2-3轴', '3-4轴', '4-5轴', '5-6轴', '6-7轴', '7-8轴'], 1001),
  ...generateAreasForBuilding('b2', 32, ['A-B轴', 'B-C轴', 'C-D轴', 'D-E轴', 'E-F轴'], 1002),
  ...generateAreasForBuilding('b3', 25, ['1-2轴', '2-3轴', '3-4轴', '4-5轴', '5-6轴'], 1003),
  ...generateAreasForBuilding('b4', 30, ['1-2轴', '2-3轴', '3-4轴', '4-5轴', '5-6轴', '6-7轴'], 1004),
];

function generateSensorsForAreas(areas: PouringArea[]): SensorPoint[] {
  const sensors: SensorPoint[] = [];
  
  areas.forEach((area) => {
    sensors.push({
      id: area.sensorIds[0],
      name: `立杆沉降传感器-${area.floor}层${area.axis}`,
      componentId: area.componentId,
      areaId: area.id,
      buildingId: area.buildingId,
      type: 'settlement',
      location: `${area.floor}层${area.axis}立杆底部`,
    });
    sensors.push({
      id: area.sensorIds[1],
      name: `模板侧移传感器-${area.floor}层${area.axis}`,
      componentId: area.componentId,
      areaId: area.id,
      buildingId: area.buildingId,
      type: 'lateral',
      location: `${area.floor}层${area.axis}模板中部`,
    });
    sensors.push({
      id: area.sensorIds[2],
      name: `架体倾斜传感器-${area.floor}层${area.axis}`,
      componentId: area.componentId,
      areaId: area.id,
      buildingId: area.buildingId,
      type: 'inclination',
      location: `${area.floor}层${area.axis}架体顶部`,
    });
  });

  return sensors;
}

export const mockSensors: SensorPoint[] = generateSensorsForAreas(mockAreas);

function generateComponentsForAreas(areas: PouringArea[]): Component[] {
  const components: Component[] = [];
  
  areas.forEach((area) => {
    components.push({
      id: area.componentId,
      name: `${area.floor}层${area.axis}高支模构件`,
      type: '立杆',
      areaId: area.id,
      buildingId: area.buildingId,
      sensorIds: area.sensorIds,
    });
  });

  return components;
}

export const mockComponents: Component[] = generateComponentsForAreas(mockAreas);

function generateAlarmRecords(areas: PouringArea[]): AlarmRecord[] {
  const alarms: AlarmRecord[] = [];
  const now = new Date();
  let alarmId = 1;

  const buildingNames: Record<string, string> = {};
  mockBuildings.forEach((b) => {
    buildingNames[b.id] = b.name;
  });

  areas.forEach((area) => {
    if (area.status === 'alarm' || area.status === 'warning') {
      const metrics = [
        { type: 'settlement' as const, name: '立杆沉降', value: area.settlement, threshold: DEFAULT_THRESHOLDS.settlement },
        { type: 'lateral' as const, name: '模板侧移', value: area.lateralDisplacement, threshold: DEFAULT_THRESHOLDS.lateralDisplacement },
        { type: 'inclination' as const, name: '架体倾斜', value: area.inclination, threshold: DEFAULT_THRESHOLDS.inclination },
      ];

      metrics.forEach((metric) => {
        const isWarning = metric.value >= metric.threshold.warning;
        const isAlarm = metric.value >= metric.threshold.alarm;
        
        if (isWarning || isAlarm) {
          const level = isAlarm ? 'alarm' : 'warning';
          const triggerTime = new Date(now.getTime() - Math.random() * 12 * 60 * 60 * 1000);
          
          alarms.push({
            id: `alarm-${alarmId++}`,
            areaId: area.id,
            buildingId: area.buildingId,
            buildingName: buildingNames[area.buildingId] || '',
            floor: area.floor,
            axis: area.axis,
            metricType: metric.type,
            metricName: metric.name,
            value: metric.value,
            threshold: metric.threshold.alarm,
            level,
            triggerTime: triggerTime.toISOString(),
            isClosed: false,
          });
        }
      });
    }
  });

  alarms.sort((a, b) => new Date(b.triggerTime).getTime() - new Date(a.triggerTime).getTime());
  return alarms;
}

export const mockAlarmRecords: AlarmRecord[] = generateAlarmRecords(mockAreas);
