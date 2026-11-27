/* Presentation-only semantics; artwork state stays owned by app.js. */
(function () {
  "use strict";
  var buttons = document.querySelectorAll("[data-shape], [data-mobile-tool], #flip");
  function syncSelection() {
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute("aria-pressed", buttons[i].classList.contains("on") ? "true" : "false");
    }
  }
  syncSelection();
  var observer = new MutationObserver(syncSelection);
  for (var i = 0; i < buttons.length; i++) {
    observer.observe(buttons[i], { attributes: true, attributeFilter: ["class"] });
  }
})();
