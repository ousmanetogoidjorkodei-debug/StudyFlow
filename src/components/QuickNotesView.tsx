import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Pin,
  Trash2,
  Edit3,
  BookOpen,
  FolderGit2,
  Tag,
  Check,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { QuickNote } from '../types';

export const QuickNotesView: React.FC = () => {
  const { notes, addNote, updateNote, deleteNote, subjects, projects, openQuickAdd } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [editingNote, setEditingNote] = useState<QuickNote | null>(null);

  // Form for new/edited note
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [noteSubjectId, setNoteSubjectId] = useState('');
  const [noteProjectId, setNoteProjectId] = useState('');
  const [noteTagsInput, setNoteTagsInput] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // All unique tags
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags || [])));

  // Filtered notes
  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === 'all' || (n.tags && n.tags.includes(selectedTag));
    return matchesSearch && matchesTag;
  });

  const handleOpenNewNote = () => {
    setEditingNote(null);
    setNoteTitle('');
    setNoteContent('');
    setNoteDate(new Date().toISOString().split('T')[0]);
    setNoteSubjectId('');
    setNoteProjectId('');
    setNoteTagsInput('');
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (note: QuickNote) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteDate(note.date || note.createdAt.split('T')[0]);
    setNoteSubjectId(note.subjectId || '');
    setNoteProjectId(note.projectId || '');
    setNoteTagsInput((note.tags || []).join(', '));
    setIsEditorOpen(true);
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    const tagsArray = noteTagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingNote) {
      updateNote(editingNote.id, {
        title: noteTitle.trim(),
        content: noteContent,
        date: noteDate,
        subjectId: noteSubjectId || undefined,
        projectId: noteProjectId || undefined,
        tags: tagsArray,
      });
    } else {
      addNote({
        title: noteTitle.trim(),
        content: noteContent,
        date: noteDate,
        subjectId: noteSubjectId || undefined,
        projectId: noteProjectId || undefined,
        tags: tagsArray,
        pinned: false,
      });
    }

    setIsEditorOpen(false);
  };

  const handleTogglePin = (note: QuickNote) => {
    updateNote(note.id, { pinned: !note.pinned });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Notes Rapides de Révision
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Prenez des notes immédiates pendant vos cours, séances Pomodoro et lectures
          </p>
        </div>
        <button
          id="create-quick-note-btn"
          onClick={handleOpenNewNote}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle note</span>
        </button>
      </div>

      {/* Search & Tags Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher dans vos notes et synthèses..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedTag('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                selectedTag === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Tous
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  selectedTag === tag
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNotes.length === 0 ? (
          <div className="col-span-full py-12 text-center border border-dashed border-slate-200 rounded-3xl bg-white">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">Aucune note trouvée</p>
            <p className="text-xs text-slate-400 mt-1">Créez votre première note rapide pour vos révisions.</p>
            <button
              onClick={handleOpenNewNote}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
            >
              + Rédiger une note
            </button>
          </div>
        ) : (
          filteredNotes.map((note) => {
            const subject = subjects.find((s) => s.id === note.subjectId);
            const project = projects.find((p) => p.id === note.projectId);

            return (
              <div
                key={note.id}
                className={`p-5 rounded-3xl border transition-all bg-white flex flex-col justify-between ${
                  note.pinned
                    ? 'border-indigo-300 ring-2 ring-indigo-500/10 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-base text-slate-900 line-clamp-1">{note.title}</h3>
                    <button
                      onClick={() => handleTogglePin(note)}
                      className={`p-1 rounded-md transition-colors ${
                        note.pinned ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300 hover:text-slate-600'
                      }`}
                      title={note.pinned ? 'Détacher' : 'Épingler en haut'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="mt-2.5 text-xs text-slate-600 whitespace-pre-line line-clamp-5 leading-relaxed font-normal">
                    {note.content}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    {subject && (
                      <span
                        className="px-2 py-0.5 rounded-md font-medium"
                        style={{ backgroundColor: `${subject.color}15`, color: subject.color }}
                      >
                        {subject.name}
                      </span>
                    )}
                    {project && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-medium">
                        📁 {project.name.slice(0, 15)}...
                      </span>
                    )}
                    {note.tags?.map((t) => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                        #{t}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{new Date(note.updatedAt || note.createdAt).toLocaleDateString('fr-FR')}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(note)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                        title="Modifier"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleSaveNote}
            className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-4 animate-in fade-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingNote ? 'Modifier la Note' : 'Nouvelle Note Rapide'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Titre de la note</label>
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="Ex: Théorème de Gauss & Rappels de cours"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Date au calendrier</label>
              <input
                type="date"
                value={noteDate}
                onChange={(e) => setNoteDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Matière liée</label>
                <select
                  value={noteSubjectId}
                  onChange={(e) => setNoteSubjectId(e.target.value)}
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

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Projet lié</label>
                <select
                  value={noteProjectId}
                  onChange={(e) => setNoteProjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-300"
                >
                  <option value="">Aucun</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Contenu / Points clés</label>
              <textarea
                rows={6}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Notez vos formules, idées ou résumés de révision..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tags (séparés par des virgules)</label>
              <input
                type="text"
                value={noteTagsInput}
                onChange={(e) => setNoteTagsInput(e.target.value)}
                placeholder="Ex: Examen, Formules, Révision"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
              >
                Enregistrer la note
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
