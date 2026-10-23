const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'..','study-tools.js'),'utf8'),context);const T=context.StudyTools;
const t=T.hydrate();assert.equal(t.records.length,0);assert.equal(t.reader.document,null);assert.equal(t.counter.count,0);
T.start(t,'karma',1000);const first=t.timer.id;assert.equal(T.elapsed(t,6000),5000);
T.start(t,'mindfulness',7000);assert.equal(t.timer.id,first);assert.equal(t.timer.assignmentId,'karma','only one active timer; context cannot overwrite it');
T.pause(t,9000);assert.equal(T.elapsed(t,60000),8000,'paused time is not included');
let restored=T.hydrate(JSON.parse(JSON.stringify(t)));assert.equal(T.elapsed(restored,70000),8000);
T.start(restored,null,70000);assert.equal(T.elapsed(restored,73000),11000);
let running=T.hydrate(JSON.parse(JSON.stringify(restored)));assert.equal(T.elapsed(running,78000),16000,'running timer survives reload');
const r=T.saveTimer(running,80000);assert.equal(r.seconds,18);assert.equal(r.assignmentId,'karma');assert.equal(running.timer,null);assert.equal(T.saveTimer(running,80000),null);assert.equal(running.records.length,1,'one end creates one record');
const short=T.hydrate();T.start(short,null,1000);assert.equal(T.saveTimer(short,1500),null);assert.equal(short.timer.status,'paused','too-short sessions are retained for continuing');
assert.equal(T.addCount(t,1),true);T.addCount(t,10);assert.equal(t.counter.count,11);T.undoCount(t);assert.equal(t.counter.count,1,'undo reverts the last operation');
assert.equal(T.addCount(t,2.5),false);assert.equal(T.addCount(t,-1),false);assert.equal(T.addCount(t,Infinity),false);assert.equal(T.addCount(t,1000001),false);
T.addCount(t,23);const saved=T.saveCount(t,100000);assert.equal(saved.amount,24);assert.equal(saved.assignmentId,null,'do not invent course practice pairing');assert.equal(t.counter.count,0);assert.equal(T.saveCount(t,100001),null);
const text='甲乙丙丁'.repeat(700);T.importText(t,'personal.txt',text,110000);assert.equal(t.reader.document.page,0);const doc=t.reader.document;const chunks=T.pages(text);assert.ok(chunks.length>1);assert.equal(chunks.join(''),text);
T.turn(t,2,120000);T.bookmark(t,121000);assert.equal(t.reader.document.page,2);assert.equal(t.reader.document.bookmarks[0],2);assert.equal(T.turn(t,99),false);
const progress=t.records.find(r=>r.kind==='reading');assert.equal(progress.page,3);assert.equal(progress.assignmentId,null);assert.equal(t.records.filter(r=>r.kind==='reading').length,1,'reading position is updated, not double-counted');
T.bookmark(t,122000);assert.equal(t.reader.document.bookmarks.length,0);
const readerRestored=T.hydrate(JSON.parse(JSON.stringify(t)));assert.equal(readerRestored.reader.document.page,2);
assert.throws(()=>T.importText(t,'empty.txt','  '));assert.equal(t.reader.document.id,doc.id,'invalid import does not replace the document');
const unicode='阿弥陀佛🙂'.repeat(400);assert.equal(T.pages(unicode).join(''),unicode,'pagination preserves unicode');
console.log('Study tools passed: elapsed time across pause/reload, one timer, idempotent saves, count/undo validation, no invented targets, reading pagination/bookmarks/restore and one progress record.');

