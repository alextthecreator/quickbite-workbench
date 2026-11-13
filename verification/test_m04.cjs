const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const course=require('../course_app/curriculum.json');
const store=require('../web_src/project-store.js'),learning=require('../web_src/learning-state.js');
const {projectZip,parseProjectFile}=require('../web_src/project-archive.js');
const fflate=require('../web_src/vendor/fflate.js');
const m04=course.modules.find(m=>m.code==='M04');

test('M04 context instructions distinguish the two views and both sessions have required work',()=>{
 const one=m04.task_specs.find(t=>t.task===1),two=m04.task_specs.find(t=>t.task===2);
 assert.match(one.save_to,/Starter: dfd/);assert.match(one.save_to,/Remove the starter data store/);
 assert.match(one.minimum_requirements.join(' '),/exactly one process/);
 assert.match(two.save_to,/3–5 internal processes/);
 assert.deepEqual(m04.session_plan.map(s=>s.task_numbers),[[1,2],[4,5]]);
 assert.deepEqual(m04.required_task_numbers,[1,2,4,5]);
});

test('M04 task answers, separately rendered models and guide survive reload and ZIP round trip',async()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const p=new store.ProjectStore(storage,{},'4.7.1');
 p.save('workspace/reports/M03.md','Earlier behavioural analysis retained');
 const nodes=[{id:'e',type:'external',label:'QA Source',x:20,y:40},{id:'p',type:'process',label:'QA System',x:420,y:200},{id:'r',type:'external',label:'QA Recipient',x:20,y:400}];
 const context={kind:'dfd',nodes,edges:[{from:'e',to:'p',label:'QA input'},{from:'p',to:'r',label:'QA result'}]};
 const detailed={kind:'dfd',nodes:[nodes[0],{...nodes[1],label:'1.0 Validate input'}, {id:'p2',type:'process',label:'2.0 Process input',x:820,y:200},{id:'p3',type:'process',label:'3.0 Return result',x:820,y:400},nodes[2],{id:'d',type:'store',label:'D1 QA Data',x:1200,y:200}],edges:[{from:'e',to:'p',label:'QA input'},{from:'p',to:'p2',label:'Validated input'},{from:'p2',to:'d',label:'QA record'},{from:'p2',to:'p3',label:'Processed result'},{from:'p3',to:'r',label:'QA result'}]};
 for(const [name,model] of [['M04_context',context],['M04_dfd',detailed]]){
  const svg=execFileSync(process.env.CODEX_PRIMARY_RUNTIME_PYTHON||'python3',['-c','import json,sys;from course_app.models import render;print(render(json.load(sys.stdin)))'],{cwd:require('node:path').join(__dirname,'..'),input:JSON.stringify(model),encoding:'utf8'});
  assert.match(svg,/<svg/);assert.match(svg,/QA input/);assert.match(svg,/QA result/);
  p.save('workspace/models/'+name+'.json',JSON.stringify(model));p.save('workspace/models/'+name+'.svg',svg);
 }
 const fields={reportEditor:{value:''},moduleTask:{innerHTML:''},saveStatus:{textContent:''}};
 for(const num of ['01','02','04','05'])fields['answer_M04_'+num]={value:'Original answer M04.'+num};
 const ctx=vm.createContext({QuickBiteLearning:learning,browserStore:p,COURSE:course,STATE:null,loadedModuleCode:'M04',reportDirty:false,canWork:()=>true,flushEditors:async()=>{},taskDrafts:new Set(),$:id=>fields[id],api:async()=>p.state(course),reportWithCurrentSections:(c,s)=>s,taskHtml:()=>'',showError:e=>{throw e;}});
 const source=fs.readFileSync(require.resolve('../web_src/course-guide.js'),'utf8');
 vm.runInContext(source.slice(source.indexOf('async function saveTaskAnswer'),source.indexOf('const previousOpenModule')),ctx);
 for(const num of ['01','02','04','05'])await vm.runInContext("saveTaskAnswer('M04."+num+"')",ctx);
 fields.answer_M04_01.value='Revised context rationale';await vm.runInContext("saveTaskAnswer('M04.01')",ctx);
 const report=p.get('workspace/reports/M04.md');
 assert.match(report,/Revised context rationale/);assert.doesNotMatch(report,/Original answer M04.01/);
 for(const num of ['02','04','05'])assert.ok(report.includes('Original answer M04.'+num));
 for(const num of ['01','02','04','05'])assert.equal(report.split('<!-- TASK M04.'+num+' -->').length,2);
 const resumed=new store.ProjectStore(storage,{},'4.7.1');
 assert.deepEqual(resumed.snapshot().files,p.snapshot().files);
 const zip=projectZip(resumed.snapshot(),{version:'4.7.1',website:'https://quickbite-workbench.vercel.app/',course});
 const entries=fflate.unzipSync(zip);
 for(const name of ['M04_context','M04_dfd'])for(const ext of ['json','svg'])assert.ok(entries['workspace/models/'+name+'.'+ext]);
 assert.match(fflate.strFromU8(entries['course-guide.md']),/Starter: dfd/);
 assert.equal(fflate.strFromU8(entries['workspace/reports/M04.md']),report);
 const restoredValues=new Map(),restored=new store.ProjectStore({getItem:k=>restoredValues.get(k)||null,setItem:(k,v)=>restoredValues.set(k,v)},{},'4.7.1');restored.import(parseProjectFile(zip,'QA.zip'));
 assert.deepEqual(restored.snapshot().files,resumed.snapshot().files);
 assert.equal(restored.get('workspace/reports/M03.md'),'Earlier behavioural analysis retained');
});

