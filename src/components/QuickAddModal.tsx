import React, { useState, useEffect } from 'react';
import { X, Check, BookOpen, FolderGit2, CheckCircle2, Target, FileText, Calendar as CalendarIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Priority } from '../types';

export const QuickAddModal: React.FC = () => {
  const {
    isQuickAddOpen,
    quickAddModalOpen,
    quickAddType,
    quickAddDefaultType,
    quickAddTargetDate,
    closeQuickAdd,
    subjects,
    projects,
    addTask,
    addSubject,
    addProject,
    addGoal,
    addNote,
  } = useApp();

  const isOpen = isQuickAddOpen || quickAddModalOpen;

  const [activeType, setActiveType] = useState<'task' | 'note' | 'subject' | 'project' | 'goal'>('task');

  const todayStr = new Date().toISOString().split('T')[0];

  // Task form state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<Priority>('medium');
  const [taskSubjectId, setTaskSubjectId] = useState('');
  const [taskProjectId, setTaskProjectId] = useState('');
  const [taskMinutes, setTaskMinutes] = useState(45);
  const [taskDueDate, setTaskDueDate] = useState(todayStr);

  // Note form state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteDate, setNoteDate] = useState(todayStr);
  const [noteSubjectId, setNoteSubjectId] = useState('');
  const [noteProjectId, setNoteProjectId] = useState('');
  const [noteTags, setNoteTags] = useState('');

  // Subject form state
  const [subName, setSubName] = useState('');
  const [subCode, setSubCode] = useState('');
  const [subColor, setSubColor] = useState('#4f46e5');
  const [subExamDate, setSubExamDate] = useState('');
  const [subHours, setSubHours] = useState(6);

  // Project form state
  const [projName, setProjName] = useState('');
  const [projDesc, setProjDesc] = useState('');
  const [projDeadline, setProjDeadline] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [projPriority, setProjPriority] = useState<Priority>('high');
  const [projCategory, setProjCategory] = useState('Académique');

  // Goal form state
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTarget, setGoalTarget] = useState(15);
  const [goalUnit, setGoalUnit] = useState('heures');

  useEffect(() => {
    const defaultType = quickAddType || quickAddDefaultType;
    if (defaultType) {
      setActiveType(defaultType);
    }
    if (quickAddTargetDate) {
      setTaskDueDate(quickAddTargetDate);
      setNoteDate(quickAddTargetDate);
    }
  }, [quickAddType, quickAddDefaultType, quickAddTargetDate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeType === 'task') {
      if (!taskTitle.trim()) return;
      addTask({
        title: taskTitle.trim(),
        completed: false,
        priority: taskPriority,
        category: 'study',
        dueDate: taskDueDate,
        estimatedMinutes: Number(taskMinutes) || 30,
        subjectId: taskSubjectId || undefined,
        projectId: taskProjectId || undefined,
      });
      setTaskTitle('');
    } else if (activeType === 'note') {
      if (!noteTitle.trim()) return;
      addNote({
        title: noteTitle.trim(),
        content: noteContent.trim(),
        date: noteDate,
        subjectId: noteSubjectId || undefined,
        projectId: noteProjectId || undefined,
        tags: noteTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        pinned: false,
      });
      setNoteTitle('');
      setNoteContent('');
      setNoteTags('');
    } else if (activeType === 'subject') {
      if (!subName.trim()) return;
      addSubject({
        name: subName.trim(),
        code: subCode.trim().toUpperCase() || subName.slice(0, 3).toUpperCase(),
        color: subColor,
        examDate: subExamDate || undefined,
        targetHoursPerWeek: Number(subHours) || 5,
        chapters: [
          {
            id: `c-${Date.now()}-1`,
            title: 'Chapitre 1 : Introduction & Fondamentaux',
            status: 'to_study',
            exercisesTotal: 10,
            exercisesCompleted: 0,
          },
        ],
      });
      setSubName('');
      setSubCode('');
    } else if (activeType === 'project') {
      if (!projName.trim()) return;
      addProject({
        name: projName.trim(),
        description: projDesc.trim() || 'Projet d’études ou professionnel',
        deadline: projDeadline,
        priority: projPriority,
        category: projCategory,
        status: 'active',
        tasks: [
          {
            id: `pt-${Date.now()}-1`,
            title: 'Cadrage initial et recherche de ressources',
            completed: false,
            priority: 'medium',
            estimatedHours: 2,
          },
        ],
      });
      setProjName('');
      setProjDesc('');
    } else if (activeType === 'goal') {
      if (!goalTitle.trim()) return;
      addGoal({
        title: goalTitle.trim(),
        targetValue: Number(goalTarget) || 10,
        currentValue: 0,
        unit: (goalUnit as any) || 'hours',
        period: 'weekly',
        completed: false,
      });
      setGoalTitle('');
    }

    closeQuickAdd();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl sm:rounded-3xl max-w-lg w-full p-4 sm:p-6 md:p-8 shadow-2xl space-y-4 sm:space-y-5 animate-in fade-in zoom-in-95 my-auto max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
              +
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-display text-slate-900">Ajout Rapide</h3>
              <p className="text-[11px] sm:text-xs text-slate-500">Créez une tâche, note ou matière en un instant</p>
            </div>
          </div>
          <button
            onClick={closeQuickAdd}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Selectors - 5 elements */}
        <div className="grid grid-cols-5 gap-1 bg-slate-100 p-1 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveType('task')}
            className={`py-1.5 sm:py-2 px-1 rounded-lg sm:rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
              activeType === 'task' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Tâche</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveType('note')}
            className={`py-1.5 sm:py-2 px-1 rounded-lg sm:rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
              activeType === 'note' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Note</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveType('subject')}
            className={`py-1.5 sm:py-2 px-1 rounded-lg sm:rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
              activeType === 'subject' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Matière</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveType('project')}
            className={`py-1.5 sm:py-2 px-1 rounded-lg sm:rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
              activeType === 'project' ? 'bg-white text-purple-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Projet</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveType('goal')}
            className={`py-1.5 sm:py-2 px-1 rounded-lg sm:rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
              activeType === 'goal' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Target className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">But</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* TASK FORM */}
          {activeType === 'task' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Titre de la tâche</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Ex: Réviser le chapitre 3 d'informatique"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Matière associée</label>
                  <select
                    value={taskSubjectId}
                    onChange={(e) => setTaskSubjectId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300"
                  >
                    <option value="">Général / Sans matière</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date d'échéance</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Priorité</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as Priority)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300"
                  >
                    <option value="low">Basse</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Durée estimée (min)</label>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={taskMinutes}
                    onChange={(e) => setTaskMinutes(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300"
                  />
                </div>
              </div>
            </>
          )}

          {/* NOTE FORM */}
          {activeType === 'note' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Titre de la note</label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Ex: Formule de Bayes & Démonstration"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date associée</label>
                  <input
                    type="date"
                    value={noteDate}
                    onChange={(e) => setNoteDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Matière liée</label>
                  <select
                    value={noteSubjectId}
                    onChange={(e) => setNoteSubjectId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300"
                  >
                    <option value="">Général / Aucune</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Contenu / Points clés</label>
                <textarea
                  rows={4}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Écrivez vos notes, formules clés, astuces ou résumé..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tags (séparés par virgule)</label>
                <input
                  type="text"
                  value={noteTags}
                  onChange={(e) => setNoteTags(e.target.value)}
                  placeholder="Ex: Révision, Formules, Examen"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300"
                />
              </div>
            </>
          )}

          {/* SUBJECT FORM */}
          {activeType === 'subject' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nom de la matière</label>
                <input
                  type="text"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="Ex: Analyse Réelle, Algorithmique"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Code court</label>
                  <input
                    type="text"
                    value={subCode}
                    onChange={(e) => setSubCode(e.target.value)}
                    placeholder="Ex: MAT101"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Heures hebdo cibles</label>
                  <input
                    type="number"
                    min="1"
                    value={subHours}
                    onChange={(e) => setSubHours(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Date d'examen (optionnel)</label>
                <input
                  type="date"
                  value={subExamDate}
                  onChange={(e) => setSubExamDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300"
                />
              </div>
            </>
          )}

          {/* PROJECT FORM */}
          {activeType === 'project' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nom du projet</label>
                <input
                  type="text"
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  placeholder="Ex: Rapport de stage, Application Flutter"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  placeholder="Objectifs et livrables attendus..."
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Échéance finale</label>
                  <input
                    type="date"
                    value={projDeadline}
                    onChange={(e) => setProjDeadline(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Priorité</label>
                  <select
                    value={projPriority}
                    onChange={(e) => setProjPriority(e.target.value as Priority)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300"
                  >
                    <option value="low">Basse</option>
                    <option value="medium">Moyenne</option>
                    <option value="high">Haute</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {/* GOAL FORM */}
          {activeType === 'goal' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Titre de l'objectif</label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  placeholder="Ex: Étudier 20h cette semaine, Valider 5 chapitres"
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Valeur cible</label>
                  <input
                    type="number"
                    min="1"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Unité</label>
                  <select
                    value={goalUnit}
                    onChange={(e) => setGoalUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300"
                  >
                    <option value="hours">Heures</option>
                    <option value="chapters">Chapitres</option>
                    <option value="tasks">Tâches</option>
                    <option value="sessions">Séances</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={closeQuickAdd}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-colors ${
                activeType === 'note'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : activeType === 'project'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {activeType === 'note' ? 'Enregistrer la note' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
