# CLAUDE.md

Guidance for Claude Code working in this repository. Focus on what isn't obvious from reading the codebase.

## What this app is

Desktop app for managing **CNC/NC programs** (machining data for operators). Tauri v2 shell + SvelteKit frontend + SQLite storage. UI language is **Czech**. Single-window, maximized-on-launch workflow with a data table at its core and per-row edit dialogs.

## Tech stack (non-obvious parts)

- **Svelte 5 with runes** — `$props()`, `$state`, `$derived`. Don't use Svelte 4 reactive statements (`$:`) or `export let`.
- **State lives in `.svelte.ts` files** in [src/lib/](src/lib/) — rune-aware modules (e.g. `programDialogState.svelte.ts`, `toast.svelte.ts`). Plain `.ts` is for non-reactive utilities.
- **SvelteKit with `adapter-static`** — the app is SSG-rendered at build time, there is no Node server. Never add SSR-only code.
- **SQLite via `@tauri-apps/plugin-sql`** — accessed through the singleton in [src/lib/database.ts](src/lib/database.ts). Always call `getDatabase()`; do not call `Database.load` directly.
- **Path aliases**: `$models` → `src/models`, `$components` → `src/components`.
- **Monaco editor** is loaded for the G-code editor. It's heavy — lazy-load where possible.
- **Auto-updater** (`@tauri-apps/plugin-updater`) pulls a manifest from a GitHub Gist (pinned in [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json)). Releases are consumed automatically once published.

## Commands

```bash
bun install              # first-time setup (bun, not npm/pnpm)
bun run dev              # Svelte dev server (port 1420 — Tauri expects this)
bun run tauri dev        # Tauri dev with native window
bun run build            # runs inject-version.js, then Vite build
bun run check            # svelte-check (TypeScript + Svelte diagnostics)
bun run lint             # eslint .ts/.svelte
bun run format           # prettier write
bun run test             # vitest (happy-dom), tests in src/__tests__/
```

Always run `bun run check` before committing — it catches missing icon-map entries (which are a real runtime bug, not just a type error — see *Icon gotcha* below).

## Releasing

**Use the Makefile, not manual file edits:**

```bash
make version VERSION=0.5.4
```

This bumps the version in three places (`package.json`, `src-tauri/tauri.conf.json`, `static/splashscreen.html` via `scripts/inject-version.js`), commits, creates a `v0.5.4` tag, and pushes both the branch and tag. Pushing a `v*` tag triggers [`.github/workflows/release.yml`](.github/workflows/release.yml) which builds for **Windows + Ubuntu** and creates GitHub release artifacts that the auto-updater picks up.

**If you bump manually, don't forget `static/splashscreen.html`** — the splashscreen version string is a separate literal and has bitten us before.

## Design system

All design tokens live in [src/styles/main.css](src/styles/main.css) `:root`. Use them; do **not** introduce hardcoded hex, rgba, shadows, radii, or z-indexes in components.

Available families: colors (primary / danger / success / warning + text / border / bg + `--color-primary-alpha-02/05/06`), spacing (`--space-0` … `--space-10`), radii (`--radius-xs/sm/md/lg/xl`), shadows (`--shadow-sm/md/lg/xl/dialog`), transitions, z-index (`--z-dropdown/sticky/overlay/modal/modal-nested/toast/top`), and component tokens (`--btn-*`, `--input-*`, `--topbar-height`, `--table-*-height`).

Global `--zoom-factor` multiplies all font sizes — the app supports user-adjustable UI scale via TopBar.

### Icon gotcha

The `Icon` component uses `@jamescoyle/svelte-icon`, which writes the `color` prop into the SVG `fill` **attribute**. CSS variables (`var(--…)`) do **not** resolve inside SVG attributes. Icon colors must be literal hex strings.

When you need an icon color to match a design token, duplicate the hex literal and leave a comment pointing to the token (see [Toast.svelte](src/components/Toast.svelte) for the pattern). If you change the token value, search for literal occurrences and update them by hand.

### Dialog naming drift (known tech debt)

Seven dialog components use three different class-naming conventions (`modal-*`, `dialog-*`, bespoke like `column-manager-dialog`). Phase-2 unification (not yet done) is to introduce a shared `Dialog.svelte` shell and migrate everyone to the `dialog-*` prefix. Don't introduce *new* names; pick the one that matches the nearest existing component.

## Platform notes

- **Windows drag-and-drop**: the main window is configured with `dragDropEnabled: false` ([tauri.conf.json](src-tauri/tauri.conf.json)). Without this, Tauri's OLE `IDropTarget` swallows drag events before they reach WebView2, breaking **all** HTML5 DnD (column reordering, snippet reordering, field layout). If you ever need file-drop-from-Explorer, you'll need to handle it in the DOM via `e.dataTransfer.files`, not via `onDragDropEvent`.
- **Keyboard focus**: [main.css](src/styles/main.css) uses `*:focus:not(:focus-visible) { outline: none }` + `*:focus-visible { outline: 2px solid var(--color-primary) }`. Don't reinstate `outline: 0` on `*:focus`.
- **Reduced motion**: globally respected via `@media (prefers-reduced-motion: reduce)`. New animations should not need per-component handling.

## Data model quirks

- SQLite boolean columns are stored as integers (0/1); convert at the edge. See past fix `30fc14c` for the `Copyable` column regression.
- `TableColumn.Type` enum has Czech labels — don't assume English strings.
- File columns can be extension-restricted per column definition; validation happens on selection.

## Testing

- Unit tests only — vitest + happy-dom, no E2E yet. Location: [src/__tests__/](src/__tests__/).
- Co-locate tests near models / lib utilities, not components (existing pattern).

## In-progress work (see [TODO.md](TODO.md), [ROADMAP_TODO.md](ROADMAP_TODO.md))

- Sorting + filtering are partially broken — ongoing
- Conditional row/column formatting
- File preview on hover

## Commit style

Follow conventional-style prefixes the repo already uses: `feat:`, `fix:`, `refactor:`, `chore:`. Keep subject ≤72 chars; put reasoning in the body. Version-bump commits follow the exact pattern `chore: bump version to X.Y.Z` (matched by CI release logic — don't reword).