test('the M04 protection-note addition preserves existing answers, models and completion across ZIP import',()=>{
 const oldCourse=JSON.parse(JSON.stringify(course));
 const oldTask=oldCourse.modules.find(m=>m.code==='M04').task_specs.find(t=>t.task===4);
 oldTask.minimum_requirements=oldTask.minimum_requirements.filter(text=>!text.includes('one denied access'));
 const memory=()=>{const entries=new Map();return {getItem:k=>entries.get(k)||null,setItem:(k,v)=>entries.set(k,v)};};
 const before=new store.ProjectStore(memory(),{},'4.7.2',oldCourse);
 const answer='Three core structures: Order with orderId and status; Menu item with itemId and price; Delivery with deliveryId and address. Field names and assumed status values match our model.';
 before.saveTask('M04.04',answer,oldCourse);
 before.save('workspace/models/M04_context.json',JSON.stringify({kind:'dfd',nodes:[],edges:[]}));
 before.save('workspace/models/M04_context.svg','<svg xmlns="http://www.w3.org/2000/svg"><text>Existing context</text></svg>');
 before.save('workspace/reports/M03.md','Earlier module content must survive.');
 const baseline=before.snapshot().files;
 const bytes=projectZip(before.snapshot(),{version:'4.7.2',website:'https://quickbite-workbench.vercel.app/',course:oldCourse});
 const after=new store.ProjectStore(memory(),{},'4.7.3',course);
 after.import(parseProjectFile(bytes,'existing-project.zip'));
 for(const [path,value] of Object.entries(baseline))assert.equal(after.get(path),value,path+' changed');
 assert.equal(after.state(course).learning['M04.04'].status,'complete');
 const exported=fflate.unzipSync(projectZip(after.snapshot(),{version:'4.7.3',website:'https://quickbite-workbench.vercel.app/',course}));
 const guide=JSON.parse(fflate.strFromU8(exported['course-guide.json']));
 const protection=guide.course.modules.find(m=>m.code==='M04').task_specs.find(t=>t.task===4).minimum_requirements.find(text=>text.includes('one denied access'));
 assert.ok(protection);assert.ok(fflate.strFromU8(exported['course-guide.md']).includes(protection));
 assert.equal(fflate.strFromU8(exported['workspace/reports/M04_task04.md']),answer);
 assert.ok(fflate.strFromU8(exported['workspace/reports/M04.md']).includes(answer));
});

