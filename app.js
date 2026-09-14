import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot,
  query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const CFG = window.APP_CONFIG;
const STORE_BRANDS = ["Aldi", "Albert Heijn", "Plus", "Jumbo"];
const STORE_ANY = "__any__";
const STORE_OTHER = "__other__";
const EMOJI_CHOICES = ["👸", "🤴", "🧑‍🚀", "👩‍🍳", "👨‍🔧", "🧑‍💻", "🐱", "🐶", "🦄", "🌟", "❤️", "😎", "🥳", "🍕", "⚽️", "🎨"];

const usingFirestore = Boolean(CFG.firebase.apiKey);
const fbApp = usingFirestore ? initializeApp(CFG.firebase) : null;
const fbDb = fbApp ? getFirestore(fbApp) : null;

/* showToast staat hier vroeg in het bestand (niet pas onderaan) omdat de
   groeps-onboarding hieronder 'm al kan aanroepen terwijl de rest van het
   script nog "on hold" staat achter de top-level await. */
let toastTimer;
function showToast(msg, duration = 3000) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), duration);
}

/* ---------------------------------------------------------
   TAAL — vertalingen staan in i18n.js (window.I18N). De taal wordt
   per toestel onthouden; wisselen herlaadt de pagina zodat alle
   tekst (ook al gerenderde lijsten/geschiedenis) gegarandeerd
   consistent is, in plaats van overal losse re-renders te moeten
   coördineren.
--------------------------------------------------------- */

const LANG_KEY = "boodschappenlijst_lang";
const SUPPORTED_LANGS = ["nl", "de", "en"];

function detectLang() {
  const saved = localStorage.getItem(LANG_KEY);
  if (SUPPORTED_LANGS.includes(saved)) return saved;
  const nav = (navigator.language || "nl").slice(0, 2).toLowerCase();
  return SUPPORTED_LANGS.includes(nav) ? nav : "nl";
}

const LANG = detectLang();
const STRINGS = window.I18N[LANG] || window.I18N.nl;
const DATE_LOCALES = { nl: "nl-NL", de: "de-DE", en: "en-GB" };

function t(key, vars) {
  let s = STRINGS[key] ?? window.I18N.nl[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v);
  }
  return s;
}

document.getElementById("lang-switch").querySelectorAll("button").forEach((b) => {
  b.classList.toggle("active", b.dataset.lang === LANG);
  b.addEventListener("click", () => {
    if (b.dataset.lang === LANG) return;
    localStorage.setItem(LANG_KEY, b.dataset.lang);
    location.reload();
  });
});

function applyStaticTranslations() {
  document.title = t("appTitle");
  document.documentElement.lang = LANG;

  const setText = (id, key) => { const el = document.getElementById(id); if (el) el.textContent = t(key); };
  const setPlaceholder = (id, key) => { const el = document.getElementById(id); if (el) el.placeholder = t(key); };

  setText("txt-app-title", "appTitle");
  setText("txt-app-title-2", "appTitle");
  setText("txt-onboarding-welcome", "onboardingWelcome");
  setText("txt-onboarding-intro", "onboardingIntro");
  setText("txt-group-code-label", "groupCodeLabel");
  setPlaceholder("join-code-input", "groupCodePlaceholder");
  setText("join-group-btn", "joinGroupBtn");
  setText("txt-or-divider", "orDivider");
  setText("start-new-group-btn", "startNewGroupBtn");
  setText("txt-group-created-title", "groupCreatedTitle");
  setText("txt-group-created-share", "groupCreatedShare");
  setText("copy-code-btn", "copyCodeBtn");
  setText("txt-who-uses-app", "whoUsesApp");
  setText("txt-add-at-least-one", "addAtLeastOne");
  setText("add-member-btn", "addMemberBtn");
  setText("finish-setup-btn", "startAppBtn");

  setText("txt-group-screen-title", "groupScreenTitle");
  document.getElementById("close-groupsettings-btn").title = t("backTitle");
  setText("txt-your-group-code", "yourGroupCode");
  setText("txt-share-code-same-lists", "shareCodeSameLists");
  setText("copy-current-code-btn", "copyCodeBtn");
  setText("txt-members-title", "membersTitle");
  document.getElementById("manage-add-member-btn").textContent = t("addMemberBtn");
  setText("txt-other-group-title", "otherGroupTitle");
  setText("txt-leave-group-confirm-text", "leaveGroupConfirmText");
  setText("leave-group-btn", "leaveGroupBtn");
  document.getElementById("group-info-btn").title = t("groupInfoTitle");
  document.getElementById("push-toggle-btn").title = t("notificationsOffTitle");

  document.querySelector('.role-switch button[data-role="maker"]').textContent = t("roleMaker");
  document.querySelector('.role-switch button[data-role="shopper"]').textContent = t("roleShopper");

  document.getElementById("config-banner").textContent = t("configBanner");

  setText("txt-new-list-title", "newListTitle");
  setText("txt-subject-label", "subjectLabel");
  document.querySelector('#subject-buttons [data-value="Boodschappen"]').textContent = t("subjectGroceries");
  document.querySelector('#subject-buttons [data-value="Klusjes / Meenemen"]').textContent = t("subjectChores");
  document.querySelector('#subject-buttons [data-value="Tuin / Huis"]').textContent = t("subjectGarden");
  document.querySelector('#subject-buttons [data-value="Cadeaus"]').textContent = t("subjectGifts");
  document.querySelector('#subject-buttons [data-value="Overig"]').textContent = t("subjectOther");
  setText("txt-description-label", "descriptionLabel");
  setPlaceholder("custom-subject-input", "descriptionPlaceholder");
  setText("txt-store-label", "storeLabel");
  setText("txt-which-store-label", "whichStoreLabel");
  setPlaceholder("store-other-input", "storeNamePlaceholder");
  setText("txt-products-label", "productsLabel");
  document.getElementById("add-item-btn").textContent = t("addBtn");
  document.getElementById("item-extra-toggle").textContent = t("addLinkToggle");
  setPlaceholder("item-link-input", "linkPlaceholder");
  setPlaceholder("item-image-input", "imagePlaceholder");
  document.getElementById("draft-empty").textContent = t("noProductsYet");
  document.getElementById("send-list-btn").textContent = t("sendListBtn");
  document.getElementById("clear-draft-btn").textContent = t("clearDraftBtn");

  setText("txt-history-title", "historyTitle");
  document.querySelector('.history-tab-btn[data-tab="open"]').textContent = t("tabActive");
  document.querySelector('.history-tab-btn[data-tab="finished"]').textContent = t("tabDone");
  setText("txt-filter-by-assignee", "filterByAssignee");
  document.querySelector('#assignee-filter [data-assignee="all"]').textContent = t("filterAll");
  document.querySelector('#assignee-filter [data-assignee="none"]').textContent = t("filterUnassigned");
  document.getElementById("clear-finished-btn").textContent = t("clearFinishedBtn");
  document.getElementById("history-empty").textContent = t("noListsYet");

  document.getElementById("shopper-empty").textContent = t("noActiveListsNow");
}
applyStaticTranslations();

