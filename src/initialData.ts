import { Subject, Project, DailyTask, Goal, QuickNote, SmartReminder, UserProfile, StudySession } from './types';

export const INITIAL_USER: UserProfile = {
  name: 'Alexandre Dupont',
  role: 'Étudiant',
  domain: 'Ingénierie & Informatique',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
  dailyGoalHours: 3,
  weeklyGoalHours: 18,
  tier: 'free',
  streakDays: 0,
};

export const INITIAL_SUBJECTS: Subject[] = [
  {
    id: 'subj-math',
    name: 'Mathématiques',
    code: 'MATH-201',
    color: '#3b82f6', // blue
    iconName: 'Calculator',
    examDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // in 3 days!
    targetHoursPerWeek: 6,
    resourcesCount: 14,
    chapters: [
      {
        id: 'c-math-1',
        title: 'Algèbre linéaire et matrices',
        status: 'mastered',
        exercisesTotal: 20,
        exercisesCompleted: 20,
        notes: 'Diagonalisation, valeurs propres et vecteurs propres bien assimilés.',
      },
      {
        id: 'c-math-2',
        title: 'Calcul différentiel et équations différentielles',
        status: 'reviewed',
        exercisesTotal: 25,
        exercisesCompleted: 18,
        notes: 'Revoir les équations d’ordre 2 à coefficients constants.',
      },
      {
        id: 'c-math-3',
        title: 'Intégrales multiples et coordonnées polaires',
        status: 'in_progress',
        exercisesTotal: 15,
        exercisesCompleted: 7,
        notes: 'Attention aux changements de variables jacobiens.',
      },
      {
        id: 'c-math-4',
        title: 'Probabilités discrètes et continues',
        status: 'to_study',
        exercisesTotal: 18,
        exercisesCompleted: 2,
        notes: 'Formule de Bayes et lois normales à approfondir.',
      },
    ],
  },
  {
    id: 'subj-info',
    name: 'Informatique',
    code: 'INFO-302',
    color: '#10b981', // emerald
    iconName: 'Code2',
    examDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    targetHoursPerWeek: 8,
    resourcesCount: 22,
    chapters: [
      {
        id: 'c-info-1',
        title: 'Structures de données avancées (Arbres & Graphes)',
        status: 'mastered',
        exercisesTotal: 12,
        exercisesCompleted: 12,
        notes: 'Implémentation des parcours BFS et DFS en C++ et Python.',
      },
      {
        id: 'c-info-2',
        title: 'Algorithmes de tri et complexité temporelle',
        status: 'reviewed',
        exercisesTotal: 16,
        exercisesCompleted: 14,
        notes: 'Notion de grand O, cas moyen vs pire des cas (Quicksort).',
      },
      {
        id: 'c-info-3',
        title: 'Bases de données relationnelles et SQL avancé',
        status: 'in_progress',
        exercisesTotal: 20,
        exercisesCompleted: 11,
        notes: 'Jointures externes, indexation et transactions ACID.',
      },
      {
        id: 'c-info-4',
        title: 'Architecture Web & API RESTful',
        status: 'in_progress',
        exercisesTotal: 10,
        exercisesCompleted: 5,
        notes: 'Conception de routes et validation des requêtes HTTP.',
      },
    ],
  },
  {
    id: 'subj-phys',
    name: 'Physique',
    code: 'PHYS-104',
    color: '#f59e0b', // amber
    iconName: 'Atom',
    examDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    targetHoursPerWeek: 5,
    resourcesCount: 8,
    chapters: [
      {
        id: 'c-phys-1',
        title: 'Mécanique du point et lois de Newton',
        status: 'mastered',
        exercisesTotal: 15,
        exercisesCompleted: 15,
        notes: 'Oscillateurs harmoniques et amortissement fluide.',
      },
      {
        id: 'c-phys-2',
        title: 'Électromagnétisme & Lois de Maxwell',
        status: 'in_progress',
        exercisesTotal: 22,
        exercisesCompleted: 9,
        notes: 'Théorème de Gauss et force de Lorentz.',
      },
      {
        id: 'c-phys-3',
        title: 'Thermodynamique des systèmes ouverts',
        status: 'to_study',
        exercisesTotal: 14,
        exercisesCompleted: 0,
        notes: 'Cycles de Carnot, entropie et premier principe.',
      },
    ],
  },
];

