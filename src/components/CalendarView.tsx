import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderGit2,
  BookOpen,
  Filter,
  FileText,
  X,
  Edit3,
  Trash2,
  Pin,
  ExternalLink,
  Tag,
  Check,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { QuickNote, DailyTask, Priority } from '../types';

type CalendarViewMode = 'month' | 'week' | 'day';

export const CalendarView: React.FC = () => {
  const {
    tasks,
    subjects,
    projects,
    notes,
    addNote,
    updateNote,
    deleteNote,
    toggleTask,
    addTask,
    openQuickAdd,
    setActiveTab,
  } = useApp();

  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'notes' | 'tasks' | 'exams' | 'projects'>('all');

  // Selected date for day details or quick note
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isDayInspectorOpen, setIsDayInspectorOpen] = useState(false);

  // Note Viewer / Editor modal state
  const [activeNote, setActiveNote] = useState<QuickNote | null>(null);
  const [isEditingActiveNote, setIsEditingActiveNote] = useState(false);
  const [editNoteTitle, setEditNoteTitle] = useState('');
  const [editNoteContent, setEditNoteContent] = useState('');
  const [editNoteDate, setEditNoteDate] = useState('');
  const [editNoteSubjectId, setEditNoteSubjectId] = useState('');
  const [editNoteTags, setEditNoteTags] = useState('');

  // Inline Quick Add Note Modal
  const [isCreateNoteModalOpen, setIsCreateNoteModalOpen] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteDate, setNewNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [newNoteSubjectId, setNewNoteSubjectId] = useState('');
  const [newNoteProjectId, setNewNoteProjectId] = useState('');
  const [newNoteTags, setNewNoteTags] = useState('');

  // Inline Quick Add Task state for a specific day
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');
  const [newTaskSubjectId, setNewTaskSubjectId] = useState('');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Navigation
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      setCurrentDate(d);
      setSelectedDateStr(d.toISOString().split('T')[0]);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (viewMode === 'week') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
    } else {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      setCurrentDate(d);
      setSelectedDateStr(d.toISOString().split('T')[0]);
    }
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(today.toISOString().split('T')[0]);
  };

  const formatTitle = () => {
    if (viewMode === 'month') {
      return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(currentDate);
    }
    if (viewMode === 'week') {
      return `Semaine du ${currentDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
    }
    return currentDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Helper to get note date (either explicit date or createdAt date)
  const getNoteDate = (note: QuickNote): string => {
    if (note.date) return note.date;
    try {
      return new Date(note.createdAt).toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };

  // Build Month Calendar Days
  const firstDayOfMonth = new Date(year, month, 1);
  const startingDay = (firstDayOfMonth.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays: { dayNum: number; dateStr: string; isCurrentMonth: boolean }[] = [];

  // Prev month padding
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startingDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const dateObj = new Date(year, month - 1, d);
    calendarDays.push({
      dayNum: d,
      dateStr: dateObj.toISOString().split('T')[0],
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const dateObj = new Date(year, month, i);
    calendarDays.push({
      dayNum: i,
      dateStr: dateObj.toISOString().split('T')[0],
      isCurrentMonth: true,
    });
  }

  // Next month padding to fill 35 or 42 grid cells
  const remaining = 35 - calendarDays.length;
  if (remaining > 0) {
    for (let i = 1; i <= remaining; i++) {
      const dateObj = new Date(year, month + 1, i);
      calendarDays.push({
        dayNum: i,
        dateStr: dateObj.toISOString().split('T')[0],
        isCurrentMonth: false,
      });
    }
  }

  // Gather items for a date
  interface CalendarItem {
    id: string;
    type: 'note' | 'task' | 'exam' | 'project';
    title: string;
    color: string;
    completed?: boolean;
    rawNote?: QuickNote;
    rawTask?: DailyTask;
  }

  const getItemsForDate = (dateStr: string): CalendarItem[] => {
    const dateNotes = notes.filter((n) => getNoteDate(n) === dateStr);
    const dateTasks = tasks.filter((t) => t.dueDate === dateStr);
    const dateExams = subjects.filter((s) => s.examDate === dateStr);
    const dateProjects = projects.filter((p) => p.deadline === dateStr);

    let items: CalendarItem[] = [];

    // Notes
    if (selectedFilter === 'all' || selectedFilter === 'notes') {
      items.push(
        ...dateNotes.map((n) => ({
          id: n.id,
          type: 'note' as const,
          title: n.title,
          color: '#d97706', // amber-600
          rawNote: n,
        }))
      );
    }

    // Tasks
    if (selectedFilter === 'all' || selectedFilter === 'tasks') {
      items.push(
        ...dateTasks.map((t) => ({
          id: t.id,
          type: 'task' as const,
          title: t.title,
          color: t.priority === 'urgent' ? '#e11d48' : '#4f46e5',
          completed: t.completed,
          rawTask: t,
        }))
      );
    }

    // Exams
    if (selectedFilter === 'all' || selectedFilter === 'exams') {
      items.push(
        ...dateExams.map((s) => ({
          id: `exam-${s.id}`,
          type: 'exam' as const,
          title: `Examen ${s.name}`,
          color: '#ea580c', // orange-600
        }))
      );
    }

    // Projects
    if (selectedFilter === 'all' || selectedFilter === 'projects') {
      items.push(
        ...dateProjects.map((p) => ({
          id: `proj-${p.id}`,
          type: 'project' as const,
          title: `Échéance ${p.name}`,
          color: '#9333ea', // purple-600
        }))
      );
    }

    return items;
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // Open Note Reader/Editor
  const handleOpenNote = (note: QuickNote) => {
    setActiveNote(note);
    setEditNoteTitle(note.title);
    setEditNoteContent(note.content);
    setEditNoteDate(getNoteDate(note));
    setEditNoteSubjectId(note.subjectId || '');
    setEditNoteTags((note.tags || []).join(', '));
    setIsEditingActiveNote(false);
  };

  // Save changes to existing note
  const handleSaveActiveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeNote || !editNoteTitle.trim()) return;

    const tagsArray = editNoteTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    updateNote(activeNote.id, {
      title: editNoteTitle.trim(),
      content: editNoteContent,
      date: editNoteDate,
      subjectId: editNoteSubjectId || undefined,
      tags: tagsArray,
    });

    setActiveNote((prev) =>
      prev
        ? {
            ...prev,
            title: editNoteTitle.trim(),
            content: editNoteContent,
            date: editNoteDate,
            subjectId: editNoteSubjectId || undefined,
            tags: tagsArray,
          }
        : null
    );

    setIsEditingActiveNote(false);
  };

  // Open Create Note modal with specific date pre-filled
  const handleOpenCreateNote = (targetDate?: string) => {
    const dateToUse = targetDate || selectedDateStr || todayStr;
    setNewNoteDate(dateToUse);
    setNewNoteTitle('');
    setNewNoteContent('');
    setNewNoteSubjectId('');
    setNewNoteProjectId('');
    setNewNoteTags('');
    setIsCreateNoteModalOpen(true);
  };

  // Submit Create Note
  const handleCreateNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) return;

    const tagsArray = newNoteTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    addNote({
      title: newNoteTitle.trim(),
      content: newNoteContent,
      date: newNoteDate,
      subjectId: newNoteSubjectId || undefined,
      projectId: newNoteProjectId || undefined,
      tags: tagsArray,
      pinned: false,
    });

    setIsCreateNoteModalOpen(false);
  };

  // Open Create Task modal with specific date
  const handleOpenCreateTask = (targetDate?: string) => {
    const dateToUse = targetDate || selectedDateStr || todayStr;
    setNewTaskDate(dateToUse);
    setNewTaskTitle('');
    setNewTaskPriority('medium');
    setNewTaskSubjectId('');
    setIsCreateTaskModalOpen(true);
  };

  // Submit Create Task
  const handleCreateTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    addTask({
      title: newTaskTitle.trim(),
      dueDate: newTaskDate,
      completed: false,
      priority: newTaskPriority,
      category: 'study',
      estimatedMinutes: 45,
      subjectId: newTaskSubjectId || undefined,
    });

    setIsCreateTaskModalOpen(false);
  };

  // Clicking a day cell opens inspector
  const handleCellClick = (dateStr: string) => {
    setSelectedDateStr(dateStr);
    setIsDayInspectorOpen(true);
  };

  // Week days calculation
  const getWeekDays = () => {
    const current = new Date(currentDate);
    const dayOfWeek = (current.getDay() + 6) % 7; // Monday = 0
    const monday = new Date(current);
    monday.setDate(current.getDate() - dayOfWeek);

    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      week.push({
        dateObj: d,
        dateStr: d.toISOString().split('T')[0],
        dayName: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'][i],
        dayNum: d.getDate(),
      });
    }
    return week;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight capitalize">
              {formatTitle()}
            </h1>
            <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {notes.length} notes • {tasks.length} tâches
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Gérez vos notes de cours, examens, tâches quotidiennes et échéances
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Buttons */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'day' ? 'bg-white text-indigo-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Jour
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'week' ? 'bg-white text-indigo-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Semaine
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'month' ? 'bg-white text-indigo-600 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              Mois
            </button>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              title="Précédent"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Aujourd'hui
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              title="Suivant"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenCreateNote()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs shadow-xs transition-colors"
              title="Ajouter une note de cours ou révision"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Ajouter note</span>
            </button>

            <button
              onClick={() => handleOpenCreateTask()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors"
              title="Ajouter une tâche pour le calendrier"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ajouter tâche</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-medium flex items-center gap-1 shrink-0">
          <Filter className="w-3.5 h-3.5" />
          Filtrer :
        </span>
        <button
          onClick={() => setSelectedFilter('all')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 ${
            selectedFilter === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Tous les événements
        </button>
        <button
          onClick={() => setSelectedFilter('notes')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
            selectedFilter === 'notes'
              ? 'bg-amber-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
          }`}
        >
          <span>📝 Notes de révision</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800">
            {notes.length}
          </span>
        </button>
        <button
          onClick={() => setSelectedFilter('tasks')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
            selectedFilter === 'tasks'
              ? 'bg-indigo-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>✅ Tâches du jour</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-700">
            {tasks.length}
          </span>
        </button>
        <button
          onClick={() => setSelectedFilter('exams')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 ${
            selectedFilter === 'exams'
              ? 'bg-orange-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          🎓 Examens
        </button>
        <button
          onClick={() => setSelectedFilter('projects')}
          className={`px-3 py-1.5 rounded-xl font-semibold transition-all shrink-0 ${
            selectedFilter === 'projects'
              ? 'bg-purple-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          📁 Échéances projets
        </button>
      </div>

      {/* MONTH GRID VIEW */}
      {viewMode === 'month' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[620px] sm:min-w-full">
              {/* Days of week header */}
              <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50 text-center text-xs font-bold text-slate-500 py-2.5 sm:py-3">
                <span>Lun</span>
                <span>Mar</span>
                <span>Mer</span>
                <span>Jeu</span>
                <span>Ven</span>
                <span>Sam</span>
                <span>Dim</span>
              </div>

              {/* Calendar grid cells */}
              <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
                {calendarDays.map((cell, idx) => {
                  const isToday = cell.dateStr === todayStr;
                  const isSelected = cell.dateStr === selectedDateStr;
                  const items = getItemsForDate(cell.dateStr);

                  return (
                    <div
                      key={idx}
                      onClick={() => handleCellClick(cell.dateStr)}
                      className={`min-h-[85px] sm:min-h-[118px] p-1.5 sm:p-2 transition-all flex flex-col justify-between cursor-pointer group hover:bg-slate-50/80 ${
                        cell.isCurrentMonth ? 'bg-white' : 'bg-slate-50/40 text-slate-400'
                      } ${isSelected ? 'ring-2 ring-indigo-600 ring-inset bg-indigo-50/10' : ''}`}
                    >
                  {/* Cell Top row */}
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-transform group-hover:scale-105 ${
                        isToday
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : isSelected
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-700'
                      }`}
                    >
                      {cell.dayNum}
                    </span>

                    <div className="flex items-center gap-1">
                      {/* Quick + button on cell hover */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenCreateNote(cell.dateStr);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-amber-600 hover:bg-amber-100 transition-opacity"
                        title="Ajouter une note ce jour"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>

                      {items.length > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                          {items.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cell Items list */}
                  <div className="space-y-1 overflow-y-auto max-h-20 scrollbar-none">
                    {items.slice(0, 3).map((item) => (
                      <div
                        key={item.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.type === 'note' && item.rawNote) {
                            handleOpenNote(item.rawNote);
                          } else if (item.type === 'task') {
                            toggleTask(item.id);
                          } else {
                            handleCellClick(cell.dateStr);
                          }
                        }}
                        className={`px-1.5 py-1 rounded-md text-[11px] truncate font-medium transition-all hover:scale-[1.02] flex items-center gap-1 ${
                          item.completed ? 'line-through opacity-50' : ''
                        } ${
                          item.type === 'note'
                            ? 'bg-amber-50 text-amber-900 border border-amber-200/80 shadow-2xs hover:bg-amber-100 font-semibold'
                            : item.type === 'task'
                            ? 'bg-indigo-50 text-indigo-900 border border-indigo-100 hover:bg-indigo-100'
                            : item.type === 'exam'
                            ? 'bg-orange-50 text-orange-900 border border-orange-200 font-semibold'
                            : 'bg-purple-50 text-purple-900 border border-purple-100'
                        }`}
                        title={
                          item.type === 'note'
                            ? `Note : ${item.title} (Cliquez pour ouvrir)`
                            : item.title
                        }
                      >
                        {item.type === 'note' && <FileText className="w-3 h-3 text-amber-600 shrink-0" />}
                        {item.type === 'task' && (
                          <div
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              item.completed ? 'bg-emerald-500' : 'bg-indigo-500'
                            }`}
                          />
                        )}
                        {item.type === 'exam' && <span className="shrink-0 text-[10px]">🎓</span>}
                        {item.type === 'project' && <span className="shrink-0 text-[10px]">📁</span>}
                        <span className="truncate">{item.title}</span>
                      </div>
                    ))}

                    {items.length > 3 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCellClick(cell.dateStr);
                        }}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold pl-1 hover:underline block text-left"
                      >
                        +{items.length - 3} autres...
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
            </div>
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {getWeekDays().map((day, idx) => {
            const isToday = day.dateStr === todayStr;
            const items = getItemsForDate(day.dateStr);
            const dayNotes = items.filter((i) => i.type === 'note');
            const dayTasks = items.filter((i) => i.type === 'task');

            return (
              <div
                key={idx}
                className={`bg-white rounded-2xl border transition-all p-3.5 flex flex-col justify-between min-h-[360px] shadow-xs ${
                  isToday ? 'border-indigo-400 ring-2 ring-indigo-500/20' : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Day Header */}
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">{day.dayName}</p>
                      <p
                        className={`text-base font-extrabold ${
                          isToday ? 'text-indigo-600' : 'text-slate-900'
                        }`}
                      >
                        {day.dayNum}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenCreateNote(day.dateStr)}
                        className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                        title="Ajouter une note ce jour"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleOpenCreateTask(day.dateStr)}
                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Ajouter une tâche ce jour"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Items list */}
                  <div className="space-y-2">
                    {/* Notes in week */}
                    {dayNotes.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => item.rawNote && handleOpenNote(item.rawNote)}
                        className="p-2 rounded-xl bg-amber-50/80 border border-amber-200 text-xs cursor-pointer hover:bg-amber-100 transition-colors"
                      >
                        <div className="flex items-center gap-1.5 font-bold text-amber-900">
                          <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="truncate">{item.title}</span>
                        </div>
                        {item.rawNote?.content && (
                          <p className="text-[11px] text-amber-800/80 line-clamp-2 mt-1">
                            {item.rawNote.content}
                          </p>
                        )}
                      </div>
                    ))}

                    {/* Tasks in week */}
                    {dayTasks.map((item) => (
                      <div
                        key={item.id}
                        className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleTask(item.id)}
                            className="shrink-0 text-slate-400 hover:text-emerald-600"
                          >
                            <CheckCircle2
                              className={`w-4 h-4 ${
                                item.completed ? 'text-emerald-500' : 'text-slate-300'
                              }`}
                            />
                          </button>
                          <span
                            className={`truncate ${
                              item.completed ? 'line-through text-slate-400' : 'text-slate-800'
                            }`}
                          >
                            {item.title}
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* Other items */}
                    {items
                      .filter((i) => i.type !== 'note' && i.type !== 'task')
                      .map((item) => (
                        <div
                          key={item.id}
                          className="p-2 rounded-xl bg-orange-50 border border-orange-200 text-xs font-semibold text-orange-900"
                        >
                          {item.title}
                        </div>
                      ))}

                    {items.length === 0 && (
                      <div className="text-center py-6 text-slate-400 text-xs">
                        Aucun élément
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCellClick(day.dateStr)}
                  className="mt-3 w-full py-1.5 text-center text-[11px] font-semibold text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Voir la journée →
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* DAY VIEW */}
      {viewMode === 'day' && (
        <div className="space-y-6">
          {/* Day Date Navigator & Action bar */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Planning Quotidien
              </span>
              <h2 className="text-2xl font-bold text-slate-900 mt-1 capitalize">
                {currentDate.toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenCreateNote(selectedDateStr)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>+ Nouvelle note ce jour</span>
              </button>
              <button
                onClick={() => handleOpenCreateTask(selectedDateStr)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>+ Nouvelle tâche ce jour</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Notes Section for the Day */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Notes de révision du jour</h3>
                    <p className="text-xs text-slate-500">
                      {notes.filter((n) => getNoteDate(n) === selectedDateStr).length} note(s) pour cette date
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenCreateNote(selectedDateStr)}
                  className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-semibold transition-colors"
                >
                  + Ajouter
                </button>
              </div>

              {notes.filter((n) => getNoteDate(n) === selectedDateStr).length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <FileText className="w-10 h-10 mx-auto opacity-30 text-amber-600" />
                  <p className="text-sm font-medium text-slate-600">Aucune note enregistrée pour ce jour</p>
                  <p className="text-xs text-slate-400">
                    Prenez des notes de cours ou résumés clés pour cette date
                  </p>
                  <button
                    onClick={() => handleOpenCreateNote(selectedDateStr)}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Créer une note maintenant
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes
                    .filter((n) => getNoteDate(n) === selectedDateStr)
                    .map((note) => {
                      const subject = subjects.find((s) => s.id === note.subjectId);
                      return (
                        <div
                          key={note.id}
                          onClick={() => handleOpenNote(note)}
                          className="p-4 rounded-2xl border border-amber-200/80 bg-amber-50/50 hover:bg-amber-50 cursor-pointer transition-all hover:shadow-xs group"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                              {note.title}
                            </h4>
                            {note.pinned && (
                              <Pin className="w-3.5 h-3.5 text-amber-600 shrink-0 fill-amber-600" />
                            )}
                          </div>

                          {note.content && (
                            <p className="text-xs text-slate-600 line-clamp-3 mt-2 font-mono whitespace-pre-wrap">
                              {note.content}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-amber-200/60 text-xs">
                            <div className="flex items-center gap-1.5">
                              {subject && (
                                <span
                                  className="px-2 py-0.5 rounded-md font-semibold text-[10px]"
                                  style={{ backgroundColor: `${subject.color}20`, color: subject.color }}
                                >
                                  {subject.name}
                                </span>
                              )}
                              {note.tags?.map((t) => (
                                <span key={t} className="px-1.5 py-0.5 rounded bg-white text-slate-600 text-[10px]">
                                  #{t}
                                </span>
                              ))}
                            </div>
                            <span className="text-amber-700 font-semibold text-xs group-hover:underline">
                              Lire / Modifier →
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Tasks Section for the Day */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Tâches planifiées ce jour</h3>
                    <p className="text-xs text-slate-500">
                      {tasks.filter((t) => t.dueDate === selectedDateStr).length} tâche(s) au programme
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenCreateTask(selectedDateStr)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition-colors"
                >
                  + Ajouter
                </button>
              </div>

              {tasks.filter((t) => t.dueDate === selectedDateStr).length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-10 h-10 mx-auto opacity-30 text-indigo-600" />
                  <p className="text-sm font-medium text-slate-600">Aucune tâche prévue ce jour</p>
                  <button
                    onClick={() => handleOpenCreateTask(selectedDateStr)}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Ajouter une tâche
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks
                    .filter((t) => t.dueDate === selectedDateStr)
                    .map((t) => (
                      <div
                        key={t.id}
                        className="p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => toggleTask(t.id)}
                            className="cursor-pointer"
                          >
                            <CheckCircle2
                              className={`w-5 h-5 ${
                                t.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-600'
                              }`}
                            />
                          </button>
                          <div>
                            <p
                              className={`text-sm font-semibold ${
                                t.completed ? 'line-through text-slate-400' : 'text-slate-900'
                              }`}
                            >
                              {t.title}
                            </p>
                            <p className="text-xs text-slate-500">{t.estimatedMinutes} min estimées</p>
                          </div>
                        </div>

                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded capitalize ${
                            t.priority === 'urgent'
                              ? 'bg-rose-50 text-rose-700'
                              : t.priority === 'high'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-indigo-50 text-indigo-700'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* DAY INSPECTOR MODAL (When clicking any cell in Month grid) */}
      {/* ========================================================= */}
      {isDayInspectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 capitalize">
                    {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Détail des notes, tâches et échéances pour ce jour
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsDayInspectorOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions for this day */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsDayInspectorOpen(false);
                  handleOpenCreateNote(selectedDateStr);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <FileText className="w-4 h-4" />
                <span>+ Ajouter une note pour ce jour</span>
              </button>
              <button
                onClick={() => {
                  setIsDayInspectorOpen(false);
                  handleOpenCreateTask(selectedDateStr);
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>+ Ajouter une tâche pour ce jour</span>
              </button>
            </div>

            {/* Section 1: Notes du jour */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span>Notes enregistrées ({notes.filter((n) => getNoteDate(n) === selectedDateStr).length})</span>
                </h4>
              </div>

              {notes.filter((n) => getNoteDate(n) === selectedDateStr).length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-center text-xs text-slate-500">
                  Aucune note de cours pour ce jour. Cliquez sur "+ Ajouter une note" ci-dessus pour en créer une.
                </div>
              ) : (
                <div className="space-y-2">
                  {notes
                    .filter((n) => getNoteDate(n) === selectedDateStr)
                    .map((note) => {
                      const subject = subjects.find((s) => s.id === note.subjectId);
                      return (
                        <div
                          key={note.id}
                          onClick={() => {
                            setIsDayInspectorOpen(false);
                            handleOpenNote(note);
                          }}
                          className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/70 cursor-pointer transition-colors flex items-start justify-between gap-3"
                        >
                          <div className="space-y-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{note.title}</p>
                            {note.content && (
                              <p className="text-xs text-slate-600 line-clamp-2">{note.content}</p>
                            )}
                            <div className="flex items-center gap-2 pt-1 text-[10px]">
                              {subject && (
                                <span className="font-semibold text-amber-800">
                                  📚 {subject.name}
                                </span>
                              )}
                              {note.tags?.map((t) => (
                                <span key={t} className="text-slate-500 font-medium">
                                  #{t}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="text-xs font-semibold text-amber-700 hover:text-amber-900 shrink-0 self-center px-2 py-1 rounded bg-amber-100 hover:bg-amber-200"
                          >
                            Ouvrir
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Section 2: Tâches du jour */}
            <div className="space-y-3 pt-2">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                <span>Tâches du jour ({tasks.filter((t) => t.dueDate === selectedDateStr).length})</span>
              </h4>

              {tasks.filter((t) => t.dueDate === selectedDateStr).length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 text-center text-xs text-slate-500">
                  Aucune tâche programmée pour ce jour.
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks
                    .filter((t) => t.dueDate === selectedDateStr)
                    .map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2
                            onClick={() => toggleTask(t.id)}
                            className={`w-4 h-4 cursor-pointer ${
                              t.completed ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-600'
                            }`}
                          />
                          <span
                            className={`text-xs font-medium ${
                              t.completed ? 'line-through text-slate-400' : 'text-slate-900'
                            }`}
                          >
                            {t.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 capitalize">
                          {t.priority}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* NOTE READER / EDITOR MODAL (Direct access from calendar) */}
      {/* ========================================================= */}
      {activeNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Modal Top bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                  📝
                </span>
                <div>
                  <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                    Note au calendrier
                  </span>
                  <p className="text-xs text-slate-400">
                    Date : {getNoteDate(activeNote)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    updateNote(activeNote.id, { pinned: !activeNote.pinned })
                  }
                  className={`p-2 rounded-xl transition-colors ${
                    activeNote.pinned
                      ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                  }`}
                  title={activeNote.pinned ? 'Désépingler' : 'Épingler'}
                >
                  <Pin className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingActiveNote(!isEditingActiveNote)}
                  className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                  title="Modifier"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    deleteNote(activeNote.id);
                    setActiveNote(null);
                  }}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
                  title="Supprimer la note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveNote(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Read Mode */}
            {!isEditingActiveNote ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 leading-snug">
                    {activeNote.title}
                  </h3>
                </div>

                {/* Metadata badges */}
                <div className="flex flex-wrap items-center gap-2">
                  {subjects.find((s) => s.id === activeNote.subjectId) && (
                    <span
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{
                        backgroundColor: `${
                          subjects.find((s) => s.id === activeNote.subjectId)?.color
                        }15`,
                        color: subjects.find((s) => s.id === activeNote.subjectId)?.color,
                      }}
                    >
                      📚 {subjects.find((s) => s.id === activeNote.subjectId)?.name}
                    </span>
                  )}
                  {activeNote.tags?.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium"
                    >
                      #{t}
                    </span>
                  ))}
                </div>

                {/* Content */}
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 text-sm text-slate-800 font-mono whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                  {activeNote.content || 'Aucun contenu textuel pour cette note.'}
                </div>

                {/* Footer buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('notes');
                      setActiveNote(null);
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    <span>Consulter dans l'onglet Notes</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingActiveNote(true)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveNote(null)}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Edit Mode inside Calendar */
              <form onSubmit={handleSaveActiveNote} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Titre de la note
                  </label>
                  <input
                    type="text"
                    value={editNoteTitle}
                    onChange={(e) => setEditNoteTitle(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300 focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Date au calendrier
                    </label>
                    <input
                      type="date"
                      value={editNoteDate}
                      onChange={(e) => setEditNoteDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Matière liée
                    </label>
                    <select
                      value={editNoteSubjectId}
                      onChange={(e) => setEditNoteSubjectId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300"
                    >
                      <option value="">Aucune</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Contenu
                  </label>
                  <textarea
                    rows={6}
                    value={editNoteContent}
                    onChange={(e) => setEditNoteContent(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border border-slate-300 focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Tags (séparés par virgule)
                  </label>
                  <input
                    type="text"
                    value={editNoteTags}
                    onChange={(e) => setEditNoteTags(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditingActiveNote(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-semibold bg-amber-600 text-white rounded-xl hover:bg-amber-700 shadow-xs"
                  >
                    Enregistrer les modifications
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* INLINE CREATE NOTE MODAL (From calendar buttons) */}
      {/* ========================================================= */}
      {isCreateNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateNoteSubmit}
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Ajouter une Note au Calendrier
                  </h3>
                  <p className="text-xs text-slate-500">
                    Date prévue : {newNoteDate}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateNoteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Titre de la note
              </label>
              <input
                type="text"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="Ex: Formules de Taylor & Exercices clés"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300 focus:ring-2 focus:ring-amber-500"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Date au calendrier
                </label>
                <input
                  type="date"
                  value={newNoteDate}
                  onChange={(e) => setNewNoteDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Matière associée
                </label>
                <select
                  value={newNoteSubjectId}
                  onChange={(e) => setNewNoteSubjectId(e.target.value)}
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
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Contenu de la note
              </label>
              <textarea
                rows={4}
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Notez vos concepts clés, résumés, formules ou rappels d'études..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border border-slate-300 focus:ring-2 focus:ring-amber-500 font-mono resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Tags (séparés par virgule)
              </label>
              <input
                type="text"
                value={newNoteTags}
                onChange={(e) => setNewNoteTags(e.target.value)}
                placeholder="Ex: Examen, Cours, Formule"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateNoteModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-xs transition-colors"
              >
                Enregistrer dans le calendrier
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* INLINE CREATE TASK MODAL (From calendar buttons) */}
      {/* ========================================================= */}
      {isCreateTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateTaskSubmit}
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Ajouter une Tâche au Calendrier
                  </h3>
                  <p className="text-xs text-slate-500">
                    Date prévue : {newTaskDate}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateTaskModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Titre de la tâche
              </label>
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Ex: Résoudre la fiche d'exercices n°4"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Date d'échéance
                </label>
                <input
                  type="date"
                  value={newTaskDate}
                  onChange={(e) => setNewTaskDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Priorité
                </label>
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as Priority)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300"
                >
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Matière associée
              </label>
              <select
                value={newTaskSubjectId}
                onChange={(e) => setNewTaskSubjectId(e.target.value)}
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

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateTaskModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors"
              >
                Ajouter au calendrier
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
