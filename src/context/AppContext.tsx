import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Subject,
  Project,
  DailyTask,
  Goal,
  QuickNote,
  SmartReminder,
  UserProfile,
  StudySession,
  GlobalPomodoro,
} from '../types';
import { usePomodoroState, POMODORO_STORAGE_KEY } from './usePomodoroState';
import {
  INITIAL_USER,
  INITIAL_SUBJECTS,
  INITIAL_PROJECTS,
  INITIAL_TASKS,
  INITIAL_GOALS,
  INITIAL_SESSIONS,
  INITIAL_NOTES,
  INITIAL_REMINDERS,
} from '../initialData';
import { useAuth } from './AuthContext';
import {
  setUserProfile,
  subscribeToUserProfile,
  setSubject,
  updateSubject as updateSubjectFirestore,
  deleteSubject as deleteSubjectFirestore,
  subscribeToSubjects,
  setProject,
  updateProject as updateProjectFirestore,
  deleteProject as deleteProjectFirestore,
  subscribeToProjects,
  setTask,
  updateTask as updateTaskFirestore,
  deleteTask as deleteTaskFirestore,
  subscribeToTasks,
  setGoal,
  updateGoal as updateGoalFirestore,
  deleteGoal as deleteGoalFirestore,
  subscribeToGoals,
  setNote,
  updateNote as updateNoteFirestore,
  deleteNote as deleteNoteFirestore,
  subscribeToNotes,
  setReminder,
  updateReminder as updateReminderFirestore,
  deleteReminder as deleteReminderFirestore,
  subscribeToReminders,
  setSession,
  deleteSession as deleteSessionFirestore,
  subscribeToSessions,
  checkUserHasFirestoreData,
  batchSaveInitialUserData,
  resetUserFirestoreData,
} from '../services/firestoreService';
import { filterRealSessions, calculateStudyStreak } from '../utils/studyStats';

export type ActiveTab =
  | 'dashboard'
  | 'calendar'
  | 'subjects'
  | 'projects'
  | 'pomodoro'
  | 'stats'
  | 'notes'
  | 'ai'
  | 'profile';

export type CloudSyncStatus = 'guest' | 'loading' | 'syncing' | 'ready' | 'error';

