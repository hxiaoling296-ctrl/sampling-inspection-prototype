function sampleCheckRowsHTML(t){
  return `<div class="planned-date-bulk"><label>批量设置计划出具报告日期 <input id="sample-check-date-bulk" type="date" aria-label="批量设置计划出具报告日期" onchange="applyAllExpectedDates('sample-check-date')"></label></div><table class="expected-days-table"><thead><tr><th>子任务单号</th><th>检测项目汇总</th><th><span class="required-star" aria-hidden="true">*</span>子任务状态</th><th>计划出具报告日期</th><th><span class="required-star" aria-hidden="true">*</span>样品量</th><th><span class="required-star" aria-hidden="true">*</span>寄样地址</th></tr></thead><tbody>${t.subs.map((s,i)=>isActiveSub(t,s)&&!isCanceledDetection(s)?`<tr><td>${copyCodeHTML(s.id,'子任务单号')}</td><td>${projectSummaryHTML(t,s)}</td><td><select id="sample-check-status-${i}" aria-label="${esc(s.id)}子任务状态"><option value="">请选择</option><option value="核样中">核样中</option><option value="已进单" ${s.acceptanceStatus==='已进单'?'selected':''}>已进单</option></select></td><td>${expectedDaysInput(s,`sample-check-date-${i}`)}</td><td><input id="sample-check-quantity-${i}" aria-label="${esc(s.id)}样品量" maxlength="100" required value="${esc(s.sampleQuantity||'')}"></td><td><input id="sample-check-address-${i}" aria-label="${esc(s.id)}寄样地址" maxlength="200" required value="${esc(merchantAddress(s))}"></td></tr>`:'').join('')}</tbody></table>`;
}
function readSampleCheckChoices(t,error,prefix='sample-check'){
  const statuses=new Map(),dates=new Map(),samples=new Map();
  for(const [i,s] of t.subs.entries()){
    if(!isActiveSub(t,s)||isCanceledDetection(s))continue;
    const status=document.getElementById(`${prefix}-status-${i}`)?.value;
    if(!['核样中','已进单'].includes(status)){error.textContent=`${s.id}：请选择子任务状态`;return null;}
    statuses.set(s.id,status);
    const quantity=document.getElementById(`${prefix}-quantity-${i}`)?.value.trim()||'';
    const address=document.getElementById(`${prefix}-address-${i}`)?.value.trim()||'';
    if(!quantity||!address){error.textContent=`${s.id}：请填写样品量和寄样地址`;return null;}
    if(quantity.length>100||address.length>200){error.textContent=`${s.id}：样品量最多100字，寄样地址最多200字`;return null;}
    samples.set(s.id,{quantity,address});
    if(status==='已进单'){
      const date=document.getElementById(`${prefix}-date-${i}`)?.value;
      if(!validPlannedReportDate(date)){error.textContent=`${s.id}：请选择计划出具报告日期`;return null;}
      dates.set(s.id,date);
    }
  }
  return {statuses,dates,samples};
}
function applySampleCheckChoices(t,choices,now=new Date()){
  saveExpectedDays(t,choices.dates,now);
  t.subs.forEach(s=>{
    if(!isActiveSub(t,s)||isCanceledDetection(s)||s.reportIssued)return;
    s.acceptanceStatus=choices.statuses.get(s.id);
    const sample=choices.samples?.get(s.id);
    if(sample){s.sampleQuantity=sample.quantity;s.shippingAddress=sample.address;}
    if(s.acceptanceStatus==='核样中'){delete s.expectedDays;delete s.expectedCompletionAt;}
  });
  const anyEntered=[...choices.statuses.values()].some(status=>status==='已进单');
  t.status=anyEntered?'已进单':'核样中';
  if(anyEntered&&!t.enteredAt)t.enteredAt=now.toISOString();
  else if(!anyEntered)delete t.enteredAt;
  return anyEntered;
}
function confirmSampleCheckSuccess(id){
  if(view==='detail'&&pendingSubSnapshots.size){toast('请先保存子任务');return;}
  const t=tasks.find(t=>t.id===id);
  if(!t||t.status!=='核样中'||!activeOrderSubs(t).some(s=>!isCanceledDetection(s)))return;
  document.getElementById('modal').innerHTML=`<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="sample-check-success-title" style="width:1120px"><div class="dialoghead"><h2 id="sample-check-success-title">确认核样成功</h2><button aria-label="关闭弹窗" onclick="closeModal()">×</button></div><div class="dialogbody">${sampleCheckSamplingHTML(t)}<p>请为每个子任务选择状态并填写样品量、寄样地址。选择已进单时填写计划出具报告日期。</p>${sampleCheckRowsHTML(t)}<div id="sample-check-success-error" class="error" role="alert"></div></div><div class="dialogfooter"><button onclick="closeModal()">取消</button><button class="primary" onclick="applySampleCheckSuccess('${t.id}')">确认核样成功</button></div></section></div>`;
  hydrateModalImageThumbnails();
}
function applySampleCheckSuccess(id){
  const t=tasks.find(t=>t.id===id);
  if(!t||t.status!=='核样中'||!activeOrderSubs(t).some(s=>!isCanceledDetection(s)))return;
  const error=document.getElementById('sample-check-success-error'),choices=readSampleCheckChoices(t,error);
  if(!choices)return;
  if(!validateSampleCheckImages(t,error))return;
  const anyEntered=applySampleCheckChoices(t,choices);
  save();closeModal();tabFilter=anyEntered?'已进单':'确认接单中';query='';showList();
  toast(anyEntered?'已有子任务进单，主任务进入已进单':'子任务状态已保存，主任务保持核样中');
}
