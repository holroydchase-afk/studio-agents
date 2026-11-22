const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch(); const out='shots/crew-clock'; fs.mkdirSync(out,{recursive:true}); let n=0;
 const sizes={phone:{viewport:{width:390,height:844},isMobile:true,hasTouch:true},laptop:{viewport:{width:1440,height:900}}};
 for(const th of ['light','dark']) for(const [sn,dev] of Object.entries(sizes)){
  const ctx=await b.newContext({...dev,colorScheme:th,geolocation:{latitude:38.4,longitude:-81.2},permissions:['geolocation']}); const p=await ctx.newPage();
  const shot=async(name)=>{await p.waitForTimeout(500);await p.screenshot({path:`${out}/${name}__${sn}__${th}.png`,fullPage:true});n++;};
  try{
   await p.goto('http://localhost:8104/'); await p.waitForSelector('.name-btn'); await shot('sign-in');
   await p.getByRole('button',{name:'Travis K.'}).first().click(); await p.waitForSelector('.punch, [data-action="prime-location"]');
   if(await p.locator('[data-action="prime-location"]').count()){await shot('location-consent'); await p.click('[data-action="prime-location"]'); await p.waitForSelector('.punch');}
   await shot('crew-home'); await p.click('.punch.in'); await p.waitForSelector('.job-btn'); await shot('punch-pick-job');
   await p.click('.job-btn[data-id="j1"]'); await p.waitForSelector('.big-check'); await shot('punch-confirmed');
   await p.getByRole('button',{name:'OK',exact:true}).click(); await p.waitForSelector('.punch.out'); await shot('crew-clocked-in');
   await p.getByRole('button',{name:'Not you?'}).click(); await p.waitForSelector('.name-btn');
   await p.getByRole('button',{name:'Sam W.'}).first().click(); await p.waitForSelector('.boss');
   for(const t of ['map','today','jobs','crew','chat']){await p.click(`[data-action="boss-tab"][data-tab="${t}"]`); await p.waitForSelector(`.boss-body.tab-${t}`); await shot('boss-'+t);}
  }catch(e){console.log('FAIL',sn,th,e.message.split('\n')[0]);}
  await ctx.close();}
 await b.close();console.log('shots',n);})();
