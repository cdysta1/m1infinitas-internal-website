import { useI18n } from '@/app/I18nProvider';
import { cn } from '@/lib/utils';

export function LanguageSwitcher() {
  const { t, language, ready, savingLanguage, chooseLanguage } = useI18n();
  return (
    <div
      role="group"
      aria-label={t('切换语言')}
      aria-busy={savingLanguage}
      className="inline-grid h-8 w-16 shrink-0 grid-cols-2 rounded-full border bg-muted/50 p-0.5"
    >
      {([{ id: 'zh', label: '中', name: '简体中文', lang: 'zh-CN' }, { id: 'en', label: 'EN', name: 'English', lang: 'en' }] as const).map((option) => (
        <button
          key={option.id}
          type="button"
          lang={option.lang}
          onClick={() => chooseLanguage(option.id)}
          disabled={!ready || savingLanguage}
          aria-label={option.name}
          title={option.name}
          aria-pressed={language === option.id}
          className={cn(
            'flex items-center justify-center rounded-full text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
            language === option.id
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:bg-background hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
