import { NextRequest, NextResponse } from 'next/server';
import { sendEmailViaSMTP2Go } from '@/lib/email/send';

const CONTACT_TO = 'info@strongbodies.com.au';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Honeypot — bots fill this hidden field; humans never see it.
  if (typeof body.company === 'string' && body.company.trim() !== '') {
    // Pretend success so the bot doesn't retry.
    return NextResponse.json({ success: true });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const pkg = typeof body.pkg === 'string' ? body.pkg.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }
  // Basic length guards against abuse.
  if (name.length > 200 || email.length > 200 || phone.length > 60 || message.length > 4000) {
    return NextResponse.json({ error: 'Field too long' }, { status: 400 });
  }

  const rows: [string, string][] = [
    ['Name', name],
    ['Email', email],
    ['Phone', phone || '—'],
    ['Interested in', pkg || 'Not specified'],
    ['Message', message || '—'],
  ];

  const html = `<!DOCTYPE html><html><body style="margin:0;background:#0a0a0b;font-family:'Helvetica Neue',Arial,sans-serif;color:#ece5d3;padding:32px;">
    <h2 style="color:#c9a24a;font-size:18px;margin:0 0 4px;">New Peak360 baseline-assessment enquiry</h2>
    <p style="color:rgba(236,229,211,0.62);font-size:13px;margin:0 0 20px;">Submitted via the peak360.com.au landing page.</p>
    <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
      ${rows
        .map(
          ([k, v]) =>
            `<tr><td style="padding:8px 12px;border:1px solid rgba(232,214,168,0.15);font-size:12px;color:rgba(236,229,211,0.5);width:140px;vertical-align:top;text-transform:uppercase;letter-spacing:0.08em;">${esc(
              k
            )}</td><td style="padding:8px 12px;border:1px solid rgba(232,214,168,0.15);font-size:14px;color:#ece5d3;white-space:pre-wrap;">${esc(
              v
            )}</td></tr>`
        )
        .join('')}
    </table>
    <p style="color:rgba(236,229,211,0.4);font-size:12px;margin:20px 0 0;">Reply directly to ${esc(
      email
    )} to respond.</p>
  </body></html>`;

  try {
    await sendEmailViaSMTP2Go({
      to: CONTACT_TO,
      subject: `New baseline enquiry — ${name}`,
      html,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to send enquiry' }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
