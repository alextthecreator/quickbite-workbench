import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),app=path.join(root,'course_app'),source=path.join(root,'web_src'),out=path.join(root,'web');
fs.mkdirSync(path.join(out,'assets'),{recursive:true});fs.mkdirSync(path.join(out,'python'),{recursive:true});
const read=p=>fs.readFileSync(p,'utf8');
const toolData=JSON.parse(read(path.join(source,'tool-data.json')));
const templates={'workspace/student_code/policies.py':read(path.join(app,'workspace_template/student_code/policies.py')),'workspace/tests/test_student.py':read(path.join(app,'workspace_template/tests/test_student.py')),'workspace/student_code/__init__.py':'','workspace/tests/__init__.py':''};
const course=JSON.parse(read(path.join(app,'curriculum.json')));
for(const module of course.modules)for(const task of module.task_specs){if(task.evidence.some(e=>e.prefix.startsWith('workspace/models/'))){task.save_to+=' In draw.io use Save to project to save the editable diagram and SVG; existing JSON + SVG models remain accepted.';for(const evidence of task.evidence)evidence.label=evidence.label.replace('JSON','editable diagram');}}
const lectureMaterials=JSON.parse(read(path.join(source,'lecture-materials.json')));
fs.mkdirSync(path.join(out,'materials'),{recursive:true});
for(const item of lectureMaterials){
 if(!/^[A-Za-z0-9_-]+\.pdf$/.test(item.file)||!course.modules.some(module=>module.code===item.module))throw Error('Invalid lecture material.');
 const file=path.join(source,'materials',item.file);
 if(fs.statSync(file).size!==item.bytes)throw Error('Lecture file size does not match catalog: '+item.file);
 fs.copyFileSync(file,path.join(out,'materials',item.file));
}
for(const m of course.modules)for(const s of m.session_plan){s.before_leave=s.before_leave.map(x=>x.replace(/Export the complete project ZIP.*$/,'Download your project ZIP; import it on this site next class.'));}
fs.writeFileSync(path.join(out,'course.json'),JSON.stringify({course,...toolData,lecture_materials:lectureMaterials,templates,supplied_tests:read(path.join(app,'tests/test_m10.py')),version:{app_id:'quickbite-web',version:'4.7.1',label:'Complete project guide and submission baseline'}},null,2));
const feedback=JSON.parse(read(path.join(source,'feedback-config.json')));
if(feedback.url){
 const url=new URL(feedback.url);
 if(url.protocol!=='https:')throw new Error('Feedback form URL must use HTTPS.');
}
let html=read(path.join(app,'assets/index.html'));
if(feedback.url){
 const safeUrl=feedback.url.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 html=html.replace('</body>', `<aside class="feedback-widget" aria-label="Website feedback"><details><summary><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-3 3V11.5A8.5 8.5 0 0 1 9.5 3h3a8.5 8.5 0 0 1 8.5 8.5Z"/><path d="M6 10h10M6 14h7"/></svg><span>Give feedback</span></summary><div class="feedback-panel"><h2>How is the workbench working for you?</h2><p>This is the place to report problems, suggest improvements or tell us what works well.</p><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">Open feedback form <span aria-hidden="true">↗</span></a><p class="feedback-note">Opens Google Forms in a new tab. Click the bubble again to close.</p></div></details></aside></body>`);
}

