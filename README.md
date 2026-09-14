# Ons Lijstje 🛒

Een lichte lijstjes-app voor gezinnen of vriendengroepen: iemand maakt een lijstje (boodschappen,
klusjes, cadeaus, dingen om mee te nemen), anderen krijgen een pushmelding en kunnen 'm afvinken
terwijl ze bijvoorbeeld in de winkel staan. Producten/taken kun je toewijzen aan een specifiek
groepslid.

De app werkt per **groep**: iedereen met dezelfde groepscode deelt dezelfde lijstjes en leden.
Geen accounts of wachtwoorden nodig — de code werkt als gedeeld "wachtwoord". Zo kunnen meerdere
gezinnen/vriendengroepen dezelfde installatie gebruiken zonder elkaars lijstjes te zien.

De app werkt nu al lokaal op je eigen toestel (open gewoon `index.html` in je browser).
Om hem **tussen meerdere toestellen te delen** moet je een gratis Firebase-account instellen.
Dat kost eenmalig ongeveer 10 minuten.

---

## 1. Firebase instellen (voor het delen van lijstjes)

1. Ga naar [console.firebase.google.com](https://console.firebase.google.com) en log in met een Google-account.
2. Klik **"Project toevoegen"**, geef het een naam (bijv. `ons-lijstje`) en maak het aan (Google Analytics mag je uitzetten, is niet nodig).
3. Klik in het linkermenu op **Build → Firestore Database** → **"Database maken"**.
   - Kies een locatie in de buurt (bijv. `eur3 (europe-west)`).
   - Kies **"Starten in testmodus"** (dit zet de beveiligingsregels open voor 30 dagen — zie stap 6 om dit daarna vast te zetten).
4. Klik links op het **tandwiel-icoon → Projectinstellingen**. Scroll naar **"Jouw apps"** en klik op het **`</>`-icoon (Web-app)**.
   - Geef een naam (bijv. `ons-lijstje-web`) en klik **Registreren**.
   - Je krijgt een codeblokje met een object `firebaseConfig = { apiKey: "...", authDomain: "...", ... }`.
5. Open [`config.js`](config.js) in dit project en vul die waardes in bij `firebase: { ... }`.
6. **Beveiliging vastzetten** (belangrijk, anders kan iedereen die de collectiestructuur raadt data lezen/schrijven):
   Ga naar **Firestore Database → Regels** en plak dit:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /groups/{groupCode}/{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
   Dit houdt alles onder een groepscode open voor wie die code heeft — de groepscode ís hier de
   toegangssleutel (zoals een wachtwoord). Voldoende voor privégebruik binnen een gezin/vriendengroep,
   maar zet er geen gevoelige informatie in en deel codes niet publiekelijk.

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
   deployt automatisch opnieuw. Deel die URL met je groep; ieder toestel maakt bij eerste bezoek
   zelf een groep aan of vult een bestaande groepscode in (zie "Hoe de app werkt" hieronder).

   *Wil je liever geen push-meldingen instellen?* Dan kan de oude manier (map slepen in het
   upload-vak) nog steeds, maar dan blijft stap 3 hieronder niet werken.

---

## 3. Push-meldingen instellen (optioneel)

Hiermee krijgt iedereen in de groep een melding zodra iemand een lijstje maakt, aanvult of
afrondt — ook als de app niet openstaat. Op de iPhone werkt dit **alleen** als de app is
toegevoegd aan het beginscherm (Deel-knop → "Zet op beginscherm") en je 'm vanaf daar opent,
sinds iOS 16.4.

VAPID-sleutels zijn al gegenereerd — de **Public Key** staat al in [`config.js`](config.js). De
bijbehorende **Private Key** krijg je los (in de chat, niet in de repo): die vul je hieronder in
bij stap 2.

1. **Firebase service-account aanmaken** (zodat de server-function bij de lijst-database mag):
   - Ga in [console.firebase.google.com](https://console.firebase.google.com) naar je project →
     tandwiel-icoon → **Projectinstellingen → Service accounts**.
   - Klik **"Nieuwe privésleutel genereren"** — dit downloadt een JSON-bestand. **Deel dit nooit
     en zet het niet in de repo.**
2. De Firestore-regel uit stap 6 van sectie 1 hierboven dekt ook de pushabonnementen al mee
   (die staan onder dezelfde `groups/{groupCode}`-structuur) — hier hoef je dus niets extra's
   voor te doen.
3. **Omgevingsvariabelen instellen in Netlify**: ga naar je site → **Site configuration →
   Environment variables** en voeg toe:
   - `VAPID_PUBLIC_KEY` — zelfde waarde als `push.vapidPublicKey` in `config.js`
   - `VAPID_PRIVATE_KEY` — de Private Key die je los van Claude hebt gekregen
   - `VAPID_CONTACT_EMAIL` — een contactmailadres (bijv. `mwa.smits@gmail.com`)
   - `FIREBASE_SERVICE_ACCOUNT` — de **volledige inhoud** van het JSON-bestand uit stap 1, geplakt
     als tekst
4. Zorg dat de site opnieuw deployt (gebeurt automatisch als de repo aan Netlify gekoppeld is).
5. Open de app **vanaf het beginscherm-icoon** op elk toestel dat een melding moet krijgen, en
   tik op het 🔕-belletje rechtsboven. Zet permissies aan wanneer iOS erom vraagt — het belletje
   wordt dan 🔔.

Zodra dit staat, krijgt elk toestel in de groep dat op het belletje heeft getikt een melding bij
een nieuw, aangevuld of afgerond lijstje — **alleen van de eigen groep**, nooit van een andere
groep die dezelfde app-installatie gebruikt.

---

## Hoe de app werkt

- **Eerste keer openen**: je kiest of je een **nieuwe groep start** (je krijgt een groepscode
  zoals `WOLF-4821` om te delen, en stelt de leden in met naam + emoji) of **meedoet met een
  bestaande groep** (groepscode invullen die je van iemand kreeg). Die code wordt op het toestel
  onthouden; je hoeft 'm maar één keer in te vullen.
- **"Maak lijst"**: onderwerp kiezen (Boodschappen + winkel, Klusjes, Tuin/Huis, Cadeaus, of
  Overig), producten toevoegen (met optioneel een link of foto-URL), eventueel toewijzen aan een
  groepslid, en versturen. De rest van de groep krijgt dan een pushmelding (zie stap 3 hierboven).
- **"Winkelen"**: je ziet alle actieve lijstjes, vinkt producten af terwijl je ze pakt, wijst
  toe/herwijs toe aan een groepslid, en kunt een product als **"⚠️ Niet beschikbaar"** melden met
  een kort briefje. Met de kleine **"Lijst afronden"**-knop sluit je de lijst af (en kun je 'm in
  de "Klaar"-tab weer heropenen als dat per ongeluk was).
- **👥-knop rechtsboven**: bekijk/kopieer de groepscode, beheer de leden (toevoegen, hernoemen,
  emoji wijzigen, verwijderen), of verlaat de groep (je lijstjes blijven bewaard — met de code kun
  je altijd terug).
- De app onthoudt op elk toestel welke rol (Maak lijst/Winkelen) je laatst gebruikte.
- **Taal**: rechtsonder staat een NL/DE/EN-schakelaar. De keuze wordt per toestel onthouden (elk
  toestel kan een andere taal hebben, ook binnen dezelfde groep) en werkt de hele app door — ideaal
  als een vriendengroep in een andere taal wil meedoen. Nieuwe vertalingen toevoegen kan in
  [`i18n.js`](i18n.js).

## Zonder Firebase testen

Laat `config.js` leeg en open `index.html` gewoon in je browser — de app werkt dan lokaal
(via `localStorage`) zodat je de werking kunt uitproberen voordat je de accounts instelt.
Let op: zonder Firebase zie je de lijst dan alleen op hetzelfde toestel/browser, niet gedeeld
tussen andere toestellen — ook niet tussen toestellen met dezelfde groepscode.

## Bestaande data van vóór de groepen-update

Lijstjes die zijn aangemaakt vóór deze update stonden nog niet onder een groepscode en zijn
daardoor niet meer zichtbaar in de app (ze staan nog wel in Firestore, onder de oude
`lists`/`pushSubscriptions`-collecties — niets is verwijderd). Bij het eerstvolgende bezoek
doorloop je gewoon de "nieuwe groep starten"-flow opnieuw. Laat het weten als je die oude
lijstjes alsnog wilt overzetten naar een groep.
