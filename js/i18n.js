/* =========================================================
   i18n: достаёт тексты из data/i18n.js и подставляет в страницу.
   data-i18n="ключ"                 → textContent
   data-i18n-attr="атрибут:ключ;…"  → атрибуты (aria-label, content…)
   Даты — только через Intl (App.i18n.dateFormat).

   Язык: ru (по умолчанию) или kk. Выбирается через адрес ?lang=kk
   (ссылкой можно поделиться), нигде не хранится (правило 8 CLAUDE.md).
   App.i18n.setLocale("kk") меняет язык без перезагрузки и шлёт событие
   «ld:langchange» — по нему вкладки перерисовывают свой текст.
   ========================================================= */
(function () {
  "use strict";

  // Локаль Intl для каждого языка сайта
  var INTL_LOCALES = { ru: "ru-KZ", kk: "kk-KZ" };
  var LOCALES = Object.keys(window.I18N.messages);

  function fromUrl() {
    var p = new URLSearchParams(location.search).get("lang");
    return p && LOCALES.indexOf(p) !== -1 ? p : window.I18N.defaultLocale;
  }

  var locale = fromUrl();
  var dict = window.I18N.messages[locale] || {};

  function t(key) {
    if (Object.prototype.hasOwnProperty.call(dict, key)) return dict[key];
    console.warn("[i18n] нет ключа:", key);
    return key;
  }
  function has(key) { return Object.prototype.hasOwnProperty.call(dict, key); }

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

  /* ---------- Даты ----------
     Сначала Intl с локалью языка. Если в браузере нет данных для локали
     (некоторые сборки знают kk-KZ, но выдают «M12» вместо «желтоқсан»),
     названия месяцев и дней недели берутся из словаря (ключи date.*). */
  var intlOk = {};
  function intlKnows(loc) {
    if (loc in intlOk) return intlOk[loc];
    var ref = (window.I18N.messages[loc] || {})["date.month.1"];   // «қаңтар» — есть только там, где нужен запасной вариант
    if (!ref) return (intlOk[loc] = true);
    try {
      var probe = new Intl.DateTimeFormat(INTL_LOCALES[loc] || loc, { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2026, 0, 15)));
      intlOk[loc] = probe.toLowerCase() === ref.toLowerCase();
    } catch (e) { intlOk[loc] = false; }
    return intlOk[loc];
  }
  // Запасной форматтер из словаря: те же сочетания полей, что используются на сайте
  function DictFormat(o) { this.o = o; }
  DictFormat.prototype.format = function (date) {
    var o = this.o, utc = o.timeZone === "UTC";
    var y = utc ? date.getUTCFullYear() : date.getFullYear();
    var m = (utc ? date.getUTCMonth() : date.getMonth()) + 1;
    var d = utc ? date.getUTCDate() : date.getDate();
    var w = utc ? date.getUTCDay() : date.getDay();
    var month = o.month === "short" ? t("date.monthShort." + m) : t("date.month." + m);
    var wd = o.weekday === "short" ? t("date.weekdayShort." + w) : t("date.weekday." + w);
    if (o.weekday && o.day && o.month) return t("date.pattern.weekdayDayMonth").replace("{weekday}", wd).replace("{day}", d).replace("{month}", month);
    if (o.day && o.month) return t("date.pattern.dayMonth").replace("{day}", d).replace("{month}", month);
    if (o.month && o.year) return t("date.pattern.monthYear").replace("{year}", y).replace("{month}", month);
    if (o.month) return month;
    if (o.weekday) return wd;
    return String(d);
  };
  function dateFormat(options) {
    if (!intlKnows(locale)) return new DictFormat(options || {});
    return new Intl.DateTimeFormat(INTL_LOCALES[locale] || locale, options);
  }

  /* ---------- Смена языка ---------- */
  function setLocale(next, opts) {
    if (LOCALES.indexOf(next) === -1 || next === locale) return;
    locale = next;
    dict = window.I18N.messages[locale];
    api.locale = locale;
    document.documentElement.lang = locale;
    if (window.LastDay && window.LastDay.setLocale) window.LastDay.setLocale(locale);
    // адрес: ?lang=kk для казахского, без параметра — русский; хэш вкладки сохраняется
    if (!(opts && opts.keepUrl)) {
      var url = new URL(location.href);
      if (locale === window.I18N.defaultLocale) url.searchParams.delete("lang");
      else url.searchParams.set("lang", locale);
      history.replaceState(history.state, "", url.pathname + url.search + url.hash);
    }
    apply();
    window.dispatchEvent(new CustomEvent("ld:langchange", { detail: { locale: locale } }));
  }

  document.documentElement.lang = locale;

  var api = {
    locale: locale,
    locales: LOCALES,
    t: t, has: has, apply: apply, dateFormat: dateFormat, setLocale: setLocale,
    current: function () { return locale; }
  };
  window.App = window.App || {};
  window.App.i18n = api;
})();
