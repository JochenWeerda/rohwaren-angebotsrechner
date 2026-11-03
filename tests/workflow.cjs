const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'..'),fixture=process.env.PRICE_FIXTURE;
if(!fixture)throw Error('Set PRICE_FIXTURE to the original 02.11.2026 PDF');
(async()=>{const server=http.createServer((req,res)=>{const file=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);fs.readFile(file,(e,data)=>{res.statusCode=e?404:200;res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.png')?'image/png':'text/html');res.end(e?'Missing':data);});}).listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));
const url=process.env.TEST_URL||`http://127.0.0.1:${server.address().port}`;const browser=await chromium.launch({channel:'chrome',headless:false});const results=[];
try{for(const width of [1440,390,375,320]){const context=await browser.newContext({viewport:{width,height:900},permissions:['clipboard-read','clipboard-write']});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await page.goto(url);
const fill=async(id,value)=>page.locator('#'+id).fill(String(value));const eq=async(id,value)=>assert.equal(await page.locator('#'+id).inputValue(),id==='purchase'&&value!==''?Number(value).toFixed(2):String(value));const offer=async(value)=>assert.equal(await page.locator('#offer').innerText(),value+' €');
assert(await page.locator('#copy').isDisabled());assert.equal(await page.locator('#offer').innerText(),'–');
await page.locator('#photo').setInputFiles(fixture);await page.waitForFunction(()=>!document.querySelector('#readPrices').disabled,{timeout:120000});assert.match(await page.locator('#ocrState').innerText(),/144 Preispositionen/);
await fill('product','Rapsschrott');await page.locator('#port').selectOption('Hamburg');await fill('period','November 2026');await eq('purchase',315);await eq('freight',30);await offer('34,90');
await fill('period','Dezember 2026');await eq('purchase',305);await offer('33,90');
await page.locator('#port').selectOption('Brake');await eq('purchase',314);await eq('freight',15);await offer('33,30');
await fill('period','Januar 2027');await eq('purchase',309);await offer('32,80');
await fill('period','1/27');await eq('purchase',309);
await fill('period','unbekannt');await eq('purchase','');assert(await page.locator('#copy').isDisabled());
await fill('period','12');await eq('purchase',314);
await page.locator('#delivery').selectOption('slide');await offer('33,70');await page.locator('#delivery').selectOption('blown');await offer('33,80');await page.locator('#delivery').selectOption('slideblown');await offer('34,20');
await page.locator('#marginType').selectOption('partial');await eq('margin',10);await fill('tons',10);await offer('34,80');await page.locator('#mix').check();await offer('37,60');await page.locator('#eudr').check();await offer('40,10');
await fill('other',2);await offer('40,30');await fill('margin',7);await eq('marginType','custom');await offer('40,00');
for(const [id,v] of [['tons',0],['purchase',-1],['freight',-1],['margin',-1]]){const old=await page.locator('#'+id).inputValue();await fill(id,v);assert.equal(await page.locator('#offer').innerText(),'–');await fill(id,old);}
await page.locator('#route').selectOption('direct');await eq('freight','');assert(await page.locator('#copy').isDisabled());await fill('freight',42);await offer('42,70');
await fill('purchase',320);assert.match(await page.locator('#priceSource').innerText(),/Manuelle Korrektur/);await offer('43,30');
await fill('client','Testkunde');await page.locator('#message').fill((await page.locator('#message').inputValue())+'\nIndividuelle Ergänzung');await page.locator('#checked').check();assert.match(await page.locator('#message').inputValue(),/Individuelle Ergänzung/);await page.locator('#copy').click();assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/43,30.*\/dt netto/);
// Intercept external share to check payload without sending a customer message.
await page.evaluate(()=>{window.testShared=null;Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.testShared=data.text;}})});await page.locator('#share').click();assert.match(await page.evaluate(()=>window.testShared),/Individuelle Ergänzung/);
await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:undefined}));await page.evaluate(()=>{window.testURL='';window.open=(u)=>{window.testURL=u;return {};}});await page.locator('#share').click();assert.match(await page.evaluate(()=>window.testURL),/^https:\/\/wa.me\/\?text=/);
await fill('freight',41);assert(await page.locator('#copy').isDisabled());
const chooser=page.waitForEvent('filechooser');await page.locator('#cameraButton').click();await chooser;assert.equal(await page.locator('#camera').getAttribute('capture'),'environment');
// Cancelling camera leaves file input available; re-upload clears a corrected price.
await page.locator('#photo').setInputFiles(fixture);await page.waitForFunction(()=>!document.querySelector('#readPrices').disabled,{timeout:120000});await eq('purchase',314);
// Contract periods: inclusive calendar-day weights across month/year boundaries.
await page.locator('#port').selectOption('Hamburg');await fill('product','Rapsschrot');await page.locator('#origin').selectOption('Hamburg');
await fill('dateFrom','2026-11-20');await fill('dateTo','2026-12-10');await eq('purchase',310.24);assert(Math.abs(await page.evaluate(()=>exactPurchase)-(11*315+10*305)/21)<1e-10);assert.match(await page.locator('#dateBreakdown').innerText(),/11 Tage.*10 Tage/);
await fill('dateFrom','2026-12-31');await fill('dateTo','2027-01-01');await eq('purchase',302.5);
await fill('dateFrom','2026-12-15');await fill('dateTo','2026-12-15');await eq('purchase',305);
await page.locator('#port').selectOption('Brake');await page.locator('#origin').selectOption('Schrot! Brake/Bremen/Oldenbg');await fill('dateFrom','2026-12-01');await fill('dateTo','2027-01-31');await eq('purchase',311.5);
assert.equal(await page.locator('#dateTo').getAttribute('max'),'2028-01-31');
await fill('dateFrom','2026-11-03');assert.equal(await page.locator('#offer').innerText(),'–');assert.match(await page.locator('#validation').innerText(),/Kein ausgewiesener Preis/);
await fill('dateFrom','2026-11-02');assert.equal(await page.locator('#offer').innerText(),'–');
await fill('dateFrom','2026-12-01');await fill('dateTo','2028-02-01');assert.equal(await page.locator('#offer').innerText(),'–');
await fill('dateTo','2026-12-31');await eq('purchase',314);
await page.locator('#port').selectOption('Hamburg');await fill('product','Soja LP');await page.locator('#origin').selectOption('fot Hamburg');assert.equal(await page.locator('#dateTo').getAttribute('max'),'2027-06-30');
await page.locator('#port').selectOption('Brake');await fill('product','Mais europ.');await page.locator('#origin').selectOption('fot Brake/HB/Oldenburg/Drentwede');await fill('dateFrom','2027-02-01');await fill('dateTo','2027-02-28');assert.match(await page.locator('#validation').innerText(),/Mehrdeutige Preisperioden/);
await page.locator('#port').selectOption('Hamburg');await fill('product','Rapsschrot');await page.locator('#origin').selectOption('Hamburg');await fill('dateFrom','2027-03-01');await fill('dateTo','2027-03-31');await eq('purchase',295);assert.match(await page.locator('#dateBreakdown').innerText(),/31 Tage/);
await page.locator('#route').selectOption('depot');await page.locator('#checked').check();
await page.screenshot({path:path.resolve(__dirname,`../../../outputs/browser-${width}.png`),fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow');assert.deepEqual(errors,[]);results.push({width,status:'passed',consoleErrors:errors});await context.close();}
console.log(JSON.stringify({url,results},null,2));}finally{await browser.close();server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