/* ---------------------------------------------------------
   GROEP — de app is gescheiden per groep (gezin/vriendengroep).
   Een groepscode werkt als gedeeld "wachtwoord": geen accounts,
   iedereen met de code deelt dezelfde lijstjes en leden.
--------------------------------------------------------- */

const GROUP_KEY = "boodschappenlijst_group";

function normalizeCode(raw) {
  return (raw || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function formatCode(code) {
  return code && code.length === 8 ? code.slice(0, 4) + "-" + code.slice(4) : code;
}

function generateGroupCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // geen 0/O/1/I, kan verward worden
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

async function readGroupMeta(code) {
  if (usingFirestore) {
    const snap = await getDoc(doc(fbDb, "groups", code));
    return snap.exists() ? snap.data() : null;
  }
  try { return JSON.parse(localStorage.getItem(`boodschappenlijst_groupmeta_${code}`)); } catch { return null; }
}

async function writeGroupMeta(code, data) {
  if (usingFirestore) {
    await setDoc(doc(fbDb, "groups", code), data, { merge: true });
  } else {
    const current = (() => { try { return JSON.parse(localStorage.getItem(`boodschappenlijst_groupmeta_${code}`)); } catch { return null; } })() || {};
    localStorage.setItem(`boodschappenlijst_groupmeta_${code}`, JSON.stringify({ ...current, ...data }));
  }
}

function subscribeGroupMeta(code, cb) {
  if (usingFirestore) {
    return onSnapshot(doc(fbDb, "groups", code), (snap) => cb(snap.exists() ? snap.data() : null));
  }
  const key = `boodschappenlijst_groupmeta_${code}`;
  const run = () => {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(key)); } catch { /* corrupt, ignore */ }
    cb(data);
  };
  run();
  const onStorage = (e) => { if (e.key === key) run(); };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

function createMemberRow(member, { onRemove, onChange }) {
  const wrap = document.createElement("div");

  const row = document.createElement("div");
  row.className = "member-row";

  const emojiBtn = document.createElement("button");
  emojiBtn.type = "button";
  emojiBtn.className = "member-emoji-btn";
  emojiBtn.textContent = member.emoji;

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.placeholder = t("namePlaceholder");
  nameInput.value = member.name;
  nameInput.addEventListener("input", () => {
    member.name = nameInput.value;
    if (onChange) onChange();
  });

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "remove-x";
  removeBtn.textContent = "✕";
  removeBtn.addEventListener("click", onRemove);

  const palette = document.createElement("div");
  palette.className = "emoji-palette";
  palette.hidden = true;
  EMOJI_CHOICES.forEach((emoji) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = emoji;
    b.classList.toggle("active", emoji === member.emoji);
    b.addEventListener("click", () => {
      member.emoji = emoji;
      emojiBtn.textContent = emoji;
      palette.querySelectorAll("button").forEach((x) => x.classList.toggle("active", x.textContent === emoji));
      palette.hidden = true;
      if (onChange) onChange();
    });
    palette.appendChild(b);
  });
  emojiBtn.addEventListener("click", () => { palette.hidden = !palette.hidden; });

  row.appendChild(emojiBtn);
  row.appendChild(nameInput);
  row.appendChild(removeBtn);
  wrap.appendChild(row);
  wrap.appendChild(palette);
  return wrap;
}

function runOnboarding() {
  return new Promise((resolve) => {
    document.getElementById("screen-onboarding").hidden = false;

    const choiceCard = document.getElementById("onboarding-choice");
    const setupCard = document.getElementById("onboarding-setup");
    const joinInput = document.getElementById("join-code-input");
    const joinBtn = document.getElementById("join-group-btn");
    const startBtn = document.getElementById("start-new-group-btn");
    const codeDisplay = document.getElementById("new-group-code");
    const copyBtn = document.getElementById("copy-code-btn");
    const finishBtn = document.getElementById("finish-setup-btn");
    const addMemberBtn = document.getElementById("add-member-btn");
    const memberList = document.getElementById("member-setup-list");

    let pendingCode = null;
    let setupMembers = [];

    function refreshFinishBtn() {
      finishBtn.disabled = setupMembers.length === 0 || setupMembers.some((m) => !m.name.trim());
    }

    function renderSetupMembers() {
      memberList.innerHTML = "";
      setupMembers.forEach((m, idx) => {
        memberList.appendChild(createMemberRow(m, {
          onRemove: () => { setupMembers.splice(idx, 1); renderSetupMembers(); },
          onChange: refreshFinishBtn
        }));
      });
      refreshFinishBtn();
    }

    function finishOnboarding(code) {
      document.getElementById("screen-onboarding").hidden = true;
      resolve(code);
    }

    joinBtn.addEventListener("click", async () => {
      const code = normalizeCode(joinInput.value);
      if (code.length < 4) { showToast(t("invalidGroupCode")); return; }
      joinBtn.disabled = true;
      try {
        const meta = await readGroupMeta(code);
        if (!meta) { showToast(t("groupCodeNotFound")); return; }
        localStorage.setItem(GROUP_KEY, code);
        finishOnboarding(code);
      } catch (err) {
        console.error(err);
        showToast(t("genericError"));
      } finally {
        joinBtn.disabled = false;
      }
    });

    startBtn.addEventListener("click", () => {
      pendingCode = generateGroupCode();
      codeDisplay.textContent = formatCode(pendingCode);
      setupMembers = [
        { id: crypto.randomUUID(), name: "", emoji: EMOJI_CHOICES[0] },
        { id: crypto.randomUUID(), name: "", emoji: EMOJI_CHOICES[1] }
      ];
      renderSetupMembers();
      choiceCard.hidden = true;
      setupCard.hidden = false;
    });

    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(formatCode(pendingCode));
        showToast(t("codeCopied"));
      } catch {
        showToast(t("copyFailedNote"));
      }
    });

    addMemberBtn.addEventListener("click", () => {
      setupMembers.push({ id: crypto.randomUUID(), name: "", emoji: EMOJI_CHOICES[setupMembers.length % EMOJI_CHOICES.length] });
      renderSetupMembers();
    });

    finishBtn.addEventListener("click", async () => {
      finishBtn.disabled = true;
      try {
        await writeGroupMeta(pendingCode, {
          members: setupMembers.map((m) => ({ id: m.id, name: m.name.trim(), emoji: m.emoji })),
          createdAt: new Date().toISOString()
        });
        localStorage.setItem(GROUP_KEY, pendingCode);
        finishOnboarding(pendingCode);
      } catch (err) {
        console.error(err);
        showToast(t("createGroupFailed"));
        finishBtn.disabled = false;
      }
    });
  });
}

