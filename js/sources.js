/* =========================================================
   Вкладка ⑤ «Источники и оговорка».
   • Всё берётся из data/sources.js (правило 7 CLAUDE.md): ссылка, акт,
     группа (подвкладка) и usedOn — где на сайте есть пометки.
   • Статьи ТК — кнопками; выбранная показывается карточкой.
   • App.sources.show(id) — переход сюда из пометки (кнопка
     «В списке источников» в карточке у пометки, js/fx.js).
   ========================================================= */
(function () {
  "use strict";

  var U, sub, selected = null;
  function $(id) { return document.getElementById(id); }
  function t(k, v) { return U.t(k, v); }
  function list() { return window.LD_SOURCES || []; }
  function source(id) { return list().filter(function (s) { return s.id === id; })[0] || null; }
  function group(g) { return list().filter(function (s) { return s.group === g; }); }
  function num(s) { return s.id.replace("tk-", ""); }
  function isAdilet(s) { return /adilet\.zan\.kz/.test(s.url); }
  function checked(on) { return on ? t("refpop.checked", { date: U.long(on, false) }) : t("refpop.unchecked"); }

  function openBtn(s, extra) {
    return '<a class="btn btn--primary btn--sm src__open" href="' + U.esc(s.url) + '" target="_blank" rel="noopener"' + (extra || "") + ">" +
      U.esc(t(isAdilet(s) ? "refpop.open.adilet" : "refpop.open.other")) +
      '<svg aria-hidden="true"><use href="#i-out"/></svg></a>';
  }
  // «Где на сайте»: вкладки — ссылками на них, панель «Куда обратиться» — кнопкой
  function used(s) {
    return '<p class="src__used"><span>' + U.esc(t("src.used")) + "</span> " + (s.usedOn || []).map(function (w) {
      return w === "help"
        ? '<button class="src__place" type="button" data-open-help>' + U.esc(t("help.title")) + "</button>"
        : '<a class="src__place" href="#' + w + '">' + U.esc(t("tab." + w + ".short")) + "</a>";
    }).join("") + "</p>";
  }

  /* ---------- Кодекс ---------- */
  function renderCode() {
    var items = group("code");
    if (!selected) selected = items[0].id;
    $("spanel-code").innerHTML =
      '<p class="src__act">' + U.esc(items[0].act) + "</p>" +
      '<div class="src__grid" role="group" aria-label="' + U.esc(t("src.code.label")) + '">' +
        items.map(function (s, i) {
          return '<button class="src__chip" type="button" data-pick="' + s.id + '" aria-controls="src-card" aria-pressed="' + (s.id === selected) + '"' +
            ' aria-label="' + U.esc(t("src.code.chipLabel", { n: num(s) })) + '" style="--i:' + i + '">' + U.esc(t("src.code.chip", { n: num(s) })) + "</button>";
        }).join("") +
      "</div>" +
      '<article class="src__card" id="src-card" aria-live="polite"></article>';
    renderCard(false);
  }
  function renderCard(animate) {
    var s = source(selected), card = $("src-card"), title = t("src." + s.id + ".title");
    card.classList.toggle("is-unchecked", /\[ПРОВЕРИТЬ\]/.test(title));
    card.innerHTML =
      '<h3 class="src__title" id="src-card-title" tabindex="-1"><span class="src__num">' + U.esc(t("src.article", { n: num(s) })) + ".</span> " + U.esc(title) + "</h3>" +
      used(s) +
      '<div class="src__foot">' + openBtn(s) + '<p class="src__date">' + U.esc(checked(s.checkedOn)) + "</p></div>";
    if (animate && !U.reduced.matches) { card.classList.remove("is-in"); void card.offsetWidth; card.classList.add("is-in"); }
  }
  function pick(id, focus) {
    selected = id;
    Array.prototype.forEach.call($("spanel-code").querySelectorAll("[data-pick]"), function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-pick") === id));
    });
    renderCard(true);
    if (focus) $("src-card-title").focus();
  }

  /* ---------- Праздники и «Куда писать» ---------- */
  function newsItem(s) {
    return '<li class="src__item" data-id="' + s.id + '"><a class="src__link" href="' + U.esc(s.url) + '" target="_blank" rel="noopener">' +
      "<span>" + U.esc(s.act) + '</span><svg aria-hidden="true"><use href="#i-out"/></svg></a></li>';
  }
  function renderHolidays() {
    var law = source("law-holidays"), news = group("holidays").filter(function (s) { return s !== law; });
    $("spanel-holidays").innerHTML =
      '<div class="src__item src__law" data-id="' + law.id + '">' +
        '<p class="src__h">' + U.esc(t("src.law")) + "</p>" +
        '<p class="src__name">' + U.esc(law.act) + "</p>" +
        '<p class="src__meta">' + U.esc(law.article) + "</p>" +
        used(law) +
        '<div class="src__foot">' + openBtn(law) + '<p class="src__date">' + U.esc(checked(law.checkedOn)) + "</p></div>" +
      "</div>" +
      '<p class="src__h">' + U.esc(t("src.news")) + "</p>" +
      '<p class="src__hint">' + U.esc(t("src.news.note")) + "</p>" +
      '<ul class="src__list">' + news.map(newsItem).join("") + "</ul>";
  }
  function renderHelp() {
    $("spanel-help").innerHTML =
      '<p class="src__hint">' + U.esc(t("src.help.lead")) + "</p>" +
      '<ul class="src__list">' + group("help").map(newsItem).join("") + "</ul>" +
      '<button class="btn btn--ghost btn--sm" type="button" data-open-help>' + U.esc(t("src.help.open")) + "</button>";
  }

  /* ---------- Оговорка ---------- */
  function renderNote() {
    var n = 1, html = "";
    while (U.t("src.note." + n) !== "src.note." + n && n < 20) { html += "<li>" + U.esc(t("src.note." + n)) + "</li>"; n++; }
    $("spanel-note").innerHTML = '<ul class="src__notes">' + html + "</ul>" +
      '<p class="src__date">' + U.esc(checked(window.LD_CHECKED_ON)) + "</p>";
  }

  function showSub(key) {
    ["code", "holidays", "help", "note"].forEach(function (k) { $("spanel-" + k).hidden = k !== key; });
  }

  /* ---------- Переход из пометки ---------- */
  function reveal(id) {
    var s = source(id);
    if (!s) return;
    sub.select(s.group, false);
    if (s.group === "code") { pick(id, true); return; }
    var item = $("spanel-" + s.group).querySelector('[data-id="' + id + '"]');
    if (!item) return;
    item.classList.remove("is-target"); void item.offsetWidth; item.classList.add("is-target");
    var link = item.querySelector("a");
    if (link) link.focus();
  }
  function show(id) {
    var dlg = document.querySelector("dialog[open]");
    if (dlg) dlg.close();
    var i = App.tabs.ids.indexOf("sources");
    if (App.tabs.current() === i) { reveal(id); return; }
    var done = false;
    function go() { if (done) return; done = true; window.removeEventListener("ld:tabchange", go); reveal(id); }
    window.addEventListener("ld:tabchange", go);
    setTimeout(go, 900);   // если событие не пришло (например, вкладка в фоне)
    App.tabs.go(i);
  }

  function init() {
    U = App.ui;
    if (!U || !$("src-sub")) return;
    renderCode();
    renderHolidays();
    renderHelp();
    renderNote();
    sub = U.Tabs($("src-sub"), function (b, key) { showSub(key); });
    var panel = $("panel-sources");
    panel.addEventListener("click", function (e) {
      var b = e.target.closest("[data-pick]");
      if (b) { pick(b.getAttribute("data-pick"), false); return; }
      if (e.target.closest("[data-open-help]")) { var h = $("help"); if (h && h.showModal) h.showModal(); }
    });
  }

  window.App = window.App || {};
  window.App.sources = { init: init, show: show };
})();
