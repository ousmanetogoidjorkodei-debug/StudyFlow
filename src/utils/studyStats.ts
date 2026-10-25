import { StudySession } from '../types';

/**
 * Retourne le Lundi à 00:00:00.000 de la semaine correspondant à la date de référence
 * dans le fuseau horaire local de l'utilisateur.
 */
export function getLocalStartOfWeek(referenceDate: Date = new Date()): Date {
  const d = new Date(referenceDate);
  const day = d.getDay(); // 0 = Dimanche, 1 = Lundi, ..., 6 = Samedi
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Retourne le Dimanche à 23:59:59.999 de la semaine correspondant à la date de référence
 * dans le fuseau horaire local de l'utilisateur.
 */
export function getLocalEndOfWeek(referenceDate: Date = new Date()): Date {
  const start = getLocalStartOfWeek(referenceDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Vérifie si une date (chaîne ISO ou Date) appartient à la semaine courante
 * (entre le Lundi 00:00 et le Dimanche 23:59 en heure locale).
 */
export function isDateInCurrentWeek(dateInput: string | Date, referenceDate: Date = new Date()): boolean {
  if (!dateInput) return false;
  const t = typeof dateInput === 'string' ? new Date(dateInput).getTime() : dateInput.getTime();
  if (isNaN(t)) return false;

  const start = getLocalStartOfWeek(referenceDate).getTime();
  const end = getLocalEndOfWeek(referenceDate).getTime();
  return t >= start && t <= end;
}

/**
 * Formate une durée en minutes sous la forme exacte attendue :
 * "0 h 00 min", "0 h 25 min", "1 h 15 min", etc.
 */
export function formatStudyHoursMinutes(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${hours} h ${String(minutes).padStart(2, '0')} min`;
}

/**
 * Formate la plage textuelle de la semaine en cours (ex: "Lun. 19 oct. – Dim. 25 oct.").
 */
export function formatWeekRange(referenceDate: Date = new Date()): string {
  const start = getLocalStartOfWeek(referenceDate);
  const end = getLocalEndOfWeek(referenceDate);

  const startFormat = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
  }).format(start);

  const endFormat = new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(end);

  return `${startFormat} – ${endFormat}`;
}

export type DayOfWeekName = 'Lun' | 'Mar' | 'Mer' | 'Jeu' | 'Ven' | 'Sam' | 'Dim';

export interface DayStudyStats {
  dayName: DayOfWeekName;
  fullDateStr: string; // YYYY-MM-DD
  minutes: number;
  hours: number;
  formatted: string;
  isToday: boolean;
  sessionsCount: number;
}

/**
 * Exclut toute session factice résiduelle issue des données initiales de test.
 */
export function filterRealSessions(sessions: StudySession[]): StudySession[] {
  if (!Array.isArray(sessions)) return [];
  const dummyIds = new Set(['sess-1', 'sess-2', 'sess-3']);
  return sessions.filter((s) => s && !dummyIds.has(s.id) && typeof s.durationMinutes === 'number' && s.durationMinutes > 0);
}

/**
 * Calcule les statistiques d'étude pour chacun des 7 jours de la semaine courante (Lundi à Dimanche).
 */
export function getWeeklyDaysStats(sessions: StudySession[], referenceDate: Date = new Date()): DayStudyStats[] {
  const startOfWeek = getLocalStartOfWeek(referenceDate);
  const dayNames: DayOfWeekName[] = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  const todayYear = referenceDate.getFullYear();
  const todayMonth = referenceDate.getMonth();
  const todayDate = referenceDate.getDate();

  const realSessions = filterRealSessions(sessions);

  return dayNames.map((dayName, index) => {
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(dayDate.getDate() + index);

    const year = dayDate.getFullYear();
    const month = dayDate.getMonth();
    const date = dayDate.getDate();

    const isToday =
      todayYear === year &&
      todayMonth === month &&
      todayDate === date;

    const startOfDay = new Date(year, month, date, 0, 0, 0, 0).getTime();
    const endOfDay = new Date(year, month, date, 23, 59, 59, 999).getTime();

    // Filtre les sessions de concentration validées de cette journée précise
    const daySessions = realSessions.filter((s) => {
      const t = new Date(s.date).getTime();
      return !isNaN(t) && t >= startOfDay && t <= endOfDay;
    });

    const dayMinutes = daySessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const dayHours = Number((dayMinutes / 60).toFixed(1));

    return {
      dayName,
      fullDateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`,
      minutes: dayMinutes,
      hours: dayHours,
      formatted: formatStudyHoursMinutes(dayMinutes),
      isToday,
      sessionsCount: daySessions.length,
    };
  });
}

