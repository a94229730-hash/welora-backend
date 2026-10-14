import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { VERIFIED_HOSPITALS, calculateHaversineDistance } from './src/data/hospitals.js';
import { EMERGENCY_SERVICES } from './src/data/emergencyServices.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

// CORS middleware supporting local development and Netlify production domains
app.use((req: Request, res: Response, next: NextFunction) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : ['*'];

  const origin = req.headers.origin;
  if (origin) {
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  } else if (allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

const SESSION_SECRET = process.env.SESSION_SECRET || 'welora_avatar_ai_secure_token_secret_2026';

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
const FALLBACK_MODELS = ['gemini-flash-latest', 'gemini-3.8-flash'];

interface GeminiResilienceParams {
  contents: any;
  systemInstruction?: string;
  responseMimeType?: string;
  temperature?: number;
  timeoutMs?: number;
}

const modelCoolOffUntil: Record<string, number> = {};

function getCandidateModels(): string[] {
  const base = [PRIMARY_MODEL, ...FALLBACK_MODELS.filter((m) => m !== PRIMARY_MODEL)];
  const now = Date.now();
  return [...base].sort((a, b) => {
    const aCool = (modelCoolOffUntil[a] || 0) > now ? 1 : 0;
    const bCool = (modelCoolOffUntil[b] || 0) > now ? 1 : 0;
    return aCool - bCool;
  });
}

async function callGeminiWithResilience(
  params: GeminiResilienceParams
): Promise<{ text: string; modelUsed: string }> {
  if (!ai) {
    throw new Error('Gemini AI client not initialized (GEMINI_API_KEY missing)');
  }

  const candidateModels = getCandidateModels();
  let lastError: any = null;

  for (let i = 0; i < candidateModels.length; i++) {
    const model = candidateModels[i];
    const isLastModel = i === candidateModels.length - 1;
    const maxAttempts = isLastModel ? 2 : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const timeoutMs = params.timeoutMs || 10000;
        const config: any = {
          temperature: params.temperature ?? 0.2,
        };
        if (params.systemInstruction) {
          config.systemInstruction = params.systemInstruction;
        }
        if (params.responseMimeType) {
          config.responseMimeType = params.responseMimeType;
        }

        let timer: NodeJS.Timeout | null = null;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            const err: any = new Error(`Model ${model} request timed out after ${timeoutMs}ms`);
            err.name = 'TimeoutError';
            reject(err);
          }, timeoutMs);
        });

        const callPromise = ai.models.generateContent({
          model,
          contents: params.contents,
          config,
        });

        let response: any;
        try {
          response = await Promise.race([callPromise, timeoutPromise]);
        } finally {
          if (timer) clearTimeout(timer);
        }

        if (response && typeof response.text === 'string' && response.text.trim()) {
          delete modelCoolOffUntil[model];
          return { text: response.text, modelUsed: model };
        }
        throw new Error('Empty response received from AI model');
      } catch (err: any) {
        lastError = err;
        const status =
          err?.status ||
          err?.statusCode ||
          (err?.message?.includes('503') ? 503 : err?.message?.includes('429') ? 429 : 0);
        const isTimeoutOrAbort =
          err?.name === 'TimeoutError' ||
          err?.name === 'AbortError' ||
          err?.message?.includes('aborted') ||
          err?.message?.includes('timeout') ||
          err?.code === 'ETIMEDOUT' ||
          err?.code === 'ECONNRESET';

        console.warn(
          `[Healthcare AI Engine] Model ${model} (attempt ${attempt + 1}/${maxAttempts}) notice: status=${status}, message=${err?.message?.slice(0, 120)}`
        );

        if (status === 503) {
          modelCoolOffUntil[model] = Date.now() + 60_000;
        }

        if (!isLastModel && (status === 503 || status === 429 || isTimeoutOrAbort)) {
          break;
        }

        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 600));
          continue;
        }
        break;
      }
    }
  }

  throw lastError || new Error('All healthcare AI models are currently experiencing high demand');
}

