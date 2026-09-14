const webpush = require("web-push");
const admin = require("firebase-admin");

function getDb() {
  if (!admin.apps.length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin.firestore();
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.FIREBASE_SERVICE_ACCOUNT) {
    return { statusCode: 200, body: JSON.stringify({ sent: 0, reason: "not-configured" }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: "Invalid JSON" };
  }

  const { title, body, url, groupCode } = payload;
  if (!title) {
    return { statusCode: 400, body: "Missing title" };
  }
  if (!groupCode) {
    return { statusCode: 400, body: "Missing groupCode" };
  }

  try {
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_CONTACT_EMAIL || "no-reply@example.com"}`,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const db = getDb();
    // Elke groep heeft zijn eigen abonnees, zodat groepen elkaars meldingen
    // nooit kunnen zien of ontvangen.
    const snap = await db.collection("groups").doc(groupCode).collection("pushSubscriptions").get();
    const notifPayload = JSON.stringify({ title, body: body || "", url: url || "./" });

    let sent = 0;
    const errors = [];
    await Promise.all(snap.docs.map(async (docSnap) => {
      const sub = docSnap.data();
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          notifPayload
        );
        sent += 1;
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await docSnap.ref.delete();
        } else {
          console.error("Push send error:", err);
          errors.push(`${err.statusCode || ""} ${err.message || err}`.trim());
        }
      }
    }));

    return { statusCode: 200, body: JSON.stringify({ sent, total: snap.docs.length, errors }) };
  } catch (err) {
    console.error("send-push fatal error:", err);
    return { statusCode: 500, body: JSON.stringify({ sent: 0, reason: "error", message: err.message || String(err) }) };
  }
};
