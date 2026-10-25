import { auth } from '../firebase';

/**
 * Récupère les en-têtes nécessaires pour appeler les endpoints IA sécurisés.
 * Inclut le jeton JWT Firebase (ID Token) de l'utilisateur actuellement connecté.
 */
export async function getAiAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth?.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('[API] Impossible de récupérer le token Firebase:', err);
    }
  }

  return headers;
}