let groupCode = localStorage.getItem(GROUP_KEY);
if (!groupCode) {
  groupCode = await runOnboarding();
}
document.getElementById("app-root").hidden = false;

let groupMembers = [];

function createAssigneeToggle(currentValue, onSet) {
  const group = document.createElement("div");
  group.className = "button-group compact emoji-only";
  groupMembers.forEach((m) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = m.emoji;
    btn.title = m.name;
    btn.setAttribute("aria-label", m.name);
    btn.classList.toggle("active", currentValue === m.id);
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      onSet(currentValue === m.id ? null : m.id);
    });
    group.appendChild(btn);
  });
  return group;
}

function createBulkAssignRow(items, onApplyAll) {
  const wrap = document.createElement("div");
  wrap.className = "assignee-control";

  const label = document.createElement("span");
  label.className = "meta";
  label.textContent = t("assignAllTo");
  wrap.appendChild(label);

  wrap.appendChild(createAssigneeToggle(null, onApplyAll));

  return wrap;
}

/* ---------------------------------------------------------
   BACKEND — Firestore wanneer geconfigureerd, anders een
   localStorage-fallback zodat de app meteen te testen is.
   Alles hangt onder groups/{groupCode}, zodat groepen elkaars
   lijstjes en meldingen nooit zien.
--------------------------------------------------------- */

class FirestoreBackend {
  constructor(db, groupCode) {
    this.db = db;
    this.col = collection(db, "groups", groupCode, "lists");
    this.subsCol = collection(db, "groups", groupCode, "pushSubscriptions");
  }

  async createList(data) {
    const ref = await addDoc(this.col, {
      ...data,
      status: "open",
      createdAt: serverTimestamp(),
      finishedAt: null
    });
    return ref.id;
  }

  subscribeOpenLists(cb) {
    const q = query(this.col, where("status", "==", "open"));
    return onSnapshot(q, (snap) => {
      const lists = snap.docs.map((d) => normalize(d.id, d.data()));
      lists.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
      cb(lists);
    });
  }

  subscribeAllLists(cb) {
    return onSnapshot(this.col, (snap) => {
      const lists = snap.docs.map((d) => normalize(d.id, d.data()));
      lists.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
      cb(lists);
    });
  }

  async updateItems(id, items) {
    await updateDoc(doc(this.col, id), { items });
  }

  async finishList(id) {
    await updateDoc(doc(this.col, id), { status: "finished", finishedAt: serverTimestamp() });
  }

  async reopenList(id) {
    await updateDoc(doc(this.col, id), { status: "open", finishedAt: null });
  }

  async deleteList(id) {
    await deleteDoc(doc(this.col, id));
  }

  async savePushSubscription(id, subscription) {
    await setDoc(doc(this.subsCol, id), {
      ...subscription,
      updatedAt: serverTimestamp()
    });
  }

  async deletePushSubscription(id) {
    await deleteDoc(doc(this.subsCol, id));
  }
}

function normalize(id, data) {
  return {
    id,
    subject: data.subject,
    store: data.store || null,
    items: data.items || [],
    status: data.status,
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : null),
    finishedAt: data.finishedAt?.toDate ? data.finishedAt.toDate() : (data.finishedAt ? new Date(data.finishedAt) : null)
  };
}

class LocalBackend {
  constructor(groupCode) {
    this.key = `boodschappenlijst_lists_${groupCode}`;
    window.addEventListener("storage", (e) => {
      if (e.key === this.key) this._notify();
    });
    this._listeners = [];
  }

  _read() {
    try {
      const raw = JSON.parse(localStorage.getItem(this.key) || "[]");
      return raw.map((l) => ({
        ...l,
        createdAt: l.createdAt ? new Date(l.createdAt) : null,
        finishedAt: l.finishedAt ? new Date(l.finishedAt) : null
      }));
    } catch {
      return [];
    }
  }

  _writeRaw(lists) {
    localStorage.setItem(this.key, JSON.stringify(lists));
    this._notify();
  }

  _notify() {
    this._listeners.forEach((fn) => fn());
  }

  async createList(data) {
    const raw = JSON.parse(localStorage.getItem(this.key) || "[]");
    const id = crypto.randomUUID();
    raw.push({ ...data, id, status: "open", createdAt: new Date().toISOString(), finishedAt: null });
    this._writeRaw(raw);
    return id;
  }

  subscribeOpenLists(cb) {
    const run = () => cb(this._read().filter((l) => l.status === "open").sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)));
    this._listeners.push(run);
    run();
    return () => { this._listeners = this._listeners.filter((f) => f !== run); };
  }

  subscribeAllLists(cb) {
    const run = () => cb(this._read().sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)));
    this._listeners.push(run);
    run();
    return () => { this._listeners = this._listeners.filter((f) => f !== run); };
  }

  async updateItems(id, items) {
    const raw = JSON.parse(localStorage.getItem(this.key) || "[]");
    const list = raw.find((l) => l.id === id);
    if (list) { list.items = items; this._writeRaw(raw); }
  }

  async finishList(id) {
    const raw = JSON.parse(localStorage.getItem(this.key) || "[]");
    const list = raw.find((l) => l.id === id);
    if (list) { list.status = "finished"; list.finishedAt = new Date().toISOString(); this._writeRaw(raw); }
  }

  async reopenList(id) {
    const raw = JSON.parse(localStorage.getItem(this.key) || "[]");
    const list = raw.find((l) => l.id === id);
    if (list) { list.status = "open"; list.finishedAt = null; this._writeRaw(raw); }
  }

  async deleteList(id) {
    const raw = JSON.parse(localStorage.getItem(this.key) || "[]");
    this._writeRaw(raw.filter((l) => l.id !== id));
  }

  async savePushSubscription() {
    /* Push-meldingen vereisen Firestore + de send-push function, zie README. */
  }

  async deletePushSubscription() {}
}

