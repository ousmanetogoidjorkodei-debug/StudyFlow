import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { playChime } from '../utils/audio';
import { GlobalPomodoro, PomodoroMode, Subject, StudySession, SmartReminder } from '../types';

export const POMODORO_STORAGE_KEY = 'studyflow_pomodoro_state_v1';

interface StoredPomodoroState {
  mode: PomodoroMode;
  timeLeft: number;
  isRunning: boolean;
  targetEndTime: number | null;
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  completedCycles: number;
  soundEnabled: boolean;
  selectedSubjectId: string;
  selectedProjectId: string;
  sessionNotes: string;
}

function getInitialPomodoro(): StoredPomodoroState {
  const defaultState: StoredPomodoroState = {
    mode: 'work',
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    completedCycles: 0,
    soundEnabled: true,
    selectedSubjectId: '',
    selectedProjectId: '',
    sessionNotes: '',
    isRunning: false,
    timeLeft: 25 * 60,
    targetEndTime: null,
  };

  if (typeof window === 'undefined') return defaultState;

  try {
    const raw = localStorage.getItem(POMODORO_STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);

    const mode: PomodoroMode =
      parsed.mode === 'short_break' || parsed.mode === 'long_break' ? parsed.mode : 'work';
    const workMinutes = typeof parsed.workMinutes === 'number' && parsed.workMinutes > 0 ? parsed.workMinutes : 25;
    const shortBreakMinutes =
      typeof parsed.shortBreakMinutes === 'number' && parsed.shortBreakMinutes > 0 ? parsed.shortBreakMinutes : 5;
    const longBreakMinutes =
      typeof parsed.longBreakMinutes === 'number' && parsed.longBreakMinutes > 0 ? parsed.longBreakMinutes : 15;
    const completedCycles = typeof parsed.completedCycles === 'number' ? parsed.completedCycles : 0;
    const soundEnabled = typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true;
    const selectedSubjectId = typeof parsed.selectedSubjectId === 'string' ? parsed.selectedSubjectId : '';
    const selectedProjectId = typeof parsed.selectedProjectId === 'string' ? parsed.selectedProjectId : '';
    const sessionNotes = typeof parsed.sessionNotes === 'string' ? parsed.sessionNotes : '';

    let isRunning = Boolean(parsed.isRunning);
    let targetEndTime = typeof parsed.targetEndTime === 'number' ? parsed.targetEndTime : null;
    let timeLeft = typeof parsed.timeLeft === 'number' ? parsed.timeLeft : workMinutes * 60;

    // Synchronisation basée sur l'horodatage réel (Date.now())
    if (isRunning && targetEndTime) {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((targetEndTime - now) / 1000));
      if (remaining > 0) {
        timeLeft = remaining;
      } else {
        // La session s'est terminée pendant la fermeture ou l'inactivité
        isRunning = false;
        targetEndTime = null;
        timeLeft = mode === 'work' ? shortBreakMinutes * 60 : workMinutes * 60;
      }
    } else {
      isRunning = false;
      targetEndTime = null;
    }

    return {
      mode,
      workMinutes,
      shortBreakMinutes,
      longBreakMinutes,
      completedCycles,
      soundEnabled,
      selectedSubjectId,
      selectedProjectId,
      sessionNotes,
      isRunning,
      timeLeft,
      targetEndTime,
    };
  } catch (err) {
    console.warn('[Pomodoro] Erreur chargement initial localStorage :', err);
    return defaultState;
  }
}

interface UsePomodoroStateProps {
  subjects: Subject[];
  addSession: (session: Omit<StudySession, 'id'>) => StudySession;
  addReminder: (reminder: Omit<SmartReminder, 'id' | 'timestamp' | 'isRead'>) => void;
}

