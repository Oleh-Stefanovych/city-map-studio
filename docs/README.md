# City Map Studio — handoff pack

Produced by the design phase for the building agent. **Nothing is implemented.** The app scaffold (MōBrowser + React + Tailwind + shadcn) is already in this repo; read `../AGENTS.md` first (it requires reading the MōBrowser docs in `node_modules/@mobrowser/api/docs/` before writing code).

| Read in this order | What it is |
|---|---|
| `PRODUCT_SPEC.md` | What to build: workflow, data rules, area/size, layers, every setting, preview + export behaviour, open questions |
| `UI_DESIGN.md` | Exact layout, components, copy, states, interactions, accessibility |
| `design/tokens.json` | Colours, type, radii, shadows, sizes, 3D layer colours, basemap palette |
| `design/defaults.json` | Default values, units, ranges, OSM tag mapping, step lists for every setting |
| `design/source/*.dc.html` + `canvas.json` | The 6 design artboards (mock markup; reference only — see note in `UI_DESIGN.md`) |
| `ARCHITECTURE.md` | Recommended process split, IPC, data layer, state, 3D preview, tests; prior-art Python project and test PBFs |
| `GEOMETRY_AND_3MF.md` | Step-by-step geometry rules and 3MF file structure |
| `IMPLEMENTATION_PLAN.md` | Milestones M0–M8 with acceptance criteria |

Live design canvas (private to the owner, claude.ai): https://claude.ai/artifact/4o7DLvFb76Kf4chftAPcjJ — ask the owner for screenshots if you need pixel references; the 6 artboards are: Main (interactive, Features, out of date), Download (no data), Generating (Water tab), Ready (Border & Clock, up to date), Model (partial coverage, square model from circle selection), Quality (rectangle).

## Ground rules
1. The spec is the source of truth for behaviour; the mock for look. If they disagree, follow the spec and note it in `docs/DECISIONS.md`.
2. Physical units everywhere (mm, mm²) at **final scale**.
3. Preview is built **only** on "Generate Preview"; any area/setting change ⇒ "Out of date"; camera moves never rebuild; export only when up to date.
4. Output is **3MF only**. No water solid, no tunnels, no buildings, no elevation.
5. Reference Python project (read-only): `/Users/oleh/WORK/pbf-reader` — data catalogues/downloads/coverage logic, geometry cleanup ideas, and real PBFs for testing (`pbf/monaco-*.osm.pbf` is small).