const backend = usingFirestore ? new FirestoreBackend(fbDb, groupCode) : new LocalBackend(groupCode);

if (!usingFirestore) {
  document.getElementById("config-banner").hidden = false;
}

/* ---------------------------------------------------------
   ROL (maker / shopper)
--------------------------------------------------------- */

const params = new URLSearchParams(location.search);
const ROLE_KEY = "boodschappenlijst_role";

function initialRole() {
  const fromUrl = params.get("role");
  if (fromUrl === "maker" || fromUrl === "shopper") return fromUrl;
  if (params.get("list")) return "shopper";
  return localStorage.getItem(ROLE_KEY) || "maker";
}

let currentRole = initialRole();

function setRole(role) {
  currentRole = role;
  localStorage.setItem(ROLE_KEY, role);
  document.getElementById("screen-maker").hidden = role !== "maker";
  document.getElementById("screen-shopper").hidden = role !== "shopper";
  document.querySelectorAll(".role-switch button").forEach((b) => {
    b.classList.toggle("active", b.dataset.role === role);
  });
}

document.querySelectorAll(".role-switch button").forEach((b) => {
  b.addEventListener("click", () => setRole(b.dataset.role));
});

setRole(currentRole);

/* ---------------------------------------------------------
   PUSH-MELDINGEN
   Meldingen op de telefoon wanneer er een lijst wordt gemaakt
   of aangevuld. Werkt alleen als de app is toegevoegd aan het
   beginscherm (vereist op iPhone) en Firestore + de send-push
   Netlify-function zijn ingesteld (zie README.md).
--------------------------------------------------------- */

const PUSH_SUB_KEY = "boodschappenlijst_push_subscribed";
const pushToggleBtn = document.getElementById("push-toggle-btn");
const pushSupported = "serviceWorker" in navigator && "PushManager" in window && Boolean(CFG.push?.vapidPublicKey) && usingFirestore;

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function subIdFor(endpoint) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function updatePushButton() {
  if (!pushToggleBtn) return;
  pushToggleBtn.hidden = !pushSupported;
  if (!pushSupported) return;
  const on = Notification.permission === "granted" && localStorage.getItem(PUSH_SUB_KEY) === "1";
  pushToggleBtn.textContent = on ? "🔔" : "🔕";
  pushToggleBtn.title = on ? t("notificationsOnTitle") : t("notificationsOffTitle");
}

async function enablePush() {
  try {
    const reg = await navigator.serviceWorker.register("sw.js");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      showToast(t("notificationsDenied"));
      return;
    }
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(CFG.push.vapidPublicKey)
    });
    const id = await subIdFor(sub.endpoint);
    await backend.savePushSubscription(id, sub.toJSON());
    localStorage.setItem(PUSH_SUB_KEY, "1");
    showToast(t("notificationsEnabled"));
  } catch (err) {
    console.error("Push subscribe error:", err);
    const detail = [err?.name, err?.message].filter(Boolean).join(": ") || String(err);
    showToast(t("notificationsEnableFailed", { detail }), 8000);
  }
  updatePushButton();
}

async function disablePush() {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      const id = await subIdFor(sub.endpoint);
      await sub.unsubscribe();
      await backend.deletePushSubscription(id);
    }
  } catch (err) {
    console.error("Push unsubscribe error:", err);
  }
  localStorage.removeItem(PUSH_SUB_KEY);
  showToast(t("notificationsDisabled"));
  updatePushButton();
}

if (pushToggleBtn) {
  pushToggleBtn.addEventListener("click", () => {
    const on = Notification.permission === "granted" && localStorage.getItem(PUSH_SUB_KEY) === "1";
    if (on) disablePush(); else enablePush();
  });
}
updatePushButton();

async function notifyListChange({ title, body, listId, role = "shopper" }) {
  if (!CFG.push?.notifyUrl || !CFG.push?.vapidPublicKey) return;
  try {
    const res = await fetch(CFG.push.notifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        body,
        groupCode,
        url: `${location.pathname}?role=${role}${listId ? "&list=" + listId : ""}`
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.reason) {
      console.error("Push notify failed:", res.status, data);
      showToast(t("pushSendFailed", { reason: data.message || data.reason || res.status }), 8000);
    } else if (data.sent === 0) {
      showToast(t("pushNoSubscribers"), 6000);
    }
  } catch (err) {
    console.error("Push notify error:", err);
    showToast(t("pushSendFailed", { reason: err.message }), 8000);
  }
}

/* ---------------------------------------------------------
   MAKER SCHERM
--------------------------------------------------------- */

const subjectSelect = document.getElementById("subject-select");
const subjectButtons = document.getElementById("subject-buttons");
const storeWrap = document.getElementById("store-wrap");
const storeSelect = document.getElementById("store-select");
const storeButtons = document.getElementById("store-buttons");
const storeOtherWrap = document.getElementById("store-other-wrap");
const storeOtherInput = document.getElementById("store-other-input");
const customSubjectWrap = document.getElementById("custom-subject-wrap");
const customSubjectInput = document.getElementById("custom-subject-input");

[...STORE_BRANDS, STORE_ANY, STORE_OTHER].forEach((s) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.dataset.value = s;
  btn.textContent = s === STORE_ANY ? t("storeAny") : s === STORE_OTHER ? t("storeOther") : s;
  btn.addEventListener("click", () => setStore(s));
  storeButtons.appendChild(btn);
});

function itemPlaceholderFor(subject) {
  switch (subject) {
    case "Boodschappen": return t("itemPlaceholderGroceries");
    case "Klusjes / Meenemen": return t("itemPlaceholderChores");
    case "Tuin / Huis": return t("itemPlaceholderGarden");
    case "Cadeaus": return t("itemPlaceholderGifts");
    default: return t("itemPlaceholderOther");
  }
}

