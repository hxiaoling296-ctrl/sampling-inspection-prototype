const RETRIEVE_STATUS_OPTIONS=['待定','报告合格','报告不合格','内部比对','AB货','报告作废-合格','报告作废-不合格'];
function retrieveStatusOptions(t,s) {
  const current=subtaskDisplayStatus(t,s);
  const currentOnly=RETRIEVE_STATUS_OPTIONS.includes(current)?'':`<option value="${esc(current)}" selected disabled>${esc(current)}</option>`;
  return currentOnly+RETRIEVE_STATUS_OPTIONS.map(status=>`<option value="${esc(status)}" ${current===status?'selected':''}>${esc(status)}</option>`).join('');
}

function openRetrieveTask(taskId) {
  const t=tasks.find(x=>x.id===taskId);
  if(!t||!['款项确认','已完成','已完成（异常）'].includes(t.status))return;
  document.getElementById('modal').innerHTML=`<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="retrieve-title" style="width:1000px"><div class="dialoghead"><h2 id="retrieve-title">捞回 · ${copyCodeHTML(t.id,'主任务单号')}</h2><button type="button" aria-label="关闭弹窗" onclick="closeModal()">×</button></div><div class="dialogbody"><div class="label"><span class="required-star" aria-hidden="true">*</span>选择子任务</div><div class="retrieve-sub-choices">${t.subs.map((s,i)=>isActiveSub(t,s)?`<label><input type="checkbox" data-retrieve-select="${i}" aria-label="选择子任务${esc(s.id)}" onchange="updateRetrieveSelection()">${esc(s.id)} · ${esc(s.fields?.sku||'')}</label>`:'').join('')}</div><div id="retrieve-selected-records">${t.subs.map((s,i)=>`<section class="summary retrieve-selected-sub" data-retrieve-detail="${i}" hidden><h3>子任务 ${copyCodeHTML(s.id,'子任务单号')}</h3><label class="label" for="retrieve-status-${i}">子任务状态<select id="retrieve-status-${i}" aria-label="子任务${esc(s.id)}状态">${retrieveStatusOptions(t,s)}</select></label><div class="retrieve-entry-row" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;margin-top:14px"><div><label class="label" for="retrieve-info-${i}"><span class="required-star" aria-hidden="true">*</span>捞回信息</label><textarea id="retrieve-info-${i}" maxlength="200" rows="4" style="width:100%" aria-label="子任务${esc(s.id)}捞回信息" placeholder="请输入该子任务的捞回信息"></textarea></div><div><label class="label" for="retrieve-files-${i}">上传图片或文件</label><input id="retrieve-files-${i}" type="file" multiple aria-label="子任务${esc(s.id)}捞回附件" onchange="showRetrieveFiles(${i})"><div class="hint">最多10个文件，单个不超过10 MB</div><div id="retrieve-file-list-${i}" class="small"></div></div></div><div id="retrieve-error-${i}" class="error" role="alert"></div>${retrieveRecordsHTML(s)||'<p class="muted">暂无捞回记录</p>'}</section>`).join('')}</div><div id="retrieve-error" class="error" role="alert"></div></div><div class="dialogfooter"><button type="button" onclick="closeModal()">取消</button><button type="button" class="primary" onclick="confirmRetrieveTask('${t.id}')">确认捞回</button></div></section></div>`;
}

function updateRetrieveSelection() {
  document.querySelectorAll('[data-retrieve-detail]').forEach(section=>{
    const index=section.dataset.retrieveDetail;
    section.hidden=!document.querySelector(`[data-retrieve-select="${index}"]`)?.checked;
  });
  const error=document.getElementById('retrieve-error');if(error)error.textContent='';
}

function showRetrieveFiles(index) {
  const files=[...document.getElementById(`retrieve-files-${index}`)?.files||[]];
  document.getElementById(`retrieve-file-list-${index}`).textContent=files.map(f=>f.name).join('、');
  const error=document.getElementById(`retrieve-error-${index}`);
  error.textContent=files.length>10?'最多上传10个文件':files.some(f=>f.size>10*1024*1024)?'单个文件不能超过10 MB':'';
}

