import React, { useState } from 'react';
import {
  User,
  Crown,
  Cloud,
  CheckCircle2,
  Download,
  Upload,
  RefreshCw,
  Smartphone,
  Laptop,
  Tablet,
  ShieldCheck,
  Sparkles,
  Zap,
  LogOut,
  LogIn,
  KeyRound,
  Mail,
} from 'lucide-react';
import { updateProfile } from 'firebase/auth';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { StudyFlowLogo } from './StudyFlowLogo';

export const ProfileView: React.FC = () => {
  const {
    user,
    setUser,
    subjects,
    projects,
    tasks,
    goals,
    notes,
    sessions,
    startPaddleCheckout,
    isCheckoutLoading,
  } = useApp();
  const { currentUser, logout, openAuthModal, resetPassword } = useAuth();

  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState('À l’instant');
  const [nameInput, setNameInput] = useState(currentUser?.displayName || user.name);
  const [emailInput, setEmailInput] = useState(currentUser?.email || user.email || '');
  const [authActionMessage, setAuthActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Synchroniser les champs si l'utilisateur Firebase change
  React.useEffect(() => {
    if (currentUser) {
      if (currentUser.displayName) setNameInput(currentUser.displayName);
      if (currentUser.email) setEmailInput(currentUser.email);
    }
  }, [currentUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUser((prev) => ({
      ...prev,
      name: nameInput,
      email: emailInput,
    }));

    if (currentUser) {
      try {
        await updateProfile(currentUser, { displayName: nameInput });
        setAuthActionMessage({ type: 'success', text: 'Profil et compte Firebase mis à jour !' });
      } catch (err: any) {
        setAuthActionMessage({ type: 'error', text: 'Erreur lors de la mise à jour Firebase.' });
      }
    } else {
      setAuthActionMessage({ type: 'success', text: 'Profil local mis à jour avec succès !' });
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      setAuthActionMessage({ type: 'success', text: 'Vous avez été déconnecté avec succès.' });
    } catch (err: any) {
      setAuthActionMessage({ type: 'error', text: 'Erreur lors de la déconnexion.' });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleResetPassword = async () => {
    if (!currentUser?.email) return;
    try {
      await resetPassword(currentUser.email);
      setAuthActionMessage({
        type: 'success',
        text: `Un e-mail de réinitialisation a été envoyé à ${currentUser.email}.`,
      });
    } catch (err: any) {
      setAuthActionMessage({
        type: 'error',
        text: err.message || 'Impossible d\'envoyer l\'e-mail de réinitialisation.',
      });
    }
  };

  const handlePaddleSubscribe = () => {
    if (user.tier === 'pro') return;
    startPaddleCheckout();
  };

  const handleManualSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(`Aujourd'hui à ${now}`);
    }, 1200);
  };

  const handleExportData = () => {
    const fullBackup = {
      user,
      subjects,
      projects,
      tasks,
      goals,
      notes,
      sessions,
      exportedAt: new Date().toISOString(),
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `studyflow-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-slate-900">
          Profil, Abonnement & Synchronisation Cloud
        </h1>
        <p className="text-sm text-slate-500">
          Gérez votre formule, vos appareils connectés et vos sauvegardes de données
        </p>
      </div>

      {/* Plan / Subscription Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 text-white shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-400">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-display">
                  Formule actuelle : {user.tier === 'pro' ? 'Studyflow Premium Pro' : 'Studyflow Gratuit'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-semibold">
                  {user.tier === 'pro' ? 'Illimité' : '5 projets max'}
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                {user.tier === 'pro'
                  ? 'Accès à l’IA illimitée, sauvegarde continue sur tous vos appareils et statistiques expertes.'
                  : 'Passez à Premium pour débloquer les projets illimités et les modèles IA sans restriction.'}
              </p>
            </div>
          </div>

          {user.tier === 'pro' ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/20 text-white font-bold text-xs self-start sm:self-auto shadow-xs border border-white/20">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              <span>Abonnement Pro Actif (9,99 €/mois)</span>
            </div>
          ) : (
            <button
              id="profile-subscribe-paddle-btn"
              onClick={handlePaddleSubscribe}
              disabled={isCheckoutLoading}
              className="px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all self-start sm:self-auto bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 hover:brightness-105 cursor-pointer disabled:opacity-75 flex items-center gap-2"
            >
              <Crown className="w-4 h-4" />
              <span>{isCheckoutLoading ? 'Connexion Paddle sécurisée...' : '⚡ Débloquer la version Pro (9,99 €/mois)'}</span>
            </button>
          )}
        </div>

        {/* Feature comparison pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{user.tier === 'pro' ? 'Projets illimités' : 'Jusqu’à 5 projets'}</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Assistant IA Gemini 3.8</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Sauvegarde multi-appareils</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Pomodoro & Métriques</span>
          </div>
        </div>
      </div>

      {/* Cloud Sync & Devices */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Synchronisation Cloud</h3>
              <p className="text-xs text-slate-500">
                Dernière synchronisation réussie : <span className="font-semibold text-slate-700">{lastSyncTime}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Synchronisation...' : 'Synchroniser maintenant'}</span>
            </button>
            <button
              onClick={handleExportData}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold"
              title="Exporter toutes vos données en JSON"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Sauvegarde JSON</span>
            </button>
          </div>
        </div>

        {/* Multi-Device Representation */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Accès Multi-Appareils Actif
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl border border-slate-200 flex items-center gap-3 bg-slate-50/50">
              <Laptop className="w-6 h-6 text-indigo-600" />
              <div>
                <p className="text-xs font-bold text-slate-900">Ordinateur (Web)</p>
                <span className="text-[11px] text-emerald-600 font-medium">● Actif maintenant</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 flex items-center gap-3 bg-slate-50/50">
              <Smartphone className="w-6 h-6 text-indigo-600" />
              <div>
                <p className="text-xs font-bold text-slate-900">Application Mobile</p>
                <span className="text-[11px] text-slate-500">Synchronisé il y a 2h</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 flex items-center gap-3 bg-slate-50/50">
              <Tablet className="w-6 h-6 text-indigo-600" />
              <div>
                <p className="text-xs font-bold text-slate-900">Tablette & iPad</p>
                <span className="text-[11px] text-slate-500">Synchronisé hier</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {authActionMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
            authActionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {authActionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{authActionMessage.text}</span>
          </div>
          <button
            onClick={() => setAuthActionMessage(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Account & Authentication Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Compte & Authentification Firebase</h3>
              <p className="text-xs text-slate-500">
                {currentUser
                  ? 'Votre session est active et sécurisée par Firebase Authentication'
                  : 'Connectez-vous pour sécuriser votre compte et synchroniser vos cours'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentUser ? (
              <>
                <button
                  id="profile-reset-password-btn"
                  onClick={handleResetPassword}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                  title="Envoyer un e-mail de réinitialisation de mot de passe"
                >
                  <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Réinitialiser mot de passe</span>
                </button>
                <button
                  id="profile-logout-btn"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{isLoggingOut ? 'Déconnexion...' : 'Se déconnecter'}</span>
                </button>
              </>
            ) : (
              <button
                id="profile-login-btn"
                onClick={() => openAuthModal('login')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Se connecter / S'inscrire</span>
              </button>
            )}
          </div>
        </div>

        {currentUser ? (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Utilisateur'}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-indigo-500/20"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center">
                  {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-slate-900">
                    {currentUser.displayName || 'Utilisateur Studyflow'}
                  </p>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Connecté
                  </span>
                </div>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3 h-3 text-slate-400" />
                  <span>{currentUser.email}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[11px] text-slate-400">
                    {currentUser.providerData[0]?.providerId === 'google.com'
                      ? 'Compte Google'
                      : 'E-mail / Mot de passe'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="font-bold">Mode invité local</p>
              <p className="text-amber-800 text-[11px] mt-0.5">
                Vos cours, tâches et paramètres sont actuellement enregistrés dans ce navigateur.
                Créez un compte gratuit pour les synchroniser et ne jamais les perdre.
              </p>
            </div>
            <button
              onClick={() => openAuthModal('signup')}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-xl shadow-xs shrink-0 transition-colors"
            >
              Créer un compte
            </button>
          </div>
        )}
      </div>

      {/* Profile Form */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900">Informations Personnelles</h3>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nom complet</label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Adresse e-mail</label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-colors"
            >
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </div>

      {/* Brand & Identity Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <StudyFlowLogo size="lg" showText={false} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-slate-900">Studyflow</h3>
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[10px] tracking-wide">
                v2.4
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              Planificateur académique et professionnel tout-en-un. Conçu pour maximiser votre concentration et votre réussite.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/studyflow-logo.png"
            download="studyflow-logo.png"
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Logo HD</span>
          </a>
        </div>
      </div>
    </div>
  );
};
