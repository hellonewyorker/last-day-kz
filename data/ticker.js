/* =========================================================
   Бегущая строка внизу экрана: короткие факты, которые уже есть на сайте.
   text — ключ в data/i18n.js; src — id в data/sources.js (оттуда берётся «ст. N»);
   tab — вкладка, куда ведёт клик (там этот факт объяснён подробно, со ссылкой на adilet).
   Правило CLAUDE.md: бегущая строка не несёт информации, которой нет больше нигде.
   ========================================================= */
(function (root) {
  "use strict";

  root.LD_TICKER = [
    { text: "ticker.f.month",    src: "tk-56",  tab: "rules" },   // ② «Три срока», «По шагам»
    { text: "ticker.f.payment",  src: "tk-113", tab: "payout" },  // ④ «Деньги»
    { text: "ticker.f.dayOne",   src: "tk-13",  tab: "rules" },   // ② «Правила», карточка 1
    { text: "ticker.f.noDay",    src: "tk-13",  tab: "rules" },   // ② «Правила», карточка 3
    { text: "ticker.f.weekend",  src: "tk-13",  tab: "rules" },   // ② «Правила», карточка 4
    { text: "ticker.f.early",    src: "tk-56",  tab: "early" },   // ③ вывод «с письменного согласия»
    { text: "ticker.f.revoke",   src: "tk-56",  tab: "early" },   // ③ вывод «можно отозвать»
    { text: "ticker.f.workDoc",  src: "tk-62",  tab: "payout" },  // ④ «Документы»
    { text: "ticker.f.cert",     src: "tk-62",  tab: "payout" },  // ④ «Документы»
    { text: "ticker.f.year",     src: "tk-160", tab: "rules" }    // ② «Три срока»
  ];

  if (typeof module !== "undefined" && module.exports) module.exports = root.LD_TICKER;
})(typeof window !== "undefined" ? window : globalThis);
