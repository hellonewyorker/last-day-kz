/* =========================================================
   Точка входа: тексты, тема, вкладки, бегущая строка,
   сегодняшняя дата, панель «Куда обратиться».
   ========================================================= */
(function () {
  "use strict";

  function initToday() {
    var now = new Date(); // только показываем, нигде не храним
    var chip = document.getElementById("today-chip");
    chip.textContent = App.i18n.dateFormat({ weekday: "short", day: "numeric", month: "long" }).format(now);
    // Карточку «Сегодня» на вкладке калькулятора заменил листок в js/calc-ui.js
  }

  /* ---------- Бегущая строка фактов (data/ticker.js) ----------
     Бесшовная CSS-анимация: две одинаковые ленты, сдвиг на -50%.
     Пауза: наведение, фокус и кнопка «пауза» (WCAG 2.2.2).
     Клик по факту — переход на вкладку, где он объяснён со ссылкой на adilet. */
  function initTicker() {
    var ticker = document.getElementById("ticker");
    var btn = document.getElementById("ticker-toggle");
    var list = document.getElementById("ticker-list"), copy = document.getElementById("ticker-copy");
    var sources = {};
    (window.LD_SOURCES || []).forEach(function (s) { sources[s.id] = s; });
    function esc(x) { return String(x).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
    var html = (window.LD_TICKER || []).map(function (f, i) {
      var src = sources[f.src];
      var ref = src ? (i === 0 ? App.i18n.t("ticker.lawPrefix") : "") + src.article : "";
      // ссылки не в порядке Tab: строка движется; те же переходы есть во вкладках
      return '<li class="ticker__item"><a class="ticker__link" href="#' + f.tab + '" tabindex="-1">' +
        '<span class="ticker__fact">' + esc(App.i18n.t(f.text)) + "</span>" +
        (ref ? ' <span class="ticker__ref">· ' + esc(ref) + "</span>" : "") + "</a></li>";
    }).join("");
    list.innerHTML = html;
    copy.innerHTML = html;
    // скорость не зависит от длины текста: ~45 px в секунду
    requestAnimationFrame(function () {
      var w = list.scrollWidth;
      if (w) ticker.style.setProperty("--ticker-speed", Math.round(w / 45) + "s");
    });
    function sync() {
      var paused = ticker.classList.contains("is-paused");
      btn.setAttribute("aria-label", App.i18n.t(paused ? "ticker.play" : "ticker.pause"));
      btn.setAttribute("aria-pressed", String(paused));
    }
    btn.addEventListener("click", function () {
      ticker.classList.toggle("is-paused");
      sync();
    });
    sync();
  }

  /* ---------- Круглый бейдж «ДАЛЬШЕ →»: следующая вкладка ---------- */
  function initBadge() {
    var badge = document.getElementById("next-badge");
    if (!badge) return;
    function nextIndex() { return (App.tabs.current() + 1) % App.tabs.ids.length; }
    function sync() {
      var id = App.tabs.ids[nextIndex()];
      badge.setAttribute("aria-label", App.i18n.t("badge.label").replace("{tab}", App.i18n.t("tab." + id + ".title")));
    }
    badge.addEventListener("click", function () { App.tabs.go(nextIndex()); });
    window.addEventListener("hashchange", function () { setTimeout(sync, 0); });
    sync();
  }


  function initHelp() {
    var dialog = document.getElementById("help");
    var opener = document.getElementById("help-open");
    opener.addEventListener("click", function () { dialog.showModal(); });
    document.getElementById("help-close").addEventListener("click", function () { dialog.close(); });
    // клик по затемнению вокруг панели закрывает её
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    App.i18n.apply();
    App.theme.init();
    App.tabs.init();
    initTicker();
    initToday();
    initHelp();
    App.calcUI.init();
    App.topics.init();
    App.payout.init();
    App.sources.init();
    initBadge();
    App.fx.init();
  });
})();
