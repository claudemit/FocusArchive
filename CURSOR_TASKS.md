# Cursor Agent Phased Tasks

Execute one phase at a time. Start each Cursor task by reading `AGENTS.md`, `PRD.md`, `TECH_SPEC.md`, `EDITOR_STATE_SCHEMA.md`, and the relevant sections of `COMPONENTS.md`. Do not claim a phase complete until its gate passes and its verification is recorded in this file or the Agent Workspace task record.

## Global rules for every phase

- Preserve the architecture boundaries and import direction.
- Keep the final mini-tool artifact offline, classic-script, and Chrome 61 compatible.
- Make small reviewable changes and avoid implementing later-phase scope.
- Add/update tests with every core behavior.
- Update Schema, TypeScript types, defaults, migrations, tests, and docs together for state changes.
- Use only generated/non-personal images in committed tests.
- Record untested target behavior explicitly; never infer real-device performance.

---

## Phase 0 — Foundation and artifact contract

### Cursor prompt

```text
Implement Phase 0 of Focus Archive only.

Read AGENTS.md, PRD.md, TECH_SPEC.md, EDITOR_STATE_SCHEMA.md, COMPONENTS.md, and CURSOR_TASKS.md. Scaffold a React 18 + TypeScript project with a local development workflow and a production IIFE/classic-script artifact targeting Chrome 61/ES2017. Keep the provided EditorState JSON Schema and TypeScript types authoritative. Add canonical defaults, a reducer/store skeleton, schema/default validation tests, and build/package scripts.

The production dist must place index.html at its root, reference only relative local assets, load an external classic app.js without type=module, and contain no inline script. Add a deterministic artifact checker for forbidden external URLs, module scripts/imports, inline handlers/scripts, eval/new Function, Worker/WebAssembly, fetch/XHR/WebSocket, iframe/object, window.open, and browser download behavior. Do not implement image editing UI beyond a minimal shell that proves the build runs.

Run typecheck, tests, production build, artifact checker, and inspect the dist tree. Report exact results and any Chrome 61 behavior not yet tested.
```

### Deliverables

- Project/tooling scaffold.
- Static root HTML and external classic bundle.
- Defaults matching `EDITOR_STATE_SCHEMA.md`.
- Reducer/store and history interfaces without feature logic.
- Unit test setup and fake JSBridge seam.
- Artifact checker and ZIP pack script.

### Gate

- Clean install succeeds from lockfile.
- Typecheck/tests/build pass.
- `dist/index.html` is at root and has no inline/module script.
- Artifact checker passes a good fixture and fails known-bad fixtures.
- ZIP contains `index.html` at root, not under `dist/`.

---

## Phase 1 — Image lifecycle and shared renderer

### Cursor prompt

```text
Implement Phase 1 of Focus Archive only: local image selection, validation/decode/downsampling, normalized stage display, shared Canvas artwork renderer, and development export preview.

Use the ImageAssetRegistry boundary. Never store File, Blob URL, decoded image, Canvas, DOM refs, data URI, or temporary file paths in EditorState. Enforce the PRD byte/dimension/pixel limits and TECH_SPEC working-size calculation. Revoke object URLs on replace/failure/dispose. Preserve the previous project when replacement decode fails.

Implement renderArtwork with the final layer API, but in this phase draw only the neutral/recommended background source. ArtworkCanvas must schedule preview through that same function. Development export preview must call the same renderer at working dimensions; do not add browser download. Add generated coordinate/color-grid fixtures to prove aspect ratio, orientation assumptions, contain-fit mapping, and preview/export spatial parity.

Do not implement focus interaction, filters, typography, or JSBridge save yet. Run and report the phase gate.
```

### Deliverables

- `ImageAssetRegistry`, decode, validation, working-size modules.
- Empty/loading/ready/error image UI.
- Responsive stage with normalized/document/artwork/viewport conversion utilities.
- Base `renderArtwork` and coalesced preview scheduler.
- In-app development export preview.

### Gate

- Valid JPG/PNG/WebP flows work; corrupt/oversized cases are recoverable.
- Object URL cleanup tests pass.
- A wide, portrait, and square generated fixture fit without crop/stretch.
- Preview/export renderer calls use identical document inputs and verified spatial mapping.
- No user image bytes enter logs, fixtures, or persisted state.

---

## Phase 2 — Focus region and pointer interaction

