/*
 * Тесты логики калькулятора. Без зависимостей.
 * Запуск:  node tests/calc.test.js
 * Код выхода 1, если хотя бы одна проверка не прошла.
 *
 * Ожидаемые даты посчитаны вручную по правилам (ТК РК ст. 13, 113; Закон о праздниках ст. 5),
 * а три примера — взяты из текста _old/index.html.
 * Если рядом лежит _old/calc.js, дополнительно сравниваем старую и новую логику на каждой дате календаря.
 */
'use strict';

var isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
var C, OLD = null;
if (isNode) {
  require('../data/i18n.js');
  require('../data/holidays.js');
  require('../data/sources.js');
  C = require('../js/calc.js');
  try { OLD = require('../_old/calc.js'); } catch (e) { OLD = null; }
} else {
  // в браузере файлы уже подключены на странице
  C = globalThis.LastDay;
  OLD = globalThis.__OLD_LASTDAY || null;
}

/* ---------- Мини-фреймворк ---------- */
var rows = [];
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function show(v) { return typeof v === 'string' ? v : JSON.stringify(v); }

// expect — объект «поле: ожидаемое значение»; сравниваются только эти поля результата
function check(group, name, input, fn, expect) {
  var actual, error = null;
  try { actual = fn(); } catch (e) { error = e; }
  var got = {};
  var pass = !error;
  if (!error) {
    Object.keys(expect).forEach(function (k) {
      var v = (actual !== null && typeof actual === 'object' && k in actual) ? actual[k]
        : (k === '=' ? actual : undefined);
      got[k] = v;
      if (!same(v, expect[k])) pass = false;
    });
  }
  rows.push({ group: group, name: name, input: input, expect: expect, got: error ? { error: String(error) } : got, pass: pass });
}
function value(group, name, input, fn, expected) { check(group, name, input, fn, { '=': expected }); }

/* ---------- 1. Примеры со старого сайта (_old/index.html) ---------- */
var G1 = 'Пример со старого сайта';
check(G1, 'Айгерим', 'calculate(2026-11-05, 1 мес.)', function () { return C.calculate('2026-11-05', 1); },
  { noticeEnd: '2026-12-07', paymentDeadline: '2026-12-10' });
check(G1, 'Алина', 'calculate(2026-11-16, 1 мес.)', function () { return C.calculate('2026-11-16', 1); },
  { noticeEnd: '2026-12-17', paymentDeadline: '2026-12-22' });
check(G1, 'Данияр', 'calculate(2027-01-31, 1 мес.)', function () { return C.calculate('2027-01-31', 1); },
  { nominalEnd: '2027-02-28', noSuchDay: true, noticeEnd: '2027-03-01', paymentDeadline: '2027-03-04' });

/* ---------- 2. Праздники и переносы ---------- */
var G2 = 'Праздники';
check(G2, 'День Конституции 15.03.2027 (пн)', 'calculate(2027-02-15, 1 мес.)', function () { return C.calculate('2027-02-15', 1); },
  { endShifted: [{ date: '2027-03-15', reason: 'День Конституции' }], noticeEnd: '2027-03-16', paymentDeadline: '2027-03-19' });
check(G2, 'Наурыз 21–23.03.2027 + перенос за 21.03 (вс) на 24.03', 'calculate(2027-02-21, 1 мес.)', function () { return C.calculate('2027-02-21', 1); },
  {
    endShifted: [
      { date: '2027-03-21', reason: 'Наурыз мейрамы' },
      { date: '2027-03-22', reason: 'Наурыз мейрамы' },
      { date: '2027-03-23', reason: 'Наурыз мейрамы' },
      { date: '2027-03-24', reason: 'Перенесённый выходной за «Наурыз мейрамы»' }
    ],
    noticeEnd: '2027-03-25', paymentDeadline: '2027-03-30'
  });
check(G2, 'Новый год 2027: 1–2 января, перенос на 4 января, Рождество 7 января', 'calculate(2026-12-01, 1 мес.)', function () { return C.calculate('2026-12-01', 1); },
  {
    endShifted: [
      { date: '2027-01-01', reason: 'Новый год' },
      { date: '2027-01-02', reason: 'Новый год' },
      { date: '2027-01-03', reason: 'Воскресенье' },
      { date: '2027-01-04', reason: 'Перенесённый выходной за «Новый год»' }
    ],
    noticeEnd: '2027-01-05',
    paymentDaysOff: [
      { date: '2027-01-07', reason: 'Православное Рождество' },
      { date: '2027-01-09', reason: 'Суббота' },
      { date: '2027-01-10', reason: 'Воскресенье' }
    ],
    paymentDeadline: '2027-01-11'
  });
