'use strict';

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getMessaging }                  = require('firebase-admin/messaging');

// ── Lazy initialise Firebase Admin SDK ─────────────────────────────────────

let _messaging = null;

function getMsg() {
  if (_messaging) return _messaging;

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // dotenv stores \n as literal \\n inside double-quoted values; normalise
  const privateKey  = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) return null;

  if (!getApps().length) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }

  _messaging = getMessaging();
  return _messaging;
}

// ── sendPush ────────────────────────────────────────────────────────────────

/**
 * Send an FCM push notification via Firebase Admin SDK.
 * Silently skips if Firebase credentials are not configured.
 *
 * @param {string|string[]} tokens   - FCM device token(s)
 * @param {{ title: string, body: string }} notification
 * @param {Record<string, string>} data - extra key/value payload (all strings)
 */
async function sendPush(tokens, notification, data = {}) {
  const messaging = getMsg();
  if (!messaging || !tokens) return;

  const tokenList = Array.isArray(tokens)
    ? tokens.filter(Boolean)
    : [tokens].filter(Boolean);
  if (!tokenList.length) return;

  // FCM requires all data values to be strings
  const safeData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)])
  );

  try {
    const response = await messaging.sendEachForMulticast({
      tokens: tokenList,
      notification: {
        title: notification.title,
        body:  notification.body,
      },
      data: safeData,
      android: {
        priority: 'high',
        notification: { sound: 'default' },
      },
      apns: {
        payload: {
          aps: { sound: 'default' },
        },
      },
    });

    response.responses.forEach((r, i) => {
      if (!r.success) {
        console.warn(`[FCM] token[${i}] failed:`, r.error?.message);
      }
    });
  } catch (err) {
    console.warn('[FCM] sendPush error:', err.message);
  }
}

// ── notifySale ──────────────────────────────────────────────────────────────

/**
 * Notify all admin users of a company about a new sale.
 */
async function notifySale(pool, companyId, saleData) {
  try {
    const { rows } = await pool.query(
      `SELECT u.fcm_token FROM users u
       JOIN roles r ON r.id = u.role_id
       WHERE u.company_id = $1 AND u.is_active = TRUE
         AND r.name = 'admin' AND u.fcm_token IS NOT NULL`,
      [companyId]
    );
    const tokens = rows.map(r => r.fcm_token).filter(Boolean);
    if (!tokens.length) return;

    await sendPush(
      tokens,
      {
        title: `New Sale — ${saleData.reference}`,
        body:  `${saleData.customer_name || 'Walk-in'} • ₨${Number(saleData.total_amount).toFixed(0)} • ${saleData.items} item(s)`,
      },
      {
        type:           'new_sale',
        sale_id:        String(saleData.id),
        reference:      String(saleData.reference),
        total:          String(saleData.total_amount),
        item_count:     String(saleData.items),
        customer_name:  String(saleData.customer_name || 'Walk-in'),
        cashier_name:   String(saleData.cashier_name  || ''),
        payment_method: String(saleData.payment_method || 'cash'),
      }
    );
  } catch {
    // Notification failure must never crash the sale response
  }
}

module.exports = { sendPush, notifySale };
