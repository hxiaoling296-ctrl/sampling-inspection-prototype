function failureRemarkExportRows(){const rows=[];for(const t of selectedExportTasks()){for(const s of t.subs){if(!s.reviewFailureRemark?.trim())continue;rows.push([t.code,t.name,t.id,s.id,(s.similarProducts||[]).map(p=>p.code).join('、'),s.reportStatus||'',s.reviewFailureRemark,s.reviewedAt?reviewDateText(s.reviewedAt):'',t.reportReviewer||'']);}}return rows.sort((a,b)=>a[0].localeCompare(b[0],'zh-CN')||a[2].localeCompare(b[2])||a[3].localeCompare(b[3]));}
async function exportFailureRemarks(){
  if(!requireExportSelection())return;const rows=failureRemarkExportRows();if(!rows.length){toast('已选任务没有不合格备注');return;}
  try{
    const template=Uint8Array.from(atob(FAILURE_REMARK_TEMPLATE_BASE64),char=>char.charCodeAt(0));
    const zip=await JSZip.loadAsync(template),sheet=zip.file('xl/worksheets/sheet1.xml');if(!sheet)throw Error('模板工作表未找到');
    const original=await sheet.async('string'),header=original.match(/<row r="1"[^>]*>[\s\S]*?<\/row>/)?.[0];if(!header)throw Error('模板表头未找到');
    const dataRows=rows.map((row,i)=>`<row r="${i+2}" spans="1:9">${row.map((value,j)=>`<c r="${String.fromCharCode(65+j)}${i+2}" t="inlineStr"><is><t xml:space="preserve">${exportXmlText(value)}</t></is></c>`).join('')}</row>`).join('');
    zip.file('xl/worksheets/sheet1.xml',original.replace(/<dimension ref="[^"]*"\/>/,`<dimension ref="A1:I${rows.length+1}"/>`).replace(/<sheetData>[\s\S]*?<\/sheetData>/,`<sheetData>${header}${dataRows}</sheetData>`));
    const now=new Date(),pad=n=>String(n).padStart(2,'0');
    const name=`不合格备注信息-${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}：${pad(now.getMinutes())}：${pad(now.getSeconds())}.xlsx`;
    downloadExportBlob(await zip.generateAsync({type:'blob',compression:'DEFLATE'}),name);
    toast(`已导出 ${rows.length} 条不合格备注`);
  }catch(e){toast('不合格备注信息导出失败，请重试');}
}
