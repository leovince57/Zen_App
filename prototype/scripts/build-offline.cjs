// No dependencies: builds the same prototype as a single, offline HTML file.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),delivery=path.resolve(root,'..','delivery');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8').replace(/url\(['"]?(assets\/[\w./-]+)['"]?\)/g,(_match,asset)=>{
 const filename=path.resolve(root,asset);
 if(!filename.startsWith(path.join(root,'assets')+path.sep))throw new Error('Asset must stay inside assets: '+asset);
 const mime={'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ttf':'font/ttf','.woff2':'font/woff2'}[path.extname(filename)];
 if(!mime)throw new Error('Unsupported offline asset: '+asset);
 return `url('data:${mime};base64,${fs.readFileSync(filename).toString('base64')}')`;
});
const scripts=['curriculum.js','study-tools.js','study-notices.js','app.js'].map(name=>{const code=fs.readFileSync(path.join(root,name),'utf8');new vm.Script(code,{filename:name});return code.replace(/<\/script/gi,'<\\/script');});
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
html=html.replace('<link rel="stylesheet" href="styles.css">',()=>`<style>\n${css}\n</style>`);
html=html.replace(/  <script src="(?:curriculum|study-tools|study-notices|app)\.js" defer><\/script>\n?/g,'');
html=html.replace('</body>',()=>scripts.map(s=>`<script>\n${s}\n</script>`).join('\n')+'\n</body>');
fs.mkdirSync(delivery,{recursive:true});fs.writeFileSync(path.join(delivery,'1.html'),html);
console.log('Offline preview built: delivery/1.html ('+Buffer.byteLength(html)+' bytes).');
