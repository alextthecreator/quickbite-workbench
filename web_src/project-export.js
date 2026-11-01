/* Build downloads in memory. Export must not depend on a successful browser save. */
(function(root){
 'use strict';
 const S=typeof module!=='undefined'&&module.exports?require('./project-store.js'):root.QuickBiteStore;
 const R=typeof module!=='undefined'&&module.exports?require('./report-sync.js'):root.QuickBiteReports;
 const L=typeof module!=='undefined'&&module.exports?require('./learning-state.js'):root.QuickBiteLearning;
 const RECOVERY_ID='quickbite-emergency-backup';
 function prepare(snapshot,course,drafts={},identity=null){
  const project=JSON.parse(JSON.stringify(snapshot)),warnings=[];
  const apply=fn=>{const files={...project.files};fn(files);project.files=files;};
  const keep=(name,text,error)=>{R.remember(project.files,name,text);warnings.push(error.message||String(error));};
  if(drafts.report){try{apply(files=>R.saveReport(files,course,drafts.report.module,drafts.report.text));}catch(e){keep('unsaved_report_'+drafts.report.module,drafts.report.text,e);}}
  for(const [id,text] of Object.entries(drafts.taskAnswers||{})){
   try{apply(files=>R.saveTask(files,course,id,text));}catch(e){keep('unsaved_answer_'+id,text,e);}
  }
  if(drafts.context){try{const files={...project.files,[L.CONTEXT]:JSON.stringify(drafts.context)};L.context(files);project.files[L.CONTEXT]=files[L.CONTEXT];}catch(e){keep('unsaved_project_form',JSON.stringify(drafts.context,null,2),e);}}
  if(drafts.code){const p={policies:'workspace/student_code/policies.py',student_tests:'workspace/tests/test_student.py'}[drafts.code.key];if(p)project.files[p]=drafts.code.text;}
  if(drafts.diagram){
   const {name,xml}=drafts.diagram;
   if(/^[A-Za-z0-9_-]{1,60}$/.test(name)&&typeof xml==='string'&&/<(?:mxfile|mxGraphModel)\b/.test(xml)&&!/<!(?:DOCTYPE|ENTITY)/i.test(xml)){
    const p='workspace/models/'+name;
    if(project.files[p+'.drawio']!==xml){delete project.files[p+'.svg'];project.files[p+'.drawio']=xml;warnings.push('The editable diagram draft is included. Open it and Save to project to regenerate its SVG preview.');}
   }else keep('unsaved_diagram',JSON.stringify(drafts.diagram,null,2),Error('Diagram draft retained as an attachment for recovery.'));
  }
  if(drafts.editors)project.files['workspace/attachments/QuickBite_editor_drafts.json']=JSON.stringify(drafts.editors,null,2);
  R.reconcile(project.files,course);
  if(identity){try{project.files['workspace/project.json']=JSON.stringify(S.meta({...JSON.parse(project.files['workspace/project.json']||'{}'),...identity}),null,2);}catch(e){keep('unsaved_project_identity',JSON.stringify(identity),e);}}
  project.exported_at=new Date().toISOString();
  const meta=S.meta(JSON.parse(project.files['workspace/project.json']||'{}'));
  project.files['workspace/project.json']=JSON.stringify({...meta,last_export_session:meta.current_session,last_export_utc:project.exported_at},null,2);
  return {project:S.validate(project),warnings};
 }
 function recover(bundle,course){
  if(bundle?.app_id!==RECOVERY_ID||bundle.schema_version!==1)throw Error('Unsupported emergency backup.');
  let snapshot=bundle.saved_project;
  if(!snapshot&&bundle.raw_browser_project){try{snapshot=JSON.parse(bundle.raw_browser_project);}catch{throw Error('This backup preserves corrupt browser data. Keep the file and ask your instructor for help recovering it.');}}
  if(!snapshot)throw Error('No saved project found in this emergency backup. Keep the file for recovery.');
  return prepare(S.validate(snapshot),course,bundle.drafts||{},bundle.identity||null).project;
 }
 root.QuickBiteExport={prepare,recover,RECOVERY_ID};
 if(typeof module!=='undefined'&&module.exports)module.exports=root.QuickBiteExport;
})(typeof globalThis!=='undefined'?globalThis:this);