/* Een opgeslagen lijst bewaart het onderwerp als vaste interne waarde
   (bijv. "Boodschappen"), zodat die waarde ongeacht de taal herkenbaar
   blijft. Bij weergave vertalen we 'm alsnog; een eigen ("Overig")
   onderwerp is al vrije tekst en komt ongewijzigd door. */
function subjectDisplayLabel(subject) {
  switch (subject) {
    case "Boodschappen": return t("subjectLabelGroceries");
    case "Klusjes / Meenemen": return t("subjectLabelChores");
    case "Tuin / Huis": return t("subjectLabelGarden");
    case "Cadeaus": return t("subjectLabelGifts");
    default: return subject;
  }
}

function setSubject(value) {
  subjectSelect.value = value;
  subjectButtons.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("active", b.dataset.value === value);
  });
  storeWrap.hidden = value !== "Boodschappen";
  customSubjectWrap.hidden = value !== "Overig";
  itemNameInput.placeholder = itemPlaceholderFor(value);
  // Bij cadeaus is een link naar het product zo waardevol dat we het
  // invoerveld meteen openklappen in plaats van achter een toggle te verstoppen.
  itemExtraWrap.hidden = value !== "Cadeaus";
  saveDraft();
}

function setStore(value) {
  storeSelect.value = value;
  storeButtons.querySelectorAll("button").forEach((b) => {
    b.classList.toggle("active", b.dataset.value === value);
  });
  storeOtherWrap.hidden = value !== STORE_OTHER;
  saveDraft();
}

subjectButtons.querySelectorAll("button").forEach((b) => {
  b.addEventListener("click", () => setSubject(b.dataset.value));
});

storeOtherInput.addEventListener("input", saveDraft);
customSubjectInput.addEventListener("input", saveDraft);

const itemNameInput = document.getElementById("item-name-input");
const itemExtraToggle = document.getElementById("item-extra-toggle");
const itemExtraWrap = document.getElementById("item-extra-wrap");
const itemLinkInput = document.getElementById("item-link-input");
const itemImageInput = document.getElementById("item-image-input");
const addItemBtn = document.getElementById("add-item-btn");
const draftList = document.getElementById("draft-list");
const draftEmpty = document.getElementById("draft-empty");
const draftBulkAssign = document.getElementById("draft-bulk-assign");
const sendListBtn = document.getElementById("send-list-btn");

let draftItems = [];

/* Concept wordt automatisch lokaal bewaard, zodat je er dagenlang
   tussendoor aan kunt verder werken voordat je 'm verstuurt. */
const DRAFT_KEY = "boodschappenlijst_draft";

function saveDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({
    subject: subjectSelect.value,
    store: storeSelect.value,
    storeOther: storeOtherInput.value,
    customSubject: customSubjectInput.value,
    items: draftItems
  }));
}

function loadDraft() {
  let draft;
  try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch { /* corrupt draft, ignore */ }
  if (draft) {
    draftItems = Array.isArray(draft.items) ? draft.items : [];
    storeOtherInput.value = draft.storeOther || "";
    customSubjectInput.value = draft.customSubject || "";
  }
  setSubject((draft && draft.subject) || "Boodschappen");
  setStore((draft && draft.store) || "");
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

itemExtraToggle.addEventListener("click", () => {
  itemExtraWrap.hidden = !itemExtraWrap.hidden;
});

function addDraftItem() {
  const name = itemNameInput.value.trim();
  if (!name) { itemNameInput.focus(); return; }
  draftItems.push({
    id: crypto.randomUUID(),
    name,
    link: itemLinkInput.value.trim(),
    image: itemImageInput.value.trim(),
    checked: false,
    unavailable: false,
    feedback: "",
    assignee: null
  });
  itemNameInput.value = "";
  itemLinkInput.value = "";
  itemImageInput.value = "";
  itemExtraWrap.hidden = true;
  renderDraftList();
  saveDraft();
  itemNameInput.focus();
}

addItemBtn.addEventListener("click", addDraftItem);
itemNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); addDraftItem(); }
});

function renderDraftList() {
  draftList.innerHTML = "";
  draftEmpty.hidden = draftItems.length > 0;
  draftItems.forEach((item) => {
    const li = document.createElement("li");
    const left = document.createElement("span");
    left.style.display = "flex";
    left.style.alignItems = "center";
    left.style.minWidth = "0";
    left.style.flex = "1";
    if (item.image) {
      const img = document.createElement("img");
      img.src = item.image;
      img.className = "item-thumb";
      img.alt = "";
      left.appendChild(img);
    }
    const label = document.createElement("span");
    label.textContent = item.name + (item.link ? " 🔗" : "");
    label.style.overflow = "hidden";
    label.style.textOverflow = "ellipsis";
    left.appendChild(label);

    const right = document.createElement("span");
    right.style.display = "flex";
    right.style.alignItems = "center";
    right.style.gap = "6px";
    right.style.flexShrink = "0";
    right.appendChild(createAssigneeToggle(item.assignee, (value) => {
      item.assignee = value;
      renderDraftList();
      saveDraft();
    }));

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-x";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => {
      draftItems = draftItems.filter((i) => i.id !== item.id);
      renderDraftList();
      saveDraft();
    });
    right.appendChild(removeBtn);

    li.appendChild(left);
    li.appendChild(right);
    draftList.appendChild(li);
  });
  sendListBtn.disabled = draftItems.length === 0;

  draftBulkAssign.innerHTML = "";
  draftBulkAssign.hidden = draftItems.length === 0;
  if (draftItems.length > 0) {
    draftBulkAssign.appendChild(createBulkAssignRow(draftItems, (value) => {
      draftItems.forEach((i) => { i.assignee = value; });
      renderDraftList();
      saveDraft();
    }));
  }
}
loadDraft();
renderDraftList();

const clearDraftBtn = document.getElementById("clear-draft-btn");
clearDraftBtn.addEventListener("click", () => {
  if (draftItems.length === 0) return;
  if (!confirm(t("clearDraftConfirm"))) return;
  draftItems = [];
  setSubject("Boodschappen");
  setStore("");
  storeOtherInput.value = "";
  customSubjectInput.value = "";
  clearDraft();
  renderDraftList();
});

