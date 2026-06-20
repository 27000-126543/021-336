import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { Building, PouringArea, DisposalRecord, AlarmStat, RiskLevel, AlarmRecord, SensorPoint, Component } from '@/types';
import { mockBuildings } from '@/data/mockBuildings';
import { mockAreas, mockAlarmRecords, mockSensors, mockComponents } from '@/data/mockAreas';
import { mockRecords } from '@/data/mockRecords';

const STORAGE_KEY = 'high-formwork-monitor-data';

interface PersistedState {
  records: DisposalRecord[];
  alarmRecords: AlarmRecord[];
}

function loadPersistedData(): PersistedState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load persisted data:', e);
  }
  return null;
}

function savePersistedData(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save persisted data:', e);
  }
}

const persisted = loadPersistedData();

interface MonitorStore {
  buildings: Building[];
  areas: PouringArea[];
  records: DisposalRecord[];
  alarmRecords: AlarmRecord[];
  sensors: SensorPoint[];
  components: Component[];
  selectedBuildingId: string;
  selectedAreaId: string | null;
  currentTime: Date;
  onlineDevices: number;

  selectBuilding: (id: string) => void;
  selectArea: (id: string | null) => void;
  getAreaById: (id: string) => PouringArea | undefined;
  getBuildingById: (id: string) => Building | undefined;
  getSensorById: (id: string) => SensorPoint | undefined;
  getComponentById: (id: string) => Component | undefined;
  getAlarmsByAreaId: (areaId: string) => AlarmRecord[];
  getRecordsByAreaId: (areaId: string) => DisposalRecord[];
  addRecord: (record: Omit<DisposalRecord, 'id' | 'createTime'>) => void;
  updateRecord: (id: string, updates: Partial<DisposalRecord>) => void;
  linkRecordToAlarm: (alarmId: string, recordId: string) => void;
  refreshData: () => void;
}

export const useMonitorStore = create<MonitorStore>((set, get) => ({
  buildings: mockBuildings,
  areas: mockAreas,
  records: persisted?.records || mockRecords,
  alarmRecords: persisted?.alarmRecords || mockAlarmRecords,
  sensors: mockSensors,
  components: mockComponents,
  selectedBuildingId: mockBuildings[0]?.id || '',
  selectedAreaId: null,
  currentTime: new Date(),
  onlineDevices: 156,

  selectBuilding: (id) => set({ selectedBuildingId: id }),

  selectArea: (id) => set({ selectedAreaId: id }),

  getAreaById: (id) => {
    return get().areas.find((a) => a.id === id);
  },

  getBuildingById: (id) => {
    return get().buildings.find((b) => b.id === id);
  },

  getSensorById: (id) => {
    return get().sensors.find((s) => s.id === id);
  },

  getComponentById: (id) => {
    return get().components.find((c) => c.id === id);
  },

  getAlarmsByAreaId: (areaId) => {
    return get().alarmRecords.filter((a) => a.areaId === areaId);
  },

  getRecordsByAreaId: (areaId) => {
    return get().records.filter((r) => r.areaId === areaId);
  },

  addRecord: (record) => {
    const newRecord: DisposalRecord = {
      ...record,
      id: `r${Date.now()}`,
      createTime: new Date().toISOString(),
    };
    set((state) => {
      const newRecords = [newRecord, ...state.records];
      savePersistedData({ records: newRecords, alarmRecords: state.alarmRecords });
      return { records: newRecords };
    });
  },

  updateRecord: (id, updates) => {
    set((state) => {
      const newRecords = state.records.map((r) => (r.id === id ? { ...r, ...updates } : r));
      let newAlarms = state.alarmRecords;

      if (updates.status === 'completed') {
        newAlarms = state.alarmRecords.map((a) =>
          a.recordId === id ? { ...a, isClosed: true } : a
        );
      } else if (updates.status === 'pending' || updates.status === 'reviewing') {
        newAlarms = state.alarmRecords.map((a) =>
          a.recordId === id ? { ...a, isClosed: false } : a
        );
      }

      savePersistedData({ records: newRecords, alarmRecords: newAlarms });
      return { records: newRecords, alarmRecords: newAlarms };
    });
  },

  linkRecordToAlarm: (alarmId, recordId) => {
    set((state) => {
      const newAlarms = state.alarmRecords.map((a) =>
        a.id === alarmId ? { ...a, recordId, isClosed: false } : a
      );
      savePersistedData({ records: state.records, alarmRecords: newAlarms });
      return { alarmRecords: newAlarms };
    });
  },

  refreshData: () => {
    set({ currentTime: new Date() });
    set((state) => ({
      areas: state.areas.map((area) => ({
        ...area,
        settlement: Math.max(0, area.settlement + (Math.random() - 0.5) * 0.3),
        lateralDisplacement: Math.max(0, area.lateralDisplacement + (Math.random() - 0.5) * 0.2),
        inclination: Math.max(0, area.inclination + (Math.random() - 0.5) * 0.02),
        updateTime: new Date().toISOString(),
      })),
    }));
  },
}));

export function useAreasByBuilding(buildingId: string): PouringArea[] {
  return useMonitorStore(
    useShallow((state) => state.areas.filter((a) => a.buildingId === buildingId))
  );
}

export function useAreasByRisk(level: RiskLevel): PouringArea[] {
  return useMonitorStore(
    useShallow((state) => state.areas.filter((a) => a.status === level))
  );
}

export function useAlarmStats(): AlarmStat {
  return useMonitorStore(
    useShallow((state) => {
      const { areas } = state;
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

      let today = 0;
      let week = 0;
      let normal = 0;
      let warning = 0;
      let alarm = 0;

      areas.forEach((area) => {
        if (area.status === 'normal') normal++;
        if (area.status === 'warning') warning++;
        if (area.status === 'alarm') alarm++;

        const updateTime = new Date(area.updateTime);
        if (updateTime >= todayStart) {
          today += area.alarmCount24h + area.warningCount24h;
        }
        if (updateTime >= weekStart) {
          week += area.alarmCount24h + area.warningCount24h;
        }
      });

      return { today, week, normal, warning, alarm };
    })
  );
}

export function useAlarmsByBuilding(buildingId: string): AlarmRecord[] {
  return useMonitorStore(
    useShallow((state) => state.alarmRecords.filter((a) => a.buildingId === buildingId))
  );
}

export function useRecordsByBuilding(buildingId: string): DisposalRecord[] {
  return useMonitorStore(
    useShallow((state) => state.records.filter((r) => {
      const area = state.areas.find((a) => a.id === r.areaId);
      return area?.buildingId === buildingId;
    }))
  );
}
