function paymentItems(t) {
  const items=[];
  for (const s of t.subs) {
    const agency=s.agency||t.agency;
    for (const p of selectedProjects(s)) items.push({sub:s,project:p,agency,referencePrice:quotePrice(p,agency),price:actualQuotePrice(p,agency)});
    for (const p of (s.agencyProjects||[]).filter(p=>!p.agency||p.agency===agency)) items.push({sub:s,project:p,agency,referencePrice:p.price??null,price:actualQuotePrice(p,agency,'agency')});
  }
  return items;
}
function projectCalculationFormula(project) {
  return project.calculationFormula||'下单数量≤9：单价×数量；下单数量≥10：单价×数量×0.9；不合格复测：加收单价';
}
function paymentAmount(value) {return /^\d+(?:\.\d{1,2})?$/.test(String(value).trim());}
function paymentTotalValue(){const amount=document.getElementById('payment-sampling-amount')?.value.trim(),fee=document.getElementById('payment-sampling-fee')?.value.trim()??'',values=[...document.querySelectorAll('[data-settlement]')].map(input=>input.value.trim());return paymentAmount(amount)&&validOptionalSamplingFee(fee)&&values.every(paymentAmount)?Number(amount)+Number(fee||0)+values.reduce((sum,value)=>sum+Number(value),0):null;}
function paymentShareFields(){const payer=document.getElementById('payment-payer')?.value,t=tasks.find(x=>x.id===document.getElementById('payment-task-id')?.value),total=paymentTotalValue();let names=payer==='二者皆有'?['商家','与辉']:payer==='商家'||payer==='与辉'?[payer]:[];document.getElementById('payment-share-fields').innerHTML=names.map(name=>`<label><span class="required-star" aria-hidden="true">*</span>${name}需支付金额（元）<input data-payment-share="${name}" type="number" min="0" step="0.01" value="${esc(t?.paymentShares?.[name]??(names.length===1&&total!==null?total.toFixed(2):''))}" oninput="updatePaymentTotal()"></label>`).join('');updatePaymentTotal();}
function updatePaymentTotal(changed=''){const t=tasks.find(x=>x.id===document.getElementById('payment-task-id')?.value),fee=document.getElementById('payment-sampling-fee'),amount=document.getElementById('payment-sampling-amount');if(t&&fee&&amount){if(changed==='fee')fee.dataset.auto='0';if(changed==='amount'&&fee.dataset.auto==='1')fee.value=defaultSamplingServiceFee(t,amount.value);fee.classList.toggle('sampling-fee-over',samplingFeeOverLimit(t,amount.value,fee.value));}const total=paymentTotalValue(),display=document.getElementById('payment-total');if(!display)return;display.textContent=total===null?'—':'¥ '+total.toFixed(2);const share=document.getElementById('payment-share-total');if(share){const values=[...document.querySelectorAll('[data-payment-share]')].map(x=>x.value.trim());share.textContent=values.length&&values.every(paymentAmount)?'¥ '+values.reduce((sum,x)=>sum+Number(x),0).toFixed(2):'—';}}

