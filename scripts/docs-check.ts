/**
 * Docs consistency gate — verifies that everything the .md files claim about
 * the repository still exists. Pure Node, no build deps.
 * Usage: npx vite-node scripts/docs-check.ts   (or: npm run docs:check)
 *
 * Checks:
 *  1. Relative markdown links [x](path) resolve to an existing file.
 *  2. Obsidian [[wiki-links]] resolve to a .md in the vault (by name or path).
 *  3. Project paths cited in backticks (src/…, scripts/…, Docs/…, public/…)
 *     exist on disk — the docs' "sources of truth" must not point at renamed
 *     or deleted files.
 *  4. `npm run <name>` mentions match package.json scripts.
 *
 * Intentional exemptions (graveyard rule):
 *  - Inside Docs/GDD/Archive/** code paths may point at deleted files — the
 *    archive documents what was removed ("Файл (удалён)"), and that is its job.
 *  - Docs/GDD/Drafts/Mechanic_Name.md is the template placeholder name in
 *    AGENTS.md Phase A, never a real draft.
 *  - dist/… is not checked: CI runs this gate before `npm run build`.
 *
 * Why it exists: the repo's workflow treats docs as contract (GDD/Architecture
 * name exact classes and files). Drift creeps in silently after refactors —
 * found SimContext/frame-name/path staleness during the 2026-09 audit. This
 * gate turns that audit into a repeatable check.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.obsidian', 'screenshots']);
const ARCHIVE_PREFIX = 'Docs/GDD/Archive';
const ALLOWED_MISSING = new Set(['Docs/GDD/Drafts/Mechanic_Name.md']);

/** Collect every .md file (relative, slash-separated display uses '/' below). */
function collectMarkdown(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) collectMarkdown(join(dir, e.name), out);
    } else if (e.isFile() && e.name.endsWith('.md')) {
      out.push(join(dir, e.name));
    }
  }
  return out;
}

const files = collectMarkdown('.');
const mdBasenames = new Set(files.map((f) => f.split(/[\\/]/).pop()!.replace(/\.md$/, '')));

/** Known npm scripts (package.json) — checked by check 4. */
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const npmScripts = new Set(Object.keys(pkg.scripts));

const issues: string[] = [];
let checked = 0;

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split('\n').length;
}

/**
 * Neutralise fenced blocks and inline code (length/newlines preserved, so
 * indices still align with the original). Link checks must not parse syntax
 * citations; the path/npm-script checks still run on the RAW text, because
 * cited paths and `npm run` mentions legitimately live in backticks.
 */
function maskCode(t: string): string {
  return t
    .replace(/^```[\s\S]*?^```/gm, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/`[^`\n]*`/g, (m) => m.replace(/[^\n]/g, ' '));
}

function report(file: string, text: string, index: number, what: string, target: string) {
  issues.push(`${relative(ROOT, join(ROOT, file)).split(sep).join('/')}:${lineOf(text, index)}  ${what}: ${target}`);
}

// Longest extensions first: `tsx` must win over `ts` (a plain prefix match
// would otherwise read "Foo.tsx" as missing "Foo.ts").
const PATH_IN_TEXT =
  /(?<![\w/.\-])((?:src|scripts|Docs|public)\/[\w/\-.]*?\.(?:tsx|jsx|ts|js|mjs|cjs|json|css|html|md|svg|png|woff2|glb))(?![\w])/g;
const MD_LINK = /\]\(([^)\s#]+)(#[^)]*)?\)/g;
const WIKI_LINK = /\[\[([^\]|#]+)(#[^\]|]*)?(\|[^\]]*)?\]\]/g;
const NPM_RUN = /npm\s+run\s+([\w:\-]+)/g;

for (const file of files) {
  const text = readFileSync(join(ROOT, file), 'utf8');
  const textNoCode = maskCode(text);
  const isArchive = relative(ROOT, join(ROOT, file)).split(sep).join('/').startsWith(ARCHIVE_PREFIX);

  // 1. relative markdown links
  for (const m of textNoCode.matchAll(MD_LINK)) {
    const target = m[1]!;
    if (/^(https?:|mailto:|#)/i.test(target)) continue;
    checked++;
    const abs = resolve(dirname(join(ROOT, file)), decodeURI(target));
    if (!existsSync(abs)) report(file, text, m.index!, 'broken link', target);
  }

  // 2. [[wiki-links]] (Obsidian): by basename inside the vault, or as a path
  for (const m of textNoCode.matchAll(WIKI_LINK)) {
    const target = m[1]!.trim();
    checked++;
    const basename = target.split('/').pop()!;
    const byName = mdBasenames.has(basename);
    const byPath = existsSync(resolve(dirname(join(ROOT, file)), `${target}.md`));
    if (!byName && !byPath) report(file, text, m.index!, 'unresolved wiki-link', target);
  }

  // 3. project paths cited in backticks must exist (graveyard rule for Archive)
  if (!isArchive) {
    for (const m of text.matchAll(PATH_IN_TEXT)) {
      const p = m[1]!;
      if (ALLOWED_MISSING.has(p)) continue;
      checked++;
      if (!existsSync(join(ROOT, p))) report(file, text, m.index!, 'path does not exist', p);
    }
  }

  // 4. `npm run X` must be a real script
  for (const m of text.matchAll(NPM_RUN)) {
    const s = m[1]!;
    if (s === 'run' || s === 'install' || s === 'ci') continue;
    checked++;
    if (!npmScripts.has(s)) report(file, text, m.index!, 'unknown npm script', `npm run ${s}`);
  }
}

if (issues.length) {
  console.log(`docs-check: ${issues.length} issue(s)\n`);
  for (const i of issues) console.log(`  ${i}`);
  process.exit(1);
}
console.log(`docs-check OK — ${files.length} .md files, ${checked} references verified`);
