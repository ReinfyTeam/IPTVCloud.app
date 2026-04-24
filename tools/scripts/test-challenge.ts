import crypto from 'crypto';

const CHALLENGE_SECRET = 'my-secret';

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

async function verifyChallengeToken(token: string, solution: string): Promise<boolean> {
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
      ['sign'],
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
    return solution.trim().toLowerCase() === correctAnswer.toLowerCase();
  } catch (e) {
    console.error(e);
    return false;
  }
}

async function run() {
  const expiry = Date.now() + 1000 * 60 * 5;
  const token = await signState('MATH', '15', expiry);
  console.log('Token:', token);
  const isValid = await verifyChallengeToken(token, '15');
  console.log('IsValid:', isValid);
}

run();
