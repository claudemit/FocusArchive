# EditorState Schema Guide

The canonical machine-readable contract is `src/core/state/editor-state.schema.json`. The compile-time mirror is `src/core/state/types.ts`.

## 1. State partitions

`EditorState` contains three partitions:

- `document`: serializable, undoable artwork state.
- `ui`: current editor presentation and interaction mode; not rendered into artwork and not included in undo history.
- `runtime`: lightweight status/capability data; not rendered and not included in undo history.

`runtime.focusCoverage` is `partial` only when the requested focus rotation/scale/edge position cannot cover the entire clip from source pixels within the allowed transform range. The background layer still guarantees an opaque final artwork.

The following are deliberately outside EditorState and live in an `ImageAssetRegistry` keyed by `document.image.assetId`:

- `File` / `Blob`;
- blob object URL;
- `HTMLImageElement` / `ImageBitmap`;
- source, scratch, preview, or export Canvas objects;
- Canvas/SVG/DOM refs;
- JSBridge functions/results;
- data URI and temporary file path.

These objects are non-serializable, may contain large/private data, and have explicit lifecycle cleanup.

## 2. Canonical default

```json
{
  "schemaVersion": 1,
  "document": {
    "image": null,
    "backgroundAdjustments": {
      "contrast": -10,
      "exposure": -15,
      "hue": 0,
      "saturation": -65
    },
    "focus": {
      "region": {
        "type": "rect",
        "x": 0.25,
        "y": 0.31,
        "width": 0.5,
        "height": 0.38
      },
      "transform": {
        "scale": 1,
        "rotation": 0,
        "flipX": false,
        "panX": 0,
        "panY": 0
      },
      "adjustments": {
        "contrast": 0,
        "exposure": 0,
        "hue": 0,
        "saturation": 0
      },
      "border": {
        "style": "solid",
        "color": "#FFFFFF",
        "width": 2
      }
    },
    "typography": {
      "sourceText": "",
      "splitMode": "auto",
      "itemCount": 12,
      "fontPreset": "system-sans",
      "minFontSize": 18,
      "maxFontSize": 34,
      "bracketStyle": "parentheses",
      "rotationRange": 12,
      "opacityRange": [0.7, 1],
      "avoidFocus": true,
      "avoidancePadding": 16,
      "seed": 1,
      "items": []
    },
    "export": {
      "format": "image/png",
      "jpegQuality": 0.92
    }
  },
  "ui": {
    "activePanel": "image",
    "interactionMode": "move-frame",
    "focusSelected": true,
    "dialog": "none"
  },
  "runtime": {
    "imageStatus": "empty",
    "renderStatus": "idle",
    "saveStatus": "idle",
    "filterBackend": "unknown",
    "bridgeAvailable": false,
    "focusCoverage": "full",
    "lastError": null,
    "typographyPlacement": {
      "requested": 0,
      "placed": 0,
      "skipped": 0
    }
  }
}
```

## 3. Geometry semantics

### Rectangle

`x`, `y`, `width`, and `height` are normalized independently by artwork width/height. `x/y` identify the top-left corner.

Required reducer invariants:

```text
x + width  ≤ 1
y + height ≤ 1
width and height satisfy the current minimum-size rule
```

### Circle

`cx/cy` are normalized by artwork width/height. `r` is normalized by the shorter artwork edge.

Required reducer invariants in pixels:

```text
cxPx - rPx ≥ 0
cxPx + rPx ≤ artworkWidth
cyPx - rPx ≥ 0
cyPx + rPx ≤ artworkHeight
```

JSON Schema validates individual ranges; reducers/geometry tests enforce cross-field and aspect-ratio-dependent invariants.

### Focus transform

- `scale`: uniform zoom from 1 to 3.
- `rotation`: degrees in `[-180, 180]`.
- `flipX`: horizontal mirror applied in focus-local transformed space.
- `panX/panY`: artwork-normalized content translation before scale. Geometry code clamps them after any region/transform change. If rotation makes full coverage impossible within 3×, the already-rendered background remains underneath and runtime UI may report a coverage warning.

Transform order is fixed in `TECH_SPEC.md` and is not interchangeable.

## 4. Design-pixel semantics

The following values are “design pixels” at an artwork width of 1080 px:

- focus border `width`;
- typography `minFontSize`, `maxFontSize`, and item `fontSize`;
- typography `avoidancePadding`.

At render width `W`, convert using:

```text
renderedValue = designValue × W / 1080
```

This keeps style proportions stable between preview and export.

## 5. Typography items

`typography.items` is the persisted result of seeded layout. Each item stores:

- stable `id` for UI/reconciliation;
- raw `token`; brackets are resolved from current `bracketStyle`;
- normalized center anchor `x/y`;
- sampled design `fontSize`, rotation, and opacity.

Any action that changes tokenization, count, font metrics, bracket width, size range, rotation range, focus avoidance, padding, or seed must regenerate the items atomically. Background/focus color, border, and export format changes must not regenerate them.

The persisted layout makes ordinary rendering deterministic. System font differences can still change exact glyph metrics across devices; V1 documents this constraint.

## 6. Image metadata

When present, `document.image` contains only stable metadata:

- `assetId`: runtime registry key;
- MIME type;
- oriented source dimensions;
- bounded working dimensions;
- whether downsampling occurred.

The state is not a portable project file in V1 because it does not contain image bytes. If project save/load is added later, introduce a separate asset persistence contract and increment `schemaVersion` when the serialized document shape changes.

## 7. Validation and migrations

- Validate defaults and fixtures against JSON Schema in tests/build tooling; do not bundle a large validator solely for every state action.
- Reducers clamp direct UI inputs and enforce cross-field invariants.
- Imported state, if introduced, must be schema-validated and migrated before becoming active.
- A schema change that alters persisted meaning requires a version increment and `migrateEditorState` test fixtures.
- Unknown properties are rejected so stale/misspelled fields do not silently affect behavior.

## 8. History rules

- History contains `EditorDocument`, never full `EditorState`.
- A pointer/slider gesture commits one entry on completion.
- Runtime status updates and panel changes do not create history.
- Image asset instances are referenced, never copied.
- Replacing the image starts a new history root after confirmation.
