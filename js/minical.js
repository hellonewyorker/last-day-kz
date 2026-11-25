/* =========================================================
   Мини-календарь: тап по числу выбирает дату, месяцы листаются
   стрелками и свайпом. После расчёта дни раскрашиваются (marks).
   Календарь — дополнительный способ ввода: он скрыт от экранного
   диктора (aria-hidden на обёртке), с клавиатуры даты вводятся в полях.

   new App.MiniCal(root, {
     min, max,                 // "ГГГГ-ММ-ДД" — границы
     onPick(iso),              // выбрали день
     reason(iso),              // причина нерабочего дня или null
     isWeekendReason(text),    // «Суббота»/«Воскресенье» — не праздник
     title(y, m),              // подпись месяца
     weekdays,                 // ['пн', …, 'вс']
     short(iso),               // «16 декабря»
     markLabel(kind),          // подпись для легенды и подсказки
     prevLabel, nextLabel
   })
   ========================================================= */
(function () {
  "use strict";

  var DAY = 86400000;
  function toTime(iso) { return Date.parse(iso + "T00:00:00Z"); }
  function iso(t) { return new Date(t).toISOString().slice(0, 10); }
  function addDays(d, n) { return iso(toTime(d) + n * DAY); }
  function ym(d) { return d.slice(0, 7); }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function icon(id) {
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#" + id);
    svg.appendChild(use);
    return svg;
  }

  function MiniCal(root, o) {
    var self = this;
    this.root = root;
    this.o = o;
    this.marks = {};
    this.legendKinds = [];
    this.selected = null;
    this.today = null;
    this.month = ym(o.min); // "ГГГГ-ММ"

    var head = el("div", "mc-head");
    this.prev = el("button", "mc-nav");
    this.prev.type = "button";
    this.prev.tabIndex = -1;
    this.prev.title = o.prevLabel;
    this.prev.appendChild(icon("i-left"));
    this.titleEl = el("p", "mc-title");
    this.next = el("button", "mc-nav");
    this.next.type = "button";
    this.next.tabIndex = -1;
    this.next.title = o.nextLabel;
    this.next.appendChild(icon("i-right"));
    head.appendChild(this.prev);
    head.appendChild(this.titleEl);
    head.appendChild(this.next);

    var wd = this.wdEl = el("div", "mc-wd");
    o.weekdays.forEach(function (w) { wd.appendChild(el("span", null, w)); });

    this.grid = el("div", "mc-grid");
    this.cells = [];
    for (var i = 0; i < 42; i++) {
      var b = el("button", "mc-day");
      b.type = "button";
      b.tabIndex = -1;
      this.grid.appendChild(b);
      this.cells.push(b);
    }

    this.info = el("p", "mc-info");
    this.legend = el("ul", "mc-legend");

    root.appendChild(head);
    root.appendChild(wd);
    root.appendChild(this.grid);
    root.appendChild(this.info);
    root.appendChild(this.legend);

    this.prev.addEventListener("click", function () { self.shift(-1); });
    this.next.addEventListener("click", function () { self.shift(1); });

    this.grid.addEventListener("click", function (e) {
      var b = e.target.closest(".mc-day");
      if (!b || b.disabled) return;
      var d = b.getAttribute("data-date");
      self.showInfo(d);
      if (o.onPick) o.onPick(d);
    });
    this.grid.addEventListener("mouseover", function (e) {
      var b = e.target.closest(".mc-day");
      if (b && !b.disabled) self.showInfo(b.getAttribute("data-date"));
    });

    // свайп по сетке листает месяцы (data-no-swipe на корне не даёт листать большие вкладки)
    var x0 = null, y0 = null;
    this.grid.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) { x0 = null; return; }
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY;
    }, { passive: true });
    this.grid.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) self.shift(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  MiniCal.prototype.canShow = function (month) {
    return month >= ym(this.o.min) && month <= ym(this.o.max);
  };

  MiniCal.prototype.shift = function (n) {
    var y = +this.month.slice(0, 4), m = +this.month.slice(5, 7) - 1 + n;
    y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    var next = y + "-" + (m < 9 ? "0" : "") + (m + 1);
    if (!this.canShow(next)) return;
    this.month = next;
    this.render(n > 0 ? "l" : "r");
  };

  MiniCal.prototype.showMonthOf = function (d) {
    if (!d) return;
    var m = ym(d);
    if (m < ym(this.o.min)) m = ym(this.o.min);
    if (m > ym(this.o.max)) m = ym(this.o.max);
    if (m !== this.month) { this.month = m; this.render(); }
  };

  MiniCal.prototype.setSelected = function (d) { this.selected = d || null; this.render(); };
  MiniCal.prototype.setToday = function (d) { this.today = d; };

  MiniCal.prototype.setMarks = function (marks, legendKinds) {
    this.marks = marks || {};
    this.legendKinds = legendKinds || [];
    this.renderLegend();
    this.info.textContent = "";
    this.render();
  };

  MiniCal.prototype.describe = function (d) {
    var parts = [];
    var kind = this.marks[d];
    if (kind) parts.push(this.o.markLabel(kind));
    var r = this.o.reason(d);
    if (r && !this.o.isWeekendReason(r)) parts.push(r);
    return parts;
  };

  MiniCal.prototype.showInfo = function (d) {
    var parts = this.describe(d);
    this.info.textContent = parts.length ? this.o.short(d) + " — " + parts.join(" · ") : this.o.short(d);
  };

  MiniCal.prototype.render = function (dir) {
    var o = this.o, y = +this.month.slice(0, 4), m = +this.month.slice(5, 7);
    this.titleEl.textContent = o.title(y, m - 1);
    this.prev.disabled = !this.canShow(ym(addDays(this.month + "-01", -1)));
    this.next.disabled = !this.canShow(ym(addDays(this.month + "-28", 7)));

    var first = this.month + "-01";
    var offset = (new Date(toTime(first)).getUTCDay() + 6) % 7; // понедельник — первый
    var d = addDays(first, -offset);
    for (var i = 0; i < 42; i++, d = addDays(d, 1)) {
      var b = this.cells[i];
      var cls = ["mc-day"];
      var w = new Date(toTime(d)).getUTCDay();
      var out = ym(d) !== this.month;
      var off = d < o.min || d > o.max;
      var r = off ? null : o.reason(d);
      if (out) cls.push("is-out");
      if (w === 0 || w === 6) cls.push("is-weekend");
      if (r && !o.isWeekendReason(r)) cls.push("is-holiday");
      if (this.marks[d]) cls.push("mk-" + this.marks[d]);
      if (d === this.selected) cls.push("is-selected");
      if (d === this.today) cls.push("is-today");
      b.className = cls.join(" ");
      b.textContent = +d.slice(8, 10);
      b.setAttribute("data-date", d);
      b.disabled = off;
      var desc = off ? [] : this.describe(d);
      b.title = desc.length ? o.short(d) + " — " + desc.join(" · ") : "";
    }
    if (dir) {
      this.grid.classList.remove("is-slide-l", "is-slide-r");
      void this.grid.offsetWidth;
      this.grid.classList.add("is-slide-" + dir);
    }
  };

  // Смена языка: новые подписи дней недели и стрелок, затем перерисовка (месяц и отметки остаются)
  MiniCal.prototype.relabel = function (patch) {
    var o = this.o;
    Object.keys(patch).forEach(function (k) { o[k] = patch[k]; });
    Array.prototype.forEach.call(this.wdEl.children, function (span, i) { span.textContent = o.weekdays[i]; });
    this.prev.title = o.prevLabel;
    this.next.title = o.nextLabel;
    this.info.textContent = "";
    this.render();
    this.renderLegend();
  };

  MiniCal.prototype.renderLegend = function () {
    var o = this.o, ul = this.legend;
    ul.textContent = "";
    this.legendKinds.forEach(function (k) {
      var li = el("li", "mc-legend__item");
      li.appendChild(el("span", "mc-sw mc-sw--" + k));
      li.appendChild(el("span", null, o.markLabel(k)));
      ul.appendChild(li);
    });
  };

  window.App = window.App || {};
  window.App.MiniCal = MiniCal;
})();