// Preferences survive old/new storage and never mutate reading progress or active study sessions.
const legacyReader=T.hydrate({reader:{fontSize:24,lineHeight:1.7,theme:'night'}});
assert.equal(legacyReader.reader.fontFamily,'serif');assert.equal(legacyReader.reader.fontSize,24);assert.equal(legacyReader.reader.lineHeight,1.7);assert.equal(legacyReader.reader.theme,'night','old valid preferences remain intact');
const preferences=T.hydrate();T.importText(preferences,'preferences.txt',text,200000);T.turn(preferences,2,201000);T.bookmark(preferences,202000);T.turnDemo(preferences,'karma',1,'演示文章',3,203000);T.bookmarkDemo(preferences,'karma','演示文章',3,204000);T.start(preferences,'karma',205000,'wen');
const preserved=JSON.stringify({document:preferences.reader.document,demoReadings:preferences.demoReadings,timer:preferences.timer,records:preferences.records});
for(const [key,value] of [['fontFamily','kai'],['fontSize',28],['lineHeight',2.2],['theme','green']])assert.equal(T.setReaderPreference(preferences,key,value),true);
const beforeInvalid=JSON.stringify(preferences);
for(const [key,value] of [['fontFamily','unknown'],['fontSize',99],['fontSize','20'],['lineHeight',0],['theme','unknown'],['document',null],['__proto__',{}]])assert.equal(T.setReaderPreference(preferences,key,value),false);
assert.equal(JSON.stringify(preferences),beforeInvalid,'invalid choices and unknown keys cannot modify state');
for(const invalid of [null,{}, {reader:'invalid'}, {reader:[]}]){assert.equal(T.setReaderPreference(invalid,'fontSize',20),false);assert.equal(T.resetReaderPreferences(invalid),false);}
const persistedPreferences=T.hydrate(JSON.parse(JSON.stringify(preferences)));
assert.equal(persistedPreferences.reader.fontFamily,'kai');assert.equal(persistedPreferences.reader.fontSize,28);assert.equal(persistedPreferences.reader.lineHeight,2.2);assert.equal(persistedPreferences.reader.theme,'green');
assert.equal(T.setReaderPreference(persistedPreferences,'fontFamily','sans'),true);assert.equal(T.setReaderPreference(persistedPreferences,'fontSize',16),true);assert.equal(T.setReaderPreference(persistedPreferences,'theme','white'),true);
assert.equal(T.resetReaderPreferences(persistedPreferences),true);
assert.equal(persistedPreferences.reader.fontFamily,'serif');assert.equal(persistedPreferences.reader.fontSize,20);assert.equal(persistedPreferences.reader.lineHeight,1.9);assert.equal(persistedPreferences.reader.theme,'paper');
assert.equal(JSON.stringify({document:persistedPreferences.reader.document,demoReadings:persistedPreferences.demoReadings,timer:persistedPreferences.timer,records:persistedPreferences.records}),preserved,'reset changes only the four display preferences; documents, positions, bookmarks, demo reading, timer and history remain intact');
console.log('Reader preferences passed: legacy compatibility, validated choices, reload persistence and safe display-only reset.');

// Restoring a document or demo session must preserve its exact reading offset.
const positioned=T.hydrate();T.importText(positioned,'position.txt',text,210000);T.turn(positioned,1,211000);
positioned.reader.document.scrollTop=295.5;
T.openDemo(positioned,'karma','演示文章',3,212000);T.turnDemo(positioned,'karma',1,'演示文章',3,213000);positioned.demoReadings.karma.scrollTop=284.25;
const reopened=T.hydrate(JSON.parse(JSON.stringify(positioned)));T.openDemo(reopened,'karma','演示文章',3,214000);
assert.equal(reopened.reader.document.page,1);assert.equal(reopened.reader.document.scrollTop,295.5,'TXT offset survives hydration without rounding or resetting');
assert.equal(reopened.demoReadings.karma.page,1);assert.equal(reopened.demoReadings.karma.scrollTop,284.25,'article preparation preserves the saved chapter and fractional scroll offset');
T.bookmarkDemo(reopened,'karma','演示文章',3,215000);assert.equal(reopened.demoReadings.karma.scrollTop,284.25,'bookmarking does not reset the reading position');
console.log('Reading position passed: hydration, article preparation and bookmarking retain the exact saved offset.');