sendListBtn.addEventListener("click", async () => {
  const subject = subjectSelect.value === "Overig" ? customSubjectInput.value.trim() : subjectSelect.value;
  if (!subject) { customSubjectInput.focus(); return; }
  if (subjectSelect.value === "Boodschappen" && !storeSelect.value) { showToast(t("chooseStoreFirst")); return; }
  if (draftItems.length === 0) return;

  let store = null;
  if (subjectSelect.value === "Boodschappen") {
    store = storeSelect.value === STORE_OTHER ? storeOtherInput.value.trim()
      : storeSelect.value === STORE_ANY ? t("storeAny")
      : storeSelect.value;
  }

  sendListBtn.disabled = true;
  sendListBtn.textContent = t("sendingBtn");

  try {
    const id = await backend.createList({ subject, store, items: draftItems });
    notifyListChange({
      title: t("newListNotifTitle", { subject: subjectDisplayLabel(subject) }),
      body: t("newListNotifBody", { storePrefix: store ? store + " · " : "", count: draftItems.length }),
      listId: id
    });

    draftItems = [];
    renderDraftList();
    setSubject("Boodschappen");
    setStore("");
    storeOtherInput.value = "";
    customSubjectInput.value = "";
    clearDraft();

    showToast(t("listSentToast"));
  } catch (err) {
    console.error(err);
    showToast(t("sendErrorToast"));
  } finally {
    sendListBtn.disabled = false;
    sendListBtn.textContent = t("sendListBtn");
  }
});

/* Geschiedenis voor de maker */
const historyList = document.getElementById("history-list");
const historyEmpty = document.getElementById("history-empty");
const historyTabBtns = document.querySelectorAll(".history-tab-btn");
const clearFinishedBtn = document.getElementById("clear-finished-btn");
const assigneeFilterEl = document.getElementById("assignee-filter");

const expandedHistoryIds = new Set();
let lastHistoryLists = [];
let historyTab = "open";
let historyAssigneeFilter = "all";

function setHistoryTab(tab) {
  historyTab = tab;
  historyTabBtns.forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  renderHistory();
}
historyTabBtns.forEach((b) => b.addEventListener("click", () => setHistoryTab(b.dataset.tab)));
setHistoryTab("open");

function setHistoryAssigneeFilter(value) {
  historyAssigneeFilter = value;
  assigneeFilterEl.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.assignee === value));
  renderHistory();
}
assigneeFilterEl.querySelectorAll("button[data-assignee]").forEach((b) => b.addEventListener("click", () => setHistoryAssigneeFilter(b.dataset.assignee)));
setHistoryAssigneeFilter("all");

const assigneeFilterMembersEl = document.getElementById("assignee-filter-members");
function renderAssigneeFilterButtons() {
  assigneeFilterMembersEl.innerHTML = "";
  groupMembers.forEach((m) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = m.emoji;
    btn.title = m.name;
    btn.setAttribute("aria-label", m.name);
    btn.dataset.assignee = m.id;
    btn.classList.toggle("active", historyAssigneeFilter === m.id);
    btn.addEventListener("click", () => setHistoryAssigneeFilter(m.id));
    assigneeFilterMembersEl.appendChild(btn);
  });
}

clearFinishedBtn.addEventListener("click", async () => {
  const finished = lastHistoryLists.filter((l) => l.status === "finished");
  if (finished.length === 0) return;
  if (!confirm(t("clearFinishedConfirm", { count: finished.length }))) return;
  clearFinishedBtn.disabled = true;
  try {
    await Promise.all(finished.map((l) => backend.deleteList(l.id)));
    showToast(t("clearedFinishedToast"));
  } catch (err) {
    console.error(err);
    showToast(t("clearFailedToast"));
  } finally {
    clearFinishedBtn.disabled = false;
  }
});

