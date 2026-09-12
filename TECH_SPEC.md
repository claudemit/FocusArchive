# Focus Archive V1 Technical Specification

Status: Ready for implementation  
Related: `PRD.md`, `EDITOR_STATE_SCHEMA.md`, `COMPONENTS.md`, `CURSOR_TASKS.md`  
Target: Xiaohongshu offline H5 mini-tool container

## 1. Architecture summary

Focus Archive is a single-page, non-destructive image editor with four strict boundaries:

1. **Core** — pure state, geometry, tokenization, seeded layout, render commands, schema migration.
2. **Artwork renderer** — Canvas 2D only; draws exactly what may be saved.
3. **Interaction overlay** — SVG/DOM selection UI; maps pointer input to typed actions and is never exported.
4. **Adapters** — image decode/object URL lifetime, environment capability checks, and Xiaohongshu JSBridge save.

React renders the editor shell and controls. A small typed store owns EditorState and history. Rendering is imperative and scheduled from state changes; Canvas pixels are not mirrored into React state.

```text
local image file
      │
      ▼
ImageAsset adapter ── decoded image (runtime-only)
      │
      ├───────────────┐
      ▼               ▼
EditorState       React controls
      │               │ typed actions
      └──────┬────────┘
             ▼
      renderArtwork()
             │
       ┌─────┴─────┐
       ▼           ▼
 preview Canvas   export Canvas → JSBridge → album

SVG overlay reads geometry and dispatches gestures; it never enters renderArtwork().
```

## 2. Technology choices

### 2.1 Application stack

- React 18 + TypeScript for UI composition.
- A small project-owned reducer/store; Zustand may be used only if the bundled output and Chrome 61 target remain verified. Do not put Canvas/DOM/image objects in the store.
- Canvas 2D for image layers, clipping, artwork border, and typography.
- SVG for selection outlines, handles, and pointer hit targets.
- Vitest for pure core/store tests.
- Playwright or an equivalent browser harness for pointer workflows and preview/export parity in a supported development browser.

### 2.2 Build stack

Use Vite for local development but generate the shipping entry as a single classic IIFE bundle. The recommended production path is a Vite library/IIFE build whose input is `src/main.tsx`, followed by a small build script that copies a static `public/index.html` into `dist/` and validates it.

Required production properties:

- `dist/index.html` is at artifact root.
- JavaScript target is Chrome 61 / ES2017.
- `<script src="./assets/app.js"></script>` has no `type="module"`.
- No `import`, `export`, dynamic import, top-level await, inline script, inline event handler, source map, or external URL remains in `dist/`.
- CSS and bundled assets use relative paths.
- React, state library, and helpers are bundled locally.
- No runtime CDN or network fallback.

If Vite cannot reliably emit this contract, keep Vite for development and use an explicit esbuild IIFE production command. Do not weaken the artifact contract to preserve a preferred tool.

## 3. Runtime/container constraints

The minimum runtime is the Android 8.1-era Chrome/WebView 61 baseline plus the PC simulator.

Forbidden in shipping code:

- `fetch`, `XMLHttpRequest`, WebSocket, EventSource, or external assets;
- Web Worker, SharedWorker, Service Worker, OffscreenCanvas-in-Worker;
- WebAssembly;
- `eval`, `new Function`, dynamic script injection;
- iframe/object;
- `window.open`, `target="_blank"`, `<a download>`;
- clipboard, geolocation, sensors, WebRTC, fullscreen, and unsupported device APIs;
- module scripts/imports in the final artifact.

Allowed and used:

- `<input type="file" accept="image/jpeg,image/png,image/webp">`;
- blob object URLs for selected-image decode/preview;
- Canvas 2D and DOM/SVG;
- localStorage only for small non-sensitive preferences, never image data;
- `window.xhs.miniTool.writeTempFile` and `saveImageToPhotosAlbum` for saving.

## 4. State model

`src/core/state/editor-state.schema.json` is the machine-readable contract. `src/core/state/types.ts` is the compile-time mirror. `EDITOR_STATE_SCHEMA.md` defines invariants that JSON Schema cannot express.

### 4.1 State partitions

```ts
interface EditorState {
  schemaVersion: 1;
  document: EditorDocument;
  ui: EditorUIState;
  runtime: EditorRuntimeState;
}
```

