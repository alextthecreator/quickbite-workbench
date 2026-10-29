let drawioSession=null,drawioPending=null,drawioReading=null,drawioCounter=0,drawioPreviewUrl=null;
const DRAWIO_DRAFT_KEY='quickbite.drawio.draft.v1';
function drawioStatus(text){$('drawioStatus').textContent=text;}
function drawioUnsaved(){return !!drawioSession&&(drawioSession.dirty||!!drawioPending||!!drawioReading);}
function drawioPost(message){if(drawioSession)$('drawioFrame').contentWindow.postMessage(JSON.stringify(message),QuickBiteDrawio.ORIGIN);}
function diagramName(name,existing=false){
 if(existing&&/^[A-Za-z0-9_-]{1,60}$/.test(name))return name;
 return QuickBiteDrawio.validName(name,COURSE);
}
function drawioBase(name){
 const text=browserStore.project().team_id+'\n'+name+'\n'+(browserStore.get('workspace/models/'+name+'.drawio')||'')+'\n'+(browserStore.get('workspace/models/'+name+'.json')||'');
 let hash=2166136261;for(const char of text){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}return text.length+':'+(hash>>>0).toString(16);
}
function cacheDrawioDraft(){
 if(!drawioSession)return;
 try{localStorage.setItem(DRAWIO_DRAFT_KEY,JSON.stringify({name:drawioSession.name,base:drawioSession.base,xml:drawioSession.xml,at:new Date().toISOString()}));}
 catch{drawioStatus('Changes are in the open editor, but browser draft backup is unavailable. Use Save to project before leaving.');}
}
function availableDrawioDraft(){
 if(!drawioSession)return null;
 try{const draft=JSON.parse(localStorage.getItem(DRAWIO_DRAFT_KEY)||'null');return draft&&draft.name===drawioSession.name&&draft.base===drawioSession.base&&typeof draft.xml==='string'?draft:null;}catch{return null;}
}
function showSavedDrawioPreview(name){
 if(drawioPreviewUrl){URL.revokeObjectURL(drawioPreviewUrl);drawioPreviewUrl=null;}
 const svg=browserStore.get('workspace/models/'+name+'.svg');$('drawioPreviewDetails').classList.toggle('hidden',!svg);
 if(typeof svg==='string'){drawioPreviewUrl=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));$('drawioPreviewImage').src=drawioPreviewUrl;}
}
function startDrawio(name,xml){
 if(drawioUnsaved()){drawioStatus('Save or close the current diagram before opening another.');return;}
 if(drawioSession)closeDrawio(true);
 const frame=$('drawioFrame'),fresh=frame.cloneNode(false);frame.replaceWith(fresh);
 drawioSession={name,xml,base:drawioBase(name),dirty:false,ready:false,store:browserStore,source:fresh.contentWindow};
 $('modelName').value=name;$('modelName').disabled=false;
 $('drawioActiveName').textContent='Editing: '+name+' — Save to project updates this diagram. The name above is for a new diagram.';
 $('drawioEmpty').classList.add('hidden');fresh.classList.remove('hidden');
 $('drawioCloseButton').disabled=false;$('drawioSaveButton').disabled=true;
 $('drawioRecoverButton').classList.toggle('hidden',!availableDrawioDraft());
 showSavedDrawioPreview(name);drawioStatus('Loading draw.io… Your saved project is unchanged.');
 fresh.src=QuickBiteDrawio.URL;
 drawioSession.timer=setTimeout(()=>{if(drawioSession&&!drawioSession.ready)drawioStatus('draw.io is taking longer to load. Check your connection. Your saved work is unchanged; the legacy JSON editor is still available.');},30000);
}
function drawioLoad(xml){drawioPost({action:'load',xml,title:drawioSession.name,autosave:1,saveAndExit:1,libs:'general;uml;dfd',fit:1});}
function suggestDrawioName(){
 const prefixes={usecase:'M03_usecase',activity:'M03_activity',dfd:'M04_dfd',deployment:'M06_deployment',class:'M07_class',package:'M07_packages',sequence:'M08_sequence01',state:'M08_state'};
 const prefix=prefixes[$('modelKind').value];if(!prefix)return;
 let name=prefix,index=2;
 while(browserStore.get('workspace/models/'+name+'.drawio')||browserStore.get('workspace/models/'+name+'.json')||drawioSession?.name===name)name=prefix+'_'+index++;
 $('modelName').value=name;
}
function newDrawioDiagram(){
 try{if(drawioUnsaved())throw Error('Save to project or close the current diagram before creating another.');const name=diagramName($('modelName').value.trim());if(browserStore.get('workspace/models/'+name+'.drawio')||browserStore.get('workspace/models/'+name+'.json'))throw Error('This name already has saved work. Choose Open saved diagram to continue it, or choose another Starter or a different name above to create a separate diagram.');startDrawio(name,QuickBiteDrawio.toXml(STARTERS[$('modelKind').value]));}
 catch(error){drawioStatus(error.message);}
}
function openCurrentJsonInDrawio(){
 try{const name=diagramName($('modelName').value.trim(),!!browserStore.get('workspace/models/'+$('modelName').value+'.json'));if(browserStore.get('workspace/models/'+name+'.drawio'))throw Error('A draw.io version already exists. Open it from Saved diagram to continue editing it.');startDrawio(name,QuickBiteDrawio.toXml(JSON.parse($('modelEditor').value)));}
 catch(error){drawioStatus(error.message);}
}
function recoverDrawioDraft(){
 const draft=availableDrawioDraft();if(!draft)return;
 drawioSession.xml=draft.xml;drawioSession.dirty=true;drawioLoad(draft.xml);drawioStatus('Browser draft recovered. Save to project to include it in your ZIP.');$('drawioRecoverButton').classList.add('hidden');
}
function requestDrawioSave(){
 if(!drawioSession?.ready||drawioPending||drawioReading)return;
 const token='quickbite-source-'+(++drawioCounter);
 drawioReading={token,session:drawioSession,timer:setTimeout(()=>{if(drawioReading?.token===token){drawioReading=null;$('drawioSaveButton').disabled=false;drawioStatus('Could not read the diagram for saving. Try Save to project again; your editor is still open.');}},30000)};
 $('drawioSaveButton').disabled=true;drawioStatus('Reading diagram for saving…');drawioPost({action:'export',format:'xml',message:token});
}
function beginDrawioSave(xml,exit=false){
 if(!drawioSession||drawioPending)return;
 if(drawioReading){clearTimeout(drawioReading.timer);drawioReading=null;}
 if(typeof xml!=='string'||xml.length>3_000_000){drawioStatus('Diagram is too large to save. Keep the editor open and reduce embedded images.');return;}
 drawioSession.xml=xml;drawioSession.dirty=true;cacheDrawioDraft();
 const token='quickbite-svg-'+(++drawioCounter);
 drawioPending={xml,name:drawioSession.name,token,exit,session:drawioSession};
 drawioPending.timer=setTimeout(()=>{if(drawioPending?.token===token){drawioPending=null;$('drawioSaveButton').disabled=false;drawioStatus('SVG export timed out. Your editor draft is retained. Try Save to project again.');drawioPost({action:'status',message:'Not saved to QuickBite',modified:true});}},30000);
 $('drawioSaveButton').disabled=true;drawioStatus('Saving editable diagram and SVG…');drawioPost({action:'export',format:'svg',xml,message:token});
}
function svgFromDrawio(data){
 if(typeof data!=='string'||!data.startsWith('data:image/svg+xml'))throw Error('draw.io did not return an SVG preview.');
 const comma=data.indexOf(','),encoded=data.slice(comma+1);
 const svg=data.slice(0,comma).includes(';base64')?new TextDecoder().decode(Uint8Array.from(atob(encoded),char=>char.charCodeAt(0))):decodeURIComponent(encoded);
 const parsed=new DOMParser().parseFromString(svg,'image/svg+xml');
 if(parsed.documentElement.localName!=='svg'||parsed.querySelector('parsererror')||/<!DOCTYPE|<!ENTITY/i.test(svg))throw Error('Invalid SVG preview.');
 return svg;
}
async function completeDrawioSave(message){
 const pending=drawioPending;if(!pending||QuickBiteDrawio.replyToken(message)!==pending.token)return;
 clearTimeout(pending.timer);drawioPending=null;$('drawioSaveButton').disabled=false;
 try{
  if(pending.session!==drawioSession||drawioSession.store!==browserStore)throw Error('The active project changed. Reopen the diagram before saving.');
  const parsed=new DOMParser().parseFromString(pending.xml,'application/xml');
  if(!['mxfile','mxGraphModel'].includes(parsed.documentElement.localName)||parsed.querySelector('parsererror'))throw Error('Invalid draw.io source.');
  const next=browserStore.snapshot();next.files=QuickBiteDrawio.filesForSave(next.files,pending.name,pending.xml,svgFromDrawio(message.data));browserStore.persist(next);
  const dirty=drawioSession.xml!==pending.xml;drawioSession.dirty=dirty;drawioSession.base=drawioBase(pending.name);
  if(dirty)cacheDrawioDraft();else {try{const draft=JSON.parse(localStorage.getItem(DRAWIO_DRAFT_KEY)||'null');if(draft?.name===pending.name&&draft.xml===pending.xml)localStorage.removeItem(DRAWIO_DRAFT_KEY);}catch{}}
  $('drawioRecoverButton').classList.add('hidden');$('drawioClosePrompt').classList.add('hidden');
  STATE=await api('/api/state');refreshSavedEvidence();showSavedDrawioPreview(pending.name);
  $('saveStatus').textContent='Diagram saved · '+pending.name;$('actionError')?.remove?.();
  drawioStatus(dirty?'Saved a diagram version. Newer changes remain in the editor; save again before exporting.':'Saved to this browser project: '+pending.name+'.drawio + SVG. Export your project ZIP before leaving.');
  drawioPost({action:'status',message:dirty?'Newer changes not saved':'Saved to QuickBite project',modified:dirty});
  if(pending.exit&&!dirty)closeDrawio(true);
 }catch(error){if(drawioSession)drawioSession.dirty=true;drawioStatus('Save failed: '+error.message+' Your editor draft is retained.');drawioPost({action:'status',message:'Not saved to QuickBite',modified:true});}
}
window.addEventListener('message',event=>{
 if(!drawioSession)return;
 const message=QuickBiteDrawio.acceptMessage(event,drawioSession.source);if(!message)return;
 if(message.event==='init'){clearTimeout(drawioSession.timer);drawioSession.ready=true;$('drawioSaveButton').disabled=false;drawioLoad(drawioSession.xml);drawioStatus('Editor ready. Use Save to project to include your diagram in the ZIP.');}
 else if(message.event==='autosave'&&typeof message.xml==='string'&&message.xml.length<=3_000_000){drawioSession.xml=message.xml;drawioSession.dirty=true;drawioStatus('Diagram changed. Use Save to project before exporting.');cacheDrawioDraft();drawioPost({action:'status',message:'Changes not saved to QuickBite',modified:true});}
 else if(message.event==='save')beginDrawioSave(message.xml,!!message.exit);
 else if(message.event==='export'&&drawioReading&&QuickBiteDrawio.replyToken(message)===drawioReading.token&&message.format==='xml')beginDrawioSave(message.xml);
 else if(message.event==='export')completeDrawioSave(message);
 else if(message.event==='exit')closeDrawio(false,!!message.modified);
 else if(message.event==='error')drawioStatus('draw.io: '+(message.message||message.error||'Could not open diagram. Your saved work is unchanged.'));
});
function closeDrawio(force=false,modified=false){
 if(!drawioSession)return;
 if(drawioPending||drawioReading){drawioStatus('Wait for the diagram save to finish before closing.');return;}
 if(!force&&(drawioSession.dirty||modified)){$('drawioClosePrompt').classList.remove('hidden');return;}
 if(drawioSession.dirty)cacheDrawioDraft();
 clearTimeout(drawioSession.timer);drawioSession=null;$('drawioActiveName').textContent='';$('drawioFrame').removeAttribute('src');$('drawioFrame').classList.add('hidden');$('drawioEmpty').classList.remove('hidden');$('drawioClosePrompt').classList.add('hidden');$('drawioRecoverButton').classList.add('hidden');$('drawioSaveButton').disabled=true;$('drawioCloseButton').disabled=true;$('modelName').disabled=false;drawioStatus('Editor closed. Saved project files are unchanged.');
}
function toggleDrawioFullscreen(){
 if(document.fullscreenElement)document.exitFullscreen();else $('drawioPanel').requestFullscreen().catch(()=>drawioStatus('Full screen is unavailable in this browser. The editor remains usable here.'));
}
window.addEventListener('beforeunload',event=>{if(drawioUnsaved()){event.preventDefault();event.returnValue='';}});
function guardDrawioNavigation(target){
 if(target.page==='models')return;
 if(drawioUnsaved())throw Error('Save your diagram to the project, or close the editor, before leaving Models / CASE.');
 if(drawioSession)closeDrawio(true);
}
const openLegacyModelBeforeDrawio=loadSavedModel;
function openLegacySavedModel(){
 if(drawioSession){drawioStatus('Close the visual editor before using the legacy editor.');return;}
 const name=$('savedModelSelect').value;
 if(!name||!browserStore.get('workspace/models/'+name+'.json')){drawioStatus('This diagram has no legacy JSON source. Open it in draw.io.');return;}
 $('legacyModelPanel').open=true;return openLegacyModelBeforeDrawio();
}
loadSavedModel=async function(){
 try{const name=$('savedModelSelect').value;if(!name)throw Error('Choose a saved diagram first.');
  const native=browserStore.get('workspace/models/'+name+'.drawio'),legacy=browserStore.get('workspace/models/'+name+'.json');
  if(legacy){$('modelEditor').value=legacy;try{$('modelKind').value=JSON.parse(legacy).kind;}catch{}}
  startDrawio(diagramName(name,true),native||QuickBiteDrawio.toXml(JSON.parse(legacy)));
 }catch(error){drawioStatus(error.message);}
};
const saveLegacyModelBeforeDrawio=saveModel;
saveModel=async function(){
 if(drawioSession){drawioStatus('Close the visual editor before saving from the legacy editor.');return;}
 const name=$('modelName').value.slice(0,3).toUpperCase()+$('modelName').value.slice(3);
 if(browserStore.get('workspace/models/'+name+'.drawio')){$('modelCheck').textContent='A draw.io version exists under this name. Use a different save name with the same task prefix to keep both versions.';return;}
 return saveLegacyModelBeforeDrawio();
};
