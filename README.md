# Rohwaren-Angebotsrechner – Folkerts Landhandel

Mobile Offline-HTML-App zur Kalkulation von Rohwaren-Angeboten in €/dt. Start durch Öffnen der `index.html` im Browser oder Hosting auf einer HTTPS-Seite.

## Funktionen
- Hochladen und Anzeigen eines Preisblatt-Fotos; **keine Texterkennung** und keine Datenübertragung
- Rohware, Lieferperiode und Einkaufspreis (€/t) manuell erfassen
- Fracht Brake → Groothusen 15 €/t, Hamburg → Groothusen 30 €/t (volle LKW angenommen)
- Gekippt: 3–5 €/t Spanne (4 voreingestellt), Teilmengen 10 €/t Spanne
- Schubboden 4 €/t, frei Silo geblasen 5 €/t, kombinierbar
- Vermahlung/Mischung: Umschlag 10 €/t + MMX 18 €/t
- EUDR-Szenario +25 €/t optional, **nicht automatisch aktiviert**
- Netto-Angebotspreis €/dt und WhatsApp-Kopiertext

## Wichtige Grenzen
Die Standardfracht bezieht sich nur auf die Route zum Lager Groothusen, nicht auf eine Direktlieferung zum Landwirt. Bei Teilmengen und anderen Zielorten bedarf es einer separaten Speditionskalkulation. Fotoauswertung und Gmail-Abruf sind noch nicht implementiert. Liefer-/Preisangaben stets prüfen.
