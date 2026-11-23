function openAbnormalEnd(taskId){
  const t=tasks.find(item=>item.id===taskId);
  if(tabFilter!=='全部任务'||!t||t.status!=='核样中'||!activeOrderSubs(t).length)return;
  document.getElementById('modal').innerHTML=`<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="abnormal-end-title" style="width:520px"><div class="dialoghead"><h2 id="abnormal-end-title">异常结束 · ${esc(t.id)}</h2><button aria-label="关闭弹窗" onclick="closeModal()">×</button></div><div class="dialogbody"><label class="label" for="abnormal-end-reason"><span class="required-star" aria-hidden="true">*</span>异常结束原因备注</label><textarea id="abnormal-end-reason" maxlength="200" placeholder="请输入异常结束原因备注"></textarea><div id="abnormal-end-error" class="error" role="alert"></div></div><div class="dialogfooter"><button onclick="closeModal()">取消</button><button class="primary" onclick="confirmAbnormalEnd('${t.id}')">确认异常结束</button></div></section></div>`;
  document.getElementById('abnormal-end-reason').focus();
}
function confirmAbnormalEnd(taskId){
  const t=tasks.find(item=>item.id===taskId),reason=document.getElementById('abnormal-end-reason')?.value.trim()||'',error=document.getElementById('abnormal-end-error');
  if(!t||t.status!=='核样中'||!activeOrderSubs(t).length||!error)return;
  if(!reason){error.textContent='请输入异常结束原因备注';return;}
  if(reason.length>200){error.textContent='异常结束原因备注最多200字';return;}
  t.abnormalEndReason=reason;t.abnormalEndedAt=new Date().toISOString();t.status='异常结束';
  t.subs.forEach(s=>{if(isActiveSub(t,s)&&!s.reportIssued)s.acceptanceStatus='异常结束';});
  save();closeModal();searchList();toast('任务已异常结束，可在款项确认页核对金额');
}
