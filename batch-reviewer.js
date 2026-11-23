let batchReviewerTaskIds = [];
function canBatchChangeReviewer(t){return !!t&&['草稿','待派单','接单失败','待接单','待采样','核样中','已进单'].includes(t.status);}

function openBatchReviewer() {
  if (portalMode !== 'business' || !['全部任务', '待审核'].includes(tabFilter)) return;
  const visible = new Set(visibleListTasks.map(t => t.id));
  const rows = [...billingMonthSelected].filter(id => visible.has(id)).map(id => tasks.find(t => t.id === id)).filter(canBatchChangeReviewer);
  if (!rows.length) { toast('请先勾选主任务'); return; }
  batchReviewerTaskIds = rows.map(t => t.id);
  document.getElementById('modal').innerHTML = `<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="batch-reviewer-title" style="width:740px"><div class="dialoghead"><h2 id="batch-reviewer-title">批量修改报告审核人</h2><button aria-label="关闭弹窗" onclick="closeModal()">×</button></div><div class="dialogbody"><label class="label" for="batch-reviewer-value">统一报告审核人</label><select id="batch-reviewer-value" aria-label="统一报告审核人" onchange="applyBatchReviewerToRows(this.value)">${opts(REVIEWERS, '', '请选择报告审核人')}</select><p>本次修改 ${rows.length} 个主任务。选择上方审核人后自动填入下方，也可逐条调整；点击确认修改后生效。</p><div class="tablewrap"><table><thead><tr><th>主任务单号</th><th>商品名称</th><th>当前报告审核人</th><th>新报告审核人</th></tr></thead><tbody>${rows.map(t => `<tr><td>${copyCodeHTML(t.id, '主任务单号')}</td><td>${esc(t.name)}</td><td>${esc(t.reportReviewer || '未选择')}</td><td><select class="batch-reviewer-row-value" data-task-id="${esc(t.id)}" aria-label="主任务 ${esc(t.id)} 报告审核人">${opts(REVIEWERS, '', '请选择报告审核人')}</select></td></tr>`).join('')}</tbody></table></div><div id="batch-reviewer-error" class="error" role="alert"></div></div><div class="dialogfooter"><button onclick="closeModal()">取消</button><button class="primary" onclick="confirmBatchReviewer()">确认修改</button></div></section></div>`;
}

function applyBatchReviewerToRows(reviewer) {
  document.querySelectorAll('.batch-reviewer-row-value').forEach(select => { select.value = reviewer; });
  const error = document.getElementById('batch-reviewer-error');
  if (error) error.textContent = '';
}

function confirmBatchReviewer() {
  const reviewer = document.getElementById('batch-reviewer-value')?.value;
  const error = document.getElementById('batch-reviewer-error');
  if (!error) return;
  const rows = batchReviewerTaskIds.map(id => tasks.find(t => t.id === id));
  if (!rows.length || rows.some(t => !canBatchChangeReviewer(t))) { error.textContent = '主任务状态变更，请刷新后重试。'; return; }
  const changes = rows.map(t => ({task:t, reviewer:document.querySelector(`.batch-reviewer-row-value[data-task-id="${t.id}"]`)?.value || reviewer}));
  if (changes.some(change => !REVIEWERS.includes(change.reviewer))) { error.textContent = '请在上方选择统一报告审核人，或为每个主任务单独选择'; return; }
  for (const {task,reviewer:chosenReviewer} of changes) task.reportReviewer = chosenReviewer;
  save();
  billingMonthSelected.clear();
  closeModal();
  renderList();
  toast(`已修改 ${rows.length} 个主任务的报告审核人`);
}

