import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronDown, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/app/I18nProvider';
import { membersDirectoryKey } from '@/hooks/useMembersDirectory';
import { updateProfile } from '@/services/profiles';
import { MEMBER_BIO_LIMIT, MEMBER_TAG_OPTIONS, type MemberDirectoryEntry } from '@/lib/memberDirectory';
import { translateMemberLabel } from '@/i18n/memberLabels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export function MemberCardEditor({ member }: { member: MemberDirectoryEntry }) {
  const { user, refreshProfile } = useAuth();
  const { t, language, errorText } = useI18n();
  const cache = useQueryClient();
  const [bioDraft, setBio] = useState<string | null>(null);
  const [tagDraft, setTags] = useState<string[] | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const bio = bioDraft ?? member.meta.description;
  const tags = tagDraft ?? member.meta.tags;
  const count = Array.from(bio).length;
  const bioChanged = bio !== member.meta.description;
  const tagsChanged = tags.length !== member.meta.tags.length || tags.some(tag => !member.meta.tags.includes(tag));
  const valid = (!bioChanged || count <= MEMBER_BIO_LIMIT) && (bioChanged || tagsChanged);
  const label = (tag: string) => translateMemberLabel(language, tag);
  const query = search.trim().toLocaleLowerCase();
  const options = MEMBER_TAG_OPTIONS.filter(tag =>
    tag.toLocaleLowerCase().includes(query) || label(tag).toLocaleLowerCase().includes(query));

  function toggle(tag: string) {
    setTags(tags.includes(tag) ? tags.filter(item => item !== tag) : [...tags, tag]);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!valid || saving || !user || member.accountId !== user.$id) return;
    setSaving(true);
    try {
      const saved = await updateProfile(user.$id, {
        ...(bioChanged && { member_bio: bio }),
        ...(tagsChanged && { member_tags: tags }),
      });
      cache.setQueryData<MemberDirectoryEntry[]>([...membersDirectoryKey, user.$id], entries =>
        entries?.map(entry => entry.accountId === user.$id ? {
          ...entry, meta: { ...entry.meta, description: saved.member_bio ?? entry.meta.description,
            tags: saved.member_tags ?? entry.meta.tags },
        } : entry));
      setBio(null);
      setTags(null);
      await Promise.all([refreshProfile(), cache.invalidateQueries({ queryKey: membersDirectoryKey })]);
      toast.success(t('已保存'));
    } catch (err) {
      toast.error(errorText(err, '保存失败'));
    } finally {
      setSaving(false);
    }
  }

  const nearLimit = count >= Math.floor(MEMBER_BIO_LIMIT * 0.9) && count <= MEMBER_BIO_LIMIT;

  return (
    <form onSubmit={save} className="mt-8 space-y-5 border-t pt-6">
      <h2 className="text-base font-semibold tracking-tight">{t('我的资料')}</h2>
      <fieldset disabled={saving} className="space-y-5">
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <label htmlFor="member-bio" className="text-xs font-medium tracking-wide text-muted-foreground">
              {t('我的简介')}
            </label>
            <span
              id="bio-count"
              className={cn(
                'font-mono text-[11px] tabular-nums transition-colors',
                count > MEMBER_BIO_LIMIT
                  ? 'font-medium text-destructive'
                  : nearLimit
                    ? 'text-foreground/75'
                    : 'text-muted-foreground/80',
              )}
            >
              {count} / {MEMBER_BIO_LIMIT}
            </span>
          </div>
          <Textarea
            id="member-bio"
            aria-describedby="bio-count"
            aria-invalid={count > MEMBER_BIO_LIMIT}
            placeholder={t('介绍一下你的创作方向、背景或想合作的内容…')}
            value={bio}
            onChange={event => setBio(event.target.value)}
            rows={4}
            className={cn(
              'min-h-[128px]',
              count > MEMBER_BIO_LIMIT && 'border-destructive/60 focus-visible:border-destructive focus-visible:ring-destructive/15',
            )}
          />
        </div>

        <fieldset className="space-y-2.5">
          <legend className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">
            {t('我的标签')}
          </legend>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  aria-label={t('移除标签 {tag}', { tag: label(tag) })}
                  onClick={() => toggle(tag)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                >
                  <span>{label(tag)}</span>
                  <X className="h-3 w-3 opacity-75" aria-hidden />
                </button>
              ))}
            </div>
          )}

          <details className="group rounded-xl border border-border/85 bg-background transition-colors hover:border-foreground/25">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 text-[13px] font-medium text-foreground/85 select-none [&::-webkit-details-marker]:hidden">
              <span>{t('选择已有标签')}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" aria-hidden />
            </summary>
            <div className="border-t border-border/60 px-3.5 pb-3.5 pt-3">
              <Input
                type="search"
                className="mb-3 h-9 md:h-9 md:text-[13px]"
                aria-label={t('搜索已有标签')}
                placeholder={t('搜索已有标签')}
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
              <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto py-0.5">
                {options.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={tags.includes(tag)}
                    onClick={() => toggle(tag)}
                    className="inline-flex h-7 items-center rounded-full border border-border/80 bg-background px-2.5 text-xs text-foreground/80 transition-colors hover:border-foreground/30 hover:text-foreground aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"
                  >
                    {label(tag)}
                  </button>
                ))}
                {!options.length && (
                  <span className="py-1 text-xs text-muted-foreground">{t('没有匹配的标签')}</span>
                )}
              </div>
            </div>
          </details>
        </fieldset>

        <Button type="submit" size="lg" className="w-full rounded-full" disabled={!valid || saving}>
          {saving ? t('保存中…') : t('保存我的资料')}
        </Button>
      </fieldset>
    </form>
  );
}
