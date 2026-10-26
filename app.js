/* Label Maker — every label is absolutely positioned in mm on a page sized with @page (margin 0). */
(function () {
  "use strict";
  var $ = S3.$, $$ = S3.$$;

  var PAPER = { A4: [210, 297], Letter: [215.9, 279.4] };
  var PRESETS = [
    { id: "a4-21", name: "A4 · 21 labels, 3 × 7 · 63.5 × 38.1 mm (L7160 size)", paper: "A4", cols: 3, rows: 7, w: 63.5, h: 38.1, top: 15.15, left: 7.21, gx: 2.54, gy: 0 },
    { id: "a4-24", name: "A4 · 24 labels, 3 × 8 · 63.5 × 33.9 mm (L7159 size)", paper: "A4", cols: 3, rows: 8, w: 63.5, h: 33.9, top: 12.9, left: 7.21, gx: 2.54, gy: 0 },
    { id: "a4-14", name: "A4 · 14 labels, 2 × 7 · 99.1 × 38.1 mm (L7163 size)", paper: "A4", cols: 2, rows: 7, w: 99.1, h: 38.1, top: 15.15, left: 4.65, gx: 2.5, gy: 0 },
    { id: "a4-40", name: "A4 · 40 labels, 4 × 10 · 45.7 × 25.4 mm (L7654 size)", paper: "A4", cols: 4, rows: 10, w: 45.7, h: 25.4, top: 21.5, left: 9.7, gx: 2.6, gy: 0 },
    { id: "a4-65", name: "A4 · 65 labels, 5 × 13 · 38.1 × 21.2 mm (L7651 size)", paper: "A4", cols: 5, rows: 13, w: 38.1, h: 21.2, top: 10.7, left: 4.75, gx: 2.5, gy: 0 },
    { id: "lt-30", name: "Letter · 30 labels, 3 × 10 · 2⅝ × 1 in (5160 size)", paper: "Letter", cols: 3, rows: 10, w: 66.675, h: 25.4, top: 12.7, left: 4.7625, gx: 3.175, gy: 0 },
    { id: "lt-10", name: "Letter · 10 labels, 2 × 5 · 4 × 2 in (5163 size)", paper: "Letter", cols: 2, rows: 5, w: 101.6, h: 50.8, top: 12.7, left: 3.96875, gx: 4.7625, gy: 0 },
    { id: "lt-80", name: "Letter · 80 labels, 4 × 20 · 1¾ × ½ in (5167 size)", paper: "Letter", cols: 4, rows: 20, w: 44.45, h: 12.7, top: 12.7, left: 7.62, gx: 7.62, gy: 0 },
    { id: "custom", name: "Custom (enter mm)…" }
  ];
  var FONTS = { sans: 'Inter, "Segoe UI", Tahoma, "Noto Sans Arabic", Arial, sans-serif', serif: 'Georgia, "Times New Roman", "Noto Naskh Arabic", serif', mono: 'ui-monospace, Consolas, "Courier New", monospace' };
  var MAX_LABELS = 3000;

  // ---------- pure logic (tested) ----------
  function sheetOf(s) {
    if (s.preset !== "custom") return PRESETS.filter(function (p) { return p.id === s.preset; })[0] || PRESETS[0];
    var c = s.custom; return { id: "custom", paper: c.paper, cols: c.cols | 0 || 1, rows: c.rows | 0 || 1, w: +c.w, h: +c.h, top: +c.top, left: +c.left, gx: +c.gx, gy: +c.gy };
  }
  function pos(S, i, nx, ny) {
    var per = S.cols * S.rows, k = i % per, r = Math.floor(k / S.cols), c = k % S.cols;
    return { page: Math.floor(i / per), x: S.left + c * (S.w + S.gx) + (nx || 0), y: S.top + r * (S.h + S.gy) + (ny || 0) };
  }
  function fits(S) {
    var P = PAPER[S.paper] || PAPER.A4;
    return { right: S.left + S.cols * S.w + (S.cols - 1) * S.gx, bottom: S.top + S.rows * S.h + (S.rows - 1) * S.gy, W: P[0], H: P[1] };
  }
  function blocks(text) { return String(text || "").replace(/\r/g, "").split(/\n[ \t]*\n/).map(function (b) { return b.replace(/^\n+|\s+$/g, ""); }).filter(function (b) { return b.trim(); }); }
  function parseCSV(text) {
    text = String(text || "").replace(/^﻿/, "");
    var first = text.split("\n")[0], delim = [",", ";", "\t"].map(function (d) { return [d, first.split(d).length]; }).sort(function (a, b) { return b[1] - a[1]; })[0][0];
    var rows = [], row = [], f = "", q = false, i, ch;
    for (i = 0; i < text.length; i++) {
      ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
      else if (ch === '"' && f === "") q = true;
      else if (ch === delim) { row.push(f); f = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
      else f += ch;
    }
    if (f !== "" || row.length) { row.push(f); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return c.trim(); }); });
  }
  function fill(tpl, head, row) {
    if (!tpl.trim()) return row.map(function (c) { return c.trim(); }).filter(Boolean).join("\n");
    return tpl.replace(/\{([^{}]+)\}/g, function (m, k) {
      var n = /^\d+$/.test(k) ? +k - 1 : head.map(function (h) { return h.trim().toLowerCase(); }).indexOf(k.trim().toLowerCase());
      return n >= 0 && n < row.length ? row[n].trim() : "";
    }).split("\n").map(function (l) { return l.trim(); }).filter(Boolean).join("\n");
  }
  function labelsOf(s) {
    var out = [];
    if (s.mode === "same") { var t = String(s.text || "").trim(); if (t) for (var i = 0; i < Math.min(MAX_LABELS, Math.max(1, s.count | 0)); i++) out.push(t); return out; }
    if (s.mode === "csv") {
      var rows = parseCSV(s.text), head = s.header && rows.length ? rows.shift() : [];
      rows.forEach(function (r) { var v = fill(s.tpl || "", head, r); if (v) out.push(v); });
    } else out = blocks(s.text);
    var cp = Math.max(1, Math.min(100, s.copies | 0)), res = [];
    out.forEach(function (l) { for (var j = 0; j < cp && res.length < MAX_LABELS; j++) res.push(l); });
    return res;
  }

  // ---------- state ----------
  var DEF = { mode: "list", text: "", tpl: "", header: true, count: 21, copies: 1, preset: "a4-21", start: 0, size: 11, font: "sans", align: "center", valign: "middle",
    bold: true, fit: true, border: false, pad: 3, nx: 0, ny: 0,
    custom: { paper: "A4", cols: 3, rows: 7, w: 63.5, h: 38.1, top: 15.15, left: 7.21, gx: 2.54, gy: 0 } };
  var saved = S3.store("lm.settings") || {};
  var st = Object.assign({}, DEF, saved, { custom: Object.assign({}, DEF.custom, saved.custom || {}) });
  function persist() { S3.store("lm.settings", st); }

  // ---------- rendering ----------
  function pageEl(S) {
    var P = PAPER[S.paper] || PAPER.A4;
    return S3.h("div", { "class": "lm-page", style: "width:" + P[0] + "mm;height:" + (P[1] - 0.4) + "mm" });
  }
  function build(target, labels, S) {
    target.textContent = "";
    var per = S.cols * S.rows, start = Math.min(st.start, per - 1), total = labels.length + start, pages = Math.max(1, Math.ceil(total / per));
    var els = [], fam = FONTS[st.font] || FONTS.sans;
    for (var p = 0; p < pages; p++) {
      var page = pageEl(S);
      for (var k = 0; k < per; k++) {
        var i = p * per + k, at = pos(S, i, st.nx, st.ny), lab = labels[i - start];
        var used = i < start, empty = !used && lab == null;
        var box = S3.h("div", { "class": "lm-label" + (st.border ? " bordered" : "") + (used ? " used" : "") + (empty ? " empty" : ""),
          style: "left:" + at.x + "mm;top:" + at.y + "mm;width:" + S.w + "mm;height:" + S.h + "mm;padding:" + st.pad + "mm;" +
            "justify-content:" + (st.valign === "top" ? "flex-start" : "center") + ";text-align:" + st.align + ";font-family:" + fam + ";font-size:" + st.size + "pt" });
        if (lab != null && !used) {
          var inner = S3.h("div", { "class": "lm-text" + (st.bold ? " b1" : "") });
          lab.split("\n").forEach(function (line) { inner.appendChild(S3.h("div", { dir: "auto", text: line || " " })); });
          box.appendChild(inner); els.push(box);
        }
        page.appendChild(box);
      }
      target.appendChild(page);
    }
    return { pages: pages, els: els };
  }
  // Shrink a label's font until its text fits (measured on the visible preview, then cloned for print).
  function shrink(els) {
    if (!st.fit) return 0;
    var n = 0, padPx = st.pad * 96 / 25.4;
    els.forEach(function (box) {
      var size = st.size, inner = box.firstChild;
      while ((inner.scrollHeight > box.clientHeight - 2 * padPx + 0.5 || inner.scrollWidth > inner.clientWidth + 0.5) && size > 5) {
        size -= 0.5; box.style.fontSize = size + "pt";
      }
      if (size < st.size) n++;
    });
    return n;
  }

  var pageStyle = document.head.appendChild(S3.h("style", { id: "lmPage" }));
  var status = $("#status");
  function fitPreview() {
    var first = $("#preview .lm-page"); if (!first) return;
    var w = $("#stage").clientWidth - 28, z = Math.min(1, w / (parseFloat(first.style.width) * 96 / 25.4));
    $("#preview").style.zoom = String(z);
  }
  function render() {
    persist();
    var S = sheetOf(st), F = fits(S), labels = labelsOf(st);
    $("#custom").hidden = st.preset !== "custom";
    $("#csvOpts").hidden = st.mode !== "csv";
    $("#countWrap").hidden = st.mode !== "same";
    $("#textLabel").textContent = st.mode === "list" ? "One label per block, blank line between labels" : st.mode === "csv" ? "Paste CSV (or cells copied from a spreadsheet)" : "Label text";
    if (st.mode === "csv") {
      var rows = parseCSV(st.text);
      $("#cols").textContent = rows.length && st.header ? "Columns: " + rows[0].map(function (h, i) { return "{" + (h.trim() || i + 1) + "}"; }).join(" ") : rows.length ? "Use {1}, {2}, … for columns." : "";
    }
    drawPicker(S);
    pageStyle.textContent = "@page { size: " + (S.paper === "Letter" ? "letter" : "A4") + " portrait; margin: 0; }";
    var preview = $("#preview");
    preview.style.zoom = "1";
    var r = build(preview, labels, S);
    var shrunk = shrink(r.els);
    $("#sheet").textContent = "";
    $$(".lm-page", preview).forEach(function (pg) { $("#sheet").appendChild(pg.cloneNode(true)); });
    fitPreview();
    var bad = S.w <= 0 || S.h <= 0 || F.right > F.W + 0.01 || F.bottom > F.H + 0.01;
    if (bad) { status.className = "chip bad"; status.textContent = "Labels run off the page (" + F.right.toFixed(1) + " × " + F.bottom.toFixed(1) + " mm)"; }
    else if (!labels.length) { status.className = "chip"; status.textContent = "Add some label text"; }
    else {
      status.className = "chip ok";
      status.textContent = labels.length + " label" + (labels.length > 1 ? "s" : "") + " · " + r.pages + " sheet" + (r.pages > 1 ? "s" : "") + (shrunk ? " · " + shrunk + " shrunk to fit" : "");
    }
    return { labels: labels, pages: r.pages, S: S };
  }
  var queue = S3.debounce(render, 150);

  function drawPicker(S) {
    var pk = $("#picker"), per = S.cols * S.rows;
    if (st.start >= per) st.start = 0;
    pk.textContent = "";
    pk.style.gridTemplateColumns = "repeat(" + S.cols + ", minmax(0, 1fr))";
    pk.style.aspectRatio = String((S.cols * S.w) / (S.rows * S.h));
    for (var i = 0; i < per; i++) {
      var b = S3.h("button", { type: "button", "class": i < st.start ? "used" : i === st.start ? "start" : "", "data-i": i, title: "Start at label " + (i + 1), "aria-label": "Start at label " + (i + 1), "aria-pressed": String(i === st.start) });
      pk.appendChild(b);
    }
    $("#startNo").textContent = String(st.start + 1);
  }
  $("#picker").addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; st.start = +b.dataset.i; render(); });

  // ---------- wiring ----------
  function seg(el, value, onPick) {
    $$("button", el).forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.v === String(value)));
      b.addEventListener("click", function () { $$("button", el).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); onPick(b.dataset.v); });
    });
  }
  PRESETS.forEach(function (p) { $("#preset").appendChild(S3.h("option", { value: p.id, text: p.name })); });
  [6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 36, 48].forEach(function (n) { $("#size").appendChild(S3.h("option", { value: n, text: n + " pt" })); });
  $("#preset").value = st.preset;
  $("#preset").addEventListener("change", function () {
    var old = sheetOf(st);
    st.preset = this.value;
    if (st.preset === "custom" && old.id !== "custom") { st.custom = { paper: old.paper, cols: old.cols, rows: old.rows, w: old.w, h: old.h, top: old.top, left: old.left, gx: old.gx, gy: old.gy }; syncCustom(); }
    st.start = 0; render();
  });
  var CUST = { cPaper: "paper", cCols: "cols", cRows: "rows", cW: "w", cH: "h", cTop: "top", cLeft: "left", cGx: "gx", cGy: "gy" };
  function syncCustom() { Object.keys(CUST).forEach(function (id) { $("#" + id).value = st.custom[CUST[id]]; }); }
  syncCustom();
  Object.keys(CUST).forEach(function (id) {
    $("#" + id).addEventListener(id === "cPaper" ? "change" : "input", function () {
      var v = id === "cPaper" ? this.value : parseFloat(this.value);
      if (id === "cPaper" || isFinite(v)) { st.custom[CUST[id]] = id === "cCols" || id === "cRows" ? Math.max(1, Math.round(v)) : v; queue(); }
    });
  });
  ["text", "tpl"].forEach(function (k) { $("#" + k).value = st[k]; $("#" + k).addEventListener("input", function () { st[k] = this.value; queue(); }); });
  [["count", 1, MAX_LABELS], ["copies", 1, 100], ["pad", 0, 15], ["nx", -15, 15], ["ny", -15, 15]].forEach(function (p) {
    $("#" + p[0]).value = st[p[0]];
    $("#" + p[0]).addEventListener("input", function () { var v = parseFloat(this.value); if (isFinite(v)) { st[p[0]] = Math.max(p[1], Math.min(p[2], v)); queue(); } });
  });
  ["header", "bold", "fit", "border"].forEach(function (k) { $("#" + k).checked = st[k]; $("#" + k).addEventListener("change", function () { st[k] = this.checked; render(); }); });
  ["size", "font"].forEach(function (k) { $("#" + k).value = String(st[k]); $("#" + k).addEventListener("change", function () { st[k] = k === "size" ? +this.value : this.value; render(); }); });
  seg($("#mode"), st.mode, function (v) { st.mode = v; render(); });
  seg($("#align"), st.align, function (v) { st.align = v; render(); });
  seg($("#valign"), st.valign, function (v) { st.valign = v; render(); });

  var SAMPLES = {
    list: "Lina Haddad\n12 Rainbow Street\nAmman 11181\nJordan\n\nOmar Saleh\n4 Garden Lane\nIrbid 21110\nJordan\n\nSara Nasser\nFlat 3, 21 Mecca Street\nAmman 11185\nJordan\n\nمحمد الخطيب\nشارع الجامعة ١٥\nإربد\nالأردن\n\nYousef Abu Zaid\nP.O. Box 1201\nAqaba 77110\nJordan",
    csv: "Name,Street,City,Postcode,Country\nLina Haddad,12 Rainbow Street,Amman,11181,Jordan\nOmar Saleh,4 Garden Lane,Irbid,21110,Jordan\n\"Nasser, Sara\",\"Flat 3, 21 Mecca Street\",Amman,11185,Jordan",
    same: "Homemade Fig Jam\n250 g · Best before 03/2027\nfrom Grandma's kitchen"
  };
  $("#sample").addEventListener("click", function () { st.text = SAMPLES[st.mode]; if (st.mode === "csv") { st.tpl = "{Name}\n{Street}\n{City} {Postcode}\n{Country}"; $("#tpl").value = st.tpl; } $("#text").value = st.text; render(); });
  $("#open input").addEventListener("change", function (e) {
    var f = e.target.files[0]; if (!f) return;
    S3.readFile(f, "text").then(function (t) {
      st.text = t; $("#text").value = t;
      if (/\.(csv|tsv)$/i.test(f.name) && st.mode !== "csv") $("#mode button[data-v=csv]").click(); else render();
    });
    e.target.value = "";
  });
  $("#print").addEventListener("click", function () {
    var r = render();
    if (!r.labels.length) { S3.toast("Add some label text first", "error"); $("#text").focus(); return; }
    window.print(); S3.done();
  });
  window.addEventListener("resize", S3.debounce(fitPreview, 100));
  render();

  window.S3_DEMO = function () {
    Object.assign(st, { mode: "list", text: SAMPLES.list, preset: "a4-21", start: 2, copies: 1, size: 11, align: "center", valign: "middle", bold: true, border: true });
    $("#text").value = st.text; $("#preset").value = st.preset; $("#border").checked = true;
    $$("#mode button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.v === "list")); });
    render();
  };

  window.S3_SELFTEST = function () {
    var S = sheetOf({ preset: "a4-21" });
    function near(a, b) { return Math.abs(a - b) < 1e-9; }
    var p0 = pos(S, 0), p2 = pos(S, 2), p3 = pos(S, 3), p20 = pos(S, 20), p21 = pos(S, 21), pn = pos(S, 4, 0.5, -1);
    var grid = near(p0.x, 7.21) && near(p0.y, 15.15) && near(p2.x, 139.29) && near(p2.y, 15.15) && near(p3.x, 7.21) && near(p3.y, 53.25) &&
      near(p20.x, 139.29) && near(p20.y, 243.75) && p20.page === 0 && p21.page === 1 && near(p21.y, 15.15) && near(pn.x, 73.75) && near(pn.y, 52.25);
    var all = PRESETS.filter(function (p) { return p.id !== "custom"; }).every(function (p) {
      var f = fits(p); return f.right <= f.W + 0.01 && f.bottom <= f.H + 0.01 && Math.abs((f.W - f.right) - p.left) < 0.6; // symmetric side margins
    });
    var b = blocks("A\nB\n\n\nC\n  \nD\n");
    var csv = parseCSV('Name,City\r\n"Nasser, Sara","Amman ""JO"""\nOmar,Irbid\n');
    var tsv = parseCSV("a\tb\nc\td");
    var t = fill("{name}\n{2} {Zip}", ["Name", "City"], ["Lina", "Amman"]);
    var many = labelsOf({ mode: "list", text: "A\n\nB", copies: 3 });
    var same = labelsOf({ mode: "same", text: "X", count: 5 });
    var div = document.createElement("div"), save = st.start; st.start = 4;
    var res = build(div, many.concat(many, many, many, many), S); // 30 labels from label 5 -> 2 sheets
    st.start = save;
    return grid && all && b.join("|") === "A\nB|C|D" && csv.length === 3 && csv[1][0] === "Nasser, Sara" && csv[1][1] === 'Amman "JO"' &&
      tsv[1][1] === "d" && t === "Lina\nAmman" && many.join("") === "AAABBB" && same.length === 5 && res.pages === 2 &&
      div.querySelectorAll(".lm-label.used").length === 4 && div.querySelectorAll(".lm-text").length === 30;
  };
})();
