/* =========================================================
   Интерфейс вкладки «Калькулятор». Перенесено из _old/app.js:
   режимы с «таблеткой» (placePill/selectTab), выбор срока (Period),
   значения по умолчанию и границы дат, пересчёт после первого расчёта,
   лента времени (runLast/runWhen/runDocs/runUnpaid), пояснения и ссылки ref().
   Новое: мини-календарь, листок с главной датой, копирование, .ics, карточки.

   Ничего не отправляет и не хранит: всё считается в браузере.
   ========================================================= */
(function () {
  "use strict";

  var C;                                   // логика из js/calc.js
  var MODES = ["last", "when", "docs", "unpaid"];
  var TARGETS = { last: ["notice"], when: ["want"], docs: ["term", "req"], unpaid: ["uterm", "utoday"] };
  var wide = window.matchMedia("(min-width: 900px)");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  var state = {
    mode: "last",
    card: "input",
    outCard: "dates",                      // что показывать справа на ноутбуке
    ran: {},                               // был ли уже расчёт в режиме
    results: {},                           // последний результат режима
    target: { last: "notice", when: "want", docs: "term", unpaid: "uterm" }
  };
  var periods = {};
  var modeTabs, cardTabs, cal, sources = {};

  /* ---------- Тексты и форматирование ---------- */
  function $(id) { return document.getElementById(id); }
  function t(key, vars) {
    var s = App.i18n.t(key);
    return vars ? s.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] == null ? "" : vars[k]; }) : s;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }
  // «Суббота» → «суббота», «День Победы» → «день Победы»
  function lowerFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

  var DAY = 86400000;
  function toDate(iso) { return new Date(iso + "T00:00:00Z"); }
  function addDays(iso, n) { return new Date(toDate(iso).getTime() + n * DAY).toISOString().slice(0, 10); }
  function todayIso() {
    var d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
  }
  function clamp(iso) { return iso < C.CALENDAR_FROM ? C.CALENDAR_FROM : (iso > C.CALENDAR_TO ? C.CALENDAR_TO : iso); }

  // Даты и месяцы — только через Intl (правило 9 CLAUDE.md); timeZone UTC, т.к. даты хранятся как UTC-полночь
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
  function short(iso) { return fmt({ day: "numeric", month: "long" }).format(toDate(iso)); }      // «7 декабря»
  function weekdayName(iso) { return fmt({ weekday: "long" }).format(toDate(iso)); }
  function long(iso, withWeekday) {                                                                // «7 декабря 2026, понедельник»
    var s = short(iso) + " " + iso.slice(0, 4);
    return withWeekday === false ? s : s + ", " + weekdayName(iso);
  }

  var pluralRules = new Intl.PluralRules(App.i18n.locale);
  function plural(n, base) {
    var k = base + "." + pluralRules.select(n);
    return App.i18n.has(k) ? t(k) : t(base + ".many");
  }
  // «1 месяц», «2 месяца и 10 дней», «45 дней»
  function periodText(m, d) {
    var parts = [];
    if (m) parts.push(m + " " + plural(m, "plural.month"));
    if (d) parts.push(d + " " + plural(d, "plural.day"));
    return parts.join(t("calc.period.join"));
  }

  /* ---------- Пометки-ссылки (ref() из старого app.js) ---------- */
  function R(id, point) { return { id: id, key: "ref." + id + (point ? "." + point : "") }; }
  function refHtml(r) {
    var s = sources[r.id];
    if (!s) return "";
    return ' <a class="ref" href="' + esc(s.url) + '" target="_blank" rel="noopener" data-src="' + esc(r.id) + '">' + esc(t(r.key)) + "</a>";
  }
  function part(text, refs) { return { text: text, refs: refs || [] }; }
  function partsHtml(parts) {
    return parts.map(function (p) { return (p.html || esc(p.text)) + p.refs.map(refHtml).join(""); }).join(" ");
  }
  function partsText(parts) {
    return parts.map(function (p) {
      return p.text + (p.refs.length ? " (" + p.refs.map(function (r) { return t(r.key) + " ТК РК"; }).join(", ") + ")" : "");
    }).join(" ");
  }

  /* ---------- Выбор срока: чипы + «Свой срок» (Period() из старого кода) ---------- */
  function toCount(v) { v = String(v).trim(); return v === "" ? 0 : Number(v); }
  function Period(root) {
    var radios = root.querySelectorAll('input[type="radio"]');
    var row = root.querySelector(".period__row");
    var mi = root.querySelector('[data-f="months"]');
    var di = root.querySelector('[data-f="days"]');
    function selected() {
      for (var i = 0; i < radios.length; i++) if (radios[i].checked) return radios[i].value;
      return "1";
    }
    function apply(focus) {
      var v = selected();
      if (v === "custom") {
        row.hidden = false;
        if (focus) mi.focus();
      } else {
        row.hidden = true;
        mi.value = v;
        di.value = "0";
      }
    }
    Array.prototype.forEach.call(radios, function (p) { p.addEventListener("change", function () { apply(true); }); });
    apply(false);
    return {
      value: function () { return [toCount(mi.value), toCount(di.value)]; },
      isCustomRadio: function (el) { return el.type === "radio" && el.value === "custom"; },
      reset: function () { radios[0].checked = true; apply(false); }   // «1 месяц по закону»
    };
  }

  // Подвкладки с «таблеткой» — общий помощник App.ui.Tabs (js/ui.js)
  var Tabs = function (list, onSelect) { return App.ui.Tabs(list, onSelect); };

  /* ---------- Расчёты режимов (тексты шагов — из runLast/runWhen/runDocs/runUnpaid) ---------- */
  function val(id) { return $(id).value; }
  function step(label, date, parts, main, value) {
    return { label: label, date: date || null, value: value || "", parts: parts || [], main: !!main };
  }
  function fail(r, dateKey) {
    var msg = r.error === "invalid-date" ? t(dateKey)
      : (App.i18n.has("calc.error." + r.error) ? t("calc.error." + r.error) : t("calc.error.fallback"));
    // too-short — ст. 56 п. 1; before-calendar упоминает новый список праздников — Закон о праздниках
    var refs = r.error === "too-short" ? [R("tk-56", "p1")] : (r.error === "before-calendar" ? [R("law-holidays")] : []);
    return { ok: false, error: r.error, msg: msg, refs: refs };
  }
  function workDaysAfter(from, toIncl) {
    var out = [];
    for (var d = addDays(from, 1); d <= toIncl; d = addDays(d, 1)) if (C.isWorkingDay(d)) out.push(d);
    return out;
  }
  // Раскраска календаря для режимов «Последний день» и «Когда подать»
  function marksNotice(r) {
    var m = {};
    for (var d = r.countStart; d < r.noticeEnd; d = addDays(d, 1)) m[d] = "term";
    workDaysAfter(r.noticeEnd, r.paymentDeadline).forEach(function (x) { m[x] = "pay"; });
    m[r.noticeDate] = "notice";
    m[r.noticeEnd] = "last";
    return m;
  }

  // Пометки к перечням выходных и праздников: Закон о праздниках; Рождество и Курбан-айт — ст. 84 п. 5 ТК
  function dayOffRefs(reasons) {
    var sat = t("calc.dayoff.saturday"), sun = t("calc.dayoff.sunday");
    var tkNames = (window.LD_HOLIDAYS || []).filter(function (h) { return !h.transfer; }).map(function (h) { return h.name; });
    var law = false, tk = false;
    reasons.forEach(function (r) {
      if (!r || r === sat || r === sun) return;
      if (tkNames.indexOf(r) !== -1) tk = true; else law = true;
    });
    var out = [];
    if (law) out.push(R("law-holidays"));
    if (tk) out.push(R("tk-84", "p5"));
    return out;
  }

  // Примечания к расчёту срока уведомления (режимы 1 и 2)
  function periodNotes(r) {
    var notes = [];
    if (r.noticeOnDayOff) {
      notes.push({ warn: true, parts: [part(t(r.wantedLastDay ? "calc.note.noticeOnDayOff.when" : "calc.note.noticeOnDayOff",
        { date: short(r.noticeDate), reason: lowerFirst(r.noticeOnDayOff) }), dayOffRefs([r.noticeOnDayOff]))] });
    }
    if (r.months !== 1 || r.days !== 0) {
      var ps = [part(t("calc.note.customPeriod", { period: periodText(r.months, r.days) }), [R("tk-56", "p1")])];
      if (r.days) ps.push(part(t("calc.note.customPeriod.days"), [R("tk-13", "p4")]));
      notes.push({ parts: ps });
    }
    if (r.endShifted.length) {
      var why = r.endShifted.map(function (s) {
        return t("calc.note.endShifted.item", { date: short(s.date), reason: lowerFirst(s.reason) });
      }).join(t("calc.note.endShifted.join"));
      notes.push({ parts: [part(t("calc.note.endShifted", { period: periodText(r.months, r.days), date: short(r.nominalEnd), why: why }),
        [R("tk-13", "p5")].concat(dayOffRefs(r.endShifted.map(function (s) { return s.reason; }))))] });
    }
    if (r.noSuchDay) {
      notes.push({ parts: [part(t("calc.note.noSuchDay", { day: +r.noticeDate.slice(8, 10) }), [R("tk-13", "p4")])] });
    }
    if (r.paymentDaysOff.length) {
      var list = r.paymentDaysOff.map(function (s) {
        return t("calc.note.paymentDaysOff.item", { date: short(s.date), reason: lowerFirst(s.reason) });
      }).join(t("calc.note.paymentDaysOff.join"));
      notes.push({ parts: [part(t("calc.note.paymentDaysOff", { list: list }),
        [R("tk-113", "p4")].concat(dayOffRefs(r.paymentDaysOff.map(function (s) { return s.reason; }))))] });
    }
    notes.push({ parts: [part(t("calc.note.terminationDay"))] });
    return notes;
  }

  function leftText(n) {
    if (n === 0) return t("calc.when.left.today");
    var key = (n % 10 === 1 && n % 100 !== 11) ? "calc.when.left.one" : "calc.when.left.other";
    return t(key, { n: n, word: plural(n, "plural.day") });
  }

  var RUN = {
    // Режим 1: последний день
    last: function () {
      var p = periods.last.value();
      var r = C.calculate(val("notice"), p[0], p[1]);
      if (!r.ok) return fail(r, "calc.last.error.date");
      return {
        ok: true, raw: r, main: r.noticeEnd, calMonth: r.noticeEnd,
        steps: [
          step(t("calc.last.notice.label"), r.noticeDate, [part(t("calc.last.notice.note", { date: short(r.countStart) }), [R("tk-13", "p3")])]),
          step(t("calc.last.end.label"), r.noticeEnd, [part(t("calc.last.end.note"), [R("tk-56", "p4-5"), R("tk-62")])], true),
          step(t("calc.last.payment.label"), r.paymentDeadline, [part(t("calc.last.payment.note"), [R("tk-113", "p4")])])
        ],
        notes: periodNotes(r),
        marks: marksNotice(r),
        legend: ["notice", "term", "last", "pay", "off"]
      };
    },

    // Режим 2: когда подать
    when: function () {
      var p = periods.when.value();
      var r = C.latestNotice(val("want"), p[0], p[1]);
      if (!r.ok) return fail(r, "calc.when.error.date");
      var today = todayIso();
      var past = r.noticeDate < today;
      var note1 = [part(t("calc.when.notice.note"), [R("tk-13"), R("tk-56", "p1")])];
      if (!past) note1.push(part(leftText(C.diffDays(today, r.noticeDate))));
      var notes = [];
      if (past) notes.push({ warn: true, parts: [part(t("calc.when.note.past"), [R("tk-56", "p2")])] });
      if (!r.exact) {
        notes.push({ parts: [part(t("calc.when.note.notExact", { wanted: long(r.wantedLastDay), notice: long(r.noticeDate), end: long(r.noticeEnd) }))] });
      }
      return {
        ok: true, raw: r, main: r.noticeDate, calMonth: r.noticeDate,
        steps: [
          step(t("calc.when.notice.label"), r.noticeDate, note1, true),
          step(t("calc.when.end.label"), r.noticeEnd, [part(t("calc.when.end.note"), [R("tk-56", "p5")])]),
          step(t("calc.when.payment.label"), r.paymentDeadline, [part(t("calc.when.payment.note"), [R("tk-113", "p4")])])
        ],
        notes: notes.concat(periodNotes(r)),
        marks: marksNotice(r),
        legend: ["notice", "term", "last", "pay", "off"]
      };
    },

    // Режим 3: деньги и документы
    docs: function () {
      var r = C.documents(val("term"), val("req") || undefined);
      if (!r.ok) return fail(r, "calc.docs.error.date");
      var notes = [];
      if (r.terminationOnDayOff) {
        notes.push({ warn: true, parts: [part(t("calc.docs.note.terminationOnDayOff", { date: short(r.terminationDate), reason: lowerFirst(r.terminationOnDayOff) }), dayOffRefs([r.terminationOnDayOff]))] });
      }
      notes.push({ parts: [part(t("calc.docs.note.fiveDayWeek"), [R("law-holidays")])] });
      var m = {};
      workDaysAfter(r.terminationDate, r.paymentDeadline).forEach(function (x) { m[x] = "pay"; });
      m[r.certificateDeadline] = "doc";
      m[r.terminationDate] = "last";
      return {
        ok: true, raw: r, main: r.paymentDeadline, calMonth: r.paymentDeadline,
        steps: [
          step(t("calc.docs.workDocument.label"), r.workDocument, [part(t("calc.docs.workDocument.note"), [R("tk-62", "p1")])]),
          step(t("calc.docs.payment.label"), r.paymentDeadline, [part(t("calc.docs.payment.note"), [R("tk-113", "p4"), R("tk-96", "p2")])], true),
          step(t("calc.docs.orderCopy.label"), r.orderCopyDeadline, [part(t("calc.docs.orderCopy.note"), [R("tk-61", "p3")])]),
          step(t("calc.docs.certificate.label"), r.certificateDeadline, [part(t("calc.docs.certificate.note", { date: short(r.requestDate) }), [R("tk-62", "p2")])])
        ],
        notes: notes,
        marks: m,
        legend: ["last", "pay", "doc", "off"]
      };
    },

    // Режим 4: если не заплатили
    unpaid: function () {
      var r = C.unpaid(val("uterm"), val("utoday"));
      if (!r.ok) return fail(r, "calc.unpaid.error.date");
      var overdue = r.isOverdue
        ? t("calc.unpaid.overdue.value", { n: r.overdueDays, word: plural(r.overdueDays, "plural.calendarDay") })
        : t("calc.unpaid.overdue.none");
      var notes = [];
      if (r.applyMissed) notes.push({ warn: true, parts: [part(t("calc.unpaid.note.missed"), [R("tk-160"), R("tk-160", "ks81")])] });
      notes.push({ parts: [part(t("calc.unpaid.note.learnedOn", { date: long(r.learnedOn) }))] });
      if (!r.applyByShiftChecked) {
        notes.push({ warn: true, parts: [part(t("calc.unpaid.note.noCalendar"), [R("tk-13", "p5")]), part(t("calc.unpaid.note.noCalendar2"))] });
      }
      var linkText = t("calc.unpaid.note.contacts.link");
      var tpl = t("calc.unpaid.note.contacts");
      notes.push({ parts: [
        part(t("calc.unpaid.note.penalty"), [R("tk-113", "p4")]),
        { text: tpl.replace("{link}", linkText), refs: [],
          html: esc(tpl).replace("{link}", '<button type="button" class="linklike" data-open-help>' + esc(linkText) + "</button>") }
      ] });
      var m = {};
      workDaysAfter(r.terminationDate, r.paymentDeadline).forEach(function (x) { m[x] = "pay"; });
      m[r.terminationDate] = "last";
      if (r.applyBy <= C.CALENDAR_TO) m[r.applyBy] = "apply";
      return {
        ok: true, raw: r, main: r.applyBy, calMonth: r.paymentDeadline, ref: r.today,
        steps: [
          step(t("calc.unpaid.deadline.label"), r.paymentDeadline, [part(t("calc.unpaid.deadline.note"), [R("tk-113", "p4")])]),
          step(t("calc.unpaid.overdue.label", { date: long(r.today, false) }), null,
            r.isOverdue ? [part(t("calc.unpaid.overdue.note"), [R("tk-113", "p4")])] : [], false, overdue),
          step(t("calc.unpaid.applyBy.label"), r.applyBy, [
            part(t("calc.unpaid.applyBy.note"), [R("tk-160")]),
            part(t("calc.unpaid.applyBy.note3years"), [R("tk-160", "ks81")]),
            part(t("calc.unpaid.applyBy.note2"), [R("tk-159")])
          ], true)
        ],
        notes: notes,
        marks: m,
        legend: ["last", "pay", "apply", "off"]
      };
    }
  };

  /* ---------- Отрисовка результата ---------- */
  // Шаг ленты — аккордеон: на ноутбуке всё раскрыто, на телефоне — только главный шаг (правило 4: не удлинять экран)
  function timelineHtml(steps) {
    return '<ol class="timeline">' + steps.map(function (s, i) {
      var open = wide.matches || s.main;
      var text = '<span class="tl__label">' + esc(s.label) + '</span><span class="tl__date">' + esc(s.date ? long(s.date) : s.value) + "</span>";
      var head = s.parts.length
        ? '<button class="tl__head" type="button" aria-expanded="' + open + '" aria-controls="tl-note-' + i + '"><span>' + text + "</span>" +
          '<svg class="tl__chev" aria-hidden="true"><use href="#i-right"/></svg></button>' +
          '<p class="tl__note" id="tl-note-' + i + '"' + (open ? "" : " hidden") + ">" + partsHtml(s.parts) + "</p>"
        : '<div class="tl__head">' + "<span>" + text + "</span></div>";
      return '<li class="tl' + (s.main ? " tl--main" : "") + '" style="--i:' + i + '">' +
        '<span class="tl__mark" aria-hidden="true"></span>' + head + "</li>";
    }).join("") + "</ol>";
  }
  function notesHtml(notes) {
    return '<ul class="notes">' + notes.map(function (n, i) {
      return '<li class="note' + (n.warn ? " note--warn" : "") + '" style="--i:' + i + '">' + partsHtml(n.parts) + "</li>";
    }).join("") + "</ul>";
  }

  function render() {
    var mode = state.mode, res = state.results[mode];
    var form = $("form-" + mode), err = form.querySelector(".calc__error");
    var out = $("result-dates"), notesEl = $("result-notes"), actions = $("calc-actions");
    err.innerHTML = "";
    $("calc-status").textContent = "";

    if (!res || !res.ok) {
      if (res) err.innerHTML = esc(res.msg) + res.refs.map(refHtml).join("");
      out.innerHTML = '<p class="calc__empty">' + esc(res ? res.msg : t("calc.out.empty")) + "</p>";
      notesEl.innerHTML = '<p class="calc__empty">' + esc(t("calc.notes.empty")) + "</p>";
      actions.hidden = true;
      setLeaf(todayIso(), t("calc.leaf.today"), false);
      cal.setMarks({}, []);
      return;
    }
    out.innerHTML = timelineHtml(res.steps);
    notesEl.innerHTML = notesHtml(res.notes);
    actions.hidden = false;
    var mainStep = res.steps.filter(function (s) { return s.main; })[0];
    setLeaf(res.main, mainStep.label, true, res.ref);
    cal.setMarks(res.marks, res.legend);
  }

  function announce(res) {
    var live = $("calc-live");
    live.textContent = "";
    if (!res || !res.ok) return; // ошибки объявляет role="alert" под формой
    setTimeout(function () {
      live.textContent = res.steps.map(function (s) { return s.label + ": " + (s.date ? long(s.date) : s.value); }).join(". ") + ".";
    }, 60);
  }

  /* ---------- Листок отрывного календаря ---------- */
  var leafShown = null, leafTimer = null;
  function paintLeaf(iso) {
    $("leaf-day").textContent = +iso.slice(8, 10);
    $("leaf-month").textContent = fmt({ month: "short" }).format(toDate(iso)).replace(".", "");
    $("leaf-wd").textContent = fmt({ weekday: "short" }).format(toDate(iso));
    leafShown = iso;
    var sheet = $("leaf-sheet");
    sheet.classList.remove("is-flip");
    void sheet.offsetWidth;
    sheet.classList.add("is-flip");
  }
  // «через N дней» — от сегодняшней даты; в режиме «Если не заплатили» — от поля «Сегодня»
  function caption(iso, ref) {
    var today = ref || todayIso(), n = C.diffDays(today, iso);
    if (n === 0) return t("calc.leaf.isToday");
    if (n < 0) return t("calc.leaf.ago", { n: -n, days: plural(-n, "plural.day") });
    if (iso <= C.CALENDAR_TO) {
      var m = workDaysAfter(today, iso).length;
      return t("calc.leaf.inWork", { n: n, days: plural(n, "plural.day"), m: m, work: plural(m, "plural.workDay") });
    }
    return t("calc.leaf.in", { n: n, days: plural(n, "plural.day") });
  }
  function setLeaf(iso, label, isResult, ref) {
    $("leaf-label").textContent = label;
    $("leaf-date").textContent = long(iso);
    $("leaf-caption").textContent = isResult ? caption(iso, ref) : "";
    $("leaf").classList.toggle("leaf--result", isResult);
    clearTimeout(leafTimer);
    var from = leafShown || todayIso();
    if (reduced.matches || from === iso) { paintLeaf(iso); return; }
    // быстрое перелистывание листков до нужного числа
    var n = C.diffDays(from, iso), steps = Math.min(Math.abs(n), 16), i = 0;
    (function tick() {
      i++;
      paintLeaf(i >= steps ? iso : addDays(from, Math.round(n * i / steps)));
      if (i < steps) leafTimer = setTimeout(tick, 45);
    })();
  }

  /* ---------- Копирование и .ics (файл создаётся в браузере) ---------- */
  function resultText() {
    var res = state.results[state.mode];
    var lines = [t("calc.copy.title", { mode: t("calc.mode." + state.mode) }), ""];
    res.steps.forEach(function (s) { lines.push((s.main ? "★ " : "• ") + s.label + ": " + (s.date ? long(s.date) : s.value)); });
    lines.push("");
    res.notes.forEach(function (n) { lines.push("— " + partsText(n.parts)); });
    lines.push("", t("calc.copy.footer"));
    return lines.join("\n");
  }
  function status(key) { $("calc-status").textContent = t(key); }
  function copyResult() {
    var text = resultText();
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      status(ok ? "calc.copied" : "calc.copyFail");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { status("calc.copied"); }, fallback);
    } else fallback();
  }

  function icsEscape(s) { return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n"); }
  // Строки длиннее 75 байт переносятся (RFC 5545), считаем байты UTF-8
  function icsFold(line) {
    var out = "", bytes = 0;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i], b = new TextEncoder().encode(ch).length;
      if (bytes + b > 74) { out += "\r\n "; bytes = 1; }
      out += ch; bytes += b;
    }
    return out;
  }
  function downloadIcs() {
    var res = state.results[state.mode];
    var stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    var desc = res.notes.map(function (n) { return partsText(n.parts); }).join("\n") + "\n\n" + t("calc.copy.footer");
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Poslednij den//RU", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
    res.steps.forEach(function (s, i) {
      if (!s.date) return;
      lines.push("BEGIN:VEVENT",
        "UID:" + s.date.replace(/-/g, "") + "-" + i + "-" + Math.random().toString(36).slice(2, 10) + "@last-day",
        "DTSTAMP:" + stamp,
        "DTSTART;VALUE=DATE:" + s.date.replace(/-/g, ""),
        "DTEND;VALUE=DATE:" + addDays(s.date, 1).replace(/-/g, ""),
        "SUMMARY:" + icsEscape(s.label),
        "DESCRIPTION:" + icsEscape(partsText(s.parts) + "\n\n" + desc),
        "TRANSP:TRANSPARENT",
        "END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    var blob = new Blob([lines.map(icsFold).join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = t("calc.ics.file");
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    status("calc.icsDone");
  }

  /* ---------- Режимы, карточки, календарь ---------- */
  function run(mode) {
    var res = RUN[mode]();
    state.results[mode] = res;
    if (mode === state.mode) { render(); announce(res); }
    return res;
  }

  function setMode(mode) {
    state.mode = mode;
    MODES.forEach(function (m) { $("form-" + m).hidden = m !== mode; });
    renderTarget();
    var tgt = $(state.target[mode]);
    cal.setSelected(tgt.value);
    var res = state.results[mode];
    cal.showMonthOf(res && res.ok ? res.calMonth : tgt.value);
    render();
  }

  var CARD_PANELS = { input: "card-input", dates: "card-dates", calendar: "card-calendar", notes: "card-notes" };
  function setCard(card) {
    if (wide.matches && (card === "input" || card === "calendar")) card = state.outCard;
    state.card = card;
    if (card === "dates" || card === "notes") state.outCard = card;
    $("calc").setAttribute("data-card", card);
    Object.keys(CARD_PANELS).forEach(function (k) {
      var always = wide.matches && (k === "input" || k === "calendar");
      $(CARD_PANELS[k]).hidden = !(always || k === card);
    });
  }
  function syncLayout() {
    // на ноутбуке «Ввод» и «Календарь» видны всегда, переключаются только «Даты»/«Пояснения»
    var card = state.card;
    if (wide.matches && (card === "input" || card === "calendar")) card = state.outCard;
    cardTabs.select(card, false, true);
    setCard(card);
    modeTabs.place(true);
    cardTabs.place(true);
    if (state.results[state.mode]) render(); // раскрытие шагов ленты зависит от ширины
  }

  // Над календарём: какое поле заполняем тапом
  function renderTarget() {
    var box = $("cal-target"), ids = TARGETS[state.mode];
    box.textContent = "";
    var p = document.createElement("p");
    p.className = "cal-target__label";
    p.textContent = t("calc.cal.target");
    box.appendChild(p);
    ids.forEach(function (id) {
      var b = document.createElement("button");
      b.type = "button";
      b.tabIndex = -1;
      b.className = "cal-target__btn" + (state.target[state.mode] === id ? " is-on" : "");
      b.textContent = t("calc.cal.t." + id);
      b.addEventListener("click", function () { setTarget(id); });
      box.appendChild(b);
    });
  }
  function setTarget(id) {
    state.target[state.mode] = id;
    renderTarget();
    var v = $(id).value;
    cal.setSelected(v);
    if (v) cal.showMonthOf(v);
  }

  function onPick(iso) {
    var mode = state.mode, input = $(state.target[mode]);
    if (input.min && iso < input.min) return;
    if (input.max && iso > input.max) return;
    input.value = iso;
    cal.setSelected(iso);
    if (state.ran[mode]) run(mode);
    else if (!wide.matches) { cardTabs.select("input", false); } // до первого расчёта — назад к форме
  }

  function initForms() {
    // Поля дат: границы по календарю и значения по умолчанию (как в старом сайте)
    var td = todayIso();
    [["notice", clamp(td)], ["want", clamp(C.addMonths(td, 1))], ["term", clamp(td)], ["uterm", clamp(td)]].forEach(function (a) {
      var el = $(a[0]);
      el.min = C.CALENDAR_FROM; el.max = C.CALENDAR_TO; el.value = a[1];
    });
    var reqEl = $("req"); reqEl.min = C.CALENDAR_FROM; reqEl.max = C.CALENDAR_TO;
    var todayEl = $("utoday"); todayEl.min = C.CALENDAR_FROM; todayEl.value = td < C.CALENDAR_FROM ? C.CALENDAR_FROM : td;

    periods.last = Period($("form-last").querySelector("[data-period]"));
    periods.when = Period($("form-when").querySelector("[data-period]"));

    MODES.forEach(function (mode) {
      var form = $("form-" + mode);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        state.ran[mode] = true;
        var res = run(mode);
        if (res.ok) {
          cal.showMonthOf(res.calMonth);
          if (!wide.matches) cardTabs.select("dates", true);
        }
      });
      // Результат уже показан — пересчитываем при изменении значений (кроме выбора «Свой срок» до ввода чисел)
      function changed(e) {
        var p = periods[mode];
        if (p && p.isCustomRadio(e.target)) return;
        if (e.target.type === "date" && e.target.id === state.target[mode]) {
          cal.setSelected(e.target.value);
          cal.showMonthOf(e.target.value);
        }
        if (state.ran[mode]) run(mode);
      }
      form.addEventListener("change", changed);
      form.addEventListener("input", function (e) { if (e.target.type === "number") changed(e); });
      // Фокус в поле даты — календарь заполняет именно его
      form.addEventListener("focusin", function (e) {
        if (e.target.type === "date" && TARGETS[mode].indexOf(e.target.id) !== -1) setTarget(e.target.id);
      });
    });

    // Кнопка-календарик у поля: выбрать на календаре
    $("calc").addEventListener("click", function (e) {
      var pick = e.target.closest("[data-pick]");
      if (pick) {
        setTarget(pick.getAttribute("data-pick"));
        if (!wide.matches) {
          cardTabs.select("calendar", false);
        } else { // на ноутбуке календарь и так виден — коротко подсвечиваем его
          $("minical").classList.add("is-attention");
          setTimeout(function () { $("minical").classList.remove("is-attention"); }, 700);
        }
      }
      var head = e.target.closest(".tl__head[aria-expanded]");
      if (head) {
        var open = head.getAttribute("aria-expanded") !== "true";
        head.setAttribute("aria-expanded", String(open));
        $(head.getAttribute("aria-controls")).hidden = !open;
      }
      if (e.target.closest("[data-open-help]")) {
        var help = $("help");
        if (help && help.showModal) help.showModal();
      }
    });

    $("calc-copy").addEventListener("click", copyResult);
    $("calc-ics").addEventListener("click", downloadIcs);
  }

  function initCalendar() {
    var weekdays = [];
    for (var i = 0; i < 7; i++) weekdays.push(fmt({ weekday: "short" }).format(toDate(addDays("2024-01-01", i)))); // 01.01.2024 — понедельник
    var sat = t("calc.dayoff.saturday"), sun = t("calc.dayoff.sunday");
    cal = new App.MiniCal($("minical"), {
      min: C.CALENDAR_FROM,
      max: C.CALENDAR_TO,
      onPick: onPick,
      reason: function (d) { return C.dayOffReason(d); },
      isWeekendReason: function (r) { return r === sat || r === sun; },
      title: function (y, m) {
        var s = fmt({ month: "long", year: "numeric" }).format(new Date(Date.UTC(y, m, 1)));
        return s.charAt(0).toUpperCase() + s.slice(1);
      },
      weekdays: weekdays,
      short: short,
      markLabel: function (k) { return t("calc.legend." + k); },
      prevLabel: t("calc.cal.prev"),
      nextLabel: t("calc.cal.next")
    });
    cal.setToday(todayIso());
    Array.prototype.forEach.call(document.querySelectorAll(".field__pick"), function (b) { b.title = t("calc.cal.pick"); });
  }

  function init() {
    C = window.LastDay;
    if (!C || !$("calc")) return;
    (window.LD_SOURCES || []).forEach(function (s) { sources[s.id] = s; });

    initCalendar();
    initForms();
    modeTabs = Tabs($("calc-modes"), function (b) { setMode(b.getAttribute("data-mode")); });
    cardTabs = Tabs($("calc-cards"), function (b) { setCard(b.getAttribute("data-card")); });
    syncLayout();
    wide.addEventListener("change", syncLayout);
    setMode("last");
  }

  /* ---------- Вызовы из других вкладок ---------- */
  // Открыть вкладку ① в нужном режиме (например, из вывода «можно отозвать»)
  function openMode(mode) {
    if (location.hash !== "#calc") location.hash = "calc";
    modeTabs.select(mode, false);
    if (!wide.matches) cardTabs.select("input", false);
    setTimeout(function () { var el = $(TARGETS[mode][0]); if (el) el.focus({ preventScroll: true }); }, 50);
  }
  // «Посчитать этот пример» (data-try в старом app.js): режим «Последний день», срок по закону, сразу считаем
  function tryExample(iso) {
    if (location.hash !== "#calc") location.hash = "calc";
    modeTabs.select("last", false);
    $("notice").value = iso;
    periods.last.reset();
    state.ran.last = true;
    var res = run("last");
    if (res.ok) {
      cal.setSelected(iso);
      cal.showMonthOf(res.calMonth);
      if (!wide.matches) cardTabs.select("dates", false);
    }
    // фокус — туда, где виден результат: на ноутбуке поле даты, на телефоне вкладка «Даты»
    setTimeout(function () { (wide.matches ? $("notice") : $("cardtab-dates")).focus({ preventScroll: true }); }, 50);
  }

  // Для вкладки ④: дата прекращения договора из последнего удачного расчёта (и дата запроса справки, если есть)
  function termination() {
    var order = ["docs", "last", "when", "unpaid"];
    for (var i = 0; i < order.length; i++) {
      var res = state.results[order[i]];
      if (!res || !res.ok) continue;
      var r = res.raw;
      if (order[i] === "docs") return { term: r.terminationDate, req: r.requestDate, from: "docs" };
      if (order[i] === "unpaid") return { term: r.terminationDate, from: "unpaid" };
      return { term: r.noticeEnd, from: order[i] };
    }
    return null;
  }

  window.App = window.App || {};
  window.App.calcUI = { init: init, openMode: openMode, tryExample: tryExample, termination: termination };
})();
