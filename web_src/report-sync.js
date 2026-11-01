/* Task files and the managed blocks of a report are two views of one answer. */
(function(root){
 'use strict';
 const L=typeof module!=='undefined'&&module.exports?require('./learning-state.js'):root.QuickBiteLearning;
 const pathFor=id=>'workspace/reports/'+id.replace('.','_task')+'.md';
 const idFor=(code,t)=>code+'.'+String(t.task).padStart(2,'0');
 function block(id,text){return '<!-- TASK '+id+' -->\n### Task '+id+'\n'+text+'\n<!-- END TASK '+id+' -->';}
 function blocks(report,code){
  const result=new Map(),starts=[...report.matchAll(/<!-- TASK (M\d{2}\.\d{2}) -->/g)],ends=[...report.matchAll(/<!-- END TASK (M\d{2}\.\d{2}) -->/g)];
  if(starts.length!==ends.length)throw Error('Keep the TASK / END TASK markers when editing a report. Your draft is still in the editor; use Emergency backup if needed.');
  for(const start of starts){
   const id=start[1],end='<!-- END TASK '+id+' -->',at=report.indexOf(end,start.index+start[0].length);
   if(!id.startsWith(code+'.')||result.has(id)||at<0)throw Error('Duplicate or invalid report task markers. Keep each answer inside its own TASK block.');
   let text=report.slice(start.index+start[0].length,at);
   if(text.includes('<!-- TASK ')||text.includes('<!-- END TASK '))throw Error('Report task blocks cannot overlap.');
   if(text.startsWith('\n'))text=text.slice(1);
   const heading='### Task '+id+'\n';if(text.startsWith(heading))text=text.slice(heading.length);
   if(text.endsWith('\n'))text=text.slice(0,-1);
   result.set(id,{text,start:start.index,end:at+end.length});
  }
  for(const e of ends)if(!result.has(e[1]))throw Error('Unmatched END TASK marker.');
  return result;
 }
 function put(report,id,heading,text){
  const existing=blocks(report,id.slice(0,3)).get(id),value=block(id,text);
  if(existing)return report.slice(0,existing.start)+value+report.slice(existing.end);
  const lines=report.split('\n'),at=lines.indexOf('## '+heading);
  if(at<0)return report+'\n\n## '+heading+'\n'+value+'\n';
  let end=at+1;while(end<lines.length&&!lines[end].startsWith('## '))end++;
  // Replace only an untouched placeholder. Other prose remains additional report notes.
  if(lines.slice(at+1,end).join('\n').trim()==='[Write your answer here.]')lines.splice(at+1,end-at-1,value,'');
  else lines.splice(at+1,0,value,'');
  return lines.join('\n');
 }
 function remember(files,name,text){
  const base='workspace/attachments/'+name+'_'+L.fingerprint(text);let path=base+'.txt',index=2;
  while(path in files&&files[path]!==text)path=base+'_'+index+++'.txt';
  if(!(path in files))files[path]=text;
  return path;
 }
 function parseStructured(part,text){
  if(!text.trim())return part==='people'?{rows:[],conflict:''}:{in_scope:[],out_of_scope:[],rationale:''};
  if(part==='scope'){
   const match=/^In scope:\n([\s\S]*?)\n\nOut of scope:\n([\s\S]*?)\n\nBoundary and rationale: ([\s\S]*)$/.exec(text);
   if(!match)throw Error('Keep the In scope / Out of scope / Boundary labels, or edit these answers in Your project.');
   const items=s=>s?s.split('\n').map(line=>{if(!line.startsWith('- '))throw Error('Scope entries use one "- " item per line.');return line.slice(2);}):[];
   return {in_scope:items(match[1]),out_of_scope:items(match[2]),rationale:match[3]};
  }
  const at=text.lastIndexOf('\n\nConflict between stakeholder needs: ');
  if(at<0)throw Error('Keep stakeholder field labels, or edit these answers in Your project.');
  const rows=[],body=text.slice(0,at),pattern=/#### Stakeholder \d+: ([\s\S]*?)\nType: ([\s\S]*?)\nNeed: ([\s\S]*?)\nConcern: ([\s\S]*?)\nOpen question: ([\s\S]*?)(?=\n\n#### Stakeholder \d+: |$)/g;
  let match,consumed='';while((match=pattern.exec(body))){if(match.index!==consumed.length)throw Error('Keep stakeholder field labels, or use Your project.');rows.push(Object.fromEntries(['name','type','need','concern','question'].map((k,i)=>[k,match[i+1]])));consumed=body.slice(0,pattern.lastIndex);if(body.slice(pattern.lastIndex).startsWith('\n\n'))consumed+='\n\n';}
  if(consumed!==body)throw Error('Keep stakeholder field labels, or use Your project.');
  return {rows,conflict:text.slice(at+'\n\nConflict between stakeholder needs: '.length)};
 }
 function reconcile(files,course){
  L.syncContextReports(files);
  if(!course)return files;
  for(const m of course.modules){
   const path='workspace/reports/'+m.code+'.md';let report=files[path]||'# '+m.code+' QuickBite report\n',found=blocks(report,m.code),changed=false;
   for(const t of m.task_specs){
    if(t.context_output)continue;
    const id=idFor(m.code,t),p=pathFor(id),old=found.get(id);
    if(!(p in files)){if(old)files[p]=old.text;else continue;}
    if(old&&old.text!==files[p])remember(files,m.code+'_earlier_report',report);
    const next=put(report,id,t.report_section,files[p]);changed=changed||next!==report;report=next;
   }
   if(changed)files[path]=report;
  }
  return files;
 }
 function migrate(files,course){
  const before={...files};reconcile(files,course);
  const changed=Object.fromEntries(Object.entries(before).filter(([p,v])=>files[p]!==v));
  if(Object.keys(changed).length)remember(files,'QuickBite_original_imported_files',JSON.stringify(changed,null,2));
  return files;
 }
 function saveTask(files,course,id,text){
  const t=L.taskMap(course)[id];if(!t||t.context_output)throw Error('Use Your project for the stakeholder and scope answers.');
  files[pathFor(id)]=text;
  const p='workspace/reports/'+t.module+'.md';
  files[p]=put(files[p]||'# '+t.module+' QuickBite report\n',id,t.report_section,text);
  return reconcile(files,course);
 }
 function saveReport(files,course,code,text){
  const m=course.modules.find(m=>m.code===code);if(!m)throw Error('Unknown module.');
  const found=blocks(text,code),known=L.taskMap(course);
  for(const [id,b] of found){
   const t=known[id];if(!t)throw Error('Unknown task block '+id);
   if(t.context_output){const c=L.context(files);c[t.context_output]=parseStructured(t.context_output,b.text);files[L.CONTEXT]=JSON.stringify(c,null,2);}
   else files[pathFor(id)]=b.text;
  }
  // Do not guess how legacy prose maps to several tasks sharing one heading.
  // Existing task answers whose markers were removed are reinserted, never erased.
  files['workspace/reports/'+code+'.md']=text;
  return reconcile(files,course);
 }
 root.QuickBiteReports={pathFor,idFor,blocks,put,reconcile,migrate,saveTask,saveReport,remember};
 if(typeof module!=='undefined'&&module.exports)module.exports=root.QuickBiteReports;
})(typeof globalThis!=='undefined'?globalThis:this);
