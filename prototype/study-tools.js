/* Local study tools. No course material, prescribed target, score or completion is supplied. */
(() => {
'use strict';
const id=(kind,at=Date.now())=>kind+'-'+at.toString(36)+'-'+Math.random().toString(36).slice(2,9);
const iso=at=>new Date(at).toISOString();
const readerPreferences={fontFamily:{values:['serif','sans','kai'],default:'serif'},fontSize:{values:[16,18,20,22,24,26,28],default:20},lineHeight:{values:[1.7,1.9,2.2],default:1.9},theme:{values:['paper','white','green','night'],default:'paper'}};
function setReaderPreference(t,key,value){const preference=Object.prototype.hasOwnProperty.call(readerPreferences,key)?readerPreferences[key]:null;if(!t?.reader||typeof t.reader!=='object'||Array.isArray(t.reader)||!preference||!preference.values.includes(value))return false;t.reader[key]=value;return true;}
function resetReaderPreferences(t){if(!t?.reader||typeof t.reader!=='object'||Array.isArray(t.reader))return false;for(const [key,preference] of Object.entries(readerPreferences))t.reader[key]=preference.default;return true;}
function hydrate(raw={}){
 const t=raw&&typeof raw==='object'?raw:{};
 t.records=Array.isArray(t.records)?t.records.filter(r=>r&&['reading','timer','chant'].includes(r.kind)&&typeof r.id==='string'):[];
 t.demoReadings=t.demoReadings&&typeof t.demoReadings==='object'&&!Array.isArray(t.demoReadings)?t.demoReadings:{};
 t.reader=t.reader&&typeof t.reader==='object'?t.reader:{};
 for(const [key,preference] of Object.entries(readerPreferences))if(!preference.values.includes(t.reader[key]))t.reader[key]=preference.default;
 const doc=t.reader.document;
 if(!doc||typeof doc.text!=='string'||!doc.text.trim()||typeof doc.id!=='string')t.reader.document=null;
 else {doc.page=Number.isInteger(doc.page)&&doc.page>=0?Math.min(doc.page,pages(doc.text).length-1):0;doc.bookmarks=Array.isArray(doc.bookmarks)?doc.bookmarks.filter(p=>Number.isInteger(p)&&p>=0&&p<pages(doc.text).length):[];}
 if(!t.timer||!['running','paused'].includes(t.timer.status)||!Number.isFinite(t.timer.elapsedMs)||t.timer.elapsedMs<0||t.timer.status==='running'&&!Number.isFinite(t.timer.startedAt))t.timer=null;
 if(t.timer?.source==='auto'&&t.timer.status==='running'){pause(t,Number.isFinite(t.timer.lastActiveAt)?t.timer.lastActiveAt:t.timer.startedAt);t.timer.pauseReason='navigation';}
 const c=t.counter;
 t.counter=c&&Number.isSafeInteger(c.count)&&c.count>=0&&c.count<=10000000?c:{id:id('chant'),count:0,undo:[]};
 t.counter.undo=Array.isArray(t.counter.undo)?t.counter.undo.filter(n=>Number.isSafeInteger(n)&&n>0):[];
 return t;
}
function put(t,record){const index=t.records.findIndex(r=>r.id===record.id);if(index<0)t.records.push(record);else t.records[index]=record;return record;}
function elapsed(t,at=Date.now()){const s=t.timer;return s?Math.max(0,s.elapsedMs+(s.status==='running'?Math.max(0,at-s.startedAt):0)):0;}
const stages=['wen','si','xiu'];
function start(t,assignmentId=null,at=Date.now(),stage=null){
 if(!t.timer)t.timer={id:id('timer',at),student:'m1',assignmentId,stage:stages.includes(stage)?stage:null,elapsedMs:0,startedAt:at,createdAt:iso(at),status:'running'};
 else if(t.timer.status==='paused'){t.timer.startedAt=at;t.timer.status='running';}
 return t.timer;
}
function pause(t,at=Date.now()){if(t.timer?.status==='running'){t.timer.elapsedMs=elapsed(t,at);t.timer.startedAt=null;t.timer.status='paused';}return t.timer;}
// Automatic sessions only accrue while their real content is active.
function syncAuto(t,context,at=Date.now()){
 const s=t.timer;
 if(!s){if(!context)return false;const created=start(t,context.assignmentId||null,at,context.stage);Object.assign(created,{source:'auto',contentKey:context.key,origin:context.origin,contentTitle:context.title||null,demo:context.demo===true,pauseReason:null,lastActiveAt:at});return true;}
 if(s.source!=='auto')return false;
 const same=context&&s.contentKey===context.key&&s.assignmentId===(context.assignmentId||null)&&s.stage===context.stage;
 if(!same){if(s.status==='running'){pause(t,at);s.pauseReason='navigation';s.lastActiveAt=at;return true;}return false;}
 const legacyContentPause=['article','reader','reflect'].includes(s.origin)&&s.pauseReason==='user';
 if(s.status==='paused'&&(s.pauseReason==='navigation'||legacyContentPause)&&!s.review&&!s.draftReview){start(t,null,at);s.pauseReason=null;s.lastActiveAt=at;return true;}
 if(s.status==='running'){s.lastActiveAt=at;return true;}return false;
}
function userPause(t,at=Date.now()){pause(t,at);if(t.timer)t.timer.pauseReason='user';return t.timer;}
function prepareTimerEnd(t,at=Date.now()){
 if(!t.timer)return null;pause(t,at);const s=t.timer,seconds=Math.floor(s.elapsedMs/1000),old=s.review||s.draftReview;
 s.review={...(old?.fields&&old.measuredSeconds===seconds?{fields:old.fields}:{}),measuredSeconds:seconds,seconds:old&&old.seconds!==old.measuredSeconds?old.seconds:seconds,reflection:old?.reflection||'',adjustmentReason:old?.adjustmentReason||''};return s.review;
}
function timerReviewError(review){
 if(!review||!Number.isSafeInteger(review.seconds)||review.seconds<1||review.seconds>3599999)return '请填写有效时长（至少1秒，分钟与秒均为0至59）。';
 if(review.seconds!==review.measuredSeconds&&!String(review.adjustmentReason||'').trim())return '修改时长后，请填写调整说明。';
 if(String(review.reflection||'').length>1500)return '心得请控制在1500字以内。';
 return '';
}
function saveTimer(t,at=Date.now()){
 if(!t.timer)return null;pause(t,at);const s=t.timer,measuredSeconds=Math.floor(s.elapsedMs/1000),review=s.review||{measuredSeconds,seconds:measuredSeconds};
 if(timerReviewError(review))return null;
 const adjusted=review.seconds!==measuredSeconds;
 const record=put(t,{id:s.id,kind:'timer',student:s.student||'m1',assignmentId:s.assignmentId,stage:stages.includes(s.stage)?s.stage:null,source:s.source||'manual',origin:s.origin||null,contentKey:s.contentKey||null,contentTitle:s.contentTitle||null,demo:s.demo===true,seconds:review.seconds,measuredSeconds,adjusted,adjustmentReason:adjusted?String(review.adjustmentReason).trim().slice(0,300):'',reflection:String(review.reflection||'').trim().slice(0,1500),startedAt:s.createdAt,at:iso(at)});t.timer=null;return record;
}
// Content sessions save on exit; keep explicit legacy reviews for manual recovery.
function finishAuto(t,at=Date.now()){
 const s=t.timer;if(s?.source!=='auto'||!['article','reader','reflect'].includes(s.origin)||s.review||s.draftReview)return null;
 pause(t,at);const seconds=Math.floor(s.elapsedMs/1000);
 if(seconds<1){t.timer=null;return {seconds:0,record:null};}
 const record=saveTimer(t,at);return record?{seconds:record.seconds,record}:null;
}
function finishReading(t,at=Date.now()){return ['article','reader'].includes(t.timer?.origin)?finishAuto(t,at):null;}
function dayKey(value=Date.now()){
 const date=new Date(value);if(!Number.isFinite(date.getTime()))return '';
 return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
}
function dailyTimers(t,day=dayKey(),student='m1'){
 const matching=t.records.filter(r=>r.kind==='timer'&&r.student===student&&dayKey(r.at)===day&&Number.isFinite(r.seconds)&&r.seconds>0);
 const records=matching.filter(r=>!r.demo),demos=matching.filter(r=>r.demo);
 return {demoSeconds:demos.reduce((n,r)=>n+r.seconds,0),demoCount:demos.length,seconds:records.reduce((n,r)=>n+r.seconds,0),count:records.length,byStage:Object.fromEntries([...stages,'unmarked'].map(stage=>[stage,records.filter(r=>(stages.includes(r.stage)?r.stage:'unmarked')===stage).reduce((n,r)=>n+r.seconds,0)]))};
}
function addCount(t,n){if(!Number.isSafeInteger(n)||n<1||n>1000000||t.counter.count+n>10000000)return false;t.counter.count+=n;t.counter.undo.push(n);if(t.counter.undo.length>200)t.counter.undo.shift();return true;}
function undoCount(t){const n=t.counter.undo.pop();if(!n)return false;t.counter.count=Math.max(0,t.counter.count-n);return true;}
function saveCount(t,at=Date.now()){
 if(t.counter.count<1)return null;const record=put(t,{id:t.counter.id,kind:'chant',student:'m1',assignmentId:null,amount:t.counter.count,at:iso(at)});t.counter={id:id('chant',at),count:0,undo:[]};return record;
}
// A labeled UI sample, kept separate from both formal course material and personal files.
function openDemo(t,assignmentId,title,pageCount,at=Date.now()){
 let d=t.demoReadings[assignmentId];if(!d||!Number.isInteger(d.page)||d.page<0||d.page>=pageCount)d=t.demoReadings[assignmentId]={page:0,bookmarks:[]};
 d.bookmarks=Array.isArray(d.bookmarks)?d.bookmarks.filter(p=>Number.isInteger(p)&&p>=0&&p<pageCount):[];
 return put(t,{id:'demo-reading-'+assignmentId,kind:'reading',student:'m1',assignmentId,demo:true,name:title,page:d.page+1,pageCount,bookmarkCount:d.bookmarks.length,at:iso(at)});
}
function turnDemo(t,assignmentId,page,title,pageCount,at=Date.now()){if(!Number.isInteger(page)||page<0||page>=pageCount)return false;openDemo(t,assignmentId,title,pageCount,at);t.demoReadings[assignmentId].page=page;openDemo(t,assignmentId,title,pageCount,at);return true;}
function bookmarkDemo(t,assignmentId,title,pageCount,at=Date.now()){openDemo(t,assignmentId,title,pageCount,at);const d=t.demoReadings[assignmentId],i=d.bookmarks.indexOf(d.page);if(i<0)d.bookmarks.push(d.page);else d.bookmarks.splice(i,1);d.bookmarks.sort((a,b)=>a-b);return openDemo(t,assignmentId,title,pageCount,at);}
function pages(text){const chars=Array.from(text),out=[];for(let start=0;start<chars.length;start+=850)out.push(chars.slice(start,start+850).join(''));return out.length?out:[''];}
function importText(t,name,text,at=Date.now()){
 if(typeof text!=='string'||!text.trim())throw Error('文件没有可阅读的正文。');
 if(text.length>300000)throw Error('请使用较小的TXT文件（最多30万字符）。');
 t.reader.document={id:id('document',at),name:String(name).slice(0,160),text:text.replace(/^\uFEFF/,''),page:0,bookmarks:[]};return readingRecord(t,at);
}
function readingRecord(t,at=Date.now()){
 const d=t.reader.document;if(!d)return null;return put(t,{id:'reading-'+d.id,kind:'reading',student:'m1',assignmentId:null,documentId:d.id,name:d.name,page:d.page+1,pageCount:pages(d.text).length,bookmarkCount:d.bookmarks.length,at:iso(at)});
}
function turn(t,page,at=Date.now()){const d=t.reader.document;if(!d||!Number.isInteger(page)||page<0||page>=pages(d.text).length)return false;d.page=page;readingRecord(t,at);return true;}
function bookmark(t,at=Date.now()){const d=t.reader.document;if(!d)return false;const i=d.bookmarks.indexOf(d.page);if(i<0)d.bookmarks.push(d.page);else d.bookmarks.splice(i,1);d.bookmarks.sort((a,b)=>a-b);readingRecord(t,at);return true;}
globalThis.StudyTools={hydrate,setReaderPreference,resetReaderPreferences,elapsed,start,pause,syncAuto,userPause,prepareTimerEnd,timerReviewError,saveTimer,finishAuto,finishReading,dayKey,dailyTimers,addCount,undoCount,saveCount,openDemo,turnDemo,bookmarkDemo,pages,importText,readingRecord,turn,bookmark};
})();
