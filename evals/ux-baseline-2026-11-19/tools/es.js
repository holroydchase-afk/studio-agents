const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch({args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const url='http://localhost:4174/', out='shots/energy-scanner'; require('fs').mkdirSync(out,{recursive:true}); let n=0;
 const sizes={phone:{viewport:{width:390,height:844},isMobile:true,hasTouch:true},laptop:{viewport:{width:1440,height:900}}};
 for(const [sn,dev] of Object.entries(sizes)){
  const open=async(grey,evening)=>{const p=await b.newPage(dev); if(evening) await p.clock.setFixedTime(new Date('2026-10-22T19:00:00'));
    await p.addInitScript(g=>localStorage.setItem('alwaysGrey',JSON.stringify(g)),grey); await p.goto(url); await p.waitForTimeout(600); return p;};
  const shot=async(p,name)=>{await p.screenshot({path:`${out}/${name}__${sn}__default.png`,fullPage:true});n++;};
  try{
   let p=await open(false,true); await shot(p,'start-evening');
   await p.locator('.pad').focus(); await p.keyboard.down('Space'); await p.waitForTimeout(2900); await p.keyboard.up('Space'); await p.waitForTimeout(500); await shot(p,'palm-reading'); await p.close();
   for(const [g,name] of [[true,'photo-aura-grey'],[false,'photo-aura-rainbow']]){
    p=await open(g,false);
    await p.getByRole('radio',{name:/Photo scan/}).click(); await shot(p,'photo-scan-start');
    await p.getByRole('button',{name:'Try the sample'}).click({force:true}); await p.waitForSelector('canvas.aura',{timeout:60000}); await p.waitForTimeout(2500); await shot(p,name); await p.close();}
  }catch(e){console.log('FAIL',sn,e.message.split('\n')[0]);}
 }
 await b.close();console.log('shots',n);})();
