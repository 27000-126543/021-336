export type RiskLevel = 'normal' | 'warning' | 'alarm';

export interface Building {
  id: string;
  name: string;
  totalFloors: number;
  axes: string[];
  progress: number;
}

export interface PouringArea {
  id: string;
  buildingId: string;
  floor: number;
  axis: string;
  componentId: string;
  sensorIds: string[];
  status: RiskLevel;
  settlement: number;
  lateralDisplacement: number;
  inclination: number;
  pouringProgress: number;
  alarmCount24h: number;
  warningCount24h: number;
  updateTime: string;
}

export interface SensorPoint {
  id: string;
  name: string;
  componentId: string;
  areaId: string;
  buildingId: string;
  type: 'settlement' | 'lateral' | 'inclination';
  location: string;
}

export interface Component {
  id: string;
  name: string;
  type: '立杆' | '模板' | '架体';
  areaId: string;
  buildingId: string;
  sensorIds: string[];
}

export interface AlarmRecord {
  id: string;
  areaId: string;
  buildingId: string;
  buildingName: string;
  floor: number;
  axis: string;
  metricType: 'settlement' | 'lateral' | 'inclination';
  metricName: string;
  value: number;
  threshold: number;
  level: RiskLevel;
  triggerTime: string;
  recordId?: string;
  isClosed: boolean;
}

export interface TrendData {
  time: string;
  value: number;
}

export interface DisposalRecord {
  id: string;
  areaId: string;
  buildingName: string;
  floor: number;
  axis: string;
  issueDescription: string;
  riskLevel: RiskLevel;
  personInCharge: string;
  reviewer: string;
  rectificationMeasures: string;
  photoUrls: string[];
  photoDescription: string;
  createTime: string;
  reviewTime?: string;
  recoveryTime?: string;
  status: 'pending' | 'reviewing' | 'completed';
  reviewConclusion?: string;
}

export interface DisposalSuggestion {
  level: RiskLevel;
  action: 'observe' | 'pause' | 'review';
  title: string;
  description: string;
  basis: string;
}

export interface ThresholdConfig {
  settlement: { warning: number; alarm: number };
  lateral: { warning: number; alarm: number };
  inclination: { warning: number; alarm: number };
}

export interface AlarmStat {
  today: number;
  week: number;
  normal: number;
  warning: number;
  alarm: number;
}

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  settlement: { warning: 8, alarm: 15 },
  lateral: { warning: 5, alarm: 10 },
  inclination: { warning: 0.3, alarm: 0.5 },
};
