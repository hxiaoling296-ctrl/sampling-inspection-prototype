const CURRENT_AGENCY='通标标准技术服务有限公司';
function agencyTaskVisible(t){return !!t&&t.agency===CURRENT_AGENCY&&(!!t.dispatchedAt||t.subs.some(s=>s.sent));}
function syncPortalNavigation(){const agency=portalMode==='agency';document.getElementById('nav-quality')?.classList.toggle('active',!agency);document.getElementById('nav-agency')?.classList.toggle('active',agency);const businessNav=document.querySelector('.business-subnav'),agencyNav=document.querySelector('.agency-subnav');if(businessNav)businessNav.hidden=agency;if(agencyNav)agencyNav.hidden=!agency;}
function showBusinessList(){portalMode='business';tabFilter='全部任务';currentPage=1;syncPortalNavigation();showList();}
function showAgencyList(){portalMode='agency';tabFilter='全部任务';currentPage=1;syncPortalNavigation();showList();}
syncPortalNavigation();
