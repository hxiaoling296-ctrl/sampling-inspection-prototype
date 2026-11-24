function invoiceTitleOf(item){return String(item?.invoiceTitle??parseInvoiceText(item?.invoiceInfo).title);}
function invoiceTaxNumberOf(item){return String(item?.invoiceTaxNumber??parseInvoiceText(item?.invoiceInfo).taxNumber);}
function invoiceComplete(item){return !!invoiceTitleOf(item).trim()&&!!invoiceTaxNumberOf(item).trim();}
function invoicePairValid(title,taxNumber){return (!!title.trim())===(!!taxNumber.trim());}
function invoiceInputValues(prefix){return {title:document.getElementById(prefix+'-title')?.value.trim()||'',taxNumber:document.getElementById(prefix+'-tax-number')?.value.trim()||''};}
function invoiceInputComplete(prefix){const value=invoiceInputValues(prefix);return !!value.title&&!!value.taxNumber;}
function parseInvoiceText(value){const parts=String(value||'').split(/[；;|｜\n]/).map(part=>part.trim());return {title:parts[0]||'',taxNumber:parts.slice(1).join('；').trim()};}
function setInvoiceFields(item,title,taxNumber){item.invoiceTitle=title.trim();item.invoiceTaxNumber=taxNumber.trim();item.invoiceInfo=item.invoiceTitle&&item.invoiceTaxNumber?`${item.invoiceTitle}；${item.invoiceTaxNumber}`:'';}
function invoiceFieldsHTML(prefix,item,required=false,disabled=false){return `<div class="invoice-input-pair"><label for="${prefix}-title">${required?'<span class="required-star" aria-hidden="true">*</span>':''}发票抬头</label><input id="${prefix}-title" maxlength="200" value="${esc(invoiceTitleOf(item))}" ${disabled?'disabled':''}><label for="${prefix}-tax-number">${required?'<span class="required-star" aria-hidden="true">*</span>':''}税号</label><input id="${prefix}-tax-number" maxlength="200" value="${esc(invoiceTaxNumberOf(item))}" ${disabled?'disabled':''}></div>`;}