- `document` is serializable, undoable, and sufficient to reproduce artwork given the referenced image asset and font environment.
- `ui` is serializable for debugging but excluded from artwork and history.
- `runtime` contains statuses and capability flags but never heavy/native objects.
- `ImageAssetRegistry` is a separate runtime service keyed by `assetId`; it owns `File`, object URL, decoded image, and cleanup.
- History stores `EditorDocument` snapshots/patches only.

### 4.2 Coordinate systems

There are three coordinate spaces:

1. **Document normalized**: persisted values in `[0,1]` relative to artwork width/height, except circle radius.
2. **Artwork pixels**: renderer target size.
3. **Viewport CSS pixels**: visible fitted stage and overlay.

Rectangle conversion:

```text
pixelX = normalizedX × artworkWidth
pixelY = normalizedY × artworkHeight
pixelW = normalizedWidth × artworkWidth
pixelH = normalizedHeight × artworkHeight
```

Circle radius is normalized against `min(artworkWidth, artworkHeight)` so it stays circular:

```text
pixelCx = cx × artworkWidth
pixelCy = cy × artworkHeight
pixelR  = r × min(artworkWidth, artworkHeight)
```

The stage maintains a `ViewportTransform { scale, offsetX, offsetY }` for contain-fit. SVG pointer positions are converted through its inverse before geometry changes. Never persist viewport coordinates.

## 5. Image lifecycle

### 5.1 Intake

1. File input change supplies one `File`.
2. Validate MIME plus successful decode; do not trust extension alone.
3. Reject file byte size, dimension, or pixel-count violations from the PRD.
4. Create one object URL and decode into an `HTMLImageElement` (or capability-checked `createImageBitmap` if proven consistent in target tests).
5. Read decoded oriented dimensions.
6. Compute a working size respecting both max edge and max pixels.
7. If downsampling, draw once into a reusable source canvas and use that as the immutable working source.
8. Register runtime asset under a generated `assetId`; write only metadata and `assetId` to EditorState.
9. Revoke the previous object URL after the new asset is ready or on disposal.

### 5.2 Working-size calculation

```ts
scale = Math.min(
  1,
  MAX_EDGE / Math.max(sourceWidth, sourceHeight),
  Math.sqrt(MAX_PIXELS / (sourceWidth * sourceHeight))
);

workingWidth = Math.max(1, Math.floor(sourceWidth * scale));
workingHeight = Math.max(1, Math.floor(sourceHeight * scale));
```

V1 constants: `MAX_EDGE = 4096`, `MAX_PIXELS = 8_000_000`.

Decode/memory failure is recoverable: clear the partial registry entry, revoke its URL, retain the previous project when replacing, and show a smaller-image suggestion.

## 6. Rendering contract

### 6.1 Public API

```ts
type RenderTarget = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  pixelRatio: number;
};

type RenderEnvironment = {
  source: CanvasImageSource;
  fontResolver: FontResolver;
  filterBackend: FilterBackend;
};

function renderArtwork(
  target: RenderTarget,
  document: EditorDocument,
  environment: RenderEnvironment
): RenderResult;
```

The function draws no editor chrome. Given identical document, source pixels, dimensions, and available fonts, it must be deterministic.

### 6.2 Layer order

1. Clear target.
2. Draw full source with background adjustments.
3. Save context and create rectangle/circle clip.
4. Draw transformed source with focus adjustments.
5. Restore context.
6. Draw exportable focus border.
7. Draw persisted typography items.

### 6.3 Adjustment mapping

State values are renderer inputs, not CSS values assembled in controls.

```text
contrast multiplier   = clamp(1 + contrast / 100, 0, 2)
exposure multiplier   = 2 ^ (exposure / 100)          // -1 to +1 stop-like range
saturation multiplier = clamp(1 + saturation / 100, 0, 2)
hue rotation          = hue degrees
```

Primary backend: Canvas 2D `context.filter`, capability checked once. Compose in the fixed order `brightness → contrast → saturate → hue-rotate` for both preview and export.

Fallback backend: project-owned pure-JS pixel transform operating on a reusable buffer. It must use the same mathematical mapping and fixed order. Because Worker is forbidden, fallback recomputation is throttled/coalesced during gestures and completed on gesture end. If neither backend can complete within memory constraints, show a clear unsupported-device state; do not silently export a different look.

Do not use CSS-filtered DOM images for preview because saved Canvas output would diverge.

### 6.4 Render scheduling

