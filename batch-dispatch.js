const batchDispatchSelected=new Set();
let batchDispatchTaskIds=[];
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
  document.getElementById('modal').innerHTML=`<div class="overlay"><section class="dialog dispatch-dialog" role="dialog" aria-modal="true" aria-labelledby="batch-dispatch-title" style="width:980px"><div class="dialoghead"><h2 id="batch-dispatch-title">批量派单</h2><button aria-label="关闭弹窗" onclick="closeModal()">×</button></div><div class="dialogbody"><p>已选 ${chosen.length} 个主任务。本次统一选择一家机构和一位报告审核人；派单人记录为当前操作人 ${esc(currentOperator)}。</p><div class="batch-dispatch-fields"><label><span class="required-star" aria-hidden="true">*</span>报告审核人<select id="batch-dispatch-reviewer">${opts(REVIEWERS,'','请选择报告审核人')}</select></label><label><span class="required-star" aria-hidden="true">*</span>本次派单机构<select id="batch-dispatch-agency" onchange="updateBatchDispatchPreview()">${opts(REFERENCE_AGENCIES,'','请选择一家检测机构')}</select></label><label><span class="required-star" aria-hidden="true">*</span>寄样方式<select id="batch-dispatch-shipping"><option value="">请选择寄样方式</option><option>商家寄样</option><option>机构采样</option><option>与辉寄样</option></select></label><label>选择机构原由<textarea id="batch-dispatch-reason" placeholder="请输入选择机构原由"></textarea></label><label>派单备注（最多200字）<textarea id="batch-dispatch-remark" maxlength="200" placeholder="请输入派单备注"></textarea></label></div><div class="hint" id="batch-dispatch-hint">请选择本次派单机构，查看各主任务的检测项目汇总。</div><div class="tablewrap"><table><thead><tr><th>主任务单号</th><th>商品编码</th><th>当前状态</th><th>原派单机构</th><th>检测项目汇总</th><th>本次处理</th></tr></thead><tbody>${chosen.map(t=>`<tr data-batch-dispatch-task="${esc(t.id)}"><td>${esc(t.id)}</td><td>${esc(t.code)}</td><td>${statusBadge(t.status)}</td><td>${esc(t.agency||'—')}</td><td class="batch-dispatch-projects">选择机构后展示</td><td class="batch-dispatch-eligibility">待选择机构</td></tr>`).join('')}</tbody></table></div><div id="batch-dispatch-error" class="error" role="alert"></div></div><div class="dialogfooter"><button onclick="closeModal()">取消</button><button class="primary" id="batch-dispatch-confirm" onclick="confirmBatchDispatch()" disabled>确认派单</button></div></section></div>`;
}
function updateBatchDispatchPreview(){
  const agency=document.getElementById('batch-dispatch-agency')?.value;
  const chosen=batchDispatchTaskIds.map(id=>tasks.find(t=>t.id===id)).filter(Boolean);
  let eligible=0,subCount=0;
  for(const t of chosen){
    const row=document.querySelector(`[data-batch-dispatch-task="${t.id}"]`);
    if(!row)continue;
    const active=agency&&['草稿','待派单','接单失败'].includes(t.status)?activeSubs(t,agency):[];
    const allowed=active.length>0;
    if(allowed){eligible++;subCount+=active.length;}
    row.classList.toggle('batch-ineligible',!!agency&&!allowed);
    row.querySelector('.batch-dispatch-projects').innerHTML=agency?t.subs.map(s=>`<div><strong>${esc(s.id)}</strong>${projectSummaryHTML(t,s,agency)}</div>`).join(''):'选择机构后展示';
    row.querySelector('.batch-dispatch-eligibility').textContent=agency?(allowed?`派出 ${active.length} 个子任务`:'无可派检测项目'):'待选择机构';
  }
  document.getElementById('batch-dispatch-hint').textContent=agency?`本次可派 ${eligible} 个主任务、${subCount} 个有检测项目的子任务；其余主任务置灰，本次跳过。`:'请选择本次派单机构，查看各主任务的检测项目汇总。';
  const confirm=document.getElementById('batch-dispatch-confirm');confirm.disabled=!eligible;confirm.textContent=eligible?`确认派单 ${eligible} 个主任务`:'确认派单';
}
function confirmBatchDispatch(){
  if(tabFilter!=='待派单')return;
  const reviewer=document.getElementById('batch-dispatch-reviewer')?.value,agency=document.getElementById('batch-dispatch-agency')?.value;
  const reason=document.getElementById('batch-dispatch-reason')?.value.trim()||'',shippingMethod=document.getElementById('batch-dispatch-shipping')?.value;
  const dispatchRemark=document.getElementById('batch-dispatch-remark')?.value.trim()||'',error=document.getElementById('batch-dispatch-error');
  if(!REVIEWERS.includes(reviewer)){error.textContent='请选择报告审核人';return;}
  if(!REFERENCE_AGENCIES.includes(agency)){error.textContent='请选择抽检机构';return;}
  if(!['商家寄样','机构采样','与辉寄样'].includes(shippingMethod)){error.textContent='请选择寄样方式';return;}
  if(dispatchRemark.length>200){error.textContent='派单备注最多输入200字';return;}
  const eligible=batchDispatchTaskIds.map(id=>tasks.find(t=>t.id===id)).filter(t=>t&&['草稿','待派单','接单失败'].includes(t.status)&&activeSubs(t,agency).length);
  if(!eligible.length){error.textContent='所选主任务没有可派的检测项目';return;}
  let subCount=0;
  for(const t of eligible)subCount+=applyDispatchToTask(t,{agency,reviewer,reason,shippingMethod,dispatchRemark});
  save();batchDispatchSelected.clear();batchDispatchTaskIds=[];closeModal();searchList();toast(`批量派单成功：${eligible.length} 个主任务、${subCount} 个子任务进入待接单`);
}
