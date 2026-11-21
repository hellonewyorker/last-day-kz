/* =========================================================
   Вкладка ② «Как считается срок» и вкладка ③ «Можно ли раньше».
   ② — лента из трёх точек, карточки-перевёртыши (ст. 13), игра
       «Угадай дату» (ответы считает js/calc.js), «Три срока».
   ③ — дерево решений из data/tree.js.
   Тексты — из data/i18n.js, ссылки — data/sources.js.
   ========================================================= */
(function () {
  "use strict";

  var U, C;
  function $(id) { return document.getElementById(id); }
  function t(k, v) { return U.t(k, v); }
  function refs(keys) { return (keys || []).map(U.refHtml).join(""); }
  function para(textKey, refKeys, cls) {
    return '<p' + (cls ? ' class="' + cls + '"' : "") + ">" + U.esc(t(textKey)) + refs(refKeys) + "</p>";
  }

  /* =========================================================
     ② Подвкладки
     ========================================================= */
  function initRulesSub() {
    var panels = { steps: "rpanel-steps", rules: "rpanel-rules", game: "rpanel-game", deadlines: "rpanel-deadlines" };
    U.Tabs($("rules-sub"), function (b, key) {
      Object.keys(panels).forEach(function (k) { $(panels[k]).hidden = k !== key; });
    });
  }

  /* ---------- Лента из трёх точек ---------- */
  var STEPS = {
    "1": { title: "rules.step.1.title", parts: [["rules.step.1.text", ["ref.tk-56.p1"]], ["rules.step.1.text2", ["ref.tk-13.p3"]]] },
    "2": { title: "rules.step.2.title", parts: [["rules.step.2.text", ["ref.tk-13.p4", "ref.tk-13.p5"]], ["rules.step.2.text2", ["ref.tk-56.p4", "ref.tk-56.p5"]]] },
    "3": { title: "rules.step.3.title", parts: [["rules.step.3.text", ["ref.tk-113.p4"]], ["rules.step.3.text2", ["ref.tk-113.p4"]]] }
  };
  function initSteps() {
    var card = $("step-card");
    function show(key) {
      var s = STEPS[key];
      card.setAttribute("aria-labelledby", "step-" + key);
      card.innerHTML = '<p class="steps__tag">' + U.esc(key + " / 3") + "</p>" +
        '<h3 class="steps__h">' + U.esc(t(s.title)) + "</h3>" +
        s.parts.map(function (p) { return para(p[0], p[1]); }).join("");
      card.classList.remove("is-in"); void card.offsetWidth; card.classList.add("is-in");
    }
    U.Tabs($("steps-line"), function (b, key) { show(key); });
    show("1");
  }

  /* ---------- Карточки-перевёртыши (ст. 13) ---------- */
  var FLIPS = [
    { q: "rules.flip.1.q", a: "rules.flip.1.a", refs: ["ref.tk-13.p3"] },
    { q: "rules.flip.2.q", a: "rules.flip.2.a", refs: ["ref.tk-13.p4"] },
    { q: "rules.flip.3.q", a: "rules.flip.3.a", refs: ["ref.tk-13.p4"] },
    { q: "rules.flip.4.q", a: "rules.flip.4.a", refs: ["ref.tk-13.p5"] }
  ];
  function initFlips() {
    var box = $("flips");
    box.innerHTML = FLIPS.map(function (f, i) {
      return '<div class="flip" data-flipped="false" style="--i:' + i + '"><div class="flip__inner">' +
        '<button class="flip__face flip__front" type="button" aria-expanded="false" aria-controls="flip-a-' + i + '">' +
          '<span class="flip__tag">' + U.esc(t("rules.flip.front")) + '</span><span class="flip__q">' + U.esc(t(f.q)) + "</span></button>" +
        '<div class="flip__face flip__back" id="flip-a-' + i + '" aria-hidden="true">' +
          '<span class="flip__tag">' + U.esc(t("rules.flip.back")) + "</span>" +
          '<p class="flip__a" tabindex="-1">' + U.esc(t(f.a)) + refs(f.refs) + "</p>" +
          '<button class="flip__again" type="button" tabindex="-1">' + U.esc(t("rules.flip.again")) + "</button>" +
        "</div></div></div>";
    }).join("");
    // ссылки на обороте недоступны с клавиатуры, пока карточка не перевёрнута
    Array.prototype.forEach.call(box.querySelectorAll(".flip__back a"), function (a) { a.tabIndex = -1; });

    function set(flip, on) {
      var front = flip.querySelector(".flip__front"), back = flip.querySelector(".flip__back");
      flip.setAttribute("data-flipped", String(on));
      front.setAttribute("aria-expanded", String(on));
      front.setAttribute("aria-hidden", String(on));
      front.tabIndex = on ? -1 : 0;
      back.setAttribute("aria-hidden", String(!on));
      Array.prototype.forEach.call(back.querySelectorAll("a, button"), function (el) { el.tabIndex = on ? 0 : -1; });
      (on ? back.querySelector(".flip__a") : front).focus({ preventScroll: true });
    }
    box.addEventListener("click", function (e) {
      var flip = e.target.closest(".flip");
      if (!flip || e.target.closest("a")) return;
      if (e.target.closest(".flip__front")) set(flip, true);
      else if (e.target.closest(".flip__back")) set(flip, false);
    });
  }

  /* ---------- Игра «Угадай дату» ---------- */
  // Даты подачи — из data-try в _old/index.html; срок — 1 месяц по закону.
  // reason: как показывать причину переноса в тексте примера (как в старом тексте).
  var EXAMPLES = [
    { id: "aigerim", notice: "2026-11-05", reason: "lower" },
    { id: "alina", notice: "2026-11-16", reason: "raw" },
    { id: "daniyar", notice: "2027-01-31", reason: "lower" }
  ];
  // Варианты ответа считаются функциями calc.js: верный срок, «забыли про перенос», «посчитали 30 дней»
  function options(ex) {
    var r = C.calculate(ex.notice, 1);
    var set = [r.noticeEnd];
    [r.nominalEnd, U.addDays(ex.notice, 30), C.addWorkingDays(r.noticeEnd, 1), U.addDays(r.noticeEnd, -1)]
      .forEach(function (d) { if (set.length < 3 && set.indexOf(d) === -1) set.push(d); });
    return { r: r, list: set.sort() };
  }
  function exampleText(ex, r) {
    var reason = C.dayOffReason(r.nominalEnd) || "";
    return t("game.p." + ex.id + ".text", {
      noticeWd: U.weekdayName(ex.notice),
      notice: U.long(ex.notice, false),
      nominal: U.short(r.nominalEnd),
      nominalReason: ex.reason === "lower" ? U.lowerFirst(reason) : reason,
      endWd: U.weekdayName(r.noticeEnd),
      end: U.short(r.noticeEnd),
      pay: U.short(r.paymentDeadline)
    });
  }
  // пометки к тексту примера: «то же число / последний день месяца», перенос с нерабочего дня, 3 рабочих дня;
  // если срок упал на праздник — ещё Закон о праздниках
  function exampleRefs(r) {
    var keys = ["ref.tk-13.p4", "ref.tk-13.p5", "ref.tk-113.p4"];
    var reason = C.dayOffReason(r.nominalEnd);
    if (reason && reason !== t("calc.dayoff.saturday") && reason !== t("calc.dayoff.sunday")) keys.push("ref.law-holidays");
    return keys;
  }
  function initGame() {
    var box = $("game"), idx = 0;
    function render() {
      var ex = EXAMPLES[idx], o = options(ex);
      box.innerHTML =
        '<div class="game__top"><p class="game__counter">' + U.esc(t("game.counter", { n: idx + 1, total: EXAMPLES.length })) + "</p>" +
          '<p class="game__fiction">' + U.esc(t("game.fictional")) + "</p></div>" +
        '<div class="game__person"><span class="game__avatar" aria-hidden="true">' + U.esc(t("game.p." + ex.id + ".name").charAt(0)) + "</span>" +
          '<div><p class="game__name">' + U.esc(t("game.p." + ex.id + ".name")) + ", " + U.esc(t("game.p." + ex.id + ".role")) + "</p>" +
          '<p class="game__meta">' + U.esc(t("game.notice", { date: U.long(ex.notice) })) + " " + U.esc(t("game.period")) + "</p></div></div>" +
        '<p class="game__q" id="game-q">' + U.esc(t("game.question")) + "</p>" +
        '<div class="game__opts" role="group" aria-labelledby="game-q">' + o.list.map(function (d) {
          return '<button class="game__opt" type="button" data-date="' + d + '">' + U.esc(U.short(d) + ", " + U.weekdayName(d)) + "</button>";
        }).join("") + "</div>" +
        '<div class="game__feedback" id="game-fb" aria-live="polite"></div>';
      box.classList.remove("is-in", "is-answered"); void box.offsetWidth; box.classList.add("is-in");
    }
    box.addEventListener("click", function (e) {
      var opt = e.target.closest(".game__opt");
      if (opt && !opt.disabled) {
        var ex = EXAMPLES[idx], o = options(ex), right = opt.getAttribute("data-date") === o.r.noticeEnd;
        Array.prototype.forEach.call(box.querySelectorAll(".game__opt"), function (b) {
          b.disabled = true;
          if (b.getAttribute("data-date") === o.r.noticeEnd) b.classList.add("is-right");
        });
        if (!right) opt.classList.add("is-wrong");
        box.classList.add("is-answered");
        var last = idx === EXAMPLES.length - 1;
        $("game-fb").innerHTML =
          '<p class="game__verdict' + (right ? " is-right" : "") + '">' + U.esc(right ? t("game.right") : t("game.wrong", { date: U.short(o.r.noticeEnd) })) + "</p>" +
          '<p class="game__text">' + U.esc(exampleText(ex, o.r)) + refs(exampleRefs(o.r)) + "</p>" +
          '<div class="game__actions"><button class="btn btn--primary btn--sm" type="button" data-try="' + ex.notice + '">' + U.esc(t("game.try")) + "</button>" +
          '<button class="btn btn--ghost btn--sm" type="button" data-next>' + U.esc(t(last ? "game.restart" : "game.next")) + "</button></div>";
        return;
      }
      var tryBtn = e.target.closest("[data-try]");
      if (tryBtn) { App.calcUI.tryExample(tryBtn.getAttribute("data-try")); return; }
      if (e.target.closest("[data-next]")) {
        idx = (idx + 1) % EXAMPLES.length;
        render();
        var first = box.querySelector(".game__opt");
        if (first) first.focus({ preventScroll: true });
      }
    });
    render();
  }

  /* ---------- «Три срока, которые важно знать» ---------- */
  var DEADLINES = [
    { n: 1, refs: ["ref.tk-56.p1"] },
    { n: 2, refs: ["ref.tk-113.p4"] },
    { n: 3, refs: ["ref.tk-160", "ref.tk-160.ks81"] }
  ];
  function initDeadlines() {
    var box = $("dl"), i = 0;
    box.innerHTML =
      '<div class="dl__stage" id="dl-stage" aria-live="polite"></div>' +
      '<div class="dl__nav">' +
        '<button class="dl__arrow" type="button" data-dir="-1" title="' + U.esc(t("dl.prev")) + '" aria-label="' + U.esc(t("dl.prev")) + '"><svg aria-hidden="true"><use href="#i-left"/></svg></button>' +
        '<div class="dl__dots">' + DEADLINES.map(function (d, k) {
          return '<button class="dl__dot" type="button" data-go="' + k + '" aria-label="' + U.esc(t("dl." + d.n + ".num") + " " + t("dl." + d.n + ".unit")) + '"></button>';
        }).join("") + "</div>" +
        '<button class="dl__arrow" type="button" data-dir="1" title="' + U.esc(t("dl.next")) + '" aria-label="' + U.esc(t("dl.next")) + '"><svg aria-hidden="true"><use href="#i-right"/></svg></button>' +
      "</div>" +
      '<p class="topic__hint">' + U.esc(t("dl.hint")) + "</p>";
    var stage = $("dl-stage");
    function show(k, dir) {
      i = (k + DEADLINES.length) % DEADLINES.length;
      var d = DEADLINES[i], n = d.n;
      stage.innerHTML =
        '<div class="dl__card" data-anim="' + (dir || 0) + '">' +
          '<p class="dl__counter">' + U.esc(t("dl.counter", { n: i + 1 })) + "</p>" +
          '<p class="dl__big"><span class="dl__num">' + U.esc(t("dl." + n + ".num")) + '</span> <span class="dl__unit">' + U.esc(t("dl." + n + ".unit")) + "</span></p>" +
          '<p class="dl__caption">' + U.esc(t("dl." + n + ".caption")) + "</p>" +
          para("dl." + n + ".text", d.refs, "dl__text") +
        "</div>";
      Array.prototype.forEach.call(box.querySelectorAll(".dl__dot"), function (b, k2) {
        b.setAttribute("aria-current", k2 === i ? "step" : "false");
      });
    }
    box.addEventListener("click", function (e) {
      if (e.target.closest("a")) return;
      var arrow = e.target.closest("[data-dir]"), dot = e.target.closest("[data-go]");
      if (arrow) show(i + +arrow.getAttribute("data-dir"), +arrow.getAttribute("data-dir"));
      else if (dot) show(+dot.getAttribute("data-go"), +dot.getAttribute("data-go") > i ? 1 : -1);
      else if (e.target.closest(".dl__card")) show(i + 1, 1);   // клик по карточке — следующий срок
    });
    box.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        var dir = e.key === "ArrowRight" ? 1 : -1;
        show(i + dir, dir);
      }
    });
    U.onSwipe(stage, function (dir) { show(i + dir, dir); });
    show(0);
  }

  /* =========================================================
     ③ Дерево решений
     ========================================================= */
  function initTree() {
    var T = window.LD_TREE, path = [];   // path: [{ id, answer: "yes"|"no" }]
    var crumbs = $("tree-crumbs"), stage = $("tree-stage");

    function current() {
      var id = T.start;
      path.forEach(function (p) { id = T.nodes[p.id][p.answer]; });
      return id;
    }
    function render(focus) {
      var id = current(), node = T.nodes[id];
      crumbs.innerHTML = path.length
        ? path.map(function (p, k) {
            var q = t(T.nodes[p.id].q);
            return '<li><button class="tree__crumb" type="button" data-back="' + k + '" aria-label="' + U.esc(t("tree.back", { q: q })) + '">' +
              '<span class="tree__crumb-q">' + U.esc(q) + '</span><span class="tree__crumb-a">' + U.esc(t("tree." + p.answer)) + "</span></button></li>";
          }).join("")
        : '<li class="tree__crumb-empty">' + U.esc(t("tree.pathEmpty")) + "</li>";

      if (node.q) {
        stage.innerHTML = '<div class="tree__card" data-depth="' + path.length + '">' +
          '<h3 class="tree__q" tabindex="-1">' + U.esc(t(node.q)) + "</h3>" +
          '<div class="tree__answers"><button class="btn btn--primary tree__ans" type="button" data-answer="yes">' + U.esc(t("tree.yes")) + "</button>" +
          '<button class="btn btn--ghost tree__ans" type="button" data-answer="no">' + U.esc(t("tree.no")) + "</button></div></div>";
      } else {
        var action = node.action === "revoke" ? '<button class="btn btn--primary btn--sm" type="button" data-go="revoke">' + U.esc(t("tree.go.revoke")) + "</button>"
          : node.action === "calc" ? '<button class="btn btn--primary btn--sm" type="button" data-go="calc">' + U.esc(t("tree.go.calc")) + "</button>" : "";
        stage.innerHTML = '<div class="tree__card tree__card--result">' +
          '<p class="tree__tag">' + U.esc(t("tree.result")) + "</p>" +
          '<h3 class="tree__title" tabindex="-1">' + U.esc(t(node.title)) + "</h3>" +
          node.parts.map(function (p) { return para(p.text, p.refs, "tree__text"); }).join("") +
          (node.note ? '<p class="tree__note">' + U.esc(t(node.note)) + "</p>" : "") +
          '<div class="tree__actions">' + action + "</div>" +
          '<p class="tree__disclaimer">' + U.esc(t("tree.disclaimer")) + "</p></div>";
      }
      $("tree-restart").hidden = path.length === 0;
      if (focus) {
        var h = stage.querySelector("[tabindex='-1']");
        if (h) h.focus({ preventScroll: true });
      }
    }
    stage.addEventListener("click", function (e) {
      var ans = e.target.closest("[data-answer]");
      if (ans) { path.push({ id: current(), answer: ans.getAttribute("data-answer") }); render(true); return; }
      var go = e.target.closest("[data-go]");
      if (go) App.calcUI.openMode("last");
    });
    crumbs.addEventListener("click", function (e) {
      var b = e.target.closest("[data-back]");
      if (b) { path = path.slice(0, +b.getAttribute("data-back")); render(true); }
    });
    $("tree-restart").addEventListener("click", function () { path = []; render(true); });
    render(false);
  }

  function init() {
    U = App.ui; C = window.LastDay;
    if (!U || !C) return;
    if ($("rules-sub")) { initRulesSub(); initSteps(); initFlips(); initGame(); initDeadlines(); }
    if ($("tree-stage") && window.LD_TREE) initTree();
  }

  window.App = window.App || {};
  window.App.topics = { init: init };
})();