test('S08 renders Task 5 among required cards and the exported guide includes the checkpoint requirements',()=>{
 const five=m04.task_specs.find(t=>t.task===5);
 assert.equal(five.optional,false);
 assert.equal(five.report_section,'Access Matrix');
 assert.deepEqual(five.evidence,[]);
 assert.match(five.save_to,/workspace\/reports\/M04_task05.md/);
 assert.match(five.minimum_requirements.join(' '),/at least one explicitly denied operation/);
 assert.match(five.minimum_requirements.join(' '),/risk or responsibility/);
 assert.match(m04.session_plan.find(s=>s.session===8).work.join(' '),/Required Task 5/);
 assert.match(m04.submission_note,/Tasks 1, 2, 4 and 5/);
 assert.doesNotMatch(JSON.stringify(m04),/matrix (?:remains )?(?:optional|is optional)|Optional access\/risk/);
 const ctx=vm.createContext({PROJECT:{current_session:8},workflowHtml:()=>'',esc:s=>String(s),taskLearningHtml:t=>t.optional?'OPTIONAL PRACTICE':'START HERE'});
 const source=fs.readFileSync(require.resolve('../course_app/assets/app.js'),'utf8');
 vm.runInContext(source.slice(source.indexOf('function taskHtml('),source.indexOf('function renderSessionStrip(')),ctx);
 const html=ctx.taskHtml(m04),optionalStart=html.indexOf('<details class="optional-exercises">');
 assert.ok(html.indexOf('id="task_M04_05"')<optionalStart);
 assert.match(html.slice(optionalStart),/id="task_M04_03"/);
 assert.doesNotMatch(html.slice(optionalStart),/id="task_M04_05"/);
 const entries=fflate.unzipSync(projectZip({files:{}},{version:'4.7.3',website:'https://quickbite-workbench.vercel.app/',course}));
 const json=JSON.parse(fflate.strFromU8(entries['course-guide.json'])).course.modules.find(m=>m.code==='M04');
 assert.deepEqual(json.required_task_numbers,[1,2,4,5]);
 assert.deepEqual(json.session_plan.find(s=>s.session===8).task_numbers,[4,5]);
 const md=fflate.strFromU8(entries['course-guide.md']).split('# M04 —')[1].split('# M05 —')[0];
 assert.match(md,/### Required Task 5/);
 assert.doesNotMatch(md,/### Optional extension — Task 5/);
 assert.ok(md.includes(five.minimum_requirements[2]));
 assert.ok(md.includes('M04 Report → Access Matrix'));
});

test('current ZIPs with an optional Task 5 import and re-export without changing student files or task IDs',()=>{
 const oldCourse=JSON.parse(JSON.stringify(course));
 const oldM04=oldCourse.modules.find(m=>m.code==='M04');
 oldM04.task_specs.find(t=>t.task===5).optional=true;
 oldM04.required_task_numbers=[1,2,4];
 oldM04.session_plan.find(s=>s.session===8).task_numbers=[4];
 oldCourse.course_format.required_tasks=34;
 assert.equal(oldM04.task_specs.find(t=>t.task===5).optional,true);
 assert.deepEqual(m04.task_specs.map(t=>t.task),oldM04.task_specs.map(t=>t.task));
 assert.deepEqual(m04.report_sections,oldM04.report_sections);
 const memory=()=>{const entries=new Map();return {getItem:k=>entries.get(k)||null,setItem:(k,v)=>entries.set(k,v)};};
 for(const hasFive of [false,true]){
  const before=new store.ProjectStore(memory(),{},'4.7.3',oldCourse);
  before.saveTask('M04.04','Existing dictionary and protection note.',oldCourse);
  if(hasFive)before.saveTask('M04.05','Existing access matrix: customer may read own order; denied update to another order because it is outside their responsibility.',oldCourse);
  before.save('workspace/models/M04_context.json','{"kind":"dfd","nodes":[],"edges":[]}');
  before.save('workspace/models/M04_context.svg','<svg/>');
  before.save('workspace/reports/M03.md','Earlier module report.');
  before.save('workspace/attachments/example.bin',{encoding:'base64',data:'AAH/'});
  const original=before.snapshot();
  const zip=projectZip(original,{version:'4.7.3',website:'https://quickbite-workbench.vercel.app/',course:oldCourse});
  const after=new store.ProjectStore(memory(),{},'4.7.3',course);
  after.import(parseProjectFile(zip,'current-student-project.zip'));
  assert.deepEqual(after.snapshot().files,original.files);
  assert.equal(after.state(course).learning['M04.04'].status,'complete');
  assert.equal(after.state(course).learning['M04.05'].status==='complete',hasFive);
  const exported=projectZip(after.snapshot(),{version:'4.7.3',website:'https://quickbite-workbench.vercel.app/',course});
  assert.deepEqual(parseProjectFile(exported,'re-export.zip').files,original.files);
 }
});
