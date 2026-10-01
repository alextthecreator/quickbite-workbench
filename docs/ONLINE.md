# Browser workbench preview — 4.5.0-web.1

Live course: https://quickbite-workbench.vercel.app/ . Git pushes to main automatically update this production URL.

This is a static course app for Vercel. Students open one URL, work in their own browser and exchange a project file. No accounts, database, backend, synchronization or local Python installation are required.

## Student workflow

1. Open the course URL. Set a team ID and current session.
2. Read the module tasks and work in the tools. Reports and Python editor drafts autosave in the browser. Use Save JSON + SVG and Run & save evidence for models and simulator evidence.
3. At the end of every class use Save & Export → Download project ZIP. Keep the file outside the lab computer and upload it to Moodle at checkpoints.
4. Next class open the same course URL and import that ZIP if needed. Review the import preview, then click Import this project. The previous browser project is downloaded as a JSON backup before replacement.

The online ZIP contains student files and a project manifest; it is not a copy of the local Python server. Paths such as workspace/reports/M05.md refer to files inside that ZIP. Older local workbench ZIP exports can also be imported. Binary attachments are preserved. Importing never executes the imported Python code; tests run only when requested.

## Teacher workflow

The repository is private on GitHub: https://github.com/alextthecreator/quickbite-workbench .

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

Browser storage is typically limited to a few MB, varying by browser. Files larger than 12 MB are rejected; a quota error preserves the last saved state and asks the student to export. The first Python load requires internet. This preview targets modern desktop browsers; classroom mobile/offline use has not been validated.

## Git identity for automatic deployments

This local repository uses the GitHub noreply identity of alextthecreator, so GitHub and Vercel can attribute pushes to the connected owner. GitHub Actions verifies the source before release, and Vercel builds the main branch automatically. Historical local-baseline commits retain their original metadata. When cloning on another computer, set the commit email to an address verified by your GitHub account (the GitHub noreply address is supported).
