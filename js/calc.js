/*
 * Логика калькулятора «Последний день». Перенесено из _old/calc.js с сохранением
 * всех функций и поведения. Изменено только:
 *   • список праздников берётся из data/holidays.js (раньше — внутри файла);
 *   • тексты «Суббота», «Воскресенье», «Перенесённый выходной за …» — из data/i18n.js;
 *   • addWorkingDays добавлен в экспорт (для тестов и интерфейса);
 *   • CHECKED_ON берётся из data/sources.js (LD_CHECKED_ON), а не задан здесь;
 *   • язык текстов можно сменить: setLocale("kk") пересобирает таблицу нерабочих дней
 *     (названия праздников — name / name_kk из data/holidays.js). Сами даты от языка не зависят.
 * Чистые функции без обращения к странице: их проверяют тесты (tests/calc.test.js).
 * Нормы: ТК РК ст. 13, 56, 84, 113; Закон РК «О праздниках в РК» ст. 2, 3, 5.
 * Даты — строки "ГГГГ-ММ-ДД", внутри считаем в UTC, чтобы не мешали часовые пояса.
 *
 * Порядок подключения: data/i18n.js → data/holidays.js → data/sources.js → js/calc.js.
 * В node: сначала require() тех же data-файлов (см. tests/calc.test.js).
 */
