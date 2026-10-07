(function(root){
'use strict';
const CONTEXT='workspace/project-context.json',PROGRESS='workspace/task-progress.json';
const empty=()=>({schema_version:1,people:{rows:[],conflict:''},scope:{in_scope:[],out_of_scope:[],rationale:''}});
function context(files){if(!files[CONTEXT])return empty();const c=JSON.parse(files[CONTEXT]);if(c.schema_version!==1||!Array.isArray(c.people?.rows)||!Array.isArray(c.scope?.in_scope)||!Array.isArray(c.scope?.out_of_scope))throw Error('Invalid student project context.');if(typeof c.people.conflict!=='string'||typeof c.scope.rationale!=='string'||c.people.rows.length>100||c.people.rows.some(r=>!r||['name','type','need','concern','question'].some(k=>typeof r[k]!=='string'))||[...c.scope.in_scope,...c.scope.out_of_scope].some(x=>typeof x!=='string'))throw Error('Invalid student project context fields.');return c;}
function section(text,heading){const lines=(text||'').split('\n');let active=false,result=[];for(const line of lines){if(line.startsWith('## ')){if(active)break;active=line.slice(3).trim()===heading;continue;}if(active)result.push(line);}return result.join('\n').trim();}
function meaningful(text){return !!text?.trim()&&!text.includes('[Write your answer here.]');}
function fingerprint(value){let h=2166136261;for(const ch of JSON.stringify(value)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16);}
function taskMap(course){return Object.fromEntries(course.modules.flatMap(m=>m.task_specs.map(t=>[m.code+'.'+String(t.task).padStart(2,'0'),{...t,module:m.code}])));}
function legacyAnswer(files,task){const text=section(files['workspace/reports/'+task.module+'.md'],task.report_section);return text.includes('<!-- TASK ')||text.includes('[Write your answer here.]')?'':text;}
function evidence(task,files){const id=task.module+'.'+String(task.task).padStart(2,'0');const report=task.context_output?'':files['workspace/reports/'+id.replace('.','_task')+'.md']??legacyAnswer(files,task);return {report,files:(task.evidence||[]).flatMap(e=>Object.entries(files).filter(([path,value])=>path.toLowerCase().startsWith(e.prefix.toLowerCase())&&(!e.contains||path.includes(e.contains))&&(!e.extension||path.endsWith(e.extension))).map(([path,value])=>[path,value])),structured:task.context_output?context(files)[task.context_output]:null};}
function minimum(task,files){const e=evidence(task,files),issues=[];
 if(task.context_output==='people'){const p=e.structured;if(p.rows.length<5||p.rows.some(r=>!['name','type','need','concern','question'].every(k=>meaningful(r[k]))))issues.push('Save at least 5 fully described stakeholders in Your project.');if(!meaningful(p.conflict))issues.push('Describe one stakeholder conflict.');}
 else if(task.context_output==='scope'){const s=e.structured;if(s.in_scope.length<4||s.out_of_scope.length<3||!meaningful(s.rationale))issues.push('Save at least 4 in-scope entries, 3 team exclusions and a boundary rationale in Your project.');}
 else if(!meaningful(e.report))issues.push('Write and Save task answer on this card; it will appear in '+task.module+' Report → '+task.report_section+'.');
 for(const req of task.evidence||[]){const count=e.files.filter(([path])=>path.toLowerCase().startsWith(req.prefix.toLowerCase())&&(!req.contains||path.includes(req.contains))&&(!req.extension||path.endsWith(req.extension))).length;if(count<req.count)issues.push('Save '+req.count+' required evidence file(s): '+req.label+'.');}
 return issues;
}
// Structured answers are authoritative; mirror them into managed report blocks.
function syncContextReports(files){
 if(!files[CONTEXT])return;
 const c=context(files),people=c.people,scope=c.scope;
 const answers=[['M01.03','Stakeholders & Conflicts',people.rows.length||people.conflict?people.rows.map((r,i)=>`#### Stakeholder ${i+1}: ${r.name}\nType: ${r.type}\nNeed: ${r.need}\nConcern: ${r.concern}\nOpen question: ${r.question}`).join('\n\n')+'\n\nConflict between stakeholder needs: '+people.conflict:''],['M01.04','Scope & Business Objectives',scope.in_scope.length||scope.out_of_scope.length||scope.rationale?'In scope:\n'+scope.in_scope.map(x=>'- '+x).join('\n')+'\n\nOut of scope:\n'+scope.out_of_scope.map(x=>'- '+x).join('\n')+'\n\nBoundary and rationale: '+scope.rationale:'']];
 let report=files['workspace/reports/M01.md']||'# M01 QuickBite report\n';
 for(const [id,heading,text] of answers){
  const start='<!-- TASK '+id+' -->',end='<!-- END TASK '+id+' -->';
  const a=report.indexOf(start),b=report.indexOf(end,a);
  if(!text&&a<0)continue;
  files['workspace/reports/'+id.replace('.','_task')+'.md']=text;
  if(a>=0&&b>=a){report=report.slice(0,a)+(text?[start,'### Task '+id,text,end].join('\n'):'')+report.slice(b+end.length);continue;}
  if(!text)continue;
  const header='## '+heading;if(!report.split('\n').includes(header))report+='\n\n'+header+'\n';
  const lines=report.split('\n'),at=lines.indexOf(header)+1;
  lines.splice(at,0,start,'### Task '+id,text,end,'');report=lines.join('\n');
 }
 if(answers.some(x=>x[2])||files['workspace/reports/M01.md'])files['workspace/reports/M01.md']=report;
}
function state(course,files){const tasks=taskMap(course),records=files[PROGRESS]?JSON.parse(files[PROGRESS]):{},result={},visiting=new Set();
 function check(id){if(result[id])return result[id];if(!tasks[id]||visiting.has(id))throw Error('Invalid task dependency: '+id);visiting.add(id);const t=tasks[id],parents=(t.prerequisites||[]).map(p=>[p,check(p)]),missing=parents.filter(([p,s])=>s.status!=='complete').map(([p])=>p);const signature=fingerprint({evidence:evidence(t,files),parents:parents.map(([p,s])=>[p,s.signature])});const issues=minimum(t,files),r=records[id];const status=course.learning_mode==='guided'?(!issues.length?'complete':'ready'):missing.length?'blocked':r&&r.signature===signature&&!issues.length?'complete':r?'needs_review':'ready';visiting.delete(id);return result[id]={status,missing,issues,signature,reviewed_at:r?.reviewed_at||null};}
 for(const id of Object.keys(tasks))check(id);return result;
}
function review(course,files,id){const s=state(course,files)[id];if(!s)throw Error('Unknown task.');if(s.missing.length)throw Error('Complete prerequisites first: '+s.missing.join(', '));if(s.issues.length)throw Error(s.issues.join(' '));const records=files[PROGRESS]?JSON.parse(files[PROGRESS]):{};return {...records,[id]:{signature:s.signature,reviewed_at:new Date().toISOString()}};}
root.QuickBiteLearning={CONTEXT,PROGRESS,empty,context,syncContextReports,section,meaningful,taskMap,legacyAnswer,evidence,minimum,state,review};
if(typeof module!=='undefined'&&module.exports)module.exports=root.QuickBiteLearning;
})(typeof globalThis!=='undefined'?globalThis:this);
