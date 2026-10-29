# Browser navigation and project compatibility

The hosted workbench uses hash URLs so opening a link, refreshing, and browser Back/Forward work on the existing static host. No hosting rewrites are needed.

Examples:

- `/#/start`, `/#/brief`, `/#/project`
- `/#/modules/M04/concepts`, `/#/modules/M04/tasks`, `/#/modules/M04/report`
- `/#/modules/M04/tasks/02` opens and scrolls to a task
- `/#/models`, `/#/simulators`, `/#/python`, `/#/export`

The root URL still opens Start / Resume. Unknown addresses return to Start.

Navigation runs after the existing project has loaded. It does not change `quickbite.workspace.v1`, schema version 1, archive paths, or the import/export format. Keep the existing website origin when deploying: a different host has a separate browser-local project.

Report and code saves finish before a view changes. A failed save keeps the current view. Unsaved stakeholder/scope changes block leaving the form, including through browser history. Task answer drafts remain in the existing in-memory draft map. Model and simulator editors remain mounted; module changes preserve active model names/source and simulator inputs/module assignments. These drafts are not new persisted files: use the existing Save controls and export before leaving or reloading.

## Verification

`npm run build` includes navigation regression tests for direct links, tabs, task links, history events, save failures, rapid navigation, export-view refresh after import, editor drafts, and preservation of imported files through ZIP export and reload. Existing project-store/archive tests continue to run.

Local browser checks also covered import of a real student export with 34 project files, navigation, Back/Forward, refresh on a report URL, and a new ZIP download. All 33 content files matched the original exactly; only `last_export_utc` in project metadata changed as expected during export. The student ZIP and its contents are not included in this repository.

Before merging, check the preview URL and rerun these flows. Production deployment should retain the current domain. Accounts and server-side storage are separate work and are not introduced here.
