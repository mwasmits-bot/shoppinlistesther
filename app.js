import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, updateDoc, onSnapshot,
  query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const CFG = window.APP_CONFIG;
const STORES = ["Aldi", "Albert Heijn", "Plus", "Jumbo", "Anders"];

/* ---------------------------------------------------------
   BACKEND — Firestore wanneer geconfigureerd, anders een
   localStorage-fallback zodat de app meteen te testen is.
--------------------------------------------------------- */

class FirestoreBackend {
  constructor() {
    const app = initializeApp(CFG.firebase);
    this.db = getFirestore(app);
    this.col = collection(this.db, "lists");
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

const LOCAL_KEY = "boodschappenlijst_lists";

class LocalBackend {
  constructor() {
    window.addEventListener("storage", (e) => {
      if (e.key === LOCAL_KEY) this._notify();
    });
    this._listeners = [];
  }

  _read() {
    try {
      const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
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
    localStorage.setItem(LOCAL_KEY, JSON.stringify(lists));
    this._notify();
  }

  _notify() {
    this._listeners.forEach((fn) => fn());
  }

  async createList(data) {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
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
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    const list = raw.find((l) => l.id === id);
    if (list) { list.items = items; this._writeRaw(raw); }
  }

  async finishList(id) {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    const list = raw.find((l) => l.id === id);
    if (list) { list.status = "finished"; list.finishedAt = new Date().toISOString(); this._writeRaw(raw); }
  }
}

const usingFirestore = Boolean(CFG.firebase.apiKey);
const backend = usingFirestore ? new FirestoreBackend() : new LocalBackend();

if (!usingFirestore) {
  document.getElementById("config-banner").hidden = false;
}

if (CFG.emailjs.publicKey && window.emailjs) {
  window.emailjs.init({ publicKey: CFG.emailjs.publicKey });
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
   MAKER SCHERM
--------------------------------------------------------- */

const subjectSelect = document.getElementById("subject-select");
const storeWrap = document.getElementById("store-wrap");
const storeSelect = document.getElementById("store-select");
const storeOtherWrap = document.getElementById("store-other-wrap");
const storeOtherInput = document.getElementById("store-other-input");
const customSubjectWrap = document.getElementById("custom-subject-wrap");
const customSubjectInput = document.getElementById("custom-subject-input");

STORES.forEach((s) => {
  const opt = document.createElement("option");
  opt.value = s;
  opt.textContent = s;
  storeSelect.appendChild(opt);
});

subjectSelect.addEventListener("change", () => {
  storeWrap.hidden = subjectSelect.value !== "Boodschappen";
  customSubjectWrap.hidden = subjectSelect.value !== "Overig";
  saveDraft();
});

storeSelect.addEventListener("change", () => {
  storeOtherWrap.hidden = storeSelect.value !== "Anders";
  saveDraft();
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
  if (!draft) return;
  subjectSelect.value = draft.subject || "Boodschappen";
  storeSelect.value = draft.store || "";
  storeOtherInput.value = draft.storeOther || "";
  customSubjectInput.value = draft.customSubject || "";
  draftItems = Array.isArray(draft.items) ? draft.items : [];
  storeWrap.hidden = subjectSelect.value !== "Boodschappen";
  customSubjectWrap.hidden = subjectSelect.value !== "Overig";
  storeOtherWrap.hidden = storeSelect.value !== "Anders";
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
    feedback: ""
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

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-x";
    removeBtn.textContent = "✕";
    removeBtn.addEventListener("click", () => {
      draftItems = draftItems.filter((i) => i.id !== item.id);
      renderDraftList();
      saveDraft();
    });

    li.appendChild(left);
    li.appendChild(removeBtn);
    draftList.appendChild(li);
  });
  sendListBtn.disabled = draftItems.length === 0;
}
loadDraft();
renderDraftList();

const clearDraftBtn = document.getElementById("clear-draft-btn");
clearDraftBtn.addEventListener("click", () => {
  if (draftItems.length === 0) return;
  if (!confirm("Concept wissen? Alles wat je tot nu toe hebt toegevoegd gaat dan verloren.")) return;
  draftItems = [];
  subjectSelect.value = "Boodschappen";
  storeSelect.value = "";
  storeOtherInput.value = "";
  customSubjectInput.value = "";
  storeWrap.hidden = false;
  customSubjectWrap.hidden = true;
  storeOtherWrap.hidden = true;
  clearDraft();
  renderDraftList();
});

sendListBtn.addEventListener("click", async () => {
  const subject = subjectSelect.value === "Overig" ? customSubjectInput.value.trim() : subjectSelect.value;
  if (!subject) { customSubjectInput.focus(); return; }
  if (subjectSelect.value === "Boodschappen" && !storeSelect.value) { storeSelect.focus(); return; }
  if (draftItems.length === 0) return;

  let store = null;
  if (subjectSelect.value === "Boodschappen") {
    store = storeSelect.value === "Anders" ? storeOtherInput.value.trim() : storeSelect.value;
  }

  sendListBtn.disabled = true;
  sendListBtn.textContent = "Versturen…";

  try {
    const id = await backend.createList({ subject, store, items: draftItems });
    const link = `${location.origin}${location.pathname}?role=shopper&list=${id}`;
    const emailResult = await sendNotificationEmail({ subject, store, items: draftItems }, link);

    draftItems = [];
    renderDraftList();
    subjectSelect.value = "Boodschappen";
    storeSelect.value = "";
    storeOtherInput.value = "";
    customSubjectInput.value = "";
    storeWrap.hidden = false;
    customSubjectWrap.hidden = true;
    storeOtherWrap.hidden = true;
    clearDraft();

    if (emailResult.sent) {
      showToast("Lijst verstuurd en mail verzonden ✅");
    } else if (emailResult.reason === "not-configured") {
      showToast("Lijst verstuurd (mail niet ingesteld — zie README)");
    } else {
      showToast("Lijst verstuurd, maar mail versturen mislukte ⚠️");
    }
  } catch (err) {
    console.error(err);
    showToast("Er ging iets mis bij het versturen ⚠️");
  } finally {
    sendListBtn.disabled = false;
    sendListBtn.textContent = "📤 Lijst versturen";
  }
});

async function sendNotificationEmail(list, link) {
  const cfg = CFG.emailjs;
  if (!cfg.publicKey || !cfg.serviceId || !cfg.templateId || !window.emailjs) {
    return { sent: false, reason: "not-configured" };
  }
  try {
    await window.emailjs.send(cfg.serviceId, cfg.templateId, {
      to_email: cfg.toEmail,
      subject: list.subject,
      store: list.store || "",
      item_count: String(list.items.length),
      items_text: list.items.map((i) => "- " + i.name).join("\n"),
      link
    });
    return { sent: true };
  } catch (err) {
    console.error("EmailJS error:", err);
    return { sent: false, reason: err.message || "error" };
  }
}

/* Geschiedenis voor de maker */
const historyList = document.getElementById("history-list");
const historyEmpty = document.getElementById("history-empty");

backend.subscribeAllLists((lists) => {
  historyList.innerHTML = "";
  historyEmpty.hidden = lists.length > 0;
  lists.forEach((list) => {
    const row = document.createElement("div");
    row.className = "history-item";
    const checkedCount = list.items.filter((i) => i.checked).length;
    const unavailableCount = list.items.filter((i) => i.unavailable).length;
    row.innerHTML = `
      <span>${escapeHtml(list.subject)}${list.store ? " · " + escapeHtml(list.store) : ""}
        <span class="meta">(${checkedCount}/${list.items.length}${unavailableCount ? `, ${unavailableCount} niet beschikbaar` : ""})</span>
      </span>
      <span class="status-pill ${list.status}">${list.status === "open" ? "Actief" : "Klaar"}</span>
    `;
    historyList.appendChild(row);
  });
});

/* ---------------------------------------------------------
   SHOPPER SCHERM
--------------------------------------------------------- */

const shopperLists = document.getElementById("shopper-lists");
const shopperEmpty = document.getElementById("shopper-empty");
const highlightId = params.get("list");

backend.subscribeOpenLists((lists) => {
  shopperLists.innerHTML = "";
  shopperEmpty.hidden = lists.length > 0;
  lists.forEach((list) => {
    const card = renderShopperCard(list);
    shopperLists.appendChild(card);
  });
  if (highlightId) {
    const el = document.getElementById("list-" + highlightId);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
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
        <span class="subject-tag">${escapeHtml(list.subject)}${list.store ? " · " + escapeHtml(list.store) : ""}</span>
      </div>
      <span class="meta">${list.createdAt ? formatDate(list.createdAt) : ""}</span>
    </div>
    <div class="progress-bar"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
    <div class="meta">${checked}/${total} gepakt</div>
  `;
  card.appendChild(header);

  const itemsWrap = document.createElement("div");
  list.items.forEach((item) => {
    itemsWrap.appendChild(renderShopItem(list, item));
  });
  card.appendChild(itemsWrap);

  const finishRow = document.createElement("div");
  finishRow.className = "finish-row";
  const finishBtn = document.createElement("button");
  finishBtn.className = "btn btn-primary";
  finishBtn.textContent = "✅ Lijst afronden";
  finishBtn.addEventListener("click", async () => {
    finishBtn.disabled = true;
    await backend.finishList(list.id);
    showToast("Lijst afgerond ✅");
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
    a.textContent = "🔗 bekijk product";
    body.appendChild(a);
  }

  const actions = document.createElement("div");
  actions.className = "shop-item-actions";

  if (!item.unavailable) {
    const flagBtn = document.createElement("button");
    flagBtn.className = "btn-warning";
    flagBtn.textContent = "⚠️ Niet beschikbaar";
    flagBtn.addEventListener("click", () => {
      body.appendChild(renderFeedbackInput(list, item));
      flagBtn.hidden = true;
    });
    actions.appendChild(flagBtn);
  } else {
    const note = document.createElement("div");
    note.className = "unavailable-note";
    note.textContent = "⚠️ Niet beschikbaar" + (item.feedback ? ": " + item.feedback : "");
    body.appendChild(note);

    const undoBtn = document.createElement("button");
    undoBtn.className = "btn-secondary";
    undoBtn.textContent = "↩️ Toch beschikbaar";
    undoBtn.addEventListener("click", () => {
      item.unavailable = false;
      item.feedback = "";
      persistItems(list);
    });
    actions.appendChild(undoBtn);
  }

  body.appendChild(actions);
  row.appendChild(body);
  return row;
}

function renderFeedbackInput(list, item) {
  const wrap = document.createElement("div");
  wrap.className = "feedback-input";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Reden (optioneel), bv. 'op = op'";
  const confirmBtn = document.createElement("button");
  confirmBtn.className = "btn btn-danger";
  confirmBtn.textContent = "Meld";
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
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" }) +
    ", " + date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

let toastTimer;
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
}
