const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

export async function sendEmail({ to, subject, html, text, replyTo }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!apiKey || !senderEmail) {
    console.warn('Brevo not configured (BREVO_API_KEY / BREVO_SENDER_EMAIL) — skipping email');
    return null;
  }

  const recipients = (Array.isArray(to) ? to : [to])
    .map((t) => (typeof t === 'string' ? { email: t } : t))
    .filter((t) => t && t.email);
  if (recipients.length === 0) return null;

  const payload = {
    sender: {
      name: process.env.BREVO_SENDER_NAME || 'Kalendar',
      email: senderEmail,
    },
    to: recipients,
    subject,
    htmlContent: html,
  };
  if (text) payload.textContent = text;
  if (replyTo) payload.replyTo = typeof replyTo === 'string' ? { email: replyTo } : replyTo;

  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo ${res.status}: ${body}`);
  }
  return await res.json();
}

export function appUrl(path = '') {
  const base = (process.env.APP_URL || 'http://localhost:4200').replace(/\/$/, '');
  return path ? `${base}${path.startsWith('/') ? path : `/${path}`}` : base;
}

export function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatWhen(startsAt, timezone) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone || 'UTC',
      timeZoneName: 'short',
    }).format(new Date(startsAt));
  } catch {
    return new Date(startsAt).toISOString();
  }
}
