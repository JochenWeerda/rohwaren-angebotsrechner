'use strict';
(() => {
 const CLIENT_ID='611935635546-osobu4sqi10s4lab81kjls8gmbb1jh9o.apps.googleusercontent.com';
 const SCOPE='https://www.googleapis.com/auth/gmail.readonly';
 const QUERY='in:trash from:email@mpaschelke.de has:attachment filename:pdf subject:"Preisliste vom" newer_than:45d';
 const API='https://gmail.googleapis.com/gmail/v1/users/me/';
 let token='',expires=0,client=null,busy=false,generation=0,lastCheck=0,lastImported='';
 const pending=new Set();
 const note=s=>{const el=$('gmailState');el.textContent=s;el.className=/Abfragelimit|nicht innerhalb|fehlgeschlagen|Google erlaubt|Mehr als 100|abgelaufen/i.test(s)?'ocrWarn':'hint';};
 function connected(){return !!token&&Date.now()<expires;}
 function controls(){const ok=connected();$('gmailConnect').classList.toggle('hidden',ok);$('gmailConnect').disabled=busy;$('gmailRefresh').classList.toggle('hidden',!ok);$('gmailDisconnect').classList.toggle('hidden',!ok);$('gmailRefresh').disabled=busy;$('gmailRefresh').textContent=busy?'Gmail-Abruf läuft …':'Neuestes Gmail-Preisblatt laden';$('gmailPanel').setAttribute('aria-busy',String(busy));}
 function endSession(){for(const controller of pending)controller.abort();generation++;token='';expires=0;lastImported='';controls();}
 async function api(resource,query={}){if(!connected()){endSession();note('Google-Anmeldung abgelaufen. Bitte erneut anmelden.');throw Error('Google-Anmeldung abgelaufen. Bitte erneut mit Google anmelden.');}const url=new URL(API+resource);for(const [k,v] of Object.entries(query))url.searchParams.set(k,v);const controller=new AbortController();pending.add(controller);const timer=setTimeout(()=>controller.abort(),20000);try{const response=await fetch(url,{signal:controller.signal,headers:{Authorization:'Bearer '+token},cache:'no-store'});if(response.status===401){endSession();note('Google-Anmeldung abgelaufen. Bitte erneut anmelden.');throw Error('Google-Anmeldung abgelaufen. Bitte erneut anmelden.');}if(!response.ok){let reason='';try{reason=(await response.json()).error?.message||'';}catch{}if(response.status===429||/quota|rate.?limit/i.test(reason))throw Error('Google-Abfragelimit erreicht. Bitte eine Minute warten und dann erneut laden. Es wurde kein neues Preisblatt übernommen.');throw Error(response.status===403?'Google erlaubt den Gmail-Abruf noch nicht. Gmail API, Lese-Freigabe und Testnutzer im Google-Projekt prüfen. '+reason:'Gmail-Abruf fehlgeschlagen ('+response.status+'). Bitte erneut versuchen.');}return await response.json();}catch(e){if(e.name==='AbortError')throw Error('Gmail antwortet nicht innerhalb von 20 Sekunden. Bitte erneut laden oder PDF aus Dateien wählen.');throw e;}finally{clearTimeout(timer);pending.delete(controller);}}
 function parts(part){return [part,...(part.parts||[]).flatMap(parts)];}
 function headers(msg,name){return (msg.payload?.headers||[]).find(h=>h.name.toLowerCase()===name)?.value||'';}
 function dayFromSubject(subject){const m=subject.match(/^Preisliste vom (\d{2})\.(\d{2})\.(20\d{2})\b/i);if(!m)return '';const iso=`${m[3]}-${m[2]}-${m[1]}`;const parsed=new Date(iso);return !Number.isNaN(parsed.getTime())&&parsed.toISOString().slice(0,10)===iso?iso:'';}
 function decode(data){const raw=atob(data.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
 async function latest(manual=true){const mine=generation,importRevision=revision;if(busy)return;busy=true;controls();note('Suche neuestes Paschelke-Preisblatt im Gmail-Papierkorb …');try{
 let pageToken='',references=[];do{const result=await api('messages',{q:QUERY,includeSpamTrash:true,maxResults:100,...(pageToken?{pageToken}:{})});references.push(...(result.messages||[]));pageToken=result.nextPageToken||'';if(references.length>100||(references.length===100&&pageToken))throw Error('Mehr als 100 Preisblatt-Mails in 45 Tagen. Bitte das aktuelle PDF manuell auswählen; keine unvollständige automatische Auswahl.');note('Gmail: '+references.length+' passende Mails gefunden – lade Trefferliste …');if(mine!==generation)return;}while(pageToken);
 const messages=[];for(let offset=0;offset<references.length;offset+=5){if(mine!==generation)return;note('Gmail: prüfe Mails '+(offset+1)+'–'+Math.min(offset+5,references.length)+' von '+references.length+' …');const batch=await Promise.all(references.slice(offset,offset+5).map(ref=>api('messages/'+encodeURIComponent(ref.id),{format:'full'})));for(const msg of batch){const sender=headers(msg,'from'),day=dayFromSubject(headers(msg,'subject'));if(!/(?:^|[<\s])email@mpaschelke\.de(?:>|\s|$)/i.test(sender)||!day)continue;messages.push({msg,day});}}

 messages.sort((a,b)=>b.day.localeCompare(a.day)||Number(b.msg.internalDate)-Number(a.msg.internalDate));
 let chosen;for(const item of messages){const pdfs=parts(item.msg.payload||{}).filter(p=>/^Preisliste vom \d{2}\.\d{2}\.20\d{2}\.pdf$/i.test(p.filename||'')&&p.filename.toLowerCase()===('Preisliste vom '+item.day.slice(8,10)+'.'+item.day.slice(5,7)+'.'+item.day.slice(0,4)+'.pdf').toLowerCase());if(pdfs.length>1)throw Error('Mehrere gleichnamige Preisblätter in der neuesten Mail. Bitte Anhang manuell auswählen.');if(pdfs.length===1){chosen={...item,part:pdfs[0]};break;}}
 if(!chosen){note('Kein passender Paschelke-PDF-Anhang der letzten 45 Tage im Papierkorb gefunden. Vor dem täglichen Eingang kann noch kein neues Preisblatt vorliegen. Datei kann weiterhin manuell geladen werden.');lastCheck=Date.now();return;}
 const {msg,part,day}=chosen,id=msg.id+':'+part.partId;
 if(mine!==generation)return;
 if(id===lastImported){note('Bereits geladen: '+part.filename+'. Kein neueres Preisblatt gefunden.');lastCheck=Date.now();return;}
 if(!manual&&(rows.length||$('purchase').value)){note('Neueres Preisblatt verfügbar: '+part.filename+'. Zum Übernehmen „Neuestes Gmail-Preisblatt laden“ wählen; aktuelle Kalkulation bleibt erhalten.');lastCheck=Date.now();return;}
 if((rows.length||$('purchase').value)&&!confirm('Neues Gmail-Preisblatt laden? Aktueller Einkauf und die Preisblatt-Zuordnung werden neu ermittelt.')){note('Aktuelle Kalkulation beibehalten. Neues Preisblatt wurde nicht geladen.');lastCheck=Date.now();return;}
 note('Lade Original-PDF: '+part.filename+' …');
 const body=part.body?.attachmentId?await api('messages/'+encodeURIComponent(msg.id)+'/attachments/'+encodeURIComponent(part.body.attachmentId)):part.body;
 if(mine!==generation)return;if(!body?.data)throw Error('PDF-Anhang ist leer. Bitte Datei manuell laden.');const bytes=decode(body.data);if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('Anhang ist keine gültige PDF-Datei.');
 if(revision!==importRevision){note('Zwischenzeitlich wurde eine andere Datei gewählt. Aktuelle Kalkulation beibehalten; Gmail-Abruf bei Bedarf erneut starten.');return;}
 note('PDF geladen – lese Tabelle lokal im Browser …');
 await upload(new File([bytes],part.filename,{type:'application/pdf'}));if(mine!==generation)return;lastCheck=Date.now();
 if(!rows.length){note('PDF aus Gmail geladen, aber keine sicher zugeordneten Tabellenpreise erkannt. Original prüfen oder Einkauf manuell erfassen.');return;}
 lastImported=id;const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin'}).format(new Date());note('Aus Gmail geladen: '+part.filename+' · '+rows.length+' Preispositionen.'+(day<today?' Älteres Preisblatt: Heute liegt noch kein neueres passendes PDF vor.':''));
 }catch(e){if(mine===generation)note(e.message||'Gmail konnte nicht geladen werden. Datei bitte manuell auswählen.');}finally{busy=false;controls();}}
 $('gmailConnect').onclick=()=>{
 if(!window.google?.accounts?.oauth2){note('Google-Anmeldung konnte nicht geladen werden. Internetverbindung prüfen, Seite neu laden oder PDF aus Dateien wählen.');return;}
 if(!client)client=google.accounts.oauth2.initTokenClient({client_id:CLIENT_ID,scope:SCOPE,include_granted_scopes:false,callback:response=>{if(response.error){note('Google-Anmeldung nicht freigegeben. PDF kann manuell geladen werden.');controls();return;}if(!google.accounts.oauth2.hasGrantedAllScopes(response,SCOPE)){note('Gmail-Leseberechtigung fehlt. Bitte erneut anmelden und die Berechtigung freigeben.');return;}token=response.access_token;expires=Date.now()+Math.max(0,Number(response.expires_in)-60)*1000;generation++;controls();latest();},error_callback:error=>{note(error.type==='popup_closed'?'Anmeldung abgebrochen.':'Google-Anmeldung konnte nicht geöffnet werden. Pop-up zulassen oder App in Safari/Chrome öffnen.');controls();}});
 client.requestAccessToken({prompt:'select_account'});
 };
 $('gmailRefresh').onclick=()=>latest();
 $('gmailDisconnect').onclick=()=>{endSession();note('Gmail-Verbindung in dieser App beendet. Das geladene Preisblatt bleibt in dieser Sitzung sichtbar.');};
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){if(token&&!connected()){endSession();note('Google-Anmeldung abgelaufen. Zum Aktualisieren bitte erneut anmelden.');}else if(connected()&&Date.now()-lastCheck>300000)latest(false);}});
 // Access tokens remain in memory only. A fresh page load requires an explicit Google sign-in.
 controls();
})();
