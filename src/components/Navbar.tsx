import React, { useState } from 'react';
import {
  Bell,
  Plus,
  Crown,
  Flame,
  Search,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Info,
  Clock,
  ExternalLink,
  X,
  LogIn,
  Menu,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { StudyFlowLogo } from './StudyFlowLogo';
import { calculateStudyStreak } from '../utils/studyStats';

interface NavbarProps {
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu }) => {
  const {
    user,
    sessions,
    reminders,
    markReminderAsRead,
    dismissReminder,
    openQuickAdd,
    setActiveTab,
    startPaddleCheckout,
    isCheckoutLoading,
  } = useApp();
  const { currentUser, openAuthModal } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const unreadCount = reminders.filter((r) => !r.isRead).length;

  const handleProAction = () => {
    if (user.tier === 'pro') {
      setActiveTab('profile');
      return;
    }
    startPaddleCheckout();
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-4">
          {/* Left: Mobile Hamburger, Brand & Search Bar */}
          <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-md min-w-0">
            {/* Hamburger button on mobile */}
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="md:hidden p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
              aria-label="Ouvrir le menu de navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile logo only visible on small screens */}
            <div
              className="flex md:hidden items-center cursor-pointer shrink-0"
              onClick={() => setActiveTab('dashboard')}
            >
              <StudyFlowLogo size="sm" />
            </div>

            {/* Clean minimalist search bar */}
            <div className="relative w-full hidden sm:block">
              <input
                type="text"
                placeholder="Rechercher des cours, projets, notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
              <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Tier Switch button */}
            <button
              id="tier-toggle-btn"
              onClick={handleProAction}
              disabled={isCheckoutLoading}
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                user.tier === 'pro'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 cursor-pointer'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer'
              }`}
              title={user.tier === 'pro' ? 'Abonnement Pro Actif' : 'Passer à Studyflow Pro (9,99 €/mois)'}
            >
              <Crown className={`w-3.5 h-3.5 ${user.tier === 'pro' ? 'text-amber-500' : 'text-slate-500'}`} />
              {user.tier === 'pro' ? 'Pro Actif' : isCheckoutLoading ? 'Connexion Paddle...' : 'Passer à Pro'}
            </button>

            {/* Streak Counter */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
              <span>{calculateStudyStreak(sessions)} jours</span>
            </div>

            {/* Smart Reminders Dropdown Button - Styled as in Design HTML */}
            <div className="relative">
              <button
                id="notifications-bell-btn"
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors relative"
                aria-label="Rappels intelligents"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                )}
              </button>

              {/* Notifications Dropdown Panel */}
              {showNotifications && (
                <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-auto sm:mt-2 w-[calc(100vw-1rem)] sm:w-96 max-w-sm rounded-2xl bg-white p-4 shadow-xl border border-slate-200 z-50">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-sm font-bold text-slate-900">Rappels Intelligents</h3>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      {unreadCount} non lu{unreadCount > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="mt-3 max-h-80 overflow-y-auto space-y-2">
                    {reminders.length === 0 ? (
                      <p className="text-xs text-center py-6 text-slate-400">
                        Aucun rappel actif. Tout est en ordre !
                      </p>
                    ) : (
                      reminders.map((rem) => (
                        <div
                          key={rem.id}
                          className={`p-3 rounded-xl border transition-all text-xs ${
                            rem.isRead ? 'bg-slate-50 border-slate-200' : 'bg-indigo-50/50 border-indigo-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              {rem.severity === 'urgent' && (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              )}
                              {rem.severity === 'warning' && (
                                <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              )}
                              {rem.severity === 'info' && (
                                <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              )}
                              <span className="font-semibold text-slate-900">{rem.title}</span>
                            </div>
                            <button
                              onClick={() => dismissReminder(rem.id)}
                              className="text-slate-400 hover:text-slate-600"
                              title="Fermer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-slate-600 mt-1">{rem.message}</p>
                          <div className="mt-2 flex items-center justify-between pt-1">
                            {rem.linkTab && (
                              <button
                                onClick={() => {
                                  markReminderAsRead(rem.id);
                                  setShowNotifications(false);
                                  setActiveTab(rem.linkTab!);
                                }}
                                className="inline-flex items-center gap-1 text-indigo-600 font-medium hover:underline"
                              >
                                <span>Voir détails</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                            {!rem.isRead && (
                              <button
                                onClick={() => markReminderAsRead(rem.id)}
                                className="text-[11px] text-slate-500 hover:text-slate-800 ml-auto"
                              >
                                Marquer comme lu
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Add Global Button */}
            <button
              id="global-quick-add-btn"
              onClick={() => openQuickAdd('task')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter</span>
            </button>

            {/* Login Button if not logged in */}
            {!currentUser && (
              <button
                id="navbar-login-btn"
                onClick={() => openAuthModal('login')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                title="Se connecter avec Firebase"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Connexion</span>
              </button>
            )}

            {/* Profile Avatar trigger */}
            <button
              id="user-profile-header-btn"
              onClick={() => setActiveTab('profile')}
              className="flex items-center gap-2 p-1 pl-2 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
              title={currentUser ? `Connecté en tant que ${currentUser.displayName || currentUser.email}` : 'Profil'}
            >
              <span className="text-xs font-semibold text-slate-800 hidden lg:block">
                {(currentUser?.displayName || currentUser?.email?.split('@')[0] || user.name).split(' ')[0]}
              </span>
              <div className="relative">
                <img
                  src={currentUser?.photoURL || user.avatar}
                  alt={currentUser?.displayName || user.name}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-xl object-cover ring-2 ring-indigo-500/20"
                />
                {currentUser && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white"
                    title="Connecté à Firebase"
                  />
                )}
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
