# Readable browser DFDs

The previous renderer draws centre-to-centre lines, places all labels at the midpoint and never wraps flow labels. Opposing flows overlap exactly, labels can overlap nodes, and the JSON/preview split leaves little room to read a diagram.

The browser now offers automatic DFD layout using pinned `elkjs` 0.12.1, running in a local Web Worker. Full labels are wrapped, directed flows have separately routed paths and space is reserved for node/label rectangles. Users can choose top-to-bottom or left-to-right layout, zoom, open a native full-screen dialog, download the displayed SVG, or inspect a complete Source / Data / Destination flow table. The JSON editor can collapse, leaving the full workspace width for the preview.

Saved positions remain available. Other diagram kinds and the local Python application retain the original renderer. Semantic correctness is still the student's/reviewer's responsibility; automatic layout does not infer or repair the model.

## Data compatibility

- Import format, localStorage key, project schema, archive paths and original JSON coordinates are unchanged.
- Layout runs on a derived graph. Preview, zoom, orientation, table view and SVG download do not write the project store.
- Save JSON + SVG deliberately updates the usual files; JSON retains the student's model and coordinates, while the SVG contains the selected complete diagram layout.
- Existing SVG files remain unchanged until saved. Existing ZIP exports can be imported and previewed using the new layout.
- No student model is sent to a service. The layout engine and worker are served with the static site, including the engine's license notice.

## Verification

Tests cover opposing routes, label/node separation, HTML escaping, invalid endpoints, unchanged input geometry, preview without saving, explicit save and schema-v1 ZIP round trip, legacy/other-kind rendering and hidden-canvas zoom behaviour.

Privately tested the real student submission: the DFD has 12 nodes/22 flows and the context model has 5 nodes/8 flows. Both auto layouts have zero overlapping node/label boxes. Student data and comparison fixtures are excluded from this repository.
