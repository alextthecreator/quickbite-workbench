# Lecture PDFs

The browser Concepts view shows read-only lecture resources for M01, M02 and M03. The original PDFs are copied unchanged into `web_src/materials/` with stable filenames. `web_src/lecture-materials.json` defines module/session mapping, page counts, file sizes and reading links. The build copies these PDFs to `/materials/` and publishes the catalog separately from the student workspace and course guide.

| Module | Sessions | PDF pages | Subject |
| --- | --- | --- | --- |
| M01 | 1 | 34 | Introduction and project vision |
| M01 | 2 | 49 | Life cycles, feasibility and risk |
| M02 | 3 | 30 | Requirements engineering |
| M02 | 4 | 26 | User scenarios and requirements review |
| M03 | 5–6 | 31 | Use cases and activity modelling |

Students can open or download each PDF, jump to selected PDF page ranges, or expand an inline preview. Preview URLs are assigned only when expanded so loading Concepts does not fetch every PDF. The materials do not enter project ZIPs or browser-local student data.

The task-card requirements for M01 Tasks 1–6 and 8, M02 Tasks 2/6/7, and M03 Tasks 2–4 match the corresponding assignment slides. Two clarifications accompany the M03 deck: its overview pages 6/29 abbreviate Task 2 as choosing a use case, while page 17 correctly asks for a use-case diagram; external UML tools listed on pages 27/28 do not automatically create the workbench's required JSON/SVG evidence. The website adds a note without editing the PDF. A note also directs students to Moodle for current deadlines rather than relying on the screenshot in M02 Session 4.

Validation: extracted text from all five PDFs, visually inspected sample pages, checked catalog page counts with a PDF reader and compared SHA-256 hashes of originals, repository files and built files. Local browser checks covered module mapping and on-demand inline preview loading. Existing project/archive/navigation tests continue to run through `npm run build`.