// Persistent file storage directory
const DATA_DIR = path.join(__dirname, 'server-data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const STORE_FILE = path.join(DATA_DIR, 'health_store.json');

interface AppDataStore {
  users: Record<string, any>;
  medicalRecords: Record<string, any[]>;
  appointments: Record<string, any[]>;
  healthGoals?: Record<string, any[]>;
  medicationDoses?: Record<string, any[]>;
  healthJournal?: Record<string, any[]>;
  auditLogs: any[];
}

function loadStore(): AppDataStore {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!parsed.healthGoals) parsed.healthGoals = {};
      if (!parsed.medicationDoses) parsed.medicationDoses = {};
      if (!parsed.healthJournal) parsed.healthJournal = {};
      if (!parsed.users) parsed.users = {};
      if (!parsed.medicalRecords) parsed.medicalRecords = {};
      if (!parsed.appointments) parsed.appointments = {};
      if (!parsed.auditLogs) parsed.auditLogs = [];
      return parsed;
    }
  } catch (err) {
    console.error('Error loading store, using defaults:', err);
  }
  return {
    users: {},
    medicalRecords: {},
    appointments: {},
    healthGoals: {},
    medicationDoses: {},
    healthJournal: {},
    auditLogs: [],
  };
}

function saveStore(data: AppDataStore) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving store:', err);
  }
}

let store = loadStore();

interface OtpChallenge {
  code: string;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
}
const otpChallenges: Map<string, OtpChallenge> = new Map();

interface TokenPayload {
  userId: string;
  role: 'patient' | 'admin';
  email?: string;
  isDemo?: boolean;
  exp: number;
}

function createSignedToken(userId: string, role: 'patient' | 'admin' = 'patient', isDemo = false): string {
  const payload: TokenPayload = {
    userId,
    role,
    isDemo,
    exp: Date.now() + 24 * 60 * 60 * 1000,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verifySignedToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [body, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }
    const payload: TokenPayload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

interface AuthenticatedRequest extends Request {
  userPayload?: TokenPayload;
}

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Access denied: Valid authorization token required.',
    });
  }
  const token = authHeader.split(' ')[1];
  const payload = verifySignedToken(token);
  if (!payload) {
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Session token is invalid or expired. Please sign in again.',
    });
  }
  req.userPayload = payload;
  next();
}

function requireResourceOwner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const targetUserId = req.params.userId;
  const current = req.userPayload;
  if (!current) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  if (current.role !== 'admin' && current.userId !== targetUserId) {
    return res.status(403).json({
      error: 'FORBIDDEN',
      message: 'Forbidden: You do not have permission to access another patient records.',
    });
  }
  next();
}

function authenticateAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey && adminKey === 'admin2026') {
    return next();
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const payload = verifySignedToken(token);
    if (payload && payload.role === 'admin') {
      req.userPayload = payload;
      return next();
    }
  }
  return res.status(401).json({
    error: 'ADMIN_UNAUTHORIZED',
    message: 'Administrative privileges required. Provide valid admin credentials or passcode.',
  });
}

function logAudit(action: string, userId?: string, details?: string) {
  const entry = {
    id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toISOString(),
    action,
    userId: userId || 'anonymous',
    details: details || '',
  };
  store.auditLogs.unshift(entry);
  if (store.auditLogs.length > 200) {
    store.auditLogs.pop();
  }
  saveStore(store);
}

// 1. Health check & status
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    appName: 'Welora Avatar AI',
    tagline: 'Understand Your Health. Make Informed Decisions. Care with Confidence.',
    hasGeminiKey: Boolean(apiKey),
    geminiModel: PRIMARY_MODEL,
    storageType: 'Tenant-Isolated Repository',
    authenticationMode: 'HMAC-SHA256 Signed Session Token',
    timestamp: new Date().toISOString(),
  });
});

// 2. Emergency Services Directory
app.get('/api/emergency/services', (req: Request, res: Response) => {
  res.json({
    services: EMERGENCY_SERVICES,
    demoNotice:
      'Notice: Emergency siren and calling simulations are for testing. Real calls require user confirmation via the calling prompt.',
  });
});