value(G2, '31.12.2026 — обычный рабочий четверг', 'dayOffReason(2026-12-31)', function () { return C.dayOffReason('2026-12-31'); }, null);
value(G2, 'День Республики 25.10.2026 (вс) → перенос на 26.10', 'dayOffReason(2026-10-26)', function () { return C.dayOffReason('2026-10-26'); },
  'Перенесённый выходной за «День Республики»');
value(G2, '1 мая 2027 (сб) → перенос на 3 мая', 'dayOffReason(2027-05-03)', function () { return C.dayOffReason('2027-05-03'); },
  'Перенесённый выходной за «Праздник единства народа Казахстана»');
value(G2, '9 мая 2027 (вс) → перенос на 10 мая', 'dayOffReason(2027-05-10)', function () { return C.dayOffReason('2027-05-10'); },
  'Перенесённый выходной за «День Победы»');
value(G2, 'Курбан айт 16.05.2027', 'dayOffReason(2027-05-16)', function () { return C.dayOffReason('2027-05-16'); },
  'Первый день Курбан-айта (по календарю ДУМК)');
value(G2, 'Курбан айт не переносится: 17.05.2027 рабочий', 'isWorkingDay(2027-05-17)', function () { return C.isWorkingDay('2027-05-17'); }, true);
check(G2, 'Срок истекает в Курбан айт (вс)', 'calculate(2027-04-16, 1 мес.)', function () { return C.calculate('2027-04-16', 1); },
  { endShifted: [{ date: '2027-05-16', reason: 'Первый день Курбан-айта (по календарю ДУМК)' }], noticeEnd: '2027-05-17', paymentDeadline: '2027-05-20' });

/* ---------- 3. Свой срок ---------- */
var G3 = 'Свой срок';
check(G3, '1 месяц 15 дней', 'calculate(2026-11-05, 1 мес., 15 дн.)', function () { return C.calculate('2026-11-05', 1, 15); },
  { nominalEnd: '2026-12-20', endShifted: [{ date: '2026-12-20', reason: 'Воскресенье' }], noticeEnd: '2026-12-21', paymentDeadline: '2026-12-24' });

/* ---------- 4. Обратный расчёт («Когда подать») ---------- */
var G4 = 'Когда подать';
check(G4, 'Точная дата невозможна: хочу уйти 05.12.2026 (сб)', 'latestNotice(2026-12-05, 1 мес.)', function () { return C.latestNotice('2026-12-05', 1); },
  { noticeDate: '2026-11-04', noticeEnd: '2026-12-04', exact: false });
check(G4, 'Точная дата возможна: 17.12.2026', 'latestNotice(2026-12-17, 1 мес.)', function () { return C.latestNotice('2026-12-17', 1); },
  { noticeDate: '2026-11-17', noticeEnd: '2026-12-17', exact: true });

/* ---------- 5. Деньги и документы ---------- */
var G5 = 'Документы';
check(G5, 'Справка с датой запроса 28.12.2026 (через Новый год)', 'documents(2026-12-17, 2026-12-28)', function () { return C.documents('2026-12-17', '2026-12-28'); },
  { workDocument: '2026-12-17', paymentDeadline: '2026-12-22', orderCopyDeadline: '2026-12-22', certificateDeadline: '2027-01-06' });
check(G5, 'Справка без даты запроса — от дня прекращения', 'documents(2026-12-17)', function () { return C.documents('2026-12-17'); },
  { requestDate: '2026-12-17', certificateDeadline: '2026-12-24' });

/* ---------- 6. Если не заплатили ---------- */
var G6 = 'Не заплатили';
check(G6, 'Просрочка 19 дней', 'unpaid(2026-12-17, сегодня 2027-01-10)', function () { return C.unpaid('2026-12-17', '2027-01-10'); },
  { paymentDeadline: '2026-12-22', overdueDays: 19, isOverdue: true, learnedOn: '2026-12-23', applyBy: '2027-12-23', applyMissed: false });
check(G6, 'Годовой срок пропущен (и День Столицы 06.07.2026 в трёх рабочих днях)', 'unpaid(2026-07-01, сегодня 2027-08-01)', function () { return C.unpaid('2026-07-01', '2027-08-01'); },
  { paymentDeadline: '2026-07-07', overdueDays: 390, applyBy: '2027-07-08', applyMissed: true });
