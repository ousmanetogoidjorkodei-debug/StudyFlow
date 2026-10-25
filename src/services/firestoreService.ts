import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  Timestamp,
  Unsubscribe,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  UserProfile,
  Subject,
  Project,
  DailyTask,
  Goal,
  QuickNote,
  SmartReminder,
  StudySession,
} from '../types';

export type UserSubcollection =
  | 'subjects'
  | 'projects'
  | 'tasks'
  | 'goals'
  | 'notes'
  | 'reminders'
  | 'sessions';

/**
 * Vérifie que la base de données Firestore est initialisée.
 */
function getDbInstance() {
  if (!db) {
    throw new Error(
      '[FirestoreService] Firestore n\'est pas initialisé. Vérifiez vos identifiants Firebase.'
    );
  }
  return db;
}

/**
 * Valide que le userId est bien renseigné et sécurisé.
 */
function assertValidUserId(userId: string): void {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    throw new Error('[FirestoreService] userId authentifié requis pour toute opération Firestore.');
  }
}

/**
 * Convertit récursivement les Timestamp Firestore en chaînes ISO ou dates compatibles
 * afin de ne pas altérer les interfaces actuelles de l'application Studyflow.
 */
function sanitizeFirestoreData<T>(data: any): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (data instanceof Timestamp) {
    return data.toDate().toISOString() as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeFirestoreData(item)) as unknown as T;
  }

  if (typeof data === 'object' && data.constructor === Object) {
    const sanitized: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      sanitized[key] = sanitizeFirestoreData(data[key]);
    }
    return sanitized as T;
  }

  return data as T;
}

/**
 * Transforme un snapshot de document Firestore en objet typé avec son identifiant.
 */
function parseDocSnapshot<T>(snap: DocumentSnapshot): T | null {
  if (!snap.exists()) return null;
  const raw = snap.data();
  const clean = sanitizeFirestoreData<any>(raw);
  return {
    id: snap.id,
    ...clean,
  } as T;
}

/* ==========================================================================
   1. GESTION DU PROFIL UTILISATEUR : users/{userId}
   ========================================================================== */

/**
 * Récupère le profil d'un utilisateur à partir de users/{userId}.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  assertValidUserId(userId);
  const firestore = getDbInstance();
  const userDocRef = doc(firestore, 'users', userId);
  const snap = await getDoc(userDocRef);

  if (!snap.exists()) return null;
  const raw = snap.data();
  return sanitizeFirestoreData<UserProfile>(raw);
}

/**
 * Enregistre ou remplace le profil de l'utilisateur dans users/{userId}.
 */
export async function setUserProfile(userId: string, profile: UserProfile): Promise<void> {
  assertValidUserId(userId);
  const firestore = getDbInstance();
  const userDocRef = doc(firestore, 'users', userId);
  await setDoc(userDocRef, profile, { merge: true });
}

/**
 * Met à jour partiellement le profil utilisateur dans users/{userId}.
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<void> {
  assertValidUserId(userId);
  const firestore = getDbInstance();
  const userDocRef = doc(firestore, 'users', userId);
  await updateDoc(userDocRef, updates as Record<string, any>);
}

/**
 * Écoute en temps réel les changements du profil utilisateur.
 */
