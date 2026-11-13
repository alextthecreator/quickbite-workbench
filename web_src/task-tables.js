/* Editable answers remain ordinary Markdown in the existing task/report files. */
(function(root){
 'use strict';
 const IDS=['M04.04','M04.05'],OPS=['Read','Create','Update','Delete'];
 const HEADERS=['Structure','Field','Meaning / purpose','Type','Constraints','Assumptions'];
 const encode=s=>String(s).replace(/[&<>|\r\n]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','|':'&#124;','\r':'&#13;','\n':'&#10;'}[c]));
 const decode=s=>s.replace(/&(?:amp|lt|gt|#124|#13|#10);/g,c=>({'&amp;':'&','&lt;':'<','&gt;':'>','&#124;':'|','&#13;':'\r','&#10;':'\n'}[c]));
 const cell=()=>({allowed:[],other:'',denied:'',reason:''});
 function empty(id){return id==='M04.04'?{rows:Array.from({length:3},()=>HEADERS.map(()=>'')),notes:''}:{roles:Array(4).fill(''),resources:Array(4).fill(''),cells:Array.from({length:4},()=>Array.from({length:4},cell)),notes:''};}
 const row=values=>'| '+values.join(' | ')+' |';
 function serialize(id,data){
  if(!IDS.includes(id))throw Error('Unknown table task.');
  const headers=id==='M04.04'?HEADERS:['Role / resource',...data.resources];
  const rows=id==='M04.04'?data.rows.map(r=>r.map(encode)):data.roles.map((role,r)=>[encode(role),...data.cells[r].map(c=>[
   c.allowed.join(', ')||'—','Other permitted: '+encode(c.other),'Denied: '+encode(c.denied),'Justification: '+encode(c.reason)
  ].join('<br>'))]);
  return ['<!-- QUICKBITE TABLE '+id+' v1 -->',row(headers.map(encode)),row(headers.map(()=>'---')),...rows.map(row),'',id==='M04.04'?'#### Protection note and assumptions':'#### Additional notes','',data.notes].join('\n');
 }
 function parse(id,text){
  if(typeof text!=='string'||!text.startsWith('<!-- QUICKBITE TABLE '+id+' v1 -->\n'))return null;
  try{
   const lines=text.split('\n'),read=line=>{if(!line?.startsWith('| ')||!line.endsWith(' |'))throw Error();return line.slice(2,-2).split(' | ');};
   const headers=read(lines[1]),separators=read(lines[2]);
   if(headers.length!==separators.length||separators.some(s=>s!=='---'))return null;
   let at=3;const rows=[];while(lines[at]?.startsWith('| ')){const r=read(lines[at++]);if(r.length!==headers.length)return null;rows.push(r);}
   const heading=id==='M04.04'?'#### Protection note and assumptions':'#### Additional notes';
   if(lines[at++]!==''||lines[at++]!==heading||lines[at++]!=='')return null;
   const notes=lines.slice(at).join('\n');let data;
   if(id==='M04.04'){
    if(JSON.stringify(headers)!==JSON.stringify(HEADERS)||!rows.length)return null;
    data={rows:rows.map(r=>r.map(decode)),notes};
   }else{
    if(id!=='M04.05'||headers[0]!=='Role / resource'||headers.length<2||!rows.length)return null;
    data={roles:rows.map(r=>decode(r[0])),resources:headers.slice(1).map(decode),cells:rows.map(r=>r.slice(1).map(s=>{
     const bits=s.split('<br>');if(bits.length!==4||!bits[1].startsWith('Other permitted: ')||!bits[2].startsWith('Denied: ')||!bits[3].startsWith('Justification: '))throw Error();
     const allowed=bits[0]==='—'?[]:bits[0].split(', ');if(allowed.some(op=>!OPS.includes(op))||new Set(allowed).size!==allowed.length)throw Error();
     return {allowed,other:decode(bits[1].slice(17)),denied:decode(bits[2].slice(8)),reason:decode(bits[3].slice(15))};
    })),notes};
   }
   // Hand-edited or older prose stays text unless it can be reopened without loss.
   return serialize(id,data)===text?data:null;
  }catch{return null;}
 }
 function hasContent(data){return Object.values(data).some(value=>Array.isArray(value)?value.some(v=>typeof v==='object'&&v!==null?hasContent(v):String(v).trim()):typeof value==='object'&&value!==null?hasContent(value):String(value).trim());}
 root.QuickBiteTaskTables={IDS,OPS,HEADERS,empty,cell,serialize,parse,hasContent};
 if(typeof module!=='undefined'&&module.exports)module.exports=root.QuickBiteTaskTables;
})(typeof globalThis!=='undefined'?globalThis:this);
