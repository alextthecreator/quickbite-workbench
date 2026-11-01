# Browser workbench — 4.7.2

Live course: https://quickbite-workbench.vercel.app/ . Git pushes to main automatically update this production URL.

This is a static course app for Vercel. Students open one URL, work in their own browser and exchange a project file. No accounts, database, backend, synchronization or local Python installation are required.

## Student workflow

1. Open the course URL. Set a team ID and current session.
2. Read the module tasks and work in the tools. Reports and Python editor drafts autosave in the browser. Use Save JSON + SVG and Run & save evidence for models and simulator evidence.
3. At the end of every class use Save & Export → Download project ZIP. Keep the file outside the lab computer and upload it to Moodle at checkpoints.
4. Next class open the same course URL and import that ZIP if needed. Review the import preview, then click Import this project. The previous browser project is downloaded as a JSON backup before replacement.

The online ZIP contains student files, a project manifest and a read-only course-guide.md/course-guide.json copy of the full brief and all task instructions; it is not a copy of the local Python server. Paths such as workspace/reports/M05.md refer to files inside that ZIP. Older local workbench ZIP exports can also be imported. Binary attachments are preserved. Importing never executes the imported Python code; tests run only when requested.

## Teacher workflow

The repository is on GitHub: https://github.com/alextthecreator/quickbite-workbench .

Connect it to a new Vercel project, framework Other, project root the repository root. The checked-in vercel.json sets the build and output directory. Push committed course/app changes to main to update the same production URL. Keep the production URL stable; browser storage belongs to an origin, so changing hostname creates a separate browser workspace.

- Edit course_app/curriculum.json and the course frontend for teaching content.
- Edit web_src/ for browser storage, project exchange and Python worker behavior.
- If engines.DEFAULTS or models.STARTERS change, refresh web_src/tool-data.json with tools/export_web_tools.py. Tests verify parity.
- workspace/, course_backups/, generated web/, .vercel/ and dependencies are ignored by Git and excluded from deployment.

Student storage uses a stable key independent of course version. Redeploying course content never seeds new templates over an existing student project. Data schema changes need a migration rather than resetting that key. Export/import remains the backup mechanism; there is no shared team editing.

## Local preview and checks

```sh
npm run build
python3 -m http.server 8878 --bind 127.0.0.1 --directory web
```

Open http://127.0.0.1:8878 . This server serves static files only; the original Python API is not used.

```sh
npm run test:web
python3 -m unittest discover -s verification -v
```

The build uses Node.js and has no npm dependencies. The vendored fflate 0.8.2 library handles ZIP files (MIT license included). Python is loaded lazily from the pinned Pyodide 0.29.2 CDN in a Web Worker. Student tests use a fresh worker, run the saved student files and stop after 20 seconds of execution. Python startup has a separate 90-second timeout. Course simulators and models reuse the original Python source.

## Tested scope

- Browser workspace persistence, course-version changes without overwriting work, metadata validation, quota failures and corrupt-data protection.
- Online ZIP round trip, legacy ZIP import, binary attachments and rejection of unrelated/traversal/oversized archives.
- Actual browser Python simulation and evidence save; neutral SVG model rendering.
- Actual student unittest execution, the three expected starter defects, and passing regression tests after edits in the test workspace. Teaching templates remain deliberately defective.
- Report autosave, reload, reopening a saved model, actual project download (verified 12 student files) and import through the visible UI.
- 13 Node.js browser-data tests and 13 Python app/metadata tests passed; GitHub Actions passed. Vercel deployed from the private GitHub repository.

Browser storage is typically limited to a few MB, varying by browser. The logical project-content limit is 12 MB; JSON/ZIP input and expansion limits also account for JSON escaping, duplicated workspace entries and the guide. A quota error preserves the last saved state. Both project export and Emergency backup build downloads in memory without writing to browser storage. The first Python load requires internet. This preview targets modern desktop browsers; classroom mobile/offline use has not been validated.

## Git identity for automatic deployments

