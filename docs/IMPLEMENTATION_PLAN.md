# Implementation plan (for the building agent)

Work in vertical slices, each ending in something you can launch and verify with `npm run mobrowser -- agent …` (screenshots + snapshot). After each milestone, compare screenshots against `design/source/*.dc.html` intent and `UI_DESIGN.md`. Commit per milestone; do not commit PBFs, caches or `build/`.

**Before writing any code**: read `AGENTS.md` (MōBrowser rules — read `node_modules/@mobrowser/api/docs/` first; run `npm run gen` if docs are missing) and `.agents/skills/mobrowser-testing/SKILL.md`.

## M0 — Shell & design system
- Replace the greeting demo in `src/renderer/App.tsx` / `src/main/index.ts` with the 3-pane shell: toolbar, left/centre/right panes with draggable dividers, status bar, window 1440×900 (min 1100×700), hidden macOS title bar with a drag region.
- Port tokens (`design/tokens.json`) into `index.css` (CSS variables) and Tailwind theme; build shared components: `SegmentedControl`, `Switch`, `SliderNumberField`, `CategoryRow`, `SectionHeader`, `Note`, `StatCard`, `StatusPill`, `FloatingCard`, `Banner`, `Sheet`.
- Right pane with all 5 tabs and every control from `UI_DESIGN.md §4`, driven by a typed `Settings` store with defaults from `design/defaults.json`; dependent rows dim; number fields editable and clamped; live scale text.
- Acceptance: screenshots of every tab match the mock (layout, copy, colours). No data, no 3D yet; preview pane shows the empty state; preview status logic (`none/stale/ready`) works from a fake "generate" that just stamps a hash.

## M1 — Status & flow logic (still fake data)
- Implement the preview state machine (`PRODUCT_SPEC §7`): stale on any area/settings change, never on camera; Generate / Cancel / progress UI with a simulated job; Export enabled only on `ready`.
- Persist settings & pane widths between launches.
- Acceptance: unit tests for the status derivation; e2e: change a slider → pill "Preview out of date"; generate → progress → "up to date"; export button enabled/disabled correctly.

## M2 — Data layer
- Offline place search (GeoNames cities15000 pre-processed; alternate names), Geofabrik index, local file registry, **Open PBF…** (file dialog), coverage check ok/partial/missing, download sheet with real downloads (progress, cancel, atomic publish, checksum, disk space, changeable destination).
- Acceptance: with `monaco-*.osm.pbf` (from `/Users/oleh/WORK/pbf-reader/pbf/`) registered, searching "Monaco" shows the green banner; a city outside coverage shows red/amber with a proposed region + size; cancelling a download leaves nothing half-written.

## M3 — Native module: scan & cache
- `npm run add -- native --lang rust`; PBF bbox scan → cached features (roads, rail, water, basemap labels) keyed by file fingerprint + bbox; progress stream + cancel; tests on Monaco.
- Acceptance: second scan of the same area ≪ first; cancel is prompt.

## M4 — Left map
- Basemap from the cache (MapLibre + custom source, or Canvas fallback) styled per tokens; pan/zoom; selection overlay (circle/square/rectangle, move/resize, handles, size chip, dim mask, coverage hatch); keyboard nudging; bidirectional link to `area` state; live km sizes; scale text.
- Acceptance: draw and resize each shape on Monaco; sizes/scale labels correct; smooth at 60 fps on a 12 km view.

## M5 — Geometry pipeline (headless first)
- Implement `GEOMETRY_AND_3MF.md §0–§6` in the native crate with a CLI/test entry (no UI): outline, roads+rail (smooth/round/fill-gaps), water filters, foundation, base on/off, border, hole, clock. Property tests for thresholds at final scale (mm²), manifoldness, bbox.
- Acceptance: golden fixtures for Monaco (circle 6 km → 120 mm) in each settings combination; no non-manifold output.

## M6 — Generate + 3D preview
- `ModelService.Generate` streaming (stages in `defaults.json → preview.generatingSteps`), mesh transfer, Three.js viewport with layer colours, orbit/pan/zoom (no rebuilds), camera presets, overlays (legend, size card, banners, progress card), previous mesh stays while stale, atomic swap.
- Acceptance: real Monaco model visible with recesses, bridges, border, clock, hole; toggling base switches recess ↔ through-opening after regenerate; orbit never changes status.

## M7 — Export 3MF
- Writer per `GEOMETRY_AND_3MF.md §7`, save dialog, atomic write, handle-based export (never regenerates), round-trip validation script/test (re-parse, bbox, volume, manifold).
- Acceptance: file opens in a slicer (PrusaSlicer/Bambu Studio/Cura) at the right size in mm, objects named, no water object, no errors.

## M8 — Polish
- Performance on large cities, error states (bad PBF, out-of-disk, cancelled jobs), accessibility pass, dark-mode readiness, app icon (`assets/`), menus (Open PBF…, Export, Reset), packaging (`npm run pack`).

## Definition of done (v1)
All items in `PRODUCT_SPEC.md §1–§10` behave as written; open questions in §12 have a recorded decision (default acceptable) in `docs/DECISIONS.md` (create it); e2e covers the status state machine, coverage banners, download cancel, export gating; one real-city 3MF has been sliced successfully.

## Things the previous design phase deliberately did NOT do
- No real 3D rendering (mock is stacked SVG), no real map, no real data.
- Slider/number fields in the mock are display-only — real ones must be editable.
- Dark mode, localisation, menus, preferences window, project files, undo/redo, multi-window.
