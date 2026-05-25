interface BrandedEmailOptions {
  preheader: string; // hidden preview text
  eyebrow?: string; // small mono label, defaults to 'SECURE ACCESS'
  heading: string; // e.g. 'Sign in to Peak360'
  intro: string; // one short paragraph
  ctaLabel: string; // button text
  ctaUrl: string; // button + fallback link
  footnote: string; // expiry / ignore note
}

// Branded transactional email matching the peak360.com.au landing aesthetic:
// near-black canvas, warm-cream ink, gold accents, Inter Tight + JetBrains Mono,
// sharp-cornered gold CTA. Bulletproof: table layout, all-inline styles, web
// fonts loaded via <style> @import with graceful web-safe fallbacks (clients
// that strip web fonts — e.g. Gmail — fall back to Helvetica/Arial cleanly).
export function renderBrandedEmail(o: BrandedEmailOptions): string {
  const eyebrow = o.eyebrow ?? 'SECURE ACCESS';
  // Landing tokens (src/app/landing.css): --bg #0a0a0b, --gold #c9a24a,
  // --champagne #e8d6a8, --text #ece5d3, --text-dim rgba(236,229,211,0.62).
  const sans = "'Inter Tight', 'Helvetica Neue', Helvetica, Arial, sans-serif";
  const mono = "'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, monospace";
  const logo = 'https://peak360.com.au/landing/peak360-logo.png';
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark" />
<meta name="supported-color-schemes" content="dark" />
<title>${o.heading}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
body { margin:0; padding:0; }
a { text-decoration:none; }
</style>
</head>
<body style="margin:0; padding:0; background-color:#0a0a0b; -webkit-text-size-adjust:100%;">
<div style="display:none; max-height:0; overflow:hidden; opacity:0; color:#0a0a0b; font-size:1px; line-height:1px;">${o.preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0b;">
  <tr>
    <td align="center" style="padding:48px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; width:100%; background-color:#0a0a0b; border:1px solid rgba(232,214,168,0.20);">
        <!-- Logo -->
        <tr>
          <td align="center" style="padding:40px 44px 0 44px;">
            <img src="${logo}" alt="PEAK360" width="148" style="display:block; width:148px; max-width:55%; height:auto; margin:0 auto; border:0; outline:none;" />
          </td>
        </tr>
        <!-- Eyebrow -->
        <tr>
          <td align="center" style="padding:22px 44px 0 44px;">
            <div style="font-family:${mono}; font-size:11px; letter-spacing:0.18em; text-transform:uppercase; color:#c9a24a;">
              <span style="display:inline-block; width:28px; height:1px; background-color:#c9a24a; opacity:0.5; vertical-align:middle; margin-right:12px;"></span>${eyebrow}
            </div>
          </td>
        </tr>
        <!-- Heading + intro -->
        <tr>
          <td align="center" style="padding:18px 44px 0 44px;">
            <h1 style="margin:0; font-family:${sans}; font-size:30px; line-height:1.15; letter-spacing:-0.01em; color:#ece5d3; font-weight:500;">${o.heading}</h1>
            <p style="margin:18px 0 0 0; font-family:${sans}; font-size:15px; line-height:1.6; color:rgba(236,229,211,0.62);">${o.intro}</p>
          </td>
        </tr>
        <!-- CTA (bulletproof, sharp corners to match landing .btn-gold) -->
        <tr>
          <td align="center" style="padding:30px 44px 0 44px;">
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td align="center" bgcolor="#c9a24a" style="border-radius:0;">
                  <a href="${o.ctaUrl}" target="_blank" style="display:inline-block; padding:16px 34px; font-family:${sans}; font-size:13px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#0a0a0b; text-decoration:none;">${o.ctaLabel}</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Fallback link -->
        <tr>
          <td align="center" style="padding:22px 44px 0 44px;">
            <p style="margin:0; font-family:${mono}; font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:rgba(236,229,211,0.38);">or paste this link into your browser</p>
            <p style="margin:8px 0 0 0; font-family:${mono}; font-size:11px; line-height:1.5; word-break:break-all;"><a href="${o.ctaUrl}" style="color:#c9a24a; text-decoration:underline;">${o.ctaUrl}</a></p>
          </td>
        </tr>
        <tr><td style="padding:30px 44px 0 44px;"><div style="height:1px; background-color:rgba(232,214,168,0.12); line-height:1px; font-size:0;">&nbsp;</div></td></tr>
        <!-- Footnote -->
        <tr>
          <td style="padding:18px 44px 0 44px;">
            <p style="margin:0; font-family:${sans}; font-size:12px; line-height:1.6; color:rgba(236,229,211,0.45);">${o.footnote}</p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td align="center" style="padding:24px 44px 40px 44px;">
            <div style="font-family:${mono}; font-size:9px; letter-spacing:0.22em; text-transform:uppercase; color:rgba(236,229,211,0.30);">Authorised access only &middot; Activity monitored</div>
            <div style="font-family:${mono}; font-size:10px; letter-spacing:0.1em; color:rgba(236,229,211,0.30); margin-top:10px;">Peak360 &middot; noreply@peak360.com.au</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
