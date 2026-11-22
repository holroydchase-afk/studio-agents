// usage: node tabs.js outDir url prefix selectorTemplate(with {t}) tab1,tab2 [themes]
const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{
 const [out,url,prefix,sel,tabs,themes='light,dark']=process.argv.slice(2);
 fs.mkdirSync(out,{recursive:true});
 const b=await chromium.launch(); const sizes={phone:{width:390,height:844},laptop:{width:1440,height:900}}; let n=0;
 for(const th of themes.split(','))for(const [sn,vp] of Object.entries(sizes)){
  const ctx=await b.newContext({viewport:vp,colorScheme:th,isMobile:sn==='phone',hasTouch:sn==='phone'});
  const pg=await ctx.newPage();
  await pg.goto(url,{waitUntil:'load',timeout:30000}).catch(e=>console.log('goto',e.message.split('\n')[0]));
  await pg.waitForTimeout(1200);
  await pg.getByRole('button',{name:/^Got it/}).first().evaluate(e=>e.click()).catch(()=>{}); await pg.waitForTimeout(400);
  for(const t of tabs.split(',')){
   try{ await pg.locator(sel.replace('{t}',t)).first().evaluate(e=>e.click()); await pg.waitForTimeout(700);
     await pg.screenshot({path:`${out}/${prefix}-${t}__${sn}__${th}.png`,fullPage:true});n++;}
   catch(e){console.log('FAIL',t,sn,th,e.message.split('\n')[0]);}
  }
  await ctx.close();}
 await b.close();console.log('shots',n);})();
