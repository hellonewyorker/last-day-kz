/*
 * Проверка исключения из правила 9: тексты <title> и мета-тегов в <head> index.html
 * вписаны прямо в HTML (для мессенджеров и поисковиков без JS) и должны совпадать с data/i18n.js.
 * Запуск:  node tests/meta.test.js
 * Код выхода 1, если хотя бы одна проверка не прошла.
 */
'use strict';

var fs = require('fs');
var path = require('path');
var T = require('../data/i18n.js').messages.ru;
var html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
var head = (html.match(/<head>([\s\S]*?)<\/head>/) || [])[1] || '';

function unesc(s) {
  return s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

var rows = [], failed = 0;
function check(name, ok, info) {
  rows.push((ok ? 'OK    ' : 'FAIL  ') + name + (ok || !info ? '' : '\n        ' + info));
  if (!ok) failed++;
}

// 1. <title data-i18n="ключ">текст</title>
var t = head.match(/<title data-i18n="([^"]+)">([\s\S]*?)<\/title>/);
check('title есть и с ключом', !!t);
if (t) check('title = ' + t[1], unesc(t[2]) === T[t[1]], 'в HTML: «' + unesc(t[2]) + '»\n        в i18n: «' + T[t[1]] + '»');

// 2. каждый <meta data-i18n-attr="content:ключ" content="…"> в <head>
var metas = head.match(/<meta\b[^>]*data-i18n-attr="[^"]*"[^>]*>/g) || [];
check('мета-теги с ключами найдены (' + metas.length + ')', metas.length > 0);
metas.forEach(function (tag) {
  var key = (tag.match(/data-i18n-attr="[^"]*content:([^";]+)/) || [])[1];
  var label = (tag.match(/(?:name|property)="([^"]+)"/) || [])[1] || tag;
  if (!key) return;
  var content = tag.match(/\scontent="([^"]*)"/);
  check(label + ': текст вписан', !!(content && content[1]), 'нет атрибута content — превью без JS будет пустым');
  if (content) check(label + ' = ' + key, unesc(content[1]) === T[key], 'в HTML: «' + unesc(content[1]) + '»\n        в i18n: «' + T[key] + '»');
});

// 3. адрес картинки: предупреждение, не ошибка (до публикации он относительный)
var img = (head.match(/property="og:image" content="([^"]+)"/) || [])[1] || '';
var note = /^https:\/\//.test(img) ? '' : '\nВНИМАНИЕ  og:image = «' + img + '» — после публикации сделать абсолютным (https://…/img/og.png)';

console.log(rows.join('\n') + '\n\nИтого: ' + (rows.length - failed) + ' из ' + rows.length + ' проверок прошли' + note);
if (failed) process.exitCode = 1;
