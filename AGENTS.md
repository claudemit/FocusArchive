# Project Agent Instructions

## Required context

Before changing application code, read in order:

1. `PRD.md`
2. `TECH_SPEC.md`
3. `EDITOR_STATE_SCHEMA.md`
4. `COMPONENTS.md`
5. the current phase in `CURSOR_TASKS.md`

The machine-readable schema at `src/core/state/editor-state.schema.json` is the state contract. If a state change is necessary, update the schema, TypeScript types, defaults, migrations, tests, and relevant documentation in the same phase.

## Execution rules

- Work on one Cursor phase at a time.
- Do not add later-phase features while completing an earlier phase.
- Keep rendering algorithms in `src/core`; UI components only dispatch typed actions.
- Preview and export must use the same artwork renderer.
- Never draw selection outlines or resize handles into the artwork renderer.
- Never persist object URLs, decoded image objects, DOM nodes, Canvas instances, or JSBridge handles in EditorState.
- Preserve deterministic typography: the same state and font environment must produce the same item layout.
- Treat offline container compliance as a hard requirement from the first build.
- Do not add network requests, external CDN assets, inline scripts, dynamic code execution, Worker, WebAssembly, iframe, browser download, or module scripts to the final artifact.

## Verification

Run the phase-specific checks in `CURSOR_TASKS.md`, `npm run verify`, and the
workspace `minitool-zip-builder` audits only when the user explicitly requests
verification, packaging, deployment, or final delivery. Do not run full `dist/`
and ZIP audits automatically after an ordinary code change. For any check that
is not run, state that scope clearly; never represent an unrun check as passed.

For ordinary changes, use only the smallest relevant local check when it helps
prevent an immediate regression. A browser preview remains development evidence,
not a real-device TEST.

## Delivery workflow

- `npm run dev` is for local DEV preview; static verification is required only
  when the user explicitly requests verification, packaging, deployment, or
  final delivery.
- `npm run deploy:test` creates an immutable TEST ZIP, hash, deployment record, and phone-test report. A browser preview is not a real-device TEST.
- Do not run `npm run release` unless the user provides the exact current-release approval `PROD:<releaseId>` in this conversation. Do not confirm platform publication without `CONFIRM_PROD:<releaseId>`, and do not roll back without `ROLLBACK:<releaseId>`.
- Keep platform-specific calls behind `assets/platform/xhs-minitool.js`; do not directly access `window.xhs.miniTool` from application logic.
