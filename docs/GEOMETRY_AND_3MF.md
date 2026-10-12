# Geometry pipeline & 3MF export — detailed spec

Everything here is behaviour the output must satisfy; algorithm names are suggestions. All thresholds are in **model millimetres (mm / mm²)** — convert once at the start: `s = modelWidthMm / modelOutlineWidthMetres` (mm per metre); `r_m = r_mm / s` when a world-space operation is cheaper. Prefer working in model-mm space after projection.

## 0. Coordinate setup

1. Choose the model outline (circle / square / rectangle) from selection + model shape (`PRODUCT_SPEC §4`). Centre = selection centre.
2. Project lon/lat → metres in a local metric projection centred on the selection; then → model mm: `x_mm = x_m * s`, `y_mm` likewise (Y up). Model origin = outline centre. Final z=0 is the **bottom of the model**.
3. Pull data for the outline **plus a margin** (≥ max road half-width + border) so features crossing the edge are clipped correctly, not truncated.

## 1. Input classification (OSM tags)

See `design/defaults.json → features.osmTagMapping`.
- **Roads**: `highway=*` classes mapped to the 8 UI categories; `*_link` joins its parent class. Excluded: `area=yes` pedestrian plazas as lines (optional: treat as polygons later), `highway=construction/proposed`, `access=private` service (optional filter).
- **Railways**: `railway=rail|light_rail|tram` only (`subway`, `narrow_gauge`, `funicular` etc. out of scope for v1; `abandoned/disused/construction` excluded).
- **Tunnels excluded entirely**: drop ways with `tunnel=yes|building_passage|culvert`, `covered=yes`, and all `railway=subway`. A way partially in tunnel should be split; only above-ground part stays (OSM normally models tunnels as separate ways).
- **Bridges kept**: `bridge=*` (≠ `no`) ways are ordinary roads/rails and are **not clipped by water**.
- **Water** (polygons): `natural=water`, `waterway=riverbank`, `landuse=reservoir|basin`, `natural=bay|strait`, sea/ocean derived from `natural=coastline` (needs coastline polygonisation against the model outline; see Geofabrik/osmcoastline notes — if the extract contains coastlines, build sea polygons by closing coastline ways with the outline; land is on the **left** of a coastline way). Multipolygon relations: outer rings are water, **inner rings are islands (land)**. **Water lines**: `waterway=river|canal` (and optionally `stream`) without an area polygon → buffer by tag `width` or a class default (river 20 m, canal 10 m, stream skipped by default); mark these as "thin" candidates for the thin-branch filter.
- Ignore buildings, landuse (other than water), elevation.

## 2. Roads + railways layer

For each enabled category: collect centre-lines → (optional) **path smoothing** → buffer by `width_mm/2` (round joins, flat or round caps) → union all categories into **one multipolygon** `R`.

