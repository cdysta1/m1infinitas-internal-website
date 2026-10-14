import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const ts = require('typescript');
let currentAccount = 'alice';
let failNextWrite = false;
const preferences = new Map([['alice', { untouched: 'keep' }], ['bob', {}]]);
const cached = new Map();
globalThis.localStorage = {
  getItem: (key) => cached.get(key) ?? null,
  setItem: (key, value) => cached.set(key, String(value)),
  removeItem: (key) => cached.delete(key),
};
globalThis.__i18nTestAccount = {
  getPrefs: async () => ({ ...preferences.get(currentAccount) }),
  updatePrefs: async (value) => {
    await new Promise((resolve) => setTimeout(resolve, 5));
    if (failNextWrite) {
      failNextWrite = false;
      throw new Error('Simulated failed write');
    }
    preferences.set(currentAccount, value);
    return value;
  },
};

const bundle = await build({
  stdin: {
    contents: [
      "export * from './src/i18n/messages.ts';",
      "export * from './src/i18n/memberLabels.ts';",
      "export * from './src/lib/memberDirectory.ts';",
      "export * from './src/lib/memberCategories.ts';",
      "export * from './src/lib/utils.ts';",
      "export * from './src/services/languagePreference.ts';",
      "export * from './src/services/projectFavorites.ts';",
      "export * from './src/services/memberFavorites.ts';",
      "export * from './src/services/preferences.ts';",
    ].join('\n'),
    resolveDir: process.cwd(), loader: 'ts',
  },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{
    name: 'isolated-account-fixture',
    setup(builder) {
      builder.onResolve({ filter: /^@\/lib\/(appwrite|env)$/ }, ({ path: file }) => ({ path: file, namespace: 'fixture' }));
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path: file }) => ({
        contents: file.endsWith('env')
          ? 'export const env = { demoMode: false };'
          : 'export const account = globalThis.__i18nTestAccount;',
        loader: 'js',
      }));
    },
  }],
});
const model = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
assert.equal(model.translate('en', '选择一个分类'), 'Choose a category');
assert.equal(model.translate('zh', '在人的疆域上'), '在人的疆域上');
assert.equal(model.translate('en', '移除第 {index} 个媒体', { index: 3 }), 'Remove media 3');
assert.equal(model.translate('en', 'constructor'), 'constructor');
assert.equal(model.translateMemberLabel('en', 'constructor'), 'constructor');
assert.equal(model.translateError('en', new Error('项目介绍不能超过 500 字'), '保存失败'), 'The description must be no longer than 500 characters.');
assert.equal(model.formatRelativeTime(new Date(Date.now() - 120_000), 'en'), '2 minutes ago');
assert.equal(model.formatRelativeTime(new Date(Date.now() - 120_000), 'zh'), '2分钟前');

const members = model.buildMembersDirectory([], []);
assert.equal(members.length, 48);
members.forEach(({ meta }) => [meta.focus, ...meta.tags, ...meta.areas, ...meta.contacts.map(({ label }) => label)].forEach((label) => {
  assert(!/\p{Script=Han}/u.test(model.translateMemberLabel('en', label)), `Untranslated member label: ${label}`);
  assert.equal(model.translateMemberLabel('zh', label), label);
}));
const visitCategories = (categories) => categories.forEach((category) => {
  assert(!/\p{Script=Han}/u.test(model.translateMemberLabel('en', category.label)), `Untranslated category: ${category.label}`);
  if (category.children) visitCategories(category.children);
});
visitCategories(model.MEMBER_CATEGORIES);
assert.deepEqual(members.filter((member) => model.matchesMemberQuery(member, 'violin')).map(({ profile }) => profile.name), ['陶鑫然 Raven']);
assert.deepEqual(members.filter((member) => model.matchesMemberQuery(member, 'yangqin')).map(({ profile }) => profile.name), ['华易']);

const uiKeys = new Set();
const collectStrings = (node) => {
  if (ts.isStringLiteral(node)) uiKeys.add(node.text);
  else if (ts.isConditionalExpression(node)) {
    collectStrings(node.whenTrue);
    collectStrings(node.whenFalse);
  }
};
const scan = async (directory) => {
  for (const file of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, file.name);
    if (file.isDirectory()) { await scan(absolute); continue; }
    if (!/\.tsx?$/.test(file.name)) continue;
    const source = await readFile(absolute, 'utf8');
    const ast = ts.createSourceFile(absolute, source, ts.ScriptTarget.Latest, true, file.name.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const visit = (node) => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        if (node.expression.text === 't' && node.arguments[0]) collectStrings(node.arguments[0]);
        if (node.expression.text === 'errorText' && node.arguments[1]) collectStrings(node.arguments[1]);
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
  }
};
await scan('src');
for (const key of uiKeys) assert.equal(typeof model.EN_MESSAGES[key], 'string', `Missing English UI message: ${key}`);

assert.equal(await model.getLanguagePreference('alice'), null);
const parallelWrites = Promise.all([
  model.saveLanguagePreference('alice', 'en'),
  model.saveFavoriteProjectIds('alice', ['project-a']),
  model.saveFavoriteMemberIds('alice', ['member-a']),
]);
await model.waitForAccountPreferenceWrites();
await parallelWrites;
assert.deepEqual(preferences.get('alice'), {
  untouched: 'keep', ui_language: 'en', favorite_project_ids: ['project-a'], favorite_member_ids: ['member-a'],
});
assert.equal(await model.getLanguagePreference('alice'), 'en');
assert.equal(model.readCachedLanguage('bob'), null);
currentAccount = 'bob';
assert.equal(await model.getLanguagePreference('bob'), null);
await model.saveLanguagePreference('bob', 'zh');
assert.equal(model.readCachedLanguage('bob'), 'zh');
assert.equal(model.readCachedLanguage('alice'), 'en');
cached.delete(model.getLanguageStorageKey('bob'));
assert.equal(await model.getLanguagePreference('bob'), 'zh', 'A new device should load the account preference');
failNextWrite = true;
await assert.rejects(model.saveFavoriteProjectIds('bob', ['failed-project']));
await model.saveFavoriteMemberIds('bob', ['member-b']);
assert.deepEqual(preferences.get('bob'), { ui_language: 'zh', favorite_member_ids: ['member-b'] });

console.log(JSON.stringify({
  i18nChecks: 'passed', uiMessages: uiKeys.size, rosterMembers: members.length,
  bilingualSkillSearch: true, accountScopedLanguages: true, concurrentPreferencesPreserved: true,
}));
