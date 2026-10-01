let browserCourse=null,browserStore=null;
class PythonWorker{
 constructor(){
  this.worker=new Worker('/assets/python-worker.js');this.pending=new Map();this.sequence=0;
  this.ready=new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{this.stop();reject(Error('Python could not load within 90 seconds. Check your internet connection and retry.'));},90000);
   this.worker.onmessage=e=>{const d=e.data;if(d.ready){clearTimeout(timer);resolve();}else if(d.startup_error){clearTimeout(timer);reject(Error(d.startup_error));}else{const p=this.pending.get(d.id);if(p){this.pending.delete(d.id);d.error?p.reject(Error(d.error)):p.resolve(d.result);}}};
   this.worker.onerror=e=>{clearTimeout(timer);reject(Error(e.message||'Python worker failed.'));for(const p of this.pending.values())p.reject(Error('Python worker failed.'));};
  });
 }
 async call(operation,payload,limit=20000){
  $('saveStatus').textContent='Loading browser Python…';await this.ready;
  $('saveStatus').textContent=operation==='tests'?'Running your Python tests…':'Python ready · computing…';
  const id=++this.sequence;
  try{return await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{this.pending.delete(id);reject(Error('Python operation stopped after '+limit/1000+' seconds. Your saved project is unchanged.'));this.stop();},limit);
   this.pending.set(id,{resolve:x=>{clearTimeout(timer);resolve(x);},reject:e=>{clearTimeout(timer);reject(e);}});
   this.worker.postMessage({id,operation,payload});
  });}finally{$('saveStatus').textContent='Saved in this browser · export before leaving';}
 }
 stop(){this.worker.terminate();for(const p of this.pending.values())p.reject(Error('Python worker stopped.'));this.pending.clear();}
}
// Engine/model workers contain only trusted course code; student tests always get a fresh worker.
let engineWorker=null;
async function compute(operation,payload){
 if(!engineWorker)engineWorker=new PythonWorker();
 try{return await engineWorker.call(operation,payload);}catch(e){engineWorker.stop();engineWorker=null;throw e;}
}
async function browserApi(url,opt={}){
 const d=opt.body?JSON.parse(opt.body):{},method=opt.method||'GET';
 if(url==='/api/course'){
  const r=await fetch('/course.json',{cache:'no-cache'});if(!r.ok)throw Error('Could not load course.');browserCourse=await r.json();
  browserStore=new QuickBiteStore.ProjectStore(localStorage,browserCourse.templates,browserCourse.version.version);
  return {...browserCourse,token:'browser-local',saved_state:browserStore.state(browserCourse.course)};
 }
 if(!browserStore)throw Error('Project is not ready.');
 if(url==='/api/state')return browserStore.state(browserCourse.course);
 if(url==='/api/project')return method==='POST'?{saved:true,project:browserStore.saveProject(d)}:browserStore.project();
 if(url.startsWith('/api/code/')){
  const key=url.split('/').at(-1),paths={policies:'workspace/student_code/policies.py',student_tests:'workspace/tests/test_student.py'};
  if(key==='supplied_tests')return {key,text:browserCourse.supplied_tests,read_only:true};
  if(!paths[key])throw Error('Unknown file.');return {key,text:browserStore.get(paths[key])||'',read_only:false};
 }
 if(url==='/api/report'){
  if(!browserCourse.course.modules.some(m=>m.code===d.module)||typeof d.text!=='string')throw Error('Invalid report.');
  const file='workspace/reports/'+d.module+'.md';browserStore.save(file,d.text);return {saved:true,file};
 }
 if(url==='/api/check'){
  const m=browserCourse.course.modules.find(m=>m.code===d.module);if(!m)throw Error('Unknown module.');
  const text=d.text||'',sections=m.report_sections||[];
  return {required_sections:sections,missing_headings:sections.filter(x=>!text.split('\n').includes('## '+x)),unfinished_placeholders:(text.match(/\[Write your answer here\.\]/g)||[]).length,word_count:text.trim()?text.trim().split(/\s+/).length:0,note:'Structure only; academic correctness requires review.'};
 }
 if(url==='/api/simulate'||url==='/api/save-run'){
  const result=await compute('simulate',d),payload={engine:d.engine,inputs:d.inputs,result};
  if(url==='/api/save-run'){
   if(!browserCourse.course.modules.some(m=>m.code===d.module))throw Error('Unknown module.');
   const name=d.module+'_'+d.engine+'_'+new Date().toISOString().replace(/[:.]/g,'-')+'_'+crypto.randomUUID().slice(0,8)+'.json';
   browserStore.save('workspace/runs/'+name,JSON.stringify(payload,null,2));payload.saved_file=name;
  }return payload;
 }
 if(url==='/api/model-preview'||url==='/api/model-save'){
  const result=await compute('render',d);
  if(url==='/api/model-save'){
   if(typeof d.name!=='string'||!/^[A-Za-z0-9_-]{1,60}$/.test(d.name))throw Error('Model name: letters, numbers, _ or -.');
   const next=browserStore.snapshot();next.files['workspace/models/'+d.name+'.json']=JSON.stringify(d.model,null,2);next.files['workspace/models/'+d.name+'.svg']=result.svg;browserStore.persist(next);
   return {...result,saved:true,json:'workspace/models/'+d.name+'.json',svg_file:'workspace/models/'+d.name+'.svg'};
  }return result;
 }
 if(url==='/api/code'){
  const path={policies:'workspace/student_code/policies.py',student_tests:'workspace/tests/test_student.py'}[d.key];
  if(!path||typeof d.text!=='string'||d.text.length>200000)throw Error('Invalid code save.');browserStore.save(path,d.text);return {saved:true,file:path};
 }
 if(url==='/api/tests'){
  if(!['student','m10','all'].includes(d.suite))throw Error('Unknown test suite.');
  const worker=new PythonWorker();let result;
  try{result=await worker.call('tests',{suite:d.suite,files:Object.fromEntries(Object.entries(browserStore.snapshot().files).filter(([path,text])=>typeof text==='string'&&/^(workspace\/student_code\/|workspace\/tests\/).*\.py$/.test(path)&&!path.endsWith('/test_m10.py'))),supplied_tests:browserCourse.supplied_tests});}
  finally{worker.stop();}
  const file='workspace/logs/tests_'+d.suite+'.txt';browserStore.save(file,result.log);return {...result,file};
 }
 throw Error('Unsupported browser action: '+url);
}
