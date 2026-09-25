# MasterGo UI Semantic Normalization — 2026-09-25

## Source and scope
Source HEAD: c5be507 plus this working-tree change.
Reference: public MasterGo RedBook file 204324829037842, containers 1:0 / 17:161 / 17:155.
All three containers were inspected in the preceding browser session. Reconnection through the in-app browser tool failed this turn; no new design-version metadata was obtained. Layout interpretation is based on those rendered views, not exact design layer measurements.

Existing implementation is index.html + classic assets/app.js, not the proposed React tree. No framework migration, renderer algorithm change, state-schema change, release or platform upload.

## Comparison and normalization
- Recording moved from the timeline into the main Import / Record / Export command group.
- Bottom order changed from Edit / Color / Text to FOCUS / 字 / 画.
- Reused existing shape buttons as a labeled segmented group; shared pressed-state accessibility synchronization.
- Mirror and local reset commands use shared IconButton styling with existing local SVGs and accessible names. Existing untracked SVG assets were not modified.
- Export retains the primary-action semantic; compact layout uses the reference's orange-text treatment.
- Existing sliders share one labeled numeric-output row pattern. Text input and native property selects are reused.
- Text repeat and desaturation grouped beside textarea. Background and focus adjustments form two compact columns.
- Noise controls and rendering were removed at product direction; design screenshots are not authority to add functionality.
- Duplicate CSS overrides consolidated. Existing palette/type values and repeated spacing promoted into shared tokens; 44px interaction targets follow the existing PRD.
- Canvas contain-fit now measures actual padding without the previous 220px minimum, preventing overflow when panels or keyboard reduce available height.
- Compact 360×793 layout now has a tokenized 48px design top reserve and 33px bottom reserve, each added to supported device safe-area insets. The brand/command/timeline baseline is 52/81/123px; the dock is 719px from the viewport top with its controls ending at 760px.

## Verified
- Independent headless Microsoft Edge regression: 360x623, 360x793, 720x800, 1280x900.
- Three panels, no body horizontal overflow, positive contained canvas bounds.
- Circle selection and pressed state; mirror/reset; record/start-stop visibility; export preview open/close.
- No browser page errors. Screenshots under artifacts/ui-normalization; representative compact and desktop images visually inspected.
- The 360×793 test also asserts the reference top and bottom safe-area geometry before checking each of the three mobile containers.
- npm run verify attempted: existing child PowerShell Get-FileHash resolution failure.
- Equivalent direct scripts/test.ps1 -Stage DEV: PASS (build, static container gates, JS syntax, ZIP root, hash and directory/ZIP audits).
- Independent minitool audit: dist 12 files / 0 warnings; final ZIP size PASS.
- Final DEV artifact: artifacts/focus-archive-20260925T133925095Z-7b5d021.zip
- SHA-256: 11034c97a74faf9fe7a4b2c7f82421b49e16f8b73c9a2bd45729c0abdedffad5

## Manual compliance review
- Package: root index.html, local relative assets, external classic scripts; no new network, module, inline script, iframe or download functionality.
- Capabilities/bridge: no native adapter changes. Existing album and animation paths are not proven by preview tests.
- JS: presentation-only MutationObserver uses baseline DOM APIs and ES2017-compatible syntax.
- CSS: Flex/Grid baseline, margins instead of flex gap, physical properties, focus fallback, safe-area variables/env, app-height fallback.
- Cross-platform: retains pointer handling and visualViewport resize; panel scrolling remains available for smaller keyboard-reduced layouts.
- Performance: no dependencies, fonts, embedded media or dataset added; same rendering pipeline, no new render loop; WebGL checks not applicable.

## Not Verified
Xiaohongshu PC simulator, physical phone, Chrome/WebView 61, actual soft keyboard, album/video saves, screen-reader/complete WCAG audit and target performance.
Desktop regression is NOT target acceptance; target-environment-verification remains active. No PROD action taken.