check(G6, 'Год кончается в 2028 — календаря нет, перенос не проверяется', 'unpaid(2027-12-20, сегодня 2027-12-27)', function () { return C.unpaid('2027-12-20', '2027-12-27'); },
  { paymentDeadline: '2027-12-23', overdueDays: 4, applyByNominal: '2028-12-24', applyBy: '2028-12-24', applyByShiftChecked: false });
check(G6, 'Просрочки ещё нет', 'unpaid(2026-12-17, сегодня 2026-12-22)', function () { return C.unpaid('2026-12-17', '2026-12-22'); },
  { overdueDays: 0, isOverdue: false });

/* ---------- 7. Границы календаря и коды ошибок ---------- */
var G7 = 'Ошибки и границы';
check(G7, 'Срок меньше месяца', 'calculate(2026-11-05, 0 мес., 20 дн.)', function () { return C.calculate('2026-11-05', 0, 20); }, { ok: false, error: 'too-short' });
check(G7, 'Раньше 01.07.2026', 'calculate(2026-06-30, 1 мес.)', function () { return C.calculate('2026-06-30', 1); }, { ok: false, error: 'before-calendar' });
check(G7, 'Первый день календаря', 'calculate(2026-07-01, 1 мес.)', function () { return C.calculate('2026-07-01', 1); }, { ok: true, noticeEnd: '2026-08-03', paymentDeadline: '2026-08-06' });
check(G7, 'Расчёт успевает до 31.12.2027', 'calculate(2027-11-25, 1 мес.)', function () { return C.calculate('2027-11-25', 1); }, { ok: true, noticeEnd: '2027-12-27', paymentDeadline: '2027-12-30' });
check(G7, 'Расчёт выходит за 31.12.2027', 'calculate(2027-11-29, 1 мес.)', function () { return C.calculate('2027-11-29', 1); }, { ok: false, error: 'after-calendar' });
check(G7, 'Срок больше 24 месяцев', 'calculate(2026-11-05, 25 мес.)', function () { return C.calculate('2026-11-05', 25); }, { ok: false, error: 'invalid-period' });
check(G7, 'Нулевой срок', 'calculate(2026-11-05, 0, 0)', function () { return C.calculate('2026-11-05', 0, 0); }, { ok: false, error: 'invalid-period' });
check(G7, 'Несуществующая дата', 'calculate(2026-02-30, 1 мес.)', function () { return C.calculate('2026-02-30', 1); }, { ok: false, error: 'invalid-date' });
check(G7, 'Когда подать: слишком рано', 'latestNotice(2026-07-15, 1 мес.)', function () { return C.latestNotice('2026-07-15', 1); }, { ok: false, error: 'before-calendar' });
check(G7, 'Когда подать: после календаря', 'latestNotice(2028-01-10, 1 мес.)', function () { return C.latestNotice('2028-01-10', 1); }, { ok: false, error: 'after-calendar' });
check(G7, 'Когда подать: срок меньше месяца', 'latestNotice(2026-12-05, 0 мес., 10 дн.)', function () { return C.latestNotice('2026-12-05', 0, 10); }, { ok: false, error: 'too-short' });
check(G7, 'Документы: раньше календаря', 'documents(2026-06-30)', function () { return C.documents('2026-06-30'); }, { ok: false, error: 'before-calendar' });
check(G7, 'Документы: справка выходит за календарь', 'documents(2027-12-27)', function () { return C.documents('2027-12-27'); }, { ok: false, error: 'after-calendar' });
check(G7, 'Не заплатили: раньше календаря', 'unpaid(2026-06-15, 2026-08-01)', function () { return C.unpaid('2026-06-15', '2026-08-01'); }, { ok: false, error: 'before-calendar' });

/* ---------- 8. Вспомогательные функции ---------- */
var G8 = 'Функции';
value(G8, '31 января + 1 месяц', 'addMonths(2026-01-31, 1)', function () { return C.addMonths('2026-01-31', 1); }, '2026-02-28');
value(G8, 'Високосный февраль', 'addMonths(2027-12-31, 2)', function () { return C.addMonths('2027-12-31', 2); }, '2028-02-29');
value(G8, 'Рабочий день через праздник 16.12', 'addWorkingDays(2026-12-15, 1)', function () { return C.addWorkingDays('2026-12-15', 1); }, '2026-12-17');
value(G8, 'Разница дат через Новый год', 'diffDays(2026-12-22, 2027-01-10)', function () { return C.diffDays('2026-12-22', '2027-01-10'); }, 19);
value(G8, 'Разница дат назад', 'diffDays(2027-01-10, 2026-12-22)', function () { return C.diffDays('2027-01-10', '2026-12-22'); }, -19);

