'use strict';

const logger = require('../config/logger');
const { env } = require('../config/env');

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

async function sendEmail({ to, subject, html, replyTo }) {
  if (!env.RESEND_API_KEY) {
    logger.warn('[mailer] RESEND_API_KEY not configured — skipping email send.');
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [to],
      subject,
      html,
      ...(replyTo && { reply_to: replyTo }),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Resend API responded ${res.status}: ${body.slice(0, 300)}`);
  }
}

// Best-effort — a failure here must never affect the demo-lead request itself,
// so callers fire this without awaiting it and only log on rejection.
async function notifyNewLead(lead) {
  if (!env.LEADS_NOTIFY_EMAIL) {
    logger.warn('[mailer] LEADS_NOTIFY_EMAIL not configured — skipping lead notification.');
    return;
  }
  const html = `
    <h2 style="margin:0 0 12px">New demo request</h2>
    <p style="margin:0 0 12px"><strong>${escapeHtml(lead.name)}</strong> from <strong>${escapeHtml(lead.business)}</strong></p>
    <ul style="margin:0 0 12px;padding-left:18px">
      <li>Email: ${escapeHtml(lead.email)}</li>
      <li>Phone: ${escapeHtml(lead.phone || '—')}</li>
      <li>Business type: ${escapeHtml(lead.business_type || '—')}</li>
      <li>Locations: ${escapeHtml(lead.locations || '—')}</li>
    </ul>
    ${lead.message ? `<p style="margin:0"><strong>What they want to see:</strong><br>${escapeHtml(lead.message)}</p>` : ''}
  `;
  await sendEmail({
    to: env.LEADS_NOTIFY_EMAIL,
    subject: `New demo request — ${lead.business}`,
    html,
    replyTo: lead.email,
  });
}

module.exports = { sendEmail, notifyNewLead };
