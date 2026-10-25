import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  UserCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../firebase';

export type AuthModalMode = 'login' | 'signup' | 'reset';

export interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isConfigured: boolean;
  authError: string | null;
  clearAuthError: () => void;
  isAuthModalOpen: boolean;
  authModalMode: AuthModalMode;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<UserCredential>;
  signup: (email: string, password: string, displayName?: string) => Promise<UserCredential>;
  loginWithGoogle: () => Promise<UserCredential>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('login');

  const clearAuthError = () => setAuthError(null);

  const openAuthModal = (mode: AuthModalMode = 'login') => {
    setAuthError(null);
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthError(null);
    setIsAuthModalOpen(false);
  };

  useEffect(() => {
    // Si Firebase n'est pas configuré, on libère le loading immédiatement sans bloquer l'application
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setCurrentUser(user);
        setLoading(false);
      },
      (error) => {
        console.error('[AuthContext] Erreur onAuthStateChanged:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const ensureAuthAvailable = () => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error(
        'Firebase n\'est pas encore configuré. Renseignez les variables VITE_FIREBASE_* dans le fichier .env.'
      );
    }
  };

  const login = async (email: string, password: string): Promise<UserCredential> => {
    ensureAuthAvailable();
    setAuthError(null);
    try {
      return await signInWithEmailAndPassword(auth!, email, password);
    } catch (err: any) {
      const message = mapAuthErrorMessage(err?.code || err?.message);
      setAuthError(message);
      throw new Error(message);
    }
  };

  const signup = async (
    email: string,
    password: string,
    displayName?: string
  ): Promise<UserCredential> => {
    ensureAuthAvailable();
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth!, email, password);
      if (displayName && cred.user) {
        await updateProfile(cred.user, { displayName });
        // Rafraîchir l'objet utilisateur en mémoire locale
        setCurrentUser({ ...cred.user, displayName });
      }
      return cred;
    } catch (err: any) {
      console.error('[AuthContext] Erreur lors de la création de compte :', err);
      const message = mapAuthErrorMessage(err?.code || err?.message);
      setAuthError(message);
      throw new Error(message);
    }
  };

  const loginWithGoogle = async (): Promise<UserCredential> => {
    ensureAuthAvailable();
    setAuthError(null);
    try {
      return await signInWithPopup(auth!, googleProvider);
    } catch (err: any) {
      const message = mapAuthErrorMessage(err?.code || err?.message);
      setAuthError(message);
      throw new Error(message);
    }
  };

  const logout = async (): Promise<void> => {
    ensureAuthAvailable();
    setAuthError(null);
    try {
      await signOut(auth!);
    } catch (err: any) {
      const message = mapAuthErrorMessage(err?.code || err?.message);
      setAuthError(message);
      throw new Error(message);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    ensureAuthAvailable();
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth!, email);
    } catch (err: any) {
      const message = mapAuthErrorMessage(err?.code || err?.message);
      setAuthError(message);
      throw new Error(message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        isConfigured: isFirebaseConfigured,
        authError,
        clearAuthError,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        login,
        signup,
        loginWithGoogle,
        logout,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
};

/**
 * Traduction conviviale des erreurs Firebase Auth
 */
function mapAuthErrorMessage(codeOrMessage: string): string {
  if (codeOrMessage.includes('user-not-found') || codeOrMessage.includes('wrong-password') || codeOrMessage.includes('invalid-credential')) {
    return 'Adresse e-mail ou mot de passe incorrect.';
  }
  if (codeOrMessage.includes('email-already-in-use')) {
    return 'Un compte existe déjà avec cette adresse e-mail. Essayez de vous connecter.';
  }
  if (codeOrMessage.includes('weak-password')) {
    return 'Le mot de passe doit comporter au moins 6 caractères.';
  }
  if (codeOrMessage.includes('invalid-email')) {
    return 'Format d\'adresse e-mail invalide.';
  }
  if (codeOrMessage.includes('popup-closed-by-user')) {
    return 'La fenêtre de connexion Google a été fermée avant la validation.';
  }
  if (codeOrMessage.includes('popup-blocked')) {
    return 'La fenêtre popup de connexion a été bloquée par le navigateur.';
  }
  if (codeOrMessage.includes('too-many-requests')) {
    return 'Trop de tentatives infructueuses. Veuillez patienter un instant avant de réessayer.';
  }
  if (codeOrMessage.includes('network-request-failed')) {
    return 'Erreur de connexion réseau. Vérifiez votre accès à Internet.';
  }
  if (codeOrMessage.includes('operation-not-allowed')) {
    return 'La création de compte par e-mail/mot de passe n\'est pas encore activée dans la console Firebase (Authentication > Sign-in method > Adresse e-mail/mot de passe).';
  }
  if (codeOrMessage.includes('unauthorized-domain')) {
    return 'Ce domaine d\'application n\'est pas encore autorisé dans Firebase (Authentication > Paramètres > Domaines autorisés).';
  }
  if (codeOrMessage.includes('api-key-not-valid')) {
    return 'La clé API Firebase spécifiée n\'est pas valide.';
  }
  return codeOrMessage || 'Une erreur d\'authentification est survenue.';
}