// Course + stage context survives reload; end review saves a single audited record.
const session=T.hydrate(),start=Date.parse('2026-10-23T15:59:50Z');
T.start(session,'karma',start,'wen');
T.start(session,'mindfulness',start+1000,'si');assert.equal(session.timer.stage,'wen','a second entry cannot relabel the active session');
let draft=T.prepareTimerEnd(session,start+20000);assert.equal(draft.seconds,20);assert.equal(session.timer.status,'paused');
draft.seconds=12;assert.match(T.timerReviewError(draft),/调整说明/);assert.equal(T.saveTimer(session,start+21000),null);assert.ok(session.timer,'invalid review retains session');
draft.adjustmentReason='交互验证：扣除离开时间';draft.reflection='交互验证心得';
const reviewRestored=T.hydrate(JSON.parse(JSON.stringify(session)));assert.equal(reviewRestored.timer.review.reflection,'交互验证心得');
const audited=T.saveTimer(reviewRestored,start+30000);assert.equal(audited.seconds,12);assert.equal(audited.measuredSeconds,20);assert.equal(audited.adjusted,true);assert.equal(audited.stage,'wen');assert.equal(audited.reflection,'交互验证心得');assert.equal(audited.assignmentId,'karma');assert.equal(T.saveTimer(reviewRestored,start+40000),null);
assert.equal(T.dayKey(audited.at),'2026-10-24','sessions spanning midnight are assigned to the end date in Shanghai');
assert.equal(T.dailyTimers(reviewRestored,'2026-10-23').count,0);assert.equal(T.dailyTimers(reviewRestored,'2026-10-24').seconds,12);
const blank=T.hydrate();T.start(blank,null,start,'si');T.prepareTimerEnd(blank,start+5000);const noReflection=T.saveTimer(blank,start+6000);assert.equal(noReflection.reflection,'','reflection is optional');assert.equal(noReflection.adjusted,false);
const mix=T.hydrate({records:[audited,{...noReflection,id:'si',at:audited.at},{...noReflection,id:'xiu',stage:'xiu',seconds:9,at:audited.at},{...noReflection,id:'legacy',stage:null,seconds:7,at:audited.at},{...noReflection,id:'other',student:'m2',seconds:999,at:audited.at}]});
const totals=T.dailyTimers(mix,'2026-10-24');assert.equal(totals.count,4);assert.equal(totals.seconds,33);assert.equal(totals.byStage.wen,12);assert.equal(totals.byStage.si,5);assert.equal(totals.byStage.xiu,9);assert.equal(totals.byStage.unmarked,7);assert.equal(T.dailyTimers(mix,'2026-10-24','m2').seconds,999);
const continuing=T.hydrate();T.start(continuing,'karma',1000,'xiu');T.prepareTimerEnd(continuing,6000);continuing.timer.review.reflection='保留草稿';T.start(continuing,null,20000);T.prepareTimerEnd(continuing,24000);assert.equal(continuing.timer.review.seconds,9);assert.equal(continuing.timer.review.reflection,'保留草稿');
assert.ok(T.timerReviewError({seconds:0,measuredSeconds:0}));assert.ok(T.timerReviewError({seconds:-1,measuredSeconds:3}));assert.ok(T.timerReviewError({seconds:Infinity,measuredSeconds:3}));
console.log('Session review passed: course/stage persistence, optional reflection, audited adjustment, draft restore, exactly-once save and daily totals by Shanghai end date including legacy records.');

// Actual content only, with legacy pause recovery and no overlapping sessions.
const auto=T.hydrate(),ctx={assignmentId:'karma',stage:'si',key:'reflection-karma',origin:'reflect'};
assert.equal(T.syncAuto(auto,null,1000),false);assert.equal(auto.timer,null,'placeholder without context never starts');
T.syncAuto(auto,ctx,1000);const autoId=auto.timer.id;assert.equal(auto.timer.source,'auto');assert.equal(auto.timer.stage,'si');
T.syncAuto(auto,null,6000);assert.equal(T.elapsed(auto,90000),5000,'leaving content pauses immediately');
T.syncAuto(auto,ctx,100000);assert.equal(auto.timer.id,autoId);assert.equal(T.elapsed(auto,102000),7000,'return resumes same session, excluding time away');
T.userPause(auto,103000);T.syncAuto(auto,null,110000);T.syncAuto(auto,ctx,120000);assert.equal(auto.timer.status,'running','legacy reflection pause resumes without a removed manual control');T.syncAuto(auto,null,120000);
auto.timer.pauseReason='navigation';T.syncAuto(auto,ctx,130000);T.syncAuto(auto,ctx,132000);const restoredAuto=T.hydrate(JSON.parse(JSON.stringify(auto)));assert.equal(restoredAuto.timer.status,'paused');assert.equal(T.elapsed(restoredAuto,200000),10000,'reload/closed downtime stops at the last activity checkpoint');T.syncAuto(restoredAuto,ctx,200000);assert.equal(restoredAuto.timer.status,'running');
const other={assignmentId:null,stage:'wen',key:'reader-file',origin:'reader',title:'personal.txt'};T.syncAuto(restoredAuto,other,203000);assert.equal(restoredAuto.timer.id,autoId);assert.equal(restoredAuto.timer.status,'paused','different content cannot overwrite the pending session');
T.prepareTimerEnd(restoredAuto,204000);const autoRecord=T.saveTimer(restoredAuto,205000);assert.equal(autoRecord.source,'auto');assert.equal(autoRecord.origin,'reflect');assert.equal(autoRecord.seconds,13);assert.equal(restoredAuto.timer,null);
T.syncAuto(restoredAuto,other,206000);assert.equal(restoredAuto.timer.assignmentId,null,'personal reader is never mislabeled as course material');assert.equal(restoredAuto.timer.stage,'wen');
const manual=T.hydrate();T.start(manual,null,1000,'xiu');T.syncAuto(manual,ctx,2000);assert.equal(manual.timer.assignmentId,null);assert.equal(manual.timer.stage,'xiu');assert.equal(manual.timer.status,'running','personal practice continues without being stolen by another page');
console.log('Automatic timing passed: actual-content gate, navigation/background pause, legacy pause recovery, reload checkpoints, pending-session conflicts and personal-reader isolation.');

