# City Map Studio — agent handoff

Exported 2026-10-12 from the design discussion in `/Users/oleh/WORK/pbf-reader`.

## Start here

The owner requested documentation only in this task. No implementation, build, installation, or launch was performed by this handoff task. Implement only when the owner requests development in this project.

Target: `/Users/oleh/WORK/city-map-studio`, macOS desktop application using **MōBrowser**. The user does not want a website or a separate browser workflow. MōBrowser is the explicitly selected desktop framework; its renderer does not change that product requirement.

Read in order:
1. Existing `AGENTS.md` and any applicable project instructions.
2. `docs/CONFIRMED_DESIGN.md` — requirements from the owner conversation and the updated design description.
3. `docs/ACCEPTANCE_CRITERIA.md` — observable completion criteria and technical guardrails.
4. Existing `docs/PRODUCT_SPEC.md`, `docs/UI_DESIGN.md`, and `docs/design/` — additional prior specifications and visual material, subject to the reconciliation notes below.

Before any MōBrowser code, read installed documentation under `node_modules/@mobrowser/api/docs/`, as required by AGENTS.md. Do not guess APIs. Read the project's testing skill before modifying code or tests. Use the locally installed CLI through npm, following AGENTS.md.

## Reconcile existing documents

Existing files were preserved. They contain additional choices not explicitly agreed in this conversation. Do not mistake those choices for confirmed user requirements:

- Independent selection shape and model shape: NOT requested here. This handoff uses one crop shape for both geographic selection and output outline. Do not silently add a second shape control.
- Only the base thickness default, **1.4 mm**, was explicitly specified. Other dimensions, road-category defaults, smoothing defaults and ranges need engineering/design choices; label them provisional.
- Separate 3MF objects, colours/materials, exact clock placement algorithms, Roman IV versus IIII, specific fonts, storage path, and minimum macOS version were not settled.
- Border elevation reference, trimming roads at the inner border, and digit interaction with roads/water were not settled. See the decisions list in CONFIRMED_DESIGN.md.
- A fixed formula for total height is insufficient when a tall border or raised digits extend above roads; report the generated model's actual bounds.
- Unknown PBF header bounds do not prove complete coverage. Avoid reporting verified coverage from a header rectangle alone.
- The existing specs refer to architecture/geometry documents and design resources. Check whether they exist before relying on them; do not assume references are complete. Design resources currently reside under `docs/design/`.

These notes describe what this conversation confirms. If the owner provides newer decisions or another authoritative design, reconcile them explicitly rather than discarding them.

## Existing implementation to study, not replace wholesale

The older Python app is at `/Users/oleh/WORK/pbf-reader`. Useful reference files:

- `README.md`: workflow, source/catalog handling, limitations and CLI usage.
- `map_data.py`: local data, catalogs, coverage and download handling.
- `map_recipe.py`: saved design configuration.
- `map_geometry.py`, `map_engine.py`: geometric processing and road/water operations.
- `map_marine.py`: coastline-derived marine polygons (separate source from PBF).
- `map_export.py`: existing 2D export; it is not a 3MF implementation.
- `main.py`, `osm_view.py`, `map_preview.py`, `studio_kit.py`: old desktop/UI references.
- `test_data.py`, `test_design.py`, `test_vector.py`, `test_studio.py`, `test_main.py`, `docs/testing.md`: reference invariants and test cases.

Assess reuse versus porting after reading the new project's structure. No Python subprocess architecture, native language, geometry kernel or mesh library has been mandated. Do not copy the old automatic-preview behaviour or vector-export UI into this product. Do not modify the old repository as part of new-app development unless asked.

## Suggested development order (not an implementation instruction)

1. Resolve geometry ambiguities that affect the solid model; inspect MōBrowser architecture and choose processing boundaries.
2. Establish project/settings data and a deterministic physical-unit geometry pipeline.
3. Build a small real PBF-to-solid-to-3MF vertical slice and verify in a slicer.
4. Integrate local city lookup, data discovery, approved downloads and caches.
5. Add the selection map, side-by-side preview, settings tabs and explicit generation lifecycle.
6. Add water cleanup, border, digits and centre hole; validate their interactions.
7. Verify acceptance criteria using fixtures and the real desktop app.

Reference inspiration: https://miniskyline.com/map — selection and printable-preview workflow only; no requirement to reproduce its buildings, terrain, online processing or exact appearance.
