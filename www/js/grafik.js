// grafik.js — plazma ekranda fonksiyon grafiği. Dokununca dikey okuma çizgisi çıkar.
(function () {
  "use strict";
  const RENK = {
    turuncu: "#ff8c3a", gri: "#d2d0c9", soluk: "#c47a45", mavi: "#9fb4bf",
    alanTuruncu: "rgba(255,140,58,0.28)", alanGri: "rgba(210,208,201,0.22)", alanKirmizi: "rgba(255,90,74,0.30)",
  };
  const r = (k) => RENK[k] || k || RENK.turuncu;

  function adim(aralik, hedef = 5) {
    const ham = aralik / hedef;
    const us = Math.pow(10, Math.floor(Math.log10(ham)));
    const n = ham / us;
    return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * us;
  }

  function etiket(v, s) {
    if (Math.abs(v) < s * 1e-6) return "0";
    const basamak = Math.max(0, -Math.floor(Math.log10(s)));
    const t = Math.abs(v) >= 1e5 || (Math.abs(v) < 1e-3) ? v.toExponential(1) : v.toFixed(Math.min(basamak, 6));
    return t.replace("-", "−");
  }

  function yAraligi(o, xa, xb) {
    const ys = [];
    const ornek = (f) => { for (let i = 0; i <= 300; i++) { const y = f(xa + (xb - xa) * i / 300); if (Number.isFinite(y)) ys.push(y); } };
    (o.egriler || []).forEach((e) => ornek(e.f));
    (o.parametrik || []).forEach((p) => {
      for (let i = 0; i <= 300; i++) {
        const [x, y] = p.xy(p.t0 + (p.t1 - p.t0) * i / 300);
        if (Number.isFinite(y) && x >= xa && x <= xb) ys.push(y);
      }
    });
    (o.noktalar || []).forEach((n) => { if (Number.isFinite(n.y)) ys.push(n.y); });
    (o.yataylar || []).forEach((n) => { if (Number.isFinite(n.y)) ys.push(n.y); });
    if (!ys.length) return [-10, 10];
    ys.sort((a, b) => a - b);
    let lo = ys[Math.floor(ys.length * 0.02)], hi = ys[Math.ceil(ys.length * 0.98) - 1];
    for (const n of o.noktalar || []) if (Number.isFinite(n.y)) { lo = Math.min(lo, n.y); hi = Math.max(hi, n.y); }
    if (o.sadePozitif) lo = Math.min(0, lo);
    else if (lo > 0 && lo < (hi - lo) * 0.6) lo = 0;
    else if (hi < 0 && -hi < (hi - lo) * 0.6) hi = 0;
    if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
    const pay = (hi - lo) * 0.1;
    return [lo - (o.sadePozitif && lo === 0 ? 0 : pay), hi + pay];
  }

  function ciz(o) {
    const kutu = Uyg.el("div", { class: "ekran grafik-kutu" });
    const tuval = Uyg.el("canvas");
    const oku = Uyg.el("div", { class: "grafik-oku" });
    kutu.append(tuval, oku);
    const lejant = Uyg.el("div", { class: "grafik-lejant" });
    for (const e of [...(o.egriler || []), ...(o.parametrik || [])]) {
      if (!e.ad) continue;
      lejant.append(Uyg.el("span", null, Uyg.el("i", { style: `background:${r(e.renk)}` }), e.ad));
    }
    if (lejant.childNodes.length) kutu.append(lejant);

    let okumaX = null;
    const [xa, xb] = o.x;
    const [ya, yb] = o.y || yAraligi(o, xa, xb);

    function boya() {
      const dpr = window.devicePixelRatio || 1;
      const W = tuval.clientWidth || 340, H = tuval.clientHeight || 260;
      tuval.width = Math.round(W * dpr); tuval.height = Math.round(H * dpr);
      const c = tuval.getContext("2d");
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, W, H);
      const sol = 40, alt = 22, ust = 10, sag = 10;
      const gx = (x) => sol + (x - xa) / (xb - xa) * (W - sol - sag);
      const gy = (y) => ust + (yb - y) / (yb - ya) * (H - ust - alt);
      const tx = (px) => xa + (px - sol) / (W - sol - sag) * (xb - xa);

      // ızgara
      c.font = '600 11px "Plex C", sans-serif';
      c.lineWidth = 1;
      const sx = adim(xb - xa), sy = adim(yb - ya);
      c.strokeStyle = "#3a322b"; c.fillStyle = "#9a8676";
      c.textAlign = "center"; c.textBaseline = "top";
      for (let x = Math.ceil(xa / sx) * sx; x <= xb + 1e-9; x += sx) {
        const p = Math.round(gx(x)) + 0.5;
        c.beginPath(); c.moveTo(p, ust); c.lineTo(p, H - alt); c.stroke();
        c.fillText(etiket(x, sx), p, H - alt + 5);
      }
      c.textAlign = "right"; c.textBaseline = "middle";
      for (let y = Math.ceil(ya / sy) * sy; y <= yb + 1e-9; y += sy) {
        const p = Math.round(gy(y)) + 0.5;
        c.beginPath(); c.moveTo(sol, p); c.lineTo(W - sag, p); c.stroke();
        c.fillText(etiket(y, sy), sol - 5, p);
      }
      // eksenler
      c.strokeStyle = "#8a7766"; c.lineWidth = 1.5;
      if (xa <= 0 && xb >= 0) { const p = Math.round(gx(0)) + 0.5; c.beginPath(); c.moveTo(p, ust); c.lineTo(p, H - alt); c.stroke(); }
      if (ya <= 0 && yb >= 0) { const p = Math.round(gy(0)) + 0.5; c.beginPath(); c.moveTo(sol, p); c.lineTo(W - sag, p); c.stroke(); }
      if (o.eksen) {
        c.fillStyle = "#c47a45"; c.font = '700 12px "Plex C", sans-serif';
        c.textAlign = "right"; c.textBaseline = "bottom"; c.fillText(o.eksen.x || "", W - sag - 2, H - alt - 3);
        c.textAlign = "left"; c.textBaseline = "top"; c.fillText(o.eksen.y || "", sol + 4, ust + 2);
      }

      c.save();
      c.beginPath(); c.rect(sol, ust, W - sol - sag, H - ust - alt); c.clip();

      // alanlar
      for (const a of o.alanlar || []) {
        const n = 160, x0 = Math.max(a.a, xa), x1 = Math.min(a.b, xb);
        if (!(x1 > x0)) continue;
        c.beginPath();
        for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n; const y = a.ust(x); c.lineTo(gx(x), gy(Number.isFinite(y) ? y : 0)); }
        for (let i = n; i >= 0; i--) { const x = x0 + (x1 - x0) * i / n; const y = a.alt ? a.alt(x) : 0; c.lineTo(gx(x), gy(Number.isFinite(y) ? y : 0)); }
        c.closePath(); c.fillStyle = r(a.renk || "alanTuruncu"); c.fill();
      }
      // yardımcı çizgiler
      c.setLineDash([5, 4]); c.lineWidth = 1.2;
      for (const d of o.dikeyler || []) { c.strokeStyle = r(d.renk || "soluk"); const p = gx(d.x); c.beginPath(); c.moveTo(p, ust); c.lineTo(p, H - alt); c.stroke(); }
      for (const d of o.yataylar || []) { c.strokeStyle = r(d.renk || "soluk"); const p = gy(d.y); c.beginPath(); c.moveTo(sol, p); c.lineTo(W - sag, p); c.stroke(); }
      c.setLineDash([]);

      // eğriler
      const sicrama = (yb - ya) * 2;
      const egriCiz = (noktaUret, renk, kesikli, kalin) => {
        c.strokeStyle = r(renk); c.lineWidth = kalin || 2.4;
        c.setLineDash(kesikli ? [7, 5] : []);
        c.shadowColor = r(renk); c.shadowBlur = r(renk) === RENK.turuncu ? 6 : 0;
        c.beginPath();
        let onceki = null;
        for (const [x, y] of noktaUret()) {
          if (!Number.isFinite(y) || !Number.isFinite(x)) { onceki = null; continue; }
          if (onceki && Math.abs(y - onceki) > sicrama) { c.moveTo(gx(x), gy(y)); }
          else if (onceki == null) c.moveTo(gx(x), gy(y));
          else c.lineTo(gx(x), gy(y));
          onceki = y;
        }
        c.stroke(); c.shadowBlur = 0; c.setLineDash([]);
      };
      for (const e of o.egriler || []) {
        egriCiz(function* () { const n = 600; for (let i = 0; i <= n; i++) { const x = xa + (xb - xa) * i / n; yield [x, e.f(x)]; } }, e.renk, e.kesikli, e.kalinlik);
      }
      for (const p of o.parametrik || []) {
        egriCiz(function* () { const n = 600; for (let i = 0; i <= n; i++) yield p.xy(p.t0 + (p.t1 - p.t0) * i / n); }, p.renk, p.kesikli);
      }
      // noktalar (keskin kare işaret)
      c.font = '700 12px "Plex C", sans-serif';
      for (const n of o.noktalar || []) {
        if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) continue;
        const px = gx(n.x), py = gy(n.y);
        c.fillStyle = r(n.renk || "gri"); c.strokeStyle = "#1c1916"; c.lineWidth = 2;
        c.fillRect(px - 4.5, py - 4.5, 9, 9); c.strokeRect(px - 4.5, py - 4.5, 9, 9);
        if (n.etiket) {
          c.textAlign = px > W - 90 ? "right" : "left"; c.textBaseline = n.alta ? "top" : "bottom";
          c.fillStyle = "#ebe9e3";
          c.fillText(n.etiket, px + (px > W - 90 ? -8 : 8), n.alta ? py + 6 : py - 6);
        }
      }
      // okuma çizgisi
      if (okumaX != null) {
        const p = gx(okumaX);
        c.strokeStyle = "rgba(235,233,227,.6)"; c.lineWidth = 1; c.beginPath(); c.moveTo(p, ust); c.lineTo(p, H - alt); c.stroke();
        const satirlar = [`${(o.eksen && o.eksen.x) || "x"} = ${Motor.bicim(okumaX, 5)}`];
        for (const e of (o.egriler || []).slice(0, 3)) {
          const y = e.f(okumaX);
          if (Number.isFinite(y)) {
            c.fillStyle = r(e.renk); c.fillRect(p - 3.5, gy(y) - 3.5, 7, 7);
            satirlar.push(`${e.kisa || e.ad || "y"} = ${Motor.bicim(y, 5)}`);
          }
        }
        oku.textContent = satirlar.join("   ");
      } else oku.textContent = "";
      c.restore();
      boya.tx = tx;
    }

    const dokun = (e) => {
      const rect = tuval.getBoundingClientRect();
      okumaX = boya.tx(e.clientX - rect.left);
      if (okumaX < xa || okumaX > xb) okumaX = null;
      boya();
    };
    tuval.addEventListener("pointerdown", (e) => { tuval.setPointerCapture(e.pointerId); dokun(e); });
    tuval.addEventListener("pointermove", (e) => { if (e.buttons || e.pointerType === "touch") dokun(e); });

    // DOM'a girince boyutu belli olur
    requestAnimationFrame(() => requestAnimationFrame(boya));
    if (window.ResizeObserver) new ResizeObserver(() => boya()).observe(tuval);
    return kutu;
  }

  window.Grafik = { ciz, RENK };
})();
