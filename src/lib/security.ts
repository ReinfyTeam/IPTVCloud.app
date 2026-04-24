import { NextRequest } from 'next/server';
import db from '@/lib/db';

/**
 * GLOBAL CONFIG: Under Attack Mode
 * If true, risk scoring is more aggressive and might force challenges more often.
 */
export const ATTACK_MODE = false;

// Security constants
const SECURITY_COOKIE_NAME = 'cf_clearance_clone';
export const JWT_SECRET = process.env.JWT_SECRET || 'fallback-security-secret-69420';
const CHALLENGE_EXPIRY = 1000 * 60 * 5; // 5 minutes

export type SecurityLevel = 'OFF' | 'LOW' | 'MEDIUM' | 'HIGH' | 'UNDER_ATTACK';

// Simple cache for security settings
let settingsCache: { level: SecurityLevel; challenges: string[]; expiry: number } | null = null;
const CACHE_TTL = 30000; // 30 seconds

async function getSecuritySettings(): Promise<{ level: SecurityLevel; challenges: string[] }> {
  if (settingsCache && settingsCache.expiry > Date.now()) {
    return { level: settingsCache.level, challenges: settingsCache.challenges };
  }

  try {
    const result = await db.query(
      "SELECT key, value FROM \"GlobalSetting\" WHERE key IN ('SECURITY_LEVEL', 'CHALLENGE_TYPES')",
    );
    const settings = result.rows.reduce((acc: any, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    const level = (settings.SECURITY_LEVEL as SecurityLevel) || 'MEDIUM';
    const challenges = (settings.CHALLENGE_TYPES || 'IMAGE,TEXT,MATH,CLICK').split(',');

    settingsCache = { level, challenges, expiry: Date.now() + CACHE_TTL };
    return { level, challenges };
  } catch (e) {
    console.error('Error loading security settings, using defaults:', e);
    return { level: 'MEDIUM', challenges: ['IMAGE', 'TEXT', 'MATH', 'CLICK'] };
  }
}

export const CHALLENGE_TYPES = ['IMAGE', 'TEXT', 'MATH', 'CLICK'] as const;
export type ChallengeType = (typeof CHALLENGE_TYPES)[number];
const WEIGHTS = {
  MISSING_USER_AGENT: 40,
  MISSING_ACCEPT_LANGUAGE: 10,
  MISSING_SEC_HEADERS: 15,
  BOT_SIGNATURE: 100,
  PATH_SCANNING: 100,
  DIRECT_ACCESS_DEEP: 20,
  ATTACK_MODE_PENALTY: 25,
  // Browser Security Weights
  BROWSER_ANOMALY: 50,
  MISSING_CLIENT_HINTS: 30,
};

// Common bot signatures in User-Agent
const BOT_UA_SIGNATURES = [
  'curl',
  'wget',
  'python-requests',
  'aiohttp',
  'headless',
  'puppeteer',
  'selenium',
  'zgrab',
  'masscan',
  'nmap',
  'go-http-client',
];

// Dangerous paths (Path Scanning)
const DANGEROUS_PATHS = [
  '/wp-admin',
  '/phpmyadmin',
  '/.env',
  '/config.php',
  '/backup.sql',
  '/login.php',
  '/shell.php',
  '/xmlrpc.php',
  '.bak',
  '.sql',
  '.zip',
  '.tar',
];

export interface RiskResult {
  score: number;
  reasons: string[];
  action: 'ALLOW' | 'CHALLENGE' | 'BLOCK' | 'BROWSER_VERIFIED';
}

/**
 * Assess basic browser security characteristics
 */
function assessBrowserSecurity(req: NextRequest): RiskResult {
  let score = 0;
  const reasons: string[] = [];

  const ua = req.headers.get('user-agent') || '';
  const secChUa = req.headers.get('sec-ch-ua') || '';
  const secChUaMobile = req.headers.get('sec-ch-ua-mobile') || '';
  const secChUaPlatform = req.headers.get('sec-ch-ua-platform') || '';

  // Check for presence of modern browser client hints
  if (!secChUa || !secChUaMobile || !secChUaPlatform) {
    score += WEIGHTS.MISSING_CLIENT_HINTS;
    reasons.push('Missing Client Hints');
  }

  // Heuristic: If User-Agent exists but client hints are missing, it might be an older browser or a bot.
  if (ua && (!secChUa || !secChUaMobile)) {
    score += WEIGHTS.BROWSER_ANOMALY;
    reasons.push('User-Agent/Client Hints Mismatch');
  }

  // Add more heuristics here (e.g., UA inconsistencies, known bot UAs that try to mimic modern browsers but fail client hints)

  return { score, reasons, action: score > 0 ? 'CHALLENGE' : 'ALLOW' };
}

/**
 * HMAC signing for the verification token using Web Crypto API (Edge compatible)
 */
async function signToken(ip: string, ua: string, expiry: number): Promise<string> {
  const data = `${ip}|${ua}|${expiry}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(JWT_SECRET);
  const dataData = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataData);

  // Base64 encode the signature
  const hashArray = Array.from(new Uint8Array(signature));
  const hashString = hashArray.map((b) => String.fromCharCode(b)).join('');
  return btoa(hashString);
}

/**
 * Verify the clearance token in the request
 */
export async function verifySecurityToken(req: NextRequest): Promise<boolean> {
  const cookie = req.cookies.get(SECURITY_COOKIE_NAME);
  if (!cookie) return false;

  try {
    const parts = cookie.value.split(':');
    if (parts.length !== 2) return false;

    const [token, expiryStr] = parts;
    const expiry = parseInt(expiryStr, 10);

    if (isNaN(expiry) || expiry < Date.now()) return false;

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'unknown';

    const expectedToken = await signToken(ip, ua, expiry);
    return token === expectedToken;
  } catch {
    return false;
  }
}

/**
 * Generate a new clearance token value for the cookie
 */
export async function generateClearanceToken(ip: string, ua: string): Promise<string> {
  const expiry = Date.now() + 1000 * 60 * 60; // 60 minutes
  const token = await signToken(ip, ua, expiry);
  return `${token}:${expiry}`;
}

/**
 * Assess risk based on request headers and path
 */
export async function assessRisk(req: NextRequest): Promise<RiskResult> {
  const { level } = await getSecuritySettings();

  // 0. Initial check for OFF mode
  if (level === 'OFF') {
    return { score: 0, reasons: [], action: 'ALLOW' };
  }

  // 1. Assess browser security first (fast check)
  const browserSecurityResult = assessBrowserSecurity(req);

  // If browser itself is suspicious, it leads to a challenge or block
  if (browserSecurityResult.score > 0) {
    return { ...browserSecurityResult, action: 'CHALLENGE' };
  }

  // If browser is clean:
  if (level === 'UNDER_ATTACK') {
    // Even clean browsers get challenged if in UNDER_ATTACK mode
    return { score: 100, reasons: ['Under Attack Mode Active'], action: 'CHALLENGE' };
  }

  let score = 0;
  const reasons: string[] = [];
  const ua = req.headers.get('user-agent') || '';
  const path = req.nextUrl.pathname;

  // 1. Header Inspection
  if (!ua) {
    score += WEIGHTS.MISSING_USER_AGENT;
    reasons.push('Missing User-Agent');
  }

  if (!req.headers.get('accept-language')) {
    score += WEIGHTS.MISSING_ACCEPT_LANGUAGE;
    reasons.push('Missing Accept-Language');
  }

  // Modern browsers send these, most simple scripts don't
  if (!req.headers.get('sec-fetch-site') || !req.headers.get('sec-ch-ua')) {
    score += WEIGHTS.MISSING_SEC_HEADERS;
    reasons.push('Missing Modern Browser Headers');
  }

  // 2. Bot Signature Detection
  const uaLower = ua.toLowerCase();
  if (BOT_UA_SIGNATURES.some((sig) => uaLower.includes(sig))) {
    score += WEIGHTS.BOT_SIGNATURE;
    reasons.push('Known Bot Signature Detected');
  }

  // 3. Path Scanning Detection
  const pathLower = path.toLowerCase();
  if (
    DANGEROUS_PATHS.some(
      (dp) =>
        pathLower === dp ||
        pathLower.startsWith(dp + '/') ||
        (dp.startsWith('.') && pathLower.endsWith(dp)),
    )
  ) {
    score += WEIGHTS.PATH_SCANNING;
    reasons.push('Path Scanning Attempt');
  }

  // 4. Behavioral Heuristics
  if (path.split('/').length > 2 && !path.startsWith('/api') && !req.headers.get('referer')) {
    score += WEIGHTS.DIRECT_ACCESS_DEEP;
    reasons.push('Direct Access to Deep Route');
  }

  // Action Determination logic based on SECURITY_LEVEL
  let action: RiskResult['action'] = 'ALLOW';

  const thresholds = {
    LOW: { challenge: 50, block: 150 },
    MEDIUM: { challenge: 30, block: 100 },
    HIGH: { challenge: 20, block: 70 },
  };

  const currentThresholds = thresholds[level as keyof typeof thresholds] || thresholds.MEDIUM;

  if (score >= currentThresholds.block) {
    action = 'BLOCK';
  } else if (score >= currentThresholds.challenge) {
    action = 'CHALLENGE';
  } else {
    // If browser was clean, and general risk is low, then it's BROWSER_VERIFIED
    action = 'BROWSER_VERIFIED';
  }

  return { score, reasons, action };
}

export const CLEARANCE_COOKIE_CONFIG = {
  name: SECURITY_COOKIE_NAME,
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 3600, // 1 hour
};
