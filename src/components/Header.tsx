import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, LineChart, FileText, Clock, Wifi, User, Bell, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMonitorStore, useAlarmStats } from '@/store/useStore';
import { useEffect, useState } from 'react';

const navItems = [
  { path: '/overview', label: '项目总览', icon: LayoutDashboard },
  { path: '/detail', label: '监测详情', icon: LineChart },
  { path: '/records', label: '处置记录', icon: FileText },
];

export default function Header() {
  const location = useLocation();
  const onlineDevices = useMonitorStore((state) => state.onlineDevices);
  const alarmStats = useAlarmStats();
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      useMonitorStore.getState().refreshData();
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleRefresh = () => {
    useMonitorStore.getState().refreshData();
  };

  return (
    <header className="h-16 bg-cockpit-bg2/80 backdrop-blur-sm border-b border-cockpit-border/50 flex items-center px-6 gap-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center">
          <LayoutDashboard className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-lg font-bold text-cockpit-text">高支模监测驾驶舱</h1>
          <p className="text-xs text-cockpit-muted">智慧工地安全监测系统</p>
        </div>
      </div>

      <nav className="flex items-center gap-1 ml-8">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path === '/overview' && location.pathname === '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-accent-blue/20 text-accent-blue'
                  : 'text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-bg3/50'
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-cockpit-muted">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono">{timeStr}</span>
          </div>
          <div className="flex items-center gap-1.5 text-risk-normal">
            <Wifi className="w-3.5 h-3.5" />
            <span>在线设备 {onlineDevices}</span>
          </div>
        </div>

        <div className="h-8 w-px bg-cockpit-border/50" />

        <div className="flex items-center gap-2">
          <div className="cockpit-card px-3 py-1.5 flex items-center gap-2 bg-risk-normal/10 border-risk-normal/30">
            <span className="w-2 h-2 rounded-full bg-risk-normal" />
            <span className="text-xs text-risk-normal font-medium">{alarmStats.normal}</span>
          </div>
          <div className="cockpit-card px-3 py-1.5 flex items-center gap-2 bg-risk-warning/10 border-risk-warning/30">
            <span className="w-2 h-2 rounded-full bg-risk-warning animate-pulse" />
            <span className="text-xs text-risk-warning font-medium">{alarmStats.warning}</span>
          </div>
          <div className="cockpit-card px-3 py-1.5 flex items-center gap-2 bg-risk-alarm/10 border-risk-alarm/30">
            <span className="w-2 h-2 rounded-full bg-risk-alarm animate-pulse" />
            <span className="text-xs text-risk-alarm font-medium">{alarmStats.alarm}</span>
          </div>
        </div>

        <div className="h-8 w-px bg-cockpit-border/50" />

        <button 
          onClick={handleRefresh}
          className="p-2 rounded-lg text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-bg3/50 transition-colors"
          title="刷新数据"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button className="p-2 rounded-lg text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-bg3/50 transition-colors relative">
          <Bell className="w-4 h-4" />
          {alarmStats.today > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-risk-alarm rounded-full text-[10px] flex items-center justify-center text-white font-medium">
              {alarmStats.today}
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 pl-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="text-xs">
            <div className="text-cockpit-text font-medium">安全总监</div>
            <div className="text-cockpit-muted">管理员</div>
          </div>
        </div>
      </div>
    </header>
  );
}
