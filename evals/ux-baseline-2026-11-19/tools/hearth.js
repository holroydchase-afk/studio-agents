const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{
 const b=await chromium.launch(); const out='shots/hearth'; fs.mkdirSync(out,{recursive:true}); let n=0;
 const sizes={phone:{viewport:{width:390,height:844},isMobile:true,hasTouch:true},laptop:{viewport:{width:1440,height:900}}};
 for(const th of ['light','dark']) for(const [sn,dev] of Object.entries(sizes)){
  const ctx=await b.newContext({...dev,colorScheme:th}); const p=await ctx.newPage();
  const shot=async(name)=>{await p.waitForTimeout(700);await p.screenshot({path:`${out}/${name}__${sn}__${th}.png`,fullPage:true});n++;};
  try{
   await p.goto('http://127.0.0.1:8106/'); await p.getByText('Search photos').first().waitFor({timeout:30000});
   await shot('gallery');
   const tabs=await p.getByRole('tab').allInnerTexts(); console.log(sn,th,JSON.stringify(tabs));
   for(const t of ['Share','Feed','More']){ await p.getByRole('tab',{name:new RegExp('^'+t)}).first().click().catch(()=>console.log('tabfail',t)); await shot('tab-'+t.toLowerCase());}
   await p.getByRole('tab',{name:/^More/}).click();
   const rows=await p.getByRole('button').evaluateAll(els=>els.map(e=>e.getAttribute('aria-label')||e.innerText).filter(Boolean).slice(0,30)); console.log('rows',JSON.stringify(rows));
   if(th==='light'&&sn==='phone') fs.writeFileSync('/tmp/hearth-rows.json',JSON.stringify(rows));
   const names=JSON.parse(fs.readFileSync('/tmp/hearth-rows.json','utf8')).filter(r=>!/^(Gallery|Share|Feed|More|Demo|Reset|Close)/.test(r));
   for(const r of names){ try{ await p.getByRole('tab',{name:/^More/}).click(); await p.getByRole('button',{name:r,exact:true}).first().click({timeout:3000}); await shot('more-'+r.replace(/[^a-z0-9]+/gi,'-').slice(0,40).toLowerCase()); }catch(e){} }
  }catch(e){console.log('FAIL',sn,th,e.message.split('\n')[0]);}
  await ctx.close();}
 await b.close();console.log('shots',n);})();
