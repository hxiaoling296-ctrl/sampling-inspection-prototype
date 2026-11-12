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
function updatePaymentTotal(){const amount=document.getElementById('payment-sampling-amount')?.value.trim(),values=[...document.querySelectorAll('[data-settlement]')].map(input=>input.value.trim()),total=document.getElementById('payment-total');if(!total)return;total.textContent=paymentAmount(amount)&&values.every(paymentAmount)?'¥ '+(Number(amount)+values.reduce((sum,value)=>sum+Number(value),0)).toFixed(2):'—';}

function openPaymentConfirmation(id) {
  const t=tasks.find(t=>t.id===id);
  if (!t||t.status!=='款项确认') return;
  const items=paymentItems(t);
  document.getElementById('modal').innerHTML=`<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="payment-title" style="width:1080px">
    <div class="dialoghead"><h2 id="payment-title">款项确认 · ${esc(t.id)}</h2><button aria-label="关闭弹窗" onclick="closeModal()">×</button></div>
    <div class="dialogbody"><div class="summarygrid payment-task-info"><div><label>商品名称</label>${esc(t.name)}</div><div><label>商品编码</label>${esc(t.code)}</div><div><label>进单日期</label>${entryDateHTML(t)}</div><div><label for="payment-task-type">任务类型</label><select id="payment-task-type" aria-label="款项确认任务类型">${opts(TASK_TYPES,t.taskType,'请选择任务类型')}</select></div><div><label for="payment-inspection-type">抽检类型</label><select id="payment-inspection-type" aria-label="款项确认抽检类型">${opts(TYPES,t.type,'请选择抽检类型')}</select></div><div><label>抽检事由</label>${esc(t.reason||'未填写')}</div><div><label for="payment-shipping-method">寄样方式</label><select id="payment-shipping-method" aria-label="款项确认寄样方式">${opts(['商家寄样','机构采样'],t.shippingMethod,'请选择寄样方式')}</select></div><div><label for="payment-payer">费用支出方</label><select id="payment-payer" aria-label="款项确认费用支出方">${opts(PAYERS,t.payer,'请选择费用支出方')}</select></div><div><label>派单备注</label>${esc(t.dispatchRemark||'未填写')}</div><div><label>抽检机构</label>${esc(t.agency||'未选择')}</div><div><label>选择机构原由</label>${esc(t.agencyReason||'未填写')}</div></div><label class="label" for="payment-sampling-amount">采样金额（元）</label><input id="payment-sampling-amount" type="number" min="0" step="0.01" value="${esc(t.samplingAmount??'')}" aria-label="采样金额" style="width:180px" oninput="updatePaymentTotal()">
    <h3>子任务检测项目结算</h3><div class="tablewrap"><table class="payment-table"><thead><tr><th>子任务单号</th><th>检测项目</th><th>项目备注</th><th>项目来源</th><th>项目计算公式</th><th>机构参考报价</th><th>机构实际报价</th><th>结算金额（元）</th></tr></thead>
    <tbody>${items.map((item,i)=>`<tr><td>${esc(item.sub.id)}</td><td>${esc(item.project.name)}</td><td>${esc(item.project.remark||'—')}</td><td>${esc(item.project.contractSource||'未设置')}</td><td class="payment-formula">${esc(projectCalculationFormula(item.project))}</td><td>${item.referencePrice==null?'—':'¥ '+Number(item.referencePrice).toFixed(2)}</td><td>${item.price==null?'—':'¥ '+Number(item.price).toFixed(2)}</td><td><input data-settlement="${i}" aria-label="${esc(item.sub.id)} ${esc(item.project.name)}结算金额" type="number" min="0" step="0.01" value="${esc(item.project.settlementAmount??item.price??'')}" oninput="updatePaymentTotal()"></td></tr>`).join('')||'<tr><td colspan="8">暂无检测项目</td></tr>'}</tbody></table></div><div class="payment-total">费用合计（采样金额＋结算金额）：<strong id="payment-total">—</strong></div><div id="payment-error" class="error" role="alert"></div></div>
    <div class="dialogfooter"><button onclick="closeModal()">取消</button><button class="primary" onclick="confirmPayment('${t.id}')">确认金额并完成</button></div></section></div>`;
  updatePaymentTotal();
}

function confirmPayment(id) {
  const t=tasks.find(t=>t.id===id),error=document.getElementById('payment-error');
  if (!t||t.status!=='款项确认'||!error) return;
  const sampling=document.getElementById('payment-sampling-amount')?.value.trim();
  if (!paymentAmount(sampling)) {error.textContent='请输入不小于 0 且最多两位小数的采样金额';return;}
  const payer=document.getElementById('payment-payer')?.value||'',taskType=document.getElementById('payment-task-type')?.value||'',inspectionType=document.getElementById('payment-inspection-type')?.value||'',shippingMethod=document.getElementById('payment-shipping-method')?.value||'';
  if((payer&&!PAYERS.includes(payer))||(taskType&&!TASK_TYPES.includes(taskType))||(inspectionType&&!TYPES.includes(inspectionType))||(shippingMethod&&!['商家寄样','机构采样'].includes(shippingMethod))){error.textContent='请选择有效的主任务信息';return;}
  const items=paymentItems(t),amounts=[];
  for (let i=0;i<items.length;i++) {
    const raw=document.querySelector(`[data-settlement="${i}"]`)?.value.trim();
    if (!paymentAmount(raw)) {error.textContent=`${items[i].sub.id} 的“${items[i].project.name}”结算金额须为非负数且最多两位小数`;return;}
    amounts.push(Number(raw));
  }
  t.payer=payer;t.taskType=taskType;t.type=inspectionType;t.shippingMethod=shippingMethod;t.samplingAmount=Number(sampling);
  items.forEach((item,i)=>{item.project.calculationFormula=projectCalculationFormula(item.project);item.project.settlementAmount=amounts[i];});
  t.paymentConfirmed=true;t.status='已完成';save();closeModal();tabFilter='全部任务';query='';showList();toast('款项已确认，主任务已完成');
}

function paymentSummaryHTML(t) {
  if (!['款项确认','已完成'].includes(t.status)) return '';
  const items=paymentItems(t);
  return `<section class="summary payment-summary"><h2>款项确认${t.paymentConfirmed?' · 已确认':''}</h2><div class="summarygrid"><div><label>采样金额</label>${t.samplingAmount==null?'未填写':'¥ '+Number(t.samplingAmount).toFixed(2)}</div><div><label>项目结算合计</label>${t.paymentConfirmed?'¥ '+items.reduce((sum,item)=>sum+Number(item.project.settlementAmount||0),0).toFixed(2):'待确认'}</div></div>${t.paymentConfirmed?`<div class="tablewrap"><table><thead><tr><th>子任务单号</th><th>检测项目</th><th>项目来源</th><th>项目计算公式</th><th>结算金额</th></tr></thead><tbody>${items.map(item=>`<tr><td>${esc(item.sub.id)}</td><td>${esc(item.project.name)}</td><td>${esc(item.project.contractSource||'未选择')}</td><td>${esc(projectCalculationFormula(item.project))}</td><td>¥ ${Number(item.project.settlementAmount||0).toFixed(2)}</td></tr>`).join('')}</tbody></table></div>`:''}</section>`;
}
