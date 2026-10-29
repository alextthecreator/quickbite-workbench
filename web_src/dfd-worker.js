/* Local automatic layout. No model data is sent to a server. */
importScripts('/assets/elk.bundled.js','/assets/dfd-layout.js');
onmessage=async({data})=>{
 try{const result=await QuickBiteDFD.layout(data.model,data.direction);postMessage({id:data.id,svg:result.svg,check:result.check});}
 catch(error){postMessage({id:data.id,error:error.message||String(error)});}
};
