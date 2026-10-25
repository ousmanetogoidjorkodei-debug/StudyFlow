import React, { useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
  BookOpen,
  FolderGit2,
  Flame,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getWeeklyStudySummary } from '../utils/studyStats';

export const PomodoroView: React.FC = () => {
  const { subjects, projects, sessions, pomodoro } = useApp();

  const {
    mode,
    timeLeft,
    isRunning,
    workMinutes,
    completedCycles,
    soundEnabled,
    selectedSubjectId,
    selectedProjectId,
    formattedTime,
    progressPercent,
    elapsedSeconds,
    togglePlay,
    reset,
    skip,
    finishEarly,
    setMode,
    setSoundEnabled,
    setSelectedSubjectId,
    setSelectedProjectId,
  } = pomodoro;

  // Synthèse hebdomadaire et journalière calculée avec précision
  const stats = useMemo(() => {
    return getWeeklyStudySummary(sessions);
  }, [sessions]);

  const canFinishEarly = mode === 'work' && elapsedSeconds >= 60;
  const elapsedMinutes = Math.round(elapsedSeconds / 60);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
          Technique Pomodoro
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          25 minutes de concentration intense, 5 minutes de pause pour une productivité durable
        </p>
      </div>

      {/* Main Focus Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-xs text-center relative overflow-hidden">
        {/* Mode Selector Tabs */}
        <div className="flex flex-wrap justify-center p-1.5 rounded-2xl bg-slate-100 text-xs font-bold text-slate-600 mb-8 gap-1">
          <button
            onClick={() => setMode('work')}
            className={`px-3 sm:px-5 py-2 rounded-xl transition-all ${
              mode === 'work'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            Travail (25 min)
          </button>
          <button
            onClick={() => setMode('short_break')}
            className={`px-3 sm:px-5 py-2 rounded-xl transition-all ${
              mode === 'short_break'
                ? 'bg-white text-emerald-600 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            Pause Courte (5 min)
          </button>
          <button
            onClick={() => setMode('long_break')}
            className={`px-3 sm:px-5 py-2 rounded-xl transition-all ${
              mode === 'long_break'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            Pause Longue (15 min)
          </button>
        </div>

        {/* Circular Progress & Digits */}
        <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              className="text-slate-100"
              strokeWidth="6"
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              className={`transition-all duration-1000 ${
                mode === 'work' ? 'text-indigo-600' : 'text-emerald-500'
              }`}
              strokeWidth="6"
              strokeDasharray={276.46}
              strokeDashoffset={276.46 - (276.46 * progressPercent) / 100}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>

          <div className="absolute flex flex-col items-center">
            <span className="text-5xl sm:text-6xl font-black font-display tracking-tight text-slate-900">
              {formattedTime}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-2">
              {mode === 'work' ? 'Concentration en cours' : 'Temps de repos (non comptabilisé)'}
            </span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-col items-center gap-3 mt-8">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={reset}
              className="p-3 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
              title="Réinitialiser le chronomètre (aucun temps factice ajouté)"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              id="pomodoro-toggle-btn"
              onClick={togglePlay}
              className={`px-8 py-4 rounded-2xl text-white font-bold text-base shadow-md transition-all hover:scale-105 active:scale-95 flex items-center gap-3 ${
                mode === 'work'
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-5 h-5 fill-white" />
                  <span>Mettre en pause</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-white" />
                  <span>
                    {timeLeft === workMinutes * 60 ? 'Commencer la session' : 'Reprendre'}
                  </span>
                </>
              )}
            </button>

            <button
              onClick={skip}
              className="p-3 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
              title={mode === 'work' ? 'Passer en pause (enregistre le temps fait si > 1 min)' : 'Passer au travail'}
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Bouton de validation anticipée si l'utilisateur souhaite terminer plus tôt */}
          {canFinishEarly && (
            <button
              onClick={finishEarly}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs border border-indigo-200 transition-all active:scale-95"
              title="Enregistrer les minutes réellement étudiées et passer en pause"
            >
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              <span>Valider & terminer ({elapsedMinutes} min d'étude réelle)</span>
            </button>
          )}
        </div>

        {/* Cycle indicator & Sound toggle */}
        <div className="mt-8 flex items-center justify-between max-w-sm mx-auto pt-6 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
            <span>Cycle {completedCycles % 4 || 4} sur 4 avant grande pause</span>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="flex items-center gap-1 hover:text-slate-800"
            title={soundEnabled ? 'Désactiver le son' : 'Activer le son'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-indigo-600" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
            <span>{soundEnabled ? 'Son activé' : 'Muet'}</span>
          </button>
        </div>
      </div>

      {/* Target Subject / Project Association Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Associer la session à une matière</span>
          </h3>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Aucune matière (Étude libre)</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.id}>
                {sub.name} ({sub.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-purple-600" />
            <span>Ou à un projet spécifique</span>
          </h3>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Aucun projet</option>
            {projects.map((proj) => (
              <option key={proj.id} value={proj.id}>
                {proj.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Synthèse du temps de concentration hebdomadaire et journalier */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Compteur hebdomadaire (0 h 00 min -> 0 h 25 min -> 0 h 50 min...) */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-600" />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            <span>Cette Semaine</span>
          </span>
          <p className="text-3xl font-black font-display text-indigo-600 mt-2 tracking-tight">
            {stats.weeklyFormatted}
          </p>
          <span className="text-xs text-slate-500 block mt-1">
            {stats.currentWeekSessionsCount} session{stats.currentWeekSessionsCount > 1 ? 's' : ''} validée{stats.currentWeekSessionsCount > 1 ? 's' : ''}
          </span>
        </div>

        {/* Temps étudié aujourd'hui */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 text-center">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Aujourd'hui
          </span>
          <p className="text-3xl font-bold font-display text-slate-900 mt-2 tracking-tight">
            {stats.todayFormatted}
          </p>
          <span className="text-xs text-slate-500 block mt-1">
            {stats.todaySessionsCount} session{stats.todaySessionsCount > 1 ? 's' : ''} aujourd'hui
          </span>
        </div>

        {/* Cycles Pomodoro complétés */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 text-center">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Cycles de concentration
          </span>
          <p className="text-3xl font-bold font-display text-emerald-600 mt-2 tracking-tight">
            {completedCycles}
          </p>
          <span className="text-xs text-slate-500 block mt-1">
            série de concentration active
          </span>
        </div>
      </div>
    </div>
  );
};
