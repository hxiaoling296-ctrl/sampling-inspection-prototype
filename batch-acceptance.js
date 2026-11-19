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
    const amount=amountAction?`<td>${allowed?`<input id="batch-amount-${i}" aria-label="${esc(t.id)}采样金额" type="number" min="0" step="0.01" value="${esc(t.samplingAmount??'')}" placeholder="请输入金额" oninput="syncSamplingFeeInput('${t.id}','batch-amount-${i}','batch-service-fee-${i}')">`:'—'}</td><td>${allowed?`<input id="batch-service-fee-${i}" aria-label="${esc(t.id)}采样服务费" class="${samplingFeeOverLimit(t,t.samplingAmount,samplingServiceFeeValue(t))?'sampling-fee-over':''}" type="number" min="0" step="0.01" value="${esc(samplingServiceFeeValue(t))}" oninput="touchSamplingFeeInput('${t.id}','batch-amount-${i}','batch-service-fee-${i}')">`:'—'}</td><td>${allowed?`<textarea id="batch-remark-${i}" maxlength="200" aria-label="${esc(t.id)}采样备注" placeholder="最多200字">${esc(t.samplingRemark||'')}</textarea>`:'—'}</td><td>${allowed?`<div class="batch-sampling-images">${(t.samplingOrderImages||[]).map((image,j)=>`<button class="link" type="button" onclick="previewSamplingOrderImage('${t.id}',${j})">${esc(image.name)}</button>`).join('')}<input id="batch-sampling-images-${i}" type="file" accept="image/*" multiple aria-label="${esc(t.id)}采样订单图片" onchange="updateBatchSamplingImageSelection(${i})"><small id="batch-sampling-image-selection-${i}">未选择图片</small></div>`:'—'}</td>`:'';
    const merchantSample=action==='确认接单'?`<td>${allowed&&t.payer==='商家'?t.subs.map((s,j)=>`<div class="batch-deadline-input"><span>${esc(s.id)}</span><input id="batch-sample-quantity-${i}-${j}" maxlength="100" aria-label="${esc(s.id)}样品量" value="${esc(s.sampleQuantity||'')}"><input id="batch-address-${i}-${j}" maxlength="200" aria-label="${esc(s.id)}寄样地址" value="${esc(merchantAddress(s))}"></div>`).join(''):'—'}</td>`:'';
    const deadline=deadlineAction?`<td>${allowed?t.subs.map((s,j)=>`<div class="batch-deadline-input"><span>${esc(s.id)}</span>${expectedDaysInput(s,`batch-expected-${i}-${j}`)}</div>`).join(''):'—'}</td>`:'';
    const failure=failureAction?`<td>${allowed?`<input id="batch-reason-${i}" aria-label="${esc(t.id)}核样失败原因" placeholder="请输入原因">`:'—'}</td><td>${allowed?`<select id="batch-next-${i}" aria-label="${esc(t.id)}失败后状态"><option value="">请选择</option><option value="核样中">保持核样中</option><option value="待采样">退回待采样</option></select>`:'—'}</td><td>${allowed?`<label><input id="batch-return-${i}-yes" type="radio" name="batch-return-${i}" value="是">是</label><label><input id="batch-return-${i}-no" type="radio" name="batch-return-${i}" value="否">否</label>`:'—'}</td><td>${allowed?`<textarea id="batch-handling-${i}" maxlength="200" aria-label="${esc(t.id)}样品处理方式" placeholder="最多200字"></textarea>`:'—'}</td><td>${allowed?`<input id="batch-failure-images-${i}" type="file" accept="image/*" multiple aria-label="${esc(t.id)}采样订单图片">`:'—'}</td>`:'';
    return `<tr class="${allowed?'':'batch-ineligible'}" data-batch-task="${esc(t.id)}"><td>${esc(t.id)}</td><td>${esc(t.code)}</td><td>${statusBadge(t.status)}</td><td>${allowed?'可操作':'不可操作'}</td>${amount}${merchantSample}${deadline}${failure}</tr>`;
  }).join('');
  document.getElementById('modal').innerHTML=`<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="batch-title" style="width:${failureAction||deadlineAction||amountAction?'1100':'800'}px"><div class="dialoghead"><h2 id="batch-title">批量${action}</h2><button onclick="closeModal()">×</button></div><div class="dialogbody"><p>已选 ${chosen.length} 个主任务，其中 ${eligible.length} 个可执行“${action}”。其余任务置灰，本次不处理。</p>${deadlineAction?'<div class="planned-date-bulk"><label>批量设置计划出具报告日期 <input id="batch-expected-bulk" type="date" aria-label="批量设置计划出具报告日期" onchange="applyAllExpectedDates(\'batch-expected\')"></label></div>':''}<div class="tablewrap"><table><thead><tr><th>主任务单号</th><th>商品编码</th><th>当前状态</th><th>本次处理</th>${amountAction?'<th><span class="required-star" aria-hidden="true">*</span>采样金额（元）</th><th>采样服务费（元）</th><th>采样备注（最多200字）</th><th>采样订单图片（最多10张）</th>':''}${action==='确认接单'?'<th>子任务样品量 / 寄样地址</th>':''}${deadlineAction?'<th><span class="required-star" aria-hidden="true">*</span>计划出具报告日期</th>':''}${failureAction?'<th><span class="required-star" aria-hidden="true">*</span>核样失败原因</th><th><span class="required-star" aria-hidden="true">*</span>失败后状态</th><th><span class="required-star" aria-hidden="true">*</span>是否退样成功</th><th><span class="required-star" aria-hidden="true">*</span>样品处理方式（最多200字）</th><th><span class="required-star" aria-hidden="true">*</span>采样订单图片（最多10张）</th>':''}</tr></thead><tbody>${rows}</tbody></table></div><div id="batch-action-error" class="error" role="alert"></div></div><div class="dialogfooter"><button onclick="closeModal()">取消</button><button class="primary" onclick="applyBatchAcceptance()" ${eligible.length?'':'disabled'}>确认处理 ${eligible.length} 个任务</button></div></section></div>`;
}
function updateBatchSamplingImageSelection(i){const input=document.getElementById('batch-sampling-images-'+i),label=document.getElementById('batch-sampling-image-selection-'+i);if(!input||!label)return;const files=[...input.files];label.textContent=files.length?`已选择 ${files.length} 张：${files.map(f=>f.name).join('、')}`:'未选择图片';}
async function applyBatchAcceptance(){
  const config=BATCH_ACTIONS[batchAction],error=document.getElementById('batch-action-error');
  if(!config||!error)return;
  const chosen=batchTaskIds.map(id=>tasks.find(t=>t.id===id)).filter(Boolean);
  const eligible=chosen.filter(t=>batchEligible(t,config));
  if(!eligible.length){error.textContent='没有可执行此操作的任务';return;}
  const values=new Map();
  for(const [i,t] of chosen.entries()){
    if(!batchEligible(t,config))continue;
    if(batchAction==='确认接单'&&t.payer==='商家'){if(!t.invoiceInfo?.trim()){error.textContent=`${t.id}：请先填写开票信息`;return;}const samples=t.subs.map((s,j)=>({quantity:document.getElementById(`batch-sample-quantity-${i}-${j}`)?.value.trim()||'',description:document.getElementById(`batch-address-${i}-${j}`)?.value.trim()||''}));if(samples.some(v=>v.quantity.length>100||v.description.length>200)){error.textContent=`${t.id}：样品量最多100字，寄样地址最多200字`;return;}values.set(t.id,{samples});}
    if(['采样成功','采样并核样成功'].includes(batchAction)){
      const raw=document.getElementById('batch-amount-'+i)?.value.trim()||'';
      if(!/^\d+(?:\.\d{1,2})?$/.test(raw)){error.textContent=`${t.id}：请输入不小于 0 且最多两位小数的采样金额`;return;}
      const remark=document.getElementById('batch-remark-'+i)?.value.trim()||'';
      if(remark.length>200){error.textContent=`${t.id}：采样备注最多输入200字`;return;}
      const feeRaw=document.getElementById('batch-service-fee-'+i)?.value.trim()||'';
      if(!validOptionalSamplingFee(feeRaw)){error.textContent=`${t.id}：采样服务费须为非负数，最多两位小数`;return;}
      const images=[...document.getElementById('batch-sampling-images-'+i).files];
      if((t.samplingOrderImages||[]).length+images.length>10){error.textContent=`${t.id}：采样订单图片最多上传10张`;return;}
      if(images.some(file=>!file.type.startsWith('image/'))){error.textContent=`${t.id}：请上传图片文件`;return;}
      values.set(t.id,{amount:Number(raw),fee:feeRaw===''?'':Number(feeRaw),remark,images});
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
      const images=[...document.getElementById('batch-failure-images-'+i).files];
      if(!images.length||images.length>10||images.some(file=>!file.type.startsWith('image/'))){error.textContent=`${t.id}：请上传1至10张采样订单图片`;return;}
      values.set(t.id,{reason,next,returned:returned==='是',handling,images});
    }
  }
  if(['采样成功','采样并核样成功'].includes(batchAction)){const button=document.querySelector('#modal .dialogfooter .primary'),entries=eligible.flatMap(t=>{const extra=values.get(t.id);extra.imageEntries=extra.images.map(file=>({id:newReportId(),file}));return extra.imageEntries;});button.disabled=true;try{await saveReportBlobs(entries);}catch(e){error.textContent='图片保存失败，请检查浏览器存储空间';button.disabled=false;return;}}
  if(batchAction==='核样失败'){const button=document.querySelector('#modal .dialogfooter .primary');button.disabled=true;try{for(const t of eligible)await saveSampleFailureImages(t,values.get(t.id).images);}catch(e){error.textContent='图片保存失败，请检查浏览器存储空间';button.disabled=false;return;}}
  for(const t of eligible){
    const extra=values.get(t.id)||{},next=config.to||extra.next;
    if(batchAction==='确认接单'){t.acceptedAt=new Date().toISOString();if(t.payer==='商家')t.subs.forEach((s,i)=>{s.sampleQuantity=extra.samples[i].quantity;s.shippingAddress=extra.samples[i].description;});}
    if(['采样成功','采样并核样成功'].includes(batchAction)){t.samplingAmount=extra.amount;t.samplingServiceFee=extra.fee;t.samplingRemark=extra.remark;if(extra.imageEntries.length)t.samplingOrderImages=[...(t.samplingOrderImages||[]),...extra.imageEntries.map(({id,file})=>({id,name:file.name,type:file.type,size:file.size}))];}
    if(['核样成功','采样并核样成功'].includes(batchAction)){const now=new Date();saveExpectedDays(t,extra.days,now);t.enteredAt=now.toISOString();}
    if(batchAction==='采样失败'){delete t.samplingAmount;delete t.samplingServiceFee;}
    if(batchAction==='核样失败'){
      t.sampleCheckFailureReason=extra.reason;
      t.sampleReturnSucceeded=extra.returned;
      t.sampleHandlingMethod=extra.handling;if(next==='待采样')await clearSamplingOnReturn(t);
    }
    t.status=next;
    t.subs.forEach(s=>{if(s.reportIssued)return;s.acceptanceStatus=next;if(batchAction==='拒绝接单')s.failureReason='机构拒绝接单';if(batchAction==='确认接单')s.failureReason='';});
  }
  save();const done=batchAction,count=eligible.length;batchSelectedTasks.clear();batchTaskIds=[];batchAction='';closeModal();searchList();toast(`批量${done}成功：${count} 个主任务`);
}
