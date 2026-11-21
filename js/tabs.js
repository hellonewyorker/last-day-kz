/* =========================================================
   Вкладки по паттерну WAI-ARIA Tabs + адрес по хэшу.
   • #calc #rules #early #payout #sources — можно поделиться ссылкой
   • кнопки браузера «назад/вперёд» работают (каждое переключение = запись в истории)
   • клик, стрелки (← → ↑ ↓, Home, End), свайп влево/вправо
   • колесо мыши вкладки НЕ листает
   ========================================================= */
(function () {
  "use strict";

  var IDS = ["calc", "rules", "early", "payout", "sources"];
  var LEAVE_MS = 340;      // переход «картотека» — не дольше 350 мс
  var SWIPE_MIN = 60;      // пикселей по горизонтали

  var tabs, panels, tablist;
  var current = -1;
  var leaveTimer = null;
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var wide = window.matchMedia("(min-width: 900px)");

  function indexFromHash() {
    var i = IDS.indexOf(location.hash.replace("#", ""));
    return i === -1 ? 0 : i;
  }

  // Меняем адрес → срабатывает hashchange → render()
  function go(index) {
    index = (index + IDS.length) % IDS.length;
    if (index === current) return;
    location.hash = IDS[index];
  }

  function finishLeaving() {
    clearTimeout(leaveTimer);
    panels.forEach(function (p, i) {
      p.classList.remove("is-entering", "is-leaving");
      p.inert = false;
      p.hidden = i !== current;
    });
  }

  function render(next, animate) {
    if (next === current) return;
    var prev = current;
    var dir = next > prev ? 1 : -1;

    finishLeaving(); // если прошлая анимация ещё идёт — завершить сразу

    tabs.forEach(function (tab, i) {
      var selected = i === next;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });

    var nextPanel = panels[next];
    nextPanel.style.setProperty("--dir", dir);
    // сообщаем остальным эффектам (js/fx.js), когда новая панель уже видна:
    // заголовки по словам, пункты по очереди, фон, счётчики, «посмотрели N из 5»
    var announced = false;
    var announce = function () {
      if (announced) return;
      announced = true;
      window.dispatchEvent(new CustomEvent("ld:tabchange", { detail: { id: IDS[next], index: next, prev: prev, animate: !!animate } }));
    };
    document.documentElement.style.setProperty("--vt-dir", dir);
    document.documentElement.setAttribute("data-tab", IDS[next]);

    if (animate && prev !== -1 && !reducedMotion.matches && document.startViewTransition) {
      // «Перелистывание картотеки» через View Transitions API (css/fx.css: ::view-transition-*)
      current = next;
      // обратный вызов показывает АКТУАЛЬНУЮ вкладку (при быстрых переключениях старый вызов может прийти позже);
      // если браузер не отрисовывает кадры (фоновая вкладка), через 400 мс выставляем состояние напрямую
      var applied = false;
      var sync = function () { applied = true; panels.forEach(function (p, i) { p.hidden = i !== current; }); announce(); };
      var vt = document.startViewTransition(sync);
      // при быстрых переключениях браузер отменяет прошлый переход — это нормально, не ошибка
      var ignore = function () {};
      if (vt) { vt.ready.catch(ignore); vt.finished.catch(ignore); vt.updateCallbackDone.catch(ignore); }
      setTimeout(function () { if (!applied) sync(); }, 400);
    } else if (animate && prev !== -1 && !reducedMotion.matches) {
      // Запасной вариант без View Transitions: обе карточки на месте, анимации — CSS
      nextPanel.hidden = false;
      var prevPanel = panels[prev];
      prevPanel.style.setProperty("--dir", dir);
      prevPanel.inert = true;
      prevPanel.classList.add("is-leaving");
      nextPanel.classList.add("is-entering");
      current = next;
      leaveTimer = setTimeout(finishLeaving, LEAVE_MS);
    } else {
      nextPanel.hidden = false;
      current = next;
      finishLeaving();
    }

    if (!(animate && prev !== -1 && !reducedMotion.matches && document.startViewTransition)) announce();

    document.title = App.i18n.t("tab." + IDS[next] + ".title") + " — " + App.i18n.t("app.name");
  }

  function isTypingTarget(el) {
    return el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  }

  function onTablistKey(e) {
    var i = tabs.indexOf(e.target);
    if (i === -1) return;
    var target = null;
    switch (e.key) {
      case "ArrowRight": case "ArrowDown": target = i + 1; break;
      case "ArrowLeft":  case "ArrowUp":   target = i - 1; break;
      case "Home": target = 0; break;
      case "End":  target = IDS.length - 1; break;
      default: return;
    }
    e.preventDefault();
    e.stopPropagation();
    target = (target + IDS.length) % IDS.length;
    go(target);
    tabs[target].focus();
  }

  // Стрелки ← → работают и вне списка вкладок, если пользователь не печатает
  function onDocumentKey(e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (isTypingTarget(e.target) || document.querySelector("dialog[open]")) return;
    // внутри калькулятора стрелки работают для его подвкладок, а не для больших вкладок
    if (e.target.closest && e.target.closest("[data-no-arrow-nav]")) return;
    if (e.key === "ArrowRight") go(current + 1);
    else if (e.key === "ArrowLeft") go(current - 1);
  }

  function initSwipe(area) {
    var x0 = null, y0 = null;
    area.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1 || e.target.closest("[data-no-swipe]")) { x0 = null; return; }
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
    }, { passive: true });
    area.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      var dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) >= SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.5) {
        // свайп влево → следующая; на краях не перескакиваем по кругу
        var target = dx < 0 ? current + 1 : current - 1;
        if (target >= 0 && target < IDS.length) go(target);
      }
    }, { passive: true });
  }

  function syncOrientation() {
    // ноутбук — вертикальные «ушки», телефон — горизонтальная панель
    tablist.setAttribute("aria-orientation", wide.matches ? "vertical" : "horizontal");
  }

  function init() {
    tablist = document.getElementById("tablist");
    tabs = IDS.map(function (id) { return document.getElementById("tab-" + id); });
    panels = IDS.map(function (id) { return document.getElementById("panel-" + id); });

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { go(i); });
    });
    tablist.addEventListener("keydown", onTablistKey);
    document.addEventListener("keydown", onDocumentKey);
    window.addEventListener("hashchange", function () { render(indexFromHash(), true); });
    initSwipe(document.getElementById("sheet"));

    syncOrientation();
    wide.addEventListener("change", syncOrientation);

    // Неизвестный хэш → тихо заменяем на #calc, не плодя записей в истории
    if (location.hash && IDS.indexOf(location.hash.slice(1)) === -1) {
      history.replaceState(null, "", "#" + IDS[0]);
    }
    render(indexFromHash(), false);
  }

  window.App = window.App || {};
  window.App.tabs = { init: init, go: go, ids: IDS, current: function () { return current; } };
})();
