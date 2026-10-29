/* Lossless retention of legacy sources; native draw.io files are separate. */
(function(root){
 'use strict';
 const ORIGIN='https://embed.diagrams.net';
 const URL=ORIGIN+'/?embed=1&proto=json&spin=1&libraries=1&saveAndExit=1&lang=en';
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])).replace(/\r/g,'&#13;').replace(/\n/g,'&#10;');
 const styles={actor:'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;',usecase:'ellipse;',system:'rounded=0;verticalAlign=top;align=left;spacingTop=8;',action:'rounded=1;',decision:'rhombus;',initial:'ellipse;fillColor=#17233a;strokeColor=#17233a;',final:'shape=doubleEllipse;fillColor=#17233a;',class:'rounded=0;align=left;',package:'shape=folder;tabWidth=70;tabHeight=22;',state:'rounded=1;',process:'ellipse;',external:'rounded=0;',store:'shape=partialRectangle;left=0;right=0;',deployment:'rounded=0;',lifeline:'shape=umlLifeline;perimeter=lifelinePerimeter;size=55;'};
 function dimensions(node){
  if(node.type==='system')return [Number(node.width)||700,Number(node.height)||500];
  if(['initial','final'].includes(node.type))return [40,40];
  if(node.type==='decision')return [100,80];
  if(node.type==='actor')return [120,140];
  if(node.type==='lifeline')return [180,420];
  return [240,Math.max(85,28*String(node.label||'').split('\n').length+35)];
 }
 function toXml(model){
  if(!model||!Array.isArray(model.nodes)||model.nodes.length>40||!model.nodes.length||!Array.isArray(model.edges||[])||(model.edges||[]).length>80)throw Error('Invalid legacy model.');
  const ids=new Map();model.nodes.forEach((node,index)=>{if(!node||typeof node.id!=='string'||ids.has(node.id)||!styles[node.type])throw Error('Invalid legacy model node.');ids.set(node.id,'qb_n'+index);});
  const cells=['<mxCell id="0"/><mxCell id="1" parent="0"/>'];
  // Boundaries precede contained shapes so they stay behind the diagram.
  for(const node of [...model.nodes].sort((a,b)=>Number(b.type==='system')-Number(a.type==='system'))){
   const [width,height]=dimensions(node),x=node.x??0,y=node.y??0;
   if(![x,y,width,height].every(value=>typeof value==='number'&&Number.isFinite(value)))throw Error('Invalid legacy coordinates.');
   cells.push(`<mxCell id="${ids.get(node.id)}" value="${escape(node.label||'')}" style="${escape(styles[node.type]+'whiteSpace=wrap;html=0;fontSize=16;strokeWidth=2;fillColor=#ffffff;')}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry"/></mxCell>`);
  }
  for(const [index,edge] of (model.edges||[]).entries()){
   if(!ids.has(edge.from)||!ids.has(edge.to))throw Error('Legacy flow references a missing node.');
   const style=edge.style||'flow',dashed=['dependency','return','include','extend'].includes(style),label=(style==='include'?'«include» ':style==='extend'?'«extend» ':'')+String(edge.label||'');
   cells.push(`<mxCell id="qb_e${index}" value="${escape(label)}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=0;whiteSpace=wrap;labelWidth=180;fontSize=14;labelBackgroundColor=#ffffff;endArrow=${style==='association'?'none':'block'};endFill=1;dashed=${dashed?1:0};" edge="1" parent="1" source="${ids.get(edge.from)}" target="${ids.get(edge.to)}"><mxGeometry relative="1" as="geometry"/></mxCell>`);
  }
  return '<mxfile host="QuickBite"><diagram id="quickbite" name="Diagram"><mxGraphModel grid="1" gridSize="10" page="0"><root>'+cells.join('')+'</root></mxGraphModel></diagram></mxfile>';
 }
 function validName(name,course){
  if(typeof name!=='string'||!/^[A-Za-z0-9_-]{1,60}$/.test(name))throw Error('Choose a save name using letters, numbers, _ or -.');
  const canonical=name.slice(0,3).toUpperCase()+name.slice(3),module=course.modules.find(item=>item.code===canonical.slice(0,3));
  if(!module||!module.task_specs.some(task=>(task.evidence||[]).some(e=>('workspace/models/'+canonical).toLowerCase().startsWith(e.prefix.toLowerCase()))))throw Error('Use the model save name from the task card, for example M03_usecase or M04_context.');
  return canonical;
 }
 function acceptMessage(event,source){
  if(event.origin!==ORIGIN||event.source!==source||typeof event.data!=='string'||event.data.length>20_000_000)return null;
  try{const message=JSON.parse(event.data);return message&&typeof message==='object'&&!Array.isArray(message)?message:null;}catch{return null;}
 }
 function replyToken(reply){
  const request=reply?.message;
  if(request&&typeof request==='object')return request.action==='export'?request.message:null;
  if(typeof request==='string'){try{const parsed=JSON.parse(request);return parsed?.action==='export'?parsed.message:request;}catch{return request;}}
  return null;
 }
 function filesForSave(files,name,xml,svg){
  if(!/^[A-Za-z0-9_-]{1,60}$/.test(name))throw Error('Invalid diagram name.');
  if(typeof xml!=='string'||xml.length>3_000_000||!/\s*<(?:\?xml[^>]*>\s*)?(?:mxfile|mxGraphModel)\b/.test(xml)||/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Invalid draw.io diagram.');
  if(typeof svg!=='string'||svg.length>5_000_000||!/<svg\b/.test(svg)||/<!DOCTYPE|<!ENTITY/i.test(svg))throw Error('Invalid diagram preview.');
  return {...files,['workspace/models/'+name+'.drawio']:xml,['workspace/models/'+name+'.svg']:svg};
 }
 root.QuickBiteDrawio={ORIGIN,URL,toXml,validName,acceptMessage,replyToken,filesForSave};
 if(typeof module!=='undefined'&&module.exports)module.exports=root.QuickBiteDrawio;
})(typeof globalThis!=='undefined'?globalThis:this);
