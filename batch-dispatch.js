const batchDispatchSelected=new Set();
let batchDispatchTaskIds=[];
function migrateBatchDispatchFields(){let changed=false;for(const t of tasks){if(t.dispatchedAt&&!t.lastDispatchedAgency&&t.agency){t.lastDispatchedAgency=t.agency;changed=true;}const d=t.batchDispatchDraft;if(!d)continue;if(['草稿','待派单','接单失败'].includes(t.status)){t.reportReviewer=d.reviewer||t.reportReviewer||'';t.agency=d.agency||t.agency||'';t.shippingMethod=d.shippingMethod||t.shippingMethod||'';t.agencyReason=d.reason||t.agencyReason||'';t.dispatchRemark=d.dispatchRemark||t.dispatchRemark||'';}delete t.batchDispatchDraft;changed=true;}if(changed)save();}
function syncBatchDispatchSelection(rows){
  const visible=new Set(tabFilter==='待派单'?rows.map(t=>t.id):[]);
  for(const id of batchDispatchSelected)if(!visible.has(id))batchDispatchSelected.delete(id);
  updateBatchDispatchSelectionUI();
}
function updateBatchDispatchSelectionUI(){
  const count=document.getElementById('batch-dispatch-count'),button=document.getElementById('batch-dispatch-button'),all=document.getElementById('batch-dispatch-all');
  if(count)count.textContent=`已选 ${batchDispatchSelected.size} 条`;
  if(button)button.disabled=!batchDispatchSelected.size;
  if(all){const boxes=[...document.querySelectorAll('.batch-dispatch-check')];all.checked=!!boxes.length&&boxes.every(box=>box.checked);all.indeterminate=boxes.some(box=>box.checked)&&!all.checked;}
}
function toggleBatchDispatchTask(id,checked){if(checked)batchDispatchSelected.add(id);else batchDispatchSelected.delete(id);updateBatchDispatchSelectionUI();}
function toggleAllBatchDispatchTasks(checked){for(const box of document.querySelectorAll('.batch-dispatch-check')){box.checked=checked;if(checked)batchDispatchSelected.add(box.value);else batchDispatchSelected.delete(box.value);}updateBatchDispatchSelectionUI();}
function openBatchDispatch(){
  if(tabFilter!=='待派单'||!batchDispatchSelected.size)return;
  batchDispatchTaskIds=[...batchDispatchSelected].filter(id=>visibleListTasks.some(t=>t.id===id));
  const chosen=batchDispatchTaskIds.map(id=>tasks.find(t=>t.id===id)).filter(Boolean);
  if(!chosen.length)return;
  const common=field=>chosen.every(t=>(t[field]||'')===(chosen[0][field]||''))?chosen[0][field]||'':'';
  const draft={reviewer:common('reportReviewer'),agency:common('agency'),shippingMethod:common('shippingMethod'),reason:common('agencyReason'),dispatchRemark:common('dispatchRemark')};
  document.getElementById('modal').innerHTML=`<div class="overlay"><section class="dialog dispatch-dialog" role="dialog" aria-modal="true" aria-labelledby="batch-dispatch-title" style="width:1380px"><div class="dialoghead"><h2 id="batch-dispatch-title">批量派单</h2><button aria-label="关闭弹窗" onclick="closeModal()">×</button></div><div class="dialogbody"><p>已选 ${chosen.length} 个主任务。上方可批量选择，下方可逐个主任务调整；派单人记录为当前操作人 ${esc(currentOperator)}。</p><div class="batch-dispatch-fields"><label>批量报告审核人<select id="batch-dispatch-reviewer" onchange="applyBatchDispatchDefault('reviewer')">${opts(REVIEWERS,draft.reviewer||'','请选择报告审核人')}</select></label><label>批量派单机构<select id="batch-dispatch-agency" onchange="applyBatchDispatchDefault('agency')">${opts(REFERENCE_AGENCIES,draft.agency||'','请选择一家检测机构')}</select></label><label>批量寄样方式<select id="batch-dispatch-shipping" onchange="applyBatchDispatchDefault('shippingMethod')">${opts(['商家寄样','机构采样','与辉寄样'],draft.shippingMethod||'','请选择寄样方式')}</select></label><label>选择机构原由<textarea id="batch-dispatch-reason" placeholder="请输入选择机构原由">${esc(draft.reason||'')}</textarea></label><label>派单备注（最多200字）<textarea id="batch-dispatch-remark" maxlength="200" placeholder="请输入派单备注">${esc(draft.dispatchRemark||'')}</textarea></label></div><div class="hint" id="batch-dispatch-hint">请在列表中选择派单机构，查看各主任务的检测项目汇总。</div><div class="tablewrap"><table><thead><tr><th>主任务单号</th><th>商品编码</th><th>计划专场</th><th>计划检测规格</th><th>报告审核人</th><th>派单机构</th><th>寄样方式</th><th>当前状态</th><th>原派单机构</th><th>检测项目汇总</th><th>本次处理</th></tr></thead><tbody>${chosen.map(t=>{return `<tr data-batch-dispatch-task="${esc(t.id)}"><td>${copyCodeHTML(t.id,'主任务单号')}</td><td>${esc(t.code)}</td><td><input data-planned-session maxlength="35" aria-label="主任务${esc(t.id)}计划专场" value="${esc(t.plannedSession||'')}"></td><td><input data-planned-spec maxlength="100" aria-label="主任务${esc(t.id)}计划检测规格" value="${esc(t.plannedInspectionSpec||'')}"></td><td><select data-batch-reviewer aria-label="主任务${esc(t.id)}报告审核人">${opts(REVIEWERS,t.reportReviewer||draft.reviewer||'','请选择报告审核人')}</select></td><td><select data-batch-agency aria-label="主任务${esc(t.id)}派单机构" onchange="updateBatchDispatchPreview()">${opts(REFERENCE_AGENCIES,t.agency||draft.agency||'','请选择检测机构')}</select></td><td><select data-batch-shipping aria-label="主任务${esc(t.id)}寄样方式">${opts(['商家寄样','机构采样','与辉寄样'],t.shippingMethod||draft.shippingMethod||'','请选择寄样方式')}</select></td><td>${statusBadge(t.status)}</td><td>${esc(t.lastDispatchedAgency||(t.dispatchedAt?t.agency: '—'))}</td><td class="batch-dispatch-projects">选择机构后展示</td><td class="batch-dispatch-eligibility">待选择机构</td></tr>`;}).join('')}</tbody></table></div><div id="batch-dispatch-error" class="error" role="alert"></div></div><div class="dialogfooter"><button onclick="closeModal()">取消</button><button onclick="saveBatchDispatchDraft()">保存</button><button class="primary" id="batch-dispatch-confirm" onclick="confirmBatchDispatch()" disabled>确认派单</button></div></section></div>`;
  updateBatchDispatchPreview();
}
function applyBatchDispatchDefault(field){const id=field==='shippingMethod'?'batch-dispatch-shipping':`batch-dispatch-${field}`,selector=field==='shippingMethod'?'[data-batch-shipping]':field==='reviewer'?'[data-batch-reviewer]':'[data-batch-agency]',value=document.getElementById(id)?.value||'';for(const input of document.querySelectorAll(`[data-batch-dispatch-task] ${selector}`))input.value=value;updateBatchDispatchPreview();}
function batchDispatchRowValues(row){return {reviewer:row.querySelector('[data-batch-reviewer]').value,agency:row.querySelector('[data-batch-agency]').value,shippingMethod:row.querySelector('[data-batch-shipping]').value};}
function saveBatchDispatchDraft(announce=true){
  const error=document.getElementById('batch-dispatch-error');if(!error)return false;error.textContent='';
  const draft={reviewer:document.getElementById('batch-dispatch-reviewer')?.value||'',agency:document.getElementById('batch-dispatch-agency')?.value||'',shippingMethod:document.getElementById('batch-dispatch-shipping')?.value||'',reason:document.getElementById('batch-dispatch-reason')?.value.trim()||'',dispatchRemark:document.getElementById('batch-dispatch-remark')?.value.trim()||''};
  if(draft.dispatchRemark.length>200){error.textContent='派单备注最多输入200字';return false;}
  const rows=batchDispatchTaskIds.map(id=>({task:tasks.find(t=>t.id===id),row:document.querySelector(`[data-batch-dispatch-task="${id}"]`)}));
  if(rows.some(({task,row})=>!task||!row)){error.textContent='任务列表已变化，请重新打开批量派单';return false;}
  const values=rows.map(({task,row})=>({task,plannedSession:row.querySelector('[data-planned-session]').value.trim(),plannedInspectionSpec:row.querySelector('[data-planned-spec]').value.trim(),...batchDispatchRowValues(row)}));
  if(values.some(({plannedSession,plannedInspectionSpec})=>plannedSession.length>35||plannedInspectionSpec.length>100)){error.textContent='计划专场最多35字，计划检测规格最多100字';return false;}
  const mixedReason=rows.some(({task})=>(task.agencyReason||'')!==(rows[0].task.agencyReason||''));
  const mixedRemark=rows.some(({task})=>(task.dispatchRemark||'')!==(rows[0].task.dispatchRemark||''));
  for(const {task,plannedSession,plannedInspectionSpec,reviewer,agency,shippingMethod} of values){
    task.plannedSession=plannedSession;task.plannedInspectionSpec=plannedInspectionSpec;
    if(task.dispatchedAt&&!task.lastDispatchedAgency)task.lastDispatchedAgency=task.agency||'';
    task.reportReviewer=reviewer;task.agency=agency;task.shippingMethod=shippingMethod;
    if(draft.reason||!mixedReason)task.agencyReason=draft.reason;
    if(draft.dispatchRemark||!mixedRemark)task.dispatchRemark=draft.dispatchRemark;
    delete task.batchDispatchDraft;
  }
  save();if(announce){closeModal();searchList();toast('批量派单信息已保存，任务尚未派出');}return true;
}
function updateBatchDispatchPreview(){
  const chosen=batchDispatchTaskIds.map(id=>tasks.find(t=>t.id===id)).filter(Boolean);
  let eligible=0,subCount=0;
  for(const t of chosen){
    const row=document.querySelector(`[data-batch-dispatch-task="${t.id}"]`);
    if(!row)continue;
    const agency=row.querySelector('[data-batch-agency]').value;
    const active=agency&&['草稿','待派单','接单失败'].includes(t.status)?activeSubs(t,agency):[];
    const allowed=active.length>0&&PAYERS.includes(t.payer);
    if(allowed){eligible++;subCount+=active.length;}
    row.classList.toggle('batch-ineligible',!!agency&&!allowed);
    row.querySelector('.batch-dispatch-projects').innerHTML=agency?t.subs.map(s=>`<div><strong>${esc(s.id)}</strong>${projectSummaryHTML(t,s,agency)}</div>`).join(''):'选择机构后展示';
    row.querySelector('.batch-dispatch-eligibility').textContent=agency?(allowed?`派出 ${active.length} 个子任务`:!PAYERS.includes(t.payer)?'未选择费用支出方':'无可派检测项目'):'待选择机构';
  }
  document.getElementById('batch-dispatch-hint').textContent=chosen.some(t=>document.querySelector(`[data-batch-dispatch-task="${t.id}"] [data-batch-agency]`)?.value)?`本次可派 ${eligible} 个主任务、${subCount} 个有检测项目的子任务；其余主任务置灰，本次跳过。`:'请在列表中选择派单机构，查看各主任务的检测项目汇总。';
  const confirm=document.getElementById('batch-dispatch-confirm');confirm.disabled=!eligible;confirm.textContent=eligible?`确认派单 ${eligible} 个主任务`:'确认派单';
}
function confirmBatchDispatch(){
  if(tabFilter!=='待派单')return;
  const reason=document.getElementById('batch-dispatch-reason')?.value.trim()||'',shippingMethod=document.getElementById('batch-dispatch-shipping')?.value;
  const dispatchRemark=document.getElementById('batch-dispatch-remark')?.value.trim()||'',error=document.getElementById('batch-dispatch-error');
  if(dispatchRemark.length>200){error.textContent='派单备注最多输入200字';return;}
  const eligible=batchDispatchTaskIds.map(id=>({t:tasks.find(t=>t.id===id),row:document.querySelector(`[data-batch-dispatch-task="${id}"]`)})).filter(({t,row})=>t&&row&&['草稿','待派单','接单失败'].includes(t.status)&&PAYERS.includes(t.payer)&&activeSubs(t,row.querySelector('[data-batch-agency]').value).length);
  if(!eligible.length){error.textContent='所选主任务没有可派的检测项目';return;}
  if(eligible.some(({row})=>{const values=batchDispatchRowValues(row);return !REVIEWERS.includes(values.reviewer)||!REFERENCE_AGENCIES.includes(values.agency)||!['商家寄样','机构采样','与辉寄样'].includes(values.shippingMethod)})){error.textContent='请补全可派主任务的报告审核人、派单机构和寄样方式';return;}
  if(!saveBatchDispatchDraft(false))return;
  let subCount=0;
  for(const {t,row} of eligible)subCount+=applyDispatchToTask(t,{...batchDispatchRowValues(row),reason:t.agencyReason||'',dispatchRemark:t.dispatchRemark||''});
  save();batchDispatchSelected.clear();batchDispatchTaskIds=[];closeModal();searchList();toast(`批量派单成功：${eligible.length} 个主任务、${subCount} 个子任务进入待接单`);
}
