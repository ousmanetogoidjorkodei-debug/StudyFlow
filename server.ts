import express from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { Paddle, Environment } from '@paddle/paddle-node-sdk';
import { GoogleAuth } from 'google-auth-library';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// --- Security & Input Sanitization Helpers ---
function sanitizeString(input: unknown, maxLength = 300, defaultValue = ''): string {
  if (typeof input !== 'string') return defaultValue;
  // Strip non-printable control characters except newline and tab
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, maxLength);
}

function sanitizeNumber(input: unknown, min: number, max: number, defaultValue: number): number {
  const num = Number(input);
  if (isNaN(num)) return defaultValue;
  return Math.min(Math.max(num, min), max);
}

function sanitizeError(err: any): string {
  const msg = err?.message || String(err);
  // Redact any Google, Stripe, or Paddle API key pattern if present in error message
  return msg
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_GOOGLE_API_KEY]')
    .replace(/sk_(test|live)_[0-9a-zA-Z]{24,}/g, '[REDACTED_STRIPE_KEY]')
    .replace(/whsec_[0-9a-zA-Z]{24,}/g, '[REDACTED_STRIPE_WEBHOOK]')
    .replace(/paddlesec_[0-9a-zA-Z]{24,}/g, '[REDACTED_PADDLE_KEY]')
    .replace(/paddletxn_[0-9a-zA-Z]{24,}/g, '[REDACTED_PADDLE_TXN]');
}

// --- Paddle Client Lazy Initialization ---
let paddleClient: Paddle | null = null;
function getPaddle(): Paddle | null {
  const apiKey = process.env.PADDLE_API_KEY;
  if (!apiKey) return null;
  if (!paddleClient) {
    const environment = process.env.PADDLE_ENVIRONMENT === 'production'
      ? Environment.production
      : Environment.sandbox;
    paddleClient = new Paddle(apiKey, { environment });
  }
  return paddleClient;
}

// Store mémoire sécurisé des abonnements vérifiés (mise en cache serveur instantanée)
interface VerifiedBillingSub {
  tier: 'free' | 'pro';
  status: string;
  provider: 'paddle' | 'stripe';
  customerId?: string;
  subscriptionId?: string;
  priceId?: string;
  currentPeriodEnd?: string;
  updatedAt: number;
}
const verifiedBillingSubscriptions = new Map<string, VerifiedBillingSub>();

