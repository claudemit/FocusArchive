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
