const billingMonthSelected = new Set();
let billingMonthDialogIds = [];

function canSetBillingMonth(t) {
  return !!t && ['款项确认', '已完成', '已完成（异常）'].includes(t.status);
}

function syncBillingMonthSelection(rows) {
  const visible = new Set(portalMode === 'business' && ['全部任务', '待审核'].includes(tabFilter) ? rows.map(t => t.id) : []);
  for (const id of billingMonthSelected) if (!visible.has(id)) billingMonthSelected.delete(id);
  updateBillingMonthSelection();
}

function updateBillingMonthSelection() {
  const count = billingMonthSelected.size;
  const button = document.getElementById('billing-batch-button');
  const reviewerButton = document.getElementById('reviewer-batch-button');
  const label = document.getElementById('billing-batch-count');
  const all = document.getElementById('billing-select-all');
  if (button) button.disabled = ![...billingMonthSelected].some(id => canSetBillingMonth(tasks.find(t => t.id === id)));
  if (reviewerButton) reviewerButton.disabled = !count;
  if (label) label.textContent = `已选 ${count} 条主任务`;
  if (all) {
    const choices = [...document.querySelectorAll('.billing-task-check')];
    all.checked = !!choices.length && choices.every(x => x.checked);
    all.indeterminate = choices.some(x => x.checked) && !all.checked;
  }
}

function toggleBillingMonthTask(id, checked) {
  const t = tasks.find(t => t.id === id);
  if (!t || !visibleListTasks.includes(t)) return;
  if (checked) billingMonthSelected.add(id);
  else billingMonthSelected.delete(id);
  updateBillingMonthSelection();
}

function toggleAllBillingMonth(checked) {
  for (const box of document.querySelectorAll('.billing-task-check')) {
    box.checked = checked;
    toggleBillingMonthTask(box.value, checked);
  }
  updateBillingMonthSelection();
}

function openBillingMonthBatch() {
  if (portalMode !== 'business' || tabFilter !== '全部任务') return;
  const visible = new Set(visibleListTasks.map(t => t.id));
  openBillingMonth([...billingMonthSelected].filter(id => visible.has(id) && canSetBillingMonth(tasks.find(t => t.id === id))));
}

function openBillingMonth(ids) {
  if (portalMode !== 'business' || tabFilter !== '全部任务') return;
  const rows = [...new Set(ids)].map(id => tasks.find(t => t.id === id)).filter(canSetBillingMonth);
  if (!rows.length) { toast('请先选择已完成的主任务'); return; }
  billingMonthDialogIds = rows.map(t => t.id);
  const now=new Date(),previous=new Date(now.getFullYear(),now.getMonth()-1,1),initial=`${previous.getFullYear()}-${String(previous.getMonth()+1).padStart(2,"0")}`;
  const batchControls = rows.length > 1 ? `<label class="label" for="billing-month-value">统一账期月份</label><input id="billing-month-value" type="month" min="2026-06" value="${esc(initial)}" aria-label="统一账期月份" oninput="applyBillingMonthToRows(this.value)" onchange="applyBillingMonthToRows(this.value)"><p>本次设置 ${rows.length} 个已完成主任务。选择上方月份后自动填入下方，也可逐条调整；点击确认保存后生效。</p>` : '';
  document.getElementById('modal').innerHTML = `<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="billing-month-title" style="width:${rows.length === 1 ? 560 : 740}px"><div class="dialoghead"><h2 id="billing-month-title">${rows.length === 1 ? '添加/修改账期月份' : '批量设置账期月份'}</h2><button aria-label="关闭弹窗" onclick="closeModal()">×</button></div><div class="dialogbody">${batchControls}<div class="tablewrap"><table><thead><tr><th>主任务单号</th><th>商品名称</th><th>当前账期</th><th>新账期月份</th></tr></thead><tbody>${rows.map(t => `<tr><td>${copyCodeHTML(t.id, '主任务单号')}</td><td>${esc(t.name)}</td><td>${esc(t.billingMonth || '未设置')}</td><td><input class="billing-month-row-value" data-task-id="${esc(t.id)}" type="month" min="2026-06" value="${esc(initial)}" aria-label="主任务 ${esc(t.id)} 账期月份"></td></tr>`).join('')}</tbody></table></div><div id="billing-month-error" class="error" role="alert"></div></div><div class="dialogfooter"><button onclick="closeModal()">取消</button><button class="primary" onclick="confirmBillingMonth()">确认保存</button></div></section></div>`;
}

function applyBillingMonthToRows(month) {
  document.querySelectorAll('.billing-month-row-value').forEach(input => { input.value = month; });
  const error = document.getElementById('billing-month-error');
  if (error) error.textContent = '';
}

function confirmBillingMonth() {
  const value = document.getElementById('billing-month-value')?.value || '';
  const error = document.getElementById('billing-month-error');
  if (!error) return;
  const rows = billingMonthDialogIds.map(id => tasks.find(t => t.id === id));
  if (!rows.length || rows.some(t => !canSetBillingMonth(t))) { error.textContent = '任务状态已变化，请重新选择'; return; }
  const validMonth = month => /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
  const changes = rows.map(t => ({task:t, month:document.querySelector(`.billing-month-row-value[data-task-id="${t.id}"]`)?.value || value}));
  if (changes.some(change => !validMonth(change.month)||change.month<'2026-06')) { error.textContent = rows.length === 1 ? '请选择新账期月份' : '请完善所有主任务新账期月份。'; return; }
  for (const {task,month} of changes) task.billingMonth = month;
  save();
  billingMonthSelected.clear();
  closeModal();
  renderList();
  toast(`已保存 ${rows.length} 个主任务的账期月份`);
}

