# Rohwaren-Angebotsrechner – Folkerts Landhandel

Browser-App für Preisblattimport, Logistik und Nettoangebote in €/dt.

## Bedienreise
1. Foto/PDF aus Dateien auswählen oder Kamera verwenden. Die Erkennung startet automatisch. Das Original lässt sich separat öffnen.
2. Rohware (auch „Rapsschrott“), Hafen und Lieferperiode wählen. Eindeutige PDF-Positionen aktualisieren den Einkaufspreis. Die genaue Herkunft unterscheidet z. B. Schrot und Pellets.
3. Für einzelne Liefertage oder Kontrakte „tagesgenau kalkulieren“ aktivieren, genaue Herkunft und Von/Bis wählen. Ein Liefertag hat identische Daten. Mindestdatum ist der heutige lokale Kalendertag, Maximum das Ende der letzten datierbaren Preisperiode für Ware/Herkunft.
4. Ein Zeitraum über mehrere Perioden berechnet `Summe(Kalendertage × Einkauf €/t) / gesamte Kalendertage`. Beide Grenztage zählen. UTC-Tageszahlen vermeiden Sommerzeitfehler. Preisüberschneidungen und Lücken blockieren die automatische Kalkulation. Gleichmäßige Abnahme pro Tag ist die Rechenannahme.
5. Fracht, Anlieferung, Teilmenge, Spanne und optional Umschlag/MMX prüfen. Direktlieferung benötigt eine manuelle Fracht. Ein manueller Einkauf ersetzt den Tagesmittelwert.
6. Ergebnis ist `(Einkauf + Kosten + Spanne) / 10` in €/dt netto. Erst nach gültigen Eingaben und Bestätigung ist Kopieren/Teilen möglich. Angebotstext kann angepasst werden; Änderungen der Kalkulation erzeugen den Text neu.

## Grenzen
- PDF-Text wird pro Seite anhand der Zeilenkoordinaten ausgewertet. Nicht jedes fremde Tabellenlayout wird unterstützt.
- Foto-/Scan-OCR ist unsicher: nur ausdrücklich ausgewählte Positionen übernehmen, keine automatische Tagesgewichtung. Bei Fehlern manuell korrigieren. Kein Preis wird aus „a.A.“ geschätzt.
- Loko-/ab-Datum- und nicht datierbare Sonderpositionen können einzeln geprüft werden, sind keine automatisch gewichteten Monatsperioden.
- PDF.js und Tesseract laden über CDN. Keine Offlinegarantie beim ersten Laden. Dokumente werden lokal verarbeitet.
- Mobile Viewports in Chrome sind kein Ersatz für ein physisches iPhone/Safari oder einen Kameratest auf dem Gerät.

## Browserprüfungen
Node.js und `npm install --no-save playwright` in einem Arbeitsverzeichnis oberhalb des Repos; installiertes Chrome erforderlich.

PowerShell:
```
$env:PRICE_FIXTURE='C:/Pfad/Preisliste vom 02.11.2026.pdf'
node tests/workflow.cjs
```
Optional `TEST_URL` für dieselben Prüfungen gegen GitHub Pages. Tests verwenden das tatsächliche PDF außerhalb des Repos; es wird nicht veröffentlicht. Sie öffnen Chrome, laden das PDF per Dateieingabe und prüfen Preiswechsel, Tippfehler, Zuschläge, Grenzen, erneuten Upload, Zwischenablage, abgefangenes Teilen, Kamera-Dateiauswahl und Tagesgewichtung bei 1440/390/375/320 px. Kein Kundenangebot wird versandt. Die Datumsfälle beziehen sich auf den Prüfstand 03.11.2026.

Deployment: Push auf `main` startet `.github/workflows/pages.yml`.

## Gmail-Original-PDF

„Mit Google anmelden & Preisblatt laden“ verwendet die öffentliche OAuth-Web-Client-ID und ausschließlich `gmail.readonly`. Der Browser sucht mit `in:trash from:email@mpaschelke.de has:attachment filename:pdf subject:"Preisliste vom"` und `includeSpamTrash=true`. Absender und Betreff werden nach dem Abruf nochmals geprüft. Der neueste Preisblatt-Betreff bestimmt die Auswahl, nicht eine feste Uhrzeit. Verschachtelte MIME-Teile werden unterstützt. Mails/Anhänge werden weder gelöscht noch verschoben, markiert oder weitergeleitet. Das PDF wird direkt an den vorhandenen lokalen Parser übergeben.

Die Berechtigung `gmail.readonly` erlaubt technisch das Lesen des Postfachs; Google bietet keinen auf genau diese Suchabfrage begrenzten OAuth-Scope. Der Anwendungscode verwendet sie nur für den Preisblattabruf. Zugangstoken bleiben ausschließlich im Arbeitsspeicher, nicht in localStorage, sessionStorage oder im Repository. Beim Neuladen/Schließen oder nach Tokenablauf ist erneut eine Nutzeraktion für die Google-Anmeldung erforderlich. Es gibt keinen unbeaufsichtigten Hintergrundjob. Nach Rückkehr in eine noch angemeldete App wird frühestens nach fünf Minuten erneut geprüft. Ein neues PDF ersetzt eine bestehende Kalkulation nur nach Bestätigung.

Google-Projekt für diese Client-ID vorbereiten:
- OAuth-Clienttyp Webanwendung.
- Autorisierte JavaScript-Herkunft: `https://jochenweerda.github.io` (ohne Repository-Pfad).
- Gmail API aktivieren.
- OAuth-Zustimmungsbildschirm mit `https://www.googleapis.com/auth/gmail.readonly` konfigurieren. Bei Testbetrieb das verwendete Gmail-Konto als Testnutzer aufnehmen.
- Der Nutzer meldet sich selbst an und bestätigt Googles Lese-Freigabe. Kein Client-Secret wird in der Browser-App verwendet.

`node tests/gmail.cjs` prüft mit PRICE_FIXTURE den Browserimport. OAuth und Gmail-API werden dort ausdrücklich nachgebildet, das PDF und dessen Parser sind echt. Dies ersetzt keinen erfolgreichen Kontozugriff durch Google OAuth.

Quellen: https://developers.google.com/identity/oauth2/web/guides/use-token-model und https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list