async function confirmRetrieveTask(taskId) {
  const t=tasks.find(x=>x.id===taskId),error=document.getElementById('retrieve-error');
  if(!t||!['款项确认','已完成','已完成（异常）'].includes(t.status)||!error)return;
  error.textContent='';document.querySelectorAll('[id^="retrieve-error-"]').forEach(el=>el.textContent='');
  const selected=[...document.querySelectorAll('[data-retrieve-select]:checked')].map(input=>{
    const index=Number(input.dataset.retrieveSelect);
    return {sub:t.subs[index],index,info:document.getElementById(`retrieve-info-${index}`)?.value.trim()||'',files:[...document.getElementById(`retrieve-files-${index}`)?.files||[]],status:document.getElementById(`retrieve-status-${index}`)?.value||''};
  });
  if(!selected.length||selected.some(({sub})=>!sub||!isActiveSub(t,sub))){error.textContent='请选择子任务';return;}
  for(const row of selected){
    const rowError=document.getElementById(`retrieve-error-${row.index}`);
    if(!row.info){rowError.textContent='请输入该子任务的捞回信息';return;}
    if(row.info.length>200){rowError.textContent='捞回信息最多200字';return;}
    if(row.files.length>10){rowError.textContent='最多上传10个文件';return;}
    if(row.files.some(file=>file.size>10*1024*1024)){rowError.textContent='单个文件不能超过10 MB';return;}
    const current=subtaskDisplayStatus(t,row.sub);if(row.status!==current&&!RETRIEVE_STATUS_OPTIONS.includes(row.status)){rowError.textContent='请选择有效的子任务状态';return;}
  }
  const stamp=Date.now(),now=new Date(stamp).toISOString(),blobs=[];
  for(const row of selected){
    row.attachments=row.files.map((file,j)=>{
      const attachment={id:`retrieve-${taskId}-${stamp}-${row.index}-${j}`,name:file.name,type:file.type,size:file.size};
      blobs.push({id:attachment.id,file});return attachment;
    });
  }
  try{await saveReportBlobs(blobs);}catch(e){error.textContent='附件保存失败，请重试';return;}
  for(const row of selected){
    const fromStatus=subtaskDisplayStatus(t,row.sub),toStatus=row.status!==fromStatus?row.status:'';
    (row.sub.retrieveRecords||=[]).push({info:row.info,attachments:row.attachments,operator:currentOperator,at:now,fromStatus:toStatus?fromStatus:'',toStatus});
    if(toStatus){row.sub.reportStatus=toStatus;row.sub.acceptanceStatus=toStatus;}
  }
  save();closeModal();if(view==='detail')renderDetail();else searchList();toast(`已记录 ${selected.length} 个子任务的捞回信息`);
}

function retrieveRecordsHTML(sub){const records=sub.retrieveRecords||[];return records.length?`<div class="retrieve-records"><h4>捞回记录</h4><div class="tablewrap"><table class="retrieve-record-table"><thead><tr><th>捞回信息</th><th>子任务状态调整</th><th>附件</th><th>操作人</th><th>操作时间</th></tr></thead><tbody>${records.map((record,index)=>({record,index})).sort((a,b)=>new Date(b.record.at)-new Date(a.record.at)||b.index-a.index).map(({record,index})=>`<tr class="retrieve-record"><td>${esc(record.info)}</td><td>${record.toStatus?`${esc(record.fromStatus||'—')} → ${esc(record.toStatus)}`:'—'}</td><td>${record.attachments?.length?record.attachments.map((file,j)=>`<button type="button" class="link" onclick="openRetrieveAttachment('${esc(sub.id)}',${index},${j})">${esc(file.name)}</button>`).join('、'):'—'}</td><td>${esc(record.operator||'')}</td><td>${esc(new Date(record.at).toLocaleString('zh-CN',{hour12:false}))}</td></tr>`).join('')}</tbody></table></div></div>`:'';}
async function openRetrieveAttachment(subId,recordIndex,fileIndex){const sub=tasks.flatMap(t=>t.subs).find(s=>s.id===subId),file=sub?.retrieveRecords?.[recordIndex]?.attachments?.[fileIndex];if(!file)return;const blob=await loadReportBlob(file.id);if(!blob){toast('附件内容未找到');return;}const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=file.name;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
