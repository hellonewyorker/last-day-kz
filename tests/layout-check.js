/*
 * Проверка правила «один экран без скролла» (CLAUDE.md, правило 4).
 * Запуск: открыть сайт, в консоли браузера выполнить
 *   const s = document.createElement("script"); s.src = "tests/layout-check.js"; document.head.append(s);
 *   // через секунду:
 *   await LD_layoutCheck()
 * Проходит все вкладки, режимы калькулятора (с «Свой срок» и «тяжёлыми» датами),
 * подвкладки ②, ветки дерева ③, чек-лист ④ и возвращает список проблем:
 *   «…:N» — внутренний скролл на N px, «…/page» — появился скролл страницы.
 * Пустой список problems — всё помещается.
 */
window.LD_layoutCheck = async function () {
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const $ = id => document.getElementById(id);
  const over = el => el && el.offsetParent !== null ? Math.max(0, el.scrollHeight - el.clientHeight) : null;
  const page = () => { const de = document.documentElement; return de.scrollHeight > de.clientHeight || de.scrollWidth > de.clientWidth || document.body.scrollHeight > document.body.clientHeight; };
  const vis = id => $(id) && getComputedStyle($(id)).display !== "none";
  const out = { vw: innerWidth, vh: innerHeight, problems: [] };
  const P = (n, v) => { if (v) out.problems.push(n + (v === true ? "" : ":" + v)); };
  const skip = document.querySelector('[data-tour="skip"]'); if (skip) skip.click();

  location.hash = "calc"; await wait(600);
  const setv = (id, v) => { $(id).value = v; };
  for (const m of ["last", "when", "docs", "unpaid"]) {
    if (vis("cardtab-input")) { $("cardtab-input").click(); await wait(200); }
    $("mode-" + m).click(); await wait(200);
    if (m === "last" || m === "when") { document.querySelector("#form-" + m + ' input[value="custom"]').click(); await wait(100); }
    P("calc/" + m + "/input", over($("card-input")));
    if (vis("cardtab-dates") && !document.querySelector("#calc-actions:not([hidden])")) { $("cardtab-dates").click(); await wait(250); P("calc/" + m + "/dates-empty", over($("result-dates")) || over($("card-dates"))); if (vis("cardtab-input")) { $("cardtab-input").click(); await wait(150); } }
    if (m === "last") setv("notice", "2026-12-01");
    if (m === "when") setv("want", "2026-12-05");
    if (m === "docs") { setv("term", "2027-01-01"); setv("req", "2027-03-20"); }
    if (m === "unpaid") { setv("uterm", "2026-07-01"); setv("utoday", "2027-12-31"); }
    document.querySelector("#form-" + m + " .calc__submit").click(); await wait(700);
    $("cardtab-dates").click(); await wait(250); P("calc/" + m + "/dates", over($("result-dates")));
    $("cardtab-notes").click(); await wait(250); P("calc/" + m + "/notes", over($("result-notes")));
    if (vis("cardtab-calendar")) { $("cardtab-calendar").click(); await wait(250); P("calc/" + m + "/cal", over($("card-calendar"))); }
    P("calc/" + m + "/page", page());
    if (m === "last" || m === "when") document.querySelector("#form-" + m + ' input[value="1"]').click();
  }
  if (vis("cardtab-input")) $("cardtab-input").click();

  location.hash = "rules"; await wait(600);
  for (const k of ["steps", "rules", "game", "deadlines"]) { $("rsub-" + k).click(); await wait(350); P("rules/" + k, over($("rpanel-" + k))); P("rules/" + k + "/page", page()); }

  location.hash = "early"; await wait(600);
  for (const answers of [["yes", "yes"], ["yes", "no", "yes"], ["yes", "no", "no"], ["no", "yes"], ["no", "no", "yes"], ["no", "no", "no"]]) {
    if (!$("tree-restart").hidden) $("tree-restart").click(); await wait(150);
    for (const a of answers) { document.querySelector('[data-answer="' + a + '"]').click(); await wait(200); }
    P("tree/" + answers.join("-"), over($("tree-stage"))); P("tree/page", page());
  }

  location.hash = "payout"; await wait(600);
  for (const g of ["money", "docs"]) { $("psub-" + g).click(); await wait(300); P("pay/" + g, over($("ppanel-" + g))); P("pay/" + g + "/page", page()); }

  location.hash = "sources"; await wait(600); P("sources/page", page());
  location.hash = "calc"; await wait(500);
  return out;
};
