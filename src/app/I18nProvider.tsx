import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { translate, translateError, type Language, type MessageValues } from '@/i18n/messages';
import { cacheLanguage, getInitialLanguage, getLanguagePreference, getLanguageStorageKey, isLanguage, readCachedLanguage, saveLanguagePreference } from '@/services/languagePreference';

interface I18nContextValue {
  language: Language;
  locale: 'zh-CN' | 'en-US';
  ready: boolean;
  savingLanguage: boolean;
  t: (message: string, values?: MessageValues) => string;
  errorText: (error: unknown, fallback: string) => string;
  chooseLanguage: (language: Language) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user, status } = useAuth();
  const userId = user?.$id;
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const ready = status !== 'loading' && (!userId || loadedUserId === userId);
  const locale = language === 'zh' ? 'zh-CN' : 'en-US';

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    let canceled = false;
    setSavingLanguage(false);
    setLoadedUserId(null);
    if (!userId) return;

    const applyPreference = (saved: Language | null) => {
      if (canceled) return;
      if (saved) {
        setLanguage(saved);
        cacheLanguage(saved, userId);
      }
      setLoadedUserId(userId);
    };
    void getLanguagePreference(userId)
      .then(applyPreference)
      .catch(() => applyPreference(readCachedLanguage(userId)));
    return () => { canceled = true; };
  }, [userId]);

  useEffect(() => {
    const syncLanguage = (event: StorageEvent) => {
      if (!userId || event.key !== getLanguageStorageKey(userId) || !isLanguage(event.newValue)) return;
      setLanguage(event.newValue);
      setLoadedUserId(userId);
    };
    window.addEventListener('storage', syncLanguage);
    return () => window.removeEventListener('storage', syncLanguage);
  }, [userId]);

  const t = useCallback((message: string, values?: MessageValues) => translate(language, message, values), [language]);
  const errorText = useCallback((error: unknown, fallback: string) => translateError(language, error, fallback), [language]);
  const chooseLanguage = useCallback((nextLanguage: Language) => {
    setLanguage(nextLanguage);
    if (!userId) {
      cacheLanguage(nextLanguage);
      return;
    }
    setSavingLanguage(true);
    void saveLanguagePreference(userId, nextLanguage)
      .catch(() => toast.error(translate(nextLanguage, '语言偏好保存失败，请稍后再试')))
      .finally(() => setSavingLanguage(false));
  }, [userId]);

  const value = useMemo<I18nContextValue>(() => ({
    language, locale, ready, savingLanguage, t, errorText, chooseLanguage,
  }), [language, locale, ready, savingLanguage, t, errorText, chooseLanguage]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used within I18nProvider');
  return value;
}
