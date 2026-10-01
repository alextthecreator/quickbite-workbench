# Vercel assessment — 1 October 2026

**Updated scope:** the user chose a browser-only workbench with local browser storage and project-file handoff. This removes the need for accounts, a database and server-side Python execution. See ONLINE.md for the implemented static architecture. The requirements below apply to a separate multi-user hosted backend, not to this browser-only version.

Vercel is suitable for a future browser-based course portal or the static course interface. The current local workbench is not ready for direct deployment. Keep 4.4.0 local while developing a separate hosted architecture.

The current backend uses Python's ThreadingHTTPServer, writes files to workspace/, executes student Python tests in a local subprocess, exposes a per-process token, assumes one trusted local team, and applies updates by replacing its own source files. These are deliberate desktop assumptions.

Vercel supports Python functions, including Flask and FastAPI, so a rewrite to JavaScript is not required. File writes need persistent storage; Vercel recommends object storage for files rather than relying on the function filesystem. See https://vercel.com/docs/functions/runtimes/python and https://vercel.com/kb/guide/how-can-i-use-files-in-serverless-functions .

Required changes for a hosted workbench:

1. Serve HTML/CSS/JavaScript as static assets. Replace ThreadingHTTPServer handlers with Flask/FastAPI API routes or a separate service. Keep the deterministic engines/model rendering as reusable Python components.
2. Add accounts, team membership, server-side authorization for every resource and proper session/CSRF protection. The localhost Host check and process-local token must be replaced. Isolate team workspaces and exports.
3. Store project metadata and report/model source in a database; store attachments, rendered SVG and export ZIPs in object storage. Use revisions and transactions for concurrent saves. Do not store student progress on deployment disk.
4. Run submitted Python in an isolated execution service with resource limits, timeouts, restricted networking and filesystem, and no application credentials. The current subprocess runner trusts the local student and cannot safely serve arbitrary hosted submissions. Alternatively retain Python execution locally and host only the course/report tools.
5. Replace the self-modifying ZIP updater with Git-based deployments. Version curriculum content independently, migrate saved data without replacement, and record the course version used by each team. Keep backward-compatible APIs while teams move between course versions.
6. Adapt export/resume to authenticated downloads/uploads of student data rather than portable copies of the server. Stream or asynchronously build large exports according to the chosen platform's request limits.
7. Add backup/restore, access tests, multi-team concurrency tests and monitoring before using it for a class.

A practical first phase is a static course portal on Vercel linking to the tagged local workbench ZIPs. A full hosted workbench is a separate development phase with database, file storage, authentication and an isolated Python runner. No deployment has been configured or performed in this baseline.
