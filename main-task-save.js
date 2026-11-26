function mainInfoInput(id){const el=document.getElementById(id);return el&&!el.disabled?el:null;}
function updateMainInvoiceRequirement(){const required=requiresInvoiceInfo(document.getElementById('main-payer')?.value);document.querySelectorAll('#main-invoice-field .invoice-input-pair label').forEach(label=>{let star=label.querySelector('.required-star');if(required&&!star)label.insertAdjacentHTML('afterbegin','<span class="required-star" aria-hidden="true">*</span>');else if(!required)star?.remove();});}
function saveMainTaskInfo(){
  const t=task(),error=document.getElementById('main-task-save-error');if(!t||!error)return;
  error.textContent='';
  const payer=mainInfoInput('main-payer')?.value??t.payer;
  const title=mainInfoInput('main-invoice-title')?.value.trim()??invoiceTitleOf(t);
  const taxNumber=mainInfoInput('main-invoice-tax-number')?.value.trim()??invoiceTaxNumberOf(t);
  if(!PAYERS.includes(payer)){error.textContent='请选择费用支出方';return;}
  if(!invoiceLengthValid(title,taxNumber)){error.textContent='开票信息每项不得超过200字';return;}
  if(requiresInvoiceInfo(payer)&&(!title||!taxNumber)){error.textContent='请填写商家发票信息和邮箱';return;}
  const taskType=mainInfoInput('main-task-type')?.value;
  const inspectionType=mainInfoInput('main-inspection-type')?.value;
  if(taskType&&!TASK_TYPES.includes(taskType)){error.textContent='请选择任务类型';return;}
  if(inspectionType&&!TYPES.includes(inspectionType)){error.textContent='请选择抽检类型';return;}
  const session=mainInfoInput('main-planned-session')?.value.trim();
  const spec=mainInfoInput('main-planned-spec')?.value.trim();
  if((session?.length||0)>35||(spec?.length||0)>100){error.textContent='计划专场最多35字，计划检测规格最多100字';return;}
  const reviewer=document.querySelector('#main-task-fields [data-main-reviewer]:not(:disabled)')?.value;
  if(reviewer&&!REVIEWERS.includes(reviewer)){error.textContent='请选择报告审核人';return;}
  const amount=mainInfoInput('main-sampling-amount')?.value.trim();
  const fee=mainInfoInput('main-sampling-fee')?.value.trim();
  if(amount!==undefined&&!/^\d+(?:\.\d{1,2})?$/.test(amount)){error.textContent='采样金额须为非负数，最多两位小数';return;}
  if(fee!==undefined&&!validOptionalSamplingFee(fee)){error.textContent='采样服务费须为非负数，最多两位小数';return;}
  const remark=mainInfoInput('main-dispatch-remark')?.value.trim();
  const sampleRemark=mainInfoInput('main-sampling-remark')?.value.trim();
  if((remark?.length||0)>200||(sampleRemark?.length||0)>200){error.textContent='备注最多200字';return;}
  const set=(key,value)=>{if(value!==undefined)t[key]=value;};
  set('taskType',taskType);set('type',inspectionType);set('plannedSession',session);set('plannedInspectionSpec',spec);
  set('payer',payer);
  if(mainInfoInput('main-invoice-title')||mainInfoInput('main-invoice-tax-number'))setInvoiceFields(t,title,taxNumber);
  set('agencyReason',mainInfoInput('main-agency-reason')?.value.trim());set('reportReviewer',reviewer);
  if(remark!==undefined){if(t.dispatchRemark!==remark)t.dispatchRemarkUpdatedAt=new Date().toISOString();t.dispatchRemark=remark;}
  if(amount!==undefined)t.samplingAmount=Number(amount);
  if(fee!==undefined)t.samplingServiceFee=fee===''?'':Number(fee);
  set('samplingRemark',sampleRemark);
  save();renderDetail();toast('主任务信息已保存');
}