### Cursor prompt

```text
Implement Phase 2 only: one rectangle/circle focus region, Canvas clip rendering, and SVG selection interaction.

Build all move/resize/clamp math as pure functions in src/core/geometry. Respect the schema's different rectangle and circle radius coordinate semantics. Use Pointer Events, setPointerCapture, and a clear idle/moving-region/resizing-region state machine. Handle pointerup, pointercancel, and lostpointercapture. Use separate visual handles and at least 44x44 CSS-pixel hit targets. Add keyboard move support. The editor selection outline must remain visible regardless of artwork border state and must never enter renderArtwork.

At neutral focus transform/adjustments, the clipped focus pixels must align exactly with the background. Add exact geometry tests and generated renderer fixtures. Do not implement zoom/pan/mirror/rotation, color controls, typography, or final border controls. Run and report the phase gate.
```

### Deliverables

- Rectangle and circle clip layers.
- Pure move/resize/clamp/coordinate modules.
- SVG overlay, handles, pointer capture, keyboard movement.
- One-history-entry gesture behavior.

### Gate

- Every handle behaves correctly at all artwork edges.
- Circle remains circular in artwork pixels for portrait/wide sources.
- Pointer cancel never leaves an active gesture.
- Neutral focus pixels align with background in renderer fixture.
- Resize/move commits one undo step each.

---

## Phase 3 — Adjustments, focus transforms, and artwork border

### Cursor prompt

```text
Implement Phase 3 only: independent background/focus adjustments, composable focus transform, content-pan mode, and exportable artwork border.

Keep adjustment mapping exclusively in core/render/filters and follow TECH_SPEC order/semantics. Detect Canvas 2D context.filter support. Implement and test the documented pixel fallback with reusable buffers, or return a clear unsupported backend if the fallback cannot yet meet correctness; never silently show/export different results. Coalesce slider updates and commit one history entry per gesture.

Apply focus transform in the specified center/rotate/scale-mirror/pan order and clamp pan against source bounds. When full clip coverage is mathematically impossible within the allowed scale, preserve the already-rendered background beneath it and expose the documented non-blocking coverage warning. Add explicit Move frame / Move content mode. Implement scale 1..3, rotation -180..180, flipX, reset, and border solid/dashed/none with six-digit hex color and 0..10 design-pixel width. Draw artwork border in Canvas; keep selection UI separate.

Add generated grid fixtures for transform order, alignment, filter independence, pan constraints, and border exclusion/inclusion. Do not implement typography or JSBridge save. Run and report the phase gate.
```

### Deliverables

- Filter mapping/backends and background/focus controls.
- Focus scale, rotation, mirror, pan, reset.
- Mode switch and pan constraint geometry.
- Artwork border controls/renderer.

### Gate

- All adjustment boundary mappings are tested.
- Background changes do not alter focus settings and vice versa.
- Transform combinations never create transparent final pixels; infeasible full-focus coverage reports the documented warning.
- Neutral transform preserves exact alignment.
- `border:none` still shows editor selection but saves no border.
- Preview and development export share filter/transform output within documented pixel tolerance.

---

## Phase 4 — Deterministic typography

### Cursor prompt

```text
Implement Phase 4 only: tokenization, seeded typography layout, controls, and Canvas rendering.

Do not use Intl.Segmenter, Unicode property escapes, Math.random inside layout, external fonts, or unbounded retry loops. Implement Auto/Words/Characters rules from TECH_SPEC for Chinese, English, mixed text, punctuation, whitespace, and emoji. Use a stored 32-bit seed and deterministic PRNG. Resolve the three system font presets and bracket styles (), 「」, and {}.

Generate 1..100 items with size/rotation/opacity ranges. Keep rotated item bounds inside the artwork, avoid focus plus design-pixel padding when enabled, attempt to avoid prior items, cap attempts at 80 per item, and return a placement summary. Persist generated items. Only documented typography-affecting changes regenerate them; color/border/export changes must not.

Render stored typography after the focus artwork border. Add repeatability, bounds, avoidance, finite-termination, invalidation, and render-order tests. Run and report the phase gate.
```

### Deliverables

- Tokenizer/bracket/font/PRNG/measurement/layout modules.
- Typography controls and regenerate action.
- Canvas typography layer and partial-placement notice.

### Gate

