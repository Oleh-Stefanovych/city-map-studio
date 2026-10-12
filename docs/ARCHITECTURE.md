# City Map Studio — Architecture Recommendations

These are **recommendations** from the design phase, not decisions. Where a choice is genuinely open it is listed in §9 with a default. Verify every MōBrowser API against `node_modules/@mobrowser/api/docs/` (see `AGENTS.md`); names below are conceptual.

## 1. Platform: MōBrowser

Scaffold already present: MōBrowser 2.18 (Chromium renderer + **Node.js main process**), React 19, Tailwind 4, shadcn/Radix, lucide icons, protobuf IPC (`ts-proto`), Playwright-based e2e (`test/e2e`), `mobrowser agent` for driving the running app.

```
renderer (sandboxed, React)  ⇄ IPC (protobuf services + server streams) ⇄  main (Node.js)  ⇄ native module (Rust, optional but recommended)
```

- **Renderer**: all UI, the MapLibre/canvas basemap, the Three.js preview. No fs/network.
- **Main (Node)**: orchestration, file dialogs, downloads, settings persistence, job queue/cancellation, 3MF zip writing (or delegate to native).
- **Native module (Rust)**: PBF scanning, geometry pipeline, mesh building. Add with `npm run add -- native --lang rust` (never hand-write the scaffolding). Needs rustup. Read `guides/develop/native-module-rust.md` first.
- Long jobs must **stream progress** and honour **cancellation** (server-streaming RPC; `ctx.signal` on the Node side). See `guides/develop/ipc.md` → "Server streaming".

## 2. Suggested module layout

```
src/
  main/
    index.ts                    window + service registration (exists)
    services/
      data.service.ts           place search, coverage, PBF registry, downloads
      area.service.ts           (optional) projection helpers
      model.service.ts          generate (stream), cancel, export 3MF
      settings.service.ts       load/save app state
    jobs/                       cancellable job runner
  native/                       Rust crate: pbf scan, geometry, meshing  (src/native/proto/*.proto)
  renderer/
    app/                        shell, panes, toolbar, status bar
    features/
      area/ (MapPane, SelectionOverlay, basemap/)
      preview/ (Viewport, ModelMesh, overlays/)
      settings/ (tabs/*, rows/*)
      data/ (CoverageBanner, DownloadSheet)
    state/                      single store (zustand or useReducer): see §6
    components/ui/              shadcn primitives (exists)
  renderer/proto/               *.proto  → npm run gen → src/*/gen/
docs/ …
```

## 3. IPC surface (proto sketch)

Keep messages in **physical units** (mm, mm², metres, degrees). One `Settings` message mirrors `design/defaults.json`.

```proto
service DataService {
  rpc SearchPlaces(PlaceQuery) returns (PlaceList);
  rpc CheckCoverage(CoverageRequest) returns (CoverageResult);       // ok | partial | missing + file(s) + missing region proposal
  rpc ListLocalFiles(Empty) returns (LocalFileList);
  rpc RegisterPbf(RegisterPbfRequest) returns (LocalFile);           // after "Open PBF…"
  rpc Download(DownloadRequest) returns (stream DownloadProgress);   // cancel = unsubscribe
  rpc BasemapTile(TileRequest) returns (TileBytes);                  // or via custom protocol, see §5
}
service ModelService {
  rpc Generate(GenerateRequest) returns (stream GenerateEvent);      // progress{pct, stage} … done{meshHandle, stats}
  rpc GetMesh(MeshRequest) returns (stream MeshChunk);               // layered buffers for the viewport
  rpc ExportThreeMf(ExportRequest) returns (stream ExportEvent);     // {meshHandle, path}
}
service SettingsService {
  rpc Load(Empty) returns (AppState);
  rpc Save(AppState) returns (Empty);
}
```
`GenerateRequest` = `{ pbfPaths[], area{shape, center, bboxMetres/degrees}, model{shape,widthMm,…}, features, quality, water, borderClock, settingsHash }`. `GenerateEvent.done` returns a **mesh handle** (id of the cached result) — export uses the handle so the exported file is byte-for-byte the previewed mesh. Reject export when the handle's `settingsHash` differs from current state.

## 4. Pipeline (see `GEOMETRY_AND_3MF.md` for details)

`area + settings → [extract features from PBF/cache] → [project to model mm] → [roads+rail union & cleanup] → [water cleanup] → [foundation = outline − water] → [border, hole, clock] → [extrude layers → watertight meshes] → preview buffers / 3MF`

## 5. Data layer

Prior art (same author, **Python**, separate repo): `/Users/oleh/WORK/pbf-reader`. Read-only reference; don't depend on it at runtime. Useful pieces:
- `map_data.py` — `DataStore`: GeoNames **cities15000** offline catalogue, Geofabrik **`index-v1.json`** catalogue (coverage polygons, URLs, checksums), local file registry, **coverage test of a crop against provider polygons**, HTTPS-only atomic downloads with disk-space checks, progress, cancellation. Port the *ideas* (and constants: `https://download.geonames.org/export/dump/`, `https://download.geofabrik.de/index-v1.json`).
- `map_engine.py` — one-pass PBF scan into a bounded cache (`prepare_cache`, `read_highways`, `clipped_paths`).
- `map_geometry.py` — road chain smoothing (Chaikin), dead-end pruning, junction fillets, polygon cleanup; `map_marine.py` — water/coast handling; `osm_view.py` — raster OSM-like basemap look.
- `/Users/oleh/WORK/pbf-reader/pbf/` contains real PBFs for development — **`monaco-*.osm.pbf` is tiny and ideal for fast tests**; `malopolskie`, `mazowieckie`, `poland`, `ukraine` for scale tests. Copy/symlink what you need into the new project's gitignored data folder; do not commit PBFs.

