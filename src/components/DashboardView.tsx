import React from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Calendar as CalendarIcon,
  Flame,
  ArrowRight,
  Plus,
  Play,
  Sparkles,
  AlertTriangle,
  FolderGit2,
  BookOpen,
  Target,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useApp } from '../context/AppContext';
import { getWeeklyStudySummary, calculateStudyStreak } from '../utils/studyStats';

export const DashboardView: React.FC = () => {
  const {
    user,
    tasks,
    sessions,
    toggleTask,
    subjects,
    projects,
    goals,
    reminders,
    openQuickAdd,
    setActiveTab,
    setSelectedSubjectId,
    pomodoro,
  } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];

  // Tasks of today
  const todayTasks = tasks.filter((t) => t.dueDate === todayStr || !t.dueDate);
  const completedTodayTasks = todayTasks.filter((t) => t.completed);

  // Synthèse réelle du temps d'étude et de la série
  const studyStats = getWeeklyStudySummary(sessions);
  const streakDays = calculateStudyStreak(sessions);
  const weeklyGoalTargetHours = user.weeklyGoalHours || 18;
  const weeklyGoalPercent = Math.min(
    100,
    Math.round((studyStats.weeklyMinutes / (weeklyGoalTargetHours * 60)) * 100)
  );

  // Time planned today in minutes
  const totalPlannedMinutes = todayTasks.reduce((acc, t) => acc + (t.estimatedMinutes || 30), 0);
  const plannedHours = (totalPlannedMinutes / 60).toFixed(1);

  // Next upcoming urgent task
  const nextTask = todayTasks.find((t) => !t.completed);

  // Upcoming exams in next 14 days
  const upcomingExams = subjects
    .filter((s) => s.examDate && s.examDate >= todayStr)
    .sort((a, b) => (a.examDate! > b.examDate! ? 1 : -1));

  // Handle task completion with confetti
  const handleToggle = (taskId: string, wasCompleted: boolean) => {
    toggleTask(taskId);
    if (!wasCompleted) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    }
  };

  const formattedDate = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="space-y-8">
      {/* Header Greeting */}
      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Bonjour, {user.name} !
          </h1>
          <p className="text-slate-500 mt-1">Prêt pour une session de travail productive ?</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          <button
            id="dash-start-pomodoro-btn"
            onClick={() => setActiveTab('pomodoro')}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm rounded-xl shadow-sm shadow-indigo-200 transition-all hover:scale-105 active:scale-95"
          >
            <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" />
            <span>{pomodoro.isRunning ? `Chrono (${pomodoro.formattedTime})` : 'Lancer Pomodoro'}</span>
          </button>
          <button
            id="dash-ai-advisor-btn"
            onClick={() => setActiveTab('ai')}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs sm:text-sm rounded-xl border border-slate-200 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
            <span>Planning IA</span>
          </button>
        </div>
      </header>

      {/* Smart Alert Ribbon if exam or deadline is near */}
      {upcomingExams.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                Échéance Examen : {upcomingExams[0].name} ({upcomingExams[0].code})
              </p>
              <p className="text-xs text-slate-600">
                Date prévue le {new Date(upcomingExams[0].examDate!).toLocaleDateString('fr-FR')} •{' '}
                {upcomingExams[0].chapters.filter((c) => c.status !== 'mastered').length} chapitres à réviser
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedSubjectId(upcomingExams[0].id);
              setActiveTab('subjects');
            }}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors shrink-0"
          >
            Voir les chapitres
          </button>
        </div>
      )}

      {/* 3 Metric Highlight Cards from Clean Minimalism Design */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Prochaine tâche */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900">Prochaine tâche</h3>
            </div>
            <p className="text-lg font-semibold text-slate-900 line-clamp-1">
              {nextTask ? nextTask.title : 'Toutes les tâches sont terminées'}
            </p>
            <p className="text-sm text-slate-500 mb-4">
              {nextTask ? (
                <>
                  {subjects.find((s) => s.id === nextTask.subjectId)?.name || 'Études'} • {nextTask.estimatedMinutes} min
                </>
              ) : (
                'Aucune tâche urgente'
              )}
            </p>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {nextTask ? `${nextTask.estimatedMinutes} min restantes` : '0 min'}
            </span>
            {nextTask?.priority === 'urgent' && (
              <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded font-bold uppercase tracking-tighter text-[10px]">
                Urgent
              </span>
            )}
            {nextTask?.priority === 'high' && (
              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded font-bold uppercase tracking-tighter text-[10px]">
                Haute
              </span>
            )}
            {!nextTask && (
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded font-bold uppercase tracking-tighter text-[10px]">
                À jour
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Progression Hebdomadaire */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900">Temps d'Étude</h3>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Cette Semaine</span>
              <span className="text-sm font-bold text-indigo-600">
                {studyStats.weeklyFormatted}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${weeklyGoalPercent}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
              <span>Objectif : {weeklyGoalTargetHours}h / semaine</span>
              <span className="font-semibold text-slate-600">{weeklyGoalPercent}%</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500 italic">
            {studyStats.weeklyMinutes === 0
              ? 'Aucune session cette semaine : démarrez un Pomodoro pour avancer !'
              : `${studyStats.currentWeekSessionsCount} session${studyStats.currentWeekSessionsCount > 1 ? 's' : ''} validée${studyStats.currentWeekSessionsCount > 1 ? 's' : ''} depuis lundi 00h00.`}
          </p>
        </div>

        {/* Card 3: Tâches */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-4 right-4">
            <div className="w-14 h-14 border-4 border-emerald-500 rounded-full flex items-center justify-center text-emerald-600 font-bold text-base">
              {completedTodayTasks.length}/{todayTasks.length}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900">Tâches</h3>
            </div>
            <p className="text-slate-500 text-sm max-w-[200px]">
              Vous avez complété {completedTodayTasks.length} tâches sur {todayTasks.length} aujourd'hui. {completedTodayTasks.length === todayTasks.length && todayTasks.length > 0 ? 'Objectif atteint !' : 'Presque fini !'}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <span>{plannedHours}h programmées</span>
            <span className="text-emerald-600 font-semibold">{streakDays} jour{streakDays > 1 ? 's' : ''} de série</span>
          </div>
        </div>
      </section>

      {/* Dual Section Grid: Mes Matières & Calendrier / Tâches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Mes Matières & Tâches du Jour */}
        <div className="space-y-6">
          {/* Mes Matières Card */}
          <div className="bg-white rounded-2xl border border-slate-200 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900">Mes Matières</h3>
              <button
                onClick={() => setActiveTab('subjects')}
                className="text-indigo-600 text-sm font-semibold hover:underline"
              >
                Voir tout
              </button>
            </div>
            <div className="p-6 space-y-3">
              {subjects.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">
                  Aucune matière pour le moment.
                </div>
              ) : (
                subjects.map((sub, idx) => {
                  const totalChap = sub.chapters.length;
                  const masteredChap = sub.chapters.filter((c) => c.status === 'mastered' || c.status === 'reviewed').length;
                  const progressPct = totalChap ? Math.round((masteredChap / totalChap) * 100) : 0;
                  const firstLetter = sub.name.charAt(0).toUpperCase();

                // Palette for icons matching clean minimalism
                const colors = [
                  { bg: 'bg-blue-100', text: 'text-blue-600' },
                  { bg: 'bg-purple-100', text: 'text-purple-600' },
                  { bg: 'bg-orange-100', text: 'text-orange-600' },
                  { bg: 'bg-emerald-100', text: 'text-emerald-600' },
                ];
                const colorScheme = colors[idx % colors.length];

                return (
                  <div
                    key={sub.id}
                    onClick={() => {
                      setSelectedSubjectId(sub.id);
                      setActiveTab('subjects');
                    }}
                    className="flex items-center gap-4 p-4 bg-slate-50 hover:bg-slate-100/80 rounded-xl cursor-pointer transition-colors"
                  >
                    <div
                      className={`w-10 h-10 ${colorScheme.bg} ${colorScheme.text} flex items-center justify-center rounded-lg font-bold shrink-0`}
                    >
                      {firstLetter}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-900 truncate">{sub.name}</p>
                      <p className="text-xs text-slate-500">
                        {masteredChap}/{totalChap} chapitres maîtrisés • {progressPct}%
                      </p>
                    </div>
                    <div className="text-slate-400">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                );
              })
              )}
            </div>
          </div>

          {/* Tâches du Jour Card */}
          <div className="bg-white rounded-2xl border border-slate-200 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Tâches du Jour</h3>
                <p className="text-xs text-slate-500">Cochez vos réussites en temps réel</p>
              </div>
              <button
                id="dash-add-task-btn"
                onClick={() => openQuickAdd('task')}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter</span>
              </button>
            </div>
            <div className="p-6 space-y-2.5">
              {todayTasks.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">
                  Aucune tâche restante pour aujourd'hui !
                </div>
              ) : (
                todayTasks.map((t) => {
                  const subject = subjects.find((s) => s.id === t.subjectId);
                  return (
                    <div
                      key={t.id}
                      className={`group p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                        t.completed
                          ? 'bg-slate-50 border-slate-200 opacity-60'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <button
                        onClick={() => handleToggle(t.id, t.completed)}
                        className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        {t.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300 group-hover:text-indigo-500" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium text-slate-900 truncate ${
                            t.completed ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {t.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                          {subject && (
                            <span className="text-[11px] font-medium text-slate-600">
                              {subject.name}
                            </span>
                          )}
                          <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                            <Clock className="w-3 h-3" />
                            {t.estimatedMinutes} min
                          </span>
                        </div>
                      </div>
                      {!t.completed && (
                        <button
                          onClick={() => setActiveTab('pomodoro')}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Lancer Pomodoro"
                        >
                          <Play className="w-3 h-3" />
                          <span>Focus</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Calendrier & Objectifs Clés */}
        <div className="space-y-6">
          {/* Calendrier Widget */}
          <div className="bg-white rounded-2xl border border-slate-200 flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-900">Calendrier</h3>
              <span className="text-sm font-medium text-slate-500 capitalize">{formattedDate}</span>
            </div>
            <div className="p-6 flex-1">
              {/* Days header */}
              <div className="grid grid-cols-7 gap-1 text-center mb-3">
                <div className="text-xs font-bold text-slate-400">L</div>
                <div className="text-xs font-bold text-slate-400">M</div>
                <div className="text-xs font-bold text-slate-400">M</div>
                <div className="text-xs font-bold text-slate-400">J</div>
                <div className="text-xs font-bold text-slate-400">V</div>
                <div className="text-xs font-bold text-slate-400">S</div>
                <div className="text-xs font-bold text-slate-400">D</div>

                {/* Example Days Grid matching design */}
                <div className="p-2 text-xs text-slate-300">28</div>
                <div className="p-2 text-xs text-slate-300">29</div>
                <div className="p-2 text-xs text-slate-300">30</div>
                <div className="p-2 text-xs bg-slate-50 rounded-lg text-slate-700">1</div>
                <div className="p-2 text-xs bg-slate-50 rounded-lg text-slate-700">2</div>
                <div className="p-2 text-xs bg-indigo-600 text-white font-bold rounded-lg relative cursor-pointer">
                  3
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
                </div>
                <div className="p-2 text-xs bg-slate-50 rounded-lg text-slate-700">4</div>

                <div className="p-2 text-xs bg-slate-50 rounded-lg text-slate-700 relative">
                  5
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-500 rounded-full"></div>
                </div>
                <div className="p-2 text-xs bg-slate-50 rounded-lg text-slate-700">6</div>
                <div className="p-2 text-xs bg-slate-50 rounded-lg text-slate-700">7</div>
                <div className="p-2 text-xs bg-slate-50 rounded-lg text-slate-700">8</div>
                <div className="p-2 text-xs bg-slate-50 rounded-lg text-slate-700">9</div>
                <div className="p-2 text-xs bg-slate-50 rounded-lg text-slate-700">10</div>
                <div className="p-2 text-xs bg-slate-50 rounded-lg text-slate-700">11</div>
              </div>

              {/* Schedule / Upcoming Events matching design style */}
              <div className="space-y-3 mt-4 pt-4 border-t border-slate-100">
                {upcomingExams.slice(0, 2).map((ex, i) => (
                  <div
                    key={ex.id}
                    onClick={() => setActiveTab('calendar')}
                    className="flex gap-3 items-center text-sm border-l-4 border-indigo-500 pl-3 py-1 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-slate-900">
                        {ex.examDate} - Examen {ex.name}
                      </p>
                      <p className="text-xs text-slate-500">{ex.code} • Salle principale</p>
                    </div>
                  </div>
                ))}
                {projects.slice(0, 2).map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => setActiveTab('projects')}
                    className="flex gap-3 items-center text-sm border-l-4 border-amber-400 pl-3 py-1 cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-slate-800">{proj.name}</p>
                      <p className="text-xs text-slate-500">Jalon prévu le {proj.deadline}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Objectifs Clés */}
          <div className="bg-white rounded-2xl border border-slate-200 flex flex-col p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-lg text-slate-900">Objectifs Clés</h3>
              </div>
              <button
                onClick={() => openQuickAdd('goal')}
                className="text-xs text-indigo-600 font-semibold hover:underline"
              >
                + Objectif
              </button>
            </div>
            <div className="space-y-3">
              {goals.map((g) => {
                const percent = Math.min(100, Math.round((g.currentValue / g.targetValue) * 100));
                return (
                  <div key={g.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-slate-800">{g.title}</span>
                      <span className="font-bold text-indigo-600">{percent}%</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 bg-indigo-600"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                      <span>
                        {g.currentValue} / {g.targetValue} {g.unit}
                      </span>
                      {g.deadline && <span>Échéance : {g.deadline}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
