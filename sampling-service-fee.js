function isSgsSampling(t){return String(t?.agency||'').trim().toUpperCase()==='SGS';}
function defaultSamplingServiceFee(t,amount){return isSgsSampling(t)&&amount!==''&&amount!=null&&Number.isFinite(Number(amount))?Math.round(Number(amount)*5)/100:'';}
function samplingServiceFeeValue(t){return t.samplingServiceFee===undefined?defaultSamplingServiceFee(t,t.samplingAmount):t.samplingServiceFee;}
function samplingFeeOverLimit(t,amount,fee){return isSgsSampling(t)&&fee!==''&&fee!=null&&amount!==''&&amount!=null&&Number(fee)>Number(amount)*0.05+0.000001;}
function samplingFeeText(t,amount=t.samplingAmount){const fee=samplingServiceFeeValue(t);return `<span class="sampling-fee-value ${samplingFeeOverLimit(t,amount,fee)?'sampling-fee-over':''}" data-sampling-fee-value="${esc(fee)}">${fee===''?'':`¥ ${Number(fee).toFixed(2)}`}</span>`;}
function syncSamplingFeeInput(taskId,amountId,feeId){const t=tasks.find(item=>item.id===taskId),amount=document.getElementById(amountId),fee=document.getElementById(feeId);if(!t||!amount||!fee)return;if(isSgsSampling(t)&&fee.dataset.touched!=='1')fee.value=defaultSamplingServiceFee(t,amount.value);fee.classList.toggle('sampling-fee-over',samplingFeeOverLimit(t,amount.value,fee.value));}
function touchSamplingFeeInput(taskId,amountId,feeId){const fee=document.getElementById(feeId);if(!fee)return;fee.dataset.touched='1';syncSamplingFeeInput(taskId,amountId,feeId);}
function updateSamplingFeeDisplay(t,amountId){const amount=document.getElementById(amountId)?.value;document.querySelectorAll('.sampling-fee-value').forEach(el=>el.classList.toggle('sampling-fee-over',samplingFeeOverLimit(t,amount,el.dataset.samplingFeeValue)));}
function canEditSamplingBeforeReport(t){return t.samplingAmount!==undefined&&t.samplingAmount!==''&&t.subs.every(s=>!(s.reportFiles||[]).length&&!s.reportIssued);}
function validOptionalSamplingFee(value){return value===''||/^\d+(?:\.\d{1,2})?$/.test(String(value).trim());}
