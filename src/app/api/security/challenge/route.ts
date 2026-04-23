import { NextResponse } from 'next/server';
import { generateChallenge } from '@/lib/challenges';

export const dynamic = 'force-dynamic';

/**
 * GET a new security challenge
 */
export async function GET() {
  try {
    const challenge = await generateChallenge();
    return NextResponse.json(challenge);
  } catch (error) {
    console.error('Challenge generation error:', error);
    return NextResponse.json({ error: 'Failed to generate challenge' }, { status: 500 });
  }
}