// Helper serveur pour mettre à jour Firestore users/{uid} suite à confirmation Paddle
async function updateFirestoreUserBilling(
  uid: string,
  data: {
    tier: 'free' | 'pro';
    subscriptionStatus: string;
    billingProvider?: 'paddle' | 'stripe';
    billingCustomerId?: string;
    billingSubscriptionId?: string;
    billingPriceId?: string;
    billingCurrentPeriodEnd?: string;
  }
): Promise<boolean> {
  const provider = data.billingProvider || 'paddle';
  // Enregistrement immédiat dans le cache vérifié en mémoire
  verifiedBillingSubscriptions.set(uid, {
    tier: data.tier,
    status: data.subscriptionStatus,
    provider,
    customerId: data.billingCustomerId,
    subscriptionId: data.billingSubscriptionId,
    priceId: data.billingPriceId,
    currentPeriodEnd: data.billingCurrentPeriodEnd,
    updatedAt: Date.now(),
  });

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'studyflow-app-31dcf';
  try {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/datastore'],
    });
    const accessToken = await auth.getAccessToken();
    if (!accessToken) {
      console.warn('[Firestore Server] Impossible d’obtenir un jeton d’accès Datastore/Firestore.');
      return false;
    }

    const fieldMasks: string[] = ['tier', 'subscriptionStatus', 'billingProvider'];
    const fields: Record<string, any> = {
      tier: { stringValue: data.tier },
      subscriptionStatus: { stringValue: data.subscriptionStatus },
      billingProvider: { stringValue: provider },
    };

    if (data.billingCustomerId) {
      fieldMasks.push('billingCustomerId');
      fields.billingCustomerId = { stringValue: data.billingCustomerId };
    }
    if (data.billingSubscriptionId) {
      fieldMasks.push('billingSubscriptionId');
      fields.billingSubscriptionId = { stringValue: data.billingSubscriptionId };
    }
    if (data.billingPriceId) {
      fieldMasks.push('billingPriceId');
      fields.billingPriceId = { stringValue: data.billingPriceId };
    }
    if (data.billingCurrentPeriodEnd) {
      fieldMasks.push('billingCurrentPeriodEnd');
      fields.billingCurrentPeriodEnd = { stringValue: data.billingCurrentPeriodEnd };
    }

    const maskParams = fieldMasks.map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`).join('&');
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}?${maskParams}`;

    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[Firestore Server] Erreur lors de la mise à jour users/${uid} (${res.status}):`, errText);
      return false;
    }

    console.log(`[Firestore Server] users/${uid} synchronisé avec succès : tier=${data.tier}, status=${data.subscriptionStatus} (Paddle)`);
    return true;
  } catch (err: any) {
    console.warn('[Firestore Server] Exception mise à jour Firestore:', sanitizeError(err));
    return false;
  }
}

// Store des identifiants d'événements Paddle traités pour idempotence stricte
const processedPaddleEvents = new Set<string>();

// Helper pour extraire le firebaseUid d'un objet Paddle
function extractFirebaseUid(data: any): string | undefined {
  if (!data) return undefined;
  const custom = data.custom_data || data.customData;
  if (custom?.firebaseUid && typeof custom.firebaseUid === 'string') {
    return custom.firebaseUid;
  }
  if (custom?.firebase_uid && typeof custom.firebase_uid === 'string') {
    return custom.firebase_uid;
  }
  return undefined;
}

// ==========================================================================
// 1. ROUTE WEBHOOK PADDLE BILLING OFFICIELLE (Signature HMAC obligatoire)
// Monte express.raw avant express.json pour garantir un Buffer non altéré
// ==========================================================================
app.post(
  '/api/paddle/webhook',
  express.raw({ type: '*/*' }),
  async (req, res) => {
    const paddle = getPaddle();
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;

    if (!paddle || !webhookSecret) {
      console.error('[Paddle Webhook] Erreur : PADDLE_API_KEY ou PADDLE_WEBHOOK_SECRET est manquant.');
      return res.status(500).send('Webhook non configuré.');
    }

    const sig = (req.headers['paddle-signature'] || req.headers['Paddle-Signature']) as string | undefined;
    if (!sig) {
      console.warn('[Paddle Webhook] Requête rejetée : en-tête paddle-signature manquant.');
      return res.status(400).send('Signature Paddle manquante.');
    }

    const rawBodyBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from((req as any).rawBody || '');
    if (!rawBodyBuffer || rawBodyBuffer.length === 0) {
      console.warn('[Paddle Webhook] Corps brut de requête manquant pour vérification de signature.');
      return res.status(400).send('Payload brut manquant.');
    }

    const rawBody = rawBodyBuffer.toString('utf-8');

    // Validation cryptographique de la signature Paddle HMAC
    try {
      const isValid = await paddle.webhooks.isSignatureValid(rawBody, webhookSecret, sig);
      if (!isValid) {
        console.warn('[Paddle Webhook] Signature invalide rejetée.');
        return res.status(400).send('Signature invalide.');
      }
    } catch (err: any) {
      console.error('[Paddle Webhook] Échec de validation de signature :', sanitizeError(err));
      return res.status(400).send('Erreur lors de la validation de signature.');
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch (err) {
      console.warn('[Paddle Webhook] Format JSON invalide.');
      return res.status(400).send('Format JSON invalide.');
    }

    const eventId = event.event_id || event.eventId || event.id;
    const eventType = event.event_type || event.eventType;
    const eventData = event.data || {};

    if (!eventType) {
      console.warn('[Paddle Webhook] Type d’événement manquant.');
      return res.status(400).send('Type d’événement manquant.');
    }

    // Idempotence : si l'événement a déjà été traité, répondre 200 immédiatement
    if (eventId && processedPaddleEvents.has(eventId)) {
      console.log(`[Paddle Webhook] Événement déjà traité [${eventId}], acquittement immédiat.`);
      return res.status(200).json({ received: true, alreadyProcessed: true });
    }

    console.log(`[Paddle Webhook] Événement signé et vérifié : ${eventType} [${eventId || 'no-id'}]`);

    try {
      let firebaseUid = extractFirebaseUid(eventData);
      const customerId = eventData.customer_id || eventData.customerId;
      const subscriptionId = (eventType.startsWith('subscription.') ? eventData.id : (eventData.subscription_id || eventData.subscriptionId)) || undefined;
      const status = eventData.status;

      // Si le firebaseUid n'est pas directement dans custom_data, chercher dans le customer Paddle
      if (!firebaseUid && customerId && paddle) {
        try {
          const cust = await paddle.customers.get(customerId);
          firebaseUid = extractFirebaseUid(cust);
        } catch (e) {
          console.warn('[Paddle Webhook] Impossible de récupérer le customer Paddle :', sanitizeError(e));
        }
      }

      // Traitement des types d'événements
      if (eventType.startsWith('subscription.')) {
        if (firebaseUid) {
          const priceId = eventData.items?.[0]?.price?.id || eventData.items?.[0]?.price_id;
          const periodEnd = eventData.current_billing_period?.ends_at || eventData.currentBillingPeriod?.endsAt;

          if (eventType === 'subscription.activated' || eventType === 'subscription.created' || eventType === 'subscription.resumed' || eventType === 'subscription.updated') {
            const isActive = status === 'active' || status === 'trialing';
            const tier = isActive ? 'pro' : 'free';
            console.log(`[Paddle Webhook] Abonnement UID=${firebaseUid} : statut=${status} -> tier=${tier}`);
            await updateFirestoreUserBilling(firebaseUid, {
              tier,
              subscriptionStatus: status || 'active',
              billingProvider: 'paddle',
              billingCustomerId: customerId,
              billingSubscriptionId: subscriptionId,
              billingPriceId: priceId,
              billingCurrentPeriodEnd: periodEnd,
            });
          } else if (eventType === 'subscription.past_due') {
            console.warn(`[Paddle Webhook] Abonnement en retard de paiement (past_due) pour UID=${firebaseUid}.`);
            await updateFirestoreUserBilling(firebaseUid, {
              tier: 'free',
              subscriptionStatus: 'past_due',
              billingProvider: 'paddle',
              billingCustomerId: customerId,
              billingSubscriptionId: subscriptionId,
            });
          } else if (eventType === 'subscription.paused') {
            console.log(`[Paddle Webhook] Abonnement mis en pause pour UID=${firebaseUid}.`);
            await updateFirestoreUserBilling(firebaseUid, {
              tier: 'free',
              subscriptionStatus: 'paused',
              billingProvider: 'paddle',
              billingCustomerId: customerId,
              billingSubscriptionId: subscriptionId,
            });
          } else if (eventType === 'subscription.canceled') {
            console.log(`[Paddle Webhook] Abonnement résilié pour UID=${firebaseUid}. Statut Free appliqué.`);
            await updateFirestoreUserBilling(firebaseUid, {
              tier: 'free',
              subscriptionStatus: 'canceled',
              billingProvider: 'paddle',
              billingCustomerId: customerId,
              billingSubscriptionId: subscriptionId,
            });
          }
        } else {
          console.warn(`[Paddle Webhook] Événement ${eventType} reçu sans association Firebase UID.`);
        }
      } else if (eventType === 'transaction.completed' || eventType === 'transaction.paid') {
        if (firebaseUid) {
          console.log(`[Paddle Webhook] Transaction validée pour UID=${firebaseUid}. Attribution du statut Pro.`);
          await updateFirestoreUserBilling(firebaseUid, {
            tier: 'pro',
            subscriptionStatus: 'active',
            billingProvider: 'paddle',
            billingCustomerId: customerId,
            billingSubscriptionId: subscriptionId,
          });
        }
      } else if (eventType === 'transaction.payment_failed') {
        if (firebaseUid) {
          console.warn(`[Paddle Webhook] Échec de paiement transaction pour UID=${firebaseUid}.`);
        }
      }

      // Mémoriser l'ID traité pour l'idempotence
      if (eventId) {
        processedPaddleEvents.add(eventId);
        if (processedPaddleEvents.size > 2000) {
          const first = processedPaddleEvents.values().next().value;
          if (first) processedPaddleEvents.delete(first);
        }
      }

      return res.status(200).json({ received: true });
    } catch (err: any) {
      console.error(`[Paddle Webhook] Erreur traitement événement ${eventType} :`, sanitizeError(err));
      return res.status(500).json({ error: 'Erreur interne traitement webhook.' });
    }
  }
);

// Defensive limit on incoming JSON payloads to prevent DoS & capture raw body for safety
app.use(
  express.json({
    limit: '200kb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);


// Initialize Google GenAI lazily or with graceful fallback
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasGeminiKey: !!process.env.GEMINI_API_KEY });
});

// Candidate models in preference order
const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
];

// Helper to safely parse JSON from model response
function safeParseJson(rawText: string | undefined): any {
  if (!rawText) return null;
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned);
}

// Resilient wrapper: retries with exponential backoff & falls back across available flash models
async function generateContentWithFallbackAndRetry(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
    preferredModel?: string;
  }
): Promise<{ text: string; modelUsed: string }> {
  const modelsToTry = params.preferredModel
    ? [params.preferredModel, ...CANDIDATE_MODELS.filter((m) => m !== params.preferredModel)]
    : CANDIDATE_MODELS;

  let lastError: any = null;

  for (const model of modelsToTry) {
    const maxRetries = 2;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });

        if (response && response.text) {
          return { text: response.text, modelUsed: model };
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const status = err?.status || err?.code;
        const isTransient =
          status === 503 ||
          status === 429 ||
          status === 500 ||
          errMsg.includes('503') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('high demand') ||
          errMsg.includes('temporarily') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('overloaded');

        if (isTransient && attempt < maxRetries) {
          const delayMs = (attempt + 1) * 800 + Math.random() * 400;
          console.warn(`[Gemini API] Modèle ${model} temporairement surchargé. Nouvelle tentative (${attempt + 1}/${maxRetries}) dans ${Math.round(delayMs)}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }

        // If retries for this model are exhausted or non-transient, switch to fallback model
        console.warn(`[Gemini API] Bascule vers modèle alternatif suite à indisponibilité de ${model}`);
        break;
      }
    }
  }

  throw lastError || new Error('Tous les modèles Gemini sont temporairement saturés.');
}