/**
 * Calcule la synthèse globale et hebdomadaire du temps d'étude.
 */
export function getWeeklyStudySummary(sessions: StudySession[], referenceDate: Date = new Date()) {
  const startOfWeek = getLocalStartOfWeek(referenceDate);
  const endOfWeek = getLocalEndOfWeek(referenceDate);

  const realSessions = filterRealSessions(sessions);

  // Sessions de la semaine en cours
  const currentWeekSessions = realSessions.filter((s) => {
    const t = new Date(s.date).getTime();
    return !isNaN(t) && t >= startOfWeek.getTime() && t <= endOfWeek.getTime();
  });

  const weeklyMinutes = currentWeekSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const weeklyFormatted = formatStudyHoursMinutes(weeklyMinutes);
  const weeklyHoursDecimal = Number((weeklyMinutes / 60).toFixed(1));

  // Cumul all-time
  const allTimeMinutes = realSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const allTimeFormatted = formatStudyHoursMinutes(allTimeMinutes);
  const allTimeHoursDecimal = Number((allTimeMinutes / 60).toFixed(1));

  // Sessions d'aujourd'hui
  const todayYear = referenceDate.getFullYear();
  const todayMonth = referenceDate.getMonth();
  const todayDate = referenceDate.getDate();
  const startOfToday = new Date(todayYear, todayMonth, todayDate, 0, 0, 0, 0).getTime();
  const endOfToday = new Date(todayYear, todayMonth, todayDate, 23, 59, 59, 999).getTime();

  const todaySessions = realSessions.filter((s) => {
    const t = new Date(s.date).getTime();
    return !isNaN(t) && t >= startOfToday && t <= endOfToday;
  });
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const todayFormatted = formatStudyHoursMinutes(todayMinutes);

  // Répartition par jour (Lun à Dim)
  const daysStats = getWeeklyDaysStats(realSessions, referenceDate);

  // Moyenne quotidienne de la semaine courante (sur les jours déjà entamés ou 7)
  const currentDayOfWeek = referenceDate.getDay();
  const daysElapsedThisWeek = currentDayOfWeek === 0 ? 7 : currentDayOfWeek;
  const dailyAverageMinutes = Math.round(weeklyMinutes / Math.max(1, daysElapsedThisWeek));
  const dailyAverageFormatted = formatStudyHoursMinutes(dailyAverageMinutes);
  const dailyAverageHours = Number((dailyAverageMinutes / 60).toFixed(1));

  // Heure maximum sur un jour pour l'échelle du graphique (au moins 2h pour un affichage propre)
  const maxDayMinutes = Math.max(120, ...daysStats.map((d) => d.minutes));

  return {
    startOfWeek,
    endOfWeek,
    weekRangeText: formatWeekRange(referenceDate),
    currentWeekSessions,
    currentWeekSessionsCount: currentWeekSessions.length,
    weeklyMinutes,
    weeklyFormatted,
    weeklyHoursDecimal,
    allTimeSessions: realSessions,
    allTimeSessionsCount: realSessions.length,
    allTimeMinutes,
    allTimeFormatted,
    allTimeHoursDecimal,
    todaySessions,
    todaySessionsCount: todaySessions.length,
    todayMinutes,
    todayFormatted,
    daysStats,
    dailyAverageMinutes,
    dailyAverageFormatted,
    dailyAverageHours,
    maxDayMinutes,
  };
}

/**
 * Calcule la série de jours consécutifs d'étude (streak).
 */
export function calculateStudyStreak(sessions: StudySession[], referenceDate: Date = new Date()): number {
  const realSessions = filterRealSessions(sessions);
  if (realSessions.length === 0) return 0;

  // Créer un ensemble des dates étudiées au format 'YYYY-MM-DD' en heure locale
  const studiedDates = new Set<string>();
  realSessions.forEach((s) => {
    const d = new Date(s.date);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      studiedDates.add(`${year}-${month}-${date}`);
    }
  });

  const formatDateKey = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  };

  const cursor = new Date(referenceDate);
  cursor.setHours(0, 0, 0, 0);

  const todayKey = formatDateKey(cursor);
  const studiedToday = studiedDates.has(todayKey);

  // Si pas étudié aujourd'hui, vérifier si étudié hier
  if (!studiedToday) {
    cursor.setDate(cursor.getDate() - 1);
    const yesterdayKey = formatDateKey(cursor);
    if (!studiedDates.has(yesterdayKey)) {
      return 0;
    }
  }

  let streak = 0;
  while (studiedDates.has(formatDateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}
