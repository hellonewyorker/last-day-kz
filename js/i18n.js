/* =========================================================
   i18n: достаёт тексты из data/i18n.js и подставляет в страницу.
   data-i18n="ключ"                 → textContent
   data-i18n-attr="атрибут:ключ;…"  → атрибуты (aria-label, content…)
   Даты — только через Intl (App.i18n.dateFormat).
   ========================================================= */
(function () {
  "use strict";

  // Локаль Intl для каждого языка сайта
  var INTL_LOCALES = { ru: "ru-KZ", kk: "kk-KZ" };

  var locale = window.I18N.defaultLocale;
  var dict = window.I18N.messages[locale] || {};

  function t(key) {
    if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
    console.warn("[i18n] нет ключа:", key);
    return key;
  }

  function apply(root) {
    root = root || document;
    root.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    root.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var p = pair.split(":");
        if (p.length === 2) el.setAttribute(p[0].trim(), t(p[1].trim()));
      });
    });
  }

  function dateFormat(options) {
    return new Intl.DateTimeFormat(INTL_LOCALES[locale] || locale, options);
  }

  document.documentElement.lang = locale;

  window.App = window.App || {};
  window.App.i18n = { locale: locale, t: t, apply: apply, dateFormat: dateFormat };
})();
