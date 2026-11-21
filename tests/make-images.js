/*
 * Генератор картинок в фирменном стиле: img/og.png (1200×630, для ссылок в мессенджерах)
 * и img/apple-touch-icon.png (180×180). Рисует в браузере фирменными шрифтами (Geologica,
 * Golos Text) и цветами из css/tokens.css; тексты — из data/i18n.js.
 * Запуск (только на локальном сервере разработки, который принимает POST /__save/…):
 *   const s = document.createElement("script"); s.src = "tests/make-images.js"; document.head.append(s);
 *   await LD_makeImages()
 */
window.LD_makeImages = async function () {
  await document.fonts.load('800 100px "Geologica"', "Последний день.СОҢҒЫ КҮН");
  await document.fonts.load('500 40px "Golos Text"', "Калькулятор");
  var T = I18N.messages.ru;
  var C = { desk: "#F5EFE6", sheet: "#FBF8F2", back: "#EADFCD", ink: "#3E2A14", soft: "#6A5137", bronze: "#A8875A", bronzeInk: "#7A5A2E", signal: "#B0392B" };

  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

  // листок отрывного календаря: корешок с отверстиями, месяц, крупное число
  function leaf(ctx, x, y, w, h, month, day, wd) {
    ctx.save();
    ctx.shadowColor = "rgba(62,42,20,0.25)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
    ctx.fillStyle = C.back; rr(ctx, x + 14, y + 16, w, h, 28); ctx.fill();
    ctx.fillStyle = C.sheet; rr(ctx, x, y, w, h, 28); ctx.fill();
    ctx.restore();
    ctx.save(); rr(ctx, x, y, w, h, 28); ctx.clip();
    ctx.fillStyle = C.bronze; ctx.fillRect(x, y, w, 46);
    ctx.fillStyle = C.desk;
    for (var i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x + 34 + i * (w - 68) / 5, y + 23, 8, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = C.signal; ctx.fillRect(x, y + 46, w, 58);
    ctx.restore();
    ctx.fillStyle = "#FFFFFF"; ctx.font = '700 34px "Golos Text"'; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(month, x + w / 2, y + 76);
    ctx.fillStyle = C.signal; ctx.font = '800 170px "Geologica"';
    ctx.fillText(day, x + w / 2, y + 222);
    ctx.fillStyle = C.soft; ctx.font = '500 34px "Golos Text"';
    ctx.fillText(wd, x + w / 2, y + h - 40);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  async function save(canvas, name) {
    var blob = await new Promise(function (r) { canvas.toBlob(r, "image/png"); });
    var res = await fetch("/__save/" + name, { method: "POST", body: blob });
    return name + ": " + res.status + ", " + blob.size + " байт";
  }

  // ---------- OG 1200×630 ----------
  var og = document.createElement("canvas"); og.width = 1200; og.height = 630;
  var g = og.getContext("2d");
  g.fillStyle = C.desk; g.fillRect(0, 0, 1200, 630);
  var glow = g.createRadialGradient(1000, 80, 20, 1000, 80, 520);
  glow.addColorStop(0, "rgba(217,185,140,0.55)"); glow.addColorStop(1, "rgba(217,185,140,0)");
  g.fillStyle = glow; g.fillRect(0, 0, 1200, 630);
  // огромные бледные буквы на фоне, как бегущая строка вкладки ①
  g.fillStyle = "rgba(62,42,20,0.055)"; g.font = '800 230px "Geologica"';
  g.fillText(T["tab.calc.marquee"].replace(/ · $/, "").split(" · ")[1] || "", -40, 640);
  // логотип и подпись
  g.fillStyle = C.ink; g.font = '800 76px "Geologica"';
  var name = T["logo.text"];
  g.fillText(name, 72, 240);
  var w = g.measureText(name).width;
  g.fillStyle = C.signal; g.fillText(".", 72 + w, 240);
  g.fillStyle = C.ink; g.font = '600 40px "Golos Text"';
  // перенос строк по ширине: текст не заходит под листок
  function wrap(text, maxW) { var out = [], line = ""; text.split(" ").forEach(function (wd) { var test = line ? line + " " + wd : wd; if (g.measureText(test).width > maxW && line) { out.push(line); line = wd; } else line = test; }); out.push(line); return out; }
  var y = 318, lines = wrap(T["og.subtitle"], 660);
  lines.forEach(function (l, i) { g.fillText(l, 72, y + i * 52); });
  g.fillStyle = C.bronzeInk; g.font = '500 28px "Golos Text"';
  wrap(T["og.country"], 660).forEach(function (l, i) { g.fillText(l, 72, y + lines.length * 52 + 26 + i * 36); });
  // бронзовая линия-отрыв
  g.strokeStyle = C.bronze; g.lineWidth = 3; g.setLineDash([10, 10]);
  g.beginPath(); g.moveTo(72, 120); g.lineTo(560, 120); g.stroke(); g.setLineDash([]);
  // листок: дата из примера «Айгерим» (7 декабря, понедельник) — считает calc.js
  var r = LastDay.calculate("2026-11-05", 1), d = new Date(r.noticeEnd + "T00:00:00Z");
  var fm = function (o) { return App.i18n.dateFormat(Object.assign({ timeZone: "UTC" }, o)).format(d); };
  leaf(g, 868, 115, 270, 390, fm({ month: "long" }).toUpperCase().slice(0, 3), String(d.getUTCDate()), fm({ weekday: "long" }));

  // ---------- apple-touch-icon 180×180 ----------
  var ic = document.createElement("canvas"); ic.width = 180; ic.height = 180;
  var c = ic.getContext("2d");
  c.fillStyle = C.ink; c.fillRect(0, 0, 180, 180);
  c.fillStyle = C.sheet; rr(c, 22, 30, 136, 126, 22); c.fill();
  c.save(); rr(c, 22, 30, 136, 126, 22); c.clip(); c.fillStyle = C.bronze; c.fillRect(22, 30, 136, 30); c.restore();
  c.fillStyle = C.ink; [58, 90, 122].forEach(function (x) { c.beginPath(); c.arc(x, 45, 6, 0, Math.PI * 2); c.fill(); });
  c.fillStyle = C.ink; c.font = '800 70px "Geologica"'; c.textAlign = "center"; c.textBaseline = "middle";
  c.fillText(String(d.getUTCDate()), 82, 112);
  c.fillStyle = C.signal; c.beginPath(); c.arc(128, 128, 13, 0, Math.PI * 2); c.fill();

  return [await save(og, "og.png"), await save(ic, "apple-touch-icon.png")];
};
