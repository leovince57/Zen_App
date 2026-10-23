/* Local reminders derived from actual course arrangements and guidance records. */
(() => {
'use strict';
const own=(object,key)=>!!object&&typeof object==='object'&&Object.prototype.hasOwnProperty.call(object,key);
const map=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const text=value=>typeof value==='string'?value:'';
const validDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value)&&Number.isFinite(Date.parse(value));
const allowed=record=>record&&['assignment','guidance'].includes(record.kind)&&typeof record.id==='string'&&record.id.length>0&&typeof record.student==='string'&&typeof record.assignmentId==='string'&&record.assignmentId.length>0;
// JSON tuple encoding avoids separator collisions and unsafe object property names.
function token(record){return allowed(record)?'notice:'+JSON.stringify([record.student,record.kind,record.id,validDate(record.at)?record.at:null]):'';}
function isRead(seen,item,legacyGuidanceSeen={}){
 if(!item||typeof item.token!=='string'||!item.token.startsWith('notice:'))return false;
 if(map(seen)&&own(seen,item.token)&&seen[item.token]===true)return true;
 return item.kind==='guidance'&&map(legacyGuidanceSeen)&&own(legacyGuidanceSeen,item.assignmentId)&&legacyGuidanceSeen[item.assignmentId]===item.recordId+'|'+item.at;
}
// list does not mutate records or seen. Missing dates remain null; replies require actual reply text.
function list(records,seen={},student='m1',legacyGuidanceSeen={}){
 const unique=new Map();
 for(const record of Array.isArray(records)?records:[]){
  if(!allowed(record)||record.student!==student)continue;
  const key=token(record);if(unique.has(key))continue;
  const at=validDate(record.at)?record.at:null,reply=record.kind==='guidance'?text(record.reply):'';
  const item={id:key,token:key,recordId:record.id,assignmentId:record.assignmentId,student:record.student,kind:record.kind,type:record.kind==='assignment'?'assignment':reply.trim()?'reply':'guidance',at,dateOnly:at!==null&&(record.dateOnly===true||at.length===10),legacyTime:text(record.legacyTime),text:text(record.text),requirements:text(record.requirements),reply,question:text(record.question)};
  item.unread=!isRead(seen,item,legacyGuidanceSeen);unique.set(key,item);
 }
 return [...unique.values()].sort((a,b)=>{
  const aTime=a.at===null?-Infinity:Date.parse(a.at),bTime=b.at===null?-Infinity:Date.parse(b.at);
  return aTime===bTime?a.token.localeCompare(b.token):bTime-aTime;
 });
}
// Only the selected notice is marked read. Caller persists the map after success.
function read(seen,item){
 if(!map(seen)||!item||typeof item.token!=='string'||!item.token.startsWith('notice:'))return false;
 try{Object.defineProperty(seen,item.token,{value:true,writable:true,enumerable:true,configurable:true});return true;}catch{return false;}
}
globalThis.StudyNotices={list,read,isRead,token};
})();
