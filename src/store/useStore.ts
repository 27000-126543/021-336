import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import type { Building, PouringArea, DisposalRecord, AlarmStat, RiskLevel } from '@/types';
import { mockBuildings } from '@/data/mockBuildings';
import { mockAreas } from '@/data/mockAreas';
import { mockRecords } from '@/data/mockRecords';

interface MonitorStore {
  buildings: Building[];
  areas: PouringArea[];
  records: DisposalRecord[];
  selectedBuildingId: string;
  selectedAreaId: string | null;
  currentTime: Date;
  onlineDevices: number;

  selectBuilding: (id: string) => void;
  selectArea: (id: string | null) => void;
  getAreaById: (id: string) => PouringArea | undefined;
  getBuildingById: (id: string) => Building | undefined;
  addRecord: (record: Omit<DisposalRecord, 'id' | 'createTime'>) => void;
  updateRecord: (id: string, updates: Partial<DisposalRecord>) => void;
  refreshData: () => void;
}

export const useMonitorStore = create<MonitorStore>((set, get) => ({
  buildings: mockBuildings,
  areas: mockAreas,
  records: mockRecords,
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

  addRecord: (record) => {
    const newRecord: DisposalRecord = {
      ...record,
      id: `r${Date.now()}`,
      createTime: new Date().toISOString(),
    };
    set((state) => ({ records: [newRecord, ...state.records] }));
  },

  updateRecord: (id, updates) => {
    set((state) => ({
      records: state.records.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }));
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
