// Exercise real navigation handlers against a browser-like history, including reloads.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8')
 .replace(/^function render\(.*$/m,"function render(preserve=false){if(!preserve)document.querySelector('.phone-content').scrollTop=readingScrollTop();}")
 .replace(/\nrender\(\);\n\}\)\(\);\s*$/,`\nglobalThis.test={navigate,returnToEntry,actions,ui,article,reflect,read,task,persist,T,get page(){return page;},get data(){return data;},get current(){return current();}};render();\n})();`);
function browser(initial='?role=student&page=home',protocol='http:'){
 let entries=[{url:initial,state:null}],index=0,raw=null,events,model;
 const storage={fail:false},content={scrollTop:0,scrollTo({top}){this.scrollTop=top;}};
 const location={protocol,search:'',hash:''};
 const copy=v=>v==null?v:JSON.parse(JSON.stringify(v));
 const setURL=value=>{location.search=protocol==='file:'?'':value;location.hash=protocol==='file:'?value:'';};
 const history={get state(){return copy(entries[index].state);},replaceState(state,_,url){entries[index]={state:copy(state),url};setURL(url);},pushState(state,_,url){entries=entries.slice(0,index+1);entries.push({state:copy(state),url});index++;setURL(url);},back(){this.go(-1);},go(delta){const next=index+delta;if(next<0||next>=entries.length)return;index=next;setURL(entries[index].url);events.popstate({state:this.state});}};
 function reload(){
  events={};setURL(entries[index].url);
  const c={STUDY_MAP:JSON.parse(fs.readFileSync(path.join(root,'curriculum.json'))),URLSearchParams,Intl,Date,Math,setTimeout(){},location,history,
   localStorage:{getItem(){return raw;},setItem(_,value){if(storage.fail)throw Error('storage full');raw=value;}},
   document:{hidden:false,addEventListener(){},querySelector(s){return s==='.phone-content'?content:null;}},addEventListener(name,fn){events[name]=fn;}};
  vm.createContext(c);for(const name of ['study-tools.js','study-notices.js'])vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),c);
  vm.runInContext(app,c);model=c.test;return model;
 }
 reload();return {get m(){return model;},get index(){return index;},get length(){return entries.length;},history,content,storage,reload};
}
for(const protocol of ['http:','file:']){
 const b=browser(protocol==='file:'?'#role=student&page=home':undefined,protocol);
 b.content.scrollTop=37;b.m.navigate('article',{id:'karma'});
 assert.match(b.m.article().bar,/data-go="home".*data-history-back/);
 b.m.T.turnDemo(b.m.data.tools,'karma',1,'sample',3);b.content.scrollTop=325;
 b.m.data.tools.timer.elapsedMs=6000;
 b.m.returnToEntry('home');assert.equal(b.m.page,'home');assert.equal(b.index,0);assert.equal(b.length,2);assert.equal(b.content.scrollTop,37);
 assert.equal(b.m.data.tools.demoReadings.karma.page,1);assert.equal(b.m.data.tools.demoReadings.karma.scrollTop,325);
 const saved=b.m.data.tools.records.filter(r=>r.kind==='timer');assert.equal(saved.length,1);const id=saved[0].id;
 b.history.go(1);assert.equal(b.m.page,'article');assert.equal(b.content.scrollTop,325);
 b.reload();assert.match(b.m.article().bar,/data-go="home"/);b.history.back();assert.equal(b.m.page,'home');
 assert.equal(b.m.data.tools.records.filter(r=>r.id===id).length,1,'return/reload cannot duplicate a finished session');
}
const b=browser();
b.m.navigate('category',{branch:'正信'});b.m.navigate('task',{id:'karma'});b.m.navigate('read');b.m.navigate('article');
b.reload();b.m.returnToEntry('read');assert.equal(b.m.page,'read');
b.m.returnToEntry('task');assert.equal(b.m.page,'task');b.history.back();assert.equal(b.m.page,'category');
assert.equal(b.length,5,'back does not append hidden ancestors');
b.m.navigate('home');b.m.navigate('reflect',{id:'karma'});assert.match(b.m.reflect().bar,/data-go="home".*data-history-back/);
b.m.current.reflectionDraft={text:'保留这次心得',question:'一个问题'};b.m.data.tools.timer.elapsedMs=6000;
b.m.actions['save-reflection']();assert.equal(b.m.page,'home');assert.equal(b.m.current.reflection,'保留这次心得');
assert.equal(b.m.current.events.filter(e=>e.kind==='reflection').length,1);
b.m.navigate('article',{id:'karma'});b.content.scrollTop=180;b.m.navigate('reflect');b.reload();
b.m.returnToEntry('article');assert.equal(b.m.page,'article');assert.equal(b.content.scrollTop,180);b.m.returnToEntry('home');assert.equal(b.m.page,'home');
// Storage rejection must leave both the screen and the history cursor on the content.
b.m.navigate('reflect',{id:'karma'});b.m.current.reflectionDraft={text:'尚未保存的心得',question:''};const before=b.index,length=b.length;
b.storage.fail=true;b.m.returnToEntry('home');assert.equal(b.index,before);assert.equal(b.m.page,'reflect');
b.history.back();assert.equal(b.index,before);assert.equal(b.length,length);assert.equal(b.m.page,'reflect');
b.storage.fail=false;b.m.actions['save-reflection']();assert.equal(b.m.page,'home');assert.equal(b.m.current.reflection,'尚未保存的心得');
b.m.navigate('article',{id:'karma'});b.content.scrollTop=222;b.storage.fail=true;const readingIndex=b.index;b.history.back();assert.equal(b.index,readingIndex);assert.equal(b.m.page,'article');
b.storage.fail=false;b.m.returnToEntry('home');assert.equal(b.m.data.tools.demoReadings.karma.scrollTop,222);
const direct=browser('?role=student&page=article&task=karma&articleFrom=home');direct.m.returnToEntry('home');assert.equal(direct.m.page,'home');assert.equal(direct.length,1);
console.log('Content navigation passed: actual parents, header/browser back, forward, reload, offline hash, nested reflection, scroll/chapter recovery, one-time records and failed-save rollback.');
