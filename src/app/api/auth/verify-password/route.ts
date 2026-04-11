import { NextResponse } from 'next/server';
import { timingSafeCompare } from '@/lib/auth/session';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const password = body?.password;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return NextResponse.json({ error: 'Authentication not configured' }, { status: 503 });
    }

    if (!password || typeof password !== 'string' || !timingSafeCompare(password, adminPassword)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
