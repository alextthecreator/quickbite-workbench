const {test}=require('node:test');
const assert=require('node:assert/strict');
const {toXml,validName,acceptMessage,replyToken,filesForSave,ORIGIN,URL:EDITOR_URL}=require('../web_src/drawio-model.js');
const {ProjectStore}=require('../web_src/project-store.js');
const {projectZip,parseProjectFile}=require('../web_src/project-archive.js');
const learning=require('../web_src/learning-state.js');
const course=require('../course_app/curriculum.json');
const fs=require('node:fs'),vm=require('node:vm');
const model={kind:'dfd',nodes:[{id:'a',type:'external',label:'Source & recipient <test>',x:40,y:80},{id:'b',type:'process',label:'1. Transform information',x:400,y:80},{id:'d',type:'store',label:'D1 Records',x:740,y:80}],edges:[{from:'a',to:'b',label:'input data'},{from:'b',to:'a',label:'output data'},{from:'b',to:'d',label:'record'}]};
function storage(){const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};}

test('legacy conversion preserves original data and produces editable nodes and all directed flows',()=>{
 const before=JSON.stringify(model),xml=toXml(model);
 assert.equal(JSON.stringify(model),before);assert.equal((xml.match(/ vertex="1"/g)||[]).length,3);assert.equal((xml.match(/ edge="1"/g)||[]).length,3);
 assert.match(xml,/Source &amp; recipient &lt;test&gt;/);assert.match(xml,/source="qb_n0" target="qb_n1"/);assert.match(xml,/source="qb_n1" target="qb_n0"/);assert.match(xml,/x="400" y="80"/);
 const beforeId={...model,nodes:[{...model.nodes[0],id:'0'},{...model.nodes[1],id:'1'}],edges:[{from:'0',to:'1',label:'safe IDs'}]};assert.match(toXml(beforeId),/id="qb_n0"/);
 assert.throws(()=>toXml({...model,edges:[{from:'absent',to:'a'}]}));
});

test('message bridge requires both the exact draw.io origin and the active iframe window',()=>{
 assert.equal(new URL(EDITOR_URL).searchParams.get('lang'),'en');
 const source={},event={origin:ORIGIN,source,data:'{"event":"save","xml":"example"}'};
 assert.equal(acceptMessage(event,source).event,'save');
 assert.equal(acceptMessage({...event,origin:ORIGIN+'.attacker.example'},source),null);
 assert.equal(acceptMessage({...event,source:{}},source),null);assert.equal(acceptMessage({...event,data:'broken'},source),null);
});

test('export replies correlate with the original request object returned by draw.io',()=>{
 const request={action:'export',format:'svg',message:'save-12'};
 assert.equal(replyToken({message:request}),'save-12');assert.equal(replyToken({message:JSON.stringify(request)}),'save-12');assert.equal(replyToken({message:'save-12'}),'save-12');assert.equal(replyToken({message:{action:'load',message:'save-12'}}),null);
});

test('draw.io save retains legacy JSON and every unrelated project file through ZIP and reload',()=>{
 const memory=storage(),store=new ProjectStore(memory,{},'4.7.1');
 store.save('workspace/models/M04_dfd.json',JSON.stringify(model,null,2));store.save('workspace/models/M04_dfd.svg','<svg>old preview</svg>');store.save('workspace/reports/M01.md','Earlier report');
 const before=store.snapshot(),xml=toXml(model),svg='<svg xmlns="http://www.w3.org/2000/svg"><text>New preview</text></svg>';
 const next=store.snapshot();next.files=filesForSave(next.files,'M04_dfd',xml,svg);store.persist(next);
 assert.equal(store.get('workspace/models/M04_dfd.json'),before.files['workspace/models/M04_dfd.json']);assert.equal(store.get('workspace/reports/M01.md'),'Earlier report');
 assert.deepEqual(store.state(course).models,['M04_dfd']);
 const resumed=new ProjectStore(memory,{},'4.7.1');assert.equal(resumed.get('workspace/models/M04_dfd.drawio'),xml);
 assert.deepEqual(parseProjectFile(projectZip(resumed.snapshot()),'project.zip').files,resumed.snapshot().files);
});

test('new native diagrams meet model evidence requirements while legacy files remain accepted',()=>{
 const task=course.modules.find(m=>m.code==='M04').task_specs.find(t=>t.task===2),id='M04.02',answer='workspace/reports/M04_task02.md';
 for(const extension of ['json','drawio']){
  const files={[answer]:'My independent analysis',['workspace/models/M04_dfd.'+extension]:extension==='json'?JSON.stringify(model):toXml(model),'workspace/models/M04_dfd.svg':'<svg/>'};
  assert.deepEqual(learning.minimum({...task,module:'M04'},files),[],id+' using '+extension);
 }
});

test('save names, unsafe paths and invalid native sources cannot replace a saved project',()=>{
 assert.equal(validName('m04_dfd',course),'M04_dfd');assert.throws(()=>validName('M04_wrong',course));
 const files={'workspace/reports/M01.md':'Keep me'},before=JSON.stringify(files);
 for(const args of [['../evil',toXml(model),'<svg/>'],['M04_dfd','not xml','<svg/>'],['M04_dfd',toXml(model),'not svg'],['M04_dfd','<!DOCTYPE mxfile><mxfile/>','<svg/>']])assert.throws(()=>filesForSave(files,...args));
 assert.equal(JSON.stringify(files),before);
});

