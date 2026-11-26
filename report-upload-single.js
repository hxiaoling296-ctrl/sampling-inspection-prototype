function reportUploadCurrentStatus(s){
  const status=s.reportStatus||s.acceptanceStatus||'';
  return status==='逾期未出报告'?'已进单':status;
}
function reportUploadRowHTML(t,s,i){
  const returned=s.reportStatus==='报告退回'||s.acceptanceStatus==='报告退回';
  const current=(s.reportFiles||[])[0];
  const status=reportUploadCurrentStatus(s);
  const hasSubmittableReport=!!current&&!returned;
  const options=[
    ['','请选择'],['已出但未出全','已出但未出全'],['已出全','已出全'],
    ['已进单','已进单'],['报告退回','退回']
  ].map(([value,label])=>`<option value="${value}" ${value===status?'selected':''} ${value==='报告退回'||['已出但未出全','已出全'].includes(value)&&!hasSubmittableReport?'disabled':''}>${label}</option>`).join('');
  return `<tr data-report-sub="${esc(s.id)}">
    <td>${esc(s.id)}</td>
    <td>${current?`<div id="report-existing-${i}" class="report-file-edit"><strong>${esc(current.name)}</strong><button type="button" class="link" aria-label="删除子任务${esc(s.id)}已上传报告" onclick="stageDeleteUploadedReport(${i})">删除报告</button><label class="report-remark-input">报告备注<textarea id="report-existing-remark-${i}" maxlength="200" placeholder="最多可填写200字">${esc(current.remark||'')}</textarea></label></div><div id="report-delete-pending-${i}" hidden>报告将在保存后删除 <button type="button" class="link" onclick="undoDeleteUploadedReport(${i})">撤销</button></div>`:'暂无报告'}${returned&&s.reviewReturnRemark?`<div class="return-reason">退回备注：${esc(s.reviewReturnRemark)}</div>`:''}</td>
    <td><input type="file" id="report-file-${i}" aria-label="子任务${esc(s.id)}报告文件" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" ${current?'disabled':''} onchange="renderNewReportRemarks(${i})"><div id="report-new-remarks-${i}"></div></td>
    <td><select id="report-status-${i}" aria-label="子任务${esc(s.id)}状态" data-current-status="${esc(status)}" ${returned&&current?'disabled':''}>${options}</select></td>
  </tr>${(s.reportReturnHistory||[]).length?`<tr class="report-return-history-row"><td colspan="4">${returnedReportsHTML(t,s)}</td></tr>`:''}`;
}
function openReportUpload(taskId,subId){
  const t=tasks.find(t=>t.id===taskId);if(!t||t.status!=='已进单')return;
  const rows=subId?t.subs.filter(s=>s.id===subId&&isActiveSub(t,s)&&canUploadReportSub(s)):t.subs.filter(s=>isActiveSub(t,s)&&canUploadReportSub(s));
  if(!rows.length){toast('当前没有可上传报告的子任务');return;}
  document.getElementById('modal').innerHTML=`<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="report-upload-title" style="width:900px"><div class="dialoghead"><h2 id="report-upload-title">${subId?'子任务上传报告':'主任务批量上传报告'}</h2><button onclick="closeModal()">×</button></div><div class="dialogbody"><p>主任务：${esc(t.id)}。每个子任务保留一份当前报告；已有报告需先删除再上传新文件，也可只修改当前报告备注。</p><table><thead><tr><th>子任务单号</th><th>当前报告与退回备注</th><th>上传报告</th><th><span class="required-star" aria-hidden="true">*</span>子任务状态</th></tr></thead><tbody>${rows.map((s,i)=>reportUploadRowHTML(t,s,i)).join('')}</tbody></table><div id="report-upload-error" class="error" role="alert"></div></div><div class="dialogfooter"><button onclick="closeModal()">取消</button><button class="primary" onclick="confirmReportUpload('${t.id}',${subId?`'${subId}'`:'null'})">保存报告</button></div></section></div>`;
}
function renderNewReportRemarks(i){
  const file=document.getElementById(`report-file-${i}`).files[0];
  const status=document.getElementById(`report-status-${i}`);
  status.querySelectorAll('option').forEach(option=>{if(['已出但未出全','已出全'].includes(option.value))option.disabled=!file;});
  if(!file&&['已出但未出全','已出全'].includes(status.value))status.value=status.dataset.currentStatus||'';
  document.getElementById(`report-new-remarks-${i}`).innerHTML=file?`<label class="report-remark-input">${esc(file.name)} · 报告备注<textarea id="report-new-remark-${i}" maxlength="200" placeholder="最多可填写200字"></textarea></label>`:'';
}
function stageDeleteUploadedReport(i){
  const file=document.getElementById(`report-file-${i}`),row=file.closest('tr'),status=document.getElementById(`report-status-${i}`);
  row.dataset.reportDelete='1';
  document.getElementById(`report-existing-${i}`).hidden=true;
  document.getElementById(`report-delete-pending-${i}`).hidden=false;
  file.disabled=false;
  status.disabled=false;
  status.querySelectorAll('option').forEach(option=>{if(['已出但未出全','已出全'].includes(option.value))option.disabled=true;});
  if(status.dataset.currentStatus!=='报告退回')status.value='已进单';
}
function undoDeleteUploadedReport(i){
  const file=document.getElementById(`report-file-${i}`),row=file.closest('tr'),status=document.getElementById(`report-status-${i}`);
  delete row.dataset.reportDelete;
  document.getElementById(`report-existing-${i}`).hidden=false;
  document.getElementById(`report-delete-pending-${i}`).hidden=true;
  file.value='';file.disabled=true;
  document.getElementById(`report-new-remarks-${i}`).innerHTML='';
  status.value=status.dataset.currentStatus||'';
  status.disabled=status.dataset.currentStatus==='报告退回';
  status.querySelectorAll('option').forEach(option=>{if(['已出但未出全','已出全'].includes(option.value))option.disabled=status.disabled;});
}
async function confirmReportUpload(taskId,subId){
  const t=tasks.find(t=>t.id===taskId);if(!t||t.status!=='已进单')return;
  const rows=subId?t.subs.filter(s=>s.id===subId&&isActiveSub(t,s)&&canUploadReportSub(s)):t.subs.filter(s=>isActiveSub(t,s)&&canUploadReportSub(s));
  const error=document.getElementById('report-upload-error'),blobs=[],removed=[],changes=[];
  if(!rows.length){error.textContent='当前没有可上传报告的子任务';return;}
  for(const [i,s] of rows.entries()){
    const oldFiles=s.reportFiles||[],old=oldFiles[0];
    const returned=s.reportStatus==='报告退回'||s.acceptanceStatus==='报告退回';
    const stagedDelete=document.getElementById(`report-file-${i}`).closest('tr').dataset.reportDelete==='1';
    const current=stagedDelete?null:old;
    const fileInput=document.getElementById(`report-file-${i}`),newFile=fileInput?.files[0];
    const status=document.getElementById(`report-status-${i}`).value;
    if(returned&&!newFile){error.textContent='退回状态子任务必须有文件';return;}
    if(current&&newFile){error.textContent=`${s.id} 已有报告，请先删除后重新上传`;return;}
    if(fileInput?.files.length>1){error.textContent=`${s.id} 只能上传一个报告`;return;}
    const oldRemark=document.getElementById(`report-existing-remark-${i}`)?.value.trim()||'';
    const newRemark=document.getElementById(`report-new-remark-${i}`)?.value.trim()||'';
    if(oldRemark.length>200||newRemark.length>200){error.textContent='报告备注最多可填写200字';return;}
    if(!['已出但未出全','已出全','已进单'].includes(status)){error.textContent=`${s.id} 请选择子任务状态`;return;}
    if(!current&&!newFile&&status!=='已进单'){error.textContent=`${s.id} 请先上传报告文件`;return;}
    let next;
    if(newFile){const id=newReportId();blobs.push({id,file:newFile});next={id,name:newFile.name,size:newFile.size,type:newFile.type,remark:newRemark};removed.push(...oldFiles.map(f=>f.id).filter(Boolean));}
    else if(current){next={...current,remark:oldRemark};removed.push(...oldFiles.slice(1).map(f=>f.id).filter(Boolean));}
    else{next=null;if(stagedDelete)removed.push(...oldFiles.map(f=>f.id).filter(Boolean));}
    if(stagedDelete||newFile||oldFiles.length>1||JSON.stringify(next)!==JSON.stringify(old||null)||status!==s.reportStatus)changes.push({s,next,status});
  }
  if(!changes.length){error.textContent='请选择报告文件或修改现有报告';return;}
  const historicalIds=new Set(tasks.flatMap(task=>task.subs.flatMap(sub=>(sub.reportReturnHistory||[]).map(entry=>entry.report?.id).filter(Boolean))));
  try{await saveReportBlobs(blobs);}catch(e){error.textContent='报告文件保存失败，请检查浏览器存储空间';return;}
  changes.forEach(({s,next,status})=>{s.reportFiles=next?[next]:[];s.reportStatus=status;s.reportIssued=!!next;s.acceptanceStatus=status;});
  save();removeReportBlobs(removed.filter(id=>!historicalIds.has(id))).catch(()=>{});
  closeModal();if(view==='detail')renderDetail();else searchList();toast('报告已保存');
}
