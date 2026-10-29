/* Model viewing controls. Stored JSON remains the authoritative student model. */
function renderDfd(model,direction){
 return new Promise((resolve,reject)=>{
  const worker=new Worker('/assets/dfd-worker.js');
  const timer=setTimeout(()=>{worker.terminate();reject(Error('DFD layout took too long. Try Saved positions; your saved model is unchanged.'));},20000);
  const finish=()=>{clearTimeout(timer);worker.terminate();};
  worker.onmessage=({data})=>{finish();data.error?reject(Error(data.error)):resolve({svg:data.svg,check:data.check});};
  worker.onerror=()=>{finish();reject(Error('Automatic DFD layout could not load. Try Saved positions; your saved model is unchanged.'));};
  worker.postMessage({id:1,model,direction});
 });
}
let modelViewGeneration=0,modelViewSvg='',modelViewScale=1;
function modelViewMessage(text){$('modelCheck').textContent=text;$('modelViewStatus').textContent=text;}
function modelPayload(){return {model:JSON.parse($('modelEditor').value),layout:$('modelLayout').value,direction:$('dfdDirection').value};}
function modelFlowTable(model){
 const nodes=new Map(model.nodes.map(node=>[node.id,node.label||node.id]));
 return `<table><caption>Data flows · ${(model.edges||[]).length}</caption><thead><tr><th scope="col">#</th><th scope="col">Source</th><th scope="col">Data</th><th scope="col">Destination</th></tr></thead><tbody>${(model.edges||[]).map((edge,index)=>`<tr><th scope="row">${index+1}</th><td>${esc(nodes.get(edge.from))}</td><td>${esc(edge.label||'Unlabelled flow')}</td><td>${esc(nodes.get(edge.to))}</td></tr>`).join('')}</tbody></table>`;
}
function displayModel(result,model){
 modelViewSvg=result.svg;$('modelPreview').innerHTML=result.svg;
 const dfd=model.kind==='dfd';$('modelTableButton').disabled=!dfd;$('modelLayout').disabled=!dfd;$('dfdDirection').disabled=!dfd||$('modelLayout').value==='coordinates';
 $('modelFlowTable').innerHTML=dfd?modelFlowTable(model):'';
 $('modelDownloadButton').disabled=false;
 setModelView('diagram');setModelZoom('fit');
}
function setModelView(view){
 const table=view==='table';$('modelPreview').classList.toggle('hidden',table);$('modelFlowTable').classList.toggle('hidden',!table);
 $('modelDiagramButton').setAttribute('aria-pressed',String(!table));$('modelTableButton').setAttribute('aria-pressed',String(table));
 if(!table)setModelZoom('fit');
}
function setModelZoom(value){
 if($('modelPreview').classList.contains('hidden'))return;
 const svg=$('modelPreview').querySelector('svg');if(!svg)return;
 const dimensions=svg.getAttribute('viewBox').split(/[ ,]+/).map(Number),width=dimensions[2],height=dimensions[3];
 modelViewScale=value==='fit'?Math.min(1,Math.max(200,$('modelPreview').clientWidth-28)/width):value==='actual'?1:Math.max(.1,Math.min(3,modelViewScale*Number(value)));
 svg.style.width=width*modelViewScale+'px';svg.style.height=height*modelViewScale+'px';
 $('modelZoomLabel').textContent=Math.round(modelViewScale*100)+'%';
}
function toggleModelFullscreen(){
 const dialog=$('modelFullscreenDialog');
 if(dialog.open){dialog.close();return;}
 dialog.appendChild($('modelPreviewPanel'));dialog.showModal();$('modelExpandButton').textContent='Close full screen';
 // The native dialog handles focus trapping and Escape.
 dialog.onclose=()=>{$('modelPreviewDock').appendChild($('modelPreviewPanel'));$('modelExpandButton').textContent='Full screen';setModelZoom('fit');};
 setModelZoom('fit');
}
window.addEventListener('popstate',()=>{if($('modelFullscreenDialog')?.open)$('modelFullscreenDialog').close();});
window.addEventListener('hashchange',()=>{if($('modelFullscreenDialog')?.open)$('modelFullscreenDialog').close();});
function downloadModelSvg(){
 if(!modelViewSvg)return;
 const name=($('modelName').value||'diagram').replace(/[^A-Za-z0-9_-]/g,'_');
 downloadBlob(new Blob([modelViewSvg],{type:'image/svg+xml'}),name+'.svg');
}
previewModel=async function(){
 const generation=++modelViewGeneration;
 try{const payload=modelPayload();modelViewMessage('Drawing diagram…');const result=await api('/api/model-preview',{method:'POST',body:JSON.stringify(payload)});if(generation!==modelViewGeneration)return;displayModel(result,payload.model);modelViewMessage(result.check);}
 catch(error){if(generation===modelViewGeneration)modelViewMessage(error.message);}
};
saveModel=async function(){
 const generation=++modelViewGeneration;
 try{const payload={...modelPayload(),name:$('modelName').value};modelViewMessage('Saving model and SVG…');const result=await api('/api/model-save',{method:'POST',body:JSON.stringify(payload)});if(generation===modelViewGeneration){displayModel(result,payload.model);modelViewMessage('Saved '+result.json+' and '+result.svg_file);}STATE=await api('/api/state');refreshSavedEvidence();}
 catch(error){if(generation===modelViewGeneration)modelViewMessage(error.message);}
};
const loadModelBeforeViewer=loadSavedModel;
loadSavedModel=async function(){
 const name=$('savedModelSelect').value;if(!name){showError(Error('Choose a saved model first.'));return;}
 $('modelSourcePanel').open=false;
 await loadModelBeforeViewer();
 $('modelPreviewPanel').scrollIntoView({block:'start'});
};