// Reading saves measured time on exit, excluding inactive time and preserving other timers.
const articleContext={assignmentId:'karma',stage:'wen',key:'demo-article-karma',origin:'article',title:'演示文章',demo:true};
const reading=T.hydrate();T.syncAuto(reading,articleContext,1000);const readingId=reading.timer.id;
T.syncAuto(reading,null,6500);T.syncAuto(reading,articleContext,100000);
const finishedReading=T.finishReading(reading,103600);
assert.equal(finishedReading.seconds,9,'only foreground reading contributes; milliseconds are floored once at exit');
assert.equal(finishedReading.record.id,readingId);assert.equal(finishedReading.record.assignmentId,'karma');assert.equal(finishedReading.record.stage,'wen');assert.equal(finishedReading.record.source,'auto');assert.equal(finishedReading.record.origin,'article');assert.equal(finishedReading.record.contentTitle,'演示文章');assert.equal(finishedReading.record.demo,true);assert.equal(finishedReading.record.adjusted,false);assert.equal(finishedReading.record.seconds,finishedReading.record.measuredSeconds);
assert.equal(reading.timer,null);assert.equal(T.finishReading(reading,200000),null);assert.equal(reading.records.length,1,'repeated exits cannot duplicate the saved session');
assert.equal(T.dailyTimers(reading,T.dayKey(finishedReading.record.at)).seconds,0,'demo reading remains outside formal study totals');
assert.equal(T.dailyTimers(reading,T.dayKey(finishedReading.record.at)).demoSeconds,9);
T.syncAuto(reading,articleContext,201000);assert.notEqual(reading.timer.id,readingId,'re-entering reading starts a new session');
const incidental=T.finishReading(reading,201999);assert.equal(incidental.seconds,0);assert.equal(incidental.record,null);assert.equal(reading.timer,null);assert.equal(reading.records.length,1,'sub-second visits never create zero-duration records or block later sessions');
const personalReading=T.hydrate();T.syncAuto(personalReading,other,300000);T.syncAuto(personalReading,null,305000);
const finishedPersonal=T.finishReading(personalReading,900000).record;assert.equal(finishedPersonal.seconds,5,'leaving an already-paused reader excludes time away');assert.equal(finishedPersonal.assignmentId,null);assert.equal(finishedPersonal.demo,false);assert.equal(finishedPersonal.contentTitle,'personal.txt');
for(const kind of ['manual','reflect','review','draftReview']){
 const untouched=T.hydrate();
 if(kind==='manual')T.start(untouched,null,1000,'xiu');else T.syncAuto(untouched,kind==='reflect'?ctx:articleContext,1000);
 if(['review','draftReview'].includes(kind))untouched.timer[kind]={seconds:7,measuredSeconds:5,reflection:'保留原有草稿',adjustmentReason:'原有调整'};
 const before=JSON.stringify(untouched);assert.equal(T.finishReading(untouched,6000),null);assert.equal(JSON.stringify(untouched),before,kind+' must remain untouched');
}
const tooLong=T.hydrate();T.syncAuto(tooLong,articleContext,1000);assert.equal(T.finishReading(tooLong,3600001000),null);assert.ok(tooLong.timer,'failed validation retains the session');assert.equal(tooLong.records.length,0);
for(const origin of ['article','reader']){
 const legacy=T.hydrate(),legacyContext=origin==='article'?articleContext:other;T.syncAuto(legacy,legacyContext,1000);T.userPause(legacy,6000);T.syncAuto(legacy,legacyContext,100000);
 assert.equal(legacy.timer.status,'running','legacy reader pause resumes without a removed manual control');assert.equal(T.elapsed(legacy,102000),7000,'resuming a legacy pause does not count paused time');
}
for(const key of ['review','draftReview']){
 const legacyDraft=T.hydrate();T.syncAuto(legacyDraft,articleContext,1000);T.userPause(legacyDraft,6000);legacyDraft.timer[key]={seconds:5,measuredSeconds:5,reflection:'保留草稿'};T.syncAuto(legacyDraft,articleContext,100000);assert.equal(legacyDraft.timer.status,'paused','legacy '+key+' is never auto-resumed');
}
console.log('Automatic reading exit passed: measured-time save, inactive-time exclusion, idempotency, zero-duration cleanup, demo/personal attribution, legacy pause recovery and preservation of manual/reflection/review sessions.');