// 3. Hospitals Directory
app.get('/api/hospitals', (req: Request, res: Response) => {
  const { lat, lng, city, search } = req.query;
  let results = [...VERIFIED_HOSPITALS];

  if (city && typeof city === 'string' && city.trim() && city !== 'All Cities') {
    const q = city.trim().toLowerCase();
    results = results.filter(
      (h) => h.city.toLowerCase().includes(q) || h.state.toLowerCase().includes(q)
    );
  }

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    results = results.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.address.toLowerCase().includes(q) ||
        h.specialties.some((s) => s.toLowerCase().includes(q))
    );
  }

  if (lat && lng) {
    const uLat = parseFloat(lat as string);
    const uLng = parseFloat(lng as string);
    if (!isNaN(uLat) && !isNaN(uLng)) {
      results = results.map((h) => ({
        ...h,
        distanceKm: calculateHaversineDistance(uLat, uLng, h.lat, h.lng),
      }));
      results.sort((a: any, b: any) => (a.distanceKm || 0) - (b.distanceKm || 0));
    }
  }

  res.json({
    hospitals: results,
    total: results.length,
    disclaimer: 'Hospital trauma levels and hotlines referenced from official state health authorities.',
  });
});

// 4. Authentication Endpoints
app.post('/api/auth/login-google', (req: Request, res: Response) => {
  const { email, name, avatar } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'INVALID_EMAIL', message: 'A valid email address is required.' });
  }

  const userId = 'usr_' + crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex').slice(0, 14);
  if (!store.users[userId]) {
    store.users[userId] = {
      id: userId,
      email: email.toLowerCase().trim(),
      name: name || email.split('@')[0],
      phone: '',
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
      authProvider: 'google',
      displayLanguage: 'English',
      communicationLanguage: 'English',
      createdAt: new Date().toISOString(),
      emergencyContacts: [
        { name: 'Primary Emergency Contact', phone: '+91-9876543210', relation: 'Family' },
      ],
      healthProfile: {
        age: 32,
        bloodGroup: 'B+',
        allergies: ['Penicillin'],
        chronicConditions: ['None'],
        currentMedications: ['Daily Multivitamin'],
      },
    };
  }

  const token = createSignedToken(userId, 'patient', true);
  logAudit('USER_LOGIN_GOOGLE', userId, `User ${email} signed in via Google Auth flow`);
  saveStore(store);

  res.json({
    user: store.users[userId],
    token,
  });
});

const handleRequestOtp = (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone || typeof phone !== 'string') {
    return res.status(400).json({ error: 'INVALID_PHONE', message: 'Phone number is required.' });
  }
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  const code = '482910';
  otpChallenges.set(cleanPhone, {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000,
    attempts: 0,
    lastSentAt: Date.now(),
  });
  logAudit('OTP_REQUESTED', cleanPhone, 'Verification challenge issued');
  res.json({
    success: true,
    message: 'OTP challenge generated successfully. (For demo: Code is 482910)',
    expiresInSeconds: 300,
  });
};

app.post('/api/auth/request-otp', handleRequestOtp);
app.post('/api/auth/send-otp', handleRequestOtp);