// --- Dynamic Fallback Generators (High-Availability Engine) ---

function generateFallbackRevisionPlan(subjects: any[], targetHoursPerDay: number, examDate: string, notes?: string) {
  const hours = targetHoursPerDay || 3;
  const validSubjects = Array.isArray(subjects) && subjects.length > 0
    ? subjects
    : [{ name: 'Général', unmasteredChapters: ['Synthèse de cours', 'Exercices d’application'] }];

  const schedule: any[] = [];
  let day = 1;
  const techniques = [
    'Pomodoro (25/5) & exercices d’application ciblés',
    'Évocation active sur feuille blanche & fiches mémo',
    'Répétition espacée & correction d’annales',
    'Examen blanc chronométré & auto-évaluation',
    'Interleaving (alternance de 2 matières) & synthèse',
  ];

  validSubjects.forEach((sub: any) => {
    const chapters = Array.isArray(sub.unmasteredChapters) && sub.unmasteredChapters.length > 0
      ? sub.unmasteredChapters
      : ['Chapitres fondamentaux', 'Notions prioritaires'];

    chapters.slice(0, 3).forEach((ch: string, idx: number) => {
      schedule.push({
        dayNumber: day,
        focusSubject: sub.name || 'Matière',
        chaptersToReview: ch,
        recommendedDurationMinutes: Math.min(hours * 60, 120),
        technique: techniques[(day - 1) % techniques.length],
      });
      day++;
    });
  });

  return {
    summary: `Programme de révision optimisé sur ${schedule.length} jours avec alternance stratégique des matières et sessions de ${hours}h/jour.`,
    totalEstimatedHours: schedule.length * hours,
    schedule,
    studyTips: [
      'Appliquez des blocs Pomodoro de 25 minutes suivis de 5 minutes de pause déconnectée.',
      'Privilégiez le testing effect (s’interroger sans le cours sous les yeux) pour décupler l’ancrage mnésique.',
      'Revenez sur les erreurs des exercices 24h et 72h après pour consolider la mémoire à long terme.',
    ],
    isFallback: true,
  };
}

function generateFallbackProjectBreakdown(title: string, description?: string, deadline?: string, category?: string) {
  return {
    estimatedTotalHours: 24,
    feasibilityScore: 8,
    milestones: [
      'Cadrage & Spécifications',
      'Conception & Architecture',
      'Réalisation & Intégration',
      'Validation & Rendu final',
    ],
    tasks: [
      {
        title: `Cadrage des objectifs : ${title}`,
        priority: 'high',
        estimatedHours: 4,
        milestone: 'Cadrage & Spécifications',
      },
      {
        title: 'Recherche documentaire et structuration du livrable',
        priority: 'medium',
        estimatedHours: 5,
        milestone: 'Conception & Architecture',
      },
      {
        title: 'Développement / Rédaction des sections prioritaires',
        priority: 'urgent',
        estimatedHours: 10,
        milestone: 'Réalisation & Intégration',
      },
      {
        title: 'Relecture, tests et préparation de la soutenance',
        priority: 'high',
        estimatedHours: 5,
        milestone: 'Validation & Rendu final',
      },
    ],
    riskFactors: [
      'Risque de dispersion si le périmètre n’est pas gelé dès le jalon 1',
      'Prévoir une marge de sécurité de 2 jours avant l’échéance',
    ],
    isFallback: true,
  };
}

