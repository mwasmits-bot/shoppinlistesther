# Ons Lijstje 🛒

Een simpele app voor jullie tweeën: zij maakt een lijstje (boodschappen, klusjes, dingen om
mee te nemen), jij krijgt een pushmelding en kunt de lijst afvinken terwijl je in de winkel staat.

De app werkt nu al lokaal op je eigen toestel (open gewoon `index.html` in je browser).
Om hem **te delen tussen jullie twee telefoons** moet je een gratis Firebase-account instellen.
Dat kost eenmalig ongeveer 10 minuten.

---

## 1. Firebase instellen (voor het delen van de lijst)

1. Ga naar [console.firebase.google.com](https://console.firebase.google.com) en log in met een Google-account (jullie eigen, of een nieuw account samen).
2. Klik **"Project toevoegen"**, geef het een naam (bijv. `ons-lijstje`) en maak het aan (Google Analytics mag je uitzetten, is niet nodig).
3. Klik in het linkermenu op **Build → Firestore Database** → **"Database maken"**.
   - Kies een locatie in de buurt (bijv. `eur3 (europe-west)`).
   - Kies **"Starten in testmodus"** (dit zet de beveiligingsregels open voor 30 dagen — zie stap 5 om dit daarna vast te zetten).
4. Klik links op het **tandwiel-icoon → Projectinstellingen**. Scroll naar **"Jouw apps"** en klik op het **`</>`-icoon (Web-app)**.
   - Geef een naam (bijv. `ons-lijstje-web`) en klik **Registreren**.
   - Je krijgt een codeblokje met een object `firebaseConfig = { apiKey: "...", authDomain: "...", ... }`.
5. Open [`config.js`](config.js) in dit project en vul die waardes in bij `firebase: { ... }`.
6. **Beveiliging vastzetten** (belangrijk, anders kan iedereen met de link jullie data lezen/schrijven):
   Ga naar **Firestore Database → Regels** en plak dit:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /lists/{listId} {
         allow read, write: if true;
       }
     }
   }
   ```
   Dit houdt de lijst-data open voor iedereen die de (moeilijk te raden) projectlink heeft — voldoende
   voor privégebruik tussen jullie twee, maar zet er geen gevoelige informatie in.

---

## 2. Live zetten op Netlify

Push-meldingen (stap 3 hieronder) hebben een **serverless function** nodig die meedeployt. Dat
werkt alleen betrouwbaar als de site gekoppeld is aan de GitHub-repo (niet met de oude
"sleep een map in het upload-vak"-methode, want dan worden de function-dependencies niet
geïnstalleerd). Gebruik daarom:

1. Ga naar [app.netlify.com](https://app.netlify.com) en log in op je bestaande account.
2. Klik **"Add new site" → "Import an existing project"** en koppel deze GitHub-repo.
3. Laat de build-instellingen leeg (geen build command nodig) — `netlify.toml` regelt de rest.
4. Klaar — je krijgt een URL zoals `https://ons-lijstje.netlify.app`. Elke push naar de hoofdbranch
   deployt automatisch opnieuw. Open de URL op beide telefoons en zet er een snelkoppeling van op
   het beginscherm.

   *Wil je liever geen push-meldingen instellen?* Dan kan de oude manier (map slepen in het
   upload-vak) nog steeds, maar dan blijft stap 3 hieronder niet werken.

---

## 3. Push-meldingen instellen (optioneel)

Hiermee krijg jij een melding op je telefoon zodra Esther een lijstje maakt of aanvult — en zij
een melding zodra jij een lijstje afrondt — ook als de app niet openstaat. Op de iPhone werkt dit
**alleen** als de app is toegevoegd aan het beginscherm (Deel-knop → "Zet op beginscherm") en je
'm vanaf daar opent, sinds iOS 16.4.

VAPID-sleutels zijn al gegenereerd — de **Public Key** staat al in [`config.js`](config.js). De
bijbehorende **Private Key** krijg je los (in de chat, niet in de repo): die vul je hieronder in
bij stap 2.

1. **Firebase service-account aanmaken** (zodat de server-function bij de lijst-database mag):
   - Ga in [console.firebase.google.com](https://console.firebase.google.com) naar je project →
     tandwiel-icoon → **Projectinstellingen → Service accounts**.
   - Klik **"Nieuwe privésleutel genereren"** — dit downloadt een JSON-bestand. **Deel dit nooit
     en zet het niet in de repo.**
2. **Firestore-regels uitbreiden** zodat toestellen zich kunnen aan/afmelden voor meldingen. Voeg
   dit toe aan **Firestore Database → Regels**, naast de `lists`-regel uit stap 1 van sectie 1
   hierboven:
   ```
   match /pushSubscriptions/{subId} {
     allow read, write: if true;
   }
   ```
3. **Omgevingsvariabelen instellen in Netlify**: ga naar je site → **Site configuration →
   Environment variables** en voeg toe:
   - `VAPID_PUBLIC_KEY` — zelfde waarde als `push.vapidPublicKey` in `config.js`
   - `VAPID_PRIVATE_KEY` — de Private Key die je los van Claude hebt gekregen
   - `VAPID_CONTACT_EMAIL` — jullie e-mailadres (bijv. `mwa.smits@gmail.com`)
   - `FIREBASE_SERVICE_ACCOUNT` — de **volledige inhoud** van het JSON-bestand uit stap 1, geplakt
     als tekst
4. Zorg dat de site opnieuw deployt (gebeurt automatisch als de repo aan Netlify gekoppeld is).
5. Open de app **vanaf het beginscherm-icoon** op de telefoon(s) die een melding moeten krijgen,
   en tik op het 🔕-belletje rechtsboven. Zet permissies aan wanneer iOS erom vraagt — het
   belletje wordt dan 🔔.

Zodra dit staat, krijgt elk toestel dat op het belletje heeft getikt een melding bij een nieuw,
aangevuld of afgerond lijstje. Zonder deze stappen blijft de app gewoon werken zoals voorheen —
het belletje blijft dan verborgen.

---

## Hoe de app werkt

- **"Maak lijst"** (voor haar): onderwerp kiezen (Boodschappen + winkel, Klusjes, Tuin/Huis,
  Cadeaus, of Overig), producten toevoegen (met optioneel een link of foto-URL), en versturen.
  Jij krijgt dan een pushmelding (zie stap 3).
- **"Winkelen"** (voor jou): je ziet alle actieve lijstjes, vinkt producten af terwijl je ze pakt,
  en kunt een product als **"⚠️ Niet beschikbaar"** melden met een kort briefje — dat ziet zij live
  terug staan in "Eerder verstuurd". Met de kleine **"Lijst afronden"**-knop sluit je de lijst af
  (en kun je 'm in de "Klaar"-tab weer heropenen als dat per ongeluk was).
- De app onthoudt op elk toestel welke rol je laatst gebruikte. Je kunt altijd wisselen via de
  knoppen rechtsboven.
- Als push-meldingen zijn ingesteld (zie stap 3), staat er een belletje 🔕/🔔 rechtsboven waarmee
  je meldingen per toestel aan- of uitzet.

## Zonder Firebase testen

Laat `config.js` leeg en open `index.html` gewoon in je browser — de app werkt dan lokaal
(via `localStorage`) zodat je de werking kunt uitproberen voordat je de accounts instelt.
Let op: zonder Firebase zie je de lijst dan alleen op hetzelfde toestel/browser, niet gedeeld
tussen jullie telefoons.