- Same seed/settings/source/font environment produces identical items.
- New seed changes layout.
- All items are bounded; avoidance works for rectangle and circle.
- Dense impossible layouts terminate and report skipped items.
- Unrelated edits preserve item positions.
- Output layer order is background → focus → border → typography.

---

## Phase 5 — Product UI, history, resilience, and accessibility

### Cursor prompt

```text
Implement Phase 5 only: complete wide/compact editor UI, all error/progress states, undo/redo/reset behavior, and accessibility/responsive polish.

Use the component ownership in COMPONENTS.md. Do not duplicate tool logic between desktop panels and mobile tool sheet. Build a Chrome 61-compatible Flexbox baseline with explicit fallbacks for unsupported modern CSS. Respect viewport-fit=cover, the combined safe-area variable/env pattern, visualViewport soft-keyboard changes, min-width/min-height overflow rules, visible touch states, and baseline :focus styling.

Ensure 44x44 CSS-pixel touch targets, labeled controls, numeric slider output, keyboard operations, confirm dialogs for replace/reset, and recoverable errors. Continuous gestures create one history entry, UI/runtime changes create none, history is capped at 50, and image replace starts a new root after confirmation.

Do not add new product features. Run integration tests across wide/compact viewport sizes and report any target WebView behavior still untested.
```

### Deliverables

- Finished five-tool information architecture.
- Shared wide/compact controls.
- Undo/redo/reset and confirmations.
- All required feedback/error states.
- Responsive/safe-area/soft-keyboard/accessibility behavior.

### Gate

- End-to-end editing flow works at representative desktop and mobile viewports.
- No critical action depends on hover.
- Panel scroll and stage gestures do not conflict.
- Soft keyboard does not permanently hide active text/export controls.
- History behavior matches document/UI/runtime partition rules.
- Automated accessibility checks and manual keyboard pass have no critical findings.

---

## Phase 6 — Xiaohongshu save and final package

### Cursor prompt

```text
Implement Phase 6 only: PNG/JPEG export settings, Xiaohongshu JSBridge save, final compatibility remediation, audit, ZIP packaging, and delivery evidence.

Export at bounded working dimensions through the common renderArtwork function. PNG and JPEG quality settings must match the schema. On explicit user action, create a complete data URI, call window.xhs.miniTool.writeTempFile({data}) without stripping its prefix, then call saveImageToPhotosAlbum({filePath}). Map bridge absence, permission denial, temp-file failure, album-save failure, and render failure to recoverable UI. Keep the in-app preview adapter development-only; do not ship browser download/window.open fallbacks.

Run typecheck, all unit/renderer/integration tests, production build, artifact checker, and the installed minitool-zip-builder audit script against both dist and the final ZIP. Manually complete every applicable zip structure, device capability, JS, CSS, cross-platform, JSBridge, and performance checklist. Test PC simulator and a real target device if available, recording device/runtime, saved-image parity, large-image behavior, permission retry, touch, keyboard, memory observations, and timings. Mark unavailable real-device/Chrome 61 checks explicitly untested.

Package the contents of dist so index.html is directly at ZIP root. Report exact paths, sizes, test/audit results, remaining untested items, and known limitations. Do not mark the Agent Workspace task complete unless required behavior is implemented and all available gates pass.
```

### Deliverables

- PNG/JPEG renderer settings and save progress.
- Typed Xiaohongshu save adapter and failures.
- Passing production artifact and final root-entry ZIP.
- Verification report with measured vs untested distinctions.

### Gate

- Fake-bridge success and every failure branch pass.
- Saved output contains no editor overlay and matches preview within tolerance.
- `writeTempFile` receives a complete data URI; album save receives returned local path.
- `dist/` and ZIP audits contain no errors; ZIP ≤10 MiB and target ≤2 MiB or has a documented reason.
- `index.html` is at ZIP root and every asset is local/relative.
- No forbidden capabilities or modern-only syntax remain in the shipping artifact.
- Simulator and device results are recorded; missing target tests are clearly labeled, not assumed.

---

## Completion update for Agent Workspace

When all phases are complete, update:

`D:\agent-workspace\tasks\active\2026-09-12-focus-archive-v1.md`

Move it to `tasks/completed/` only after the final ZIP and verification evidence exist. Update `projects/focus-archive/project.yaml` and `projects/PROJECT-INDEX.md` status from `planning` to `active` during Phase 0, and to the appropriate shipped/maintenance status only after Phase 6.
