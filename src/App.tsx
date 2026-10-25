import React from 'react';
import { Plus, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { SubjectsView } from './components/SubjectsView';
import { ProjectsView } from './components/ProjectsView';
import { CalendarView } from './components/CalendarView';
import { PomodoroView } from './components/PomodoroView';
import { StatsView } from './components/StatsView';
import { QuickNotesView } from './components/QuickNotesView';
import { AiAssistantView } from './components/AiAssistantView';
import { ProfileView } from './components/ProfileView';
import { QuickAddModal } from './components/QuickAddModal';
import { AuthModal } from './components/AuthModal';
import { StudyFlowLogo } from './components/StudyFlowLogo';

const AppContent: React.FC = () => {
  const {
    activeTab,
    openQuickAdd,
    isCheckoutLoading,
    checkoutError,
    clearCheckoutError,
    billingBannerMessage,
    dismissBillingBanner,
  } = useApp();
  const { loading } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex flex-col items-center justify-center p-6 select-none">
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl flex flex-col items-center max-w-xs text-center space-y-4">
          <StudyFlowLogo size="lg" />
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 pt-2">
            <div className="w-2 h-2 rounded-full bg-indigo-600 animate-ping"></div>
            <span>Vérification de la session...</span>
          </div>
        </div>
      </div>
    );
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'subjects':
        return <SubjectsView />;
      case 'projects':
        return <ProjectsView />;
      case 'calendar':
        return <CalendarView />;
      case 'pomodoro':
        return <PomodoroView />;
      case 'stats':
        return <StatsView />;
      case 'notes':
        return <QuickNotesView />;
      case 'ai':
        return <AiAssistantView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex text-slate-800 font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Structural Navigation Sidebar */}
      <Sidebar
        isMobileOpen={isMobileNavOpen}
        onMobileClose={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onToggleMobileMenu={() => setIsMobileNavOpen((prev) => !prev)} />

        {/* Global Paddle Checkout Status & Feedback Banners */}
        {isCheckoutLoading && (
          <div className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2.5 flex items-center justify-center gap-2 shadow-xs animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <span>Redirection sécurisée vers Paddle Checkout (Studyflow Pro à 9,99 €/mois)...</span>
          </div>
        )}

        {checkoutError && (
          <div className="bg-rose-50 border-b border-rose-200 text-rose-800 text-xs px-4 py-2.5 flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{checkoutError}</span>
            </div>
            <button
              onClick={clearCheckoutError}
              className="p-1 rounded-lg hover:bg-rose-100 transition-colors"
              aria-label="Fermer l'alerte"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {billingBannerMessage && (
          <div
            className={`border-b text-xs px-4 py-2.5 flex items-center justify-between gap-3 shadow-xs transition-colors ${
              billingBannerMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : billingBannerMessage.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-indigo-50 border-indigo-200 text-indigo-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {billingBannerMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0" />
              )}
              <span className="font-medium">{billingBannerMessage.text}</span>
            </div>
            <button
              onClick={dismissBillingBanner}
              className="p-1 rounded-lg hover:bg-black/5 transition-colors"
              aria-label="Fermer la notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl w-full mx-auto overflow-x-hidden">
          {renderActiveView()}
        </main>
      </div>

      {/* Floating Action Button from Clean Minimalism Theme */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-30">
        <button
          id="clean-minimal-fab"
          onClick={() => openQuickAdd('task')}
          aria-label="Ajout rapide"
          className="w-12 h-12 sm:w-14 sm:h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95 transition-all"
          title="Ajouter une tâche rapidement"
        >
          <Plus className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.5]" />
        </button>
      </div>

      {/* Global Quick Add Modal */}
      <QuickAddModal />

      {/* Global Auth Modal */}
      <AuthModal />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}
