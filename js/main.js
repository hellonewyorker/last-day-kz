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

    // «19 ноября»: месяц берём в родительном падеже из formatToParts
    var parts = App.i18n.dateFormat({ day: "numeric", month: "long" }).formatToParts(now);
    var card = document.getElementById("today-card");
    parts.forEach(function (p) {
      var el = card.querySelector('[data-part="' + p.type + '"]');
      if (el) el.textContent = p.value;
    });
    card.querySelector('[data-part="weekday"]').textContent =
      App.i18n.dateFormat({ weekday: "long" }).format(now);
  }

  function initTicker() {
    var ticker = document.getElementById("ticker");
    var btn = document.getElementById("ticker-toggle");
    function sync() {
      var paused = ticker.classList.contains("is-paused");
      btn.setAttribute("aria-label", App.i18n.t(paused ? "ticker.play" : "ticker.pause"));
    }
    btn.addEventListener("click", function () {
      ticker.classList.toggle("is-paused");
      sync();
    });
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
  });
})();
