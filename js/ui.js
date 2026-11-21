/* =========================================================
   Общие помощники интерфейса для всех вкладок:
   • Tabs — подвкладки с «таблеткой» (placePill/selectTab из старого app.js),
     стрелки ←/→, Home/End;
   • ref — пометка-ссылка на статью (id источника из data/sources.js);
   • даты через Intl (правило 9 CLAUDE.md).
   ========================================================= */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  function t(key, vars) {
    var s = App.i18n.t(key);
    return vars ? s.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] == null ? "" : vars[k]; }) : s;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  function lowerFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

  /* ---------- Пометки-ссылки ---------- */
  var sources = null;
  function source(id) {
    if (!sources) {
      sources = {};
      (window.LD_SOURCES || []).forEach(function (s) { sources[s.id] = s; });
    }
    return sources[id];
  }
  // key — ключ подписи в i18n: "ref.tk-56.p2" → источник "tk-56"
  function refHtml(key) {
    var s = source(key.split(".")[1]);
    if (!s) return "";
    return ' <a class="ref" href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(t(key)) + "</a>";
  }

  /* ---------- Даты ---------- */
  var fmtCache = {};
  function fmt(opts) {
    var k = JSON.stringify(opts);
    if (!fmtCache[k]) {
      var o = { timeZone: "UTC" };
      Object.keys(opts).forEach(function (x) { o[x] = opts[x]; });
      fmtCache[k] = App.i18n.dateFormat(o);
    }
    return fmtCache[k];
  }
  function toDate(iso) { return new Date(iso + "T00:00:00Z"); }
  function addDays(iso, n) { return new Date(toDate(iso).getTime() + n * 86400000).toISOString().slice(0, 10); }
  function short(iso) { return fmt({ day: "numeric", month: "long" }).format(toDate(iso)); }
  function weekdayName(iso) { return fmt({ weekday: "long" }).format(toDate(iso)); }
  function long(iso, withWeekday) {
    var s = short(iso) + " " + iso.slice(0, 4);
    return withWeekday === false ? s : s + ", " + weekdayName(iso);
  }

  /* ---------- Подвкладки с «таблеткой» ---------- */
  function Tabs(list, onSelect) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    var pill = list.querySelector(".calc__pill, .seg__pill");
    function name(b) { return b.getAttribute("data-mode") || b.getAttribute("data-card") || b.getAttribute("data-key"); }
    function visible() { return tabs.filter(function (b) { return b.offsetParent !== null; }); }
    function current() { return tabs.filter(function (b) { return b.getAttribute("aria-selected") === "true"; })[0]; }

    // Таблетка переезжает под выбранную вкладку: позиция и размер — из реальных размеров кнопки
    function placePill(instant) {
      var b = current();
      if (!pill || !b || !b.offsetParent) return;
      if (instant) pill.classList.add("no-anim");
      pill.style.width = b.offsetWidth + "px";
      pill.style.height = b.offsetHeight + "px";
      pill.style.transform = "translate(" + b.offsetLeft + "px," + b.offsetTop + "px)";
      if (instant) { void pill.offsetWidth; pill.classList.remove("no-anim"); }
      pill.classList.add("is-ready");
    }
    function reveal(b) { // прокручиваем только саму строку вкладок, не страницу
      if (list.scrollWidth > list.clientWidth) list.scrollLeft = b.offsetLeft - (list.clientWidth - b.offsetWidth) / 2;
    }
    function select(b, focus, silent) {
      tabs.forEach(function (x) {
        var on = x === b;
        x.setAttribute("aria-selected", on ? "true" : "false");
        x.tabIndex = on ? 0 : -1;
      });
      placePill(false);
      reveal(b);
      if (focus) b.focus();
      if (!silent) onSelect(b, name(b));
    }
    tabs.forEach(function (b) { b.addEventListener("click", function () { select(b, false); }); });
    list.addEventListener("keydown", function (e) {
      var v = visible(), i = v.indexOf(document.activeElement), n = null;
      if (i < 0) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (i + 1) % v.length;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (i + v.length - 1) % v.length;
      else if (e.key === "Home") n = 0;
      else if (e.key === "End") n = v.length - 1;
      if (n === null) return;
      e.preventDefault();               // и не даём стрелкам листать большие вкладки
      select(v[n], true);
    });
    if (window.ResizeObserver) new ResizeObserver(function () { placePill(true); }).observe(list);
    window.addEventListener("load", function () { placePill(true); });
    placePill(true);
    return {
      select: function (key, focus, silent) {
        var b = tabs.filter(function (x) { return name(x) === key; })[0];
        if (b) select(b, focus, silent);
      },
      current: function () { var b = current(); return b ? name(b) : null; },
      place: placePill
    };
  }

  /* ---------- Свайп влево/вправо по элементу ---------- */
  function onSwipe(el, cb) {
    var x0 = null, y0 = null;
    el.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) { x0 = null; return; }
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    }, { passive: true });
    el.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) cb(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  window.App = window.App || {};
  window.App.ui = {
    t: t, esc: esc, lowerFirst: lowerFirst, refHtml: refHtml,
    fmt: fmt, toDate: toDate, addDays: addDays, short: short, long: long, weekdayName: weekdayName,
    Tabs: Tabs, onSwipe: onSwipe, reduced: reduced
  };
})();
