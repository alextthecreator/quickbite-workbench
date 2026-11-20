const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {parse,format,create}=require('../web_src/browser-router.js');
const {ProjectStore,KEY}=require('../web_src/project-store.js');
const {projectZip,parseProjectFile}=require('../web_src/project-archive.js');

function browser(hash=''){
 const events={},entries=[hash];let index=0;
 const win={location:{hash},addEventListener:(type,fn)=>{events[type]=fn;},history:{
  pushState(_state,_title,value){entries.splice(index+1);entries.push(value);index++;win.location.hash=value;},
  replaceState(_state,_title,value){entries[index]=value;win.location.hash=value;}
 }};
 return {win,entries,external(value){win.location.hash=value;events.popstate();events.hashchange();},back(){index--;win.location.hash=entries[index];events.popstate();events.hashchange();},forward(){index++;win.location.hash=entries[index];events.popstate();events.hashchange();}};
}

test('view URLs round-trip, including module tabs and task links; unknown paths use Start',()=>{
 for(const page of ['overview','brief','context','models','sim','code','files'])assert.deepEqual(parse(format({page})),{page});
 for(const module of ['M01','M04','M10'])for(const tab of ['theory','taskwork','report']){const route={page:'task',module,tab};assert.deepEqual(parse(format(route)),route);}
 const task={page:'task',module:'M04',tab:'taskwork',task:'02'};assert.deepEqual(parse(format(task)),task);
 for(const hash of ['', '#unknown', '#/modules/M99/report', '#/modules/M04/report/02'])assert.deepEqual(parse(hash),{page:'overview'});
});

test('direct module link, Back/Forward and duplicate browser events render one settled view',async()=>{
 const b=browser('#/modules/M04/report'),views=[];
 const router=create({window:b.win,beforeLeave:async()=>{},render:async r=>views.push(format(r)),onError:e=>{throw e;}});
 await router.start();assert.equal(b.entries.length,1);assert.equal(views[0],'#/modules/M04/report');
 await router.navigate({page:'models'});await router.navigate({page:'files'});
 b.back();await router.idle();assert.equal(router.current().page,'models');assert.equal(views.length,4);
 b.forward();await router.idle();assert.equal(router.current().page,'files');assert.equal(views.length,5);
 await router.navigate({page:'files'});assert.equal(b.entries.length,3);assert.equal(views.length,5);
});

test('a failed save blocks clicks and browser history without replacing the current view',async()=>{
 const b=browser('#/models'),views=[],errors=[];let reject=false;
 const router=create({window:b.win,beforeLeave:async()=>{if(reject)throw Error('Storage full');},render:async r=>views.push(format(r)),onError:e=>errors.push(e.message)});
 await router.start();reject=true;
 assert.equal(await router.navigate({page:'files'}),false);assert.equal(b.win.location.hash,'#/models');assert.deepEqual(views,['#/models']);
 b.external('#/modules/M04/report');await router.idle();assert.equal(b.win.location.hash,'#/models');assert.equal(views.length,1);assert.ok(errors.every(x=>x==='Storage full'));
 reject=false;assert.equal(await router.navigate({page:'files'}),true);
});

test('rapid navigation waits for pending saves before touching the next editor',async()=>{
 const b=browser('#/start'),steps=[];let release;
 const blocked=new Promise(resolve=>{release=resolve;});let hold=false;
 const router=create({window:b.win,beforeLeave:async r=>{steps.push('save:'+r.page);if(hold){hold=false;await blocked;}},render:async r=>steps.push('render:'+r.page),onError:e=>{throw e;}});
 await router.start();hold=true;
 const first=router.navigate({page:'models'}),second=router.navigate({page:'files'});
 await Promise.resolve();assert.deepEqual(steps,['save:overview','render:overview','save:models']);
 release();await Promise.all([first,second]);assert.deepEqual(steps.slice(2),['save:models','render:models','save:files','render:files']);
});

test('refreshing the export view after import renders new metadata without adding history',async()=>{
 const b=browser('#/export');let renders=0;
 const router=create({window:b.win,beforeLeave:async()=>{},render:async()=>{renders++;},onError:e=>{throw e;}});
 await router.start();await router.navigate({page:'files'},{refresh:true});assert.equal(renders,2);assert.equal(b.entries.length,1);
});

