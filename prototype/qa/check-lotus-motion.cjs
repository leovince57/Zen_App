// Navigation is deferred exactly once; cancellation never re-enters an old page.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
function setup({reduced=false,unsupported=false}={}){
 const routes=[],infos=[],animations=[];const live={textContent:''};
 const root={setAttribute(){},removeAttribute(){},querySelector(){return live;}};
 const context={page:'home',role:'student',document:{hidden:false},matchMedia:()=>({matches:reduced}),navigate:(...args)=>routes.push(args),openInfo:(...args)=>infos.push(args)};
 vm.createContext(context);vm.runInContext('let pendingLotus=null;'+source.slice(source.indexOf('function cancelLotusNavigation'),source.indexOf('function statusBar')),context);
 function button(branch='正信',tilt=1.5){
  const visual={style:{}};
  if(!unsupported)visual.animate=(frames,options)=>{
   let resolve,reject;const finished=new Promise((yes,no)=>{resolve=yes;reject=no;});
   const motion={frames,options,finished,resolve,cancel(){this.canceled=true;reject(new Error('cancelled'));}};animations.push(motion);return motion;
  };
  const petal={dataset:{tilt},querySelector(){return visual;}};
  const btn={isConnected:true,dataset:branch?{branch}:{},closest:selector=>selector==='.lotus-bloom'?root:branch?petal:null,...(!branch?visual:{})};
  return btn;
 }
 return {context,button,routes,infos,animations,live};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 const s=setup(),b=s.button();s.context.activateLotus(b);s.context.activateLotus(b);s.context.activateLotus(s.button('正愿',-1.2));
 assert.equal(s.animations.length,1);assert.equal(s.routes.length,0);assert.match(s.live.textContent,/正信/);
 const a=s.animations[0];assert.equal(a.options.duration,1100);assert.equal(a.frames[0].transform,a.frames[2].transform);assert.doesNotMatch(JSON.stringify(a.frames),/scale|translate/);assert.equal(a.frames[1].transform,'rotate(0.75deg)');
 a.resolve();await settle();assert.equal(s.routes.length,1);assert.equal(s.routes[0][0],'category');assert.equal(s.routes[0][1].branch,'正信');
 for(const condition of ['cancel','detached','hidden','role','page']){
  const t=setup(),btn=t.button();t.context.activateLotus(btn);
  if(condition==='cancel')t.context.cancelLotusNavigation();
  if(condition==='detached')btn.isConnected=false;
  if(condition==='hidden')t.context.document.hidden=true;
  if(condition==='role')t.context.role='teacher';
  if(condition==='page')t.context.page='journey';
  t.animations[0].resolve();await settle();assert.equal(t.routes.length,0,condition+' must not navigate');
 }
 for(const opts of [{reduced:true},{unsupported:true}]){const t=setup(opts);t.context.activateLotus(t.button());assert.equal(t.animations.length,0);assert.equal(t.routes.length,1);}
 const center=setup();center.context.activateLotus(center.button('正见',0));assert.equal(center.animations[0].frames[1].transform,'perspective(700px) rotateX(-8deg)');center.animations[0].resolve();await settle();assert.equal(center.routes[0][1].branch,'正见');
 const jue=setup();jue.context.activateLotus(jue.button(null));assert.equal(jue.animations[0].options.duration,600);jue.animations[0].resolve();await settle();assert.equal(jue.infos.length,1);assert.equal(jue.routes.length,0);
 const failed=setup();failed.context.activateLotus(failed.button());failed.animations[0].cancel();await settle();assert.equal(failed.routes.length,1,'animation failure must not block the chosen route');
 assert.match(source,/function render\(preserve=false\)\{cancelLotusNavigation\(\)/);
 assert.match(source,/event\.key==='Escape'&&pendingLotus/);
 console.log('Lotus motion passed: one-shot route, repeated taps, unchanged trajectory, cancellation, stale page/role/background guards, reduced motion, unsupported API and awakening entry.');
})().catch(error=>{console.error(error);process.exitCode=1;});