function bridge(){
 const memory=storage(),store=new ProjectStore(memory,{},'4.7.1');store.save('workspace/models/M04_dfd.json',JSON.stringify(model));
 const messages=[],handlers={},fields={},drafts=new Map(),source={postMessage:text=>messages.push(JSON.parse(text))};
 const element=id=>fields[id]||(fields[id]={value:'M04_dfd',textContent:'',disabled:false,contentWindow:source,classList:{add:()=>{},remove:()=>{},toggle:()=>{}}});
 const ctx=vm.createContext({QuickBiteDrawio:require('../web_src/drawio-model.js'),browserStore:store,COURSE:course,STATE:null,window:{addEventListener:(name,handler)=>{handlers[name]=handler;}},$:element,loadSavedModel:async()=>{},saveModel:async()=>{},setTimeout:()=>1,clearTimeout:()=>{},localStorage:{getItem:key=>drafts.get(key)||null,setItem:(key,value)=>drafts.set(key,value),removeItem:key=>drafts.delete(key)},URL:{createObjectURL:()=> 'blob:preview',revokeObjectURL:()=>{}},Blob,TextDecoder,Uint8Array,atob,decodeURIComponent,DOMParser:class{parseFromString(text){return {documentElement:{localName:text.includes('<svg')?'svg':'mxfile'},querySelector:()=>null};}},api:async()=>store.state(course),refreshSavedEvidence:()=>{}});
 vm.runInContext(fs.readFileSync(require.resolve('../web_src/drawio-ui.js'),'utf8'),ctx);
 vm.runInContext("drawioSession={name:'M04_dfd',xml:'',dirty:false,ready:true,store:browserStore,source:$('drawioFrame').contentWindow,base:drawioBase('M04_dfd')};",ctx);
 return {ctx,store,messages,handlers,fields,source};
}

test('complete host-save protocol uses source XML and its SVG, then preserves original JSON',async()=>{
 const b=bridge(),before=b.store.snapshot(),xml=toXml(model);
 b.ctx.requestDrawioSave();const request=b.messages.at(-1);assert.equal(request.format,'xml');assert.equal(b.ctx.drawioUnsaved(),true);
 b.handlers.message({origin:ORIGIN,source:b.source,data:JSON.stringify({event:'export',format:'xml',message:request,xml})});
 const svgRequest=b.messages.at(-1);assert.equal(svgRequest.format,'svg');assert.equal(svgRequest.xml,xml);
 await b.ctx.completeDrawioSave({event:'export',format:'svg',message:{...svgRequest,message:'wrong'},data:'data:image/svg+xml,%3Csvg%2F%3E'});assert.deepEqual(b.store.snapshot(),before);
 await b.ctx.completeDrawioSave({event:'export',format:'svg',message:svgRequest,data:'data:image/svg+xml,%3Csvg%2F%3E'});
 assert.equal(b.store.get('workspace/models/M04_dfd.drawio'),xml);assert.equal(b.store.get('workspace/models/M04_dfd.json'),before.files['workspace/models/M04_dfd.json']);assert.equal(b.ctx.drawioUnsaved(),false);
});

test('drafts and in-flight saves block navigation, while export failure preserves saved files',async()=>{
 const b=bridge(),before=b.store.snapshot(),xml=toXml(model);
 b.handlers.message({origin:ORIGIN,source:b.source,data:JSON.stringify({event:'autosave',xml})});
 assert.throws(()=>b.ctx.guardDrawioNavigation({page:'files'}),/Save your diagram/);
 b.ctx.requestDrawioSave();assert.throws(()=>b.ctx.guardDrawioNavigation({page:'overview'}));
 const sourceRequest=b.messages.at(-1);b.handlers.message({origin:ORIGIN,source:b.source,data:JSON.stringify({event:'export',format:'xml',message:sourceRequest,xml})});
 const svgRequest=b.messages.at(-1);await b.ctx.completeDrawioSave({event:'export',format:'svg',message:svgRequest,data:'invalid'});
 assert.deepEqual(b.store.snapshot(),before);assert.equal(b.ctx.drawioUnsaved(),true);assert.match(b.fields.drawioStatus.textContent,/Save failed/);
});


test('choosing a deployment starter suggests an unused name without renaming or replacing the open diagram',async()=>{
 const b=bridge(),before=b.store.snapshot();b.store.save('workspace/models/M06_deployment.drawio',toXml(model));
 b.fields.modelKind={value:'deployment'};b.ctx.suggestDrawioName();
 assert.equal(b.fields.modelName.value,'M06_deployment_2');assert.equal(b.fields.modelName.disabled,false);
 b.ctx.requestDrawioSave();const request=b.messages.at(-1),xml=toXml(model);
 b.handlers.message({origin:ORIGIN,source:b.source,data:JSON.stringify({event:'export',format:'xml',message:request,xml})});
 await b.ctx.completeDrawioSave({event:'export',format:'svg',message:b.messages.at(-1),data:'data:image/svg+xml,%3Csvg%2F%3E'});
 assert.equal(b.store.get('workspace/models/M04_dfd.drawio'),xml);
 assert.equal(b.store.get('workspace/models/M04_dfd.json'),before.files['workspace/models/M04_dfd.json']);
 assert.ok(!b.store.get('workspace/models/M06_deployment_2.drawio'));
});