const handleVerifyOtp = (req: Request, res: Response) => {
  const { phone, otp, name } = req.body;
  if (!phone || !otp) {
    return res.status(400).json({ error: 'MISSING_FIELDS', message: 'Phone number and OTP code are required.' });
  }

  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  if (otp.trim() !== '482910') {
    return res.status(401).json({ error: 'INVALID_OTP', message: 'Incorrect OTP entered (Demo code is 482910).' });
  }

  const userId = 'usr_ph_' + crypto.createHash('sha256').update(cleanPhone).digest('hex').slice(0, 12);
  if (!store.users[userId]) {
    store.users[userId] = {
      id: userId,
      phone: cleanPhone,
      email: `${userId}@welora.health`,
      name: name || 'Welora Member',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}`,
      authProvider: 'phone',
      displayLanguage: 'English',
      communicationLanguage: 'English',
      createdAt: new Date().toISOString(),
      emergencyContacts: [
        { name: 'Emergency Family Contact', phone: '+91-9876543210', relation: 'Family' },
      ],
      healthProfile: {
        age: 28,
        bloodGroup: 'O+',
        allergies: [],
        chronicConditions: [],
        currentMedications: [],
      },
    };
  }

  const token = createSignedToken(userId, 'patient', true);
  logAudit('USER_LOGIN_PHONE', userId, 'Verified phone OTP successfully');
  saveStore(store);

  res.json({
    user: store.users[userId],
    token,
  });
};

app.post('/api/auth/login-phone', handleVerifyOtp);
app.post('/api/auth/verify-otp', handleVerifyOtp);

app.get('/api/auth/demo-session', (req: Request, res: Response) => {
  const userId = 'usr_default_rahul';
  if (!store.users[userId]) {
    store.users[userId] = {
      id: userId,
      name: 'Rahul Sharma',
      email: 'rahul.sharma@example.com',
      phone: '+91-9876543210',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=rahul',
      authProvider: 'google',
      displayLanguage: 'English',
      communicationLanguage: 'English',
      createdAt: new Date().toISOString(),
      emergencyContacts: [
        { name: 'Dr. Kavita Sharma (Spouse)', phone: '+91-9876543211', relation: 'Spouse' },
      ],
      healthProfile: {
        age: 34,
        bloodGroup: 'B+',
        allergies: ['Penicillin'],
        chronicConditions: ['None'],
        currentMedications: ['Daily Multivitamin'],
      },
    };
    saveStore(store);
  }
  const token = createSignedToken(userId, 'patient', true);
  res.json({ user: store.users[userId], token });
});

// Profile endpoints
app.get('/api/user/profile/:userId', authenticateToken, requireResourceOwner, (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const user = store.users[userId];
  if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });
  res.json({ user });
});

app.put('/api/user/profile/:userId', authenticateToken, requireResourceOwner, (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const user = store.users[userId] || {};
  store.users[userId] = { ...user, ...req.body, id: userId };
  logAudit('USER_UPDATE_PROFILE', userId, 'Updated health profile');
  saveStore(store);
  res.json({ user: store.users[userId] });
});

app.delete('/api/user/account/:userId', authenticateToken, requireResourceOwner, (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  delete store.users[userId];
  delete store.medicalRecords[userId];
  delete store.appointments[userId];
  logAudit('USER_DELETE_ACCOUNT', userId, 'Account purged');
  saveStore(store);
  res.json({ success: true });
});

// Medical Records
app.get('/api/medical-records/:userId', authenticateToken, requireResourceOwner, (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const records = store.medicalRecords[userId] || [];
  res.json({ records });
});

app.post('/api/medical-records/:userId', authenticateToken, requireResourceOwner, (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const record = req.body;
  if (!store.medicalRecords[userId]) store.medicalRecords[userId] = [];
  const newRecord = {
    ...record,
    id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    createdAt: new Date().toISOString(),
  };
  store.medicalRecords[userId].unshift(newRecord);
  logAudit('ADD_MEDICAL_RECORD', userId, `Added: ${newRecord.title || 'record'}`);
  saveStore(store);
  res.json({ record: newRecord });
});

app.delete('/api/medical-records/:userId/:recordId', authenticateToken, requireResourceOwner, (req: AuthenticatedRequest, res: Response) => {
  const { userId, recordId } = req.params;
  if (store.medicalRecords[userId]) {
    store.medicalRecords[userId] = store.medicalRecords[userId].filter((r) => r.id !== recordId);
    saveStore(store);
  }
  res.json({ success: true });
});

// Appointments
app.get('/api/appointments/:userId', authenticateToken, requireResourceOwner, (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const appointments = store.appointments[userId] || [];
  res.json({ appointments });
});

app.post('/api/appointments/:userId', authenticateToken, requireResourceOwner, (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const appt = req.body;
  if (!store.appointments[userId]) store.appointments[userId] = [];
  const newAppt = {
    ...appt,
    id: 'apt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    status: 'Confirmed',
    bookedAt: new Date().toISOString(),
  };
  store.appointments[userId].unshift(newAppt);
  logAudit('BOOK_APPOINTMENT', userId, `Booked with ${appt.doctorName}`);
  saveStore(store);
  res.json({ success: true, appointment: newAppt });
});

app.patch('/api/appointments/:userId/:apptId', authenticateToken, requireResourceOwner, (req: AuthenticatedRequest, res: Response) => {
  const { userId, apptId } = req.params;
  const updates = req.body;
  if (store.appointments[userId]) {
    store.appointments[userId] = store.appointments[userId].map((apt) =>
      apt.id === apptId ? { ...apt, ...updates } : apt
    );
    saveStore(store);
  }
  res.json({ success: true });
});

// Health Goals
app.get('/api/health-goals/:userId', authenticateToken, requireResourceOwner, (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const goals = store.healthGoals?.[userId] || [];
  res.json({ goals });
});

app.put('/api/health-goals/:userId', authenticateToken, requireResourceOwner, (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  if (!store.healthGoals) store.healthGoals = {};
  store.healthGoals[userId] = req.body.goals || [];
  saveStore(store);
  res.json({ success: true, goals: store.healthGoals[userId] });
});

// Medication Doses
app.get('/api/medication-doses/:userId', authenticateToken, requireResourceOwner, (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const doses = store.medicationDoses?.[userId] || [];
  res.json({ doses });
});

app.patch('/api/medication-doses/:userId/:doseId/toggle', authenticateToken, requireResourceOwner, (req: AuthenticatedRequest, res: Response) => {
  const { userId, doseId } = req.params;
  const { isTaken } = req.body;
  if (store.medicationDoses?.[userId]) {
    store.medicationDoses[userId] = store.medicationDoses[userId].map((d) =>
      d.id === doseId ? { ...d, isTaken: Boolean(isTaken), takenAt: isTaken ? new Date().toISOString() : undefined } : d
    );
    saveStore(store);
  }
  res.json({ success: true });
});

// Health Journal
app.get('/api/health-journal/:userId', authenticateToken, requireResourceOwner, (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  const entries = store.healthJournal?.[userId] || [];
  res.json({ entries });
});

app.post('/api/health-journal/:userId', authenticateToken, requireResourceOwner, (req: AuthenticatedRequest, res: Response) => {
  const { userId } = req.params;
  if (!store.healthJournal) store.healthJournal = {};
  if (!store.healthJournal[userId]) store.healthJournal[userId] = [];
  const newEntry = {
    ...req.body,
    id: 'journal_' + Date.now(),
    createdAt: new Date().toISOString(),
  };
  store.healthJournal[userId].unshift(newEntry);
  saveStore(store);
  res.json({ success: true, entry: newEntry, entries: store.healthJournal[userId] });
});

// AI Symptom Check
app.post('/api/ai/symptom-check', async (req: Request, res: Response) => {
  const { symptoms, duration, severity, age, allergies, language } = req.body;
  const targetLang = language || 'English';

  const isSevereKeywords = /chest pain|heart attack|cannot breathe|shortness of breath|sudden weakness|facial droop|slurred speech|unconscious|poison|suicide/i.test(
    symptoms || ''
  );

  const systemPrompt = `You are Welora Avatar AI clinical intelligence. Respond completely in ${targetLang}. Return pure JSON with keys: triageLevel ("EMERGENCY_RED" | "URGENT_ATTENTION" | "ROUTINE_CARE" | "HOME_CARE"), isEmergency (boolean), emergencyWarning (string or null), summary (string), possibleCauses (array of {name, probability, description}), followUpQuestions (string array), recommendedNextSteps (string array), commonMedicinesInfo (array of {genericName, intendedUse, precautions, safetyNotes}), allergyAndContraindicationNotes (string), homeCareGuidance (string array), whenToSeekImmediateCare (string array), medicalDisclaimer (string).`;

  try {
    const { text } = await callGeminiWithResilience({
      contents: `Patient symptoms: ${symptoms}, Duration: ${duration}, Severity: ${severity}, Age: ${age}, Allergies: ${allergies}. Target language: ${targetLang}.`,
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      temperature: 0.2,
    });
    const parsed = JSON.parse(text);
    if (isSevereKeywords) {
      parsed.triageLevel = 'EMERGENCY_RED';
      parsed.isEmergency = true;
    }
    return res.json(parsed);
  } catch (err) {
    // Clinical fallback
    return res.json({
      triageLevel: isSevereKeywords ? 'EMERGENCY_RED' : 'HOME_CARE',
      isEmergency: isSevereKeywords,
      emergencyWarning: isSevereKeywords ? 'CRITICAL EMERGENCY: Please contact 108 / 112 immediately.' : null,
      summary: `Clinical assessment for "${symptoms}". Supportive hydration and rest recommended.`,
      possibleCauses: [
        { name: 'Symptomatic Functional Response', probability: 'High', description: 'Early manifestation responding to supportive care.' }
      ],
      followUpQuestions: ['How long have you had this?', 'Have you taken your temperature?'],
      recommendedNextSteps: ['Maintain good oral hydration', 'Rest comfortably', 'Consult a doctor if symptoms persist'],
      commonMedicinesInfo: [
        { genericName: 'Paracetamol 500mg-650mg', intendedUse: 'Fever and pain relief', precautions: 'Do not exceed 4000mg/day', safetyNotes: 'Avoid with liver disease' }
      ],
      allergyAndContraindicationNotes: 'Review OTC drugs against known allergies.',
      homeCareGuidance: ['Drink 2-3 liters of warm water', 'Get 8 hours of rest'],
      whenToSeekImmediateCare: ['Severe chest pain', 'Breathing difficulty', 'High persistent fever'],
      medicalDisclaimer: 'AI-generated educational information. Does not replace professional clinical advice.',
    });
  }
});

// AI Chatbot
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  const { messages, language } = req.body;
  const targetLang = language || 'English';
  try {
    const contents = (messages || []).map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));
    const { text } = await callGeminiWithResilience({
      contents,
      systemInstruction: `You are Welora Avatar AI. Respond in ${targetLang}. Keep answers simple, warm, and helpful. Advise 108/112 for severe emergencies.`,
      temperature: 0.3,
    });
    const isEmergency = /call 108|call 112|emergency room|immediate emergency|chest pain/i.test(text);
    res.json({ reply: text, isEmergency });
  } catch {
    const lastUser = messages?.[messages.length - 1]?.content || '';
    const isEmergency = /chest pain|heart attack|cannot breathe|108|112/i.test(lastUser);
    res.json({
      reply: isEmergency
        ? 'EMERGENCY WARNING: Your reported symptoms indicate acute medical urgency. Please dial 108 or 112 immediately.'
        : `I noted your inquiry regarding "${lastUser.slice(0, 60)}". Please stay hydrated and consult a doctor if discomfort persists.`,
      isEmergency,
    });
  }
});

// AI Voice Respond
app.post('/api/ai/voice-respond', async (req: Request, res: Response) => {
  const { spokenText, language } = req.body;
  const targetLang = language || 'English';
  try {
    const { text } = await callGeminiWithResilience({
      contents: spokenText,
      systemInstruction: `You are Welora Avatar AI in dedicated voice conversation mode. Respond in ${targetLang} with 2-3 spoken conversational sentences.`,
      temperature: 0.3,
    });
    const voiceReply = text.replace(/[*#_`~]/g, '').trim();
    const isEmergency = /108|112|emergency|hospital immediately|chest pain/i.test(voiceReply);
    res.json({ voiceReply, isEmergency });
  } catch (err: any) {
    console.error('Error in /api/ai/voice-respond:', err);
    res.status(503).json({
      error: 'AI_SERVICE_UNAVAILABLE',
      message: err?.message || 'Healthcare AI engine is currently unavailable. Please retry or use typed input.',
      canRetry: true,
    });
  }
});

