/* Browser-only start/resume, safe project exchange, and clear runtime feedback. */
titles.brief='Project Brief';titles.context='Your project';
function onlineOverview(){
 const m=moduleForSession(PROJECT.current_session);
 return `<div class="hero"><div class="eyebrow" style="color:#aecaFF">QuickBite online · one project</div><h2>Your course. Your browser. Your project file.</h2><p>Work here without accounts or installing Python. Your saved work stays in this browser. Download your project after every class; import that file to continue on any computer.</p></div>
 <div class="resume-grid"><article><div class="eyebrow">Project identity</div><h3>Where are you now?</h3><div class="toolbar"><label>Team ID<input id="teamId" value="${esc(PROJECT.team_id)}"></label><label>Current session<select id="currentSession">${Array.from({length:20},(_,i)=>`<option value="${i+1}" ${i+1===PROJECT.current_session?'selected':''}>Session ${i+1}</option>`).join('')}</select></label><button onclick="saveProjectMeta()">Save project identity</button></div><p><b>Current module:</b> ${esc(m?.code||'')} — ${esc(m?.title||'')}</p><button class="secondary" onclick="openModule('${m?.code||'M01'}')">Continue this module</button></article>
 <article><div class="eyebrow">Start / resume</div><h3>One link for the whole course.</h3><ol class="checklist"><li>First class: set your team ID and start M01.</li><li>Returning: use <b>Save & Export → Import project</b> to open your latest file.</li><li>Work through the task cards, save evidence and review it.</li><li>Before leaving: download the project ZIP. Upload it to Moodle when requested.</li></ol><div class="danger-note">Clearing browser data or using private browsing can remove local work. Your downloaded project is your backup.</div></article></div>
 <div class="cards"><div class="card"><b>No accounts</b>Work is local to this browser. Teams share their downloaded project file.</div><div class="card"><b>Course ${esc(VERSION.version)}</b>Reload this same address to receive course updates. Saved work is kept separately.</div><div class="card"><b>Python in your browser</b>Models, simulators and tests load Python when first used. The first load needs internet.</div></div>
 <article><div class="eyebrow">Project brief</div><h3>${esc(COURSE.course.project)}</h3><button onclick="show('brief')">Read the complete Project Brief</button><p>${esc(COURSE.scenario.problem)}</p><ul class="checklist">${(COURSE.scenario.brief_points||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></article>
 <h3>Course path</h3><div class="course-map">${COURSE.modules.map(m=>`<button class="stage secondary" onclick="openModule('${m.code}')"><span class="num">${m.code} · S${m.sessions.join('–')}</span><b>${esc(m.title)}</b></button>`).join('')}</div>`;
}
function onlineFiles(){
 return `<div class="export-box"><div class="eyebrow">End of every class</div><h2>Download your project. Bring it back next class.</h2><p>The ZIP contains your reports, models, runs, Python code, tests and logs. It also includes a read-only copy of the brief, theory guidance, task instructions and deliverables. Import it on this website to resume, or submit it on Moodle; it is not a local server.</p><div class="toolbar"><label>Team ID<input id="exportTeam" value="${esc(PROJECT.team_id)}"></label><label>Session<select id="exportSession">${Array.from({length:20},(_,i)=>`<option value="${i+1}" ${i+1===PROJECT.current_session?'selected':''}>Session ${i+1}</option>`).join('')}</select></label></div><button onclick="exportProgress()">Download project ZIP (includes drafts)</button> <button class="secondary" onclick="emergencyExport()">Emergency backup</button><p id="exportFeedback" aria-live="polite"></p></div>
 <div class="grid2" style="margin-top:18px"><article><h3>Import project</h3><p>Choose a QuickBite online project ZIP, JSON backup, or an older local workbench export. Review it before replacing your current browser project.</p><label>Project file<input type="file" id="projectImport" accept=".zip,.json" onchange="prepareImport(this)"></label><pre id="importPreview" class="output small" aria-live="polite">No project selected.</pre><button id="applyImport" class="hidden" onclick="applyImport()">Import this project</button><p class="muted">Before replacement, your current project is downloaded as a JSON backup.</p></article>
 <article><h3>Saved in this browser</h3><p>${esc(moduleProgressSummary())}</p><pre id="stateOutput" class="output small"></pre><button class="secondary" onclick="refreshState()">Refresh saved state</button><p class="muted">Always keep your exported file outside this browser. Team members can pass this file to each other.</p></article></div>`;
}
function downloadBlob(blob,name){const link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function captureExportDrafts(){
 const drafts={taskAnswers:Object.fromEntries(taskDrafts)};
 if(reportDirty&&loadedModuleCode)drafts.report={module:loadedModuleCode,text:$('reportEditor').value};
 if(codeDirty&&loadedCodeKey)drafts.code={key:loadedCodeKey,text:$('codeEditor').value};
 if(contextDirty&&contextDraft){collectContextDraft();drafts.context=JSON.parse(JSON.stringify(contextDraft));}
 if(typeof drawioSession!=='undefined'&&drawioSession&&drawioUnsaved())drafts.diagram={name:drawioSession.name,xml:drawioSession.xml};
 drafts.editors={};
 for(const id of ['modelName','modelKind','modelEditor','simModule','engineSelect','simInput'])if($(id))drafts.editors[id]=$(id).value;
 return drafts;
}
function exportIdentity(){
 if($('files')&&!$('files').classList.contains('hidden')&&$('exportTeam'))return {team_id:$('exportTeam').value.trim(),current_session:Number($('exportSession').value)};
 if($('overview')&&!$('overview').classList.contains('hidden')&&$('teamId'))return {team_id:$('teamId').value.trim(),current_session:Number($('currentSession').value)};
 return null;
}
async function captureDiagramForExport(drafts){
 if(typeof readDrawioForExport==='function'&&typeof drawioSession!=='undefined'&&drawioSession){
  try{const name=drawioSession.name,xml=await readDrawioForExport();drafts={...captureExportDrafts(),diagram:{name,xml}};}
  catch(e){drafts.diagram_warning=e.message;}
 }
 return drafts;
}
async function emergencyExport(captured=null){
 try{
  const drafts=captured||await captureDiagramForExport(captureExportDrafts());
  let raw=null;try{raw=localStorage.getItem(QuickBiteStore.KEY);}catch{}
  const bundle={app_id:QuickBiteExport.RECOVERY_ID,schema_version:1,captured_at:new Date().toISOString(),saved_project:browserStore?browserStore.snapshot():null,raw_browser_project:raw,drafts,identity:exportIdentity()};
  downloadBlob(new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'}),'QuickBite_emergency_'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');
  const message='Emergency backup download requested. Keep the JSON; import it here to recover saved work and captured drafts.'+(drafts.diagram_warning?' Diagram editor could not be read: the latest received diagram draft is included; keep the editor open and retry.':'');
  $('saveStatus').textContent=message;if($('exportFeedback'))$('exportFeedback').textContent=message;return true;
 }catch(e){showError(e);return false;}
}
async function onlineExport(){
 let drafts;
 try{
  drafts=await captureDiagramForExport(captureExportDrafts());
  const prepared=QuickBiteExport.prepare(browserStore.snapshot(),COURSE,drafts,exportIdentity()),snapshot=prepared.project;
  const project=QuickBiteStore.meta(JSON.parse(snapshot.files['workspace/project.json']));
  downloadBlob(new Blob([QuickBiteArchive.projectZip(snapshot,{version:VERSION.version,website:'https://quickbite-workbench.vercel.app/',course:COURSE})],{type:'application/zip'}),`QuickBite_${project.team_id}_after_S${String(project.current_session).padStart(2,'0')}_${snapshot.exported_at.slice(0,10)}.zip`);
  const message='Project download requested, including current drafts. Keep the ZIP for next class.'+(prepared.warnings.length?' '+prepared.warnings.join(' '):'')+(drafts.diagram_warning?' The diagram editor could not be read; the latest received draft is included. Keep the editor open and retry.':'');
  $('saveStatus').textContent=message;if($('exportFeedback'))$('exportFeedback').textContent=message;
 }catch(e){const backedUp=await emergencyExport(drafts);showError(Error('Project ZIP could not be created: '+e.message+(backedUp?' An Emergency backup download was requested. Keep that JSON file.':' Emergency backup also failed. Keep this tab open and copy your answers before leaving.')));}
}
let pendingImport=null;
async function prepareImport(input){
 pendingImport=null;$('applyImport').classList.add('hidden');
 try{const file=input.files[0];if(!file)return;pendingImport=QuickBiteArchive.parseProjectFile(new Uint8Array(await file.arrayBuffer()),file.name,browserCourse.templates,COURSE);const project=QuickBiteStore.meta(JSON.parse(pendingImport.files['workspace/project.json']));$('importPreview').textContent=`Ready to import\nTeam: ${project.team_id}\nSession: ${project.current_session}\nFiles: ${Object.keys(pendingImport.files).length}\nCourse saved with: ${pendingImport.course_version}\n\nYour current project will be downloaded as a backup before replacement.`;$('applyImport').classList.remove('hidden');}
 catch(e){$('importPreview').textContent='Import rejected: '+e.message;}
}
async function applyImport(){
 if(!pendingImport)return;
 if(typeof drawioSession!=='undefined'&&drawioSession){showError(Error('Close the visual diagram editor before importing another project.'));return;}
 if(taskDrafts.size||contextDirty){showError(Error('Save your task answers and project data before importing.'));return;}
 try{
  await flushEditors();const previous=browserStore.snapshot();
  downloadBlob(new Blob([JSON.stringify(previous,null,2)],{type:'application/json'}),`QuickBite_${browserStore.project().team_id}_before_import.json`);
  browserStore.import(pendingImport);if(typeof clearTaskTableSession==='function')clearTaskTableSession();pendingImport=null;STATE=browserStore.state(COURSE);PROJECT=STATE.project;updateChips();await loadModule(moduleForSession(PROJECT.current_session)?.code||'M01');await loadCode();renderOverview();await show('files');$('importPreview').textContent='Imported successfully. Your previous browser project was downloaded as a JSON backup.';$('saveStatus').textContent='Project imported · '+PROJECT.team_id+' · Session '+PROJECT.current_session;
 }catch(e){showError(e);}
}
function showError(error){$('saveStatus').textContent=error.message||String(error);let out=$('actionError');if(!out){out=document.createElement('div');out.id='actionError';out.className='danger-note';out.setAttribute('role','alert');document.querySelector('main').prepend(out);}out.textContent=error.message||String(error);const rescue=document.createElement('button');rescue.type='button';rescue.textContent='Emergency backup';rescue.onclick=()=>emergencyExport();out.appendChild(rescue);}
window.addEventListener('unhandledrejection',event=>{event.preventDefault();showError(event.reason);});
let reportDirty=false,codeDirty=false,saveTimer=null,loadedModuleCode=null,loadedCodeKey=null;
async function flushEditors(){
 clearTimeout(saveTimer);
 if(reportDirty){await saveReport();reportDirty=false;}
 if(codeDirty){await saveCode();codeDirty=false;}
}
function installAutosave(){
 for(const [id,kind] of [['reportEditor','report'],['codeEditor','code']])$(id).addEventListener('input',()=>{
  if(kind==='report')reportDirty=true;else codeDirty=true;
  $('saveStatus').textContent='Saving draft…';clearTimeout(saveTimer);saveTimer=setTimeout(()=>flushEditors().catch(showError),600);
 });
 window.addEventListener('beforeunload',event=>{if(reportDirty||codeDirty){event.preventDefault();event.returnValue='';}});
}
saveReport=async function(){const result=await api('/api/report',{method:'POST',body:JSON.stringify({module:loadedModuleCode||$('moduleSelect').value,text:$('reportEditor').value})});$('saveStatus').textContent='Saved '+result.file;STATE=await api('/api/state');$('reportEditor').value=reportWithCurrentSections(loadedModuleCode||$('moduleSelect').value,browserStore.get('workspace/reports/'+(loadedModuleCode||$('moduleSelect').value)+'.md'));$('moduleTask').innerHTML=taskHtml(COURSE.modules.find(m=>m.code===(loadedModuleCode||$('moduleSelect').value)));};
saveCode=async function(){const result=await api('/api/code',{method:'POST',body:JSON.stringify({key:loadedCodeKey||$('codeKey').value,text:$('codeEditor').value})});$('saveStatus').textContent='Saved '+result.file;};
function refreshSavedEvidence(){
 const state=browserStore.state(COURSE);
 for(const [id,values] of [['savedModelSelect',state.models],['savedRunSelect',state.runs],['savedLogSelect',state.logs]]){
  const select=$(id);if(!select)continue;const selected=select.value;
  select.innerHTML='<option value="">Choose saved evidence…</option>'+values.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('');
  if(values.includes(selected))select.value=selected;
 }
}
async function loadSavedModel(){
 try{const name=$('savedModelSelect').value;if(!name)throw Error('Choose a saved model first.');
  const text=browserStore.get('workspace/models/'+name+'.json'),model=JSON.parse(text);$('modelEditor').value=text;$('modelName').value=name;$('modelKind').value=model.kind;await previewModel();
 }catch(e){showError(e);}
}
function loadSavedLog(){
 try{const name=$('savedLogSelect').value;if(!name)throw Error('Choose a saved test log first.');$('testOutput').textContent=browserStore.get('workspace/logs/'+name);}
 catch(e){showError(e);}
}
function loadSavedRun(){
 try{const name=$('savedRunSelect').value;if(!name)throw Error('Choose a saved experiment first.');
  const text=browserStore.get('workspace/runs/'+name),run=JSON.parse(text);$('engineSelect').value=run.engine;$('simModule').value=name.slice(0,3);$('simInput').value=JSON.stringify(run.inputs,null,2);$('simOutput').textContent=text;
 }catch(e){showError(e);}
}
const oldSaveModel=saveModel,oldRunSim=runSim;
saveModel=async function(){await oldSaveModel();refreshSavedEvidence();};
runSim=async function(save){await oldRunSim(save);refreshSavedEvidence();};
const oldShow=show,oldLoadModule=loadModule,oldLoadCode=loadCode;
show=function(id){if(contextDirty&&id!=='context'){showError(Error('Save your stakeholder/scope changes before leaving Your project.'));return;}flushEditors().catch(showError);if(id==='brief')$('brief').innerHTML=projectBriefHtml();if(id==='context')$('context').innerHTML=contextFormHtml();oldShow(id);if(browserStore){refreshSavedEvidence();updateLearningAccess();}};
loadModule=async function(code){await flushEditors();const result=await oldLoadModule(code);loadedModuleCode=code;updateLearningAccess();return result;};
loadCode=async function(){await flushEditors();const key=$('codeKey').value;const result=await oldLoadCode();loadedCodeKey=key;return result;};
overviewHtml=onlineOverview;exportHtml=onlineFiles;exportProgress=onlineExport;
runTests=async function(suite){
 $('actionError')?.remove();
 $('testOutput').textContent='Loading browser Python and running tests…';
 try{await flushEditors();const result=await api('/api/tests',{method:'POST',body:JSON.stringify({suite})});$('testOutput').textContent=`exit_code=${result.exit_code}\n${result.log}\nSaved log: ${result.file}`;STATE=await api('/api/state');refreshSavedEvidence();}
 catch(e){$('testOutput').textContent=e.message;showError(e);}
};
boot().then(async()=>{updateLearningAccess();installAutosave();refreshSavedEvidence();await installNavigation();$('saveStatus').textContent='Saved in this browser · export before leaving';}).catch(showError);

