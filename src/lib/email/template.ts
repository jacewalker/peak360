interface BrandedEmailOptions {
  preheader: string; // hidden preview text
  eyebrow?: string; // small mono label, defaults to 'PEAK360 · ACCESS'
  heading: string; // e.g. 'Sign in to Peak360'
  intro: string; // one short paragraph
  ctaLabel: string; // button text
  ctaUrl: string; // button + fallback link
  footnote: string; // expiry / ignore note
}

export function renderBrandedEmail(o: BrandedEmailOptions): string {
  const eyebrow = o.eyebrow ?? 'PEAK360 · ACCESS';
  const serif = "Georgia, 'Times New Roman', serif";
  const sans =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark light" />
<meta name="supported-color-schemes" content="dark light" />
<title>${o.heading}</title>
</head>
<body style="margin:0; padding:0; background-color:#0a1628; -webkit-text-size-adjust:100%;">
<div style="display:none; max-height:0; overflow:hidden; opacity:0; color:#0a1628; font-size:1px; line-height:1px;">${o.preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a1628;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; width:100%; background-color:#0f2440; border:1px solid rgba(201,162,74,0.28); border-radius:16px;">
        <!-- Brand header -->
        <tr>
          <td style="padding:36px 40px 8px 40px;" align="center">
            <div style="font-family:${sans}; font-size:11px; letter-spacing:0.32em; text-transform:uppercase; color:#c9a24a; font-weight:600;">${eyebrow}</div>
            <div style="font-family:${serif}; font-size:30px; letter-spacing:0.12em; color:#e8d6a8; font-weight:400; margin-top:12px;">PEAK360</div>
          </td>
        </tr>
        <tr><td style="padding:0 40px;"><div style="height:1px; background:linear-gradient(to right, rgba(201,162,74,0), rgba(201,162,74,0.5), rgba(201,162,74,0)); line-height:1px; font-size:0;">&nbsp;</div></td></tr>
        <!-- Body -->
        <tr>
          <td style="padding:28px 40px 8px 40px;">
            <h1 style="margin:0; font-family:${serif}; font-size:24px; line-height:1.25; color:#f5f3ee; font-weight:400;">${o.heading}</h1>
            <p style="margin:16px 0 0 0; font-family:${sans}; font-size:15px; line-height:1.6; color:#aab2c0;">${o.intro}</p>
          </td>
        </tr>
        <!-- CTA (bulletproof) -->
        <tr>
          <td style="padding:28px 40px 8px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" bgcolor="#c9a24a" style="border-radius:10px;">
                  <a href="${o.ctaUrl}" target="_blank" style="display:inline-block; padding:14px 30px; font-family:${sans}; font-size:15px; font-weight:600; color:#0a1628; text-decoration:none; border-radius:10px;">${o.ctaLabel}</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Fallback link -->
        <tr>
          <td style="padding:12px 40px 0 40px;">
            <p style="margin:0; font-family:${sans}; font-size:12px; line-height:1.5; color:#6b7686;">Or paste this link into your browser:</p>
            <p style="margin:4px 0 0 0; font-family:${sans}; font-size:12px; line-height:1.5; word-break:break-all;"><a href="${o.ctaUrl}" style="color:#c9a24a; text-decoration:underline;">${o.ctaUrl}</a></p>
          </td>
        </tr>
        <tr><td style="padding:24px 40px 0 40px;"><div style="height:1px; background-color:rgba(255,255,255,0.08); line-height:1px; font-size:0;">&nbsp;</div></td></tr>
        <!-- Footnote -->
        <tr>
          <td style="padding:16px 40px 4px 40px;">
            <p style="margin:0; font-family:${sans}; font-size:12px; line-height:1.55; color:#6b7686;">${o.footnote}</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 40px 32px 40px;" align="center">
            <div style="font-family:${sans}; font-size:10px; letter-spacing:0.24em; text-transform:uppercase; color:#4f5a6b;">Authorised access only &middot; Activity monitored</div>
            <div style="font-family:${sans}; font-size:11px; color:#4f5a6b; margin-top:8px;">Peak360 &middot; noreply@peak360.com.au</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
