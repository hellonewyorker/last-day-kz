/*
 * Быстрая проверка доступности открытой вкладки (не замена ручной проверке).
 * Запуск в консоли браузера:
 *   const s = document.createElement("script"); s.src = "tests/a11y-check.js"; document.head.append(s);
 *   LD_a11yCheck()            // текущая вкладка и тема
 * Что проверяет:
 *   • у кнопок, ссылок, полей и вкладок есть доступное имя;
 *   • внутри aria-hidden нет элементов, до которых дойдёт Tab;
 *   • нет tabindex > 0 и повторяющихся id; у <img> есть alt;
 *   • контраст видимого текста по WCAG AA (4.5:1, крупный текст — 3:1),
 *     фон считается с учётом полупрозрачных слоёв.
 */
(function () {
  var cvs = document.createElement("canvas"); cvs.width = cvs.height = 1;
  var ctx = cvs.getContext("2d", { willReadFrequently: true });
  // любой CSS-цвет (rgb, color-mix, oklab…) → [r, g, b, a]
  function rgba(css) {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    var d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  }
  function over(top, bottom) { // наложить полупрозрачный цвет на непрозрачный
    var a = top[3];
    return [top[0] * a + bottom[0] * (1 - a), top[1] * a + bottom[1] * (1 - a), top[2] * a + bottom[2] * (1 - a), 1];
  }
  function bgOf(el) {
    var layers = [];
    for (var e = el; e && e.nodeType === 1; e = e.parentElement) {
      var c = rgba(getComputedStyle(e).backgroundColor);
      if (c[3] > 0) { layers.push(c); if (c[3] >= 0.999) break; }
    }
    var base = layers.length && layers[layers.length - 1][3] >= 0.999 ? layers.pop() : rgba(getComputedStyle(document.body).backgroundColor);
    base[3] = 1;
    for (var i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return base;
  }
  function lum(c) {
    var v = [c[0], c[1], c[2]].map(function (x) { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }
  function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function hidden(el) { return !!el.closest("[aria-hidden='true'], [hidden], .visually-hidden") || el.offsetParent === null && getComputedStyle(el).position !== "fixed"; }
  function name(el) {
    if (el.getAttribute("aria-label")) return el.getAttribute("aria-label");
    var lb = el.getAttribute("aria-labelledby");
    if (lb) return lb.split(/\s+/).map(function (id) { var x = document.getElementById(id); return x ? x.textContent : ""; }).join(" ").trim();
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) {
      var l = el.id && document.querySelector('label[for="' + el.id + '"]');
      if (l) return l.textContent.trim();
      var w = el.closest("label"); if (w) return w.textContent.trim();
      return "";
    }
    return (el.textContent || "").trim() || el.getAttribute("title") || "";
  }

  window.LD_a11yCheck = function () {
    var out = { tab: location.hash, theme: document.documentElement.getAttribute("data-theme") || "auto", noName: [], focusableInHidden: [], positiveTabindex: [], dupIds: [], imgNoAlt: [], lowContrast: [], checkedText: 0 };
    var focusSel = "a[href], button, input, select, textarea, [tabindex]";
    Array.prototype.forEach.call(document.querySelectorAll(focusSel + ", [role='tab']"), function (el) {
      var inHidden = el.closest("[aria-hidden='true']");
      if (inHidden && el.tabIndex >= 0 && !el.disabled && el.offsetParent !== null) out.focusableInHidden.push(el.id || el.className);
      if (el.tabIndex > 0) out.positiveTabindex.push(el.id || el.className);
      if (!inHidden && el.offsetParent !== null && !name(el)) out.noName.push(el.outerHTML.slice(0, 80));
    });
    var seen = {};
    Array.prototype.forEach.call(document.querySelectorAll("[id]"), function (el) { if (seen[el.id]) out.dupIds.push(el.id); seen[el.id] = 1; });
    Array.prototype.forEach.call(document.querySelectorAll("img"), function (el) { if (!el.hasAttribute("alt")) out.imgNoAlt.push(el.src); });
    // контраст: элементы с собственным текстом
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var done = new Set();
    while (walker.nextNode()) {
      var tn = walker.currentNode;
      if (!tn.textContent.trim()) continue;
      var el = tn.parentElement;
      if (!el || done.has(el) || hidden(el)) continue;
      var r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0 || r.bottom < 0 || r.top > innerHeight) continue;
      done.add(el);
      var cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || +cs.opacity === 0) continue;
      var fg = rgba(cs.color), bg = bgOf(el);
      if (fg[3] < 1) fg = over(fg, bg);
      var size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
      var need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
      var k = ratio(fg, bg);
      out.checkedText++;
      if (k < need) out.lowContrast.push((el.className || el.tagName) + " «" + tn.textContent.trim().slice(0, 30) + "» " + k.toFixed(2) + " < " + need);
    }
    return out;
  };
})();
