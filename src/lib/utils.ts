import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Language } from '@/i18n/messages';

// Merge Tailwind classes with conditional helpers.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// Generate a local-only ID for optimistic UI items.
export function tempId(prefix = 'tmp'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const relativeTimeFormatters = {
  zh: new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' }),
  en: new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' }),
};

// Compact relative time like "刚刚 / 3分钟前 / 昨天 / 5天前 / 2024-08-01".
export function formatRelativeTime(input: string | number | Date, language: Language = 'zh'): string {
  const formatter = relativeTimeFormatters[language];
  const date = input instanceof Date ? input : new Date(input);
  const now = Date.now();
  const diffMs = date.getTime() - now;
  const absMin = Math.abs(diffMs) / 60_000;
  if (absMin < 1) return language === 'zh' ? '刚刚' : 'Just now';
  const absHour = absMin / 60;
  if (absHour < 1) return formatter.format(Math.round(diffMs / 60_000), 'minute');
  if (absHour < 24) return formatter.format(Math.round(diffMs / 3_600_000), 'hour');
  const absDay = absHour / 24;
  if (absDay < 7) return formatter.format(Math.round(diffMs / 86_400_000), 'day');
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

// Absolute datetime for timeline headers.
export function formatDateTime(input: string | number | Date, language: Language = 'zh'): string {
  const date = input instanceof Date ? input : new Date(input);
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Copy text to clipboard with a legacy fallback for non-secure contexts.
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to legacy path
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// Group files into an ordered 3-col grid slice count (1/2/3/4/6/9 style layouts).
export function imageGridColumns(count: number): 1 | 2 | 3 {
  if (count === 1) return 1;
  if (count === 2 || count === 4) return 2;
  return 3;
}
