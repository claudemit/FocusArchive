export const EDITOR_SCHEMA_VERSION = 1 as const;

export type ImageMediaType = "image/jpeg" | "image/png" | "image/webp";

export interface ImageMetadata {
  assetId: string;
  mediaType: ImageMediaType;
  sourceWidth: number;
  sourceHeight: number;
  workingWidth: number;
  workingHeight: number;
  downsampled: boolean;
}

export interface Adjustments {
  contrast: number;
  exposure: number;
  hue: number;
  saturation: number;
}

export interface RectRegion {
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleRegion {
  type: "circle";
  cx: number;
  cy: number;
  /** Radius normalized against the shorter artwork edge. */
  r: number;
}

export type FocusRegion = RectRegion | CircleRegion;

export interface FocusTransform {
  scale: number;
  rotation: number;
  flipX: boolean;
  /** Artwork-normalized source translation before scale. */
  panX: number;
  /** Artwork-normalized source translation before scale. */
  panY: number;
}

export type BorderStyle = "solid" | "dashed" | "none";

export interface FocusBorder {
  style: BorderStyle;
  /** Six-digit CSS hex color, for example #FFFFFF. */
  color: string;
  /** Design pixels at 1080 px artwork width. */
  width: number;
}

export interface FocusSettings {
  region: FocusRegion;
  transform: FocusTransform;
  adjustments: Adjustments;
  border: FocusBorder;
}

export type SplitMode = "auto" | "words" | "characters";
export type FontPreset = "system-sans" | "system-serif" | "system-mono";
export type BracketStyle = "parentheses" | "corner" | "curly";

export interface TypographyItem {
  id: string;
  token: string;
  /** Normalized center anchor. */
  x: number;
  /** Normalized center anchor. */
  y: number;
  /** Design pixels at 1080 px artwork width. */
  fontSize: number;
  rotation: number;
  opacity: number;
}

export interface TypographySettings {
  sourceText: string;
  splitMode: SplitMode;
  itemCount: number;
  fontPreset: FontPreset;
  minFontSize: number;
  maxFontSize: number;
  bracketStyle: BracketStyle;
  rotationRange: number;
  opacityRange: [number, number];
  avoidFocus: boolean;
  /** Design pixels at 1080 px artwork width. */
  avoidancePadding: number;
  seed: number;
  items: TypographyItem[];
}

export interface ExportSettings {
  format: "image/png" | "image/jpeg";
  jpegQuality: number;
}

export interface EditorDocument {
  image: ImageMetadata | null;
  backgroundAdjustments: Adjustments;
  focus: FocusSettings;
  typography: TypographySettings;
  export: ExportSettings;
}

export type ActivePanel = "image" | "focus" | "color" | "typography" | "export";
export type InteractionMode = "move-frame" | "move-content";
export type EditorDialog = "none" | "replace-image" | "reset-project" | "export-preview";

export interface EditorUIState {
  activePanel: ActivePanel;
  interactionMode: InteractionMode;
  focusSelected: boolean;
  dialog: EditorDialog;
}

export interface RuntimeErrorState {
  code: string;
  message: string;
}

export interface TypographyPlacementSummary {
  requested: number;
  placed: number;
  skipped: number;
}

export interface EditorRuntimeState {
  imageStatus: "empty" | "decoding" | "ready" | "error";
  renderStatus: "idle" | "rendering" | "error";
  saveStatus: "idle" | "rendering" | "writing-temp" | "saving" | "saved" | "error";
  filterBackend: "unknown" | "canvas-filter" | "pixel-fallback" | "unsupported";
  bridgeAvailable: boolean;
  focusCoverage: "full" | "partial";
  lastError: RuntimeErrorState | null;
  typographyPlacement: TypographyPlacementSummary;
}

export interface EditorState {
  schemaVersion: typeof EDITOR_SCHEMA_VERSION;
  document: EditorDocument;
  ui: EditorUIState;
  runtime: EditorRuntimeState;
}

/** Runtime-only resource; never put this value in EditorState or history. */
export interface ImageAsset {
  id: string;
  file: File;
  objectUrl: string;
  decodedSource: CanvasImageSource;
  workingSource: CanvasImageSource;
  dispose(): void;
}
