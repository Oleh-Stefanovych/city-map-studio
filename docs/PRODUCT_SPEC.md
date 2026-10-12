# City Map Studio — Product Spec

Status: handoff from design phase. Nothing is implemented yet. This is the source of truth for behaviour; `UI_DESIGN.md` is the source of truth for look and layout; `ARCHITECTURE.md` and `GEOMETRY_AND_3MF.md` are *recommendations* for how to build it.

## 1. What the app is

A **macOS desktop app** (built on MōBrowser, see `ARCHITECTURE.md`) that turns **local OpenStreetMap PBF files** into **flat, 3D-printable city maps**, exported as **3MF only**.

The model contains roads, railways and water cut-outs. **No buildings. No terrain elevation. No tunnels.**

Workflow: **search city → load local data → select area → configure model → generate preview → export 3MF**.

Non-goals: DXF / SVG export, separate water-body export, buildings, elevation, online map tiles, accounts, cloud features.

## 2. Window

One window, three resizable panes (drag the 1 px dividers):

| Pane | Content |
|---|---|
| Left | OSM map for choosing the geographic area (drawn from local data) |
| Centre | Interactive 3D preview of the generated model |
| Right | Tabbed settings: Features · Quality · Water · Model · Border & Clock |

A toolbar holds the preview status pill, **Generate Preview** and **Export 3MF**. A status bar shows the active data file and cache.

## 3. City search and local data

1. User types a city in the left-pane search field and picks a result. (Needs an offline place catalogue; see `ARCHITECTURE.md` §Data.)
2. The app checks whether an existing local PBF **fully covers** the area needed for the current selection.
   - **Covered** → green banner "Local data covers this area" + file name, size, "geometry cached".
   - **Partly covered** → amber banner "Selection extends N km past local data", names the file that does cover part of it, and offers **Download…** for a region that covers the rest.
   - **Not covered** → red banner "No local data for <city>", offers **Download…**.
3. **Download…** opens a sheet proposing a **regional** download with: region name, file name, **estimated size**, **destination folder** (changeable), and a reuse note. **Nothing downloads until the user clicks Download.** While downloading: progress bar, bytes done / total, speed, ETA, **Cancel download**. Cancelling or failing must keep any existing data intact (write to a temp file, publish atomically on success).
4. **Open PBF…** lets the user pick any existing `.osm.pbf`. The app records it and treats it like downloaded data.
5. The left map is drawn **from local OSM data**, not from online tiles. With no data, the map pane shows a neutral grid and "No local map data".
6. **Downloaded data and processed geometry are cached** for reuse (per file, per area). A second run on the same area must not re-scan the whole PBF.

