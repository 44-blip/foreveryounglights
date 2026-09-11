/* Forever Young Lighting — site.js
   Progressive enhancement only. Every page is complete and usable with this file blocked.
   No dependencies, no build step. Loaded with `defer`.

   1. Mobile nav toggle              (F-VISUAL-03: named button, aria-expanded kept honest)
   2. Package choice carries into the form  (F-SXO-06)
   3. Season line self-correction    (F-CONTENT-01: the built-in text is already right; this
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

  /* -- 3. season line ------------------------------------------------------ */
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
