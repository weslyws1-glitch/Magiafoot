import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Career } from './types';
import { parseCareer, serializeCareer } from './engine';

const IDENTITY_KEY = 'magiafoot.identity.v1';
const PRIMARY_KEY = 'magiafoot.career.primary.v2';
const BACKUPS_KEY = 'magiafoot.career.backups.v2';
const LEGACY_KEY = 'magiafoot.saved-career.v1';

export const MAX_LOCAL_BACKUPS = 5;
export const SAVE_FORMAT_VERSION = 2;

export type SaveReason = 'auto' | 'manual' | 'migration' | 'recovery';
export type SaveHealth = 'healthy' | 'restored_backup' | 'legacy_migrated' | 'empty' | 'corrupt';

export interface LocalIdentity {
  magiaId: string;
  installationId: string;
  createdAt: string;
}

export interface ProtectedSaveEnvelope {
  formatVersion: number;
  revision: number;
  magiaId: string;
  careerId: string;
  savedAt: string;
  reason: SaveReason;
  checksum: string;
  payload: string;
}

export interface ProtectedLoadResult {
  career: Career | null;
  identity: LocalIdentity;
  health: SaveHealth;
  revision: number;
  lastSavedAt: string | null;
  restoredFromBackup: boolean;
}

const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;

function utf8Bytes(value: string): number[] {
  if (encoder) return Array.from(encoder.encode(value));
  const encoded = unescape(encodeURIComponent(value));
  return Array.from(encoded).map((char) => char.charCodeAt(0));
}

function rotateRight(value: number, amount: number) {
  return (value >>> amount) | (value << (32 - amount));
}

// Pure JS SHA-256 so save integrity works on web/iOS/Android without another dependency.
export function sha256(value: string): string {
  const bytes = utf8Bytes(value);
  const bitLength = bytes.length * 8;
  const words: number[] = [];

  for (let i = 0; i < bytes.length; i += 1) {
    words[i >> 2] = (words[i >> 2] ?? 0) | (bytes[i] << (24 - (i % 4) * 8));
  }

  words[bitLength >> 5] = (words[bitLength >> 5] ?? 0) | (0x80 << (24 - (bitLength % 32)));
  const totalWords = (((bitLength + 64) >> 9) << 4) + 16;
  while (words.length < totalWords) words.push(0);
  words[totalWords - 2] = Math.floor(bitLength / 0x100000000);
  words[totalWords - 1] = bitLength >>> 0;

  const k = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
  ];

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  for (let offset = 0; offset < words.length; offset += 16) {
    const w = new Array<number>(64);
    for (let i = 0; i < 16; i += 1) w[i] = words[offset + i] >>> 0;
    for (let i = 16; i < 64; i += 1) {
      const x = w[i - 15];
      const y = w[i - 2];
      const s0 = rotateRight(x, 7) ^ rotateRight(x, 18) ^ (x >>> 3);
      const s1 = rotateRight(y, 17) ^ rotateRight(y, 19) ^ (y >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let i = 0; i < 64; i += 1) {
      const s1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + s1 + ch + k[i] + w[i]) >>> 0;
      const s0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (s0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }

    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }

  return [h0,h1,h2,h3,h4,h5,h6,h7].map((part) => part.toString(16).padStart(8, '0')).join('');
}

function secureRandomBytes(length: number): Uint8Array {
  const target = new Uint8Array(length);
  const cryptoObject = (globalThis as any).crypto;
  if (cryptoObject?.getRandomValues) {
    cryptoObject.getRandomValues(target);
    return target;
  }

  // Legacy preview fallback only. Native production should provide Web Crypto.
  let seed = Date.now() ^ Math.floor(Math.random() * 0x7fffffff);
  for (let i = 0; i < target.length; i += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    target[i] = seed & 0xff;
  }
  return target;
}

function randomToken(length: number) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = secureRandomBytes(length);
  return Array.from(bytes).map((value) => alphabet[value % alphabet.length]).join('');
}

export function createMagiaId() {
  const raw = randomToken(12);
  return `MF-${raw.slice(0,4)}-${raw.slice(4,8)}-${raw.slice(8,12)}`;
}

function createInstallationId() {
  const raw = randomToken(24);
  return `inst_${raw.toLowerCase()}`;
}

export async function ensureLocalIdentity(): Promise<LocalIdentity> {
  const stored = await AsyncStorage.getItem(IDENTITY_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as LocalIdentity;
      if (parsed.magiaId?.startsWith('MF-') && parsed.installationId && parsed.createdAt) return parsed;
    } catch {
      // Create a clean identity below.
    }
  }

  const identity: LocalIdentity = {
    magiaId: createMagiaId(),
    installationId: createInstallationId(),
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  return identity;
}

