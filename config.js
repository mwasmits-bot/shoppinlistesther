// ⚙️ CONFIGURATIE
// Vul hieronder je eigen Firebase- en EmailJS-gegevens in.
// Volg de stappen in README.md om deze waardes te vinden.
// Zolang firebase.apiKey leeg is, draait de app lokaal op je eigen
// toestel (via localStorage) zodat je alvast kunt testen.

window.APP_CONFIG = {
  firebase: {
    apiKey: "AIzaSyBvODvwtZQqQ55HZDnr3ly45c8dz8oz7lo",
    authDomain: "shopping-list2-98885.firebaseapp.com",
    projectId: "shopping-list2-98885",
    storageBucket: "shopping-list2-98885.firebasestorage.app",
    messagingSenderId: "857918011010",
    appId: "1:857918011010:web:acc57cda60975b05eb269b"
  },
  emailjs: {
    publicKey: "FhrWm7WyjaZMZTI7p",
    serviceId: "service_67thmmw",
    templateId: "template_vgbp1u4",
    // E-mailadres dat een bericht krijgt zodra er een nieuwe lijst is
    toEmail: "mwa.smits@gmail.com"
  },
  push: {
    // VAPID public key (de bijbehorende private key hoort NIET hier, maar
    // alleen als Netlify-omgevingsvariabele VAPID_PRIVATE_KEY — zie README.md).
    vapidPublicKey: "BB4MqHjMW7uSiaL1vXOyAw8LP--FzfMjA9sWOyILD01tm8RJA5-OKcbDb-QNztvP0IIN90-YNNxsqiyhif_3c8E",
    // Endpoint van de Netlify-function die de push daadwerkelijk verstuurt.
    notifyUrl: "/.netlify/functions/send-push"
  }
};