// Reflection closes just like reading, freeing the single content-timer slot.
const reflectionExit=T.hydrate();T.syncAuto(reflectionExit,ctx,1000);const reflectionId=reflectionExit.timer.id;
T.syncAuto(reflectionExit,null,6500);T.syncAuto(reflectionExit,ctx,100000);
const reflectionSaved=T.finishAuto(reflectionExit,103600);
assert.equal(reflectionSaved.seconds,9,'background time is excluded from reflection too');
assert.equal(reflectionSaved.record.id,reflectionId);assert.equal(reflectionSaved.record.assignmentId,'karma');assert.equal(reflectionSaved.record.stage,'si');assert.equal(reflectionSaved.record.origin,'reflect');assert.equal(reflectionSaved.record.source,'auto');assert.equal(reflectionSaved.record.adjusted,false);assert.equal(reflectionSaved.record.demo,false);
assert.equal(reflectionExit.timer,null);assert.equal(T.finishAuto(reflectionExit,104000),null);assert.equal(reflectionExit.records.length,1,'repeated reflection exits cannot duplicate a record');
T.syncAuto(reflectionExit,articleContext,105000);assert.equal(reflectionExit.timer.origin,'article');assert.notEqual(reflectionExit.timer.id,reflectionId,'reading can start immediately after reflection finishes');
assert.equal(T.finishAuto(reflectionExit,108000).record.seconds,3);
const zeroReflection=T.hydrate();T.syncAuto(zeroReflection,ctx,1000);assert.equal(T.finishAuto(zeroReflection,1999).record,null);assert.equal(zeroReflection.timer,null);assert.equal(zeroReflection.records.length,0);
const autoTotals=T.dailyTimers(reflectionExit,T.dayKey(reflectionSaved.record.at));assert.equal(autoTotals.byStage.si,9);assert.equal(autoTotals.demoSeconds,3);assert.equal(autoTotals.seconds,9);
for(const kind of ['manual','unknown','review','draftReview']){
 const untouchedAuto=T.hydrate();if(kind==='manual')T.start(untouchedAuto,null,1000,'xiu');else T.syncAuto(untouchedAuto,kind==='unknown'?{...ctx,origin:'unknown'}:ctx,1000);
 if(['review','draftReview'].includes(kind))untouchedAuto.timer[kind]={seconds:7,measuredSeconds:5,reflection:'保留反思草稿',adjustmentReason:'已有调整'};
 const before=JSON.stringify(untouchedAuto);assert.equal(T.finishAuto(untouchedAuto,6000),null);assert.equal(JSON.stringify(untouchedAuto),before,kind+' is not silently finalized');
}
for(const key of ['review','draftReview'])for(const pauseReason of ['user','navigation']){
 const draftReflection=T.hydrate();T.syncAuto(draftReflection,ctx,1000);T.pause(draftReflection,6000);draftReflection.timer.pauseReason=pauseReason;draftReflection.timer[key]={seconds:5,measuredSeconds:5,reflection:'保留草稿'};
 const before=JSON.stringify(draftReflection);T.syncAuto(draftReflection,ctx,100000);assert.equal(JSON.stringify(draftReflection),before,'explicit '+key+' stays unchanged on '+pauseReason+' re-entry');
}
const invalidReflection=T.hydrate();T.syncAuto(invalidReflection,ctx,1000);const invalidId=invalidReflection.timer.id;assert.equal(T.finishAuto(invalidReflection,3600001000),null);assert.equal(invalidReflection.timer.id,invalidId);assert.equal(invalidReflection.timer.status,'paused');assert.equal(invalidReflection.records.length,0,'validation failure retains the session for recovery');
console.log('Automatic reflection exit passed: measured si record, inactive-time exclusion, slot handoff to reading, exactly-once save, sub-second cleanup, formal/demo totals and legacy/manual failure protection.');