html=html.replace(/    <button class="side-link" data-page="update".*\n/,'');
const start=html.indexOf('      <section id="update"'),end=html.indexOf('      <section id="files"',start);html=html.slice(0,start)+html.slice(end);
html=html.replace('local project folder','browser project').replace('This folder is your project. Export before leaving every class.','Your work stays in this browser. Download your project before leaving.');
html=html.replace('<div class="grid2"><article><h3>Editable model source</h3>', '<div class="toolbar"><label>Saved model<select id="savedModelSelect"></select></label><button class="secondary" onclick="loadSavedModel()">Open saved model</button></div><div class="grid2"><article><h3>Editable model source</h3>');
html=html.replace('onclick="loadStarter()">Load neutral starter','onclick="newDrawioDiagram()">New diagram');
html=html.replace('Saved model<select id="savedModelSelect"','Saved diagram<select id="savedModelSelect"').replace('>Open saved model</button>','>Open saved diagram</button>');
html=html.replace('<select id="modelKind">','<select id="modelKind" onchange="suggestDrawioName()">').replace('>Save name<input id="modelName"','>New / legacy diagram name<input id="modelName"');
const diagramNames=[...new Set(course.modules.flatMap(module=>module.task_specs.flatMap(task=>task.evidence.filter(e=>e.prefix.startsWith('workspace/models/')).map(e=>e.prefix.split('/').at(-1)))))];
html=html.replace('<input id="modelName" value="m03_model">','<input id="modelName" value="m03_model" list="diagramSaveNames"><datalist id="diagramSaveNames">'+diagramNames.map(name=>'<option value="'+name+'"></option>').join('')+'</datalist>');
const modelStart=html.indexOf('<div class="grid2"><article><h3>Editable model source</h3>'),modelEnd=html.indexOf('</section>',modelStart);
if(modelStart<0||modelEnd<0)throw Error('Legacy model editor template not found.');
html=html.slice(0,modelStart)+read(path.join(source,'drawio-panel.html'))+'\n'+html.slice(modelEnd);
html=html.replace('<div class="grid2"><article><h3>Inputs (JSON)</h3>', '<div class="toolbar"><label>Saved experiment<select id="savedRunSelect"></select></label><button class="secondary" onclick="loadSavedRun()">Open saved experiment</button></div><div class="grid2"><article><h3>Inputs (JSON)</h3>');
html=html.replace('<script src="/assets/app.js"></script>','<script src="/assets/fflate.js"></script>\n<script src="/assets/learning-state.js"></script>\n<script src="/assets/project-store.js"></script>\n<script src="/assets/project-archive.js"></script>\n<script src="/assets/browser-router.js"></script>\n<script src="/assets/drawio-model.js"></script>\n<script src="/assets/app.js"></script>');
html=html.replace('<div class="side-section-title">Project modules</div>', '<button class="side-link" data-page="brief" onclick="show(\'brief\')"><span class="side-icon">▤</span><span>Project Brief</span></button><button class="side-link" data-page="context" onclick="show(\'context\')"><span class="side-icon">✎</span><span>Your project</span></button><div class="side-section-title">Project modules</div>');
html=html.replace('<section id="overview"', '<section id="context" class="page hidden"></section><section id="brief" class="page hidden"></section><section id="overview"');
html=html.replace('<textarea id="reportEditor"', '<p id="learningReportNotice" class="notice"></p><textarea id="reportEditor"');
html=html.replace('<article><h3>Test output</h3>', '<article><h3>Test output</h3><div class="toolbar"><label>Saved test log<select id="savedLogSelect"></select></label><button class="secondary" onclick="loadSavedLog()">Open saved test log</button></div>');
fs.writeFileSync(path.join(out,'index.html'),html);
let js=read(path.join(app,'assets/app.js'));
const apiStart=js.indexOf('async function api('),apiEnd=js.indexOf('\nfunction esc',apiStart);js=js.slice(0,apiStart)+'async function api(url,opt={}){return browserApi(url,opt)}'+js.slice(apiEnd);
js=js.replace("let r=await fetch('/api/course');let d=await r.json();","let d=await api('/api/course');");
const bootIndex=js.lastIndexOf('boot().catch');js=js.slice(0,bootIndex);
fs.writeFileSync(path.join(out,'assets/app.js'),read(path.join(source,'browser-api.js'))+'\n'+js+'\n'+read(path.join(source,'lecture-materials.js'))+'\n'+read(path.join(source,'course-guide.js'))+'\n'+read(path.join(source,'browser-navigation.js'))+'\n'+read(path.join(source,'browser-ui.js'))+'\n'+read(path.join(source,'drawio-ui.js')));
fs.copyFileSync(path.join(app,'assets/style.css'),path.join(out,'assets/style.css'));
for(const file of ['learning-state.js','project-store.js','project-archive.js','browser-router.js','python-worker.js','drawio-model.js'])fs.copyFileSync(path.join(source,file),path.join(out,'assets',file));
fs.copyFileSync(path.join(source,'vendor/fflate.js'),path.join(out,'assets/fflate.js'));
fs.copyFileSync(path.join(source,'vendor/fflate-LICENSE.txt'),path.join(out,'assets/fflate-LICENSE.txt'));
for(const file of ['engines.py','models.py'])fs.copyFileSync(path.join(app,file),path.join(out,'python',file));
fs.appendFileSync(path.join(out,'assets/style.css'),'\n.hero h2{font-size:30px}.stage{text-align:left}#actionError{margin-bottom:16px}\n');
console.log('Built static browser workbench in web/. No student files or backend included.');

fs.appendFileSync(path.join(out,'assets/style.css'),read(path.join(source,'feedback-widget.css')));
fs.appendFileSync(path.join(out,'assets/style.css'),read(path.join(source,'lecture-materials.css')));
fs.appendFileSync(path.join(out,'assets/style.css'),read(path.join(source,'drawio.css')));

