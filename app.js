/* Wiederholung Leistungsfach Sport – Programm für alle Bände.
   Erwartet window.KARTEN_DATEN aus karten_bandN.js. Speichert nur im Browser dieses Geräts (localStorage). */
(function () {
  "use strict";
  var D = window.KARTEN_DATEN;
  var app = document.getElementById("app");
  if (!D || !D.kapitel) {
    app.textContent = "Die Kartendatei konnte nicht geladen werden. Liegt karten_band" +
      (document.body.getAttribute("data-band") || "") + ".js im selben Ordner wie diese Seite?";
    return;
  }
  var KEY = "lksport.band" + D.band;

  /* ---------- Speicher ---------- */
  var mem = { res: {}, own: {}, over: {} }, storeOk = true;
  function load() {
    try {
      var s = window.localStorage.getItem(KEY);
      if (s) { var o = JSON.parse(s); mem.res = o.res || {}; mem.own = o.own || {}; mem.over = o.over || {}; }
    } catch (e) { storeOk = false; }
  }
  function save() {
    try { window.localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { storeOk = false; }
  }
  load();

  /* ---------- Hilfen ---------- */
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function btn(text, cls, fn) { var b = el("button", cls, text); b.type = "button"; b.addEventListener("click", fn); return b; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function leKey(k, le) { return k.nr + "-" + le.id; }
  function hashOf(k, le) { return "k" + k.nr + "-le" + le.id; }
  function find(hashName) {
    var m = /^k(\d+)-le(\d+[a-z]?)(-karten)?$/.exec(hashName || "");
    if (!m) return null;
    for (var i = 0; i < D.kapitel.length; i++) if (String(D.kapitel[i].nr) === m[1])
      for (var j = 0; j < D.kapitel[i].le.length; j++) if (D.kapitel[i].le[j].id === m[2])
        return { k: D.kapitel[i], le: D.kapitel[i].le[j], manage: !!m[3] };
    return null;
  }
  /* Karten einer Lerneinheit, wie sie auf diesem Gerät gelten: Stammkarten mit Änderungen, ohne ausgeblendete, plus eigene */
  function cardsOf(k, le) {
    var out = [];
    le.karten.forEach(function (c) {
      var o = mem.over[c.id];
      if (o && o.del) return;
      out.push(o ? { id: c.id, t: o.t, q: o.q, a: o.a, kind: "changed" } : { id: c.id, t: c.t, q: c.q, a: c.a, kind: "stock" });
    });
    (mem.own[leKey(k, le)] || []).forEach(function (c) { out.push({ id: c.id, t: c.t, q: c.q, a: c.a, kind: "own" }); });
    return out;
  }
  function knownCount(cards) { var n = 0; cards.forEach(function (c) { if (mem.res[c.id] === 1) n++; }); return n; }
  function fillGaps(node, text) {
    var parts = String(text).split("___");
    for (var i = 0; i < parts.length; i++) {
      node.appendChild(document.createTextNode(parts[i]));
      if (i < parts.length - 1) { var g = el("span", "gap"); g.setAttribute("aria-label", "Lücke"); node.appendChild(g); }
    }
  }
  function answerNode(a) {
    var box = el("div", "a");
    if (Array.isArray(a)) { var ol = el("ol"); a.forEach(function (x) { ol.appendChild(el("li", null, x)); }); box.appendChild(ol); }
    else box.textContent = a;
    return box;
  }
  function answerText(a) { return Array.isArray(a) ? a.join("\n") : String(a); }
  function parseAnswer(s) {
    var lines = s.split(/\r?\n/).map(function (x) { return x.trim(); }).filter(Boolean);
    return lines.length > 1 ? lines : (lines[0] || "");
  }
  function theme(node, k) { node.className += " themed"; node.style.setProperty("--ak", k.akzent); node.style.setProperty("--akh", k.hell); }
  function header(kicker, title, sub) {
    var h = el("header");
    h.appendChild(el("div", "kicker", kicker));
    h.appendChild(el("h1", null, title));
    if (sub) h.appendChild(el("p", "sub", sub));
    return h;
  }
  function backLink(text, hash) { var a = el("a", "back", "‹ " + text); a.href = hash; return a; }
  function go(hash) { if (location.hash === "#" + hash) render(); else location.hash = hash; }

  /* ---------- Übersicht ---------- */
  function viewHome() {
    document.title = "Wiederholung Sport Band " + D.band;
    var home = el("a", "back", "‹ Bandauswahl"); home.href = "index.html"; app.appendChild(home);
    app.appendChild(header("Leistungsfach Sport · Wiederholung", "Band " + D.band, "Lerneinheit wählen und mit Karteikarten üben."));
    if (!storeOk) app.appendChild(el("p", "note", "Hinweis: Dieser Browser speichert gerade nichts (privater Modus?). Lernstand und eigene Karten gehen beim Schließen verloren."));
    D.kapitel.forEach(function (k) {
      var sec = el("section", "chapter"); theme(sec, k);
      sec.appendChild(el("div", "num", "Kapitel " + k.nr + " · " + k.jg));
      sec.appendChild(el("h2", null, k.titel));
      var list = el("div", "les");
      k.le.forEach(function (le) {
        var cards = cardsOf(k, le), kn = knownCount(cards);
        var b = el("button", "le"); b.type = "button";
        b.appendChild(el("span", "id", "LE " + le.id));
        b.appendChild(el("span", "ti", le.titel));
        b.appendChild(el("span", "ct" + (cards.length && kn === cards.length ? " done" : ""), kn + " / " + cards.length));
        b.setAttribute("aria-label", "Lerneinheit " + le.id + ", " + le.titel + ", " + kn + " von " + cards.length + " Karten gewusst");
        b.addEventListener("click", function () { go(hashOf(k, le)); });
        list.appendChild(b);
      });
      sec.appendChild(list); app.appendChild(sec);
    });
    var r = el("div", "row"); var v = el("a", "btn", "Eigene Karten sichern · Lehrermodus"); v.href = "#verwalten"; r.appendChild(v); app.appendChild(r);
    app.appendChild(el("footer", null, "Grundlage: Skripte zum Unterricht nach Weineck, Leistungsfach Sport Band " + D.band +
      ". Kartenstand " + D.stand + ". Lernstand und eigene Karten bleiben nur auf diesem Gerät."));
  }

  /* ---------- Training ---------- */
  var T = null; // {key, deck, total, known, flipped, onlyOpen}
  function startTraining(k, le, onlyOpen) {
    var all = cardsOf(k, le);
    var src = onlyOpen ? all.filter(function (c) { return mem.res[c.id] !== 1; }) : all;
    T = { key: leKey(k, le), deck: shuffle(src), total: src.length, known: 0, flipped: false, onlyOpen: !!onlyOpen, all: all.length };
  }
  function viewTrain(k, le) {
    document.title = "LE " + le.id + " · " + le.titel;
    theme(app, k);
    if (!T || T.key !== leKey(k, le)) startTraining(k, le, false);
    app.appendChild(backLink("Band " + D.band, "#"));
    app.appendChild(header("Kapitel " + k.nr + " · Lerneinheit " + le.id, le.titel));

    var chips = el("div", "row chips"); chips.setAttribute("role", "group"); chips.setAttribute("aria-label", "Auswahl");
    var open = cardsOf(k, le).filter(function (c) { return mem.res[c.id] !== 1; }).length;
    var b1 = btn("Alle Karten (" + T.all + ")", null, function () { startTraining(k, le, false); render(); });
    var b2 = btn("Nur offene (" + open + ")", null, function () { startTraining(k, le, true); render(); });
    b1.setAttribute("aria-pressed", String(!T.onlyOpen)); b2.setAttribute("aria-pressed", String(T.onlyOpen));
    chips.appendChild(b1); chips.appendChild(b2); app.appendChild(chips);

    var prog = el("div");
    var meta = el("div", "meta"); meta.appendChild(el("span", null, "Gewusst: " + T.known + " von " + T.total));
    meta.appendChild(el("span", null, "Noch im Stapel: " + T.deck.length)); prog.appendChild(meta);
    var bar = el("div", "bar"); var fill = el("i"); fill.style.width = (T.total ? 100 * T.known / T.total : 0) + "%"; bar.appendChild(fill); prog.appendChild(bar);
    app.appendChild(prog);

    var stage = el("section", "card"); stage.setAttribute("aria-live", "polite");
    var act = el("div", "row grow");
    if (!T.deck.length) {
      stage.appendChild(el("div", "tag", T.total ? "Geschafft" : "Keine Karten"));
      if (T.total) { stage.appendChild(el("div", "big", T.total + " / " + T.total)); stage.appendChild(el("div", "q", "Alle Karten dieser Auswahl gewusst.")); }
      else stage.appendChild(el("div", "q", T.onlyOpen ? "Es sind keine offenen Karten mehr übrig." : "Zu dieser Lerneinheit gibt es noch keine Karten."));
      act.appendChild(btn("Alle Karten von vorn", "primary", function () { startTraining(k, le, false); render(); }));
      act.appendChild(btn("Andere Lerneinheit", null, function () { go(""); }));
    } else {
      var c = T.deck[0];
      var top = el("div", "row"); top.style.justifyContent = "space-between"; top.style.alignItems = "center";
      top.appendChild(el("div", "tag", c.t || ""));
      if (c.kind === "own") top.appendChild(el("span", "badge", "eigene Karte"));
      stage.appendChild(top);
      var q = el("div", "q"); fillGaps(q, c.q); stage.appendChild(q);
      if (T.flipped) {
        stage.appendChild(answerNode(c.a));
        act.appendChild(btn("Nochmal", "no", function () { mem.res[c.id] = 0; save(); T.deck.push(T.deck.shift()); T.flipped = false; render(); }));
        act.appendChild(btn("Gewusst", "yes", function () { mem.res[c.id] = 1; save(); T.deck.shift(); T.known++; T.flipped = false; render(); }));
      } else {
        stage.appendChild(el("div", "hint", "Erst selbst antworten, dann aufdecken."));
        act.appendChild(btn("Antwort zeigen", "primary", function () { T.flipped = true; render(); }));
      }
    }
    app.appendChild(stage); app.appendChild(act);
    var more = el("div", "row"); var m = el("a", "btn small", "Karten bearbeiten · eigene Karte anlegen"); m.href = "#" + hashOf(k, le) + "-karten"; more.appendChild(m); app.appendChild(more);
  }

  /* ---------- Karten bearbeiten ---------- */
  var editing = null; // Karten-ID in Bearbeitung
  function viewManage(k, le) {
    document.title = "Karten bearbeiten · LE " + le.id;
    theme(app, k);
    var key = leKey(k, le), cards = cardsOf(k, le);
    app.appendChild(backLink("Zurück zum Üben", "#" + hashOf(k, le)));
    app.appendChild(header("Karten bearbeiten · LE " + le.id, le.titel, "Änderungen und eigene Karten gelten nur auf diesem Gerät."));

    var cur = null; cards.forEach(function (c) { if (c.id === editing) cur = c; });
    var form = el("form", "panel"); form.setAttribute("novalidate", "novalidate");
    form.appendChild(el("h2", null, cur ? "Karte ändern" : "Neue eigene Karte"));
    function field(id, labelText, node, note) {
      var w = el("div"); var l = el("label", null, labelText); l.setAttribute("for", id); node.id = id; w.appendChild(l); w.appendChild(node);
      if (note) w.appendChild(el("div", "note", note)); form.appendChild(w); return node;
    }
    var fT = field("f-tag", "Abschnitt (freiwillig)", document.createElement("input")); fT.type = "text"; fT.value = cur ? (cur.t || "") : "";
    var fQ = field("f-q", "Frage", document.createElement("textarea"), "Drei Unterstriche ___ erzeugen eine Lücke.");
    fQ.value = cur ? cur.q : "";
    var fA = field("f-a", "Antwort", document.createElement("textarea"), "Mehrere Zeilen werden als nummerierte Liste gezeigt.");
    fA.value = cur ? answerText(cur.a) : "";
    var msg = el("div", "msg"); msg.setAttribute("role", "status"); form.appendChild(msg);
    var fr = el("div", "row");
    var sb = el("button", "primary", cur ? "Änderung speichern" : "Karte anlegen"); sb.type = "submit"; fr.appendChild(sb);
    if (cur) fr.appendChild(btn("Abbrechen", null, function () { editing = null; render(); }));
    form.appendChild(fr);
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var q = fQ.value.trim(), a = parseAnswer(fA.value), t = fT.value.trim();
      if (!q || !(Array.isArray(a) ? a.length : a)) { msg.className = "msg err"; msg.textContent = "Bitte Frage und Antwort ausfüllen."; return; }
      if (cur && cur.kind === "own") {
        mem.own[key].forEach(function (c) { if (c.id === cur.id) { c.q = q; c.a = a; c.t = t; } });
      } else if (cur) {
        mem.over[cur.id] = { q: q, a: a, t: t };
      } else {
        (mem.own[key] = mem.own[key] || []).push({ id: "e" + D.band + "-" + key + "-" + Date.now().toString(36), q: q, a: a, t: t });
      }
      save(); editing = null; T = null; render();
    });
    app.appendChild(form);

    var list = el("section", "panel");
    list.appendChild(el("h2", null, cards.length + " Karten in dieser Lerneinheit"));
    var hidden = le.karten.filter(function (c) { return mem.over[c.id] && mem.over[c.id].del; });
    if (hidden.length) {
      var hr = el("div", "row"); hr.style.alignItems = "center";
      hr.appendChild(el("span", "note", hidden.length + " Karte(n) ausgeblendet."));
      hr.appendChild(btn("Wieder einblenden", "small", function () { hidden.forEach(function (c) { delete mem.over[c.id]; }); save(); T = null; render(); }));
      list.appendChild(hr);
    }
    var box = el("div");
    cards.forEach(function (c) {
      var it = el("div", "item");
      var head = el("div", "row"); head.style.alignItems = "center";
      if (c.t) head.appendChild(el("span", "tag", c.t));
      if (c.kind === "own") head.appendChild(el("span", "badge", "eigene Karte"));
      if (c.kind === "changed") head.appendChild(el("span", "badge", "geändert"));
      it.appendChild(head);
      it.appendChild(el("div", "iq", c.q));
      it.appendChild(el("div", "ia", "→ " + (Array.isArray(c.a) ? c.a.join(" · ") : c.a)));
      var r = el("div", "row");
      r.appendChild(btn("Bearbeiten", "small", function () { editing = c.id; render(); window.scrollTo(0, 0); }));
      if (c.kind === "own") r.appendChild(btn("Löschen", "small", function () {
        mem.own[key] = mem.own[key].filter(function (x) { return x.id !== c.id; }); delete mem.res[c.id]; save(); T = null; render(); }));
      else r.appendChild(btn("Ausblenden", "small", function () { mem.over[c.id] = { del: 1 }; save(); T = null; render(); }));
      if (c.kind === "changed") r.appendChild(btn("Zurücksetzen", "small", function () { delete mem.over[c.id]; save(); T = null; render(); }));
      it.appendChild(r); box.appendChild(it);
    });
    list.appendChild(box); app.appendChild(list);
  }

  /* ---------- Sichern, Einlesen, Lehrermodus ---------- */
  function counts() {
    var own = 0, ch = 0, del = 0, k;
    for (k in mem.own) if (Object.prototype.hasOwnProperty.call(mem.own, k)) own += mem.own[k].length;
    for (k in mem.over) if (Object.prototype.hasOwnProperty.call(mem.over, k)) { if (mem.over[k].del) del++; else ch++; }
    return { own: own, ch: ch, del: del };
  }
  function offer(panel, filename, text, type) {
    var old = panel.querySelector(".out"); if (old) panel.removeChild(old);
    var out = el("div", "out"); out.style.display = "flex"; out.style.flexDirection = "column"; out.style.gap = "8px";
    try {
      var blob = new Blob([text], { type: type + ";charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = el("a", "btn primary", "Datei „" + filename + "“ speichern"); a.href = url; a.setAttribute("download", filename);
      out.appendChild(a);
    } catch (e) { /* kein Download möglich: Text unten kopieren */ }
    out.appendChild(el("div", "note", "Falls kein Download startet: Text unten vollständig kopieren und als „" + filename + "“ speichern."));
    var ta = el("textarea", "code"); ta.value = text; ta.readOnly = true; ta.id = "out-" + filename.replace(/\W/g, "-"); ta.setAttribute("aria-label", "Inhalt von " + filename);
    out.appendChild(ta);
    var st = el("div", "msg"); st.setAttribute("role", "status");
    out.appendChild(btn("Text kopieren", "small", function () {
      ta.focus(); ta.select();
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { st.textContent = "Kopiert."; }, function () { st.textContent = "Bitte von Hand kopieren."; });
        else { document.execCommand("copy"); st.textContent = "Kopiert."; }
      } catch (e) { st.textContent = "Bitte von Hand kopieren."; }
    }));
    out.appendChild(st); panel.appendChild(out);
  }
  function exportStock() {
    var n = 0;
    var data = { band: D.band, titel: D.titel, stand: new Date().toISOString().slice(0, 10), kapitel: D.kapitel.map(function (k) {
      return { nr: k.nr, titel: k.titel, jg: k.jg, akzent: k.akzent, hell: k.hell, le: k.le.map(function (le) {
        return { id: le.id, titel: le.titel, karten: cardsOf(k, le).map(function (c) {
          var id = c.kind === "own" ? "b" + D.band + "k" + k.nr + "le" + le.id + "-x" + (Date.now().toString(36)) + (n++) : c.id;
          return { t: c.t || "", q: c.q, a: c.a, id: id };
        }) };
      }) };
    }) };
    return "/* Karteikarten Leistungsfach Sport, Band " + D.band + ". Diese Datei ersetzen, um Karten für alle zu ändern. */\n" +
      "window.KARTEN_DATEN = " + JSON.stringify(data, null, 1) + ";\n";
  }
  function importBackup(text) {
    var o = JSON.parse(text);
    if (!o || o.typ !== "lksport-sicherung" || o.band !== D.band) throw new Error("falsche Datei");
    var k;
    for (k in o.own) if (Object.prototype.hasOwnProperty.call(o.own, k)) {
      var have = {}; (mem.own[k] = mem.own[k] || []).forEach(function (c) { have[c.id] = 1; });
      o.own[k].forEach(function (c) { if (!have[c.id] && c.q && c.a) mem.own[k].push({ id: String(c.id), q: String(c.q), a: c.a, t: String(c.t || "") }); });
    }
    for (k in o.over) if (Object.prototype.hasOwnProperty.call(o.over, k)) mem.over[k] = o.over[k];
    if (o.res) for (k in o.res) if (Object.prototype.hasOwnProperty.call(o.res, k)) mem.res[k] = o.res[k];
    save();
  }
  function viewAdmin() {
    document.title = "Sichern und Lehrermodus · Band " + D.band;
    app.appendChild(backLink("Band " + D.band, "#"));
    app.appendChild(header("Band " + D.band, "Sichern und Lehrermodus"));
    var n = counts();

    var p1 = el("section", "panel");
    p1.appendChild(el("h2", null, "Eigene Karten sichern"));
    p1.appendChild(el("p", null, "Auf diesem Gerät: " + n.own + " eigene Karten, " + n.ch + " geänderte, " + n.del + " ausgeblendete. " +
      "Sie liegen nur in diesem Browser. Eine Sicherung schützt vor Verlust und bringt sie auf ein anderes Gerät."));
    p1.appendChild(btn("Sicherung erstellen", "primary", function () {
      offer(p1, "meine-karten-band" + D.band + ".json", JSON.stringify({ typ: "lksport-sicherung", band: D.band, datum: new Date().toISOString().slice(0, 10), own: mem.own, over: mem.over, res: mem.res }), "application/json");
    }));
    app.appendChild(p1);

    var p2 = el("section", "panel");
    p2.appendChild(el("h2", null, "Sicherung einlesen"));
    var m2 = el("div", "msg"); m2.setAttribute("role", "status");
    var fi = document.createElement("input"); fi.type = "file"; fi.id = "f-import"; fi.accept = ".json,application/json,text/plain";
    var l = el("label", null, "Datei wählen"); l.setAttribute("for", "f-import"); p2.appendChild(l); p2.appendChild(fi);
    var ta = el("textarea", "code"); ta.id = "f-paste"; var l2 = el("label", null, "oder Text einfügen"); l2.setAttribute("for", "f-paste"); p2.appendChild(l2); p2.appendChild(ta);
    function doImport(text) {
      try { importBackup(text); m2.className = "msg"; m2.textContent = "Eingelesen."; T = null; }
      catch (e) { m2.className = "msg err"; m2.textContent = "Das ist keine Sicherung für Band " + D.band + "."; }
    }
    fi.addEventListener("change", function () {
      if (!fi.files || !fi.files[0]) return;
      var rd = new FileReader(); rd.onload = function () { doImport(String(rd.result)); }; rd.readAsText(fi.files[0]);
    });
    p2.appendChild(btn("Eingefügten Text einlesen", null, function () { doImport(ta.value); }));
    p2.appendChild(m2); app.appendChild(p2);

    var p3 = el("section", "panel");
    p3.appendChild(el("h2", null, "Lernstand zurücksetzen"));
    var m3 = el("div", "msg"); m3.setAttribute("role", "status");
    var armed = false;
    var rb = btn("Alle Karten wieder als offen markieren", null, function () {
      if (!armed) { armed = true; rb.textContent = "Wirklich zurücksetzen? Nochmal tippen."; rb.className = "no"; return; }
      mem.res = {}; save(); T = null; armed = false; rb.textContent = "Alle Karten wieder als offen markieren"; rb.className = ""; m3.textContent = "Zurückgesetzt.";
    });
    p3.appendChild(rb); p3.appendChild(m3); app.appendChild(p3);

    var p4 = el("section", "panel");
    p4.appendChild(el("h2", null, "Lehrermodus: Karten für alle ändern"));
    p4.appendChild(el("p", null, "Die Karten aller Schüler stehen in der Datei karten_band" + D.band + ".js im GitHub-Repository. " +
      "So werden Änderungen für alle wirksam: 1. Karten auf diesem Gerät bearbeiten oder anlegen. 2. Unten die neue Datei erzeugen. " +
      "3. Im Repository die alte Datei durch die neue ersetzen. 4. Danach hier die lokalen Änderungen verwerfen, sonst erscheinen eigene Karten doppelt."));
    p4.appendChild(btn("Neue karten_band" + D.band + ".js erzeugen", "primary", function () {
      offer(p4, "karten_band" + D.band + ".js", exportStock(), "text/javascript");
    }));
    var m4 = el("div", "msg"); m4.setAttribute("role", "status");
    var armed4 = false;
    var db = btn("Lokale Änderungen verwerfen (nach dem Hochladen)", null, function () {
      if (!armed4) { armed4 = true; db.textContent = "Eigene und geänderte Karten auf diesem Gerät löschen? Nochmal tippen."; db.className = "no"; return; }
      mem.own = {}; mem.over = {}; save(); T = null; render();
    });
    p4.appendChild(db); p4.appendChild(m4); app.appendChild(p4);
  }

  /* ---------- Steuerung ---------- */
  function render() {
    app.textContent = ""; app.className = ""; app.removeAttribute("style");
    var name = (location.hash || "").replace(/^#/, "");
    if (name === "verwalten") { viewAdmin(); return; }
    var f = find(name);
    if (!f) { T = null; editing = null; viewHome(); return; }
    if (f.manage) viewManage(f.k, f.le); else { editing = null; viewTrain(f.k, f.le); }
  }
  window.addEventListener("hashchange", function () { render(); window.scrollTo(0, 0); });
  render();
})();
