# Rohwaren-Angebotsrechner – Folkerts Landhandel

Browser-App für Preisblattimport, Logistik und Nettoangebote in €/dt.

## Bedienreise
1. Foto/PDF aus Dateien auswählen oder Kamera verwenden. Die Erkennung startet automatisch. Das Original lässt sich separat öffnen.
2. Rohware (auch „Rapsschrott“), Hafen und Lieferperiode wählen. Eindeutige PDF-Positionen aktualisieren den Einkaufspreis. Die genaue Herkunft unterscheidet z. B. Schrot und Pellets.
3. Für einzelne Liefertage oder Kontrakte „tagesgenau kalkulieren“ aktivieren, genaue Herkunft und Von/Bis wählen. Ein Liefertag hat identische Daten. Mindestdatum ist der heutige lokale Kalendertag, Maximum das Ende der letzten datierbaren Preisperiode für Ware/Herkunft.
4. Ein Zeitraum über mehrere Perioden berechnet `Summe(Kalendertage × Einkauf €/t) / gesamte Kalendertage`. Beide Grenztage zählen. UTC-Tageszahlen vermeiden Sommerzeitfehler. Preisüberschneidungen und Lücken blockieren die automatische Kalkulation. Gleichmäßige Abnahme pro Tag ist die Rechenannahme.
5. Fracht, Anlieferung, Teilmenge, Spanne und optional Umschlag/MMX prüfen. Volle 25-t-Ladungen verwenden ab Brake 15 €/t und ab Hamburg 30 €/t, sowohl zum Kunden als auch zum Lager Groothusen. Abweichende Ladungsgrößen benötigen eine separat geprüfte Fracht. Ein manueller Einkauf ersetzt den Tagesmittelwert.
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

Gmail-Abruf begrenzt auf die letzten 45 Tage und maximal 100 passende Mails. Einzelne Anfragen werden nach 20 Sekunden abgebrochen. Metadaten werden in Gruppen von maximal fünf Mails mit sichtbarem Fortschritt gelesen. Google-Quotenfehler erhalten einen Hinweis zum späteren Wiederholen; es erfolgt keine automatische Wiederholungsschleife.

Anlieferarten: Muldenkipper gekippt ohne Zuschlag; Schubboden +4 €/t; Muldenkipper mit Gebläse frei Silo +5 €/t. Das Gebläse gehört zum Muldenkipper. Die frühere Kombination Schubboden/Gebläse (+9 €/t) wurde entfernt. Der Angebotstext übernimmt die genaue gewählte Anlieferart.


## Regelmäßige Abnahmen

Im tagesgenauen Kontraktmodus stehen Tagesmittel (bisheriger Modus), Einzellieferung am Startdatum und regelmäßige Abrufe zur Auswahl. Regelmäßige Abrufe beginnen am Von-Datum und wiederholen sich nach ganzen Kalendertagen (Standard 28), solange der Termin einschließlich innerhalb des Bis-Datums liegt. Das Enddatum wird nicht zusätzlich als Lieferung eingefügt.

Die Menge kann je Lieferung oder als Gesamtmenge angegeben werden. Bei Gesamtmenge gilt gleiche Menge je Termin = Gesamtmenge / Anzahl Termine. Der Einkauf ist dann Summe(Liefermenge × Preis am tatsächlichen Termin) / Gesamtmenge. Liefertermine, Einzelmengen, Gesamtmenge und letzter Abruf werden angezeigt und in den Angebotstext übernommen. Bei einem fehlenden/mehrdeutigen Preis an einem Abruftermin bleibt die automatische Kalkulation gesperrt.

Volle 25 t je Abruf: Fracht Brake 15 €/t oder Hamburg 30 €/t, direkt zum Kunden oder zum Lager Folkerts Landhandel, Groothusen. Standardspanne 4 €/t (individuell 3–5 möglich); Teilmengen erhalten 10 €/t Standardspanne. Manuell gewählte Spannen bleiben individuell. Schubboden +4 €/t; Muldenkipper mit Gebläse frei Silo +5 €/t. Lagerverarbeitung ergänzt 10 €/t Umschlag und ca. 18 €/t MMX. Aktivieren der Lagerverarbeitung wählt die Lagerroute; Direktlieferung deaktiviert sie.

Prüfbeispiel: Rapsschrot Hamburg, 03.11.2026–31.07.2027, alle 28 Tage je 25 t: zehn Abrufe, 250 t gesamt, letzter Abruf 13.07.2027, Einkauf 296,50 €/t. Grundangebot mit Fracht 30 und Spanne 4: 33,05 €/dt netto. Gleiche 250 t als Gesamtmenge ergeben ebenfalls zehn Lieferungen zu 25 t. Ein Tagesmittel über denselben Zeitraum bleibt ein anderer, ausdrücklich benannter Rechenmodus.


## Rohwarenmenü

Erkannte Rohware/Herkunft wird als vollständige, umbrochene Schaltfläche im Menü angeboten. Standardmäßig sind nur Positionen mit Brake oder Hamburg in der Herkunft zugelassen. „Erweiterte Auswahl“ öffnet alle erkannten Positionen und die Hafenoption Andere. Die Auswahl setzt Rohware und genaue Herkunft gemeinsam; die Preisfilter verwenden exakte Produktzuordnung. Beim Zurückschalten wird eine nicht mehr zugelassene Auswahl einschließlich Einkauf gelöscht. NON GMO und Proteingehalte werden ausschließlich aus dem erkannten Originalnamen übernommen und vollständig angezeigt. Ein separater manueller Fallback bleibt für nicht erkannte Zeilen verfügbar.
