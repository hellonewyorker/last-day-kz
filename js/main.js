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
    App.calcUI.init();
    App.topics.init();
    App.payout.init();
  });
})();