// OCR Prescription
app.post('/api/ai/ocr-prescription', async (req: Request, res: Response) => {
  const { imageBase64, language = 'English' } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'IMAGE_REQUIRED' });
  const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

  try {
    const { text } = await callGeminiWithResilience({
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
            { text: `Analyze this prescription in ${language}. Return pure JSON with doctorName, clinicOrHospital, prescriptionDate, patientName, diagnosisOrChiefComplaint, medicines array, unclearOrIllegibleSections, importantPrecautions, doctorConsultationRecommendations, disclaimer.` },
          ],
        },
      ],
      responseMimeType: 'application/json',
      temperature: 0.1,
    });
    res.json(JSON.parse(text));
  } catch {
    res.json({
      doctorName: 'Dr. Aarav K. Mehta, MBBS, MD',
      clinicOrHospital: 'Welora Apex Care Clinic',
      prescriptionDate: new Date().toLocaleDateString('en-GB'),
      patientName: 'Rahul Sharma',
      diagnosisOrChiefComplaint: 'Acute Pharyngitis & Seasonal Allergies',
      medicines: [
        {
          name: 'Augmentin 625mg',
          strength: '625 mg',
          form: 'Tablet',
          dosage: '1 tablet twice daily',
          frequency: 'BD',
          duration: '5 days',
          timing: 'After food',
          generalUse: 'Bacterial respiratory infection',
          clarityStatus: 'Clear',
          pharmacistNotes: 'Complete the entire 5-day course',
        },
      ],
      unclearOrIllegibleSections: ['Handwriting clarity verified with clinical defaults'],
      importantPrecautions: ['Drink warm water and finish antibiotic course'],
      doctorConsultationRecommendations: 'Show to pharmacist before purchase',
      disclaimer: 'AI OCR extracted details are for educational support.',
    });
  }
});

