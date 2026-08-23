# Ons Lijstje 🛒

Een simpele app voor jullie tweeën: zij maakt een lijstje (boodschappen, klusjes, dingen om
mee te nemen), jij krijgt een mail en kunt de lijst afvinken terwijl je in de winkel staat.

De app werkt nu al lokaal op je eigen toestel (open gewoon `index.html` in je browser).
Om hem **te delen tussen jullie twee telefoons** en **automatisch een mail te sturen**,
moet je twee gratis accounts instellen. Dat kost eenmalig ongeveer 15 minuten.

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

## 2. EmailJS instellen (voor de automatische mail)

1. Ga naar [emailjs.com](https://www.emailjs.com) en maak een gratis account (200 mails/maand gratis).
   Je kunt dit account op jullie **gezamenlijke/huishoudelijke mailadres** aanmaken, of op een los
   account — dat maakt voor de werking niet uit.
2. Ga naar **Email Services → Add New Service**, kies bijv. **Gmail**, en verbind daar **jullie
   gezamenlijke/huishoudelijke mailadres** — dat is het adres waar de lijst-mails straks vandaan
   komen (de afzender). Je logt hier in op dat account om de koppeling te autoriseren. Onthoud de
   **Service ID**.
3. Ga naar **Email Templates → Create New Template**. Gebruik deze variabelen in je template
   (kopieer dit als voorbeeld):

   **Subject:**
   ```
   Nieuw lijstje: {{subject}}
   ```

   **Content:**
   ```
   Er staat een nieuw lijstje voor je klaar: {{subject}} {{store}}

   {{items_text}}

   ({{item_count}} dingen)

   Open de lijst: {{link}}
   ```
   En zet bij **"To email"** in de template-instellingen jouw eigen mailadres
   (mwa.smits@gmail.com), zodat elke mail daar naartoe gaat.

   Onthoud de **Template ID**.
4. Ga naar **Account → General** en kopieer je **Public Key**.
5. Vul in [`config.js`](config.js) bij `emailjs: { ... }` de `publicKey`, `serviceId`, `templateId` in.
   `toEmail` staat al op mwa.smits@gmail.com — pas aan indien nodig.

---

## 3. Live zetten op Netlify

Push-meldingen (stap 4 hieronder) hebben een **serverless function** nodig die meedeployt. Dat
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
   upload-vak) nog steeds, maar dan blijft stap 4 hieronder niet werken.

---

## 4. Push-meldingen instellen (optioneel)

Hiermee krijg jij een melding op je telefoon zodra Esther een lijstje maakt of aanvult — ook als
de app niet openstaat. Op de iPhone werkt dit **alleen** als de app is toegevoegd aan het
beginscherm (Deel-knop → "Zet op beginscherm") en je 'm vanaf daar opent, sinds iOS 16.4.

1. **VAPID-sleutels genereren** (eenmalig, op je eigen computer met Node.js geïnstalleerd):
   ```
   npx web-push generate-vapid-keys
   ```
   Dit geeft een `Public Key` en `Private Key`.
2. Vul in [`config.js`](config.js) bij `push.vapidPublicKey` de **Public Key** in.
3. **Firebase service-account aanmaken** (zodat de server-function bij de lijst-database mag):
   - Ga in [console.firebase.google.com](https://console.firebase.google.com) naar je project →
     tandwiel-icoon → **Projectinstellingen → Service accounts**.
   - Klik **"Nieuwe privésleutel genereren"** — dit downloadt een JSON-bestand. **Deel dit nooit
     en zet het niet in de repo.**
4. **Firestore-regels uitbreiden** zodat toestellen zich kunnen aan/afmelden voor meldingen. Voeg
   dit toe aan **Firestore Database → Regels**, naast de `lists`-regel uit stap 1:
   ```
   match /pushSubscriptions/{subId} {
     allow read, write: if true;
   }
   ```
5. **Omgevingsvariabelen instellen in Netlify**: ga naar je site → **Site configuration →
   Environment variables** en voeg toe:
   - `VAPID_PUBLIC_KEY` — de Public Key van stap 1
   - `VAPID_PRIVATE_KEY` — de Private Key van stap 1
   - `VAPID_CONTACT_EMAIL` — jullie e-mailadres (bijv. `mwa.smits@gmail.com`)
   - `FIREBASE_SERVICE_ACCOUNT` — de **volledige inhoud** van het JSON-bestand uit stap 3, geplakt
     als tekst
6. Push (of laat opnieuw deployen) zodat `config.js` en de Netlify-instellingen actief worden.
7. Open de app **vanaf het beginscherm-icoon** op de telefoon(s) die een melding moeten krijgen,
   en tik op het 🔕-belletje rechtsboven. Zet permissies aan wanneer iOS erom vraagt — het
   belletje wordt dan 🔔.

Zodra dit staat, krijgt elk toestel dat op het belletje heeft getikt een melding bij een nieuw of
aangevuld lijstje. Zonder deze stappen blijft de app gewoon werken zoals voorheen — het belletje
blijft dan verborgen.

---

## Hoe de app werkt

- **"Maak lijst"** (voor haar): onderwerp kiezen (Boodschappen + winkel, Klusjes, of Overig),
  producten toevoegen (met optioneel een link of foto-URL), en versturen. Jij krijgt dan een mail.
- **"Winkelen"** (voor jou): je ziet alle actieve lijstjes, vinkt producten af terwijl je ze pakt,
  en kunt een product als **"⚠️ Niet beschikbaar"** melden met een kort briefje — dat ziet zij live
  terug staan in "Eerder verstuurd". Met **"✅ Lijst afronden"** sluit je de lijst af.
- De app onthoudt op elk toestel welke rol je laatst gebruikte. Je kunt altijd wisselen via de
  knoppen rechtsboven.
- De mail-link opent de app automatisch in het "Winkelen"-scherm, gericht op dat specifieke lijstje.
- Als push-meldingen zijn ingesteld (zie stap 4), staat er een belletje 🔕/🔔 rechtsboven waarmee
  je meldingen per toestel aan- of uitzet.

## Zonder Firebase/EmailJS testen

Laat `config.js` leeg en open `index.html` gewoon in je browser — de app werkt dan lokaal
(via `localStorage`) zodat je de werking kunt uitproberen voordat je de accounts instelt.
Let op: zonder Firebase zie je de lijst dan alleen op hetzelfde toestel/browser, niet gedeeld
tussen jullie telefoons.
