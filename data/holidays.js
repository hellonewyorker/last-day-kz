/* =========================================================
   Праздники и выходные дни. Перенесено из _old/calc.js БЕЗ изменений:
   ничего не добавлено и не убрано (HOLIDAYS_MD + TK_DAYS_OFF).

   Поля:
     date       — "ММ-ДД" (каждый год) или "ГГГГ-ММ-ДД" (один конкретный день)
     yearly     — true: повторяется каждый год; false: только эта дата
     name       — название (так его покажет калькулятор)
     transfer   — true: если выпал на субботу/воскресенье, выходным становится следующий рабочий
                  день (ст. 5 Закона о праздниках); false: не переносится (ст. 84 п. 5 ТК РК)
     sourceId   — id правовой основы в data/sources.js
     dateSourceId — (необязательно) где сверять саму дату в конкретном году
     verified   — false, пока автор не сверит дату с источником

   Сверено 25.11.2026 (автор + Claude): ст. 2, 3, 5 Закона о праздниках и ст. 84 п. 5 ТК РК на adilet.zan.kz;
   Курбан-айт 2027 — 16 мая по календарю ДУМК (Azattyq Rýhy 19.10.2026, Ulysmedia). ДУМК предупреждает:
   даты религиозных праздников могут сдвинуться на один день (наблюдение за новолунием).

   Старый сайт считал праздники только с 01.07.2026 по 31.12.2027 (границы — в js/calc.js).
   ========================================================= */
(function (root) {
  "use strict";

  root.LD_HOLIDAYS = [
    // ст. 2–3 Закона «О праздниках в РК» (в ред. от 11.06.2026 № 306-VIII), с переносом по ст. 5
    { date: "01-01", yearly: true, name: "Новый год", transfer: true, sourceId: "law-holidays", dateSourceId: "news-newyear-2027", verified: true },
    { date: "01-02", yearly: true, name: "Новый год", transfer: true, sourceId: "law-holidays", dateSourceId: "news-newyear-2027", verified: true },
    { date: "03-08", yearly: true, name: "Международный женский день", transfer: true, sourceId: "law-holidays", verified: true },
    { date: "03-15", yearly: true, name: "День Конституции", transfer: true, sourceId: "law-holidays", dateSourceId: "news-constitution-day", verified: true },
    { date: "03-21", yearly: true, name: "Наурыз мейрамы", transfer: true, sourceId: "law-holidays", verified: true },
    { date: "03-22", yearly: true, name: "Наурыз мейрамы", transfer: true, sourceId: "law-holidays", verified: true },
    { date: "03-23", yearly: true, name: "Наурыз мейрамы", transfer: true, sourceId: "law-holidays", verified: true },
    { date: "05-01", yearly: true, name: "Праздник единства народа Казахстана", transfer: true, sourceId: "law-holidays", verified: true },
    { date: "05-07", yearly: true, name: "День защитника Отечества", transfer: true, sourceId: "law-holidays", verified: true },
    { date: "05-09", yearly: true, name: "День Победы", transfer: true, sourceId: "law-holidays", verified: true },
    { date: "07-06", yearly: true, name: "День Столицы", transfer: true, sourceId: "law-holidays", verified: true },
    { date: "10-25", yearly: true, name: "День Республики", transfer: true, sourceId: "law-holidays", verified: true },
    { date: "12-16", yearly: true, name: "День Независимости", transfer: true, sourceId: "law-holidays", verified: true },

    // Выходные дни по ст. 84 п. 5 ТК РК — без переноса
    { date: "2027-01-07", yearly: false, name: "Православное Рождество", transfer: false, sourceId: "tk-84", dateSourceId: "news-newyear-2027", verified: true },
    { date: "2027-05-16", yearly: false, name: "Первый день Курбан-айта (по календарю ДУМК)", transfer: false, sourceId: "tk-84", dateSourceId: "news-kurban-2027", verified: true }
  ];

  if (typeof module !== "undefined" && module.exports) module.exports = root.LD_HOLIDAYS;
})(typeof window !== "undefined" ? window : globalThis);