- Store changes set a dirty flag.
- At most one preview render runs per `requestAnimationFrame`.
- If another change arrives while rendering, schedule one additional frame using the latest state.
- Stop render loops on `visibilitychange`; resume with a fresh frame.
- Canvas is resized only when target dimensions/pixel ratio change, not on every state update.
- Cache filter strings and pure geometry calculations by adjustment/region identity.

Canvas 2D preview pixel ratio is capped so preview buffers do not exceed the working pixel budget. Export uses explicit output dimensions and does not depend on device DPR.

## 7. Focus rendering and geometry

### 7.1 Clip path

- Rectangle: `ctx.rect(x, y, width, height)`.
- Circle: `ctx.arc(cx, cy, radius, 0, 2π)`.
- Call `clip()` before focus source drawing.

### 7.2 Content transform

Transforms are applied about the focus center in a fixed order:

1. translate to focus center;
2. rotate;
3. scale by `(flipX ? -scale : scale, scale)`;
4. translate by the constrained pan in artwork pixels;
5. translate back from focus center;
6. draw the same source-to-artwork mapping as the background.

The order is part of the state contract. Changing order is a visual migration.

Pan values are normalized artwork offsets before focus scale. The geometry module calculates valid pan ranges by inverse-transforming focus boundary samples into source/artwork space and clamps after every transform or focus-geometry change. When a scale/rotation/edge-region combination cannot fully cover the clip within the allowed 1×–3× range, the full background layer remains underneath; output never becomes transparent. Record this case as a non-blocking coverage warning rather than silently changing the requested transform.

### 7.3 Geometry constraints

Pure functions own constraints:

```ts
moveRegion(region, delta, artwork): FocusRegion
resizeRegion(region, handle, point, limits): FocusRegion
clampRegion(region, limits): FocusRegion
clampFocusPan(region, transform, artwork): FocusTransform
```

Minimum focus size is defined in artwork pixels derived from a 44 CSS px interaction target and converted through current viewport scale, with a document-level floor of 4% of the shorter artwork edge. Circle radius must fit both axes around its center.

### 7.4 Pointer gesture state machine

```text
idle
 ├─ pointer down on body in frame mode ─▶ moving-region
 ├─ pointer down on body in content mode ▶ panning-content
 └─ pointer down on handle ──────────────▶ resizing-region

active gesture ─ pointerup/pointercancel/lostcapture ─▶ commit one history item ─▶ idle
```

Use Pointer Events, `setPointerCapture`, and document-space start snapshots. Visual handle size and invisible hit target size are separate. Prevent stage scrolling only during an active stage gesture; panels remain scrollable.

## 8. Artwork border

Border is drawn after the clipped focus image and before typography.

- Convert width from 1080-width design pixels: `actualWidth = designWidth * targetWidth / 1080`.
- Center the stroke on the focus path.
- Solid uses an empty dash list.
- Dashed uses a stable design pattern such as `[4 × width, 3 × width]`, with sensible nonzero fallback.
- None skips stroke regardless of color/width.
- Clamp artwork paths inward by half stroke width if necessary so output does not clip the outer half.

The SVG interaction outline uses independent theme tokens and never reads artwork border style as its visibility rule.

## 9. Typography engine

### 9.1 Tokenization

Do not rely on `Intl.Segmenter` or Unicode property escapes at the Chrome 61 baseline.

Implement a code-point scanner using `Array.from(text)` plus explicit range helpers:

- whitespace separates/vanishes;
- ASCII/Latin letters, digits, apostrophes, and internal hyphens accumulate into word runs in Auto mode;
- CJK ranges emit one code point per token;
- other visible symbols emit individual tokens;
- Words mode uses trimmed whitespace runs;
- Characters mode emits every non-whitespace code point.

Test mixed Chinese/English, punctuation, emoji/surrogate pairs, repeated spaces, and empty input.

### 9.2 Seeded PRNG

Use a small deterministic 32-bit algorithm (for example Mulberry32) with integer state. Never use `Math.random()` in layout generation. `Regenerate` creates and stores a new unsigned 32-bit seed using available runtime entropy; layout then uses only the stored seed.

### 9.3 Placement

For every requested item:

1. Choose its token from a seed-shuffled cycle.
2. Sample size, rotation, opacity, and normalized anchor.
3. Resolve bracketed display text and font.
4. Measure width with Canvas `measureText`; approximate height using font size and configured line-height factor because older runtimes lack full bounding metrics.
5. Rotate its rectangle to an axis-aligned bounding box for collision checks.
6. Reject if it crosses the safe inset, intersects focus avoidance geometry, or overlaps a placed item beyond tolerance.
7. Stop after `MAX_ATTEMPTS_PER_ITEM` (recommended 80); mark item skipped.

