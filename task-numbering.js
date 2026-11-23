const TASK_TYPE_NUMBER_CODES={日播:'RB',专场:'ZC',专项:'ZX',盲测:'MC',溯源:'SY'};
const AGENCY_NUMBER_CODES={
  '天津市产品质量监督检测技术研究院':'TQT',
  '北京市产品质量监督检验研究院':'BQI',
  '北京中认检测技术服务有限公司':'CQC',
  '上海市质量监督检验技术研究院有限公司':'SQI',
  '中联品检(北京)检验技术有限公司':'UTS',
  '国家陶瓷产品质量检验检测中心(江西)':'ZQT',
  '国家陶瓷产品质量检验检测中心(河南)':'ZQTH',
  '通标标准技术服务有限公司':'S',
  '中轻检验认证有限公司':'ZQJ',
  '上海香料研究所':'XL',
  '中国包装科研测试中心':'ZGBZ',
  '北京建筑材料检验研究院':'JZY',
  '天纺标检测认证股份有限公司':'TTTS',
  '北京市轻工产品质量监督检验一站':'QGYZ',
  '华测检测认证集团股份有限公司':'H',
  '中国检验检疫科学研究院粤港澳大湾区研究院':'SEC',
  '广东产品质量监督检验研究院':'GQI',
  '广州市微生物研究所集团股份有限公司':'WSW',
  '威凯检测技术有限公司':'CVC',
  '国家燃香类产品质量监督检验中心(福建)':'GJXJ',
  '中国林业科学研究院木材工业研究所':'LY',
  '广州检验检测认证集团有限公司':'GTTC',
  '陕西省产品质量监督检验研究院':'SXZJY',
  '梅里埃检测技术（上海）有限公司':'N',
  '欧陆食品检测服务（大连）有限公司':'O',
  '长春海关技术中心':'C',
  '上海天祥质量技术服务有限公司':'T'
};
const FOOD_AGENCY_NUMBER_OVERRIDES={'广州检验检测认证集团有限公司':'G'};
let dispatchCounters={};
function taskNumberDate(value){const date=new Date(value);if(Number.isNaN(date.getTime()))return '';return String(date.getFullYear())+String(date.getMonth()+1).padStart(2,'0')+String(date.getDate()).padStart(2,'0');}
function taskCreationNumberDate(t,dispatchAt){const stored=taskNumberDate(t.createdAt);if(stored)return stored;const previous=/^(?:SP|RY)(\d{8})\d{6}$/.exec(t.id||'');return previous?.[1]||taskNumberDate(dispatchAt);}
function dispatchNumberPrefix(t,agency,dispatchAt){
  const type=TASK_TYPE_NUMBER_CODES[t.taskType];
  const category=/^sp/i.test(t.code)?'SP':/^ry/i.test(t.code)?'RY':'';
  const institution=category==='SP'&&FOOD_AGENCY_NUMBER_OVERRIDES[agency]||AGENCY_NUMBER_CODES[agency];
  if(!type)throw Error('请先选择任务类型');
  if(!category)throw Error('商品编码须以 SP 或 ry 开头');
  if(!agencyAllowedForTask(t,agency))throw Error('请选择该商品类目对应的抽检机构');
  if(!institution)throw Error('该检测机构尚未配置单号缩写');
  const date=t.payer==='商家'?taskCreationNumberDate(t,dispatchAt):taskNumberDate(dispatchAt);
  return type+'-'+(t.payer==='商家'?'F-':'')+category+institution+date;
}
function dispatchSequenceKey(t,dispatchAt){
  const category=/^sp/i.test(t.code)?'SP':/^ry/i.test(t.code)?'RY':'';
  if(!category)throw Error('商品编码须以 SP 或 ry 开头');
  return category+taskNumberDate(dispatchAt);
}
function dispatchedTaskCount(key){return tasks.filter(item=>/^(?:RB|ZC|ZX|MC|SY)-(?:F-)?(?:SP|RY)[A-Z]+\d{11}$/.test(item.id||'')&&item.dispatchedAt&&dispatchSequenceKey(item,item.dispatchedAt)===key).length;}
function normalizeDispatchCounters(stored,storedTasks){
  const counters={},legacy={};
  for(const [key,value] of Object.entries(stored||{})){
    if(/^(?:SP|RY)\d{8}$/.test(key))counters[key]=Math.max(counters[key]||0,Number(value)||0);
    else{const old=/^(?:RB|ZC|ZX|MC|SY)-(SP|RY)[A-Z]+(\d{8})$/.exec(key);if(old){const next=old[1]+old[2];legacy[next]=(legacy[next]||0)+(Number(value)||0);}}
  }
  for(const [key,count] of Object.entries(legacy))counters[key]=Math.max(counters[key]||0,count);
  const counts={};
  for(const item of storedTasks||[]){if(!/^(?:RB|ZC|ZX|MC|SY)-(?:F-)?(?:SP|RY)[A-Z]+\d{11}$/.test(item.id||'')||!item.dispatchedAt)continue;const key=dispatchSequenceKey(item,item.dispatchedAt);counts[key]=(counts[key]||0)+1;}
  for(const [key,count] of Object.entries(counts))counters[key]=Math.max(counters[key]||0,count);
  return counters;
}
function nextDispatchTaskNumber(t,agency,dispatchAt){
  const prefix=dispatchNumberPrefix(t,agency,dispatchAt);
  const key=dispatchSequenceKey(t,dispatchAt);
  const number=Math.max(dispatchedTaskCount(key),dispatchCounters[key]||0)+1;
  if(number>999)throw Error('当前商品大类当天的三位序号已用完');
  dispatchCounters[key]=number;
  return prefix+String(number).padStart(3,'0');
}
function checkDispatchNumberCapacity(assignments,dispatchAt=new Date()){
  const pending=new Map();
  for(const {task,agency} of assignments){
    dispatchNumberPrefix(task,agency,dispatchAt);
    const key=dispatchSequenceKey(task,dispatchAt);
    const next=Math.max(dispatchedTaskCount(key),dispatchCounters[key]||0,pending.get(key)||0)+1;
    if(next>999)throw Error('当前商品大类当天的三位序号已用完');
    pending.set(key,next);
  }
}
function numberDispatchedTask(t,agency,dispatchAt){
  if(!t.createdAt)t.createdAt=taskCreationNumberDate(t,dispatchAt).replace(/^(\d{4})(\d{2})(\d{2})$/,'$1-$2-$3T12:00:00');
  const old=t.id,next=nextDispatchTaskNumber(t,agency,dispatchAt);
  t.id=next;
  reindexSubtasks(t);
  if(currentId===old)currentId=next;
  if(expandedTasks.has(old)){expandedTasks.delete(old);expandedTasks.add(next);}
  return next;
}
