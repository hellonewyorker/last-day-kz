/* =========================================================
   Источники. Одно место для всех ссылок сайта (правило 7 CLAUDE.md).
   Перенесено из раздела «Источники» в _old/index.html и вызовов ref() в _old/app.js.
   Новые URL — только те, что дал автор (5 штук). Якоря #zNN — как в _old/app.js.

   Поля: id, act (название акта / материала), article (статья), url, checkedOn (дата проверки).
   Дата проверки хранится ТОЛЬКО здесь — в LD_CHECKED_ON. Её же берёт js/calc.js (CHECKED_ON).
   checkedOn: null — источник ещё никто не сверял.
   ========================================================= */
(function (root) {
  "use strict";

  var TK_ACT = "Трудовой кодекс Республики Казахстан от 23.11.2015 № 414-V";
  var TK_URL = "https://adilet.zan.kz/rus/docs/K1500000414";
  // [ПРОВЕРИТЬ] Дата твоей сверки с adilet.zan.kz в формате "ГГГГ-ММ-ДД".
  // Поставь её, когда сверишь праздники и ссылки; до этого — null («ещё не проверено»).
  root.LD_CHECKED_ON = null;

  function tk(article, anchor) {
    return {
      id: "tk-" + article,
      act: TK_ACT,
      article: "ст. " + article,
      url: anchor ? TK_URL + "#" + anchor : TK_URL,
      checkedOn: root.LD_CHECKED_ON
    };
  }

  root.LD_SOURCES = [
    // Трудовой кодекс: статьи из списка источников старого сайта (ст. 13, 56, 61, 62, 84, 85, 96, 113, 159, 160)
    tk(13, "z13"),
    tk(56, "z56"),
    tk(61, "z61"),
    tk(62, "z62"),
    tk(84, "z84"),     // якорь проверен на adilet 20.11.2026 (в _old/app.js его не было)
    tk(85, "z85"),     // якорь проверен на adilet 20.11.2026 (в _old/app.js его не было)
    tk(96, "z96"),
    tk(113, "z113"),
    tk(159, "z159"),
    tk(160, "z160"),

    {
      id: "law-holidays",
      act: "Закон РК «О праздниках в Республике Казахстан» от 13.12.2001 № 267",
      article: "ст. 2, 3, 5 (в ред. Закона от 11.06.2026 № 306-VIII: с 01.07.2026 День Конституции — 15 марта)",
      url: "https://adilet.zan.kz/rus/docs/Z010000267_",
      checkedOn: root.LD_CHECKED_ON
    },

    // Новостные материалы — для сверки дат, не нормативные акты
    {
      id: "news-kurban-2027",
      act: "Рамазан и Курбан айт: ДУМК утвердило даты на 2027 год (Azattyq Rýhy, 19.10.2026)",
      article: null,
      url: "https://rus.azattyq-ruhy.kz/society/117936-ramazan-i-kurban-ait-dumk-utverdilo-daty-na-2027-god",
      checkedOn: null
    },
    {
      id: "news-newyear-2027",
      act: "Выходные на Новый год 2027 в Казахстане: сколько дней отдыхаем и график переносов (Digital Business, 29.10.2026)",
      article: null,
      url: "https://digitalbusiness.kz/2026-10-29/kazahstantsi-mogut-planirovat-noviy-god-izvestno-o-perenose-vihodnih-i-korotkoy-nedele/",
      checkedOn: null
    },
    {
      id: "news-constitution-day",
      act: "Празднование Дня Конституции перенесено на 15 марта (cdb.kz)",
      article: null,
      url: "https://cdb.kz/sistema/novosti/prazdnovanie_dnya_konstitutsii_pereneseno_na_15_marta/",
      checkedOn: null
    }
  ];

  if (typeof module !== "undefined" && module.exports) module.exports = root.LD_SOURCES;
})(typeof window !== "undefined" ? window : globalThis);
