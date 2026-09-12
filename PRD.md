# Focus Archive V1 Product Requirements

Status: Ready for implementation  
Product: Xiaohongshu offline H5 mini tool  
Primary language: Simplified Chinese  
Last updated: 2026-09-12

## 1. Product definition

Focus Archive is a local, single-image editorial design tool. A user selects one photo, defines a visual focus window, styles the background and focus independently, scatters selected words or Chinese characters around the artwork, then saves a PNG or JPEG result.

The intended visual language is a restrained photography-magazine composition: a muted or darkened full-image background, a clearer or more colorful rectangular/circular focus region, a visible artwork border when selected, and small irregular annotations distributed around the subject.

### Core promise

Select one local image and produce a reusable visual composition in under three minutes, without an account or network connection.

### V1 success criteria

1. A first-time user can select an image, move/resize the focus region, adjust both image layers, add random typography, and save an image without instructions outside the tool.
2. The focus output remains spatially aligned with the background at every preview size.
3. The saved image matches the artwork preview: no selection handles, editor guides, or control overlays appear in output.
4. Rectangle/circle geometry and text layout remain inside the artwork bounds.
5. Re-rendering an unchanged EditorState produces the same pixels in the same runtime/font environment.
6. The final artifact works fully offline and passes the mini-tool package audit.

## 2. Users and jobs

### Primary user

A Xiaohongshu creator who wants a magazine/editorial treatment for a portrait, still life, fashion, architecture, or daily-life photo without opening a desktop design application.

### Main job

“Help me quickly emphasize one part of my image and turn the remaining space into a designed composition I can save and publish.”

### Secondary jobs

- Try multiple focus compositions without damaging the source image.
- Generate alternate text arrangements from the same content.
- Preserve a visual arrangement while changing color adjustments.

## 3. V1 scope

### 3.1 Image input

The user can select exactly one local JPG/JPEG, PNG, or WebP image through the system file picker.

Requirements:

- Image selection is triggered by an explicit user action.
- The app shows decoding progress for large files and an actionable error for unsupported/corrupt files.
- EXIF orientation is respected by the chosen browser decode path.
- Source pixels remain immutable; edits are represented by EditorState.
- A replacement image resets image-dependent focus geometry and text layout only after user confirmation when the current project contains edits.
- V1 accepts files up to 20 MiB, 8192 px on either edge, and 40 megapixels at intake. The working/export canvas is capped at 4096 px on either edge and 8 megapixels. Oversized sources are downsampled with a visible notice.
- The object URL used for preview is revoked when the image is replaced or the editor is disposed.

### 3.2 Artwork and viewport

- The artwork aspect ratio follows the decoded source image.
- The editor scales the artwork to fit available screen space without changing document coordinates.
- The artwork background contains no automatic padding or crop in V1.
- All stored geometry uses normalized artwork coordinates; resizing the UI must not change the composition.
- On mobile, the artwork remains visible while tools open in a bottom panel. On wider screens, tools may use side panels.

### 3.3 Focus region

The editor supports one focus region.

Shapes:

- Rectangle: independently resizable width and height.
- Circle: resizable radius; it must remain a true circle in artwork pixel space.

Interactions:

- Drag inside the region in “Move frame” mode to change its position.
- Drag visible handles to resize it.
- Rectangle provides four corner handles and four edge handles on pointer-capable wide layouts; mobile may show four corners plus touch-accessible edge hit areas.
- Circle provides four cardinal handles; dragging any handle changes radius.
- The region cannot leave the artwork. A minimum on-screen handle separation is enforced.
- Pointer cancel/loss ends the gesture safely without leaving a stuck drag state.
- Keyboard users can move the selected region by one logical step; Shift increases the step.

Initial state after image selection:

- Rectangle, centered.
- Width 50% and height 38% of artwork.
- If the image is unusually narrow, clamp to valid bounds while preserving a practical editable size.

### 3.4 Focus display transforms (Feature A)

The focus window is fixed by its geometry; transformations affect the image content shown inside the window.

The user can combine:

- Scale: 1.00× to 3.00×.
- Content pan: horizontal and vertical offsets constrained against source bounds. The already-rendered background remains beneath the clipped layer, so mathematically infeasible scale/rotation combinations never create transparent final pixels.
- Horizontal mirror: on/off.
- Rotation: -180° to +180°.
- Reset transform.

Interaction mode must be explicit:

- “Move frame” moves the focus geometry.
- “Move content” pans the transformed image within the fixed focus geometry.