function generateFallbackPriorityOptimization(tasks: any[], projects: any[], subjects: any[]) {
  const pendingTasks = Array.isArray(tasks) ? tasks.filter((t) => !t.completed) : [];
  const suggestedOrder = pendingTasks.map((t, idx) => ({
    taskId: t.id,
    priorityRank: idx + 1,
    reason: t.priority === 'urgent'
      ? 'Échéance immédiate à fort impact'
      : t.priority === 'high'
      ? 'Tâche charnière débloquant le reste du travail'
      : 'Progression continue régulière',
  }));

  const smartAlerts = [
    'Concentrez vos séances matinales sur les tâches à plus haute valeur cognitive.',
    'Pensez à fractionner les sessions de plus de 90 minutes avec des pauses régulières.',
  ];

  if (Array.isArray(subjects) && subjects.some((s) => s.examDate)) {
    smartAlerts.unshift('Une ou plusieurs dates d’examen approchent : bloquez vos créneaux de révision active en début de semaine.');
  }

  return {
    diagnosis: `Charge globale analysée : ${pendingTasks.length} tâche(s) en attente. Planification ordonnée selon la matrice d’Eisenhower.`,
    suggestedOrder,
    smartAlerts,
    coachAdvice: 'Règle des 2 minutes : exécutez immédiatement les micro-tâches, puis lancez un Pomodoro sur la tâche classée au rang 1.',
    isFallback: true,
  };
}

function generateFallbackFlashcard(subjectName: string, chapterTitle: string) {
  return {
    title: `Fiche de révision : ${chapterTitle}`,
    keyPoints: [
      `Maîtriser les définitions fondamentales et les théorèmes clés associés à ${chapterTitle}.`,
      `Identifier les cas d'application typiques et les pièges classiques rencontrés en ${subjectName}.`,
      'Systématiser la démarche de résolution : hypothèses, formulation mathématique/conceptuelle, conclusion.',
      'S’entraîner sur les exercices types chronométrés pour acquérir des automatismes d’examen.',
    ],
    essentialFormulasOrRules: [
      'Vérifier rigoureusement les conditions de validité avant d’appliquer toute formule.',
      'Contrôler la cohérence dimensionnelle et l’ordre de grandeur du résultat final.',
      'Soigner la rédaction et expliciter clairement chaque étape intermédiaire.',
    ],
    quizQuestions: [
      {
        question: `Quelle est la notion centrale à retenir dans "${chapterTitle}" ?`,
        answer: `C'est le concept pivot qui relie la théorie aux applications concrètes du cours de ${subjectName}.`,
      },
      {
        question: `Quelle est la méthode recommandée pour mémoriser durablement ce chapitre ?`,
        answer: 'La restitution active : fermer son cours et expliciter le plan et les formules de mémoire.',
      },
      {
        question: `Que faire immédiatement après avoir résolu un exercice de "${chapterTitle}" ?`,
        answer: 'Analyser l’erreur éventuelle et noter l’astuce de résolution sur sa fiche mémo.',
      },
    ],
    isFallback: true,
  };
}

// --- Rate Limiter for AI endpoints ---
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const aiRateLimitStore = new Map<string, RateLimitRecord>();

