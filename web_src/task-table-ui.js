/* The hidden answer is the same Markdown captured by Save answer and backups. */
const tableAnswers=new Map(),tableTextMode=new Set(),tableUndo=new Map();
function tableInput(path,value,label){return `<textarea rows="2" data-table-path="${path}" aria-label="${esc(label)}">${esc(value)}</textarea>`;}
function tableAction(id,action,label,index=''){return `<button type="button" class="secondary" onclick="changeTaskTable('${id}','${action}'${index===''?'':','+index})">${label}</button>`;}
function renderTaskTable(id,data){
 tableAnswers.set(id,data);
 let table;
 if(id==='M04.04'){
  table=`<table class="dictionary-table"><caption>Data dictionary — repeat the structure name for each field</caption><thead><tr>${QuickBiteTaskTables.HEADERS.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}<th scope="col">Rows</th></tr></thead><tbody>${data.rows.map((r,i)=>`<tr>${r.map((v,j)=>`<td>${tableInput(`rows.${i}.${j}`,v,`Dictionary row ${i+1}: ${QuickBiteTaskTables.HEADERS[j]}`)}</td>`).join('')}<td>${tableAction(id,'remove-row','Remove row '+(i+1),i)}</td></tr>`).join('')}</tbody></table>`;
 }else{
  table=`<table class="access-table"><caption>Access matrix — select permitted actions and name denied operations explicitly</caption><thead><tr><th scope="col">Role / resource</th>${data.resources.map((name,c)=>`<th scope="col">${tableInput('resources.'+c,name,'Resource '+(c+1)+' name')}${tableAction(id,'remove-resource','Remove resource '+(c+1),c)}</th>`).join('')}<th scope="col">Roles</th></tr></thead><tbody>${data.roles.map((role,r)=>`<tr><th scope="row">${tableInput('roles.'+r,role,'Role '+(r+1)+' name')}</th>${data.cells[r].map((cell,c)=>`<td><fieldset><legend>Role ${r+1} / resource ${c+1}</legend>${QuickBiteTaskTables.OPS.map(op=>`<label class="permission-choice"><input type="checkbox" data-table-path="cells.${r}.${c}.allowed" data-operation="${op}" ${cell.allowed.includes(op)?'checked':''}>${op}</label>`).join('')}</fieldset>${[['other','Other permitted actions'],['denied','Denied operation(s)'],['reason','Denial justification — responsibility or risk']].map(([key,label])=>`<label>${label}${tableInput(`cells.${r}.${c}.${key}`,cell[key],`Role ${r+1} / resource ${c+1}: ${label}`)}</label>`).join('')}</td>`).join('')}<td>${tableAction(id,'remove-row','Remove role '+(r+1),r)}</td></tr>`).join('')}</tbody></table>`;
 }
 const notes=id==='M04.04'?'Protection note, assumptions and existing answer':'Additional notes and existing answer';
 return `<div class="task-table-editor" data-task-table="${id}"><p>Use your own project data. You can save a partial draft.${id==='M04.05'?' Empty permission cells mean unspecified; they do not mean denied.':''}</p><div class="task-table-scroll" role="region" aria-label="${id==='M04.04'?'Data dictionary':'Access matrix'} table" tabindex="0">${table}</div><div class="actions">${tableAction(id,'add-row',id==='M04.04'?'Add field row':'Add role')}${id==='M04.05'?tableAction(id,'add-resource','Add resource'):''}${tableUndo.has(id)?tableAction(id,'undo','Undo last removal'):''}</div><label>${notes}${tableInput('notes',data.notes,notes)}</label><button type="button" class="secondary" onclick="useTaskText('${id}')">Edit as text / Markdown</button></div>`;
}
function taskAnswerEditor(id,saved,tableData=null){
 const text=QuickBiteLearning.meaningful(saved)?saved:'';
 const supported=QuickBiteTaskTables.IDS.includes(id),data=supported?(tableData||QuickBiteTaskTables.parse(id,text)):null;
 const table=supported&&!tableTextMode.has(id)&&(data||!text);
 return `<div id="task_editor_${id.replace('.','_')}">${table?renderTaskTable(id,data||QuickBiteTaskTables.empty(id)):''}<label ${table?'hidden':''}>Your answer for ${id}<textarea aria-label="Your answer for ${id}" id="answer_${id.replace('.','_')}">${esc(text)}</textarea></label>${supported&&!table?`<p>Existing text is kept exactly as written. Opening the table keeps this entire answer in its notes field.</p><button type="button" class="secondary" onclick="useTaskTable('${id}')">${data?'Open table editor':'Use table and keep existing text in notes'}</button>`:''}</div>`;
}
function collectTaskTable(id){
 const data=tableAnswers.get(id),editor=$('task_editor_'+id.replace('.','_'));
 editor.querySelectorAll('[data-table-path]').forEach(el=>{
  const parts=el.dataset.tablePath.split('.'),key=parts.pop();let target=data;for(const part of parts)target=target[part];
  if(el.dataset.operation){const values=new Set(target[key]);if(el.checked)values.add(el.dataset.operation);else values.delete(el.dataset.operation);target[key]=QuickBiteTaskTables.OPS.filter(op=>values.has(op));}
  else target[key]=el.value;
 });
 return data;
}
function recordTaskTable(id,data){
 const text=QuickBiteTaskTables.hasContent(data)?QuickBiteTaskTables.serialize(id,data):'';
 $('answer_'+id.replace('.','_')).value=text;taskDrafts.set(id,text);
}
function redrawTaskTable(id,data){
 const text=QuickBiteTaskTables.hasContent(data)?QuickBiteTaskTables.serialize(id,data):'';
 $('task_editor_'+id.replace('.','_')).outerHTML=taskAnswerEditor(id,text,data);recordTaskTable(id,data);
}
function changeTaskTable(id,action,index){
 let data=collectTaskTable(id);const T=QuickBiteTaskTables;
 if(action==='undo'){data=tableUndo.get(id);if(!data)return;tableUndo.delete(id);}
 else if(action==='add-row'){
  if(id==='M04.04')data.rows.push(T.HEADERS.map(()=>''));else{data.roles.push('');data.cells.push(data.resources.map(T.cell));}
 }else if(action==='add-resource'){data.resources.push('');data.cells.forEach(row=>row.push(T.cell()));}
 else{
  const size=action==='remove-resource'?data.resources.length:id==='M04.04'?data.rows.length:data.roles.length;
  if(size<=1)return;
  tableUndo.set(id,JSON.parse(JSON.stringify(data)));
  if(action==='remove-resource'){data.resources.splice(index,1);data.cells.forEach(row=>row.splice(index,1));}
  else if(id==='M04.04')data.rows.splice(index,1);else{data.roles.splice(index,1);data.cells.splice(index,1);}
 }
 redrawTaskTable(id,data);
}
function useTaskText(id){
 const data=collectTaskTable(id);recordTaskTable(id,data);tableTextMode.add(id);
 $('task_editor_'+id.replace('.','_')).outerHTML=taskAnswerEditor(id,$('answer_'+id.replace('.','_')).value);
}
function useTaskTable(id){
 const text=$('answer_'+id.replace('.','_')).value,data=QuickBiteTaskTables.parse(id,text)||QuickBiteTaskTables.empty(id);
 if(text&&!QuickBiteTaskTables.parse(id,text))data.notes=text;
 tableTextMode.delete(id);redrawTaskTable(id,data);
}
document.addEventListener('input',event=>{
 const editor=event.target.closest('[data-task-table]');if(!editor)return;
 const id=editor.dataset.taskTable;recordTaskTable(id,collectTaskTable(id));
});

function clearTaskTableSession(){tableAnswers.clear();tableTextMode.clear();tableUndo.clear();}
