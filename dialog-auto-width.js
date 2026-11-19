function adjustModalWidth(){
  const dialog=document.querySelector('#modal .dialog'),body=dialog?.querySelector('.dialogbody');if(!dialog||!body)return;
  const limit=Math.max(320,window.innerWidth-44);
  for(let pass=0;pass<3;pass++){
    const overflow=Math.max(0,body.scrollWidth-body.clientWidth,...[...body.querySelectorAll('.tablewrap')].map(wrap=>wrap.scrollWidth-wrap.clientWidth));
    if(overflow<=2)break;
    const current=dialog.getBoundingClientRect().width,target=Math.min(limit,current+overflow+16);
    if(target<=current+2)break;
    dialog.style.width=`${Math.ceil(target)}px`;
  }
}
let modalWidthFrame=0;
function scheduleModalWidth(){cancelAnimationFrame(modalWidthFrame);modalWidthFrame=requestAnimationFrame(adjustModalWidth);}
const modalWidthRoot=document.getElementById('modal');
if(modalWidthRoot)new MutationObserver(scheduleModalWidth).observe(modalWidthRoot,{childList:true,subtree:true});
window.addEventListener('resize',scheduleModalWidth);
