const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const S=require('../web_src/project-store.js'),R=require('../web_src/report-sync.js'),L=require('../web_src/learning-state.js'),E=require('../web_src/project-export.js'),A=require('../web_src/project-archive.js');
const course=require('../course_app/curriculum.json');
function storage(){const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};}
function project(){return new S.ProjectStore(storage(),{},'4.7.2',course);}
test('every module keeps task files and edited report blocks identical through reload and ZIP',()=>{
 for(const m of course.modules){
  const p=project(),t=m.task_specs.find(t=>!t.context_output),id=R.idFor(m.code,t),path='workspace/reports/'+m.code+'.md';
  const first='\nOriginal α answer\n\nWith trailing whitespace \n';p.saveTask(id,first);
  assert.equal(R.blocks(p.get(path),m.code).get(id).text,p.get(R.pathFor(id)));
  p.save(path,p.get(path).replace('Original α answer','Revised β answer'));
  assert.equal(p.get(R.pathFor(id)),first.replace('Original α answer','Revised β answer'));
  const copy=project();copy.import(A.parseProjectFile(A.projectZip(p.snapshot()),'round-trip.zip'));
  assert.equal(R.blocks(copy.get(path),m.code).get(id).text,copy.get(R.pathFor(id)));
 }
});
test('editing one of two task blocks sharing a heading changes only that answer',()=>{
 const p=project(),path='workspace/reports/M02.md';
 p.saveTask('M02.02','First independent answer');p.saveTask('M02.03','Second independent answer');
 p.save(path,p.get(path).replace('First independent answer','Updated first answer'));
 assert.equal(p.get(R.pathFor('M02.02')),'Updated first answer');assert.equal(p.get(R.pathFor('M02.03')),'Second independent answer');
});
test('stakeholder and scope edits in the report update the form and both task copies',()=>{
 const p=project(),c=L.empty();
 c.people={rows:[{name:'A role',type:'person/role',need:'First need\nMore detail',concern:'Concern',question:'Question'},{name:'Second role',type:'organization/service',need:'Another need',concern:'Other concern',question:'Other question'}],conflict:'Competing interests'};
 c.scope={in_scope:['Capability one','Capability two'],out_of_scope:['Exclusion'],rationale:'First reason'};
 p.save(L.CONTEXT,JSON.stringify(c));const path='workspace/reports/M01.md';
 p.save(path,p.get(path).replace('First need','Updated need').replace('First reason','Updated reason'));
 const saved=L.context(p.snapshot().files);assert.equal(saved.people.rows[0].need,'Updated need\nMore detail');assert.equal(saved.people.rows[1].name,'Second role');assert.equal(saved.scope.rationale,'Updated reason');
 for(const id of ['M01.03','M01.04'])assert.equal(R.blocks(p.get(path),'M01').get(id).text,p.get(R.pathFor(id)));
});
test('malformed report blocks or form labels cannot overwrite saved answers',()=>{
 const p=project();p.saveTask('M03.03','Saved analysis');const before=p.snapshot();
 for(const broken of [p.get('workspace/reports/M03.md').replace('<!-- END TASK M03.03 -->',''),p.get('workspace/reports/M03.md')+'\n<!-- TASK M03.03 -->\nx\n<!-- END TASK M03.03 -->']){
  assert.throws(()=>p.save('workspace/reports/M03.md',broken));assert.deepEqual(p.snapshot(),before);
 }
});
test('removing a task marker never silently erases the separately saved answer',()=>{
 const p=project();p.saveTask('M04.04','Saved dictionary');p.save('workspace/reports/M04.md','# M04\nMy additional notes');
 assert.match(p.get('workspace/reports/M04.md'),/My additional notes/);assert.equal(R.blocks(p.get('workspace/reports/M04.md'),'M04').get('M04.04').text,'Saved dictionary');
});
test('old reports without markers migrate without losing any original file',()=>{
 const p=project(),input=p.snapshot();input.course_version='4.7.1';
 input.files['workspace/reports/M03.md']='# Legacy report\nEarlier long-form analysis not repeated on the card';input.files[R.pathFor('M03.03')]='Independently saved task answer';
 p.import(input);assert.equal(p.get(R.pathFor('M03.03')),'Independently saved task answer');assert.match(p.get('workspace/reports/M03.md'),/Earlier long-form analysis/);
 const originals=Object.entries(p.snapshot().files).filter(([p])=>p.includes('QuickBite_original_imported_files')).flatMap(([,v])=>Object.entries(JSON.parse(v)));
 assert.ok(originals.some(([path,text])=>path==='workspace/reports/M03.md'&&text===input.files[path]));
 const q=project();q.import(A.parseProjectFile(A.projectZip(p.snapshot()),'old-updated.zip'));assert.deepEqual(q.snapshot().files,p.snapshot().files);
});
test('a stale second tab cannot overwrite the first tab and can still be exported',()=>{
 const s=storage(),a=new S.ProjectStore(s,{},'4.7.2',course),b=new S.ProjectStore(s,{},'4.7.2',course);
 a.saveTask('M01.01','First tab answer');assert.throws(()=>b.saveTask('M02.02','Second tab draft'),/another tab/);
 assert.equal(new S.ProjectStore(s,{},'4.7.2',course).get(R.pathFor('M01.01')),'First tab answer');
 const exported=E.prepare(b.snapshot(),course,{taskAnswers:{'M02.02':'Second tab draft'}});assert.equal(exported.project.files[R.pathFor('M02.02')],'Second tab draft');
});
test('quota failures do not prevent exporting current answers, report, code and forms',()=>{
 const s=storage(),p=new S.ProjectStore(s,{},'4.7.2',course);p.saveTask('M02.02','Old answer');const before=s.getItem(S.KEY);s.setItem=()=>{throw Error('quota')};
 assert.throws(()=>p.saveTask('M02.02','New answer'),/Emergency backup/);
 const context=L.empty();context.scope={in_scope:['Draft capability'],out_of_scope:[],rationale:'Draft reason'};
 const prepared=E.prepare(p.snapshot(),course,{report:{module:'M02',text:p.get('workspace/reports/M02.md').replace('Old answer','Revised report answer')},taskAnswers:{'M03.03':'Draft use case'},context,code:{key:'student_tests',text:'# unsaved test'}});
 assert.equal(prepared.project.files[R.pathFor('M02.02')],'Revised report answer');assert.equal(prepared.project.files[R.pathFor('M03.03')],'Draft use case');assert.equal(prepared.project.files['workspace/tests/test_student.py'],'# unsaved test');assert.match(prepared.project.files['workspace/reports/M01.md'],/Draft capability/);assert.equal(s.getItem(S.KEY),before);
 assert.deepEqual(A.parseProjectFile(A.projectZip(prepared.project),'saved.zip').files,prepared.project.files);
});
test('emergency JSON recovers drafts through the same import entry point',()=>{
 const p=project(),bundle={app_id:E.RECOVERY_ID,schema_version:1,saved_project:p.snapshot(),drafts:{taskAnswers:{'M09.02':'My remaining work'}}};
 const recovered=A.parseProjectFile(new TextEncoder().encode(JSON.stringify(bundle)),'emergency.json',{},course);
 assert.equal(recovered.files[R.pathFor('M09.02')],'My remaining work');assert.equal(R.blocks(recovered.files['workspace/reports/M09.md'],'M09').get('M09.02').text,'My remaining work');
});
test('an invalid report draft is retained verbatim for recovery rather than discarded',()=>{
 const p=project(),text='<!-- TASK M01.01 -->\nAn unfinished edit';const prepared=E.prepare(p.snapshot(),course,{report:{module:'M01',text}});
 assert.equal(prepared.warnings.length,1);assert.ok(Object.values(prepared.project.files).includes(text));
});
test('editable diagram drafts are exported without a misleading old SVG preview',()=>{
 const p=project();p.save('workspace/models/M03_usecase.drawio','<mxfile old="1"/>');p.save('workspace/models/M03_usecase.svg','<svg>old</svg>');
 const prepared=E.prepare(p.snapshot(),course,{diagram:{name:'M03_usecase',xml:'<mxfile new="1"/>'}});
 assert.equal(prepared.project.files['workspace/models/M03_usecase.drawio'],'<mxfile new="1"/>');assert.equal(prepared.project.files['workspace/models/M03_usecase.svg'],undefined);assert.match(prepared.warnings.join(' '),/regenerate/);
});
test('a supported 10.5 MB project and JSON escape overhead survive export and import',()=>{
 for(const text of ['x'.repeat(10_500_000),'\u0000'.repeat(2_100_000)]){
  const p=new S.ProjectStore(storage(),{},'4.7.2');p.save('workspace/reports/M01.md',text);
  assert.equal(A.parseProjectFile(A.projectZip(p.snapshot()),'large.zip').files['workspace/reports/M01.md'],text);
  assert.equal(A.parseProjectFile(new TextEncoder().encode(JSON.stringify(p.snapshot())),'large.json').files['workspace/reports/M01.md'],text);
 }
});
test('the actual UI export functions do not call storage, flush or save and preserve drafts',async()=>{
 const p=project(),downloads=[],fields={saveStatus:{},exportFeedback:{}};
 const source=fs.readFileSync(require.resolve('../web_src/browser-ui.js'),'utf8');
 const ctx=vm.createContext({QuickBiteStore:S,QuickBiteArchive:A,QuickBiteExport:E,COURSE:course,VERSION:{version:'4.7.2'},browserStore:p,taskDrafts:new Map([['M02.02','Unsaved answer']]),reportDirty:false,codeDirty:false,contextDirty:false,drawioSession:null,localStorage:{getItem:()=>{throw Error('storage unavailable')}},$:id=>fields[id],Blob,Date,downloadBlob:(blob,name)=>downloads.push({blob,name}),showError:e=>{throw e},flushEditors:()=>{throw Error('Export must not flush to storage')}});
 vm.runInContext(source.slice(source.indexOf('function captureExportDrafts'),source.indexOf('let pendingImport')),ctx);
 await vm.runInContext('onlineExport()',ctx);assert.equal(downloads.length,1);assert.match(downloads[0].name,/\.zip$/);
 assert.equal(A.parseProjectFile(new Uint8Array(await downloads[0].blob.arrayBuffer()),downloads[0].name).files[R.pathFor('M02.02')],'Unsaved answer');
 await vm.runInContext('emergencyExport()',ctx);assert.equal(downloads.length,2);const json=JSON.parse(await downloads[1].blob.text());assert.equal(json.drafts.taskAnswers['M02.02'],'Unsaved answer');
});
test('course clarification includes the required S08 access matrix and all syllabus pattern categories',()=>{
 assert.equal(course.modules.flatMap(m=>m.task_specs.filter(t=>!t.optional)).length,35);
 const m7=course.modules[6],m8=course.modules[7],m9=course.modules[8];
 assert.match(m7.task_specs[3].instruction,/creational and one structural/);
 assert.doesNotMatch(m7.theory_cards.map(c=>c.body).join(' '),/Only one pattern decision/);
 assert.doesNotMatch(m8.theory_cards.map(c=>c.body).join(' '),/Save two complementary/);
 assert.doesNotMatch(m9.theory_cards.map(c=>c.body).join(' '),/Plan ten remaining/);
 assert.match(m9.theory_cards.map(c=>c.body).join(' '),/4–6 remaining-work/);
});