/* ---------- 9. Дата проверки — одна на весь сайт ---------- */
var G9 = 'Дата проверки';
value(G9, 'calc.js берёт дату из data/sources.js', 'CHECKED_ON === LD_CHECKED_ON', function () { return C.CHECKED_ON === globalThis.LD_CHECKED_ON; }, true);
value(G9, 'У ТК и Закона та же дата', 'checkedOn у tk-* и law-holidays', function () {
  return globalThis.LD_SOURCES.filter(function (s) { return /^(tk-|law-)/.test(s.id); })
    .every(function (s) { return s.checkedOn === globalThis.LD_CHECKED_ON; });
}, true);

/* ---------- 10. Сверка со старой логикой на каждой дате ---------- */
var oldCompare = null;
if (OLD) {
  var DAY = 86400000;
  function plus(d, n) { return new Date(Date.parse(d + 'T00:00:00Z') + n * DAY).toISOString().slice(0, 10); }
  function next(d) { return plus(d, 1); }
  var calls = [
    ['calculate 1 мес.', function (L, d) { return L.calculate(d, 1); }],
    ['calculate 2 мес. 10 дн.', function (L, d) { return L.calculate(d, 2, 10); }],
    ['calculate 0 мес. 31 дн.', function (L, d) { return L.calculate(d, 0, 31); }],
    ['latestNotice 1 мес.', function (L, d) { return L.latestNotice(d, 1); }],
    ['documents', function (L, d) { return L.documents(d); }],
    ['documents + запрос через 7 дн.', function (L, d) { return L.documents(d, plus(d, 7)); }],
    ['unpaid на 2027-06-01', function (L, d) { return L.unpaid(d, '2027-06-01'); }],
    ['dayOffReason', function (L, d) { return L.dayOffReason(d); }]
  ];
  var total = 0, diffs = [];
  for (var d = '2026-06-25'; d <= '2028-01-05'; d = next(d)) {
    calls.forEach(function (c) {
      total++;
      var a = c[1](OLD, d), b = c[1](C, d);
      if (!same(a, b) && diffs.length < 10) diffs.push({ call: c[0], date: d, old: a, now: b });
    });
  }
  oldCompare = { total: total, diffs: diffs };
}

/* ---------- Вывод ---------- */
var out = [];
var failed = rows.filter(function (r) { return !r.pass; }).length;
var lastGroup = '';
rows.forEach(function (r) {
  if (r.group !== lastGroup) { out.push(''); out.push('## ' + r.group); lastGroup = r.group; }
  out.push((r.pass ? '✓ ' : '✗ ') + r.name);
  out.push('    вход:      ' + r.input);
  out.push('    ожидание:  ' + Object.keys(r.expect).map(function (k) { return (k === '=' ? '' : k + '=') + show(r.expect[k]); }).join('; '));
  out.push('    результат: ' + Object.keys(r.got).map(function (k) { return (k === '=' ? '' : k + '=') + show(r.got[k]); }).join('; '));
});
out.push('');
if (oldCompare) {
  out.push('## Сверка со старой логикой (_old/calc.js)');
  out.push((oldCompare.diffs.length ? '✗ ' : '✓ ') + oldCompare.total + ' вызовов на датах 2026-06-25…2028-01-05, расхождений: ' + oldCompare.diffs.length);
  oldCompare.diffs.forEach(function (x) { out.push('    ' + x.call + ' ' + x.date + ': было ' + show(x.old) + ' / стало ' + show(x.now)); });
  if (oldCompare.diffs.length) failed++;
} else {
  out.push('(сверка со старой логикой пропущена: нет _old/calc.js)');
}
out.push('');
out.push(failed ? 'ПРОВАЛЕНО проверок: ' + failed : 'Все проверки пройдены: ' + rows.length + (oldCompare ? ' + сверка со старой логикой' : ''));

console.log(out.join('\n'));
if (isNode && failed) process.exitCode = 1;
if (!isNode) globalThis.__TEST_RESULT = { rows: rows, oldCompare: oldCompare, failed: failed, text: out.join('\n') };
