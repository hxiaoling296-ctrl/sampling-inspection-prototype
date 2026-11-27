let batchReportFiles=[];
function openBatchReportUpload(){
  if(tabFilter!=='已进单'||view!=='list')return;
  batchReportFiles=[];
  document.getElementById('modal').innerHTML=`<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="batch-report-title" style="width:960px"><div class="dialoghead"><h2 id="batch-report-title">批量上传报告</h2><button onclick="closeModal()">×</button></div><div class="dialogbody"><p>选择多个报告。文件名最前部分为子任务号时，自动归属对应子任务。</p><label>选择报告文件 <input id="batch-report-files" type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onchange="renderBatchReportFiles()"></label><div class="form-line"><span class="form-caption"><span class="required-star" aria-hidden="true">*</span>批量设置子任务状态</span><div class="field-content"><select id="batch-report-status" aria-label="批量设置子任务状态"><option value="">请选择状态</option><option value="已出但未出全">已出但未出全</option><option value="已出全">已出全</option></select></div></div><div class="tablewrap"><table><thead><tr><th>序号</th><th>文件名称</th><th>归属子任务</th><th>报告备注</th><th>操作</th></tr></thead><tbody id="batch-report-rows"><tr><td colspan="5" class="muted">请选择报告文件</td></tr></tbody></table></div><div id="batch-report-error" class="error" role="alert"></div></div><div class="dialogfooter"><button onclick="closeModal()">取消</button><button class="primary" onclick="confirmBatchReportUpload()">确认上传</button></div></section></div>`;
}
function batchReportParts(file){const i=file.name.lastIndexOf('.');return i>0?{stem:file.name.slice(0,i),ext:file.name.slice(i)}:{stem:file.name,ext:''};}
function batchReportTarget(stem){const code=stem.trim().toLowerCase();if(!code)return null;return visibleListTasks.filter(t=>t.status==='已进单').flatMap(t=>t.subs.map(s=>({t,s}))).filter(({s})=>code.startsWith(s.id.toLowerCase())).sort((a,b)=>b.s.id.length-a.s.id.length)[0]||null;}
function batchReportReviewLocked(t,s){return !!(t.reviewLocked||s.reviewLocked||document.getElementById('app')?.inert);}
function renderBatchReportFiles(){const input=document.getElementById('batch-report-files');if(!input)return;batchReportFiles=[...input.files].map(file=>({file,stem:batchReportParts(file).stem,remark:''}));paintBatchReportRows();}
function paintBatchReportTarget(i){const row=batchReportFiles[i],cell=document.getElementById(`batch-report-target-${i}`);if(!row||!cell)return;const target=batchReportTarget(row.stem);cell.textContent=target?`${target.t.id} / ${target.s.id}`:'未匹配子任务';cell.classList.toggle('error',!target);}
function removeBatchReportFile(i){batchReportFiles.splice(i,1);paintBatchReportRows();}
function paintBatchReportRows(){const body=document.getElementById('batch-report-rows');if(!body)return;body.innerHTML=batchReportFiles.length?batchReportFiles.map((row,i)=>`<tr><td>${i+1}</td><td>${esc(row.file.name)}</td><td id="batch-report-target-${i}"></td><td><textarea id="batch-report-remark-${i}" maxlength="200" aria-label="第${i+1}份报告备注" oninput="batchReportFiles[${i}].remark=this.value">${esc(row.remark)}</textarea></td><td><button class="link" onclick="removeBatchReportFile(${i})">移除</button></td></tr>`).join(''):'<tr><td colspan="5" class="muted">请选择报告文件</td></tr>';batchReportFiles.forEach((_,i)=>paintBatchReportTarget(i));document.getElementById('batch-report-error').textContent='';}
async function confirmBatchReportUpload(){
  const error=document.getElementById('batch-report-error'),status=document.getElementById('batch-report-status')?.value;
  if(!error)return;if(!batchReportFiles.length){error.textContent='请选择报告文件';return;}
  const matched=batchReportFiles.map(row=>({row,target:batchReportTarget(row.stem)}));
  const counts=new Map();for(const {target} of matched)if(target)counts.set(target.s.id,(counts.get(target.s.id)||0)+1);
  const invalid=matched.filter(({row,target})=>!target||counts.get(target.s.id)>1||!isActiveSub(target.t,target.s)||!canUploadReportSub(target.s)||isReviewed(target.s)||batchReportReviewLocked(target.t,target.s)||(target.s.reportFiles||[]).length||!row.stem.trim()||/[\\/]/.test(row.stem));
  if(invalid.length){error.textContent=`有文件不符合要求、文件名：${[...new Set(invalid.map(({row})=>row.file.name))].join('、')}。请检查后提交。`;return;}
  if(!status){error.textContent='请选择子任务状态';return;}
  const changes=[];
  for(const {row,target:{t,s}} of matched){if(row.remark.trim().length>200){error.textContent='报告备注最多输入200字';return;}changes.push({t,s,file:row.file,name:row.file.name,remark:row.remark.trim(),id:newReportId()});}
  try{await saveReportBlobs(changes.map(c=>({id:c.id,file:c.file})));}catch(e){error.textContent='报告文件保存失败，请检查浏览器存储空间';return;}
  changes.forEach(({s,file,name,remark,id})=>{s.reportFiles=[{id,name,size:file.size,type:file.type,remark}];s.reportStatus=status;s.reportIssued=true;s.acceptanceStatus=status;});save();batchReportFiles=[];closeModal();searchList();toast(`已为 ${changes.length} 个子任务上传报告`);
}
