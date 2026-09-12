# Component and Source Directory Contract

This document defines ownership before implementation. Directory names may be adjusted during Phase 0 only if the same boundaries and import direction are preserved.

## 1. Proposed tree

```text
.
├─ public/
│  └─ index.html                    # static shipping template; classic external script
├─ scripts/
│  ├─ build-artifact.mjs            # build/copy/check root artifact
│  ├─ check-artifact.mjs            # CSP/offline/forbidden-pattern gate
│  └─ package-zip.mjs               # zip contents of dist, not dist folder
├─ src/
│  ├─ main.tsx
│  ├─ app/
│  │  ├─ App.tsx
│  │  ├─ create-editor-store.ts
│  │  ├─ defaults.ts
│  │  ├─ actions.ts
│  │  ├─ reducer.ts
│  │  ├─ history.ts
│  │  └─ selectors.ts
│  ├─ components/
│  │  ├─ layout/
│  │  │  ├─ EditorShell.tsx
│  │  │  ├─ TopBar.tsx
│  │  │  ├─ DesktopPanels.tsx
│  │  │  ├─ MobileToolBar.tsx
│  │  │  └─ MobileToolSheet.tsx
│  │  ├─ stage/
│  │  │  ├─ ArtworkStage.tsx
│  │  │  ├─ ArtworkCanvas.tsx
│  │  │  ├─ InteractionOverlay.tsx
│  │  │  ├─ RectSelection.tsx
│  │  │  ├─ CircleSelection.tsx
│  │  │  └─ ResizeHandle.tsx
│  │  ├─ panels/
│  │  │  ├─ ImagePanel.tsx
│  │  │  ├─ FocusPanel.tsx
│  │  │  ├─ ColorPanel.tsx
│  │  │  ├─ TypographyPanel.tsx
│  │  │  └─ ExportPanel.tsx
│  │  ├─ controls/
│  │  │  ├─ LabeledSlider.tsx
│  │  │  ├─ SegmentedControl.tsx
│  │  │  ├─ ColorField.tsx
│  │  │  ├─ NumberField.tsx
│  │  │  ├─ Toggle.tsx
│  │  │  └─ ActionButton.tsx
│  │  └─ feedback/
│  │     ├─ EmptyState.tsx
│  │     ├─ BusyOverlay.tsx
│  │     ├─ InlineNotice.tsx
│  │     ├─ ErrorBanner.tsx
│  │     └─ ConfirmDialog.tsx
│  ├─ core/
│  │  ├─ state/
│  │  │  ├─ editor-state.schema.json
│  │  │  ├─ types.ts
│  │  │  ├─ validate.ts
│  │  │  └─ migrate.ts
│  │  ├─ geometry/
│  │  │  ├─ coordinates.ts
│  │  │  ├─ focus-region.ts
│  │  │  ├─ focus-pan.ts
│  │  │  ├─ intersections.ts
│  │  │  └─ pointer-gesture.ts
│  │  ├─ render/
│  │  │  ├─ render-artwork.ts
│  │  │  ├─ render-background.ts
│  │  │  ├─ render-focus.ts
│  │  │  ├─ render-border.ts
│  │  │  ├─ render-typography.ts
│  │  │  ├─ filters.ts
│  │  │  ├─ pixel-filter-fallback.ts
│  │  │  └─ render-scheduler.ts
│  │  └─ typography/
│  │     ├─ tokenize.ts
│  │     ├─ brackets.ts
│  │     ├─ fonts.ts
│  │     ├─ prng.ts
│  │     ├─ measure.ts
│  │     └─ layout.ts
│  ├─ adapters/
│  │  ├─ image/
│  │  │  ├─ image-asset-registry.ts
│  │  │  ├─ decode-image.ts
│  │  │  └─ working-size.ts
│  │  ├─ export/
│  │  │  ├─ export-artwork.ts
│  │  │  ├─ save-adapter.ts
│  │  │  ├─ xhs-save-adapter.ts
│  │  │  └─ preview-save-adapter.ts
│  │  └─ environment/
│  │     ├─ capabilities.ts
│  │     ├─ app-height.ts
│  │     └─ visibility.ts
│  ├─ styles/
│  │  ├─ tokens.css
│  │  ├─ base.css
│  │  ├─ layout.css
│  │  └─ controls.css
│  └─ test/
│     ├─ fixtures/
│     │  └─ generated-test-image.ts
│     ├─ setup.ts
│     └─ fake-xhs-bridge.ts
├─ tests/
│  ├─ unit/
│  ├─ renderer/
│  └─ integration/
├─ PRD.md
├─ TECH_SPEC.md
├─ EDITOR_STATE_SCHEMA.md
├─ COMPONENTS.md
└─ CURSOR_TASKS.md
```