(function (root) {
  'use strict';

  // Период, на который заведён календарь (с 01.07.2026 действует новый список праздников).
  var CALENDAR_FROM = '2026-07-01';
  var CALENDAR_TO = '2027-12-31';
  var HOLIDAYS = root.LD_HOLIDAYS;
  if (!HOLIDAYS) throw new Error('calc.js: сначала подключите data/holidays.js');
  if (!('LD_CHECKED_ON' in root)) throw new Error('calc.js: сначала подключите data/sources.js');
  // Дата проверки — одна на весь сайт, из data/sources.js (в старом коде была '2026-11-05').
  // null — автор ещё не сверил данные с adilet.zan.kz.
  var CHECKED_ON = root.LD_CHECKED_ON;
  if (!root.I18N) throw new Error('calc.js: сначала подключите data/i18n.js');
  // язык при загрузке: в браузере — тот, что выбрал js/i18n.js (?lang=kk), в node-тестах — русский
  var LOCALE = root.App && root.App.i18n ? root.App.i18n.current() : root.I18N.defaultLocale;
  var TEXT = root.I18N.messages[LOCALE];
  function t(key, vars) {
    var s = TEXT[key];
    if (s === undefined) throw new Error('calc.js: нет текста ' + key);
    return vars ? s.replace(/\{(\w+)\}/g, function (_, k) { return vars[k]; }) : s;
  }

  var DAY = 86400000;

  function parse(iso) {
    var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!p) return null;
    var t = Date.UTC(+p[1], +p[2] - 1, +p[3]);
    var d = new Date(t);
    if (d.getUTCMonth() !== +p[2] - 1) return null; // например, 31.02
    return t;
  }
  function iso(t) { return new Date(t).toISOString().slice(0, 10); }
  function addDays(isoDate, n) { return iso(parse(isoDate) + n * DAY); }
  function weekday(isoDate) { return new Date(parse(isoDate)).getUTCDay(); } // 0 = вс
  function isWeekend(isoDate) { var w = weekday(isoDate); return w === 0 || w === 6; }

  // Название праздника на текущем языке (казахское — из Закона о праздниках и ст. 84 п. 5 ТК, см. notes/articles-kz.md)
  function holidayName(h) { return (LOCALE !== 'ru' && h['name_' + LOCALE]) || h.name; }

  // Строим таблицу нерабочих дней на период календаря.
  function build() {
    var map = {};
    var years = [];
    for (var y = +CALENDAR_FROM.slice(0, 4); y <= +CALENDAR_TO.slice(0, 4); y++) years.push(y);

    // Праздники с переносом (в старом коде — HOLIDAYS_MD): каждый год периода, начиная с CALENDAR_FROM
    var holidays = [];
    HOLIDAYS.filter(function (h) { return h.transfer; }).forEach(function (h) {
      if (h.yearly) years.forEach(function (y) { holidays.push([y + '-' + h.date, holidayName(h)]); });
      else holidays.push([h.date, holidayName(h)]);
    });
    holidays = holidays.filter(function (h) { return h[0] >= CALENDAR_FROM; }).sort();

    holidays.forEach(function (h) { map[h[0]] = h[1]; });

    // Выходные без переноса (в старом коде — TK_DAYS_OFF, ст. 84 п. 5 ТК РК)
    HOLIDAYS.filter(function (h) { return !h.transfer; }).forEach(function (h) {
      var dates = h.yearly ? years.map(function (y) { return y + '-' + h.date; }) : [h.date];
      dates.forEach(function (k) { if (!map[k]) map[k] = holidayName(h); });
    });

    // ст. 5 Закона: праздник в субботу/воскресенье → выходным становится следующий после праздника рабочий день.
    holidays.forEach(function (h) {
      if (!isWeekend(h[0])) return;
      var d = addDays(h[0], 1);
      while (isWeekend(d) || map[d]) d = addDays(d, 1);
      map[d] = t('calc.dayoff.transferred', { name: h[1] });
    });
    return map;
  }
  var nonWorking = build();

  // Смена языка: тексты «Суббота», названия праздников и т. п. — на новом языке; даты те же
  function setLocale(loc) {
    if (!root.I18N.messages[loc]) return;
    LOCALE = loc;
    TEXT = root.I18N.messages[loc];
    nonWorking = build();
  }

  function dayOffReason(isoDate) {
    if (nonWorking[isoDate]) return nonWorking[isoDate];
    var w = weekday(isoDate);
    if (w === 6) return t('calc.dayoff.saturday');
    if (w === 0) return t('calc.dayoff.sunday');
    return null;
  }
  function isWorkingDay(isoDate) { return dayOffReason(isoDate) === null; }

  // ст. 13 п. 4: то же число через N месяцев, а если такого нет — последний день месяца.
  function addMonths(isoDate, n) {
    var y = +isoDate.slice(0, 4), m = +isoDate.slice(5, 7) - 1 + n, d = +isoDate.slice(8, 10);
    y += Math.floor(m / 12); m = ((m % 12) + 12) % 12;
    var last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    return iso(Date.UTC(y, m, Math.min(d, last)));
  }
  function nextWorkingDayFrom(isoDate) { // сам день или следующий рабочий
    var d = isoDate;
    while (!isWorkingDay(d)) d = addDays(d, 1);
    return d;
  }
  function addWorkingDays(isoDate, n) { // n-й рабочий день после даты
    var d = isoDate, c = 0;
    while (c < n) { d = addDays(d, 1); if (isWorkingDay(d)) c++; }
    return d;
  }

  var MAX_MONTHS = 24, MAX_DAYS = 730;
  function isCount(n, max) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n && n >= 0 && n <= max; }

  /**
   * Главный расчёт.
   * @param {string} noticeDate дата подачи уведомления "ГГГГ-ММ-ДД"
   * @param {number} months месяцев в сроке уведомления (0–24)
   * @param {number} [days] дополнительных календарных дней (0–730), по умолчанию 0
   * Срок вида «N месяцев и M дней»: сначала месяцы (ст. 13 п. 4), затем календарные дни,
   * в которые включаются и нерабочие дни (ст. 13 п. 4, последнее предложение).
   */
  function calculate(noticeDate, months, days) {
    months = Number(months);
    days = days === undefined || days === '' ? 0 : Number(days);
    if (parse(noticeDate) === null) return { ok: false, error: 'invalid-date' };
    if (!isCount(months, MAX_MONTHS) || !isCount(days, MAX_DAYS) || months + days === 0) return { ok: false, error: 'invalid-period' };
    if (noticeDate < CALENDAR_FROM) return { ok: false, error: 'before-calendar' };

    var afterMonths = addMonths(noticeDate, months);            // ст. 13 пп. 3–4
    var nominalEnd = addDays(afterMonths, days);
    // ст. 56 п. 1: не менее чем за один месяц — более короткий срок калькулятор не считает
    if (nominalEnd < addMonths(noticeDate, 1)) return { ok: false, error: 'too-short' };
    var noticeEnd = nextWorkingDayFrom(nominalEnd);              // ст. 13 п. 5
    var paymentDeadline = addWorkingDays(noticeEnd, 3);          // ст. 113 п. 4
    if (paymentDeadline > CALENDAR_TO) return { ok: false, error: 'after-calendar' };

    var skipped = [];
    for (var d = nominalEnd; d < noticeEnd; d = addDays(d, 1)) skipped.push({ date: d, reason: dayOffReason(d) });
    var paymentDaysOff = [];
    for (var p = addDays(noticeEnd, 1); p < paymentDeadline; p = addDays(p, 1)) {
      if (!isWorkingDay(p)) paymentDaysOff.push({ date: p, reason: dayOffReason(p) });
    }

    return {
      ok: true,
      noticeDate: noticeDate,
      months: months,
      days: days,
      noSuchDay: months > 0 && afterMonths.slice(8, 10) !== noticeDate.slice(8, 10),
      noticeOnDayOff: dayOffReason(noticeDate),
      countStart: addDays(noticeDate, 1),
      nominalEnd: nominalEnd,
      noticeEnd: noticeEnd,
      endShifted: skipped,
      paymentDeadline: paymentDeadline,
      paymentDaysOff: paymentDaysOff
    };
  }

  /**
   * Режим «Когда подать»: самая поздняя дата подачи уведомления, при которой
   * срок уведомления истекает не позже желаемого последнего дня.
   * Срок окончания не убывает с датой подачи, поэтому идём назад от желаемой даты.
   */
  function latestNotice(lastDay, months, days) {
    if (parse(lastDay) === null) return { ok: false, error: 'invalid-date' };
    var probe = calculate(CALENDAR_FROM, months, days);
    if (!probe.ok && probe.error !== 'after-calendar') return probe; // неверный срок
    if (lastDay > CALENDAR_TO) return { ok: false, error: 'after-calendar' };
    for (var d = lastDay; d >= CALENDAR_FROM; d = addDays(d, -1)) {
      var r = calculate(d, months, days);
      if (r.ok && r.noticeEnd <= lastDay) {
        r.wantedLastDay = lastDay;
        r.exact = r.noticeEnd === lastDay;
        return r;
      }
    }
    return { ok: false, error: 'before-calendar' };
  }

  /**
   * Режим «Деньги и документы»: сроки от дня прекращения договора.
   * ст. 62 п. 1 — документ в день прекращения; ст. 113 п. 4 — выплаты не позднее 3 рабочих дней;
   * ст. 61 п. 3 — копия приказа в течение 3 рабочих дней со дня издания (считаем: приказ издан в день прекращения);
   * ст. 62 п. 2 — справка в течение 5 рабочих дней с момента обращения.
   */
  function documents(terminationDate, requestDate) {
    if (parse(terminationDate) === null) return { ok: false, error: 'invalid-date' };
    requestDate = requestDate || terminationDate;
    if (parse(requestDate) === null) return { ok: false, error: 'invalid-date' };
    if (terminationDate < CALENDAR_FROM || requestDate < CALENDAR_FROM) return { ok: false, error: 'before-calendar' };
    var payment = addWorkingDays(terminationDate, 3);
    var orderCopy = addWorkingDays(terminationDate, 3);
    var certificate = addWorkingDays(requestDate, 5);
    var latest = [payment, orderCopy, certificate].sort()[2];
    if (latest > CALENDAR_TO) return { ok: false, error: 'after-calendar' };
    return {
      ok: true,
      terminationDate: terminationDate,
      requestDate: requestDate,
      workDocument: terminationDate,
      paymentDeadline: payment,
      orderCopyDeadline: orderCopy,
      certificateDeadline: certificate,
      terminationOnDayOff: dayOffReason(terminationDate)
    };
  }

  function diffDays(fromIso, toIso) { return Math.round((parse(toIso) - parse(fromIso)) / DAY); }

  /**
   * Режим «Если не заплатили»: просрочка окончательного расчёта и срок обращения.
   * ст. 113 п. 4 — крайний срок выплаты; ст. 160 пп. 2) — по «другим трудовым спорам» один год
   * с того дня, когда работник узнал или должен был узнать о нарушении.
   * Допущение: о нарушении работник узнаёт на следующий день после крайнего срока выплаты.
   */
  function unpaid(terminationDate, today) {
    if (parse(terminationDate) === null || parse(today) === null) return { ok: false, error: 'invalid-date' };
    if (terminationDate < CALENDAR_FROM) return { ok: false, error: 'before-calendar' };
    var deadline = addWorkingDays(terminationDate, 3);
    if (deadline > CALENDAR_TO) return { ok: false, error: 'after-calendar' };
    var learnedOn = addDays(deadline, 1);
    var nominal = addMonths(learnedOn, 12);                    // ст. 13 пп. 3–4: «год» = то же число через 12 месяцев
    var inCalendar = nominal <= CALENDAR_TO;
    var applyBy = inCalendar ? nextWorkingDayFrom(nominal) : nominal; // ст. 13 п. 5 — только пока есть календарь
    var overdue = Math.max(0, diffDays(deadline, today));
    return {
      ok: true,
      terminationDate: terminationDate,
      today: today,
      paymentDeadline: deadline,
      overdueDays: overdue,
      isOverdue: overdue > 0,
      learnedOn: learnedOn,
      applyByNominal: nominal,
      applyBy: applyBy,
      applyByShiftChecked: inCalendar,
      applyMissed: today > applyBy
    };
  }

  var api = {
    calculate: calculate,
    latestNotice: latestNotice,
    documents: documents,
    unpaid: unpaid,
    diffDays: diffDays,
    addMonths: addMonths,
    addWorkingDays: addWorkingDays,
    isWorkingDay: isWorkingDay,
    dayOffReason: dayOffReason,
    weekday: weekday,
    MAX_MONTHS: MAX_MONTHS,
    MAX_DAYS: MAX_DAYS,
    CALENDAR_FROM: CALENDAR_FROM,
    CALENDAR_TO: CALENDAR_TO,
    CHECKED_ON: CHECKED_ON,
    setLocale: setLocale,
    holidayName: holidayName
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.LastDay = api;
})(typeof window !== 'undefined' ? window : globalThis);