export function usePomodoroState({
  subjects,
  addSession,
  addReminder,
}: UsePomodoroStateProps): GlobalPomodoro {
  const initial = getInitialPomodoro();

  const [mode, setMode] = useState<PomodoroMode>(initial.mode);
  const [workMinutes, setWorkMinutes] = useState<number>(initial.workMinutes);
  const [shortBreakMinutes, setShortBreakMinutes] = useState<number>(initial.shortBreakMinutes);
  const [longBreakMinutes, setLongBreakMinutes] = useState<number>(initial.longBreakMinutes);
  const [completedCycles, setCompletedCycles] = useState<number>(initial.completedCycles);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(initial.soundEnabled);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initial.selectedSubjectId);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initial.selectedProjectId);
  const [sessionNotes, setSessionNotes] = useState<string>(initial.sessionNotes);

  const [isRunning, setIsRunning] = useState<boolean>(initial.isRunning);
  const [timeLeft, setTimeLeft] = useState<number>(initial.timeLeft);
  const [targetEndTime, setTargetEndTime] = useState<number | null>(initial.targetEndTime);

  // Références synchrones pour éviter toute capture d'état obsolète (stale closures)
  const isRunningRef = useRef(isRunning);
  const targetEndTimeRef = useRef(targetEndTime);
  const timeLeftRef = useRef(timeLeft);
  const modeRef = useRef(mode);
  const workMinutesRef = useRef(workMinutes);
  const shortBreakMinutesRef = useRef(shortBreakMinutes);
  const longBreakMinutesRef = useRef(longBreakMinutes);
  const completedCyclesRef = useRef(completedCycles);
  const soundEnabledRef = useRef(soundEnabled);
  const selectedSubjectIdRef = useRef(selectedSubjectId);
  const selectedProjectIdRef = useRef(selectedProjectId);
  const sessionNotesRef = useRef(sessionNotes);
  const subjectsRef = useRef(subjects);
  const addSessionRef = useRef(addSession);
  const addReminderRef = useRef(addReminder);

  useEffect(() => {
    isRunningRef.current = isRunning;
  }, [isRunning]);
  useEffect(() => {
    targetEndTimeRef.current = targetEndTime;
  }, [targetEndTime]);
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    workMinutesRef.current = workMinutes;
  }, [workMinutes]);
  useEffect(() => {
    shortBreakMinutesRef.current = shortBreakMinutes;
  }, [shortBreakMinutes]);
  useEffect(() => {
    longBreakMinutesRef.current = longBreakMinutes;
  }, [longBreakMinutes]);
  useEffect(() => {
    completedCyclesRef.current = completedCycles;
  }, [completedCycles]);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);
  useEffect(() => {
    selectedSubjectIdRef.current = selectedSubjectId;
  }, [selectedSubjectId]);
  useEffect(() => {
    selectedProjectIdRef.current = selectedProjectId;
  }, [selectedProjectId]);
  useEffect(() => {
    sessionNotesRef.current = sessionNotes;
  }, [sessionNotes]);
  useEffect(() => {
    subjectsRef.current = subjects;
  }, [subjects]);
  useEffect(() => {
    addSessionRef.current = addSession;
  }, [addSession]);
  useEffect(() => {
    addReminderRef.current = addReminder;
  }, [addReminder]);

  // Sauvegarde dédiée dans localStorage
  const saveToStorage = (override?: Partial<StoredPomodoroState>) => {
    if (typeof window === 'undefined') return;
    try {
      const payload: StoredPomodoroState = {
        mode: modeRef.current,
        workMinutes: workMinutesRef.current,
        shortBreakMinutes: shortBreakMinutesRef.current,
        longBreakMinutes: longBreakMinutesRef.current,
        completedCycles: completedCyclesRef.current,
        soundEnabled: soundEnabledRef.current,
        selectedSubjectId: selectedSubjectIdRef.current,
        selectedProjectId: selectedProjectIdRef.current,
        sessionNotes: sessionNotesRef.current,
        isRunning: isRunningRef.current,
        timeLeft: timeLeftRef.current,
        targetEndTime: targetEndTimeRef.current,
        ...override,
      };
      localStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('[Pomodoro] Erreur sauvegarde localStorage :', err);
    }
  };

  // Références de verrouillage anti-double comptabilisation
  const isRecordingSessionRef = useRef(false);
  const lastRecordedSessionTimestampRef = useRef(0);

  // Calcule le nombre exact de secondes de travail étudiées dans la session en cours
  const getElapsedWorkSeconds = (): number => {
    if (modeRef.current !== 'work') return 0;
    const totalSec = workMinutesRef.current * 60;
    const currentLeft = isRunningRef.current && targetEndTimeRef.current
      ? Math.max(0, Math.ceil((targetEndTimeRef.current - Date.now()) / 1000))
      : timeLeftRef.current;
    return Math.max(0, totalSec - currentLeft);
  };

  // Enregistrement d'une session de travail réelle avec protection stricte contre les doublons
  const recordWorkSession = (durationMinutes: number, titleSuffix: string = '') => {
    if (durationMinutes <= 0) return;
    const now = Date.now();
    // Verrouillage : empêche strictement tout double enregistrement en moins de 2 secondes
    if (isRecordingSessionRef.current || now - lastRecordedSessionTimestampRef.current < 2000) {
      return;
    }
    isRecordingSessionRef.current = true;
    lastRecordedSessionTimestampRef.current = now;

    try {
      const currentSubId = selectedSubjectIdRef.current;
      const currentProjId = selectedProjectIdRef.current;
      const currentNotes = sessionNotesRef.current;
      const subj = subjectsRef.current.find((s) => s.id === currentSubId);

      addSessionRef.current({
        title: `Session Pomodoro - ${subj?.name || 'Étude libre'}${titleSuffix}`,
        subjectId: currentSubId || undefined,
        projectId: currentProjId || undefined,
        date: new Date().toISOString(),
        durationMinutes,
        type: 'pomodoro',
        notes: currentNotes || undefined,
      });
    } finally {
      setTimeout(() => {
        isRecordingSessionRef.current = false;
      }, 1500);
    }
  };

  // Traitement universel de la fin d'une session (travail ou pause)
  const handlePhaseComplete = () => {
    if (isRecordingSessionRef.current) return;

    const currentMode = modeRef.current;
    const currentWorkMin = workMinutesRef.current;
    const currentShortMin = shortBreakMinutesRef.current;
    const currentLongMin = longBreakMinutesRef.current;
    const currentCycles = completedCyclesRef.current;
    const isSound = soundEnabledRef.current;

    // Arrêt immédiat du minuteur
    isRunningRef.current = false;
    targetEndTimeRef.current = null;
    setIsRunning(false);
    setTargetEndTime(null);

    // 1. Carillon sonore
    if (isSound) {
      try {
        playChime(currentMode === 'work' ? 'complete' : 'break');
      } catch {}
    }

    if (currentMode === 'work') {
      // 2. Confettis festifs
      try {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {}

      const newCycles = currentCycles + 1;
      completedCyclesRef.current = newCycles;
      setCompletedCycles(newCycles);

      // 3. Enregistrement sécurisé de la session terminée (durée configurée complète)
      recordWorkSession(currentWorkMin);

      // 4. Notification / Rappel dans l'application
      addReminderRef.current({
        type: 'daily_goal',
        title: 'Session Pomodoro terminée ! 🎉',
        message: `Félicitations ! Votre session de travail (${currentWorkMin} min) est terminée. Prenez une pause méritée.`,
        severity: 'info',
        linkTab: 'pomodoro',
      });

      // 5. Notification système du navigateur si autorisée
      try {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('Studyflow — Session Pomodoro terminée !', {
            body: `Bravo pour vos ${currentWorkMin} min de concentration ! C'est l'heure de la pause.`,
            icon: '/favicon.ico',
          });
        }
      } catch {}

      // 6. Transition automatique vers la pause
      const isLongBreak = newCycles % 4 === 0;
      const nextMode: PomodoroMode = isLongBreak ? 'long_break' : 'short_break';
      const nextTime = (isLongBreak ? currentLongMin : currentShortMin) * 60;

      modeRef.current = nextMode;
      timeLeftRef.current = nextTime;
      setMode(nextMode);
      setTimeLeft(nextTime);

      saveToStorage({
        mode: nextMode,
        isRunning: false,
        targetEndTime: null,
        timeLeft: nextTime,
        completedCycles: newCycles,
      });
    } else {
      // La pause est terminée, passage au mode travail (pause JAMAIS enregistrée comme étude)
      addReminderRef.current({
        type: 'daily_goal',
        title: 'Pause terminée ! ⏰',
        message: 'Votre temps de pause est écoulé. Prêt à reprendre la concentration ?',
        severity: 'info',
        linkTab: 'pomodoro',
      });

      try {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('Studyflow — Pause terminée !', {
            body: 'Votre pause est terminée. Prêt à reprendre la session de travail ?',
            icon: '/favicon.ico',
          });
        }
      } catch {}

      const nextMode: PomodoroMode = 'work';
      const nextTime = currentWorkMin * 60;

      modeRef.current = nextMode;
      timeLeftRef.current = nextTime;
      setMode(nextMode);
      setTimeLeft(nextTime);

      saveToStorage({
        mode: nextMode,
        isRunning: false,
        targetEndTime: null,
        timeLeft: nextTime,
      });
    }
  };

  // Minuteur global basé sur le timestamp réel
  useEffect(() => {
    if (!isRunning || !targetEndTime) return;

    const tick = () => {
      const target = targetEndTimeRef.current;
      if (!target) return;

      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((target - now) / 1000));

      if (timeLeftRef.current !== remaining) {
        timeLeftRef.current = remaining;
        setTimeLeft(remaining);
      }

      if (remaining <= 0) {
        // Arrêt immédiat pour empêcher tout deuxième déclenchement par intervalle
        isRunningRef.current = false;
        targetEndTimeRef.current = null;
        setIsRunning(false);
        setTargetEndTime(null);
        handlePhaseComplete();
      }
    };

    tick();
    const intervalId = setInterval(tick, 250);

    return () => {
      clearInterval(intervalId);
    };
  }, [isRunning, targetEndTime]);

  // Contrôles
  const togglePlay = () => {
    if (isRunningRef.current) {
      // Mettre en pause
      const target = targetEndTimeRef.current;
      const remaining = target
        ? Math.max(0, Math.ceil((target - Date.now()) / 1000))
        : timeLeftRef.current;

      isRunningRef.current = false;
      targetEndTimeRef.current = null;
      timeLeftRef.current = remaining;

      setIsRunning(false);
      setTargetEndTime(null);
      setTimeLeft(remaining);

      saveToStorage({
        isRunning: false,
        targetEndTime: null,
        timeLeft: remaining,
      });
    } else {
      // Démarrer / Reprendre
      let currentSeconds = timeLeftRef.current;
      const currentMode = modeRef.current;
      const maxSeconds =
        currentMode === 'work'
          ? workMinutesRef.current * 60
          : currentMode === 'short_break'
          ? shortBreakMinutesRef.current * 60
          : longBreakMinutesRef.current * 60;

      if (currentSeconds <= 0) {
        currentSeconds = maxSeconds;
      }

      const target = Date.now() + currentSeconds * 1000;
      isRunningRef.current = true;
      targetEndTimeRef.current = target;
      timeLeftRef.current = currentSeconds;

      setIsRunning(true);
      setTargetEndTime(target);
      setTimeLeft(currentSeconds);

      saveToStorage({
        isRunning: true,
        targetEndTime: target,
        timeLeft: currentSeconds,
      });

      // Demande polie de permission pour les notifications navigateur
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  };

  const start = () => {
    if (!isRunningRef.current) {
      togglePlay();
    }
  };

  const pause = () => {
    if (isRunningRef.current) {
      togglePlay();
    }
  };

  const reset = () => {
    isRunningRef.current = false;
    targetEndTimeRef.current = null;
    setIsRunning(false);
    setTargetEndTime(null);

    const currentMode = modeRef.current;
    const duration =
      currentMode === 'work'
        ? workMinutesRef.current * 60
        : currentMode === 'short_break'
        ? shortBreakMinutesRef.current * 60
        : longBreakMinutesRef.current * 60;

    timeLeftRef.current = duration;
    setTimeLeft(duration);

    saveToStorage({
      isRunning: false,
      targetEndTime: null,
      timeLeft: duration,
    });
  };

  // Termine la session de travail de manière anticipée en comptabilisant exactement le temps étudié
  const finishEarly = () => {
    if (modeRef.current !== 'work') return;
    const elapsedSec = getElapsedWorkSeconds();
    const elapsedMinutes = Math.round(elapsedSec / 60);

    // Arrêt immédiat du minuteur
    isRunningRef.current = false;
    targetEndTimeRef.current = null;
    setIsRunning(false);
    setTargetEndTime(null);

    // Seules les sessions d'au moins 1 minute réelle sont comptabilisées
    if (elapsedSec >= 60 && elapsedMinutes >= 1) {
      recordWorkSession(elapsedMinutes, ' (Anticipée)');

      if (soundEnabledRef.current) {
        try {
          playChime('complete');
        } catch {}
      }
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}

      const newCycles = completedCyclesRef.current + 1;
      completedCyclesRef.current = newCycles;
      setCompletedCycles(newCycles);

      addReminderRef.current({
        type: 'daily_goal',
        title: 'Session enregistrée ! 🎯',
        message: `Vous avez validé ${elapsedMinutes} minute${elapsedMinutes > 1 ? 's' : ''} d’étude. Prenez une pause méritée !`,
        severity: 'info',
        linkTab: 'pomodoro',
      });

      // Transition vers la pause
      const isLongBreak = newCycles % 4 === 0;
      const nextMode: PomodoroMode = isLongBreak ? 'long_break' : 'short_break';
      const nextTime = (isLongBreak ? longBreakMinutesRef.current : shortBreakMinutesRef.current) * 60;

      modeRef.current = nextMode;
      timeLeftRef.current = nextTime;
      setMode(nextMode);
      setTimeLeft(nextTime);

      saveToStorage({
        mode: nextMode,
        isRunning: false,
        targetEndTime: null,
        timeLeft: nextTime,
        completedCycles: newCycles,
      });
    } else {
      // Moins d'une minute d'étude : réinitialisation sans comptabiliser
      const resetTime = workMinutesRef.current * 60;
      timeLeftRef.current = resetTime;
      setTimeLeft(resetTime);
      saveToStorage({
        isRunning: false,
        targetEndTime: null,
        timeLeft: resetTime,
      });
    }
  };

  const skip = () => {
    isRunningRef.current = false;
    targetEndTimeRef.current = null;
    setIsRunning(false);
    setTargetEndTime(null);

    const currentMode = modeRef.current;
    if (currentMode === 'work') {
      const elapsedSec = getElapsedWorkSeconds();
      const elapsedMinutes = Math.round(elapsedSec / 60);

      // Si au moins 1 minute d'étude a été effectuée, l'enregistrer avant de passer en pause
      if (elapsedSec >= 60 && elapsedMinutes >= 1) {
        recordWorkSession(elapsedMinutes);
      }

      const nextMode: PomodoroMode = 'short_break';
      const nextTime = shortBreakMinutesRef.current * 60;
      modeRef.current = nextMode;
      timeLeftRef.current = nextTime;
      setMode(nextMode);
      setTimeLeft(nextTime);
      saveToStorage({
        mode: nextMode,
        isRunning: false,
        targetEndTime: null,
        timeLeft: nextTime,
      });
    } else {
      // Fin de pause (les pauses ne sont JAMAIS comptabilisées)
      const nextMode: PomodoroMode = 'work';
      const nextTime = workMinutesRef.current * 60;
      modeRef.current = nextMode;
      timeLeftRef.current = nextTime;
      setMode(nextMode);
      setTimeLeft(nextTime);
      saveToStorage({
        mode: nextMode,
        isRunning: false,
        targetEndTime: null,
        timeLeft: nextTime,
      });
    }
  };

  const changeMode = (newMode: PomodoroMode) => {
    isRunningRef.current = false;
    targetEndTimeRef.current = null;
    setIsRunning(false);
    setTargetEndTime(null);

    modeRef.current = newMode;
    setMode(newMode);

    const duration =
      newMode === 'work'
        ? workMinutesRef.current * 60
        : newMode === 'short_break'
        ? shortBreakMinutesRef.current * 60
        : longBreakMinutesRef.current * 60;

    timeLeftRef.current = duration;
    setTimeLeft(duration);

    saveToStorage({
      mode: newMode,
      isRunning: false,
      targetEndTime: null,
      timeLeft: duration,
    });
  };

  const handleSetWorkMinutes = (val: number) => {
    workMinutesRef.current = val;
    setWorkMinutes(val);
    if (!isRunningRef.current && modeRef.current === 'work') {
      timeLeftRef.current = val * 60;
      setTimeLeft(val * 60);
    }
    saveToStorage({ workMinutes: val });
  };

  const handleSetShortBreakMinutes = (val: number) => {
    shortBreakMinutesRef.current = val;
    setShortBreakMinutes(val);
    if (!isRunningRef.current && modeRef.current === 'short_break') {
      timeLeftRef.current = val * 60;
      setTimeLeft(val * 60);
    }
    saveToStorage({ shortBreakMinutes: val });
  };

  const handleSetLongBreakMinutes = (val: number) => {
    longBreakMinutesRef.current = val;
    setLongBreakMinutes(val);
    if (!isRunningRef.current && modeRef.current === 'long_break') {
      timeLeftRef.current = val * 60;
      setTimeLeft(val * 60);
    }
    saveToStorage({ longBreakMinutes: val });
  };

  const handleSetSoundEnabled = (val: boolean) => {
    soundEnabledRef.current = val;
    setSoundEnabled(val);
    saveToStorage({ soundEnabled: val });
  };

  const handleSetSelectedSubjectId = (id: string) => {
    selectedSubjectIdRef.current = id;
    setSelectedSubjectId(id);
    saveToStorage({ selectedSubjectId: id });
  };

  const handleSetSelectedProjectId = (id: string) => {
    selectedProjectIdRef.current = id;
    setSelectedProjectId(id);
    saveToStorage({ selectedProjectId: id });
  };

  const handleSetSessionNotes = (notes: string) => {
    sessionNotesRef.current = notes;
    setSessionNotes(notes);
    saveToStorage({ sessionNotes: notes });
  };

  // Format mm:ss
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const currentTotalDuration =
    mode === 'work'
      ? workMinutes * 60
      : mode === 'short_break'
      ? shortBreakMinutes * 60
      : longBreakMinutes * 60;

  const progressPercent =
    currentTotalDuration > 0
      ? Math.max(0, Math.min(100, ((currentTotalDuration - timeLeft) / currentTotalDuration) * 100))
      : 0;

  const elapsedSeconds = mode === 'work' ? Math.max(0, currentTotalDuration - timeLeft) : 0;

  return {
    mode,
    timeLeft,
    isRunning,
    workMinutes,
    shortBreakMinutes,
    longBreakMinutes,
    completedCycles,
    soundEnabled,
    selectedSubjectId,
    selectedProjectId,
    sessionNotes,
    formattedTime,
    progressPercent,
    elapsedSeconds,
    togglePlay,
    start,
    pause,
    reset,
    skip,
    finishEarly,
    setMode: changeMode,
    setWorkMinutes: handleSetWorkMinutes,
    setShortBreakMinutes: handleSetShortBreakMinutes,
    setLongBreakMinutes: handleSetLongBreakMinutes,
    setSoundEnabled: handleSetSoundEnabled,
    setSelectedSubjectId: handleSetSelectedSubjectId,
    setSelectedProjectId: handleSetSelectedProjectId,
    setSessionNotes: handleSetSessionNotes,
  };
}
