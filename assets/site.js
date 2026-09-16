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
    panel.classList.remove("is-open");
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      panel.hidden = open;
      // The class is what the CSS reads; `hidden` stays for assistive tech.
      panel.classList.toggle("is-open", !open);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        toggle.setAttribute("aria-expanded", "false");
        panel.hidden = true;
        panel.classList.remove("is-open");
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

    // ONE selector, character-identical to the rule in site.css that hides these
    // elements. AUD-00: when the two disagreed, the home page quote form stayed at
    // opacity 0 and the primary lead path was dead for anyone with JS on. The CSS
    // counted <section> siblings (the home hero is <section class="hero">, not a
    // .band, so the quote band was "not first of type" and got hidden); this loop
    // counted .band elements and skipped index 0, which on that page WAS the quote
    // band. Never re-derive this list by index — keep the one string.
    var REVEAL_SELECTOR = "main > .band:not(:first-of-type) > .wrap > *";
    var targets = [].slice.call(document.querySelectorAll(REVEAL_SELECTOR));
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

    // ---- Recovery sweep (new-audit item 6) --------------------------------
    // The observer above only shows an element on `isIntersecting`. Per the W3C
    // update-intersection-observations algorithm, an element carried from below the
    // viewport to above it between ticks can keep its threshold index and its
    // isIntersecting value — so NO entry is queued and the callback never runs for
    // it. It then stays at opacity 0 forever. The 1500 ms failsafe above does not
    // cover this: it only fires when `delivered` is still false, i.e. when the
    // observer never fired at all, and in a fast scroll it fires for other elements.
    //
    // So this recovery never waits for an observer callback. It reads live geometry,
    // driven by `scroll` and `resize` as the fast path, a 500 ms interval as the
    // guarantee (some renderers coalesce or drop scroll events — measured), and one
    // call at wire-up for a page that arrives already scrolled (bfcache, #fragment,
    // reload). The interval is what makes this independent of ANY event delivery.
    if (observed.length) (function () {
      var pending = observed.slice();          // own array; `observed` stays intact
                                               // for the failsafe above.
      function sweep() {
        for (var i = pending.length - 1; i >= 0; i--) {
          var el = pending[i];
          // Already revealed — by the observer, or above the fold at load. Drop it
          // from the queue and DO NOT touch it: it may be mid-animation right now,
          // and re-showing it would interrupt a normal slow-scroll reveal.
          if (el.classList.contains("is-in")) { pending.splice(i, 1); continue; }
          // Carried past the top of the viewport. It CAN intersect again if the
          // visitor scrolls back up — but nothing guarantees a callback before then,
          // and by then it is already shown, so showing it now is safe either way.
          // Instant, because animating something already scrolled past is the bug.
          if (el.getBoundingClientRect().bottom <= 0) {
            show(el, true);
            io.unobserve(el);
            pending.splice(i, 1);
          }
        }
        if (!pending.length) stop();
      }
      // Throttled by timestamp rather than requestAnimationFrame on purpose: rAF is
      // paused in a backgrounded tab and is coalesced away by some renderers, and the
      // whole point of this block is to not depend on being called back.
      var last = 0;
      function onMove() {
        var now = Date.now();
        if (now - last < 100) return;
        last = now;
        sweep();
      }
      // The backstop. Scroll events are the fast path, but a renderer that coalesces
      // or drops them would take the fix down with it — so a cheap interval also
      // sweeps. It stops the moment `pending` empties, which on a normal read-through
      // is within the first screenful or two.
      var beat = setInterval(sweep, 500);
      function stop() {
        clearInterval(beat);
        window.removeEventListener("scroll", onMove);
        window.removeEventListener("resize", onMove);
      }
      window.addEventListener("scroll", onMove, { passive: true });
      window.addEventListener("resize", onMove);
      sweep();
    })();
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