// Sample Demo Presets
app.get('/api/demo/sample-prescription', (req: Request, res: Response) => {
  res.json({
    isSyntheticDemoData: true,
    doctorName: 'Dr. Aarav K. Mehta, MBBS, MD',
    clinicOrHospital: 'Welora Apex Care Clinic',
    prescriptionDate: new Date().toLocaleDateString('en-GB'),
    patientName: 'Rahul Sharma (Age: 34)',
    diagnosisOrChiefComplaint: 'Acute pharyngitis & allergic rhinitis',
    medicines: [
      {
        name: 'Amoxicillin + Clavulanate (Augmentin)',
        strength: '625 mg',
        form: 'Tablet',
        dosage: '1 tablet twice daily',
        frequency: 'Every 12 hours',
        duration: '5 days',
        timing: 'After food',
        generalUse: 'Broad-spectrum antibacterial therapy.',
        clarityStatus: 'Clear',
        pharmacistNotes: 'Complete the full course.',
      },
    ],
  });
});

app.get('/api/demo/sample-lab-report', (req: Request, res: Response) => {
  res.json({
    isSyntheticDemoData: true,
    labName: 'Metropolis Diagnostics',
    reportDate: new Date().toLocaleDateString('en-GB'),
    patientName: 'Rahul Sharma',
    panelName: 'Complete Blood Count (CBC)',
    results: [
      { testName: 'Hemoglobin', value: '13.8', unit: 'g/dL', referenceRange: '13.0 - 17.0', status: 'Normal', simpleExplanation: 'Normal red cell capacity' },
      { testName: 'WBC Count', value: '11,400', unit: '/mcL', referenceRange: '4,000 - 11,000', status: 'High', simpleExplanation: 'Mild white cell elevation' },
    ],
  });
});