test('navigation leaves imported file contents and storage untouched through ZIP export and reload',async()=>{
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const store=new ProjectStore(storage,{},'4.7.1');
 const files={...store.snapshot().files,'workspace/reports/M04.md':'Original analysis','workspace/reports/M04_task01.md':'Original answer','workspace/models/M04_context.json':'{"kind":"dfd","nodes":[],"edges":[]}','workspace/models/M04_context.svg':'<svg/>','workspace/attachments/example.bin':{encoding:'base64',data:'AAH/'}};
 store.import({...store.snapshot(),files});const before=storage.getItem(KEY),b=browser('#/export');
 const router=create({window:b.win,beforeLeave:async()=>{},render:async()=>store.state(require('../course_app/curriculum.json')),onError:e=>{throw e;}});
 await router.start();for(const route of [{page:'task',module:'M04',tab:'report'},{page:'models'},{page:'files'}])await router.navigate(route);
 b.back();await router.idle();b.forward();await router.idle();
 assert.equal(storage.getItem(KEY),before);
 const resumed=new ProjectStore(storage,{},'4.7.1');assert.deepEqual(parseProjectFile(projectZip(resumed.snapshot()),'project.zip').files,files);
});

function app(){
 const b=browser('#/start'),fields={},handlers={};
 const course=require('../course_app/curriculum.json');
 for(const id of ['modelName','modelEditor','modelKind','simModule','simInput','engineSelect','moduleSelect','pageTitle','brief','context','moduleTask','sessionStrip','teamId','currentSession','saveStatus'])fields[id]={value:id,addEventListener:(event,fn)=>{handlers[id+':'+event]=fn;}};
 fields.moduleSelect.value='M01';
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 const store=new ProjectStore(storage,{},'4.7.3');
 const calls=[],errors=[];
 const ctx=vm.createContext({window:b.win,QuickBiteRouter:{create},$:id=>fields[id],COURSE:course,PROJECT:{team_id:'QA',current_session:1},workflowHtml:()=>'',esc:s=>String(s),renderOverview:()=>{},updateChips:()=>{},moduleForSession:n=>course.modules.find(m=>m.sessions.includes(Number(n))),loadedModuleCode:'M01',contextDirty:false,showModuleTab:tab=>calls.push('tab:'+tab),loadModule:async code=>{ctx.loadedModuleCode=code;const m=course.modules.find(m=>m.code===code);fields.moduleTask.innerHTML=ctx.taskHtml(m);ctx.renderSessionStrip(m);fields.modelName.value='new_default';fields.simModule.value=code;ctx.showModuleTab('theory');},loadSavedModel:async()=>{},loadSavedRun:()=>{},loadStarter:()=>{},flushEditors:async()=>{},projectBriefHtml:()=>'',contextFormHtml:()=>'',oldShow:page=>calls.push('page:'+page),refreshSavedEvidence:()=>{},updateLearningAccess:()=>{},showError:e=>errors.push(e.message)});
 const base=fs.readFileSync(require.resolve('../course_app/assets/app.js'),'utf8');
 vm.runInContext(base.slice(base.indexOf('function taskHtml('),base.indexOf('async function boot(')),ctx);
 vm.runInContext(base.slice(base.indexOf('async function saveProjectMeta('),base.indexOf('const THEORY_MAP')),ctx);
 ctx.api=async(url,opt)=>{if(url==='/api/project'){store.saveProject(JSON.parse(opt.body));return {project:store.project()};}return store.state(course);};
 vm.runInContext(fs.readFileSync(require.resolve('../web_src/browser-navigation.js'),'utf8'),ctx);
 ctx.loadModule('M01');
 return {ctx,b,fields,handlers,calls,errors,store,storage};
}

test('module navigation preserves model source/name and simulator drafts; task links select the right tab',async()=>{
 const a=app();await a.ctx.installNavigation();
 a.fields.modelName.value='M03_my_work';a.fields.modelEditor.value='unsaved model';a.fields.simModule.value='M03';a.fields.simInput.value='unsaved inputs';
 a.handlers['modelEditor:input']();a.handlers['simInput:input']();
 await a.ctx.openModule('M04');assert.equal(a.fields.modelName.value,'M03_my_work');assert.equal(a.fields.modelEditor.value,'unsaved model');assert.equal(a.fields.simModule.value,'M03');assert.equal(a.fields.simInput.value,'unsaved inputs');
 await a.ctx.setSession(8);await a.b.win.quickbiteNavigation.idle();
 assert.equal(a.fields.modelName.value,'M03_my_work');assert.equal(a.fields.modelEditor.value,'unsaved model');assert.equal(a.fields.simModule.value,'M03');assert.equal(a.fields.simInput.value,'unsaved inputs');
 await a.ctx.goToTask('M04.02');assert.equal(a.b.win.location.hash,'#/modules/M04/tasks/02');assert.equal(a.calls.at(-1),'tab:taskwork');
});

test('unsaved stakeholder/scope form blocks history navigation and keeps the form visible',async()=>{
 const a=app();await a.ctx.installNavigation();await a.ctx.show('context');a.ctx.contextDirty=true;
 a.b.external('#/models');await a.b.win.quickbiteNavigation.idle();
 assert.equal(a.b.win.location.hash,'#/project');assert.equal(a.calls.filter(x=>x.startsWith('page:')).at(-1),'page:context');assert.match(a.errors[0],/Save your stakeholder/);
});