function openPaymentConfirmation(id) {
  const t=tasks.find(t=>t.id===id);
  if (!t||t.paymentConfirmed||!['款项确认','异常结束'].includes(t.status)) return;
  const items=paymentItems(t);
  document.getElementById('modal').innerHTML=`<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="payment-title" style="width:1080px">
    <div class="dialoghead"><h2 id="payment-title">款项确认 · ${esc(t.id)}</h2><button aria-label="关闭弹窗" onclick="closeModal()">×</button></div>
    <div class="dialogbody"><h3>主任务信息</h3><input id="payment-task-id" type="hidden" value="${esc(t.id)}"><div class="summarygrid payment-task-info"><div><label>主任务单号</label>${copyCodeHTML(t.id,'主任务单号')}</div><div><label>商品名称</label>${esc(t.name)}</div><div><label>商品编码</label>${copyCodeHTML(t.code,'商品编码')}</div><div><label>商品类目</label>${esc(productCategoryGroup(t))}</div><div><label>品牌</label>${esc(t.brand||'')}</div><div><label>执行标准</label>${esc(productExecutionStandards(t).join('、'))}</div><div><label>进单日期</label>${entryDateHTML(t)}</div><div><label>派单人</label>${esc(t.dispatcher||'')}</div><div><label>报告审核人</label>${esc(t.reportReviewer||'')}</div><div><label>商品类型</label>${esc(t.productType||'')}</div><div><label>下单图片</label>${t.packageSelected?'已选择':'未选择'}</div><div><label for="payment-task-type">任务类型</label><select id="payment-task-type" aria-label="款项确认任务类型">${opts(TASK_TYPES,t.taskType,'请选择任务类型')}</select></div><div><label for="payment-inspection-type">抽检类型</label><select id="payment-inspection-type" aria-label="款项确认抽检类型">${opts(TYPES,t.type,'请选择抽检类型')}</select></div><div><label>抽检事由</label>${esc(t.reason||'未填写')}</div><div><label for="payment-shipping-method">寄样方式</label><select id="payment-shipping-method" aria-label="款项确认寄样方式">${opts(['商家寄样','机构采样','与辉寄样'],t.shippingMethod,'请选择寄样方式')}</select></div><div><label for="payment-payer"><span class="required-star" aria-hidden="true">*</span>费用支出方</label><select id="payment-payer" aria-label="款项确认费用支出方" onchange="paymentShareFields()">${opts(PAYERS,t.payer,'请选择费用支出方')}</select></div><div><label>派单备注</label>${esc(t.dispatchRemark||'')}</div><div><label>抽检机构</label>${esc(t.agency||'')}</div><div><label>选择机构原由</label>${esc(t.agencyReason||'')}</div><div><label>异常结束原因备注</label>${esc(t.abnormalEndReason||'')}</div><div><label>核样失败原因</label>${esc(t.sampleCheckFailureReason||'')}</div><div><label>是否退样成功</label>${t.sampleReturnSucceeded===undefined?'':t.sampleReturnSucceeded?'是':'否'}</div><div><label>样品处理方式</label>${esc(t.sampleHandlingMethod||'')}</div></div><div class="payment-images"><div><label>商品图片</label><img src="${PRODUCT_IMAGE}" alt="商品图片"></div><div><label>下单图片</label><img src="${esc(t.subs.find(s=>s.packageImage)?.packageImage||PRODUCT_IMAGE)}" alt="下单图片"></div></div>${productSpecificationsHTML(t)}<label class="label" for="payment-sampling-amount"><span class="required-star" aria-hidden="true">*</span>采样金额（元）</label><input id="payment-sampling-amount" type="number" min="0" step="0.01" value="${esc(t.samplingAmount??'')}" aria-label="采样金额" style="width:180px" oninput="updatePaymentTotal('amount')"><label class="label" for="payment-sampling-fee">采样服务费（元）</label><input id="payment-sampling-fee" aria-label="采样服务费" type="number" min="0" step="0.01" value="${esc(samplingServiceFeeValue(t))}" data-auto="${samplingServiceFeeRate(t)&&(t.samplingServiceFee===undefined||Number(samplingServiceFeeValue(t))===Number(defaultSamplingServiceFee(t,t.samplingAmount))) ?'1':'0'}" class="${samplingFeeOverLimit(t,t.samplingAmount,samplingServiceFeeValue(t))?'sampling-fee-over':''}" style="width:180px" oninput="updatePaymentTotal('fee')"><div><label>采样备注</label>${esc(t.samplingRemark||'')}</div>${samplingOrderImagesHTML(t)}${sampleFailureImagesHTML(t)}
    <h3>子任务检测项目结算</h3><div class="tablewrap"><table class="payment-table"><thead><tr><th>序号</th><th>子任务单号</th><th>检测项目</th><th>检测方法</th><th>检测方法数量统计</th><th>判定依据 / 限值</th><th>项目备注</th><th>项目来源</th><th>项目计算公式</th><th>机构参考报价</th><th>机构实际报价</th><th><span class="required-star" aria-hidden="true">*</span>结算金额（元）</th></tr></thead>
    <tbody>${items.map((item,i)=>`<tr><td>${i+1}</td><td>${copyCodeHTML(item.sub.id,'子任务单号')}</td><td>${esc(item.project.name)}</td><td>${esc(item.project.method||'')}</td><td>${detectionMethodCount(item.project)}</td><td>${esc(item.project.limit||'')}</td><td>${esc(item.project.remark||'—')}</td><td>${esc(item.project.contractSource||'未设置')}</td><td class="payment-formula">${esc(projectCalculationFormula(item.project))}</td><td>${item.referencePrice==null?'—':'¥ '+Number(item.referencePrice).toFixed(2)}</td><td>${item.price==null?'—':'¥ '+Number(item.price).toFixed(2)}</td><td><input data-settlement="${i}" aria-label="${esc(item.sub.id)} ${esc(item.project.name)}结算金额" type="number" min="0" step="0.01" value="${t.status==='异常结束'?'0':esc(item.project.settlementAmount??item.price??'')}" ${t.status==='异常结束'?'readonly':''} oninput="updatePaymentTotal()"></td></tr>`).join('')||'<tr><td colspan="12">暂无检测项目</td></tr>'}</tbody></table></div><div class="payment-total">费用合计（采样金额＋采样服务费＋结算金额）：<strong id="payment-total">—</strong></div><h3>各方需支付金额</h3><div id="payment-share-fields" class="summarygrid"></div><div class="payment-total">各方金额合计：<strong id="payment-share-total">—</strong></div><div id="payment-error" class="error" role="alert"></div></div>
    <div class="dialogfooter"><button onclick="closeModal()">取消</button><button class="primary" onclick="confirmPayment('${t.id}')">确认金额并完成</button></div></section></div>`;
  paymentShareFields();
}

