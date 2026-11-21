/* =========================================================
   Дерево решений вкладки ③ «Можно ли раньше».
   Только структура: тексты — ключи из data/i18n.js, ссылки — ключи "ref.*"
   (id источника внутри ключа совпадает с data/sources.js).
   Ветки — по ст. 56 ТК РК (notes/articles.md).

   Вопрос:  { q: ключ вопроса, yes: id узла, no: id узла }
   Вывод:   { title, parts: [{ text, refs }], note?, action? }
            action: "revoke" — кнопка «До какого числа можно отозвать?»,
                    "calc"   — кнопка «Посчитать последний день»
   ========================================================= */
(function (root) {
  "use strict";

  root.LD_TREE = {
    start: "early",
    nodes: {
      early:     { q: "tree.q.early", yes: "agree", no: "changed" },
      agree:     { q: "tree.q.agree", yes: "r_agree", no: "violation" },
      violation: { q: "tree.q.violation", yes: "r_violation", no: "r_wait" },
      changed:   { q: "tree.q.changed", yes: "r_revoke", no: "liable" },
      liable:    { q: "tree.q.liable", yes: "r_liable", no: "r_normal" },

      r_agree: {
        title: "tree.r.agree.title",
        parts: [{ text: "tree.r.agree.text", refs: ["ref.tk-56.p2"] }]
      },
      r_violation: {
        title: "tree.r.violation.title",
        parts: [{ text: "tree.r.violation.text", refs: ["ref.tk-56.p3"] }],
        note: "tree.r.violation.nocalc"
      },
      r_wait: {
        title: "tree.r.wait.title",
        parts: [
          { text: "tree.r.wait.text", refs: ["ref.tk-56.p1", "ref.tk-56.p2"] },
          { text: "tree.r.wait.text2", refs: ["ref.tk-56.p5"] }
        ],
        action: "calc"
      },
      r_revoke: {
        title: "tree.r.revoke.title",
        parts: [{ text: "tree.r.revoke.text", refs: ["ref.tk-56.p4"] }],
        note: "tree.r.revoke.exceptions",
        action: "revoke"
      },
      r_liable: {
        title: "tree.r.liable.title",
        parts: [
          { text: "tree.r.liable.text", refs: ["ref.tk-56.p5"] },
          { text: "tree.r.liable.text2", refs: ["ref.tk-56.p5"] }
        ]
      },
      r_normal: {
        title: "tree.r.normal.title",
        parts: [{ text: "tree.r.normal.text", refs: ["ref.tk-56.p1", "ref.tk-56.p5"] }],
        action: "calc"
      }
    }
  };

  if (typeof module !== "undefined" && module.exports) module.exports = root.LD_TREE;
})(typeof window !== "undefined" ? window : globalThis);
