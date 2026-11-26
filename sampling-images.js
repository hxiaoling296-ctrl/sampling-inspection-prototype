const imageThumbnailStates={detail:{epoch:0,urls:[]},modal:{epoch:0,urls:[]}};
function clearImageThumbnails(scope){const state=imageThumbnailStates[scope];state.epoch++;state.urls.forEach(url=>URL.revokeObjectURL(url));state.urls=[];}
function clearDetailImageThumbnails(){clearImageThumbnails('detail');}
function clearModalImageThumbnails(){clearImageThumbnails('modal');}
function detailImageThumbnailsHTML(t,images,previewFunction){return `<div class="detail-image-thumbnails">${images.map((item,i)=>`<button type="button" class="detail-image-thumb" aria-label="预览${esc(item.name)}" title="${esc(item.name)}" onclick="${previewFunction}('${t.id}',${i})"><span class="detail-image-frame"><img data-detail-image-id="${esc(item.id||'')}" alt="" loading="lazy"><span class="detail-image-fallback">加载中</span></span><span class="detail-image-name">${esc(item.name)}</span></button>`).join('')}</div>`;}
function hydrateImageThumbnails(scope,selector){clearImageThumbnails(scope);const state=imageThumbnailStates[scope],epoch=state.epoch;document.querySelectorAll(selector).forEach(async image=>{const fallback=image.nextElementSibling;try{const blob=await loadReportBlob(image.dataset.detailImageId);if(!blob)throw Error('missing image');if(epoch!==state.epoch||!image.isConnected)return;const url=URL.createObjectURL(blob);state.urls.push(url);image.onload=()=>{image.style.display='block';if(fallback)fallback.hidden=true;};image.onerror=()=>{if(fallback)fallback.textContent='无法显示';};image.src=url;}catch(e){if(epoch===state.epoch&&image.isConnected&&fallback)fallback.textContent='无法显示';}});}
function hydrateDetailImageThumbnails(){hydrateImageThumbnails('detail','#main-task-fields img[data-detail-image-id]');}
function hydrateModalImageThumbnails(){hydrateImageThumbnails('modal','#modal img[data-detail-image-id]');}
function samplingOrderImagesHTML(t){
  const images=t.samplingOrderImages||[];
  return `<div><label>采样订单图片</label>${images.length?detailImageThumbnailsHTML(t,images,'previewSamplingOrderImage'):''}${canEditSamplingDetails(t)?'<button onclick="openSamplingImagesEdit()">更新图片</button>':''}</div>`;
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

async function clearSamplingOnReturn(t){const ids=(t.samplingOrderImages||[]).map(item=>item.id).filter(Boolean);delete t.samplingAmount;delete t.samplingServiceFee;delete t.samplingRemark;t.samplingOrderImages=[];if(ids.length){try{await removeReportBlobs(ids);}catch(e){}}}

function reviewSamplingOrderImagesHTML(t){
  const images=t.samplingOrderImages||[];
  return `<div><label>采样订单图片</label>${images.map((item,i)=>`<button class="link" onclick="previewSamplingOrderImage('${t.id}',${i})">${esc(item.name)}</button>`).join('')}</div>`;
}

function sampleCheckSamplingHTML(t){
  const images=t.samplingOrderImages||[];
  return `<div class="sample-check-sampling"><h4>采样信息 · ${esc(t.id)}</h4><div class="summarygrid"><div><label>采样金额（元）</label>${t.samplingAmount==null?'':'¥ '+Number(t.samplingAmount).toFixed(2)}</div><div><label>采样服务费（元）</label>${samplingFeeText(t)}</div><div><label>采样备注</label>${esc(t.samplingRemark||'')}</div><div><label>${Number(t.samplingAmount||0)!==0?'<span class="required-star" aria-hidden="true">*</span>':''}采样订单图片</label>${images.length?detailImageThumbnailsHTML(t,images,'previewSamplingOrderImage'):''}</div></div></div>`;
}
function validateSampleCheckImages(t,error){const images=t.samplingOrderImages||[];if(images.length>10){error.textContent=`${t.id}：采样订单图片最多10张`;return false;}if(Number(t.samplingAmount||0)!==0&&!images.length){error.textContent=`${t.id}：采样金额不为0，请先在任务详情上传采样订单图片`;return false;}return true;}
