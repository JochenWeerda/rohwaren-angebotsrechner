'use strict';
const $=id=>document.getElementById(id), eur=v=>v.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
const normalized=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/ß/g,'ss').replace(/schrott/g,'schrot').replace(/[^a-z0-9]/g,'');
const months=['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
let rows=[],selectedFile=null,revision=0,source='',sheetYear=null,sheetMonth=null,dateError='';
const status=s=>$('ocrState').textContent=s;
function periodKey(s){s=String(s).toLowerCase().trim().replace(/[*]/g,'').replace(/[–—]/g,'-'); months.forEach((m,i)=>{s=s.replace(new RegExp(m.toLowerCase(),'g'),String(i+1));});s=s.replace(/\s+/g,'/');return s.replace(/\/20(\d\d)$/,'/$1');}
function periodLabel(s){const m=s.replace('*','').match(/^(\d{1,2})(?:-(\d{1,2}))?(?:\/(\d{2,4}))?$/);if(!m)return s;let endYear=m[3]?Number(m[3]):sheetYear;if(endYear<100)endYear+=2000;if(!endYear)return s;let startYear=endYear;if(m[2]&&+m[1]>+m[2])startYear--;else if(!m[3]&&+m[1]<sheetMonth)startYear++;return months[+m[1]-1]+' '+startYear+(m[2]?' – '+months[+m[2]-1]+' '+endYear:'')+(s.includes('*')?' *':'');}
function matchesPeriod(row,input){if(!input)return true;const a=periodKey(input),b=periodKey(row.period);return a===b||normalized(input)===normalized(periodLabel(row.period))||(!b.includes('-')&&a===periodKey(periodLabel(row.period)));}
function loadLibrary(src,check){if(check())return Promise.resolve();return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>{s.remove();reject(Error('Erkennungsbibliothek nicht erreichbar. Internetverbindung prüfen und erneut starten'));};document.head.append(s);});}
function productOnLine(s){for(const p of [/Sojaschalen[- ]?Pellets/i,/Sojaschrot\s*(?:MP|HP)?/i,/Soja\s+NON\s+GMO\s+\d+\s*%\s*(?:ProFett|Protein)/i,/Soja\s+(?:LP|HP)/i,/Rapsschrot/i,/Rapsexpeller/i,/Sonnenblumenschalen[- ]?Pellets/i,/Sonne\s+(?:LP|HP)[^\d]*/i,/T[- ]?Schnitzel/i,/Palmexpeller/i,/Protigrain/i,/Mais\s+europ\./i,/Maisschrot/i,/bras\.\s*Soja[- ]?Pel\./i,/opt\.\s*Soja\s+46/i]){const m=s.match(p);if(m)return m[0].trim();}return '';}
function parseItems(items,pageNumber){
 const lines=[];for(const a of items.filter(a=>a.str?.trim()).map(a=>({x:a.transform[4],y:a.transform[5],s:a.str.trim()})).sort((a,b)=>b.y-a.y||a.x-b.x)){let line=lines.find(l=>Math.abs(l.y-a.y)<2.5);if(!line){line={y:a.y,items:[]};lines.push(line);}line.items.push(a);}
 let product='';const out=[];
 for(const line of lines.sort((a,b)=>b.y-a.y)){
 const cells=line.items.sort((a,b)=>a.x-b.x),joined=cells.map(a=>a.s).join(' '),found=productOnLine(joined);if(found)product=found;if(!product)continue;
 const first=cells.findIndex(a=>/^(loko|(?:ab\s+)?\d{1,2}(?:[-/]\d{1,2})?(?:\/\d{2,4})?\*?)$/i.test(a.s));if(first<0)continue;
 let location=cells.slice(0,first).map(a=>a.s).join(' ');if(found)location=location.replace(found,'');location=location.trim();
 const body=cells.slice(first).map(a=>a.s).join(' '),pair=/\b(loko|(?:ab\s+)?\d{1,2}(?:[-/]\d{1,2})?(?:\/\d{2,4})?\*?)\s+(\d{3}[,.]\d{2}|a\.A\.)/gi;
 for(const m of body.matchAll(pair)){if(!/^\d/.test(m[2])||!location||/\d{3}[,.]\d{2}/.test(location))continue;out.push({product,location,period:m[1],price:Number(m[2].replace(',','.')),page:pageNumber,line:joined,kind:'PDF-Text'});}
 }return out;
}
async function parsePdf(file,token){
 await loadLibrary('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',()=>!!window.pdfjsLib);pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
 const doc=await pdfjsLib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;const out=[];
 try{for(let i=1;i<=doc.numPages;i++){if(token!==revision)return [];status('Lese PDF-Seite '+i+' von '+doc.numPages+' …');const page=await doc.getPage(i),text=await page.getTextContent();const date=text.items.map(a=>a.str).join(' ').match(/\b(\d{2})\.(\d{2})\.(20\d{2})\b/);if(date){sheetMonth=+date[2];sheetYear=+date[3];}const parsed=parseItems(text.items,i);if(parsed.length)out.push(...parsed);else{const view=page.getViewport({scale:2.5}),canvas=document.createElement('canvas');canvas.width=view.width;canvas.height=view.height;await page.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;out.push(...await ocr(canvas,i));}}return out;}finally{await doc.destroy();}
}
async function ocr(image,page=1){
 await loadLibrary('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',()=>!!window.Tesseract);
 const result=await Tesseract.recognize(image,'deu+eng',{logger:m=>{if(m.status==='recognizing text')status('Texterkennung '+Math.round(m.progress*100)+' %');}});
 const date=result.data.text.match(/\b(\d{2})\.(\d{2})\.(20\d{2})\b/);if(date){sheetMonth=+date[2];sheetYear=+date[3];}
 const details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent='Foto-/Scantext zur Kontrolle öffnen – unsichere Positionen manuell prüfen';pre.textContent=result.data.text;pre.style.whiteSpace='pre-wrap';details.append(summary,pre);$('ocrChoices').replaceChildren(details);
 const items=(result.data.words||[]).map(w=>({str:w.text,transform:[1,0,0,1,w.bbox.x0,-w.bbox.y1]}));
 return parseItems(items,page).map(r=>({...r,kind:'OCR – prüfen'}));
}
function refresh(auto=true){
 refreshOrigins();$('pricePickerBlock').classList.toggle('hidden',!rows.length||$('dateMode').checked);if($('dateMode').checked){calculateDates();return;}const list=rows.filter(r=>(!$('product').value||normalized(r.product).includes(normalized($('product').value)))&&($('port').value==='Andere'||normalized(r.location).includes(normalized($('port').value)))&&(!$('origin').value||r.location===$('origin').value)&&matchesPeriod(r,$('period').value));
 const select=$('priceChoice');select.replaceChildren(new Option('Preisposition auswählen',''));for(const r of list)select.add(new Option(`${r.product} · ${r.location} · ${periodLabel(r.period)} · ${eur(r.price)}/t · Seite ${r.page}`,String(rows.indexOf(r))));
 $('pricePickNote').textContent=list.length+' passende Position(en). '+(list.length?'Position wählen oder Zeitraum genauer eingeben.':'Ware, Herkunft und Zeitraum prüfen; ggf. manuell korrigieren.');
 $('periods').replaceChildren(...[...new Set(rows.filter(r=>normalized(r.product).includes(normalized($('product').value))&&($('port').value==='Andere'||normalized(r.location).includes(normalized($('port').value)))).map(r=>periodLabel(r.period)))].map(s=>new Option(s,s)));
 if(auto){$('purchase').value='';source='';if(list.length===1&&list[0].kind==='PDF-Text'){select.value=String(rows.indexOf(list[0]));applyRow();}else update();}}
