import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StudyFlowLogo } from './StudyFlowLogo';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    login,
    signup,
    loginWithGoogle,
    resetPassword,
    authError,
    clearAuthError,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleClose = () => {
    setLocalError(null);
    setResetSuccessMessage(null);
    clearAuthError();
    closeAuthModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setResetSuccessMessage(null);
    clearAuthError();

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setLocalError('Veuillez saisir une adresse e-mail valide.');
      return;
    }

    if (authModalMode === 'reset') {
      try {
        setIsSubmitting(true);
        await resetPassword(trimmedEmail);
        setResetSuccessMessage(
          `Un e-mail de réinitialisation a été envoyé à ${trimmedEmail}. Vérifiez votre boîte de réception.`
        );
      } catch (err: any) {
        setLocalError(err.message || 'Impossible d\'envoyer l\'e-mail de réinitialisation.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (password.length < 6) {
      setLocalError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    if (authModalMode === 'signup' && !displayName.trim()) {
      setLocalError('Veuillez renseigner votre nom ou prénom.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (authModalMode === 'signup') {
        await signup(trimmedEmail, password, displayName.trim());
      } else {
        await login(trimmedEmail, password);
      }
      handleClose();
    } catch (err: any) {
      setLocalError(err.message || 'Une erreur est survenue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    setResetSuccessMessage(null);
    clearAuthError();
    try {
      setIsSubmitting(true);
      await loginWithGoogle();
      handleClose();
    } catch (err: any) {
      setLocalError(err.message || 'La connexion avec Google a échoué.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="auth-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        id="auth-modal-card"
        className="bg-white w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-8 relative overflow-hidden my-auto max-h-[92vh] overflow-y-auto"
      >
        {/* Close Button */}
        <button
          id="auth-modal-close-btn"
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <StudyFlowLogo size="md" showText={false} />
          </div>
          <h2 className="text-xl font-bold font-display text-slate-900">
            {authModalMode === 'login' && 'Connexion à Studyflow'}
            {authModalMode === 'signup' && 'Créer un compte Studyflow'}
            {authModalMode === 'reset' && 'Mot de passe oublié'}
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            {authModalMode === 'login' && 'Accédez à votre espace d’étude et synchronisez vos cours.'}
            {authModalMode === 'signup' && 'Rejoignez Studyflow pour sauvegarder et synchroniser vos projets.'}
            {authModalMode === 'reset' && 'Saisissez votre e-mail pour recevoir un lien de réinitialisation sécurisé.'}
          </p>
        </div>

        {/* Mode Switch Tabs (only between login & signup) */}
        {authModalMode !== 'reset' && (
          <div className="flex p-1 bg-slate-100 rounded-2xl mb-5">
            <button
              id="auth-tab-login"
              type="button"
              onClick={() => {
                setLocalError(null);
                clearAuthError();
                openAuthModal('login');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                authModalMode === 'login'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Connexion
            </button>
            <button
              id="auth-tab-signup"
              type="button"
              onClick={() => {
                setLocalError(null);
                clearAuthError();
                openAuthModal('signup');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                authModalMode === 'signup'
                  ? 'bg-white text-indigo-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Créer un compte
            </button>
          </div>
        )}

        {/* Google Sign-in Button (only in login or signup mode) */}
        {authModalMode !== 'reset' && (
          <>
            <button
              id="google-signin-btn"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-xs disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continuer avec Google</span>
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-[11px] uppercase tracking-wider text-slate-400">
                <span className="bg-white px-3">ou par e-mail</span>
              </div>
            </div>
          </>
        )}

        {/* Error Alert */}
        {(localError || authError) && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
            <p className="flex-1">{localError || authError}</p>
          </div>
        )}

        {/* Success Alert */}
        {resetSuccessMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <p className="flex-1">{resetSuccessMessage}</p>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {authModalMode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nom complet
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                <input
                  id="auth-signup-name-input"
                  type="text"
                  placeholder="Alexandre Dupont"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Adresse e-mail
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                id="auth-email-input"
                type="email"
                placeholder="votre.email@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {authModalMode !== 'reset' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Mot de passe
                </label>
                {authModalMode === 'login' && (
                  <button
                    id="auth-forgot-password-link"
                    type="button"
                    onClick={() => {
                      setLocalError(null);
                      setResetSuccessMessage(null);
                      clearAuthError();
                      openAuthModal('reset');
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                <input
                  id="auth-password-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Au moins 6 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          <button
            id="auth-submit-btn"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs shadow-indigo-200 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Chargement...</span>
              </>
            ) : (
              <>
                {authModalMode === 'login' && 'Se connecter'}
                {authModalMode === 'signup' && 'Créer mon compte'}
                {authModalMode === 'reset' && 'Envoyer le lien de réinitialisation'}
              </>
            )}
          </button>
        </form>

        {/* Back navigation for Reset Mode */}
        {authModalMode === 'reset' && (
          <div className="mt-4 text-center">
            <button
              id="auth-back-to-login-btn"
              type="button"
              onClick={() => {
                setLocalError(null);
                setResetSuccessMessage(null);
                clearAuthError();
                openAuthModal('login');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour à la connexion</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
