import { NextResponse } from 'next/server';
import { sendEmailViaSMTP2Go } from '@/lib/email/send';

const CONTACT_TO = process.env.CONTACT_TO_EMAIL ?? 'info@strongbodies.com.au';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!name || !email || !message) {
    return NextResponse.json(
      { success: false, error: 'Name, email and message are required.' },
      { status: 400 },
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ success: false, error: 'Please provide a valid email address.' }, { status: 400 });
  }

  const html = `
    <h2>New baseline assessment enquiry</h2>
    <p><strong>Name:</strong> ${escapeHtml(name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    ${phone ? `<p><strong>Phone:</strong> ${escapeHtml(phone)}</p>` : ''}
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
  `;

  try {
    await sendEmailViaSMTP2Go({
      to: CONTACT_TO,
      subject: `Baseline assessment enquiry — ${name}`,
      html,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Something went wrong sending your message. Please try again.' },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true });
}
