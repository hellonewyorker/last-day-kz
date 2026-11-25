/* =========================================================
   Вкладка ④ «Что получить при увольнении» — чек-лист
   и выдвижная панель «Куда обратиться».
   • Отметки «получил» — только в памяти страницы (без localStorage,
     правило 8 CLAUDE.md): после перезагрузки сбрасываются.
   • Если в калькуляторе уже посчитана дата прекращения договора,
     рядом со сроком показываем конкретную дату (считает js/calc.js).
   • Суммы не считаем.
   ========================================================= */
(function () {
  "use strict";

  var U, C;
  function $(id) { return document.getElementById(id); }
  function t(k, v) { return U.t(k, v); }
  function refs(keys) { return (keys || []).map(U.refHtml).join(""); }

  // date: какое поле результата C.documents() показать рядом со сроком
  var ITEMS = {
    money: [
      { id: "final", refs: ["ref.tk-113.p4"], date: "paymentDeadline" },
      { id: "vacation", refs: ["ref.tk-96.p2", "ref.tk-113.p4"], date: "paymentDeadline" }
    ],
    docs: [
      { id: "work", refs: ["ref.tk-62.p1"], date: "workDocument", on: true },
      { id: "order", refs: ["ref.tk-61.p3"], date: "orderCopyDeadline", assume: "pay.d.order.assume" },
      { id: "cert", refs: ["ref.tk-62.p2"], date: "certificateDeadline", extra: "pay.d.cert.req" }
    ]
  };
  var PREFIX = { money: "pay.m.", docs: "pay.d." };
  var TOTAL = ITEMS.money.length + ITEMS.docs.length;
  var got = {};          // { id: true } — только в памяти

  function dates() {
    var info = App.calcUI && App.calcUI.termination ? App.calcUI.termination() : null;
    if (!info) return null;
    var d = C.documents(info.term, info.req);
    return d.ok ? d : null;
  }

  function chipDate(iso, d) {
    var s = U.short(iso);
    if (iso.slice(0, 4) !== d.terminationDate.slice(0, 4)) s += " " + iso.slice(0, 4);
    return s + ", " + U.fmt({ weekday: "short" }).format(U.toDate(iso));
  }

  function renderDates(d) {
    $("pay-dates").innerHTML = d
      ? "<p>" + U.esc(t("pay.dates.from", { date: U.long(d.terminationDate) })) + "</p>"
      : "<p>" + U.esc(t("pay.dates.none")) + ' <button type="button" class="linklike" data-open-calc>' + U.esc(t("pay.dates.open")) + "</button></p>";
  }

  function renderList(group, d) {
    var box = $("ppanel-" + group);
    var html = '<ul class="pay__list">' + ITEMS[group].map(function (it, i) {
      var k = PREFIX[group] + it.id, id = "got-" + it.id;
      var date = d && d[it.date] ? '<span class="pay__date">' + U.esc(t(it.on ? "pay.dateChip.on" : "pay.dateChip", { date: chipDate(d[it.date], d) })) + "</span>" : "";
      return '<li class="pay__item' + (got[it.id] ? " is-got" : "") + '" style="--i:' + i + '">' +
        '<label class="pay__check"><input type="checkbox" id="' + id + '" data-item="' + it.id + '"' + (got[it.id] ? " checked" : "") +
          ' aria-labelledby="' + id + '-lbl ' + id + '-title"><span class="pay__box" aria-hidden="true"></span><span class="pay__got" id="' + id + '-lbl">' + U.esc(t("pay.got")) + "</span></label>" +
        '<div class="pay__body">' +
          '<div class="pay__head"><p class="pay__title" id="' + id + '-title">' + U.esc(t(k + ".title")) + "</p>" +
          '<button class="pay__toggle" type="button" aria-expanded="false" aria-controls="' + id + '-more" title="' + U.esc(t("pay.more")) + '">' +
            '<svg aria-hidden="true"><use href="#i-right"/></svg><span class="visually-hidden">' + U.esc(t("pay.more")) + "</span></button></div>" +
          '<p class="pay__term"><span>' + U.esc(t(k + ".term")) + "</span>" + date + refs(it.refs) + "</p>" +
          // описание и подсказки: на ноутбуке видны всегда, на телефоне — по кнопке «Подробнее» (правило 4)
          '<div class="pay__more" id="' + id + '-more">' +
            '<p class="pay__text">' + U.esc(t(k + ".text")) + "</p>" +
            (it.assume && d ? '<p class="pay__hint">' + U.esc(t(it.assume)) + "</p>" : "") +
            (it.extra ? '<p class="pay__hint">' + U.esc(t(it.extra)) + "</p>" : "") +
          "</div>" +
        "</div></li>";
    }).join("") + "</ul>";
    if (group === "money") html += '<p class="pay__note">' + U.esc(t("pay.money.note")) + refs(["ref.tk-113.p4"]) + "</p>";
    html += '<p class="pay__memory">' + U.esc(t("pay.memory")) + "</p>";
    box.innerHTML = html;
  }

  function renderProgress() {
    var n = Object.keys(got).filter(function (k) { return got[k]; }).length;
    var ring = $("pay-ring"), len = 2 * Math.PI * 18;
    ring.style.strokeDasharray = len.toFixed(2);
    ring.style.strokeDashoffset = (len * (1 - n / TOTAL)).toFixed(2);
    $("pay-count").textContent = n === TOTAL ? t("pay.progress.done") : t("pay.progress", { n: n, total: TOTAL });
    $("pay-ring").parentNode.classList.toggle("is-done", n === TOTAL);
  }

  function render() {
    var d = dates();
    renderDates(d);
    renderList("money", d);
    renderList("docs", d);
    renderProgress();
  }

  /* ---------- Панель «Куда обратиться» ---------- */
  function renderHelp() {
    var src = ["ref.news-wage-delay"];
    $("help-body").innerHTML =
      '<p class="help__lead">' + U.esc(t("help.lead")) + "</p>" +
      '<ol class="help__steps">' +
        "<li>" + U.esc(t("help.step1")) + refs(src) + "</li>" +
        "<li>" + U.esc(t("help.step2")) + refs(src) + "</li>" +
        "<li>" + U.esc(t("help.step3")) + refs(src) + "</li>" +
      "</ol>" +
      '<h3 class="help__h">' + U.esc(t("help.channels")) + "</h3>" +
      '<ul class="help__channels">' +
        "<li>" + U.esc(t("help.ch.eotinish")) + refs(["ref.news-wage-delay"]) + "</li>" +
      "</ul>" +
      '<p class="help__ministry">' + U.esc(t("help.ministry")) + refs(["ref.enbek"]) + "</p>" +
      '<button class="btn btn--ghost btn--sm" type="button" data-help-deadline>' + U.esc(t("help.deadline")) + "</button>" +
      '<p class="help__disclaimer">' + U.esc(t("help.disclaimer")) + "</p>";
    $("help-body").addEventListener("click", function (e) {
      if (e.target.closest("[data-help-deadline]")) {
        $("help").close();
        App.calcUI.openMode("unpaid");
      }
    });
  }

  function init() {
    U = App.ui; C = window.LastDay;
    if (!U || !C) return;
    if ($("help-body")) renderHelp();
    if (!$("pay-sub")) return;

    U.Tabs($("pay-sub"), function (b, key) {
      $("ppanel-money").hidden = key !== "money";
      $("ppanel-docs").hidden = key !== "docs";
    });
    var panel = $("panel-payout");
    panel.addEventListener("change", function (e) {
      var box = e.target.closest("[data-item]");
      if (!box) return;
      got[box.getAttribute("data-item")] = box.checked;
      box.closest(".pay__item").classList.toggle("is-got", box.checked);
      renderProgress();
    });
    panel.addEventListener("click", function (e) {
      var tg = e.target.closest(".pay__toggle");
      if (tg) {
        var open = tg.getAttribute("aria-expanded") !== "true";
        tg.setAttribute("aria-expanded", String(open));
        tg.closest(".pay__item").classList.toggle("is-open", open);
        return;
      }
      if (e.target.closest("[data-open-calc]")) App.calcUI.openMode("docs");
    });
    $("pay-unpaid").addEventListener("click", function () { var h = $("help"); if (h.showModal) h.showModal(); });
    // даты могли посчитать в калькуляторе — обновляем при каждом заходе на вкладку
    window.addEventListener("hashchange", function () { if (location.hash === "#payout") render(); });
    render();
  }

  window.App = window.App || {};
  window.App.payout = { init: init };
})();
