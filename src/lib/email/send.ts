export async function sendEmailViaSMTP2Go({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!process.env.SMTP2GO_API_KEY) {
    console.log(`[DEV] Magic link email:`);
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  HTML: ${html}`);
    return;
  }

  const response = await fetch('https://api.smtp2go.com/v3/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.SMTP2GO_API_KEY,
      to: [to],
      sender: process.env.EMAIL_FROM ?? 'noreply@peak360.com.au',
      subject,
      html_body: html,
    }),
  });

  if (!response.ok) {
    throw new Error(`SMTP2Go error: ${response.statusText}`);
  }
}
