/*
 * Проверка двуязычия (день 6):
 * • у каждого русского ключа есть казахский, и наоборот (кроме служебных date.* и plural.*.other);
 * • подстановки {date}, {n}, … в обоих языках одинаковые;
 * • у каждого праздника есть казахское название, у каждого источника — казахские поля;
 * • казахские ссылки на портал Әділет ведут на /kaz/docs/.
 * Запуск:  node tests/i18n.test.js
 * Код выхода 1, если хотя бы одна проверка не прошла.
 */
'use strict';

var I = require('../data/i18n.js');
var HOLIDAYS = require('../data/holidays.js');
var SOURCES = require('../data/sources.js');
var ru = I.messages.ru, kk = I.messages.kk;

var rows = [], failed = 0;
function check(name, ok, info) {
  rows.push((ok ? 'OK    ' : 'FAIL  ') + name + (ok || !info ? '' : '\n        ' + info));
  if (!ok) failed++;
}
function vars(s) { return (String(s).match(/\{\w+\}/g) || []).sort().join(' '); }
var extraKk = /^date\.|^plural\..*\.other$/;

var missing = Object.keys(ru).filter(function (k) { return !(k in kk); });
check('все ' + Object.keys(ru).length + ' русских ключей есть в kk', missing.length === 0, missing.join(', '));
var unknown = Object.keys(kk).filter(function (k) { return !(k in ru) && !extraKk.test(k); });
check('в kk нет лишних ключей', unknown.length === 0, unknown.join(', '));
var badVars = Object.keys(ru).filter(function (k) { return k in kk && vars(ru[k]) !== vars(kk[k]); });
check('подстановки совпадают', badVars.length === 0, badVars.map(function (k) { return k + ': ' + vars(ru[k]) + ' ≠ ' + vars(kk[k]); }).join('; '));
var empty = Object.keys(kk).filter(function (k) { return !String(kk[k]).trim() && String(ru[k] || 'x').trim(); });
check('в kk нет пустых строк', empty.length === 0, empty.join(', '));
for (var m = 1; m <= 12; m++) check('название месяца ' + m, !!kk['date.month.' + m]);

HOLIDAYS.forEach(function (h) { check('праздник ' + h.date + ': name_kk', !!h.name_kk, h.name); });
SOURCES.forEach(function (s) {
  check('источник ' + s.id + ': поля kk', !!s.kk);
  if (s.kk && s.kk.url && /adilet\.zan\.kz/.test(s.kk.url)) check('источник ' + s.id + ': ссылка /kaz/', /\/kaz\/docs\//.test(s.kk.url), s.kk.url);
  if (s.kk && !s.kk.url) check('источник ' + s.id + ': без казахской версии — пометка «орыс тілінде»', s.kk.note === 'орыс тілінде', JSON.stringify(s.kk));
});

console.log(rows.join('\n') + '\n\nИтого: ' + (rows.length - failed) + ' из ' + rows.length + ' проверок прошли');
if (failed) process.exitCode = 1;
