/* =========================================================
   Источники. Одно место для всех ссылок сайта (правило 7 CLAUDE.md).
   Перенесено из раздела «Источники» в _old/index.html и вызовов ref() в _old/app.js.
   Новые URL — только те, что дал автор (5 штук). Якоря #zNN — как в _old/app.js.

   Поля: id, act (название акта / материала), article (статья), url, checkedOn (дата проверки),
   group — подвкладка во вкладке ⑤ («code» — Трудовой кодекс, «holidays» — праздники, «help» — куда обратиться),
   usedOn — где на сайте есть пометка на этот источник: calc, rules, early, payout (вкладки) и help (панель
   «Куда обратиться»). Совпадение с кодом проверяет node tests/sources.test.js.
   Дата проверки хранится ТОЛЬКО здесь — в LD_CHECKED_ON. Её же берёт js/calc.js (CHECKED_ON).
   checkedOn: null — источник ещё никто не сверял.
   ========================================================= */
(function (root) {
  "use strict";

  var TK_ACT = "Трудовой кодекс Республики Казахстан от 23.11.2015 № 414-V";
  var TK_URL = "https://adilet.zan.kz/rus/docs/K1500000414";
  // Дата сверки с adilet.zan.kz (формат "ГГГГ-ММ-ДД"). Поставлена автором 25.11.2026 после сверки
  // праздников и статей ТК. При новой сверке — заменить; null = «ещё не проверено».
  root.LD_CHECKED_ON = "2026-11-25";

  function tk(article, anchor, usedOn) {
    return {
      id: "tk-" + article,
      act: TK_ACT,
      article: "ст. " + article,
      url: anchor ? TK_URL + "#" + anchor : TK_URL,
      checkedOn: root.LD_CHECKED_ON,
      group: "code",
      usedOn: usedOn
    };
  }

  root.LD_SOURCES = [
    // Трудовой кодекс: статьи из списка источников старого сайта (ст. 13, 56, 61, 62, 84, 96, 113, 159, 160; ст. 85 убрана — на сайте не используется)
    tk(13, "z13", ["calc", "rules"]),
    tk(56, "z56", ["calc", "rules", "early"]),
    tk(61, "z61", ["calc", "payout"]),
    tk(62, "z62", ["calc", "payout"]),
    tk(84, "z84", ["calc"]),     // якорь проверен на adilet 20.11.2026 (в _old/app.js его не было)
    tk(96, "z96", ["calc", "payout"]),
    tk(113, "z113", ["calc", "rules", "payout"]),
    tk(159, "z159", ["calc"]),
    tk(160, "z160", ["calc", "rules"]),

    {
      id: "law-holidays",
      act: "Закон РК «О праздниках в Республике Казахстан» от 13.12.2001 № 267",
      article: "ст. 2, 3, 5 (в ред. Закона от 11.06.2026 № 306-VIII: с 01.07.2026 День Конституции — 15 марта)",
      url: "https://adilet.zan.kz/rus/docs/Z010000267_",
      checkedOn: root.LD_CHECKED_ON,
      group: "holidays",
      usedOn: ["calc", "rules"]
    },

    // Новостные материалы — для сверки дат, не нормативные акты
    {
      id: "news-kurban-2027",
      act: "Рамазан и Курбан айт: ДУМК утвердило даты на 2027 год (Azattyq Rýhy, 19.10.2026)",
      article: null,
      url: "https://rus.azattyq-ruhy.kz/society/117936-ramazan-i-kurban-ait-dumk-utverdilo-daty-na-2027-god",
      checkedOn: null,
      group: "holidays",
      usedOn: ["calc"]
    },
    {
      id: "news-newyear-2027",
      act: "Выходные на Новый год 2027 в Казахстане: сколько дней отдыхаем и график переносов (Digital Business, 29.10.2026)",
      article: null,
      url: "https://digitalbusiness.kz/2026-10-29/kazahstantsi-mogut-planirovat-noviy-god-izvestno-o-perenose-vihodnih-i-korotkoy-nedele/",
      checkedOn: null,
      group: "holidays",
      usedOn: ["calc"]
    },
    {
      id: "news-constitution-day",
      act: "Празднование Дня Конституции перенесено на 15 марта (cdb.kz)",
      article: null,
      url: "https://cdb.kz/sistema/novosti/prazdnovanie_dnya_konstitutsii_pereneseno_na_15_marta/",
      checkedOn: null,
      group: "holidays",
      usedOn: ["calc"]
    },

    // «Куда обратиться», если не заплатили (вкладка ④ и панель). gov-771 (gov.kz, жалобы на органы занятости)
    // убрана 25.11.2026 по решению автора: страница не про инспекцию труда, на сайте больше не используется.
    {
      id: "news-wage-delay",
      act: "МТСЗН РК: куда обращаться работникам при задержке заработной платы (cdb.kz, 05.10.2026)",
      article: null,
      url: "https://cdb.kz/sistema/novosti/mtszn_rk_kuda_obrashchatsya_rabotnikam_pri_zaderzhke_zarabotnoy_platy/",
      checkedOn: null,
      group: "help",
      usedOn: ["help"]
    },
    {
      id: "enbek",
      act: "Министерство труда и социальной защиты населения Республики Казахстан (gov.kz)",
      article: null,
      url: "https://www.gov.kz/memleket/entities/enbek",
      checkedOn: null,
      group: "help",
      usedOn: ["help"]
    }
  ];

  if (typeof module !== "undefined" && module.exports) module.exports = root.LD_SOURCES;
})(typeof window !== "undefined" ? window : globalThis);
