const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const T=require('../web_src/task-tables.js'),S=require('../web_src/project-store.js'),L=require('../web_src/learning-state.js'),R=require('../web_src/report-sync.js'),E=require('../web_src/project-export.js'),A=require('../web_src/project-archive.js'),course=require('../course_app/curriculum.json');
const memory=()=>{const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};};
function example(id){const d=T.empty(id);if(id==='M04.04'){d.rows[0]=['Order | booking','status','<script>alert(1)</script> & &#10;\nsecond line','enum','new / complete','Synthetic teaching assumption'];d.notes='Protection: employee may read; denied Delete due to responsibility.\n\nOriginal report notes.';}else{d.roles[0]='Customer | reader';d.resources[0]='Order <details>';d.cells[0][0]={allowed:['Read','Create'],other:'Request refund\nwith approval',denied:'Delete | another order',reason:'Responsibility <br>Other permitted: no & unsafe'};d.notes='Existing matrix notes\nkept exactly.';}return d;}

test('table answers round-trip special characters without interpreting old prose or hand-edited Markdown',()=>{
 for(const id of T.IDS){const d=example(id),text=T.serialize(id,d);assert.deepEqual(T.parse(id,text),d);assert.equal(T.parse(id,'My existing student answer | with a table'),null);assert.equal(T.serialize(id,T.parse(id,text+'\n')),text+'\n');assert.equal(T.parse(id,text.replace(' v1 -->',' v9 -->')),null);assert.equal(T.hasContent(T.empty(id)),false);assert.equal(T.hasContent(d),true);}
 assert.equal(T.parse('M04.04',T.serialize('M04.04',example('M04.04')).replace('| --- |','| changed |')),null);
});

test('table saves preserve task/report sync, reload, and ZIP import/export, including legacy text and binary files',()=>{
 const storage=memory(),store=new S.ProjectStore(storage,{},'4.7.3',course);
 store.save('workspace/reports/M03.md','Earlier report must remain.');store.save('workspace/models/M04_context.json','{"kind":"dfd"}');store.save('workspace/attachments/binary.dat',{encoding:'base64',data:'AAH/'});
 store.saveTask('M04.04','Existing dictionary with free text and unknown layout.',course);
 store.saveTask('M04.05','Existing access matrix typed as prose.',course);
 const old=store.snapshot(),tableStorage=memory(),imported=new S.ProjectStore(tableStorage,{},'4.7.3',course);
 imported.import(A.parseProjectFile(A.projectZip(old),'old-student.zip'));
 assert.deepEqual(imported.snapshot().files,old.files);
 for(const id of T.IDS){const original=imported.get(R.pathFor(id)),d=example(id);d.notes=original+'\n'+d.notes;imported.saveTask(id,T.serialize(id,d),course);assert.ok(imported.get(R.pathFor(id)).includes(original));assert.deepEqual(T.parse(id,imported.get(R.pathFor(id))),d);}
 const report=imported.get('workspace/reports/M04.md');for(const id of T.IDS)assert.equal(R.blocks(report,'M04').get(id).text,imported.get(R.pathFor(id)));
 const zip=A.projectZip(imported.snapshot()),restored=new S.ProjectStore(memory(),{},'4.7.3',course);restored.import(A.parseProjectFile(zip,'tables.zip'));
 assert.deepEqual(restored.snapshot().files,imported.snapshot().files);
 for(const id of T.IDS)assert.deepEqual(T.parse(id,restored.get(R.pathFor(id))),T.parse(id,imported.get(R.pathFor(id))));
 // Editing the report is authoritative; an unrecognised edited table stays plain text.
 const changed=report.replace('Order &#124; booking','Revised structure');restored.save('workspace/reports/M04.md',changed);assert.equal(T.parse('M04.04',restored.get(R.pathFor('M04.04'))).rows[0][0],'Revised structure');
 const edited=changed.replace('<!-- QUICKBITE TABLE M04.05 v1 -->','My own table layout');restored.save('workspace/reports/M04.md',edited);assert.equal(T.parse('M04.05',restored.get(R.pathFor('M04.05'))),null);
 assert.equal(restored.get('workspace/reports/M03.md'),'Earlier report must remain.');
 const resumed=new S.ProjectStore(tableStorage,{},'4.7.3',course);assert.deepEqual(resumed.snapshot().files,imported.snapshot().files);
});