function checkAiRateLimit(key: string, limit = 20, windowMs = 60000): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = aiRateLimitStore.get(key);
  if (!record || now > record.resetAt) {
    aiRateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (record.count >= limit) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }
  record.count++;
  return { allowed: true };
}

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of aiRateLimitStore.entries()) {
    if (now > record.resetAt) {
      aiRateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// --- Firebase Pro Auth Verification ---
interface AuthenticatedUser {
  uid: string;
  email?: string;
  tier: 'free' | 'pro';
}

interface CachedAuth {
  user: AuthenticatedUser;
  expiresAt: number;
}
const authVerificationCache = new Map<string, CachedAuth>();

async function verifyFirebaseProUser(idToken: string): Promise<{
  success: boolean;
  user?: AuthenticatedUser;
  errorStatus?: number;
  errorMessage?: string;
  errorCode?: string;
}> {
  const now = Date.now();
  const cached = authVerificationCache.get(idToken);
  if (cached && now < cached.expiresAt) {
    if (cached.user.tier !== 'pro') {
      return {
        success: false,
        errorStatus: 403,
        errorMessage: 'Cette fonctionnalité d’intelligence artificielle est réservée aux membres Studyflow Pro.',
        errorCode: 'PREMIUM_REQUIRED',
      };
    }
    return { success: true, user: cached.user };
  }

  const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'studyflow-app-31dcf';

  if (!apiKey) {
    return {
      success: false,
      errorStatus: 500,
      errorMessage: 'Configuration serveur d’authentification manquante.',
      errorCode: 'SERVER_CONFIG_ERROR',
    };
  }

  // 1. Verify token validity via Google Identity Toolkit
  let uid = '';
  let email: string | undefined = undefined;
  let customAttributes: string | undefined = undefined;

  try {
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!lookupRes.ok) {
      const errData: any = await lookupRes.json().catch(() => ({}));
      const msg = errData?.error?.message;
      return {
        success: false,
        errorStatus: 401,
        errorMessage: 'Jeton d’authentification invalide ou expiré. Veuillez vous reconnecter.',
        errorCode: msg || 'INVALID_TOKEN',
      };
    }

    const lookupData: any = await lookupRes.json();
    const userRecord = lookupData.users?.[0];
    if (!userRecord || !userRecord.localId) {
      return {
        success: false,
        errorStatus: 401,
        errorMessage: 'Utilisateur introuvable pour ce jeton.',
        errorCode: 'USER_NOT_FOUND',
      };
    }

    uid = userRecord.localId;
    email = userRecord.email;
    customAttributes = userRecord.customAttributes;
  } catch (err: any) {
    console.error('[Auth] Erreur de vérification Google Identity:', sanitizeError(err));
    return {
      success: false,
      errorStatus: 502,
      errorMessage: 'Service d’authentification temporairement inaccessible.',
      errorCode: 'AUTH_SERVICE_UNAVAILABLE',
    };
  }

  // 2. Fetch User Profile from Firestore using verified user token
  let tier: 'free' | 'pro' = 'free';
  try {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;
    const firestoreRes = await fetch(firestoreUrl, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (firestoreRes.ok) {
      const docData: any = await firestoreRes.json();
      const firestoreTier = docData?.fields?.tier?.stringValue;
      if (firestoreTier === 'pro') {
        tier = 'pro';
      }
    }
  } catch (err) {
    console.warn('[Auth] Impossible de lire le document utilisateur Firestore:', sanitizeError(err));
  }

  // Vérification de priorité : cache mémoire vérifié par webhook Paddle
  const verifiedSub = verifiedBillingSubscriptions.get(uid);
  if (verifiedSub && verifiedSub.tier === 'pro' && (verifiedSub.status === 'active' || verifiedSub.status === 'trialing')) {
    tier = 'pro';
  }

  // Fallback check on Firebase Custom Claims (e.g. from Paddle/Stripe webhook)
  if (tier !== 'pro' && customAttributes) {
    try {
      const custom = JSON.parse(customAttributes);
      if (custom.tier === 'pro' || custom.paddleRole === 'pro' || custom.stripeRole === 'pro') {
        tier = 'pro';
      }
    } catch {}
  }

  const authUser: AuthenticatedUser = { uid, email, tier };
  // Cache for 30 seconds
  authVerificationCache.set(idToken, { user: authUser, expiresAt: now + 30000 });

  if (tier !== 'pro') {
    return {
      success: false,
      errorStatus: 403,
      errorMessage: 'Cette fonctionnalité d’intelligence artificielle est réservée aux abonnés Studyflow Premium (Pro). Passez à la formule Pro pour débloquer l’IA.',
      errorCode: 'PREMIUM_REQUIRED',
    };
  }

  return { success: true, user: authUser };
}

/**
 * Valide le jeton Firebase ID auprès de Google Identity Toolkit
 * sans exiger le statut Pro (utilisé pour les endpoints publics authentifiés comme Checkout)
 */
async function verifyFirebaseToken(idToken: string): Promise<{
  success: boolean;
  uid?: string;
  email?: string;
  errorStatus?: number;
  errorMessage?: string;
}> {
  const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      errorStatus: 500,
      errorMessage: 'Configuration serveur d’authentification manquante.',
    };
  }
  try {
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!lookupRes.ok) {
      const errData: any = await lookupRes.json().catch(() => ({}));
      return {
        success: false,
        errorStatus: 401,
        errorMessage: errData?.error?.message || 'Jeton d’authentification invalide ou expiré.',
      };
    }
    const data: any = await lookupRes.json();
    const user = data.users?.[0];
    if (!user || !user.localId) {
      return {
        success: false,
        errorStatus: 401,
        errorMessage: 'Utilisateur introuvable pour ce jeton.',
      };
    }
    return {
      success: true,
      uid: user.localId,
      email: user.email,
    };
  } catch (err: any) {
    return {
      success: false,
      errorStatus: 502,
      errorMessage: 'Service d’authentification temporairement indisponible.',
    };
  }
}

/**
 * Middleware vérifiant :
 * 1. La présence et la validité du Firebase ID Token
 * 2. Que l'utilisateur possède le statut Premium (Pro) dans Firestore ou Custom Claims
 * 3. La limitation de débit (rate limiting) pour prévenir les attaques DoS
 */
async function requirePremiumAiUser(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  // Rate limiting by client IP
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const rateCheck = checkAiRateLimit(clientIp, 25, 60000);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: 'Trop de requêtes vers l’IA. Veuillez patienter avant de faire une nouvelle demande.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: rateCheck.retryAfter,
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentification requise. Connectez-vous avec un compte Premium pour utiliser l’intelligence artificielle Studyflow.',
      code: 'UNAUTHENTICATED',
    });
  }

  const idToken = authHeader.substring(7).trim();
  if (!idToken) {
    return res.status(401).json({
      error: 'Jeton d’authentification manquant.',
      code: 'UNAUTHENTICATED',
    });
  }

  const result = await verifyFirebaseProUser(idToken);
  if (!result.success) {
    return res.status(result.errorStatus || 403).json({
      error: result.errorMessage || 'Accès réservé aux membres Premium.',
      code: result.errorCode || 'ACCESS_DENIED',
    });
  }

  (req as any).user = result.user;
  next();
}

// 1. AI Revision Plan Generator
app.post('/api/ai/revision-plan', requirePremiumAiUser, async (req, res) => {
  // Input validation & sanitization
  const rawSubjects = Array.isArray(req.body.subjects) ? req.body.subjects : [];
  const subjects = rawSubjects.slice(0, 15).map((sub: any) => ({
    name: sanitizeString(sub?.name, 100, 'Matière'),
    unmasteredChapters: Array.isArray(sub?.unmasteredChapters)
      ? sub.unmasteredChapters.slice(0, 10).map((ch: any) => sanitizeString(ch, 120)).filter(Boolean)
      : [],
    chapters: Array.isArray(sub?.chapters)
      ? sub.chapters.slice(0, 15).map((ch: any) => ({
          title: sanitizeString(ch?.title, 120),
          mastered: Boolean(ch?.mastered),
        }))
      : undefined,
  }));
  const targetHoursPerDay = sanitizeNumber(req.body.targetHoursPerDay, 1, 14, 3);
  const examDate = sanitizeString(req.body.examDate, 30, 'Prochainement');
  const notes = sanitizeString(req.body.notes, 500, 'Aucune');

  const ai = getGenAI();

  if (!ai) {
    const fallback = generateFallbackRevisionPlan(subjects, targetHoursPerDay, examDate, notes);
    return res.json(fallback);
  }

  try {
    const prompt = `Tu es un tuteur expert en organisation des études et sciences de l'apprentissage (méthode de répétition espacée, révision active, Pomodoro).
Crée un programme de révision personnalisé et ultra structuré basé sur les données suivantes :
- Matières et chapitres : ${JSON.stringify(subjects)}
- Heures disponibles par jour : ${targetHoursPerDay}h
- Date d'examen ou échéance principale : ${examDate}
- Informations complémentaires : ${notes}

Fournis une réponse JSON contenant :
- summary: résumé du plan et stratégie recommandée (2-3 phrases)
- totalEstimatedHours: nombre total d'heures estimé
- schedule: liste de jours (chaque jour contient "dayNumber", "focusSubject", "chaptersToReview", "recommendedDurationMinutes", "technique")
- studyTips: 3 conseils méthodologiques ciblés pour maximiser la rétention.`;

    const result = await generateContentWithFallbackAndRetry(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            totalEstimatedHours: { type: Type.NUMBER },
            schedule: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayNumber: { type: Type.INTEGER },
                  focusSubject: { type: Type.STRING },
                  chaptersToReview: { type: Type.STRING },
                  recommendedDurationMinutes: { type: Type.INTEGER },
                  technique: { type: Type.STRING },
                },
                required: ['dayNumber', 'focusSubject', 'chaptersToReview', 'recommendedDurationMinutes'],
              },
            },
            studyTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['summary', 'schedule', 'studyTips'],
        },
      },
    });

    const parsed = safeParseJson(result.text);
    if (parsed && parsed.schedule) {
      return res.json({ ...parsed, modelUsed: result.modelUsed });
    }
    throw new Error('Réponse JSON incomplète reçue du modèle.');
  } catch (error: any) {
    console.warn('[revision-plan] Bascule sur le générateur heuristique haute disponibilité:', sanitizeError(error));
    const fallback = generateFallbackRevisionPlan(subjects, targetHoursPerDay, examDate, notes);
    return res.json(fallback);
  }
});

