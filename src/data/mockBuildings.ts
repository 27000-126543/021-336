import type { Building } from '@/types';

export const mockBuildings: Building[] = [
  {
    id: 'b1',
    name: '1号楼',
    totalFloors: 28,
    axes: ['1-2轴', '2-3轴', '3-4轴', '4-5轴', '5-6轴', '6-7轴', '7-8轴'],
    progress: 65,
  },
  {
    id: 'b2',
    name: '2号楼',
    totalFloors: 32,
    axes: ['A-B轴', 'B-C轴', 'C-D轴', 'D-E轴', 'E-F轴'],
    progress: 42,
  },
  {
    id: 'b3',
    name: '3号楼',
    totalFloors: 25,
    axes: ['1-2轴', '2-3轴', '3-4轴', '4-5轴', '5-6轴'],
    progress: 78,
  },
  {
    id: 'b4',
    name: '5号楼',
    totalFloors: 30,
    axes: ['1-2轴', '2-3轴', '3-4轴', '4-5轴', '5-6轴', '6-7轴'],
    progress: 35,
  },
];
