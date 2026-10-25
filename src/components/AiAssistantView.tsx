import React, { useState } from 'react';
import {
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderGit2,
  BookOpen,
  ArrowRight,
  Check,
  Zap,
  RotateCw,
  BrainCircuit,
  Award,
  Crown,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getAiAuthHeaders } from '../services/api';
import { DailyTask } from '../types';

export const AiAssistantView: React.FC = () => {
  const { subjects, projects, tasks, addTask, addProject, user, startPaddleCheckout, isCheckoutLoading } = useApp();
  const { currentUser, openAuthModal } = useAuth();

  const isPro = Boolean(currentUser && user.tier === 'pro');

  const [activeAiTab, setActiveAiTab] = useState<'revision' | 'project' | 'priorities'>('revision');

  // 1. Revision Plan State
  const [revHoursPerDay, setRevHoursPerDay] = useState(3);
  const [revExamDate, setRevExamDate] = useState(
    new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [revNotes, setRevNotes] = useState('Insister sur les notions les plus difficiles.');
  const [revLoading, setRevLoading] = useState(false);
  const [revError, setRevError] = useState<string | null>(null);
  const [revResult, setRevResult] = useState<{
    summary: string;
    totalEstimatedHours: number;
    schedule: { dayNumber: number; focusSubject: string; chaptersToReview: string; recommendedDurationMinutes: number; technique?: string }[];
    studyTips: string[];
    isFallback?: boolean;
    modelUsed?: string;
  } | null>(null);

  // 2. Project Breakdown State
  const [projTitle, setProjTitle] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projDeadline, setProjDeadline] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [projCategory, setProjCategory] = useState('Académique');
  const [projLoading, setProjLoading] = useState(false);
  const [projError, setProjError] = useState<string | null>(null);
  const [projResult, setProjResult] = useState<{
    estimatedTotalHours: number;
    feasibilityScore: number;
    milestones: string[];
    tasks: { title: string; priority: string; estimatedHours: number; milestone?: string }[];
    riskFactors: string[];
    isFallback?: boolean;
    modelUsed?: string;
  } | null>(null);

  // 3. Priorities Optimizer State
  const [optLoading, setOptLoading] = useState(false);
  const [optError, setOptError] = useState<string | null>(null);
  const [optResult, setOptResult] = useState<{
    diagnosis: string;
    suggestedOrder: { taskId: string; priorityRank: number; reason: string }[];
    smartAlerts: string[];
    coachAdvice: string;
    isFallback?: boolean;
    modelUsed?: string;
  } | null>(null);

  // Success / Action notification
  const [actionNotification, setActionNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setActionNotification(msg);
    setTimeout(() => setActionNotification(null), 4500);
  };

  // Handler: Generate Revision Plan
  const handleGenerateRevisionPlan = async () => {
    if (!isPro) {
      if (!currentUser) {
        showNotification('Veuillez vous connecter avec un compte Premium pour utiliser l’IA Gemini.');
        openAuthModal('login');
      } else {
        showNotification('Le plan de révision IA est réservé aux abonnés Studyflow Pro.');
      }
      return;
    }

    setRevLoading(true);
    setRevResult(null);
    setRevError(null);

    const subjectsSummary = subjects.map((s) => ({
      name: s.name,
      code: s.code,
      examDate: s.examDate,
      unmasteredChapters: s.chapters.filter((c) => c.status !== 'mastered').map((c) => c.title),
    }));

    try {
      const headers = await getAiAuthHeaders();
      const res = await fetch('/api/ai/revision-plan', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subjects: subjectsSummary,
          targetHoursPerDay: revHoursPerDay,
          examDate: revExamDate,
          notes: revNotes,
        }),
      });

      if (!res.ok) {
        const errData: any = await res.json().catch(() => ({}));
        throw new Error(errData?.error || 'Erreur lors de la génération du planning par l’IA.');
      }
      const data = await res.json();
      setRevResult(data);
    } catch (err: any) {
      setRevError(err.message || 'Impossible de contacter l’IA Gemini.');
    } finally {
      setRevLoading(false);
    }
  };

  // Inject AI Schedule into Daily Tasks
  const handleInjectSchedule = () => {
    if (!revResult) return;
    const today = new Date();
    revResult.schedule.forEach((item, idx) => {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + idx);
      const dateStr = targetDate.toISOString().split('T')[0];

      const matchingSub = subjects.find(
        (s) => s.name.toLowerCase().includes(item.focusSubject.toLowerCase())
      );

      addTask({
        title: `[IA] ${item.focusSubject} : ${item.chaptersToReview}`,
        completed: false,
        priority: 'high',
        category: 'revision',
        dueDate: dateStr,
        estimatedMinutes: item.recommendedDurationMinutes,
        subjectId: matchingSub?.id,
      });
    });

    showNotification(`${revResult.schedule.length} tâches de révision ont été ajoutées à votre calendrier !`);
  };

  // Handler: Generate Project Breakdown
  const handleGenerateProjectBreakdown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projTitle.trim()) return;

    if (!isPro) {
      if (!currentUser) {
        showNotification('Veuillez vous connecter avec un compte Premium pour utiliser l’IA Gemini.');
        openAuthModal('login');
      } else {
        showNotification('Le découpage intelligent de projet IA est réservé aux abonnés Studyflow Pro.');
      }
      return;
    }

    setProjLoading(true);
    setProjResult(null);
    setProjError(null);

    try {
      const headers = await getAiAuthHeaders();
      const res = await fetch('/api/ai/project-breakdown', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: projTitle.trim(),
          description: projDesc,
          deadline: projDeadline,
          category: projCategory,
        }),
      });

      if (!res.ok) {
        const errData: any = await res.json().catch(() => ({}));
        throw new Error(errData?.error || 'Erreur lors du découpage de projet par l’IA.');
      }
      const data = await res.json();
      setProjResult(data);
    } catch (err: any) {
      setProjError(err.message || 'Impossible de contacter l’IA Gemini.');
    } finally {
      setProjLoading(false);
    }
  };

  // Convert AI Project to Real Project
  const handleCreateProjectFromAi = () => {
    if (!projResult || !projTitle.trim()) return;

    addProject({
      name: projTitle.trim(),
      description: projDesc || 'Généré et structuré par Studyflow IA',
      deadline: projDeadline,
      priority: 'high',
      category: projCategory,
      status: 'active',
      tasks: projResult.tasks.map((t, idx) => ({
        id: `pt-ai-${Date.now()}-${idx}`,
        title: t.title,
        completed: false,
        priority: (t.priority as any) || 'medium',
        estimatedHours: t.estimatedHours,
      })),
    });

    showNotification('Projet créé avec succès avec toutes ses sous-tâches !');
  };

  // Handler: Optimize Priorities
  const handleOptimizePriorities = async () => {
    if (!isPro) {
      if (!currentUser) {
        showNotification('Veuillez vous connecter avec un compte Premium pour utiliser l’IA Gemini.');
        openAuthModal('login');
      } else {
        showNotification('L’optimisation des priorités IA est réservée aux abonnés Studyflow Pro.');
      }
      return;
    }

    setOptLoading(true);
    setOptResult(null);
    setOptError(null);

    try {
      const headers = await getAiAuthHeaders();
      const res = await fetch('/api/ai/optimize-priorities', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          tasks: tasks.filter((t) => !t.completed),
          projects: projects.filter((p) => p.status === 'active'),
          subjects: subjects,
        }),
      });

      if (!res.ok) {
        const errData: any = await res.json().catch(() => ({}));
        throw new Error(errData?.error || 'Erreur lors de l’optimisation des priorités par l’IA.');
      }
      const data = await res.json();
      setOptResult(data);
    } catch (err: any) {
      setOptError(err.message || 'Impossible de contacter l’IA Gemini.');
    } finally {
      setOptLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Assistant Personnel de Productivité IA
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-bold text-xs shadow-xs">
              Gemini 3.8
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Génération automatique de plannings, estimation de charge et optimisation de vos priorités
          </p>
        </div>
      </div>

      {/* Notification Banner */}
      {actionNotification && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{actionNotification}</span>
          </div>
          <button
            onClick={() => setActionNotification(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Pro Membership Banner if Free or Guest */}
      {!isPro && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-amber-900 shadow-xs">
          <div className="flex items-start gap-3">
            <Crown className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm text-amber-950">
                Fonctionnalités IA réservées aux membres Studyflow Pro
              </h3>
              <p className="text-amber-800 mt-0.5">
                {!currentUser
                  ? "Connectez-vous à votre compte et activez la formule Pro pour utiliser l'Assistant IA Gemini."
                  : "Votre compte est actuellement en formule Gratuite. Passez à la formule Pro pour débloquer l'Assistant IA Gemini et générer des plannings sur-mesure."}
              </p>
            </div>
          </div>
          {!currentUser ? (
            <button
              onClick={() => openAuthModal('login')}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0"
            >
              Se connecter
            </button>
          ) : (
            <button
              onClick={startPaddleCheckout}
              disabled={isCheckoutLoading}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer disabled:opacity-75"
            >
              <Crown className="w-4 h-4" />
              <span>{isCheckoutLoading ? 'Connexion Paddle...' : '⚡ Passer à Pro (9,99 €/mois)'}</span>
            </button>
          )}
        </div>
      )}

      {/* Feature Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveAiTab('revision')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-2xl font-semibold text-xs transition-all shrink-0 ${
            activeAiTab === 'revision'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>1. Programme Révisions</span>
        </button>

        <button
          onClick={() => setActiveAiTab('project')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-2xl font-semibold text-xs transition-all shrink-0 ${
            activeAiTab === 'project'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FolderGit2 className="w-4 h-4" />
          <span>2. Découpage Projet</span>
        </button>

        <button
          onClick={() => setActiveAiTab('priorities')}
          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-2xl font-semibold text-xs transition-all shrink-0 ${
            activeAiTab === 'priorities'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>3. Optimiseur Priorités</span>
        </button>
      </div>

      {/* TAB 1: REVISION PLAN GENERATOR */}
      {activeAiTab === 'revision' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900">Paramètres de Révision</h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Heures d'étude par jour
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={revHoursPerDay}
                onChange={(e) => setRevHoursPerDay(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Date d'échéance / examen
              </label>
              <input
                type="date"
                value={revExamDate}
                onChange={(e) => setRevExamDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Instructions ou points faibles
              </label>
              <textarea
                rows={3}
                value={revNotes}
                onChange={(e) => setRevNotes(e.target.value)}
                placeholder="Ex: Réviser en priorité les intégrales doubles et le SQL..."
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300"
              />
            </div>

            <div className="pt-2">
              <button
                id="generate-revision-plan-btn"
                disabled={revLoading}
                onClick={handleGenerateRevisionPlan}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-xs shadow-md transition-all disabled:opacity-50 ${
                  !isPro
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-100'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                }`}
              >
                {revLoading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>L'IA conçoit votre planning...</span>
                  </>
                ) : !isPro ? (
                  <>
                    <Crown className="w-4 h-4" />
                    <span>⚡ Débloquer avec Studyflow Pro</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Générer mon programme IA</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Result */}
          <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6">
            {revError && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{revError}</span>
                </div>
                {!isPro && (
                  <button
                    onClick={() => (!currentUser ? openAuthModal('login') : startPaddleCheckout())}
                    disabled={isCheckoutLoading}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 shrink-0 cursor-pointer disabled:opacity-75"
                  >
                    {!currentUser ? 'Connexion' : isCheckoutLoading ? 'Connexion...' : 'Passer à Pro (9,99 €/m)'}
                  </button>
                )}
              </div>
            )}

            {!revResult && !revLoading && !revError && (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <BrainCircuit className="w-12 h-12 mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">
                  Prêt à planifier vos révisions intelligemment
                </p>
                <p className="text-xs max-w-sm mx-auto">
                  {!isPro
                    ? 'Le planificateur IA Gemini est réservé aux membres Studyflow Pro. Passez à Pro pour concevoir votre programme automatique.'
                    : 'Cliquez sur "Générer mon programme IA" pour créer un calendrier personnalisé basé sur vos matières et vos dates d\'examens.'}
                </p>
              </div>
            )}

            {revLoading && (
              <div className="py-16 text-center space-y-3">
                <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-semibold text-slate-800">
                  Calcul de la répartition optimale des chapitres...
                </p>
                <p className="text-xs text-slate-500">Intégration de la répétition espacée et des pauses Pomodoro.</p>
              </div>
            )}

            {revResult && (
              <div className="space-y-6">
                {revResult.isFallback ? (
                  <div className="p-3 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs flex items-center justify-between gap-2">
                    <span>⚡ Planning calculé par le moteur haute disponibilité (forte charge temporaire sur l'IA).</span>
                    <button
                      onClick={handleGenerateRevisionPlan}
                      className="px-2.5 py-1 bg-white border border-blue-200 text-blue-800 rounded-lg font-semibold hover:bg-blue-100 text-[11px] shrink-0"
                    >
                      Relancer l'IA
                    </button>
                  </div>
                ) : revResult.modelUsed ? (
                  <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-medium">
                    <Check className="w-3.5 h-3.5" />
                    <span>Généré avec succès par l'IA ({revResult.modelUsed})</span>
                  </div>
                ) : null}

                <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                      Stratégie de Révision Conseillée
                    </span>
                    <p className="text-xs text-slate-700 mt-1 font-medium leading-relaxed">
                      {revResult.summary}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] text-slate-500">Volume total</span>
                    <p className="text-xl font-bold font-display text-indigo-950">
                      {revResult.totalEstimatedHours}h
                    </p>
                  </div>
                </div>

                {/* Day-by-day plan */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Déroulé Chronologique Recommandé
                  </h4>
                  <div className="space-y-2.5">
                    {revResult.schedule.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                            J{item.dayNumber}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-slate-900">
                              {item.focusSubject} — <span className="font-medium text-slate-600">{item.chaptersToReview}</span>
                            </p>
                            {item.technique && (
                              <p className="text-[11px] text-indigo-600 font-medium mt-0.5">
                                Méthode : {item.technique}
                              </p>
                            )}
                          </div>
                        </div>

                        <span className="text-xs font-bold text-slate-700 px-2.5 py-1 rounded-lg bg-white border border-slate-200 self-start sm:self-auto">
                          {item.recommendedDurationMinutes} min
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Study Tips */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">
                    Conseils de Mémorisation
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {revResult.studyTips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action button */}
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleInjectSchedule}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>Intégrer ce planning à mon Calendrier</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PROJECT BREAKDOWN */}
      {activeAiTab === 'project' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleGenerateProjectBreakdown}
            className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900">Nouveau Projet à Estimer</h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nom du projet</label>
              <input
                type="text"
                value={projTitle}
                onChange={(e) => setProjTitle(e.target.value)}
                placeholder="Ex: Rédaction Mémoire de Fin d'Études"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
              <textarea
                rows={3}
                value={projDesc}
                onChange={(e) => setProjDesc(e.target.value)}
                placeholder="Ex: 30 pages sur l'impact de l'IA générative dans l'éducation..."
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Échéance</label>
                <input
                  type="date"
                  value={projDeadline}
                  onChange={(e) => setProjDeadline(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Catégorie</label>
                <select
                  value={projCategory}
                  onChange={(e) => setProjCategory(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300"
                >
                  <option value="Académique">Académique</option>
                  <option value="Développement">Développement</option>
                  <option value="Freelance">Freelance</option>
                  <option value="Personnel">Personnel</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={projLoading}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-xs shadow-md transition-all disabled:opacity-50 ${
                !isPro
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-100'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
              }`}
            >
              {projLoading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Estimation en cours...</span>
                </>
              ) : !isPro ? (
                <>
                  <Crown className="w-4 h-4" />
                  <span>⚡ Débloquer avec Studyflow Pro</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Estimer et découper le projet</span>
                </>
              )}
            </button>
          </form>

          <div className="lg:col-span-2 p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6">
            {projError && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{projError}</span>
                </div>
                {!isPro && (
                  <button
                    onClick={() => (!currentUser ? openAuthModal('login') : startPaddleCheckout())}
                    disabled={isCheckoutLoading}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 shrink-0 cursor-pointer disabled:opacity-75"
                  >
                    {!currentUser ? 'Connexion' : isCheckoutLoading ? 'Connexion...' : 'Passer à Pro (9,99 €/m)'}
                  </button>
                )}
              </div>
            )}

            {!projResult && !projLoading && !projError && (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <FolderGit2 className="w-12 h-12 mx-auto text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">
                  Découpage assisté par l'IA
                </p>
                <p className="text-xs max-w-sm mx-auto">
                  {!isPro
                    ? 'Le découpage intelligent par IA Gemini est réservé aux membres Studyflow Pro.'
                    : 'Entrez le titre et les objectifs de votre projet pour recevoir un calendrier de jalons et les estimations de temps par sous-tâche.'}
                </p>
              </div>
            )}

            {projLoading && (
              <div className="py-16 text-center space-y-3">
                <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-semibold text-slate-800">
                  Décomposition du projet en sous-tâches concrètes...
                </p>
              </div>
            )}

            {projResult && (
              <div className="space-y-6">
                {projResult.isFallback ? (
                  <div className="p-3 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs flex items-center justify-between gap-2">
                    <span>⚡ Découpage généré via le moteur haute disponibilité (forte demande temporaire des serveurs IA).</span>
                    <button
                      onClick={handleGenerateProjectBreakdown}
                      className="px-2.5 py-1 bg-white border border-blue-200 text-blue-800 rounded-lg font-semibold hover:bg-blue-100 text-[11px] shrink-0"
                    >
                      Relancer l'IA
                    </button>
                  </div>
                ) : projResult.modelUsed ? (
                  <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-medium">
                    <Check className="w-3.5 h-3.5" />
                    <span>Généré avec succès par l'IA ({projResult.modelUsed})</span>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                      Estimation Globale
                    </span>
                    <p className="text-2xl font-bold font-display text-indigo-950 mt-1">
                      {projResult.estimatedTotalHours} heures
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                      Faisabilité
                    </span>
                    <p className="text-2xl font-bold font-display text-emerald-950 mt-1">
                      {projResult.feasibilityScore} / 10
                    </p>
                  </div>
                </div>

                {/* Subtasks */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Sous-tâches Détectées ({projResult.tasks.length})
                  </h4>
                  <div className="space-y-2">
                    {projResult.tasks.map((t, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-slate-800">{t.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500">{t.estimatedHours}h</span>
                          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold text-[10px]">
                            {t.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleCreateProjectFromAi}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm"
                  >
                    <Check className="w-4 h-4" />
                    <span>Créer ce projet dans Studyflow</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PRIORITIES & DELAY DETECTION */}
      {activeAiTab === 'priorities' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Détection des Retards & Ordonnancement Intelligent
              </h3>
              <p className="text-xs text-slate-500">
                L'IA analyse l'ensemble de vos cours, devoirs et échéances pour vous indiquer où concentrer vos efforts aujourd'hui.
              </p>
            </div>
            <button
              onClick={handleOptimizePriorities}
              disabled={optLoading}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs shadow-xs transition-colors shrink-0 disabled:opacity-50 ${
                !isPro
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {optLoading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Analyse en cours...</span>
                </>
              ) : !isPro ? (
                <>
                  <Crown className="w-4 h-4" />
                  <span>⚡ Pro requis</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Lancer l'Analyse d'Urgence</span>
                </>
              )}
            </button>
          </div>

          {optError && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{optError}</span>
              </div>
              {!isPro && (
                <button
                  onClick={() => (!currentUser ? openAuthModal('login') : startPaddleCheckout())}
                  disabled={isCheckoutLoading}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 shrink-0 cursor-pointer disabled:opacity-75"
                >
                  {!currentUser ? 'Connexion' : isCheckoutLoading ? 'Connexion...' : 'Passer à Pro (9,99 €/m)'}
                </button>
              )}
            </div>
          )}

          {!optResult && !optLoading && !optError && (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Zap className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">
                Aucune analyse récente
              </p>
              <p className="text-xs max-w-sm mx-auto">
                {!isPro
                  ? 'L’optimisation d’urgence par IA Gemini est réservée aux abonnés Studyflow Pro.'
                  : 'Cliquez sur "Lancer l\'Analyse d\'Urgence" pour recalculer l\'ordre de priorité de vos tâches en cours.'}
              </p>
            </div>
          )}

          {optResult && (
            <div className="space-y-6">
              {optResult.isFallback ? (
                <div className="p-3 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs flex items-center justify-between gap-2">
                  <span>⚡ Analyse calculée par le moteur heuristique d'urgence (serveurs IA temporairement saturés).</span>
                  <button
                    onClick={handleOptimizePriorities}
                    className="px-2.5 py-1 bg-white border border-blue-200 text-blue-800 rounded-lg font-semibold hover:bg-blue-100 text-[11px] shrink-0"
                  >
                    Relancer l'IA
                  </button>
                </div>
              ) : optResult.modelUsed ? (
                <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  <span>Analyse générée avec succès par l'IA ({optResult.modelUsed})</span>
                </div>
              ) : null}

              {/* Diagnosis Banner */}
              <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                  Diagnostic Global de Charge
                </span>
                <p className="text-xs font-semibold text-indigo-950 mt-1">{optResult.diagnosis}</p>
              </div>

              {/* Smart Alerts */}
              {optResult.smartAlerts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Points de Retard ou Alertes Identifiés
                  </h4>
                  {optResult.smartAlerts.map((alert, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{alert}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Coach Advice */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
                <span className="font-bold text-emerald-800 uppercase tracking-wider text-[10px]">
                  Conseil Anti-Procrastination du Coach IA
                </span>
                <p className="mt-1 font-medium">{optResult.coachAdvice}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
