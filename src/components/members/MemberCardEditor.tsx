import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  return (
    <form onSubmit={save} className="mt-8 space-y-4 border-t pt-6">
      <h2 className="text-base font-semibold">{t('我的资料')}</h2>
      <fieldset disabled={saving} className="space-y-4">
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <label htmlFor="member-bio" className="text-sm font-medium">{t('我的简介')}</label>
            <span id="bio-count" className={count > MEMBER_BIO_LIMIT ? 'text-sm text-red-600' : 'text-xs text-muted-foreground'}>{count} / {MEMBER_BIO_LIMIT}</span>
          </div>
          <Textarea id="member-bio" aria-describedby="bio-count" aria-invalid={count > MEMBER_BIO_LIMIT} value={bio} onChange={event => setBio(event.target.value)} rows={4} />
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">{t('我的标签')}</legend>
          <div className="flex flex-wrap gap-2">{tags.map(tag =>
            <button key={tag} type="button" aria-label={t('移除标签 {tag}', { tag: label(tag) })} onClick={() => toggle(tag)} className="rounded-full bg-foreground px-3 py-1 text-sm text-background">{label(tag)} ×</button>
          )}</div>
          <details className="rounded-lg border p-3">
            <summary className="cursor-pointer text-sm">{t('选择已有标签')}</summary>
            <Input type="search" className="my-3" aria-label={t('搜索已有标签')} placeholder={t('搜索已有标签')} value={search} onChange={event => setSearch(event.target.value)} />
            <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto p-1">
              {options.map(tag => <button key={tag} type="button" aria-pressed={tags.includes(tag)} onClick={() => toggle(tag)} className="rounded-full border px-3 py-1 text-sm aria-pressed:bg-foreground aria-pressed:text-background">{label(tag)}</button>)}
              {!options.length && <span className="text-sm text-muted-foreground">{t('没有匹配的标签')}</span>}
            </div>
          </details>
        </fieldset>
        <Button type="submit" size="lg" className="w-full rounded-full" disabled={!valid || saving}>{saving ? t('保存中…') : t('保存我的资料')}</Button>
      </fieldset>
    </form>
  );
}
