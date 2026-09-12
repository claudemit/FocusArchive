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

Run the phase-specific checks in `CURSOR_TASKS.md`. Before final delivery, audit both `dist/` and the ZIP with the workspace `minitool-zip-builder` audit script and complete its manual capability, JavaScript, CSS, cross-platform, and performance checklists.
