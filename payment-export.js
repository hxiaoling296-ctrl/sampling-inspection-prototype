const PAYMENT_EXPORT_HEADERS = ['主任务单号','主任务状态','商品编码','商品名称','商品类目','抽检类型','任务类型','费用支出方','开票信息-商家发票信息','开票信息-邮箱','派单备注','计划专场','计划检测规格','采样金额','采样服务费','采样备注','采样订单图片','进单日期','核样失败原因','是否退样成功','样品处理方式','异常结束原因备注','交易快照','子任务单号','子任务状态','立项SKU（必填）','立项要求分类（必填）','寄样方式','样品量','寄样地址','检测机构','检测项目','检测方法','附加物备注','判定依据/限值','项目来源','项目计算公式','机构参考报价','机构实际报价','结算金额','项目结算合计','费用合计','商家需支付金额','与辉需支付金额'];

function paymentExportTasks() {
  return selectedExportTasks().filter(t => ['已完成','已完成（异常）'].includes(t.status));
}

function paymentExportRows() {
  const rows = [];
  for (const t of paymentExportTasks()) {
    const items = paymentItems(t);
    const settlement = items.reduce((sum,item) => sum + Number(item.project.settlementAmount || 0), 0);
    const total = Number(t.samplingAmount || 0) + Number(samplingServiceFeeValue(t) || 0) + settlement;
    for (const item of items.length ? items : [null]) {
      const p = item?.project || {}, s = item?.sub, agency = item?.agency || t.agency;
      const kind = s?.agencyProjects?.includes(p) ? 'agency' : 'original';
      rows.push([
        t.id,t.status,t.code,t.name,productCategoryGroup(t),t.type,t.taskType || '',t.payer || '',
        invoiceTitleOf(t),invoiceTaxNumberOf(t),t.dispatchRemark || '',t.plannedSession || '',t.plannedInspectionSpec || '',
        t.samplingAmount ?? '',samplingServiceFeeValue(t) ?? '',t.samplingRemark || '',
        (t.samplingOrderImages||[]).map(image=>image.name).join('、'),taskListDateText(t.enteredAt),
        t.sampleCheckFailureReason || '',t.sampleReturnSucceeded===undefined?'':t.sampleReturnSucceeded?'是':'否',
        t.sampleHandlingMethod || '',t.abnormalEndReason || '',(t.sampleCheckFailureImages||[]).map(image=>image.name).join('、'),
        s?.id || '',s ? subtaskDisplayStatus(t,s) : '',s?.fields?.sku || '',s?.category || '',
        s?subShippingMethod(t,s):'',s?.sampleQuantity || '',s?merchantAddress(s):'',agency || '',p.name || '',p.method || '',
        item ? projectAgencyAttachment(p,agency,kind) : '',p.limit || '',p.contractSource || '',
        item ? projectCalculationFormula(p) : '',item?.referencePrice ?? '',item?.price ?? '',
        p.settlementAmount ?? '',settlement.toFixed(2),total.toFixed(2),
        t.paymentShares?.['商家'] ?? '',t.paymentShares?.['与辉'] ?? ''
      ]);
    }
  }
  return rows;
}

function openPaymentExport() {
  if (tabFilter !== '全部任务' || !requireExportSelection()) return;
  const count = paymentExportRows().length, taskCount = paymentExportTasks().length;
  document.getElementById('modal').innerHTML = `<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="payment-export-title" style="width:540px"><div class="dialoghead"><h2 id="payment-export-title">导出款项数据</h2><button onclick="closeModal()">×</button></div><div class="dialogbody"><p>已勾选任务中有 ${taskCount} 个已完成主任务，共 ${count} 行款项数据。每个检测项目单独占一行。按最新模板导出主任务、采样、子任务和项目结算字段；图片列展示文件名称。</p>${count ? '' : '<p>已勾选任务中没有已完成订单。</p>'}</div><div class="dialogfooter"><button onclick="closeModal()">取消</button><button class="primary" onclick="downloadPaymentExport('xlsx')" ${count ? '' : 'disabled'}>导出 Excel</button></div></section></div>`;
}

async function downloadPaymentExport(format) {
  if (tabFilter !== '全部任务' || format !== 'xlsx' || !requireExportSelection()) return;
  const rows = paymentExportRows();
  if (!rows.length) return;
  try {
    const template = Uint8Array.from(atob(PAYMENT_EXPORT_TEMPLATE_BASE64),char => char.charCodeAt(0));
    const zip = await JSZip.loadAsync(template), sheet = zip.file('xl/worksheets/sheet1.xml');
    if (!sheet) throw Error('模板工作表未找到');
    const original = await sheet.async('string');
    const header = original.match(/<row r="1"[^>]*>[\s\S]*?<\/row>/)?.[0];
    if (!header) throw Error('模板表头未找到');
    const col = index => { let n=index+1,name='';while(n){n--;name=String.fromCharCode(65+n%26)+name;n=Math.floor(n/26);}return name; };
    const dataRows = rows.map((row,i) => `<row r="${i+2}" spans="1:44">${row.map((value,j) => `<c r="${col(j)}${i+2}" t="inlineStr"><is><t xml:space="preserve">${exportXmlText(value)}</t></is></c>`).join('')}</row>`).join('');
    zip.file('xl/worksheets/sheet1.xml',original.replace(/<dimension ref="[^"]*"\/>/,`<dimension ref="A1:AR${rows.length+1}"/>`).replace(/<sheetData>[\s\S]*?<\/sheetData>/,`<sheetData>${header}${dataRows}</sheetData>`));
    const now = new Date(), pad = n => String(n).padStart(2,'0');
    const name = `款项数据-${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}：${pad(now.getMinutes())}：${pad(now.getSeconds())}.xlsx`;
    downloadExportBlob(await zip.generateAsync({type:'blob',compression:'DEFLATE'}),name);
    closeModal();toast('款项数据已导出 Excel');
  } catch (error) { toast('Excel 导出失败，请重试'); }
}

