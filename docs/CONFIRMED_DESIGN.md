# City Map Studio — confirmed design and functional specification

Date: 2026-10-12. Source: owner discussion and approved request to export the updated design. This document distinguishes established behaviour from remaining implementation decisions.

## 1. Purpose and scope

A macOS-only desktop app, developed using MōBrowser, that creates flat printable city maps from local OpenStreetMap PBF data. No buildings, terrain elevations or tunnels in generated models. 3MF is the only export format. No separate water body. No cloud processing or browser-hosted product is required.

Workflow: search city → check local coverage → offer download if missing → select area → configure model → Generate Preview → Export 3MF.

## 2. Window

Three adjacent panes: local OSM map on the left, interactive 3D preview in the centre, tabbed settings on the right. Resizable dividers. Keep map and preview visible side by side.

City search and Open PBF belong with the map. Generate Preview and Export 3MF remain easy to find. Show data and generation state with clear text, not colour alone.

## 3. Local data

Search for a city, resolve ambiguous matches visibly, then find local PBF coverage. Reuse local files before proposing a download. Permit manual PBF selection.

When data is missing, show the proposed regional extract, estimated size and storage folder. Start only after the user clicks Download. Support cancellation and reuse completed downloads. Selection changes can require a larger or additional extract; coverage applies to the full crop, not just city centre.

Draw the background map from local OSM data. Reuse processed feature caches rather than rescanning the full PBF for every setting change. Once required data/catalogs are available locally, the design workflow must work offline.

City catalog provisioning and any extra coastline datasets must be disclosed if they require network downloads. Local PBF acceptance is not permission for silent background downloads. Preserve source attribution and provenance.

## 4. Selection and scale

Draw a circle, square or rectangle on the map. Move and resize it visually. Show the geographic extent and allow entering physical output dimensions in mm.

Use the selected shape as the output outline. Preserve rectangle aspect ratio; changing physical size must not distort geography. There is no confirmed requirement for an independent output-shape selector.

All feature widths and cleanup thresholds are evaluated at final physical scale. Area thresholds are in mm², linear thresholds and heights in mm. Changing the output size changes the geographic meaning of these thresholds and requires regeneration.

## 5. Vertical geometry

Bottom to top:

| Level | Geometry | User controls |
|---|---|---|
| Base | Continuous floor under the selected outline, except centre hole | Enabled/disabled; thickness, default 1.4 mm |
| City foundation | Non-water areas inside the outline | Height in mm |
| Roads and railways | Combined geometry above foundation; continuous over water crossings | Height in mm; category widths |

With base enabled, water leaves a recess whose floor is the base. With base disabled, water creates through-openings. Water is empty geometry intended for resin, not an exported water mesh.

For interpreting the stack: base occupies z=0..B when enabled (otherwise B=0); foundation occupies z=B..B+F on non-water regions; roads occupy z=B+F..B+F+R. Roads across water remain at road level. These intervals express the agreed layer ordering; the mesh implementation must resolve contacts and overlaps correctly.

Roads and railways are one combined geometric feature. This does not guarantee all geographic pieces are physically connected. Exclude tunnel-tagged road and railway geometry entirely. Preserve bridge continuity across water; automatic piers or support generation were not requested.

## 6. Settings tabs

### Features

Checkbox per road category with an editable width in mm. Railway categories also have enable controls and widths. Railways are simple solid strips, not rails with sleepers. Control combined road-and-rail height in mm.

Exact grouping and initial category selection are implementation choices. Expose understandable labels, and define how OSM subtypes such as link roads inherit widths rather than silently ignoring them.

### Quality

Independent controls for:
- Rounding sharp road corners and junctions.
- Smoothing road paths.
- Filling enclosed gaps smaller than N mm² in the combined road-and-rail geometry, including roundabout centres.

Controls must remain independent. Gap filling affects the road feature; water recesses are governed by Water controls. A value's physical effect should be clear; exact rounding/smoothing parameter ranges are not yet approved.

### Water

Independent controls for:
- Removing isolated water patches below N mm² (replace with foundation).
- Removing small land islands within water below N mm² (replace with water opening).
- Dropping thin water branches using minimum width in mm.
- Smoothing water outlines.

The first two controls have opposite effects and must use unambiguous labels. Thin-branch cleanup should target branches rather than indiscriminately deleting all narrow river connections. Exact algorithm remains an engineering decision.

### Model

Finished model dimensions; foundation height; base enable/disable; base thickness with 1.4 mm default. Show output dimensions and actual total height. Preserve geographic proportions.

### Border & Clock

Optional perimeter border following the selected shape, adjustable width and height.

Optional clock markings with:
- Arabic numbers, Roman numerals, or hour marks.
- Full dial or only 12 / 3 / 6 / 9 positions.
- Placement on the border or inside the map.
- Raised or engraved relief.
- Marking size and raised height or engraving depth.

Optional adjustable-diameter centre hole through the complete model, including any intersecting roads or markings.

## 7. Preview lifecycle

Generate model geometry only upon an explicit Generate Preview request. No automatic preview regeneration after city, crop, size or settings edits. Lightweight map drawing and input updates remain responsive.

States: no preview, generating, up to date, out of date; surface failure and cancellation clearly. Keep the last successful preview visible when settings change and label it Out of date. Show progress and Cancel during generation.

Orbit, pan, zoom and camera presets operate on the existing mesh without regenerating it or making it stale. Preview actual geometry with true physical proportions.

Use a captured input revision for each build. A result must never be presented as up to date if the inputs changed during generation. Exact edit-during-generation UX is an implementation choice. On cancellation/failure preserve the previous successful model and its correct freshness state.

## 8. Export

Export 3MF only, in millimetres, using the current successfully generated geometry. Require regeneration if current settings differ from the displayed model. Use a native save dialog and report success/failure.

Include road/rail, foundation, optional base, optional border/markings and centre-hole effects. Never export a solid water object. Do not add DXF, SVG, STL or terrain exports to scope.

The file must contain valid printable geometry, avoiding accidental internal overlapping volumes, degenerate faces and inverted surfaces. Exact 3MF object/component/material grouping is not settled. Multiple disconnected components can be intentional; never silently add connecting geometry.

## 9. Decisions still open

These are not blockers for documenting the design. The implementing agent should choose and document routine technical defaults, and consult the owner where geometry or user-visible behaviour materially changes:

- Road/foundation heights, border dimensions, category widths, smoothing and cleanup defaults. Only base=1.4 mm is specified.
- Border height reference (absolute or above foundation), inward footprint, and behaviour where water meets the outer edge.
- Whether roads stop at the inner border or merge into it.
- Clock font, Roman IV/IIII, radial inset, orientation and placement on rectangles.
- Support for digits over water or disconnected regions; attachment and engraving behaviour on uneven road/foundation surfaces.
- On-border markings when border is disabled, fit/collision handling, and engraving depth limits. Do not silently create floating text or unexpectedly cut through a floor.
- 3MF body/material organisation and intended slicer compatibility; geometrically merge roads and rails regardless of packaging.
- Coast/sea support and separately cached marine data; PBF coastline lines alone are not complete sea polygons.
- Offline city catalog bootstrap, data location, imported-file coverage verification and refresh behaviour.
- Minimum macOS version, supported CPU architectures, distribution/signing.
- Persistence/project-file UX; saving reproducible inputs and source identity is recommended, but a specific project file format is not mandated.

## 10. Out of scope

No implementation in this documentation task. No buildings, elevation, tunnels, separate water solids, automatic preview, external browser workflow, non-3MF export, accounts, cloud backend, automatic print supports or speculative extra manufacturing modes.
