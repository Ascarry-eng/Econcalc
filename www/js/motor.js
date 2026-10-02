// motor.js — Marjinal'in hesap çekirdeği. Arayüzden bağımsız: tarayıcıda window.Motor, Node'da
// module.exports olarak çalışır (test/motor_test.js bunu kullanır).
//
// Sözleşme: kullanıcı ifadesi (ör. "3x^2 - ln(q) + 2e^x") önce `normalle` ile math.js sözdizimine
// çevrilir. ln = doğal log, log = 10 tabanlı (hesap makinesi alışkanlığı). math.js'te ise
// log = doğal, log10 = 10 tabanlı — çeviri bu yüzden zorunlu.
(function (kok) {
  "use strict";
  const math = kok.math || (typeof require !== "undefined" ? require("mathjs") : null);
  const nerdamer = kok.nerdamer || (typeof require !== "undefined" ? require("nerdamer/all.min.js") : null);

  // predictable: sqrt(-1) karmaşık sayı değil NaN döner — iktisatta reel sayılarla çalışıyoruz
  const M = math.create(math.all, { predictable: true });
  const L = kok.L || ((tr) => tr);

  // ---------------------------------------------------------------- ifade çevirisi
  const ADLAR = ["arcsin", "arccos", "arctan", "asinh", "acosh", "atanh", "nthRoot", "sinh", "cosh", "tanh",
    "asin", "acos", "atan", "sqrt", "cbrt", "log10", "log2", "floor", "round", "ceil", "sign", "sin", "cos",
    "tan", "cot", "sec", "csc", "exp", "log", "abs", "min", "max", "mod", "Ans", "ln", "pi", "e"];
  const ESLE = { ln: "log", log: "log10", arcsin: "asin", arccos: "acos", arctan: "atan" };
  const SABIT = new Set(["pi", "e", "Infinity", "NaN", "i", "true", "false", "Ans"]);

  function normalle(girdi) {
    let t = String(girdi == null ? "" : girdi).trim();
    t = t.replace(/[×·∙⋅]/g, "*").replace(/÷/g, "/").replace(/[−–—]/g, "-").replace(/π/g, "pi")
      .replace(/√/g, "sqrt").replace(/²/g, "^2").replace(/³/g, "^3").replace(/\*\*/g, "^")
      .replace(/∞/g, "Infinity").replace(/\s+/g, " ");
    t = t.replace(/(\d+(?:\.\d+)?)\s*%/g, "($1/100)");
    // Bilimsel gösterim "2e3", "1.5e-4": harf bölücüye girmeden önce koru (yoksa 2·e·3 olur).
    // Parantez şart: "1/2e3" = 1/(2·10³), 1/2·10³ değil.
    t = t.replace(/(^|[^\w.])(\d+(?:\.\d*)?|\.\d+)e([+-]?\d+)(?![\d.A-Za-z(])/g, "$1($2*10^($3))");
    // Bitişik harfleri böl: "xe^x" -> "x*e^x", "2pix" -> "2pi*x". Bilinen adları açgözlü yakala.
    t = t.replace(/[A-Za-z_][A-Za-z_0-9]*/g, (id) => {
      if (id === "Infinity" || id === "NaN") return id;
      const parca = [];
      let i = 0;
      while (i < id.length) {
        let bulunan = null;
        for (const ad of ADLAR) if (id.startsWith(ad, i)) { bulunan = ad; break; }
        if (bulunan) { parca.push(ESLE[bulunan] || bulunan); i += bulunan.length; }
        else if (/\d/.test(id[i])) { let j = i; while (j < id.length && /[\d]/.test(id[j])) j++; parca.push(id.slice(i, j)); i = j; }
        else { parca.push(id[i]); i++; }
      }
      return parca.join("*");
    });
    return t;
  }

  function sayiyaCevir(r) {
    if (typeof r === "number") return r;
    if (r == null) return NaN;
    if (typeof r === "boolean") return r ? 1 : 0;
    if (r.isComplex) return Math.abs(r.im) < 1e-12 ? r.re : NaN;
    if (r.isFraction || r.isBigNumber) return Number(r.valueOf());
    return NaN;
  }

  // İfadedeki serbest değişkenler (fonksiyon adları ve sabitler hariç), alfabetik.
  function serbest(dugum) {
    const set = new Set();
    dugum.traverse((n, yol, ebeveyn) => {
      if (!n.isSymbolNode) return;
      if (ebeveyn && ebeveyn.isFunctionNode && yol === "fn") return;
      if (SABIT.has(n.name)) return;
      set.add(n.name);
    });
    return [...set].sort();
  }

  // Tek değişkenli fonksiyon derle. tercih: değişken yoksa kullanılacak ad.
  function fonk(girdi, tercih) {
    const metin = normalle(girdi);
    if (!metin) throw new Error(L("İfade boş.", "The expression is empty."));
    let dugum;
    try { dugum = M.parse(metin); } catch (e) { throw new Error(L("İfade okunamadı: ", "Could not read the expression: ") + turkceHata(e.message)); }
    const vars = serbest(dugum);
    if (vars.length > 1) throw new Error(L("Tek değişken bekleniyordu, ifadede birden fazla var: ", "Expected one variable, but the expression has several: ") + vars.join(", "));
    const v = vars[0] || tercih || "x";
    const kod = dugum.compile();
    const f = (x) => { try { return sayiyaCevir(kod.evaluate({ [v]: x })); } catch (e) { return NaN; } };
    return { metin, dugum, v, f };
  }

  // Hazır düğümden (normalle UYGULANMIŞ) fonksiyon. normalle idempotent DEĞİL (log -> log10), bu yüzden
  // iki ifadeyi birleştirirken metni tekrar normalle'den geçirmek yerine düğümleri birleştir.
  function fonkDugum(dugum, tercih) {
    const vars = serbest(dugum);
    if (vars.length > 1) throw new Error(L("Tek değişken bekleniyordu, ifadede birden fazla var: ", "Expected one variable, but the expression has several: ") + vars.join(", "));
    const v = vars[0] || tercih || "x";
    const kod = dugum.compile();
    const f = (x) => { try { return sayiyaCevir(kod.evaluate({ [v]: x })); } catch (e) { return NaN; } };
    return { metin: dugum.toString({ implicit: "show" }), dugum, v, f };
  }
  function fonkAl(girdi, tercih) { return girdi && girdi.dugum ? girdi : fonk(girdi, tercih); }
  // İki fonksiyondan birleşik düğüm: birlestir(F, G, (a, b) => `(${a}) - (${b})`)
  function birlestir(F, G, sablon, tercih) {
    if (F.v !== G.v && serbest(F.dugum).length && serbest(G.dugum).length) {
      throw new Error(L(`İki fonksiyonda aynı değişkeni kullan (birinde ${F.v}, ötekinde ${G.v} var).`, `Use the same variable in both functions (one has ${F.v}, the other ${G.v}).`));
    }
    const v = serbest(F.dugum).length ? F.v : G.v;
    const dugum = M.parse(sablon(F.dugum.toString({ implicit: "show" }), G.dugum.toString({ implicit: "show" }), v));
    return fonkDugum(dugum, tercih || v);
  }

  // Çok değişkenli derleme (kısmi türev, denklem sistemi için)
  function cokFonk(girdi) {
    const metin = normalle(girdi);
    if (!metin) throw new Error(L("İfade boş.", "The expression is empty."));
    let dugum;
    try { dugum = M.parse(metin); } catch (e) { throw new Error(L("İfade okunamadı: ", "Could not read the expression: ") + turkceHata(e.message)); }
    const vars = serbest(dugum);
    const kod = dugum.compile();
    const f = (kapsam) => { try { return sayiyaCevir(kod.evaluate({ ...kapsam })); } catch (e) { return NaN; } };
    return { metin, dugum, vars, f };
  }

  // Sabit sayısal değer (alanlara "1/3", "e^0.05", "2pi" yazılabilsin). Virgül ondalık kabul edilir.
  function deger(girdi, varsayilan) {
    let t = String(girdi == null ? "" : girdi).trim();
    if (t === "") {
      if (varsayilan !== undefined) return varsayilan;
      throw new Error(L("Bir alan boş bırakılmış.", "A field was left empty."));
    }
    if (/^[+-]?\d+,\d+$/.test(t)) t = t.replace(",", ".");
    const metin = normalle(t);
    let r;
    try { r = M.evaluate(metin); } catch (e) { throw new Error(L(`"${girdi}" sayı olarak okunamadı.`, `"${girdi}" could not be read as a number.`)); }
    const s = sayiyaCevir(r);
    if (Number.isNaN(s)) throw new Error(L(`"${girdi}" bir sayı değil.`, `"${girdi}" is not a number.`));
    return s;
  }

  function turkceHata(m) {
    if (L("tr", "en") === "en") return String(m).replace(/\(char \d+\)/i, "").trim();
    return String(m)
      .replace(/Unexpected end of expression/i, "ifade yarım kalmış")
      .replace(/Parenthesis \) expected/i, "kapanmamış parantez var")
      .replace(/Value expected/i, "bir değer eksik")
      .replace(/Undefined symbol (\w+)/i, "tanımsız sembol: $1")
      .replace(/Unexpected operator (\S+)/i, "beklenmeyen işlem: $1")
      .replace(/Unexpected type of argument/i, "uygunsuz argüman")
      .replace(/\(char \d+\)/i, "");
  }

  // Hesap makinesi değerlendirmesi (DEG/RAD destekli)
  const DERECE = Math.PI / 180;
  const dereceKapsam = {
    sin: (x) => Math.sin(x * DERECE), cos: (x) => Math.cos(x * DERECE), tan: (x) => {
      const m = ((x % 180) + 180) % 180;
      return m === 90 ? NaN : Math.tan(x * DERECE);
    },
    asin: (x) => Math.asin(x) / DERECE, acos: (x) => Math.acos(x) / DERECE, atan: (x) => Math.atan(x) / DERECE,
  };
  function hesapla(girdi, { derece = false, ans = 0 } = {}) {
    const metin = normalle(girdi);
    if (!metin) return { bos: true };
    const kapsam = { Ans: ans, ...(derece ? dereceKapsam : {}) };
    const r = M.evaluate(metin, kapsam);
    const s = sayiyaCevir(r);
    return { deger: s };
  }

  // ---------------------------------------------------------------- sembolik
  function turevDugum(dugum, v) {
    let d;
    try { d = M.derivative(dugum, v); } catch (e) { throw new Error(L("Bu ifadenin türevi alınamadı: ", "Could not differentiate this expression: ") + turkceHata(e.message)); }
    try { d = M.simplify(d); } catch (e) { /* sadeleşmezse ham kalsın */ }
    return d;
  }

  function acik(n) { return n && n.isParenthesisNode ? acik(n.content) : n; }

  // Toplamı terimlere ayır: [{s: ±1, n}]
  function terimler(dugum) {
    const out = [];
    (function gez(n, s) {
      n = acik(n);
      if (n.isOperatorNode && n.fn === "add" && n.args.length === 2) { gez(n.args[0], s); gez(n.args[1], s); return; }
      if (n.isOperatorNode && n.fn === "subtract") { gez(n.args[0], s); gez(n.args[1], -s); return; }
      if (n.isOperatorNode && n.fn === "unaryMinus") { gez(n.args[0], -s); return; }
      if (n.isConstantNode && typeof n.value === "number" && n.value < 0) { out.push({ s: -s, n: new M.ConstantNode(-n.value) }); return; }
      if (n.isOperatorNode && n.fn === "multiply" && n.args.length >= 1) {
        const ilk = acik(n.args[0]);
        if (ilk.isConstantNode && typeof ilk.value === "number" && ilk.value < 0) {
          const args = n.args.slice(); args[0] = new M.ConstantNode(-ilk.value);
          out.push({ s: -s, n: new M.OperatorNode("*", "multiply", args, n.implicit) }); return;
        }
        if (ilk.isOperatorNode && ilk.fn === "unaryMinus") {
          const args = n.args.slice(); args[0] = ilk.args[0];
          out.push({ s: -s, n: new M.OperatorNode("*", "multiply", args, n.implicit) }); return;
        }
      }
      out.push({ s, n });
    })(dugum, 1);
    return out;
  }

  function derece(n, v) {
    n = acik(n);
    if (!icerir(n, v)) return 0;
    if (n.isSymbolNode && n.name === v) return 1;
    if (n.isOperatorNode && n.fn === "pow") {
      const taban = acik(n.args[0]), us = acik(n.args[1]);
      if (taban.isSymbolNode && taban.name === v && !icerir(us, v)) {
        try { const k = sayiyaCevir(us.evaluate()); if (Number.isFinite(k)) return k; } catch (e) { /* */ }
      }
      return NaN;
    }
    if (n.isOperatorNode && n.fn === "multiply") {
      let t = 0;
      for (const a of n.args) { const d = derece(a, v); if (Number.isNaN(d)) return NaN; t += d; }
      return t;
    }
    if (n.isOperatorNode && n.fn === "divide" && !icerir(n.args[1], v)) return derece(n.args[0], v);
    return NaN;
  }

  function icerir(n, v) {
    let var_ = false;
    n.traverse((m, yol, eb) => {
      if (m.isSymbolNode && m.name === v && !(eb && eb.isFunctionNode && yol === "fn")) var_ = true;
    });
    return var_;
  }

  // Terimleri dereceye göre büyükten küçüğe diz (sabitler sona). Polinom olmayan terimler başta, sırası korunur.
  function duzenle(dugum, v) {
    const ts = terimler(dugum);
    if (ts.length < 2) return dugum;
    const anahtar = ts.map((t, i) => { const d = derece(t.n, v); return { t, i, d: Number.isNaN(d) ? 1e6 : d }; });
    anahtar.sort((a, b) => (b.d - a.d) || (a.i - b.i));
    // İlk terim eksiyse "-(4Q)" yerine "-4Q" yazılsın: eksiyi baştaki sabite göm
    const eksiIlk = (n) => {
      const a = acik(n);
      if (a.isConstantNode && typeof a.value === "number") return new M.ConstantNode(-a.value);
      if (a.isOperatorNode && a.fn === "multiply" && acik(a.args[0]).isConstantNode && typeof acik(a.args[0]).value === "number") {
        return new M.OperatorNode("*", "multiply", [new M.ConstantNode(-acik(a.args[0]).value), ...a.args.slice(1)], a.implicit);
      }
      return new M.OperatorNode("-", "unaryMinus", [n]);
    };
    let acc = null;
    for (const { t } of anahtar) {
      if (!acc) acc = t.s > 0 ? t.n : eksiIlk(t.n);
      else acc = new M.OperatorNode(t.s > 0 ? "+" : "-", t.s > 0 ? "add" : "subtract", [acc, t.n]);
    }
    return acc;
  }

  function yuvarla(x, basamak = 10) {
    if (!Number.isFinite(x) || x === 0) return x;
    const r = Number(x.toPrecision(basamak));
    const t = Math.round(r);
    return Math.abs(r - t) < 1e-9 * Math.max(1, Math.abs(r)) ? t : r;
  }

  function sabitleriYuvarla(dugum) {
    return dugum.transform((n) => (n.isConstantNode && typeof n.value === "number" ? new M.ConstantNode(yuvarla(n.value)) : n));
  }

  // LaTeX: "3\cdot{ x}^{2}" -> "3{x}^{2}" (sayı-harf arası çarpım işaretini gizle)
  function tex(dugum) {
    let s = sabitleriYuvarla(dugum).toTex({ parenthesis: "auto", implicit: "hide" });
    s = s.replace(/(\d)\\cdot\s*(?=[A-Za-z{\\(]|\\left)/g, "$1 ");
    s = s.replace(/\\mathrm\{Infinity\}/g, "\\infty");
    return s;
  }

  // Düz metin: "3 * x ^ 2" -> "3x^2". Sıra önemli: önce math.js'in log( -> ln(, sonra log10( -> log(.
  function duzMetin(dugum) {
    let s = sabitleriYuvarla(dugum).toString({ parenthesis: "auto", implicit: "hide" });
    s = s.replace(/\s*\^\s*/g, "^").replace(/(\d)\s*\*\s*(?=[A-Za-z(])/g, "$1").replace(/\s*\*\s*/g, "·");
    s = s.replace(/\blog\(/g, "ln(").replace(/\blog10\(/g, "log(");
    return s;
  }

  // Sembolik integral (nerdamer). Sonuç SAYISAL OLARAK DOĞRULANIR: F'(x) ≈ f(x) tutmazsa reddedilir —
  // nerdamer bazı ifadelerde (ör. x^0.5·e^-x) sessizce yanlış seri döndürüyor.
  function belirsizIntegral(girdi, tercih) {
    const F = fonkAl(girdi, tercih);
    const v = F.v;
    // implicit: "show" şart — yoksa "100 (e ^ ((-0.05) t))" çıkar ve nerdamer boşluğu yanlış okur
    let ner = F.dugum.toString({ parenthesis: "all", implicit: "show" })
      .replace(/\blog10\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g, "(log($1)/log(10))");
    let sonuc;
    try { sonuc = nerdamer(`integrate(${ner},${v})`).toString(); } catch (e) { return null; }
    if (!sonuc || /integrate|erf|Si\(|Ci\(|Ei\(|\bi\b/.test(sonuc)) return null;
    let dugum;
    try { dugum = M.parse(sonuc); } catch (e) { return null; }
    let sade = dugum;
    try { sade = M.simplify(dugum); } catch (e) { /* */ }
    if (serbest(sade).some((s) => s !== v)) return null;
    const kod = sade.compile();
    const Ff = (x) => { try { return sayiyaCevir(kod.evaluate({ [v]: x })); } catch (e) { return NaN; } };
    // Doğrulama: birkaç noktada merkezi farkla F' ve f karşılaştır
    const noktalar = [-2.7, -1.3, -0.4, 0.35, 0.9, 1.7, 2.6, 4.1, 7.3];
    let sinanan = 0;
    for (const x of noktalar) {
      const fx = F.f(x);
      if (!Number.isFinite(fx)) continue;
      const h = 1e-4 * Math.max(1, Math.abs(x));
      const a = Ff(x + h), b = Ff(x - h);
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      const turev = (a - b) / (2 * h);
      if (Math.abs(turev - fx) > 1e-4 * Math.max(1, Math.abs(fx))) return null;
      sinanan++;
    }
    if (sinanan < 2) return null;
    return { dugum: duzenle(sade, v), f: Ff, v };
  }

  // ---------------------------------------------------------------- sayısal
  // Brent kök bulma — f(a), f(b) ters işaretli olmalı
  function brent(f, a, b, tol = 1e-13) {
    let fa = f(a), fb = f(b);
    if (fa === 0) return a;
    if (fb === 0) return b;
    if (fa * fb > 0) return NaN;
    let c = a, fc = fa, d = b - a, e = d;
    for (let i = 0; i < 200; i++) {
      if (fb * fc > 0) { c = a; fc = fa; d = b - a; e = d; }
      if (Math.abs(fc) < Math.abs(fb)) { a = b; b = c; c = a; fa = fb; fb = fc; fc = fa; }
      const tol1 = 2 * Number.EPSILON * Math.abs(b) + 0.5 * tol;
      const xm = 0.5 * (c - b);
      if (Math.abs(xm) <= tol1 || fb === 0) return b;
      if (Math.abs(e) >= tol1 && Math.abs(fa) > Math.abs(fb)) {
        const s = fb / fa;
        let p, q;
        if (a === c) { p = 2 * xm * s; q = 1 - s; }
        else {
          const qq = fa / fc, r = fb / fc;
          p = s * (2 * xm * qq * (qq - r) - (b - a) * (r - 1));
          q = (qq - 1) * (r - 1) * (s - 1);
        }
        if (p > 0) q = -q;
        p = Math.abs(p);
        if (2 * p < Math.min(3 * xm * q - Math.abs(tol1 * q), Math.abs(e * q))) { e = d; d = p / q; }
        else { d = xm; e = d; }
      } else { d = xm; e = d; }
      a = b; fa = fb;
      b += Math.abs(d) > tol1 ? d : (xm > 0 ? tol1 : -tol1);
      fb = f(b);
    }
    return b;
  }

  function altinMin(f, a, b, iter = 120) {
    const g = (Math.sqrt(5) - 1) / 2;
    let c = b - g * (b - a), d = a + g * (b - a), fc = f(c), fd = f(d);
    for (let i = 0; i < iter; i++) {
      if (fc < fd) { b = d; d = c; fd = fc; c = b - g * (b - a); fc = f(c); }
      else { a = c; c = d; fc = fd; d = a + g * (b - a); fd = f(d); }
    }
    return (a + b) / 2;
  }

  // [a,b] aralığında f'nin reel kökleri. İşaret değişimi + teğet (çift) kökler. Kutuplar ve sıçramalar elenir.
  // Tolerans YEREL ölçekte (komşu örneklerin büyüklüğü): küresel en büyük |f|'ye bağlansaydı geniş aralıkta
  // (ör. x^4, [-1000,1000]) tolerans şişer ve sıfıra değmeyen dipler kök sanılırdı.
  function kokler(f, a, b, n = 3000) {
    const h = (b - a) / n;
    const xs = new Array(n + 1), ys = new Array(n + 1);
    for (let i = 0; i <= n; i++) { xs[i] = a + i * h; ys[i] = f(xs[i]); }
    const bulunan = [];
    const ekle = (r, yerel, tol) => {
      if (!Number.isFinite(r) || r < a - 1e-12 || r > b + 1e-12) return;
      const fr = f(r);
      if (!Number.isFinite(fr) || Math.abs(fr) > tol * Math.max(1, yerel)) return;
      if (bulunan.some((q) => Math.abs(q - r) < Math.max(1e-7, Math.abs(h) * 1e-3) * Math.max(1, Math.abs(r)))) return;
      bulunan.push(r);
    };
    for (let i = 0; i < n; i++) {
      const y0 = ys[i], y1 = ys[i + 1];
      if (!Number.isFinite(y0) || !Number.isFinite(y1)) continue;
      if (y0 === 0) { ekle(xs[i], 0, 1e-12); continue; }
      // Kökte |f| komşulardan çok küçük olmalı; kutupta (1/x) ya da sıçramada (işaret fonk.) büyük kalır
      if (y0 * y1 < 0) ekle(brent(f, xs[i], xs[i + 1]), Math.max(Math.abs(y0), Math.abs(y1)), 1e-6);
    }
    if (ys[n] === 0) ekle(xs[n], 0, 1e-12);
    // Teğet kökler: |f|'nin işaret değişmeden sıfıra değdiği yerel minimumlar
    for (let i = 1; i < n; i++) {
      const y0 = Math.abs(ys[i - 1]), y1 = Math.abs(ys[i]), y2 = Math.abs(ys[i + 1]);
      if (!(Number.isFinite(y0) && Number.isFinite(y1) && Number.isFinite(y2))) continue;
      if (y1 <= y0 && y1 <= y2 && ys[i - 1] * ys[i + 1] > 0 && y1 < 0.5 * Math.max(y0, y2)) {
        const r = altinMin((x) => Math.abs(f(x)), xs[i - 1], xs[i + 1]);
        ekle(r, Math.max(y0, y2), 1e-9);
      }
    }
    return bulunan.sort((p, q) => p - q).map((r) => temizle(r));
  }

  // 1.9999999999 -> 2 gibi kayan nokta artıklarını temizle
  function temizle(x) {
    if (!Number.isFinite(x)) return x;
    const t = Math.round(x);
    if (Math.abs(x - t) < 1e-9 * Math.max(1, Math.abs(x))) return t + 0;
    const r = Number(x.toPrecision(12));
    return r === 0 ? 0 : r;
  }

  // Gauss–Kronrod 7-15 (QUADPACK düğümleri)
  const XGK = [0.991455371120812639206854697526329, 0.949107912342758524526189684047851, 0.864864423359769072789712788640926,
    0.741531185599394439863864773280788, 0.586087235467691130294144845693013, 0.405845151377397166906606412076961,
    0.207784955007898467600689403773245, 0];
  const WGK = [0.022935322010529224963732008058970, 0.063092092629978553290700663189204, 0.104790010322250183839876322541518,
    0.140653259715525918745189590510238, 0.169004726639267902826583426598550, 0.190350578064785409913256402421014,
    0.204432940075298892414161999234649, 0.209482141084727828012999174891714];
  const WG = [0.129484966168869693270611432679082, 0.279705391489276667901467771423780, 0.381830050505118944950369775488975,
    0.417959183673469387755102040816327];

  function gk15(f, a, b) {
    const c = (a + b) / 2, h = (b - a) / 2;
    const fc = f(c);
    let k = fc * WGK[7], g = fc * WG[3];
    for (let j = 0; j < 7; j++) {
      const dx = h * XGK[j];
      const f1 = f(c - dx), f2 = f(c + dx);
      k += WGK[j] * (f1 + f2);
      if (j % 2 === 1) g += WG[(j - 1) / 2] * (f1 + f2);
    }
    return { k: k * h, hata: Math.abs((k - g) * h) };
  }

  function integralSayisal(f, a, b) {
    if (a === b) return { deger: 0, hata: 0 };
    if (a > b) { const r = integralSayisal(f, b, a); return { deger: -r.deger, hata: r.hata }; }
    let g = f;
    let A = a, B = b;
    if (!Number.isFinite(b) && Number.isFinite(a)) {
      g = (t) => f(a + t / (1 - t)) / ((1 - t) * (1 - t)); A = 0; B = 1;
    } else if (!Number.isFinite(a) && Number.isFinite(b)) {
      g = (t) => f(b - (1 - t) / t) / (t * t); A = 0; B = 1;
    } else if (!Number.isFinite(a) && !Number.isFinite(b)) {
      g = (t) => { const x = t / (1 - t * t); return f(x) * (1 + t * t) / ((1 - t * t) * (1 - t * t)); }; A = -1; B = 1;
    }
    let yigin = [[A, B]], toplam = 0, hataT = 0, sayac = 0;
    const tolAbs = 1e-11;
    while (yigin.length) {
      const [x0, x1] = yigin.pop();
      const r = gk15(g, x0, x1);
      if (!Number.isFinite(r.k)) return { deger: NaN, hata: Infinity, tanimsiz: true };
      sayac++;
      if (r.hata <= Math.max(tolAbs, 1e-10 * Math.abs(r.k)) * Math.max(1, (x1 - x0) / (B - A) * 50) || sayac > 4000 || x1 - x0 < 1e-12 * (B - A)) {
        toplam += r.k; hataT += r.hata;
      } else {
        const m = (x0 + x1) / 2; yigin.push([x0, m], [m, x1]);
      }
    }
    return { deger: toplam, hata: hataT, guvenilmez: sayac > 4000 || hataT > 1e-6 * Math.max(1, Math.abs(toplam)) };
  }

  // Merkezi fark türevi (sembolik türev olmayan yerde yedek)
  function sayisalTurev(f, x) {
    const h = 1e-5 * Math.max(1, Math.abs(x));
    return (f(x + h) - f(x - h)) / (2 * h);
  }

  // ---------------------------------------------------------------- analiz: kritik noktalar
  // f, f', f'' sembolik; [a,b] aralığında kritik ve büküm noktaları + sınıflandırma
  function ekstremum(girdi, a, b, tercih) {
    const F = fonkAl(girdi, tercih);
    const v = F.v;
    const d1 = turevDugum(F.dugum, v), d2 = turevDugum(d1, v);
    const f1 = derleDugum(d1, v), f2 = derleDugum(d2, v);
    const kritik = kokler(f1, a, b).map((x) => {
      const y = F.f(x), ikinci = f2(x);
      let tur;
      const eps = 1e-9 * Math.max(1, Math.abs(y));
      if (ikinci > eps) tur = "min";
      else if (ikinci < -eps) tur = "max";
      else {
        const h = Math.max(1e-4, Math.abs(b - a) * 1e-4);
        const sol = f1(x - h), sag = f1(x + h);
        tur = sol < 0 && sag > 0 ? "min" : sol > 0 && sag < 0 ? "max" : "bukum";
      }
      return { x, y: temizle(y), ikinci: temizle(ikinci), tur };
    }).filter((k) => Number.isFinite(k.y));
    // Büküm: f'' işaret değiştiren kökler
    const bukum = kokler(f2, a, b).filter((x) => {
      const h = Math.max(1e-4, Math.abs(b - a) * 1e-4);
      return f2(x - h) * f2(x + h) < 0;
    }).map((x) => ({ x, y: temizle(F.f(x)) })).filter((p) => Number.isFinite(p.y));
    // Artan/azalan aralıkları: kritik noktalar ve tanımsız noktalar arasında f' işareti
    const sinirlar = [a, ...kritik.map((k) => k.x), b];
    const monoton = [];
    for (let i = 0; i < sinirlar.length - 1; i++) {
      const m = (sinirlar[i] + sinirlar[i + 1]) / 2;
      const s = f1(m);
      monoton.push({ a: sinirlar[i], b: sinirlar[i + 1], yon: !Number.isFinite(s) ? "?" : s > 0 ? "artan" : s < 0 ? "azalan" : "sabit" });
    }
    // Kapalı aralıkta mutlak (global) ekstremumlar
    const adaylar = [...kritik.map((k) => ({ x: k.x, y: k.y })), { x: a, y: F.f(a) }, { x: b, y: F.f(b) }].filter((p) => Number.isFinite(p.y));
    let gmax = null, gmin = null;
    for (const p of adaylar) {
      if (!gmax || p.y > gmax.y) gmax = p;
      if (!gmin || p.y < gmin.y) gmin = p;
    }
    // Eşitlik: f(0) = f(3) = 1 gibi durumlarda tüm noktalar raporlanır
    const esit = (p, q) => Math.abs(p.y - q.y) <= 1e-9 * Math.max(1, Math.abs(q.y));
    const tekil = (liste) => liste.filter((p, i) => liste.findIndex((q) => Math.abs(q.x - p.x) < 1e-9) === i).sort((p, q) => p.x - q.x);
    const gmaxlar = gmax ? tekil(adaylar.filter((p) => esit(p, gmax))) : [];
    const gminler = gmin ? tekil(adaylar.filter((p) => esit(p, gmin))) : [];
    return { F, v, d1, d2, f1, f2, kritik, bukum, monoton, gmax, gmin, gmaxlar, gminler };
  }

  function derleDugum(dugum, v) {
    const kod = dugum.compile();
    return (x) => { try { return sayiyaCevir(kod.evaluate({ [v]: x })); } catch (e) { return NaN; } };
  }

  // Grafik/arama için makul aralık: köklerin ve kritik noktaların etrafı
  function otomatikAralik(noktalar, varsayilan = [-10, 10]) {
    const xs = noktalar.filter(Number.isFinite);
    if (!xs.length) return varsayilan.slice();
    let lo = Math.min(...xs), hi = Math.max(...xs);
    const pay = Math.max((hi - lo) * 0.35, Math.max(1, Math.abs(hi), Math.abs(lo)) * 0.25, 1);
    return [lo - pay, hi + pay];
  }

  // ---------------------------------------------------------------- finans
  // HP-12C işaret kuralı: PV·(1+i)^n + PMT·(1+i·tip)·((1+i)^n − 1)/i + FV = 0
  function tvmDenklem({ n, i, pv, pmt, fv, tip }) {
    if (Math.abs(i) < 1e-14) return pv + pmt * n + fv;
    const g = Math.pow(1 + i, n);
    return pv * g + pmt * (1 + i * tip) * (g - 1) / i + fv;
  }

  function tvmCoz(bilinen, aranan) {
    const { n, i, pv, pmt, fv, tip } = bilinen;
    if (aranan === "pv") {
      if (Math.abs(i) < 1e-14) return -(pmt * n + fv);
      const g = Math.pow(1 + i, n);
      return -(pmt * (1 + i * tip) * (g - 1) / i + fv) / g;
    }
    if (aranan === "fv") {
      if (Math.abs(i) < 1e-14) return -(pv + pmt * n);
      const g = Math.pow(1 + i, n);
      return -(pv * g + pmt * (1 + i * tip) * (g - 1) / i);
    }
    if (aranan === "pmt") {
      if (Math.abs(i) < 1e-14) return -(pv + fv) / n;
      const g = Math.pow(1 + i, n);
      return -(pv * g + fv) * i / ((1 + i * tip) * (g - 1));
    }
    if (aranan === "n") {
      if (Math.abs(i) < 1e-14) return pmt === 0 ? NaN : -(pv + fv) / pmt;
      const A = pmt * (1 + i * tip) / i;
      const oran = (A - fv) / (A + pv);
      if (!(oran > 0)) return NaN;
      return Math.log(oran) / Math.log(1 + i);
    }
    if (aranan === "i") {
      const g = (r) => tvmDenklem({ n, i: r, pv, pmt, fv, tip });
      const ks = kokler(g, -0.99, 3, 6000).filter((r) => r > -0.99);
      return ks.length ? ks : NaN;
    }
    return NaN;
  }

  function nbd(oran, akislar) {
    return akislar.reduce((t, cf, k) => t + cf / Math.pow(1 + oran, k), 0);
  }
  function ivo(akislar) {
    return kokler((r) => nbd(r, akislar), -0.95, 5, 8000);
  }

  // ---------------------------------------------------------------- matris (kesirli ya da ondalık)
  // Girdi: metin hücreleri. Hepsi kesre çevrilebiliyorsa TAM aritmetik, yoksa ondalık.
  function aritmetik(hucreler) {
    let kesirli = true;
    const say = hucreler.map((satir) => satir.map((h) => {
      let t = String(h).trim();
      if (t === "") t = "0";
      if (/^[+-]?\d+,\d+$/.test(t)) t = t.replace(",", ".");
      if (/^[+-]?(\d+(\.\d*)?|\.\d+)(\/[+-]?\d+(\.\d*)?)?$/.test(t)) {
        try { return M.fraction(t); } catch (e) { /* aşağı */ }
      }
      kesirli = false;
      return deger(t);
    }));
    if (kesirli) return { A: say, ops: KESIR, kesirli: true };
    return { A: say.map((s) => s.map((x) => (typeof x === "number" ? x : Number(x.valueOf())))), ops: ONDALIK, kesirli: false };
  }

  const KESIR = {
    sifir: () => M.fraction(0), bir: () => M.fraction(1),
    topla: (a, b) => a.add(b), cikar: (a, b) => a.sub(b), carp: (a, b) => a.mul(b), bol: (a, b) => a.div(b),
    sifirMi: (a) => a.equals(0), sayi: (a) => Number(a.valueOf()), neg: (a) => a.neg(),
    yaz: (a) => { const s = a.toFraction(); return s; },
  };
  const ONDALIK = {
    sifir: () => 0, bir: () => 1,
    topla: (a, b) => a + b, cikar: (a, b) => a - b, carp: (a, b) => a * b, bol: (a, b) => a / b,
    sifirMi: (a) => Math.abs(a) < 1e-12, sayi: (a) => a, neg: (a) => -a, yaz: (a) => bicim(a),
  };

  function kopya(A) { return A.map((s) => s.slice()); }

  // Gauss–Jordan: indirgenmiş satır eşelon biçim + adımlar + determinant (kare ise)
  function gaussJordan(A0, ops, sutunSiniri) {
    const A = kopya(A0);
    const m = A.length, n = A[0].length;
    const sinir = sutunSiniri == null ? n : sutunSiniri;
    const adimlar = [];
    const SR = L("S", "R"); // satır / row
    let det = ops.bir(), r = 0;
    const pivotlar = [];
    for (let c = 0; c < sinir && r < m; c++) {
      let p = -1;
      for (let i = r; i < m; i++) if (!ops.sifirMi(A[i][c])) { p = i; break; }
      if (p < 0) { det = ops.sifir(); continue; }
      if (p !== r) { [A[p], A[r]] = [A[r], A[p]]; det = ops.neg(det); adimlar.push(`${SR}${r + 1} ↔ ${SR}${p + 1}`); }
      const piv = A[r][c];
      det = ops.carp(det, piv);
      if (!ops.sifirMi(ops.cikar(piv, ops.bir()))) {
        A[r] = A[r].map((x) => ops.bol(x, piv));
        adimlar.push(`${SR}${r + 1} ← ${SR}${r + 1} ÷ ${ops.yaz(piv)}`);
      }
      for (let i = 0; i < m; i++) {
        if (i === r || ops.sifirMi(A[i][c])) continue;
        const k = A[i][c];
        A[i] = A[i].map((x, j) => ops.cikar(x, ops.carp(k, A[r][j])));
        const ks = ops.yaz(k);
        adimlar.push(`${SR}${i + 1} ← ${SR}${i + 1} − ${/^-|\//.test(ks) ? "(" + ks + ")" : ks}·${SR}${r + 1}`);
      }
      pivotlar.push(c);
      r++;
    }
    if (r < Math.min(m, sinir)) det = ops.sifir();
    return { R: A, adimlar, rank: r, det, pivotlar };
  }

  function birim(n, ops) {
    return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? ops.bir() : ops.sifir())));
  }

  function matDet(A, ops) {
    const n = A.length;
    if (n === 1) return A[0][0];
    if (n === 2) return ops.cikar(ops.carp(A[0][0], A[1][1]), ops.carp(A[0][1], A[1][0]));
    let t = ops.sifir();
    for (let j = 0; j < n; j++) {
      if (ops.sifirMi(A[0][j])) continue;
      const alt = A.slice(1).map((s) => s.filter((_, k) => k !== j));
      const terim = ops.carp(A[0][j], matDet(alt, ops));
      t = j % 2 === 0 ? ops.topla(t, terim) : ops.cikar(t, terim);
    }
    return t;
  }

  function matTers(A, ops) {
    const n = A.length;
    const I = birim(n, ops);
    const genis = A.map((s, i) => s.concat(I[i]));
    const g = gaussJordan(genis, ops, n);
    if (g.rank < n) return { tekil: true, adimlar: g.adimlar };
    return { T: g.R.map((s) => s.slice(n)), adimlar: g.adimlar };
  }

  function matCarp(A, B, ops) {
    return A.map((s) => B[0].map((_, j) => s.reduce((t, x, k) => ops.topla(t, ops.carp(x, B[k][j])), ops.sifir())));
  }

  // ---------------------------------------------------------------- biçimlendirme
  function bicim(x, basamak = 10) {
    if (x === Infinity) return "∞";
    if (x === -Infinity) return "−∞";
    if (typeof x !== "number" || Number.isNaN(x)) return L("tanımsız", "undefined");
    if (x === 0 || Math.abs(x) < 1e-13) return "0";
    const t = Math.round(x);
    if (Math.abs(x - t) < 1e-10 * Math.max(1, Math.abs(x)) && Math.abs(t) < 1e15) return eksi(String(t));
    const us = Math.floor(Math.log10(Math.abs(x)));
    if (us >= 12 || us <= -7) {
      const m = (x / Math.pow(10, us)).toPrecision(Math.min(basamak, 8)).replace(/\.?0+$/, "");
      return eksi(m) + "×10" + ustSimge(us);
    }
    let s = Number(x.toPrecision(basamak)).toString();
    if (/e/.test(s)) s = x.toFixed(Math.min(20, Math.max(0, basamak - us - 1)));
    if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
    return eksi(s);
  }
  function eksi(s) { return s.replace(/^-/, "−"); }
  const UST = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
  function ustSimge(n) { return String(n).split("").map((c) => UST[c] || c).join(""); }

  // Para/oran gösterimi: binlik ayraçlı, 2 ondalık
  function para(x) {
    if (!Number.isFinite(x)) return bicim(x);
    const s = Math.abs(x).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return (x < 0 ? "−" : "") + s;
  }
  function yuzde(x, basamak = 4) {
    if (!Number.isFinite(x)) return bicim(x);
    return bicim(Number((x * 100).toPrecision(basamak + 2))) + "%";
  }

  // Ondalığı makul kesre çevir (gösterim için): 0.333333 -> 1/3
  function kesirBul(x, maxPayda = 1000) {
    if (!Number.isFinite(x)) return null;
    if (Math.abs(x - Math.round(x)) < 1e-10) return null;
    let h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = x;
    for (let i = 0; i < 30; i++) {
      const a = Math.floor(b);
      [h1, h0] = [a * h1 + h0, h1];
      [k1, k0] = [a * k1 + k0, k1];
      if (k1 > maxPayda) return null;
      if (Math.abs(x - h1 / k1) < 1e-10 * Math.max(1, Math.abs(x))) return { p: h1, q: k1 };
      if (b - a < 1e-14) break;
      b = 1 / (b - a);
    }
    return null;
  }

  // Sayıyı LaTeX'e: kesirse \frac
  function sayiTex(x) {
    const k = kesirBul(x, 200);
    if (k && k.q > 1) return `${k.p < 0 ? "-" : ""}\\frac{${Math.abs(k.p)}}{${k.q}}`;
    return bicim(x).replace("−", "-").replace(/×10([⁻⁰¹²³⁴⁵⁶⁷⁸⁹]+)/, (_, u) => `\\times 10^{${u.split("").map((c) => Object.keys(UST).find((k) => UST[k] === c)).join("")}}`);
  }

  const Motor = {
    M, normalle, fonk, fonkDugum, fonkAl, birlestir, cokFonk, deger, hesapla, serbest, turevDugum, duzenle, tex, duz: duzMetin, belirsizIntegral, icerir, acik,
    brent, kokler, integralSayisal, sayisalTurev, ekstremum, derleDugum, otomatikAralik, temizle, yuvarla,
    tvmDenklem, tvmCoz, nbd, ivo, aritmetik, gaussJordan, matDet, matTers, matCarp, birim, KESIR, ONDALIK,
    bicim, para, yuzde, kesirBul, sayiTex, turkceHata, sayiyaCevir,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = Motor;
  kok.Motor = Motor;
})(typeof window !== "undefined" ? window : globalThis);