function checksumMaterial(envelope: Omit<ProtectedSaveEnvelope, 'checksum'>) {
  return [
    envelope.formatVersion,
    envelope.revision,
    envelope.magiaId,
    envelope.careerId,
    envelope.savedAt,
    envelope.reason,
    envelope.payload,
  ].join('|');
}

function verifyEnvelope(envelope: ProtectedSaveEnvelope, identity: LocalIdentity): boolean {
  if (envelope.formatVersion !== SAVE_FORMAT_VERSION) return false;
  if (!envelope.payload || !envelope.careerId || envelope.revision < 1) return false;
  if (envelope.magiaId !== identity.magiaId) return false;
  const { checksum, ...unsigned } = envelope;
  return sha256(checksumMaterial(unsigned)) === checksum;
}

function parseEnvelope(raw: string | null): ProtectedSaveEnvelope | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ProtectedSaveEnvelope;
  } catch {
    return null;
  }
}

async function readBackups(): Promise<ProtectedSaveEnvelope[]> {
  try {
    const raw = await AsyncStorage.getItem(BACKUPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function rotateBackup(previousRaw: string | null, force = false) {
  const previous = parseEnvelope(previousRaw);
  if (!previous) return;

  const backups = await readBackups();
  const newest = backups[0];
  const previousTime = Date.parse(previous.savedAt);
  const newestTime = newest ? Date.parse(newest.savedAt) : 0;
  const enoughTimePassed = !newest || !Number.isFinite(newestTime) || previousTime - newestTime >= 2 * 60 * 1000;

  if (!force && !enoughTimePassed) return;

  const next = [previous, ...backups.filter((item) => item.revision !== previous.revision)].slice(0, MAX_LOCAL_BACKUPS);
  await AsyncStorage.setItem(BACKUPS_KEY, JSON.stringify(next));
}

export async function persistProtectedCareer(
  career: Career,
  identity: LocalIdentity,
  revision: number,
  reason: SaveReason = 'auto',
): Promise<ProtectedSaveEnvelope> {
  const payload = serializeCareer(career);
  const savedAt = new Date().toISOString();
  const unsigned: Omit<ProtectedSaveEnvelope, 'checksum'> = {
    formatVersion: SAVE_FORMAT_VERSION,
    revision: Math.max(1, revision),
    magiaId: identity.magiaId,
    careerId: career.id,
    savedAt,
    reason,
    payload,
  };
  const envelope: ProtectedSaveEnvelope = {
    ...unsigned,
    checksum: sha256(checksumMaterial(unsigned)),
  };

  const previousRaw = await AsyncStorage.getItem(PRIMARY_KEY);
  await rotateBackup(previousRaw, reason === 'manual' || reason === 'migration' || reason === 'recovery');
  await AsyncStorage.setItem(PRIMARY_KEY, JSON.stringify(envelope));
  return envelope;
}

export async function loadProtectedCareer(): Promise<ProtectedLoadResult> {
  const identity = await ensureLocalIdentity();
  const primaryRaw = await AsyncStorage.getItem(PRIMARY_KEY);
  const primary = parseEnvelope(primaryRaw);

  if (primary && verifyEnvelope(primary, identity)) {
    const career = parseCareer(primary.payload);
    if (career) {
      return {
        career,
        identity,
        health: 'healthy',
        revision: primary.revision,
        lastSavedAt: primary.savedAt,
        restoredFromBackup: false,
      };
    }
  }

  const backups = await readBackups();
  for (const backup of backups) {
    if (!verifyEnvelope(backup, identity)) continue;
    const career = parseCareer(backup.payload);
    if (!career) continue;

    const recovered = await persistProtectedCareer(career, identity, backup.revision + 1, 'recovery');
    return {
      career,
      identity,
      health: 'restored_backup',
      revision: recovered.revision,
      lastSavedAt: recovered.savedAt,
      restoredFromBackup: true,
    };
  }

  const legacyRaw = await AsyncStorage.getItem(LEGACY_KEY);
  const legacyCareer = parseCareer(legacyRaw);
  if (legacyCareer) {
    const migrated = await persistProtectedCareer(legacyCareer, identity, 1, 'migration');
    return {
      career: legacyCareer,
      identity,
      health: 'legacy_migrated',
      revision: migrated.revision,
      lastSavedAt: migrated.savedAt,
      restoredFromBackup: false,
    };
  }

  return {
    career: null,
    identity,
    health: primaryRaw ? 'corrupt' : 'empty',
    revision: 0,
    lastSavedAt: null,
    restoredFromBackup: false,
  };
}

export async function getBackupCount() {
  return (await readBackups()).length;
}
