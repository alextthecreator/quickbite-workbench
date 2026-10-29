/* Derived display geometry only. Never mutate the student's model or coordinates. */
(function(root){
 'use strict';
 const ELKClass=typeof module!=='undefined'&&module.exports?require('elkjs/lib/elk.bundled.js'):root.ELK;
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function wrap(text,limit){
  const lines=[];
  for(const paragraph of String(text).split('\n')){
   let line='';
   for(const word of paragraph.split(/\s+/).filter(Boolean)){
    const chunks=word.match(new RegExp('.{1,'+limit+'}','gu'))||[''];
    for(const part of chunks){if(line&&line.length+part.length+1>limit){lines.push(line);line='';}line+=(line?' ':'')+part;}
   }
   lines.push(line);
  }
  return lines;
 }
 function validate(model){
  if(!model||model.kind!=='dfd'||!Array.isArray(model.nodes)||model.nodes.length<1||model.nodes.length>40||!Array.isArray(model.edges||[])||(model.edges||[]).length>80)throw Error('Invalid DFD node/flow count.');
  const ids=new Set(),types=new Set(['actor','usecase','system','action','decision','initial','final','class','package','state','process','external','store','deployment','lifeline']);
  for(const node of model.nodes){
   if(!node||typeof node.id!=='string'||!node.id||ids.has(node.id)||!types.has(node.type)||typeof(node.label??'')!=='string'||(node.label||'').length>500)throw Error('Invalid DFD node.');
   ids.add(node.id);
   for(const key of ['x','y']){const value=key in node?node[key]:0;if(typeof value!=='number'||!Number.isFinite(value)||value<-100||value>2500)throw Error('Invalid coordinate.');}
  }
  for(const edge of model.edges||[])if(!edge||!ids.has(edge.from)||!ids.has(edge.to)||!['flow','association','dependency','return','include','extend'].includes(edge.style||'flow')||String(edge.label||'').length>180)throw Error('Invalid DFD flow.');
 }
 function graphFor(model,direction='DOWN'){
  validate(model);
  return {id:'dfd',layoutOptions:{
   'elk.algorithm':'layered','elk.direction':direction==='RIGHT'?'RIGHT':'DOWN','elk.edgeRouting':'ORTHOGONAL',
   'elk.spacing.nodeNode':'70','elk.layered.spacing.nodeNodeBetweenLayers':'110',
   'elk.spacing.edgeNode':'36','elk.layered.spacing.edgeNodeBetweenLayers':'36',
   'elk.spacing.edgeEdge':'24','elk.layered.spacing.edgeEdgeBetweenLayers':'24',
   'elk.spacing.labelNode':'20','elk.spacing.edgeLabel':'10',
   'elk.layered.mergeEdges':'false','elk.layered.edgeLabels.sideSelection':'ALWAYS_UP',
   'elk.padding':'[top=60,left=60,bottom=60,right=60]','elk.randomSeed':'1'
  },children:model.nodes.map((node,index)=>{
   const lines=wrap(node.label||node.id,25);
   return {id:'n'+index,width:250,height:Math.max(96,lines.length*22+50),labels:[{text:node.label||node.id}],layoutOptions:{'elk.nodeLabels.placement':'INSIDE, CENTER'}};
  }),edges:(model.edges||[]).map((edge,index)=>{
   const lines=wrap(edge.label||'',28),text=String(edge.label||'');
   return {id:'e'+index,sources:['n'+model.nodes.findIndex(node=>node.id===edge.from)],targets:['n'+model.nodes.findIndex(node=>node.id===edge.to)],labels:text?[{id:'l'+index,text,width:Math.max(...lines.map(line=>line.length))*7.6+20,height:lines.length*19+14,layoutOptions:{'elk.edgeLabels.placement':'CENTER','elk.edgeLabels.inline':'true'}}]:[]};
  })};
 }
 function multiline(lines,x,y,lineHeight,css){return `<text x="${x}" y="${y}" text-anchor="middle" class="${css}">`+lines.map((line,i)=>`<tspan x="${x}" dy="${i?lineHeight:0}">${escape(line)}</tspan>`).join('')+'</text>';}
 function svgFor(model,graph){
  const width=Math.ceil(graph.width),height=Math.ceil(graph.height),by=new Map(model.nodes.map(node=>[node.id,node]));
  const out=[`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="dfd-title dfd-description"><title id="dfd-title">Data-flow diagram</title><desc id="dfd-description">Automatic layout of ${model.nodes.length} nodes and ${(model.edges||[]).length} directed data flows. Original node positions are unchanged.</desc>`,
   '<defs><marker id="dfd-arrow" markerWidth="10" markerHeight="10" refX="9" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L0,8 L9,4 Z" fill="#475569"/></marker></defs>',
   '<style>text{font-family:Arial,sans-serif;fill:#182841}.dfd-node-text{font-size:16px;font-weight:600}.dfd-type{font-size:10px;font-weight:700;letter-spacing:1.1px;fill:#64748b}.dfd-flow-text{font-size:14px}.dfd-edge path{fill:none;stroke:#64748b;stroke-width:1.8;stroke-linejoin:round}.dfd-label-bg{fill:#fff;stroke:#e2e8f0;stroke-width:.6}.dfd-flow-number{font-size:11px;fill:#64748b}.dfd-edge.selected path{stroke:#155eef;stroke-width:3.5}</style>',
   `<rect width="${width}" height="${height}" fill="#fff"/>`];
  for(const edge of graph.edges){const original=model.edges[Number(edge.id.slice(1))];out.push(`<g class="dfd-edge" data-flow="${edge.id.slice(1)}"><title>${escape((by.get(original.from).label||original.from)+' → '+(by.get(original.to).label||original.to)+': '+(original.label||''))}</title>`);
   for(const section of edge.sections||[]){const points=[section.startPoint,...section.bendPoints||[],section.endPoint];out.push(`<path d="${points.map((p,i)=>(i?'L':'M')+p.x+','+p.y).join(' ')}"${original.style==='association'?'':' marker-end="url(#dfd-arrow)"'}${['dependency','return','include','extend'].includes(original.style)?' stroke-dasharray="7 5"':''}/>`);}
   out.push('</g>');
  }
  // All labels are painted over paths on opaque cards; ELK reserves room for them.
  for(const edge of graph.edges){const original=model.edges[Number(edge.id.slice(1))];for(const label of edge.labels||[]){const lines=wrap(original.label||'',28),cx=label.x+label.width/2;
   out.push(`<g class="dfd-edge-label" data-flow="${edge.id.slice(1)}"><rect class="dfd-label-bg" x="${label.x}" y="${label.y}" width="${label.width}" height="${label.height}" rx="5"/>`+multiline(lines,cx,label.y+20,19,'dfd-flow-text')+'</g>');
  }}
  for(const [index,node] of graph.children.entries()){const original=model.nodes[index],lines=wrap(original.label||original.id,25),x=node.x,y=node.y,w=node.width,h=node.height,typ=original.type;
   out.push(`<g class="dfd-node" data-node="${index}"><title>${escape(original.label||original.id)}</title>`);
   if(typ==='store')out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fffaf0"/><path d="M${x},${y} H${x+w} M${x},${y+h} H${x+w}" fill="none" stroke="#946b23" stroke-width="2"/>`);
   else out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${typ==='process'?18:3}" fill="${typ==='process'?'#eef4ff':'#f8fafc'}" stroke="${typ==='process'?'#4263c7':'#475569'}" stroke-width="2"/>`);
   out.push(`<text class="dfd-type" x="${x+w/2}" y="${y+23}" text-anchor="middle">${escape({process:'PROCESS',external:'EXTERNAL ENTITY',store:'DATA STORE'}[typ]||typ.toUpperCase())}</text>`+multiline(lines,x+w/2,y+50+(h-50-lines.length*22)/2,22,'dfd-node-text')+'</g>');
  }
  out.push('</svg>');return out.join('');
 }
 async function layout(model,direction){const graph=await new ELKClass().layout(graphFor(model,direction));return {svg:svgFor(model,graph),check:'Automatic DFD layout · separate directed flows and wrapped labels. Layout does not check semantic correctness.',graph};}
 root.QuickBiteDFD={layout,graphFor,svgFor,validate,wrap};
 if(typeof module!=='undefined'&&module.exports)module.exports=root.QuickBiteDFD;
})(typeof globalThis!=='undefined'?globalThis:this);