function ui(){
 const fields={},drafts=new Map(),listeners={};
 const ctx=vm.createContext({QuickBiteTaskTables:T,QuickBiteLearning:L,taskDrafts:drafts,esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),$:id=>fields[id],document:{addEventListener:(type,fn)=>listeners[type]=fn}});
 vm.runInContext(fs.readFileSync(require.resolve('../web_src/task-table-ui.js'),'utf8'),ctx);
 return {ctx,fields,drafts,listeners};
}
test('UI preserves legacy prose, escapes cells, and keeps blank tables out of saved answers',()=>{
 const {ctx}=ui();const legacy='<img src=x onerror=alert(1)> existing answer';
 const old=ctx.taskAnswerEditor('M04.04',legacy);assert.match(old,/Use table and keep existing text in notes/);assert.doesNotMatch(old,/data-task-table=/);assert.ok(old.includes('&lt;img'));
 const html=ctx.taskAnswerEditor('M04.04',T.serialize('M04.04',example('M04.04')));assert.match(html,/data-task-table="M04.04"/);assert.doesNotMatch(html,/<script>/);assert.match(html,/Edit as text/);
 const blank=ctx.taskAnswerEditor('M04.05','');assert.match(blank,/data-task-table="M04.05"/);assert.match(blank,/Denied operation/);assert.match(blank,/<textarea aria-label="Your answer for M04.05" id="answer_M04_05"><\/textarea>/);
});

test('table input updates the standard draft used by ZIP and emergency export; added empty dimensions are preserved',()=>{
 const {ctx,fields,drafts,listeners}=ui();
 const id='M04.05',data=T.empty(id);ctx.taskAnswerEditor(id,'');
 fields.answer_M04_05={value:''};
 const elements=[{dataset:{tablePath:'roles.0'},value:'Student role'},{dataset:{tablePath:'resources.0'},value:'Project data'},{dataset:{tablePath:'cells.0.0.allowed',operation:'Read'},checked:true},{dataset:{tablePath:'cells.0.0.denied'},value:'Delete'},{dataset:{tablePath:'cells.0.0.reason'},value:'Outside role responsibility'}];
 fields.task_editor_M04_05={querySelectorAll:()=>elements,set outerHTML(html){this.html=html;}};
 listeners.input({target:{closest:()=>({dataset:{taskTable:id}})}});
 const text=drafts.get(id);assert.equal(fields.answer_M04_05.value,text);assert.deepEqual(T.parse(id,text).cells[0][0].allowed,['Read']);
 const project=new S.ProjectStore(memory(),{},'4.7.3',course).snapshot();
 const bundle=E.prepare(project,course,{taskAnswers:Object.fromEntries(drafts)}).project;
 assert.equal(A.parseProjectFile(A.projectZip(bundle),'draft.zip').files[R.pathFor(id)],text);
 assert.equal(E.recover({app_id:E.RECOVERY_ID,schema_version:1,saved_project:project,drafts:{taskAnswers:Object.fromEntries(drafts)}},course).files[R.pathFor(id)],text);
 ctx.changeTaskTable(id,'add-resource');assert.equal(T.parse(id,drafts.get(id)).resources.length,5);
 ctx.changeTaskTable(id,'remove-resource',4);assert.equal(T.parse(id,drafts.get(id)).resources.length,4);
 ctx.changeTaskTable(id,'undo');assert.equal(T.parse(id,drafts.get(id)).resources.length,5);
 ctx.clearTaskTableSession();assert.equal(vm.runInContext('tableUndo.size',ctx),0);
});