// 2. AI Project Breakdown & Estimation
app.post('/api/ai/project-breakdown', requirePremiumAiUser, async (req, res) => {
  const title = sanitizeString(req.body.title, 150, '');
  if (!title) {
    return res.status(400).json({ error: 'Le titre du projet est requis et doit être valide.' });
  }
  const description = sanitizeString(req.body.description, 800, 'Non précisée');
  const deadline = sanitizeString(req.body.deadline, 30, '3 semaines');
  const category = sanitizeString(req.body.category, 50, 'Général');

  const ai = getGenAI();

  if (!ai) {
    const fallback = generateFallbackProjectBreakdown(title, description, deadline, category);
    return res.json(fallback);
  }

  try {
    const prompt = `Tu es un chef de projet senior et coach en productivité.
Découpe le projet suivant en étapes logiques, jalons clés et sous-tâches concrètes avec estimation horaire :
- Titre : ${title}
- Description : ${description}
- Échéance : ${deadline}
- Domaine / Catégorie : ${category}

Génère une réponse JSON :
- estimatedTotalHours: estimation totale d'heures réaliste
- feasibilityScore: évaluation de faisabilité de 1 à 10
- milestones: liste des jalons majeurs (ex: 'Conception', 'Développement', 'Tests / Relecture', 'Livraison')
- tasks: liste de 4 à 8 sous-tâches concrètes avec :
  - title (nom clair de la tâche)
  - priority ('urgent' | 'high' | 'medium' | 'low')
  - estimatedHours (nombre d'heures)
  - milestone (jalon associé)
- riskFactors: 2 ou 3 risques d'embouteillage ou de retard à surveiller`;

    const result = await generateContentWithFallbackAndRetry(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            estimatedTotalHours: { type: Type.NUMBER },
            feasibilityScore: { type: Type.NUMBER },
            milestones: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  priority: { type: Type.STRING },
                  estimatedHours: { type: Type.NUMBER },
                  milestone: { type: Type.STRING },
                },
                required: ['title', 'priority', 'estimatedHours'],
              },
            },
            riskFactors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['estimatedTotalHours', 'milestones', 'tasks', 'riskFactors'],
        },
      },
    });

    const parsed = safeParseJson(result.text);
    if (parsed && parsed.tasks) {
      return res.json({ ...parsed, modelUsed: result.modelUsed });
    }
    throw new Error('Réponse JSON incomplète');
  } catch (error: any) {
    console.warn('[project-breakdown] Bascule sur le générateur heuristique haute disponibilité:', sanitizeError(error));
    const fallback = generateFallbackProjectBreakdown(title, description, deadline, category);
    return res.json(fallback);
  }
});

// 3. AI Priority Optimization & Delay Detection
app.post('/api/ai/optimize-priorities', requirePremiumAiUser, async (req, res) => {
  const rawTasks = Array.isArray(req.body.tasks) ? req.body.tasks : [];
  const tasks = rawTasks.slice(0, 50).map((t: any) => ({
    id: sanitizeString(t?.id, 60),
    title: sanitizeString(t?.title, 150),
    completed: Boolean(t?.completed),
    priority: sanitizeString(t?.priority, 20, 'medium'),
    dueDate: sanitizeString(t?.dueDate, 30),
    estimatedMinutes: sanitizeNumber(t?.estimatedMinutes, 5, 600, 30),
  }));

  const rawProjects = Array.isArray(req.body.projects) ? req.body.projects : [];
  const projects = rawProjects.slice(0, 20).map((p: any) => ({
    id: sanitizeString(p?.id, 60),
    name: sanitizeString(p?.name, 150),
    status: sanitizeString(p?.status, 30, 'active'),
    deadline: sanitizeString(p?.deadline, 30),
  }));

  const rawSubjects = Array.isArray(req.body.subjects) ? req.body.subjects : [];
  const subjects = rawSubjects.slice(0, 20).map((s: any) => ({
    id: sanitizeString(s?.id, 60),
    name: sanitizeString(s?.name, 100),
    examDate: sanitizeString(s?.examDate, 30),
  }));

  const ai = getGenAI();

  if (!ai) {
    const fallback = generateFallbackPriorityOptimization(tasks, projects, subjects);
    return res.json(fallback);
  }

  try {
    const prompt = `Tu es un algorithme d'optimisation du temps pour étudiants et professionnels.
Analyse l'état actuel :
- Tâches : ${JSON.stringify(tasks)}
- Projets : ${JSON.stringify(projects)}
- Examens & Matières : ${JSON.stringify(subjects)}

Identifie :
1. Les risques de surcharge ou de retard critique.
2. L'ordre de traitement optimal (Matrice Eisenhower et temps de concentration requis).
3. 3 actions immédiates à fort impact pour la journée.

Génère une réponse JSON :
- diagnosis: évaluation globale de la charge (ex: "Charge modérée mais risque de goulot d'étranglement en Mathématiques")
- suggestedOrder: liste d'id de tâches avec justification courte
  - taskId
  - priorityRank (1, 2, 3...)
  - reason
- smartAlerts: liste d'alertes préventives (ex: "Examen dans 3 jours et 2 chapitres non ouverts")
- coachAdvice: un conseil concret pour éviter la procrastination.`;

    const result = await generateContentWithFallbackAndRetry(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            diagnosis: { type: Type.STRING },
            suggestedOrder: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  taskId: { type: Type.STRING },
                  priorityRank: { type: Type.INTEGER },
                  reason: { type: Type.STRING },
                },
                required: ['taskId', 'priorityRank', 'reason'],
              },
            },
            smartAlerts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            coachAdvice: { type: Type.STRING },
          },
          required: ['diagnosis', 'suggestedOrder', 'smartAlerts', 'coachAdvice'],
        },
      },
    });

    const parsed = safeParseJson(result.text);
    if (parsed && parsed.suggestedOrder) {
      return res.json({ ...parsed, modelUsed: result.modelUsed });
    }
    throw new Error('Réponse JSON incomplète');
  } catch (error: any) {
    console.warn('[optimize-priorities] Bascule sur le générateur heuristique haute disponibilité:', sanitizeError(error));
    const fallback = generateFallbackPriorityOptimization(tasks, projects, subjects);
    return res.json(fallback);
  }
});

