/* Version-independent browser workspace. Course deployments never overwrite it. */
(function(root){
 'use strict';
 const KEY='quickbite.workspace.v1', MAX_BYTES=12_000_000, APP_ID='quickbite-browser-project';
 const learning=typeof module!=='undefined'&&module.exports?require('./learning-state.js'):root.QuickBiteLearning;
 const clone=x=>JSON.parse(JSON.stringify(x));
 const validPath=p=>typeof p==='string'&&!p.includes('\\')&&!p.split('/').some(x=>x==='..'||x==='.'||!x)&&/^workspace\/(reports|models|runs|logs|attachments|student_code|tests)\/[A-Za-z0-9_. -]+$/.test(p)||p==='workspace/project.json'||p==='workspace/EXPORT_MANIFEST.json'||p==='workspace/project-context.json'||p==='workspace/task-progress.json';
 function meta(input={}){
  const m={team_id:'TEAM',current_session:1,last_export_session:0,last_export_utc:null,...input};
  if(typeof m.team_id!=='string'||!/^[A-Za-z0-9_-]{2,24}$/.test(m.team_id))throw Error('Team ID: 2–24 letters, numbers, _ or -.');
  if(!Number.isInteger(m.current_session)||m.current_session<1||m.current_session>20)throw Error('Session must be 1–20.');
  if(!Number.isInteger(m.last_export_session)||m.last_export_session<0||m.last_export_session>20)throw Error('Invalid last exported session.');
  return {team_id:m.team_id,current_session:m.current_session,last_export_session:m.last_export_session,last_export_utc:typeof m.last_export_utc==='string'?m.last_export_utc:null};
 }
 function validate(input){
  if(!input||input.app_id!==APP_ID||input.schema_version!==1||!input.files||Array.isArray(input.files)||typeof input.files!=='object')throw Error('This is not a supported QuickBite project file.');
  const data=clone(input);let total=0;
  if(Object.keys(data.files).length>1500)throw Error('Too many project files.');
  for(const [path,value] of Object.entries(data.files)){
   if(!validPath(path))throw Error('Unsupported project path: '+path);
   if(typeof value!=='string'&&!(value&&value.encoding==='base64'&&typeof value.data==='string'&&/^[A-Za-z0-9+/]*={0,2}$/.test(value.data)))throw Error('Invalid project file: '+path);
   if(typeof value!=='string'&&!path.startsWith('workspace/attachments/'))throw Error('Only attachments may contain binary data.');
   total+=typeof value==='string'?new TextEncoder().encode(value).length:value.data.length;
  }
  if(total>MAX_BYTES)throw Error('Project is too large (12 MB maximum).');
  learning.context(data.files);
  if(data.files[learning.PROGRESS]){const records=JSON.parse(data.files[learning.PROGRESS]);if(!records||Array.isArray(records)||typeof records!=='object'||Object.entries(records).some(([id,r])=>!/^M(?:0[1-9]|10)\.\d{2}$/.test(id)||!r||typeof r.signature!=='string'||typeof r.reviewed_at!=='string'))throw Error('Invalid task review records.');}
  const project=meta(data.files['workspace/project.json']?JSON.parse(data.files['workspace/project.json']):{});
  data.files['workspace/project.json']=JSON.stringify(project,null,2);
  return {app_id:APP_ID,schema_version:1,course_version:typeof data.course_version==='string'?data.course_version:'unknown',exported_at:data.exported_at||null,files:data.files};
 }
 class ProjectStore{
  constructor(storage,templates,version){
   this.storage=storage;this.version=version;const raw=storage.getItem(KEY);
   try{this.data=raw?validate(JSON.parse(raw)):{app_id:APP_ID,schema_version:1,course_version:version,files:{'workspace/project.json':JSON.stringify(meta(),null,2)}};}
   catch(e){throw Error('Saved browser project could not be read. It has not been overwritten. '+e.message);}
   // Seed only a first-time project. Never restore an old template over saved work.
   if(!raw){Object.assign(this.data.files,templates);this.persist(this.data);}
   else {const next=clone(this.data);learning.syncContextReports(next.files);if(JSON.stringify(next.files)!==JSON.stringify(this.data.files))this.persist(next);}
  }
  persist(next){
   const prepared=clone(next);learning.syncContextReports(prepared.files);const checked=validate(prepared);checked.course_version=this.version;
   try{this.storage.setItem(KEY,JSON.stringify(checked));}
   catch(e){throw Error('Browser storage is full or unavailable. Export your project before closing this tab. '+e.message);}
   this.data=checked;return checked;
  }
  get(path){return this.data.files[path];}
  save(path,text){const next=clone(this.data);next.files[path]=text;this.persist(next);}
  project(){return meta(JSON.parse(this.get('workspace/project.json')));}
  saveProject(input){const next=meta({...this.project(),...input});this.save('workspace/project.json',JSON.stringify(next,null,2));return next;}
  snapshot(){return clone(this.data);}
  import(input){return this.persist(validate(input));}
  state(course){
   const files=this.data.files, reports={}, models=[],runs=[],logs=[];
   for(const [p,v] of Object.entries(files)){
    if(p.startsWith('workspace/reports/')&&p.endsWith('.md'))reports[p.split('/').at(-1).slice(0,-3)]=v;
    if(p.startsWith('workspace/models/')&&p.endsWith('.json'))models.push(p.split('/').at(-1).slice(0,-5));
    if(p.startsWith('workspace/runs/'))runs.push(p.split('/').at(-1));
    if(p.startsWith('workspace/logs/'))logs.push(p.split('/').at(-1));
   }
   const module_progress={};
   for(const m of course.modules){const text=reports[m.code]||'';module_progress[m.code]={report:{saved:!!text,unfinished:(text.match(/\[Write your answer here\.\]/g)||[]).length,word_count:text.trim()?text.trim().split(/\s+/).length:0},models:models.filter(x=>x.toLowerCase().startsWith(m.code.toLowerCase())),runs:runs.filter(x=>x.startsWith(m.code+'_')),logs:m.code==='M10'?logs:[]};}
   return {context:learning.context(files),learning:learning.state(course,files),project:this.project(),reports,models:models.sort(),runs:runs.sort(),logs:logs.sort(),module_progress};
  }
 }
 root.QuickBiteStore={ProjectStore,validate,meta,KEY,APP_ID,MAX_BYTES};
 if(typeof module!=='undefined'&&module.exports)module.exports=root.QuickBiteStore;
})(typeof globalThis!=='undefined'?globalThis:this);
