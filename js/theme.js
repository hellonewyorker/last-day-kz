/* =========================================================
   Тема: светлая / тёмная.
   По умолчанию — как в системе. Выбор НЕ сохраняется
   (правило проекта: никакого localStorage).
   ========================================================= */
(function () {
  "use strict";

  var root = document.documentElement;
  var media = window.matchMedia("(prefers-color-scheme: dark)");
  var userChose = false;

  function set(theme) {
    root.setAttribute("data-theme", theme);

    var btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.setAttribute("aria-label", App.i18n.t(theme === "dark" ? "theme.toLight" : "theme.toDark"));
    }

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", getComputedStyle(root).getPropertyValue("--c-desk").trim());
  }

  function init() {
    set(media.matches ? "dark" : "light");

    media.addEventListener("change", function (e) {
      if (!userChose) set(e.matches ? "dark" : "light");
    });

    document.getElementById("theme-toggle").addEventListener("click", function () {
      userChose = true;
      set(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });
  }

  window.App = window.App || {};
  window.App.theme = { init: init };
})();