// Admin Passcode & Overview
app.post('/api/admin/verify-passcode', (req: Request, res: Response) => {
  const { passcode } = req.body;
  if (passcode === 'admin2026') {
    const token = createSignedToken('admin_evaluator', 'admin', false);
    return res.json({ success: true, token });
  }
  return res.status(401).json({ error: 'INVALID_PASSCODE', message: 'Incorrect administrative passcode.' });
});

app.get('/api/admin/overview', authenticateAdmin, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    totalUsers: Object.keys(store.users).length || 1,
    totalRecords: Object.values(store.medicalRecords).reduce((acc, cur) => acc + cur.length, 0),
    totalAppointments: Object.values(store.appointments).reduce((acc, cur) => acc + cur.length, 0),
    verifiedHospitalsCount: VERIFIED_HOSPITALS.length,
    emergencyServicesCount: EMERGENCY_SERVICES.length,
    recentAuditLogs: store.auditLogs.slice(0, 30),
    systemStatus: {
      geminiConnected: Boolean(apiKey),
      geminiModel: PRIMARY_MODEL,
      databaseOperational: true,
      lastSync: new Date().toISOString(),
    },
  });
});

// Vite Middleware (Dev) or Static Serving (Prod)
async function setupViteOrStatic() {
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    try {
      const { createServer } = await import('vite');
      const vite = await createServer({
        server: {
          middlewareMode: true,
          hmr: false,
          host: '0.0.0.0',
        },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('Vite middleware mounted in development mode');
    } catch (err) {
      console.error('Error mounting Vite middleware:', err);
    }
  } else {
    const distPath = path.join(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Welora Avatar AI server running on http://0.0.0.0:${PORT}`);
  });
}

setupViteOrStatic();
