# Course scope and workload

The working delivery budget is 40 academic hours: 20 meetings of 90 minutes, including explanations and student work. The supplied Software Development / Software engineering syllabus is the primary curriculum reference. It lists 70 laboratory hours and academic year 2027/2028; that administrative difference needs confirmation outside this implementation. This change does not rewrite the syllabus or the published course year.

## Mapping to the supplied outcomes

| Outcome | Course evidence |
| --- | --- |
| W1 business/system analysis | M01 vision, scope and feasibility; M02 requirements |
| W2 functions and information flow | M03 use cases/activity; M04 context/DFD/dictionary |
| W3 requirements with UML | M02 register; M03 use case/activity |
| W4 project management | M01 process choice; M09 remaining work and change |
| W5 software/service life cycles | M01 lifecycle; M06 deployment reasoning |
| W6 testing knowledge | M10 concepts and planned cases |
| U1 use case/activity specification | M03 required diagrams and narrative |
| U2 class/package, creational and structural patterns | M07 class/package diagrams and two brief, contextual pattern applications |
| U3 dynamics and behavioural patterns | M08 one sequence diagram, one state diagram and one behavioural pattern; M03 activity |
| U4 feasibility | M01 qualitative study; M06 revisit after design |
| U5 CASE tools | Required modelling tasks in the browser editor |
| U6 test planning | M10 plan, six cases and two manual model walkthroughs |
| K1 priorities and ethics | Team project; M09 priorities and ethical analysis |

The core remains 34 required task cards. Optional work does not add grading points by default. Full SWEBOK coverage, production implementation, deployment and automated Python tests are not additional requirements of this short laboratory.

## Proportionate module choices

- M04: retain one common method, DFD, for comparable feedback and compatibility with existing work. The context view and level-1 view are two views of the same method. Alternatives such as a UML activity diagram or C4 context can be explained, including what they omit; do not ask students to learn another modelling tool or choose among unrelated notations without a rubric.
- M05: a safe classroom verification can use two synthetic roles/orders: the owner may read an order, an unrelated user may not, and failure must not change data. Students can walk the proposed rule through a permission matrix or model and record the expected observation. This is design verification, not evidence of tested running access controls. An instructor demonstration can show an actual forbidden-access assertion; no live system probing is required.
- M06: connect the existing quality requirement to one architectural decision, its consequence and its check. Example: loss of an application node, proposed response, data dependency and residual limitation. Explain the distinction between one-off and recurring costs on slides. No new cost calculator, extra diagram or formal architecture evaluation is required.
- M07: retain both creational and structural applications because U2 explicitly contains both. Explain each in a few sentences against the existing class model or one small sketch: problem, responsibility, simpler alternative, limitation. Do not add two more full diagrams or production code.
- M08: one sequence diagram is sufficient; describe one alternative/error path in text. Retain the state diagram, two forbidden transitions and one behavioural pattern. The concepts now match the task card instead of asking for a second sequence.
- M09: use 4–6 work items with owner, dependency and milestone plus the next priority. The previous ten-item wording came from the website's Concepts content in curriculum.json, not from an additional slide deck.
- M10: U6 asks for planning testing. Keep the existing required plan, six cases and two manual walkthroughs. A short instructor-led executable demonstration is useful; the Python defect-repair extension can remain optional. Making every student write six additional automated tests is not necessary to meet that stated outcome.

## Grading without more student work

The common 0/1/2 scale is adequate: 2 complete and correct against the stated checklist, 1 partial or partly incorrect, 0 absent or fundamentally incorrect. To make a ten-point module score reproducible, identify which five aspects receive those points. They can group the existing requirements; this adds no tasks.

For example, M04's five aspects could be: system boundary, context exchanges, level-1 transformations/stores, consistency between views, and dictionary/justification. This is an illustrative proposal, not a newly imposed grading policy. No new rubrics or task obligations are introduced by these fixes.
