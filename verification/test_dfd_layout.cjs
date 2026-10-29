const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {layout,validate}=require('../web_src/dfd-layout.js');
const {ProjectStore}=require('../web_src/project-store.js');
const {projectZip,parseProjectFile}=require('../web_src/project-archive.js');

const model={kind:'dfd',nodes:[{id:'external',type:'external',label:'Example external organisation',x:40,y:100},{id:'process',type:'process',label:'1. Validate incoming information',x:400,y:100},{id:'store',type:'store',label:'D1 Validated records',x:760,y:100}],edges:[{from:'external',to:'process',label:'incoming reference, selected items and requested operation'},{from:'process',to:'external',label:'confirmation details or validation failure'},{from:'process',to:'store',label:'validated record'},{from:'store',to:'process',label:'previously stored reference and state'}]};
const overlaps=(a,b)=>a.x<b.x+b.width-.1&&a.x+a.width>b.x+.1&&a.y<b.y+b.height-.1&&a.y+a.height>b.y+.1;
function freeze(value){for(const child of Object.values(value))if(child&&typeof child==='object')freeze(child);return Object.freeze(value);}

test('automatic DFD layout separates bidirectional routes, labels and nodes without changing saved geometry',async()=>{
 const input=JSON.parse(JSON.stringify(model)),before=JSON.stringify(input);freeze(input);
 for(const direction of ['DOWN','RIGHT']){
  const result=await layout(input,direction),graph=result.graph;
  assert.equal(JSON.stringify(input),before);assert.equal(graph.children.length,input.nodes.length);assert.equal(graph.edges.length,input.edges.length);
  const boxes=[...graph.children,...graph.edges.flatMap(edge=>edge.labels||[])];
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)assert.equal(overlaps(boxes[i],boxes[j]),false,`overlapping boxes ${i},${j}`);
  assert.notDeepEqual(graph.edges[0].sections,graph.edges[1].sections);
  for(const [index,edge] of graph.edges.entries()){
   assert.deepEqual(edge.sources,['n'+input.nodes.findIndex(n=>n.id===input.edges[index].from)]);
   assert.deepEqual(edge.targets,['n'+input.nodes.findIndex(n=>n.id===input.edges[index].to)]);
   assert.ok(edge.sections.length);assert.ok(result.svg.includes(input.edges[index].label));
  }
  assert.match(result.svg,/DATA STORE/);assert.match(result.svg,/EXTERNAL ENTITY/);assert.match(result.svg,/<tspan/);
 }
});

test('DFD labels are escaped and invalid endpoints are rejected before layout',async()=>{
 const input=JSON.parse(JSON.stringify(model));input.nodes[0].label='<script>alert("x")</script>';input.edges[0].label='<img src=x onerror=alert(1)>';
 const result=await layout(input);assert.doesNotMatch(result.svg,/<script|<img/);assert.match(result.svg,/&lt;script&gt;/);
 for(const bad of [{...model,nodes:[model.nodes[0],model.nodes[0]]},{...model,edges:[{from:'absent',to:'process'}]},{...model,nodes:[{...model.nodes[0],x:Infinity}]}])assert.throws(()=>validate(bad));
});

test('automatic preview does not save; explicit save preserves the entire JSON and remains importable by schema v1',async()=>{
 const values=new Map(),store=new ProjectStore({getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},{},'4.7.1');
 store.save('workspace/models/M04_dfd.json',JSON.stringify(model,null,2));store.save('workspace/models/M04_dfd.svg','<svg>previous version</svg>');
 const before=store.snapshot();
 const course={learning_mode:'guided',modules:[{code:'M04',task_specs:[{task:2,evidence:[{prefix:'workspace/models/M04_dfd'}]}]}]};
 // Exercise the actual browser API with isolated storage and the real layout engine.
 const apiContext=vm.createContext({initialCourse:{course},initialStore:store,renderDfd:async(m,direction)=>{const result=await layout(m,direction);return {svg:result.svg,check:result.check};}});
 vm.runInContext(fs.readFileSync(require.resolve('../web_src/browser-api.js'),'utf8')+'\nbrowserCourse=initialCourse;browserStore=initialStore;',apiContext);
 const run=(url,payload)=>vm.runInContext(`browserApi(${JSON.stringify(url)},{method:'POST',body:${JSON.stringify(JSON.stringify(payload))}})`,apiContext);
 await run('/api/model-preview',{model,layout:'auto'});assert.deepEqual(store.snapshot(),before);
 const result=await run('/api/model-save',{model,name:'M04_dfd',layout:'auto'});assert.equal(result.saved,true);
 assert.equal(store.get('workspace/models/M04_dfd.json'),before.files['workspace/models/M04_dfd.json']);assert.notEqual(store.get('workspace/models/M04_dfd.svg'),before.files['workspace/models/M04_dfd.svg']);
 const restored=parseProjectFile(projectZip(store.snapshot()),'project.zip');assert.deepEqual(restored.files,store.snapshot().files);
});

test('saved-position DFDs and other notations still use the original renderer',async()=>{
 const ctx=vm.createContext({});
 vm.runInContext(fs.readFileSync(require.resolve('../web_src/browser-api.js'),'utf8')+"\nengineWorker={call:async()=>({svg:'legacy',check:'legacy'}),stop:()=>{}};",ctx);
 for(const payload of [{model,layout:'coordinates'},{model:{kind:'activity'}}])assert.equal((await vm.runInContext(`compute('render',${JSON.stringify(payload)})`,ctx)).svg,'legacy');
});

test('switching from the full-screen flow table to the diagram fits the visible canvas rather than its hidden width',()=>{
 const svg={style:{},getAttribute:()=> '0 0 2000 1000'},classes=new Set(),fields={modelPreview:{clientWidth:1000,classList:{contains:key=>classes.has(key),toggle:(key,on)=>on?classes.add(key):classes.delete(key)},querySelector:()=>svg},modelFlowTable:{classList:{toggle:()=>{}}},modelDiagramButton:{setAttribute:()=>{}},modelTableButton:{setAttribute:()=>{}},modelZoomLabel:{textContent:''}};
 const ctx=vm.createContext({window:{addEventListener:()=>{}},loadSavedModel:async()=>{},$:id=>fields[id]});
 vm.runInContext(fs.readFileSync(require.resolve('../web_src/dfd-view.js'),'utf8'),ctx);
 ctx.setModelZoom('fit');assert.equal(fields.modelZoomLabel.textContent,'49%');
 ctx.setModelView('table');fields.modelPreview.clientWidth=0;ctx.setModelZoom('fit');assert.equal(fields.modelZoomLabel.textContent,'49%');
 fields.modelPreview.clientWidth=1800;ctx.setModelView('diagram');assert.equal(fields.modelZoomLabel.textContent,'89%');
});
