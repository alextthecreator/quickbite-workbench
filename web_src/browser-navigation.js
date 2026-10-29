/* Attach URL navigation after the existing browser project has loaded. */
async function installNavigation(){
 const renderTab=showModuleTab,renderModule=loadModule;
 let painting=false,loadingModule=false,modelDraftActive=false,simDraftActive=false;
 const modelFields=['modelName','modelEditor','modelKind'],simFields=['simModule','simInput','engineSelect'];
 const values=ids=>Object.fromEntries(ids.map(id=>[id,$(id).value]));
 const restore=fields=>Object.entries(fields).forEach(([id,value])=>{$(id).value=value;});
 for(const id of modelFields)for(const event of ['input','change'])$(id).addEventListener(event,()=>{modelDraftActive=true;});
 for(const id of simFields)for(const event of ['input','change'])$(id).addEventListener(event,()=>{simDraftActive=true;});
 const openSavedModel=loadSavedModel,openSavedRun=loadSavedRun,newStarter=loadStarter;
 loadSavedModel=async function(){modelDraftActive=true;return openSavedModel();};
 loadSavedRun=function(){simDraftActive=true;return openSavedRun();};
 loadStarter=function(){modelDraftActive=true;return newStarter();};
 loadModule=async function(code){
  const model=modelDraftActive?values(modelFields):null,sim=simDraftActive?values(simFields):null;
  loadingModule=true;
  try{return await renderModule(code);}
  finally{loadingModule=false;if(model)restore(model);if(sim)restore(sim);}
 };
 const router=QuickBiteRouter.create({
  window,
  beforeLeave:async(target)=>{
   if(typeof guardDrawioNavigation==='function')guardDrawioNavigation(target);
   if(contextDirty&&target.page!=='context')throw Error('Save your stakeholder/scope changes before leaving Your project.');
   await flushEditors();
  },
  render:async(route)=>{
   painting=true;
   try{
    if(route.page==='task'&&loadedModuleCode!==route.module)await loadModule(route.module);
    if(route.page==='brief')$('brief').innerHTML=projectBriefHtml();
    if(route.page==='context')$('context').innerHTML=contextFormHtml();
    oldShow(route.page);
    if(route.page==='task'){
     renderTab(route.tab);
     const module=COURSE.modules.find(m=>m.code===route.module);
     $('pageTitle').textContent=module.code+' — '+module.title;
     if(route.task)$('task_'+route.module+'_'+route.task)?.scrollIntoView({block:'start'});
    }
    refreshSavedEvidence();updateLearningAccess();
   }finally{painting=false;}
  },
  onError:error=>{if(loadedModuleCode)$('moduleSelect').value=loadedModuleCode;showError(error);}
 });
 show=function(page){return router.navigate(page==='task'?{page,module:loadedModuleCode||$('moduleSelect').value,tab:'theory'}:{page},{refresh:page==='files'||page==='overview'});};
 openModule=function(code){return router.navigate({page:'task',module:code,tab:'theory'});};
 showModuleTab=function(tab){if(painting||loadingModule)return renderTab(tab);return router.navigate({page:'task',module:loadedModuleCode||$('moduleSelect').value,tab});};
 goToTask=function(id){return router.navigate({page:'task',module:id.slice(0,3),tab:'taskwork',task:id.slice(4)});};
 $('moduleSelect').onchange=()=>openModule($('moduleSelect').value);
 // Exposed for integration checks and to await a settled view after history events.
 window.quickbiteNavigation=router;
 await router.start();
}
