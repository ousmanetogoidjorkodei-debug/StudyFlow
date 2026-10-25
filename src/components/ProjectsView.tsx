import React, { useState } from 'react';
import {
  FolderGit2,
  Plus,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Sparkles,
  Trash2,
  Crown,
  AlertCircle,
  Check,
  X,
  Lock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { getAiAuthHeaders } from '../services/api';
import { Project, ProjectTask, Priority } from '../types';

export const ProjectsView: React.FC = () => {
  const {
    projects,
    addProject,
    updateProject,
    deleteProject,
    toggleProjectTask,
    user,
    setUser,
    openQuickAdd,
  } = useApp();
  const { currentUser, openAuthModal } = useAuth();

  const isPro = Boolean(currentUser && user.tier === 'pro');

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskHours, setNewTaskHours] = useState(2);
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');
  const [isAddingTask, setIsAddingTask] = useState(false);

  // AI Breakdown Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{
    estimatedTotalHours: number;
    feasibilityScore: number;
    milestones: string[];
    tasks: { title: string; priority: string; estimatedHours: number; milestone?: string }[];
    riskFactors: string[];
  } | null>(null);

  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const FREE_TIER_LIMIT = 5;
  const isAtLimit = user.tier === 'free' && projects.length >= FREE_TIER_LIMIT;

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !activeProject) return;

    const task: ProjectTask = {
      id: `pt-${Date.now()}`,
      title: newTaskTitle.trim(),
      completed: false,
      priority: newTaskPriority,
      estimatedHours: Number(newTaskHours) || 2,
    };

    updateProject(activeProject.id, {
      tasks: [...activeProject.tasks, task],
    });

    setNewTaskTitle('');
    setNewTaskHours(2);
    setIsAddingTask(false);
  };

  const handleDeleteTask = (taskId: string) => {
    if (!activeProject) return;
    const updated = activeProject.tasks.filter((t) => t.id !== taskId);
    updateProject(activeProject.id, { tasks: updated });
  };

  // Run AI Project Breakdown
  const handleRunAiBreakdown = async () => {
    if (!activeProject) return;

    if (!isPro) {
      setAiError('Le découpage de projet par IA Gemini est réservé aux membres Studyflow Pro.');
      return;
    }

    setAiLoading(true);
    setAiResult(null);
    setAiError(null);

    try {
      const headers = await getAiAuthHeaders();
      const res = await fetch('/api/ai/project-breakdown', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: activeProject.name,
          description: activeProject.description,
          deadline: activeProject.deadline,
          category: activeProject.category,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || 'Erreur lors du découpage du projet par l’IA.');
      }

      const data = await res.json();
      setAiResult(data);
    } catch (err: any) {
      setAiError(err.message || 'Impossible de contacter l’IA Gemini.');
    } finally {
      setAiLoading(false);
    }
  };

  // Apply AI tasks directly to current project
  const handleApplyAiTasks = () => {
    if (!activeProject || !aiResult) return;
    const newTasks: ProjectTask[] = aiResult.tasks.map((t, idx) => ({
      id: `pt-ai-${Date.now()}-${idx}`,
      title: t.title,
      completed: false,
      priority: (t.priority as Priority) || 'medium',
      estimatedHours: t.estimatedHours,
    }));

    updateProject(activeProject.id, {
      tasks: [...activeProject.tasks, ...newTasks],
    });

    setIsAiModalOpen(false);
  };

  const priorityBadge: Record<Priority, { label: string; class: string }> = {
    low: { label: 'Basse', class: 'bg-slate-100 text-slate-700' },
    medium: { label: 'Moyenne', class: 'bg-blue-50 text-blue-700' },
    high: { label: 'Haute', class: 'bg-amber-50 text-amber-700' },
    urgent: { label: 'Urgente', class: 'bg-rose-50 text-rose-700 font-bold' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Gestion des Projets
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
              {projects.length} {user.tier === 'free' ? `/ ${FREE_TIER_LIMIT} (Gratuit)` : 'Projets (Pro Illimité)'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Jalons, répartition des sous-tâches et estimation du temps d'avancement
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user.tier === 'free' && (
            <button
              onClick={() => setUser((prev) => ({ ...prev, tier: 'pro' }))}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition-colors"
            >
              <Crown className="w-4 h-4 text-amber-500" />
              <span>Activer Pro Illimité</span>
            </button>
          )}

          <button
            id="add-project-btn"
            disabled={isAtLimit}
            onClick={() => openQuickAdd('project')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-xs transition-all shadow-xs ${
              isAtLimit
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau projet</span>
          </button>
        </div>
      </div>

      {isAtLimit && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4 text-xs text-amber-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Vous avez atteint la limite de 5 projets de la version gratuite. Passez à la version Premium pour créer des projets illimités.
            </span>
          </div>
          <button
            onClick={() => setUser((prev) => ({ ...prev, tier: 'pro' }))}
            className="font-bold underline text-amber-900 shrink-0"
          >
            Débloquer Pro
          </button>
        </div>
      )}

      {/* Grid: Projects list & Selected Project detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Projects Overview Cards */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Vos projets</p>
          {projects.length === 0 ? (
            <div className="p-5 rounded-2xl bg-white border border-slate-200 text-slate-400 text-xs text-center py-8">
              Aucun projet pour le moment.
            </div>
          ) : (
            projects.map((proj) => {
            const isSelected = activeProject?.id === proj.id;
            const completedCount = proj.tasks.filter((t) => t.completed).length;
            const progress = proj.tasks.length
              ? Math.round((completedCount / proj.tasks.length) * 100)
              : 0;

            return (
              <div
                key={proj.id}
                onClick={() => setSelectedProjectId(proj.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/10 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {proj.category}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                      priorityBadge[proj.priority].class
                    }`}
                  >
                    {priorityBadge[proj.priority].label}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 mt-2 line-clamp-1">{proj.name}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{proj.description}</p>

                <div className="mt-3 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                  <span>{progress}% • {completedCount}/{proj.tasks.length} tâches</span>
                  <span className="font-medium text-slate-700">
                    {new Date(proj.deadline).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            );
          })
          )}
        </div>

        {/* Right 2 Columns: Selected Project Detail */}
        {activeProject && (
          <div className="lg:col-span-2 space-y-6">
            {/* Project Header Card */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold font-display text-slate-900">
                      {activeProject.name}
                    </h2>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-md font-semibold ${
                        priorityBadge[activeProject.priority].class
                      }`}
                    >
                      {priorityBadge[activeProject.priority].label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{activeProject.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  {/* AI Breakdown Button */}
                  <button
                    id="project-ai-breakdown-btn"
                    onClick={() => {
                      setIsAiModalOpen(true);
                      if (isPro) {
                        handleRunAiBreakdown();
                      } else {
                        setAiError('Le découpage intelligent par IA Gemini est réservé aux membres Studyflow Pro.');
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white text-xs font-semibold shadow-xs transition-colors ${
                      !isPro
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-violet-600 hover:bg-violet-700'
                    }`}
                  >
                    {!isPro ? (
                      <Crown className="w-3.5 h-3.5 text-amber-200" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Découper avec l'IA {!isPro ? '(Pro)' : ''}</span>
                  </button>

                  <button
                    onClick={() => deleteProject(activeProject.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Supprimer ce projet"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Deadline & Meta Bar */}
              <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 text-xs text-slate-600">
                <span className="flex items-center gap-1.5 font-medium">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Échéance : {new Date(activeProject.deadline).toLocaleDateString('fr-FR')}
                </span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-4 h-4 text-slate-400" />
                  Estimation :{' '}
                  {activeProject.tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0)} heures de travail
                </span>
              </div>
            </div>

            {/* Sub-Tasks Checklist Section */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold font-display text-slate-900">
                    Liste des Tâches ({activeProject.tasks.length})
                  </h3>
                  <p className="text-xs text-slate-500">Cochez pour mettre à jour l'avancement global</p>
                </div>
                <button
                  onClick={() => setIsAddingTask(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter une sous-tâche</span>
                </button>
              </div>

              {/* Inline Add Task Form */}
              {isAddingTask && (
                <form
                  onSubmit={handleCreateTask}
                  className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-950">Nouvelle sous-tâche</span>
                    <button
                      type="button"
                      onClick={() => setIsAddingTask(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="Ex: Rédiger la conclusion et exporter le PDF"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        value={newTaskHours}
                        onChange={(e) => setNewTaskHours(Number(e.target.value))}
                        className="w-20 px-3 py-2 text-xs rounded-xl bg-white border border-slate-300"
                        title="Heures estimées"
                      />
                      <select
                        value={newTaskPriority}
                        onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                        className="flex-1 px-2 py-2 text-xs rounded-xl bg-white border border-slate-300"
                      >
                        <option value="low">Basse</option>
                        <option value="medium">Moyenne</option>
                        <option value="high">Haute</option>
                        <option value="urgent">Urgente</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingTask(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-white rounded-lg"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Ajouter
                    </button>
                  </div>
                </form>
              )}

              {/* Tasks List */}
              <div className="space-y-2">
                {activeProject.tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`group p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      task.completed ? 'bg-slate-50 border-slate-200 opacity-60' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => toggleProjectTask(activeProject.id, task.id)}
                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300 group-hover:text-indigo-500" />
                        )}
                      </button>
                      <div>
                        <p
                          className={`text-sm font-medium text-slate-900 truncate ${
                            task.completed ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span>{task.estimatedHours || 1}h estimées</span>
                          {task.dueDate && <span>• Échéance : {task.dueDate}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                          priorityBadge[task.priority].class
                        }`}
                      >
                        {priorityBadge[task.priority].label}
                      </span>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1 rounded-md text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!activeProject && (
          <div className="lg:col-span-2 p-12 text-center bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-slate-500">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base mb-1">Aucun projet sélectionné</h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              Créez ou sélectionnez un projet pour décomposer vos objectifs et jalons d'études.
            </p>
            <button
              onClick={() => openQuickAdd('project')}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau Projet</span>
            </button>
          </div>
        )}
      </div>

      {/* AI Breakdown Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Découpage & Estimation IA du Projet
                  </h3>
                  <p className="text-xs text-slate-500">{activeProject?.name}</p>
                </div>
              </div>
              <button onClick={() => setIsAiModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {aiLoading ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-10 h-10 border-3 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-semibold text-slate-800">
                  L'IA décompose le projet en jalons logiques...
                </p>
                <p className="text-xs text-slate-500">Calcul du score de faisabilité et ordonnancement des tâches.</p>
              </div>
            ) : aiError || !isPro ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                  <Crown className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h4 className="text-base font-bold text-slate-900">
                    Découpage IA réservé aux membres Studyflow Pro
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {aiError ||
                      "L'intelligence artificielle Gemini analyse les objectifs de votre projet pour estimer la charge et générer un calendrier de jalons optimal."}
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setIsAiModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Fermer
                  </button>
                  {!currentUser ? (
                    <button
                      onClick={() => {
                        setIsAiModalOpen(false);
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
                        setIsAiModalOpen(false);
                      }}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5"
                    >
                      <Crown className="w-4 h-4" />
                      <span>⚡ Passer à Studyflow Pro</span>
                    </button>
                  )}
                </div>
              </div>
            ) : aiResult ? (
              <div className="mt-6 space-y-6 text-slate-800">
                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                    <span className="text-[11px] text-indigo-700 font-bold uppercase tracking-wider">
                      Temps Total Estimé
                    </span>
                    <p className="text-2xl font-bold font-display text-indigo-950 mt-1">
                      {aiResult.estimatedTotalHours} heures
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                    <span className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider">
                      Faisabilité
                    </span>
                    <p className="text-2xl font-bold font-display text-emerald-950 mt-1">
                      {aiResult.feasibilityScore} / 10
                    </p>
                  </div>
                </div>

                {/* Milestones */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Jalons Clés Identifiés
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {aiResult.milestones.map((m, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
                      >
                        {i + 1}. {m}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Suggested Sub-tasks */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Sous-tâches Prêtes à Intégrer ({aiResult.tasks.length})
                  </h4>
                  <div className="space-y-2">
                    {aiResult.tasks.map((t, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-slate-800">{t.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-medium">{t.estimatedHours}h</span>
                          <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold text-[10px]">
                            {t.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk Factors */}
                {aiResult.riskFactors.length > 0 && (
                  <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    <p className="font-bold mb-1">Points de vigilance signalés par l'IA :</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {aiResult.riskFactors.map((rf, i) => (
                        <li key={i}>{rf}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setIsAiModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Fermer
                  </button>
                  <button
                    onClick={handleApplyAiTasks}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>Ajouter ces {aiResult.tasks.length} tâches au projet</span>
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
