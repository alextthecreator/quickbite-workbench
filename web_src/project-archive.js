(function(root){
const fflate=typeof module!=='undefined'&&module.exports?require('./vendor/fflate.js'):root.fflate;
const QuickBiteStore=typeof module!=='undefined'&&module.exports?require('./project-store.js'):root.QuickBiteStore;
function bytesFor(value){return typeof value==='string'?fflate.strToU8(value):Uint8Array.from(atob(value.data),x=>x.charCodeAt(0));}
function guideMarkdown(guide){
 const c=guide.course,s=c.scenario,lines=['# QuickBite course guide','',`Course version: ${guide.version}`,`Website: ${guide.website}`,'','This is a read-only copy of the instructions at export time. Your answers are in workspace/. The website is the current source of truth.',''];
 for(const key of ['company_profile','process_context','in_scope','out_of_scope','open_decisions','data_rules','workflow_rules','reporting_rules','lecture_mapping']){lines.push('## '+key.replaceAll('_',' '),'',...(s[key]||[]).map(x=>'- '+x),'');}
 lines.push('## Roles','',...(s.role_context||[]).map(x=>'- '+x.role+': '+x.context),'');
 for(const m of c.modules){
  lines.push('# '+m.code+' — '+m.title,'','## Project guidance','',...(m.theory_cards||[]).flatMap(x=>['### '+x.title,'',x.body,'']),'## Module deliverables','',...m.deliverables.map(x=>'- '+x),'');
  for(const t of m.task_specs)lines.push('### Task '+t.task,'',t.instruction,'','**Deliverable:** '+t.deliverable,'','**Where to save:** '+t.save_to,'','**Minimum requirements:**','',...t.minimum_requirements.map(x=>'- '+x),'','**Complete when:** '+t.complete_when,'');
 }
 return lines.join('\n');
}
function projectZip(snapshot,guide=null){
 const files={'quickbite-project.json':fflate.strToU8(JSON.stringify(snapshot,null,2))};
 for(const [path,value] of Object.entries(snapshot.files))files[path]=bytesFor(value);
 if(guide){files['course-guide.json']=fflate.strToU8(JSON.stringify(guide,null,2));files['course-guide.md']=fflate.strToU8(guideMarkdown(guide));}
 files['READ_ME.txt']=fflate.strToU8('QuickBite online project\nWebsite: https://quickbite-workbench.vercel.app/\nChoose Save & Export, then Import project and select this ZIP.\nNo Python installation or extracted server is needed.\nworkspace/ contains student work. course-guide.md and .json, when present, preserve the read-only brief and assignment instructions at export time.\n');
 return fflate.zipSync(files,{level:6});
}
function binaryRecord(bytes){let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return {encoding:'base64',data:btoa(s)};}
function parseProjectFile(bytes,name,templates={}){
 if(bytes.length>12_000_000)throw Error('File is too large (12 MB maximum).');
 if(name.toLowerCase().endsWith('.json'))return QuickBiteStore.validate(JSON.parse(new TextDecoder().decode(bytes)));
 let unpacked=0;
 const entries=fflate.unzipSync(bytes,{filter:entry=>{unpacked+=entry.originalSize;if(unpacked>20_000_000)throw Error('Expanded ZIP is too large.');return !entry.name.endsWith('/');}});
 const manifest=Object.keys(entries).find(x=>x==='quickbite-project.json'||/^[^/]+\/quickbite-project.json$/.test(x));
 if(manifest)return QuickBiteStore.validate(JSON.parse(fflate.strFromU8(entries[manifest])));
 const files={};
 for(const [raw,value] of Object.entries(entries)){
  const parts=raw.split('/');if(parts.includes('..')||raw.startsWith('/')||raw.includes('\\'))throw Error('Unsafe ZIP path.');
  const index=parts.indexOf('workspace');let path;
  if(index>=0)path=parts.slice(index).join('/');
  else {const student=parts.indexOf('student_code'),tests=parts.indexOf('tests');if(student>=0)path='workspace/'+parts.slice(student).join('/');else if(tests>=0)path='workspace/'+parts.slice(tests).join('/');}
  if(!path||path==='workspace/tests/test_m10.py')continue;
  files[path]=path.startsWith('workspace/attachments/')?binaryRecord(value):fflate.strFromU8(value);
 }
 if(!Object.keys(files).length)throw Error('No QuickBite student workspace found in this ZIP.');
 // Old starters may not contain package markers or metadata.
 for(const [path,text] of Object.entries(templates))if(!(path in files))files[path]=text;
 return QuickBiteStore.validate({app_id:QuickBiteStore.APP_ID,schema_version:1,course_version:'legacy-import',files});
}

root.QuickBiteArchive={projectZip,parseProjectFile,guideMarkdown};
if(typeof module!=='undefined'&&module.exports)module.exports=root.QuickBiteArchive;
})(typeof globalThis!=='undefined'?globalThis:this);
