# City Map Studio — UI Design Spec

Visual reference: `design/source/*.dc.html` (6 artboards, 1440×900) and the live canvas (private, owner's claude.ai): https://claude.ai/artifact/4o7DLvFb76Kf4chftAPcjJ. Tokens: `design/tokens.json`. Defaults: `design/defaults.json`.

The `.dc.html` files are **mock markup** for a design-canvas runtime (`support.js`, not included) — they will not render as plain HTML. Treat them as *readable specification*: structure, inline sizes/colours, copy, and the `renderVals()` logic that shows how state maps to visuals. **Re-implement with React + Tailwind + shadcn/Radix** (already in the scaffold). Do not port the markup literally.

Look in one line: a calm, light macOS utility ("cartographer's drafting table") — cool grey chrome, ink-navy text, one vermilion accent (primary action, switches, map selection), with a layer-coloured 3D model as the only strongly coloured thing.

## 1. Window layout (1440×900 reference; min ~1100×700)

```
┌─ toolbar 52px ───────────────────────────────────────────────────────────┐
│ ●●●  ▣ City Map Studio · Kyiv · 180 mm circle   [status pill]  [Generate Preview][Export 3MF]
├───────────────┬──────────────────────────────────┬──────────────────────┤
│ LEFT 400      │ CENTRE (flex, min ~420)          │ RIGHT 380            │
│ search+Open PBF│  3D viewport                    │ [tab pills]          │
│ coverage banner│  overlays (see §3)              │ settings rows        │
│ Area: ○ □ ▭   │                                  │ (scroll)             │
│ OSM map       │                                  │ footer: scale + Reset│
│ info grid     │                                  │                      │
├───────────────┴──────────────────────────────────┴──────────────────────┤
│ status bar 28px: data file · cache · constraints reminder                │
└──────────────────────────────────────────────────────────────────────────┘
```
- Dividers: 1 px `#CBCED5`, with a 5×32 grip pill centred vertically; draggable (col-resize). Persist widths.
- On macOS use the native traffic lights via MōBrowser window APIs (the mock draws fake ones). Title bar is hidden/unified (`setWindowTitleVisible(false)` is already in the scaffold); toolbar acts as the title bar, so keep a drag region and leave ~80 px on the left for the lights.
- Only desktop; no phone layout.

## 2. Left pane — area selection

Top block (padding 12, gap 10, bottom border):
1. Row: **search field** (flex, 35 px high, search icon, value e.g. "Kyiv, Ukraine") + **Open PBF…** button (folder icon).
2. **Coverage banner** (three variants, tokens in `coverageBanner`):
   - ok: ✓ "Local data covers this area" / `ukraine-latest.osm.pbf · 920 MB · geometry cached`
   - partial: ⚠ "Selection extends 2.1 km past local data" / `Covered by kyiv-city.osm.pbf · 38 MB` + **Download…** (outlined)
   - missing: ⓘ "No local data for Kyiv" / "A regional download is available" + **Download…** (primary)
3. Row: caption **AREA** + segmented control **Circle · Square · Rectangle** (each with a small outline icon).

**Map** (fills remaining height; clip/slice):
- Basemap from local data (see `tokens.osmBasemap`): land, water, parks, a few buildings for texture, minor roads white with casing, major roads orange, trunk/motorway pink, railways grey/white dashes, labels (city name bold, districts grey, river names italic blue).
- Dimmed outside the selection (`rgba(24,28,40,.34)`), selection filled `rgba(226,87,43,.10)` with 2.2 px `#E2572B` outline, a small move-crosshair at its centre, white 12 px handles with vermilion outline (4 for circle, 8 otherwise), and a vermilion **size chip** above (`⌀ 12.0 km` / `12 × 12 km` / `12 × 9 km`).
- Floating zoom −/+ top-right; "© OpenStreetMap contributors · local PBF" bottom-right (11 px).
- `partial` coverage: right part hatched (`outsideCoverageHatch`) with a dashed amber line where data ends.
- `missing` coverage: grey grid + centred "No local map data / Download a regional extract to draw the map".
- Interaction (to build): drag inside = move; drag handle = resize (circle keeps aspect; square keeps aspect; rectangle free); wheel/pinch = zoom; drag outside = pan; selection size in km updates live; shape switch keeps centre and ~size.
- **Gap in the mock**: when model shape ≠ selection shape, show a thin dashed second outline for the actual model crop.

Footer grid (2×2, 11 px caption + 13 px semibold value): **Selected area** (`12.0 km across` / `12.0 × 12.0 km` / `12.0 × 9.0 km`), **Finished model** (`180 mm ⌀` / `180 × 180 mm` / `180 × 135 mm`), **Centre** (`50.4501° N, 30.5234° E`), **Scale** (`1 : 66 700`).

## 3. Centre pane — 3D preview

Viewport background: radial gradient `#E6E9EE → #D8DBE0 → #CBCFD7`. Real-time 3D (Three.js recommended) of the **actual generated mesh**, orbit / pan / zoom, soft contact shadow, camera default ~38° elevation. Layer colours from `tokens.model3d` (foundation sand, roads charcoal, base blue-grey, water recess floor resin-blue, border copper, raised clock gold).

Overlays (floating cards: `rgba(255,255,255,.82)`, 1 px white border, blur 12, shadow `floatingCard`, radius 10):
- **Top-left**, status-dependent:
  - `stale`: amber card "**Out of date.** Showing the previous preview." + small **Regenerate** button.
  - `ready`: green card ✓ "Up to date with current settings".
- **Top-right**: segmented **Perspective · Top · Front** (camera presets only).
- **Centre** (when `none`): empty state — layers icon, "No preview yet", "Choose an area, adjust the settings, then click Generate Preview. The model is only built on request."
- **Centre** (when `generating`): model dimmed to 30 %; white progress card (340 px, radius 14): title "Generating preview", percentage right-aligned in blue, 6 px progress bar, five steps with done ✓ / current ◉ / pending ○ (labels in `defaults.json → preview.generatingSteps`), full-width **Cancel** button.
- **Bottom-left**: **Layers** legend card (190 px): swatch + name + height — Border, Roads & rail, City foundation, Base (shows "off" and dims when disabled), Water (recess | opening, "cut out").
- **Bottom-centre**: hint "Drag to orbit · ⌥ drag to pan · scroll to zoom. Moving the view never rebuilds the model." (11 px, 200 px wide).
- **Bottom-right**: size card — model size (bold) and "`4.2 mm` tall".
- `stale` model: `filter: saturate(.8)`.

Mock note: the mock fakes 3D with stacked SVG. It is **not** a rendering reference beyond colours and proportions; real vertical scale should be physically proportional (optionally with a small exaggeration toggle).

## 4. Right pane — settings

- **Tab bar** (48 px, `#F1F2F4`, bottom border): a segmented "pill" track `#E1E4E9`, radius 10, 2 px padding; 5 buttons, 30 px high, active = white + `tabActive` shadow + bold: **Features · Quality · Water · Model · Border & Clock**.
- **Scroll area**: rows as below. Section header = 11 px uppercase tracking `.06em` bold muted, optional right-aligned muted subtitle (e.g. "width at final scale"), thin top divider except for the first.
- **Footer** (40 px): "Sizes apply at final scale · 1 mm = 66.7 m" (live) + **Reset tab** button (resets that tab to defaults).

Row types (build as shared components):
| Type | Layout |
|---|---|
| Toggle row | label (flex) · switch 36×20 (on = accent, off = `#B3B8C2`, white 16 px knob) |
| Category row | switch · name · slider 76 px · number field 70 px (`1.6 mm`) — slider+field dim to 40 % when off |
| Number row | label · slider 88 px (4 px track, ink fill, 12 px white knob with 1.5 px ink ring) · field 78 px, right-aligned, `value` semibold + `unit` muted |
| Segmented row | caption above (12 px muted) · full-width segmented control (track `#E4E6EA`, active white + shadow) |
| Note | 11.5 px muted, line-height 1.5 |
| Stat | grey rounded card, label left, value right bold tabular |

Switch-dependent rows dim to 40 % opacity and ignore input. The number field must be **editable** (type a value, clamp, step arrows); the slider is a convenience. Use `font-variant-numeric: tabular-nums` for all numbers.

Tab contents and copy (verbatim from the mock):
- **Features** — ROADS (sub "width at final scale"): Motorway, Trunk, Primary, Secondary, Tertiary, Residential, Service, Paths & footways. RAILWAYS (sub "simple continuous strips"): Rail, Light rail, Tram. COMBINED HEIGHT: "Roads & rail height". Note: "Roads and railways merge into one raised feature above the foundation. Bridges continue across water; tunnels are left out."
- **Quality** — CORNERS & JUNCTIONS: "Round sharp road corners" + "Corner radius". ROAD PATHS: "Smooth road paths" + "Smoothing strength"; note "Path smoothing is independent of corner rounding, so you can have crisp junctions on smooth lines." ENCLOSED GAPS: "Fill small gaps in roads & rail" + "Fill gaps smaller than" (mm²); note "Includes small roundabout centres. Thresholds apply at the finished model size."
- **Water** — WATER PATCHES: "Remove isolated small patches" + "Smaller than" (mm²). LAND ISLANDS: "Fill small islands in water" + "Smaller than" (mm²). THIN BRANCHES: "Remove thin water branches" + "Minimum width" (mm). OUTLINE: "Smooth water outlines" + "Smoothing strength". Note: base on → "With the base on, water becomes a recess with a floor, ready for resin."; base off → "With the base off, water becomes a through-opening."
- **Model** — MODEL SHAPE (sub "independent of the map area"): Circle/Square/Rectangle. FINISHED SIZE: Diameter | Width & height | Width + locked "Height (from selection)"; note per shape ("The map area is cropped to a circle at this diameter." / "…to a square at this size." / "Height keeps the proportions of your map selection, so nothing is stretched."). CITY FOUNDATION: "Foundation height". BASE: "Continuous base layer" switch, "Base thickness"; stat "Total model height  4.2 mm".
- **Border & Clock** — BORDER: "Perimeter border", "Border width", "Border height". CLOCK MARKINGS: "Show clock markings"; Style (`1 2 3` / `I II III` / `Hour marks`); Dial (`Full dial` / `12 · 3 · 6 · 9`); Placement (`On border` / `Inside map`); Relief (`Raised` / `Engraved`); "Marking size"; "Raised height" ↔ "Engraving depth". CENTRE HOLE: "Hole through the model", "Hole diameter".

## 5. Toolbar details

- Left: traffic lights, layers icon, "**City Map Studio**" bold, muted doc name `Kyiv · 180 mm circle`.
- Centre: **status pill** (28 px, radius 14, dot + text; tokens `status`): `No preview yet` · `Preview out of date` · `Generating 62% · Cutting water & base` · `Preview up to date`.
- Right: **Generate Preview** (accent gradient `#D5502A→#BE3E17`, white, play icon) — label becomes **Regenerate Preview** when stale (still primary), **Regenerate** (secondary white) when ready, **Cancel** (white, stop icon) while generating. **Export 3MF** (download icon): ink `#1E2430` background when enabled, grey disabled otherwise (`title` explains).
- While generating, a 2 px blue progress line runs along the toolbar's bottom edge.

## 6. Download sheet (modal)

Dimmed window (`rgba(20,24,34,.38)`), white card 540 px, radius 14, top offset ~150 px. Title "Download map data for Kyiv?"; body "No local OpenStreetMap file covers your 12 km selection. This regional extract does. Nothing is downloaded until you click Download."; grey info table (Region · File · Download size · **Save to** path + **Change…**); optional progress block (bar, "350 MB of 920 MB · 6.4 MB/s", "about 1 min left"); reuse note "The file is kept for reuse, so Kyiv and nearby cities will not need another download."; buttons **Not now** + **Download** (primary) → while downloading **Cancel download**.

## 7. Artboards in the mock

| File | State |
|---|---|
| `Main.dc.html` | Interactive reference: Features tab, preview out of date. All logic lives here; other files import it with props (`tab`, `status`, `progress`, `dialog`, `coverage`, `shape`, `model-shape`, clock props). |
| `Download.dc.html` | status none, coverage missing, download sheet open |
| `Generating.dc.html` | Water tab, 62 % |
| `Ready.dc.html` | Border & Clock tab, up to date, Roman numerals raised on border, centre hole |
| `Model.dc.html` | Model tab, partial coverage, circle selection with **square** model |
| `Quality.dc.html` | Quality tab, rectangle selection + rectangle model |

Read `Main.dc.html` → `renderVals()` for the exact status-to-style mapping and the default settings (they match `design/defaults.json`).

## 8. Accessibility & polish requirements

- Real `<button>`/`<input>`; switches are `role="switch"` with `aria-checked` and an accessible name; icon-only buttons have `aria-label`; viewport and map get `role="img"` + label plus keyboard alternatives (arrow keys nudge selection, +/- resize, `Enter` generate).
- Visible focus ring (`#2F6FED`, 2 px). Text contrast ≥ 4.5:1 (muted `#5B6372` on `#F7F7F8` passes).
- Respect system light/dark: v1 may ship light only, but keep colours in CSS variables so a dark theme can be added (scaffold already has a theme provider; wire `app.setTheme`).
- Never block the UI thread: long work shows progress and is cancellable.
