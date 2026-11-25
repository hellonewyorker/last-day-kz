# Последний день — калькулятор увольнения по собственному желанию (РК)

**Сайт:** https://hellonewyorker.github.io/last-day-kz/

Сайт помогает работнику, который впервые увольняется по собственному желанию в Казахстане, узнать две даты:
- когда закончится срок уведомления работодателя;
- крайний день, когда с ним должны полностью рассчитаться.

Ещё он простыми словами объясняет, как считается срок, можно ли уйти раньше, что положено получить при увольнении и куда обратиться.

Это не юридическая консультация. Сайт показывает общие правила, а не разбирает конкретный случай. Все примеры и имена на сайте вымышленные.

Учебный проект по вайбкодингу, сделан с Claude Code.

## Вкладки

| Вкладка | Прямая ссылка |
|---|---|
| ① Калькулятор | [#calc](https://hellonewyorker.github.io/last-day-kz/#calc) |
| ② Как считается срок | [#rules](https://hellonewyorker.github.io/last-day-kz/#rules) |
| ③ Можно ли раньше | [#early](https://hellonewyorker.github.io/last-day-kz/#early) |
| ④ Что получить при увольнении | [#payout](https://hellonewyorker.github.io/last-day-kz/#payout) |
| ⑤ Источники и оговорка | [#sources](https://hellonewyorker.github.io/last-day-kz/#sources) |

## Источники

Все ссылки сайта хранятся в одном файле: [`data/sources.js`](data/sources.js). Пометки на сайте берут тексты оттуда.

**Нормативные акты** (официальные тексты на adilet.zan.kz):
- Трудовой кодекс Республики Казахстан от 23.11.2015 № 414-V: [ст. 13](https://adilet.zan.kz/rus/docs/K1500000414#z13), [ст. 56](https://adilet.zan.kz/rus/docs/K1500000414#z56), [ст. 61](https://adilet.zan.kz/rus/docs/K1500000414#z61), [ст. 62](https://adilet.zan.kz/rus/docs/K1500000414#z62), [ст. 84](https://adilet.zan.kz/rus/docs/K1500000414#z84), [ст. 96](https://adilet.zan.kz/rus/docs/K1500000414#z96), [ст. 113](https://adilet.zan.kz/rus/docs/K1500000414#z113), [ст. 159](https://adilet.zan.kz/rus/docs/K1500000414#z159), [ст. 160](https://adilet.zan.kz/rus/docs/K1500000414#z160).
- [Закон РК «О праздниках в Республике Казахстан» от 13.12.2001 № 267](https://adilet.zan.kz/rus/docs/Z010000267_), ст. 2, 3, 5 (в ред. Закона от 11.06.2026 № 306-VIII: с 01.07.2026 День Конституции — 15 марта).

**Новости** (только для сверки дат праздников и переносов, это не нормативные акты):
- [Рамазан и Курбан айт: ДУМК утвердило даты на 2027 год](https://rus.azattyq-ruhy.kz/society/117936-ramazan-i-kurban-ait-dumk-utverdilo-daty-na-2027-god) — Azattyq Rýhy, 19.10.2026.
- [Выходные на Новый год 2027 в Казахстане и график переносов](https://digitalbusiness.kz/2026-10-29/kazahstantsi-mogut-planirovat-noviy-god-izvestno-o-perenose-vihodnih-i-korotkoy-nedele/) — Digital Business, 29.10.2026.
- [Празднование Дня Конституции перенесено на 15 марта](https://cdb.kz/sistema/novosti/prazdnovanie_dnya_konstitutsii_pereneseno_na_15_marta/) — cdb.kz.

**Куда обратиться:**
- [МТСЗН РК: куда обращаться работникам при задержке заработной платы](https://cdb.kz/sistema/novosti/mtszn_rk_kuda_obrashchatsya_rabotnikam_pri_zaderzhke_zarabotnoy_platy/) — cdb.kz, 05.10.2026.
- [Министерство труда и социальной защиты населения РК](https://www.gov.kz/memleket/entities/enbek) — gov.kz.

## Дата проверки

- **Общая дата сверки с adilet.zan.kz: 25.11.2026.** Хранится в `data/sources.js` (`LD_CHECKED_ON`); при новой сверке её меняет автор.
- Якорь статьи 84 на adilet.zan.kz проверен 20.11.2026.
- Все праздники в [`data/holidays.js`](data/holidays.js) сверены 25.11.2026: Закон о праздниках (ст. 2, 3, 5) и ТК РК (ст. 84 п. 5) на adilet.zan.kz, дата Курбан-айта 2027 — по календарю ДУМК. ДУМК предупреждает, что даты религиозных праздников могут сдвинуться на один день.

## Чего на сайте нет

- регистрации и аккаунтов;
- форм сбора данных. Введённые даты никуда не отправляются и нигде не хранятся: ни на сервере, ни в браузере (нет `localStorage`, `sessionStorage`, IndexedDB, cookies);
- аналитики, счётчиков и трекеров. Из внешних ресурсов подключены только шрифты Google Fonts;
- индивидуальных юридических заключений и шаблонов заявлений;
- расчёта денежных сумм — только даты и перечень того, что положено;
- других оснований увольнения — только по собственному желанию;
- вахтового метода и государственной службы;
- права других стран.

## Как устроено

- Только HTML, CSS и чистый JavaScript, без сервера, фреймворков и сборки. Можно открыть `index.html` двойным кликом.
- Все тексты — в [`data/i18n.js`](data/i18n.js). Даты форматируются через `Intl.DateTimeFormat`.
- Шрифты: Geologica и Golos Text (SIL Open Font License 1.1), обе поддерживают казахскую кириллицу.

## Тесты

```
node tests/calc.test.js
node tests/meta.test.js
node tests/sources.test.js
```

`calc.test.js` проверяет расчёт дат, `meta.test.js` — что тексты в `<head>` совпадают со словарём, `sources.test.js` — что у каждого источника есть ссылка и пометки на сайте и что во вкладке ⑤ верно указано, где он используется. В браузере можно запустить проверки вёрстки и доступности: `tests/layout-check.js`, `tests/a11y-check.js`.