const todayStr = new Date().toISOString().split('T')[0];
const tomorrowStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const inTwoDaysStr = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Application Mobile de Gestion de Budget',
    description: 'Projet de fin de semestre : conception UI, API backend Express et persistance SQLite.',
    deadline: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: 'high',
    category: 'Développement',
    status: 'active',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    tasks: [
      { id: 'pt-1', title: 'Maquettes Figma des écrans principaux', completed: true, priority: 'medium', estimatedHours: 4 },
      { id: 'pt-2', title: 'Schéma de base de données relationnelle', completed: true, priority: 'high', estimatedHours: 3 },
      { id: 'pt-3', title: 'Implémenter l’authentification et JWT', completed: true, priority: 'urgent', estimatedHours: 5 },
      { id: 'pt-4', title: 'Connecter les graphiques de dépenses', completed: false, priority: 'high', dueDate: tomorrowStr, estimatedHours: 4 },
      { id: 'pt-5', title: 'Rédiger le rapport technique de 15 pages', completed: false, priority: 'urgent', dueDate: inTwoDaysStr, estimatedHours: 6 },
    ],
  },
  {
    id: 'proj-2',
    name: 'Dossier d’Analyse Statistique & Dataviz',
    description: 'Étude prédictive sur un jeu de données climatiques avec régression linéaire et clustering.',
    deadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: 'medium',
    category: 'Data Science',
    status: 'active',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    tasks: [
      { id: 'pt-201', title: 'Nettoyage des données manquantes (Pandas)', completed: true, priority: 'medium', estimatedHours: 2 },
      { id: 'pt-202', title: 'Analyse exploratoire et distributions', completed: true, priority: 'low', estimatedHours: 3 },
      { id: 'pt-203', title: 'Entraînement des modèles et validation croisée', completed: false, priority: 'high', estimatedHours: 5 },
      { id: 'pt-204', title: 'Export des visualisations haute définition', completed: false, priority: 'low', estimatedHours: 2 },
    ],
  },
  {
    id: 'proj-3',
    name: 'Refonte Portfolio Freelance',
    description: 'Site vitrine moderne pour présenter mes réalisations et attirer des clients en freelance.',
    deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: 'low',
    category: 'Personnel',
    status: 'active',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    tasks: [
      { id: 'pt-301', title: 'Sélectionner 4 études de cas représentatives', completed: true, priority: 'low', estimatedHours: 3 },
      { id: 'pt-302', title: 'Optimiser le référencement naturel (SEO)', completed: false, priority: 'medium', estimatedHours: 3 },
      { id: 'pt-303', title: 'Ajouter formulaire de contact avec notifications', completed: false, priority: 'medium', estimatedHours: 2 },
    ],
  },
];

export const INITIAL_TASKS: DailyTask[] = [
  {
    id: 'task-1',
    title: 'Réviser les intégrales multiples (Chapitre 3)',
    completed: false,
    priority: 'urgent',
    category: 'study',
    dueDate: todayStr,
    dueTime: '10:00',
    estimatedMinutes: 60,
    subjectId: 'subj-math',
  },
  {
    id: 'task-2',
    title: 'Finaliser les graphiques de dépenses du projet mobile',
    completed: false,
    priority: 'high',
    category: 'project',
    dueDate: todayStr,
    dueTime: '14:30',
    estimatedMinutes: 90,
    projectId: 'proj-1',
  },
  {
    id: 'task-3',
    title: 'Faire 5 exercices d’électromagnétisme (Maxwell)',
    completed: true,
    priority: 'medium',
    category: 'study',
    dueDate: todayStr,
    dueTime: '16:45',
    estimatedMinutes: 50,
    actualMinutes: 55,
    subjectId: 'subj-phys',
  },
  {
    id: 'task-4',
    title: 'Lire le cours sur les index SQL et requêtes EXPLAIN',
    completed: false,
    priority: 'medium',
    category: 'study',
    dueDate: todayStr,
    dueTime: '18:00',
    estimatedMinutes: 45,
    subjectId: 'subj-info',
  },
  {
    id: 'task-5',
    title: 'Préparer fiche de synthèse pour l’examen de Maths',
    completed: false,
    priority: 'urgent',
    category: 'revision',
    dueDate: tomorrowStr,
    estimatedMinutes: 75,
    subjectId: 'subj-math',
  },
];