// 4. AI Study Flashcard / Revision Sheet
app.post('/api/ai/study-flashcard', requirePremiumAiUser, async (req, res) => {
  const subjectName = sanitizeString(req.body.subjectName, 100, 'Matière générale');
  const chapterTitle = sanitizeString(req.body.chapterTitle, 150, 'Chapitre général');

  const ai = getGenAI();

  if (!ai) {
    const fallback = generateFallbackFlashcard(subjectName, chapterTitle);
    return res.json(fallback);
  }

  try {
    const prompt = `Crée une fiche de révision synthétique et ultra claire pour :
- Matière : ${subjectName}
- Chapitre : ${chapterTitle}

Inclus :
1. Résumé des concepts essentiels (3 à 5 points clés)
2. Formules fondamentales ou définitions à connaître par cœur
3. 3 questions de quiz pour s'auto-évaluer avec réponses courtes.`;

    const result = await generateContentWithFallbackAndRetry(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            keyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            essentialFormulasOrRules: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            quizQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  answer: { type: Type.STRING },
                },
                required: ['question', 'answer'],
              },
            },
          },
          required: ['title', 'keyPoints', 'essentialFormulasOrRules', 'quizQuestions'],
        },
      },
    });

    const parsed = safeParseJson(result.text);
    if (parsed && parsed.keyPoints) {
      return res.json({ ...parsed, modelUsed: result.modelUsed });
    }
    throw new Error('Réponse JSON incomplète');
  } catch (error: any) {
    console.warn('[study-flashcard] Bascule sur le générateur heuristique haute disponibilité:', sanitizeError(error));
    const fallback = generateFallbackFlashcard(subjectName, chapterTitle);
    return res.json(fallback);
  }
});

// ==========================================================================
// ENDPOINTS PADDLE BILLING (Création de Checkout et vérification d'état)
// ==========================================================================

/**
 * Création d'une transaction Paddle Checkout pour Studyflow Pro (9,99 €/mois).
 * - Vérifie le jeton Firebase ID côté serveur
 * - Ne fait jamais confiance au client pour le prix ou le statut
 * - Crée ou réutilise le client Paddle lié au Firebase UID
 * - Associe le Firebase UID dans customData pour réconciliation automatique
 */
