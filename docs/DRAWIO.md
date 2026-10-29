# Embedded draw.io and legacy compatibility

Models / CASE uses the official editor at `https://embed.diagrams.net` in JSON embed mode, with `lang=en`. It is loaded only after a student creates or opens a diagram. The diagram source and exported SVG are saved in the browser-local QuickBite project and travel in the existing ZIP. No new database, account or paid backend is required. Internet access to the hosted editor is needed; the legacy JSON workflow remains available.

## Saved files

- Existing `workspace/models/<name>.json` files are retained byte for byte. Opening one generates editable draw.io cells in memory, preserving labels, connections and coordinates. This does not save or migrate the project.
- Save to project stores `<name>.drawio` as the editable native source and `<name>.svg` as its preview. These two files are persisted together through the existing checked project-store write.
- A native `.drawio` version takes priority when opening saved diagrams. The original JSON remains accessible under Legacy JSON editor. Saving from the legacy editor under a name that already has a native version is blocked; use a separate name with the task prefix to retain both versions.
- New diagrams do not require a JSON file. Existing model-evidence requirements accept either `.json` or `.drawio`, plus the usual SVG. Names/task prefixes, task IDs and project schema version 1 remain unchanged.
- The existing ZIP parser already supports these text files and does not need a migration. Earlier application versions can retain the native files on import but cannot edit them in their old UI. The embedded editor is needed for new native diagram edits.

## Save and draft protection

Messages are accepted only from the exact editor origin and the current iframe window. Export replies are correlated with the originating request. A save first obtains XML, then its SVG; an incomplete or failed export does not replace the project files. The SVG preview is displayed as an image rather than inserted as active SVG markup.

Editor autosave events retain one browser recovery draft separately from canonical project files. Save to project is required before ZIP export. Navigation, import, close and before-unload guards prevent accidental replacement of unsaved/in-flight work. Closing an unsaved editor requires an explicit choice; its browser draft is retained where storage is available. Recovery checks the team/name and original source fingerprint. Browser drafts are not a substitute for exporting a project ZIP.

## Verification

Tests cover legacy conversion, safe IDs/escaping, message origin and window validation, actual nested export-response correlation, unchanged legacy sources, native-only task evidence, failure behaviour, navigation guards, ZIP round trips and reload.

Local browser checks used the real student submission: opened 12 editable shapes and 22 connectors, changed a label through draw.io, saved using both the host and editor buttons, blocked navigation with unsaved work, then exported. Compared with the original, only project export metadata and the deliberately saved SVG changed; a native `.drawio` file was added. Original JSON and all 32 other original files matched exactly. The native source retained all 12 shapes/22 connectors and the edited label. Import/reload preserved all files, including through the previous ZIP parser. Student fixtures are not committed.

Protocol reference: https://www.drawio.com/docs/reference/embed-mode/
