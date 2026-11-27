import { createHash } from 'node:crypto';

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
    const data = {
      sender_id: account.$id, recipient_id: project.owner_id, project_id: project.$id,
      project_title: typeof project.title === 'string' ? project.title.slice(0, 80) : '',
      snapshot: JSON.stringify({
        name: snapshot.name.trim(), wechat: snapshot.wechat.trim(), bio: snapshot.bio, tags: snapshot.tags, note: snapshot.note.trim(),
      }),
    };
    try {
      await api(db + 'project_submissions/documents', privileged, {
        documentId, data, permissions: [account.$id, project.owner_id].map(id => 'read("user:' + id + '")'),
      });
    } catch (err) {
      if (err.status !== 409) throw err;
    }
    return res.json({ sent: true });
  } catch (err) {
    error('Project interaction failed (' + (err.status || 500) + ')');
    return res.json({ error: 'Request failed' }, err.status || 500);
  }
}