Use exact rectangle/circle intersection for focus avoidance when practical; a documented conservative bounding-box check is acceptable for the first implementation and must be covered by tests.

Persist successful items as normalized anchors plus sampled size/rotation/opacity and token index. Do not recalculate on ordinary render.

### 9.4 Fonts

V1 presets resolve to local/system stacks only:

- `system-sans`: `-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif`
- `system-serif`: `"Songti SC", SimSun, Georgia, serif`
- `system-mono`: `"SFMono-Regular", Consolas, "Liberation Mono", monospace`

Font metrics can differ between devices. Determinism is guaranteed only within the same font environment. If future product requirements demand pixel-identical layouts across devices, bundle a suitably licensed local font and reassess the 2 MiB package target.

## 10. Store, actions, and history

Document mutations occur only through typed actions, including:

```text
setImageMetadata
setFocusShape
moveFocus
resizeFocus
setFocusTransform
setAdjustment
resetAdjustmentGroup
setBorder
setTypographySettings
regenerateTypography
setExportSettings
resetDocument
undo / redo
```

Rules:

- Reducers enforce ranges and cross-field invariants.
- JSON Schema validates imports/dev fixtures, but reducers still protect runtime actions.
- Gesture begin stores a document snapshot; live updates are transient; gesture end commits one history entry when content changed.
- History default maximum is 50 document entries.
- Loading/replacing an image clears history after confirmation.
- Typography item generation is part of the action that invalidates layout, so state never briefly contains settings and stale items as a committed state.

## 11. Export adapter

### 11.1 Render

1. Set runtime status to `rendering`.
2. Allocate/reuse an export Canvas at document working dimensions.
3. Call `renderArtwork` with the same document/environment as preview.
4. Generate a complete data URI using `canvas.toDataURL(mime, jpegQuality)`.
5. Immediately call the container adapter.
6. Drop the data URI reference and clear/reuse the export canvas after completion.

### 11.2 Save

```ts
const result = await window.xhs.miniTool.writeTempFile({ data: dataUri });
await window.xhs.miniTool.saveImageToPhotosAlbum({ filePath: result.filePath });
```

Do not strip the `data:<mime>;base64,` prefix. Do not pass a network URL. Both calls must follow an explicit user action.

The adapter returns typed outcomes: `saved`, `permission-denied`, `bridge-unavailable`, `temp-file-failed`, `album-save-failed`, or `render-failed`. Preserve the document on every failure.

### 11.3 Development fallback

When the bridge is absent in a non-production development environment, render the result into an in-app preview dialog and expose its dimensions/MIME for QA. The production build must treat missing bridge as an error and must not ship browser download or new-window fallbacks.

## 12. Responsive UI and CSS baseline

- Core layout has a Chrome 61-compatible Flexbox baseline.
- Do not require CSS `gap`, `aspect-ratio`, `clamp`, logical properties, `:has`, container queries, CSS nesting, or dynamic viewport units for core behavior.
- Use margins for baseline spacing; add modern enhancements only behind valid capability detection.
- Set `min-width: 0` / `min-height: 0` on shrinking Flex children.
- Maintain `--app-height` from `visualViewport`/window size when available, with `100vh` fallback.
- Use `viewport-fit=cover` and safe area pattern:
  `var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))`.
- Keep controls visible on touch devices and provide non-hover feedback.
- Do not rely solely on `:focus-visible`; provide a baseline `:focus` style.

## 13. Performance and memory

### Static artifact budgets

- ZIP hard limit: 10 MiB; target: at most 2 MiB.
- No source maps, dev configs, or `node_modules` in ZIP.
- No static Base64 assets above 100 KiB without review; none above 1 MiB.
- Avoid bundled CJK font files in V1.

### Runtime budgets

- Working/export source: max 4096 px edge and 8 MP.
- At most one immutable working-source canvas, one preview canvas, and one reusable scratch/export canvas at high resolution.
- Avoid `getImageData`, `putImageData`, and `toDataURL` per animation frame.
- `toDataURL` occurs only on explicit export.
- Typography collision work is finite: item count ≤100 and attempts ≤80/item.
- Rendering is coalesced to animation frames and stops while page is hidden.
- Actual frame rate, memory, and save latency must be measured on target devices; do not infer them from desktop tests.

