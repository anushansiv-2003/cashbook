import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged,
  signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot,
  serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { firebaseConfig, ENTERER_EMAIL, ALLOWED_EMAILS } from "./firebase-config.js";

(function () {
  "use strict";

  /* ---------------- firebase init ---------------- */
  const fbApp = initializeApp(firebaseConfig);
  const auth = getAuth(fbApp);
  // Persistent, multi-tab-safe offline cache: entries/accounts you add while
  // offline are queued durably (survive a reload or app relaunch) and sync
  // automatically once the connection comes back — and it stays correct even
  // if the app is open in more than one tab/window at once (installed PWA +
  // a browser tab, for example), which the older single-tab persistence API
  // could silently lose, causing exactly the "duplicated then vanished
  // accounts, offline entries missing" symptoms.
  const db = initializeFirestore(fbApp, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
  setPersistence(auth, browserLocalPersistence).catch(function () {});

  /* ---------------- icons ---------------- */
  var ICONS = {
    plus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    list: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
    report: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6l5 5v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M9 13h6M9 17h4"/></svg>',
    wallet: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3"/><path d="M3 7v10a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-4"/><path d="M17 12h3v4h-3a2 2 0 0 1 0-4Z"/></svg>',
    trash: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>',
    pencil: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
    x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    printer: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6"/><path d="M6 18H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2"/><path d="M6 14h12v7H6z"/></svg>',
    download: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
    warn: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/></svg>',
    eye: '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
    signout: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>'
  };
  var TAB_LABELS = { add: "Add", ledger: "Ledger", reports: "Reports", accounts: "Accounts" };
  Array.prototype.forEach.call(document.querySelectorAll(".tabbar button"), function (b) {
    var tab = b.getAttribute("data-tab");
    b.innerHTML = ICONS[tab === "add" ? "plus" : tab === "ledger" ? "list" : tab === "reports" ? "report" : "wallet"] + "<span>" + TAB_LABELS[tab] + "</span>";
  });
  document.getElementById("signOutBtn").innerHTML = ICONS.signout;

  var ACC_VARS = ["--acc-1", "--acc-2", "--acc-3", "--acc-4", "--acc-5", "--acc-6", "--acc-7", "--acc-8"];

  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function todayStr() { var d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function nowTimeStr() { var d = new Date(); return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function addDays(dateStr, n) {
    var d = new Date(dateStr + "T00:00:00");
    d.setDate(d.getDate() + n);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function fmtMoney(n) {
    var v = Math.round((n + Number.EPSILON) * 100) / 100;
    var neg = v < 0;
    v = Math.abs(v);
    var parts = v.toFixed(2).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (neg ? "-Rs " : "Rs ") + parts[0] + "." + parts[1];
  }
  function fmtDateLabel(dateStr) {
    var d = new Date(dateStr + "T00:00:00");
    var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return days[d.getDay()] + ", " + d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
  }
  function fmtDateShort(dateStr) {
    var d = new Date(dateStr + "T00:00:00");
    var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return d.getDate() + " " + months[d.getMonth()];
  }
  function monthKey(dateStr) { return dateStr.slice(0, 7); }
  function monthLabel(key) {
    var parts = key.split("-");
    var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return months[parseInt(parts[1], 10) - 1] + " " + parts[0];
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function safeLocal(key, fallback) {
    try { var v = localStorage.getItem(key); return v === null ? fallback : v; } catch (e) { return fallback; }
  }
  function setLocal(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }
  function orderKey(en) {
    var ts = en._createdAtMs == null ? Date.now() : en._createdAtMs;
    return en.date + "T" + en.time + "#" + String(ts).padStart(14, "0") + "#" + en.id;
  }

  /* ---------------- state ---------------- */
  var accounts = [];
  var entries = [];
  var currentUser = null;
  var isEnterer = false;
  var unsubAccounts = null, unsubEntries = null;
  var entriesLoaded = false;

  var currentType = safeLocal("cb-type", "out");
  if (currentType !== "in" && currentType !== "out") currentType = "out";
  var addAccountId = safeLocal("cb-add-account", null);
  var ledgerAccountId = safeLocal("cb-ledger-account", "__all__");
  var currentPeriod = sessionStorage.getItem("cb-period") || monthKey(todayStr());
  var reportAccountId = safeLocal("cb-report-account", null);
  var reportPreset = "this-month";
  var reportFrom = todayStr();
  var reportTo = todayStr();

  var lastDeleted = null;
  var toastTimer = null;

  function accountById(id) {
    for (var i = 0; i < accounts.length; i++) if (accounts[i].id === id) return accounts[i];
    return null;
  }
  function accountColor(id) {
    var idx = accounts.findIndex(function (a) { return a.id === id; });
    if (idx < 0) idx = 0;
    return "var(" + ACC_VARS[idx % ACC_VARS.length] + ")";
  }
  function ensureValidAccountRefs() {
    if (!accounts.length) return;
    if (!addAccountId || !accountById(addAccountId)) addAccountId = accounts[0].id;
    if (!reportAccountId || !accountById(reportAccountId)) reportAccountId = accounts[0].id;
    if (ledgerAccountId !== "__all__" && !accountById(ledgerAccountId)) ledgerAccountId = "__all__";
  }

  /* ---------------- DOM refs ---------------- */
  var els = {
    bootScreen: document.getElementById("bootScreen"),
    loginScreen: document.getElementById("loginScreen"),
    loginForm: document.getElementById("loginForm"),
    loginEmail: document.getElementById("loginEmail"),
    loginPassword: document.getElementById("loginPassword"),
    loginError: document.getElementById("loginError"),
    loginBtn: document.getElementById("loginBtn"),
    appShell: document.getElementById("appShell"),
    banner: document.getElementById("banner"),
    rolePill: document.getElementById("rolePill"),
    roleText: document.getElementById("roleText"),
    signOutBtn: document.getElementById("signOutBtn"),
    tabbar: document.getElementById("tabbar"),
    addEditor: document.getElementById("addEditor"),
    viewerNotice: document.getElementById("viewerNotice"),
    addAcctPills: document.getElementById("addAcctPills"),
    typeToggle: document.getElementById("typeToggle"),
    addForm: document.getElementById("addForm"),
    amountInput: document.getElementById("amountInput"),
    descInput: document.getElementById("descInput"),
    dateInput: document.getElementById("dateInput"),
    timeInput: document.getElementById("timeInput"),
    formError: document.getElementById("formError"),
    submitBtn: document.getElementById("submitBtn"),
    recentList: document.getElementById("recentList"),
    ledgerAcctPills: document.getElementById("ledgerAcctPills"),
    ledgerBalanceLabel: document.getElementById("ledgerBalanceLabel"),
    ledgerBalance: document.getElementById("ledgerBalance"),
    ledgerIn: document.getElementById("ledgerIn"),
    ledgerOut: document.getElementById("ledgerOut"),
    periodSelect: document.getElementById("periodSelect"),
    entryCount: document.getElementById("entryCount"),
    ledgerBody: document.getElementById("ledgerBody"),
    reportAcctSelect: document.getElementById("reportAcctSelect"),
    presetRow: document.getElementById("presetRow"),
    customRangeRow: document.getElementById("customRangeRow"),
    fromDate: document.getElementById("fromDate"),
    toDate: document.getElementById("toDate"),
    statementArea: document.getElementById("statementArea"),
    totalBalance: document.getElementById("totalBalance"),
    totalSub: document.getElementById("totalSub"),
    accountsList: document.getElementById("accountsList"),
    addAccountCard: document.getElementById("addAccountCard"),
    newAccountInput: document.getElementById("newAccountInput"),
    addAccountBtn: document.getElementById("addAccountBtn"),
    toastWrap: document.getElementById("toastWrap"),
    printArea: document.getElementById("printArea")
  };

  /* ---------------- login ---------------- */
  els.loginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var email = els.loginEmail.value.trim();
    var password = els.loginPassword.value;
    els.loginError.classList.remove("show");
    if (ALLOWED_EMAILS.indexOf(email.toLowerCase()) === -1) {
      els.loginError.textContent = "This ledger isn't shared with that email.";
      els.loginError.classList.add("show");
      return;
    }
    els.loginBtn.disabled = true;
    els.loginBtn.textContent = "Signing in…";
    signInWithEmailAndPassword(auth, email, password).catch(function (err) {
      var msg = "Couldn't sign in — check your email and password.";
      if (err && (err.code === "auth/too-many-requests")) msg = "Too many attempts — wait a bit and try again.";
      if (err && (err.code === "auth/network-request-failed")) msg = "Network error — check your connection.";
      els.loginError.textContent = msg;
      els.loginError.classList.add("show");
    }).finally(function () {
      els.loginBtn.disabled = false;
      els.loginBtn.textContent = "Sign in";
    });
  });

  els.signOutBtn.addEventListener("click", function () { signOut(auth); });

  onAuthStateChanged(auth, function (user) {
    els.bootScreen.classList.add("hidden");
    if (!user) {
      currentUser = null;
      teardownListeners();
      els.appShell.classList.add("hidden");
      els.loginScreen.classList.remove("hidden");
      els.loginPassword.value = "";
      return;
    }
    if (ALLOWED_EMAILS.indexOf((user.email || "").toLowerCase()) === -1) {
      signOut(auth);
      els.appShell.classList.add("hidden");
      els.loginScreen.classList.remove("hidden");
      els.loginError.textContent = "This ledger isn't shared with that account.";
      els.loginError.classList.add("show");
      return;
    }
    currentUser = user;
    isEnterer = user.email.toLowerCase() === ENTERER_EMAIL.toLowerCase();
    els.loginScreen.classList.add("hidden");
    els.appShell.classList.remove("hidden");
    els.roleText.textContent = isEnterer ? "Editor" : "Viewer";
    setOfflineBanner(!navigator.onLine);
    els.addAccountCard.classList.toggle("hidden", !isEnterer);
    switchTab(isEnterer ? "add" : "ledger");
    startListeners();
  });

  /* ---------------- online/offline ---------------- */
  function setOfflineBanner(isOffline) {
    if (isOffline) {
      showBanner(ICONS.warn + "<span>You're offline — entries you add now are saved and will sync once you're back online.</span>");
    } else {
      hideBanner();
    }
    if (currentUser) els.rolePill.setAttribute("data-state", isOffline ? "offline" : (isEnterer ? "idle" : "viewer"));
  }
  window.addEventListener("online", function () { setOfflineBanner(false); });
  window.addEventListener("offline", function () { setOfflineBanner(true); });
  if (!navigator.onLine) setOfflineBanner(true);

  /* ---------------- firestore listeners ---------------- */
  function startListeners() {
    teardownListeners();
    unsubAccounts = onSnapshot(query(collection(db, "accounts"), orderBy("order")), function (snap) {
      accounts = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      // Only auto-create the starter "Cash"/"Bank" accounts once we have a
      // server-confirmed empty result — never off a snapshot that's merely
      // serving from local cache (e.g. offline, or before the first
      // real round-trip completes), which previously could re-seed
      // duplicate accounts on every reload while offline.
      if (!accounts.length && isEnterer && !snap.metadata.fromCache) { seedDefaultAccounts(); return; }
      ensureValidAccountRefs();
      renderAll();
    }, function (err) { handleListenerError(err); });

    unsubEntries = onSnapshot(collection(db, "entries"), function (snap) {
      if (entriesLoaded) {
        snap.docChanges().forEach(function (change) {
          if (change.type !== "added") return;
          var data = change.doc.data();
          if (currentUser && data.createdBy && data.createdBy === currentUser.email) return; // already toasted locally on submit
          var acct = accountById(data.accountId);
          var label = data.type === "in" ? "Cash in" : "Cash out";
          showToast(label + " added · " + fmtMoney(data.amount) + (acct ? " · " + acct.name : ""));
        });
      }
      entries = snap.docs.map(function (d) {
        var data = d.data({ serverTimestamps: "estimate" });
        return Object.assign({ id: d.id, _createdAtMs: data.createdAt && data.createdAt.toMillis ? data.createdAt.toMillis() : null }, data);
      });
      entriesLoaded = true;
      renderAll();
    }, function (err) { handleListenerError(err); });
  }
  function teardownListeners() {
    if (unsubAccounts) { unsubAccounts(); unsubAccounts = null; }
    if (unsubEntries) { unsubEntries(); unsubEntries = null; }
    accounts = []; entries = []; entriesLoaded = false;
  }
  function handleListenerError(err) {
    if (err && err.code === "permission-denied") return; // expected mid sign-out
    showToast("Connection issue — trying to reconnect…");
  }
  function seedDefaultAccounts() {
    Promise.all([
      addDoc(collection(db, "accounts"), { name: "Cash", order: 0, createdAt: serverTimestamp() }),
      addDoc(collection(db, "accounts"), { name: "Bank", order: 1, createdAt: serverTimestamp() })
    ]).catch(function () {});
  }

  /* ---------------- tab navigation ---------------- */
  function switchTab(tab) {
    Array.prototype.forEach.call(document.querySelectorAll(".view"), function (v) { v.classList.remove("active"); });
    document.getElementById("view-" + tab).classList.add("active");
    Array.prototype.forEach.call(els.tabbar.querySelectorAll("button"), function (b) {
      b.classList.toggle("active", b.getAttribute("data-tab") === tab);
    });
    document.querySelector(".views").scrollTop = 0;
    if (tab === "reports") renderReports();
  }
  els.tabbar.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-tab]");
    if (!btn) return;
    switchTab(btn.getAttribute("data-tab"));
  });

  /* ---------------- account pill rows ---------------- */
  function renderAddAcctPills() {
    els.addAcctPills.innerHTML = accounts.map(function (a) {
      var active = a.id === addAccountId;
      return '<button type="button" class="acct-pill' + (active ? " active" : "") + '" data-id="' + a.id + '">' +
        '<span class="dot" style="background:' + accountColor(a.id) + '"></span>' + escapeHtml(a.name) + "</button>";
    }).join("");
  }
  els.addAcctPills.addEventListener("click", function (e) {
    var btn = e.target.closest(".acct-pill");
    if (!btn) return;
    addAccountId = btn.getAttribute("data-id");
    setLocal("cb-add-account", addAccountId);
    renderAddAcctPills();
  });

  function renderLedgerAcctPills() {
    var html = '<button type="button" class="acct-pill' + (ledgerAccountId === "__all__" ? " active" : "") + '" data-id="__all__">All accounts</button>';
    html += accounts.map(function (a) {
      var active = a.id === ledgerAccountId;
      return '<button type="button" class="acct-pill' + (active ? " active" : "") + '" data-id="' + a.id + '">' +
        '<span class="dot" style="background:' + accountColor(a.id) + '"></span>' + escapeHtml(a.name) + "</button>";
    }).join("");
    els.ledgerAcctPills.innerHTML = html;
  }
  els.ledgerAcctPills.addEventListener("click", function (e) {
    var btn = e.target.closest(".acct-pill");
    if (!btn) return;
    ledgerAccountId = btn.getAttribute("data-id");
    setLocal("cb-ledger-account", ledgerAccountId);
    renderLedgerAcctPills();
    renderLedger();
  });

  /* ---------------- type toggle ---------------- */
  function setType(type) {
    currentType = type;
    setLocal("cb-type", type);
    Array.prototype.forEach.call(els.typeToggle.querySelectorAll("button"), function (b) {
      b.classList.toggle("active", b.getAttribute("data-type") === type);
    });
  }
  els.typeToggle.addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-type]");
    if (!btn) return;
    setType(btn.getAttribute("data-type"));
  });

  /* ---------------- filtering helpers ---------------- */
  function entriesForAccount(accountId) {
    if (accountId === "__all__") return entries;
    return entries.filter(function (en) { return en.accountId === accountId; });
  }
  function accountBalance(accountId) {
    return entriesForAccount(accountId).reduce(function (s, en) { return s + (en.type === "in" ? en.amount : -en.amount); }, 0);
  }
  function totalBalanceAll() { return entries.reduce(function (s, en) { return s + (en.type === "in" ? en.amount : -en.amount); }, 0); }

  function runningBalanceMap(list) {
    var chrono = list.slice().sort(function (a, b) { return orderKey(a) < orderKey(b) ? -1 : 1; });
    var map = {}, running = 0;
    chrono.forEach(function (en) {
      running += en.type === "in" ? en.amount : -en.amount;
      map[en.id] = running;
    });
    return map;
  }

  /* ---------------- render: add view ---------------- */
  function renderRecent() {
    if (!isEnterer) return;
    var scoped = entriesForAccount(addAccountId).slice().sort(function (a, b) { return orderKey(a) > orderKey(b) ? -1 : 1; }).slice(0, 5);
    if (!scoped.length) {
      els.recentList.innerHTML = '<p class="recent-empty">Nothing added yet for this account.</p>';
      return;
    }
    els.recentList.innerHTML = scoped.map(function (en) {
      var acct = accountById(en.accountId);
      return '<div class="recent-row" data-id="' + en.id + '">' +
        '<span class="dot" style="background:' + accountColor(en.accountId) + '"></span>' +
        '<span class="meta"><div class="desc' + (en.description ? "" : " placeholder") + '">' + (en.description ? escapeHtml(en.description) : "No description") + '</div>' +
        '<div class="sub">' + fmtDateShort(en.date) + " &middot; " + escapeHtml(en.time) + (acct ? " &middot; " + escapeHtml(acct.name) : "") + '</div></span>' +
        '<span class="amt num ' + (en.type === "in" ? "in" : "out") + '">' + (en.type === "in" ? "+" : "-") + fmtMoney(en.amount).replace("Rs ", "") + '</span>' +
        '<button type="button" class="del" data-id="' + en.id + '" title="Delete" aria-label="Delete">' + ICONS.x + "</button>" +
      "</div>";
    }).join("");
    Array.prototype.forEach.call(els.recentList.querySelectorAll(".del"), function (btn) {
      btn.addEventListener("click", function () { deleteEntry(btn.getAttribute("data-id")); });
    });
  }

  /* ---------------- render: ledger ---------------- */
  function buildPeriodOptions(list) {
    var keys = {};
    list.forEach(function (en) { keys[monthKey(en.date)] = true; });
    keys[monthKey(todayStr())] = true;
    var sorted = Object.keys(keys).sort().reverse();
    var opts = ['<option value="__all__">All time</option>'];
    sorted.forEach(function (k) { opts.push('<option value="' + k + '">' + monthLabel(k) + "</option>"); });
    els.periodSelect.innerHTML = opts.join("");
    if (currentPeriod !== "__all__" && sorted.indexOf(currentPeriod) === -1) currentPeriod = sorted[0];
    els.periodSelect.value = currentPeriod;
  }
  els.periodSelect.addEventListener("change", function () {
    currentPeriod = els.periodSelect.value;
    sessionStorage.setItem("cb-period", currentPeriod);
    renderLedger();
  });

  function renderLedger() {
    renderLedgerAcctPills();
    var scoped = entriesForAccount(ledgerAccountId);
    buildPeriodOptions(scoped);
    var list = currentPeriod === "__all__" ? scoped : scoped.filter(function (en) { return monthKey(en.date) === currentPeriod; });

    var totalIn = 0, totalOut = 0;
    scoped.forEach(function (en) { if (en.type === "in") totalIn += en.amount; else totalOut += en.amount; });
    var balance = ledgerAccountId === "__all__" ? totalBalanceAll() : accountBalance(ledgerAccountId);
    els.ledgerBalanceLabel.textContent = ledgerAccountId === "__all__" ? "Combined balance" : (accountById(ledgerAccountId) ? accountById(ledgerAccountId).name + " balance" : "Balance");
    els.ledgerBalance.textContent = fmtMoney(balance);
    els.ledgerBalance.style.color = balance < 0 ? "var(--critical)" : "var(--accent-strong)";
    els.ledgerIn.textContent = fmtMoney(totalIn);
    els.ledgerOut.textContent = fmtMoney(totalOut);
    els.entryCount.textContent = list.length + (list.length === 1 ? " entry" : " entries");

    if (!list.length) {
      els.ledgerBody.innerHTML = '<div class="empty-state"><div class="big">' + ICONS.list + '</div><h3>No entries yet</h3><p>Entries will show up here, grouped by day, as soon as they\'re added.</p></div>';
      return;
    }
    var balById = runningBalanceMap(list);
    var byDate = {};
    list.forEach(function (en) { (byDate[en.date] = byDate[en.date] || []).push(en); });
    var dateKeys = Object.keys(byDate).sort().reverse();
    var showAcct = ledgerAccountId === "__all__";

    els.ledgerBody.innerHTML = dateKeys.map(function (date) {
      var dayEntries = byDate[date].slice().sort(function (a, b) { return orderKey(a) > orderKey(b) ? -1 : 1; });
      var dayNet = dayEntries.reduce(function (s, en) { return s + (en.type === "in" ? en.amount : -en.amount); }, 0);
      var rows = dayEntries.map(function (en) {
        var acct = accountById(en.accountId);
        return '<div class="tx-row" data-id="' + en.id + '">' +
          '<span class="tx-dot" style="background:' + accountColor(en.accountId) + '"></span>' +
          '<span class="tx-time">' + escapeHtml(en.time) + "</span>" +
          '<span class="tx-meta"><div class="tx-desc' + (en.description ? "" : " placeholder") + '">' + (en.description ? escapeHtml(en.description) : "No description") + '</div>' +
          (showAcct && acct ? '<div class="tx-acct">' + escapeHtml(acct.name) + "</div>" : "") + "</span>" +
          '<span class="tx-amts"><div class="tx-amt num ' + (en.type === "in" ? "in" : "out") + '">' + (en.type === "in" ? "+" : "-") + fmtMoney(en.amount).replace("Rs ", "") + '</div><div class="tx-bal num">' + fmtMoney(balById[en.id]) + "</div></span>" +
          (isEnterer ? '<button type="button" class="tx-del" data-id="' + en.id + '" title="Delete entry" aria-label="Delete entry">' + ICONS.trash + "</button>" : "") +
        "</div>";
      }).join("");
      return '<div class="day-group"><div class="day-head"><span>' + fmtDateLabel(date) + '</span><span class="day-net num" style="color:' +
        (dayNet < 0 ? "var(--critical)" : "var(--text-secondary)") + '">' + fmtMoney(dayNet) + "</span></div>" + rows + "</div>";
    }).join("");

    Array.prototype.forEach.call(els.ledgerBody.querySelectorAll(".tx-del"), function (btn) {
      btn.addEventListener("click", function () { deleteEntry(btn.getAttribute("data-id")); });
    });
  }

  /* ---------------- render: accounts ---------------- */
  function renderAccountsTab() {
    els.totalBalance.textContent = fmtMoney(totalBalanceAll());
    els.totalSub.textContent = accounts.length + (accounts.length === 1 ? " account" : " accounts");
    var thisMonth = monthKey(todayStr());
    els.accountsList.innerHTML = accounts.map(function (a) {
      var accEntries = entriesForAccount(a.id);
      var bal = accountBalance(a.id);
      var monthIn = 0, monthOut = 0;
      accEntries.forEach(function (en) {
        if (monthKey(en.date) !== thisMonth) return;
        if (en.type === "in") monthIn += en.amount; else monthOut += en.amount;
      });
      var canDelete = isEnterer && accEntries.length === 0 && accounts.length > 1;
      var actionsHtml = isEnterer ?
        '<div class="actions">' +
          '<button type="button" class="icon-btn rename-btn" data-id="' + a.id + '">' + ICONS.pencil + " Rename</button>" +
          '<button type="button" class="icon-btn danger delete-btn" data-id="' + a.id + '"' + (canDelete ? "" : " disabled") + ' title="' + (canDelete ? "Delete account" : "Can\'t delete: move or remove its entries first, and keep at least one account") + '">' + ICONS.trash + " Delete</button>" +
        "</div>" +
        '<div class="rename-row" style="display:none;"><input type="text" maxlength="40" value="' + escapeHtml(a.name) + '" /><button type="button" class="icon-btn save-rename" data-id="' + a.id + '">Save</button></div>'
        : "";
      return '<div class="account-card" data-id="' + a.id + '">' +
        '<div class="account-card-top"><span class="dot" style="background:' + accountColor(a.id) + '"></span>' +
        '<span class="name">' + escapeHtml(a.name) + '</span>' +
        '<span class="balance num" style="color:' + (bal < 0 ? "var(--critical)" : "var(--text-primary)") + '">' + fmtMoney(bal) + "</span></div>" +
        '<div class="stats-line"><span>' + accEntries.length + (accEntries.length === 1 ? " entry" : " entries") + '</span><span>This month: <b class="num">+' + fmtMoney(monthIn).replace("Rs ", "") + '</b> / <b class="num">-' + fmtMoney(monthOut).replace("Rs ", "") + "</b></span></div>" +
        actionsHtml +
      "</div>";
    }).join("");

    if (!isEnterer) return;
    Array.prototype.forEach.call(els.accountsList.querySelectorAll(".rename-btn"), function (btn) {
      btn.addEventListener("click", function () {
        var card = btn.closest(".account-card");
        card.querySelector(".rename-row").style.display = "flex";
        card.querySelector(".rename-row input").focus();
      });
    });
    Array.prototype.forEach.call(els.accountsList.querySelectorAll(".save-rename"), function (btn) {
      btn.addEventListener("click", function () {
        var card = btn.closest(".account-card");
        var input = card.querySelector(".rename-row input");
        renameAccount(btn.getAttribute("data-id"), input.value);
      });
    });
    Array.prototype.forEach.call(els.accountsList.querySelectorAll(".delete-btn"), function (btn) {
      btn.addEventListener("click", function () {
        if (btn.disabled) return;
        deleteAccount(btn.getAttribute("data-id"));
      });
    });
  }

  function refreshAccountDependentUI() {
    ensureValidAccountRefs();
    if (isEnterer) renderAddAcctPills();
    var opts = accounts.map(function (a) { return '<option value="' + a.id + '">' + escapeHtml(a.name) + "</option>"; }).join("");
    els.reportAcctSelect.innerHTML = opts;
    if (reportAccountId) els.reportAcctSelect.value = reportAccountId;
    renderAccountsTab();
  }

  function addAccount(name) {
    name = (name || "").trim();
    if (!name) { showToast("Enter an account name."); return; }
    if (accounts.some(function (a) { return a.name.toLowerCase() === name.toLowerCase(); })) {
      showToast("An account named “" + name + "” already exists.");
      return;
    }
    if (accounts.length >= 8) { showToast("You can have up to 8 accounts."); return; }
    els.newAccountInput.value = "";
    showToast("Added account “" + name + "”" + (navigator.onLine ? "" : " (will sync when online)"));
    addDoc(collection(db, "accounts"), { name: name, order: accounts.length, createdAt: serverTimestamp() })
      .catch(function (err) { showToast(friendlyError(err, "Couldn't add the account.")); });
  }
  els.addAccountBtn.addEventListener("click", function () { addAccount(els.newAccountInput.value); });
  els.newAccountInput.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); addAccount(els.newAccountInput.value); } });

  function renameAccount(id, name) {
    name = (name || "").trim();
    if (!accountById(id) || !name) return;
    updateDoc(doc(db, "accounts", id), { name: name })
      .then(function () { showToast("Renamed to “" + name + "”"); })
      .catch(function (err) { showToast(friendlyError(err, "Couldn't rename the account.")); });
  }

  function deleteAccount(id) {
    var accEntries = entriesForAccount(id);
    if (accEntries.length > 0) { showToast("Can't delete — this account has entries."); return; }
    if (accounts.length <= 1) { showToast("You need at least one account."); return; }
    var acct = accountById(id);
    var name = acct ? acct.name : "this account";
    if (!window.confirm("Delete account “" + name + "”? This can't be undone.")) return;
    deleteDoc(doc(db, "accounts", id))
      .then(function () { showToast("Account deleted"); })
      .catch(function (err) { showToast(friendlyError(err, "Couldn't delete the account.")); });
  }

  /* ---------------- reports ---------------- */
  var PRESETS = [
    { id: "this-month", label: "This month" },
    { id: "last-month", label: "Last month" },
    { id: "last-7", label: "Last 7 days" },
    { id: "last-30", label: "Last 30 days" },
    { id: "all-time", label: "All time" },
    { id: "custom", label: "Custom" }
  ];
  function computeRange(preset) {
    var today = todayStr();
    if (preset === "this-month") {
      var d = new Date(); return { from: d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-01", to: today };
    }
    if (preset === "last-month") {
      var d2 = new Date(); d2.setDate(1); d2.setMonth(d2.getMonth() - 1);
      var from = d2.getFullYear() + "-" + pad(d2.getMonth() + 1) + "-01";
      var endD = new Date(d2.getFullYear(), d2.getMonth() + 1, 0);
      var to = endD.getFullYear() + "-" + pad(endD.getMonth() + 1) + "-" + pad(endD.getDate());
      return { from: from, to: to };
    }
    if (preset === "last-7") return { from: addDays(today, -6), to: today };
    if (preset === "last-30") return { from: addDays(today, -29), to: today };
    if (preset === "all-time") return { from: null, to: null };
    return { from: reportFrom, to: reportTo };
  }

  function renderPresetRow() {
    els.presetRow.innerHTML = PRESETS.map(function (p) {
      return '<button type="button" class="preset-pill' + (p.id === reportPreset ? " active" : "") + '" data-preset="' + p.id + '">' + p.label + "</button>";
    }).join("");
  }
  els.presetRow.addEventListener("click", function (e) {
    var btn = e.target.closest(".preset-pill");
    if (!btn) return;
    reportPreset = btn.getAttribute("data-preset");
    renderPresetRow();
    els.customRangeRow.style.display = reportPreset === "custom" ? "grid" : "none";
    if (reportPreset === "custom" && (!reportFrom || !reportTo)) { reportFrom = addDays(todayStr(), -29); reportTo = todayStr(); }
    if (reportPreset === "custom") { els.fromDate.value = reportFrom; els.toDate.value = reportTo; }
    renderReports();
  });
  els.fromDate.addEventListener("change", function () { reportFrom = els.fromDate.value; renderReports(); });
  els.toDate.addEventListener("change", function () { reportTo = els.toDate.value; renderReports(); });
  els.reportAcctSelect.addEventListener("change", function () {
    reportAccountId = els.reportAcctSelect.value;
    setLocal("cb-report-account", reportAccountId);
    renderReports();
  });

  function statementData() {
    var range = reportPreset === "custom" ? { from: reportFrom, to: reportTo } : computeRange(reportPreset);
    var scoped = entriesForAccount(reportAccountId);
    var opening = 0;
    scoped.forEach(function (en) {
      if (range.from && en.date < range.from) opening += en.type === "in" ? en.amount : -en.amount;
    });
    var inRange = scoped.filter(function (en) {
      if (range.from && en.date < range.from) return false;
      if (range.to && en.date > range.to) return false;
      return true;
    }).sort(function (a, b) { return orderKey(a) < orderKey(b) ? -1 : 1; });
    var running = opening;
    var rows = inRange.map(function (en) {
      running += en.type === "in" ? en.amount : -en.amount;
      return { en: en, balance: running };
    });
    var totalIn = 0, totalOut = 0;
    inRange.forEach(function (en) { if (en.type === "in") totalIn += en.amount; else totalOut += en.amount; });
    return { range: range, opening: opening, rows: rows, totalIn: totalIn, totalOut: totalOut, closing: running };
  }

  function periodLabel(range) {
    if (!range.from && !range.to) return "All time";
    return fmtDateLabel(range.from) + " — " + fmtDateLabel(range.to);
  }

  function renderReports() {
    if (!accounts.length) { els.statementArea.innerHTML = ""; return; }
    if (!els.presetRow.children.length) renderPresetRow();
    var acct = accountById(reportAccountId);
    if (!acct) return;
    var data = statementData();
    var html = '<div class="statement-card" id="statementCard">' +
      '<div class="statement-head"><h3>' + escapeHtml(acct.name) + ' statement</h3><div class="period">' + periodLabel(data.range) + '</div></div>' +
      '<div class="statement-summary">' +
        '<div class="sitem"><div class="k">Opening balance</div><div class="v num">' + fmtMoney(data.opening) + '</div></div>' +
        '<div class="sitem"><div class="k">Closing balance</div><div class="v num" style="color:' + (data.closing < 0 ? "var(--critical)" : "var(--text-primary)") + '">' + fmtMoney(data.closing) + '</div></div>' +
        '<div class="sitem"><div class="k">Cash in</div><div class="v num" style="color:var(--good)">' + fmtMoney(data.totalIn) + '</div></div>' +
        '<div class="sitem"><div class="k">Cash out</div><div class="v num" style="color:var(--critical)">' + fmtMoney(data.totalOut) + '</div></div>' +
      '</div>' +
      '<div class="stmt-table">';
    if (!data.rows.length) {
      html += '<div class="stmt-empty">No entries in this period.</div>';
    } else {
      html += data.rows.map(function (r) {
        var en = r.en;
        return '<div class="stmt-row"><span class="d">' + fmtDateShort(en.date) + '</span>' +
          '<span class="desc">' + (en.description ? escapeHtml(en.description) : '<span style="color:var(--text-muted)">—</span>') + '</span>' +
          '<span class="amt ' + (en.type === "in" ? "in" : "out") + ' num">' + (en.type === "in" ? "+" : "-") + fmtMoney(en.amount).replace("Rs ", "") + '</span>' +
          '<span class="bal num">' + fmtMoney(r.balance) + '</span></div>';
      }).join("");
    }
    html += '</div><div class="stmt-actions">' +
      '<button type="button" class="btn-secondary" id="printBtn">' + ICONS.printer + ' Save as PDF</button>' +
      '<button type="button" class="btn-secondary" id="csvBtn">' + ICONS.download + ' Export CSV</button>' +
    '</div></div>';
    els.statementArea.innerHTML = html;
    document.getElementById("printBtn").addEventListener("click", function () { printStatement(acct, data); });
    document.getElementById("csvBtn").addEventListener("click", function () { exportCsv(acct, data); });
  }

  function printStatement(acct, data) {
    var cellBase = "padding:5px 8px;border-bottom:1px solid #ddd;";
    var rowsHtml = data.rows.length ? data.rows.map(function (r) {
      var en = r.en;
      return "<tr><td style='" + cellBase + "'>" + fmtDateShort(en.date) + " " + escapeHtml(en.time) + "</td><td style='" + cellBase + "'>" + (en.description ? escapeHtml(en.description) : "—") +
        "</td><td style='" + cellBase + "text-align:right;'>" + (en.type === "in" ? fmtMoney(en.amount) : "") + "</td><td style='" + cellBase + "text-align:right;'>" + (en.type === "out" ? fmtMoney(en.amount) : "") +
        "</td><td style='" + cellBase + "text-align:right;'>" + fmtMoney(r.balance) + "</td></tr>";
    }).join("") : "<tr><td colspan='5' style='" + cellBase + "text-align:center;color:#888;'>No entries in this period.</td></tr>";
    var now = new Date();
    var genStamp = fmtDateLabel(todayStr()) + " at " + pad(now.getHours()) + ":" + pad(now.getMinutes());
    els.printArea.innerHTML =
      "<div style='font-family:Inter,system-ui,sans-serif;color:#111;max-width:720px;margin:0 auto;'>" +
      "<h1 style='font-size:20px;margin:0 0 2px;'>Cashbook — " + escapeHtml(acct.name) + " statement</h1>" +
      "<div style='font-size:12px;color:#555;margin-bottom:18px;'>" + periodLabel(data.range) + " &middot; Generated " + genStamp + "</div>" +
      "<table style='width:100%;border-collapse:collapse;margin-bottom:18px;font-size:12px;'>" +
      "<tr><td style='padding:6px 10px;background:#f2f1ec;'>Opening balance</td><td style='padding:6px 10px;background:#f2f1ec;text-align:right;'>" + fmtMoney(data.opening) + "</td>" +
      "<td style='padding:6px 10px;background:#f2f1ec;'>Cash in</td><td style='padding:6px 10px;background:#f2f1ec;text-align:right;color:#0ca30c;'>" + fmtMoney(data.totalIn) + "</td></tr>" +
      "<tr><td style='padding:6px 10px;'>Closing balance</td><td style='padding:6px 10px;text-align:right;font-weight:700;'>" + fmtMoney(data.closing) + "</td>" +
      "<td style='padding:6px 10px;'>Cash out</td><td style='padding:6px 10px;text-align:right;color:#d03b3b;'>" + fmtMoney(data.totalOut) + "</td></tr>" +
      "</table>" +
      "<table style='width:100%;border-collapse:collapse;font-size:11.5px;'>" +
      "<thead><tr style='border-bottom:1.5px solid #333;'><th style='text-align:left;padding:6px 8px;'>Date</th><th style='text-align:left;padding:6px 8px;'>Description</th>" +
      "<th style='text-align:right;padding:6px 8px;'>Cash in</th><th style='text-align:right;padding:6px 8px;'>Cash out</th><th style='text-align:right;padding:6px 8px;'>Balance</th></tr></thead>" +
      "<tbody>" + rowsHtml + "</tbody></table>" +
      "<div style='margin-top:18px;font-size:10.5px;color:#888;text-align:center;'>— End of statement — generated with Cashbook —</div>" +
      "</div>";
    setTimeout(function () { window.print(); }, 50);
  }

  function csvEscape(s) {
    s = String(s == null ? "" : s);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function downloadFile(filename, content, mime) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function exportCsv(acct, data) {
    var lines = [["Date", "Time", "Description", "Cash In", "Cash Out", "Balance"].join(",")];
    data.rows.forEach(function (r) {
      var en = r.en;
      lines.push([en.date, en.time, csvEscape(en.description || ""), en.type === "in" ? en.amount.toFixed(2) : "", en.type === "out" ? en.amount.toFixed(2) : "", r.balance.toFixed(2)].join(","));
    });
    var csv = lines.join("\r\n");
    var filenameBase = "cashbook-" + acct.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + todayStr();
    downloadFile(filenameBase + ".csv", csv, "text/csv;charset=utf-8;");
    showToast("Exported " + filenameBase + ".csv");
  }

  /* ---------------- add / delete entries ---------------- */
  function showFormError(msg) { els.formError.textContent = msg; els.formError.classList.add("show"); }
  function clearFormError() { els.formError.classList.remove("show"); }
  function friendlyError(err, fallback) {
    if (err && err.code === "permission-denied") return "You don't have permission to make that change.";
    if (err && err.code === "unavailable") return "You're offline — this will sync once you're back online.";
    return fallback;
  }

  els.addForm.addEventListener("submit", function (e) {
    e.preventDefault();
    clearFormError();
    if (!isEnterer) return;
    var amount = parseFloat(els.amountInput.value);
    if (!amount || amount <= 0 || !isFinite(amount)) { showFormError("Enter an amount greater than 0."); return; }
    if (!addAccountId) { showFormError("Add an account first."); return; }
    var date = els.dateInput.value || todayStr();
    var time = els.timeInput.value || nowTimeStr();
    var payload = {
      accountId: addAccountId, date: date, time: time, type: currentType,
      amount: Math.round(amount * 100) / 100, description: els.descInput.value.trim().slice(0, 120),
      createdAt: serverTimestamp(), createdBy: currentUser ? currentUser.email : null
    };
    currentPeriod = monthKey(date);
    sessionStorage.setItem("cb-period", currentPeriod);
    els.amountInput.value = "";
    els.descInput.value = "";
    els.dateInput.value = todayStr();
    els.timeInput.value = nowTimeStr();
    els.amountInput.focus();
    // Show confirmation immediately rather than waiting on the addDoc()
    // promise — that promise only resolves once the server acknowledges
    // the write, which while offline could be a long time away, even
    // though the entry is already saved locally and visible in the list.
    showToast((payload.type === "in" ? "Added cash in" : "Added cash out") + " · " + fmtMoney(payload.amount) + (navigator.onLine ? "" : " (will sync when online)"));
    addDoc(collection(db, "entries"), payload)
      .catch(function (err) { showToast(friendlyError(err, "Couldn't save that entry.")); });
  });

  function deleteEntry(id) {
    if (!isEnterer) return;
    var en = entries.find(function (x) { return x.id === id; });
    if (!en) return;
    lastDeleted = en;
    deleteDoc(doc(db, "entries", id))
      .then(function () { showToast("Entry deleted", { label: "Undo", onClick: undoDelete }); })
      .catch(function (err) { showToast(friendlyError(err, "Couldn't delete that entry.")); });
  }
  function undoDelete() {
    if (!lastDeleted || !isEnterer) return;
    var en = lastDeleted;
    lastDeleted = null;
    addDoc(collection(db, "entries"), {
      accountId: en.accountId, date: en.date, time: en.time, type: en.type,
      amount: en.amount, description: en.description || "", createdAt: serverTimestamp(),
      createdBy: currentUser ? currentUser.email : null
    }).catch(function () { showToast("Couldn't undo that delete."); });
  }

  /* ---------------- toast ---------------- */
  function showToast(text, action) {
    if (toastTimer) clearTimeout(toastTimer);
    var actionHtml = action ? '<button id="toastAction">' + escapeHtml(action.label) + "</button>" : "";
    els.toastWrap.innerHTML = '<div class="toast" id="toastEl"><span>' + escapeHtml(text) + "</span>" + actionHtml + "</div>";
    var toastEl = document.getElementById("toastEl");
    requestAnimationFrame(function () { toastEl.classList.add("show"); });
    if (action) {
      document.getElementById("toastAction").addEventListener("click", function () { action.onClick(); dismissToast(); });
    }
    toastTimer = setTimeout(dismissToast, 6000);
  }
  function dismissToast() {
    var t = document.getElementById("toastEl");
    if (t) t.classList.remove("show");
    setTimeout(function () { els.toastWrap.innerHTML = ""; }, 200);
  }

  function showBanner(html) { els.banner.innerHTML = html; els.banner.classList.add("show"); }
  function hideBanner() { els.banner.classList.remove("show"); els.banner.innerHTML = ""; }

  /* ---------------- viewer notice ---------------- */
  function renderViewerNotice() {
    if (isEnterer) {
      els.addEditor.classList.remove("hidden");
      els.viewerNotice.classList.add("hidden");
    } else {
      els.addEditor.classList.add("hidden");
      els.viewerNotice.classList.remove("hidden");
      els.viewerNotice.innerHTML = '<div class="big">' + ICONS.eye + '</div><h3>You have view-only access</h3>' +
        '<p>Head to the Ledger tab to see entries, or Reports for statements. Only the account owner can add or edit entries.</p>';
    }
  }

  function renderAll() {
    refreshAccountDependentUI();
    renderViewerNotice();
    renderRecent();
    renderLedger();
    if (document.getElementById("view-reports").classList.contains("active")) renderReports();
  }

  /* ---------------- init ---------------- */
  els.dateInput.value = todayStr();
  els.timeInput.value = nowTimeStr();
  setType(currentType);
})();
