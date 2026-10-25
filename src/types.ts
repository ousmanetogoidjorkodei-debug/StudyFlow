export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type ChapterStatus = 'to_study' | 'in_progress' | 'reviewed' | 'mastered';

export interface Chapter {
  id: string;
  title: string;
  status: ChapterStatus;
  notes?: string;
  exercisesTotal: number;
  exercisesCompleted: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  color: string;
  iconName: string;
  examDate?: string;
  targetHoursPerWeek: number;
  chapters: Chapter[];
  resourcesCount?: number;
}

export interface ProjectTask {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  dueDate?: string;
  estimatedHours?: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  deadline: string;
  priority: Priority;
  category: string;
  tasks: ProjectTask[];
  status: 'active' | 'completed' | 'paused';
  createdAt: string;
}

export interface DailyTask {
  id: string;
  title: string;
  completed: boolean;
  priority: Priority;
  category: 'study' | 'project' | 'personal' | 'revision';
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  estimatedMinutes: number;
  actualMinutes?: number;
  subjectId?: string;
  projectId?: string;
}

export interface StudySession {
  id: string;
  title: string;
  subjectId?: string;
  projectId?: string;
  date: string; // ISO or YYYY-MM-DD
  durationMinutes: number;
  type: 'pomodoro' | 'deep_work' | 'revision' | 'exercise';
  notes?: string;
}

export interface Goal {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: 'hours' | 'chapters' | 'tasks' | 'sessions';
  period: 'daily' | 'weekly' | 'monthly';
  deadline?: string;
  completed: boolean;
  subjectId?: string;
}

export interface QuickNote {
  id: string;
  title: string;
  content: string;
  subjectId?: string;
  projectId?: string;
  date?: string; // YYYY-MM-DD associated calendar date
  createdAt: string;
  updatedAt: string;
  tags: string[];
  pinned?: boolean;
}

export interface SmartReminder {
  id: string;
  type: 'exam_upcoming' | 'deadline_near' | 'delayed_task' | 'daily_goal' | 'ai_insight';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'urgent';
  timestamp: string;
  isRead: boolean;
  linkTab?: 'dashboard' | 'calendar' | 'subjects' | 'projects' | 'pomodoro' | 'ai';
}

export type PomodoroMode = 'work' | 'short_break' | 'long_break';

export interface GlobalPomodoro {
  mode: PomodoroMode;
  timeLeft: number;
  isRunning: boolean;
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  completedCycles: number;
  soundEnabled: boolean;
  selectedSubjectId: string;
  selectedProjectId: string;
  sessionNotes: string;
  formattedTime: string;
  progressPercent: number;
  elapsedSeconds: number;
  togglePlay: () => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  skip: () => void;
  finishEarly: () => void;
  setMode: (mode: PomodoroMode) => void;
  setWorkMinutes: (minutes: number) => void;
  setShortBreakMinutes: (minutes: number) => void;
  setLongBreakMinutes: (minutes: number) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setSelectedSubjectId: (id: string) => void;
  setSelectedProjectId: (id: string) => void;
  setSessionNotes: (notes: string) => void;
}

export interface PomodoroSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number;
  soundEnabled: boolean;
  autoStartBreaks: boolean;
}

export interface UserProfile {
  name: string;
  role: 'Étudiant' | 'Freelance' | 'Professionnel';
  domain: string;
  avatar: string;
  dailyGoalHours: number;
  weeklyGoalHours: number;
  tier: 'free' | 'pro';
  streakDays: number;
  email?: string;
  // Champs de facturation gérés exclusivement par le serveur / Paddle Webhook
  subscriptionStatus?: string;
  billingProvider?: 'paddle' | 'stripe' | null;
  billingCustomerId?: string;
  billingSubscriptionId?: string;
  billingPriceId?: string;
  billingCurrentPeriodEnd?: string;
  // Champs historiques Stripe conservés pour compatibilité ascendante
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  stripeCurrentPeriodEnd?: string;
}
