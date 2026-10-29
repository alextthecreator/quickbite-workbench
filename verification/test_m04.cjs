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
 assert.deepEqual(m04.session_plan.map(s=>s.task_numbers),[[1,2],[4]]);
 assert.deepEqual(m04.required_task_numbers,[1,2,4]);
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
 for(const num of ['01','02','04'])fields['answer_M04_'+num]={value:'Original answer M04.'+num};
 const ctx=vm.createContext({QuickBiteLearning:learning,browserStore:p,COURSE:course,STATE:null,loadedModuleCode:'M04',reportDirty:false,canWork:()=>true,flushEditors:async()=>{},taskDrafts:new Set(),$:id=>fields[id],api:async()=>p.state(course),reportWithCurrentSections:(c,s)=>s,taskHtml:()=>'',showError:e=>{throw e;}});
 const source=fs.readFileSync(require.resolve('../web_src/course-guide.js'),'utf8');
 vm.runInContext(source.slice(source.indexOf('async function saveTaskAnswer'),source.indexOf('const previousOpenModule')),ctx);
 for(const num of ['01','02','04'])await vm.runInContext("saveTaskAnswer('M04."+num+"')",ctx);
 fields.answer_M04_01.value='Revised context rationale';await vm.runInContext("saveTaskAnswer('M04.01')",ctx);
 const report=p.get('workspace/reports/M04.md');
 assert.match(report,/Revised context rationale/);assert.doesNotMatch(report,/Original answer M04.01/);
 for(const num of ['02','04'])assert.ok(report.includes('Original answer M04.'+num));
 for(const num of ['01','02','04'])assert.equal(report.split('<!-- TASK M04.'+num+' -->').length,2);
 const resumed=new store.ProjectStore(storage,{},'4.7.1');
 assert.deepEqual(resumed.snapshot().files,p.snapshot().files);
 const zip=projectZip(resumed.snapshot(),{version:'4.7.1',website:'https://quickbite-workbench.vercel.app/',course});
 const entries=fflate.unzipSync(zip);
 for(const name of ['M04_context','M04_dfd'])for(const ext of ['json','svg'])assert.ok(entries['workspace/models/'+name+'.'+ext]);
 assert.match(fflate.strFromU8(entries['course-guide.md']),/Starter: dfd/);
 assert.equal(fflate.strFromU8(entries['workspace/reports/M04.md']),report);
 const restored=new store.ProjectStore({getItem:()=>null,setItem:()=>{}},{},'4.7.1');restored.import(parseProjectFile(zip,'QA.zip'));
 assert.deepEqual(restored.snapshot().files,resumed.snapshot().files);
 assert.equal(restored.get('workspace/reports/M03.md'),'Earlier behavioural analysis retained');
});
