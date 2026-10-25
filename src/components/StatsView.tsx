import React, { useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  Target,
  Plus,
  Flame,
  Award,
  Calendar,
  Trash2,
  TrendingUp,
  Play,
  RotateCcw,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getWeeklyStudySummary,
  calculateStudyStreak,
  formatStudyHoursMinutes,
  filterRealSessions,
} from '../utils/studyStats';

export const StatsView: React.FC = () => {
  const {
    sessions,
    tasks,
    subjects,
    goals,
    deleteGoal,
    deleteSession,
    user,
    openQuickAdd,
    setActiveTab,
  } = useApp();

  // Synthèse hebdomadaire et all-time calculée à partir des sessions réelles validées
  const stats = useMemo(() => {
    return getWeeklyStudySummary(sessions);
  }, [sessions]);

  // Série réelle consécutive calculée dynamiquement à partir des dates de sessions
  const streakDays = useMemo(() => {
    return calculateStudyStreak(sessions);
  }, [sessions]);

  // Taux de réussite des tâches
  const completedTasks = tasks.filter((t) => t.completed).length;
  const taskCompletionRate = tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0;

  // Temps d'étude réel par matière (aucun fallback fictif !)
  const subjectTimeMap = useMemo(() => {
    const map: Record<string, number> = {};
    const realSessions = filterRealSessions(sessions);
    realSessions.forEach((sess) => {
      const key = sess.subjectId || 'other';
      map[key] = (map[key] || 0) + (sess.durationMinutes || 0);
    });
    return map;
  }, [sessions]);

  // Objectifs atteints
  const completedGoalsCount = goals.filter((g) => g.completed).length;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Statistiques & Suivi du Temps d'Étude
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Calcul rigoureux et hebdomadaire de vos heures de concentration (Lundi 00h00 – Dimanche 23h59)
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveTab('pomodoro')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Lancer un Pomodoro</span>
          </button>
          <button
            onClick={() => openQuickAdd('goal')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvel objectif</span>
          </button>
        </div>
      </div>

      {/* Bannière informationnelle de la semaine en cours */}
      <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-indigo-900">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>
            <strong className="font-semibold">Période active :</strong> Semaine du {stats.weekRangeText}.
            Le compteur hebdomadaire se réinitialise automatiquement chaque lundi à 00 h 00.
          </span>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-white font-semibold text-indigo-700 border border-indigo-200 shadow-2xs shrink-0">
          Fuseau horaire local
        </span>
      </div>

      {/* 4 Cartes métriques principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Carte 1 : Temps d'étude hebdomadaire (Le compteur clé attendu au format 'X h YY min') */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Cette Semaine
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            {/* Format demandé : 0 h 00 min, 0 h 25 min, 1 h 15 min... */}
            <p className="text-2xl sm:text-3xl font-black font-display text-indigo-600 mt-2 tracking-tight">
              {stats.weeklyFormatted}
            </p>
          </div>
          <span className="text-xs text-slate-500 mt-2 block">
            {stats.currentWeekSessionsCount} session{stats.currentWeekSessionsCount > 1 ? 's' : ''} validée{stats.currentWeekSessionsCount > 1 ? 's' : ''} cette semaine
          </span>
        </div>

        {/* Carte 2 : Cumul Total (All-time) */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Cumul Total
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold font-display text-slate-900 mt-2 tracking-tight">
              {stats.allTimeFormatted}
            </p>
          </div>
          <span className="text-xs text-slate-500 mt-2 block">
            {stats.allTimeSessionsCount} session{stats.allTimeSessionsCount > 1 ? 's' : ''} au total dans l'historique
          </span>
        </div>

        {/* Carte 3 : Régularité (Série consécutive réelle) */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Régularité
              </span>
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                <Flame className="w-4 h-4 fill-orange-500" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold font-display text-slate-900 mt-2 tracking-tight">
              {streakDays} jour{streakDays > 1 ? 's' : ''}
            </p>
          </div>
          <span className="text-xs text-slate-500 mt-2 block">
            {streakDays > 0 ? 'Série consécutive d’étude active' : 'Complétez un Pomodoro pour démarrer votre série'}
          </span>
        </div>

        {/* Carte 4 : Tâches & Objectifs */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Tâches & Objectifs
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-bold font-display text-slate-900 mt-2 tracking-tight">
              {completedTasks} / {tasks.length}
            </p>
          </div>
          <span className="text-xs text-emerald-600 font-semibold mt-2 block">
            {taskCompletionRate}% complétées • {completedGoalsCount} obj. atteint{completedGoalsCount > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Grille principale : Graphique Hebdomadaire Réel & Répartition par Matière */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique d'étude de la semaine (Lundi à Dimanche) */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold font-display text-slate-900">
                  Temps d'Étude Hebdomadaire
                </h2>
                <p className="text-xs text-slate-500">
                  Heures réellement étudiées chaque jour (Lundi à Dimanche)
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 self-start sm:self-auto">
                Moyenne : {stats.dailyAverageFormatted} / jour
              </span>
            </div>

            {/* Histogramme des 7 jours */}
            <div className="h-60 flex items-end justify-between gap-2 sm:gap-3 pt-8 pb-2">
              {stats.daysStats.map((d, idx) => {
                const percent = stats.maxDayMinutes > 0 ? (d.minutes / stats.maxDayMinutes) * 100 : 0;
                const hasStudied = d.minutes > 0;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <span className="text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {d.formatted}
                    </span>
                    <div className="w-full bg-slate-100 rounded-xl h-40 flex items-end overflow-hidden p-1 relative">
                      <div
                        className={`w-full rounded-lg transition-all duration-500 ${
                          d.isToday
                            ? 'bg-indigo-600 group-hover:bg-indigo-700'
                            : hasStudied
                            ? 'bg-indigo-400 group-hover:bg-indigo-500'
                            : 'bg-transparent'
                        }`}
                        style={{ height: hasStudied ? `${Math.max(8, percent)}%` : '0%' }}
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <span
                        className={`text-xs font-semibold ${
                          d.isToday
                            ? 'text-indigo-600 font-bold px-1.5 py-0.5 rounded-md bg-indigo-50'
                            : 'text-slate-600'
                        }`}
                      >
                        {d.dayName}
                      </span>
                      {hasStudied ? (
                        <span className="text-[10px] font-medium text-slate-400 mt-0.5">
                          {d.minutes}m
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-300 mt-0.5">0m</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {stats.weeklyMinutes === 0 ? (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500 flex items-center justify-between gap-3">
              <span>Aucune session terminée cette semaine. Le compteur commence à 0 h 00 min.</span>
              <button
                onClick={() => setActiveTab('pomodoro')}
                className="font-semibold text-indigo-600 hover:text-indigo-700 shrink-0 cursor-pointer"
              >
                Démarrer &rarr;
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs text-emerald-800 flex items-center justify-between">
              <span>
                ✓ {stats.weeklyFormatted} cumulées sur {stats.currentWeekSessionsCount} session{stats.currentWeekSessionsCount > 1 ? 's' : ''} cette semaine.
              </span>
            </div>
          )}
        </div>

        {/* Temps par Matière */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold font-display text-slate-900">
                  Répartition du Temps par Matière
                </h2>
                <p className="text-xs text-slate-500">Volume horaire cumulé dans chaque discipline</p>
              </div>
              <button
                onClick={() => setActiveTab('subjects')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Voir cours &rarr;
              </button>
            </div>

            {subjects.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs">Aucune matière enregistrée pour le moment.</p>
              </div>
            ) : (
              <div className="space-y-4 pt-3">
                {subjects.map((sub) => {
                  const minutesSpent = subjectTimeMap[sub.id] || 0;
                  const formatted = formatStudyHoursMinutes(minutesSpent);
                  const valuesList = Object.values(subjectTimeMap) as number[];
                  const maxMinutesPossible = Math.max(
                    0,
                    ...valuesList,
                    (sub.targetHoursPerWeek || 1) * 60
                  );
                  const percent =
                    maxMinutesPossible > 0
                      ? Math.min(100, Math.round((minutesSpent / maxMinutesPossible) * 100))
                      : 0;

                  return (
                    <div key={sub.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 font-semibold text-slate-800">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: sub.color }}
                          />
                          <span className="truncate max-w-[200px]">{sub.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({sub.code})</span>
                        </div>
                        <span className="font-bold text-slate-700 shrink-0">{formatted}</span>
                      </div>

                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: sub.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-100">
            Conseil : Associez vos sessions Pomodoro à une matière pour suivre précisément votre avancement par discipline.
          </div>
        </div>
      </div>

      {/* Historique des Sessions Récentes */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold font-display text-slate-900">
              Historique des Sessions d'Étude Récentes
            </h2>
            <p className="text-xs text-slate-500">
              Toutes les sessions de travail validées sont enregistrées de façon permanente
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600">
            {stats.allTimeSessionsCount} enregistrée{stats.allTimeSessionsCount > 1 ? 's' : ''}
          </span>
        </div>

        {stats.allTimeSessions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-3">
            <Clock className="w-12 h-12 mx-auto text-slate-300" />
            <div>
              <p className="text-sm font-semibold text-slate-600">
                Aucune session terminée pour l'instant
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Lorsque vous terminez ou validez un Pomodoro de concentration, la session apparaît ici automatiquement et s'ajoute à votre compteur hebdomadaire.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('pomodoro')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Démarrer un Pomodoro de 25 min</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
            {stats.allTimeSessions.slice(0, 8).map((sess) => {
              const subj = subjects.find((s) => s.id === sess.subjectId);
              const dateObj = new Date(sess.date);
              const formattedDateStr = !isNaN(dateObj.getTime())
                ? new Intl.DateTimeFormat('fr-FR', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  }).format(dateObj)
                : sess.date;

              return (
                <div
                  key={sess.id}
                  className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs"
                      style={{
                        backgroundColor: subj ? `${subj.color}20` : '#e0e7ff',
                        color: subj ? subj.color : '#4f46e5',
                      }}
                    >
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {sess.title || (subj ? `Session - ${subj.name}` : 'Session d’étude')}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {formattedDateStr} • {subj ? `${subj.name} (${subj.code})` : 'Étude libre'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs">
                      +{sess.durationMinutes} min
                    </span>
                    <button
                      onClick={() => deleteSession(sess.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Supprimer cette session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Suivi des Objectifs */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold font-display text-slate-900">
              Suivi Détaillé des Objectifs
            </h2>
            <p className="text-xs text-slate-500">
              Objectifs quotidiens et hebdomadaires synchronisés avec vos sessions
            </p>
          </div>
          <button
            onClick={() => openQuickAdd('goal')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter un objectif</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {goals.map((g) => {
            const percent = Math.min(100, Math.round((g.currentValue / g.targetValue) * 100));
            const isFinished = percent >= 100;

            return (
              <div
                key={g.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isFinished ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Target
                      className={`w-4 h-4 ${isFinished ? 'text-emerald-600' : 'text-indigo-600'}`}
                    />
                    <h3 className="font-bold text-sm text-slate-900">{g.title}</h3>
                  </div>
                  <button
                    onClick={() => deleteGoal(g.id)}
                    className="text-slate-300 hover:text-rose-600"
                    title="Supprimer cet objectif"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isFinished ? 'bg-emerald-500' : 'bg-indigo-600'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                  <span>
                    Avancement : {g.currentValue} / {g.targetValue} {g.unit}
                  </span>
                  <span
                    className={`font-bold ${isFinished ? 'text-emerald-700' : 'text-indigo-600'}`}
                  >
                    {percent}% {isFinished ? '✓ Atteint' : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