function assertSession(a,m,session){
 const plan=m.session_plan.find(s=>s.session===session),html=a.fields.moduleTask.innerHTML;
 assert.match(html,new RegExp('Today · Session '+session));
 assert.match(html,new RegExp('<b>Complete today:</b> Tasks? '+plan.task_numbers.join(', ')+' below'));
 const highlighted=[...html.matchAll(/id="task_[^"]+_(\d+)" class="task-spec task-today"/g)].map(x=>Number(x[1]));
 assert.deepEqual(highlighted,plan.task_numbers,m.code+' Session '+session);
 assert.match(a.fields.sessionStrip.innerHTML,new RegExp('session-card current" onclick="setSession\\('+session+'\\)"'));
}

test('all 20 session recommendations refresh within a module, including same-route clicks and return navigation',async()=>{
 const a=app();await a.ctx.installNavigation();
 for(const m of a.ctx.COURSE.modules){
  a.ctx.PROJECT.current_session=m.sessions[0];await a.ctx.openModule(m.code);await a.ctx.showModuleTab('taskwork');
  assertSession(a,m,m.sessions[0]);
  await a.ctx.setSession(m.sessions[1]);await a.b.win.quickbiteNavigation.idle();await a.ctx.showModuleTab('taskwork');
  assertSession(a,m,m.sessions[1]);
  // The next change stays on the same Concepts URL: it must still render.
  await a.ctx.openModule(m.code);await a.ctx.setSession(m.sessions[0]);await a.b.win.quickbiteNavigation.idle();
  assertSession(a,m,m.sessions[0]);
  await a.ctx.show('overview');a.fields.teamId.value='QA';a.fields.currentSession.value=String(m.sessions[1]);
  await a.ctx.saveProjectMeta();await a.ctx.openModule(m.code);await a.ctx.showModuleTab('taskwork');
  assertSession(a,m,m.sessions[1]);
  a.b.back();await a.b.win.quickbiteNavigation.idle();assertSession(a,m,m.sessions[1]);
 }
 assert.deepEqual(a.errors,[]);
});

test('M05 curriculum assigns security Task 6 only to Session 10; adjacent sessions cover distinct required work',()=>{
 const course=require('../course_app/curriculum.json');
 assert.deepEqual(course.modules.find(m=>m.code==='M05').session_plan.map(s=>s.task_numbers),[[1,4],[6]]);
 for(const m of course.modules){
  assert.deepEqual(m.session_plan.map(s=>s.session),m.sessions);
  const assigned=m.session_plan.flatMap(s=>s.task_numbers);
  assert.equal(new Set(assigned).size,assigned.length,m.code+' duplicates session work');
  assert.deepEqual([...assigned].sort((a,b)=>a-b),m.task_specs.filter(t=>!t.optional).map(t=>t.task),m.code+' required coverage');
 }
});


test('switching M05 sessions preserves student files and task IDs through ZIP export/import and reload',async()=>{
 const a=app();
 const work={
  'workspace/reports/M05.md':'Original dependability and security report',
  'workspace/reports/M05_task01.md':'Original failure analysis',
  'workspace/reports/M05_task04.md':'Original recovery strategy',
  'workspace/reports/M05_task06.md':'Original threat controls',
  'workspace/models/m05_existing.json':'{"kind":"deployment","nodes":[],"edges":[]}',
  'workspace/attachments/evidence.bin':{encoding:'base64',data:'AAH/'}
 };
 for(const [path,data] of Object.entries(work))a.store.save(path,data);
 await a.ctx.installNavigation();await a.ctx.setSession(9);await a.b.win.quickbiteNavigation.idle();await a.ctx.showModuleTab('taskwork');
 const original=a.store.snapshot().files;
 for(const session of [10,9,10]){await a.ctx.setSession(session);await a.b.win.quickbiteNavigation.idle();await a.ctx.goToTask('M05.06');}
 const resumed=new ProjectStore(a.storage,{},'4.7.3');
 const files=parseProjectFile(projectZip(resumed.snapshot()),'project.zip').files;
 for(const [path,data] of Object.entries(original))if(path!=='workspace/project.json')assert.deepEqual(files[path],data,path);
 assert.equal(JSON.parse(files['workspace/project.json']).current_session,10);
 const imported=new Map();
 const target=new ProjectStore({getItem:k=>imported.get(k)||null,setItem:(k,v)=>imported.set(k,v)},{},'4.7.3');
 target.import(parseProjectFile(projectZip(resumed.snapshot()),'project.zip'));
 for(const [path,data] of Object.entries(work))assert.deepEqual(target.get(path),data,path);
 assert.deepEqual(a.errors,[]);
});
