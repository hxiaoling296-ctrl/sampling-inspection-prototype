const DETAIL_MAIN_UPDATE_KEYS=['supplementalSellingLink','productSpecifications','taskType','productType','plannedSession','plannedInspectionSpec','payer','invoiceInfo','type','agencyReason','shippingMethod','reportReviewer','dispatchRemark','packageSelected','samplingAmount','samplingServiceFee','samplingRemark','samplingOrderImages'];
const DETAIL_SUB_UPDATE_KEYS=['sampleQuantity','shippingAddress','reportFiles','reviewJudgmentRemark','reviewSpecialRemark','reviewFailureRemark','reviewReturnRemark'];
let detailSavedSnapshot=null;

function detailSnapshot(items){return new Map(items.map(t=>[t.id,{main:Object.fromEntries(DETAIL_MAIN_UPDATE_KEYS.map(key=>[key,JSON.stringify(t[key]??null)])),subs:new Map((t.subs||[]).map(s=>[s.id,Object.fromEntries(DETAIL_SUB_UPDATE_KEYS.map(key=>[key,JSON.stringify(s[key]??null)]))]))}]));}
function trackDetailUpdateTimes(){
  if(!detailSavedSnapshot){try{const stored=JSON.parse(localStorage.getItem(KEY)||'null');detailSavedSnapshot=detailSnapshot(Array.isArray(stored?.tasks)?stored.tasks:[]);}catch(e){detailSavedSnapshot=new Map();}}
  const now=new Date().toISOString();
  for(const t of tasks){const prior=detailSavedSnapshot.get(t.id);if(!prior)continue;
    for(const key of DETAIL_MAIN_UPDATE_KEYS)if(prior.main[key]!==JSON.stringify(t[key]??null))(t.detailUpdatedAt||(t.detailUpdatedAt={}))[key]=now;
    for(const s of t.subs||[]){const previous=prior.subs.get(s.id);if(!previous)continue;for(const key of DETAIL_SUB_UPDATE_KEYS)if(previous[key]!==JSON.stringify(s[key]??null))(s.detailUpdatedAt||(s.detailUpdatedAt={}))[key]=now;}
  }
  detailSavedSnapshot=detailSnapshot(tasks);
}
function formatDetailUpdateTime(value){if(!value)return '';const date=new Date(value);if(Number.isNaN(date.getTime()))return '';const pad=n=>String(n).padStart(2,'0');return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;}
function placeDetailUpdateTime(host,key,value){if(!host)return;let label=[...host.children].find(child=>child.matches?.('small[data-detail-updated]')&&child.dataset.detailUpdated===key);const formatted=formatDetailUpdateTime(value);if(!formatted){label?.remove();return;}if(!label){label=document.createElement('small');label.className='muted detail-update-time';label.dataset.detailUpdated=key;host.append(label);}label.textContent=`更新时间：${formatted}`;}
function renderDetailUpdateTimes(t=task()){
  if(!t||view!=='detail')return;
  const basic=document.querySelector('.product-basic .basic-fields');
  placeDetailUpdateTime(basic?.querySelector('#supplemental-selling-link')?.closest('.basic-fields > div'),'supplementalSellingLink',t.detailUpdatedAt?.supplementalSellingLink);
  const main=document.querySelector('.main-info-grid');
  const fields={'任务类型':'taskType','费用支出方':'payer','开票信息':'invoiceInfo','抽检类型':'type','报告审核人':'reportReviewer','选择机构原由':'agencyReason','寄样方式':'shippingMethod','采样金额（元）':'samplingAmount','采样服务费（元）':'samplingServiceFee','采样备注':'samplingRemark','采样订单图片':'samplingOrderImages'};
  for(const field of main?.children||[]){const label=field.querySelector(':scope > label');if(!label)continue;const key=fields[label.textContent.trim().replace(/^\*/,'')];if(key)placeDetailUpdateTime(field,key,t.detailUpdatedAt?.[key]);}
  for(const field of main?.querySelectorAll('.planned-fields > div')||[]){const label=field.querySelector(':scope > label');const key=label?.textContent==='计划专场'?'plannedSession':label?.textContent==='计划检测规格'?'plannedInspectionSpec':'';if(key)placeDetailUpdateTime(field,key,t.detailUpdatedAt?.[key]);}
  placeDetailUpdateTime(main?.querySelector('.product-specifications'),'productSpecifications',t.productSpecificationsRefreshedAt);
  for(const [i,s] of t.subs.entries()){
    const section=document.querySelector(`[data-subtask="${i}"]`);if(!section)continue;
    for(const [key,note] of [['reviewJudgmentRemark','judgment'],['reviewSpecialRemark','special'],['reviewFailureRemark','failure']])placeDetailUpdateTime(section.querySelector(`[data-subtask-note="${note}"]`)?.closest('.subtask-review-note-field'),key,s.detailUpdatedAt?.[key]);
    for(const item of section.querySelectorAll('.report-section .report-item'))placeDetailUpdateTime(item,'reportFiles',s.detailUpdatedAt?.reportFiles);
    placeDetailUpdateTime(section.querySelector(`[data-merchant-quantity="${i}"]`)?.closest('label'),'sampleQuantity',s.detailUpdatedAt?.sampleQuantity);
    placeDetailUpdateTime(section.querySelector(`[data-merchant-address="${i}"]`)?.closest('label'),'shippingAddress',s.detailUpdatedAt?.shippingAddress);
  }
}
