/* Read-only teaching resources; never part of the student project store. */
function moduleMaterialsHtml(code){
 const materials=(browserCourse.lecture_materials||[]).filter(item=>item.module===code);
 if(!materials.length)return '';
 return `<article class="lecture-materials" aria-label="Lecture slides"><div class="eyebrow">Read · understand · apply</div><h3>Lecture slides</h3><p>Theory and worked examples, including Car Rental. Apply the method to your own QuickBite project; example-company facts are not QuickBite requirements. Use the task cards for required work and save locations.</p><div class="lecture-grid">${materials.map(item=>{
  const url='/materials/'+item.file,label=item.sessions.length===1?'Session '+item.sessions[0]:'Sessions '+item.sessions.join('–');
  return `<section class="lecture-card"><div class="eyebrow">${esc(item.module)} · ${esc(label)}</div><h4>${esc(item.title)}</h4><p>${esc(item.description)}</p><p class="muted">PDF · ${item.pages} pages · ${(item.bytes/1000000).toFixed(1)} MB</p><div class="actions"><a class="lecture-open" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Open PDF <span aria-hidden="true">↗</span></a><a href="${esc(url)}" download>Download PDF</a></div><ul class="lecture-reading">${item.reading.map(part=>`<li><a href="${esc(url)}#page=${part.first}" target="_blank" rel="noopener noreferrer">${esc(part.label)} <span class="muted">pp. ${part.first}–${part.last}</span></a></li>`).join('')}</ul>${item.note?`<p class="lecture-note">${esc(item.note)}</p>`:''}<details class="lecture-preview" ontoggle="loadLecturePreview(this)"><summary>Preview slides here</summary><iframe data-src="${esc(url)}#view=FitH" title="${esc(label+': '+item.title)}" loading="lazy"></iframe><p class="muted">If the preview is unavailable, use Open PDF or Download PDF above.</p></details></section>`;
 }).join('')}</div><p class="muted lecture-footer">Lecture PDFs are available here and are not added to your project ZIP.</p></article>`;
}
function loadLecturePreview(details){
 const frame=details.querySelector('iframe');
 if(details.open&&!frame.getAttribute('src'))frame.setAttribute('src',frame.dataset.src);
}
const theoryWithoutLectureSlides=theoryCards;
theoryCards=function(module){return moduleMaterialsHtml(module.code)+theoryWithoutLectureSlides(module);};
