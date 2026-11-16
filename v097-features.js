const PRODUCT_SPECIFICATIONS={
  SP001:[['蛋黄420g1包*1+板栗420g1包*1','蛋黄420g1包*1+板栗420g1包*1'],['蛋黄420g1包*1+五仁420g1包*1',''],['蛋黄420g1包*1+椒盐420g1包*1','蛋黄420g1包*1+板栗420g1包*1']],
  SP002:[['榴莲披萨 1 盒',''],['芝士榴莲披萨 1 盒','']],
  SP003:[['原味 1 箱',''],['无糖原味 1 箱','']]
};
function productSpecificationsHTML(t){const rows=PRODUCT_SPECIFICATIONS[t.code]||[[(t.name||t.code)+' 1 件','']];return `<div class="product-specifications"><h3>商品售卖规格和赠品信息</h3><div class="tablewrap"><table><thead><tr><th>序号</th><th>商品规格</th><th>赠品规格</th></tr></thead><tbody>${rows.map(([spec,gift],i)=>`<tr><td>${i+1}</td><td>${esc(spec)}</td><td>${esc(gift)}</td></tr>`).join('')}</tbody></table></div></div>`;}
function taskReviewDate(t){return t.subs.map(s=>s.reviewedAt||'').filter(Boolean).sort().at(-1)||'';}
function reviewDateText(value){return value?new Date(value).toLocaleDateString('sv-SE'):'';}
function defaultPayerForType(type){return type==='不合格复测'?'商家':'与辉';}
function copyCodeHTML(code,label){return `<span class="copy-code"><span>${esc(code)}</span><button type="button" class="copy-code-button" data-copy-code="${esc(code)}" aria-label="复制${esc(label)} ${esc(code)}" onclick="copyCode(this)">复制</button></span>`;}
async function copyCode(button){const code=button?.dataset.copyCode;if(!code)return;let copied=false;try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(code);copied=true;}}catch(e){}if(!copied){const input=document.createElement('textarea');input.value=code;input.setAttribute('readonly','');input.style.position='fixed';input.style.opacity='0';document.body.appendChild(input);input.select();try{copied=document.execCommand('copy');}catch(e){}input.remove();}toast(copied?'已复制：'+code:'复制失败，请手动复制');}
function setCreateType(index,value){const row=createRows[index];if(!row)return;row.type=value;if(!row.payerManual)row.payer=defaultPayerForType(value);renderCreateRows();}
function setCreatePayer(index,value){const row=createRows[index];if(!row)return;row.payer=value;row.payerManual=true;}
function confirmExecutionStandards(){const t=task(),input=document.getElementById('product-execution-standards');if(!t||!input||!memberPermissions.executionStandardEdit)return;const values=[...new Set(input.value.split(/[\n,，;；]+/).map(x=>x.trim()).filter(Boolean))];if(!values.length){toast('请输入执行标准');return;}t.productStandards=values;save();renderDetail();toast('执行标准已修改');}
function toggleCreateSku(index,sku,checked){const row=createRows[index];if(!row)return;row.skus||=[];if(checked&&!row.skus.includes(sku))row.skus.push(sku);if(!checked)row.skus=row.skus.filter(value=>value!==sku);const picker=document.querySelectorAll('.create-sku-picker')[index];if(picker)picker.querySelector('summary').textContent=`已选 ${row.skus.length} 项`;}
function applyCreateBatch(field){const selected=document.getElementById('batch-create-'+field)?.value;if(!selected)return;for(const row of createRows){row[field]=selected;if(field==='type'&&!row.payerManual)row.payer=defaultPayerForType(selected);if(field==='payer')row.payerManual=true;}renderCreateRows();}