function confirmPayment(id) {
  const t=tasks.find(t=>t.id===id),error=document.getElementById('payment-error');
  if (!t||t.paymentConfirmed||!['款项确认','异常结束'].includes(t.status)||!error) return;
  const sampling=document.getElementById('payment-sampling-amount')?.value.trim();
  if (!paymentAmount(sampling)) {error.textContent='请输入不小于 0 且最多两位小数的采样金额';return;}
  const samplingFee=document.getElementById('payment-sampling-fee')?.value.trim()??'';
  if(!validOptionalSamplingFee(samplingFee)){error.textContent='采样服务费须为非负数，最多两位小数';return;}
  const payer=document.getElementById('payment-payer')?.value||'',taskType=document.getElementById('payment-task-type')?.value||'',inspectionType=document.getElementById('payment-inspection-type')?.value||'',shippingMethod=document.getElementById('payment-shipping-method')?.value||'';
  if((payer&&!PAYERS.includes(payer))||(taskType&&!TASK_TYPES.includes(taskType))||(inspectionType&&!TYPES.includes(inspectionType))||(shippingMethod&&!['商家寄样','机构采样','与辉寄样'].includes(shippingMethod))){error.textContent='请选择有效的主任务信息';return;}
  const items=paymentItems(t),amounts=[];
  for (let i=0;i<items.length;i++) {
    const raw=document.querySelector(`[data-settlement="${i}"]`)?.value.trim();
    if (!paymentAmount(raw)) {error.textContent=`${items[i].sub.id} 的“${items[i].project.name}”结算金额须为非负数且最多两位小数`;return;}
    amounts.push(Number(raw));
  }
  if(t.status==='异常结束'&&amounts.some(value=>value!==0)){error.textContent='异常结束任务的项目结算金额须为0';return;}
  if(!payer){error.textContent='请选择费用支出方';return;}
  const shares=[...document.querySelectorAll('[data-payment-share]')].map(input=>({name:input.dataset.paymentShare,value:input.value.trim()}));
  if(!shares.length||shares.some(share=>!paymentAmount(share.value))){error.textContent='请填写各方需支付金额，金额须为非负数且最多两位小数';return;}
  const totalCents=Math.round((Number(sampling)+Number(samplingFee||0)+amounts.reduce((sum,value)=>sum+value,0))*100),shareCents=shares.reduce((sum,share)=>sum+Math.round(Number(share.value)*100),0);
  if(shareCents>totalCents){error.textContent='各方需支付金额合计不得超过费用合计';return;}
  t.payer=payer;t.taskType=taskType;t.type=inspectionType;t.shippingMethod=shippingMethod;t.samplingAmount=Number(sampling);t.samplingServiceFee=samplingFee===''?'':Number(samplingFee);
  t.paymentShares=Object.fromEntries(shares.map(share=>[share.name,Number(share.value)]));
  items.forEach((item,i)=>{item.project.calculationFormula=projectCalculationFormula(item.project);item.project.settlementAmount=amounts[i];});
  const wasAbnormal=t.status==='异常结束';
  t.paymentConfirmed=true;t.status=wasAbnormal?'已完成（异常）':'已完成';save();closeModal();tabFilter='全部任务';query='';showList();toast(wasAbnormal?'款项已确认，主任务已完成（异常）':'款项已确认，主任务已完成');
}

function paymentSummaryHTML(t) {
  if (!['款项确认','异常结束','已完成','已完成（异常）'].includes(t.status)) return '';
  const items=paymentItems(t);
  return `<section class="summary payment-summary"><h2>款项确认${t.paymentConfirmed?' · 已确认':''}</h2><div class="summarygrid"><div><label>采样金额</label>${t.samplingAmount==null?'未填写':'¥ '+Number(t.samplingAmount).toFixed(2)}</div><div><label>采样服务费</label>${samplingFeeText(t)}</div><div><label>项目结算合计</label>${t.paymentConfirmed?'¥ '+items.reduce((sum,item)=>sum+Number(item.project.settlementAmount||0),0).toFixed(2):'待确认'}</div>${t.paymentConfirmed?Object.entries(t.paymentShares||{}).map(([name,amount])=>`<div><label>${esc(name)}结算金额</label>¥ ${Number(amount).toFixed(2)}</div>`).join(''):''}${t.paymentConfirmed?`<div><label>各方结算金额合计</label>¥ ${Object.values(t.paymentShares||{}).reduce((sum,amount)=>sum+Number(amount||0),0).toFixed(2)}</div>`:''}</div>${t.paymentConfirmed?`<div class="tablewrap"><table><thead><tr><th>子任务单号</th><th>检测项目</th><th>项目来源</th><th>项目计算公式</th><th>结算金额</th></tr></thead><tbody>${items.map(item=>`<tr><td>${copyCodeHTML(item.sub.id,'子任务单号')}</td><td>${esc(item.project.name)}</td><td>${esc(item.project.contractSource||'未选择')}</td><td>${esc(projectCalculationFormula(item.project))}</td><td>¥ ${Number(item.project.settlementAmount||0).toFixed(2)}</td></tr>`).join('')}</tbody></table></div>`:''}</section>`;
}
