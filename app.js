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
  /* res: gewusst (1) / nochmal (0) · own: eigene Karten je LE · over: Änderungen an Stammkarten
     sr: Fach und Fälligkeit je Karte (Wiederholung in Abständen) · cfg.sr: Modus an/aus · mix: gewählte LEs fürs gemischte Üben */
  var mem = { res: {}, own: {}, over: {}, sr: {}, cfg: { sr: false }, mix: [], mixMode: "all" }, storeOk = true;
  function load() {
    try {
      var s = window.localStorage.getItem(KEY);
      if (s) {
        var o = JSON.parse(s);
        mem.res = o.res || {}; mem.own = o.own || {}; mem.over = o.over || {};
        mem.sr = o.sr || {}; mem.cfg = o.cfg || { sr: false }; mem.mix = o.mix || []; mem.mixMode = o.mixMode || "all";
      }
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

  /* Alle Lerneinheiten des Bandes und Karten mehrerer Lerneinheiten (mit Herkunft) */
  var ALL = [];
  D.kapitel.forEach(function (k) { k.le.forEach(function (le) { ALL.push({ k: k, le: le }); }); });
  function byKey(key) { for (var i = 0; i < ALL.length; i++) if (leKey(ALL[i].k, ALL[i].le) === key) return ALL[i]; return null; }
  function cardsFrom(sources) {
    var out = [];
    sources.forEach(function (s) { cardsOf(s.k, s.le).forEach(function (c) { c.k = s.k; c.le = s.le; out.push(c); }); });
    return out;
  }

  /* ---------- Wiederholung in Abständen (Lernkartei mit 5 Fächern) ---------- */
  var IV = [0, 1, 3, 7, 21, 60]; // Tage bis zur nächsten Wiederholung nach Fach 1 … 5
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function dayStr(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function today() { return dayStr(new Date()); }
  function inDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return dayStr(d); }
  function isNew(c) { return !mem.sr[c.id]; }
  function isDue(c) { var s = mem.sr[c.id]; return !!s && s.due <= today(); }
  function srKnown(c) { var s = mem.sr[c.id] || { box: 0 }; var b = Math.min(5, (s.box || 0) + 1); mem.sr[c.id] = { box: b, due: inDays(IV[b]) }; }
  function srAgain(c) { mem.sr[c.id] = { box: 0, due: today() }; }
  function dueCount(cards) { var n = 0; cards.forEach(function (c) { if (isDue(c)) n++; }); return n; }

  /* ---------- Übersicht ---------- */
  function viewHome() {
    document.title = "Wiederholung Sport Band " + D.band;
    var home = el("a", "back", "‹ Bandauswahl"); home.href = "index.html"; app.appendChild(home);
    app.appendChild(header("Leistungsfach Sport · Wiederholung", "Band " + D.band, "Lerneinheit wählen und mit Karteikarten üben."));
    if (!storeOk) app.appendChild(el("p", "note", "Hinweis: Dieser Browser speichert gerade nichts (privater Modus?). Lernstand und eigene Karten gehen beim Schließen verloren."));

    var tools = el("section", "panel");
    var tr = el("div", "row grow");
    var mixLink = el("a", "btn primary", "Gemischt üben"); mixLink.href = "#mischen"; tr.appendChild(mixLink);
    tools.appendChild(tr);
    var srRow = el("div", "switchrow");
    var sw = el("button", "switch"); sw.type = "button"; sw.setAttribute("role", "switch"); sw.id = "sw-sr";
    sw.setAttribute("aria-checked", String(!!mem.cfg.sr));
    sw.appendChild(el("span", "knob"));
    sw.addEventListener("click", function () { mem.cfg.sr = !mem.cfg.sr; save(); T = null; render(); });
    var lab = el("label", null, "Wiederholung in Abständen"); lab.setAttribute("for", "sw-sr");
    srRow.appendChild(sw); srRow.appendChild(lab); tools.appendChild(srRow);
    if (mem.cfg.sr) {
      var due = dueCount(cardsFrom(ALL));
      tools.appendChild(el("p", "note", "Gewusste Karten kommen nach 1, 3, 7, 21 und 60 Tagen wieder; bei „Nochmal“ beginnt die Karte von vorn."));
      var dr = el("div", "row grow");
      var dl = el("a", "btn" + (due ? " primary" : ""), due ? "Heute fällig: " + due + " Karten üben" : "Heute ist nichts fällig");
      if (due) dl.href = "#faellig"; else dl.setAttribute("aria-disabled", "true");
      dr.appendChild(dl); tools.appendChild(dr);
    } else {
      tools.appendChild(el("p", "note", "Eingeschaltet kommen gewusste Karten nach und nach in größer werdenden Abständen wieder."));
    }
    app.appendChild(tools);

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
        var ctTxt = kn + " / " + cards.length, dn = mem.cfg.sr ? dueCount(cards) : 0;
        if (dn) ctTxt += " · " + dn + " fällig";
        b.appendChild(el("span", "ct" + (cards.length && kn === cards.length && !dn ? " done" : ""), ctTxt));
        b.setAttribute("aria-label", "Lerneinheit " + le.id + ", " + le.titel + ", " + kn + " von " + cards.length + " Karten gewusst" + (dn ? ", " + dn + " fällig" : ""));
        b.addEventListener("click", function () { go(hashOf(k, le)); });
        list.appendChild(b);
      });
      sec.appendChild(list); app.appendChild(sec);
    });
    var r = el("div", "row"); var v = el("a", "btn", "Eigene Karten sichern · Lehrermodus"); v.href = "#verwalten"; r.appendChild(v); app.appendChild(r);
    app.appendChild(el("footer", null, "Grundlage: Skripte zum Unterricht nach Weineck, Leistungsfach Sport Band " + D.band +
      ". Kartenstand " + D.stand + ". Lernstand und eigene Karten bleiben nur auf diesem Gerät."));
  }

  /* ---------- Training ----------
     Eine Übungsrunde (T) besteht aus Quellen (eine oder mehrere Lerneinheiten) und einem Modus:
     all = alle Karten · open = noch nicht gewusste · due = fällige und neue (nur mit Wiederholung in Abständen)
     dueOnly = nur fällige (Startseite „Heute fällig“). */
  var T = null;
  var MODES = { all: "Alle Karten", open: "Nur offene", due: "Fällig und neu", dueOnly: "Fällig" };
  function pick(cards, mode) {
    if (mode === "open") return cards.filter(function (c) { return mem.res[c.id] !== 1; });
    if (mode === "due") return cards.filter(function (c) { return isDue(c) || isNew(c); });
    if (mode === "dueOnly") return cards.filter(isDue);
    return cards;
  }
  function startTraining(id, sources, mode) {
    var all = cardsFrom(sources), src = pick(all, mode);
    T = { id: id, sources: sources, mode: mode, deck: shuffle(src), total: src.length, known: 0, flipped: false, all: all.length, edit: null };
  }
  function answer(c, ok) {
    mem.res[c.id] = ok ? 1 : 0;
    if (mem.cfg.sr) { if (ok) srKnown(c); else srAgain(c); }
    save();
    if (ok) { T.deck.shift(); T.known++; } else { T.deck.push(T.deck.shift()); }
    T.flipped = false; render();
  }
  /* opts: id, kicker, title, back, backText, sources, modes (erste = Voreinstellung), k (Farbe) */
  function viewTraining(opts) {
    if (opts.k) theme(app, opts.k);
    if (!T || T.id !== opts.id || opts.modes.indexOf(T.mode) < 0) startTraining(opts.id, opts.sources, opts.modes[0]);
    var mixed = opts.sources.length > 1;
    app.appendChild(backLink(opts.backText, opts.back));
    app.appendChild(header(opts.kicker, opts.title));

    var all = cardsFrom(opts.sources);
    if (opts.modes.length > 1) {
      var chips = el("div", "row chips"); chips.setAttribute("role", "group"); chips.setAttribute("aria-label", "Auswahl");
      opts.modes.forEach(function (m) {
        var b = btn(MODES[m] + " (" + pick(all, m).length + ")", null, function () { startTraining(opts.id, opts.sources, m); render(); });
        b.setAttribute("aria-pressed", String(T.mode === m)); chips.appendChild(b);
      });
      app.appendChild(chips);
    }

    var prog = el("div");
    var meta = el("div", "meta"); meta.appendChild(el("span", null, "Gewusst: " + T.known + " von " + T.total));
    meta.appendChild(el("span", null, "Noch im Stapel: " + T.deck.length)); prog.appendChild(meta);
    var bar = el("div", "bar"); var fill = el("i"); fill.style.width = (T.total ? 100 * T.known / T.total : 0) + "%"; bar.appendChild(fill); prog.appendChild(bar);
    app.appendChild(prog);

    /* Bearbeiten direkt auf der Übungsseite */
    if (T.edit) {
      var cur = T.edit === "edit" ? T.deck[0] : null;
      var src = cur || T.deck[0] || { k: opts.sources[0].k, le: opts.sources[0].le };
      app.appendChild(cardForm(src.k, src.le, cur, T.deck.length ? (T.deck[0].t || "") : "", function (res) {
        res.k = src.k; res.le = src.le;
        if (T.edit === "edit") T.deck[0] = res; else { T.deck.push(res); T.total++; T.all++; }
        T.edit = null; render();
      }, function () { T.edit = null; render(); }));
      return;
    }

    var stage = el("section", "card"); stage.setAttribute("aria-live", "polite");
    var act = el("div", "row grow");
    if (!T.deck.length) {
      stage.appendChild(el("div", "tag", T.total ? "Geschafft" : "Keine Karten"));
      if (T.total) { stage.appendChild(el("div", "big", T.total + " / " + T.total)); stage.appendChild(el("div", "q", "Alle Karten dieser Auswahl gewusst.")); }
      else stage.appendChild(el("div", "q", T.mode === "all" ? "Hier gibt es noch keine Karten." : "In dieser Auswahl ist gerade nichts zu üben."));
      act.appendChild(btn("Alle Karten von vorn", "primary", function () { startTraining(opts.id, opts.sources, opts.modes.indexOf("all") >= 0 ? "all" : opts.modes[0]); render(); }));
      act.appendChild(btn("Zur Übersicht", null, function () { go(""); }));
    } else {
      var c = T.deck[0];
      if (mixed) { var card = stage; card.className += " themed"; card.style.setProperty("--ak", c.k.akzent); card.style.setProperty("--akh", c.k.hell); }
      var top = el("div", "row"); top.style.justifyContent = "space-between"; top.style.alignItems = "center";
      top.appendChild(el("div", "tag", (mixed ? "Kap. " + c.k.nr + " · LE " + c.le.id + (c.t ? " · " : "") : "") + (c.t || "")));
      var badges = el("div", "row");
      if (c.kind === "own") badges.appendChild(el("span", "badge", "eigene Karte"));
      if (c.kind === "changed") badges.appendChild(el("span", "badge", "geändert"));
      if (mem.cfg.sr) badges.appendChild(el("span", "badge", isNew(c) ? "neu" : "Fach " + (mem.sr[c.id].box || 0)));
      top.appendChild(badges); stage.appendChild(top);
      var q = el("div", "q"); fillGaps(q, c.q); stage.appendChild(q);
      if (T.flipped) {
        stage.appendChild(answerNode(c.a));
        act.appendChild(btn("Nochmal", "no", function () { answer(c, false); }));
        act.appendChild(btn("Gewusst", "yes", function () { answer(c, true); }));
      } else {
        stage.appendChild(el("div", "hint", "Erst selbst antworten, dann aufdecken."));
        act.appendChild(btn("Antwort zeigen", "primary", function () { T.flipped = true; render(); }));
      }
    }
    app.appendChild(stage); app.appendChild(act);
    var more = el("div", "row");
    if (T.deck.length) more.appendChild(btn("Diese Karte bearbeiten", "small", function () { T.edit = "edit"; render(); window.scrollTo(0, 0); }));
    more.appendChild(btn("Neue Karte", "small", function () { T.edit = "new"; render(); window.scrollTo(0, 0); }));
    var lk = T.deck.length ? T.deck[0] : (opts.sources.length === 1 ? opts.sources[0] : null);
    if (lk) { var m = el("a", "btn small", "Alle Karten von LE " + lk.le.id); m.href = "#" + hashOf(lk.k, lk.le) + "-karten"; more.appendChild(m); }
    app.appendChild(more);
  }
  function viewTrain(k, le) {
    document.title = "LE " + le.id + " · " + le.titel;
    viewTraining({ id: "le:" + leKey(k, le), kicker: "Kapitel " + k.nr + " · Lerneinheit " + le.id, title: le.titel,
      back: "#", backText: "Band " + D.band, sources: [{ k: k, le: le }], k: k,
      modes: mem.cfg.sr ? ["due", "all", "open"] : ["all", "open"] });
  }
  function viewDue() {
    document.title = "Heute fällig · Band " + D.band;
    viewTraining({ id: "faellig", kicker: "Wiederholung in Abständen", title: "Heute fällige Karten",
      back: "#", backText: "Band " + D.band, sources: ALL, modes: ["dueOnly"] });
  }

  /* ---------- Gemischt üben: Auswahl ---------- */
  function mixSources() { return mem.mix.map(byKey).filter(Boolean); }
  function viewMixSetup() {
    document.title = "Gemischt üben · Band " + D.band;
    app.appendChild(backLink("Band " + D.band, "#"));
    app.appendChild(header("Band " + D.band, "Gemischt üben", "Lerneinheiten auswählen – die Karten werden gemischt abgefragt."));
    var sel = {}; mem.mix.forEach(function (x) { sel[x] = 1; });
    function store() { mem.mix = ALL.map(function (s) { return leKey(s.k, s.le); }).filter(function (x) { return sel[x]; }); save(); render(); }

    var startP = el("section", "panel");
    var srcs = mixSources(), all = cardsFrom(srcs);
    var modes = mem.cfg.sr ? ["all", "open", "due"] : ["all", "open"];
    if (modes.indexOf(mem.mixMode) < 0) mem.mixMode = "all";
    var chips = el("div", "row chips"); chips.setAttribute("role", "group"); chips.setAttribute("aria-label", "Welche Karten");
    modes.forEach(function (m) {
      var b = btn(MODES[m] + " (" + pick(all, m).length + ")", null, function () { mem.mixMode = m; save(); render(); });
      b.setAttribute("aria-pressed", String(mem.mixMode === m)); chips.appendChild(b);
    });
    startP.appendChild(el("p", null, srcs.length ? srcs.length + " Lerneinheiten ausgewählt." : "Noch keine Lerneinheit ausgewählt."));
    startP.appendChild(chips);
    var n = pick(all, mem.mixMode).length;
    var go1 = btn(n ? "Gemischt üben (" + n + " Karten)" : "Bitte Lerneinheiten auswählen", n ? "primary" : null, function () {
      if (!n) return; T = null; go("mischen-los");
    });
    if (!n) go1.setAttribute("aria-disabled", "true");
    var r0 = el("div", "row grow"); r0.appendChild(go1); startP.appendChild(r0);
    app.appendChild(startP);

    D.kapitel.forEach(function (k) {
      var sec = el("section", "chapter"); theme(sec, k);
      var keys = k.le.map(function (le) { return leKey(k, le); });
      var allOn = keys.every(function (x) { return sel[x]; });
      var hr = el("div", "row"); hr.style.alignItems = "center"; hr.style.justifyContent = "space-between";
      var hw = el("div"); hw.appendChild(el("div", "num", "Kapitel " + k.nr + " · " + k.jg)); hw.appendChild(el("h2", null, k.titel));
      hr.appendChild(hw);
      hr.appendChild(btn(allOn ? "Kapitel abwählen" : "Ganzes Kapitel", "small", function () { keys.forEach(function (x) { if (allOn) delete sel[x]; else sel[x] = 1; }); store(); }));
      sec.appendChild(hr);
      var list = el("div", "les");
      k.le.forEach(function (le) {
        var key = leKey(k, le), id = "mx-" + key.replace(/\W/g, "-");
        var row = el("label", "check"); row.setAttribute("for", id);
        var cb = document.createElement("input"); cb.type = "checkbox"; cb.id = id; cb.checked = !!sel[key];
        cb.addEventListener("change", function () { if (cb.checked) sel[key] = 1; else delete sel[key]; store(); });
        row.appendChild(cb); row.appendChild(el("span", "id", "LE " + le.id)); row.appendChild(el("span", "ti", le.titel));
        row.appendChild(el("span", "ct", String(cardsOf(k, le).length)));
        list.appendChild(row);
      });
      sec.appendChild(list); app.appendChild(sec);
    });
  }
  function viewMixGo() {
    var srcs = mixSources();
    if (!srcs.length) { go("mischen"); return; }
    document.title = "Gemischt üben · Band " + D.band;
    var modes = [mem.mixMode].concat(["all", "open", "due"].filter(function (m) { return m !== mem.mixMode && (m !== "due" || mem.cfg.sr); }));
    viewTraining({ id: "mix:" + mem.mix.join(","), kicker: "Gemischt üben · " + srcs.length + " Lerneinheiten",
      title: D.kapitel.map(function (k) {
        var les = srcs.filter(function (s) { return s.k === k; });
        if (!les.length) return null;
        return les.length === k.le.length ? "Kapitel " + k.nr : "Kap. " + k.nr + ": LE " + les.map(function (s) { return s.le.id; }).join(", ");
      }).filter(Boolean).join(" · "),
      back: "#mischen", backText: "Auswahl ändern", sources: srcs, modes: modes });
  }

  /* ---------- Karten bearbeiten ---------- */
  var editing = null; // Karten-ID in Bearbeitung (Verwaltungsseite)

  /* Formular für eine Karte. cur = Karte, die geändert wird, oder null für eine neue eigene Karte.
     defTag = vorgeschlagener Abschnitt für neue Karten. onSaved(karte) wird nach dem Speichern aufgerufen. */
  function cardForm(k, le, cur, defTag, onSaved, onCancel) {
    var key = leKey(k, le);
    var form = el("form", "panel"); form.setAttribute("novalidate", "novalidate");
    form.appendChild(el("h2", null, cur ? "Karte ändern" : "Neue eigene Karte · LE " + le.id));
    if (cur && cur.kind !== "own") form.appendChild(el("div", "note", "Die Änderung gilt nur auf diesem Gerät. „Zurücksetzen“ in der Kartenliste stellt die Originalkarte wieder her."));
    function field(id, labelText, node, note) {
      var w = el("div"); var l = el("label", null, labelText); l.setAttribute("for", id); node.id = id; w.appendChild(l); w.appendChild(node);
      if (note) w.appendChild(el("div", "note", note)); form.appendChild(w); return node;
    }
    var fQ = field("f-q", "Frage", document.createElement("textarea"), "Drei Unterstriche ___ erzeugen eine Lücke.");
    fQ.value = cur ? cur.q : "";
    var fA = field("f-a", "Antwort", document.createElement("textarea"), "Mehrere Antworten in mehrere Zeilen schreiben – sie werden als nummerierte Liste gezeigt.");
    fA.value = cur ? answerText(cur.a) : "";
    var fT = field("f-tag", "Abschnitt (freiwillig)", document.createElement("input")); fT.type = "text";
    fT.value = cur ? (cur.t || "") : (defTag || "");
    var msg = el("div", "msg"); msg.setAttribute("role", "status"); form.appendChild(msg);
    var fr = el("div", "row grow");
    var sb = el("button", "primary", cur ? "Änderung speichern" : "Karte anlegen"); sb.type = "submit"; fr.appendChild(sb);
    if (onCancel) fr.appendChild(btn("Abbrechen", null, onCancel));
    form.appendChild(fr);
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var q = fQ.value.trim(), a = parseAnswer(fA.value), t = fT.value.trim(), res;
      if (!q || !(Array.isArray(a) ? a.length : a)) { msg.className = "msg err"; msg.textContent = "Bitte Frage und Antwort ausfüllen."; return; }
      if (cur && cur.kind === "own") {
        mem.own[key].forEach(function (c) { if (c.id === cur.id) { c.q = q; c.a = a; c.t = t; } });
        res = { id: cur.id, q: q, a: a, t: t, kind: "own" };
      } else if (cur) {
        mem.over[cur.id] = { q: q, a: a, t: t };
        res = { id: cur.id, q: q, a: a, t: t, kind: "changed" };
      } else {
        res = { id: "e" + D.band + "-" + key + "-" + Date.now().toString(36), q: q, a: a, t: t };
        (mem.own[key] = mem.own[key] || []).push({ id: res.id, q: q, a: a, t: t });
        res.kind = "own";
      }
      save(); onSaved(res);
    });
    function grow(ta) { ta.style.height = "auto"; ta.style.height = (ta.scrollHeight + 4) + "px"; }
    [fQ, fA].forEach(function (ta) { ta.addEventListener("input", function () { grow(ta); }); });
    setTimeout(function () { grow(fQ); grow(fA); try { fQ.focus({ preventScroll: true }); } catch (e) {} }, 0);
    return form;
  }
  function viewManage(k, le) {
    document.title = "Karten bearbeiten · LE " + le.id;
    theme(app, k);
    var key = leKey(k, le), cards = cardsOf(k, le);
    app.appendChild(backLink("Zurück zum Üben", "#" + hashOf(k, le)));
    app.appendChild(header("Karten bearbeiten · LE " + le.id, le.titel, "Änderungen und eigene Karten gelten nur auf diesem Gerät."));

    var cur = null; cards.forEach(function (c) { if (c.id === editing) cur = c; });
    app.appendChild(cardForm(k, le, cur, null, function () { editing = null; T = null; render(); },
      cur ? function () { editing = null; render(); } : null));

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
    if (o.sr) for (k in o.sr) if (Object.prototype.hasOwnProperty.call(o.sr, k)) mem.sr[k] = o.sr[k];
    if (o.cfg && typeof o.cfg.sr === "boolean") mem.cfg.sr = o.cfg.sr;
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
      offer(p1, "meine-karten-band" + D.band + ".json", JSON.stringify({ typ: "lksport-sicherung", band: D.band, datum: new Date().toISOString().slice(0, 10), own: mem.own, over: mem.over, res: mem.res, sr: mem.sr, cfg: mem.cfg }), "application/json");
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
      mem.res = {}; mem.sr = {}; save(); T = null; armed = false; rb.textContent = "Alle Karten wieder als offen markieren"; rb.className = ""; m3.textContent = "Zurückgesetzt.";
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
    if (name === "mischen") { viewMixSetup(); return; }
    if (name === "mischen-los") { viewMixGo(); return; }
    if (name === "faellig") { if (mem.cfg.sr) viewDue(); else viewHome(); return; }
    var f = find(name);
    if (!f) { T = null; editing = null; viewHome(); return; }
    if (f.manage) viewManage(f.k, f.le); else { editing = null; viewTrain(f.k, f.le); }
  }
  window.addEventListener("hashchange", function () { render(); window.scrollTo(0, 0); });
  render();
})();
