const DISPATCH_IMPORT_HEADERS=['商品编码','抽检类型','任务类型','抽检事由','费用支出方','开票信息','报告审核人','寄样方式','立项SKU','立项要求分类','检测项目','项目类型','项目分类','项目来源','附加物备注','检测方法','判定依据/限值','检测机构','选择机构原由','派单备注'];
const DISPATCH_IMPORT_REQUIRED=['商品编码','抽检类型','任务类型','抽检事由','费用支出方','报告审核人','寄样方式','立项SKU','立项要求分类','检测项目','项目分类','检测方法','检测机构'];
const DISPATCH_IMPORT_MAIN=['商品编码','抽检类型','任务类型','抽检事由','费用支出方','开票信息','检测机构','报告审核人','选择机构原由','派单备注'];
const DISPATCH_PROJECT_TYPES={'国抽':'国抽项','与辉要求':'与辉要求','宣称项目':'宣称'};
let dispatchImportRows=[];
function dispatchImportRecords(matrix){
  const head=(matrix[0]||[]).map(v=>String(v??'').trim().replace(/（.*$/, ''));
  if(!head.includes('项目分类')&&head.includes('项目类型'))head[head.indexOf('项目类型')]='项目分类';
  const indexes=Object.fromEntries(DISPATCH_IMPORT_HEADERS.map(h=>[h,head.indexOf(h)]));
  const missing=DISPATCH_IMPORT_REQUIRED.filter(h=>indexes[h]<0);
  if(missing.length)throw Error('缺少模板字段：'+missing.join('、'));
  return matrix.slice(1).map((row,i)=>({line:i+2,...Object.fromEntries(DISPATCH_IMPORT_HEADERS.map(h=>[h,indexes[h]<0?'':String(row[indexes[h]]??'').trim()]))})).filter(r=>DISPATCH_IMPORT_HEADERS.some(h=>r[h]));
}
function validateDispatchImport(rows){
  const errors=[],products=new Map(),skuCategories=new Map(),projectKeys=new Set();
  if(!rows.length)errors.push('表格中没有任务数据');
  for(const r of rows){
    for(const h of DISPATCH_IMPORT_REQUIRED)if(!r[h])errors.push(`第${r.line}行：请填写${h}`);
    const code=r['商品编码'],sku=r['立项SKU'];
    if(code&&!/^(ry|sp)/i.test(code))errors.push(`第${r.line}行：商品编码须以 ry 或 SP 开头`);
    if(r['抽检类型']&&!TYPES.includes(r['抽检类型']))errors.push(`第${r.line}行：抽检类型不在当前选项中`);
    if(r['任务类型']&&!TASK_TYPES.includes(r['任务类型']))errors.push(`第${r.line}行：任务类型不在当前选项中`);
    if(r['检测机构']&&!agenciesForProductCode(code).includes(r['检测机构']))errors.push(`第${r.line}行：检测机构不属于当前商品类目`);
    if(r['报告审核人']&&!REVIEWERS.includes(r['报告审核人']))errors.push(`第${r.line}行：报告审核人不在当前选项中`);
    if(r['寄样方式']&&!['商家寄样','机构采样','与辉寄样'].includes(r['寄样方式']))errors.push(`第${r.line}行：寄样方式不在当前选项中`);
    if(r['费用支出方']&&!PAYERS.includes(r['费用支出方']))errors.push(`第${r.line}行：费用支出方不在当前选项中`);
    const invoice=parseInvoiceText(r['开票信息']);
    if(!invoiceLengthValid(invoice.title,invoice.taxNumber))errors.push(`第${r.line}行：开票信息每项不得超过200字`);
    if(requiresInvoiceInfo(r['费用支出方'])&&(!invoice.title||!invoice.taxNumber))errors.push(`第${r.line}行：开票信息须按“商家发票信息；邮箱”填写两项`);
    if(r['项目分类']&&!Object.hasOwn(DISPATCH_PROJECT_TYPES,r['项目分类']))errors.push(`第${r.line}行：项目分类只能填国抽、与辉要求或宣称项目`);
    if(r['项目类型']&&!['单项','套餐'].includes(r['项目类型']))errors.push(`第${r.line}行：项目类型只能填单项或套餐`);
    if(r['项目来源']&&!['合同内','合同外'].includes(r['项目来源']))errors.push(`第${r.line}行：项目来源只能填合同内或合同外`);
    if(r['附加物备注'].length>100)errors.push(`第${r.line}行：附加物备注最多100字`);
    if(r['派单备注'].length>200)errors.push(`第${r.line}行：派单备注最多200字`);
    if(code){
      const previous=products.get(code);
      if(previous){for(const h of DISPATCH_IMPORT_MAIN)if(previous[h]!==r[h])errors.push(`第${r.line}行：同一商品编码的${h}须一致`);}
      else products.set(code,r);
      if(sku){const key=code+'\u0000'+sku,category=skuCategories.get(key);if(category!==undefined&&category!==r['立项要求分类'])errors.push(`第${r.line}行：同一立项SKU的立项要求分类须一致`);else skuCategories.set(key,r['立项要求分类']);const previousShipping=products.get(code+'\u0000'+sku);if(previousShipping&&previousShipping['寄样方式']!==r['寄样方式'])errors.push(`第${r.line}行：同一立项SKU的寄样方式须一致`);else products.set(code+'\u0000'+sku,r);}
      if(sku&&r['检测项目']){const key=code+'\u0000'+sku+'\u0000'+r['检测项目'];if(projectKeys.has(key))errors.push(`第${r.line}行：同一SKU的检测项目重复`);projectKeys.add(key);}
    }
  }
  return [...new Set(errors)];
}
function openDispatchImport(){
  if(tabFilter!=='全部任务')return;
  dispatchImportRows=[];
  document.getElementById('modal').innerHTML=`<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dispatch-import-title" style="width:1000px"><div class="dialoghead"><h2 id="dispatch-import-title">导入数据派单</h2><button aria-label="关闭弹窗" onclick="closeModal()">×</button></div><div class="dialogbody"><p>请使用下方 Excel 模板填写。每行对应一个立项 SKU 的一个检测项目；同一商品编码的多行合并为一个主任务，不同 SKU 分别生成子任务。同一商品的主任务信息须一致。表头注明必填或选填；开票信息在表格单元格内按“商家发票信息；邮箱”填写，商家或二者皆有时两项均必填。确认后任务直接进入待接单。</p><button onclick="downloadDispatchImportTemplate()">下载 Excel 模板</button><label class="label" for="dispatch-import-file">选择 Excel 或 CSV 文件</label><input id="dispatch-import-file" type="file" accept=".xlsx,.csv" onchange="readDispatchImport(this.files[0])"><div id="dispatch-import-preview" class="tablewrap"></div><div id="dispatch-import-error" class="error" role="alert"></div></div><div class="dialogfooter"><button onclick="closeModal()">取消</button><button class="primary" onclick="applyDispatchImport()">确认导入并派单</button></div></section></div>`;
}
function downloadDispatchImportTemplate(){
  const a=document.createElement('a');a.href='./导入数据派单模板.xlsx';a.download='导入数据派单模板.xlsx';a.click();
}
async function readDispatchImport(file){
  const error=document.getElementById('dispatch-import-error'),preview=document.getElementById('dispatch-import-preview');
  dispatchImportRows=[];error.textContent='';preview.innerHTML='';if(!file)return;
  try{
    if(!/\.(csv|xlsx)$/i.test(file.name))throw Error('请选择 CSV 或 Excel（.xlsx）文件');
    const matrix=/\.xlsx$/i.test(file.name)?await parseXlsx(file):parseCsv(await file.text());
    dispatchImportRows=dispatchImportRecords(matrix);
    const issues=validateDispatchImport(dispatchImportRows);
    error.textContent=issues.slice(0,8).join('；');
    preview.innerHTML=`<p>读取 ${dispatchImportRows.length} 行，预计生成 ${new Set(dispatchImportRows.map(r=>r['商品编码']).filter(Boolean)).size} 个主任务。${issues.length?`发现 ${issues.length} 个问题，请修改表格后重新上传。`:'校验通过，可确认导入。'}</p><table><thead><tr>${DISPATCH_IMPORT_HEADERS.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${dispatchImportRows.slice(0,20).map(r=>`<tr>${DISPATCH_IMPORT_HEADERS.map(h=>`<td>${esc(r[h])}</td>`).join('')}</tr>`).join('')}</tbody></table>${dispatchImportRows.length>20?'<p>仅预览前20行</p>':''}`;
  }catch(e){error.textContent=e.message;}
}
function applyDispatchImport(){
  const error=document.getElementById('dispatch-import-error');if(!error)return;
  const issues=validateDispatchImport(dispatchImportRows);if(issues.length){error.textContent=issues.slice(0,8).join('；');return;}
  const products=new Map();for(const row of dispatchImportRows){const list=products.get(row['商品编码'])||[];list.push(row);products.set(row['商品编码'],list);}
  const fresh=[],assignments=[];
  for(const rows of products.values()){
    const first=rows[0],agency=first['检测机构'];
    const t=newTask(first['商品编码'],first['抽检类型'],first['任务类型']);
    t.reason=first['抽检事由'];t.payer=first['费用支出方'];const invoice=parseInvoiceText(first['开票信息']);setInvoiceFields(t,invoice.title,invoice.taxNumber);t.subs=[];
    const skus=new Map();
    for(const row of rows){
      const sku=row['立项SKU'];let sub=skus.get(sku);
      if(!sub){const index=skus.size+1;sub={id:t.id+'-'+String(index).padStart(2,'0'),standard:productExecutionStandards(t).join('、'),category:row['立项要求分类'],shippingMethod:row['寄样方式'],projects:[],agencyProjects:[],fields:{sku,rush:'否'},payer:'',merchant:'',yuhui:'',reportIssued:false,sent:false};skus.set(sku,sub);t.subs.push(sub);}
      const project={name:row['检测项目'],method:row['检测方法'],limit:row['判定依据/限值'],group:DISPATCH_PROJECT_TYPES[row['项目分类']],itemType:row['项目类型']||'',selected:true,contractSource:row['项目来源']||'合同内'};
      if(row['附加物备注'])project.agencyAttachments={[agency]:row['附加物备注']};
      sub.projects.push(project);
    }
    assignments.push({task:t,agency,reviewer:first['报告审核人'],reason:first['选择机构原由'],shippingMethods:Object.fromEntries(t.subs.map(sub=>[sub.id,sub.shippingMethod])),dispatchRemark:first['派单备注']});
    fresh.push(t);
  }
  try{checkDispatchNumberCapacity(assignments);for(const {task,agency,reviewer,reason,shippingMethods,dispatchRemark} of assignments)applyDispatchToTask(task,{agency,reviewer,reason,shippingMethods,dispatchRemark});}
  catch(e){error.textContent=e.message;return;}
  tasks.unshift(...fresh);save();dispatchImportRows=[];closeModal();tabFilter='确认接单中';query='';showList();toast(`导入并派单成功：${fresh.length} 个主任务进入待接单`);
}
