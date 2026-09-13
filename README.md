# Focus Archive / 局部聚焦

Focus Archive is a docs-first baseline for an offline H5 image editor that creates editorial compositions from one local image.

The V1 product combines:

- one JPG/PNG/WebP input image;
- a movable and resizable rectangle or circle focus region;
- independent background and focus adjustments;
- focus zoom, pan, horizontal mirror, rotation, and artwork border;
- seeded random typography with `()` / `「」` / `{}` wrappers;
- PNG/JPEG rendering and Xiaohongshu album save.

## Read in this order

1. `PRD.md` — product scope and acceptance criteria.
2. `TECH_SPEC.md` — rendering, geometry, build, performance, and export contracts.
3. `EDITOR_STATE_SCHEMA.md` — state semantics and invariants.
4. `src/core/state/editor-state.schema.json` — machine-readable state contract.
5. `COMPONENTS.md` — directory layout and component ownership.
6. `CURSOR_TASKS.md` — phased implementation prompts and gates.

## Current status

Planning baseline complete; application implementation has not started. Execute phases in `CURSOR_TASKS.md` in order and do not mark a phase complete until its gate passes.

## Runtime contract

The final output is a single-page, fully offline Xiaohongshu mini-tool ZIP. It must use a root `index.html`, local relative assets, external classic scripts, an ES2017/Chrome 61 baseline, and no network, Worker, WebAssembly, inline script, `eval`, or browser download APIs.

## Build, test, and release workflow

The project ships its own Windows DEV/TEST/PROD workflow. It uses no third-party npm dependencies; Node.js 18+ and PowerShell 5.1+ are required.

```powershell
npm run verify       # build, static gates, JS syntax, ZIP structure, size audits
npm run dev          # verify, then serve the source for local DEV preview
npm run deploy:test  # build a TEST ZIP and generate a real-device test record
```

`npm run deploy:test` uses the conservative manual adapter by default. It prepares the exact ZIP and SHA-256 for platform upload but never claims an upload or phone result occurred. Production promotion accepts only that retained TEST ZIP after the phone report passes and the user supplies `PROD:<releaseId>`; see `TESTING.md` and `docs/RELEASE_AND_ROLLBACK.md`.
