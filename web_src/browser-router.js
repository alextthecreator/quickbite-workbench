/* View addresses only: never read or write the student workspace. */
(function(root){
 'use strict';
 const pages={overview:'start',brief:'brief',context:'project',models:'models',sim:'simulators',code:'python',files:'export'};
 const tabs={theory:'concepts',taskwork:'tasks',report:'report'};
 function format(route){
  if(route.page!=='task')return '#/'+(pages[route.page]||pages.overview);
  const module=/^M(?:0[1-9]|10)$/.test(route.module)?route.module:'M01';
  const tab=tabs[route.tab]||tabs.theory;
  return '#/modules/'+module+'/'+tab+(tab==='tasks'&&/^\d{2}$/.test(route.task||'')?'/'+route.task:'');
 }
 function parse(hash){
  for(const [page,path] of Object.entries(pages))if(hash==='#/'+path)return {page};
  const match=/^#\/modules\/(M(?:0[1-9]|10))(?:\/(concepts|tasks|report))?(?:\/(\d{2}))?$/.exec(hash);
  if(!match||match[3]&&match[2]!=='tasks')return {page:'overview'};
  const tab=Object.keys(tabs).find(key=>tabs[key]===match[2])||'theory';
  return {page:'task',module:match[1],tab,...(match[3]?{task:match[3]}:{})};
 }
 function create({window:win,beforeLeave,render,onError}){
  let current=null,queue=Promise.resolve();
  function navigate(route,{external=false,replace=false,refresh=false}={}){
   // Capture browser-history destinations before a later click can change the URL.
   const target=parse(format(route));
   const operation=queue.then(async()=>{
    const hash=format(target);
    const same=current&&format(current)===hash;
    if(same&&!refresh){if(win.location.hash!==hash)win.history.replaceState(null,'',hash);return true;}
    try{
     await beforeLeave(target,current);
     await render(target,current);
     current=target;
     if(same||external||replace){if(win.location.hash!==hash)win.history.replaceState(null,'',hash);}
     else win.history.pushState(null,'',hash);
     return true;
    }catch(error){
     // A failed save must keep both the current view and its address.
     if(external&&current)win.history.replaceState(null,'',format(current));
     onError(error);return false;
    }
   });
   queue=operation;return operation;
  }
  const fromHistory=()=>navigate(parse(win.location.hash),{external:true});
  win.addEventListener('popstate',fromHistory);
  win.addEventListener('hashchange',fromHistory);
  return {navigate,start:()=>navigate(parse(win.location.hash),{replace:true}),idle:()=>queue,current:()=>current};
 }
 root.QuickBiteRouter={parse,format,create};
 if(typeof module!=='undefined'&&module.exports)module.exports=root.QuickBiteRouter;
})(typeof globalThis!=='undefined'?globalThis:this);