The UI may offer Original/Zoom/Mirror/Rotate shortcuts, but state is stored as composable transform parameters rather than a mutually exclusive mode.

### 3.5 Artwork border (Feature B)

The focus region can render an exportable artwork border.

- Style: solid, dashed, or none.
- Color: white, black, or any valid custom hex color.
- Width: 0 to 10 design pixels, defined relative to a 1080 px artwork width and scaled at render time.
- Default: solid white, 2 design pixels.

The editor selection outline and handles are separate from this border. They remain visible while editing even when the artwork border is `none`, and they never appear in the saved image.

### 3.6 Independent color adjustments

Background and focus each have an independent adjustment group:

- Contrast: -100 to +100; default 0.
- Exposure: -100 to +100; default 0.
- Hue: -180° to +180°; default 0°.
- Saturation: -100 to +100; default 0.
- Reset group.

Product semantics:

- “Exposure” is a simple deterministic brightness/EV-style control in V1, not RAW photographic exposure recovery.
- Values update preview during slider interaction with frame-coalesced rendering.
- The renderer owns the exact value mapping; UI components do not construct filter strings.
- Recommended first-use preset: background contrast -10, exposure -15, saturation -65; focus values 0. The user can reset all values to neutral.

### 3.7 Random typography

The user can type or paste a text source and generate exportable annotations.

Tokenization modes:

- Auto: Latin letter/number runs become words; each CJK code point becomes one token; other non-whitespace symbols may become individual tokens.
- Words: split on whitespace and remove empty entries.
- Characters: split by Unicode code point and omit whitespace.

Controls:

- Text source: maximum 500 Unicode code points.
- Item count: 1 to 100. Default is the token count capped at 24. If count exceeds token count, tokens repeat in seeded shuffled cycles.
- Font preset: system sans, system serif, or system mono in V1.
- Minimum and maximum font size: 12 to 96 design pixels; minimum cannot exceed maximum.
- Bracket style: parentheses `()`, corner brackets `「」`, or braces `{}`.
- Rotation range: 0° to ±45°.
- Opacity range: 0.30 to 1.00; minimum cannot exceed maximum.
- Avoid focus: enabled by default.
- Regenerate: creates a new seed and layout.

Layout rules:

- V1 uses “free scatter” layout only.
- Every item stays inside the artwork with a safe edge inset.
- When “avoid focus” is enabled, item bounds avoid the focus shape plus configured padding.
- The algorithm also attempts to avoid other text items.
- Placement uses a finite number of deterministic attempts. If an item cannot be placed, it is skipped and the UI reports how many items were placed; the UI must never loop indefinitely.
- Once generated, layout items are stored in EditorState. Changing unrelated controls must not randomize positions.
- Changing text, tokenization, item count, font preset, size range, rotation range, avoidance, or seed invalidates and regenerates layout.
- Changing color adjustments, border, or export format does not regenerate layout.

### 3.8 History and reset

- Undo and redo cover document-changing actions.
- Continuous slider/drag gestures produce one history entry per completed gesture, not one per pointer move.
- Image binary/runtime resources are not duplicated into history snapshots.
- “Reset adjustments” affects the selected group only.
- “Reset project” requires confirmation and restores defaults while retaining the currently selected image unless the user chooses a new image.

### 3.9 Export and save

Formats:

- PNG, default for quality and transparency-safe behavior.
- JPEG, with quality 0.92 by default and range 0.70–1.00.

Requirements:

- Output uses the processed working artwork dimensions subject to the 4096 px / 8 megapixel cap.
- Preview and export call the same deterministic artwork renderer with different target dimensions.
- Selection overlay, handles, hover states, safe zones, and panel UI are excluded.
- Export runs only after an explicit user action and shows progress.
- In the Xiaohongshu container, the generated complete data URI is passed to `window.xhs.miniTool.writeTempFile`, then its returned `filePath` is passed to `saveImageToPhotosAlbum`.
- Permission denial and JSBridge absence/failure produce clear, retryable states.
- In an ordinary development browser, the app may show an export preview for QA; the shipping mini-tool must not use `<a download>` or `window.open`.
- V1 may expose “Publish to Xiaohongshu” only after save is stable; it is not required for acceptance.

## 4. End-to-end flow

