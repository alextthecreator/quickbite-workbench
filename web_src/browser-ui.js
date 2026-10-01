/* Browser-only start/resume, safe project exchange, and clear runtime feedback. */
function onlineOverview(){
 const m=moduleForSession(PROJECT.current_session);
 return `<div class="hero"><div class="eyebrow" style="color:#aecaFF">QuickBite online · one project</div><h2>Your course. Your browser. Your project file.</h2><p>Work here without accounts or installing Python. Your saved work stays in this browser. Download your project after every class; import that file to continue on any computer.</p></div>
 <div class="resume-grid"><article><div class="eyebrow">Project identity</div><h3>Where are you now?</h3><div class="toolbar"><label>Team ID<input id="teamId" value="${esc(PROJECT.team_id)}"></label><label>Current session<select id="currentSession">${Array.from({length:20},(_,i)=>`<option value="${i+1}" ${i+1===PROJECT.current_session?'selected':''}>Session ${i+1}</option>`).join('')}</select></label><button onclick="saveProjectMeta()">Save project identity</button></div><p><b>Current module:</b> ${esc(m?.code||'')} — ${esc(m?.title||'')}</p><button class="secondary" onclick="openModule('${m?.code||'M01'}')">Continue this module</button></article>
 <article><div class="eyebrow">Start / resume</div><h3>One link for the whole course.</h3><ol class="checklist"><li>First class: set your team ID and start M01.</li><li>Returning: use <b>Save & Export → Import project</b> to open your latest file.</li><li>Work through the task cards, save evidence and review it.</li><li>Before leaving: download the project ZIP. Upload it to Moodle when requested.</li></ol><div class="danger-note">Clearing browser data or using private browsing can remove local work. Your downloaded project is your backup.</div></article></div>
 <div class="cards"><div class="card"><b>No accounts</b>Work is local to this browser. Teams share their downloaded project file.</div><div class="card"><b>Course ${esc(VERSION.version)}</b>Reload this same address to receive course updates. Saved work is kept separately.</div><div class="card"><b>Python in your browser</b>Models, simulators and tests load Python when first used. The first load needs internet.</div></div>
 <article><div class="eyebrow">Project brief</div><h3>${esc(COURSE.course.project)}</h3><p>${esc(COURSE.scenario.problem)}</p><ul class="checklist">${(COURSE.scenario.brief_points||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></article>
 <h3>Course path</h3><div class="course-map">${COURSE.modules.map(m=>`<button class="stage secondary" onclick="openModule('${m.code}')"><span class="num">${m.code} · S${m.sessions.join('–')}</span><b>${esc(m.title)}</b></button>`).join('')}</div>`;
}
function onlineFiles(){
 return `<div class="export-box"><div class="eyebrow">End of every class</div><h2>Download your project. Bring it back next class.</h2><p>The ZIP contains your reports, models, runs, Python code, tests and logs. It contains your work, not a local server. Import it on this site to resume, or submit it on Moodle.</p><div class="toolbar"><label>Team ID<input id="exportTeam" value="${esc(PROJECT.team_id)}"></label><label>Session<select id="exportSession">${Array.from({length:20},(_,i)=>`<option value="${i+1}" ${i+1===PROJECT.current_session?'selected':''}>Session ${i+1}</option>`).join('')}</select></label></div><button onclick="exportProgress()">Save identity & download project ZIP</button><p id="exportFeedback" aria-live="polite"></p></div>
 <div class="grid2" style="margin-top:18px"><article><h3>Import project</h3><p>Choose a QuickBite online project ZIP, JSON backup, or an older local workbench export. Review it before replacing your current browser project.</p><label>Project file<input type="file" id="projectImport" accept=".zip,.json" onchange="prepareImport(this)"></label><pre id="importPreview" class="output small" aria-live="polite">No project selected.</pre><button id="applyImport" class="hidden" onclick="applyImport()">Import this project</button><p class="muted">Before replacement, your current project is downloaded as a JSON backup.</p></article>
 <article><h3>Saved in this browser</h3><p>${esc(moduleProgressSummary())}</p><pre id="stateOutput" class="output small"></pre><button class="secondary" onclick="refreshState()">Refresh saved state</button><p class="muted">Always keep your exported file outside this browser. Team members can pass this file to each other.</p></article></div>`;
}
function downloadBlob(blob,name){const link=document.createElement('a'),url=URL.createObjectURL(blob);link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
async function onlineExport(){
 try{
  await flushEditors();
  if($('exportTeam'))await browserApi('/api/project',{method:'POST',body:JSON.stringify({team_id:$('exportTeam').value.trim(),current_session:Number($('exportSession').value)})});
  const project=browserStore.project();browserStore.saveProject({last_export_session:project.current_session,last_export_utc:new Date().toISOString()});
  const snapshot=browserStore.snapshot();snapshot.exported_at=new Date().toISOString();
  downloadBlob(new Blob([QuickBiteArchive.projectZip(snapshot)],{type:'application/zip'}),`QuickBite_${project.team_id}_after_S${String(project.current_session).padStart(2,'0')}_${new Date().toISOString().slice(0,10)}.zip`);
  STATE=browserStore.state(COURSE);PROJECT=STATE.project;updateChips();$('saveStatus').textContent='Project downloaded · keep this file for next class';if($('exportFeedback'))$('exportFeedback').textContent='Project downloaded. Keep this ZIP and import it next class.';
 }catch(e){showError(e);}
}
let pendingImport=null;
async function prepareImport(input){
 pendingImport=null;$('applyImport').classList.add('hidden');
 try{const file=input.files[0];if(!file)return;pendingImport=QuickBiteArchive.parseProjectFile(new Uint8Array(await file.arrayBuffer()),file.name,browserCourse.templates);const project=QuickBiteStore.meta(JSON.parse(pendingImport.files['workspace/project.json']));$('importPreview').textContent=`Ready to import\nTeam: ${project.team_id}\nSession: ${project.current_session}\nFiles: ${Object.keys(pendingImport.files).length}\nCourse saved with: ${pendingImport.course_version}\n\nYour current project will be downloaded as a backup before replacement.`;$('applyImport').classList.remove('hidden');}
 catch(e){$('importPreview').textContent='Import rejected: '+e.message;}
}
async function applyImport(){
 if(!pendingImport)return;
 try{
  await flushEditors();const previous=browserStore.snapshot();
  downloadBlob(new Blob([JSON.stringify(previous,null,2)],{type:'application/json'}),`QuickBite_${browserStore.project().team_id}_before_import.json`);
  browserStore.import(pendingImport);pendingImport=null;STATE=browserStore.state(COURSE);PROJECT=STATE.project;updateChips();await loadModule(moduleForSession(PROJECT.current_session)?.code||'M01');await loadCode();renderOverview();show('files');$('importPreview').textContent='Imported successfully. Your previous browser project was downloaded as a JSON backup.';$('saveStatus').textContent='Project imported · '+PROJECT.team_id+' · Session '+PROJECT.current_session;
 }catch(e){showError(e);}
}
function showError(error){$('saveStatus').textContent=error.message||String(error);let out=$('actionError');if(!out){out=document.createElement('div');out.id='actionError';out.className='danger-note';out.setAttribute('role','alert');document.querySelector('main').prepend(out);}out.textContent=error.message||String(error);}
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
saveReport=async function(){const result=await api('/api/report',{method:'POST',body:JSON.stringify({module:loadedModuleCode||$('moduleSelect').value,text:$('reportEditor').value})});$('saveStatus').textContent='Saved '+result.file;STATE=await api('/api/state');};
saveCode=async function(){const result=await api('/api/code',{method:'POST',body:JSON.stringify({key:loadedCodeKey||$('codeKey').value,text:$('codeEditor').value})});$('saveStatus').textContent='Saved '+result.file;};
function refreshSavedEvidence(){
 const state=browserStore.state(COURSE);
 for(const [id,values] of [['savedModelSelect',state.models],['savedRunSelect',state.runs]]){
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
function loadSavedRun(){
 try{const name=$('savedRunSelect').value;if(!name)throw Error('Choose a saved experiment first.');
  const text=browserStore.get('workspace/runs/'+name),run=JSON.parse(text);$('engineSelect').value=run.engine;$('simModule').value=name.slice(0,3);$('simInput').value=JSON.stringify(run.inputs,null,2);$('simOutput').textContent=text;
 }catch(e){showError(e);}
}
const oldSaveModel=saveModel,oldRunSim=runSim;
saveModel=async function(){await oldSaveModel();refreshSavedEvidence();};
runSim=async function(save){await oldRunSim(save);refreshSavedEvidence();};
const oldShow=show,oldLoadModule=loadModule,oldLoadCode=loadCode;
show=function(id){flushEditors().catch(showError);oldShow(id);if(browserStore)refreshSavedEvidence();};
loadModule=async function(code){await flushEditors();const result=await oldLoadModule(code);loadedModuleCode=code;return result;};
loadCode=async function(){await flushEditors();const key=$('codeKey').value;const result=await oldLoadCode();loadedCodeKey=key;return result;};
overviewHtml=onlineOverview;exportHtml=onlineFiles;exportProgress=onlineExport;
runTests=async function(suite){
 $('actionError')?.remove();
 $('testOutput').textContent='Loading browser Python and running tests…';
 try{await flushEditors();const result=await api('/api/tests',{method:'POST',body:JSON.stringify({suite})});$('testOutput').textContent=`exit_code=${result.exit_code}\n${result.log}\nSaved log: ${result.file}`;STATE=await api('/api/state');}
 catch(e){$('testOutput').textContent=e.message;showError(e);}
};
boot().then(()=>{installAutosave();refreshSavedEvidence();$('saveStatus').textContent='Saved in this browser · export before leaving';}).catch(showError);