Recommended implementation:
- **Catalogues**: ship GeoNames cities15000 pre-processed (SQLite or compact JSON, ~10 MB) so search works offline from first launch; fetch/refresh Geofabrik index on demand. Alternate-name matching (Kyiv/Kiev/Київ) matters.
- **PBF access**: Rust crate `osmpbf` (or `osmpbfreader`) with a **bbox-first two-pass read**: pass 1 collects ways/relations intersecting the bbox (highway, railway, waterway, natural=water/coastline, landuse=reservoir/basin, place/boundary labels for the basemap), pass 2 resolves node coordinates. Persist the result per `(pbf fingerprint, bbox, feature-set version)` in an app-cache (FlatGeobuf / bincode / MVT). Show scan progress; make it cancellable.
- **Basemap (left pane)**: build vector data from the same cache and render with **MapLibre GL JS** using a custom data source (a registered app protocol serving MVT tiles generated by the native module — see `guides/guides/protocol.md`), styled with `tokens.osmBasemap`. Fallback if too heavy: a Canvas2D renderer drawing simplified cached features for the viewport. Whatever is chosen, **no online tiles**.
- **Downloads**: perform in main (Node `fetch`/streams) or native; write to `*.part`, verify checksum when the catalogue provides one, `rename` on success, keep prior file on failure/cancel; HTTPS only; check free disk space first. `guides/guides/downloads.md` documents the app-level download API for webview downloads; for programmatic downloads use Node.
- **Coverage**: implement `ok | partial | missing`; for `partial`/`missing` propose the **smallest regional Geofabrik extract whose polygon covers the needed area** (prefer a sub-region over a country), show its size from the catalogue.

## 6. Renderer state

A single store (zustand or React reducer) holding:
```
area: { shape, center, size }
settings: Settings        // mirrors defaults.json
data: { files[], coverage, download? }
preview: { status: 'none'|'stale'|'generating'|'ready', progress, stage, meshHandle?, settingsHashAtBuild? }
ui: { tab, paneWidths, camera }
```
- `preview.status` is **derived**: `ready` iff `meshHandle` exists and `hash(area, settings) === settingsHashAtBuild`; changing any area/settings field makes it `stale` automatically. Camera/ui changes never enter the hash.
- Debounce persistence; never trigger generation from state changes.

## 7. 3D preview

Three.js (via `@react-three/fiber` optional). Build one `BufferGeometry` per layer from the mesh the native module returns (positions + indices), colours from `tokens.model3d`, `MeshStandardMaterial` with soft key light + hemisphere light, contact shadow plane, OrbitControls with damping, camera presets (Perspective/Top/Front). Keep the previous meshes mounted while `stale`; swap atomically on `done`. Dispose geometries on swap. Handle ≥ 1–2 M triangles (use indexed buffers; avoid per-frame CPU work).

## 8. Testing

- `npm run dev:build` then `npm run mobrowser -- agent launch` (or `npm run dev -- --automation` for renderer work); drive via `agent snapshot / click / fill / screenshot`. Read `.agents/skills/mobrowser-testing/SKILL.md` before touching app code or tests. e2e: `npm test` (`test/e2e`).
- Native/geometry: Rust unit tests with the Monaco PBF fixture and synthetic polygons (invariants: manifold, no self-intersection, expected areas, scale correctness, thresholds in mm² at final scale).
- Golden checks: export 3MF → re-import with a parser (e.g. `lib3mf`/`trimesh`) in CI script and assert volume > 0, bounding box = configured mm size ±0.01, single watertight shell per solid.
- Never commit PBFs or generated caches (`.gitignore` already ignores `build/ dist/ out/ gen/ .mobrowser/` — add the data/cache folders).

## 9. Open technical decisions (defaults in bold)

| # | Decision | Options | Default |
|---|---|---|---|
| D1 | Geometry/PBF engine | **Rust native module** · TypeScript + clipper2-wasm in a worker · Python sidecar | Rust |
| D2 | Basemap renderer | **MapLibre + MVT from native** · Canvas2D simplified features | MapLibre |
| D3 | Projection | **Local azimuthal equidistant or UTM zone of the centre → metres** · Web Mercator with scale correction | Local metric projection (accurate mm at scale) |
| D4 | Polygon booleans / offsets | **Rust `geo` + `i_overlay`/`geo-clipper`** · Clipper2 | Rust, Clipper-class robustness |
| D5 | Triangulation | **earcut/`earcutr` (with holes)** · `lyon`/`spade` CDT | earcutr, then validate manifoldness |
| D6 | Text outlines for numerals | **bundled TTF + `ttf-parser` → bezier flatten → polygons** | bundled fonts |
| D7 | 3MF writer | **Rust/Node zip + hand-written core-spec XML** · lib3mf | hand-written (spec is small) |
| D8 | State lib | **zustand** · useReducer | zustand |
