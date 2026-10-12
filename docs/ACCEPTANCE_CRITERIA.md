# City Map Studio — acceptance criteria and engineering handoff

These criteria describe future implementation verification. No tests or code are created by this documentation export.

## Data and offline operation

- A city with locally available complete coverage reuses its PBF without downloading.
- Missing coverage produces a proposal with region, estimated size, destination and explicit Download action.
- Cancelling before download performs no download; cancelling during download preserves existing valid data and does not register a partial file as complete.
- A manually selected PBF can be used; uncertain coverage is clearly distinguished from verified coverage.
- Crop edges and required processing margin are checked, not only city centre.
- After provisioning catalogs and PBFs, search, map display, generation and export can run offline.
- Repeated generation with only widths/heights changed reuses suitable cached source features.
- Cache keys include source identity, extent, relevant extraction settings and processing version. A stale cache cannot mask changed PBF data.

## Selection and settings

- Each circle/square/rectangle can be drawn, moved and resized on the map.
- Physical dimensions preserve aspect ratio; selection and output outline agree.
- Changing physical size correctly changes mm and mm² cleanup effects at geographic scale.
- Every enabled road/rail category respects its width. Tunnels contribute no geometry. Railways render as strips and merge with roads at intersections.
- Rounding and smoothing can be independently disabled and adjusted.
- Road gap filling removes a small enclosed roundabout gap below threshold while retaining one above threshold. Threshold equality convention is documented.
- Separate fixtures verify small water patch removal and small land island removal, without reversing their meaning.
- Thin water branches and smoothing do not introduce invalid self-intersections or unintended gross loss of water bodies.

## Solid construction

- Base defaults to 1.4 mm and is adjustable and optional.
- Base on: water floor lies at the base top; recess depth corresponds to foundation height away from road bridges.
- Base off: water openings extend through the object. Land/foundation remains present.
- Roads crossing water stay continuous at road elevation.
- Centre hole cuts every intersecting layer and remains open in the exported mesh.
- Border follows each supported outline; verify water/border and road/border intersections using the chosen documented semantics.
- Verify all clock styles, full/cardinal-only dials, both placements and both relief modes.
- Inspect digit support, border-off placement, collisions and excessive engraving depth; reject or clearly resolve impossible geometry rather than exporting accidental floating or broken parts.
- Geometry is finite and valid, with consistent winding, no zero-area faces, and watertight boundaries for intended solids. Contact interfaces and union behaviour are handled deliberately.
- Disconnected geographic components are preserved or reported, never secretly connected. Manifold geometry alone does not guarantee a design is physically self-supporting.

## Preview and export lifecycle

- Editing crop or geometry settings does not automatically generate a model.
- First preview appears only after Generate Preview.
- Any geometry-relevant edit marks the previous result Out of date and prevents export of it as current.
- Camera movement, tab switching and pane resizing do not invalidate or rebuild geometry.
- Progress and cancellation are responsive during PBF processing and meshing.
- An old background job cannot overwrite a newer result or declare itself current against newer inputs.
- Cancellation and failures keep the previous successful preview with correct freshness status and readable error feedback.
- Exported geometry matches the generated preview in topology and dimensions, including the centre hole and water recesses.
- Open representative 3MF files in an agreed slicer; verify units, bounding dimensions, component placement, road/base/foundation heights and absence of water solids. ZIP/XML validity alone is insufficient.

## Desktop verification

- Runs inside the macOS MōBrowser app; does not launch a browser tab to provide the product workflow.
- Side-by-side map and 3D preview remain usable at the supported minimum window size.
- Native file dialogs, keyboard entry of numeric values, accessible control names and visible focus work.
- Heavy extraction/geometry work does not block the UI thread.
- Follow the project's AGENTS.md and MōBrowser testing skill for build and live-app verification once implementation is authorized.

## Suggested representative fixtures

Use small, reproducible local fixtures: ordinary road junction; tight roundabout; road/rail crossing; tunnel; bridge across river; branching water polygon; small isolated lake; lake with small and large islands; water reaching the crop edge; disconnected land; border plus digits near water; centre hole intersecting a road. Include circle, square and rectangle crops, two output scales, and base on/off.

## Recommended implementation boundaries (not mandated libraries)

Separate source acquisition/coverage, source-feature extraction/cache, physical-scale 2D geometry, solid construction, preview presentation and 3MF serialization. Keep an immutable generation snapshot and source provenance with each successful result. Use one finalized geometry result for preview and export.

Use a suitable local metric projection before physical scaling; do not buffer geographic longitude/latitude coordinates directly in millimetres. Keep linear/area units explicit and use documented tolerances. Preserve sufficient geometry outside the crop while processing, then apply final clipping intentionally.

The old Python repository is useful evidence for data handling and 2D operations, but its SVG/DXF pipeline does not establish correctness for watertight 3D solids or 3MF. Evaluate actual libraries against the installed runtime and current documentation before choosing architecture.
