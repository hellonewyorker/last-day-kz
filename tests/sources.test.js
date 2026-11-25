/*
 * Проверка списка источников (правило 7 CLAUDE.md).
 * • у каждого источника есть ссылка, группа для вкладки ⑤ и поле usedOn;
 * • usedOn совпадает с тем, где в коде реально стоят пометки на этот источник;
 * • на сайте нет пометок на источники, которых нет в data/sources.js;
 * • у каждой статьи ТК есть название для вкладки ⑤ (ключ src.<id>.title в data/i18n.js).
 * Запуск:  node tests/sources.test.js
 * Код выхода 1, если хотя бы одна проверка не прошла.
 */
'use strict';

var fs = require('fs');
var path = require('path');
var T = require('../data/i18n.js').messages.ru;
var SOURCES = require('../data/sources.js');
function read(f) { return fs.readFileSync(path.join(__dirname, '..', f), 'utf8'); }

// Где на сайте показывается текст из каждого файла
var topics = read('js/topics.js'), cut = topics.indexOf('③ Дерево решений');
var payout = read('js/payout.js'), help = payout.indexOf('function renderHelp'), helpEnd = payout.indexOf('function init');
var PLACES = [
  { where: 'calc', text: read('js/calc-ui.js') },
  { where: 'calc', text: read('js/fx.js') },            // счётчики на вкладке ①
  { where: 'calc', text: read('data/holidays.js') },    // праздники влияют на расчёт
  { where: 'rules', text: topics.slice(0, cut) },
  { where: 'early', text: topics.slice(cut) },
  { where: 'early', text: read('data/tree.js') },
  { where: 'payout', text: payout.slice(0, help) + payout.slice(helpEnd) },
  { where: 'help', text: payout.slice(help, helpEnd) }
];
function cites(text, id) {
  var esc = id.replace(/-/g, '\\-');
  return new RegExp('ref\\.' + esc + '["\\.]|"' + esc + '"').test(text);
}

var rows = [], failed = 0;
function check(name, ok, info) {
  rows.push((ok ? 'OK    ' : 'FAIL  ') + name + (ok || !info ? '' : '\n        ' + info));
  if (!ok) failed++;
}

var GROUPS = ['code', 'holidays', 'help'];
SOURCES.forEach(function (s) {
  var found = [];
  PLACES.forEach(function (p) { if (cites(p.text, s.id) && found.indexOf(p.where) < 0) found.push(p.where); });
  var used = (s.usedOn || []).slice().sort().join(', '), real = found.sort().join(', ');
  check(s.id + ': ссылка https', /^https:\/\//.test(s.url), s.url);
  check(s.id + ': группа ' + s.group, GROUPS.indexOf(s.group) >= 0);
  check(s.id + ': используется на сайте', found.length > 0, 'ни одной пометки — убрать из источников?');
  check(s.id + ': usedOn = ' + used, used === real, 'в коде: ' + (real || 'нигде'));
  if (s.group === 'code') check(s.id + ': есть название статьи', !!T['src.' + s.id + '.title']);
});

// Пометки на несуществующие источники
var ids = SOURCES.map(function (s) { return s.id; });
var all = PLACES.map(function (p) { return p.text; }).join('\n');
// ключи пометок всегда в кавычках: "ref.tk-56.p1" (а не ref.focus() в коде)
var unknown = (all.match(/"ref\.[a-z0-9-]+/g) || []).map(function (k) { return k.slice(5); })
  .filter(function (id, i, a) { return a.indexOf(id) === i && ids.indexOf(id) < 0; });
check('нет пометок на неизвестные источники', unknown.length === 0, unknown.join(', '));

console.log(rows.join('\n') + '\n\nИтого: ' + (rows.length - failed) + ' из ' + rows.length + ' проверок прошли');
if (failed) process.exitCode = 1;
