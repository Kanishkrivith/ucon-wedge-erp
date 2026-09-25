import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({
        authenticated: false,
        envCheck: {
          hasGeminiKey: !!geminiKey,
          keyPrefix: geminiKey ? geminiKey.substring(0, 6) + '...' : 'MISSING',
          keyLength: geminiKey ? geminiKey.length : 0,
        },
      }, { status: 401 });
    }
    return NextResponse.json({
      authenticated: true,
      user,
      envCheck: {
        hasGeminiKey: !!geminiKey,
        keyPrefix: geminiKey ? geminiKey.substring(0, 6) + '...' : 'MISSING',
        keyLength: geminiKey ? geminiKey.length : 0,
      },
    });
  } catch (error) {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