Coverage must be judged against the **area that will actually be used** (the model crop plus a safety margin), not just the city centre, and not by a PBF header bounding box alone (a header rectangle does not prove complete coverage; prefer the provider's coverage polygon when the file came from a known provider, and fall back to header bounds with a visible caveat for unknown files).

## 4. Area selection and physical size

- The user draws a **circle, square or rectangle** directly on the map ("Area" control above the map), then **moves** (drag) and **resizes** (handles) it. Circle shows 4 handles, square/rectangle 8. A chip near the shape shows its real-world size (`⌀ 12.0 km`, `12 × 12 km`, `12 × 9 km`).
- The finished model has its **own shape** setting (Model tab → Model shape: Circle / Square / Rectangle), **independent of the selection shape**. Example: a circular selection can produce a square model. Rule (confirm with owner, see §12): the model outline is fitted to the **bounding box** of the selection.
  - circle model: diameter = min(bbox.w, bbox.h), centred
  - square model: side = min(bbox.w, bbox.h), centred
  - rectangle model: = bbox (width × height)
- The user sets the model's physical size in **millimetres**: diameter (circle), side (square), or width (rectangle). **Rectangle height is derived** from the selection's proportions and shown locked, so the map is **never stretched**.
- The app shows the resulting **scale** (e.g. `1 : 66 700`, or `1 mm = 66.7 m`) and total height.
- **Everything physical applies at final output scale**: road widths, cleanup thresholds, smoothing, border width/height, marking size, hole diameter are all in real millimetres / mm² of the printed model. Internally convert with `mmPerMetre = modelWidthMm / modelOutlineWidthMetres`.

## 5. Vertical model structure

Bottom to top:

| Level | Geometry | Controls |
|---|---|---|
| **Base** | Continuous bottom layer beneath everything | Enable/disable; thickness mm, default **1.4** |
| **City foundation** | Solid **non-water** region (model outline minus water) | Height mm (default 2.0) |
| **Roads & railways** | One combined road+rail geometry above the foundation. Bridges continue across water. | Height mm (default 0.8) |

- **Base on** → water openings are **recesses with a floor** (the base top), suitable for resin filling.
- **Base off** → water openings are **through-openings**.
- **Tunnels are excluded entirely.** **Water is never exported as a separate solid body.**
- Border, clock markings and centre hole add to this stack (§9).
- Total height = base (if on) + foundation + roads. Show it in the Model tab and the preview.

## 6. Settings tabs

All values and defaults: `design/defaults.json`. Every numeric control is a **slider + number field with unit**; rows that depend on a switch dim and become inert when it is off.

### Features
- Enable/disable each **road category** and set its **width (mm)**: Motorway, Trunk, Primary, Secondary, Tertiary, Residential, Service, Paths & footways.
- Enable **railway categories** and set widths: Rail, Light rail, Tram. Railways are **simple continuous strips** (no sleepers/dashes).
- **Combined roads-and-rail height** (mm).
- Roads and railways are **merged into one geometric feature**; disconnected parts may remain where the map requires them.

### Quality
- **Round sharp road corners and junctions** (switch + radius mm).
- **Smooth road paths** (switch + strength mm) — **independent** of corner rounding.
- **Fill enclosed gaps** in the combined road+rail geometry smaller than **N mm²**, including small roundabout centres (switch + threshold).

### Water
Four independent controls (different treatment of small water vs small land is the point):
- **Remove isolated water patches** smaller than N mm².
- **Fill land islands inside water** smaller than N mm².
- **Remove thin water branches** narrower than N mm (minimum width).
- **Smooth water outlines** (strength mm).

### Model
- Model shape, finished size (§4), **city-foundation height**, **base** enable + thickness (default 1.4 mm), and a read-only total height.

### Border & Clock
- **Perimeter border** (optional) following the model outline; width mm, height mm.
- **Clock markings** (optional): style **Arabic numbers / Roman numerals / Hour marks**; dial **Full** or only **12 · 3 · 6 · 9**; placement **On border** or **Inside map**; relief **Raised** or **Engraved**; marking size mm; raised height or engraving depth mm (label switches with relief).
- **Centre hole** (optional): diameter mm, **passes through the whole model**.

## 7. Preview behaviour

- Geometry is generated **only** when the user clicks **Generate Preview**. No automatic rebuilds.
- **Any change to the area or any setting** (including shapes, switches, sliders, tab-independent) marks the existing preview **Out of date**. The **previous preview stays visible** (slightly desaturated) with an "Out of date. Showing the previous preview." banner and a Regenerate shortcut.
- **Orbiting, panning and zooming never trigger a rebuild** and never mark the preview stale.
- Generation shows **progress** (percentage + named stages) and can be **cancelled**. Cancel restores the previous preview/status.
- The preview shows the **actual model geometry** — the same mesh that will be exported — including water recesses (or through-openings), bridges, border, clock markings and centre hole. Not a stylised approximation.
- Status pill states: **No preview yet · Preview out of date · Generating N% · stage · Preview up to date**.

State machine:

```
none --Generate--> generating --done--> ready
stale --Generate--> generating
ready --(area or setting change)--> stale
generating --Cancel--> (previous status: none | stale; ready becomes stale only if inputs changed)
generating --(area or setting change)--> keep generating; mark result stale on completion  (see §12)
```

## 8. Export

- **Export 3MF** saves the **generated** model at its **configured physical dimensions** (units: millimetres). Native save dialog; default file name e.g. `Kyiv-180mm-circle.3mf`.
- **Enabled only when status is `ready`** (preview up to date), so the file always matches the current settings. Disabled otherwise with tooltip "Generate an up-to-date preview to export".
- Roads and railways export as one combined feature.
- The file must be a valid, manifold, printable 3MF (see `GEOMETRY_AND_3MF.md`).
- No DXF, no SVG, no separate water solid.

## 9. Border, clock, hole — geometry rules

- **Border**: a ring following the model outline, inset flush with the outer edge, `borderWidth` wide, rising `borderHeight` above the foundation top. Roads/rail and all content are trimmed to the border's inner edge.
- **Clock on border**: marks centred on the border's mid-line. Needs `markingSize ≲ borderWidth` to look right (UI shows a hint when it does not fit).
- **Clock inside map**: marks sit just inside the border's inner edge (or the outline if no border), over the map.
- **Raised**: marks extend `reliefDepth` above the surface they sit on (border top, or foundation/roads top). **Engraved**: marks are cut `reliefDepth` into that surface.
- Rectangle/square models place marks where the ray from the centre at each hour angle meets the (inset) outline.
- **Roman numerals** use `IV` (not `IIII`) — owner may change.
- **Centre hole**: cylinder through base, foundation, roads, border and any markings.

## 10. Data & caches (user-visible behaviour)

- App data folder default `~/Documents/City Map Studio/Data` (changeable in the download sheet; also expose in a menu/prefs later).
- Keep: downloaded PBFs, catalogue files, per-area processed-geometry cache, last-used settings/project.
- Status bar shows active PBF and cache size.

## 11. Persistence (recommended, small)

Persist last area, selection shape, all settings and the active PBF between launches. A project/document file (`.citymap.json`) is a nice-to-have, not v1.

## 12. Open questions for the owner (do not block v1; pick the default and note it)

1. **Model outline vs selection** (§4): fit-to-bbox rule above. Should the map show a second dashed outline for the model crop when it differs from the selection shape? (Recommended: yes — not in the mock yet.) A: yes
2. **Changes during generation**: recommended — let the run finish, then mark the result `stale`. A: yes
3. **Bridges over water with base on**: deck underside is at foundation-top height; over a recess it will float above the floor. Confirm this is wanted (printable with supports) versus adding piers. A: expected, no piers
4. **3MF structure**: one object per layer (roads/rail, foundation, base, border, clock) with named base materials, or one fused mesh? Recommended: separate named objects in one build item so a slicer can assign colours. a: one object per layer (roads/rail, foundation, base, border, clock)
5. **Numerals font**: bundle one (e.g. an open licence sans + a serif for Roman). Unconfirmed. A: standart system fonts
6. **Values marked `TBC`** in `design/defaults.json` (border/clock/hole numbers) are design guesses.
7. Offline city catalogue source (GeoNames cities15000 is used by the older Python project). A: confirmed
8. Minimum macOS version / Apple Silicon only vs universal. A: this mac only
