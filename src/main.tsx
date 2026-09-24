import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';

// Fail loudly during bootstrap if required env vars are missing so we don't
// ship a silently broken bundle to production. env.ts throws at import time,
// but Vite/ESM hoists imports before the try/catch below can run, so we do an
// explicit sync check here against import.meta.env.
const required = [
  'VITE_APPWRITE_PROJECT_ID',
  'VITE_APPWRITE_DATABASE_ID',
  'VITE_APPWRITE_BUCKET_ID',
];
const missing = required.filter((k) => !import.meta.env[k]);

function renderFatal(message: string) {
  const root = document.getElementById('root');
  if (!root) return;
  root.innerHTML =
    '<div style="font-family:system-ui,-apple-system,sans-serif;padding:24px;line-height:1.6;color:#111;max-width:32rem;margin:0 auto">' +
    '<h1 style="font-size:16px;margin:0 0 8px">配置缺失</h1>' +
    '<p style="font-size:13px;color:#666;margin:0 0 12px">' +
    message +
    '</p>' +
    '<p style="font-size:12px;color:#888;margin:0">请检查 .env 或 GitHub Actions Secrets。</p>' +
    '</div>';
}

if (missing.length > 0) {
  renderFatal(`缺少环境变量: ${missing.join(', ')}`);
  throw new Error(`Missing required env: ${missing.join(', ')}`);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