async function handlePaddleCreateCheckout(req: express.Request, res: express.Response) {
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const rl = checkAiRateLimit(`checkout-${clientIp}`, 10, 60000);
  if (!rl.allowed) {
    return res.status(429).json({ error: 'Trop de requêtes de souscription. Veuillez patienter un instant.' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentification requise pour souscrire à Studyflow Pro.' });
  }

  const idToken = authHeader.substring(7).trim();
  if (!idToken) {
    return res.status(401).json({ error: 'Jeton d’authentification manquant.' });
  }

  // 1. Vérification stricte du jeton Firebase
  const authResult = await verifyFirebaseToken(idToken);
  if (!authResult.success || !authResult.uid) {
    return res.status(authResult.errorStatus || 401).json({
      error: authResult.errorMessage || 'Jeton d’authentification invalide.',
    });
  }

  const uid = authResult.uid;
  const email = authResult.email;

  // 2. Vérification de la configuration Paddle
  const paddle = getPaddle();
  if (!paddle) {
    console.error('[Paddle Checkout] Erreur : PADDLE_API_KEY non configurée.');
    return res.status(500).json({
      error: 'Le service de paiement Paddle n’est pas configuré sur le serveur (clé API PADDLE_API_KEY manquante).',
    });
  }

  const priceId = process.env.PADDLE_PRICE_ID;
  if (!priceId) {
    console.error('[Paddle Checkout] Erreur : PADDLE_PRICE_ID non configuré.');
    return res.status(500).json({
      error: 'Identifiant du tarif Studyflow Pro non configuré (PADDLE_PRICE_ID manquant).',
    });
  }

  // 3. Empêcher un utilisateur déjà Pro actif de souscrire une seconde fois
  let existingCustomerId: string | undefined = undefined;
  let currentTier: 'free' | 'pro' = 'free';
  let currentSubStatus = '';

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'studyflow-app-31dcf';
  try {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;
    const firestoreRes = await fetch(firestoreUrl, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (firestoreRes.ok) {
      const docData: any = await firestoreRes.json();
      currentTier = docData?.fields?.tier?.stringValue === 'pro' ? 'pro' : 'free';
      currentSubStatus = docData?.fields?.subscriptionStatus?.stringValue || '';
      existingCustomerId = docData?.fields?.billingCustomerId?.stringValue || docData?.fields?.stripeCustomerId?.stringValue;
    }
  } catch (err) {
    console.warn('[Paddle Checkout] Lecture profil utilisateur Firestore :', sanitizeError(err));
  }

  const memorySub = verifiedBillingSubscriptions.get(uid);
  if (memorySub && memorySub.tier === 'pro' && (memorySub.status === 'active' || memorySub.status === 'trialing')) {
    currentTier = 'pro';
    currentSubStatus = memorySub.status;
    if (memorySub.customerId) existingCustomerId = memorySub.customerId;
  }

  if (currentTier === 'pro' && (currentSubStatus === 'active' || currentSubStatus === 'trialing')) {
    return res.status(400).json({
      error: 'Vous disposez déjà d’un abonnement Studyflow Pro actif.',
      isAlreadyPro: true,
    });
  }

  // 4. Recherche ou création du client Paddle (sans doublon)
  let customerId = existingCustomerId;
  if (!customerId && email) {
    try {
      const customerCollection = paddle.customers.list({ email: [email] });
      for await (const c of customerCollection) {
        if (c && c.id) {
          customerId = c.id;
          break;
        }
      }
    } catch (err) {
      console.warn('[Paddle Checkout] Recherche client par email :', sanitizeError(err));
    }
  }

  if (!customerId && email) {
    try {
      const newCustomer = await paddle.customers.create({
        email,
        customData: {
          firebaseUid: uid,
          app: 'Studyflow',
        },
      });
      customerId = newCustomer.id;
    } catch (err: any) {
      console.warn('[Paddle Checkout] Erreur création client Paddle :', sanitizeError(err));
    }
  }

  // 5. Création de la transaction Paddle avec checkout hébergé
  try {
    const transactionParams: any = {
      items: [
        {
          priceId,
          quantity: 1,
        },
      ],
      customData: {
        firebaseUid: uid,
        app: 'Studyflow',
      },
    };

    if (customerId) {
      transactionParams.customerId = customerId;
    }

    const transaction = await paddle.transactions.create(transactionParams);

    const checkoutUrl = transaction.checkout?.url;
    if (!checkoutUrl) {
      throw new Error('Aucune URL de redirection retournée par Paddle.');
    }

    return res.json({
      url: checkoutUrl,
      transactionId: transaction.id,
    });
  } catch (err: any) {
    console.error('[Paddle Checkout] Erreur création de la transaction :', sanitizeError(err));
    return res.status(500).json({
      error: err.message || 'Impossible d’initialiser la session de paiement Paddle.',
    });
  }
}

app.post('/api/paddle/create-checkout', handlePaddleCreateCheckout);
// Alias de compatibilité
app.post('/api/stripe/create-checkout-session', handlePaddleCreateCheckout);

/**
 * Récupération sécurisée du statut d'abonnement pour synchronisation instantanée frontend.
 */
async function handleSubscriptionStatus(req: express.Request, res: express.Response) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentification requise.' });
  }

  const idToken = authHeader.substring(7).trim();
  const authResult = await verifyFirebaseToken(idToken);
  if (!authResult.success || !authResult.uid) {
    return res.status(authResult.errorStatus || 401).json({ error: 'Jeton invalide.' });
  }

  const uid = authResult.uid;
  const memory = verifiedBillingSubscriptions.get(uid);

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'studyflow-app-31dcf';
  let firestoreTier: 'free' | 'pro' = 'free';
  let firestoreStatus = 'none';
  let billingCustomerId = memory?.customerId;
  let billingSubscriptionId = memory?.subscriptionId;
  let billingProvider = memory?.provider || 'paddle';

  try {
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;
    const firestoreRes = await fetch(firestoreUrl, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    if (firestoreRes.ok) {
      const docData: any = await firestoreRes.json();
      firestoreTier = docData?.fields?.tier?.stringValue === 'pro' ? 'pro' : 'free';
      firestoreStatus = docData?.fields?.subscriptionStatus?.stringValue || 'none';
      if (docData?.fields?.billingProvider?.stringValue) {
        billingProvider = docData.fields.billingProvider.stringValue;
      }
      if (docData?.fields?.billingCustomerId?.stringValue || docData?.fields?.stripeCustomerId?.stringValue) {
        billingCustomerId = docData?.fields?.billingCustomerId?.stringValue || docData?.fields?.stripeCustomerId?.stringValue;
      }
      if (docData?.fields?.billingSubscriptionId?.stringValue || docData?.fields?.stripeSubscriptionId?.stringValue) {
        billingSubscriptionId = docData?.fields?.billingSubscriptionId?.stringValue || docData?.fields?.stripeSubscriptionId?.stringValue;
      }
    }
  } catch {}

  const tier = (memory && memory.tier === 'pro') || firestoreTier === 'pro' ? 'pro' : 'free';
  const subscriptionStatus = memory ? memory.status : firestoreStatus;

  return res.json({
    tier,
    subscriptionStatus,
    billingProvider,
    billingCustomerId,
    billingSubscriptionId,
    // Compatibilité
    stripeCustomerId: billingCustomerId,
    stripeSubscriptionId: billingSubscriptionId,
  });
}

app.get('/api/paddle/subscription-status', handleSubscriptionStatus);
// Alias de compatibilité
app.get('/api/stripe/subscription-status', handleSubscriptionStatus);

// Safe error-handling middleware (prevents stack traces or internal leaks)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'La requête dépasse la taille maximale autorisée (200kb).' });
  }
  console.error('[Studyflow Server] Erreur sécurisée:', sanitizeError(err));
  res.status(500).json({ error: 'Une erreur interne est survenue.' });
});

// Vite middleware for dev / static for prod
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Studyflow backend & server running on port ${PORT}`);
  });
}

setupViteOrStatic().catch((err) => {
  console.error('Failed to start server:', err);
});