export function subscribeToUserProfile(
  userId: string,
  onUpdate: (profile: UserProfile | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  assertValidUserId(userId);
  const firestore = getDbInstance();
  const userDocRef = doc(firestore, 'users', userId);

  return onSnapshot(
    userDocRef,
    (snap) => {
      if (!snap.exists()) {
        onUpdate(null);
        return;
      }
      const data = sanitizeFirestoreData<UserProfile>(snap.data());
      onUpdate(data);
    },
    (err) => {
      console.error(`[FirestoreService] Erreur écoute profil users/${userId} :`, err);
      if (onError) onError(err);
    }
  );
}

/* ==========================================================================
   2. CRUD GÉNÉRIQUE DES SOUS-COLLECTIONS : users/{userId}/{subcollection}
   ========================================================================== */

/**
 * Récupère tous les documents d'une sous-collection de l'utilisateur.
 */
export async function getUserSubcollection<T extends { id: string }>(
  userId: string,
  subcollection: UserSubcollection
): Promise<T[]> {
  assertValidUserId(userId);
  const firestore = getDbInstance();
  const colRef = collection(firestore, 'users', userId, subcollection);
  const snap = await getDocs(colRef);

  return snap.docs
    .map((d) => parseDocSnapshot<T>(d))
    .filter((item): item is T => item !== null);
}

/**
 * Récupère un document précis d'une sous-collection de l'utilisateur.
 */
export async function getUserSubcollectionDoc<T extends { id: string }>(
  userId: string,
  subcollection: UserSubcollection,
  docId: string
): Promise<T | null> {
  assertValidUserId(userId);
  if (!docId) throw new Error('[FirestoreService] docId requis.');
  const firestore = getDbInstance();
  const docRef = doc(firestore, 'users', userId, subcollection, docId);
  const snap = await getDoc(docRef);
  return parseDocSnapshot<T>(snap);
}

/**
 * Crée ou écrase un document dans la sous-collection de l'utilisateur.
 */
export async function setUserSubcollectionDoc<T extends { id: string }>(
  userId: string,
  subcollection: UserSubcollection,
  item: T
): Promise<void> {
  assertValidUserId(userId);
  if (!item.id) throw new Error('[FirestoreService] Le document doit comporter un identifiant id.');
  const firestore = getDbInstance();
  const docRef = doc(firestore, 'users', userId, subcollection, item.id);
  await setDoc(docRef, item, { merge: true });
}

/**
 * Met à jour des champs spécifiques d'un document dans la sous-collection.
 */
export async function updateUserSubcollectionDoc(
  userId: string,
  subcollection: UserSubcollection,
  docId: string,
  updates: Record<string, any>
): Promise<void> {
  assertValidUserId(userId);
  if (!docId) throw new Error('[FirestoreService] docId requis pour mise à jour.');
  const firestore = getDbInstance();
  const docRef = doc(firestore, 'users', userId, subcollection, docId);
  await updateDoc(docRef, updates);
}

/**
 * Supprime un document d'une sous-collection de l'utilisateur.
 */
export async function deleteUserSubcollectionDoc(
  userId: string,
  subcollection: UserSubcollection,
  docId: string
): Promise<void> {
  assertValidUserId(userId);
  if (!docId) throw new Error('[FirestoreService] docId requis pour suppression.');
  const firestore = getDbInstance();
  const docRef = doc(firestore, 'users', userId, subcollection, docId);
  await deleteDoc(docRef);
}

/**
 * S'abonne en temps réel à une sous-collection complète de l'utilisateur.
 */
export function subscribeToUserSubcollection<T extends { id: string }>(
  userId: string,
  subcollection: UserSubcollection,
  onUpdate: (items: T[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  assertValidUserId(userId);
  const firestore = getDbInstance();
  const colRef = collection(firestore, 'users', userId, subcollection);

  return onSnapshot(
    colRef,
    (snap) => {
      const items: T[] = snap.docs
        .map((d) => parseDocSnapshot<T>(d))
        .filter((item): item is T => item !== null);
      onUpdate(items);
    },
    (err) => {
      console.error(
        `[FirestoreService] Erreur écoute sous-collection users/${userId}/${subcollection} :`,
        err
      );
      if (onError) onError(err);
    }
  );
}

/* ==========================================================================
   3. FONCTIONS CRUD SPÉCIALISÉES ET TYPÉES POUR CHAQUE ENTITÉ
   ========================================================================== */

// --- Matières (Subjects) ---
export const getSubjects = (userId: string) =>
  getUserSubcollection<Subject>(userId, 'subjects');
export const setSubject = (userId: string, subject: Subject) =>
  setUserSubcollectionDoc<Subject>(userId, 'subjects', subject);
export const updateSubject = (userId: string, id: string, updates: Partial<Subject>) =>
  updateUserSubcollectionDoc(userId, 'subjects', id, updates);
export const deleteSubject = (userId: string, id: string) =>
  deleteUserSubcollectionDoc(userId, 'subjects', id);
export const subscribeToSubjects = (
  userId: string,
  onUpdate: (subjects: Subject[]) => void,
  onError?: (err: Error) => void
) => subscribeToUserSubcollection<Subject>(userId, 'subjects', onUpdate, onError);

// --- Projets (Projects) ---
export const getProjects = (userId: string) =>
  getUserSubcollection<Project>(userId, 'projects');
export const setProject = (userId: string, project: Project) =>
  setUserSubcollectionDoc<Project>(userId, 'projects', project);
export const updateProject = (userId: string, id: string, updates: Partial<Project>) =>
  updateUserSubcollectionDoc(userId, 'projects', id, updates);
export const deleteProject = (userId: string, id: string) =>
  deleteUserSubcollectionDoc(userId, 'projects', id);
export const subscribeToProjects = (
  userId: string,
  onUpdate: (projects: Project[]) => void,
  onError?: (err: Error) => void
) => subscribeToUserSubcollection<Project>(userId, 'projects', onUpdate, onError);

// --- Tâches quotidiennes (Tasks) ---
export const getTasks = (userId: string) =>
  getUserSubcollection<DailyTask>(userId, 'tasks');
export const setTask = (userId: string, task: DailyTask) =>
  setUserSubcollectionDoc<DailyTask>(userId, 'tasks', task);
export const updateTask = (userId: string, id: string, updates: Partial<DailyTask>) =>
  updateUserSubcollectionDoc(userId, 'tasks', id, updates);
export const deleteTask = (userId: string, id: string) =>
  deleteUserSubcollectionDoc(userId, 'tasks', id);
export const subscribeToTasks = (
  userId: string,
  onUpdate: (tasks: DailyTask[]) => void,
  onError?: (err: Error) => void
) => subscribeToUserSubcollection<DailyTask>(userId, 'tasks', onUpdate, onError);

// --- Objectifs (Goals) ---
export const getGoals = (userId: string) =>
  getUserSubcollection<Goal>(userId, 'goals');
export const setGoal = (userId: string, goal: Goal) =>
  setUserSubcollectionDoc<Goal>(userId, 'goals', goal);
export const updateGoal = (userId: string, id: string, updates: Partial<Goal>) =>
  updateUserSubcollectionDoc(userId, 'goals', id, updates);
export const deleteGoal = (userId: string, id: string) =>
  deleteUserSubcollectionDoc(userId, 'goals', id);
export const subscribeToGoals = (
  userId: string,
  onUpdate: (goals: Goal[]) => void,
  onError?: (err: Error) => void
) => subscribeToUserSubcollection<Goal>(userId, 'goals', onUpdate, onError);

// --- Fiches de notes (Notes) ---
export const getNotes = (userId: string) =>
  getUserSubcollection<QuickNote>(userId, 'notes');
export const setNote = (userId: string, note: QuickNote) =>
  setUserSubcollectionDoc<QuickNote>(userId, 'notes', note);
export const updateNote = (userId: string, id: string, updates: Partial<QuickNote>) =>
  updateUserSubcollectionDoc(userId, 'notes', id, updates);
export const deleteNote = (userId: string, id: string) =>
  deleteUserSubcollectionDoc(userId, 'notes', id);
export const subscribeToNotes = (
  userId: string,
  onUpdate: (notes: QuickNote[]) => void,
  onError?: (err: Error) => void
) => subscribeToUserSubcollection<QuickNote>(userId, 'notes', onUpdate, onError);

// --- Rappels (Reminders) ---
export const getReminders = (userId: string) =>
  getUserSubcollection<SmartReminder>(userId, 'reminders');
export const setReminder = (userId: string, reminder: SmartReminder) =>
  setUserSubcollectionDoc<SmartReminder>(userId, 'reminders', reminder);
export const updateReminder = (userId: string, id: string, updates: Partial<SmartReminder>) =>
  updateUserSubcollectionDoc(userId, 'reminders', id, updates);
export const deleteReminder = (userId: string, id: string) =>
  deleteUserSubcollectionDoc(userId, 'reminders', id);
export const subscribeToReminders = (
  userId: string,
  onUpdate: (reminders: SmartReminder[]) => void,
  onError?: (err: Error) => void
) => subscribeToUserSubcollection<SmartReminder>(userId, 'reminders', onUpdate, onError);

// --- Sessions d'étude & Pomodoro (Sessions) ---
export const getSessions = (userId: string) =>
  getUserSubcollection<StudySession>(userId, 'sessions');
export const setSession = (userId: string, session: StudySession) =>
  setUserSubcollectionDoc<StudySession>(userId, 'sessions', session);
export const updateSession = (userId: string, id: string, updates: Partial<StudySession>) =>
  updateUserSubcollectionDoc(userId, 'sessions', id, updates);
export const deleteSession = (userId: string, id: string) =>
  deleteUserSubcollectionDoc(userId, 'sessions', id);
export const subscribeToSessions = (
  userId: string,
  onUpdate: (sessions: StudySession[]) => void,
  onError?: (err: Error) => void
) => subscribeToUserSubcollection<StudySession>(userId, 'sessions', onUpdate, onError);

/* ==========================================================================
   4. OUTILS D'INSPECTION ET DE MIGRATION PAR LOT (BATCH)
   ========================================================================== */

/**
 * Vérifie si des données existent déjà pour un utilisateur dans Firestore.
 */
export async function checkUserHasFirestoreData(userId: string): Promise<boolean> {
  assertValidUserId(userId);
  const firestore = getDbInstance();

  // Vérifier d'abord le document profil
  const userDocRef = doc(firestore, 'users', userId);
  const userSnap = await getDoc(userDocRef);
  if (userSnap.exists()) return true;

  // Vérifier si des matières existent
  const subjectsSnap = await getDocs(collection(firestore, 'users', userId, 'subjects'));
  return !subjectsSnap.empty;
}

/**
 * Sauvegarde en un seul lot atomique (writeBatch) un ensemble complet de données
 * (pratique pour l'import initial ou la migration sans surcoût réseau).
 */
export async function batchSaveInitialUserData(
  userId: string,
  data: {
    user: UserProfile;
    subjects: Subject[];
    projects: Project[];
    tasks: DailyTask[];
    goals: Goal[];
    sessions: StudySession[];
    notes: QuickNote[];
    reminders: SmartReminder[];
  }
): Promise<void> {
  assertValidUserId(userId);
  const firestore = getDbInstance();
  const batch = writeBatch(firestore);

  // Profil
  const profileRef = doc(firestore, 'users', userId);
  batch.set(profileRef, data.user, { merge: true });

  // Matières
  data.subjects.forEach((sub) => {
    const r = doc(firestore, 'users', userId, 'subjects', sub.id);
    batch.set(r, sub, { merge: true });
  });

  // Projets
  data.projects.forEach((proj) => {
    const r = doc(firestore, 'users', userId, 'projects', proj.id);
    batch.set(r, proj, { merge: true });
  });

  // Tâches
  data.tasks.forEach((t) => {
    const r = doc(firestore, 'users', userId, 'tasks', t.id);
    batch.set(r, t, { merge: true });
  });

  // Objectifs
  data.goals.forEach((g) => {
    const r = doc(firestore, 'users', userId, 'goals', g.id);
    batch.set(r, g, { merge: true });
  });

  // Sessions
  data.sessions.forEach((s) => {
    const r = doc(firestore, 'users', userId, 'sessions', s.id);
    batch.set(r, s, { merge: true });
  });

  // Notes
  data.notes.forEach((n) => {
    const r = doc(firestore, 'users', userId, 'notes', n.id);
    batch.set(r, n, { merge: true });
  });

  // Rappels
  data.reminders.forEach((rem) => {
    const r = doc(firestore, 'users', userId, 'reminders', rem.id);
    batch.set(r, rem, { merge: true });
  });

  await batch.commit();
}

/**
 * Réinitialise complètement les données d'un utilisateur dans Firestore
 * en supprimant ses sous-collections et en réinitialisant son profil.
 */
export async function resetUserFirestoreData(
  userId: string,
  initialUser: UserProfile
): Promise<void> {
  assertValidUserId(userId);
  const firestore = getDbInstance();
  const subcollections: UserSubcollection[] = [
    'subjects',
    'projects',
    'tasks',
    'goals',
    'notes',
    'reminders',
    'sessions',
  ];

  const batch = writeBatch(firestore);

  // Supprimer tous les documents de chaque sous-collection
  for (const sub of subcollections) {
    const snap = await getDocs(collection(firestore, 'users', userId, sub));
    snap.docs.forEach((d) => {
      batch.delete(d.ref);
    });
  }

  // Réinitialiser le profil en préservant scrupuleusement le statut tier et les données d'abonnement Stripe
  const userDocRef = doc(firestore, 'users', userId);
  const existingSnap = await getDoc(userDocRef);
  const existingData = existingSnap.data() as Partial<UserProfile> | undefined;

  const safeResetProfile: UserProfile = {
    ...initialUser,
    tier: existingData?.tier || initialUser.tier || 'free',
    ...(existingData?.subscriptionStatus ? { subscriptionStatus: existingData.subscriptionStatus } : {}),
    ...(existingData?.billingProvider ? { billingProvider: existingData.billingProvider } : {}),
    ...(existingData?.billingCustomerId ? { billingCustomerId: existingData.billingCustomerId } : {}),
    ...(existingData?.billingSubscriptionId ? { billingSubscriptionId: existingData.billingSubscriptionId } : {}),
    ...(existingData?.billingPriceId ? { billingPriceId: existingData.billingPriceId } : {}),
    ...(existingData?.billingCurrentPeriodEnd ? { billingCurrentPeriodEnd: existingData.billingCurrentPeriodEnd } : {}),
    ...(existingData?.stripeCustomerId ? { stripeCustomerId: existingData.stripeCustomerId } : {}),
    ...(existingData?.stripeSubscriptionId ? { stripeSubscriptionId: existingData.stripeSubscriptionId } : {}),
    ...(existingData?.stripePriceId ? { stripePriceId: existingData.stripePriceId } : {}),
    ...(existingData?.stripeCurrentPeriodEnd ? { stripeCurrentPeriodEnd: existingData.stripeCurrentPeriodEnd } : {}),
  };

  batch.set(userDocRef, safeResetProfile);

  await batch.commit();
}

