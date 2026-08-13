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

1. Ga naar [app.netlify.com](https://app.netlify.com) en log in op je bestaande account.
2. Klik **"Add new site" → "Deploy manually"**.
3. Sleep de hele map `boodschappenlijst-app` (met `index.html`, `style.css`, `app.js`, `config.js`)
   in het upload-vak.
4. Klaar — je krijgt een URL zoals `https://ons-lijstje.netlify.app`. Open die op beide telefoons
   en zet er een snelkoppeling van op het beginscherm.

   *Tip:* als je later `config.js` aanpast, upload je gewoon opnieuw dezelfde map (of koppel de map
   later aan een GitHub-repo voor automatische deploys via "Add new site" → "Import from Git").

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

## Zonder Firebase/EmailJS testen

Laat `config.js` leeg en open `index.html` gewoon in je browser — de app werkt dan lokaal
(via `localStorage`) zodat je de werking kunt uitproberen voordat je de accounts instelt.
Let op: zonder Firebase zie je de lijst dan alleen op hetzelfde toestel/browser, niet gedeeld
tussen jullie telefoons.
