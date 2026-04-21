# ncprogramy

Desktop app for managing CNC/NC machining programs. Table-centric workflow with per-row edit dialogs, G-code preview, and per-column formatting rules. UI in Czech.

**Stack:** Tauri v2 (Rust shell) · SvelteKit (adapter-static) · Svelte 5 · SQLite · Monaco editor · Chart.js

## Download

Grab the latest installer from the [Releases page](https://github.com/stosmykj/ncprogramy/releases). Windows and Linux builds are published automatically per release tag. The app auto-updates.

## Development

Requires [Bun](https://bun.sh), Rust (for Tauri), and the system dependencies listed in the [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/).

```bash
bun install
bun run tauri dev       # native window with live reload
bun run dev             # frontend only on :1420
bun run check           # svelte-check
bun run lint
bun run test
```

Path aliases: `$models` → `src/models`, `$components` → `src/components`.

## Releasing

```bash
make version VERSION=0.5.4
```

Bumps `package.json`, `src-tauri/tauri.conf.json`, and the splashscreen version; commits; tags `v0.5.4`; pushes branch + tag. The `v*` tag triggers the release workflow (Windows + Ubuntu matrix build) which publishes installer artifacts to the GitHub release. The Tauri auto-updater picks them up from a pinned gist manifest.

## Contributing

See [CLAUDE.md](CLAUDE.md) for architectural conventions and gotchas (Svelte 5 runes, design-token usage, Icon SVG color quirk, Windows drag-drop flag).

## License

MIT
