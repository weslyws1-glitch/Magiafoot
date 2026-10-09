import type { Career } from './types';
import { parseCareer, serializeCareer } from './engine';
import { sha256 } from './save-protection';

const SUPABASE_URL = 'https://jrajtpnxyiwgfbjkuxaf.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Fw2Gmc9zOdTa9bHgZzIEfQ_HaVZsh8W';

export interface CloudSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  userId: string;
  email: string;
}

export interface CloudProfile {
  userId: string;
  magiaId: string;
  displayName: string | null;
}

export interface CloudSaveMeta {
  revision: number;
  savedAt: string;
}

export interface CloudRestoreResult {
  career: Career;
  revision: number;
  savedAt: string;
}

type AuthPayload = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: { id?: string; email?: string };
  msg?: string;
  error_description?: string;
  error?: string;
};

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text };
  }
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    const encoded = JSON.stringify(value);
    return encoded === undefined ? 'null' : encoded;
  }
  if (Array.isArray(value)) return '[' + value.map((item) => canonicalJson(item)).join(',') + ']';
  const record = value as Record<string, unknown>;
  return '{' + Object.keys(record).sort().map((key) => JSON.stringify(key) + ':' + canonicalJson(record[key])).join(',') + '}';
}

function authMessage(payload: any, fallback: string) {
  return payload?.msg || payload?.error_description || payload?.error || fallback;
}

function sessionFrom(payload: AuthPayload): CloudSession | null {
  const userId = payload.user?.id;
  const email = payload.user?.email;
  if (!payload.access_token || !payload.refresh_token || !userId || !email) return null;
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    expiresAt: Date.now() + Math.max(30, payload.expires_in ?? 3600) * 1000,
    userId,
    email,
  };
}

export async function signUpCloudAccount(email: string, password: string) {
  const response = await fetch(SUPABASE_URL + '/auth/v1/signup', {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });
  const payload = await readJson(response) as AuthPayload;
  if (!response.ok) {
    return { ok: false as const, message: authMessage(payload, 'Não foi possível criar a conta.') };
  }

  const session = sessionFrom(payload);
  if (session) {
    return { ok: true as const, session, message: 'Conta criada e conectada.' };
  }

  return {
    ok: true as const,
    session: null,
    message: 'Conta criada. Confirme o e-mail recebido e depois entre na conta.',
  };
}

export async function signInCloudAccount(email: string, password: string) {
  const response = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });
  const payload = await readJson(response) as AuthPayload;
  if (!response.ok) {
    return { ok: false as const, message: authMessage(payload, 'E-mail ou senha inválidos.') };
  }

  const session = sessionFrom(payload);
  if (!session) {
    return { ok: false as const, message: 'A conta ainda não está pronta para login. Confirme seu e-mail.' };
  }

  return { ok: true as const, session, message: 'Conta conectada.' };
}

export async function refreshCloudSession(session: CloudSession): Promise<CloudSession | null> {
  if (session.expiresAt > Date.now() + 5 * 60 * 1000) return session;

  const response = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: session.refreshToken }),
  });
  const payload = await readJson(response) as AuthPayload;
  if (!response.ok) return null;
  return sessionFrom(payload);
}

export async function signOutCloudAccount(session: CloudSession) {
  try {
    await fetch(SUPABASE_URL + '/auth/v1/logout', {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: 'Bearer ' + session.accessToken,
      },
    });
  } catch {
    // Local sign-out still proceeds even if the network is unavailable.
  }
}

export async function fetchCloudProfile(session: CloudSession): Promise<CloudProfile | null> {
  const response = await fetch(
    SUPABASE_URL + '/rest/v1/magia_profiles?select=user_id,magia_id,display_name&user_id=eq.' + encodeURIComponent(session.userId) + '&limit=1',
    {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: 'Bearer ' + session.accessToken,
      },
    },
  );
  if (!response.ok) return null;
  const data = await readJson(response);
  const row = Array.isArray(data) ? data[0] : null;
  if (!row?.user_id || !row?.magia_id) return null;
  return {
    userId: row.user_id,
    magiaId: row.magia_id,
    displayName: row.display_name ?? null,
  };
}

export async function saveCareerToCloud(
  session: CloudSession,
  career: Career,
  deviceId: string,
  reason: 'auto' | 'manual' | 'migration' | 'recovery' = 'auto',
): Promise<CloudSaveMeta | null> {
  const payloadText = serializeCareer(career);
  const payload = JSON.parse(payloadText);
  const checksum = sha256(canonicalJson(payload));

  const response = await fetch(SUPABASE_URL + '/rest/v1/rpc/save_career_version', {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: 'Bearer ' + session.accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_career_id: career.id,
      p_payload: payload,
      p_checksum: checksum,
      p_schema_version: career.schemaVersion,
      p_device_id: deviceId,
      p_reason: reason,
    }),
  });

  if (!response.ok) return null;
  const data = await readJson(response);
  const row = Array.isArray(data) ? data[0] : null;
  if (!row) return null;
  return {
    revision: Number(row.revision ?? 0),
    savedAt: String(row.saved_at ?? new Date().toISOString()),
  };
}

export async function restoreLatestCareerFromCloud(session: CloudSession): Promise<CloudRestoreResult | null> {
  const response = await fetch(
    SUPABASE_URL + '/rest/v1/career_save_versions?select=career_id,revision,schema_version,checksum,payload,saved_at&order=saved_at.desc&limit=1',
    {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: 'Bearer ' + session.accessToken,
      },
    },
  );

  if (!response.ok) return null;
  const data = await readJson(response);
  const row = Array.isArray(data) ? data[0] : null;
  if (!row?.payload || !row?.checksum) return null;

  const payloadText = JSON.stringify(row.payload);
  if (sha256(canonicalJson(row.payload)) !== String(row.checksum).toLowerCase()) {
    return null;
  }

  const career = parseCareer(payloadText);
  if (!career) return null;

  return {
    career,
    revision: Number(row.revision ?? 0),
    savedAt: String(row.saved_at ?? new Date().toISOString()),
  };
}
