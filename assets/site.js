/* Forever Young Lighting — site.js
   Progressive enhancement only. Every page is complete and usable with this file blocked.
   No dependencies, no build step. Loaded with `defer`.

   1. Mobile nav toggle              (F-VISUAL-03: named button, aria-expanded kept honest)
   2. Package choice carries into the form  (F-SXO-06)
   3. Entrance reveal                (STEP 3: the site's only animation)
   4. Season line self-correction    (F-CONTENT-01: the built-in text is already right; this
                                      only fixes it if the page is served past its season)
*/
(function () {
  "use strict";

  /* -- 1. nav ------------------------------------------------------------- */
  var toggle = document.querySelector("[data-nav-toggle]");
  var panel = document.getElementById("nav-panel");
  if (toggle && panel) {
    toggle.hidden = false;
    panel.hidden = true;
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      panel.hidden = open;
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        toggle.setAttribute("aria-expanded", "false");
        panel.hidden = true;
        toggle.focus();
      }
    });
  }

  /* -- 2. package prefill -------------------------------------------------- */
  // /contact/?package=full-front#quote  ->  selects that option and focuses Name.
  try {
    var pkg = new URLSearchParams(location.search).get("package");
    if (pkg) {
      var sel = document.querySelector('select[name="package"]');
      if (sel) {
        for (var i = 0; i < sel.options.length; i++) {
          if (sel.options[i].value === pkg) { sel.selectedIndex = i; break; }
        }
        var more = sel.closest("details");
        if (more) more.open = true;
      }
      var name = document.querySelector(".quote input[name='name']");
      if (name && location.hash === "#quote") {
        setTimeout(function () { name.focus({ preventScroll: true }); }, 120);
      }
    }
  } catch (e) { /* never let this break the form */ }

  /* -- 2b. "Get my quote" jump: after the anchor scroll, put the cursor in Name --------- */
  // Every "Get my quote" button (header, hero, dock, mid-page) is a plain #quote link, so
  // it works without JS; this only saves the extra tap once the form is in view.
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest('a[href="#quote"]') : null;
    if (!a) return;
    var name = document.querySelector(".quote input[name='name']");
    if (name) setTimeout(function () { name.focus({ preventScroll: true }); }, 450);
  });

  /* -- 3. entrance reveal --------------------------------------------------- */
  // ONE animation: fade + rise, once per block, on first scroll into view.
  // Blocks already on screen when the page loads are shown instantly (no motion).
  (function () {
    var root = document.documentElement;
    if (root.className.indexOf("js-motion") === -1) return;
    root.setAttribute("data-reveal-ready", "");

    var bands = document.querySelectorAll("main > .band");
    var targets = [];
    for (var b = 1; b < bands.length; b++) {            // band 0 = hero, never moves
      var wrap = bands[b].querySelector(":scope > .wrap");
      if (!wrap) continue;
      for (var c = 0; c < wrap.children.length; c++) targets.push(wrap.children[c]);
    }
    if (!targets.length) return;

    function show(el, instant) {
      if (instant) el.classList.add("is-in--now");
      el.classList.add("is-in");
    }
    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (el) { show(el, true); });
      return;
    }
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var delivered = false;
    var io = new IntersectionObserver(function (entries) {
      delivered = true;
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        show(e.target, false);
        io.unobserve(e.target);                          // once. never replays.
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0 });

    var observed = [];
    targets.forEach(function (el) {
      if (el.getBoundingClientRect().top < vh) show(el, true);   // above the fold
      else { observed.push(el); io.observe(el); }
    });

    // Last resort. An observer that has never fired once means this renderer is not
    // delivering intersections at all — show the page rather than hide it forever.
    if (observed.length) setTimeout(function () {
      if (delivered) return;
      io.disconnect();
      observed.forEach(function (el) { show(el, true); });
    }, 1500);
  })();

  /* -- 4. season line ------------------------------------------------------ */
  // The text in the HTML is generated at build time and is what crawlers read.
  // This only rewrites it when the page outlives the phase it was built in.
  function seasonLine(d) {
    var y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    if (m === 1) return "Takedown season — now taking early bookings for the " + y + " season.";
    if (m <= 8)  return "Now taking early bookings for the " + y + " season — installs start early October and run through December 10.";
    if (m === 9) return "Now booking the " + y + " season — installs start early October and run through December 10.";
    if (m === 10 || m === 11 || (m === 12 && day <= 10))
      return "Installing now — the " + y + " season runs through December 10. Call or text for remaining dates.";
    return "The " + y + " install season is closed. Takedown runs in January; booking opens again in September.";
  }
  var live = seasonLine(new Date());
  Array.prototype.forEach.call(document.querySelectorAll("[data-season-line]"), function (el) {
    if (el.textContent.trim() !== live) el.textContent = live;
  });
})();
