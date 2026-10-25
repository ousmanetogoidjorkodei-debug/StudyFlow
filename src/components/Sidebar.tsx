import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  FolderGit2,
  Timer,
  BarChart3,
  FileText,
  Sparkles,
  User,
  Target,
  X,
} from 'lucide-react';
import { useApp, ActiveTab } from '../context/AppContext';
import { StudyFlowLogo } from './StudyFlowLogo';

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen = false, onMobileClose }) => {
  const { activeTab, setActiveTab, user, goals, pomodoro } = useApp();

  const navItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }>; badge?: string }[] = [
    { id: 'dashboard', label: 'Accueil', icon: LayoutDashboard },
    { id: 'calendar', label: 'Calendrier', icon: Calendar },
    { id: 'subjects', label: 'Matières & Cours', icon: BookOpen },
    { id: 'projects', label: 'Gestion Projets', icon: FolderGit2 },
    { id: 'pomodoro', label: 'Minuteur Pomodoro', icon: Timer },
    { id: 'stats', label: 'Statistiques & Buts', icon: BarChart3 },
    { id: 'notes', label: 'Notes rapides', icon: FileText },
    { id: 'ai', label: 'Assistant IA', icon: Sparkles, badge: 'IA' },
    { id: 'profile', label: 'Profil & Sync', icon: User },
  ];

  const handleNavClick = (id: ActiveTab) => {
    setActiveTab(id);
    if (onMobileClose) {
      onMobileClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 md:w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-screen transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-6 pb-2">
          <div className="flex items-center justify-between mb-6">
            <div
              onClick={() => handleNavClick('dashboard')}
              className="cursor-pointer select-none group transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <StudyFlowLogo size="md" />
            </div>

            {/* Mobile Close Button */}
            <button
              onClick={onMobileClose}
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        isActive ? 'bg-indigo-200 text-indigo-800' : 'bg-indigo-100 text-indigo-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Focus Mode Widget at bottom */}
        <div className="mt-auto p-6 pt-4 border-t border-slate-100 hidden md:block">
          <div className="bg-slate-900 rounded-2xl p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider opacity-60">
                {pomodoro.isRunning
                  ? pomodoro.mode === 'work'
                    ? 'Session Focus'
                    : 'Pause'
                  : 'Focus Mode'}
              </span>
              <div
                className={`w-2 h-2 rounded-full ${
                  pomodoro.isRunning
                    ? pomodoro.mode === 'work'
                      ? 'bg-emerald-400 animate-pulse'
                      : 'bg-blue-400 animate-pulse'
                    : 'bg-slate-500'
                }`}
              ></div>
            </div>
            <div className="text-2xl font-mono font-bold mb-3">{pomodoro.formattedTime}</div>
            <button
              onClick={() => handleNavClick('pomodoro')}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors text-white"
            >
              {pomodoro.isRunning ? 'Voir le chrono' : 'Lancer Pomodoro'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
