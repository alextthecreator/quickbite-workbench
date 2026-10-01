# Validation record

Source: Desktop/merito/QuickBite_Workbench after the 4.3.0 update, its 4.2.0 course backup, QuickBite_Course_Update_v4.3.0.zip, and the pristine student v4.2 ZIP. The referenced chat retrieval contains the latest discussion but no attachments; local artifacts supplied the actual code.

Root cause reproduced with Node.js syntax checking: assets/app.js lines 72–73 contain an unescaped literal newline in a single-quoted join argument. Python self-check succeeds on that broken release, so the updater accepted a frontend that could not boot.

Verified on macOS with Python 3.14.7 and Node.js 24.21.0:

- 12 app regression tests pass. JavaScript syntax and all 70 M01–M10 tasks/session guidance pass.
- All simulator defaults and neutral model rendering through self-check.
- Rejection of broken JavaScript, failing candidate Python, bad checksums, protected paths, traversal, symlink destinations and legacy update formats.
- Valid update with byte-for-byte preservation of student files; rollback after forced installed-check failure.
- Seeding without replacing student files and migration without overwriting a destination.
- Live HTTP course/state, authorization failure, report/code/model/run saves, student test execution, full progress export and resume from extraction.
- Browser inspection: ten Project Modules visible, M05 opens, task criteria and paths render, report editor opens, model preview and student test UI function.
- Tagged starter packaging excludes local student data. Original student workspace and code copies match their source bytes (apart from new package marker files).

The M10 teaching regression suite is expected to expose three intentional defects. Infrastructure verification is a separate suite and does not treat those educational failures as app failures.

Not verified: Windows launcher execution, classroom multi-user use, process interruption halfway through an update, or any hosted deployment. Updates are designed for the trusted local classroom tool. Checksums verify integrity, not publisher identity. Preserve progress ZIPs as student-data backups.
