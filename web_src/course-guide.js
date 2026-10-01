/* One authoritative brief, visible from every module. */
function projectBriefHtml(){
 const s=COURSE.scenario;
 const section=(title,items)=>`<article><h3>${esc(title)}</h3><ul class="checklist">${items.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></article>`;
 return `<div class="hero"><div class="eyebrow" style="color:#aecaFF">Source of truth · QuickBite project</div><h2>The company, the boundaries and your evidence.</h2><p>All QuickBite-specific information is here. General lecture examples refer to other companies. Do not search for hidden company data or invent facts without labelling assumptions.</p></div>
 ${section('Company and problem',s.company_profile)}
 ${section('Service narrative — before you specify detailed rules',s.process_context)}
 <article><h3>People and external services</h3><div class="theory-grid">${s.role_context.map(x=>`<div class="theory-card"><h4>${esc(x.role)}</h4><p>${esc(x.context)}</p></div>`).join('')}</div></article>
 <div class="grid2">${section('In scope — analyse these capabilities',s.in_scope)}${section('Out of scope — fixed classroom boundaries',s.out_of_scope)}</div>
 ${section('Decisions for your team — not missing company facts',s.open_decisions)}
 ${section('Data, assumptions and the policy-lab exception',s.data_rules)}
 ${section('Work, save, submit and resume',s.workflow_rules)}
 ${section('How to write the report and cite evidence',s.reporting_rules)}
 ${section('Lecture files and website modules',s.lecture_mapping)}
 <article><h3>What to hand in</h3><p>For each module, read Module deliverables and its matching numbered task cards. Every card gives a deliverable, where to save it, minimum requirements and when it is complete. Keep evidence together in one project ZIP. The end-of-class backup is separate from a formal Moodle checkpoint.</p><p><b>Archive paths:</b> workspace/reports/ = reports; workspace/models/ = JSON + SVG; workspace/runs/ = saved simulator inputs/results; workspace/student_code/ and workspace/tests/ = policy lab; workspace/logs/ = separate test run history. These are files inside the downloaded ZIP, not folders you must create on your computer.</p><p>The read-only course-guide.md and course-guide.json in each new export preserve the brief and task instructions used for that export. Existing reports remain your own work when the course is updated.</p></article>`;
}