This local repository uses the GitHub noreply identity of alextthecreator, so GitHub and Vercel can attribute pushes to the connected owner. GitHub Actions verifies the source before release, and Vercel builds the main branch automatically. Historical local-baseline commits retain their original metadata. When cloning on another computer, set the commit email to an address verified by your GitHub account (the GitHub noreply address is supported).

## Course source of truth

Project Brief contains the fictional company context, roles, scope/exclusions, open design decisions, data rules, team workflow and lecture-to-session mapping. Every task has an explicit deliverable; Module deliverables is generated from those same labels. Methods needed by the tasks are explained in titled guidance cards. M01/M02 lecture files cover Meetings 1/2 inside website module M01.

Exports preserve the guide used at export time, separately from student answers. Import ignores this read-only guide and preserves student workspace data. Each test run uses a timestamp/UUID log filename; legacy logs are retained and can also be reopened from Python testing.

## Student-owned inputs and prerequisites

The course contains company/problem context and classroom constraints, not a supplied stakeholder or scope solution. Your project fields start empty: M01.03 supplies stakeholders and M01.04 supplies scope. Save them in workspace/project-context.json. Task answers use workspace/reports/Mxx_taskNN.md files and matching TASK blocks in the module report. Editing either a card or its report block updates both. Structured stakeholder/scope blocks also update the form. Keep block markers and structured field labels; prose outside the blocks is additional report notes. On import, earlier reports are retained, and originals changed by normalization are included in a recovery attachment.

Every task declares prerequisite IDs in curriculum.json. Student review records are stored in workspace/task-progress.json and fingerprint the saved evidence and upstream evidence. Missing/changed upstream work blocks dependent editing/reviews and relevant evidence saves. Concepts/instructions remain readable. This is a self-check workflow, not automatic academic grading. Export/import carries context, individual answers and reviews; old files retain their reports but do not fabricate structured data or review records.


## Simplified course baseline — v4.7.0

40 academic hours = 20 blocks of 90 minutes. There are 34 required task cards: 7 in M01 and 3 in each later module. Other cards are collapsed optional extensions. Task identifiers stay stable to preserve imported work. One concise module package is submitted within the project ZIP.

M01 session 1: tasks 1–5 (two business objectives). Session 2: tasks 6 and 8 (lifecycle and qualitative feasibility, three risks). Task 7 simulations are optional.

Guided mode allows draft saves in every module. Prerequisites remain preparation advice. Saved structure/evidence drives status without Review complete clicks; it does not grade correctness. Stakeholder and scope data remain empty until the student's own save/import. Legacy answers and review records are retained.

Models / CASE is used throughout modelling modules, not only M09. M09 now covers planning, change and ethics. Python repair and all simulator experiments are optional. Required class/package, use-case/activity, sequence/state models, design-pattern categories and test planning remain in the core.


## Integrity and recovery — v4.7.2

- Existing schema version 1 ZIPs, JSON backups, filenames, the browser key and task IDs remain supported. No student work is reseeded.
- Writes detect a stale copy changed by another tab and stop instead of replacing the whole project. Keep one active editing tab. The rejected tab can export its own drafts before reloading; this is conflict detection, not collaborative merging or a cross-tab transaction system.
- Download project ZIP includes in-memory task, report, code and form drafts without requiring a storage save. Simulator/model editor inputs are retained separately as recovery notes, not fabricated experiment results.
- Emergency backup is available in the sidebar and error messages, including when saving blocks navigation. It downloads a JSON bundle containing the last known project, captured drafts and raw browser project when readable. Import accepts this bundle. Corrupt or oversized raw data is preserved for manual recovery even when automatic import is impossible.
- A diagram export requests the current editable XML from draw.io. A changed draft has no reused stale SVG; reopen and save the diagram to regenerate its preview. If the editor does not respond, the latest received draft is kept and the message explicitly asks the student to retain the open editor and retry.
- Export records identity and export time in the downloaded snapshot, without requiring the browser project to be rewritten. A download request does not assert that the user kept the file safely.
- Regression covers every module's task/report synchronization, structured forms, old exports, conflict detection, simulated quota failure, emergency imports and large project round trips. A privately provided student export was tested locally; no student files are committed.
