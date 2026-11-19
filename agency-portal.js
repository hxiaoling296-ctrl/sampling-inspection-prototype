function syncPortalNavigation(){const agency=portalMode==='agency';document.getElementById('nav-quality')?.classList.toggle('active',!agency);document.getElementById('nav-agency')?.classList.toggle('active',agency);const businessNav=document.querySelector('.business-subnav'),agencyNav=document.querySelector('.agency-subnav');if(businessNav)businessNav.hidden=agency;if(agencyNav)agencyNav.hidden=!agency;}
function showBusinessList(){portalMode='business';tabFilter='全部任务';syncPortalNavigation();showList();}
function showAgencyList(){portalMode='agency';tabFilter='全部任务';syncPortalNavigation();showList();}
syncPortalNavigation();