1. Empty state explains the visual result and offers “Select image”.
2. User selects an image; app decodes, validates, and opens the editor.
3. A centered rectangle and recommended background preset appear.
4. User chooses rectangle/circle and edits its position/size.
5. User adjusts background and focus separately.
6. User optionally zooms, pans, mirrors, or rotates focus content and chooses a border.
7. User enters text, chooses typography settings, and regenerates until satisfied.
8. User selects PNG/JPEG and taps “Save to album”.
9. App renders, calls the bridge, and shows success or a recoverable error.

## 5. Information architecture

Tool groups are ordered by the user flow:

1. Image
2. Focus
3. Color
4. Typography
5. Export

Wide layout:

- Top bar: product name, undo/redo, reset, export action.
- Left panel: image and focus tools.
- Center: maximum-size artwork stage.
- Right panel: color, typography, and export properties.

Compact layout:

- Top bar: product name, undo/redo, export.
- Center: artwork stage.
- Bottom tool switcher: Image, Focus, Color, Type, Export.
- Active tools open in a scrollable bottom sheet that respects the safe area and soft keyboard.

## 6. States and error handling

The product must define visible states for:

- no image selected;
- reading/decoding/downsampling;
- ready;
- rendering export;
- save success;
- unsupported type;
- file too large/dimensions too large;
- corrupt image or decode failure;
- insufficient memory/render failure;
- unavailable 2D canvas;
- missing JSBridge in production container;
- permission denial;
- temporary file or album save failure;
- typography partial placement.

Errors must keep the editor recoverable whenever possible. An export failure must not discard the composition.

## 7. Accessibility and interaction quality

- Every control has a visible Chinese label and programmatic accessible name.
- Sliders expose current numeric values and permit direct reset.
- Touch targets are at least 44 × 44 CSS px even when visual handles are smaller.
- Critical actions do not depend on hover.
- Focus indicators work without relying only on `:focus-visible`, which is outside the baseline.
- Text controls remain usable when the mobile soft keyboard reduces the visual viewport.
- Color is not the only indication of selection or error.

## 8. Privacy and data

- Image processing is local and offline.
- No analytics, upload, account, or network request is present in V1.
- Image bytes are held only for the active session unless a future explicit local-project-save feature is designed.
- Do not place personal image contents or user-entered text in logs.
- Do not persist object URLs or data URIs in localStorage.

## 9. Non-goals for V1

- Multiple focus regions or arbitrary vector masks.
- Ellipse shape distinct from circle.
- Crop/rotate the base artwork.
- Layers panel or free-positioned editable text objects.
- Edge-wrap and grid typography modes.
- Custom font upload or guaranteed cross-device font pixel identity.
- Filters beyond contrast, exposure, hue, and saturation.
- Video, GIF animation, batch editing, templates, stickers, or AI features.
- Cloud save, accounts, collaboration, or network publishing services.
- Browser file download in the mini-tool artifact.

## 10. V1 acceptance checklist

### Image and stage

- [ ] JPG/JPEG, PNG, and WebP can be selected locally.
- [ ] Invalid/oversized input produces an actionable message.
- [ ] Oversized valid images are downsampled within documented limits.
- [ ] Viewport resizing preserves all document coordinates.

### Focus

- [ ] Rectangle and true circle remain within artwork bounds.
- [ ] Mouse, pointer, and touch dragging/resizing work without stuck gestures.
- [ ] Frame move and content pan are unambiguous.
- [ ] Scale, pan, mirror, and rotation compose correctly.
- [ ] Solid/dashed/none border, custom color, and width render correctly.
- [ ] Editor handles remain editable when artwork border is none.

### Adjustments

- [ ] Background and focus values are independent.
- [ ] Each group reset returns to neutral.
- [ ] Rapid slider updates are coalesced and remain responsive.

### Typography

- [ ] Auto/word/character tokenization matches documented examples.
- [ ] All three bracket styles render.
- [ ] The same seed and inputs produce the same stored layout.
- [ ] Regenerate changes the seed and arrangement.
- [ ] Layout remains bounded and terminates on crowded canvases.

### Export and container

- [ ] PNG and JPEG use the same renderer as preview.
- [ ] Saved output excludes all editor-only UI.
- [ ] Album save follows `writeTempFile` → `saveImageToPhotosAlbum`.
- [ ] Final ZIP is offline, has root `index.html`, contains only allowed files, is no larger than 10 MiB, and passes automated/manual mini-tool gates.
- [ ] PC simulator result is recorded.
- [ ] Real-device behavior/performance is recorded, or explicitly marked untested rather than assumed.
