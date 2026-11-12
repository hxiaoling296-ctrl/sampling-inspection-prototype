const batchSelectedTasks=new Set();
let batchTaskIds=[],batchAction='';
const BATCH_ACTIONS={
  '确认接单':{from:'待接单',to:'待采样'},
  '拒绝接单':{from:'待接单',to:'接单失败'},
  '采样成功':{from:'待采样',to:'核样中'},
  '采样并核样成功':{from:['待采样','核样中'],to:'已进单'},
  '采样失败':{from:'待采样',to:'待接单'},
  '核样成功':{from:'核样中',to:'已进单'},
  '核样失败':{from:'核样中',to:null}
};
function batchEligible(t,config){return Array.isArray(config.from)?config.from.includes(t.status):t.status===config.from;}
function syncBatchSelection(rows){const visible=new Set(tabFilter==='确认接单中'?rows.map(t=>t.id):[]);for(const id of batchSelectedTasks)if(!visible.has(id))batchSelectedTasks.delete(id);updateBatchSelectionUI();}
function updateBatchSelectionUI(){const count=document.getElementById('batch-count'),button=document.getElementById('batch-action-button'),all=document.getElementById('batch-select-all'),menu=document.getElementById('batch-action-menu');if(count)count.textContent=`已选 ${batchSelectedTasks.size} 条`;if(button)button.disabled=!batchSelectedTasks.size;if(menu&&!batchSelectedTasks.size)menu.hidden=true;if(all){const boxes=[...document.querySelectorAll('.batch-task-check')];all.checked=!!boxes.length&&boxes.every(box=>box.checked);all.indeterminate=boxes.some(box=>box.checked)&&!all.checked;}}
function toggleBatchTask(id,checked){if(checked)batchSelectedTasks.add(id);else batchSelectedTasks.delete(id);updateBatchSelectionUI();}
function toggleAllBatchTasks(checked){for(const box of document.querySelectorAll('.batch-task-check')){box.checked=checked;if(checked)batchSelectedTasks.add(box.value);else batchSelectedTasks.delete(box.value);}updateBatchSelectionUI();}
function toggleBatchMenu(){if(tabFilter!=='确认接单中'||!batchSelectedTasks.size)return;const menu=document.getElementById('batch-action-menu');if(!menu)return;if(!menu.hidden){menu.hidden=true;return;}const selected=[...batchSelectedTasks].map(id=>tasks.find(t=>t.id===id)).filter(Boolean);menu.innerHTML=Object.entries(BATCH_ACTIONS).map(([name,config])=>`<button type="button" role="menuitem" onclick="openBatchAcceptance('${name}')">${name}<small>${selected.filter(t=>batchEligible(t,config)).length} 条可操作</small></button>`).join('');menu.hidden=false;}
function openBatchAcceptance(action){
  const config=BATCH_ACTIONS[action];
  if(tabFilter!=='确认接单中'||!config||!batchSelectedTasks.size)return;
  document.getElementById('batch-action-menu').hidden=true;
  batchAction=action;
  batchTaskIds=[...batchSelectedTasks].filter(id=>visibleListTasks.some(t=>t.id===id));
  const chosen=batchTaskIds.map(id=>tasks.find(t=>t.id===id)).filter(Boolean);
  const eligible=chosen.filter(t=>batchEligible(t,config));
  if(!chosen.length)return;
  const amountAction=['采样成功','采样并核样成功'].includes(action);
  const failureAction=action==='核样失败';
  const deadlineAction=['核样成功','采样并核样成功'].includes(action);
  const rows=chosen.map((t,i)=>{
    const allowed=batchEligible(t,config);
    const amount=amountAction?`<td>${allowed?`<input id="batch-amount-${i}" aria-label="${esc(t.id)}采样金额" type="number" min="0" step="0.01" value="${esc(t.samplingAmount??'')}" placeholder="请输入金额">`:'—'}</td><td>${allowed?`<textarea id="batch-remark-${i}" maxlength="200" aria-label="${esc(t.id)}采样备注" placeholder="选填，最多200字">${esc(t.samplingRemark||'')}</textarea>`:'—'}</td>`:'';
    const deadline=deadlineAction?`<td>${allowed?t.subs.map((s,j)=>`<div class="batch-deadline-input"><span>${esc(s.id)}</span>${expectedDaysInput(s,`batch-expected-${i}-${j}`)}</div>`).join(''):'—'}</td>`:'';
    const failure=failureAction?`<td>${allowed?`<input id="batch-reason-${i}" aria-label="${esc(t.id)}核样失败原因" placeholder="请输入原因">`:'—'}</td><td>${allowed?`<select id="batch-next-${i}" aria-label="${esc(t.id)}失败后状态"><option value="">请选择</option><option value="核样中">保持核样中</option><option value="待采样">退回待采样</option></select>`:'—'}</td><td>${allowed?`<label><input id="batch-return-${i}-yes" type="radio" name="batch-return-${i}" value="是">是</label><label><input id="batch-return-${i}-no" type="radio" name="batch-return-${i}" value="否">否</label>`:'—'}</td><td>${allowed?`<textarea id="batch-handling-${i}" maxlength="200" aria-label="${esc(t.id)}样品处理方式" placeholder="最多200字"></textarea>`:'—'}</td>`:'';
    return `<tr class="${allowed?'':'batch-ineligible'}" data-batch-task="${esc(t.id)}"><td>${esc(t.id)}</td><td>${esc(t.code)}</td><td>${statusBadge(t.status)}</td><td>${allowed?'可操作':'不可操作'}</td>${amount}${deadline}${failure}</tr>`;
  }).join('');
  document.getElementById('modal').innerHTML=`<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="batch-title" style="width:${failureAction?'1100':deadlineAction?'1100':'800'}px"><div class="dialoghead"><h2 id="batch-title">批量${action}</h2><button aria-label="关闭弹窗" onclick="closeModal()">×</button></div><div class="dialogbody"><p>已选 ${chosen.length} 个主任务，其中 ${eligible.length} 个可执行“${action}”。其余任务置灰，本次不处理。</p><div class="tablewrap"><table><thead><tr><th>主任务单号</th><th>商品编码</th><th>当前状态</th><th>本次处理</th>${amountAction?'<th>采样金额（元）</th><th>采样备注（最多200字，非必填）</th>':''}${deadlineAction?'<th>子任务预计完成时间（自然天）</th>':''}${failureAction?'<th>核样失败原因</th><th>失败后状态</th><th>是否退样成功</th><th>样品处理方式（最多200字）</th>':''}</tr></thead><tbody>${rows}</tbody></table></div><div id="batch-action-error" class="error" role="alert"></div></div><div class="dialogfooter"><button onclick="closeModal()">取消</button><button class="primary" onclick="applyBatchAcceptance()" ${eligible.length?'':'disabled'}>确认处理 ${eligible.length} 个任务</button></div></section></div>`;
}
function applyBatchAcceptance(){
  const config=BATCH_ACTIONS[batchAction],error=document.getElementById('batch-action-error');
  if(!config||!error)return;
  const chosen=batchTaskIds.map(id=>tasks.find(t=>t.id===id)).filter(Boolean);
  const eligible=chosen.filter(t=>batchEligible(t,config));
  if(!eligible.length){error.textContent='没有可执行此操作的任务';return;}
  const values=new Map();
  for(const [i,t] of chosen.entries()){
    if(!batchEligible(t,config))continue;
    if(['采样成功','采样并核样成功'].includes(batchAction)){
      const raw=document.getElementById('batch-amount-'+i)?.value.trim()||'';
      if(!/^\d+(?:\.\d{1,2})?$/.test(raw)){error.textContent=`${t.id}：请输入不小于 0 且最多两位小数的采样金额`;return;}
      const remark=document.getElementById('batch-remark-'+i)?.value.trim()||'';
      if(remark.length>200){error.textContent=`${t.id}：采样备注最多输入200字`;return;}
      values.set(t.id,{amount:Number(raw),remark});
    }
    if(['核样成功','采样并核样成功'].includes(batchAction)){
      const days=readExpectedDays(t,`batch-expected-${i}`,error);
      if(!days)return;
      values.set(t.id,{...(values.get(t.id)||{}),days});
    }
    if(batchAction==='核样失败'){
      const reason=document.getElementById('batch-reason-'+i)?.value.trim(),next=document.getElementById('batch-next-'+i)?.value;
      const returned=document.querySelector(`input[name="batch-return-${i}"]:checked`)?.value;
      const handling=document.getElementById('batch-handling-'+i)?.value.trim()||'';
      if(!reason){error.textContent=`${t.id}：请输入核样失败原因`;return;}
      if(!['核样中','待采样'].includes(next)){error.textContent=`${t.id}：请选择失败后状态`;return;}
      if(!returned){error.textContent=`${t.id}：请选择是否退样成功`;return;}
      if(!handling){error.textContent=`${t.id}：请输入样品处理方式`;return;}
      if(handling.length>200){error.textContent=`${t.id}：样品处理方式最多输入200字`;return;}
      values.set(t.id,{reason,next,returned:returned==='是',handling});
    }
  }
  for(const t of eligible){
    const extra=values.get(t.id)||{},next=config.to||extra.next;
    if(batchAction==='确认接单')t.acceptedAt=new Date().toISOString();
    if(['采样成功','采样并核样成功'].includes(batchAction)){t.samplingAmount=extra.amount;t.samplingRemark=extra.remark;}
    if(['核样成功','采样并核样成功'].includes(batchAction)){const now=new Date();saveExpectedDays(t,extra.days,now);t.enteredAt=now.toISOString();}
    if(batchAction==='采样失败')delete t.samplingAmount;
    if(batchAction==='核样失败'){
      t.sampleCheckFailureReason=extra.reason;
      t.sampleReturnSucceeded=extra.returned;
      t.sampleHandlingMethod=extra.handling;
    }
    t.status=next;
    t.subs.forEach(s=>{if(s.reportIssued)return;s.acceptanceStatus=next;if(batchAction==='拒绝接单')s.failureReason='机构拒绝接单';if(batchAction==='确认接单')s.failureReason='';});
  }
  save();const done=batchAction,count=eligible.length;batchSelectedTasks.clear();batchTaskIds=[];batchAction='';closeModal();searchList();toast(`批量${done}成功：${count} 个主任务`);
}
