# Changelog

## 4.4.0 — 2026-10-01

- Fix the literal newline inside a quoted `.join()` argument in the 4.3.0 report-template function. That JavaScript parse error prevented boot and left Project Modules empty.
- Separate course_app from workspace; seed missing student code/tests from pristine 4.2 templates without replacing existing files.
- Preserve 4.3 task criteria, add actual workspace save locations and align the M01 stakeholder criteria with its instruction.
- Append missing report headings in the editor while preserving earlier text.
- Follow the selected module when assigning simulator evidence and choosing the default model filename.
- Validate JavaScript and curriculum as part of candidate update checks, reject incompatible legacy packages, constrain writes to course files, and test rollback/preservation.
- Add independent app verification, migration tooling and packaging from exact Git tags.
