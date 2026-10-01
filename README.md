# QuickBite Engineering Workbench

## Online browser preview

Live course: https://quickbite-workbench.vercel.app/ . Git pushes to main automatically update this production URL.

The browser version uses Vercel as static hosting, without accounts or a database. Students keep work in their browser and export/import project ZIPs. See [the online workflow](docs/ONLINE.md) for student and teacher instructions. Run `npm run build` to produce the static `web/` directory. The original 4.4.0 local release remains available via its Git tag.

## Local Python workbench — 4.4.0

Run `python3 app.py` (Windows: `py -3 app.py`) from this folder, or use the START script. Python 3.10+ is required; no Python packages are needed. Node.js is required only for self-checks, course updates and release validation. The app listens on localhost, port 8765. Use `--port 8876` for a second copy.

## Files and student progress

- `course_app/`: versioned app, curriculum, tools, supplied tests and pristine workspace templates.
- `workspace/`: student reports, models, runs, attachments, logs, project identity, `student_code/policies.py`, and `tests/test_student.py`. Ignored by Git. Existing files are never reseeded.
- `verification/`: app regression tests; separate from the M10 student exercise.
- `tools/`: migration and tagged release packaging.
- `course_backups/`: update rollback copies; ignored by Git.

The included local workspace is copied from Desktop/merito/QuickBite_Workbench. It is not part of the Git baseline or clean student ZIP. Other copies in Downloads are separate student histories and have not been merged.

At the end of each class save files, then use Save & Export. Extract the resulting ZIP and start that copy next class. Git protects course source; progress ZIPs protect student work. Do not use Git alone as a backup for the ignored workspace.

Every task shows WHERE TO SAVE, MINIMUM REQUIREMENTS and COMPLETE WHEN. Reports live at `workspace/reports/Mxx.md`. Earlier report text is preserved; missing current headings are appended in the editor for review and become persistent only when saved. Structural checks do not assess academic correctness.

## Migrate another legacy project

Start with a clean repository/student release whose `workspace/` does not yet exist. Before first launch:

```sh
python3 tools/migrate_workspace.py /path/to/legacy/QuickBite_Workbench
```

The migration copies reports, models, runs, logs, attachments, metadata, student code and student tests. It refuses an existing destination. Never extract an old full starter over this repository. Legacy format 1 updates are intentionally rejected by the 4.4 baseline. Use format 2 updates posted for versions 4.4+.

## Validate

```sh
python3 app.py --self-check
python3 -m unittest discover -s verification -v
python3 -m course_app.run_student_tests student
```

M10 deliberately starts with three defective policy functions. `m10` or `all` student suites initially fail cancellation, fee boundary and pickup transition checks. Students repair these as part of the course; do not fix the teaching starter to make infrastructure verification green.

## Git and releases

This repository has a local baseline commit and tag `v4.4.0`. Student files, logs, caches and backups are excluded. The private GitHub remote is https://github.com/alextthecreator/quickbite-workbench .

For a future release, update `course_app/course_version.json` and `course_app/CHANGELOG.md`, run verification, commit the changes and create the matching tag, then:

```sh
python3 tools/build_release.py v4.4.1
```

Packaging reads the exact tag, verifies it in isolation, and creates a clean student ZIP and a format 2 course update in `dist/`. It never packages the local student workspace. An update ZIP for the currently installed version is rejected; the `v4.4.0` update demonstrates the format and is not an upgrade from 4.4.0.

Apply a newer format 2 package through Course Update, or:

```sh
python3 -m course_app.tools.apply_update /path/to/QuickBite_Course_Update_v4.4.1.zip
```

Updates validate the full candidate, including JavaScript syntax and all task guidance, before changing course files. Replacement files are backed up and a failed installed self-check triggers rollback. Restart the same folder after success. Update checksums detect corruption; they are not a cryptographic publisher signature. Use packages from your course instructor.

See `docs/VERCEL.md` for the hosting assessment and `docs/VALIDATION.md` for tested scope.
