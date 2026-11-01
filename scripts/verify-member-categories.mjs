import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  stdin: {
    contents: "export * from './src/lib/memberCategories.ts';\nexport * from './src/lib/memberDirectory.ts';",
    resolveDir: process.cwd(), loader: 'ts',
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
});
const { toggleMemberCategory: toggle, removeMemberCategory: remove, matchesMemberCategories: matches, matchesMemberQuery, searchMembers, buildMembersDirectory } = await import(
  `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`
);

assert.deepEqual(toggle(['all'], 'all'), []);
assert.deepEqual(toggle(['all'], 'music'), ['music']);
assert.deepEqual(toggle(['music'], 'performance'), ['performance']);
assert.deepEqual(toggle(['performance'], 'violin'), ['violin']);
assert.deepEqual(toggle(['violin'], 'yangqin'), ['violin', 'yangqin']);
assert.deepEqual(toggle(['violin', 'yangqin'], 'violin'), ['yangqin']);
assert.deepEqual(toggle(['yangqin'], 'yangqin'), ['performance']);
assert.deepEqual(toggle(['performance'], 'performance'), ['music']);
assert.deepEqual(toggle(['music'], 'music'), []);
assert.deepEqual(toggle(['violin', 'yangqin'], 'performance'), ['music']);
assert.deepEqual(toggle(['violin', 'yangqin'], 'music'), []);
assert.deepEqual(remove(['violin', 'visual'], 'violin'), ['visual', 'performance']);
assert.deepEqual(remove(['violin', 'recording'], 'violin'), ['recording', 'performance']);
assert.deepEqual(remove(['violin', 'recording'], 'performance'), ['recording']);
assert.deepEqual(remove(['recording'], 'recording'), ['music-engineering']);
assert.deepEqual(remove(['screenwriting'], 'screenwriting'), ['theatre']);
assert.deepEqual(remove(['theatre'], 'theatre'), ['theatre-spatial']);
assert.deepEqual(remove(['visual', 'music'], 'music'), ['visual']);
assert.deepEqual(remove(['all'], 'all'), []);
assert.deepEqual(remove(['violin'], 'unknown'), ['violin']);
assert.deepEqual(remove(['all'], 'violin'), ['all']);

const member = (areas, tags = []) => ({
  profile: { $id: 'fixture', name: 'Fixture', wechat: '' },
  meta: { areas, tags, focus: '', description: '', contacts: [] },
  aliases: [], projects: [],
});
const musicOnly = member(['音乐'], ['小提琴']);
const multidisciplinary = member(['音乐', '视觉', '数字媒体', '研究'], ['小提琴', '扬琴', '录音', '混音']);
assert.equal(matches(musicOnly, ['all']), true);
assert.equal(matches(musicOnly, []), false);
assert.equal(matches(musicOnly, ['music', 'visual']), false);
assert.equal(matches(multidisciplinary, ['music', 'visual']), true);
assert.equal(matches(member(['音乐', '视觉']), ['music', 'visual', 'digital']), false);
assert.equal(matches(multidisciplinary, ['music', 'visual', 'digital']), true);
assert.equal(matches(member(['音乐', '视觉', '数字媒体']), ['music', 'visual', 'digital', 'research']), false);
assert.equal(matches(multidisciplinary, ['music', 'visual', 'digital', 'research']), true);
assert.equal(matches(musicOnly, ['violin', 'yangqin']), false);
assert.equal(matches(multidisciplinary, ['violin', 'yangqin']), true);
assert.equal(matches(member(['音乐'], ['小提琴', '扬琴']), ['violin', 'yangqin', 'recording']), false);
assert.equal(matches(multidisciplinary, ['violin', 'yangqin', 'recording', 'mixing']), true);
assert.equal(matches(musicOnly, ['visual', 'violin']), false);
assert.equal(matches(multidisciplinary, ['visual', 'violin']), true);
assert.equal(matches(multidisciplinary, ['all', 'unknown']), false);
assert.equal(matches(member([], ['小提琴']), ['music']), true);

const members = buildMembersDirectory([], []);
const namesFor = (ids) => members.filter((entry) => matches(entry, ids)).map(({ profile }) => profile.name);
assert.equal(namesFor(['all']).length, 48);
assert.deepEqual(namesFor(['violin', 'yangqin']), []);
assert.deepEqual(namesFor(['music', 'visual', 'digital']), ['张天澍 Tredd', '牟兰']);
assert.deepEqual(namesFor(['music', 'visual', 'digital', 'research']), []);
assert.deepEqual(namesFor(['dj', 'recording', 'film-music', 'synthesizer-performance']), ['张天澍 Tredd']);
const namesForQuery = (ids, query) => members
  .filter((entry) => matches(entry, ids) && matchesMemberQuery(entry, query))
  .map(({ profile }) => profile.name);
assert.deepEqual(namesForQuery(['music', 'visual', 'digital'], 'Tredd'), ['张天澍 Tredd']);
assert.deepEqual(namesForQuery(['music', 'visual', 'digital'], 'Raven'), []);
assert.deepEqual(namesForQuery(['all'], 'violin'), ['陶鑫然 Raven']);
assert.deepEqual(namesForQuery(['all'], '小提琴'), ['陶鑫然 Raven']);
for (const query of ['dia', 'Dia', 'DIA', '  dia  ', 'Ｄｉａ']) {
  assert.deepEqual(namesForQuery(['all'], query), ['Dia'], 'A member name must not match the suffix of media');
}
assert.deepEqual(namesForQuery(['music', 'operations', 'research'], 'dia'), ['Dia']);
assert.deepEqual(namesForQuery(['visual'], 'dia'), [], 'Name search must keep selected category constraints');
assert(namesForQuery(['all'], 'digital media').length > 0);
assert(namesForQuery(['all'], 'digi').length > 0);
assert.deepEqual(searchMembers(members, '').map(({ profile }) => profile.name), members.map(({ profile }) => profile.name));
const rankedFixture = [
  { ...member(['数字媒体']), profile: { $id: 'topic', name: 'Other', wechat: '' }, meta: { ...member([]).meta, description: 'A dialogue about digital media' } },
  { ...member([]), profile: { $id: 'prefix', name: 'Diana', wechat: '' } },
  { ...member([]), profile: { $id: 'alias', name: 'Another artist', wechat: '' }, aliases: ['Día'] },
  { ...member([]), profile: { $id: 'exact', name: 'Dia', wechat: '' } },
];
assert.deepEqual(searchMembers(rankedFixture, 'dia').map(({ profile }) => profile.$id), ['alias', 'exact', 'prefix', 'topic']);
assert.deepEqual(rankedFixture.map(({ profile }) => profile.$id), ['topic', 'prefix', 'alias', 'exact'], 'Searching must not reorder the source array');

console.log(JSON.stringify({
  memberCategories: 'passed', parentFallback: true, multiSelectPreserved: true, rootDeselection: true,
  intersectionMatching: true, twoThreeFourTags: true, memberNameSearch: true, nameRanking: true,
}));
