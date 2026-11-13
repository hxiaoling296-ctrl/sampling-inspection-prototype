const DISPATCH_IMPORT_HEADERS=['批次编号','商品编码','抽检类型','任务类型','立项SKU','国抽分类','检测项目','检测方法','判定依据/限值','项目来源','机构参考报价','机构实际报价','检测机构','报告审核人','寄样方式','选择机构原由','派单备注','抽检事由','费用支出方'];
const DISPATCH_IMPORT_REQUIRED=['批次编号','商品编码','抽检类型','任务类型','立项SKU','检测项目','检测机构','报告审核人','寄样方式'];
const DISPATCH_IMPORT_MAIN=['商品编码','抽检类型','任务类型','检测机构','报告审核人','寄样方式','选择机构原由','派单备注','抽检事由','费用支出方'];
let dispatchImportRows=[];
function dispatchImportRecords(matrix){
  const head=(matrix[0]||[]).map(v=>String(v??'').trim());
  const indexes=Object.fromEntries(DISPATCH_IMPORT_HEADERS.map(h=>[h,head.indexOf(h)]));
  const missing=DISPATCH_IMPORT_REQUIRED.filter(h=>indexes[h]<0);
  if(missing.length)throw Error('缺少模板字段：'+missing.join('、'));
  return matrix.slice(1).map((row,i)=>({line:i+2,...Object.fromEntries(DISPATCH_IMPORT_HEADERS.map(h=>[h,indexes[h]<0?'':String(row[indexes[h]]??'').trim()]))})).filter(r=>DISPATCH_IMPORT_HEADERS.some(h=>r[h]));
}
function validateDispatchImport(rows){
  const errors=[],batches=new Map(),skuCategories=new Map(),projectKeys=new Set();
  if(!rows.length)errors.push('表格中没有任务数据');
  for(const r of rows){
    for(const h of DISPATCH_IMPORT_REQUIRED)if(!r[h])errors.push(`第${r.line}行：请填写${h}`);
    const code=r['商品编码'],batch=r['批次编号'],sku=r['立项SKU'];
    if(code&&!/^(ry|sp)/i.test(code))errors.push(`第${r.line}行：商品编码须以 ry 或 SP 开头`);
    if(r['抽检类型']&&!TYPES.includes(r['抽检类型']))errors.push(`第${r.line}行：抽检类型不在当前选项中`);
    if(r['任务类型']&&!TASK_TYPES.includes(r['任务类型']))errors.push(`第${r.line}行：任务类型不在当前选项中`);
    if(r['检测机构']&&!REFERENCE_AGENCIES.includes(r['检测机构']))errors.push(`第${r.line}行：检测机构不在当前选项中`);
    if(r['报告审核人']&&!REVIEWERS.includes(r['报告审核人']))errors.push(`第${r.line}行：报告审核人不在当前选项中`);
    if(r['寄样方式']&&!['商家寄样','机构采样','与辉寄样'].includes(r['寄样方式']))errors.push(`第${r.line}行：寄样方式不在当前选项中`);
    if(r['费用支出方']&&!PAYERS.includes(r['费用支出方']))errors.push(`第${r.line}行：费用支出方不在当前选项中`);
    if(r['项目来源']&&!['合同内','合同外'].includes(r['项目来源']))errors.push(`第${r.line}行：项目来源只能填合同内或合同外`);
    for(const h of ['机构参考报价','机构实际报价'])if(r[h]&&!/^\d+(?:\.\d{1,2})?$/.test(r[h]))errors.push(`第${r.line}行：${h}须为非负数且最多两位小数`);
    if(r['派单备注'].length>200)errors.push(`第${r.line}行：派单备注最多200字`);
    if(batch){
      if(tasks.some(t=>t.importBatchId===batch))errors.push(`第${r.line}行：批次编号${batch}已导入`);
      const previous=batches.get(batch);
      if(previous){for(const h of DISPATCH_IMPORT_MAIN)if(previous[h]!==r[h])errors.push(`第${r.line}行：同批次的${h}须一致`);}
      else batches.set(batch,r);
      if(sku){const key=batch+'\u0000'+sku,category=skuCategories.get(key);if(category!==undefined&&category!==r['国抽分类'])errors.push(`第${r.line}行：同一立项SKU的国抽分类须一致`);else skuCategories.set(key,r['国抽分类']);}
      if(sku&&r['检测项目']){const key=batch+'\u0000'+sku+'\u0000'+r['检测项目'];if(projectKeys.has(key))errors.push(`第${r.line}行：同一SKU的检测项目重复`);projectKeys.add(key);}
    }
  }
  return [...new Set(errors)];
}
function openDispatchImport(){
  if(!['全部任务','待派单'].includes(tabFilter))return;
  dispatchImportRows=[];
  document.getElementById('modal').innerHTML=`<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dispatch-import-title" style="width:1000px"><div class="dialoghead"><h2 id="dispatch-import-title">导入数据派单</h2><button aria-label="关闭弹窗" onclick="closeModal()">×</button></div><div class="dialogbody"><p>每行填写一个 SKU 的一个检测项目。相同批次编号的行合并为一个主任务；同一批次的主任务信息须一致，多个 SKU 分别生成子任务。机构、报告审核人和寄样方式必填；选择机构原由选填。确认后主任务和有检测项目的子任务直接进入待接单。</p><button onclick="downloadDispatchImportTemplate()">下载 CSV 模板</button><label class="label" for="dispatch-import-file">选择 CSV 或 Excel 文件</label><input id="dispatch-import-file" type="file" accept=".csv,.xlsx" onchange="readDispatchImport(this.files[0])"><div id="dispatch-import-preview" class="tablewrap"></div><div id="dispatch-import-error" class="error" role="alert"></div></div><div class="dialogfooter"><button onclick="closeModal()">取消</button><button class="primary" onclick="applyDispatchImport()">确认导入并派单</button></div></section></div>`;
}
function downloadDispatchImportTemplate(){
  const projectA=REFERENCE_PROJECTS[0],projectB=REFERENCE_PROJECTS[1];
  const common=['B001','SP001','过会固抽','日播'];
  const end=['瑞艾','王晓敏','商家寄样','','','商家复检','商家'];
  const rows=[
    [...common,PRODUCT_SKUS.SP001[0],'酱卤肉制品',projectA.name,projectA.method,projectA.limit,'合同内','','',...end],
    [...common,PRODUCT_SKUS.SP001[1],'酱卤肉制品',projectB.name,projectB.method,projectB.limit,'合同内','','',...end]
  ];
  const csv=[DISPATCH_IMPORT_HEADERS,...rows].map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='导入数据派单模板.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
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
    preview.innerHTML=`<p>读取 ${dispatchImportRows.length} 行，预计生成 ${new Set(dispatchImportRows.map(r=>r['批次编号']).filter(Boolean)).size} 个主任务。${issues.length?`发现 ${issues.length} 个问题，请修改表格后重新上传。`:'校验通过，可确认导入。'}</p><table><thead><tr>${DISPATCH_IMPORT_HEADERS.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${dispatchImportRows.slice(0,20).map(r=>`<tr>${DISPATCH_IMPORT_HEADERS.map(h=>`<td>${esc(r[h])}</td>`).join('')}</tr>`).join('')}</tbody></table>${dispatchImportRows.length>20?'<p>仅预览前20行</p>':''}`;
  }catch(e){error.textContent=e.message;}
}
function applyDispatchImport(){
  const error=document.getElementById('dispatch-import-error');if(!error)return;
  const issues=validateDispatchImport(dispatchImportRows);if(issues.length){error.textContent=issues.slice(0,8).join('；');return;}
  const batches=new Map();for(const row of dispatchImportRows){const list=batches.get(row['批次编号'])||[];list.push(row);batches.set(row['批次编号'],list);}
  const fresh=[];
  for(const [batch,rows] of batches){
    const first=rows[0],agency=first['检测机构'];
    const t=newTask(first['商品编码'],first['抽检类型'],first['任务类型']);
    t.importBatchId=batch;t.reason=first['抽检事由'];t.payer=first['费用支出方'];t.subs=[];
    const skus=new Map();
    for(const row of rows){
      const sku=row['立项SKU'];let sub=skus.get(sku);
      if(!sub){const index=skus.size+1;sub={id:t.id+'-'+String(index).padStart(2,'0'),standard:productExecutionStandards(t).join('、'),category:row['国抽分类'],projects:[],agencyProjects:[],fields:{sku,rush:'否'},payer:'',merchant:'',yuhui:'',reportIssued:false,sent:false};skus.set(sku,sub);t.subs.push(sub);}
      const project={name:row['检测项目'],method:row['检测方法'],limit:row['判定依据/限值'],group:'与辉要求',selected:true,contractSource:row['项目来源']||'合同内'};
      if(row['机构参考报价'])project.quotePrices={[agency]:Number(row['机构参考报价'])};
      if(row['机构实际报价'])project.actualQuotePrices={[agency]:Number(row['机构实际报价'])};
      sub.projects.push(project);
    }
    applyDispatchToTask(t,{agency,reviewer:first['报告审核人'],reason:first['选择机构原由'],shippingMethod:first['寄样方式'],dispatchRemark:first['派单备注']});
    fresh.push(t);
  }
  tasks.unshift(...fresh);save();dispatchImportRows=[];closeModal();tabFilter='确认接单中';query='';showList();toast(`导入并派单成功：${fresh.length} 个主任务进入待接单`);
}