interface AppContextType {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  subjects: Subject[];
  addSubject: (subject: Omit<Subject, 'id'>) => Subject;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  projects: Project[];
  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  toggleProjectTask: (projectId: string, taskId: string) => void;
  tasks: DailyTask[];
  addTask: (task: Omit<DailyTask, 'id'>) => DailyTask;
  updateTask: (id: string, updates: Partial<DailyTask>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  goals: Goal[];
  addGoal: (goal: Omit<Goal, 'id'>) => Goal;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  sessions: StudySession[];
  addSession: (session: Omit<StudySession, 'id'>) => StudySession;
  deleteSession: (id: string) => void;
  notes: QuickNote[];
  addNote: (note: Omit<QuickNote, 'id' | 'createdAt' | 'updatedAt'>) => QuickNote;
  updateNote: (id: string, updates: Partial<QuickNote>) => void;
  deleteNote: (id: string) => void;
  reminders: SmartReminder[];
  markReminderAsRead: (id: string) => void;
  dismissReminder: (id: string) => void;
  addReminder: (reminder: Omit<SmartReminder, 'id' | 'timestamp' | 'isRead'>) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isQuickAddOpen: boolean;
  setIsQuickAddOpen: (open: boolean) => void;
  quickAddModalOpen: boolean;
  quickAddDefaultType: 'task' | 'project' | 'subject' | 'note' | 'goal';
  quickAddType: 'task' | 'project' | 'subject' | 'note' | 'goal';
  quickAddTargetDate?: string;
  setQuickAddTargetDate: (date?: string) => void;
  openQuickAdd: (type?: 'task' | 'project' | 'subject' | 'note' | 'goal', targetDate?: string) => void;
  closeQuickAdd: () => void;
  selectedSubjectId: string | null;
  setSelectedSubjectId: (id: string | null) => void;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  resetData: () => void;
  exportDataJson: () => string;
  importDataJson: (jsonString: string) => boolean;
  cloudStatus: CloudSyncStatus;
  pomodoro: GlobalPomodoro;
  startPaddleCheckout: () => Promise<void>;
  startStripeCheckout: () => Promise<void>;
  isCheckoutLoading: boolean;
  checkoutError: string | null;
  clearCheckoutError: () => void;
  billingBannerMessage: { type: 'info' | 'success' | 'error'; text: string } | null;
  dismissBillingBanner: () => void;
  stripeBannerMessage: { type: 'info' | 'success' | 'error'; text: string } | null;
  dismissStripeBanner: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const GUEST_STORAGE_PREFIX = 'studyflow_guest';
const LEGACY_STORAGE_PREFIX = 'studyflow_data_v1';

/**
 * Génère une clé de stockage local isolée par utilisateur authentifié ou pour le mode invité.
 */
function getUserStorageKey(uid: string | null | undefined, entity: string): string {
  if (uid) {
    return `studyflow_${uid}_${entity}`;
  }
  return `${GUEST_STORAGE_PREFIX}_${entity}`;
}

/**
 * Charge les données depuis le cache local spécifique à l'utilisateur.
 */
function loadLocalData<T>(uid: string | null | undefined, entity: string, fallback: T): T {
  try {
    const key = getUserStorageKey(uid, entity);
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
    // Mode invité uniquement : compatibilité ascendante avec l'ancien stockage global initial
    if (!uid) {
      const legacySaved = localStorage.getItem(`${LEGACY_STORAGE_PREFIX}_${entity}`);
      if (legacySaved) {
        return JSON.parse(legacySaved);
      }
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Sauvegarde les données dans le cache local propre à cet utilisateur.
 */
function saveLocalData(uid: string | null | undefined, entity: string, data: any): void {
  try {
    const key = getUserStorageKey(uid, entity);
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`[LocalStorage] Erreur écriture ${entity}:`, e);
  }
}

/**
 * Supprime le cache local d'un utilisateur spécifique (ou de l'invité).
 */
function removeLocalUserData(uid: string | null | undefined): void {
  const entities = ['user', 'subjects', 'projects', 'tasks', 'goals', 'sessions', 'notes', 'reminders'];
  try {
    entities.forEach((entity) => {
      localStorage.removeItem(getUserStorageKey(uid, entity));
    });
    if (!uid) {
      entities.forEach((entity) => {
        localStorage.removeItem(`${LEGACY_STORAGE_PREFIX}_${entity}`);
      });
    }
  } catch {}
}

/**
 * Crée un profil utilisateur propre et vierge pour un nouveau compte Firebase.
 */
function getCleanUserProfile(currentUser: {
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}): UserProfile {
  return {
    name: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Nouvel Étudiant'),
    email: currentUser.email || '',
    role: 'Étudiant',
    domain: '',
    avatar: currentUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    dailyGoalHours: 3,
    weeklyGoalHours: 18,
    tier: 'free',
    streakDays: 0,
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, openAuthModal } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickAddDefaultType, setQuickAddDefaultType] = useState<'task' | 'project' | 'subject' | 'note' | 'goal'>('task');
  const [quickAddTargetDate, setQuickAddTargetDate] = useState<string | undefined>(undefined);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [cloudStatus, setCloudStatus] = useState<CloudSyncStatus>('guest');

  // États Paddle Checkout & synchronisation de facturation
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [billingBannerMessage, setBillingBannerMessage] = useState<{
    type: 'info' | 'success' | 'error';
    text: string;
  } | null>(null);

  const clearCheckoutError = () => setCheckoutError(null);
  const dismissBillingBanner = () => setBillingBannerMessage(null);
  // Alias de rétrocompatibilité
  const stripeBannerMessage = billingBannerMessage;
  const dismissStripeBanner = dismissBillingBanner;

  // Références de synchronisation pour éviter les fuites mémoire et les courses d'état
  const activeUidRef = useRef<string | null>(null);
  const unsubscribersRef = useRef<(() => void)[]>([]);

  // Initialisation : charge les données de l'invité par défaut au montage initial
  const [user, setUser] = useState<UserProfile>(() =>
    loadLocalData<UserProfile>(currentUser?.uid, 'user', INITIAL_USER)
  );

  const [subjects, setSubjects] = useState<Subject[]>(() =>
    loadLocalData<Subject[]>(currentUser?.uid, 'subjects', INITIAL_SUBJECTS)
  );

  const [projects, setProjects] = useState<Project[]>(() =>
    loadLocalData<Project[]>(currentUser?.uid, 'projects', INITIAL_PROJECTS)
  );

  const [tasks, setTasks] = useState<DailyTask[]>(() =>
    loadLocalData<DailyTask[]>(currentUser?.uid, 'tasks', INITIAL_TASKS)
  );

  const [goals, setGoals] = useState<Goal[]>(() =>
    loadLocalData<Goal[]>(currentUser?.uid, 'goals', INITIAL_GOALS)
  );

  const [sessions, setSessions] = useState<StudySession[]>(() =>
    filterRealSessions(loadLocalData<StudySession[]>(currentUser?.uid, 'sessions', INITIAL_SESSIONS))
  );

  const [notes, setNotes] = useState<QuickNote[]>(() =>
    loadLocalData<QuickNote[]>(currentUser?.uid, 'notes', INITIAL_NOTES)
  );

  const [reminders, setReminders] = useState<SmartReminder[]>(() =>
    loadLocalData<SmartReminder[]>(currentUser?.uid, 'reminders', INITIAL_REMINDERS)
  );

  // Maintien du cache LocalStorage isolé par utilisateur (ou mode invité)
  useEffect(() => {
    const currentUid = currentUser?.uid || null;
    // Protection absolue : n'écrit que si le state React correspond bien à l'utilisateur actuellement actif
    if (activeUidRef.current !== currentUid) {
      return;
    }

    saveLocalData(currentUid, 'user', user);
    saveLocalData(currentUid, 'subjects', subjects);
    saveLocalData(currentUid, 'projects', projects);
    saveLocalData(currentUid, 'tasks', tasks);
    saveLocalData(currentUid, 'goals', goals);
    saveLocalData(currentUid, 'sessions', sessions);
    saveLocalData(currentUid, 'notes', notes);
    saveLocalData(currentUid, 'reminders', reminders);
  }, [currentUser, user, subjects, projects, tasks, goals, sessions, notes, reminders]);

  // ==========================================================================
  // SYNCHRONISATION FIRESTORE TEMPS RÉEL & GESTION DES NOUVEAUX COMPTES
  // ==========================================================================
  useEffect(() => {
    // Cas 1 : Utilisateur invité (non connecté ou suite à un logout)
    if (!currentUser) {
      // 1. Nettoyage impératif de tous les écouteurs de l'ancien utilisateur
      unsubscribersRef.current.forEach((unsub) => {
        try { unsub(); } catch {}
      });
      unsubscribersRef.current = [];

      // 2. Bascule du contexte vers l'espace Invité
      activeUidRef.current = null;
      setCloudStatus('guest');

      // 3. Réinitialisation / Chargement de l'espace invité propre (sans résidu de compte connecté)
      setUser(loadLocalData<UserProfile>(null, 'user', INITIAL_USER));
      setSubjects(loadLocalData<Subject[]>(null, 'subjects', INITIAL_SUBJECTS));
      setProjects(loadLocalData<Project[]>(null, 'projects', INITIAL_PROJECTS));
      setTasks(loadLocalData<DailyTask[]>(null, 'tasks', INITIAL_TASKS));
      setGoals(loadLocalData<Goal[]>(null, 'goals', INITIAL_GOALS));
      setSessions(filterRealSessions(loadLocalData<StudySession[]>(null, 'sessions', INITIAL_SESSIONS)));
      setNotes(loadLocalData<QuickNote[]>(null, 'notes', INITIAL_NOTES));
      setReminders(loadLocalData<SmartReminder[]>(null, 'reminders', INITIAL_REMINDERS));
      return;
    }

    // Cas 2 : Utilisateur connecté (currentUser avec uid)
    const uid = currentUser.uid;
    activeUidRef.current = uid;
    setCloudStatus('loading');

    // Charger immédiatement le cache local propre à cet utilisateur s'il existe déjà
    // Sinon, initialiser un espace vierge pour ce compte (aucun héritage du mode invité ou d'un autre utilisateur)
    const hasLocalUserCache = localStorage.getItem(getUserStorageKey(uid, 'user')) !== null;
    if (hasLocalUserCache) {
      setUser(loadLocalData<UserProfile>(uid, 'user', getCleanUserProfile(currentUser)));
      setSubjects(loadLocalData<Subject[]>(uid, 'subjects', []));
      setProjects(loadLocalData<Project[]>(uid, 'projects', []));
      setTasks(loadLocalData<DailyTask[]>(uid, 'tasks', []));
      setGoals(loadLocalData<Goal[]>(uid, 'goals', []));
      setSessions(loadLocalData<StudySession[]>(uid, 'sessions', []));
      setNotes(loadLocalData<QuickNote[]>(uid, 'notes', []));
      setReminders(loadLocalData<SmartReminder[]>(uid, 'reminders', []));
    } else {
      // Aucun cache pour cet utilisateur : espace vierge immédiat
      const cleanProfile = getCleanUserProfile(currentUser);
      setUser(cleanProfile);
      setSubjects([]);
      setProjects([]);
      setTasks([]);
      setGoals([]);
      setSessions([]);
      setNotes([]);
      setReminders([]);
    }

    let isSubscribed = true;

    async function initializeCloudSync() {
      try {
        // Vérification de présence de données existantes dans Firestore pour cet utilisateur
        const hasExistingCloudData = await checkUserHasFirestoreData(uid);

        if (!isSubscribed || activeUidRef.current !== uid) return;

        if (!hasExistingCloudData) {
          // NOUVEAU COMPTE FIREBASE :
          // Doit commencer avec un profil vierge et des collections entièrement VIDES.
          // Les données de démonstration (initialData.ts) NE sont PAS copiées.
          setCloudStatus('syncing');
          const cleanProfile = getCleanUserProfile(currentUser);

          await batchSaveInitialUserData(uid, {
            user: cleanProfile,
            subjects: [],
            projects: [],
            tasks: [],
            goals: [],
            sessions: [],
            notes: [],
            reminders: [],
          });

          if (!isSubscribed || activeUidRef.current !== uid) return;

          setUser(cleanProfile);
          setSubjects([]);
          setProjects([]);
          setTasks([]);
          setGoals([]);
          setSessions([]);
          setNotes([]);
          setReminders([]);
        }

        if (!isSubscribed || activeUidRef.current !== uid) return;

        // Nettoyage préalable de tout ancien écouteur
        unsubscribersRef.current.forEach((unsub) => {
          try { unsub(); } catch {}
        });
        unsubscribersRef.current = [];

        // Mise en place des écouteurs temps réel onSnapshot pour les 8 entités
        const unsubProfile = subscribeToUserProfile(
          uid,
          (remoteProfile) => {
            if (!remoteProfile || activeUidRef.current !== uid) return;
            setUser((prev) => ({
              ...prev,
              ...remoteProfile,
              name: remoteProfile.name || currentUser.displayName || prev.name,
              email: currentUser.email || remoteProfile.email || prev.email,
            }));
          },
          (err) => console.warn('[Firestore] Avertissement profil :', err.message)
        );

        const unsubSubjects = subscribeToSubjects(
          uid,
          (remoteSubjects) => {
            if (activeUidRef.current !== uid) return;
            setSubjects(remoteSubjects);
          },
          (err) => console.warn('[Firestore] Avertissement matières :', err.message)
        );

        const unsubProjects = subscribeToProjects(
          uid,
          (remoteProjects) => {
            if (activeUidRef.current !== uid) return;
            setProjects(remoteProjects);
          },
          (err) => console.warn('[Firestore] Avertissement projets :', err.message)
        );

        const unsubTasks = subscribeToTasks(
          uid,
          (remoteTasks) => {
            if (activeUidRef.current !== uid) return;
            setTasks(remoteTasks);
          },
          (err) => console.warn('[Firestore] Avertissement tâches :', err.message)
        );

        const unsubGoals = subscribeToGoals(
          uid,
          (remoteGoals) => {
            if (activeUidRef.current !== uid) return;
            setGoals(remoteGoals);
          },
          (err) => console.warn('[Firestore] Avertissement objectifs :', err.message)
        );

        const unsubSessions = subscribeToSessions(
          uid,
          (remoteSessions) => {
            if (activeUidRef.current !== uid) return;
            setSessions(remoteSessions);
          },
          (err) => console.warn('[Firestore] Avertissement sessions :', err.message)
        );

        const unsubNotes = subscribeToNotes(
          uid,
          (remoteNotes) => {
            if (activeUidRef.current !== uid) return;
            setNotes(remoteNotes);
          },
          (err) => console.warn('[Firestore] Avertissement notes :', err.message)
        );

        const unsubReminders = subscribeToReminders(
          uid,
          (remoteReminders) => {
            if (activeUidRef.current !== uid) return;
            setReminders(remoteReminders);
          },
          (err) => console.warn('[Firestore] Avertissement rappels :', err.message)
        );

        unsubscribersRef.current = [
          unsubProfile,
          unsubSubjects,
          unsubProjects,
          unsubTasks,
          unsubGoals,
          unsubSessions,
          unsubNotes,
          unsubReminders,
        ];

        if (isSubscribed) {
          setCloudStatus('ready');
        }
      } catch (error) {
        console.warn('[Sync] Connexion Firestore indisponible (maintien du cache local) :', error);
        if (isSubscribed) {
          setCloudStatus('error');
        }
      }
    }

    initializeCloudSync();

    return () => {
      isSubscribed = false;
      unsubscribersRef.current.forEach((unsub) => {
        try { unsub(); } catch {}
      });
      unsubscribersRef.current = [];
    };
  }, [currentUser]);

  // ==========================================================================
  // ACTIONS MÉTIER TYPÉES AVEC SYNCHRONISATION ATOMIQUE FIRESTORE
  // ==========================================================================

  // Profil
  const updateUserProfileState: React.Dispatch<React.SetStateAction<UserProfile>> = (value) => {
    setUser((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      // Protection stricte : l'utilisateur ne peut pas modifier son tier vers pro côté client
      const safeNext: UserProfile = {
        ...next,
        tier: currentUser ? prev.tier : (next.tier === 'pro' ? 'free' : next.tier),
      };
      if (currentUser?.uid) {
        setUserProfile(currentUser.uid, safeNext).catch((e) =>
          console.warn('[Firestore] Erreur sauvegarde profil :', e)
        );
      }
      return safeNext;
    });
  };

  // ==========================================================================
  // INTÉGRATION PADDLE CHECKOUT & ÉCOUTE DE RETOUR DE PAIEMENT
  // ==========================================================================

  const startPaddleCheckout = async () => {
    setCheckoutError(null);
    if (!currentUser) {
      openAuthModal('login');
      return;
    }

    if (user.tier === 'pro') {
      return;
    }

    setIsCheckoutLoading(true);
    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/api/paddle/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.isAlreadyPro) {
          setUser((prev) => ({ ...prev, tier: 'pro', subscriptionStatus: 'active' }));
          return;
        }
        throw new Error(data.error || 'Impossible d’initialiser le paiement Paddle.');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de paiement introuvable.');
      }
    } catch (err: any) {
      console.error('[Paddle Checkout] Erreur :', err);
      setCheckoutError(err.message || 'Une erreur est survenue lors de l’ouverture de Paddle Checkout.');
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  // Alias pour rétrocompatibilité
  const startStripeCheckout = startPaddleCheckout;

  // Écoute des paramètres de retour Paddle (?paddle_checkout=success / cancel ou ?checkout=success)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get('paddle_checkout') || params.get('checkout') || params.get('stripe_checkout');

    if (!checkoutStatus) return;

    if (checkoutStatus === 'cancel') {
      setBillingBannerMessage({
        type: 'info',
        text: 'Souscription à Studyflow Pro annulée. Aucun prélèvement n’a été effectué.',
      });
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (checkoutStatus === 'success') {
      setBillingBannerMessage({
        type: 'info',
        text: 'Paiement reçu ! Synchronisation de votre statut Pro en cours...',
      });
      window.history.replaceState({}, document.title, window.location.pathname);

      // Polling de confirmation auprès du serveur pour vérifier le webhook Paddle
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        if (attempts > 8) {
          clearInterval(pollInterval);
          return;
        }

        if (currentUser) {
          try {
            const idToken = await currentUser.getIdToken();
            const res = await fetch('/api/paddle/subscription-status', {
              headers: { Authorization: `Bearer ${idToken}` },
            });
            if (res.ok) {
              const data = await res.json();
              if (data.tier === 'pro') {
                clearInterval(pollInterval);
                setUser((prev) => ({
                  ...prev,
                  tier: 'pro',
                  subscriptionStatus: 'active',
                  billingProvider: 'paddle',
                }));
                setBillingBannerMessage({
                  type: 'success',
                  text: 'Félicitations ! Votre abonnement Studyflow Pro (9,99 €/mois) est désormais actif.',
                });
                try {
                  confetti({
                    particleCount: 80,
                    spread: 70,
                    origin: { y: 0.6 },
                  });
                } catch {}
              }
            }
          } catch (err) {
            console.warn('[Paddle Poll] Erreur polling :', err);
          }
        }
      }, 2000);

      return () => clearInterval(pollInterval);
    }
  }, [currentUser]);

  // Matières
  const addSubject = (sub: Omit<Subject, 'id'>) => {
    const newSubject: Subject = {
      ...sub,
      id: `subj-${Date.now()}`,
    };
    setSubjects((prev) => [...prev, newSubject]);
    if (currentUser?.uid) {
      setSubject(currentUser.uid, newSubject).catch((e) =>
        console.warn('[Firestore] Erreur addSubject :', e)
      );
    }
    return newSubject;
  };

  const updateSubject = (id: string, updates: Partial<Subject>) => {
    setSubjects((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    if (currentUser?.uid) {
      updateSubjectFirestore(currentUser.uid, id, updates).catch((e) =>
        console.warn('[Firestore] Erreur updateSubject :', e)
      );
    }
  };

  const deleteSubject = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    if (currentUser?.uid) {
      deleteSubjectFirestore(currentUser.uid, id).catch((e) =>
        console.warn('[Firestore] Erreur deleteSubject :', e)
      );
    }
  };

  // Projets
  const addProject = (proj: Omit<Project, 'id' | 'createdAt'>) => {
    const newProject: Project = {
      ...proj,
      id: `proj-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setProjects((prev) => [newProject, ...prev]);
    if (currentUser?.uid) {
      setProject(currentUser.uid, newProject).catch((e) =>
        console.warn('[Firestore] Erreur addProject :', e)
      );
    }
    return newProject;
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
    if (currentUser?.uid) {
      updateProjectFirestore(currentUser.uid, id, updates).catch((e) =>
        console.warn('[Firestore] Erreur updateProject :', e)
      );
    }
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (currentUser?.uid) {
      deleteProjectFirestore(currentUser.uid, id).catch((e) =>
        console.warn('[Firestore] Erreur deleteProject :', e)
      );
    }
  };

  const toggleProjectTask = (projectId: string, taskId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const updatedTasks = p.tasks.map((t) =>
          t.id === taskId ? { ...t, completed: !t.completed } : t
        );
        const updatedProject = { ...p, tasks: updatedTasks };
        if (currentUser?.uid) {
          setProject(currentUser.uid, updatedProject).catch((e) =>
            console.warn('[Firestore] Erreur toggleProjectTask :', e)
          );
        }
        return updatedProject;
      })
    );
  };

  // Tâches quotidiennes
  const addTask = (task: Omit<DailyTask, 'id'>) => {
    const newTask: DailyTask = {
      ...task,
      id: `task-${Date.now()}`,
    };
    setTasks((prev) => [newTask, ...prev]);
    if (currentUser?.uid) {
      setTask(currentUser.uid, newTask).catch((e) =>
        console.warn('[Firestore] Erreur addTask :', e)
      );
    }
    return newTask;
  };

  const updateTask = (id: string, updates: Partial<DailyTask>) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    if (currentUser?.uid) {
      updateTaskFirestore(currentUser.uid, id, updates).catch((e) =>
        console.warn('[Firestore] Erreur updateTask :', e)
      );
    }
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (currentUser?.uid) {
      deleteTaskFirestore(currentUser.uid, id).catch((e) =>
        console.warn('[Firestore] Erreur deleteTask :', e)
      );
    }
  };

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const newCompleted = !t.completed;
          const updated = { ...t, completed: newCompleted };
          if (currentUser?.uid) {
            updateTaskFirestore(currentUser.uid, id, { completed: newCompleted }).catch((e) =>
              console.warn('[Firestore] Erreur toggleTask :', e)
            );
          }
          return updated;
        }
        return t;
      })
    );
  };

  // Objectifs
  const addGoal = (g: Omit<Goal, 'id'>) => {
    const newGoal: Goal = {
      ...g,
      id: `goal-${Date.now()}`,
    };
    setGoals((prev) => [...prev, newGoal]);
    if (currentUser?.uid) {
      setGoal(currentUser.uid, newGoal).catch((e) =>
        console.warn('[Firestore] Erreur addGoal :', e)
      );
    }
    return newGoal;
  };

  const updateGoal = (id: string, updates: Partial<Goal>) => {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
    );
    if (currentUser?.uid) {
      updateGoalFirestore(currentUser.uid, id, updates).catch((e) =>
        console.warn('[Firestore] Erreur updateGoal :', e)
      );
    }
  };

  const deleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== id));
    if (currentUser?.uid) {
      deleteGoalFirestore(currentUser.uid, id).catch((e) =>
        console.warn('[Firestore] Erreur deleteGoal :', e)
      );
    }
  };

  // Référence pour déduplication stricte des ajouts de session
  const lastAddedSessionRef = useRef<{ title: string; duration: number; time: number } | null>(null);

  // Sessions d'étude & Pomodoro
  const addSession = (sess: Omit<StudySession, 'id'>) => {
    const now = Date.now();
    // Anti-double comptabilisation : si une session identique vient d'être ajoutée dans les 1.5s
    if (
      lastAddedSessionRef.current &&
      lastAddedSessionRef.current.title === sess.title &&
      lastAddedSessionRef.current.duration === sess.durationMinutes &&
      now - lastAddedSessionRef.current.time < 1500
    ) {
      return sessions[0] || ({ ...sess, id: `sess-${now}` } as StudySession);
    }
    lastAddedSessionRef.current = { title: sess.title, duration: sess.durationMinutes, time: now };

    const newSession: StudySession = {
      ...sess,
      id: `sess-${now}-${Math.random().toString(36).substring(2, 8)}`,
    };
    setSessions((prev) => [newSession, ...prev]);
    if (currentUser?.uid) {
      setSession(currentUser.uid, newSession).catch((e) =>
        console.warn('[Firestore] Erreur addSession :', e)
      );
    }

    // Incrémenter automatiquement la progression des objectifs concernés
    const hoursAdded = sess.durationMinutes / 60;
    setGoals((prev) =>
      prev.map((g) => {
        if (g.unit === 'hours') {
          const newVal = Math.min(g.targetValue, g.currentValue + hoursAdded);
          const updated = {
            ...g,
            currentValue: Number(newVal.toFixed(1)),
            completed: newVal >= g.targetValue,
          };
          if (currentUser?.uid) {
            updateGoalFirestore(currentUser.uid, g.id, {
              currentValue: updated.currentValue,
              completed: updated.completed,
            }).catch((e) => console.warn('[Firestore] Erreur sync goal session :', e));
          }
          return updated;
        }
        if (g.unit === 'sessions') {
          const newVal = g.currentValue + 1;
          const updated = { ...g, currentValue: newVal, completed: newVal >= g.targetValue };
          if (currentUser?.uid) {
            updateGoalFirestore(currentUser.uid, g.id, {
              currentValue: updated.currentValue,
              completed: updated.completed,
            }).catch((e) => console.warn('[Firestore] Erreur sync goal session :', e));
          }
          return updated;
        }
        return g;
      })
    );

    return newSession;
  };

  const deleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (currentUser?.uid) {
      deleteSessionFirestore(currentUser.uid, id).catch((e) =>
        console.warn('[Firestore] Erreur deleteSession :', e)
      );
    }
  };

  // Fiches et notes rapides
  const addNote = (note: Omit<QuickNote, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newNote: QuickNote = {
      ...note,
      id: `note-${Date.now()}`,
      date: note.date || now.split('T')[0],
      createdAt: now,
      updatedAt: now,
    };
    setNotes((prev) => [newNote, ...prev]);
    if (currentUser?.uid) {
      setNote(currentUser.uid, newNote).catch((e) =>
        console.warn('[Firestore] Erreur addNote :', e)
      );
    }
    return newNote;
  };

  const updateNote = (id: string, updates: Partial<QuickNote>) => {
    const now = new Date().toISOString();
    const fullUpdates = { ...updates, updatedAt: now };
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...fullUpdates } : n))
    );
    if (currentUser?.uid) {
      updateNoteFirestore(currentUser.uid, id, fullUpdates).catch((e) =>
        console.warn('[Firestore] Erreur updateNote :', e)
      );
    }
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (currentUser?.uid) {
      deleteNoteFirestore(currentUser.uid, id).catch((e) =>
        console.warn('[Firestore] Erreur deleteNote :', e)
      );
    }
  };

  // Rappels
  const markReminderAsRead = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isRead: true } : r))
    );
    if (currentUser?.uid) {
      updateReminderFirestore(currentUser.uid, id, { isRead: true }).catch((e) =>
        console.warn('[Firestore] Erreur markReminderAsRead :', e)
      );
    }
  };

  const dismissReminder = (id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    if (currentUser?.uid) {
      deleteReminderFirestore(currentUser.uid, id).catch((e) =>
        console.warn('[Firestore] Erreur dismissReminder :', e)
      );
    }
  };

  const addReminder = (rem: Omit<SmartReminder, 'id' | 'timestamp' | 'isRead'>) => {
    const newRem: SmartReminder = {
      ...rem,
      id: `rem-${Date.now()}`,
      timestamp: new Date().toISOString(),
      isRead: false,
    };
    setReminders((prev) => [newRem, ...prev]);
    if (currentUser?.uid) {
      setReminder(currentUser.uid, newRem).catch((e) =>
        console.warn('[Firestore] Erreur addReminder :', e)
      );
    }
  };

  // Modal d'ajout rapide
  const openQuickAdd = (
    type: 'task' | 'project' | 'subject' | 'note' | 'goal' = 'task',
    targetDate?: string
  ) => {
    setQuickAddDefaultType(type);
    if (targetDate) {
      setQuickAddTargetDate(targetDate);
    }
    setIsQuickAddOpen(true);
  };

  const closeQuickAdd = () => {
    setIsQuickAddOpen(false);
    setQuickAddTargetDate(undefined);
  };

  // Pomodoro Global Engine & Persistent State
  const pomodoro = usePomodoroState({
    subjects,
    addSession,
    addReminder,
  });

  // Réinitialisation des données
  const resetData = () => {
    pomodoro.reset();
    try {
      localStorage.removeItem(POMODORO_STORAGE_KEY);
    } catch {}
    if (currentUser?.uid) {
      // Utilisateur connecté : réinitialise ses données distantes et son cache local
      const cleanProfile = getCleanUserProfile(currentUser);
      resetUserFirestoreData(currentUser.uid, cleanProfile).catch((e) =>
        console.warn('[Firestore] Erreur réinitialisation compte cloud :', e)
      );
      removeLocalUserData(currentUser.uid);
      setUser(cleanProfile);
      setSubjects([]);
      setProjects([]);
      setTasks([]);
      setGoals([]);
      setSessions([]);
      setNotes([]);
      setReminders([]);
    } else {
      // Mode invité : réinitialise le cache invité avec le jeu initial de démonstration
      removeLocalUserData(null);
      setUser(INITIAL_USER);
      setSubjects(INITIAL_SUBJECTS);
      setProjects(INITIAL_PROJECTS);
      setTasks(INITIAL_TASKS);
      setGoals(INITIAL_GOALS);
      setSessions(INITIAL_SESSIONS);
      setNotes(INITIAL_NOTES);
      setReminders(INITIAL_REMINDERS);
    }
  };

  // Export JSON
  const exportDataJson = (): string => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      user,
      subjects,
      projects,
      tasks,
      goals,
      sessions,
      notes,
      reminders,
    };
    return JSON.stringify(payload, null, 2);
  };

  // Import JSON sécurisé : validation des types, plafonds de taille et IMMUTABILITÉ ABSOLUE du statut Premium
  const importDataJson = (jsonString: string): boolean => {
    try {
      if (typeof jsonString !== 'string' || !jsonString.trim()) {
        return false;
      }
      // Protection anti-déni de ressource : taille maximale du fichier JSON fixée à 4 Mo
      if (jsonString.length > 4 * 1024 * 1024) {
        console.warn('[Import JSON] Fichier rejeté : taille excessive (> 4 Mo).');
        return false;
      }

      const data = JSON.parse(jsonString);
      if (!data || typeof data !== 'object') {
        return false;
      }

      // 1. SÉCURISATION DU PROFIL :
      // Les champs sensibles de licence et de paiement ne proviennent JAMAIS du fichier importé.
      // Le tier et les identifiants Stripe actuels sont rigoureusement préservés.
      const sanitizedUser: UserProfile = {
        ...user,
        ...(data.user && typeof data.user === 'object'
          ? {
              name:
                typeof data.user.name === 'string' && data.user.name.trim()
                  ? data.user.name.trim().slice(0, 100)
                  : user.name,
              role: ['Étudiant', 'Freelance', 'Professionnel'].includes(data.user.role)
                ? data.user.role
                : user.role,
              domain:
                typeof data.user.domain === 'string'
                  ? data.user.domain.trim().slice(0, 100)
                  : user.domain,
              avatar:
                typeof data.user.avatar === 'string' &&
                (data.user.avatar.startsWith('http://') ||
                  data.user.avatar.startsWith('https://') ||
                  data.user.avatar.startsWith('/'))
                  ? data.user.avatar.slice(0, 500)
                  : user.avatar,
              dailyGoalHours:
                typeof data.user.dailyGoalHours === 'number' &&
                data.user.dailyGoalHours >= 0 &&
                data.user.dailyGoalHours <= 24
                  ? data.user.dailyGoalHours
                  : user.dailyGoalHours,
              weeklyGoalHours:
                typeof data.user.weeklyGoalHours === 'number' &&
                data.user.weeklyGoalHours >= 0 &&
                data.user.weeklyGoalHours <= 168
                  ? data.user.weeklyGoalHours
                  : user.weeklyGoalHours,
              streakDays:
                typeof data.user.streakDays === 'number' && data.user.streakDays >= 0
                  ? Math.floor(data.user.streakDays)
                  : user.streakDays,
            }
          : {}),
        // VERROUILLAGE STRICT : Le client conserve son statut Premium/Free et ses données de facturation actuelles
        tier: user.tier,
        subscriptionStatus: user.subscriptionStatus,
        billingProvider: user.billingProvider,
        billingCustomerId: user.billingCustomerId,
        billingSubscriptionId: user.billingSubscriptionId,
        billingPriceId: user.billingPriceId,
        billingCurrentPeriodEnd: user.billingCurrentPeriodEnd,
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionId: user.stripeSubscriptionId,
        stripePriceId: user.stripePriceId,
        stripeCurrentPeriodEnd: user.stripeCurrentPeriodEnd,
      };

      // Limiteur de taille par collection pour garantir la stabilité et respecter la limite de 500 écritures de Firestore
      const MAX_ITEMS_PER_COLLECTION = 50;

      // Helper pour valider la structure d'un ID
      const safeId = (rawId: unknown, fallbackPrefix: string, index: number): string => {
        if (typeof rawId === 'string' && rawId.length > 0 && rawId.length <= 128 && /^[a-zA-Z0-9_\-]+$/.test(rawId)) {
          return rawId;
        }
        return `${fallbackPrefix}-${Date.now()}-${index}`;
      };

      // 2. VALIDATION DES COLLECTIONS D'ÉTUDE
      const validatedSubjects: Subject[] = Array.isArray(data.subjects)
        ? data.subjects
            .slice(0, MAX_ITEMS_PER_COLLECTION)
            .filter((s: any) => s && typeof s === 'object')
            .map((s: any, idx: number): Subject => ({
              id: safeId(s.id, 'subj', idx),
              name: typeof s.name === 'string' && s.name.trim() ? s.name.trim().slice(0, 100) : `Matière ${idx + 1}`,
              code: typeof s.code === 'string' ? s.code.trim().slice(0, 20) : '',
              color: typeof s.color === 'string' && s.color.length <= 30 ? s.color : '#4F46E5',
              iconName: typeof s.iconName === 'string' && s.iconName.length <= 50 ? s.iconName : 'BookOpen',
              examDate: typeof s.examDate === 'string' && s.examDate.length <= 30 ? s.examDate : undefined,
              targetHoursPerWeek:
                typeof s.targetHoursPerWeek === 'number' && s.targetHoursPerWeek >= 0 && s.targetHoursPerWeek <= 168
                  ? s.targetHoursPerWeek
                  : 5,
              chapters: Array.isArray(s.chapters)
                ? s.chapters
                    .slice(0, 40)
                    .filter((c: any) => c && typeof c === 'object')
                    .map((c: any, cIdx: number) => ({
                      id: safeId(c.id, 'chap', cIdx),
                      title:
                        typeof c.title === 'string' && c.title.trim()
                          ? c.title.trim().slice(0, 120)
                          : `Chapitre ${cIdx + 1}`,
                      status: ['to_study', 'in_progress', 'reviewed', 'mastered'].includes(c.status)
                        ? c.status
                        : 'to_study',
                      notes: typeof c.notes === 'string' ? c.notes.slice(0, 5000) : undefined,
                      exercisesTotal:
                        typeof c.exercisesTotal === 'number' && c.exercisesTotal >= 0
                          ? Math.floor(c.exercisesTotal)
                          : 10,
                      exercisesCompleted:
                        typeof c.exercisesCompleted === 'number' && c.exercisesCompleted >= 0
                          ? Math.floor(c.exercisesCompleted)
                          : 0,
                    }))
                : [],
              resourcesCount:
                typeof s.resourcesCount === 'number' && s.resourcesCount >= 0 ? Math.floor(s.resourcesCount) : 0,
            }))
        : [];

      const validatedProjects: Project[] = Array.isArray(data.projects)
        ? data.projects
            .slice(0, MAX_ITEMS_PER_COLLECTION)
            .filter((p: any) => p && typeof p === 'object')
            .map((p: any, idx: number): Project => ({
              id: safeId(p.id, 'proj', idx),
              name: typeof p.name === 'string' && p.name.trim() ? p.name.trim().slice(0, 120) : `Projet ${idx + 1}`,
              description: typeof p.description === 'string' ? p.description.slice(0, 2000) : '',
              deadline: typeof p.deadline === 'string' && p.deadline.length <= 30 ? p.deadline : new Date().toISOString().slice(0, 10),
              priority: ['low', 'medium', 'high', 'urgent'].includes(p.priority) ? p.priority : 'medium',
              category: typeof p.category === 'string' ? p.category.slice(0, 50) : 'Général',
              status: ['active', 'completed', 'paused'].includes(p.status) ? p.status : 'active',
              createdAt: typeof p.createdAt === 'string' ? p.createdAt.slice(0, 40) : new Date().toISOString(),
              tasks: Array.isArray(p.tasks)
                ? p.tasks
                    .slice(0, 40)
                    .filter((t: any) => t && typeof t === 'object')
                    .map((t: any, tIdx: number) => ({
                      id: safeId(t.id, 'ptask', tIdx),
                      title:
                        typeof t.title === 'string' && t.title.trim()
                          ? t.title.trim().slice(0, 150)
                          : `Tâche ${tIdx + 1}`,
                      completed: Boolean(t.completed),
                      priority: ['low', 'medium', 'high', 'urgent'].includes(t.priority) ? t.priority : 'medium',
                      dueDate: typeof t.dueDate === 'string' ? t.dueDate.slice(0, 30) : undefined,
                      estimatedHours:
                        typeof t.estimatedHours === 'number' && t.estimatedHours >= 0 ? t.estimatedHours : 1,
                    }))
                : [],
            }))
        : [];

      const validatedTasks: DailyTask[] = Array.isArray(data.tasks)
        ? data.tasks
            .slice(0, MAX_ITEMS_PER_COLLECTION)
            .filter((t: any) => t && typeof t === 'object')
            .map((t: any, idx: number): DailyTask => ({
              id: safeId(t.id, 'task', idx),
              title: typeof t.title === 'string' && t.title.trim() ? t.title.trim().slice(0, 150) : `Tâche ${idx + 1}`,
              completed: Boolean(t.completed),
              priority: ['low', 'medium', 'high', 'urgent'].includes(t.priority) ? t.priority : 'medium',
              category: ['study', 'project', 'personal', 'revision'].includes(t.category) ? t.category : 'study',
              dueDate: typeof t.dueDate === 'string' && t.dueDate.length <= 30 ? t.dueDate : new Date().toISOString().slice(0, 10),
              dueTime: typeof t.dueTime === 'string' && t.dueTime.length <= 10 ? t.dueTime : undefined,
              estimatedMinutes:
                typeof t.estimatedMinutes === 'number' && t.estimatedMinutes >= 0 && t.estimatedMinutes <= 1440
                  ? Math.floor(t.estimatedMinutes)
                  : 30,
              actualMinutes:
                typeof t.actualMinutes === 'number' && t.actualMinutes >= 0 ? Math.floor(t.actualMinutes) : undefined,
              subjectId: typeof t.subjectId === 'string' ? t.subjectId.slice(0, 128) : undefined,
              projectId: typeof t.projectId === 'string' ? t.projectId.slice(0, 128) : undefined,
            }))
        : [];

      const validatedGoals: Goal[] = Array.isArray(data.goals)
        ? data.goals
            .slice(0, MAX_ITEMS_PER_COLLECTION)
            .filter((g: any) => g && typeof g === 'object')
            .map((g: any, idx: number): Goal => ({
              id: safeId(g.id, 'goal', idx),
              title: typeof g.title === 'string' && g.title.trim() ? g.title.trim().slice(0, 120) : `Objectif ${idx + 1}`,
              targetValue: typeof g.targetValue === 'number' && g.targetValue >= 0 ? g.targetValue : 10,
              currentValue: typeof g.currentValue === 'number' && g.currentValue >= 0 ? g.currentValue : 0,
              unit: ['hours', 'chapters', 'tasks', 'sessions'].includes(g.unit) ? g.unit : 'hours',
              period: ['daily', 'weekly', 'monthly'].includes(g.period) ? g.period : 'weekly',
              deadline: typeof g.deadline === 'string' ? g.deadline.slice(0, 30) : undefined,
              completed: Boolean(g.completed),
              subjectId: typeof g.subjectId === 'string' ? g.subjectId.slice(0, 128) : undefined,
            }))
        : [];

      const validatedSessions: StudySession[] = Array.isArray(data.sessions)
        ? data.sessions
            .slice(0, MAX_ITEMS_PER_COLLECTION)
            .filter((s: any) => s && typeof s === 'object')
            .map((s: any, idx: number): StudySession => ({
              id: safeId(s.id, 'sess', idx),
              title: typeof s.title === 'string' && s.title.trim() ? s.title.trim().slice(0, 120) : `Session`,
              subjectId: typeof s.subjectId === 'string' ? s.subjectId.slice(0, 128) : undefined,
              projectId: typeof s.projectId === 'string' ? s.projectId.slice(0, 128) : undefined,
              date: typeof s.date === 'string' ? s.date.slice(0, 40) : new Date().toISOString(),
              durationMinutes:
                typeof s.durationMinutes === 'number' && s.durationMinutes >= 0 && s.durationMinutes <= 1440
                  ? Math.floor(s.durationMinutes)
                  : 25,
              type: ['pomodoro', 'deep_work', 'revision', 'exercise'].includes(s.type) ? s.type : 'pomodoro',
              notes: typeof s.notes === 'string' ? s.notes.slice(0, 1000) : undefined,
            }))
        : [];

      const validatedNotes: QuickNote[] = Array.isArray(data.notes)
        ? data.notes
            .slice(0, MAX_ITEMS_PER_COLLECTION)
            .filter((n: any) => n && typeof n === 'object')
            .map((n: any, idx: number): QuickNote => ({
              id: safeId(n.id, 'note', idx),
              title: typeof n.title === 'string' && n.title.trim() ? n.title.trim().slice(0, 120) : `Note`,
              content: typeof n.content === 'string' ? n.content.slice(0, 10000) : '',
              subjectId: typeof n.subjectId === 'string' ? n.subjectId.slice(0, 128) : undefined,
              projectId: typeof n.projectId === 'string' ? n.projectId.slice(0, 128) : undefined,
              date: typeof n.date === 'string' ? n.date.slice(0, 30) : undefined,
              createdAt: typeof n.createdAt === 'string' ? n.createdAt.slice(0, 40) : new Date().toISOString(),
              updatedAt: typeof n.updatedAt === 'string' ? n.updatedAt.slice(0, 40) : new Date().toISOString(),
              tags: Array.isArray(n.tags)
                ? n.tags.slice(0, 10).filter((t: any) => typeof t === 'string').map((t: string) => t.slice(0, 40))
                : [],
              pinned: Boolean(n.pinned),
            }))
        : [];

      const validatedReminders: SmartReminder[] = Array.isArray(data.reminders)
        ? data.reminders
            .slice(0, MAX_ITEMS_PER_COLLECTION)
            .filter((r: any) => r && typeof r === 'object')
            .map((r: any, idx: number): SmartReminder => ({
              id: safeId(r.id, 'rem', idx),
              type: ['exam_upcoming', 'deadline_near', 'delayed_task', 'daily_goal', 'ai_insight'].includes(r.type)
                ? r.type
                : 'daily_goal',
              title: typeof r.title === 'string' && r.title.trim() ? r.title.trim().slice(0, 120) : `Rappel`,
              message: typeof r.message === 'string' ? r.message.slice(0, 500) : '',
              severity: ['info', 'warning', 'urgent'].includes(r.severity) ? r.severity : 'info',
              timestamp: typeof r.timestamp === 'string' ? r.timestamp.slice(0, 40) : new Date().toISOString(),
              isRead: Boolean(r.isRead),
              linkTab: ['dashboard', 'calendar', 'subjects', 'projects', 'pomodoro', 'ai'].includes(r.linkTab)
                ? r.linkTab
                : undefined,
            }))
        : [];

      // Application des données assainies dans les états React
      setUser(sanitizedUser);
      if (Array.isArray(data.subjects)) setSubjects(validatedSubjects);
      if (Array.isArray(data.projects)) setProjects(validatedProjects);
      if (Array.isArray(data.tasks)) setTasks(validatedTasks);
      if (Array.isArray(data.goals)) setGoals(validatedGoals);
      if (Array.isArray(data.sessions)) setSessions(validatedSessions);
      if (Array.isArray(data.notes)) setNotes(validatedNotes);
      if (Array.isArray(data.reminders)) setReminders(validatedReminders);

      // Si l'utilisateur est connecté, enregistrer immédiatement dans son espace Firestore
      // Remarque : sanitizedUser conserve le tier Firestore d'origine, respectant les règles de sécurité
      if (currentUser?.uid) {
        batchSaveInitialUserData(currentUser.uid, {
          user: sanitizedUser,
          subjects: Array.isArray(data.subjects) ? validatedSubjects : subjects,
          projects: Array.isArray(data.projects) ? validatedProjects : projects,
          tasks: Array.isArray(data.tasks) ? validatedTasks : tasks,
          goals: Array.isArray(data.goals) ? validatedGoals : goals,
          sessions: Array.isArray(data.sessions) ? validatedSessions : sessions,
          notes: Array.isArray(data.notes) ? validatedNotes : notes,
          reminders: Array.isArray(data.reminders) ? validatedReminders : reminders,
        }).catch((e) => console.warn('[Firestore] Erreur synchronisation import JSON :', e));
      }

      return true;
    } catch (e) {
      console.error('Erreur import JSON:', e);
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser: updateUserProfileState,
        subjects,
        addSubject,
        updateSubject,
        deleteSubject,
        projects,
        addProject,
        updateProject,
        deleteProject,
        toggleProjectTask,
        tasks,
        addTask,
        updateTask,
        deleteTask,
        toggleTask,
        goals,
        addGoal,
        updateGoal,
        deleteGoal,
        sessions,
        addSession,
        deleteSession,
        notes,
        addNote,
        updateNote,
        deleteNote,
        reminders,
        markReminderAsRead,
        dismissReminder,
        addReminder,
        activeTab,
        setActiveTab,
        isQuickAddOpen,
        setIsQuickAddOpen,
        quickAddModalOpen: isQuickAddOpen,
        quickAddDefaultType,
        quickAddType: quickAddDefaultType,
        quickAddTargetDate,
        setQuickAddTargetDate,
        openQuickAdd,
        closeQuickAdd,
        selectedSubjectId,
        setSelectedSubjectId,
        selectedProjectId,
        setSelectedProjectId,
        resetData,
        exportDataJson,
        importDataJson,
        cloudStatus,
        pomodoro,
        startPaddleCheckout,
        startStripeCheckout,
        isCheckoutLoading,
        checkoutError,
        clearCheckoutError,
        billingBannerMessage,
        dismissBillingBanner,
        stripeBannerMessage,
        dismissStripeBanner,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
