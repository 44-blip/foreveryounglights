/* Forever Young Lighting: the tree order page (/christmas-tree-delivery/order/).
   Loaded by that one page only, with `defer`. No library, nothing from another site.

   With this file blocked the page still reads right: the poster picture shows, the add-ons are
   a plain list with no tick boxes, the summary shows the tree, and the form sends a plain
   drop off. This file adds:

   1. The choices: add-on tick boxes, the stand (a pick-one while an add-on needs a stand
      choice, an optional tick box otherwise), the summary, the total and the one-line bar
   2. The tree picture: drag to turn, arrow keys, two buttons, picture layers. A frame is
      drawn only together with every layer that belongs on it; until then the poster stays
      up. The turn label and buttons wait for a frame.
   3. The form: the `package` value, and the whole order written into the "notes" box

   Every choice, rule and line of text comes from the JSON block the build puts in the page
   (#cz-data, made by build/customizer.py from trees.json). Nothing is hard-coded here, and
   this file never makes a price: every amount and every total arrives as ready text. */
(function () {
  "use strict";

  var root = document.querySelector("[data-cz]");
  var dataEl = document.getElementById("cz-data");
  if (!root || !dataEl) return;
  var cfg;
  try { cfg = JSON.parse(dataEl.textContent); } catch (e) { return; }

  var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  function $(sel) { return root.querySelector(sel); }
  function all(sel) { return [].slice.call(root.querySelectorAll(sel)); }
  function byId(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* -- 1. the choices ------------------------------------------------------------------- */
  var standPick = $("[data-cz-standpick]"), gateEl = $("[data-cz-gate]"),
      linesEl = $("[data-cz-lines]"), totalEl = $("[data-cz-total]"), totalV = $("[data-cz-total-v]"),
      barEl = $("[data-cz-bar]"), barText = $("[data-cz-bar-text]"), packageEl = $("[data-cz-package]");
  var stands = cfg.stand.options;
  var wasForced = null;

  /* What is chosen right now. The inputs are the one record of it, so a browser that restores
     them (back button, reload) is read correctly. Which stand inputs count depends on whether
     a ticked add-on needs a stand choice: then the pick-one counts, otherwise the tick boxes. */
  function state() {
    var product = cfg.products[0];
    cfg.products.forEach(function (p) { var i = byId(p.dom); if (i && i.checked) product = p; });
    var added = cfg.addons.filter(function (a) { var i = byId(a.dom); return i && i.checked; });
    var forced = added.some(function (a) { return a.needs_stand_choice; });
    var stand = null;
    stands.forEach(function (o) {
      var i = byId(forced ? o.radio : o.box);
      if (i && i.checked) stand = o;
    });
    return { product: product, added: added, forced: forced, stand: stand, blocked: forced && !stand };
  }

  /* When the stand changes from tick box to pick-one or back, the choice goes with it:
     a stand we bring stays chosen; "my own stand" has no tick box, so it is dropped. */
  function carryStand(forced) {
    var from = null;
    stands.forEach(function (o) { var i = byId(forced ? o.box : o.radio); if (i && i.checked) from = o; });
    stands.forEach(function (o) {
      var i = byId(forced ? o.radio : o.box);
      if (i) i.checked = !!from && from.id === o.id;
    });
  }

  function line(label, value, price, sub) {
    var row = el("div", "cz-line"), dd = el("dd");
    row.appendChild(el("dt", "", label));
    dd.appendChild(el("span", "cz-line__v", value));
    if (price) dd.appendChild(el("span", "cz-line__fee", price));
    if (sub) dd.appendChild(el("span", "cz-line__sub", sub));
    row.appendChild(dd);
    return row;
  }
  function totalOf(s) {
    var key = [s.product.id, s.added.map(function (a) { return a.id; }).join(","), s.stand ? s.stand.id : ""].join("|");
    return s.blocked ? null : (cfg.totals[key] || null);
  }

  function renderSummary(s) {
    var total = totalOf(s);
    if (linesEl) {
      var frag = document.createDocumentFragment();
      frag.appendChild(line(cfg.text.tree_label, s.product.name, s.product.price_text, s.product.summary_text));
      s.added.forEach(function (a) { frag.appendChild(line(cfg.text.addon_label, a.short, a.price_text)); });
      if (s.stand) frag.appendChild(line(cfg.text.stand_label, s.stand.short, s.stand.price_text));
      else if (s.blocked) {
        var need = line(cfg.text.stand_label, cfg.stand.needed_short);
        need.querySelector(".cz-line__v").className = "cz-line__v is-empty";
        frag.appendChild(need);
      }
      linesEl.textContent = "";
      linesEl.appendChild(frag);
    }
    if (totalEl && totalV) { totalV.textContent = total || ""; totalEl.hidden = !total; }
    // The bar is one line and cuts off on a phone, so a pick that is still needed leads it.
    if (barText) {
      var bits = [s.product.name].concat(s.added.map(function (a) { return a.short; }));
      if (s.stand) bits.push(s.stand.short);
      if (s.blocked) bits.unshift(cfg.stand.needed_short);
      else if (total) bits.unshift(total);
      barText.textContent = bits.join(" · ");
    }
  }

  var viewer = null;
  function render() {
    var s = state();
    if (wasForced !== null && s.forced !== wasForced) { carryStand(s.forced); s = state(); }
    wasForced = s.forced;
    if (standPick) standPick.hidden = !s.forced;
    all("[data-cz-standbox-row]").forEach(function (r) { r.hidden = s.forced; });
    stands.forEach(function (o) { var i = byId(o.radio); if (i) i.required = s.forced; });
    root.classList.toggle("is-gated", s.blocked);
    if (gateEl) gateEl.hidden = !s.blocked;
    // The form's package value: the plain drop off, or the value of the last ticked add-on that has one.
    if (packageEl) {
      var value = cfg.package;
      s.added.forEach(function (a) { if (a.package) value = a.package; });
      packageEl.value = value;
    }
    renderSummary(s);
    if (viewer) {
      var names = [];
      s.added.forEach(function (a) { if (a.layer && names.indexOf(a.layer) < 0) names.push(a.layer); });
      if (s.stand && s.stand.layer && names.indexOf(s.stand.layer) < 0) names.push(s.stand.layer);
      viewer.show(s.product, names);
    }
    return s;
  }

  /* -- 2. the tree picture --------------------------------------------------------------- */
  function Viewer(stage) {
    var poster = $("[data-cz-poster]"), canvas = $("[data-cz-canvas]"), hint = $("[data-cz-hint]"),
        turns = $("[data-cz-turns]");
    var ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
    if (!stage || !poster || !ctx) return null;

    var packs = {}, base = null, layers = [], pos = 0, shown = -1, dirty = false, raf = 0,
        level = 0, touched = false, spin = 0, coast = 0, setId = null, drawn = false;
    var saver = !!(navigator.connection && navigator.connection.saveData);
    // How much to fetch. 0: nothing yet (the poster is already on the page). 1: the first pass,
    // every fourth frame. 2: every frame. A wide screen goes to 2 once the page has loaded; a
    // narrow one (a phone) stops at 1 until the visitor touches the picture, so nobody who only
    // reads the page pays for 36 frames they never see. A data-saver connection stays at 0
    // until that first touch.
    var wide = !!(window.matchMedia && window.matchMedia("(min-width: " + cfg.eager_from_px + "px)").matches);

    function pack(path, n) {
      if (!packs[path]) packs[path] = { path: path, n: n, imgs: [], ok: [], todo: [], got: 0, busy: 0, pass: 0 };
      return packs[path];
    }
    function fetchNext(p) {
      if (p.busy >= 4 || !p.todo.length) return;
      var i = p.todo.shift(), im = new Image();
      p.busy++;
      im.decoding = "async";
      im.onload = function () {
        p.imgs[i] = im; p.ok[i] = true; p.got++; p.busy--;
        dirty = true; request();
        if (whole()) hintSpin();
        fetchNext(p);
      };
      im.onerror = function () { p.busy--; dirty = true; request(); fetchNext(p); };
      im.src = p.path + "f" + (i < 10 ? "0" : "") + i + ".webp";
    }
    function start(p) {
      var i;
      if (level >= 1 && p.pass < 1) { p.pass = 1; for (i = 0; i < p.n; i += 4) p.todo.push(i); }
      if (level >= 2 && p.pass < 2) { p.pass = 2; for (i = 1; i < p.n; i++) if (i % 4) p.todo.push(i); }
      for (i = 0; i < 4; i++) fetchNext(p);
    }
    function raise(to) {
      if (to <= level) return;
      level = to;
      if (base) start(base);
      layers.forEach(start);
    }

    // A frame can be drawn only when its tree picture AND every layer that belongs on it have
    // arrived, so a picture is never shown half put together.
    // One exception: a layer whose files were all asked for and not one arrived is given up on,
    // so an add-on picture that cannot be fetched never freezes the tree. The tree is then drawn
    // without that layer.
    function dead(l) { return l.pass > 0 && !l.busy && !l.todo.length && l.got === 0; }
    function ready(i) {
      if (!base.ok[i]) return false;
      for (var k = 0; k < layers.length; k++) if (!layers[k].ok[i] && !dead(layers[k])) return false;
      return true;
    }
    function packsNow() { return base ? [base].concat(layers) : []; }
    function idle() { return packsNow().every(function (p) { return !p.busy && !p.todo.length; }); }
    function whole() { return !!base && packsNow().every(function (p) { return p.got === p.n; }); }
    function nearest(want) {
      var n = base.n;
      for (var d = 0; d <= n / 2; d++) {
        var a = (want + d) % n, b = (want - d + n) % n;
        if (ready(a)) return a;
        if (ready(b)) return b;
      }
      return -1;
    }
    // The "Drag to turn" label and the two turn buttons show only when the tree can turn: once a
    // frame has been drawn. Until then the poster is a still picture and nothing promises more.
    // One case shows them earlier: on a data-saver connection nothing is fetched until the first
    // touch, so they are the way to ask for the frames; if that touch brings no frame at all,
    // they go away again. The label goes for good at the first touch.
    function controls() {
      var on = drawn || (saver && !(touched && idle()));
      if (turns) turns.hidden = !on;
      if (hint) hint.hidden = !on || touched;
    }
    function paint() {
      raf = 0;
      if (!base) return;
      controls();
      var n = base.n, want = ((Math.round(pos) % n) + n) % n, i;
      // The first picture on the canvas is the very frame the poster shows, so nothing moves when
      // the canvas takes the poster's place. (If the visitor has already turned it, or that one
      // file never arrives, the nearest frame that is ready will do.)
      if (canvas.hidden && !touched && !idle()) i = ready(want) ? want : -1; else i = nearest(want);
      if (i < 0 || (i === shown && !dirty)) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(base.imgs[i], 0, 0, canvas.width, canvas.height);
      layers.forEach(function (l) { if (l.ok[i]) ctx.drawImage(l.imgs[i], 0, 0, canvas.width, canvas.height); });
      shown = i; dirty = false;
      canvas.setAttribute("data-cz-frame", i);
      if (canvas.hidden) { canvas.hidden = false; poster.style.visibility = "hidden"; }
      if (!drawn) { drawn = true; controls(); }
    }
    function request() { if (!raf) raf = window.requestAnimationFrame(paint); }

    /* Called on every change: the picture set and the size on the ruler for the chosen
       product, and the picture layers of what is added. The build has checked that every
       name in `names` is in the set. */
    function show(product, names) {
      var g = product.geo;
      stage.style.setProperty("--frame-ar", g.ar);
      stage.style.setProperty("--frame-ft", g.frame_ft);
      stage.style.setProperty("--below-ft", g.below_ft);
      stage.style.setProperty("--lo", g.lo);
      stage.style.setProperty("--hi", g.hi);
      if (product.set !== setId) {                   // nothing is loaded for a product until it is chosen
        var s = cfg.sets[product.set];
        setId = product.set;
        base = pack(s.path, s.frames);
        canvas.width = s.width; canvas.height = s.height;
        shown = -1; dirty = true; drawn = false;
        canvas.hidden = true; poster.style.visibility = "";
        if (poster.getAttribute("src") !== s.path + "poster.webp") poster.src = s.path + "poster.webp";
        start(base);
      }
      layers = names.map(function (nm) { var l = pack(base.path + nm + "/", base.n); start(l); return l; });
      dirty = true; request();
    }

    function touch() {
      touched = true;
      if (spin) { window.cancelAnimationFrame(spin); spin = 0; }
      if (coast) { window.cancelAnimationFrame(coast); coast = 0; }
      raise(2);
      controls();
    }
    function step(by) { pos = Math.round(pos) + by; request(); }

    // One slow turn, once, when every frame and layer has arrived, to show that the tree turns.
    // Only on a wide screen, where every frame was fetched anyway. Never for a visitor who asks for
    // reduced motion, and never after they have touched it.
    function hintSpin() {
      if (!cfg.hint_spin || !wide || reduce || touched || spin) return;
      var r = stage.getBoundingClientRect(), vh = window.innerHeight || document.documentElement.clientHeight;
      if (r.bottom < 0 || r.top > vh) return;
      var from = pos, t0 = 0, dur = 4200, n = base.n;
      function tick(t) {
        if (!t0) t0 = t;
        var k = Math.min(1, (t - t0) / dur);
        var e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        pos = from + n * e;
        request();
        spin = k < 1 ? window.requestAnimationFrame(tick) : 0;
      }
      spin = window.requestAnimationFrame(tick);
    }

    // Drag. Up and down still scrolls the page (touch-action: pan-y); side to side turns the tree.
    var drag = null;
    function perFrame() { return Math.max(5, stage.clientWidth / 40); }
    stage.addEventListener("pointerdown", function (e) {
      if (e.button || (e.target.closest && e.target.closest("button"))) return;
      touch();
      drag = { id: e.pointerId, x: e.clientX, pos: pos, moved: false, lx: e.clientX, lt: e.timeStamp, v: 0 };
    });
    stage.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x;
      if (!drag.moved) {
        if (Math.abs(dx) < 4) return;
        drag.moved = true;
        try { stage.setPointerCapture(drag.id); } catch (err) {}
        stage.classList.add("is-dragging");
      }
      var dt = e.timeStamp - drag.lt;
      if (dt > 0) { drag.v = .7 * ((e.clientX - drag.lx) / perFrame() / dt) + .3 * drag.v; drag.lx = e.clientX; drag.lt = e.timeStamp; }
      pos = drag.pos + dx / perFrame();           // frames count up as the tree's near side moves right
      request();
    });
    function drop(e) {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      var v = drag.moved && e && e.type === "pointerup" && e.timeStamp - drag.lt < 80 ? drag.v : 0;
      drag = null;
      stage.classList.remove("is-dragging");
      if (reduce || Math.abs(v) < .004) return;
      var last = 0;                               // let it run on a little and settle
      function glide(t) {
        var dt = last ? Math.min(40, t - last) : 16;
        last = t;
        pos += v * dt;
        v *= Math.pow(.995, dt);
        request();
        coast = Math.abs(v) > .002 ? window.requestAnimationFrame(glide) : 0;
      }
      coast = window.requestAnimationFrame(glide);
    }
    stage.addEventListener("pointerup", drop);
    stage.addEventListener("pointercancel", drop);

    stage.addEventListener("keydown", function (e) {
      if (e.target !== stage) return;
      var by = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
      if (!by && e.key !== "Home") return;
      e.preventDefault();
      touch();
      if (by) step(by); else { pos = 0; request(); }
    });

    // The two buttons: one press is one step; holding keeps turning.
    if (turns) {
      var hold = 0;
      var release = function () { if (hold) { window.clearInterval(hold); hold = 0; } };
      [].forEach.call(turns.querySelectorAll("[data-cz-turn]"), function (b) {
        var by = Number(b.getAttribute("data-cz-turn"));
        b.addEventListener("pointerdown", function (e) {
          if (e.button) return;
          touch(); step(by); release();
          hold = window.setInterval(function () { step(by); }, 90);
        });
        b.addEventListener("click", function (e) { if (e.detail === 0) { touch(); step(by); } });   // keyboard
        ["pointerup", "pointerleave", "pointercancel", "blur"].forEach(function (n) { b.addEventListener(n, release); });
      });
    }

    // Start fetching once the page itself has loaded: everything on a wide screen, the first
    // pass on a narrow one. On a data-saver connection, wait until the visitor touches the tree.
    if (!saver) {
      var go = function () { window.setTimeout(function () { raise(wide ? 2 : 1); }, 150); };
      if (document.readyState === "complete") go(); else window.addEventListener("load", go);
    }
    return { show: show };
  }

  /* -- 3. the form: the whole order goes out in its existing "notes" box ------------------- */
  // The form keeps the live tree form's field names (name, phone, city, package, notes, page).
  // So when it is sent, the order is written into "notes", above what the visitor typed. The
  // typed box is put back if they come back to this page.
  var form = $("[data-cz-form]"), notes = $('textarea[name="notes"]'), dayRow = $("[data-cz-day]"),
      day = dayRow ? dayRow.querySelector("input") : null, carry = null;
  function orderText(s) {
    var n = cfg.note, total = totalOf(s), out = [n.title];
    out.push(n.tree + ": " + s.product.name + " (" + s.product.summary_text + ")");
    out.push(n.addons + ": " + (s.added.length ? s.added.map(function (a) { return a.short; }).join(", ") : n.none));
    out.push(n.stand + ": " + (s.stand ? s.stand.short : n.none));
    if (total) out.push(n.total + ": " + total);
    out.push(n.day + ": " + (day && day.value.trim() ? day.value.trim() : n.not_given));
    out.push(n.note + ": " + (notes && notes.value.trim() ? notes.value.trim() : n.none));
    return out.join("\n");
  }
  if (form) form.addEventListener("submit", function (e) {
    var s = render();
    if (s.blocked) { e.preventDefault(); if (gateEl && gateEl.scrollIntoView) gateEl.scrollIntoView({ block: "center" }); return; }
    if (!notes) return;
    if (!carry) { carry = document.createElement("input"); carry.type = "hidden"; form.appendChild(carry); }
    carry.value = orderText(s);
    carry.name = "notes";
    notes.removeAttribute("name");
  });
  window.addEventListener("pageshow", function () {
    if (carry) carry.removeAttribute("name");
    if (notes) notes.name = "notes";
    wasForced = null;
    render();
  });

  /* -- wire up ---------------------------------------------------------------------------- */
  root.classList.add("cz--js");
  if (dayRow) dayRow.hidden = false;
  viewer = Viewer($("[data-cz-stage]"));
  root.addEventListener("change", function (e) {
    var t = e.target;
    if (!t || (t.type !== "radio" && t.type !== "checkbox")) return;
    // The stand tick boxes are a pick-at-most-one: ticking one unticks the others.
    if (t.checked && t.hasAttribute("data-cz-standbox")) {
      all("[data-cz-standbox]").forEach(function (i) { if (i !== t) i.checked = false; });
    }
    render();
  });
  var go = $("[data-cz-go]");
  if (go) go.hidden = false;
  if (barEl) barEl.hidden = false;

  // The sticky parts sit just under the site header, whatever its height is today.
  var head = document.querySelector(".site-header__inner");
  function measure() { if (head) root.style.setProperty("--cz-top", (head.offsetHeight + 3) + "px"); }
  measure();
  window.addEventListener("resize", measure);

  render();
})();
