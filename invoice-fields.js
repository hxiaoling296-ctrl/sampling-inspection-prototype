function invoiceTitleOf(item){
  if(item?.invoiceMerchantInfo!==undefined)return String(item.invoiceMerchantInfo);
  const title=String(item?.invoiceTitle||'').trim(),tax=String(item?.invoiceTaxNumber||'').trim();
  if(title||tax)return [title&&`发票抬头：${title}`,tax&&`税号：${tax}`].filter(Boolean).join('；');
  return String(item?.invoiceInfo||'');
}
function invoiceTaxNumberOf(item){return String(item?.invoiceEmail||'');}
function invoiceComplete(item){return !!invoiceTitleOf(item).trim()&&!!invoiceTaxNumberOf(item).trim();}
function invoiceLengthValid(merchantInfo,email){return merchantInfo.length<=200&&email.length<=200;}
function invoiceInputValues(prefix){return {title:document.getElementById(prefix+'-title')?.value.trim()||'',taxNumber:document.getElementById(prefix+'-tax-number')?.value.trim()||''};}
function invoiceInputComplete(prefix){const value=invoiceInputValues(prefix);return !!value.title&&!!value.taxNumber;}
function parseInvoiceText(value){const raw=String(value||'').trim(),index=Math.max(...['；',';','|','｜','\n'].map(mark=>raw.lastIndexOf(mark)));return {title:index<0?raw:raw.slice(0,index).trim(),taxNumber:index<0?'':raw.slice(index+1).trim()};}
function setInvoiceFields(item,merchantInfo,email){
  item.invoiceMerchantInfo=String(merchantInfo||'').trim();
  item.invoiceEmail=String(email||'').trim();
  item.invoiceInfo=[item.invoiceMerchantInfo&&`商家发票信息：${item.invoiceMerchantInfo}`,item.invoiceEmail&&`邮箱：${item.invoiceEmail}`].filter(Boolean).join('；');
  delete item.invoiceTitle;delete item.invoiceTaxNumber;
}
function invoiceFieldsHTML(prefix,item,required=false,disabled=false){return `<div class="invoice-input-pair"><label for="${prefix}-title">${required?'<span class="required-star" aria-hidden="true">*</span>':''}商家发票信息</label><input id="${prefix}-title" type="text" maxlength="200" placeholder="商家发票信息" value="${esc(invoiceTitleOf(item))}" ${disabled?'disabled':''}><label for="${prefix}-tax-number">${required?'<span class="required-star" aria-hidden="true">*</span>':''}邮箱</label><input id="${prefix}-tax-number" type="text" maxlength="200" placeholder="邮箱" value="${esc(invoiceTaxNumberOf(item))}" ${disabled?'disabled':''}></div>`;}
function invoiceOverflow(input,text){
  const start=input.selectionStart??input.value.length,end=input.selectionEnd??start;
  return input.value.length-(end-start)+text.length>200;
}
document.addEventListener('beforeinput',event=>{
  const input=event.target;if(!input.matches?.('.invoice-input-pair input')||event.isComposing||event.inputType?.startsWith('delete')||!event.data)return;
  if(invoiceOverflow(input,event.data)){event.preventDefault();toast('超出200字限制');}
});
document.addEventListener('paste',event=>{
  const input=event.target;if(!input.matches?.('.invoice-input-pair input'))return;
  if(invoiceOverflow(input,event.clipboardData?.getData('text')||'')){event.preventDefault();toast('超出200字限制');}
});
document.addEventListener('input',event=>{
  const input=event.target;if(!input.matches?.('.invoice-input-pair input')||input.value.length<=200)return;
  input.value=input.value.slice(0,200);toast('超出200字限制');
},true);
