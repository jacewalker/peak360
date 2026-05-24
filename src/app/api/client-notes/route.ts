import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { clientNotes, assessments } from '@/lib/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { requireSession, type AuthSession } from '@/lib/auth-helpers';

/**
 * Can the signed-in user read/add notes for this client name?
 * - admin → any client name
 * - coach → only client names appearing in at least one of THEIR OWN assessments
 * - client → never (handled by caller as 403)
 */
async function canAccess(session: AuthSession, clientName: string): Promise<boolean> {
  if (session.user.role === 'admin') return true;
  if (session.user.role !== 'coach') return false;

  const rows = await db
    .select({ id: assessments.id })
    .from(assessments)
    .where(
      and(
        eq(assessments.clientName, clientName),
        eq(assessments.coachId, session.user.id)
      )
    )
    .limit(1);

  return rows.length > 0;
}

export async function GET(request: Request) {
  const [session, errorRes] = await requireSession();
  if (errorRes) return errorRes;

  if (session.user.role === 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const client = new URL(request.url).searchParams.get('client');
  if (!client) {
    return NextResponse.json({ error: 'Missing client parameter' }, { status: 400 });
  }

  if (!(await canAccess(session, client))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rows = await db
    .select()
    .from(clientNotes)
    .where(eq(clientNotes.clientName, client))
    .orderBy(desc(clientNotes.createdAt));

  return NextResponse.json({ success: true, data: rows });
}

export async function POST(request: Request) {
  const [session, errorRes] = await requireSession();
  if (errorRes) return errorRes;

  if (session.user.role === 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const client: string = typeof body.client === 'string' ? body.client : '';
  const noteBody: string = typeof body.body === 'string' ? body.body.trim() : '';

  if (!client) {
    return NextResponse.json({ error: 'Missing client' }, { status: 400 });
  }
  if (!noteBody) {
    return NextResponse.json({ error: 'Note body cannot be empty' }, { status: 400 });
  }

  if (!(await canAccess(session, client))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const note = {
    id: uuid(),
    clientName: client,
    authorId: session.user.id,
    authorName: session.user.name,
    body: noteBody,
    createdAt: new Date().toISOString(),
  };

  await db.insert(clientNotes).values(note);

  return NextResponse.json({ success: true, data: note }, { status: 201 });
}
