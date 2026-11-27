import { createHash, randomBytes } from 'node:crypto';

const DEFAULT_SITE_URL = 'https://cdysta1.github.io/m1infinitas-internal-website';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildSubmissionEmail({ projectTitle, card, inboxUrl }) {
  const safeTitle = escapeHtml(projectTitle || '未命名项目');
  const safeName = escapeHtml(card.name);
  const safeWechat = card.wechat ? escapeHtml(card.wechat) : '';
  const safeBio = card.bio ? escapeHtml(card.bio).replaceAll('\n', '<br />') : '';
  const safeNote = card.note ? escapeHtml(card.note).replaceAll('\n', '<br />') : '';
  const safeTags = Array.isArray(card.tags) && card.tags.length > 0
    ? card.tags.map((tag) => escapeHtml(tag)).join(' · ')
    : '';
  const safeInboxUrl = escapeHtml(inboxUrl);

  const subject = `[M1 Infinitas] 《${projectTitle || '未命名项目'}》收到来自 ${card.name} 的新投递`;
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Helvetica Neue',sans-serif;max-width:540px;margin:0 auto;padding:24px;color:#141414;background:#ffffff;">
      <p style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#737373;margin:0 0 12px;">M1 INFINITAS · 投递通知</p>
      <h1 style="font-size:20px;line-height:1.4;margin:0 0 18px;font-weight:600;">《${safeTitle}》收到新投递</h1>
      <div style="background:#f5f5f5;border-radius:16px;padding:18px 20px;margin-bottom:20px;">
        <p style="margin:0;font-size:16px;font-weight:600;">${safeName}</p>
        ${safeWechat ? `<p style="margin:6px 0 0;font-size:13px;color:#525252;">微信号：${safeWechat}</p>` : ''}
        ${safeBio ? `<p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#262626;">${safeBio}</p>` : ''}
        ${safeTags ? `<p style="margin:10px 0 0;font-size:12px;color:#737373;">${safeTags}</p>` : ''}
        ${safeNote ? `<div style="margin:14px 0 0;padding:12px 14px;background:#ffffff;border-radius:12px;font-size:14px;line-height:1.6;color:#141414;">${safeNote}</div>` : ''}
      </div>
      <a href="${safeInboxUrl}" style="display:inline-block;padding:10px 22px;background:#141414;color:#ffffff;text-decoration:none;border-radius:999px;font-size:14px;font-weight:500;">前往收件箱查看</a>
      <p style="margin:20px 0 0;font-size:12px;color:#8c8c8c;">可在 M1 Infinitas 个人主页「资料」中随时关闭邮件提醒。</p>
    </div>
  `.trim();

  return { subject, html };
}

// Node 22 Appwrite Function. Only accept executions from registered members.
export default async function main({ req, res, error }) {
  const env = process.env;
  const headers = { 'Content-Type': 'application/json', 'X-Appwrite-Project': env.APPWRITE_FUNCTION_PROJECT_ID };
  const endpoint = (env.APPWRITE_FUNCTION_API_ENDPOINT || '').replace(/\/+$/, '');
  const jwt = req.headers['x-appwrite-user-jwt'];
  if (!jwt) return res.json({ error: 'Sign in required' }, 401);
  const apiKey = req.headers['x-appwrite-key'];
  if (!apiKey) return res.json({ error: 'Server configuration error' }, 500);
  const privileged = { 'X-Appwrite-Key': apiKey };
  const asUser = { 'X-Appwrite-JWT': jwt };
  const db = '/databases/' + encodeURIComponent(env.DATABASE_ID || 'm1_internal') + '/collections/';
  async function api(path, auth, body) {
    const response = await fetch(endpoint + path, {
      method: body ? 'POST' : 'GET', headers: { ...headers, ...auth },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw Object.assign(new Error('Appwrite request failed'), { status: response.status });
    return response.json();
  }

  async function notifyRecipientByEmail({ ownerId, projectTitle, card }) {
    const useMessaging = env.USE_APPWRITE_MESSAGING === 'true';
    const resendKey = (env.RESEND_API_KEY || '').trim();
    const brevoKey = (env.BREVO_API_KEY || '').trim();
    const mailFrom = (env.MAIL_FROM || '').trim();
    if (!useMessaging && !(resendKey && mailFrom) && !(brevoKey && mailFrom)) return;

    const recipient = await api('/users/' + encodeURIComponent(ownerId), privileged);
    if (!recipient?.email || recipient.status === false || recipient.prefs?.email_on_submission === false) return;

    const siteUrl = (env.SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '');
    const inboxUrl = `${siteUrl}/#/me?tab=inbox`;
    const { subject, html } = buildSubmissionEmail({ projectTitle, card, inboxUrl });

    if (useMessaging) {
      const messageId = randomBytes(16).toString('hex');
      await api('/messaging/messages/email', privileged, {
        messageId,
        subject,
        content: html,
        users: [ownerId],
        html: true,
        draft: false,
      });
      return;
    }

    if (resendKey && mailFrom) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: mailFrom,
          to: [recipient.email],
          subject,
          html,
        }),
      });
      if (!response.ok) throw new Error(`Resend failed (${response.status})`);
      return;
    }

    if (brevoKey && mailFrom) {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'M1 Infinitas', email: mailFrom },
          to: [{ email: recipient.email, name: recipient.name || undefined }],
          subject,
          htmlContent: html,
        }),
      });
      if (!response.ok) throw new Error(`Brevo failed (${response.status})`);
    }
  }

  let input;
  try {
    input = req.bodyJson;
  } catch {
    return res.json({ error: 'Invalid JSON body' }, 400);
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return res.json({ error: 'Invalid request body' }, 400);
  }
  try {
    const account = await api('/account', asUser);
    if (!account.email) return res.json({ error: 'Registered account required' }, 403);
    if (input.action === 'counts') {
      // Preferences are the original source of favorites, including pre-release saves.
      const counts = Object.create(null);
      let cursor;
      do {
        const params = new URLSearchParams();
        params.append('queries[]', JSON.stringify({ method: 'limit', values: [100] }));
        if (cursor) params.append('queries[]', JSON.stringify({ method: 'cursorAfter', values: [cursor] }));
        const { users } = await api('/users?' + params, privileged);
        for (const user of users) {
          if (!user.email || user.status === false) continue;
          const ids = user.prefs?.favorite_project_ids;
          if (Array.isArray(ids)) for (const id of new Set(ids)) {
            if (typeof id === 'string') counts[id] = (counts[id] || 0) + 1;
          }
        }
        cursor = users.length === 100 ? users.at(-1).$id : undefined;
      } while (cursor);
      return res.json(counts);
    }
    if (input.action !== 'send' || typeof input.projectId !== 'string' || !input.projectId) return res.json({}, 400);
    const snapshot = input.snapshot;
    const limits = { name: 100, wechat: 100, bio: 4000, note: 500 };
    if (!snapshot || typeof snapshot !== 'object'
      || !Object.entries(limits).every(([key, limit]) => typeof snapshot[key] === 'string' && snapshot[key].length <= limit)
      || !snapshot.name.trim() || !Array.isArray(snapshot.tags) || snapshot.tags.length > 100
      || !snapshot.tags.every(tag => typeof tag === 'string' && tag.length <= 100)) return res.json({}, 400);
    const project = await api(db + 'projects/documents/' + encodeURIComponent(input.projectId), asUser);
    if (!project.owner_id || typeof project.owner_id !== 'string') return res.json({ error: 'Invalid project owner' }, 400);
    if (project.status !== 'active') return res.json({ error: 'Project is not active' }, 403);
    if (project.owner_id === account.$id) return res.json({}, 403);
    const documentId = createHash('sha256').update(JSON.stringify([account.$id, project.$id])).digest('hex').slice(0, 36);
    const cleanCard = {
      name: snapshot.name.trim(),
      wechat: snapshot.wechat.trim(),
      bio: snapshot.bio,
      tags: snapshot.tags,
      note: snapshot.note.trim(),
    };
    const projectTitle = typeof project.title === 'string' ? project.title.slice(0, 80) : '';
    const data = {
      sender_id: account.$id, recipient_id: project.owner_id, project_id: project.$id,
      project_title: projectTitle,
      snapshot: JSON.stringify(cleanCard),
    };
    let created = false;
    try {
      await api(db + 'project_submissions/documents', privileged, {
        documentId, data, permissions: [account.$id, project.owner_id].map(id => 'read("user:' + id + '")'),
      });
      created = true;
    } catch (err) {
      if (err.status !== 409) throw err;
    }
    if (created) {
      try {
        await notifyRecipientByEmail({
          ownerId: project.owner_id,
          projectTitle,
          card: cleanCard,
        });
      } catch (mailErr) {
        error('Submission email notification failed: ' + (mailErr?.message || mailErr?.status || 'unknown'));
      }
    }
    return res.json({ sent: true });
  } catch (err) {
    error('Project interaction failed (' + (err.status || 500) + ')');
    return res.json({ error: 'Request failed' }, err.status || 500);
  }
}