## 2. Import direction

```text
components ──▶ app ──▶ core
     │          │
     └────────▶ adapters ──▶ core types

core must not import React, components, browser panels, or JSBridge adapters.
```

Allowed:

- Components select state, render controls, and dispatch typed actions.
- App/store code coordinates core operations and adapters.
- Adapters depend on state/core types and platform APIs.
- Core uses platform-neutral types where possible; the renderer module may depend on Canvas 2D interfaces.

Forbidden:

- Panels editing nested state directly.
- Geometry duplicated inside SVG components.
- Renderer reading from DOM controls.
- Export adapter cloning its own render algorithm.
- Core calling `window.xhs`.
- React state containing decoded image pixels or data URIs.

## 3. Component responsibilities

### `EditorShell`

Owns responsive composition only. It selects wide/compact layout via CSS/media behavior and does not copy tool business logic between layouts.

### `TopBar`

Shows product identity, undo/redo availability, reset, and primary export action. It dispatches actions but does not own history.

### `ArtworkStage`

Owns contain-fit measurement, `ViewportTransform`, preview Canvas sizing, and composition of Canvas plus SVG overlay. It does not implement the artwork renderer.

### `ArtworkCanvas`

Holds a Canvas ref, subscribes to render-relevant document changes, and delegates scheduling/drawing. It never renders controls.

### `InteractionOverlay`

Converts pointer/keyboard events to document coordinates, manages pointer capture and gesture lifecycle, and composes the correct selection shape. It calls pure geometry functions and dispatches live/commit actions.

### `RectSelection` / `CircleSelection`

Render editor-only outlines and handles in SVG viewport coordinates. They contain no constraint math.

### Panels

Each panel exposes one product tool group. Panels select validated values and dispatch actions. `ColorPanel` can render two reused adjustment groups but keeps background/focus labels explicit.

### Primitive controls

Controls are presentation components with labels, current-value output, keyboard behavior, disabled/error states, and gesture begin/change/end callbacks. They know no EditorState paths.

### Feedback components

Feedback is recoverable and state-driven. Confirm dialogs trap focus within the baseline browser scope and restore it on close.

## 4. Core module responsibilities

### State

- `types.ts`: compile-time state contract.
- `validate.ts`: dev/import validation entry point.
- `migrate.ts`: version dispatcher; V1 is identity after validation.
- Store/defaults/reducer live under `app` because they coordinate UI/runtime as well as pure document changes.

### Geometry

- All region moves, resizes, clamps, coordinate transforms, hit-independent gesture calculations, and collision functions.
- No DOM reads inside pure geometry functions.
- All aspect-ratio-dependent circle math receives explicit artwork dimensions.

### Render

- `render-artwork.ts` is the sole public compositor.
- Layer modules receive explicit context and data; none read global store.
- `filters.ts` maps product values to backend operations.
- Fallback uses reusable buffers and identical mapping semantics.
- Scheduler is preview-only infrastructure; export calls compositor directly.

### Typography

- Pure tokenization and bracket formatting.
- Explicit font preset resolution.
- Seeded random generation only.
- Layout terminates after a fixed attempt budget and returns items plus placement summary.

## 5. Adapter responsibilities

### Image

Validates, decodes, sizes, registers, and disposes selected image assets. It is the only owner of blob object URLs.

### Export

`export-artwork.ts` builds the data URI using the common renderer. Save adapters only deliver it; they do not redraw or change quality.

### Environment

Performs capability detection once, owns app-height/safe viewport events, and pauses/resumes render scheduling. Capabilities are injected where possible for tests.

## 6. Component testing matrix

| Area | Primary test | Key assertion |
| --- | --- | --- |
| Controls | component/integration | labels, range, keyboard, one gesture commit |
| Stage | integration | contain transform and resize do not mutate document |
| Overlay | integration | capture/cancel, correct action coordinates |
| Geometry | unit | exact bounds and invariants |
| Renderer | generated pixel fixtures | layer order and preview/export parity |
| Typography | unit + renderer | deterministic, bounded, finite placement |
| Image adapter | unit/integration | validation and object URL cleanup |
| Export adapter | fake bridge | complete data URI and failure mapping |
| Layout | responsive integration | wide/compact parity and safe-area behavior |

## 7. Naming and style

- Use product terms consistently: `background`, `focus`, `region`, `transform`, `artwork border`, `typography item`, `preview`, `export`.
- Reserve “selection” for editor UI state; the exportable outline is always “artwork border”.
- Keep units explicit in names where ambiguity exists: `normalizedX`, `artworkWidthPx`, `fontSizeDesignPx`.
- Prefer pure functions and discriminated unions in core modules.
- Comments explain coordinate coordinate or compatibility constraints, not obvious code.
