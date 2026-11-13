function removeReportInUpload(row){const item=document.getElementById(`report-existing-${row}`);if(item)item.hidden=true;document.getElementById(`report-removed-${row}`).value='1';}
function openReportUpload(taskId,subId){
  const t=tasks.find(t=>t.id===taskId);if(!t||t.status!=='已进单')return;
  const rows=subId?t.subs.filter(s=>s.id===subId&&!isReviewed(s)):t.subs.filter(s=>!isReviewed(s));if(!rows.length){toast('已审核的子任务不可再上传报告');return;}
  document.getElementById('modal').innerHTML=`<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="report-upload-title" style="width:900px"><div class="dialoghead"><h2 id="report-upload-title">${subId?'子任务上传报告':'主任务批量上传报告'}</h2><button onclick="closeModal()">×</button></div><div class="dialogbody"><p>主任务：${esc(t.id)}。每个子任务保留一份当前报告；选择新文件可替换现有报告。</p><table><thead><tr><th>子任务单号</th><th>当前报告与退回备注</th><th>上传或替换报告</th><th><span class="required-star" aria-hidden="true">*</span>子任务报告状态</th></tr></thead><tbody>${rows.map((s,i)=>{const current=(s.reportFiles||[])[0],lastReturn=(s.reportReturnHistory||[]).at(-1);return `<tr data-report-sub="${esc(s.id)}"><td>${esc(s.id)}</td><td><input id="report-removed-${i}" type="hidden" value="0">${current?`<div id="report-existing-${i}" class="report-file-edit"><strong>${esc(current.name)}</strong><button type="button" class="link" aria-label="移除子任务${esc(s.id)}报告" onclick="removeReportInUpload(${i})">×</button><label class="report-remark-input">报告备注（最多200字）<textarea id="report-existing-remark-${i}" maxlength="200">${esc(current.remark||'')}</textarea></label></div>`:'暂无报告'}${s.reportStatus==='报告退回'&&lastReturn?`<div class="return-reason">退回备注：${esc(lastReturn.remark)}</div>`:''}</td><td><input type="file" id="report-file-${i}" aria-label="子任务${esc(s.id)}报告文件" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onchange="renderNewReportRemarks(${i})"><div id="report-new-remarks-${i}"></div></td><td><select id="report-status-${i}" aria-label="子任务${esc(s.id)}报告状态"><option value="">请选择状态</option><option value="已出但未出全" ${s.reportStatus==='已出但未出全'?'selected':''}>已出但未出全</option><option value="已出全" ${s.reportStatus==='已出全'?'selected':''}>已出全</option></select></td></tr>`}).join('')}</tbody></table><div id="report-upload-error" class="error" role="alert"></div></div><div class="dialogfooter"><button onclick="closeModal()">取消</button><button class="primary" onclick="confirmReportUpload('${t.id}',${subId?`'${subId}'`:'null'})">保存报告</button></div></section></div>`;
}
function renderNewReportRemarks(i){const file=document.getElementById(`report-file-${i}`).files[0];document.getElementById(`report-new-remarks-${i}`).innerHTML=file?`<label class="report-remark-input">${esc(file.name)} · 报告备注（最多200字）<textarea id="report-new-remark-${i}" maxlength="200" placeholder="请输入报告备注"></textarea></label>`:'';}
async function confirmReportUpload(taskId,subId){
  const t=tasks.find(t=>t.id===taskId);if(!t||t.status!=='已进单')return;const rows=subId?t.subs.filter(s=>s.id===subId&&!isReviewed(s)):t.subs.filter(s=>!isReviewed(s));const error=document.getElementById('report-upload-error'),blobs=[],removed=[],changes=[];
  for(const [i,s] of rows.entries()){
    const oldFiles=s.reportFiles||[],old=oldFiles[0],fileInput=document.getElementById(`report-file-${i}`),newFile=fileInput.files[0],isRemoved=document.getElementById(`report-removed-${i}`).value==='1',status=document.getElementById(`report-status-${i}`).value;
    if(fileInput.files.length>1){error.textContent=`${s.id} 只能上传一个报告`;return;}
    const oldRemark=document.getElementById(`report-existing-remark-${i}`)?.value.trim()||'',newRemark=document.getElementById(`report-new-remark-${i}`)?.value.trim()||'';
    if(oldRemark.length>200||newRemark.length>200){error.textContent='报告备注最多输入200字';return;}
    let next=null;
    if(newFile){const id=newReportId();blobs.push({id,file:newFile});next={id,name:newFile.name,size:newFile.size,type:newFile.type,remark:newRemark};removed.push(...oldFiles.map(f=>f.id).filter(Boolean));}
    else if(!isRemoved&&old){next={...old,remark:oldRemark};removed.push(...oldFiles.slice(1).map(f=>f.id).filter(Boolean));}
    else removed.push(...oldFiles.map(f=>f.id).filter(Boolean));
    if(next&&!status){error.textContent=`${s.id} 请选择报告状态`;return;}
    if(newFile||isRemoved||oldFiles.length>1||JSON.stringify(next)!==JSON.stringify(old||null)||status!==s.reportStatus)changes.push({s,next,status});
  }
  if(!changes.length){error.textContent='请选择报告文件或修改现有报告';return;}
  const historicalIds=new Set(tasks.flatMap(task=>task.subs.flatMap(sub=>(sub.reportReturnHistory||[]).map(entry=>entry.report?.id).filter(Boolean))));
  try{await saveReportBlobs(blobs);}catch(e){error.textContent='报告文件保存失败，请检查浏览器存储空间';return;}
  changes.forEach(({s,next,status})=>{s.reportFiles=next?[next]:[];s.reportStatus=next?status:'';s.reportIssued=!!next;s.acceptanceStatus=next?status:'已进单';});save();removeReportBlobs(removed.filter(id=>!historicalIds.has(id))).catch(()=>{});closeModal();if(view==='detail')renderDetail();else searchList();toast('报告已保存');
}