export const INITIAL_GOALS: Goal[] = [
  {
    id: 'goal-1',
    title: 'Étudier 3 heures par jour',
    targetValue: 3,
    currentValue: 0,
    unit: 'hours',
    period: 'daily',
    completed: false,
  },
  {
    id: 'goal-2',
    title: 'Lire et valider 2 chapitres cette semaine',
    targetValue: 2,
    currentValue: 0,
    unit: 'chapters',
    period: 'weekly',
    completed: false,
  },
  {
    id: 'goal-3',
    title: 'Finir le projet Mobile avant vendredi',
    targetValue: 5,
    currentValue: 0,
    unit: 'tasks',
    period: 'weekly',
    deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    completed: false,
  },
  {
    id: 'goal-4',
    title: 'Atteindre 15 sessions Pomodoro cette semaine',
    targetValue: 15,
    currentValue: 0,
    unit: 'sessions',
    period: 'weekly',
    completed: false,
  },
];

export const INITIAL_SESSIONS: StudySession[] = [];

export const INITIAL_NOTES: QuickNote[] = [
  {
    id: 'note-1',
    title: 'Formules clés pour l’examen de Mathématiques',
    content: `## Points cruciaux Algèbre & Analyse :
- **Théorème spectral** : Toute matrice symétrique réelle est diagonalisable dans une base orthonormée.
- **Jacobien en polaires** : $dx dy = r \\, dr \\, d\\theta$.
- **Équation diff. du 2nd ordre** : $ay'' + by' + cy = 0$ -> équation caractéristique $ar^2 + br + c = 0$.
- Rappel : Bien vérifier le signe du discriminant $\\Delta$ avant de poser les solutions complexes !`,
    subjectId: 'subj-math',
    date: todayStr,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['Examen', 'Formulaire', 'Maths'],
    pinned: true,
  },
  {
    id: 'note-2',
    title: 'Mémo Commandes Git & Déploiement Cloud',
    content: `### Commandes indispensables pour le projet :
- \`git checkout -b feature/auth\`
- \`git commit -m "feat(auth): ajout middleware JWT"\`
- Tester la route protégée avec Postman et le Bearer Token
- Penser à indexer les colonnes \`user_id\` et \`created_at\` dans la table SQL.`,
    subjectId: 'subj-info',
    projectId: 'proj-1',
    date: tomorrowStr,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['Projet', 'Git', 'Backend'],
    pinned: false,
  },
  {
    id: 'note-3',
    title: 'Idées pour optimiser mes séances Pomodoro',
    content: `1. Éloigner le smartphone dans une autre pièce pendant les 25 minutes de focus.
2. Toujours préparer la feuille d'exercices AVANT de lancer le chronomètre.
3. Pendant les 5 minutes de pause : s'étirer, boire un grand verre d'eau, regarder au loin par la fenêtre.`,
    date: inTwoDaysStr,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['Productivité', 'Habitudes'],
    pinned: false,
  },
];

export const INITIAL_REMINDERS: SmartReminder[] = [
  {
    id: 'rem-1',
    type: 'exam_upcoming',
    title: 'Examen de Mathématiques imminent',
    message: 'Votre examen final est dans exactement 3 jours ! 2 chapitres restent à réviser.',
    severity: 'urgent',
    timestamp: new Date().toISOString(),
    isRead: false,
    linkTab: 'subjects',
  },
  {
    id: 'rem-2',
    type: 'delayed_task',
    title: 'Tâches prioritaires du jour',
    message: 'Il vous reste 2 tâches importantes à finaliser avant ce soir (18h00).',
    severity: 'warning',
    timestamp: new Date().toISOString(),
    isRead: false,
    linkTab: 'dashboard',
  },
  {
    id: 'rem-3',
    type: 'deadline_near',
    title: 'Jalon de projet proche',
    message: 'Rapport technique du projet Mobile attendu dans 48 heures.',
    severity: 'info',
    timestamp: new Date().toISOString(),
    isRead: false,
    linkTab: 'projects',
  },
  {
    id: 'rem-4',
    type: 'daily_goal',
    title: 'Objectif quotidien de concentration',
    message: 'Lancez un Pomodoro de 25 minutes pour progresser vers votre objectif d’étude quotidien !',
    severity: 'info',
    timestamp: new Date().toISOString(),
    isRead: false,
    linkTab: 'pomodoro',
  },
];
