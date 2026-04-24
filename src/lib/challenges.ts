import { ChallengeType, CHALLENGE_TYPES, JWT_SECRET } from './security';
import db from './db';

const CHALLENGE_SECRET = JWT_SECRET;

/**
 * Get enabled challenge types from database
 */
async function getEnabledChallengeTypes(): Promise<ChallengeType[]> {
  try {
    const result = await db.query(
      'SELECT value FROM "GlobalSetting" WHERE key = \'CHALLENGE_TYPES\'',
    );
    if (result.rows.length > 0) {
      return result.rows[0].value.split(',') as ChallengeType[];
    }
  } catch (e) {
    console.error('Error fetching challenge types:', e);
  }
  return [...CHALLENGE_TYPES];
}

export interface ChallengeData {
  type: ChallengeType;
  question: string;
  options?: string[];
  imageUrl?: string;
  token: string; // Signed state
}

/**
 * Sign challenge state for stateless verification
 */
async function signState(type: string, answer: string, expiry: number): Promise<string> {
  const data = `${type}|${answer}|${expiry}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(CHALLENGE_SECRET);
  const dataData = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataData);
  const hashArray = Array.from(new Uint8Array(signature));
  const hashString = hashArray.map((b) => String.fromCharCode(b)).join('');
  return `${btoa(hashString)}.${expiry}.${btoa(type)}.${btoa(answer)}`;
}

/**
 * Verify signed challenge state
 */
export async function verifyChallengeToken(token: string, solution: string): Promise<boolean> {
  try {
    const [signature, expiryStr, typeB64, answerB64] = token.split('.');
    const expiry = parseInt(expiryStr, 10);
    const type = atob(typeB64);
    const correctAnswer = atob(answerB64);

    if (isNaN(expiry) || expiry < Date.now()) return false;

    // Verify signature
    const data = `${type}|${correctAnswer}|${expiry}`;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(CHALLENGE_SECRET);
    const dataData = encoder.encode(data);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const decodedSignature = atob(signature);
    const signatureBytes = new Uint8Array(decodedSignature.length);
    for (let i = 0; i < decodedSignature.length; i++) {
      signatureBytes[i] = decodedSignature.charCodeAt(i);
    }

    const validSignature = await crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      signatureBytes, // The signature from the token
      dataData, // The data that was signed
    );

    if (!validSignature) return false;

    // Check solution
    if (type === 'IMAGE') {
      const solArr = solution
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .sort((a, b) => parseInt(a) - parseInt(b));
      const ansArr = correctAnswer
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .sort((a, b) => parseInt(a) - parseInt(b));
      return solArr.join(',') === ansArr.join(',');
    }
    return solution.trim().toLowerCase() === correctAnswer.toLowerCase();
  } catch {
    return false;
  }
}

/**
 * Generate a randomized challenge
 */
export async function generateChallenge(): Promise<ChallengeData> {
  const types = await getEnabledChallengeTypes();
  const selectedType = types[Math.floor(Math.random() * types.length)] || 'MATH';
  const expiry = Date.now() + 1000 * 60 * 5; // 5 minutes

  switch (selectedType) {
    case 'MATH': {
      const a = Math.floor(Math.random() * 10) + 1;
      const b = Math.floor(Math.random() * 10) + 1;
      const question = `What is ${a} + ${b}?`;
      const answer = (a + b).toString();
      const token = await signState('MATH', answer, expiry);
      return { type: 'MATH', question, token };
    }

    case 'TEXT': {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let answer = '';
      for (let i = 0; i < 6; i++) answer += chars.charAt(Math.floor(Math.random() * chars.length));
      const question = 'Type the characters you see (case-insensitive)';
      const token = await signState('TEXT', answer, expiry);
      // In a real app, you'd generate a base64 image of the text.
      // For this demo, we'll provide the distorted text directly or via placeholder.
      return { type: 'TEXT', question, options: [answer], token };
    }

    case 'IMAGE': {
      const sets = [
        { label: 'cars', images: ['car1', 'car2', 'car3'], others: ['bus', 'bike', 'truck'] },
        { label: 'cats', images: ['cat1', 'cat2', 'cat3'], others: ['dog', 'bird', 'fish'] },
      ];
      const set = sets[Math.floor(Math.random() * sets.length)];
      const question = `Select all images containing ${set.label}`;
      const answer = '0,1,2'; // Indices of correct images
      const options = [...set.images, ...set.others].sort(() => Math.random() - 0.5);
      // Note: In real app, options would be URLs.
      const token = await signState('IMAGE', answer, expiry);
      return { type: 'IMAGE', question, options, token };
    }

    case 'CLICK':
    default: {
      const question = 'Hold the button for 3 seconds';
      const answer = 'HOLD_SUCCESS';
      const token = await signState('CLICK', answer, expiry);
      return { type: 'CLICK', question, token };
    }
  }
}
