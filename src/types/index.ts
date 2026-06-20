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
  status: RiskLevel;
  settlement: number;
  lateralDisplacement: number;
  inclination: number;
  pouringProgress: number;
  alarmCount24h: number;
  warningCount24h: number;
  updateTime: string;
}

export interface SensorData {
  id: string;
  componentId: string;
  sensorId: string;
  timestamp: string;
  settlement: number;
  lateralDisplacement: number;
  inclination: number;
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
  lateralDisplacement: { warning: number; alarm: number };
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
  lateralDisplacement: { warning: 5, alarm: 10 },
  inclination: { warning: 0.3, alarm: 0.5 },
};
