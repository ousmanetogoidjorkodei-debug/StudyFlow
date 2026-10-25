import React, { useState } from 'react';
import {
  BookOpen,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  Calendar,
  Layers,
  FileCheck,
  ChevronRight,
  Trash2,
  Edit3,
  HelpCircle,
  X,
  Crown,
  Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getAiAuthHeaders } from '../services/api';
import { Subject, Chapter, ChapterStatus } from '../types';

export const SubjectsView: React.FC = () => {
  const {
    subjects,
    addSubject,
    updateSubject,
    deleteSubject,
    selectedSubjectId,
    setSelectedSubjectId,
    openQuickAdd,
    user,
    setUser,
  } = useApp();
  const { currentUser, openAuthModal } = useAuth();

  const isPro = Boolean(currentUser && user.tier === 'pro');

  const [activeSubjectId, setActiveSubjectId] = useState<string>(
    selectedSubjectId || subjects[0]?.id || ''
  );

  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterExercises, setNewChapterExercises] = useState(10);
  const [isAddingChapter, setIsAddingChapter] = useState(false);

  // AI Flashcard Generator Modal State
  const [aiFlashcardModalOpen, setAiFlashcardModalOpen] = useState(false);
  const [generatingAiNotes, setGeneratingAiNotes] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [generatedFlashcard, setGeneratedFlashcard] = useState<{
    title: string;
    keyPoints: string[];
    essentialFormulasOrRules: string[];
    quizQuestions: { question: string; answer: string }[];
    isFallback?: boolean;
    modelUsed?: string;
  } | null>(null);
  const [currentAiChapter, setCurrentAiChapter] = useState<Chapter | null>(null);

  const activeSubject = subjects.find((s) => s.id === (selectedSubjectId || activeSubjectId)) || subjects[0];

  const handleSelectSubject = (id: string) => {
    setSelectedSubjectId(id);
    setActiveSubjectId(id);
  };

  const handleAddChapter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterTitle.trim() || !activeSubject) return;

    const newChapter: Chapter = {
      id: `c-${Date.now()}`,
      title: newChapterTitle.trim(),
      status: 'to_study',
      exercisesTotal: Number(newChapterExercises) || 10,
      exercisesCompleted: 0,
      notes: '',
    };

    updateSubject(activeSubject.id, {
      chapters: [...activeSubject.chapters, newChapter],
    });

    setNewChapterTitle('');
    setNewChapterExercises(10);
    setIsAddingChapter(false);
  };

  const handleUpdateChapterStatus = (chapterId: string, status: ChapterStatus) => {
    if (!activeSubject) return;
    const updatedChapters = activeSubject.chapters.map((c) =>
      c.id === chapterId ? { ...c, status } : c
    );
    updateSubject(activeSubject.id, { chapters: updatedChapters });
  };

  const handleIncrementExercise = (chapterId: string, delta: number) => {
    if (!activeSubject) return;
    const updatedChapters = activeSubject.chapters.map((c) => {
      if (c.id === chapterId) {
        const nextVal = Math.max(0, Math.min(c.exercisesTotal, c.exercisesCompleted + delta));
        return { ...c, exercisesCompleted: nextVal };
      }
      return c;
    });
    updateSubject(activeSubject.id, { chapters: updatedChapters });
  };

  const handleDeleteChapter = (chapterId: string) => {
    if (!activeSubject) return;
    const updatedChapters = activeSubject.chapters.filter((c) => c.id !== chapterId);
    updateSubject(activeSubject.id, { chapters: updatedChapters });
  };

  // Generate AI revision notes and quiz for this chapter
  const handleGenerateAiFlashcard = async (chapter: Chapter) => {
    if (!activeSubject) return;
    setCurrentAiChapter(chapter);
    setAiFlashcardModalOpen(true);

    if (!isPro) {
      setAiError('La génération de fiches mémo et quiz IA est réservée aux abonnés Studyflow Pro.');
      setGeneratedFlashcard(null);
      setGeneratingAiNotes(false);
      return;
    }

    setGeneratingAiNotes(true);
    setGeneratedFlashcard(null);
    setAiError(null);

    try {
      const headers = await getAiAuthHeaders();
      const res = await fetch('/api/ai/study-flashcard', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subjectName: activeSubject.name,
          chapterTitle: chapter.title,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || 'Erreur lors de la génération par l’IA');
      }

      const data = await res.json();
      setGeneratedFlashcard(data);
    } catch (err: any) {
      setAiError(err.message || 'Impossible de contacter l’IA Gemini.');
    } finally {
      setGeneratingAiNotes(false);
    }
  };

  // Status labels & badges
  const statusLabels: Record<ChapterStatus, { label: string; color: string }> = {
    to_study: { label: 'À étudier', color: 'bg-slate-100 text-slate-700 border-slate-200' },
    in_progress: { label: 'En cours', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    reviewed: { label: 'Révisé', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    mastered: { label: 'Maîtrisé', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900">
            Matières & Programmes d'Étude
          </h1>
          <p className="text-sm text-slate-500">
            Suivi des chapitres, fiches de révision et niveau de maîtrise par discipline
          </p>
        </div>
        <button
          id="add-subject-btn"
          onClick={() => openQuickAdd('subject')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle matière</span>
        </button>
      </div>

      {/* Main Layout: Subjects List & Active Subject Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Subjects Cards */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Vos matières</p>
          {subjects.length === 0 ? (
            <div className="p-5 rounded-2xl bg-white border border-slate-200 text-slate-400 text-xs text-center py-8">
              Aucune matière pour le moment.
            </div>
          ) : (
            subjects.map((sub) => {
            const isSelected = activeSubject?.id === sub.id;
            const totalChap = sub.chapters.length;
            const mastered = sub.chapters.filter((c) => c.status === 'mastered').length;
            const progress = totalChap ? Math.round((mastered / totalChap) * 100) : 0;

            return (
              <div
                key={sub.id}
                onClick={() => handleSelectSubject(sub.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/10 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-md"
                    style={{ backgroundColor: `${sub.color}18`, color: sub.color }}
                  >
                    {sub.code}
                  </span>
                  <span className="text-xs font-bold text-slate-700">{progress}%</span>
                </div>

                <h3 className="font-bold text-base text-slate-900 mt-2">{sub.name}</h3>

                <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${progress}%`, backgroundColor: sub.color }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                  <span>{totalChap} chapitres</span>
                  {sub.examDate && (
                    <span className="font-medium text-amber-600">
                      Examen : {new Date(sub.examDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })
          )}
        </div>

        {/* Right 3 Columns: Active Subject Detail View */}
        {activeSubject && (
          <div className="lg:col-span-3 space-y-6">
            {/* Subject Detail Header Card */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-sm"
                    style={{ backgroundColor: activeSubject.color }}
                  >
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold font-display text-slate-900">
                        {activeSubject.name}
                      </h2>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-600">
                        {activeSubject.code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Objectif hebdomadaire : {activeSubject.targetHoursPerWeek} heures • {activeSubject.chapters.length} chapitres au programme
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeSubject.examDate && (
                    <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      <span>Examen le {new Date(activeSubject.examDate).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                  <button
                    onClick={() => setIsAddingChapter(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter chapitre</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Add Chapter Form Modal / Inline */}
            {isAddingChapter && (
              <form
                onSubmit={handleAddChapter}
                className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-indigo-950">Nouveau Chapitre</h3>
                  <button
                    type="button"
                    onClick={() => setIsAddingChapter(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Titre du chapitre</label>
                    <input
                      type="text"
                      value={newChapterTitle}
                      onChange={(e) => setNewChapterTitle(e.target.value)}
                      placeholder="Ex: Théorème de Bayes et lois de probabilités"
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Nombre d'exercices</label>
                    <input
                      type="number"
                      min="1"
                      value={newChapterExercises}
                      onChange={(e) => setNewChapterExercises(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingChapter(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-white rounded-lg"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            )}

            {/* Chapters Table / Cards */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold font-display text-slate-900">
                  Progression des Chapitres ({activeSubject.chapters.length})
                </h3>
                <span className="text-xs text-slate-500">
                  Cliquez sur "Générer Fiche IA" pour obtenir un résumé et un quiz
                </span>
              </div>

              <div className="space-y-3">
                {activeSubject.chapters.map((chapter, idx) => {
                  const statusInfo = statusLabels[chapter.status];
                  const exercisePercent = chapter.exercisesTotal
                    ? Math.round((chapter.exercisesCompleted / chapter.exercisesTotal) * 100)
                    : 0;

                  return (
                    <div
                      key={chapter.id}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-200 transition-all bg-white"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{chapter.title}</h4>
                            {chapter.notes && (
                              <p className="text-xs text-slate-500 mt-0.5 italic">{chapter.notes}</p>
                            )}

                            {/* Exercices progress */}
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                              <span>Exercices : {chapter.exercisesCompleted} / {chapter.exercisesTotal}</span>
                              <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-600 rounded-full"
                                  style={{ width: `${exercisePercent}%` }}
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleIncrementExercise(chapter.id, -1)}
                                  className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
                                  title="Diminuer exercice"
                                >
                                  -
                                </button>
                                <button
                                  onClick={() => handleIncrementExercise(chapter.id, 1)}
                                  className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
                                  title="Ajouter un exercice réussi"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Status selector & AI Assistant button */}
                        <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
                          {/* Status Pill / Selector */}
                          <select
                            value={chapter.status}
                            onChange={(e) =>
                              handleUpdateChapterStatus(chapter.id, e.target.value as ChapterStatus)
                            }
                            className={`text-xs font-semibold px-2.5 py-1.5 rounded-xl border focus:outline-hidden cursor-pointer ${statusInfo.color}`}
                          >
                            <option value="to_study">À étudier</option>
                            <option value="in_progress">En cours</option>
                            <option value="reviewed">Révisé</option>
                            <option value="mastered">Maîtrisé</option>
                          </select>

                          {/* AI Flashcard Generator */}
                          <button
                            onClick={() => handleGenerateAiFlashcard(chapter)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                              !isPro
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                : 'bg-violet-50 hover:bg-violet-100 text-violet-700 border-violet-200'
                            }`}
                          >
                            {!isPro ? (
                              <Crown className="w-3.5 h-3.5 text-amber-600" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
                            )}
                            <span>Fiche IA {!isPro ? '(Pro)' : ''}</span>
                          </button>

                          <button
                            onClick={() => handleDeleteChapter(chapter.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                            title="Supprimer ce chapitre"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {!activeSubject && (
          <div className="lg:col-span-3 p-12 text-center bg-white rounded-3xl border border-slate-200 flex flex-col items-center justify-center text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base mb-1">Aucune matière sélectionnée</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              Créez ou sélectionnez une matière pour suivre vos chapitres, révisions et examens.
            </p>
            <button
              onClick={() => openQuickAdd('subject')}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une matière</span>
            </button>
          </div>
        )}
      </div>

      {/* AI Study Flashcard Modal */}
      {aiFlashcardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Fiche de Révision & Quiz IA
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activeSubject?.name} • {currentAiChapter?.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAiFlashcardModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {generatingAiNotes ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-10 h-10 border-3 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-semibold text-slate-800">
                  L'IA analyse le chapitre et synthétise les points clés...
                </p>
                <p className="text-xs text-slate-500">Formulation des concepts et préparation du quiz d'auto-évaluation.</p>
              </div>
            ) : (!isPro || aiError) && !generatedFlashcard ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                  <Crown className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h4 className="text-base font-bold text-slate-900">
                    Fiches IA réservées aux membres Studyflow Pro
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {aiError ||
                      'La synthèse automatique de cours et la génération de quiz personnalisés par IA Gemini sont réservées aux abonnés Pro.'}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setAiFlashcardModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Fermer
                  </button>
                  {!currentUser ? (
                    <button
                      onClick={() => {
                        setAiFlashcardModalOpen(false);
                        openAuthModal('login');
                      }}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs"
                    >
                      Se connecter
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setUser((prev) => ({ ...prev, tier: 'pro' }));
                        setAiFlashcardModalOpen(false);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
                    >
                      <Crown className="w-4 h-4" />
                      <span>⚡ Passer à Studyflow Pro</span>
                    </button>
                  )}
                </div>
              </div>
            ) : generatedFlashcard ? (
              <div className="mt-6 space-y-6 text-slate-800">
                {generatedFlashcard.isFallback ? (
                  <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-xs flex items-center justify-between gap-2">
                    <span>⚡ Généré via le moteur haute disponibilité (forte demande temporaire des serveurs IA).</span>
                    {currentAiChapter && (
                      <button
                        onClick={() => handleGenerateAiFlashcard(currentAiChapter)}
                        className="px-2.5 py-1 bg-white border border-blue-200 text-blue-800 rounded-lg font-semibold hover:bg-blue-100 text-[11px] shrink-0"
                      >
                        Réessayer l'IA
                      </button>
                    )}
                  </div>
                ) : generatedFlashcard.modelUsed ? (
                  <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Généré avec succès par le modèle IA {generatedFlashcard.modelUsed}</span>
                  </div>
                ) : null}

                {aiError && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    {aiError}
                  </div>
                )}

                {/* Key Concepts */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-violet-700 mb-2">
                    Points Clés à Retenir
                  </h4>
                  <ul className="space-y-2 text-xs">
                    {generatedFlashcard.keyPoints.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <CheckCircle2 className="w-3.5 h-3.5 text-violet-600 shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Formulas / Definitions */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-2">
                    Formules & Règles Essentielles
                  </h4>
                  <div className="space-y-2">
                    {generatedFlashcard.essentialFormulasOrRules.map((rule, i) => (
                      <div key={i} className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs font-medium text-slate-800">
                        {rule}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quiz Self-Assessment */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2">
                    Questions d'Auto-Évaluation (Quiz Rapide)
                  </h4>
                  <div className="space-y-3">
                    {generatedFlashcard.quizQuestions.map((q, i) => (
                      <details key={i} className="group p-3 rounded-xl border border-slate-200 bg-white">
                        <summary className="text-xs font-bold text-slate-900 cursor-pointer flex items-center justify-between list-none">
                          <span className="flex items-center gap-2">
                            <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{q.question}</span>
                          </span>
                          <span className="text-[10px] text-indigo-600 underline group-open:hidden">
                            Voir réponse
                          </span>
                        </summary>
                        <p className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                          {q.answer}
                        </p>
                      </details>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setAiFlashcardModalOpen(false)}
                    className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
                  >
                    Fermer la fiche
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
