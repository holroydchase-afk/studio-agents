import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { openDemo } from "./scripts/browser.mjs";
const out = process.argv[2]; mkdirSync(out,{recursive:true});
const tabs=["home","inbox","pipeline","ruled","all","people","criteria","watch","filters"];
const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH}); let n=0;
for(const th of ["light","dark"]) for(const [sn,w,h] of [["phone",390,844],["laptop",1440,900]]){
  const {page}=await openDemo(b,{width:w,height:h,colorScheme:th,file:`dist/rr-${sn}-${th}.html`});
  for(const t of tabs){
    try{ const el=page.locator(`button[data-tab="${t}"]`).first(); await el.evaluate(e=>e.click()); await page.waitForTimeout(500);
      await page.screenshot({path:`${out}/${t}__${sn}__${th}.png`,fullPage:true}); n++; }catch(e){console.log("FAIL",t,sn,th,e.message.split("\n")[0]);}
  }
  await page.close();
}
await b.close(); console.log("shots",n);
