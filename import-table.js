let importTableRows=[];
const IMPORT_HEADERS=['主任务单号','主任务状态','子任务单号','计划出具报告日期','立项SKU','立项要求分类','采样金额','采样服务费','检测机构','检测项目','检测方法','附加物备注','判定依据/限值','项目来源','项目计算公式','机构参考报价','机构实际报价'];
const IMPORT_TEMPLATE_HEADERS=['主任务单号（必填）','主任务状态（必填）','子任务单号（必填）','计划出具报告日期（选填，默认7天后）','立项SKU（必填）','立项要求分类（必填）','采样金额（直接进单时必填）','采样服务费','检测机构（选填，默认派单机构）','检测项目','检测方法','附加物备注','判定依据/限值','项目来源','项目计算公式','机构参考报价','机构实际报价'];
const IMPORT_TEMPLATE_NOTE_ROW=['','只能更新为采样中，核样中，已进单',...Array(IMPORT_HEADERS.length-2).fill('')];
function parseCsv(text){text=text.replace(/^\uFEFF/,'');let rows=[],row=[],value='',quoted=false;for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(ch===','&&!quoted){row.push(value);value='';}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(value);if(row.some(v=>v.trim()))rows.push(row);row=[];value='';}else value+=ch;}row.push(value);if(row.some(v=>v.trim()))rows.push(row);return rows;}
async function parseXlsx(file){
  const zip=await JSZip.loadAsync(await file.arrayBuffer()),parser=new DOMParser(),xml=path=>zip.file(path)?.async('string');
  const nodes=(root,name)=>[...root.getElementsByTagNameNS('*',name)];
  const sharedText=await xml('xl/sharedStrings.xml');
  const shared=sharedText?nodes(parser.parseFromString(sharedText,'text/xml'),'si').map(node=>nodes(node,'t').map(t=>t.textContent).join('')):[];
  let sheetPath='xl/worksheets/sheet1.xml';
  const workbookText=await xml('xl/workbook.xml'),relsText=await xml('xl/_rels/workbook.xml.rels');
  if(workbookText&&relsText){
    const workbook=parser.parseFromString(workbookText,'text/xml'),rels=parser.parseFromString(relsText,'text/xml');
    const sheet=nodes(workbook,'sheet')[0],relId=sheet?.getAttribute('r:id');
    const rel=nodes(rels,'Relationship').find(r=>r.getAttribute('Id')===relId),target=rel?.getAttribute('Target');
    if(target)sheetPath=target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\.\//,'');
  }
  const content=await xml(sheetPath);if(!content)throw Error('找不到工作表');
  const doc=parser.parseFromString(content,'text/xml');if(nodes(doc,'parsererror').length)throw Error('工作表内容无效');
  return nodes(doc,'row').map(row=>{
    const values=[];
    for(const cell of nodes(row,'c')){
      const ref=cell.getAttribute('r')||'',letters=ref.match(/^[A-Z]+/)?.[0]||'',column=[...letters].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-1;
      let value=cell.getAttribute('t')==='inlineStr'?nodes(cell,'t').map(t=>t.textContent).join(''):nodes(cell,'v')[0]?.textContent||'';
      if(cell.getAttribute('t')==='s')value=shared[Number(value)]||'';
      if(column>=0)values[column]=value;
    }
    return values.map(v=>v||'');
  }).filter(row=>row.some(v=>String(v||'').trim()));
}
function importRecords(matrix){const head=(matrix[0]||[]).map(cell=>String(cell||'').trim().replace(/（.*$/, ''));const indexes=IMPORT_HEADERS.map(h=>head.indexOf(h)),missing=IMPORT_HEADERS.filter((h,j)=>indexes[j]<0);if(missing.length)throw Error('缺少模板字段：'+missing.join('、'));return matrix.slice(1).map((row,i)=>({line:i+2,...Object.fromEntries(IMPORT_HEADERS.map((h,j)=>{let value=String(row[indexes[j]]??'').trim();if(h==='计划出具报告日期'&&/^\d{5}$/.test(value)){const date=new Date(Date.UTC(1899,11,30)+Number(value)*86400000);value=date.toISOString().slice(0,10);}if(h==='主任务状态'&&value==='采样中')value='待采样';return [h,value];}))})).filter(row=>IMPORT_HEADERS.some(h=>row[h])&&!(row['主任务状态'].startsWith('只能更新为')&&!row['主任务单号']&&!row['子任务单号']));}
function validateImport(rows){
  const errors=[],taskValues=new Map(),subValues=new Map(),projectKeys=new Set();
  if(!rows.length)errors.push('表格中没有任务数据');
  for(const r of rows){
    const line='第'+r.line+'行：';
    for(const field of ['主任务单号','主任务状态','子任务单号','立项SKU','立项要求分类'])if(!r[field])errors.push(line+'请填写'+field);
    const t=tasks.find(item=>item.id===r['主任务单号']);
    const sub=t?.subs.find(item=>item.id===r['子任务单号']);
    if(!t||!['待接单','待采样','核样中'].includes(t.status)){errors.push(line+'主任务不存在或不在确认接单中');continue;}
    if(!sub){errors.push(line+'子任务不属于该主任务');continue;}
    if(!isActiveSub(t,sub)){errors.push(line+'无检测项目或未派单的子任务不能导入后续状态');continue;}
    const target=r['主任务状态'],direct=target==='已进单'&&['待采样','核样中'].includes(t.status);
    if(!['待采样','核样中'].includes(target)&&!direct)errors.push(line+'主任务状态只能更新为采样中、核样中，或由待采样/核样中直接进单');
    if(direct&&!r['采样金额'])errors.push(line+'直接进单必须填写采样金额');
    const date=r['计划出具报告日期'];
    if(date&&!validPlannedReportDate(date))errors.push(line+'计划出具报告日期格式须为YYYY-MM-DD');
    for(const field of ['采样金额','采样服务费','机构参考报价','机构实际报价'])if(r[field]&&!/^\d+(?:\.\d{1,2})?$/.test(r[field]))errors.push(line+field+'须为非负金额，最多两位小数');
    if(r['附加物备注'].length>35)errors.push(line+'附加物备注最多35字');
    if(r['检测机构']&&!agencyAllowedForTask(t,r['检测机构']))errors.push(line+'检测机构不属于当前商品类目');
    if(r['检测机构']&&t.agency&&r['检测机构']!==t.agency)errors.push(line+'检测机构须与主任务派单机构一致');
    if(r['项目来源']&&!['合同内','合同外'].includes(r['项目来源']))errors.push(line+'项目来源只能填合同内或合同外');
    if(!r['检测项目']&&['检测方法','附加物备注','判定依据/限值','项目来源','项目计算公式','机构参考报价','机构实际报价'].some(field=>r[field]))errors.push(line+'填写项目内容时须填写检测项目');
    const taskKey=t.id,taskValue=[target,r['采样金额'],r['采样服务费']].join('|');
    if(taskValues.has(taskKey)&&taskValues.get(taskKey)!==taskValue)errors.push(line+'同一主任务的状态、采样金额或采样服务费须一致');
    taskValues.set(taskKey,taskValue);
    const subKey=t.id+'|'+sub.id,subValue=[r['立项SKU'],r['立项要求分类'],date,r['检测机构']].join('|');
    if(subValues.has(subKey)&&subValues.get(subKey)!==subValue)errors.push(line+'同一子任务的立项SKU、立项要求分类、计划日期及机构须一致');
    subValues.set(subKey,subValue);
    if(r['检测项目']){const key=subKey+'|'+r['检测项目'];if(projectKeys.has(key))errors.push(line+'同一子任务的检测项目重复');projectKeys.add(key);}
  }
  return [...new Set(errors)];
}
function openImportTable(){
  importTableRows=[];
  document.getElementById('modal').innerHTML='<div class="overlay"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="import-title" style="width:1000px"><div class="dialoghead"><h2 id="import-title">确认接单中 · 导入数据</h2><button onclick="closeModal()">×</button></div><div class="dialogbody"><p>请使用下方 Excel 模板填写。按现有主任务单号、子任务单号匹配；一个检测项目占一行。表格中的“采样中”对应页面“待采样”。主任务状态同步到子任务；直接进单时填写采样金额，计划出具报告日期留空则默认7天后。</p><button onclick="downloadImportTemplate()">下载 Excel 模板</button><label class="label" for="import-file">选择 Excel 或 CSV 文件</label><input id="import-file" type="file" accept=".xlsx,.csv" onchange="readImportTable(this.files[0])"><div id="import-preview" class="tablewrap"></div><div id="import-error" class="error" role="alert"></div></div><div class="dialogfooter"><button onclick="closeModal()">取消</button><button class="primary" onclick="applyImportTable()">确认导入</button></div></section></div>';
}
function downloadImportTemplate(){const a=document.createElement('a');a.href='./确认接单中导入模板.xlsx';a.download='确认接单中导入模板.xlsx';a.click();}
async function readImportTable(file){const error=document.getElementById('import-error'),preview=document.getElementById('import-preview');importTableRows=[];error.textContent='';preview.innerHTML='';if(!file)return;try{const matrix=/\.xlsx$/i.test(file.name)?await parseXlsx(file):parseCsv(await file.text());importTableRows=importRecords(matrix);if(!importTableRows.length)throw Error('表格中没有任务数据');const issues=validateImport(importTableRows);error.textContent=issues.slice(0,8).join('；');preview.innerHTML=`<p>读取 ${importTableRows.length} 行，匹配 ${new Set(importTableRows.map(r=>r['主任务单号'])).size} 个主任务</p><table><thead><tr>${IMPORT_HEADERS.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${importTableRows.slice(0,20).map(r=>`<tr>${IMPORT_HEADERS.map(h=>`<td>${esc(r[h])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;if(importTableRows.length>20)preview.insertAdjacentHTML('beforeend','<p>预览前 20 行</p>');}catch(e){error.textContent=e.message;}}
function applyImportTable(){
  const error=document.getElementById('import-error');
  if(!importTableRows.length){error.textContent='请先选择并读取表格';return;}
  const issues=validateImport(importTableRows);if(issues.length){error.textContent=issues.slice(0,8).join('；');return;}
  const entered=new Set(),now=new Date();
  for(const r of importTableRows){
    const t=tasks.find(item=>item.id===r['主任务单号']),sub=t.subs.find(item=>item.id===r['子任务单号']);
    if(r['主任务状态']==='已进单'&&!entered.has(t.id)){saveExpectedDays(t,new Map(t.subs.map(s=>[s.id,7])),now);t.enteredAt=now.toISOString();entered.add(t.id);}
    t.status=r['主任务状态'];activeOrderSubs(t).forEach(s=>s.acceptanceStatus=t.status);
    if(r['采样金额'])t.samplingAmount=Number(r['采样金额']);
    if(r['采样服务费'])t.samplingServiceFee=Number(r['采样服务费']);
    sub.fields||={};sub.fields.sku=r['立项SKU'];sub.category=r['立项要求分类'];
    if(t.status==='已进单')saveExpectedDays(t,new Map([[sub.id,r['计划出具报告日期']||localDateValue(expectedDeadlineAt(7))]]));
    if(r['检测机构'])sub.agency=r['检测机构'];
    if(!r['检测项目'])continue;
    const agency=r['检测机构']||sub.agency||t.agency;
    let project=selectedProjects(sub).find(p=>p.name===r['检测项目']);
    const original=!!project;
    if(!project){sub.agencyProjects||=[];project=sub.agencyProjects.find(p=>p.agency===agency&&p.name===r['检测项目']);if(!project){project={agency,name:r['检测项目']};sub.agencyProjects.push(project);}}
    project.method=r['检测方法'];project.limit=r['判定依据/限值'];project.contractSource=r['项目来源']||project.contractSource||(original?'合同内':'');
    project.calculationFormula=r['项目计算公式'];
    if(original){project.agencyAttachments||={};project.agencyAttachments[agency]=r['附加物备注'];project.quotePrices||={};if(r['机构参考报价'])project.quotePrices[agency]=Number(r['机构参考报价']);project.actualQuotePrices||={};if(r['机构实际报价']||r['机构参考报价'])project.actualQuotePrices[agency]=Number(r['机构实际报价']||r['机构参考报价']);}
    else{project.agencyAttachment=r['附加物备注'];project.price=r['机构参考报价']===''?null:Number(r['机构参考报价']);project.actualPrice=r['机构实际报价']===''?project.price:Number(r['机构实际报价']);}
  }
  save();closeModal();searchList();toast('数据导入成功：'+importTableRows.length+' 行');importTableRows=[];
}