Order of operations (so options stay independent):
1. **Path smoothing** (if on): Chaikin / Douglas-Peucker + spline on the *centre-lines*, tolerance ≈ `strength_mm`; must preserve topology at junctions (smooth chains between junction nodes; keep nodes fixed). Rails and roads smoothed alike.
2. Buffer + union → `R0`.
3. **Corner/junction rounding** (if on, radius `ρ`): morphological *closing* `buffer(+ρ).buffer(-ρ)` fillets concave corners/junction crotches; morphological *opening* `buffer(-ρ').buffer(+ρ')` (ρ' ≤ ρ and < half the narrowest road) rounds convex tips. Keep ρ < narrowest half-width, or the opening erases thin roads — clamp and warn.
4. **Fill enclosed gaps** (if on, threshold `A`): remove **interior rings** (holes) with area `< A mm²` from `R`. This is what closes small roundabout centres and tiny blocks. Does *not* touch the outer boundary.
5. Clip `R` to the model outline (inset by border width if the border is on).
6. Drop slivers < ~0.01 mm² and degenerate parts; **disconnected regions are allowed**. Remove nothing else.
7. Rails and roads are **one feature** — no separate rail mesh, no dashes/sleepers (simple continuous strips).

Output: `R` (polygons with holes), extruded from `zFoundationTop` up by `roadsHeight`.

## 3. Water layer → foundation

Build `W` = union of water polygons clipped to the outline. Then apply, each **independently switchable**, in this order:
1. **Smooth outlines** (strength `σ`): `buffer(+σ).buffer(-σ)` then `buffer(-σ).buffer(+σ)` (or Chaikin on rings) — must not merge distinct water bodies or delete islands that survive the other filters; run *before* the area filters so thresholds see final shapes (alternatively after; document the choice and keep it consistent).
2. **Remove thin branches** (min width `w`): morphological opening `buffer(-w/2).buffer(+w/2)`; removes water narrower than `w` (side channels, thin creeks) but keeps wide rivers; keep the original outline of the surviving parts (avoid overall shrink: compute opening, then re-union with the original *only where* it touches surviving pixels, or use opening-by-reconstruction).
3. **Remove isolated small patches** (`A_p`): drop **exterior** polygons with area `< A_p`.
4. **Fill small land islands** (`A_i`): drop **interior rings** of water polygons with area `< A_i` (those islands become part of the foundation — i.e. water covers them no more).

Patch removal and island filling use *different* thresholds and must not interact (removing a patch never fills an island and vice-versa).

`Foundation = Outline − W` (clipped to the model outline; border and hole handled below). Output polygons with holes (water = holes/gaps).

## 4. Base, foundation, roads — vertical stack (z up, mm)

```
zBase0 = 0
zBase1 = baseEnabled ? baseThickness : 0
zFound0 = zBase1                    # foundation sits on the base
zFound1 = zBase1 + foundationHeight
zRoad0 = zFound1                    # roads start at foundation top (also over water: bridge deck)
zRoad1 = zFound1 + roadsHeight
```
- **Base on**: `Base` = full outline (minus centre hole), z `0..zBase1`. Water areas are recesses: floor = base top (`zBase1`), walls = foundation sides. Foundation = `Outline − W` extruded `zFound0..zFound1`.
- **Base off**: no base solid. Water areas are through-holes in the foundation (`zFound0 = 0`). Because the foundation may become disconnected (islands entirely surrounded by water), roads/rail and/or the border must be what ties it together; **warn** ("N disconnected pieces") when pieces would print loose — show in the preview stats. Prefer the user keeping the base on; do not silently add bridges/tabs.
- **Roads** `R` extruded `zRoad0..zRoad1`, **not clipped by water**: over water the deck's underside is at `zRoad0` (bridge). With the base on this floats over the recess — printable with supports; flag in open questions.
- Overlaps: roads sit on the foundation top face; both solids share the plane `zRoad0` (coplanar contact). For slicer-friendliness either (a) export as separate objects and let the slicer union, or (b) fuse into one mesh by merging faces. See §7.

## 5. Border, centre hole, clock

- **Border** (if on): ring = `Outline − inset(Outline, borderWidth)` extruded from the foundation top (and base top / 0 where applicable) to `zFound1 + borderHeight`. Radius at rectangle/square corners follows the outline's corner radius (design uses ~8 px ≈ 3 mm; choose a sane default, make it a constant).
  - Clip foundation top, roads, water to `inset(Outline, borderWidth)`. Under the border, the foundation is solid (no water cut-outs under the border).
- **Centre hole** (if on, diameter `d`): subtract the circle (model centre) from **every** layer — base, foundation, roads, border, clock.
- **Clock marks**: positions at hour angles `θ_k = 30°·k` from 12 o'clock clockwise (`k=0..11`; `Quarters` → `k ∈ {0,3,6,9}`).
  - Circle outline: radius `r = R − borderWidth/2` (on border) or `R − borderWidth − size*0.9 − gap` (inside map; if no border, measure from the outline).
  - Square/rectangle: intersect the ray from the centre at `θ_k` with the inset outline (`ρ = inset distance`); same inset rule.
  - Glyphs: bundled font, size = cap height `markingSize`, centred on the point, **upright** (not rotated); Roman uses `I II III IV V VI VII VIII IX X XI XII`. **Hour marks**: rectangles (width ≈ 0.2×size; length 1.1×size for 12/3/6/9, 0.7×size otherwise) oriented radially.
  - Raised: extrude `reliefDepth` above the surface at the mark (border top, else the top of whatever lies below: roads top / foundation top). Engraved: subtract `reliefDepth` from that surface (depth ≤ local thickness − 0.2 mm; clamp and warn).
  - Marks outside the border/outline or colliding with the centre hole are clipped/dropped with a warning.

## 6. Meshing requirements

- Convert every final polygon-with-holes to an **extruded watertight mesh** (top, bottom, side walls). Use shared vertices and consistent CCW winding with outward normals.
- Snap coordinates to a **0.001 mm** grid before triangulating; remove duplicates/zero-area triangles.
- Between layers, ensure side walls align: foundation walls at the same `(x,y)` as the water boundary; recess walls extend `zBase1..zFound1`.
- Validate: every edge shared by exactly 2 triangles per solid, no self-intersections; volume positive; bbox equals configured size (± 0.01 mm). Fail generation with a clear message rather than exporting broken meshes.
- Expected sizes: dense city (12 km, all road classes) can reach millions of triangles; stream mesh buffers to the renderer and to the 3MF writer; keep vertices as Float32 in preview (centre on origin to avoid precision loss) but write full precision to 3MF.

## 7. 3MF output

Standard **3MF Core Specification** package (ZIP, `.3mf`):
```
[Content_Types].xml
_rels/.rels                         → /3D/3dmodel.model
3D/3dmodel.model                    (UTF-8 XML)
Metadata/thumbnail.png (optional)   rendered preview (nice to have)
```
`3dmodel.model`:
- `<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">`
- `<metadata>` entries: Title (`City Map Studio — Kyiv`), Application, CreationDate, optionally Description with settings summary/hash.
- `<resources>`: optional `<basematerials>` (colours from `tokens.model3d`: roads `#3C4558`, foundation `#E9DFC9`, base `#8FB1C4`, border `#9C6A47`, clock `#E3B25B`); then `<object id type="model" name="…">` per solid with `<mesh><vertices>…</vertices><triangles>…</triangles></mesh>` and `pid/pindex` for the material.
- Objects (recommended): **Base**, **City foundation**, **Roads & rail**, **Border**, **Clock markings** (skip empty). **No Water object.** Each must be a closed manifold.
- `<build>`: items for each object (identity transform, model already centred; place on z=0 plate).
- Dimensions: must equal configured mm (circle Ø = `widthMm`, etc.). Verify round-trip by re-parsing.
- Writer details: use `zip` DEFLATE; indent-free XML; number format with `.` decimal, ≤ 4 decimals for coordinates.
- Atomic save: write to temp file next to the destination, then rename. Save dialog via the app's `showSaveDialog`; remember the last folder.
- Export reads the **cached mesh** from the last `done` generate result (handle), never regenerates.

## 8. Performance & caching targets

- Warm-cache regenerate for a 12 km city: aim ≲ 10 s; cold PBF scan of a country extract (≈ 1 GB): minutes, with live progress and cancel; after scanning, the area cache makes every later run fast.
- Cache layers separately so changing e.g. only a width, a water threshold or the clock doesn't redo upstream stages (keyed hashes: `features(bbox) → roads(settings) → water(settings) → meshes`).
- Cancellation must stop CPU work promptly (check a token between stages and inside long loops).