function renderHistory() {
  const filtered = lastHistoryLists.filter((l) => {
    if (l.status !== historyTab) return false;
    if (historyAssigneeFilter === "all") return true;
    if (historyAssigneeFilter === "none") return l.items.some((i) => !i.assignee);
    return l.items.some((i) => i.assignee === historyAssigneeFilter);
  });
  historyList.innerHTML = "";
  historyEmpty.hidden = filtered.length > 0;
  historyEmpty.textContent = historyTab === "open"
    ? t("noActiveLists")
    : t("noFinishedLists");
  clearFinishedBtn.hidden = !(historyTab === "finished" && filtered.length > 0);

  filtered.forEach((list) => {
    const wrap = document.createElement("div");

    const row = document.createElement("div");
    row.className = "history-item";
    row.style.cursor = "pointer";
    const checkedCount = list.items.filter((i) => i.checked).length;
    const unavailableCount = list.items.filter((i) => i.unavailable).length;
    const expanded = expandedHistoryIds.has(list.id);
    row.innerHTML = `
      <span>${expanded ? "▾" : "▸"} ${escapeHtml(subjectDisplayLabel(list.subject))}${list.store ? " · " + escapeHtml(list.store) : ""}
        <span class="meta">(${checkedCount}/${list.items.length}${unavailableCount ? `, <span style="color:var(--danger); font-weight:600;">${t("unavailableCountLabel", { count: unavailableCount })}</span>` : ""})</span>
      </span>
    `;

    const statusWrap = document.createElement("span");
    statusWrap.style.display = "flex";
    statusWrap.style.alignItems = "center";
    statusWrap.style.gap = "6px";
    statusWrap.style.flexShrink = "0";
    const pill = document.createElement("span");
    pill.className = `status-pill ${list.status}`;
    pill.textContent = list.status === "open" ? t("statusActive") : t("statusDone");
    statusWrap.appendChild(pill);

    if (list.status === "finished") {
      const reopenBtn = document.createElement("button");
      reopenBtn.className = "history-delete-btn";
      reopenBtn.type = "button";
      reopenBtn.title = t("reopenTitle");
      reopenBtn.textContent = "↩️";
      reopenBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        try {
          await backend.reopenList(list.id);
          showToast(t("reopenedToast"));
        } catch (err) {
          console.error(err);
          showToast(t("reopenFailedToast"));
        }
      });
      statusWrap.appendChild(reopenBtn);

      const delBtn = document.createElement("button");
      delBtn.className = "history-delete-btn";
      delBtn.type = "button";
      delBtn.title = t("deleteTitle");
      delBtn.textContent = "🗑️";
      delBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!confirm(t("deleteConfirm", { name: `${subjectDisplayLabel(list.subject)}${list.store ? " · " + list.store : ""}` }))) return;
        try {
          await backend.deleteList(list.id);
        } catch (err) {
          console.error(err);
          showToast(t("deleteFailedToast"));
        }
      });
      statusWrap.appendChild(delBtn);
    }

    row.appendChild(statusWrap);

    const detail = document.createElement("div");
    detail.style.padding = "0 0 12px 18px";
    detail.hidden = !expanded;
    list.items.forEach((item) => {
      const line = document.createElement("div");
      line.style.fontSize = "14px";
      line.style.padding = "4px 0";
      line.style.display = "flex";
      line.style.alignItems = "center";
      line.style.flexWrap = "wrap";
      line.style.gap = "8px";

      const text = document.createElement("span");
      text.style.flex = "1";
      text.style.minWidth = "0";
      text.innerHTML = `${item.checked ? "✅" : "⬜"} ${escapeHtml(item.name)}`;
      line.appendChild(text);

      line.appendChild(createAssigneeToggle(item.assignee, (value) => {
        item.assignee = value;
        backend.updateItems(list.id, list.items).catch((err) => {
          console.error(err);
          showToast(t("assignFailedToast"));
        });
      }));

      if (item.unavailable) {
        const note = document.createElement("div");
        note.className = "unavailable-note";
        note.style.marginTop = "2px";
        note.style.width = "100%";
        note.textContent = t("unavailableLabel") + (item.feedback ? ": " + item.feedback : "");
        line.appendChild(note);
      }
      detail.appendChild(line);
    });

    if (list.items.length > 0) {
      detail.appendChild(createBulkAssignRow(list.items, (value) => {
        list.items.forEach((i) => { i.assignee = value; });
        backend.updateItems(list.id, list.items).catch((err) => {
          console.error(err);
          showToast(t("assignFailedToast"));
        });
      }));
    }

    if (list.status === "open") {
      const addRow = document.createElement("div");
      addRow.className = "item-add-row";
      addRow.style.marginTop = "10px";

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = t("addMoreItemPlaceholder");

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-primary";
      btn.textContent = t("addBtn");

      const submitAdd = async () => {
        const name = input.value.trim();
        if (!name) { input.focus(); return; }
        btn.disabled = true;
        const newItem = {
          id: crypto.randomUUID(),
          name,
          link: "",
          image: "",
          checked: false,
          unavailable: false,
          feedback: "",
          assignee: null
        };
        try {
          await backend.updateItems(list.id, [...list.items, newItem]);
          input.value = "";
          showToast(t("addedToListToast"));
          notifyListChange({
            title: t("listUpdatedNotifTitle", { subject: subjectDisplayLabel(list.subject) }),
            body: `+ ${name}`,
            listId: list.id
          });
        } catch (err) {
          console.error(err);
          showToast(t("addFailedToast"));
        } finally {
          btn.disabled = false;
          input.focus();
        }
      };

      btn.addEventListener("click", submitAdd);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); submitAdd(); }
      });
      input.addEventListener("click", (e) => e.stopPropagation());

      addRow.appendChild(input);
      addRow.appendChild(btn);
      detail.appendChild(addRow);
    } else {
      const lockedNote = document.createElement("p");
      lockedNote.className = "meta";
      lockedNote.style.marginTop = "8px";
      lockedNote.textContent = t("lockedListNote");
      detail.appendChild(lockedNote);
    }

    row.addEventListener("click", () => {
      if (expandedHistoryIds.has(list.id)) {
        expandedHistoryIds.delete(list.id);
      } else {
        expandedHistoryIds.add(list.id);
      }
      renderHistory();
    });

    wrap.appendChild(row);
    wrap.appendChild(detail);
    historyList.appendChild(wrap);
  });
}

backend.subscribeAllLists((lists) => {
  lastHistoryLists = lists;
  renderHistory();
});

/* ---------------------------------------------------------
   SHOPPER SCHERM
--------------------------------------------------------- */

const shopperLists = document.getElementById("shopper-lists");
const shopperEmpty = document.getElementById("shopper-empty");
const highlightId = params.get("list");

