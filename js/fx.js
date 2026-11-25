/* =========================================================
   Интерактивность и эффекты (день 4). Всё, что в старом сайте
   было привязано к прокрутке, здесь привязано к открытию вкладки
   (событие ld:tabchange из js/tabs.js).
   • заголовки появляются по словам (word-mask, aria-label для диктора)
   • элементы въезжают по очереди (list-entry)
   • счётчики на вкладке ① добегают до значения
   • кнопки «притягиваются» к курсору; нажатие — уменьшение + vibrate(10)
   • карточка источника у пометок-ссылок (наведение, фокус, тап; Esc)
   • онбординг из трёх подсказок (без localStorage), кнопка «?»
   • «вы посмотрели N из 5 разделов» в шапке
   • стеклянные карточки: 3D-наклон и блик под курсором (movePointer/drawPointer)
   Всё движение отключается при prefers-reduced-motion.
   ========================================================= */
(function () {
  "use strict";

  var U;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var mouse = window.matchMedia("(hover: hover) and (pointer: fine)");
  var coarse = window.matchMedia("(pointer: coarse)");
  function $(id) { return document.getElementById(id); }
  function t(k, v) { return U.t(k, v); }
  function motionOK() { return !reduced.matches; }
  function panelOf(id) { return $("panel-" + id); }

  /* =========================================================
     Заголовки по словам (word-mask из старого app.js)
     ========================================================= */
  function splitHeadings() {
    Array.prototype.forEach.call(document.querySelectorAll(".panel__title"), function (h) {
      var original = h.textContent;
      var frag = document.createDocumentFragment(), index = 0;
      original.split(/( +)/).forEach(function (part) {
        if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
        var mask = document.createElement("span");
        mask.className = "word-mask";
        mask.setAttribute("aria-hidden", "true");
        var word = document.createElement("span");
        word.style.setProperty("--word", index++);
        word.textContent = part;
        mask.appendChild(word);
        frag.appendChild(mask);
      });
      h.setAttribute("aria-label", original);   // одно связное имя для экранного диктора
      h.textContent = "";
      h.appendChild(frag);
    });
  }
  function replay(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  /* ---------- Элементы въезжают по очереди (list-entry) ---------- */
  // только то, у чего нет своей анимации появления, чтобы ничего не проигрывалось дважды
  var ENTRY = ".calc__mode, .calc__cardtab, .seg__btn, .steps__dot, .stat, .chip, .field, .tree__answers .btn, .pay__progress, .pay__unpaid";
  function playEntries(panel) {
    if (!motionOK() || !panel) return;
    var counters = new Map();
    Array.prototype.forEach.call(panel.querySelectorAll(ENTRY), function (el) {
      if (el.offsetParent === null) return;
      var n = counters.get(el.parentElement) || 0;
      counters.set(el.parentElement, n + 1);
      el.style.setProperty("--order", n);
      replay(el, "list-entry");
    });
    setTimeout(function () {
      Array.prototype.forEach.call(panel.querySelectorAll(".list-entry"), function (el) { el.classList.remove("list-entry"); });
    }, 1500);
  }

  /* =========================================================
     Счётчики на вкладке ① (как «18+ / 95%» в референсе)
     ========================================================= */
  var STATS = [
    { from: 0, to: 1, unit: "stats.month.unit", cap: U_ref("ref.tk-56.p1") },
    { from: 0, to: 3, unit: "stats.pay.unit", cap: U_ref("ref.tk-113.p4") },
    { from: 100, to: 0, unit: "stats.zero.unit", cap: { local: "#sources", key: "stats.zero.cap" } }
  ];
  function U_ref(key) { return { ref: key }; }
  function renderStats() {
    var box = $("stats");
    if (!box) return;
    box.setAttribute("aria-label", t("stats.label"));
    box.setAttribute("role", "group");
    box.innerHTML = STATS.map(function (s, i) {
      var cap = s.cap.ref ? U.refHtml(s.cap.ref)
        : ' <a class="ref ref--local" href="' + s.cap.local + '">' + U.esc(t(s.cap.key)) + "</a>";
      return '<div class="stat">' +
        '<span class="visually-hidden">' + U.esc(s.to + " " + t(s.unit)) + "</span>" +
        '<span class="stat__num" aria-hidden="true" data-i="' + i + '">' + s.to + "</span>" +
        '<span class="stat__unit" aria-hidden="true">' + U.esc(t(s.unit)) + "</span>" + cap + "</div>";
    }).join("");
  }
  // ноутбук — в строке заголовка вкладки ①, телефон — в карточке «Даты» до первого расчёта
  var wideMq = window.matchMedia("(min-width: 900px)");
  function placeStats() {
    var box = $("stats"), head = document.querySelector("#panel-calc .panel__head"), slot = $("stats-slot");
    if (!box || !head || !slot) return;
    var host = wideMq.matches ? head : slot;
    if (box.parentNode !== host) host.appendChild(box);
  }
  function runStats() {
    var nums = document.querySelectorAll(".stat__num");
    if (!motionOK()) return;
    var start = performance.now(), dur = 900;
    (function frame(now) {
      var k = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - k, 3);
      Array.prototype.forEach.call(nums, function (el) {
        var s = STATS[+el.getAttribute("data-i")];
        el.textContent = Math.round(s.from + (s.to - s.from) * e);
      });
      if (k < 1) requestAnimationFrame(frame);
    })(start);
  }

  /* =========================================================
     Кнопки «притягиваются» к курсору + тактильный отклик
     ========================================================= */
  var MAGNET = ".btn, .next-badge, .tree__ans, .game__opt, .seg__btn, .calc__mode, .dl__arrow, .tour-open";
  var PRESS = MAGNET + ", .tab, .chip, .mc-day, .pay__check, .flip__front, .steps__dot, .calc__cardtab, .ticker__toggle";
  var pulls = new Map(), rafId = 0;
  function animatePulls() {   // плавное возвращение без CSS-transition (у кнопок свои переходы)
    rafId = 0;
    var busy = false;
    pulls.forEach(function (p, el) {
      p.x += (p.tx - p.x) * 0.25; p.y += (p.ty - p.y) * 0.25;
      if (Math.abs(p.tx - p.x) < 0.05 && Math.abs(p.ty - p.y) < 0.05) { p.x = p.tx; p.y = p.ty; }
      else busy = true;
      el.style.translate = p.x || p.y ? p.x.toFixed(2) + "px " + p.y.toFixed(2) + "px" : "";
      if (!p.tx && !p.ty && !p.x && !p.y) pulls.delete(el);
    });
    if (busy) rafId = requestAnimationFrame(animatePulls);
  }
  function pull(el, tx, ty) {
    var p = pulls.get(el) || { x: 0, y: 0, tx: 0, ty: 0 };
    p.tx = tx; p.ty = ty;
    pulls.set(el, p);
    if (!rafId) rafId = requestAnimationFrame(animatePulls);
  }
  var magnetEl = null;
  function initMagnet() {
    document.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse" || !mouse.matches || !motionOK()) return;
      var el = e.target.closest ? e.target.closest(MAGNET) : null;
      if (magnetEl && magnetEl !== el) pull(magnetEl, 0, 0);
      magnetEl = el;
      if (!el || el.disabled) return;
      var r = el.getBoundingClientRect();
      var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      pull(el, Math.max(-1, Math.min(1, dx)) * 5, Math.max(-1, Math.min(1, dy)) * 4);
    }, { passive: true });
    document.addEventListener("pointerleave", function () { if (magnetEl) pull(magnetEl, 0, 0); magnetEl = null; });

    // тактильный отклик: уменьшение (CSS .is-pressed) и короткая вибрация на телефоне
    document.addEventListener("pointerdown", function (e) {
      var el = e.target.closest ? e.target.closest(PRESS) : null;
      if (!el || el.disabled) return;
      el.classList.add("is-pressed");
      if (e.pointerType === "touch" && navigator.vibrate) { try { navigator.vibrate(10); } catch (err) { /* нет вибрации */ } }
      function up() {
        el.classList.remove("is-pressed");
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", up);
      }
      document.addEventListener("pointerup", up);
      document.addEventListener("pointercancel", up);
    });
  }

  /* =========================================================
     Карточка источника у пометки-ссылки
     ========================================================= */
  var pop, popRef = null, hideTimer = 0, showTimer = 0, lastPointer = "mouse", quietFocus = false;
  function sourceOf(a) {
    var id = a.getAttribute("data-src");
    return (window.LD_SOURCES || []).filter(function (s) { return s.id === id; })[0] || null;
  }
  function placePop(a) {
    var r = a.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight, m = 8;
    var top = r.bottom + 8;
    if (top + h > window.innerHeight - m) top = Math.max(m, r.top - h - 8);
    var left = Math.min(Math.max(m, r.left + r.width / 2 - w / 2), window.innerWidth - w - m);
    pop.style.top = top + "px";
    pop.style.left = left + "px";
  }
  function showPop(a) {
    var s = sourceOf(a);
    if (!s) return;
    clearTimeout(hideTimer);
    // внутри модальной панели карточка должна быть в том же верхнем слое
    var host = a.closest("dialog[open]") || document.body;
    if (pop.parentNode !== host) host.appendChild(pop);
    var checked = s.checkedOn ? t("refpop.checked", { date: U.long(s.checkedOn, false) }) : t("refpop.unchecked");
    var loc = U.src(s), isAdilet = loc.adilet;   // название и ссылка — на текущем языке
    pop.innerHTML =
      '<p class="ref-pop__act">' + U.esc(loc.act) + "</p>" +
      '<p class="ref-pop__art">' + U.esc(a.textContent.trim()) + "</p>" +
      '<p class="ref-pop__date">' + U.esc(checked) + "</p>" +
      '<div class="ref-pop__actions">' +
        '<a class="btn btn--primary btn--sm ref-pop__open" href="' + U.esc(a.getAttribute("href") || loc.url) + '" target="_blank" rel="noopener" tabindex="-1">' +
          U.esc(t(isAdilet ? "refpop.open.adilet" : "refpop.open.other")) + "</a>" +
        // запись во вкладке ⑤ (правило 7: пометка ведёт и на портал Әділет, и в «Источники»)
        (window.App.sources ? '<button class="btn btn--ghost btn--sm ref-pop__list" type="button" tabindex="-1" data-to-list="' + U.esc(s.id) + '">' +
          U.esc(t("refpop.toList")) + "</button>" : "") +
      "</div>";
    if (popRef && popRef !== a) popRef.removeAttribute("aria-describedby");
    popRef = a;
    a.setAttribute("aria-describedby", "ref-pop");
    pop.hidden = false;
    placePop(a);
    if (motionOK()) replay(pop, "is-in");
  }
  function hidePop() {
    clearTimeout(showTimer);
    if (!pop || pop.hidden) return;
    pop.hidden = true;
    if (popRef) popRef.removeAttribute("aria-describedby");
    popRef = null;
  }
  function initRefPop() {
    pop = $("ref-pop");
    if (!pop) return;
    document.addEventListener("pointerdown", function (e) {
      lastPointer = e.pointerType || "mouse";
      if (!pop.hidden && !pop.contains(e.target) && !(e.target.closest && e.target.closest("a.ref[data-src]"))) hidePop();
    }, true);
    // мышь: наведение
    document.addEventListener("mouseover", function (e) {
      if (lastPointer !== "mouse") return;
      var a = e.target.closest && e.target.closest("a.ref[data-src]");
      if (a) { clearTimeout(hideTimer); clearTimeout(showTimer); showTimer = setTimeout(function () { showPop(a); }, 180); }
      else if (e.target.closest && e.target.closest("#ref-pop")) clearTimeout(hideTimer);
    });
    document.addEventListener("mouseout", function (e) {
      if (lastPointer !== "mouse") return;
      if (e.target.closest && (e.target.closest("a.ref[data-src]") || e.target.closest("#ref-pop"))) {
        clearTimeout(showTimer);
        hideTimer = setTimeout(hidePop, 250);
      }
    });
    // клавиатура: фокус показывает карточку (Enter по пометке сам откроет портал Әділет)
    document.addEventListener("focusin", function (e) {
      var a = e.target.closest && e.target.closest("a.ref[data-src]");
      if (quietFocus) { quietFocus = false; return; }
      if (a && lastPointer !== "touch") showPop(a);
    });
    document.addEventListener("focusout", function (e) {
      if (e.target.closest && (e.target.closest("a.ref[data-src]") || e.target.closest("#ref-pop"))) hideTimer = setTimeout(hidePop, 150);
    });
    pop.addEventListener("focusin", function () { clearTimeout(hideTimer); });
    // кнопка «В списке источников» → вкладка ⑤ с этой записью
    pop.addEventListener("click", function (e) {
      var b = e.target.closest("[data-to-list]");
      if (!b) return;
      var id = b.getAttribute("data-to-list");
      hidePop();
      App.sources.show(id);
    });
    // клавиатура: Tab с пометки заходит в карточку (две кнопки), Tab с последней — дальше по странице
    function popButtons() { return Array.prototype.slice.call(pop.querySelectorAll("a, button")); }
    function focusAfter(el) {
      var all = Array.prototype.filter.call(document.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]'), function (x) {
        return x.tabIndex >= 0 && x.offsetParent !== null && !pop.contains(x) && !x.closest("[inert]");
      });
      var next = all[all.indexOf(el) + 1];
      if (next) next.focus();
    }
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Tab" || pop.hidden || !popRef) return;
      var btns = popButtons(), i = btns.indexOf(document.activeElement);
      if (document.activeElement === popRef && !e.shiftKey) { e.preventDefault(); btns[0].focus(); return; }
      if (i < 0) return;
      e.preventDefault();
      var ref = popRef;
      if (e.shiftKey) { if (i > 0) btns[i - 1].focus(); else ref.focus(); }
      else if (i < btns.length - 1) btns[i + 1].focus();
      else { hidePop(); focusAfter(ref); }
    });
    // тап: первый тап показывает карточку, второй по той же пометке — открывает ссылку
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a.ref[data-src]");
      if (!a || lastPointer !== "touch") return;
      if (popRef === a && !pop.hidden) return;
      e.preventDefault();
      showPop(a);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !pop.hidden) {
        e.stopPropagation();
        var r = popRef, inside = pop.contains(document.activeElement);
        hidePop();
        if (r && inside) { quietFocus = true; r.focus(); }   // вернуть фокус на пометку, не открывая карточку снова
      }
    }, true);
    window.addEventListener("resize", hidePop);
    window.addEventListener("ld:tabchange", hidePop);
  }

  /* =========================================================
     Онбординг: три подсказки-пузыря (без localStorage)
     ========================================================= */
  var tourStep = 0, tourBack = null;
  function tourSteps() {
    var ref = Array.prototype.filter.call(document.querySelectorAll("a.ref[data-src]"), function (a) {
      var r = a.getBoundingClientRect();
      return a.offsetParent !== null && r.width > 0 && r.top >= 0 && r.bottom <= window.innerHeight;
    })[0];
    return [
      { el: $("tablist"), text: "tour.1" },
      { el: $("sheet"), text: coarse.matches ? "tour.2.touch" : "tour.2.mouse" },
      { el: ref || $("sheet"), text: "tour.3" }
    ];
  }
  function showTourStep() {
    var steps = tourSteps(), s = steps[tourStep], last = tourStep === steps.length - 1;
    var spot = $("tour-spot"), bubble = $("tour-bubble");
    var r = s.el.getBoundingClientRect(), pad = 6;
    spot.style.left = (r.left - pad) + "px"; spot.style.top = (r.top - pad) + "px";
    spot.style.width = (r.width + pad * 2) + "px"; spot.style.height = (r.height + pad * 2) + "px";
    bubble.innerHTML =
      '<p class="tour__count">' + U.esc(t("tour.step", { n: tourStep + 1, total: steps.length })) + "</p>" +
      '<p class="tour__text" id="tour-text">' + U.esc(t(s.text)) + "</p>" +
      '<div class="tour__actions"><button class="btn btn--ghost btn--sm" type="button" data-tour="skip">' + U.esc(t("tour.skip")) + "</button>" +
      '<button class="btn btn--primary btn--sm" type="button" data-tour="next">' + U.esc(t(last ? "tour.done" : "tour.next")) + "</button></div>";
    // пузырь — под элементом, если помещается, иначе над ним; по ширине — в пределах экрана
    var bw = Math.min(300, window.innerWidth - 24), m = 12;
    bubble.style.width = bw + "px";
    var bh = bubble.offsetHeight;
    var below = r.bottom + pad + 14, above = r.top - pad - 14 - bh;
    var top = below + bh <= window.innerHeight - m ? below : (above >= m ? above : Math.max(m, (window.innerHeight - bh) / 2));
    var left = Math.min(Math.max(m, r.left + r.width / 2 - bw / 2), window.innerWidth - bw - m);
    bubble.style.top = top + "px"; bubble.style.left = left + "px";
    bubble.setAttribute("data-side", top === below ? "below" : (top === above ? "above" : "none"));
    bubble.style.setProperty("--arrow-x", Math.min(Math.max(16, r.left + r.width / 2 - left), bw - 16) + "px");
    if (motionOK()) replay(bubble, "is-in");
    bubble.querySelector('[data-tour="next"]').focus({ preventScroll: true });
  }
  function openTour() {
    tourBack = document.activeElement;
    tourStep = 0;
    $("tour").hidden = false;
    showTourStep();
  }
  function closeTour() {
    $("tour").hidden = true;
    if (tourBack && tourBack.focus) tourBack.focus({ preventScroll: true });
  }
  function initTour() {
    var tour = $("tour");
    if (!tour) return;
    tour.addEventListener("click", function (e) {
      var b = e.target.closest("[data-tour]");
      if (!b) return;
      if (b.getAttribute("data-tour") === "skip") return closeTour();
      tourStep++;
      if (tourStep >= tourSteps().length) closeTour(); else showTourStep();
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !tour.hidden) closeTour(); });
    window.addEventListener("resize", function () { if (!tour.hidden) showTourStep(); });
    $("tour-open").addEventListener("click", openTour);
    // «при первом открытии»: без хранения состояние не запоминается — показываем при каждой загрузке
    setTimeout(function () { if (tour.hidden && !document.querySelector("dialog[open]")) openTour(); }, 700);
  }

  /* =========================================================
     «Вы посмотрели N из 5 разделов»
     ========================================================= */
  var seen = {};
  function renderSeen(currentId) {
    var ids = App.tabs.ids, n = ids.filter(function (id) { return seen[id]; }).length;
    $("seen-dots").innerHTML = ids.map(function (id) {
      return '<i class="seen__dot' + (seen[id] ? " is-seen" : "") + (id === currentId ? " is-current" : "") + '" title="' + U.esc(t("tab." + id + ".title")) + '"></i>';
    }).join("");
    $("seen-txt").textContent = t("seen.text", { n: n, total: ids.length });
  }

  /* =========================================================
     Стекло: 3D-наклон и блик под курсором (movePointer/drawPointer)
     ========================================================= */
  var GLASS = ".glass, .steps__card, .dl__card, .tree__card, .pay__item, .game__person, .help__channels li, .stat";
  var PULL = ".help__channels li";  // карточки контактов слегка «тянутся» за курсором
  var tracked = null, pFrame = 0, cx = 0, cy = 0;
  function resetPointer() {
    cancelAnimationFrame(pFrame); pFrame = 0;
    if (tracked) {
      tracked.classList.remove("tracking");
      tracked.style.removeProperty("--surface");
      tracked = null;
    }
  }
  function drawPointer() {
    pFrame = 0;
    if (!tracked) return;
    var box = tracked.getBoundingClientRect();
    var x = Math.max(0, Math.min(1, (cx - box.left) / box.width));
    var y = Math.max(0, Math.min(1, (cy - box.top) / box.height));
    var angle = Math.min(2.2, 550 / Math.max(box.height, box.width));  // длинную карточку наклоняем меньше
    var pullPx = tracked.matches(PULL) ? 5 : 0;
    var dx = 2 * x - 1, dy = 2 * y - 1;
    tracked.style.setProperty("--surface", "perspective(1200px) translate(" + (pullPx * dx) + "px," + (pullPx * dy) + "px) rotateX(" + (-angle * dy) + "deg) rotateY(" + (angle * dx) + "deg)");
    tracked.style.setProperty("--light-x", x * box.width + "px");
    tracked.style.setProperty("--light-y", y * box.height + "px");
    tracked.classList.add("tracking");
  }
  function initGlass() {
    document.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse" || !mouse.matches || !motionOK()) { resetPointer(); return; }
      var el = e.target.closest ? e.target.closest(GLASS) : null;
      if (el !== tracked) resetPointer();
      if (!el) return;
      tracked = el;
      cx = e.clientX; cy = e.clientY;
      if (!pFrame) pFrame = requestAnimationFrame(drawPointer);
    }, { passive: true });
    document.addEventListener("pointerleave", resetPointer);
  }

  /* =========================================================
     Открытие вкладки
     ========================================================= */
  function onTab(e) {
    var id = e.detail.id, panel = panelOf(id);
    seen[id] = true;
    renderSeen(id);
    if (!panel) return;
    if (motionOK()) {
      var h = panel.querySelector(".panel__title");
      if (h) replay(h, "is-words");
      playEntries(panel);
    }
    if (id === "calc") runStats();
  }

  function init() {
    U = App.ui;
    if (!U) return;
    splitHeadings();
    renderStats();
    placeStats();
    wideMq.addEventListener("change", placeStats);
    // на телефоне числа добегают, когда открывают карточку «Даты»
    var datesTab = $("cardtab-dates");
    if (datesTab) datesTab.addEventListener("click", function () { if (!wideMq.matches) runStats(); });
    initMagnet();
    initRefPop();
    initGlass();
    window.addEventListener("ld:tabchange", onTab);
    // смена языка: заголовки по словам, счётчики, «посмотрели N из 5», открытая подсказка
    window.addEventListener("ld:langchange", function () {
      hidePop();
      splitHeadings();
      renderStats();
      renderSeen(App.tabs.ids[App.tabs.current()]);
      if (!$("tour").hidden) showTourStep();
    });
    // первая вкладка уже открыта до инициализации эффектов
    var cur = App.tabs.ids[App.tabs.current()] || "calc";
    onTab({ detail: { id: cur } });
    initTour();
  }

  window.App = window.App || {};
  window.App.fx = { init: init, openTour: openTour };
})();
