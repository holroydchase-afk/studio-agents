// usage: node shot.js outDir baseUrl path1,path2 [themes=light,dark] [fullPage=1]
const { chromium } = require('playwright');
const fs=require('fs');
(async()=>{
 const [out,base,paths,themes='light,dark']=process.argv.slice(2);
 fs.mkdirSync(out,{recursive:true});
 const b=await chromium.launch();
 const sizes={phone:{width:390,height:844},laptop:{width:1440,height:900}};
 let n=0;
 for(const p of paths.split(',')){
  for(const th of themes.split(',')){
   for(const [sn,vp] of Object.entries(sizes)){
    const ctx=await b.newContext({viewport:vp,colorScheme:th,deviceScaleFactor:1,isMobile:sn==='phone',hasTouch:sn==='phone'});
    const pg=await ctx.newPage();
    try{
     await pg.goto(base+p,{waitUntil:'load',timeout:30000});
     await pg.waitForTimeout(800);
     const slug=(p.replace(/[/?#=&.]+/g,'-').replace(/^-|-$/g,'')||'home');
     await pg.screenshot({path:`${out}/${slug}__${sn}__${th}.png`,fullPage:true});n++;
    }catch(e){console.log('FAIL',p,sn,th,e.message.split('\n')[0]);}
    await ctx.close();
   }}}
 await b.close();console.log('shots',n);
})();