let lastShopperLists = [];
function renderShopperLists() {
  shopperLists.innerHTML = "";
  shopperEmpty.hidden = lastShopperLists.length > 0;
  lastShopperLists.forEach((list) => {
    const card = renderShopperCard(list);
    shopperLists.appendChild(card);
  });
  if (highlightId) {
    const el = document.getElementById("list-" + highlightId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

backend.subscribeOpenLists((lists) => {
  lastShopperLists = lists;
  renderShopperLists();
});

function renderShopperCard(list) {
  const card = document.createElement("div");
  card.className = "card list-card";
  card.id = "list-" + list.id;

  const total = list.items.length;
  const checked = list.items.filter((i) => i.checked).length;
  const pct = total ? Math.round((checked / total) * 100) : 0;

  const header = document.createElement("div");
  header.innerHTML = `
    <div class="list-card-header">
      <div>
        <span class="subject-tag">${escapeHtml(subjectDisplayLabel(list.subject))}${list.store ? " · " + escapeHtml(list.store) : ""}</span>
      </div>
      <span class="meta">${list.createdAt ? formatDate(list.createdAt) : ""}</span>
    </div>
    <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
    <div class="meta">${t("pickedCount", { checked, total })}</div>
  `;
  card.appendChild(header);

  const itemsWrap = document.createElement("div");
  list.items.forEach((item) => {
    itemsWrap.appendChild(renderShopItem(list, item));
  });
  card.appendChild(itemsWrap);

  if (list.items.length > 0) {
    card.appendChild(createBulkAssignRow(list.items, (value) => {
      list.items.forEach((i) => { i.assignee = value; });
      persistItems(list);
    }));
  }

  const finishRow = document.createElement("div");
  finishRow.className = "finish-row";
  finishRow.style.justifyContent = "flex-end";
  const finishBtn = document.createElement("button");
  finishBtn.className = "btn btn-secondary";
  finishBtn.style.fontSize = "13px";
  finishBtn.style.padding = "7px 12px";
  finishBtn.textContent = t("finishListBtn");
  finishBtn.addEventListener("click", async () => {
    finishBtn.disabled = true;
    await backend.finishList(list.id);
    showToast(t("listFinishedToast"));
    const unavailableCount = list.items.filter((i) => i.unavailable).length;
    notifyListChange({
      title: t("listFinishedNotifTitle", { subject: subjectDisplayLabel(list.subject) }),
      body: t("listFinishedNotifBody", {
        checked, total,
        unavailSuffix: unavailableCount ? t("unavailSuffix", { count: unavailableCount }) : ""
      }),
      listId: list.id,
      role: "maker"
    });
  });
  finishRow.appendChild(finishBtn);
  card.appendChild(finishRow);

  return card;
}

function renderShopItem(list, item) {
  const row = document.createElement("div");
  row.className = "shop-item" + (item.checked ? " checked" : "") + (item.unavailable ? " unavailable" : "");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = item.checked;
  checkbox.addEventListener("change", () => {
    item.checked = checkbox.checked;
    persistItems(list);
  });
  row.appendChild(checkbox);

  const body = document.createElement("div");
  body.className = "shop-item-body";

  const nameRow = document.createElement("div");
  nameRow.style.display = "flex";
  nameRow.style.alignItems = "center";
  nameRow.style.gap = "8px";
  if (item.image) {
    const img = document.createElement("img");
    img.src = item.image;
    img.className = "item-thumb";
    img.alt = "";
    nameRow.appendChild(img);
  }
  const nameSpan = document.createElement("span");
  nameSpan.className = "shop-item-name";
  nameSpan.textContent = item.name;
  nameRow.appendChild(nameSpan);
  body.appendChild(nameRow);

  if (item.link) {
    const a = document.createElement("a");
    a.href = item.link;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.className = "shop-item-link";
    a.textContent = t("viewProductLink");
    body.appendChild(a);
  }

  const actions = document.createElement("div");
  actions.className = "shop-item-actions";

  if (!item.unavailable) {
    const flagBtn = document.createElement("button");
    flagBtn.className = "btn-warning";
    flagBtn.textContent = t("markUnavailableBtn");
    flagBtn.addEventListener("click", () => {
      body.appendChild(renderFeedbackInput(list, item));
      flagBtn.hidden = true;
    });
    actions.appendChild(flagBtn);
  } else {
    const note = document.createElement("div");
    note.className = "unavailable-note";
    note.textContent = t("unavailableLabel") + (item.feedback ? ": " + item.feedback : "");
    body.appendChild(note);

    const undoBtn = document.createElement("button");
    undoBtn.className = "btn-secondary";
    undoBtn.textContent = t("undoUnavailableBtn");
    undoBtn.addEventListener("click", () => {
      item.unavailable = false;
      item.feedback = "";
      persistItems(list);
    });
    actions.appendChild(undoBtn);
  }

  actions.appendChild(createAssigneeToggle(item.assignee, (value) => {
    item.assignee = value;
    persistItems(list);
  }));

  body.appendChild(actions);
  row.appendChild(body);
  return row;
}

function renderFeedbackInput(list, item) {
  const wrap = document.createElement("div");
  wrap.className = "feedback-input";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = t("feedbackPlaceholder");
  const confirmBtn = document.createElement("button");
  confirmBtn.className = "btn btn-danger";
  confirmBtn.textContent = t("reportBtn");
  confirmBtn.addEventListener("click", () => {
    item.unavailable = true;
    item.feedback = input.value.trim();
    persistItems(list);
  });
  wrap.appendChild(input);
  wrap.appendChild(confirmBtn);
  return wrap;
}

function persistItems(list) {
  backend.updateItems(list.id, list.items);
}

/* ---------------------------------------------------------
   HELPERS
--------------------------------------------------------- */

function formatDate(date) {
  const locale = DATE_LOCALES[LANG] || "nl-NL";
  return date.toLocaleDateString(locale, { day: "numeric", month: "short" }) +
    ", " + date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}


/* ---------------------------------------------------------
   GROEP-INSTELLINGEN (code bekijken, leden beheren, verlaten)
--------------------------------------------------------- */

const groupInfoBtn = document.getElementById("group-info-btn");
const screenGroupSettings = document.getElementById("screen-groupsettings");
const appRoot = document.getElementById("app-root");
const memberManageList = document.getElementById("member-manage-list");

function persistMembers() {
  writeGroupMeta(groupCode, {
    members: groupMembers.map((m) => ({ id: m.id, name: m.name.trim(), emoji: m.emoji }))
  }).catch((err) => {
    console.error(err);
    showToast(t("saveFailedToast"));
  });
}

function renderMemberManageList() {
  memberManageList.innerHTML = "";
  groupMembers.forEach((m, idx) => {
    memberManageList.appendChild(createMemberRow(m, {
      onRemove: () => {
        groupMembers.splice(idx, 1);
        persistMembers();
        renderMemberManageList();
      },
      onChange: persistMembers
    }));
  });
}

groupInfoBtn.addEventListener("click", () => {
  document.getElementById("current-group-code").textContent = formatCode(groupCode);
  renderMemberManageList();
  appRoot.hidden = true;
  screenGroupSettings.hidden = false;
});

document.getElementById("close-groupsettings-btn").addEventListener("click", () => {
  screenGroupSettings.hidden = true;
  appRoot.hidden = false;
});

document.getElementById("copy-current-code-btn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(formatCode(groupCode));
    showToast(t("codeCopied"));
  } catch {
    showToast(t("copyFailedNote"));
  }
});

document.getElementById("manage-add-member-btn").addEventListener("click", () => {
  groupMembers.push({ id: crypto.randomUUID(), name: "", emoji: EMOJI_CHOICES[groupMembers.length % EMOJI_CHOICES.length] });
  persistMembers();
  renderMemberManageList();
});

document.getElementById("leave-group-btn").addEventListener("click", () => {
  if (!confirm(t("leaveGroupConfirmText"))) return;
  localStorage.removeItem(GROUP_KEY);
  location.reload();
});

/* Leden live synchroniseren tussen toestellen */
subscribeGroupMeta(groupCode, (meta) => {
  groupMembers = (meta && Array.isArray(meta.members)) ? meta.members : [];
  renderAssigneeFilterButtons();
  renderDraftList();
  renderHistory();
  renderShopperLists();
  if (!screenGroupSettings.hidden) renderMemberManageList();
});
