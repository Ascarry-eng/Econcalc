// araclar_tanim.js — araçların HESAP kısmı. DOM'a dokunmaz; Node'daki test aynı dosyayı koşturur.
// Her araç: { id, ad, grup, not, konu, alanlar: [...], hesapla(d) -> sonuc }
// sonuc: { satirlar: [{etiket, deger, ana?, metin?}], adimlar: markdown(+LaTeX), grafikler: [spec], tablo, fx, fxNot }
// Metinler iki dilli: L("Türkçe", "English") — bkz. dil.js. Türkçe metinler testlerde etiket olarak aranır.
(function (kok) {
  "use strict";
  const Motor = kok.Motor;
  const M = Motor.M;
  const L = kok.L || ((tr) => tr);
  const Y = kok.Lyuzde || ((m) => "%" + m);
  const B = (x, b) => Motor.bicim(x, b);
  const S = (x) => Motor.sayiTex(x);
  const P = (x) => Motor.para(x);
  const bos = (s) => s == null || String(s).trim() === "";
  const fonk = (s, v) => Motor.fonk(s, v);
  const tx = (F) => Motor.tex(F.dugum);
  const txd = (d, v) => Motor.tex(Motor.duzenle(d, v));
  const satir = (etiket, deger, o = {}) => ({ etiket, deger, ...o });
  // String.raw içindeki "\n" -> satır sonu. Küçük harf öncesi korunur: \neq, \nu gibi LaTeX komutları bozulmasın.
  const SATIR = /\\n(?![a-z])/g;
  const yuzdeOku = (s, ad) => {
    const x = Motor.deger(s);
    if (!Number.isFinite(x)) throw new Error(L(`${ad} bir sayı olmalı.`, `${ad} must be a number.`));
    return x / 100;
  };
  const YOK = () => L("yok", "none");

  // Pozitif bölgede kök ara; bulamazsa aralığı büyüt
  function kokAra(f, alt = 0, ustler = [10, 100, 1e3, 1e4, 1e5, 1e6]) {
    for (const u of ustler) { const k = Motor.kokler(f, alt, u, 4000); if (k.length) return k; }
    return [];
  }

  // Kullanılan türev kuralları (öğretici not)
  function kurallar(dugum, v) {
    const k = new Set();
    const ic = (n) => Motor.icerir(n, v);
    const yalinMi = (n) => { n = Motor.acik(n); return n.isSymbolNode && n.name === v; };
    const ZINCIR = L(String.raw`Zincir kuralı: $\frac{d}{dx}f(g(x)) = f'(g(x))\,g'(x)$`, String.raw`Chain rule: $\frac{d}{dx}f(g(x)) = f'(g(x))\,g'(x)$`);
    const USTEL = L(String.raw`Üstel kural: $\frac{d}{dx}e^{u} = e^{u}\,u'$`, String.raw`Exponential rule: $\frac{d}{dx}e^{u} = e^{u}\,u'$`);
    dugum.traverse((n) => {
      if (n.isOperatorNode) {
        if (n.fn === "pow") {
          if (ic(n.args[0]) && !ic(n.args[1])) k.add(L(String.raw`Kuvvet kuralı: $\frac{d}{dx}x^n = n\,x^{n-1}$`, String.raw`Power rule: $\frac{d}{dx}x^n = n\,x^{n-1}$`));
          if (ic(n.args[1])) k.add(L(String.raw`Üstel kural: $\frac{d}{dx}e^{u} = e^{u}\,u'$, $\frac{d}{dx}a^{u} = a^{u}\ln a\;u'$`, String.raw`Exponential rule: $\frac{d}{dx}e^{u} = e^{u}\,u'$, $\frac{d}{dx}a^{u} = a^{u}\ln a\;u'$`));
          if ((ic(n.args[0]) && !yalinMi(n.args[0])) || (ic(n.args[1]) && !yalinMi(n.args[1]) && !Motor.acik(n.args[1]).isConstantNode)) k.add(ZINCIR);
        }
        if (n.fn === "multiply" && n.args.filter(ic).length >= 2) k.add(L(String.raw`Çarpım kuralı: $(uv)' = u'v + uv'$`, String.raw`Product rule: $(uv)' = u'v + uv'$`));
        if (n.fn === "divide" && ic(n.args[1])) k.add(L(String.raw`Bölüm kuralı: $\left(\frac{u}{v}\right)' = \frac{u'v - uv'}{v^2}$`, String.raw`Quotient rule: $\left(\frac{u}{v}\right)' = \frac{u'v - uv'}{v^2}$`));
      }
      if (n.isFunctionNode && n.args.some(ic)) {
        const ad = n.fn.name;
        if (ad === "log") k.add(L(String.raw`Logaritma: $\frac{d}{dx}\ln u = \frac{u'}{u}$`, String.raw`Logarithm: $\frac{d}{dx}\ln u = \frac{u'}{u}$`));
        if (ad === "log10") k.add(L(String.raw`10 tabanlı log: $\frac{d}{dx}\log u = \frac{u'}{u\,\ln 10}$`, String.raw`Base-10 log: $\frac{d}{dx}\log u = \frac{u'}{u\,\ln 10}$`));
        if (ad === "exp") k.add(USTEL);
        if (ad === "sqrt") k.add(L(String.raw`Kök: $\sqrt{u} = u^{1/2}$, türevi $\frac{u'}{2\sqrt{u}}$`, String.raw`Square root: $\sqrt{u} = u^{1/2}$, derivative $\frac{u'}{2\sqrt{u}}$`));
        if (!yalinMi(n.args[0])) k.add(ZINCIR);
      }
    });
    return [...k];
  }

  // ---------------------------------------------------------------- fx-82ES tuş sırası
  // Sınavda telefon yok, Casio fx-82ES var. Adım: { ne, tuslar, sonuc }. Özel tuşlar: "x■" üs, "√■" kök,
  // "→" kutudan çık (Doğal Gösterim'de üs/kök kutusu ancak sağ okla kapanır), "SHIFT","ln" = e■, "(−)" eksi
  // işareti, "x²", "Ans". test/araclar_test.js her diziyi bir 82ES öykünücüsünde tuşlar, sonucu denetler.
  const fxSayi = (x) => {
    const s = String(Motor.yuvarla(x, 10));
    return s.startsWith("-") ? ["(", "(−)", s.slice(1), ")"] : [s];
  };
  const fxAdim = (ne, tuslar, sonuc) => ({ ne, tuslar: tuslar.flat(Infinity), sonuc });

  function tvmFx(t, aranan, sonuc) {
    const i = t.i, n = t.n, PV = Math.abs(t.pv), FV = Math.abs(t.fv), PMT = Math.abs(t.pmt);
    const bi = ["(", "1", "+", fxSayi(i), ")"];
    const basi = t.tip ? ["×", bi] : [];
    const S_ = Math.abs(sonuc);
    if (aranan === "fv" && t.pmt === 0) return [fxAdim("FV = PV(1+i)ⁿ", [fxSayi(PV), "×", bi, "x■", fxSayi(n), "="], S_)];
    if (aranan === "pv" && t.pmt === 0) return [fxAdim("PV = FV ÷ (1+i)ⁿ", [fxSayi(FV), "÷", bi, "x■", fxSayi(n), "="], S_)];
    if (aranan === "pmt" && t.fv === 0) return [fxAdim(L("Taksit", "Instalment"), [fxSayi(PV), "×", fxSayi(i), "÷", "(", "1", "−", bi, "x■", "(−)", fxSayi(n), "→", ")", t.tip ? ["÷", bi] : [], "="], S_)];
    if (aranan === "pmt" && t.pv === 0) return [fxAdim(L("Birikim fonu ödemesi", "Sinking fund payment"), [fxSayi(FV), "×", fxSayi(i), "÷", "(", bi, "x■", fxSayi(n), "→", "−", "1", ")", t.tip ? ["÷", bi] : [], "="], S_)];
    if (aranan === "pv" && t.fv === 0) return [fxAdim(L("Anüitenin bugünkü değeri", "Present value of the annuity"), [fxSayi(PMT), "×", "(", "1", "−", bi, "x■", "(−)", fxSayi(n), "→", ")", "÷", fxSayi(i), basi, "="], S_)];
    if (aranan === "fv" && t.pv === 0) return [fxAdim(L("Anüitenin gelecek değeri", "Future value of the annuity"), [fxSayi(PMT), "×", "(", bi, "x■", fxSayi(n), "→", "−", "1", ")", "÷", fxSayi(i), basi, "="], S_)];
    if (aranan === "n" && t.pmt === 0) return [fxAdim(L("Dönem sayısı", "Number of periods"), ["ln", fxSayi(FV), "÷", fxSayi(PV), ")", "÷", "ln", "1", "+", fxSayi(i), ")", "="], S_)];
    if (aranan === "n" && t.fv === 0 && !t.tip) return [fxAdim(L("Dönem sayısı (kredi)", "Number of periods (loan)"), ["(−)", "ln", "1", "−", fxSayi(PV), "×", fxSayi(i), "÷", fxSayi(PMT), ")", "÷", "ln", "1", "+", fxSayi(i), ")", "="], S_)];
    if (aranan === "i" && t.pmt === 0) return [fxAdim(L("Dönem faizi (ondalık)", "Rate per period (decimal)"), ["(", fxSayi(FV), "÷", fxSayi(PV), ")", "x■", "1", "÷", fxSayi(n), "→", "−", "1", "="], S_)];
    return [];
  }

  // ======================================================================== ARAÇLAR
  const ARACLAR = [];
  const ekle = (a) => ARACLAR.push(a);

  // ---------------------------------------------------------------- GRAFİK
  ekle({
    id: "grafik", ad: L("Grafik çiz", "Plot a graph"), grup: "temel", konu: 1,
    not: L("Üç fonksiyona kadar aynı eksende. Grafiğe dokunup kaydırarak değer okursun.", "Up to three functions on the same axes. Touch and drag on the graph to read values."),
    alanlar: [
      { id: "f1", etiket: L("1. fonksiyon", "1st function"), tur: "ifade", v: "100 - 2x" },
      { id: "f2", etiket: L("2. fonksiyon (isteğe bağlı)", "2nd function (optional)"), tur: "ifade", v: "20 + 2x" },
      { id: "f3", etiket: L("3. fonksiyon (isteğe bağlı)", "3rd function (optional)"), tur: "ifade", v: "" },
      { id: "a", etiket: L("x en az", "x from"), tur: "sayi", v: "0", yarim: true },
      { id: "b", etiket: L("x en çok", "x to"), tur: "sayi", v: "50", yarim: true },
    ],
    hesapla(d) {
      const renk = ["turuncu", "gri", "soluk"];
      const fs = ["f1", "f2", "f3"].filter((k) => !bos(d[k])).map((k, i) => ({ F: fonk(d[k]), renk: renk[i], ad: d[k].trim(), kisa: `f${i + 1}` }));
      if (!fs.length) throw new Error(L("En az bir fonksiyon yaz.", "Enter at least one function."));
      const a = Motor.deger(d.a, -10), b = Motor.deger(d.b, 10);
      if (!(b > a)) throw new Error(L("“x en çok”, “x en az”dan büyük olmalı.", "“x to” must be greater than “x from”."));
      const satirlar = [], noktalar = [];
      const yokBurada = L("bu aralıkta yok", "none in this range");
      const k1 = Motor.kokler(fs[0].F.f, a, b);
      satirlar.push(satir(L("1. fonksiyonun kökleri", "Roots of the 1st function"), k1.length ? k1.map((x) => B(x, 6)).join(";  ") : yokBurada, { metin: true }));
      for (let i = 0; i < fs.length; i++) for (let j = i + 1; j < fs.length; j++) {
        const ks = Motor.kokler((x) => fs[i].F.f(x) - fs[j].F.f(x), a, b);
        satirlar.push(satir(L(`${i + 1}. ve ${j + 1}. kesişim`, `Intersection ${i + 1} & ${j + 1}`), ks.length ? ks.map((x) => `(${B(x, 6)}, ${B(fs[i].F.f(x), 6)})`).join("  ") : yokBurada, { metin: true }));
        ks.forEach((x) => noktalar.push({ x, y: fs[i].F.f(x), etiket: `(${B(x, 4)}, ${B(fs[i].F.f(x), 4)})` }));
      }
      return {
        satirlar,
        grafikler: [{ egriler: fs.map((g) => ({ f: g.F.f, renk: g.renk, ad: g.ad, kisa: g.kisa })), x: [a, b], noktalar, eksen: { x: fs[0].F.v } }],
      };
    },
  });

  // ---------------------------------------------------------------- DENKLEM ÇÖZ
  ekle({
    id: "denklem", ad: L("Denklem çöz", "Solve an equation"), grup: "temel", konu: 1,
    not: L("f(x) = g(x) denkleminin verilen aralıktaki tüm reel köklerini bulur. Sağ taraf boşsa 0 sayılır.", "Finds all real roots of f(x) = g(x) in the given range. An empty right side counts as 0."),
    alanlar: [
      { id: "f", etiket: L("Sol taraf", "Left side"), tur: "ifade", v: "x^3 - 6x^2 + 11x" },
      { id: "g", etiket: L("Sağ taraf", "Right side"), tur: "ifade", v: "6" },
      { id: "a", etiket: L("Aralık başı", "Range from"), tur: "sayi", v: "-100", yarim: true },
      { id: "b", etiket: L("Aralık sonu", "Range to"), tur: "sayi", v: "100", yarim: true },
    ],
    hesapla(d) {
      const F = fonk(d.f), G = fonk(bos(d.g) ? "0" : d.g, F.v);
      const H = Motor.birlestir(F, G, (a, b) => `(${a}) - (${b})`);
      const a = Motor.deger(d.a, -100), b = Motor.deger(d.b, 100);
      if (!(b > a)) throw new Error(L("Aralık sonu, başından büyük olmalı.", "The end of the range must be greater than its start."));
      const ks = Motor.kokler(H.f, a, b, 8000);
      const v = H.v;
      const satirlar = ks.length
        ? ks.map((x, i) => satir(`${v}${ks.length > 1 ? "₁₂₃₄₅₆₇₈₉"[i] || i + 1 : ""}`, B(x, 10), { ana: ks.length === 1 }))
        : [satir(L("Sonuç", "Result"), L("Bu aralıkta reel kök yok", "No real root in this range"), { metin: true })];
      const [ga, gb] = ks.length ? Motor.otomatikAralik(ks) : [Math.max(a, -10), Math.min(b, 10)];
      let adim = L(String.raw`Denklemi sıfıra eşitle: $$${tx(F)} - \left(${tx(G)}\right) = 0$$`, String.raw`Set the equation to zero: $$${tx(F)} - \left(${tx(G)}\right) = 0$$`);
      adim += ks.length
        ? L(`\n\n${ks.length} kök bulundu: `, `\n\n${ks.length} root(s) found: `) + ks.map((x) => `$${v} = ${S(x)}$`).join(", ") + "."
        : L("\n\nBu aralıkta işaret değiştiren ya da sıfıra değen nokta yok. Aralığı genişletmeyi dene.", "\n\nNo point in this range where the function changes sign or touches zero. Try a wider range.");
      adim += L("\n\nKökler sayısal olarak bulunur: aralık 8000 parçaya bölünür, işaret değişen her parçada kök Brent yöntemiyle 10⁻¹³ hassasiyetle daraltılır.", "\n\nRoots are found numerically: the range is split into 8000 pieces and every sign change is narrowed down with Brent's method to 10⁻¹³ precision.");
      return {
        satirlar, adimlar: adim,
        grafikler: [{ egriler: [{ f: F.f, renk: "turuncu", ad: L("sol", "left"), kisa: L("sol", "left") }, { f: G.f, renk: "gri", ad: L("sağ", "right"), kisa: L("sağ", "right") }], x: [Math.max(a, ga), Math.min(b, gb)], noktalar: ks.map((x) => ({ x, y: F.f(x), etiket: `${v}=${B(x, 4)}` })), eksen: { x: v } }],
      };
    },
  });

  // ---------------------------------------------------------------- DOĞRU
  ekle({
    id: "dogru", ad: L("Doğru denklemi", "Equation of a line"), grup: "temel", konu: 2,
    not: L("İki noktadan, eğim ve bir noktadan ya da ax + by = c biçiminden y = mx + b denklemini çıkarır. Talep doğrusunda x yerine Q, y yerine P düşün.", "Finds y = mx + b from two points, from a slope and a point, or from ax + by = c. For a demand line, think of Q as x and P as y."),
    alanlar: [
      { id: "mod", etiket: L("Elimde ne var?", "What do you have?"), tur: "secim", v: "iki", secenekler: [["iki", L("İki nokta", "Two points")], ["egim", L("Eğim + nokta", "Slope + point")], ["genel", "ax + by = c"]] },
      { id: "x1", etiket: "x₁", tur: "sayi", v: "10", yarim: true, kosul: (d) => d.mod !== "genel" },
      { id: "y1", etiket: "y₁", tur: "sayi", v: "80", yarim: true, kosul: (d) => d.mod !== "genel" },
      { id: "x2", etiket: "x₂", tur: "sayi", v: "30", yarim: true, kosul: (d) => d.mod === "iki" },
      { id: "y2", etiket: "y₂", tur: "sayi", v: "40", yarim: true, kosul: (d) => d.mod === "iki" },
      { id: "m", etiket: L("Eğim m", "Slope m"), tur: "sayi", v: "-2", kosul: (d) => d.mod === "egim" },
      { id: "ka", etiket: "a", tur: "sayi", v: "2", yarim: true, kosul: (d) => d.mod === "genel" },
      { id: "kb", etiket: "b", tur: "sayi", v: "1", yarim: true, kosul: (d) => d.mod === "genel" },
      { id: "kc", etiket: "c", tur: "sayi", v: "100", kosul: (d) => d.mod === "genel" },
    ],
    hesapla(d) {
      let m, b, adim, dikey = null;
      if (d.mod === "iki") {
        const x1 = Motor.deger(d.x1), y1 = Motor.deger(d.y1), x2 = Motor.deger(d.x2), y2 = Motor.deger(d.y2);
        if (x1 === x2) { dikey = x1; adim = L(`İki noktanın x'i aynı: doğru dikey, denklemi $x = ${S(x1)}$. Eğimi tanımsızdır.`, `Both points have the same x: the line is vertical, $x = ${S(x1)}$. Its slope is undefined.`); }
        else {
          m = (y2 - y1) / (x2 - x1); b = y1 - m * x1;
          adim = L(String.raw`Eğim, y'deki değişimin x'teki değişime oranı: `, String.raw`The slope is the change in y divided by the change in x: `) +
            String.raw`$$m = \frac{y_2 - y_1}{x_2 - x_1} = \frac{${S(y2)} - ${S(y1)}}{${S(x2)} - ${S(x1)}} = ${S(m)}$$` +
            L(String.raw`Kesişim $b$, noktalardan birini $y = mx + b$'ye koyunca çıkar: `, String.raw`The intercept $b$ follows from plugging one point into $y = mx + b$: `) +
            String.raw`$$${S(y1)} = ${S(m)}\cdot ${S(x1)} + b \;\Rightarrow\; b = ${S(b)}$$`;
        }
      } else if (d.mod === "egim") {
        m = Motor.deger(d.m); const x1 = Motor.deger(d.x1), y1 = Motor.deger(d.y1);
        b = y1 - m * x1;
        adim = L(String.raw`Nokta–eğim biçimi: `, String.raw`Point–slope form: `) + String.raw`$$y - y_1 = m(x - x_1) \;\Rightarrow\; y - ${S(y1)} = ${S(m)}(x - ${S(x1)})$$ ` +
          L(String.raw`Düzenlenince $b = y_1 - m x_1 = ${S(b)}$.`, String.raw`Rearranged: $b = y_1 - m x_1 = ${S(b)}$.`);
      } else {
        const a = Motor.deger(d.ka), bb = Motor.deger(d.kb), c = Motor.deger(d.kc);
        if (bb === 0) {
          if (a === 0) throw new Error(L("a ve b ikisi birden 0 olamaz.", "a and b cannot both be 0."));
          dikey = c / a; adim = L(`b = 0 olduğundan doğru dikey: $x = ${S(c / a)}$.`, `Since b = 0 the line is vertical: $x = ${S(c / a)}$.`);
        } else {
          m = -a / bb; b = c / bb;
          adim = L(String.raw`$y$'yi yalnız bırak: `, String.raw`Isolate $y$: `) + String.raw`$$${S(a)}x + ${S(bb)}y = ${S(c)} \;\Rightarrow\; y = -\frac{${S(a)}}{${S(bb)}}x + \frac{${S(c)}}{${S(bb)}}$$`;
        }
      }
      if (dikey != null) {
        return { satirlar: [satir(L("Denklem", "Equation"), `x = ${B(dikey)}`, { ana: true }), satir(L("Eğim", "Slope"), L("tanımsız (dikey)", "undefined (vertical)"), { metin: true })], adimlar: adim };
      }
      const xk = m !== 0 ? -b / m : NaN;
      const denk = `y = ${B(m)}x ${b < 0 ? "−" : "+"} ${B(Math.abs(b))}`;
      adim += L(
        `\n\n**Yorum:** eğim ${m < 0 ? "negatif — x arttıkça y azalır (talep doğrusu böyledir)" : m > 0 ? "pozitif — x arttıkça y artar (arz doğrusu böyledir)" : "sıfır — yatay doğru"}. x bir birim artınca y ${B(Math.abs(m))} birim ${m < 0 ? "azalır" : "artar"}.`,
        `\n\n**Reading:** the slope is ${m < 0 ? "negative — y falls as x rises (like a demand line)" : m > 0 ? "positive — y rises with x (like a supply line)" : "zero — a horizontal line"}. When x rises by one unit, y ${m < 0 ? "falls" : "rises"} by ${B(Math.abs(m))}.`);
      const xa = Math.min(0, ...(Number.isFinite(xk) ? [xk] : [])) - 5, xb = Math.max(10, ...(Number.isFinite(xk) ? [xk] : [])) + 5;
      return {
        satirlar: [satir(L("Denklem", "Equation"), denk, { ana: true, metin: true }), satir(L("Eğim m", "Slope m"), B(m)), satir(L("y-kesişimi b", "y-intercept b"), B(b)), satir(L("x-kesişimi", "x-intercept"), Number.isFinite(xk) ? B(xk) : YOK())],
        adimlar: adim,
        grafikler: [{ egriler: [{ f: (x) => m * x + b, renk: "turuncu", ad: denk, kisa: "y" }], x: [xa, xb], noktalar: [{ x: 0, y: b, etiket: `(0, ${B(b, 4)})` }, ...(Number.isFinite(xk) ? [{ x: xk, y: 0, etiket: `(${B(xk, 4)}, 0)` }] : [])] }],
      };
    },
  });

  // ---------------------------------------------------------------- DENKLEM SİSTEMİ
  ekle({
    id: "sistem", ad: L("Doğrusal denklem sistemi", "System of linear equations"), grup: "temel", konu: 2,
    not: L("Her satıra bir denklem yaz. Değişkenler tek harf olmalı (Q, P, x, y…). Örnek: arz ve talebin kesiştiği denge.", "One equation per line. Variables must be single letters (Q, P, x, y…). Example: the equilibrium where supply meets demand."),
    alanlar: [
      { id: "s", etiket: L("Denklemler", "Equations"), tur: "metin", v: "Q = 100 - 2P\nQ = 20 + 2P" },
    ],
    hesapla(d) {
      const satirlarMetin = String(d.s || "").split(/\n|;/).map((s) => s.trim()).filter(Boolean);
      if (!satirlarMetin.length) throw new Error(L("En az bir denklem yaz.", "Enter at least one equation."));
      const bilinen = new Set(["sin", "cos", "tan", "ln", "log", "sqrt", "exp", "pi", "e", "abs"]);
      for (const s of satirlarMetin) {
        const uzun = (s.match(/[A-Za-z]{2,}/g) || []).filter((w) => !bilinen.has(w));
        if (uzun.length) throw new Error(L(`“${uzun[0]}” iki harfli; burada çarpım (${uzun[0].split("").join("·")}) sayılırdı. Değişkenlere tek harf ver (ör. Qd yerine D).`, `“${uzun[0]}” has two letters; here it would be read as a product (${uzun[0].split("").join("·")}). Use single-letter variables (e.g. D instead of Qd).`));
      }
      const denk = satirlarMetin.map((s) => {
        const p = s.split("=");
        if (p.length !== 2) throw new Error(L(`“${s}” satırında tam bir tane = olmalı.`, `The line “${s}” must contain exactly one =.`));
        return Motor.cokFonk(`(${p[0]}) - (${p[1]})`);
      });
      const vars = [...new Set(denk.flatMap((q) => q.vars))].sort();
      if (!vars.length) throw new Error(L("Denklemlerde değişken yok.", "The equations contain no variables."));
      if (vars.length > 6) throw new Error(L("En çok 6 değişken.", "At most 6 variables."));
      // Katsayıları değerlendirerek çıkar: c0 = f(0), a_j = f(e_j) - c0; doğrusallığı rastgele noktada sına
      const sifir = Object.fromEntries(vars.map((v) => [v, 0]));
      const A = [], bvek = [];
      for (const q of denk) {
        const c0 = q.f(sifir);
        const satir_ = vars.map((v) => q.f({ ...sifir, [v]: 1 }) - c0);
        const deneme = Object.fromEntries(vars.map((v, i) => [v, 1.37 + i * 0.71]));
        const tahmin = c0 + satir_.reduce((t, a, i) => t + a * deneme[vars[i]], 0);
        if (!Number.isFinite(c0) || Math.abs(q.f(deneme) - tahmin) > 1e-8 * Math.max(1, Math.abs(tahmin))) {
          const s = satirlarMetin[denk.indexOf(q)];
          throw new Error(L(`“${s}” doğrusal değil (kare, çarpım ya da kök içeriyor). Doğrusal olmayanlar için Denklem çöz aracını kullan.`, `“${s}” is not linear (it has a square, a product or a root). Use the Solve an equation tool for non-linear ones.`));
        }
        A.push(satir_.map((x) => String(Motor.yuvarla(x, 12))));
        bvek.push(String(Motor.yuvarla(-c0, 12)));
      }
      const { A: Ak, ops } = Motor.aritmetik(A.map((s, i) => s.concat([bvek[i]])));
      const n = vars.length, m = Ak.length;
      const g = Motor.gaussJordan(Ak, ops, n);
      // rank([A|b]) TÜM sütunlarda pivot aranarak bulunmalı; g yalnız ilk n sütunda arar (çözümü okumak için)
      const katsayi = g.rank;
      const genis = Motor.gaussJordan(Ak, ops).rank;
      const mtx = (rows) => String.raw`\begin{bmatrix}${rows.map((r) => r.map((x) => S(ops.sayi(x))).join(" & ")).join(String.raw`\\`)}\end{bmatrix}`;
      let adim = L(String.raw`Katsayı matrisi $A$, değişkenler $(${vars.join(", ")})$ ve sağ taraf $b$: `, String.raw`Coefficient matrix $A$, variables $(${vars.join(", ")})$ and right-hand side $b$: `) +
        String.raw`$$A = ${mtx(Ak.map((s) => s.slice(0, n)))},\quad b = ${mtx(Ak.map((s) => [s[n]]))}$$`;
      let satirlar;
      const SONUC = L("Sonuç", "Result");
      if (katsayi < genis) {
        satirlar = [satir(SONUC, L("Çözüm yok (tutarsız sistem)", "No solution (inconsistent system)"), { metin: true })];
        adim += L(`\n\nrank(A) = ${katsayi} < rank([A|b]) = ${genis}: denklemler birbiriyle çelişiyor (ör. paralel doğrular).`, `\n\nrank(A) = ${katsayi} < rank([A|b]) = ${genis}: the equations contradict each other (e.g. parallel lines).`);
      } else if (katsayi < n) {
        satirlar = [satir(SONUC, L("Sonsuz çözüm", "Infinitely many solutions"), { metin: true })];
        adim += L(`\n\nrank(A) = ${katsayi} < değişken sayısı ${n}: en az bir denklem ötekilerden türetilebiliyor, sonsuz çözüm var. ${n - katsayi} değişken serbest seçilebilir.`, `\n\nrank(A) = ${katsayi} < number of variables ${n}: at least one equation follows from the others, so there are infinitely many solutions. ${n - katsayi} variable(s) can be chosen freely.`);
      } else {
        const cozum = vars.map((v, i) => { const satirNo = g.pivotlar.indexOf(i); return g.R[satirNo][n]; });
        satirlar = vars.map((v, i) => satir(v, ops.yaz(cozum[i]).replace("-", "−") + (ops === Motor.KESIR && !Number.isInteger(ops.sayi(cozum[i])) ? `  ≈ ${B(ops.sayi(cozum[i]), 8)}` : ""), { ana: n <= 2 }));
        if (n === m && n <= 3) {
          const Akare = Ak.map((s) => s.slice(0, n));
          const det = Motor.matDet(Akare, ops);
          adim += L(String.raw`\n\n**Cramer kuralı:** `, String.raw`\n\n**Cramer's rule:** `) + String.raw`$\det A = ${S(ops.sayi(det))}$.`;
          vars.forEach((v, i) => {
            const Ai = Akare.map((s, r) => s.map((x, c) => (c === i ? Ak[r][n] : x)));
            const di = Motor.matDet(Ai, ops);
            adim += String.raw` $$${v} = \frac{\det A_{${v}}}{\det A} = \frac{${S(ops.sayi(di))}}{${S(ops.sayi(det))}} = ${S(ops.sayi(cozum[i]))}$$`;
          });
          adim += L(String.raw`\n\n($A_{${vars[0]}}$: $A$'nın ${vars[0]} sütunu yerine $b$ yazılmış hâli.)`, String.raw`\n\n($A_{${vars[0]}}$: $A$ with its ${vars[0]} column replaced by $b$.)`);
        }
        if (g.adimlar.length) adim += L("\n\n**Satır işlemleri (Gauss–Jordan):**\n\n", "\n\n**Row operations (Gauss–Jordan):**\n\n") + g.adimlar.map((s) => "- " + s).join("\n");
      }
      return { satirlar, adimlar: adim.replace(SATIR, "\n") };
    },
  });

  // ---------------------------------------------------------------- PİYASA DENGESİ + VERGİ
  const TALEP = () => L("Talep", "Demand"), ARZ = () => L("Arz", "Supply"), ARZ_VERGI = () => L("Arz + vergi", "Supply + tax");
  ekle({
    id: "denge", ad: L("Piyasa dengesi ve vergi", "Market equilibrium and tax"), grup: "temel", konu: 2,
    not: L("Talep ve arzı aynı biçimde gir. Birim başına vergi satıcıdan alınır; tüketici ve üreticinin yükünü, vergi gelirini ve ölü ağırlık kaybını verir.", "Enter demand and supply in the same form. The per-unit tax is levied on sellers; you get the consumer and producer burden, tax revenue and the deadweight loss."),
    alanlar: [
      { id: "bicim", etiket: L("Fonksiyon biçimi", "Function form"), tur: "secim", v: "ters", secenekler: [["ters", "P = f(Q)"], ["duz", "Q = f(P)"]] },
      { id: "talep", etiket: L("Talep", "Demand"), tur: "ifade", v: "100 - 2Q", ipucu: (d) => (d.bicim === "duz" ? L("Q'yu P cinsinden yaz, ör. 50 - 0.5P", "Write Q in terms of P, e.g. 50 - 0.5P") : L("P'yi Q cinsinden yaz, ör. 100 - 2Q", "Write P in terms of Q, e.g. 100 - 2Q")) },
      { id: "arz", etiket: L("Arz", "Supply"), tur: "ifade", v: "10 + Q" },
      { id: "t", etiket: L("Birim başına vergi (yoksa 0)", "Per-unit tax (0 if none)"), tur: "sayi", v: "6" },
    ],
    hesapla(d) {
      const t = Motor.deger(d.t, 0);
      if (d.bicim === "duz") return dengeDuz(d, t);
      const D = fonk(d.talep, "Q"), Sf = fonk(d.arz, D.v);
      const v = D.v;
      const q0 = kokAra((q) => D.f(q) - Sf.f(q));
      if (!q0.length) throw new Error(L("Talep ve arz pozitif bölgede kesişmiyor. Fonksiyonları kontrol et.", "Demand and supply do not cross at positive quantities. Check the functions."));
      const Q0 = q0[0], P0 = D.f(Q0);
      let adim = L(String.raw`Dengede talep fiyatı arz fiyatına eşittir: `, String.raw`In equilibrium the demand price equals the supply price: `) + String.raw`$$${tx(D)} = ${tx(Sf)}$$ ` +
        L(String.raw`Buradan $${v}^* = ${S(Q0)}$, fiyat $P^* = ${S(P0)}$.`, String.raw`Hence $${v}^* = ${S(Q0)}$ and price $P^* = ${S(P0)}$.`);
      const satirlar = [satir(L(`Denge miktarı ${v}*`, `Equilibrium quantity ${v}*`), B(Q0), { ana: true }), satir(L("Denge fiyatı P*", "Equilibrium price P*"), B(P0), { ana: true })];
      const choke = Motor.kokler(D.f, 0, Math.max(Q0 * 20, 10))[0];
      const xb = Math.max(Q0 * 1.8, Number.isFinite(choke) ? Math.min(choke * 1.1, Q0 * 3) : 0);
      const grafik = { egriler: [{ f: D.f, renk: "turuncu", ad: TALEP(), kisa: "D" }, { f: Sf.f, renk: "gri", ad: ARZ(), kisa: "S" }], x: [0, xb], sadePozitif: true, noktalar: [{ x: Q0, y: P0, etiket: "E₀" }], eksen: { x: v, y: "P" }, alanlar: [] };
      if (t !== 0) {
        const qt = kokAra((q) => D.f(q) - Sf.f(q) - t);
        if (!qt.length) throw new Error(L("Vergiyle birlikte piyasa kapanıyor (pozitif denge yok).", "With the tax the market shuts down (no positive equilibrium)."));
        const Qt = qt[0], Pc = D.f(Qt), Pp = Sf.f(Qt);
        const gelir = t * Qt;
        const olu = Motor.integralSayisal((q) => D.f(q) - Sf.f(q), Qt, Q0).deger;
        const payT = B(100 * (Pc - P0) / t, 3), payU = B(100 * (P0 - Pp) / t, 3);
        satirlar.push(
          satir(L(`Vergili miktar ${v}ₜ`, `Quantity with tax ${v}ₜ`), B(Qt)),
          satir(L("Tüketicinin ödediği", "Price paid by consumers"), B(Pc)),
          satir(L("Üreticinin eline geçen", "Price received by producers"), B(Pp)),
          satir(L("Vergi geliri", "Tax revenue"), B(gelir)),
          satir(L(`Tüketicinin yükü (birim; vergide payı %${payT})`, `Consumer burden (per unit; ${payT}% of the tax)`), B(Pc - P0)),
          satir(L(`Üreticinin yükü (birim; vergide payı %${payU})`, `Producer burden (per unit; ${payU}% of the tax)`), B(P0 - Pp)),
          satir(L("Ölü ağırlık kaybı", "Deadweight loss"), B(olu)),
        );
        adim += L(String.raw`\n\n**Vergi:** satıcı her birimde $t = ${S(t)}$ öder, arz eğrisi $t$ kadar yukarı kayar. Yeni denge: `, String.raw`\n\n**Tax:** sellers pay $t = ${S(t)}$ per unit, so the supply curve shifts up by $t$. New equilibrium: `) +
          String.raw`$$${tx(D)} = ${tx(Sf)} + ${S(t)} \;\Rightarrow\; ${v}_t = ${S(Qt)}$$`;
        adim += L(String.raw`Tüketici $P_c = ${S(Pc)}$ öder, üreticiye $P_p = P_c - t = ${S(Pp)}$ kalır. Vergi geliri $t\cdot ${v}_t = ${S(gelir)}$.`, String.raw`Consumers pay $P_c = ${S(Pc)}$, producers keep $P_p = P_c - t = ${S(Pp)}$. Tax revenue $t\cdot ${v}_t = ${S(gelir)}$.`);
        adim += L(String.raw`\n\n**Yük paylaşımı:** fiyat tüketici için $${S(Pc - P0)}$ arttı, üretici için $${S(P0 - Pp)}$ düştü. Yükün çoğu esnekliği DÜŞÜK olan tarafa biner.`, String.raw`\n\n**Tax incidence:** the price rose by $${S(Pc - P0)}$ for consumers and fell by $${S(P0 - Pp)}$ for producers. Most of the burden falls on the LESS elastic side.`);
        adim += L(String.raw`\n\n**Ölü ağırlık kaybı** (vergi yüzünden yapılmayan alışverişin kaybı): `, String.raw`\n\n**Deadweight loss** (the value of trades that no longer happen because of the tax): `) +
          String.raw`$$\int_{${S(Qt)}}^{${S(Q0)}} \big(D(${v}) - S(${v})\big)\,d${v} = ${S(olu)}$$`;
        grafik.egriler.push({ f: (q) => Sf.f(q) + t, renk: "gri", kesikli: true, ad: ARZ_VERGI(), kisa: "S+t" });
        grafik.noktalar.push({ x: Qt, y: Pc, etiket: "Pc" }, { x: Qt, y: Pp, etiket: "Pp", alta: true });
        grafik.alanlar.push({ ust: () => Pc, alt: () => Pp, a: 0, b: Qt, renk: "alanGri" }, { ust: D.f, alt: Sf.f, a: Qt, b: Q0, renk: "alanKirmizi" });
      }
      return { satirlar, adimlar: adim.replace(SATIR, "\n"), grafikler: [grafik] };
    },
  });

  function dengeDuz(d, t) {
    const D = fonk(d.talep, "P"), Sf = fonk(d.arz, D.v);
    const v = D.v;
    const p0 = kokAra((p) => D.f(p) - Sf.f(p));
    if (!p0.length) throw new Error(L("Talep ve arz pozitif fiyatta kesişmiyor.", "Demand and supply do not cross at a positive price."));
    const P0 = p0[0], Q0 = D.f(P0);
    let adim = L(String.raw`Dengede talep edilen miktar arz edilene eşittir: `, String.raw`In equilibrium quantity demanded equals quantity supplied: `) + String.raw`$$${tx(D)} = ${tx(Sf)}$$ ` +
      L(String.raw`Buradan $${v}^* = ${S(P0)}$, miktar $Q^* = ${S(Q0)}$.`, String.raw`Hence $${v}^* = ${S(P0)}$ and quantity $Q^* = ${S(Q0)}$.`);
    const satirlar = [satir(L("Denge fiyatı P*", "Equilibrium price P*"), B(P0), { ana: true }), satir(L("Denge miktarı Q*", "Equilibrium quantity Q*"), B(Q0), { ana: true })];
    const pmax = (Motor.kokler(D.f, 0, Math.max(P0 * 20, 10))[0]) || P0 * 2;
    const grafik = {
      parametrik: [{ xy: (p) => [D.f(p), p], t0: 0, t1: pmax, renk: "turuncu", ad: TALEP() }, { xy: (p) => [Sf.f(p), p], t0: 0, t1: pmax, renk: "gri", ad: ARZ() }],
      x: [0, Math.max(Q0 * 1.8, D.f(0) || 0)], sadePozitif: true, noktalar: [{ x: Q0, y: P0, etiket: "E₀" }], eksen: { x: "Q", y: v },
    };
    if (t !== 0) {
      const pc = kokAra((p) => D.f(p) - Sf.f(p - t), 0);
      if (!pc.length) throw new Error(L("Vergiyle birlikte pozitif denge yok.", "No positive equilibrium with the tax."));
      const Pc = pc[0], Pp = Pc - t, Qt = D.f(Pc);
      // Ölü ağırlık: fiyat ekseninde iki parça (talep ve arz tarafı)
      const olu = Motor.integralSayisal((p) => Sf.f(p) - Qt, Pp, P0).deger + Motor.integralSayisal((p) => D.f(p) - Qt, P0, Pc).deger;
      satirlar.push(satir(L("Vergili miktar Qₜ", "Quantity with tax Qₜ"), B(Qt)), satir(L("Tüketicinin ödediği", "Price paid by consumers"), B(Pc)), satir(L("Üreticinin eline geçen", "Price received by producers"), B(Pp)),
        satir(L("Vergi geliri", "Tax revenue"), B(t * Qt)), satir(L("Tüketicinin yükü (birim)", "Consumer burden (per unit)"), B(Pc - P0)), satir(L("Üreticinin yükü (birim)", "Producer burden (per unit)"), B(P0 - Pp)), satir(L("Ölü ağırlık kaybı", "Deadweight loss"), B(olu)));
      adim += L(String.raw`\n\n**Vergi:** üretici $${v} - t$ fiyatına göre arz eder: `, String.raw`\n\n**Tax:** producers supply according to the price $${v} - t$: `) +
        String.raw`$$${tx(D)} = S(${v} - ${S(t)}) \;\Rightarrow\; P_c = ${S(Pc)},\; P_p = ${S(Pp)},\; Q_t = ${S(Qt)}$$ ` +
        L(String.raw`Vergi geliri $${S(t * Qt)}$, ölü ağırlık kaybı $${S(olu)}$.`, String.raw`Tax revenue $${S(t * Qt)}$, deadweight loss $${S(olu)}$.`);
      grafik.parametrik.push({ xy: (p) => [Sf.f(p - t), p], t0: t, t1: pmax + t, renk: "gri", kesikli: true, ad: ARZ_VERGI() });
      grafik.noktalar.push({ x: Qt, y: Pc, etiket: "Pc" }, { x: Qt, y: Pp, etiket: "Pp", alta: true });
    }
    return { satirlar, adimlar: adim.replace(SATIR, "\n"), grafikler: [grafik] };
  }

  // ---------------------------------------------------------------- BAŞABAŞ
  ekle({
    id: "basabas", ad: L("Başabaş noktası", "Break-even point"), grup: "temel", konu: 2,
    not: L("Toplam gelirin toplam maliyete eşit olduğu, kârın sıfır olduğu üretim miktarı.", "The output level where total revenue equals total cost, so profit is zero."),
    alanlar: [
      { id: "tr", etiket: L("Toplam gelir TR(Q)", "Total revenue TR(Q)"), tur: "ifade", v: "25Q" },
      { id: "tc", etiket: L("Toplam maliyet TC(Q)", "Total cost TC(Q)"), tur: "ifade", v: "1200 + 10Q" },
    ],
    hesapla(d) {
      const TR = fonk(d.tr, "Q"), TC = fonk(d.tc, TR.v);
      const PI = Motor.birlestir(TR, TC, (a, b) => `(${a}) - (${b})`, "Q");
      const v = PI.v;
      const ks = kokAra(PI.f, 0);
      let sade = PI.dugum; try { sade = Motor.duzenle(M.simplify(PI.dugum), v); } catch (e) { /* */ }
      let adim = L(String.raw`Kâr $\pi(${v}) = TR - TC$: `, String.raw`Profit $\pi(${v}) = TR - TC$: `) + String.raw`$$\pi(${v}) = ${Motor.tex(sade)}$$ ` +
        L(String.raw`Başabaş noktasında $\pi = 0$, yani $TR = TC$.`, String.raw`At the break-even point $\pi = 0$, i.e. $TR = TC$.`);
      const satirlar = ks.length
        ? ks.map((q, i) => satir(ks.length > 1 ? L(`Başabaş ${i + 1}: ${v}`, `Break-even ${i + 1}: ${v}`) : L(`Başabaş ${v}`, `Break-even ${v}`), B(q), { ana: true }))
        : [satir(L("Sonuç", "Result"), L("Pozitif başabaş noktası yok", "No positive break-even point"), { metin: true })];
      ks.forEach((q) => satirlar.push(satir(L(`  ${v} = ${B(q, 6)} iken TR = TC`, `  TR = TC at ${v} = ${B(q, 6)}`), B(TR.f(q)))));
      if (ks.length) {
        const ornek = ks[0] * 1.2 + 1;
        const noktalar = ks.map((q) => `$${v} = ${S(q)}$`).join(L(" ve ", " and "));
        adim += L(`\n\n${noktalar} noktasında gelir maliyeti tam karşılar. ${v} = ${B(ornek, 4)} için kâr ${B(PI.f(ornek), 6)}: ${PI.f(ornek) > 0 ? "bu noktanın ötesi kâr bölgesi" : "bu noktanın ötesi zarar bölgesi"}.`,
          `\n\nAt ${noktalar} revenue exactly covers cost. At ${v} = ${B(ornek, 4)} profit is ${B(PI.f(ornek), 6)}: ${PI.f(ornek) > 0 ? "beyond this point lies the profit region" : "beyond this point lies the loss region"}.`);
        // Doğrusal durum: TR = pQ, TC = FC + vQ  ->  Q = FC/(p - v)
        const p = TR.f(1) - TR.f(0), vc = TC.f(1) - TC.f(0), FC = TC.f(0);
        const dogrusal = Math.abs(TR.f(0)) < 1e-12 && [2, 7, 13].every((q) => Math.abs(TR.f(q) - p * q) < 1e-9 * Math.max(1, p * q) && Math.abs(TC.f(q) - FC - vc * q) < 1e-9 * Math.max(1, FC + vc * q));
        if (dogrusal && p !== vc) {
          adim += L(String.raw`\n\n**Doğrusal kısayol:** fiyat $p = ${S(p)}$, birim değişken maliyet $v = ${S(vc)}$, sabit maliyet $FC = ${S(FC)}$: `, String.raw`\n\n**Linear shortcut:** price $p = ${S(p)}$, unit variable cost $v = ${S(vc)}$, fixed cost $FC = ${S(FC)}$: `) +
            String.raw`$$Q_{BE} = \frac{FC}{p - v} = \frac{${S(FC)}}{${S(p)} - ${S(vc)}} = ${S(FC / (p - vc))}$$ ` +
            L(String.raw`$p - v$ = katkı payı: her birimin sabit maliyete katkısı.`, String.raw`$p - v$ is the contribution margin: what each unit contributes towards fixed cost.`);
        }
      }
      const xb = ks.length ? Math.max(...ks) * 2 : 100;
      return {
        satirlar, adimlar: adim.replace(SATIR, "\n"),
        grafikler: [{ egriler: [{ f: TR.f, renk: "turuncu", ad: "TR", kisa: "TR" }, { f: TC.f, renk: "gri", ad: "TC", kisa: "TC" }, { f: PI.f, renk: "soluk", kesikli: true, ad: L("Kâr", "Profit"), kisa: "π" }], x: [0, xb], noktalar: ks.map((q) => ({ x: q, y: TR.f(q), etiket: "BE" })), eksen: { x: v } }],
      };
    },
  });

  // ---------------------------------------------------------------- İKİNCİ DERECE
  ekle({
    id: "ikinci", ad: L("İkinci derece denklem", "Quadratic equation"), grup: "temel", konu: 3,
    not: L("ax² + bx + c: kökler, diskriminant, tepe noktası. Doğrusal talepte toplam gelir TR = P·Q ikinci derecedir; tepe noktası en yüksek geliri verir.", "ax² + bx + c: roots, discriminant, vertex. With linear demand, total revenue TR = P·Q is quadratic and its vertex gives the highest revenue."),
    alanlar: [
      { id: "a", etiket: "a", tur: "sayi", v: "-2", yarim: true },
      { id: "b", etiket: "b", tur: "sayi", v: "100", yarim: true },
      { id: "c", etiket: "c", tur: "sayi", v: "0" },
    ],
    hesapla(d) {
      const a = Motor.deger(d.a), b = Motor.deger(d.b), c = Motor.deger(d.c, 0);
      if (a === 0) throw new Error(L("a = 0 olursa denklem ikinci derece değil, doğrusaldır. Doğru aracını kullan.", "With a = 0 the equation is linear, not quadratic. Use the line tool."));
      const D = b * b - 4 * a * c;
      const h = -b / (2 * a), k = a * h * h + b * h + c;
      const f = (x) => a * x * x + b * x + c;
      const satirlar = [satir(L("Diskriminant Δ", "Discriminant Δ"), B(D))];
      let adim = String.raw`$$f(x) = ${S(a)}x^2 ${b < 0 ? "-" : "+"} ${S(Math.abs(b))}x ${c < 0 ? "-" : "+"} ${S(Math.abs(c))}$$` +
        L("**Diskriminant:** ", "**Discriminant:** ") + String.raw`$$\Delta = b^2 - 4ac = (${S(b)})^2 - 4(${S(a)})(${S(c)}) = ${S(D)}$$`;
      let kokler = [];
      if (D > 1e-12) {
        const r1 = (-b - Math.sqrt(D)) / (2 * a), r2 = (-b + Math.sqrt(D)) / (2 * a);
        kokler = [Math.min(r1, r2), Math.max(r1, r2)].map(Motor.temizle);
        satirlar.push(satir("x₁", B(kokler[0]), { ana: true }), satir("x₂", B(kokler[1]), { ana: true }));
        adim += L(String.raw`$\Delta > 0$: iki farklı reel kök. `, String.raw`$\Delta > 0$: two distinct real roots. `) +
          String.raw`$$x_{1,2} = \frac{-b \mp \sqrt{\Delta}}{2a} = \frac{${S(-b)} \mp \sqrt{${S(D)}}}{${S(2 * a)}}$$ $$x_1 = ${S(kokler[0])},\quad x_2 = ${S(kokler[1])}$$ ` +
          L(String.raw`Çarpanlara ayrılmış biçim: `, String.raw`Factored form: `) + String.raw`$${S(a)}(x - ${S(kokler[0])})(x - ${S(kokler[1])})$.`;
      } else if (Math.abs(D) <= 1e-12) {
        kokler = [Motor.temizle(h)];
        satirlar.push(satir(L("Çift kök x", "Double root x"), B(h), { ana: true }));
        adim += L(String.raw`$\Delta = 0$: tek (çift) kök $x = -\frac{b}{2a} = ${S(h)}$. Parabol x eksenine teğet.`, String.raw`$\Delta = 0$: one (double) root $x = -\frac{b}{2a} = ${S(h)}$. The parabola touches the x-axis.`);
      } else {
        const re = h, im = Math.sqrt(-D) / (2 * Math.abs(a));
        satirlar.push(satir(L("Kökler", "Roots"), `${B(re)} ± ${B(im)}i`, { metin: true }));
        adim += L(String.raw`$\Delta < 0$: reel kök yok, parabol x eksenini kesmez. Karmaşık kökler $x = ${S(re)} \pm ${S(im)}i$.`, String.raw`$\Delta < 0$: no real roots, the parabola never crosses the x-axis. Complex roots $x = ${S(re)} \pm ${S(im)}i$.`);
      }
      satirlar.push(satir(L("Tepe noktası", "Vertex"), `(${B(h)}, ${B(k)})`, { metin: true }), satir(a < 0 ? L("En büyük değer", "Maximum value") : L("En küçük değer", "Minimum value"), B(k)));
      adim += L("\n\n**Tepe noktası:** ", "\n\n**Vertex:** ") + String.raw`$$x_T = -\frac{b}{2a} = ${S(h)},\qquad f(x_T) = ${S(k)}$$ ` +
        L(`$a ${a < 0 ? "< 0" : "> 0"}$ olduğundan parabolün kolları ${a < 0 ? "aşağı bakar ve tepe EN YÜKSEK nokta" : "yukarı bakar ve tepe EN DÜŞÜK nokta"}dır.`,
          `Since $a ${a < 0 ? "< 0" : "> 0"}$ the parabola opens ${a < 0 ? "downwards and the vertex is the HIGHEST point" : "upwards and the vertex is the LOWEST point"}.`);
      const [xa, xb] = Motor.otomatikAralik([...kokler, h]);
      return {
        satirlar, adimlar: adim.replace(SATIR, "\n"),
        grafikler: [{ egriler: [{ f, renk: "turuncu", ad: "f(x)", kisa: "f" }], x: [xa, xb], noktalar: [{ x: h, y: k, etiket: L("Tepe", "Vertex") }, ...kokler.map((r) => ({ x: r, y: 0, etiket: B(r, 4) }))] }],
        fx: [
          fxAdim(L("Diskriminant Δ = b² − 4ac", "Discriminant Δ = b² − 4ac"), [fxSayi(b), "x²", "−", "4", "×", fxSayi(a), "×", fxSayi(c), "="], D),
          ...(D >= 0 ? [
            fxAdim("x = (−b + √Δ) ÷ 2a", ["(", fxSayi(-b), "+", "√■", fxSayi(D), "→", ")", "÷", "(", "2", "×", fxSayi(a), ")", "="], (-b + Math.sqrt(D)) / (2 * a)),
            fxAdim("x = (−b − √Δ) ÷ 2a", ["(", fxSayi(-b), "−", "√■", fxSayi(D), "→", ")", "÷", "(", "2", "×", fxSayi(a), ")", "="], (-b - Math.sqrt(D)) / (2 * a)),
          ] : []),
          fxAdim(L("Tepe noktası x = −b ÷ 2a", "Vertex x = −b ÷ 2a"), [fxSayi(-b), "÷", "(", "2", "×", fxSayi(a), ")", "="], h),
        ],
      };
    },
  });

  // ---------------------------------------------------------------- LOGARİTMA / ÜSTEL DENKLEM
  ekle({
    id: "log", ad: L("Logaritma ve üstel denklem", "Logarithms and exponential equations"), grup: "usel", konu: 4,
    not: L("Herhangi tabanda logaritma, ya da bilinmeyenin üste olduğu denklemler: a·bˣ = c ve a·eᵏˣ = c.", "Logarithms in any base, or equations with the unknown in the exponent: a·bˣ = c and a·eᵏˣ = c."),
    alanlar: [
      { id: "mod", etiket: L("Ne hesaplanacak?", "What to compute?"), tur: "secim", v: "usel", secenekler: [["log", "log_b(x)"], ["usel", "a·bˣ = c"], ["dogal", "a·eᵏˣ = c"]] },
      { id: "taban", etiket: L("Taban b", "Base b"), tur: "sayi", v: "2", yarim: true, kosul: (d) => d.mod === "log" },
      { id: "x", etiket: "x", tur: "sayi", v: "1024", yarim: true, kosul: (d) => d.mod === "log" },
      { id: "a", etiket: "a", tur: "sayi", v: "1000", yarim: true, kosul: (d) => d.mod !== "log" },
      { id: "b", etiket: L("b (taban)", "b (base)"), tur: "sayi", v: "1.08", yarim: true, kosul: (d) => d.mod === "usel" },
      { id: "k", etiket: "k", tur: "sayi", v: "0.05", yarim: true, kosul: (d) => d.mod === "dogal" },
      { id: "c", etiket: "c", tur: "sayi", v: "2000", kosul: (d) => d.mod !== "log" },
    ],
    hesapla(d) {
      if (d.mod === "log") {
        const b = Motor.deger(d.taban), x = Motor.deger(d.x);
        if (!(b > 0) || b === 1) throw new Error(L("Taban pozitif ve 1'den farklı olmalı.", "The base must be positive and different from 1."));
        if (!(x > 0)) throw new Error(L("Logaritma yalnız pozitif sayılar için tanımlı.", "Logarithms are defined only for positive numbers."));
        const r = Math.log(x) / Math.log(b);
        return {
          satirlar: [satir(`log_${B(b)}(${B(x)})`, B(r), { ana: true })],
          adimlar: L("Taban değiştirme kuralı: ", "Change-of-base rule: ") + String.raw`$$\log_{${S(b)}} ${S(x)} = \frac{\ln ${S(x)}}{\ln ${S(b)}} = \frac{${S(Math.log(x))}}{${S(Math.log(b))}} = ${S(r)}$$ ` +
            L(String.raw`Anlamı: $${S(b)}^{${S(r)}} = ${S(x)}$.`, String.raw`Meaning: $${S(b)}^{${S(r)}} = ${S(x)}$.`),
          fx: [fxAdim("log_b x = ln x ÷ ln b", ["ln", fxSayi(x), ")", "÷", "ln", fxSayi(b), ")", "="], r)],
        };
      }
      const a = Motor.deger(d.a), c = Motor.deger(d.c);
      if (a === 0) throw new Error(L("a sıfır olamaz.", "a cannot be zero."));
      if (!(c / a > 0)) throw new Error(L("c/a pozitif olmalı; üstel ifade hiçbir zaman negatif ya da sıfır olmaz.", "c/a must be positive; an exponential is never negative or zero."));
      if (d.mod === "usel") {
        const b = Motor.deger(d.b);
        if (!(b > 0) || b === 1) throw new Error(L("Taban b pozitif ve 1'den farklı olmalı.", "The base b must be positive and different from 1."));
        const x = Math.log(c / a) / Math.log(b);
        return {
          satirlar: [satir("x", B(x), { ana: true })],
          adimlar: String.raw`$$${S(a)}\cdot ${S(b)}^{x} = ${S(c)}$$ ` +
            L(String.raw`İki tarafı $${S(a)}$'ya böl: $${S(b)}^{x} = ${S(c / a)}$. İki tarafın doğal logaritmasını al ve $\ln(b^x) = x\ln b$ kuralını kullan: `,
              String.raw`Divide both sides by $${S(a)}$: $${S(b)}^{x} = ${S(c / a)}$. Take natural logs of both sides and use $\ln(b^x) = x\ln b$: `) +
            String.raw`$$x = \frac{\ln ${S(c / a)}}{\ln ${S(b)}} = \frac{${S(Math.log(c / a))}}{${S(Math.log(b))}} = ${S(x)}$$` +
            (b > 1 && a > 0 && c > a ? L(`\n\n**Finans okuması:** ${B(a)} TL, dönem başına %${B((b - 1) * 100, 6)} faizle yaklaşık ${B(x, 4)} dönemde ${B(c)} TL olur.`,
              `\n\n**Finance reading:** ${B(a)} grows to ${B(c)} in about ${B(x, 4)} periods at ${B((b - 1) * 100, 6)}% per period.`) : ""),
          grafikler: [{ egriler: [{ f: (t) => a * Math.pow(b, t), renk: "turuncu", ad: "a·bˣ", kisa: "y" }, { f: () => c, renk: "gri", kesikli: true, ad: "c", kisa: "c" }], x: Motor.otomatikAralik([0, x]), noktalar: [{ x, y: c, etiket: `x=${B(x, 4)}` }] }],
          fx: [fxAdim("x = ln(c ÷ a) ÷ ln b", ["ln", fxSayi(c), "÷", fxSayi(a), ")", "÷", "ln", fxSayi(b), ")", "="], x)],
        };
      }
      const k = Motor.deger(d.k);
      if (k === 0) throw new Error(L("k sıfır olamaz.", "k cannot be zero."));
      const x = Math.log(c / a) / k;
      return {
        satirlar: [satir("x", B(x), { ana: true })],
        adimlar: String.raw`$$${S(a)}\,e^{${S(k)}x} = ${S(c)}$$ ` +
          L(String.raw`$${S(a)}$'ya böl, sonra $\ln$ al ($\ln e^{u} = u$): `, String.raw`Divide by $${S(a)}$, then take $\ln$ ($\ln e^{u} = u$): `) +
          String.raw`$$${S(k)}x = \ln ${S(c / a)} \;\Rightarrow\; x = \frac{${S(Math.log(c / a))}}{${S(k)}} = ${S(x)}$$`,
        grafikler: [{ egriler: [{ f: (t) => a * Math.exp(k * t), renk: "turuncu", ad: "a·eᵏˣ", kisa: "y" }, { f: () => c, renk: "gri", kesikli: true, ad: "c", kisa: "c" }], x: Motor.otomatikAralik([0, x]), noktalar: [{ x, y: c, etiket: `x=${B(x, 4)}` }] }],
        fx: [fxAdim("x = ln(c ÷ a) ÷ k", ["ln", fxSayi(c), "÷", fxSayi(a), ")", "÷", fxSayi(k), "="], x)],
      };
    },
  });

  // ---------------------------------------------------------------- BÜYÜME
  const DONEM = () => L(" dönem", " periods");
  ekle({
    id: "buyume", ad: L("Büyüme oranı", "Growth rate"), grup: "usel", konu: 7,
    not: L("İki gözlemden ortalama büyüme (CAGR) ve sürekli büyüme oranı, katlanma süresi ya da ileriye projeksiyon.", "Average (compound) and continuous growth rate from two observations, doubling time, or a projection forward."),
    alanlar: [
      { id: "mod", etiket: L("Ne hesaplanacak?", "What to compute?"), tur: "secim", v: "iki", secenekler: [["iki", L("İki gözlemden oran", "Rate from two values")], ["kat", L("Katlanma süresi", "Doubling time")], ["proj", L("Projeksiyon", "Projection")]] },
      { id: "y1", etiket: L("Başlangıç değeri", "Initial value"), tur: "sayi", v: "1000", yarim: true, kosul: (d) => d.mod !== "kat" },
      { id: "y2", etiket: L("Bitiş değeri", "Final value"), tur: "sayi", v: "1500", yarim: true, kosul: (d) => d.mod === "iki" },
      { id: "n", etiket: L("Aradaki dönem sayısı", "Number of periods between"), tur: "sayi", v: "5", kosul: (d) => d.mod === "iki" },
      { id: "r", etiket: L("Büyüme oranı % (dönem başına)", "Growth rate % (per period)"), tur: "sayi", v: "7", yarim: true, kosul: (d) => d.mod !== "iki" },
      { id: "t", etiket: L("Dönem sayısı", "Number of periods"), tur: "sayi", v: "10", yarim: true, kosul: (d) => d.mod === "proj" },
    ],
    hesapla(d) {
      if (d.mod === "iki") {
        const y1 = Motor.deger(d.y1), y2 = Motor.deger(d.y2), n = Motor.deger(d.n);
        if (!(y1 > 0 && y2 > 0)) throw new Error(L("Değerler pozitif olmalı.", "The values must be positive."));
        if (!(n > 0)) throw new Error(L("Dönem sayısı pozitif olmalı.", "The number of periods must be positive."));
        const g = Math.pow(y2 / y1, 1 / n) - 1, k = Math.log(y2 / y1) / n, top = y2 / y1 - 1;
        return {
          satirlar: [satir(L("Ortalama büyüme (bileşik)", "Average growth (compound)"), Y(B(g * 100, 6)), { ana: true }), satir(L("Sürekli büyüme oranı", "Continuous growth rate"), Y(B(k * 100, 6))), satir(L("Toplam değişim", "Total change"), Y(B(top * 100, 6)))],
          adimlar: L(String.raw`**Bileşik (geometrik) ortalama büyüme** — her dönem aynı oranla büyüseydi: `, String.raw`**Compound (geometric) average growth** — as if it grew at the same rate every period: `) +
            String.raw`$$g = \left(\frac{y_n}{y_0}\right)^{1/n} - 1 = \left(\frac{${S(y2)}}{${S(y1)}}\right)^{1/${S(n)}} - 1 = ${S(g)}$$` +
            L(String.raw`**Sürekli büyüme oranı** — $y_n = y_0 e^{kn}$ modelinde: `, String.raw`**Continuous growth rate** — in the model $y_n = y_0 e^{kn}$: `) +
            String.raw`$$k = \frac{\ln(y_n / y_0)}{n} = \frac{\ln ${S(y2 / y1)}}{${S(n)}} = ${S(k)}$$` +
            L(`\n\nToplam değişimi dönem sayısına bölmek (%${B(top * 100, 4)} ÷ ${B(n)} = %${B(top * 100 / n, 4)}) bileşik büyümeyi OLDUĞUNDAN FAZLA gösterir; sınavda bu tuzağa dikkat.`,
              `\n\nDividing the total change by the number of periods (${B(top * 100, 4)}% ÷ ${B(n)} = ${B(top * 100 / n, 4)}%) OVERSTATES compound growth; watch out for this trap in exams.`),
          fx: [fxAdim(L("Ortalama büyüme g (ondalık)", "Average growth g (decimal)"), ["(", fxSayi(y2), "÷", fxSayi(y1), ")", "x■", "1", "÷", fxSayi(n), "→", "−", "1", "="], g), fxAdim(L("Sürekli oran k", "Continuous rate k"), ["ln", fxSayi(y2), "÷", fxSayi(y1), ")", "÷", fxSayi(n), "="], k)],
        };
      }
      const r = yuzdeOku(d.r, L("Oran", "Rate"));
      if (d.mod === "kat") {
        if (!(r > 0)) throw new Error(L("Katlanma için oran pozitif olmalı.", "The rate must be positive for doubling."));
        const kesin = Math.log(2) / Math.log(1 + r), surekli = Math.log(2) / r;
        return {
          satirlar: [satir(L("Katlanma süresi (bileşik)", "Doubling time (compound)"), B(kesin, 6) + DONEM(), { ana: true }), satir(L("Sürekli büyümede", "With continuous growth"), B(surekli, 6) + DONEM()), satir(L("70 kuralı", "Rule of 70"), B(70 / (r * 100), 6) + DONEM()), satir(L("72 kuralı", "Rule of 72"), B(72 / (r * 100), 6) + DONEM())],
          adimlar: L(String.raw`Değerin iki katına çıkması: $(1+r)^t = 2$. `, String.raw`The value doubles when $(1+r)^t = 2$. `) +
            String.raw`$$t = \frac{\ln 2}{\ln(1+r)} = \frac{0.6931}{\ln ${S(1 + r)}} = ${S(kesin)}$$ ` +
            L(String.raw`Sürekli büyümede $e^{rt} = 2 \Rightarrow t = \ln 2 / r = ${S(surekli)}$.`, String.raw`With continuous growth $e^{rt} = 2 \Rightarrow t = \ln 2 / r = ${S(surekli)}$.`) +
            L(String.raw`\n\n**70 kuralı:** $\ln 2 \approx 0.70$ olduğundan $t \approx 70 / (\%\text{oran})$. Küçük oranlarda iyi bir zihinden hesap yöntemidir; oran büyüdükçe sapar.`,
              String.raw`\n\n**Rule of 70:** since $\ln 2 \approx 0.70$, $t \approx 70 / (\text{rate in }\%)$. A good mental shortcut for small rates; it drifts as the rate grows.`),
          fx: [fxAdim(L("Katlanma süresi", "Doubling time"), ["ln", "2", ")", "÷", "ln", "1", "+", fxSayi(r), ")", "="], kesin), fxAdim(L("Sürekli büyümede", "With continuous growth"), ["ln", "2", ")", "÷", fxSayi(r), "="], surekli)],
        };
      }
      const y0 = Motor.deger(d.y1), t = Motor.deger(d.t);
      const bil = y0 * Math.pow(1 + r, t), sur = y0 * Math.exp(r * t);
      return {
        satirlar: [satir(L("Bileşik büyümeyle", "With compound growth"), B(bil, 10), { ana: true }), satir(L("Sürekli büyümeyle", "With continuous growth"), B(sur, 10))],
        adimlar: String.raw`$$y_t = y_0 (1+r)^t = ${S(y0)}(${S(1 + r)})^{${S(t)}} = ${S(bil)}$$ $$y_t = y_0 e^{rt} = ${S(y0)}\,e^{${S(r)}\cdot ${S(t)}} = ${S(sur)}$$ ` +
          L("Sürekli bileşik her zaman biraz daha fazladır, çünkü büyüme her an kendi üstüne eklenir.", "Continuous compounding is always slightly higher, because growth is added on top of itself at every instant."),
        grafikler: [{ egriler: [{ f: (s) => y0 * Math.pow(1 + r, s), renk: "turuncu", ad: "(1+r)ᵗ", kisa: L("bileşik", "compound") }, { f: (s) => y0 * Math.exp(r * s), renk: "gri", kesikli: true, ad: "eʳᵗ", kisa: L("sürekli", "continuous") }], x: [0, t], sadePozitif: true, eksen: { x: "t" } }],
        fx: [fxAdim(L("Bileşik", "Compound"), [fxSayi(y0), "×", "(", "1", "+", fxSayi(r), ")", "x■", fxSayi(t), "="], bil), fxAdim(L("Sürekli", "Continuous"), [fxSayi(y0), "×", "SHIFT", "ln", fxSayi(r), "×", fxSayi(t), "="], sur)],
      };
    },
  });

  // ---------------------------------------------------------------- FAİZ
  ekle({
    id: "faiz", ad: L("Faiz: basit, bileşik, sürekli", "Interest: simple, compound, continuous"), grup: "finans", konu: 5,
    not: L("Aynı anapara ve yıllık faizle üç yöntemi yan yana kıyaslar; efektif yıllık faizi verir.", "Compares the three methods side by side for the same principal and annual rate, and gives the effective annual rate."),
    alanlar: [
      { id: "p", etiket: L("Anapara", "Principal"), tur: "sayi", v: "10000" },
      { id: "r", etiket: L("Yıllık nominal faiz %", "Nominal annual rate %"), tur: "sayi", v: "12", yarim: true },
      { id: "t", etiket: L("Süre (yıl)", "Time (years)"), tur: "sayi", v: "3", yarim: true },
      { id: "m", etiket: L("Yılda kaç kez bileşik?", "Compounding periods per year"), tur: "secim", v: "12", secenekler: [["1", L("1 (yıllık)", "1 (annual)")], ["2", "2"], ["4", L("4 (çeyrek)", "4 (quarterly)")], ["12", L("12 (aylık)", "12 (monthly)")], ["365", L("365 (günlük)", "365 (daily)")]] },
    ],
    hesapla(d) {
      const p = Motor.deger(d.p), r = yuzdeOku(d.r, L("Faiz", "Rate")), t = Motor.deger(d.t), m = Number(d.m) || 1;
      const basit = p * (1 + r * t), bil = p * Math.pow(1 + r / m, m * t), sur = p * Math.exp(r * t);
      const efektif = Math.pow(1 + r / m, m) - 1, efSur = Math.exp(r) - 1;
      return {
        satirlar: [
          satir(L("Bileşik ile son değer", "Future value, compound"), P(bil), { ana: true }),
          satir(L("Basit faizle", "With simple interest"), P(basit)), satir(L("Sürekli bileşikle", "With continuous compounding"), P(sur)),
          satir(L("Bileşik faiz tutarı", "Compound interest earned"), P(bil - p)),
          satir(L("Efektif yıllık faiz", "Effective annual rate"), Y(B(efektif * 100, 6))), satir(L("Sürekli için efektif", "Effective rate, continuous"), Y(B(efSur * 100, 6))),
        ],
        adimlar: L(String.raw`**Basit faiz** — faiz yalnız anaparaya işler: `, String.raw`**Simple interest** — interest accrues on the principal only: `) +
          String.raw`$$FV = P(1 + rt) = ${S(p)}(1 + ${S(r)}\cdot ${S(t)}) = ${S(basit)}$$` +
          L(String.raw`**Bileşik faiz** — faiz faize de işler, yılda $m = ${m}$ kez: `, String.raw`**Compound interest** — interest also earns interest, $m = ${m}$ times a year: `) +
          String.raw`$$FV = P\left(1 + \frac{r}{m}\right)^{mt} = ${S(p)}\left(1 + \frac{${S(r)}}{${m}}\right)^{${S(m * t)}} = ${S(bil)}$$` +
          L(String.raw`**Sürekli bileşik** — $m \to \infty$ limiti: `, String.raw`**Continuous compounding** — the limit $m \to \infty$: `) +
          String.raw`$$FV = P e^{rt} = ${S(p)}\,e^{${S(r * t)}} = ${S(sur)}$$` +
          L(String.raw`**Efektif yıllık faiz** — bir yılda gerçekte ne kadar büyüdüğün: `, String.raw`**Effective annual rate** — how much you actually grow in one year: `) +
          String.raw`$$r_{ef} = \left(1 + \frac{r}{m}\right)^m - 1 = ${S(efektif)}$$ ` +
          L(`Bankanın söylediği %${B(r * 100)} nominaldir; aylık bileşikle gerçek getiri %${B(efektif * 100, 5)}.`, `The quoted ${B(r * 100)}% is nominal; with this compounding the real annual return is ${B(efektif * 100, 5)}%.`),
        grafikler: [{ egriler: [{ f: (s) => p * Math.pow(1 + r / m, m * s), renk: "turuncu", ad: L("Bileşik", "Compound"), kisa: L("bileşik", "compound") }, { f: (s) => p * (1 + r * s), renk: "gri", ad: L("Basit", "Simple"), kisa: L("basit", "simple") }, { f: (s) => p * Math.exp(r * s), renk: "soluk", kesikli: true, ad: L("Sürekli", "Continuous"), kisa: L("sürekli", "continuous") }], x: [0, t], sadePozitif: true, eksen: { x: L("yıl", "years") } }],
        fx: [
          fxAdim(L("Basit faiz", "Simple interest"), [fxSayi(p), "×", "(", "1", "+", fxSayi(r), "×", fxSayi(t), ")", "="], basit),
          fxAdim(L("Bileşik faiz", "Compound interest"), [fxSayi(p), "×", "(", "1", "+", fxSayi(r), "÷", fxSayi(m), ")", "x■", fxSayi(m), "×", fxSayi(t), "="], bil),
          fxAdim(L("Sürekli bileşik", "Continuous compounding"), [fxSayi(p), "×", "SHIFT", "ln", fxSayi(r), "×", fxSayi(t), "="], sur),
          fxAdim(L("Efektif yıllık faiz (ondalık)", "Effective annual rate (decimal)"), ["(", "1", "+", fxSayi(r), "÷", fxSayi(m), ")", "x■", fxSayi(m), "→", "−", "1", "="], efektif),
        ],
      };
    },
  });

  // ---------------------------------------------------------------- TVM
  ekle({
    id: "tvm", ad: L("Paranın zaman değeri (TVM)", "Time value of money (TVM)"), grup: "finans", konu: 6,
    not: L("HP-12C usulü: beş kutudan bulmak istediğini BOŞ bırak. Cebinden çıkan para eksi (−), cebine giren artı (+). Örnek: 100 000 TL kredi çekersen PV = +100000, taksitler eksi çıkar.",
      "HP-12C style: leave EMPTY the one box you want to find. Money paid out is negative (−), money received is positive (+). Example: if you take a 100 000 loan, PV = +100000 and the instalments come out negative."),
    alanlar: [
      { id: "n", etiket: L("n — dönem sayısı", "n — number of periods"), tur: "sayi", v: "12", yarim: true },
      { id: "i", etiket: L("i — dönem faizi %", "i — rate per period %"), tur: "sayi", v: "3", yarim: true },
      { id: "pv", etiket: L("PV — bugünkü değer", "PV — present value"), tur: "sayi", v: "100000", yarim: true },
      { id: "pmt", etiket: L("PMT — dönemlik ödeme", "PMT — payment per period"), tur: "sayi", v: "", yarim: true },
      { id: "fv", etiket: L("FV — gelecek değer", "FV — future value"), tur: "sayi", v: "0" },
      { id: "tip", etiket: L("Ödeme zamanı", "Payment timing"), tur: "secim", v: "0", secenekler: [["0", L("Dönem sonu", "End of period")], ["1", L("Dönem başı", "Beginning of period")]] },
    ],
    hesapla(d) {
      const anahtarlar = ["n", "i", "pv", "pmt", "fv"];
      const boslar = anahtarlar.filter((k) => bos(d[k]));
      if (boslar.length !== 1) throw new Error(boslar.length ? L("Yalnız BİR kutuyu boş bırak — onu bulacağım.", "Leave only ONE box empty — that is the one I will find.") : L("Bulmak istediğin kutuyu boş bırak.", "Leave empty the box you want to find."));
      const aranan = boslar[0];
      const b = { tip: Number(d.tip) || 0 };
      for (const k of anahtarlar) if (k !== aranan) b[k] = k === "i" ? yuzdeOku(d.i, L("Faiz", "Rate")) : Motor.deger(d[k]);
      let sonuc = Motor.tvmCoz(b, aranan);
      if (Array.isArray(sonuc)) sonuc = sonuc.length === 1 ? sonuc[0] : sonuc;
      if (Array.isArray(sonuc)) throw new Error(L("Birden fazla faiz oranı bu nakit akışını sağlıyor; işaretleri kontrol et.", "More than one rate fits these cash flows; check the signs."));
      if (!Number.isFinite(sonuc)) {
        throw new Error(aranan === "i" ? L("Bu değerleri sağlayan faiz yok. İşaretlere bak: PV ile FV (ya da PMT) zıt işaretli olmalı.", "No rate fits these values. Check the signs: PV and FV (or PMT) must have opposite signs.")
          : aranan === "n" ? L("Bu değerlerle dönem sayısı bulunamıyor. İşaretlere bak: para hem çıkıp hem girmeli.", "No number of periods fits these values. Check the signs: money must flow both out and in.")
            : L("Hesaplanamadı; değerleri kontrol et.", "Could not compute; check the values."));
      }
      const tum = { ...b, [aranan]: sonuc };
      const AD = { n: "n", i: L("i (dönem faizi)", "i (rate per period)"), pv: "PV", pmt: "PMT", fv: "FV" };
      const goster = (k, x) => (k === "i" ? Y(B(x * 100, 8)) : k === "n" ? B(x, 8) : P(x));
      const satirlar = [satir(AD[aranan], goster(aranan, sonuc), { ana: true })];
      if (aranan === "pmt" || (!bos(d.pmt) && tum.pmt !== 0)) {
        const toplamOdeme = tum.pmt * tum.n;
        satirlar.push(satir(L("Toplam ödeme (PMT × n)", "Total paid (PMT × n)"), P(toplamOdeme)));
        if (tum.fv === 0) satirlar.push(satir(L("Toplam faiz", "Total interest"), P(Math.abs(toplamOdeme) - Math.abs(tum.pv))));
      }
      const tipYazi = tum.tip ? String.raw`(1 + i)` : "";
      let adim = L("Genel TVM denklemi (para akışlarının toplamı sıfır): ", "General TVM equation (the cash flows sum to zero): ") + String.raw`$$PV(1+i)^n + PMT${tipYazi}\frac{(1+i)^n - 1}{i} + FV = 0$$`;
      adim += L("Değerler: ", "Values: ") + String.raw`$n = ${S(tum.n)}$, $i = ${S(tum.i)}$, $PV = ${S(tum.pv)}$, $PMT = ${S(tum.pmt)}$, $FV = ${S(tum.fv)}$.`;
      const ozel = [];
      if (tum.pmt === 0) ozel.push(L(String.raw`**Tek ödeme:** $FV = PV(1+i)^n$, $PV = \dfrac{FV}{(1+i)^n}$ (işaretler zıt).`, String.raw`**Single sum:** $FV = PV(1+i)^n$, $PV = \dfrac{FV}{(1+i)^n}$ (opposite signs).`));
      if (tum.fv === 0 && aranan === "pmt") ozel.push(L("**Kredi taksiti (amortisman):** ", "**Loan instalment (amortization):** ") + String.raw`$$PMT = PV\,\frac{i}{1 - (1+i)^{-n}} = ${S(Math.abs(tum.pv))}\cdot\frac{${S(tum.i)}}{1 - (${S(1 + tum.i)})^{-${S(tum.n)}}} = ${S(Math.abs(sonuc))}$$`);
      if (tum.fv === 0 && aranan === "pv") ozel.push(L("**Anüitenin bugünkü değeri:** ", "**Present value of an annuity:** ") + String.raw`$$PV = PMT\,\frac{1 - (1+i)^{-n}}{i}${tum.tip ? "(1+i)" : ""}$$`);
      if (tum.pv === 0 && aranan === "fv") ozel.push(L("**Anüitenin gelecek değeri:** ", "**Future value of an annuity:** ") + String.raw`$$FV = PMT\,\frac{(1+i)^n - 1}{i}${tum.tip ? "(1+i)" : ""}$$`);
      if (tum.pv === 0 && aranan === "pmt") ozel.push(L("**Birikim fonu (sinking fund):** ", "**Sinking fund:** ") + String.raw`$$PMT = FV\,\frac{i}{(1+i)^n - 1}$$`);
      if (aranan === "n") ozel.push(L(String.raw`**Dönem sayısı** logaritmayla çıkar: $(1+i)^n$ yalnız bırakılır, iki tarafın $\ln$'i alınır.`, String.raw`**The number of periods** comes from logarithms: isolate $(1+i)^n$ and take $\ln$ of both sides.`));
      if (aranan === "i") ozel.push(L("**Faiz oranının** kapalı formülü yoktur; sayısal olarak (denklemi sıfır yapan oran aranarak) bulunur.", "**The rate** has no closed formula; it is found numerically (by searching for the rate that makes the equation zero)."));
      if (ozel.length) adim += "\n\n" + ozel.join("\n\n");
      adim += L(`\n\n**İşaret kuralı:** sonuç ${sonuc < 0 && aranan !== "i" && aranan !== "n" ? "eksi çıktı: bu para cebinden ÇIKAR" : aranan === "i" || aranan === "n" ? "işaretsizdir" : "artı çıktı: bu para cebine GİRER"}.`,
        `\n\n**Sign rule:** the result ${sonuc < 0 && aranan !== "i" && aranan !== "n" ? "is negative: this money goes OUT of your pocket" : aranan === "i" || aranan === "n" ? "has no sign" : "is positive: this money comes INTO your pocket"}.`);
      if (tum.i > 0 && tum.n > 0 && tum.n < 1000 && Math.abs(tum.i) < 5) {
        const yillik = Math.pow(1 + tum.i, 12) - 1;
        adim += L(`\n\nDönem ay ise: dönem faizi %${B(tum.i * 100, 5)} ⇒ yıllık efektif %${B(yillik * 100, 5)}.`, `\n\nIf a period is a month: ${B(tum.i * 100, 5)}% per period ⇒ ${B(yillik * 100, 5)}% effective per year.`);
      }
      const fx = tvmFx(tum, aranan, sonuc);
      return {
        satirlar, adimlar: adim, fx,
        fxNot: fx.length ? L("İşaretleri sınavda sen yazarsın; makinede büyüklüğü hesapla.", "Write the signs yourself in the exam; use the calculator for the magnitude.")
          : L("Bu durumun 82ES'te tek satırlık formülü yok (faiz oranı ancak deneme–yanılmayla bulunur).", "There is no one-line formula for this case on the 82ES (the rate can only be found by trial and error)."),
      };
    },
  });

  // ---------------------------------------------------------------- ÖDEME TABLOSU
  ekle({
    id: "odeme", ad: L("Kredi ödeme tablosu", "Loan amortization table"), grup: "finans", konu: 6,
    not: L("Eşit taksitli kredinin her taksitte ne kadarının faiz, ne kadarının anapara olduğunu gösterir.", "Shows how much of each equal instalment is interest and how much is principal."),
    alanlar: [
      { id: "p", etiket: L("Kredi tutarı", "Loan amount"), tur: "sayi", v: "100000" },
      { id: "i", etiket: L("Dönem (aylık) faizi %", "Rate per period (monthly) %"), tur: "sayi", v: "3", yarim: true },
      { id: "n", etiket: L("Taksit sayısı", "Number of instalments"), tur: "sayi", v: "12", yarim: true },
    ],
    hesapla(d) {
      const p = Motor.deger(d.p), i = yuzdeOku(d.i, L("Faiz", "Rate")), n = Math.round(Motor.deger(d.n));
      if (!(n >= 1 && n <= 600)) throw new Error(L("Taksit sayısı 1 ile 600 arasında olmalı.", "The number of instalments must be between 1 and 600."));
      if (!(p > 0)) throw new Error(L("Kredi tutarı pozitif olmalı.", "The loan amount must be positive."));
      const pmt = i === 0 ? p / n : p * i / (1 - Math.pow(1 + i, -n));
      let kalan = p, topFaiz = 0;
      const satirlarT = [];
      for (let k = 1; k <= n; k++) {
        const faiz = kalan * i, ana = pmt - faiz;
        kalan -= ana; topFaiz += faiz;
        satirlarT.push([k, P(pmt), P(faiz), P(ana), P(Math.abs(kalan) < 1e-6 ? 0 : kalan)]);
      }
      return {
        satirlar: [satir(L("Taksit", "Instalment"), P(pmt), { ana: true }), satir(L("Toplam ödeme", "Total paid"), P(pmt * n)), satir(L("Toplam faiz", "Total interest"), P(topFaiz)), satir(L("Faiz / kredi", "Interest / loan"), Y(B(topFaiz / p * 100, 5)))],
        tablo: { basliklar: ["#", L("Taksit", "Payment"), L("Faiz", "Interest"), L("Anapara", "Principal"), L("Kalan", "Balance")], satirlar: satirlarT },
        adimlar: String.raw`$$PMT = P\,\frac{i}{1-(1+i)^{-n}} = ${S(p)}\cdot\frac{${S(i)}}{1-(${S(1 + i)})^{-${n}}} = ${S(pmt)}$$ ` +
          L(String.raw`Her taksitte önce kalan borcun faizi ödenir ($\text{faiz}_k = \text{kalan}_{k-1}\cdot i$), taksitin geri kalanı anaparayı düşer. Bu yüzden ilk taksitlerde faiz payı büyük, son taksitlerde küçüktür.`,
            String.raw`Each instalment first pays the interest on the remaining balance ($\text{interest}_k = \text{balance}_{k-1}\cdot i$); the rest reduces the principal. That is why the interest share is large in early instalments and small in later ones.`),
        fx: [fxAdim(L("Taksit", "Instalment"), [fxSayi(p), "×", fxSayi(i), "÷", "(", "1", "−", "(", "1", "+", fxSayi(i), ")", "x■", "(−)", fxSayi(n), "→", ")", "="], pmt)],
      };
    },
  });

  // ---------------------------------------------------------------- NBD / İVO
  function akisOku(s) {
    let t = String(s || "").trim();
    if (!t) throw new Error(L("Nakit akışlarını yaz.", "Enter the cash flows."));
    let parca;
    if (/[;\n]/.test(t)) parca = t.split(/[;\n]+/);
    else if (/,\s/.test(t)) parca = t.split(/,\s+/);
    else if ((t.match(/,/g) || []).length > 1 && !/\s/.test(t)) parca = t.split(",");
    else parca = t.split(/\s+/);
    return parca.map((x) => x.trim()).filter(Boolean).map((x) => Motor.deger(x.replace(/^([-+−]?\d+),(\d+)$/, "$1.$2")));
  }
  ekle({
    id: "nbd", ad: L("Net bugünkü değer ve iç verim", "Net present value and IRR"), grup: "finans", konu: 7,
    not: L("İlk akış bugünkü yatırımdır (eksi). Akışları ; ya da alt satırla ayır. Ondalıkta virgül kullanabilirsin.", "The first flow is today's investment (negative). Separate flows with ; or new lines."),
    alanlar: [
      { id: "r", etiket: L("İskonto oranı % (dönem başına)", "Discount rate % (per period)"), tur: "sayi", v: "10" },
      { id: "akis", etiket: L("Nakit akışları (CF₀; CF₁; …)", "Cash flows (CF₀; CF₁; …)"), tur: "metin", v: "-1000; 300; 400; 500" },
    ],
    hesapla(d) {
      const r = yuzdeOku(d.r, L("Oran", "Rate")), cf = akisOku(d.akis);
      if (cf.length < 2) throw new Error(L("En az iki akış gerekir (yatırım ve en az bir getiri).", "At least two flows are needed (the investment and at least one return)."));
      const npv = Motor.nbd(r, cf);
      const irr = Motor.ivo(cf);
      const ind = cf.map((c, k) => c / Math.pow(1 + r, k));
      let kum = 0, geriDonus = null;
      for (let k = 0; k < ind.length; k++) {
        const once = kum; kum += ind[k];
        if (geriDonus == null && once < 0 && kum >= 0) geriDonus = k - 1 + (-once / ind[k]);
      }
      const gir = ind.slice(1).reduce((a, b) => a + b, 0);
      const NBD = L("NBD", "NPV");
      const satirlar = [satir(L("NBD (NPV)", "NPV"), P(npv), { ana: true })];
      satirlar.push(satir(L("İç verim oranı (IRR)", "Internal rate of return (IRR)"), irr.length ? irr.map((x) => Y(B(x * 100, 6))).join("  ") : YOK(), { metin: !irr.length }));
      if (cf[0] < 0) satirlar.push(satir(L("Kârlılık endeksi", "Profitability index"), B(gir / -cf[0], 6)));
      satirlar.push(satir(L("İskontolu geri dönüş", "Discounted payback"), geriDonus != null ? B(geriDonus, 4) + DONEM() : L("proje süresinde dönmüyor", "not within the project life"), { metin: geriDonus == null }));
      let adim = String.raw`$$${NBD} = \sum_{t=0}^{${cf.length - 1}} \frac{CF_t}{(1+r)^t} = ${cf.map((c, k) => (k === 0 ? S(c) : String.raw`\frac{${S(c)}}{${S(1 + r)}^{${k}}}`)).join(" + ").replace(/\+ -/g, "- ")} = ${S(npv)}$$`;
      adim += L(`\n\n**Karar:** NBD ${npv > 0 ? "> 0 → proje, %" + B(r * 100) + " getiri beklentisini aşıyor; YAPILMALI" : npv < 0 ? "< 0 → proje beklenen getiriyi karşılamıyor; YAPILMAMALI" : "= 0 → proje tam olarak beklenen getiriyi sağlıyor"}.`,
        `\n\n**Decision:** NPV ${npv > 0 ? "> 0 → the project beats the required " + B(r * 100) + "% return; ACCEPT" : npv < 0 ? "< 0 → the project does not earn the required return; REJECT" : "= 0 → the project earns exactly the required return"}.`);
      adim += L(String.raw`\n\n**İç verim oranı:** NBD'yi sıfır yapan oran: $\sum CF_t/(1+IRR)^t = 0$. `, String.raw`\n\n**Internal rate of return:** the rate that makes NPV zero: $\sum CF_t/(1+IRR)^t = 0$. `) +
        (irr.length ? L(`IRR = %${B(irr[0] * 100, 6)}; ${irr[0] > r ? "iskonto oranından büyük, NBD ile aynı karar" : "iskonto oranından küçük"}.`, `IRR = ${B(irr[0] * 100, 6)}%; ${irr[0] > r ? "above the discount rate, the same decision as NPV" : "below the discount rate"}.`)
          : L("Bu akışta işaret değişimi olmadığı için IRR yok.", "These flows never change sign, so there is no IRR."));
      if (irr.length > 1) adim += L("\n\nAkışların işareti birden fazla kez değiştiği için birden çok IRR var — bu durumda NBD'ye güven.", "\n\nThe flows change sign more than once, so there are several IRRs — rely on NPV in this case.");
      const rmax = Math.max(0.3, (irr.length ? Math.max(...irr) : r) * 2);
      return {
        satirlar, adimlar: adim.replace(SATIR, "\n"),
        tablo: { basliklar: ["t", "CFₜ", L("İskonto çarpanı", "Discount factor"), L("Bugünkü değer", "Present value")], satirlar: cf.map((c, k) => [k, P(c), B(1 / Math.pow(1 + r, k), 6), P(ind[k])]) },
        grafikler: [{ egriler: [{ f: (x) => Motor.nbd(x / 100, cf), renk: "turuncu", ad: `${NBD}(r)`, kisa: NBD }], x: [0, rmax * 100], noktalar: irr.filter((x) => x >= 0).map((x) => ({ x: x * 100, y: 0, etiket: `IRR ${Y(B(x * 100, 4))}` })).concat([{ x: r * 100, y: npv, etiket: NBD }]), eksen: { x: "r %" } }],
        fx: cf.length <= 8 ? [fxAdim(NBD, [fxSayi(cf[0]), cf.slice(1).map((c, k) => [c < 0 ? "−" : "+", fxSayi(Math.abs(c)), "÷", "(", "1", "+", fxSayi(r), ")", k >= 1 ? ["x■", String(k + 1), "→"] : []]), "="], npv)] : [],
        fxNot: L("82ES'te İVO tuşu yok: iki farklı oranda NBD hesaplayıp işaretin değiştiği aralığı daraltırsın.", "The 82ES has no IRR key: compute NPV at two rates and narrow down the interval where the sign changes."),
      };
    },
  });

  // ---------------------------------------------------------------- TÜREV
  ekle({
    id: "turev", ad: L("Türev ve teğet", "Derivative and tangent"), grup: "turev", konu: 9,
    not: L("Tek değişkende f′, f″ ve bir noktadaki teğet. Birden fazla değişken yazarsan (ör. 10K^0.3L^0.7) kısmi türevleri verir.", "For one variable: f′, f″ and the tangent at a point. With several variables (e.g. 10K^0.3L^0.7) you get the partial derivatives."),
    alanlar: [
      { id: "f", etiket: "f", tur: "ifade", v: "x^3 - 6x^2 + 9x + 1" },
      { id: "x0", etiket: L("Nokta (isteğe bağlı)", "Point (optional)"), tur: "metin1", v: "4", ipucu: () => L("Tek değişkende bir sayı; çok değişkende K=8, L=27 gibi", "A number for one variable; like K=8, L=27 for several") },
    ],
    hesapla(d) {
      const C = Motor.cokFonk(d.f);
      if (C.vars.length > 1) return kismi(d, C);
      const F = fonk(d.f);
      const v = F.v;
      const d1 = Motor.turevDugum(F.dugum, v), d2 = Motor.turevDugum(d1, v);
      const f1 = Motor.derleDugum(d1, v), f2 = Motor.derleDugum(d2, v);
      const satirlar = [satir(`f′(${v})`, Motor.duz(Motor.duzenle(d1, v)), { metin: true }), satir(`f″(${v})`, Motor.duz(Motor.duzenle(d2, v)), { metin: true })];
      let adim = String.raw`$$f(${v}) = ${tx(F)}$$ $$f'(${v}) = ${txd(d1, v)}$$ $$f''(${v}) = ${txd(d2, v)}$$`;
      const kur = kurallar(F.dugum, v);
      if (kur.length) adim += L("\n\n**Kullanılan kurallar:**\n\n", "\n\n**Rules used:**\n\n") + kur.map((k) => "- " + k).join("\n");
      const TEGET = L("teğet", "tangent");
      const grafik = { egriler: [{ f: F.f, renk: "turuncu", ad: "f", kisa: "f" }, { f: f1, renk: "gri", kesikli: true, ad: "f′", kisa: "f′" }], noktalar: [], eksen: { x: v } };
      let merkez = [0];
      if (!bos(d.x0)) {
        const x0 = Motor.deger(String(d.x0).replace(/^\s*\w+\s*=\s*/, ""));
        const y0 = F.f(x0), m = f1(x0), k2 = f2(x0);
        if (!Number.isFinite(y0)) throw new Error(L(`f, ${v} = ${B(x0)} noktasında tanımsız.`, `f is undefined at ${v} = ${B(x0)}.`));
        satirlar.push(satir(`f(${B(x0)})`, B(y0)), satir(L(`f′(${B(x0)}) — eğim`, `f′(${B(x0)}) — slope`), B(m), { ana: true }), satir(`f″(${B(x0)})`, B(k2)));
        const b = y0 - m * x0;
        satirlar.push(satir(L("Teğet doğrusu", "Tangent line"), `y = ${B(m)}${v} ${b < 0 ? "−" : "+"} ${B(Math.abs(b))}`, { metin: true }));
        adim += L(String.raw`\n\n**$${v} = ${S(x0)}$ noktasında:** $f(${S(x0)}) = ${S(y0)}$, eğim $f'(${S(x0)}) = ${S(m)}$. Teğet: `, String.raw`\n\n**At $${v} = ${S(x0)}$:** $f(${S(x0)}) = ${S(y0)}$, slope $f'(${S(x0)}) = ${S(m)}$. Tangent: `) +
          String.raw`$$y - f(x_0) = f'(x_0)(${v} - x_0) \;\Rightarrow\; y = ${S(m)}${v} ${b < 0 ? "-" : "+"} ${S(Math.abs(b))}$$`;
        adim += L(`\n\n**Marjinal okuma:** ${v} bir birim artarsa f yaklaşık ${B(m, 6)} değişir (gerçek değişim f(${B(x0 + 1, 6)}) − f(${B(x0, 6)}) = ${B(F.f(x0 + 1) - y0, 6)}). f″ ${k2 > 0 ? "> 0: eğim artıyor, fonksiyon dışbükey (konveks)" : k2 < 0 ? "< 0: eğim azalıyor, fonksiyon içbükey (konkav)" : "= 0"}.`,
          `\n\n**Marginal reading:** if ${v} rises by one unit, f changes by about ${B(m, 6)} (the actual change f(${B(x0 + 1, 6)}) − f(${B(x0, 6)}) = ${B(F.f(x0 + 1) - y0, 6)}). f″ ${k2 > 0 ? "> 0: the slope is increasing, the function is convex" : k2 < 0 ? "< 0: the slope is decreasing, the function is concave" : "= 0"}.`);
        grafik.egriler.push({ f: (x) => m * x + b, renk: "soluk", ad: TEGET, kisa: TEGET });
        grafik.noktalar.push({ x: x0, y: y0, etiket: `(${B(x0, 4)}, ${B(y0, 4)})` });
        merkez = [x0];
      }
      const krit = Motor.kokler(f1, -50, 50);
      grafik.x = Motor.otomatikAralik([...merkez, ...krit.slice(0, 6)]);
      return { satirlar, adimlar: adim.replace(SATIR, "\n"), grafikler: [grafik] };
    },
  });

  function kismi(d, C) {
    const vars = C.vars;
    const nokta = {};
    if (!bos(d.x0)) {
      for (const p of String(d.x0).split(/[,;]\s*/)) {
        const m = p.match(/^\s*([A-Za-z])\s*=\s*(.+)$/);
        if (!m) throw new Error(L(`Noktayı “${vars[0]}=1, ${vars[1]}=2” biçiminde yaz.`, `Write the point as “${vars[0]}=1, ${vars[1]}=2”.`));
        nokta[m[1]] = Motor.deger(m[2]);
      }
      const eksik = vars.filter((v) => !(v in nokta));
      if (eksik.length) throw new Error(L(`Noktada ${eksik.join(", ")} değeri eksik.`, `The point is missing a value for ${eksik.join(", ")}.`));
    }
    const varMi = Object.keys(nokta).length > 0;
    const satirlar = [];
    let adim = String.raw`$$f(${vars.join(", ")}) = ${Motor.tex(C.dugum)}$$ ` + L(String.raw`Kısmi türevde öteki değişkenler SABİT sayılır.\n\n`, String.raw`In a partial derivative the other variables are held CONSTANT.\n\n`);
    const ilk = {};
    const NOKTA = L(String.raw`\text{nokta}`, String.raw`\text{point}`);
    for (const v of vars) {
      const dv = Motor.turevDugum(C.dugum, v);
      ilk[v] = dv;
      const deger = varMi ? Motor.sayiyaCevir(dv.evaluate({ ...nokta })) : null;
      satirlar.push(satir(`∂f/∂${v}`, Motor.duz(dv) + (varMi ? `  =  ${B(deger, 8)}` : ""), { metin: true }));
      adim += String.raw`$$\frac{\partial f}{\partial ${v}} = ${Motor.tex(dv)}${varMi ? String.raw` \;\Big|_{${NOKTA}} = ${S(deger)}` : ""}$$`;
    }
    adim += L("\n\n**İkinci kısmi türevler:**\n\n", "\n\n**Second partial derivatives:**\n\n");
    for (const a of vars) for (const b of vars) {
      if (vars.indexOf(b) < vars.indexOf(a)) continue;
      const dd = Motor.turevDugum(ilk[a], b);
      adim += String.raw`$\dfrac{\partial^2 f}{\partial ${a}\,\partial ${b}} = ${Motor.tex(dd)}$${varMi ? String.raw` $= ${S(Motor.sayiyaCevir(dd.evaluate({ ...nokta })))}$` : ""}\n\n`;
    }
    if (vars.length === 2 && varMi) {
      const [a, b] = vars;
      const fa = Motor.sayiyaCevir(ilk[a].evaluate({ ...nokta })), fb = Motor.sayiyaCevir(ilk[b].evaluate({ ...nokta }));
      if (fb !== 0) adim += L(String.raw`\n**Eş-ürün/eş-fayda eğrisinin eğimi** (marjinal ikame oranı): `, String.raw`\n**Slope of the isoquant/indifference curve** (marginal rate of substitution): `) +
        String.raw`$\dfrac{d${b}}{d${a}} = -\dfrac{f_{${a}}}{f_{${b}}} = ${S(-fa / fb)}$`;
    }
    adim += L("\n\n**İktisatta:** Cobb–Douglas üretimde ∂Q/∂L emeğin marjinal ürünü (MPL), ∂Q/∂K sermayenin marjinal ürünüdür (MPK).", "\n\n**In economics:** in Cobb–Douglas production, ∂Q/∂L is the marginal product of labour (MPL) and ∂Q/∂K the marginal product of capital (MPK).");
    return { satirlar, adimlar: adim.replace(SATIR, "\n") };
  }

  // ---------------------------------------------------------------- MAKS / MİN
  ekle({
    id: "ekstremum", ad: L("Maksimum ve minimum", "Maximum and minimum"), grup: "turev", konu: 11,
    not: L("Kritik noktaları (f′ = 0) bulur ve ikinci türevle sınıflar. Aralık verirsen kapalı aralıktaki EN BÜYÜK ve EN KÜÇÜK değeri de verir.", "Finds the critical points (f′ = 0) and classifies them with the second derivative. Give a range to also get the LARGEST and SMALLEST value on the closed interval."),
    alanlar: [
      { id: "f", etiket: "f(x)", tur: "ifade", v: "x^3 - 6x^2 + 9x + 1" },
      { id: "a", etiket: L("Aralık başı (isteğe bağlı)", "Range from (optional)"), tur: "sayi", v: "0", yarim: true },
      { id: "b", etiket: L("Aralık sonu (isteğe bağlı)", "Range to (optional)"), tur: "sayi", v: "5", yarim: true },
    ],
    hesapla(d) {
      const kapali = !bos(d.a) && !bos(d.b);
      const a = kapali ? Motor.deger(d.a) : -1000, b = kapali ? Motor.deger(d.b) : 1000;
      if (!(b > a)) throw new Error(L("Aralık sonu başından büyük olmalı.", "The end of the range must be greater than its start."));
      const E = Motor.ekstremum(d.f, a, b);
      const v = E.v;
      const TUR = { max: L("yerel maksimum", "local maximum"), min: L("yerel minimum", "local minimum"), bukum: L("ne maks ne min (büküm)", "neither max nor min (inflection)") };
      const YON = { artan: L("artan", "increasing"), azalan: L("azalan", "decreasing"), sabit: L("sabit", "constant"), "?": "?" };
      const satirlar = E.kritik.length
        ? E.kritik.map((k) => satir(TUR[k.tur], `${v} = ${B(k.x, 8)},  f = ${B(k.y, 8)}`, { metin: true }))
        : [satir(L("Kritik nokta", "Critical point"), kapali ? L("aralıkta yok", "none in the range") : L("bulunamadı", "none found"), { metin: true })];
      const hepsi = (liste) => liste.map((p) => `f(${B(p.x, 6)})`).join(" = ") + ` = ${B(liste[0].y, 8)}`;
      if (kapali && E.gmax) satirlar.push(satir(L("Aralıkta en büyük", "Largest on the interval"), hepsi(E.gmaxlar), { ana: true, metin: true }), satir(L("Aralıkta en küçük", "Smallest on the interval"), hepsi(E.gminler), { ana: true, metin: true }));
      E.bukum.forEach((p) => satirlar.push(satir(L("Büküm noktası", "Inflection point"), `(${B(p.x, 6)}, ${B(p.y, 6)})`, { metin: true })));
      let adim = L(String.raw`**1. Birinci türevi sıfıra eşitle** (eğimin sıfır olduğu yerler): `, String.raw`**1. Set the first derivative to zero** (where the slope is zero): `) + String.raw`$$f'(${v}) = ${txd(E.d1, v)} = 0$$`;
      adim += E.kritik.length ? L("Kritik noktalar: ", "Critical points: ") + E.kritik.map((k) => `$${v} = ${S(k.x)}$`).join(", ") + "." : L("Bu aralıkta f′ sıfır olmuyor.", "f′ is never zero in this range.");
      if (E.kritik.length) {
        adim += L(String.raw`\n\n**2. İkinci türev testi:** `, String.raw`\n\n**2. Second derivative test:** `) + String.raw`$$f''(${v}) = ${txd(E.d2, v)}$$`;
        for (const k of E.kritik) {
          const yorum = k.ikinci > 0 ? L(String.raw`$> 0$ → çukur (∪), **yerel minimum**`, String.raw`$> 0$ → valley (∪), **local minimum**`)
            : k.ikinci < 0 ? L(String.raw`$< 0$ → tepe (∩), **yerel maksimum**`, String.raw`$< 0$ → peak (∩), **local maximum**`)
              : L(`= 0 → test sonuç vermez; f′'nün işaretine bakıldı: **${TUR[k.tur]}**`, `= 0 → the test is inconclusive; checked the sign of f′: **${TUR[k.tur]}**`);
          adim += String.raw`\n- $f''(${S(k.x)}) = ${S(k.ikinci)}$ ` + yorum + String.raw`, $f(${S(k.x)}) = ${S(k.y)}$`;
        }
      }
      if (E.monoton.length > 1 || E.kritik.length) {
        adim += L("\n\n**Artan / azalan aralıklar** (f′'nün işareti):\n\n| aralık | f′ | f |\n|---|---|---|\n", "\n\n**Increasing / decreasing intervals** (sign of f′):\n\n| interval | f′ | f |\n|---|---|---|\n") +
          E.monoton.map((m) => `| (${kapali || Math.abs(m.a) < 999 ? B(m.a, 5) : "−∞"}, ${kapali || Math.abs(m.b) < 999 ? B(m.b, 5) : "∞"}) | ${m.yon === "artan" ? "+" : m.yon === "azalan" ? "−" : "0"} | ${YON[m.yon]} |`).join("\n");
      }
      if (kapali) {
        const tablo = [...E.kritik.map((k) => ({ x: k.x, y: k.y, ne: L("kritik", "critical") })), { x: a, y: E.F.f(a), ne: L("uç", "endpoint") }, { x: b, y: E.F.f(b), ne: L("uç", "endpoint") }].sort((p, q) => p.x - q.x);
        adim += L(`\n\n**3. Kapalı aralık [${B(a)}, ${B(b)}]:** kritik noktalar ve iki UÇ birlikte karşılaştırılır:\n\n| x | f(x) | |\n|---|---|---|\n`, `\n\n**3. Closed interval [${B(a)}, ${B(b)}]:** compare the critical points together with both ENDPOINTS:\n\n| x | f(x) | |\n|---|---|---|\n`) +
          tablo.map((p) => `| ${B(p.x, 6)} | ${B(p.y, 8)} | ${p.ne} |`).join("\n") +
          L(`\n\nEn büyük ${hepsi(E.gmaxlar)}, en küçük ${hepsi(E.gminler)}. Uç noktayı unutmak en sık yapılan hatadır.`, `\n\nLargest ${hepsi(E.gmaxlar)}, smallest ${hepsi(E.gminler)}. Forgetting the endpoints is the most common mistake.`);
      }
      const xs = [...E.kritik.map((k) => k.x), ...E.bukum.map((p) => p.x)];
      const ar = kapali ? [a - (b - a) * 0.08, b + (b - a) * 0.08] : Motor.otomatikAralik(xs);
      const ETIKET = { max: L("maks", "max"), min: "min", bukum: L("büküm", "infl.") };
      return {
        satirlar, adimlar: adim.replace(SATIR, "\n"),
        grafikler: [{ egriler: [{ f: E.F.f, renk: "turuncu", ad: "f", kisa: "f" }, { f: E.f1, renk: "gri", kesikli: true, ad: "f′", kisa: "f′" }], x: ar, noktalar: [...E.kritik.map((k) => ({ x: k.x, y: k.y, etiket: ETIKET[k.tur] })), ...E.bukum.map((p) => ({ x: p.x, y: p.y, renk: "soluk" }))], dikeyler: kapali ? [{ x: a }, { x: b }] : [], eksen: { x: v } }],
      };
    },
  });

  // ---------------------------------------------------------------- KÂR MAKS
  ekle({
    id: "kar", ad: L("Kâr maksimizasyonu", "Profit maximization"), grup: "turev", konu: 11,
    not: L("Ters talep P(Q) ya da toplam gelir TR(Q) ile toplam maliyet TC(Q) ver; MR = MC koşuluyla kârı en büyük yapan miktarı bulur.", "Give the inverse demand P(Q) or total revenue TR(Q) and total cost TC(Q); finds the profit-maximizing quantity from MR = MC."),
    alanlar: [
      { id: "girdi", etiket: L("Gelir tarafı", "Revenue side"), tur: "secim", v: "talep", secenekler: [["talep", L("Ters talep P(Q)", "Inverse demand P(Q)")], ["gelir", L("Toplam gelir TR(Q)", "Total revenue TR(Q)")]] },
      { id: "p", etiket: "P(Q)", tur: "ifade", v: "100 - 2Q", kosul: (d) => d.girdi === "talep" },
      { id: "tr", etiket: "TR(Q)", tur: "ifade", v: "100Q - 2Q^2", kosul: (d) => d.girdi === "gelir" },
      { id: "tc", etiket: L("Toplam maliyet TC(Q)", "Total cost TC(Q)"), tur: "ifade", v: "50 + 10Q + 0.5Q^2" },
    ],
    hesapla(d) {
      let TR, Pf = null;
      if (d.girdi === "talep") { Pf = fonk(d.p, "Q"); TR = Motor.fonkDugum(M.parse(`(${Pf.dugum.toString({ implicit: "show" })}) * ${Pf.v}`), Pf.v); }
      else TR = fonk(d.tr, "Q");
      const TC = fonk(d.tc, TR.v);
      const PI = Motor.birlestir(TR, TC, (a, b) => `(${a}) - (${b})`, TR.v);
      const v = PI.v;
      const ust = Pf ? (Motor.kokler(Pf.f, 0, 1e6)[0] || 1e4) : 1e4;
      const E = Motor.ekstremum(PI, 0, ust);
      const maks = E.kritik.filter((k) => k.tur === "max").sort((a, b) => b.y - a.y)[0];
      if (!maks) throw new Error(L("Pozitif üretimde kârı en büyük yapan nokta bulunamadı (kâr fonksiyonunun tepe noktası yok).", "No profit-maximizing point at positive output (the profit function has no peak)."));
      const Q = maks.x;
      const MR = Motor.turevDugum(TR.dugum, v), MC = Motor.turevDugum(TC.dugum, v);
      const mr = Motor.derleDugum(MR, v), mc = Motor.derleDugum(MC, v);
      const satirlar = [satir(L(`Kârı en büyük yapan ${v}*`, `Profit-maximizing ${v}*`), B(Q), { ana: true })];
      if (Pf) satirlar.push(satir(L("Fiyat P*", "Price P*"), B(Pf.f(Q)), { ana: true }));
      satirlar.push(satir(L("En büyük kâr π*", "Maximum profit π*"), B(maks.y), { ana: true }), satir(L("Toplam gelir TR*", "Total revenue TR*"), B(TR.f(Q))), satir(L("Toplam maliyet TC*", "Total cost TC*"), B(TC.f(Q))), satir("MR = MC", B(mr(Q))));
      let adim = (Pf ? L(String.raw`Toplam gelir $TR = P\cdot ${v} = \left(${tx(Pf)}\right)${v}$.\n\n`, String.raw`Total revenue $TR = P\cdot ${v} = \left(${tx(Pf)}\right)${v}$.\n\n`) : "") +
        L("**1. Marjinal gelir ve maliyet:** ", "**1. Marginal revenue and cost:** ") + String.raw`$$MR = TR'(${v}) = ${txd(MR, v)}$$ $$MC = TC'(${v}) = ${txd(MC, v)}$$` +
        L(String.raw`**2. Birinci sıra koşul** — kâr $\pi = TR - TC$, $\pi' = 0 \iff MR = MC$: `, String.raw`**2. First-order condition** — profit $\pi = TR - TC$, $\pi' = 0 \iff MR = MC$: `) +
        String.raw`$$${txd(MR, v)} = ${txd(MC, v)} \;\Rightarrow\; ${v}^* = ${S(Q)}$$` +
        L(String.raw`**3. İkinci sıra koşul:** $\pi''(${v}^*) = ${S(maks.ikinci)} < 0$ → bu nokta gerçekten bir **maksimum**.\n\n`, String.raw`**3. Second-order condition:** $\pi''(${v}^*) = ${S(maks.ikinci)} < 0$ → this point really is a **maximum**.\n\n`) +
        L("**4. Sonuç:** ", "**4. Result:** ") + String.raw`${Pf ? String.raw`$P^* = ${S(Pf.f(Q))}$, ` : ""}$\pi^* = TR - TC = ${S(TR.f(Q))} - ${S(TC.f(Q))} = ${S(maks.y)}$.`;
      if (Pf) {
        const lerner = B((Pf.f(Q) - mc(Q)) / Pf.f(Q), 4);
        adim += L(`\n\nMonopol fiyatı marjinal maliyetin üstündedir: P* = ${B(Pf.f(Q), 6)} > MC = ${B(mc(Q), 6)}. Aradaki fark piyasa gücünün göstergesi (Lerner endeksi (P−MC)/P = ${lerner}).`,
          `\n\nThe monopoly price is above marginal cost: P* = ${B(Pf.f(Q), 6)} > MC = ${B(mc(Q), 6)}. The gap measures market power (Lerner index (P−MC)/P = ${lerner}).`);
      }
      const xb = Math.min(ust, Q * 2.2);
      return {
        satirlar, adimlar: adim.replace(SATIR, "\n"),
        grafikler: [
          { egriler: [{ f: mr, renk: "turuncu", ad: "MR", kisa: "MR" }, { f: mc, renk: "gri", ad: "MC", kisa: "MC" }, ...(Pf ? [{ f: Pf.f, renk: "soluk", kesikli: true, ad: L("Talep P(Q)", "Demand P(Q)"), kisa: "P" }] : [])], x: [0, xb], sadePozitif: true, noktalar: [{ x: Q, y: mr(Q), etiket: "MR = MC" }, ...(Pf ? [{ x: Q, y: Pf.f(Q), etiket: "P*" }] : [])], dikeyler: [{ x: Q }], eksen: { x: v } },
          { egriler: [{ f: PI.f, renk: "turuncu", ad: L("Kâr π(Q)", "Profit π(Q)"), kisa: "π" }], x: [0, xb], noktalar: [{ x: Q, y: maks.y, etiket: "π*" }], eksen: { x: v } },
        ],
      };
    },
  });

  // ---------------------------------------------------------------- ESNEKLİK
  ekle({
    id: "esneklik", ad: L("Talep esnekliği", "Price elasticity of demand"), grup: "turev", konu: 10,
    not: L("Nokta esnekliği (türevle) ya da iki nokta arası yay esnekliği (orta nokta formülü). Aynı formül gelir esnekliği için de geçer.", "Point elasticity (with the derivative) or arc elasticity between two points (midpoint formula). The same formula works for income elasticity."),
    alanlar: [
      { id: "mod", etiket: L("Elimde ne var?", "What do you have?"), tur: "secim", v: "qp", secenekler: [["qp", "Q = f(P)"], ["pq", "P = f(Q)"], ["yay", L("İki nokta", "Two points")]] },
      { id: "f", etiket: L("Talep fonksiyonu", "Demand function"), tur: "ifade", v: "120 - 3P", kosul: (d) => d.mod !== "yay", ipucu: (d) => (d.mod === "pq" ? L("P'yi Q cinsinden yaz", "Write P in terms of Q") : L("Q'yu P cinsinden yaz", "Write Q in terms of P")) },
      { id: "x0", etiket: L("Hangi noktada?", "At which point?"), tur: "sayi", v: "30", kosul: (d) => d.mod !== "yay", ipucu: (d) => (d.mod === "pq" ? L("Q değeri", "The value of Q") : L("P değeri", "The value of P")) },
      { id: "p1", etiket: "P₁", tur: "sayi", v: "10", yarim: true, kosul: (d) => d.mod === "yay" },
      { id: "q1", etiket: "Q₁", tur: "sayi", v: "100", yarim: true, kosul: (d) => d.mod === "yay" },
      { id: "p2", etiket: "P₂", tur: "sayi", v: "12", yarim: true, kosul: (d) => d.mod === "yay" },
      { id: "q2", etiket: "Q₂", tur: "sayi", v: "90", yarim: true, kosul: (d) => d.mod === "yay" },
    ],
    hesapla(d) {
      const yorum = (e) => {
        const a = Math.abs(e);
        if (a < 1e-9) return L("Tam inelastik: miktar fiyata hiç tepki vermiyor.", "Perfectly inelastic: quantity does not respond to price at all.");
        if (Math.abs(a - 1) < 1e-6) return L("Birim esnek (|ε| = 1): fiyat değişince toplam harcama DEĞİŞMEZ. Toplam gelir burada en büyüktür.", "Unit elastic (|ε| = 1): total spending does NOT change with price. Total revenue is at its maximum here.");
        if (a > 1) return L(`Esnek (|ε| > 1): fiyat %1 artınca miktar %${B(a, 4)} düşer. Fiyat ARTIŞI toplam harcamayı AZALTIR; firma fiyatı düşürerek gelirini artırabilir.`, `Elastic (|ε| > 1): a 1% price rise cuts quantity by ${B(a, 4)}%. A price RISE LOWERS total spending; the firm can raise revenue by cutting the price.`);
        return L(`İnelastik (|ε| < 1): fiyat %1 artınca miktar yalnız %${B(a, 4)} düşer. Fiyat ARTIŞI toplam harcamayı ARTIRIR (ör. ilaç, akaryakıt).`, `Inelastic (|ε| < 1): a 1% price rise cuts quantity by only ${B(a, 4)}%. A price RISE RAISES total spending (e.g. medicine, fuel).`);
      };
      const YORUM = L("Yorum", "Interpretation");
      if (d.mod === "yay") {
        const p1 = Motor.deger(d.p1), q1 = Motor.deger(d.q1), p2 = Motor.deger(d.p2), q2 = Motor.deger(d.q2);
        if (p1 === p2) throw new Error(L("İki fiyat farklı olmalı.", "The two prices must differ."));
        const e = ((q2 - q1) / ((q1 + q2) / 2)) / ((p2 - p1) / ((p1 + p2) / 2));
        return {
          satirlar: [satir(L("Yay esnekliği ε", "Arc elasticity ε"), B(e, 6), { ana: true }), satir(YORUM, yorum(e), { metin: true })],
          adimlar: L("Orta nokta formülü (iki yönde aynı sonucu verir): ", "Midpoint formula (gives the same result in both directions): ") +
            String.raw`$$\varepsilon = \frac{\dfrac{Q_2 - Q_1}{(Q_1 + Q_2)/2}}{\dfrac{P_2 - P_1}{(P_1 + P_2)/2}} = \frac{${S(q2 - q1)}/${S((q1 + q2) / 2)}}{${S(p2 - p1)}/${S((p1 + p2) / 2)}} = ${S(e)}$$`,
          fx: [fxAdim(L("Yay esnekliği (orta noktadaki ÷2'ler sadeleşir)", "Arc elasticity (the midpoint ÷2s cancel)"), ["(", fxSayi(q2), "−", fxSayi(q1), ")", "÷", "(", fxSayi(q1), "+", fxSayi(q2), ")", "÷", "(", "(", fxSayi(p2), "−", fxSayi(p1), ")", "÷", "(", fxSayi(p1), "+", fxSayi(p2), ")", ")", "="], e)],
        };
      }
      const F = fonk(d.f, d.mod === "pq" ? "Q" : "P");
      const v = F.v;
      const d1 = Motor.turevDugum(F.dugum, v), f1 = Motor.derleDugum(d1, v);
      const x0 = Motor.deger(d.x0), y0 = F.f(x0), m = f1(x0);
      if (!Number.isFinite(y0) || y0 === 0) throw new Error(L("Bu noktada fonksiyon sıfır ya da tanımsız; esneklik hesaplanamaz.", "The function is zero or undefined at this point; elasticity cannot be computed."));
      let e, adim, P0, Q0;
      const IKEN = (a, b) => L(String.raw`$${a}$ iken $${b}$: `, String.raw`At $${a}$, $${b}$: `);
      if (d.mod === "qp") {
        P0 = x0; Q0 = y0; e = m * P0 / Q0;
        adim = String.raw`$$\varepsilon = \frac{dQ}{dP}\cdot\frac{P}{Q}$$ $$\frac{dQ}{d${v}} = ${txd(d1, v)}$$ ` + IKEN(`P = ${S(P0)}`, `Q = ${S(Q0)}`) +
          String.raw`$$\varepsilon = ${S(m)}\cdot\frac{${S(P0)}}{${S(Q0)}} = ${S(e)}$$`;
      } else {
        Q0 = x0; P0 = y0;
        if (m === 0) throw new Error(L("dP/dQ = 0: talep yatay, esneklik sonsuz.", "dP/dQ = 0: demand is horizontal, elasticity is infinite."));
        e = (1 / m) * P0 / Q0;
        adim = L(String.raw`Ters talepte $\dfrac{dQ}{dP} = \dfrac{1}{dP/dQ}$: `, String.raw`With inverse demand $\dfrac{dQ}{dP} = \dfrac{1}{dP/dQ}$: `) +
          String.raw`$$\varepsilon = \frac{1}{dP/dQ}\cdot\frac{P}{Q}$$ $$\frac{dP}{d${v}} = ${txd(d1, v)}$$ ` + IKEN(`Q = ${S(Q0)}`, `P = ${S(P0)}`) +
          String.raw`$$\varepsilon = \frac{1}{${S(m)}}\cdot\frac{${S(P0)}}{${S(Q0)}} = ${S(e)}$$`;
      }
      const satirlar = [satir(L("Esneklik ε", "Elasticity ε"), B(e, 6), { ana: true }), satir("P, Q", `${B(P0, 6)},  ${B(Q0, 6)}`, { metin: true }), satir(YORUM, yorum(e), { metin: true })];
      // Birim esnek nokta (|ε| = 1)
      if (d.mod === "qp") {
        const epsF = (p) => f1(p) * p / F.f(p);
        const ustP = Motor.kokler(F.f, 0, 1e6)[0] || 1e4;
        const birim = Motor.kokler((p) => epsF(p) + 1, 1e-9, ustP * 0.999999);
        if (birim.length) {
          satirlar.push(satir(L("Birim esnek fiyat (|ε| = 1)", "Unit-elastic price (|ε| = 1)"), B(birim[0], 6)));
          adim += L(`\n\nTalep P = ${B(birim[0], 6)} fiyatında birim esnek; bu fiyatta toplam harcama (P·Q) en büyüktür. Daha yüksek fiyatlarda talep esnek, daha düşüklerde inelastiktir.`,
            `\n\nDemand is unit elastic at P = ${B(birim[0], 6)}; total spending (P·Q) is largest at this price. Demand is elastic above it and inelastic below it.`);
        }
      }
      adim += `\n\n**${YORUM}:** ${yorum(e)}`;
      const fx = [fxAdim(d.mod === "qp" ? "ε = (dQ/dP) × P ÷ Q" : "ε = (1 ÷ dP/dQ) × P ÷ Q",
        d.mod === "qp" ? [fxSayi(m), "×", fxSayi(P0), "÷", fxSayi(Q0), "="] : ["1", "÷", fxSayi(m), "×", fxSayi(P0), "÷", fxSayi(Q0), "="], e)];
      return { satirlar, adimlar: adim.replace(SATIR, "\n"), fx, fxNot: L("Türevi kâğıtta alırsın; makineye yalnız sayılar kalır.", "You take the derivative on paper; only the numbers go into the calculator.") };
    },
  });

  // ---------------------------------------------------------------- MARJİNAL / ORTALAMA
  ekle({
    id: "marjinal", ad: L("Marjinal ve ortalama maliyet", "Marginal and average cost"), grup: "turev", konu: 10,
    not: L("Toplam maliyetten MC, AC, AVC; bir noktadaki marjinal maliyet ve ortalama maliyetin en düşük olduğu üretim (MC = AC).", "MC, AC and AVC from total cost; marginal cost at a point and the output where average cost is lowest (MC = AC)."),
    alanlar: [
      { id: "c", etiket: L("Toplam maliyet C(Q)", "Total cost C(Q)"), tur: "ifade", v: "0.1Q^3 - 2Q^2 + 15Q + 100" },
      { id: "q0", etiket: L("Hangi üretimde? (Q₀)", "At which output? (Q₀)"), tur: "sayi", v: "10" },
    ],
    hesapla(d) {
      const C = fonk(d.c, "Q");
      const v = C.v;
      const d1 = Motor.turevDugum(C.dugum, v), mc = Motor.derleDugum(d1, v);
      const FC = C.f(0);
      const ac = (q) => C.f(q) / q, avc = (q) => (C.f(q) - FC) / q;
      const q0 = Motor.deger(d.q0);
      if (!(q0 > 0)) throw new Error(L("Q₀ pozitif olmalı.", "Q₀ must be positive."));
      const satirlar = [satir(`MC(${v})`, Motor.duz(Motor.duzenle(d1, v)), { metin: true }), satir(`MC(${B(q0)})`, B(mc(q0)), { ana: true }),
        satir(L(`Gerçek ek maliyet C(${B(q0 + 1)}) − C(${B(q0)})`, `Actual extra cost C(${B(q0 + 1)}) − C(${B(q0)})`), B(C.f(q0 + 1) - C.f(q0))), satir(`AC(${B(q0)})`, B(ac(q0))), satir(`AVC(${B(q0)})`, B(avc(q0))),
        satir(L("Sabit maliyet FC = C(0)", "Fixed cost FC = C(0)"), Number.isFinite(FC) ? B(FC) : L("tanımsız", "undefined"))];
      let adim = String.raw`$$MC(${v}) = C'(${v}) = ${txd(d1, v)}$$ $$AC(${v}) = \frac{C(${v})}{${v}}$$ $$AVC(${v}) = \frac{C(${v}) - FC}{${v}},\quad FC = C(0) = ${S(FC)}$$`;
      adim += L(`\n\n${v} = ${B(q0)} iken marjinal maliyet ${B(mc(q0), 6)}: bir birim daha üretmenin YAKLAŞIK ek maliyeti. Gerçek fark C(${B(q0 + 1)}) − C(${B(q0)}) = ${B(C.f(q0 + 1) - C.f(q0), 6)}; türev bunun doğrusal yaklaşımıdır.`,
        `\n\nAt ${v} = ${B(q0)} marginal cost is ${B(mc(q0), 6)}: the APPROXIMATE extra cost of one more unit. The actual difference C(${B(q0 + 1)}) − C(${B(q0)}) = ${B(C.f(q0 + 1) - C.f(q0), 6)}; the derivative is its linear approximation.`);
      // AC ve AVC'nin minimumu
      const ust = Math.max(q0 * 10, 100);
      const acMin = Motor.ekstremum(Motor.fonkDugum(M.parse(`(${C.dugum.toString({ implicit: "show" })}) / ${v}`), v), 1e-6, ust).kritik.filter((k) => k.tur === "min")[0];
      const avcMin = Number.isFinite(FC) ? Motor.ekstremum(Motor.fonkDugum(M.parse(`((${C.dugum.toString({ implicit: "show" })}) - (${FC})) / ${v}`), v), 1e-6, ust).kritik.filter((k) => k.tur === "min")[0] : null;
      if (acMin) {
        satirlar.push(satir(L("AC'nin en düşük olduğu Q", "Q where AC is lowest"), B(acMin.x, 8)), satir(L("En düşük AC", "Lowest AC"), B(acMin.y, 8)));
        adim += L(String.raw`\n\n**AC'nin en düşük noktası:** `, String.raw`\n\n**Lowest point of AC:** `) + String.raw`$\frac{d}{d${v}}\frac{C}{${v}} = \frac{${v}\,C' - C}{${v}^2} = 0 \iff MC = AC$. ` +
          L(String.raw`Bu da $${v} = ${S(acMin.x)}$, $AC = ${S(acMin.y)}$ verir. MC eğrisi AC'yi tam en düşük noktasından keser.`, String.raw`This gives $${v} = ${S(acMin.x)}$, $AC = ${S(acMin.y)}$. The MC curve cuts AC exactly at its lowest point.`);
      }
      if (avcMin) adim += L(`\n\nAVC en düşük ${v} = ${B(avcMin.x, 6)} noktasında (AVC = ${B(avcMin.y, 6)}). Fiyat bunun altına düşerse firma kısa dönemde üretimi durdurur (kapanma noktası).`,
        `\n\nAVC is lowest at ${v} = ${B(avcMin.x, 6)} (AVC = ${B(avcMin.y, 6)}). If the price falls below this, the firm stops producing in the short run (shutdown point).`);
      const xb = Math.max(q0, acMin ? acMin.x : 0) * 2;
      return {
        satirlar, adimlar: adim.replace(SATIR, "\n"),
        grafikler: [{ egriler: [{ f: mc, renk: "turuncu", ad: "MC", kisa: "MC" }, { f: (q) => (q > 0 ? ac(q) : NaN), renk: "gri", ad: "AC", kisa: "AC" }, { f: (q) => (q > 0 ? avc(q) : NaN), renk: "soluk", kesikli: true, ad: "AVC", kisa: "AVC" }], x: [0, xb], y: null, sadePozitif: true, noktalar: [...(acMin ? [{ x: acMin.x, y: acMin.y, etiket: "min AC" }] : []), ...(avcMin ? [{ x: avcMin.x, y: avcMin.y, etiket: "min AVC", renk: "soluk" }] : [])], eksen: { x: v } }],
      };
    },
  });

  // ---------------------------------------------------------------- İNTEGRAL
  ekle({
    id: "integral", ad: L("İntegral", "Integral"), grup: "integral", konu: 12,
    not: L("Belirsiz integral (ilkel fonksiyon) ve sınırlar verilirse belirli integral. Üst sınıra ∞ yazabilirsin. Sınırları boş bırakırsan yalnız F(x) + C bulunur.", "The indefinite integral (antiderivative) and, if limits are given, the definite integral. You can enter ∞ as the upper limit. Leave the limits empty to get only F(x) + C."),
    alanlar: [
      { id: "f", etiket: "f(x)", tur: "ifade", v: "3x^2 - 4x + 5" },
      { id: "a", etiket: L("Alt sınır", "Lower limit"), tur: "sayi", v: "0", yarim: true },
      { id: "b", etiket: L("Üst sınır", "Upper limit"), tur: "sayi", v: "2", yarim: true },
    ],
    hesapla(d) {
      const F = fonk(d.f);
      const v = F.v;
      const ilkel = Motor.belirsizIntegral(F);
      const satirlar = [satir("F(" + v + ") + C", ilkel ? Motor.duz(ilkel.dugum) + " + C" : L("kapalı biçimde bulunamadı", "no closed form found"), { metin: true })];
      let adim = String.raw`$$\int ${tx(F)}\, d${v} = ${ilkel ? Motor.tex(ilkel.dugum) + " + C" : L(String.raw`\text{(temel fonksiyonlarla yazılamıyor)}`, String.raw`\text{(not expressible in elementary functions)}`)}$$`;
      if (ilkel) adim += L(String.raw`\n\nSağlama: $F'(${v}) = f(${v})$ olmalı — uygulama bunu sayısal olarak denetledi.`, String.raw`\n\nCheck: $F'(${v}) = f(${v})$ must hold — the app verified this numerically.`);
      else adim += L("\n\nBu fonksiyonun ilkeli ya temel fonksiyonlarla yazılamıyor (ör. e^(x²)) ya da sembolik çözücünün sonucu sağlamadan geçemedi. Belirli integral yine de sayısal olarak hesaplanır.", "\n\nThis function's antiderivative either cannot be written with elementary functions (e.g. e^(x²)) or the symbolic solver's result failed the check. The definite integral is still computed numerically.");
      const grafik = { egriler: [{ f: F.f, renk: "turuncu", ad: "f", kisa: "f" }], noktalar: [], eksen: { x: v } };
      if (!bos(d.a) && !bos(d.b)) {
        const a = Motor.deger(d.a), b = Motor.deger(d.b);
        const r = Motor.integralSayisal(F.f, a, b);
        if (r.tanimsiz || !Number.isFinite(r.deger)) throw new Error(L("Fonksiyon bu aralıkta tanımsız ya da sonsuz (ör. negatifin logu, sıfıra bölme). İntegral yakınsamıyor olabilir.", "The function is undefined or infinite on this interval (e.g. log of a negative, division by zero). The integral may not converge."));
        satirlar.unshift(satir(`∫ ${B(a)} → ${B(b)}`, B(r.deger, 10), { ana: true }));
        const isaret = Motor.kokler(F.f, Number.isFinite(a) ? a : -1e3, Number.isFinite(b) ? b : 1e3).filter((x) => x > Math.min(a, b) && x < Math.max(a, b));
        if (isaret.length && Number.isFinite(a) && Number.isFinite(b)) {
          const alan = Motor.integralSayisal((x) => Math.abs(F.f(x)), a, b).deger;
          satirlar.push(satir(L("Toplam alan ∫|f|", "Total area ∫|f|"), B(alan, 10)));
          const yerler = isaret.map((x) => B(x, 5)).join(", ");
          adim += L(`\n\nf bu aralıkta ${yerler} noktasında işaret değiştiriyor: x ekseninin altındaki parçalar integrale EKSİ katkı yapar. Net integral ${B(r.deger, 8)}, geometrik toplam alan ${B(alan, 8)}.`,
            `\n\nf changes sign at ${yerler} in this interval: parts below the x-axis count NEGATIVELY in the integral. Net integral ${B(r.deger, 8)}, total geometric area ${B(alan, 8)}.`);
        }
        if (ilkel && Number.isFinite(a) && Number.isFinite(b)) {
          const Fa = ilkel.f(a), Fb = ilkel.f(b);
          adim += L(String.raw`\n\n**Analizin temel teoremi:** `, String.raw`\n\n**Fundamental theorem of calculus:** `) + String.raw`$$\int_{${S(a)}}^{${S(b)}} f\,d${v} = F(${S(b)}) - F(${S(a)}) = ${S(Fb)} - (${S(Fa)}) = ${S(Fb - Fa)}$$`;
        } else {
          adim += String.raw`\n\n$$\int_{${S(a)}}^{${b === Infinity ? String.raw`\infty` : S(b)}} f\,d${v} = ${S(r.deger)}$$` +
            (b === Infinity || a === -Infinity ? L("\n\nSınırlardan biri sonsuz (has olmayan integral): sonuç sonluysa integral yakınsar.", "\n\nOne limit is infinite (improper integral): if the result is finite, the integral converges.") : "");
        }
        if (r.guvenilmez) adim += L("\n\n⚠ Sayısal hata payı yüksek; fonksiyonun aralıkta kutbu olabilir.", "\n\n⚠ The numerical error is large; the function may have a pole in the interval.");
        const ga = Number.isFinite(a) ? a : b - 10, gb = Number.isFinite(b) ? b : a + Math.max(20, Math.abs(a) * 2);
        const pay = (gb - ga) * 0.15;
        grafik.x = [ga - pay, gb + pay];
        grafik.alanlar = [{ ust: F.f, alt: () => 0, a: ga, b: gb, renk: "alanTuruncu" }];
        grafik.dikeyler = [{ x: ga }, { x: gb }];
      } else grafik.x = [-5, 5];
      return { satirlar, adimlar: adim.replace(SATIR, "\n"), grafikler: [grafik] };
    },
  });

  // ---------------------------------------------------------------- ARTIKLAR
  ekle({
    id: "artik", ad: L("Tüketici ve üretici artığı", "Consumer and producer surplus"), grup: "integral", konu: 13,
    not: L("Ters talep P = D(Q) ve ters arz P = S(Q) ver. Piyasa fiyatı verirsen o fiyattaki artıkları hesaplar, boş bırakırsan dengedekileri.", "Give the inverse demand P = D(Q) and inverse supply P = S(Q). With a market price you get the surpluses at that price; leave it empty for the equilibrium."),
    alanlar: [
      { id: "d", etiket: L("Talep P = D(Q)", "Demand P = D(Q)"), tur: "ifade", v: "120 - Q^2" },
      { id: "s", etiket: L("Arz P = S(Q) (isteğe bağlı)", "Supply P = S(Q) (optional)"), tur: "ifade", v: "20 + 3Q" },
      { id: "p0", etiket: L("Piyasa fiyatı (isteğe bağlı)", "Market price (optional)"), tur: "sayi", v: "" },
    ],
    hesapla(d) {
      const D = fonk(d.d, "Q");
      const Sf = bos(d.s) ? null : fonk(d.s, D.v);
      const v = D.v;
      let Pp, Qd, Qs, adim = "";
      const satirlar = [];
      if (bos(d.p0)) {
        if (!Sf) throw new Error(L("Denge için arz fonksiyonu gerekir; ya arz yaz ya da piyasa fiyatı ver.", "The equilibrium needs a supply function; enter supply or give a market price."));
        const q = kokAra((x) => D.f(x) - Sf.f(x));
        if (!q.length) throw new Error(L("Talep ve arz pozitif bölgede kesişmiyor.", "Demand and supply do not cross at positive quantities."));
        Qd = Qs = q[0]; Pp = D.f(Qd);
        satirlar.push(satir(L(`Denge ${v}*`, `Equilibrium ${v}*`), B(Qd)), satir(L("Denge fiyatı P*", "Equilibrium price P*"), B(Pp)));
        adim += L("**Denge:** ", "**Equilibrium:** ") + String.raw`$D(${v}) = S(${v})$: $$${tx(D)} = ${tx(Sf)} \;\Rightarrow\; ${v}^* = ${S(Qd)},\; P^* = ${S(Pp)}$$`;
      } else {
        Pp = Motor.deger(d.p0);
        const q = kokAra((x) => D.f(x) - Pp);
        if (!q.length) throw new Error(L("Bu fiyatta talep edilen miktar sıfır ya da yok.", "Quantity demanded is zero or undefined at this price."));
        Qd = q[0];
        if (Sf) { const qs = kokAra((x) => Sf.f(x) - Pp); Qs = qs.length ? qs[0] : 0; }
        satirlar.push(satir(L(`Talep edilen ${v}`, `Quantity demanded ${v}`), B(Qd)));
        if (Sf) satirlar.push(satir(L(`Arz edilen ${v}`, `Quantity supplied ${v}`), B(Qs)));
        adim += L(`Piyasa fiyatı P = ${B(Pp)}. Talep edilen miktar D(${v}) = ${B(Pp)} ⇒ ${v} = ${B(Qd, 8)}.`, `Market price P = ${B(Pp)}. Quantity demanded: D(${v}) = ${B(Pp)} ⇒ ${v} = ${B(Qd, 8)}.`);
      }
      const intD = Motor.integralSayisal(D.f, 0, Qd).deger;
      const ta = intD - Pp * Qd;
      const TA = L("TA", "CS"), UA = L("ÜA", "PS");
      satirlar.unshift(satir(L("Tüketici artığı TA", "Consumer surplus CS"), B(ta, 10), { ana: true }));
      adim += L(String.raw`\n\n**Tüketici artığı** — tüketicilerin ödemeye razı olduğu ile ödediği arasındaki fark: `, String.raw`\n\n**Consumer surplus** — the gap between what consumers are willing to pay and what they pay: `) +
        String.raw`$$${TA} = \int_0^{${S(Qd)}} D(${v})\,d${v} - P\,${v} = ${S(intD)} - ${S(Pp)}\cdot ${S(Qd)} = ${S(ta)}$$`;
      const ilkD = Motor.belirsizIntegral(D);
      if (ilkD) adim += String.raw`($\int D\,d${v} = ${Motor.tex(ilkD.dugum)}$)`;
      const grafik = { egriler: [{ f: D.f, renk: "turuncu", ad: TALEP(), kisa: "D" }], x: [0, Math.max(Qd, Qs || 0) * 1.6], sadePozitif: true, noktalar: [{ x: Qd, y: Pp, etiket: bos(d.p0) ? "E" : "" }], yataylar: [{ y: Pp }], alanlar: [{ ust: D.f, alt: () => Pp, a: 0, b: Qd, renk: "alanTuruncu" }], eksen: { x: v, y: "P" } };
      if (Sf) {
        const q = bos(d.p0) ? Qd : Qs;
        const intS = Motor.integralSayisal(Sf.f, 0, q).deger;
        const ua = Pp * q - intS;
        satirlar.splice(1, 0, satir(L("Üretici artığı ÜA", "Producer surplus PS"), B(ua, 10), { ana: true }), satir(L("Toplam artık", "Total surplus"), B(ta + ua, 10)));
        adim += L(String.raw`\n\n**Üretici artığı** — üreticilerin aldığı ile razı oldukları en düşük fiyat arasındaki fark: `, String.raw`\n\n**Producer surplus** — the gap between what producers receive and the lowest price they would accept: `) +
          String.raw`$$${UA} = P\,${v} - \int_0^{${S(q)}} S(${v})\,d${v} = ${S(Pp * q)} - ${S(intS)} = ${S(ua)}$$`;
        grafik.egriler.push({ f: Sf.f, renk: "gri", ad: ARZ(), kisa: "S" });
        grafik.alanlar.push({ ust: () => Pp, alt: Sf.f, a: 0, b: q, renk: "alanGri" });
      }
      adim += L("\n\nGrafikte turuncu alan tüketici, gri alan üretici artığı.", "\n\nOn the graph the orange area is consumer surplus and the grey area producer surplus.");
      return { satirlar, adimlar: adim.replace(SATIR, "\n"), grafikler: [grafik] };
    },
  });

  // ---------------------------------------------------------------- MARJİNALDEN TOPLAMA
  ekle({
    id: "toplam", ad: L("Marjinalden toplam fonksiyona", "From marginal to total function"), grup: "integral", konu: 14,
    not: L("Marjinal maliyet (ya da gelir, tüketim eğilimi…) ve başlangıç değerinden toplam fonksiyonu kurar. İki üretim düzeyi verirsen aradaki toplam değişimi bulur.", "Builds the total function from a marginal function (cost, revenue, propensity to consume…) and its initial value. Give two output levels to get the total change between them."),
    alanlar: [
      { id: "f", etiket: L("Marjinal fonksiyon, ör. MC(Q)", "Marginal function, e.g. MC(Q)"), tur: "ifade", v: "3Q^2 - 12Q + 20" },
      { id: "c0", etiket: L("Başlangıç değeri (Q = 0'da; maliyette sabit maliyet)", "Initial value (at Q = 0; fixed cost for a cost function)"), tur: "sayi", v: "50" },
      { id: "q1", etiket: L("Q₁ (isteğe bağlı)", "Q₁ (optional)"), tur: "sayi", v: "2", yarim: true },
      { id: "q2", etiket: L("Q₂ (isteğe bağlı)", "Q₂ (optional)"), tur: "sayi", v: "5", yarim: true },
    ],
    hesapla(d) {
      const F = fonk(d.f, "Q");
      const v = F.v;
      const c0 = Motor.deger(d.c0, 0);
      const ilkel = Motor.belirsizIntegral(F);
      const satirlar = [];
      let adim = L("Toplam fonksiyon, marjinalin integralidir: ", "The total function is the integral of the marginal: ") + String.raw`$$T(${v}) = \int ${tx(F)}\,d${v} + C$$`;
      let T;
      if (ilkel) {
        const k = c0 - ilkel.f(0);
        T = (x) => ilkel.f(x) + k;
        const tam = M.simplify(M.parse(`${ilkel.dugum.toString({ implicit: "show" })} + ${Motor.yuvarla(k)}`));
        const yazi = Motor.duzenle(tam, v);
        satirlar.push(satir(`T(${v})`, Motor.duz(yazi), { metin: true, ana: true }));
        adim += String.raw`$$\int ${tx(F)}\,d${v} = ${Motor.tex(ilkel.dugum)} + C$$ ` +
          L(String.raw`Başlangıç koşulu $T(0) = ${S(c0)}$ ⇒ $C = ${S(k)}$: `, String.raw`Initial condition $T(0) = ${S(c0)}$ ⇒ $C = ${S(k)}$: `) + String.raw`$$T(${v}) = ${Motor.tex(yazi)}$$`;
      } else {
        T = (x) => c0 + Motor.integralSayisal(F.f, 0, x).deger;
        satirlar.push(satir(`T(${v})`, L("kapalı biçim yok; değerler sayısal", "no closed form; values are numerical"), { metin: true }));
        adim += L(String.raw`Kapalı biçimde ilkel bulunamadı; $T(${v}) = ${S(c0)} + \int_0^{${v}} f$ sayısal olarak hesaplanır.`, String.raw`No closed-form antiderivative was found; $T(${v}) = ${S(c0)} + \int_0^{${v}} f$ is computed numerically.`);
      }
      if (!bos(d.q1) && !bos(d.q2)) {
        const q1 = Motor.deger(d.q1), q2 = Motor.deger(d.q2);
        const deg = Motor.integralSayisal(F.f, q1, q2).deger;
        satirlar.unshift(satir(L(`${B(q1)} → ${B(q2)} toplam değişim`, `Total change ${B(q1)} → ${B(q2)}`), B(deg, 10), { ana: true }));
        satirlar.push(satir(`T(${B(q1)})`, B(T(q1), 10)), satir(`T(${B(q2)})`, B(T(q2), 10)));
        adim += L(String.raw`\n\n**Üretim ${S(q1)}'den ${S(q2)}'ye çıkınca** toplamdaki değişim: `, String.raw`\n\n**When output goes from ${S(q1)} to ${S(q2)}** the total changes by: `) +
          String.raw`$$\int_{${S(q1)}}^{${S(q2)}} ${tx(F)}\,d${v} = ${S(deg)}$$ ` +
          L("Sabit (başlangıç) değer bu farkta yok olur — değişimi bulmak için sabit maliyeti bilmen gerekmez.", "The constant (initial value) cancels in this difference — you do not need the fixed cost to find the change.");
      }
      const xb = Math.max(10, bos(d.q2) ? 10 : Motor.deger(d.q2) * 1.4);
      return {
        satirlar, adimlar: adim.replace(SATIR, "\n"),
        grafikler: [{ egriler: [{ f: T, renk: "turuncu", ad: L("Toplam T", "Total T"), kisa: "T" }, { f: F.f, renk: "gri", ad: L("Marjinal", "Marginal"), kisa: L("marj.", "marg.") }], x: [0, xb], eksen: { x: v } }],
      };
    },
  });

  // ---------------------------------------------------------------- GELİR AKIŞI BD
  ekle({
    id: "akim", ad: L("Gelir akışının bugünkü değeri", "Present value of an income stream"), grup: "integral", konu: 14,
    not: L("Sürekli gelen bir gelir akışının (R(t), yılda) sürekli iskontoyla bugünkü değeri. Süreye ∞ yazarsan sonsuz akış (perpetüite).", "Present value of a continuous income stream (R(t) per year) with continuous discounting. Enter ∞ as the time for a perpetual stream."),
    alanlar: [
      { id: "r_t", etiket: L("Gelir akışı R(t)", "Income stream R(t)"), tur: "ifade", v: "5000 + 200t" },
      { id: "r", etiket: L("Faiz % (sürekli)", "Interest rate % (continuous)"), tur: "sayi", v: "8", yarim: true },
      { id: "T", etiket: L("Süre T (yıl)", "Time T (years)"), tur: "sayi", v: "10", yarim: true },
    ],
    hesapla(d) {
      const R = fonk(d.r_t, "t");
      const v = R.v;
      const r = yuzdeOku(d.r, L("Faiz", "Rate")), T = Motor.deger(d.T);
      if (!(T > 0)) throw new Error(L("Süre pozitif olmalı.", "The time must be positive."));
      const g = (t) => R.f(t) * Math.exp(-r * t);
      const pv = Motor.integralSayisal(g, 0, T);
      if (!Number.isFinite(pv.deger)) throw new Error(L("İntegral yakınsamıyor: akış iskontodan hızlı büyüyor olabilir.", "The integral does not converge: the stream may grow faster than the discounting."));
      const satirlar = [satir(L("Bugünkü değer", "Present value"), P(pv.deger), { ana: true })];
      if (Number.isFinite(T)) satirlar.push(satir(L("T anındaki gelecek değer", "Future value at time T"), P(pv.deger * Math.exp(r * T))), satir(L("İskontosuz toplam gelir", "Undiscounted total income"), P(Motor.integralSayisal(R.f, 0, T).deger)));
      const ust = Number.isFinite(T) ? S(T) : String.raw`\infty`;
      let adim = L(String.raw`Her an gelen $R(${v})\,d${v}$ geliri, sürekli faizle $e^{-r${v}}$ çarpanıyla bugüne indirilir: `, String.raw`Income $R(${v})\,d${v}$ arriving at each instant is discounted to today by the factor $e^{-r${v}}$: `) +
        String.raw`$$PV = \int_0^{${ust}} R(${v})\,e^{-r${v}}\,d${v} = \int_0^{${ust}} \left(${tx(R)}\right)e^{-${S(r)}${v}}\,d${v} = ${S(pv.deger)}$$`;
      const sabit = Math.abs(R.f(0) - R.f(3.7)) < 1e-12 && Math.abs(R.f(0) - R.f(11.3)) < 1e-12;
      if (sabit) adim += L(String.raw`\n\nAkış sabitse kapalı formül: `, String.raw`\n\nFor a constant stream the closed formula is: `) + String.raw`$$PV = R\,\frac{1 - e^{-rT}}{r}${!Number.isFinite(T) ? String.raw`\;\xrightarrow{T\to\infty}\; \frac{R}{r}` : ""}$$`;
      if (Number.isFinite(T)) adim += L(String.raw`\n\nGelecek değer `, String.raw`\n\nFuture value `) + String.raw`$FV = e^{rT}\cdot PV = e^{${S(r * T)}}\cdot ${S(pv.deger)} = ${S(pv.deger * Math.exp(r * T))}$.`;
      const gb = Number.isFinite(T) ? T : Math.min(200, 6 / r);
      return {
        satirlar, adimlar: adim.replace(SATIR, "\n"),
        grafikler: [{ egriler: [{ f: R.f, renk: "gri", ad: "R(t)", kisa: "R" }, { f: g, renk: "turuncu", ad: "R(t)e^(−rt)", kisa: L("iskontolu", "discounted") }], x: [0, gb], sadePozitif: true, alanlar: [{ ust: g, alt: () => 0, a: 0, b: gb, renk: "alanTuruncu" }], eksen: { x: v } }],
      };
    },
  });

  const GRUPLAR = [
    { id: "temel", hafta: L("1–3. hafta", "Weeks 1–3"), ad: L("Fonksiyonlar, doğrular, piyasa", "Functions, lines, markets") },
    { id: "usel", hafta: L("4. hafta", "Week 4"), ad: L("Üstel fonksiyon ve logaritma", "Exponentials and logarithms") },
    { id: "finans", hafta: L("5–7. hafta", "Weeks 5–7"), ad: L("Finans matematiği ve büyüme", "Mathematics of finance and growth") },
    { id: "turev", hafta: L("9–11. hafta", "Weeks 9–11"), ad: L("Türev ve uygulamaları", "Derivatives and applications") },
    { id: "integral", hafta: L("12–14. hafta", "Weeks 12–14"), ad: L("İntegral ve uygulamaları", "Integration and applications") },
    { id: "ek", hafta: L("Ek", "Extra"), ad: L("Matrisler", "Matrices") },
  ];

  // Arayüz ve test aracı BURADAN çalıştırır: adım metnindeki "\n" dönüşümü tek yerde yapılsın.
  function calistir(arac, d) {
    const r = arac.hesapla(d);
    if (r.adimlar) r.adimlar = r.adimlar.replace(SATIR, "\n");
    return r;
  }

  kok.ARACLAR = ARACLAR;
  kok.ARAC_GRUPLARI = GRUPLAR;
  kok.AracYardim = { kokAra, kurallar, calistir };
})(typeof window !== "undefined" ? window : globalThis);
