/* =========================================================
   Тема: три состояния — Авто → Тёмная → Светлая (решение автора: тёмная — с одного нажатия).
   «Авто» — как в системе (атрибута data-theme нет, работает медиазапрос в tokens.css).
   Выбор НЕ сохраняется (правило проекта: никакого localStorage).
   ========================================================= */
(function () {
  "use strict";

  var root = document.documentElement;
  var media = window.matchMedia("(prefers-color-scheme: dark)");
  var MODES = ["auto", "dark", "light"];
  var mode = "auto";

  function t(k) { return App.i18n.t(k); }

  function apply() {
    if (mode === "auto") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", mode);

    var btn = document.getElementById("theme-toggle");
    if (btn) {
      var next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
      btn.setAttribute("data-mode", mode);
      btn.setAttribute("aria-label", t("theme.label")
        .replace("{now}", t("theme.name." + mode))
        .replace("{next}", t("theme.name." + next)));
      btn.title = t("theme.title").replace("{now}", t("theme.name." + mode));
      var txt = document.getElementById("theme-txt");
      if (txt) txt.textContent = t("theme.short." + mode);
    }
    // цвет адресной строки на телефоне — под фактическую тему
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", getComputedStyle(root).getPropertyValue("--c-desk").trim());
  }

  function init() {
    apply();
    media.addEventListener("change", function () { if (mode === "auto") apply(); });
    window.addEventListener("ld:langchange", apply);   // подписи кнопки — на новом языке
    document.getElementById("theme-toggle").addEventListener("click", function () {
      mode = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
      apply();
    });
  }

  window.App = window.App || {};
  window.App.theme = { init: init, mode: function () { return mode; } };
})();