function applyRow(){dateError='';$('dateMode').checked=false;const r=rows[Number($('priceChoice').value)];if($('priceChoice').value===''||!r)return;$('product').value=r.product;$('period').value=periodLabel(r.period);$('purchase').value=r.price;const port=/Brake/i.test(r.location)?'Brake':/Hamburg/i.test(r.location)?'Hamburg':'Andere';if(port!==$('port').value){$('port').value=port;setFreight();}$('origin').value=r.location;source=`${selectedFile?.name||'Preisblatt'} · Seite ${r.page} · ${r.location} · ${periodLabel(r.period)} · ${eur(r.price)}/t`;$('checked').checked=false;update();}
function setFreight(){if($('route').value==='depot'&&$('port').value!=='Andere')$('freight').value=$('port').value==='Brake'?15:30;else $('freight').value='';}
function update(){
 $('checked').disabled=false;const ids=['purchase','tons','freight','margin','other',...($('mix').checked?['handling','mmx']:[])];const invalid=ids.find(id=>$(id).value===''||!$(id).validity.valid||!Number.isFinite(Number($(id).value))||(id==='purchase'&&+$(id).value<=0));
 let error=dateError|| (invalid?'Bitte '+(document.querySelector('label[for="'+invalid+'"]')?.textContent||invalid)+' gültig eingeben.':!$('product').value.trim()?'Bitte Rohware eingeben.':!$('period').value.trim()?'Bitte Lieferzeitraum eingeben.':'');
 $('validation').textContent=error;$('copy').disabled=$('share').disabled=!!error||!$('checked').checked;
 $('handling').disabled=$('mmx').disabled=!$('mix').checked;
 $('priceSource').textContent=source||'Manueller Einkaufspreis: bitte mit Original prüfen.';
 $('routeNote').textContent=($('route').value==='depot'?'Fracht bis Lager Groothusen; Weitertransport zum Kunden zusätzlich kalkulieren.':'Direktfracht zum Kunden manuell eintragen.')+(+$('tons').value!==25?' Teilmenge/abweichende Ladung: tatsächlichen Frachtsatz prüfen.':'');
 if(error){$('cost').textContent=$('margOut').textContent=$('offer').textContent='–';$('details').replaceChildren();$('message').value='';return;}
 const n=id=>Number($(id).value),delivery={tip:0,slide:4,blown:5,slideblown:9}[$('delivery').value];const parts=[['Einkauf',n('purchase')],['Fracht',n('freight')],['Anlieferzuschlag',delivery],['EUDR-Szenario',$('eudr').checked?25:0],['Umschlag',$('mix').checked?n('handling'):0],['Mahl- und Mischlohn',$('mix').checked?n('mmx'):0],['Weitere Kosten',n('other')],['Spanne',n('margin')]],total=parts.reduce((s,p)=>s+p[1],0);
 $('cost').textContent=eur((total-n('margin'))/10)+'/dt';$('margOut').textContent=eur(n('margin')/10)+'/dt';$('offer').textContent=eur(total/10);$('details').innerHTML=parts.filter(p=>p[1]).map(p=>'<div class="row"><span>'+p[0]+'</span><strong>'+eur(p[1])+'/t</strong></div>').join('');
 $('message').value='🌾 *ROHWAREN-ANGEBOT*\nHinrich Folkerts Landhandel\n\n'+($('client').value?'Für: '+$('client').value+'\n':'')+'*'+$('product').value+'*\nHerkunft: '+($('origin').value||$('port').value)+'\nLieferzeitraum: '+$('period').value+'\nMenge: '+n('tons').toLocaleString('de-DE')+' t\nAngebotspreis: *'+eur(total/10)+'/dt netto*\nAnlieferung: '+$('delivery').selectedOptions[0].textContent+'\n'+($('route').value==='depot'?'Kalkulationsbasis: frei Lager Groothusen. Weitertransport zum Kunden zusätzlich.':'Direktlieferung gemäß vereinbarter Zieladresse und Fracht.')+'\n\nAlle Preise netto zzgl. gesetzlicher MwSt.\nFreibleibend, vorbehaltlich Verfügbarkeit und Bestätigung der Liefer- und Frachtkonditionen.\n\nJochen Weerda | Folkerts Landhandel';
}
async function readPrices(){const file=selectedFile,token=++revision;rows=[];source='';dateError='';$('purchase').value='';$('checked').checked=false;$('pricePickerBlock').classList.add('hidden');$('ocrChoices').replaceChildren();update();if(!file){status('Bitte zuerst Foto oder PDF auswählen.');return;}$('readPrices').disabled=true;try{status('Preisblatt wird gelesen …');const result=file.type==='application/pdf'?await parsePdf(file,token):await ocr(file);if(token!==revision)return;rows=result;$('pricePickerBlock').classList.toggle('hidden',!rows.length);$('products').replaceChildren(...[...new Set(rows.map(r=>r.product))].map(s=>new Option(s,s)));refresh();status(rows.length?rows.length+' Preispositionen gelesen. Rohware → Herkunft → Zeitraum wählen.':'Keine sicher zugeordneten Tabellenpreise. Original ansehen und Einkauf, Ware, Herkunft und Zeitraum manuell eingeben.');}catch(e){if(token===revision)status('Lesefehler: '+e.message+'. Datei erneut auswählen oder Preis manuell eingeben.');}finally{if(token===revision)$('readPrices').disabled=false;}}
let previewURL;function upload(file){if(!file)return;if(!['application/pdf'].includes(file.type)&&!file.type.startsWith('image/')){status('Bitte ein Bild oder PDF auswählen.');return;}selectedFile=file;sheetYear=sheetMonth=null;dateError='';if(previewURL)URL.revokeObjectURL(previewURL);previewURL=URL.createObjectURL(file);$('preview').classList.toggle('hidden',file.type==='application/pdf');if(file.type.startsWith('image/'))$('preview').src=previewURL;$('pdfnote').replaceChildren();const link=document.createElement('a');link.href=previewURL;link.target='_blank';link.rel='noopener';link.textContent='Original öffnen: '+file.name;$('pdfnote').append(link);readPrices();}
$('photo').onchange=()=>{upload($('photo').files[0]);$('photo').value='';};$('camera').onchange=()=>{upload($('camera').files[0]);$('camera').value='';};$('cameraButton').onclick=()=>{$('camera').click();status('Kamera oder Fotomediathek wählen. Falls dies nicht unterstützt wird, oben Foto/PDF aus Dateien auswählen.');};$('readPrices').onclick=readPrices;
$('example').onclick=()=>{$('preview').src='preisblatt-beispiel.png';$('preview').classList.remove('hidden');status('Beispielansicht. Für die Erkennung bitte eine eigene Datei auswählen.');};
$('priceChoice').onchange=applyRow;
for(const id of ['product','port','period','origin'])$(id).addEventListener('input',()=>{if(id==='port')setFreight();if(id==='period'){$('dateMode').checked=false;dateError='';}if(rows.length)refresh();else update();});
$('route').addEventListener('change',()=>{setFreight();update();});$('marginType').addEventListener('change',()=>{if($('marginType').value!=='custom')$('margin').value=$('marginType').value==='partial'?10:4;update();});
$('margin').addEventListener('input',()=>{$('marginType').value='custom';});$('purchase').addEventListener('input',()=>{source='Manuelle Korrektur – Originalpreis prüfen.';});
$('checked').addEventListener('input',()=>{$('copy').disabled=$('share').disabled=!!$('validation').textContent||!$('checked').checked;});
for(const el of document.querySelectorAll('input:not([type=file]):not(#checked),select:not(#priceChoice)'))el.addEventListener('input',()=>{if(el.id!=='checked')$('checked').checked=false;update();});
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('message').value);$('shareState').textContent='Angebot kopiert.';}catch(e){$('message').focus();$('message').select();$('shareState').textContent='Automatisches Kopieren nicht möglich. Markierten Text bitte manuell kopieren.';}};
$('share').onclick=async()=>{const text=$('message').value;if(navigator.share){try{await navigator.share({text});return;}catch(e){if(e.name==='AbortError')return;}}const opened=window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener');$('shareState').textContent='WhatsApp geöffnet. Falls kein Fenster erscheint, Angebot kopieren und in WhatsApp einfügen.';};
update();

// All contract arithmetic uses UTC day numbers: DST never changes the day weights.
const dayMS=86400000;
const isoDay=d=>new Date(d*dayMS).toISOString().slice(0,10);
const todayISO=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
function periodBounds(period){const m=period.replace('*','').match(/^(\d{1,2})(?:-(\d{1,2}))?(?:\/(\d{2,4}))?$/);if(!m||!sheetYear)return null;const first=+m[1],last=+(m[2]||m[1]);if(first<1||first>12||last<1||last>12)return null;let endYear=m[3]?+m[3]:sheetYear;if(endYear<100)endYear+=2000;if(!m[3]&&first<sheetMonth)endYear++;const startYear=endYear-(first>last?1:0);return [Date.UTC(startYear,first-1,1)/dayMS,Date.UTC(endYear,last,0)/dayMS];}
function baseRows(){return rows.filter(r=>normalized(r.product)===normalized($('product').value)&&($('port').value==='Andere'||normalized(r.location).includes(normalized($('port').value))));}
function refreshOrigins(){const old=$('origin').value,locations=[...new Set(baseRows().map(r=>r.location))];$('origin').replaceChildren(new Option('Genaue Herkunft auswählen',''),...locations.map(s=>new Option(s,s)));if(locations.includes(old))$('origin').value=old;else if(locations.length===1)$('origin').value=locations[0];
 const available=baseRows().filter(r=>!$('origin').value||r.location===$('origin').value).map(r=>periodBounds(r.period)).filter(Boolean);const max=available.length?isoDay(Math.max(...available.map(b=>b[1]))):'';
 for(const id of ['dateFrom','dateTo']){$(id).min=todayISO();$(id).max=max;}
 $('dateNote').textContent=max?'Wählbar ab '+todayISO()+' bis '+max+'. Gewichtung nach Kalendertagen, beide Grenztage eingeschlossen. Fehlende Preise werden nicht überbrückt.':'Keine datierbaren Preisperioden für diese Ware/Herkunft. Preisblatt mit Datum verwenden.';
}
function calculateDates(){$('pricePickerBlock').classList.add('hidden');dateError='';$('purchase').value='';$('checked').checked=false;source='';$('dateBreakdown').replaceChildren();const from=$('dateFrom').value,to=$('dateTo').value,min=todayISO(),max=$('dateTo').max;
 if(!from||!to||from<min||to<from||!max||to>max)dateError='Lieferdatum ab heute bis zum ausgewiesenen Maximum wählen; Ende darf nicht vor Beginn liegen.';
 else if(baseRows().some(r=>r.kind!=='PDF-Text'))dateError='Foto-/Scanpreise müssen manuell geprüft werden; keine automatische Kontraktgewichtung.';
 else if(!$('origin').value)dateError='Für den Kontrakt bitte die genaue Herkunft / Ausführung auswählen.';
 if(dateError){update();return;}
 const start=Date.parse(from)/dayMS,end=Date.parse(to)/dayMS,candidates=baseRows().filter(r=>r.location===$('origin').value).map(r=>({r,b:periodBounds(r.period)})).filter(x=>x.b),segments=[];let sum=0;
 for(let d=start;d<=end;){const matches=candidates.filter(x=>x.b[0]<=d&&x.b[1]>=d);if(matches.length!==1){dateError=(matches.length?'Mehrdeutige Preisperioden':'Kein ausgewiesener Preis')+' am '+isoDay(d)+'. Zeitraum oder Herkunft korrigieren; keine automatische Kalkulation.';break;}const item=matches[0];let until=Math.min(end,item.b[1]);const next=candidates.filter(x=>x!==item&&x.b[0]>d&&x.b[0]<=until).map(x=>x.b[0]);if(next.length)until=Math.min(...next)-1;const days=until-d+1;segments.push({from:isoDay(d),to:isoDay(until),days,price:item.r.price});sum+=days*item.r.price;d=until+1;}
 if(dateError){update();return;}
 const days=end-start+1,weighted=sum/days;$('purchase').step='any';$('purchase').value=String(weighted);$('period').value=from===to?from:from+' bis '+to;source='Tagesgewichteter Einkauf · '+$('origin').value+' · '+days+' Kalendertage · '+eur(weighted)+'/t';
 $('dateBreakdown').textContent=segments.map(s=>`${s.from} bis ${s.to}: ${s.days} Tage × ${eur(s.price)}/t`).join(' · ')+` → ${sum.toLocaleString('de-DE')} / ${days} = ${weighted.toLocaleString('de-DE',{maximumFractionDigits:6})} €/t`;
 update();}
for(const id of ['dateMode','dateFrom','dateTo'])$(id).addEventListener('input',()=>{if(id!=='dateMode')$('dateMode').checked=true;dateError='';if($('dateMode').checked){refreshOrigins();calculateDates();}else{refresh();}});
$('purchase').addEventListener('input',()=>{if($('dateMode').checked){$('dateMode').checked=false;dateError='';$('dateBreakdown').textContent='Tagesberechnung durch manuellen Einkaufspreis ersetzt.';update();}});
for(const id of ['dateFrom','dateTo']){$(id).value=todayISO();$(id).min=todayISO();}