If `context.filter` fallback proves too slow on target devices, prefer a clearly reduced live-preview resolution during slider drag followed by a full render on release, rather than changing output semantics.

## 14. Testing strategy

### Unit tests

- Schema/default-state validation and state migrations.
- Normalized/pixel/viewport coordinate round trips.
- Rectangle/circle move and resize constraints.
- Focus pan clamps for scale/rotation/mirror combinations.
- Filter mapping boundary values.
- Tokenization across Chinese, English, mixed text, punctuation, whitespace, and emoji.
- PRNG repeatability and seed variation.
- Typography placement bounds, avoidance, finite termination, and invalidation rules.
- Reducer invariants and one-entry gesture history.

### Renderer tests

Use small deterministic generated fixtures (color grid/coordinate labels) rather than personal images.

- Background and focus remain aligned at neutral transform.
- Clip shapes are correct.
- Scale/pan/mirror/rotation order is stable.
- Adjustment groups are independent.
- Artwork border order/style is correct.
- Typography appears at stored coordinates.
- Editor overlay is absent from export render.

Pixel tests need documented tolerance due to browser font/color differences. Geometry tests should remain exact.

### Integration tests

- Select image → edit rectangle → save preview.
- Circle resize with pointer capture/cancel.
- Switch frame/content mode and pan.
- Continuous slider gesture creates one undo step.
- Regenerate changes layout; unrelated adjustment does not.
- Bridge success and each failure outcome through an injected adapter fake.
- Responsive wide/compact layouts and soft-keyboard viewport change.

### Manual target checks

- PC simulator: image picker, pointer editing, panel scrolling, export/save.
- Real Android target: touch hit areas, long slider drag, soft keyboard, large image, permission denial/retry, saved image parity, memory stability.
- Orientation/viewport resize: no geometry drift.

## 15. Build and delivery gates

Phase 6 is complete only when all pass:

1. Type check and all automated tests.
2. Production build creates `dist/index.html` at root.
3. Static scan finds no forbidden APIs/behaviors or external URLs.
4. Final HTML has no inline/module scripts or inline event handlers.
5. Every referenced asset exists under `dist/` and uses a relative path.
6. Audit `dist/` with the workspace mini-tool artifact audit script.
7. Zip the contents of `dist/`, not the `dist` folder.
8. Audit the final ZIP and inspect its root file list.
9. Record PC simulator result.
10. Record real-device result, or explicitly mark each untested item.

Suggested PowerShell packaging shape (implemented as a project script, not run by hand as a release ritual): enter `dist`, archive its contents, return, then inspect with the Python audit script. Ensure no existing ZIP is silently overwritten without an explicit clean/build action.

## 16. Observability and privacy

V1 has no remote telemetry. Development diagnostics may report non-sensitive values such as render duration, canvas dimensions, placed/skipped text count, and error category. They must not log image bytes, data URIs, object URLs, file names, or user-entered text.

## 17. Known risks

| Risk | Mitigation |
| --- | --- |
| Large decoded images exhaust WebView memory | Intake pixel guard, early downsample, bounded canvases, explicit cleanup, target-device test |
| `context.filter` inconsistency | Capability check, pure-JS fallback, renderer parity tests |
| Preview/export drift | One shared `renderArtwork` function and export parity fixtures |
| Rotated/zoomed focus exposes empty pixels | Conservative geometry-based pan clamp and combination tests |
| Random layout hangs on dense input | Hard item/attempt limits and partial-placement result |
| Fonts shift text across devices | System preset disclosure; persist layout; bundle a font only if future pixel identity is required |
| Vite emits module/inline script | Dedicated IIFE artifact path plus automated HTML/JS gate |
| Browser-style export fails in container | JSBridge-only production adapter and simulator/device tests |

## 18. Architecture decision log

- **Canvas 2D instead of WebGL:** the product is 2D compositing; Canvas reduces bundle/runtime complexity and avoids GPU context lifecycle requirements.
- **SVG overlay instead of Canvas hit testing:** accessible and touch-sized handles are easier to maintain while staying separate from exported art.
- **Normalized coordinates:** responsive preview changes do not mutate the document and export can target any valid pixel size.
- **Persist generated typography items:** random layout does not shift on unrelated state changes.
- **Composable focus transform:** zoom, mirror, rotation, and pan can coexist without a brittle mode enum.
- **Classic IIFE artifact:** required by the offline mini-tool loading contract even though development uses modern TypeScript modules.
