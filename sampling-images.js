function samplingOrderImagesHTML(t){
  const images=t.samplingOrderImages||[];
  return `<div><label>采样订单图片</label>${images.length?images.map((item,i)=>`<button class="link" onclick="previewSamplingOrderImage('${t.id}',${i})">${esc(item.name)}</button>`).join(''):' '}</div>`;
}
function samplingImageInputHTML(){
  return `<label class="label" for="sampling-order-images">采样订单图片（最多10张）</label><input id="sampling-order-images" type="file" accept="image/*" multiple onchange="updateSamplingImageSelection()"><small id="sampling-image-selection">未选择图片</small>`;
}
function updateSamplingImageSelection(){
  const files=[...document.getElementById('sampling-order-images').files],label=document.getElementById('sampling-image-selection');
  label.textContent=files.length?`已选择 ${files.length} 张：${files.map(f=>f.name).join('、')}`:'未选择图片';
  document.getElementById('sampling-error').textContent=files.length>10?'采样订单图片最多上传10张':'';
}
async function saveSamplingOrderImages(t,files){
  const entries=files.map(file=>({id:newReportId(),file}));
  await saveReportBlobs(entries);
  t.samplingOrderImages=entries.map(({id,file})=>({id,name:file.name,type:file.type,size:file.size}));
}
async function previewSamplingOrderImage(taskId,index){
  const item=tasks.find(t=>t.id===taskId)?.samplingOrderImages?.[index];if(!item)return;
  const preview=window.open('','_blank');if(!preview){toast('浏览器阻止了预览窗口');return;}
  preview.document.title=item.name;preview.document.body.textContent='正在打开图片…';
  try{const blob=await loadReportBlob(item.id);if(!blob)throw Error('missing');const url=URL.createObjectURL(blob);preview.location.href=url;setTimeout(()=>URL.revokeObjectURL(url),300000);}catch(e){preview.close();toast('图片读取失败，请检查浏览器中的文件');}
}
