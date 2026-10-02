// araclar_tanim.js — araçların HESAP kısmı. DOM'a dokunmaz; Node'daki test aynı dosyayı koşturur.
// Her araç: { id, ad, grup, not, konu, alanlar: [...], hesapla(d) -> sonuc }
// sonuc: { satirlar: [{etiket, deger, ana?, metin?}], adimlar: markdown(+LaTeX), grafikler: [spec], tablo, ozet }
(function (kok) {
  "use strict";
  const Motor = kok.Motor;
  const M = Motor.M;
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
    if (!Number.isFinite(x)) throw new Error(`${ad} bir sayı olmalı.`);
    return x / 100;
  };

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
    dugum.traverse((n) => {
      if (n.isOperatorNode) {
        if (n.fn === "pow") {
          if (ic(n.args[0]) && !ic(n.args[1])) k.add(String.raw`Kuvvet kuralı: $\frac{d}{dx}x^n = n\,x^{n-1}$`);
          if (ic(n.args[1])) k.add(String.raw`Üstel kural: $\frac{d}{dx}e^{u} = e^{u}\,u'$, $\frac{d}{dx}a^{u} = a^{u}\ln a\;u'$`);
          if ((ic(n.args[0]) && !yalinMi(n.args[0])) || (ic(n.args[1]) && !yalinMi(n.args[1]) && !Motor.acik(n.args[1]).isConstantNode)) k.add(String.raw`Zincir kuralı: $\frac{d}{dx}f(g(x)) = f'(g(x))\,g'(x)$`);
        }
        if (n.fn === "multiply" && n.args.filter(ic).length >= 2) k.add(String.raw`Çarpım kuralı: $(uv)' = u'v + uv'$`);
        if (n.fn === "divide" && ic(n.args[1])) k.add(String.raw`Bölüm kuralı: $\left(\frac{u}{v}\right)' = \frac{u'v - uv'}{v^2}$`);
      }
      if (n.isFunctionNode && n.args.some(ic)) {
        const ad = n.fn.name;
        if (ad === "log") k.add(String.raw`Logaritma: $\frac{d}{dx}\ln u = \frac{u'}{u}$`);
        if (ad === "log10") k.add(String.raw`10 tabanlı log: $\frac{d}{dx}\log u = \frac{u'}{u\,\ln 10}$`);
        if (ad === "exp") k.add(String.raw`Üstel kural: $\frac{d}{dx}e^{u} = e^{u}\,u'$`);
        if (ad === "sqrt") k.add(String.raw`Kök: $\sqrt{u} = u^{1/2}$, türevi $\frac{u'}{2\sqrt{u}}$`);
        if (!yalinMi(n.args[0])) k.add(String.raw`Zincir kuralı: $\frac{d}{dx}f(g(x)) = f'(g(x))\,g'(x)$`);
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
    if (aranan === "pmt" && t.fv === 0) return [fxAdim("Taksit", [fxSayi(PV), "×", fxSayi(i), "÷", "(", "1", "−", bi, "x■", "(−)", fxSayi(n), "→", ")", t.tip ? ["÷", bi] : [], "="], S_)];
    if (aranan === "pmt" && t.pv === 0) return [fxAdim("Birikim fonu ödemesi", [fxSayi(FV), "×", fxSayi(i), "÷", "(", bi, "x■", fxSayi(n), "→", "−", "1", ")", t.tip ? ["÷", bi] : [], "="], S_)];
    if (aranan === "pv" && t.fv === 0) return [fxAdim("Anüitenin bugünkü değeri", [fxSayi(PMT), "×", "(", "1", "−", bi, "x■", "(−)", fxSayi(n), "→", ")", "÷", fxSayi(i), basi, "="], S_)];
    if (aranan === "fv" && t.pv === 0) return [fxAdim("Anüitenin gelecek değeri", [fxSayi(PMT), "×", "(", bi, "x■", fxSayi(n), "→", "−", "1", ")", "÷", fxSayi(i), basi, "="], S_)];
    if (aranan === "n" && t.pmt === 0) return [fxAdim("Dönem sayısı", ["ln", fxSayi(FV), "÷", fxSayi(PV), ")", "÷", "ln", "1", "+", fxSayi(i), ")", "="], S_)];
    if (aranan === "n" && t.fv === 0 && !t.tip) return [fxAdim("Dönem sayısı (kredi)", ["(−)", "ln", "1", "−", fxSayi(PV), "×", fxSayi(i), "÷", fxSayi(PMT), ")", "÷", "ln", "1", "+", fxSayi(i), ")", "="], S_)];
    if (aranan === "i" && t.pmt === 0) return [fxAdim("Dönem faizi (ondalık)", ["(", fxSayi(FV), "÷", fxSayi(PV), ")", "x■", "1", "÷", fxSayi(n), "→", "−", "1", "="], S_)];
    return [];
  }

  // ======================================================================== ARAÇLAR
  const ARACLAR = [];
  const ekle = (a) => ARACLAR.push(a);

  // ---------------------------------------------------------------- GRAFİK
  ekle({
    id: "grafik", ad: "Grafik çiz", grup: "temel", konu: 1,
    not: "Üç fonksiyona kadar aynı eksende. Grafiğe dokunup kaydırarak değer okursun.",
    alanlar: [
      { id: "f1", etiket: "1. fonksiyon", tur: "ifade", v: "100 - 2x" },
      { id: "f2", etiket: "2. fonksiyon (isteğe bağlı)", tur: "ifade", v: "20 + 2x" },
      { id: "f3", etiket: "3. fonksiyon (isteğe bağlı)", tur: "ifade", v: "" },
      { id: "a", etiket: "x en az", tur: "sayi", v: "0", yarim: true },
      { id: "b", etiket: "x en çok", tur: "sayi", v: "50", yarim: true },
    ],
    hesapla(d) {
      const renk = ["turuncu", "gri", "soluk"];
      const fs = ["f1", "f2", "f3"].filter((k) => !bos(d[k])).map((k, i) => ({ F: fonk(d[k]), renk: renk[i], ad: d[k].trim(), kisa: `f${i + 1}` }));
      if (!fs.length) throw new Error("En az bir fonksiyon yaz.");
      const a = Motor.deger(d.a, -10), b = Motor.deger(d.b, 10);
      if (!(b > a)) throw new Error("“x en çok”, “x en az”dan büyük olmalı.");
      const satirlar = [], noktalar = [];
      const k1 = Motor.kokler(fs[0].F.f, a, b);
      satirlar.push(satir("1. fonksiyonun kökleri", k1.length ? k1.map((x) => B(x, 6)).join(";  ") : "bu aralıkta yok", { metin: true }));
      for (let i = 0; i < fs.length; i++) for (let j = i + 1; j < fs.length; j++) {
        const ks = Motor.kokler((x) => fs[i].F.f(x) - fs[j].F.f(x), a, b);
        satirlar.push(satir(`${i + 1}. ve ${j + 1}. kesişim`, ks.length ? ks.map((x) => `(${B(x, 6)}, ${B(fs[i].F.f(x), 6)})`).join("  ") : "bu aralıkta yok", { metin: true }));
        ks.forEach((x) => noktalar.push({ x, y: fs[i].F.f(x), etiket: `(${B(x, 4)}, ${B(fs[i].F.f(x), 4)})` }));
      }
      return {
        satirlar,
        grafikler: [{ egriler: fs.map((g) => ({ f: g.F.f, renk: g.renk, ad: g.ad, kisa: g.kisa })), x: [a, b], noktalar, eksen: { x: fs[0].F.v } }],
        ozet: `Grafik: ${fs.map((g) => g.ad).join(" ; ")} aralık [${a}, ${b}]`,
      };
    },
  });

  // ---------------------------------------------------------------- DENKLEM ÇÖZ
  ekle({
    id: "denklem", ad: "Denklem çöz", grup: "temel", konu: 1,
    not: "f(x) = g(x) denkleminin verilen aralıktaki tüm reel köklerini bulur. Sağ taraf boşsa 0 sayılır.",
    alanlar: [
      { id: "f", etiket: "Sol taraf", tur: "ifade", v: "x^3 - 6x^2 + 11x" },
      { id: "g", etiket: "Sağ taraf", tur: "ifade", v: "6" },
      { id: "a", etiket: "Aralık başı", tur: "sayi", v: "-100", yarim: true },
      { id: "b", etiket: "Aralık sonu", tur: "sayi", v: "100", yarim: true },
    ],
    hesapla(d) {
      const F = fonk(d.f), G = fonk(bos(d.g) ? "0" : d.g, F.v);
      const H = Motor.birlestir(F, G, (a, b) => `(${a}) - (${b})`);
      const a = Motor.deger(d.a, -100), b = Motor.deger(d.b, 100);
      if (!(b > a)) throw new Error("Aralık sonu, başından büyük olmalı.");
      const ks = Motor.kokler(H.f, a, b, 8000);
      const v = H.v;
      const satirlar = ks.length
        ? ks.map((x, i) => satir(`${v}${ks.length > 1 ? "₁₂₃₄₅₆₇₈₉"[i] || i + 1 : ""}`, B(x, 10), { ana: ks.length === 1 }))
        : [satir("Sonuç", "Bu aralıkta reel kök yok", { metin: true })];
      const [ga, gb] = ks.length ? Motor.otomatikAralik(ks) : [Math.max(a, -10), Math.min(b, 10)];
      let adim = String.raw`Denklemi sıfıra eşitle: $$${tx(F)} - \left(${tx(G)}\right) = 0$$`;
      adim += ks.length ? `\n\n${ks.length} kök bulundu: ${ks.map((x) => `$${v} = ${S(x)}$`).join(", ")}.` : "\n\nBu aralıkta işaret değiştiren ya da sıfıra değen nokta yok. Aralığı genişletmeyi dene.";
      adim += `\n\nKökler sayısal olarak bulunur: aralık 8000 parçaya bölünür, işaret değişen her parçada kök Brent yöntemiyle ${"10⁻¹³"} hassasiyetle daraltılır.`;
      return {
        satirlar, adimlar: adim,
        grafikler: [{ egriler: [{ f: F.f, renk: "turuncu", ad: "sol", kisa: "sol" }, { f: G.f, renk: "gri", ad: "sağ", kisa: "sağ" }], x: [Math.max(a, ga), Math.min(b, gb)], noktalar: ks.map((x) => ({ x, y: F.f(x), etiket: `${v}=${B(x, 4)}` })), eksen: { x: v } }],
        ozet: `Denklem: ${d.f} = ${bos(d.g) ? "0" : d.g}; kökler: ${ks.map((x) => B(x)).join(", ") || "yok"}`,
      };
    },
  });

  // ---------------------------------------------------------------- DOĞRU
  ekle({
    id: "dogru", ad: "Doğru denklemi", grup: "temel", konu: 2,
    not: "İki noktadan, eğim ve bir noktadan ya da ax + by = c biçiminden y = mx + b denklemini çıkarır. Talep doğrusunda x yerine Q, y yerine P düşün.",
    alanlar: [
      { id: "mod", etiket: "Elimde ne var?", tur: "secim", v: "iki", secenekler: [["iki", "İki nokta"], ["egim", "Eğim + nokta"], ["genel", "ax + by = c"]] },
      { id: "x1", etiket: "x₁", tur: "sayi", v: "10", yarim: true, kosul: (d) => d.mod !== "genel" },
      { id: "y1", etiket: "y₁", tur: "sayi", v: "80", yarim: true, kosul: (d) => d.mod !== "genel" },
      { id: "x2", etiket: "x₂", tur: "sayi", v: "30", yarim: true, kosul: (d) => d.mod === "iki" },
      { id: "y2", etiket: "y₂", tur: "sayi", v: "40", yarim: true, kosul: (d) => d.mod === "iki" },
      { id: "m", etiket: "Eğim m", tur: "sayi", v: "-2", kosul: (d) => d.mod === "egim" },
      { id: "ka", etiket: "a", tur: "sayi", v: "2", yarim: true, kosul: (d) => d.mod === "genel" },
      { id: "kb", etiket: "b", tur: "sayi", v: "1", yarim: true, kosul: (d) => d.mod === "genel" },
      { id: "kc", etiket: "c", tur: "sayi", v: "100", kosul: (d) => d.mod === "genel" },
    ],
    hesapla(d) {
      let m, b, adim, dikey = null;
      if (d.mod === "iki") {
        const x1 = Motor.deger(d.x1), y1 = Motor.deger(d.y1), x2 = Motor.deger(d.x2), y2 = Motor.deger(d.y2);
        if (x1 === x2) { dikey = x1; adim = `İki noktanın x'i aynı: doğru dikey, denklemi $x = ${S(x1)}$. Eğimi tanımsızdır.`; }
        else {
          m = (y2 - y1) / (x2 - x1); b = y1 - m * x1;
          adim = String.raw`Eğim, y'deki değişimin x'teki değişime oranı: $$m = \frac{y_2 - y_1}{x_2 - x_1} = \frac{${S(y2)} - ${S(y1)}}{${S(x2)} - ${S(x1)}} = ${S(m)}$$` +
            String.raw`Kesişim $b$, noktalardan birini $y = mx + b$'ye koyunca çıkar: $$${S(y1)} = ${S(m)}\cdot ${S(x1)} + b \;\Rightarrow\; b = ${S(b)}$$`;
        }
      } else if (d.mod === "egim") {
        m = Motor.deger(d.m); const x1 = Motor.deger(d.x1), y1 = Motor.deger(d.y1);
        b = y1 - m * x1;
        adim = String.raw`Nokta–eğim biçimi: $$y - y_1 = m(x - x_1) \;\Rightarrow\; y - ${S(y1)} = ${S(m)}(x - ${S(x1)})$$ Düzenlenince $b = y_1 - m x_1 = ${S(b)}$.`;
      } else {
        const a = Motor.deger(d.ka), bb = Motor.deger(d.kb), c = Motor.deger(d.kc);
        if (bb === 0) { if (a === 0) throw new Error("a ve b ikisi birden 0 olamaz."); dikey = c / a; adim = `b = 0 olduğundan doğru dikey: $x = ${S(c / a)}$.`; }
        else {
          m = -a / bb; b = c / bb;
          adim = String.raw`$y$'yi yalnız bırak: $$${S(a)}x + ${S(bb)}y = ${S(c)} \;\Rightarrow\; y = -\frac{${S(a)}}{${S(bb)}}x + \frac{${S(c)}}{${S(bb)}}$$`;
        }
      }
      if (dikey != null) {
        return { satirlar: [satir("Denklem", `x = ${B(dikey)}`, { ana: true }), satir("Eğim", "tanımsız (dikey)", { metin: true })], adimlar: adim, ozet: `Dikey doğru x = ${B(dikey)}` };
      }
      const xk = m !== 0 ? -b / m : NaN;
      const denk = `y = ${B(m)}x ${b < 0 ? "−" : "+"} ${B(Math.abs(b))}`;
      adim += `\n\n**Yorum:** eğim ${m < 0 ? "negatif — x arttıkça y azalır (talep doğrusu böyledir)" : m > 0 ? "pozitif — x arttıkça y artar (arz doğrusu böyledir)" : "sıfır — yatay doğru"}. x bir birim artınca y ${B(Math.abs(m))} birim ${m < 0 ? "azalır" : "artar"}.`;
      const ks = [b, xk].filter(Number.isFinite);
      const xa = Math.min(0, ...(Number.isFinite(xk) ? [xk] : [])) - 5, xb = Math.max(10, ...(Number.isFinite(xk) ? [xk] : [])) + 5;
      return {
        satirlar: [satir("Denklem", denk, { ana: true, metin: true }), satir("Eğim m", B(m)), satir("y-kesişimi b", B(b)), satir("x-kesişimi", Number.isFinite(xk) ? B(xk) : "yok")],
        adimlar: adim,
        grafikler: [{ egriler: [{ f: (x) => m * x + b, renk: "turuncu", ad: denk, kisa: "y" }], x: [xa, xb], noktalar: [{ x: 0, y: b, etiket: `(0, ${B(b, 4)})` }, ...(Number.isFinite(xk) ? [{ x: xk, y: 0, etiket: `(${B(xk, 4)}, 0)` }] : [])] }],
        ozet: `Doğru: ${denk}`,
      };
    },
  });

  // ---------------------------------------------------------------- DENKLEM SİSTEMİ
  ekle({
    id: "sistem", ad: "Doğrusal denklem sistemi", grup: "temel", konu: 2,
    not: "Her satıra bir denklem yaz. Değişkenler tek harf olmalı (Q, P, x, y…). Örnek: arz ve talebin kesiştiği denge.",
    alanlar: [
      { id: "s", etiket: "Denklemler", tur: "metin", v: "Q = 100 - 2P\nQ = 20 + 2P" },
    ],
    hesapla(d) {
      const satirlarMetin = String(d.s || "").split(/\n|;/).map((s) => s.trim()).filter(Boolean);
      if (!satirlarMetin.length) throw new Error("En az bir denklem yaz.");
      const bilinen = new Set(["sin", "cos", "tan", "ln", "log", "sqrt", "exp", "pi", "e", "abs"]);
      for (const s of satirlarMetin) {
        const uzun = (s.match(/[A-Za-z]{2,}/g) || []).filter((w) => !bilinen.has(w));
        if (uzun.length) throw new Error(`“${uzun[0]}” iki harfli; burada çarpım (${uzun[0].split("").join("·")}) sayılırdı. Değişkenlere tek harf ver (ör. Qd yerine D).`);
      }
      const denk = satirlarMetin.map((s) => {
        const p = s.split("=");
        if (p.length !== 2) throw new Error(`“${s}” satırında tam bir tane = olmalı.`);
        return Motor.cokFonk(`(${p[0]}) - (${p[1]})`);
      });
      const vars = [...new Set(denk.flatMap((q) => q.vars))].sort();
      if (!vars.length) throw new Error("Denklemlerde değişken yok.");
      if (vars.length > 6) throw new Error("En çok 6 değişken.");
      // Katsayıları değerlendirerek çıkar: c0 = f(0), a_j = f(e_j) - c0; doğrusallığı rastgele noktada sına
      const sifir = Object.fromEntries(vars.map((v) => [v, 0]));
      const A = [], bvek = [];
      for (const q of denk) {
        const c0 = q.f(sifir);
        const satir_ = vars.map((v) => q.f({ ...sifir, [v]: 1 }) - c0);
        const deneme = Object.fromEntries(vars.map((v, i) => [v, 1.37 + i * 0.71]));
        const tahmin = c0 + satir_.reduce((t, a, i) => t + a * deneme[vars[i]], 0);
        if (!Number.isFinite(c0) || Math.abs(q.f(deneme) - tahmin) > 1e-8 * Math.max(1, Math.abs(tahmin))) {
          throw new Error(`“${satirlarMetin[denk.indexOf(q)]}” doğrusal değil (kare, çarpım ya da kök içeriyor). Doğrusal olmayanlar için Denklem çöz aracını kullan.`);
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
      let adim = String.raw`Katsayı matrisi $A$, değişkenler $(${vars.join(", ")})$ ve sağ taraf $b$: $$A = ${mtx(Ak.map((s) => s.slice(0, n)))},\quad b = ${mtx(Ak.map((s) => [s[n]]))}$$`;
      let satirlar;
      if (katsayi < genis) {
        satirlar = [satir("Sonuç", "Çözüm yok (tutarsız sistem)", { metin: true })];
        adim += `\n\nrank(A) = ${katsayi} < rank([A|b]) = ${genis}: denklemler birbiriyle çelişiyor (ör. paralel doğrular).`;
      } else if (katsayi < n) {
        satirlar = [satir("Sonuç", "Sonsuz çözüm", { metin: true })];
        adim += `\n\nrank(A) = ${katsayi} < değişken sayısı ${n}: en az bir denklem ötekilerden türetilebiliyor, sonsuz çözüm var. ${n - katsayi} değişken serbest seçilebilir.`;
      } else {
        const cozum = vars.map((v, i) => { const satirNo = g.pivotlar.indexOf(i); return g.R[satirNo][n]; });
        satirlar = vars.map((v, i) => satir(v, ops.yaz(cozum[i]).replace("-", "−") + (ops === Motor.KESIR && !Number.isInteger(ops.sayi(cozum[i])) ? `  ≈ ${B(ops.sayi(cozum[i]), 8)}` : ""), { ana: n <= 2 }));
        if (n === m && n <= 3) {
          const Akare = Ak.map((s) => s.slice(0, n));
          const det = Motor.matDet(Akare, ops);
          adim += String.raw`\n\n**Cramer kuralı:** $\det A = ${S(ops.sayi(det))}$.`;
          vars.forEach((v, i) => {
            const Ai = Akare.map((s, r) => s.map((x, c) => (c === i ? Ak[r][n] : x)));
            const di = Motor.matDet(Ai, ops);
            adim += String.raw` $$${v} = \frac{\det A_{${v}}}{\det A} = \frac{${S(ops.sayi(di))}}{${S(ops.sayi(det))}} = ${S(ops.sayi(cozum[i]))}$$`;
          });
          adim += String.raw`\n\n($A_{${vars[0]}}$: $A$'nın ${vars[0]} sütunu yerine $b$ yazılmış hâli.)`;
        }
        if (g.adimlar.length) adim += "\n\n**Satır işlemleri (Gauss–Jordan):**\n\n" + g.adimlar.map((s) => "- " + s).join("\n");
      }
      return { satirlar, adimlar: adim.replace(SATIR, "\n"), ozet: `Sistem:\n${satirlarMetin.join("\n")}` };
    },
  });

  // ---------------------------------------------------------------- PİYASA DENGESİ + VERGİ
  ekle({
    id: "denge", ad: "Piyasa dengesi ve vergi", grup: "temel", konu: 2,
    not: "Talep ve arzı aynı biçimde gir. Birim başına vergi satıcıdan alınır; tüketici ve üreticinin yükünü, vergi gelirini ve ölü ağırlık kaybını verir.",
    alanlar: [
      { id: "bicim", etiket: "Fonksiyon biçimi", tur: "secim", v: "ters", secenekler: [["ters", "P = f(Q)"], ["duz", "Q = f(P)"]] },
      { id: "talep", etiket: "Talep", tur: "ifade", v: "100 - 2Q", ipucu: (d) => (d.bicim === "duz" ? "Q'yu P cinsinden yaz, ör. 50 - 0.5P" : "P'yi Q cinsinden yaz, ör. 100 - 2Q") },
      { id: "arz", etiket: "Arz", tur: "ifade", v: "10 + Q" },
      { id: "t", etiket: "Birim başına vergi (yoksa 0)", tur: "sayi", v: "6" },
    ],
    hesapla(d) {
      const t = Motor.deger(d.t, 0);
      if (d.bicim === "duz") return dengeDuz(d, t);
      const D = fonk(d.talep, "Q"), Sf = fonk(d.arz, D.v);
      const v = D.v;
      const q0 = kokAra((q) => D.f(q) - Sf.f(q));
      if (!q0.length) throw new Error("Talep ve arz pozitif bölgede kesişmiyor. Fonksiyonları kontrol et.");
      const Q0 = q0[0], P0 = D.f(Q0);
      let adim = String.raw`Dengede talep fiyatı arz fiyatına eşittir: $$${tx(D)} = ${tx(Sf)}$$ Buradan $${v}^* = ${S(Q0)}$, fiyat $P^* = ${S(P0)}$.`;
      const satirlar = [satir(`Denge miktarı ${v}*`, B(Q0), { ana: true }), satir("Denge fiyatı P*", B(P0), { ana: true })];
      const choke = Motor.kokler(D.f, 0, Math.max(Q0 * 20, 10))[0];
      const xb = Math.max(Q0 * 1.8, Number.isFinite(choke) ? Math.min(choke * 1.1, Q0 * 3) : 0);
      const grafik = { egriler: [{ f: D.f, renk: "turuncu", ad: "Talep", kisa: "D" }, { f: Sf.f, renk: "gri", ad: "Arz", kisa: "S" }], x: [0, xb], sadePozitif: true, noktalar: [{ x: Q0, y: P0, etiket: "E₀" }], eksen: { x: v, y: "P" }, alanlar: [] };
      if (t !== 0) {
        const qt = kokAra((q) => D.f(q) - Sf.f(q) - t);
        if (!qt.length) throw new Error("Vergiyle birlikte piyasa kapanıyor (pozitif denge yok).");
        const Qt = qt[0], Pc = D.f(Qt), Pp = Sf.f(Qt);
        const gelir = t * Qt;
        const olu = Motor.integralSayisal((q) => D.f(q) - Sf.f(q), Qt, Q0).deger;
        satirlar.push(
          satir(`Vergili miktar ${v}ₜ`, B(Qt)),
          satir("Tüketicinin ödediği", B(Pc)),
          satir("Üreticinin eline geçen", B(Pp)),
          satir("Vergi geliri", B(gelir)),
          satir(`Tüketicinin yükü (birim; vergide payı %${B(100 * (Pc - P0) / t, 3)})`, B(Pc - P0)),
          satir(`Üreticinin yükü (birim; vergide payı %${B(100 * (P0 - Pp) / t, 3)})`, B(P0 - Pp)),
          satir("Ölü ağırlık kaybı", B(olu)),
        );
        adim += String.raw`\n\n**Vergi:** satıcı her birimde $t = ${S(t)}$ öder, arz eğrisi $t$ kadar yukarı kayar. Yeni denge: $$${tx(D)} = ${tx(Sf)} + ${S(t)} \;\Rightarrow\; ${v}_t = ${S(Qt)}$$`;
        adim += String.raw`Tüketici $P_c = ${S(Pc)}$ öder, üreticiye $P_p = P_c - t = ${S(Pp)}$ kalır. Vergi geliri $t\cdot ${v}_t = ${S(gelir)}$.`;
        adim += String.raw`\n\n**Yük paylaşımı:** fiyat tüketici için $${S(Pc - P0)}$ arttı, üretici için $${S(P0 - Pp)}$ düştü. Yükün çoğu esnekliği DÜŞÜK olan tarafa biner.`;
        adim += String.raw`\n\n**Ölü ağırlık kaybı** (vergi yüzünden yapılmayan alışverişin kaybı): $$\int_{${S(Qt)}}^{${S(Q0)}} \big(D(${v}) - S(${v})\big)\,d${v} = ${S(olu)}$$`;
        grafik.egriler.push({ f: (q) => Sf.f(q) + t, renk: "gri", kesikli: true, ad: "Arz + vergi", kisa: "S+t" });
        grafik.noktalar.push({ x: Qt, y: Pc, etiket: "Pc" }, { x: Qt, y: Pp, etiket: "Pp", alta: true });
        grafik.alanlar.push({ ust: () => Pc, alt: () => Pp, a: 0, b: Qt, renk: "alanGri" }, { ust: D.f, alt: Sf.f, a: Qt, b: Q0, renk: "alanKirmizi" });
      }
      return { satirlar, adimlar: adim.replace(SATIR, "\n"), grafikler: [grafik], ozet: `Piyasa: talep P = ${d.talep}, arz P = ${d.arz}, vergi ${t}. Denge Q*=${B(Q0)}, P*=${B(P0)}` };
    },
  });

  function dengeDuz(d, t) {
    const D = fonk(d.talep, "P"), Sf = fonk(d.arz, D.v);
    const v = D.v;
    const p0 = kokAra((p) => D.f(p) - Sf.f(p));
    if (!p0.length) throw new Error("Talep ve arz pozitif fiyatta kesişmiyor.");
    const P0 = p0[0], Q0 = D.f(P0);
    let adim = String.raw`Dengede talep edilen miktar arz edilene eşittir: $$${tx(D)} = ${tx(Sf)}$$ Buradan $${v}^* = ${S(P0)}$, miktar $Q^* = ${S(Q0)}$.`;
    const satirlar = [satir("Denge fiyatı P*", B(P0), { ana: true }), satir("Denge miktarı Q*", B(Q0), { ana: true })];
    const pmax = (Motor.kokler(D.f, 0, Math.max(P0 * 20, 10))[0]) || P0 * 2;
    const grafik = {
      parametrik: [{ xy: (p) => [D.f(p), p], t0: 0, t1: pmax, renk: "turuncu", ad: "Talep" }, { xy: (p) => [Sf.f(p), p], t0: 0, t1: pmax, renk: "gri", ad: "Arz" }],
      x: [0, Math.max(Q0 * 1.8, D.f(0) || 0)], sadePozitif: true, noktalar: [{ x: Q0, y: P0, etiket: "E₀" }], eksen: { x: "Q", y: v },
    };
    if (t !== 0) {
      const pc = kokAra((p) => D.f(p) - Sf.f(p - t), 0);
      if (!pc.length) throw new Error("Vergiyle birlikte pozitif denge yok.");
      const Pc = pc[0], Pp = Pc - t, Qt = D.f(Pc);
      // Ölü ağırlık: fiyat ekseninde iki parça (talep ve arz tarafı)
      const olu = Motor.integralSayisal((p) => Sf.f(p) - Qt, Pp, P0).deger + Motor.integralSayisal((p) => D.f(p) - Qt, P0, Pc).deger;
      satirlar.push(satir("Vergili miktar Qₜ", B(Qt)), satir("Tüketicinin ödediği", B(Pc)), satir("Üreticinin eline geçen", B(Pp)),
        satir("Vergi geliri", B(t * Qt)), satir("Tüketicinin yükü (birim)", B(Pc - P0)), satir("Üreticinin yükü (birim)", B(P0 - Pp)), satir("Ölü ağırlık kaybı", B(olu)));
      adim += String.raw`\n\n**Vergi:** üretici $${v} - t$ fiyatına göre arz eder: $$${tx(D)} = S(${v} - ${S(t)}) \;\Rightarrow\; P_c = ${S(Pc)},\; P_p = ${S(Pp)},\; Q_t = ${S(Qt)}$$ Vergi geliri $${S(t * Qt)}$, ölü ağırlık kaybı $${S(olu)}$.`;
      grafik.parametrik.push({ xy: (p) => [Sf.f(p - t), p], t0: t, t1: pmax + t, renk: "gri", kesikli: true, ad: "Arz + vergi" });
      grafik.noktalar.push({ x: Qt, y: Pc, etiket: "Pc" }, { x: Qt, y: Pp, etiket: "Pp", alta: true });
    }
    return { satirlar, adimlar: adim.replace(SATIR, "\n"), grafikler: [grafik], ozet: `Piyasa: talep Q = ${d.talep}, arz Q = ${d.arz}, vergi ${t}. Denge P*=${B(P0)}, Q*=${B(Q0)}` };
  }

  // ---------------------------------------------------------------- BAŞABAŞ
  ekle({
    id: "basabas", ad: "Başabaş noktası", grup: "temel", konu: 2,
    not: "Toplam gelirin toplam maliyete eşit olduğu, kârın sıfır olduğu üretim miktarı.",
    alanlar: [
      { id: "tr", etiket: "Toplam gelir TR(Q)", tur: "ifade", v: "25Q" },
      { id: "tc", etiket: "Toplam maliyet TC(Q)", tur: "ifade", v: "1200 + 10Q" },
    ],
    hesapla(d) {
      const TR = fonk(d.tr, "Q"), TC = fonk(d.tc, TR.v);
      const PI = Motor.birlestir(TR, TC, (a, b) => `(${a}) - (${b})`, "Q");
      const v = PI.v;
      const ks = kokAra(PI.f, 0);
      let sade = PI.dugum; try { sade = Motor.duzenle(M.simplify(PI.dugum), v); } catch (e) { /* */ }
      let adim = String.raw`Kâr $\pi(${v}) = TR - TC$: $$\pi(${v}) = ${Motor.tex(sade)}$$ Başabaş noktasında $\pi = 0$, yani $TR = TC$.`;
      const satirlar = ks.length ? ks.map((q, i) => satir(ks.length > 1 ? `Başabaş ${i + 1}: ${v}` : `Başabaş ${v}`, B(q), { ana: true })) : [satir("Sonuç", "Pozitif başabaş noktası yok", { metin: true })];
      ks.forEach((q) => satirlar.push(satir(`  ${v} = ${B(q, 6)} iken TR = TC`, B(TR.f(q)))));
      if (ks.length) {
        const ornek = ks[0] * 1.2 + 1;
        adim += `\n\n${ks.map((q) => `$${v} = ${S(q)}$`).join(" ve ")} noktasında gelir maliyeti tam karşılar. ${v} = ${B(ornek, 4)} için kâr ${B(PI.f(ornek), 6)}: ${PI.f(ornek) > 0 ? "bu noktanın ötesi kâr bölgesi" : "bu noktanın ötesi zarar bölgesi"}.`;
        // Doğrusal durum: TR = pQ, TC = FC + vQ  ->  Q = FC/(p - v)
        const p = TR.f(1) - TR.f(0), vc = TC.f(1) - TC.f(0), FC = TC.f(0);
        const dogrusal = Math.abs(TR.f(0)) < 1e-12 && [2, 7, 13].every((q) => Math.abs(TR.f(q) - p * q) < 1e-9 * Math.max(1, p * q) && Math.abs(TC.f(q) - FC - vc * q) < 1e-9 * Math.max(1, FC + vc * q));
        if (dogrusal && p !== vc) adim += String.raw`\n\n**Doğrusal kısayol:** fiyat $p = ${S(p)}$, birim değişken maliyet $v = ${S(vc)}$, sabit maliyet $FC = ${S(FC)}$: $$Q_{BE} = \frac{FC}{p - v} = \frac{${S(FC)}}{${S(p)} - ${S(vc)}} = ${S(FC / (p - vc))}$$ $p - v$ = katkı payı: her birimin sabit maliyete katkısı.`;
      }
      const xb = ks.length ? Math.max(...ks) * 2 : 100;
      return {
        satirlar, adimlar: adim.replace(SATIR, "\n"),
        grafikler: [{ egriler: [{ f: TR.f, renk: "turuncu", ad: "TR", kisa: "TR" }, { f: TC.f, renk: "gri", ad: "TC", kisa: "TC" }, { f: PI.f, renk: "soluk", kesikli: true, ad: "Kâr", kisa: "π" }], x: [0, xb], noktalar: ks.map((q) => ({ x: q, y: TR.f(q), etiket: "BE" })), eksen: { x: v } }],
        ozet: `Başabaş: TR = ${d.tr}, TC = ${d.tc}; Q = ${ks.map((q) => B(q)).join(", ") || "yok"}`,
      };
    },
  });

  // ---------------------------------------------------------------- İKİNCİ DERECE
  ekle({
    id: "ikinci", ad: "İkinci derece denklem", grup: "temel", konu: 3,
    not: "ax² + bx + c: kökler, diskriminant, tepe noktası. Doğrusal talepte toplam gelir TR = P·Q ikinci derecedir; tepe noktası en yüksek geliri verir.",
    alanlar: [
      { id: "a", etiket: "a", tur: "sayi", v: "-2", yarim: true },
      { id: "b", etiket: "b", tur: "sayi", v: "100", yarim: true },
      { id: "c", etiket: "c", tur: "sayi", v: "0" },
    ],
    hesapla(d) {
      const a = Motor.deger(d.a), b = Motor.deger(d.b), c = Motor.deger(d.c, 0);
      if (a === 0) throw new Error("a = 0 olursa denklem ikinci derece değil, doğrusaldır. Doğru aracını kullan.");
      const D = b * b - 4 * a * c;
      const h = -b / (2 * a), k = a * h * h + b * h + c;
      const f = (x) => a * x * x + b * x + c;
      const satirlar = [satir("Diskriminant Δ", B(D))];
      let adim = String.raw`$$f(x) = ${S(a)}x^2 ${b < 0 ? "-" : "+"} ${S(Math.abs(b))}x ${c < 0 ? "-" : "+"} ${S(Math.abs(c))}$$` +
        String.raw`**Diskriminant:** $$\Delta = b^2 - 4ac = (${S(b)})^2 - 4(${S(a)})(${S(c)}) = ${S(D)}$$`;
      let kokler = [];
      if (D > 1e-12) {
        const r1 = (-b - Math.sqrt(D)) / (2 * a), r2 = (-b + Math.sqrt(D)) / (2 * a);
        kokler = [Math.min(r1, r2), Math.max(r1, r2)].map(Motor.temizle);
        satirlar.push(satir("x₁", B(kokler[0]), { ana: true }), satir("x₂", B(kokler[1]), { ana: true }));
        adim += String.raw`$\Delta > 0$: iki farklı reel kök. $$x_{1,2} = \frac{-b \mp \sqrt{\Delta}}{2a} = \frac{${S(-b)} \mp \sqrt{${S(D)}}}{${S(2 * a)}}$$ $$x_1 = ${S(kokler[0])},\quad x_2 = ${S(kokler[1])}$$ Çarpanlara ayrılmış biçim: $${S(a)}(x - ${S(kokler[0])})(x - ${S(kokler[1])})$.`;
      } else if (Math.abs(D) <= 1e-12) {
        kokler = [Motor.temizle(h)];
        satirlar.push(satir("Çift kök x", B(h), { ana: true }));
        adim += String.raw`$\Delta = 0$: tek (çift) kök $x = -\frac{b}{2a} = ${S(h)}$. Parabol x eksenine teğet.`;
      } else {
        const re = h, im = Math.sqrt(-D) / (2 * Math.abs(a));
        satirlar.push(satir("Kökler", `${B(re)} ± ${B(im)}i`, { metin: true }));
        adim += String.raw`$\Delta < 0$: reel kök yok, parabol x eksenini kesmez. Karmaşık kökler $x = ${S(re)} \pm ${S(im)}i$.`;
      }
      satirlar.push(satir("Tepe noktası", `(${B(h)}, ${B(k)})`, { metin: true }), satir(a < 0 ? "En büyük değer" : "En küçük değer", B(k)));
      adim += String.raw`\n\n**Tepe noktası:** $$x_T = -\frac{b}{2a} = ${S(h)},\qquad f(x_T) = ${S(k)}$$ $a ${a < 0 ? "< 0" : "> 0"}$ olduğundan parabolün kolları ${a < 0 ? "aşağı bakar ve tepe EN YÜKSEK nokta" : "yukarı bakar ve tepe EN DÜŞÜK nokta"}dır.`;
      const [xa, xb] = Motor.otomatikAralik([...kokler, h]);
      return {
        satirlar, adimlar: adim.replace(SATIR, "\n"),
        grafikler: [{ egriler: [{ f, renk: "turuncu", ad: "f(x)", kisa: "f" }], x: [xa, xb], noktalar: [{ x: h, y: k, etiket: "Tepe" }, ...kokler.map((r) => ({ x: r, y: 0, etiket: B(r, 4) }))] }],
        fx: [fxAdim("Diskriminant Δ = b² − 4ac", [fxSayi(b), "x²", "−", "4", "×", fxSayi(a), "×", fxSayi(c), "="], D), ...(D >= 0 ? [fxAdim("x = (−b + √Δ) ÷ 2a", ["(", fxSayi(-b), "+", "√■", fxSayi(D), "→", ")", "÷", "(", "2", "×", fxSayi(a), ")", "="], (-b + Math.sqrt(D)) / (2 * a)), fxAdim("x = (−b − √Δ) ÷ 2a", ["(", fxSayi(-b), "−", "√■", fxSayi(D), "→", ")", "÷", "(", "2", "×", fxSayi(a), ")", "="], (-b - Math.sqrt(D)) / (2 * a))] : []), fxAdim("Tepe noktası x = −b ÷ 2a", [fxSayi(-b), "÷", "(", "2", "×", fxSayi(a), ")", "="], h)],
        ozet: `İkinci derece: a=${a}, b=${b}, c=${c}; Δ=${B(D)}; tepe (${B(h)}, ${B(k)})`,
      };
    },
  });

  // ---------------------------------------------------------------- LOGARİTMA / ÜSTEL DENKLEM
  ekle({
    id: "log", ad: "Logaritma ve üstel denklem", grup: "usel", konu: 4,
    not: "Herhangi tabanda logaritma, ya da bilinmeyenin üste olduğu denklemler: a·bˣ = c ve a·eᵏˣ = c.",
    alanlar: [
      { id: "mod", etiket: "Ne hesaplanacak?", tur: "secim", v: "usel", secenekler: [["log", "log_b(x)"], ["usel", "a·bˣ = c"], ["dogal", "a·eᵏˣ = c"]] },
      { id: "taban", etiket: "Taban b", tur: "sayi", v: "2", yarim: true, kosul: (d) => d.mod === "log" },
      { id: "x", etiket: "x", tur: "sayi", v: "1024", yarim: true, kosul: (d) => d.mod === "log" },
      { id: "a", etiket: "a", tur: "sayi", v: "1000", yarim: true, kosul: (d) => d.mod !== "log" },
      { id: "b", etiket: "b (taban)", tur: "sayi", v: "1.08", yarim: true, kosul: (d) => d.mod === "usel" },
      { id: "k", etiket: "k", tur: "sayi", v: "0.05", yarim: true, kosul: (d) => d.mod === "dogal" },
      { id: "c", etiket: "c", tur: "sayi", v: "2000", kosul: (d) => d.mod !== "log" },
    ],
    hesapla(d) {
      if (d.mod === "log") {
        const b = Motor.deger(d.taban), x = Motor.deger(d.x);
        if (!(b > 0) || b === 1) throw new Error("Taban pozitif ve 1'den farklı olmalı.");
        if (!(x > 0)) throw new Error("Logaritma yalnız pozitif sayılar için tanımlı.");
        const r = Math.log(x) / Math.log(b);
        return {
          satirlar: [satir(`log_${B(b)}(${B(x)})`, B(r), { ana: true })],
          adimlar: String.raw`Taban değiştirme kuralı: $$\log_{${S(b)}} ${S(x)} = \frac{\ln ${S(x)}}{\ln ${S(b)}} = \frac{${S(Math.log(x))}}{${S(Math.log(b))}} = ${S(r)}$$ Anlamı: $${S(b)}^{${S(r)}} = ${S(x)}$.`,
          fx: [fxAdim("log_b x = ln x ÷ ln b", ["ln", fxSayi(x), ")", "÷", "ln", fxSayi(b), ")", "="], r)],
          ozet: `log tabanı ${b} (${x}) = ${B(r)}`,
        };
      }
      const a = Motor.deger(d.a), c = Motor.deger(d.c);
      if (a === 0) throw new Error("a sıfır olamaz.");
      if (!(c / a > 0)) throw new Error("c/a pozitif olmalı; üstel ifade hiçbir zaman negatif ya da sıfır olmaz.");
      if (d.mod === "usel") {
        const b = Motor.deger(d.b);
        if (!(b > 0) || b === 1) throw new Error("Taban b pozitif ve 1'den farklı olmalı.");
        const x = Math.log(c / a) / Math.log(b);
        return {
          satirlar: [satir("x", B(x), { ana: true })],
          adimlar: String.raw`$$${S(a)}\cdot ${S(b)}^{x} = ${S(c)}$$ İki tarafı $${S(a)}$'ya böl: $${S(b)}^{x} = ${S(c / a)}$. İki tarafın doğal logaritmasını al ve $\ln(b^x) = x\ln b$ kuralını kullan: $$x = \frac{\ln ${S(c / a)}}{\ln ${S(b)}} = \frac{${S(Math.log(c / a))}}{${S(Math.log(b))}} = ${S(x)}$$` +
            (b > 1 && a > 0 && c > a ? `\n\n**Finans okuması:** ${B(a)} TL, dönem başına %${B((b - 1) * 100, 6)} faizle yaklaşık ${B(x, 4)} dönemde ${B(c)} TL olur.` : ""),
          grafikler: [{ egriler: [{ f: (t) => a * Math.pow(b, t), renk: "turuncu", ad: "a·bˣ", kisa: "y" }, { f: () => c, renk: "gri", kesikli: true, ad: "c", kisa: "c" }], x: Motor.otomatikAralik([0, x]), noktalar: [{ x, y: c, etiket: `x=${B(x, 4)}` }] }],
          fx: [fxAdim("x = ln(c ÷ a) ÷ ln b", ["ln", fxSayi(c), "÷", fxSayi(a), ")", "÷", "ln", fxSayi(b), ")", "="], x)],
          ozet: `${a}·${b}^x = ${c} → x = ${B(x)}`,
        };
      }
      const k = Motor.deger(d.k);
      if (k === 0) throw new Error("k sıfır olamaz.");
      const x = Math.log(c / a) / k;
      return {
        satirlar: [satir("x", B(x), { ana: true })],
        adimlar: String.raw`$$${S(a)}\,e^{${S(k)}x} = ${S(c)}$$ $${S(a)}$'ya böl, sonra $\ln$ al ($\ln e^{u} = u$): $$${S(k)}x = \ln ${S(c / a)} \;\Rightarrow\; x = \frac{${S(Math.log(c / a))}}{${S(k)}} = ${S(x)}$$`,
        grafikler: [{ egriler: [{ f: (t) => a * Math.exp(k * t), renk: "turuncu", ad: "a·eᵏˣ", kisa: "y" }, { f: () => c, renk: "gri", kesikli: true, ad: "c", kisa: "c" }], x: Motor.otomatikAralik([0, x]), noktalar: [{ x, y: c, etiket: `x=${B(x, 4)}` }] }],
        fx: [fxAdim("x = ln(c ÷ a) ÷ k", ["ln", fxSayi(c), "÷", fxSayi(a), ")", "÷", fxSayi(k), "="], x)],
        ozet: `${a}·e^(${k}x) = ${c} → x = ${B(x)}`,
      };
    },
  });

  // ---------------------------------------------------------------- BÜYÜME
  ekle({
    id: "buyume", ad: "Büyüme oranı", grup: "usel", konu: 7,
    not: "İki gözlemden ortalama büyüme (CAGR) ve sürekli büyüme oranı, katlanma süresi ya da ileriye projeksiyon.",
    alanlar: [
      { id: "mod", etiket: "Ne hesaplanacak?", tur: "secim", v: "iki", secenekler: [["iki", "İki gözlemden oran"], ["kat", "Katlanma süresi"], ["proj", "Projeksiyon"]] },
      { id: "y1", etiket: "Başlangıç değeri", tur: "sayi", v: "1000", yarim: true, kosul: (d) => d.mod !== "kat" },
      { id: "y2", etiket: "Bitiş değeri", tur: "sayi", v: "1500", yarim: true, kosul: (d) => d.mod === "iki" },
      { id: "n", etiket: "Aradaki dönem sayısı", tur: "sayi", v: "5", kosul: (d) => d.mod === "iki" },
      { id: "r", etiket: "Büyüme oranı % (dönem başına)", tur: "sayi", v: "7", yarim: true, kosul: (d) => d.mod !== "iki" },
      { id: "t", etiket: "Dönem sayısı", tur: "sayi", v: "10", yarim: true, kosul: (d) => d.mod === "proj" },
    ],
    hesapla(d) {
      if (d.mod === "iki") {
        const y1 = Motor.deger(d.y1), y2 = Motor.deger(d.y2), n = Motor.deger(d.n);
        if (!(y1 > 0 && y2 > 0)) throw new Error("Değerler pozitif olmalı.");
        if (!(n > 0)) throw new Error("Dönem sayısı pozitif olmalı.");
        const g = Math.pow(y2 / y1, 1 / n) - 1, k = Math.log(y2 / y1) / n, top = y2 / y1 - 1;
        return {
          satirlar: [satir("Ortalama büyüme (bileşik)", "%" + B(g * 100, 6), { ana: true }), satir("Sürekli büyüme oranı", "%" + B(k * 100, 6)), satir("Toplam değişim", "%" + B(top * 100, 6))],
          adimlar: String.raw`**Bileşik (geometrik) ortalama büyüme** — her dönem aynı oranla büyüseydi: $$g = \left(\frac{y_n}{y_0}\right)^{1/n} - 1 = \left(\frac{${S(y2)}}{${S(y1)}}\right)^{1/${S(n)}} - 1 = ${S(g)}$$` +
            String.raw`**Sürekli büyüme oranı** — $y_n = y_0 e^{kn}$ modelinde: $$k = \frac{\ln(y_n / y_0)}{n} = \frac{\ln ${S(y2 / y1)}}{${S(n)}} = ${S(k)}$$` +
            `\n\nToplam değişimi dönem sayısına bölmek (%${B(top * 100, 4)} ÷ ${B(n)} = %${B(top * 100 / n, 4)}) bileşik büyümeyi OLDUĞUNDAN FAZLA gösterir; sınavda bu tuzağa dikkat.`,
          fx: [fxAdim("Ortalama büyüme g (ondalık)", ["(", fxSayi(y2), "÷", fxSayi(y1), ")", "x■", "1", "÷", fxSayi(n), "→", "−", "1", "="], g), fxAdim("Sürekli oran k", ["ln", fxSayi(y2), "÷", fxSayi(y1), ")", "÷", fxSayi(n), "="], k)],
          ozet: `Büyüme: ${y1} → ${y2}, ${n} dönem; g=%${B(g * 100)}, k=%${B(k * 100)}`,
        };
      }
      const r = yuzdeOku(d.r, "Oran");
      if (d.mod === "kat") {
        if (!(r > 0)) throw new Error("Katlanma için oran pozitif olmalı.");
        const kesin = Math.log(2) / Math.log(1 + r), surekli = Math.log(2) / r;
        return {
          satirlar: [satir("Katlanma süresi (bileşik)", B(kesin, 6) + " dönem", { ana: true }), satir("Sürekli büyümede", B(surekli, 6) + " dönem"), satir("70 kuralı", B(70 / (r * 100), 6) + " dönem"), satir("72 kuralı", B(72 / (r * 100), 6) + " dönem")],
          adimlar: String.raw`Değerin iki katına çıkması: $(1+r)^t = 2$. $$t = \frac{\ln 2}{\ln(1+r)} = \frac{0.6931}{\ln ${S(1 + r)}} = ${S(kesin)}$$ Sürekli büyümede $e^{rt} = 2 \Rightarrow t = \ln 2 / r = ${S(surekli)}$.` +
            String.raw`\n\n**70 kuralı:** $\ln 2 \approx 0.70$ olduğundan $t \approx 70 / (\%\text{oran})$. Küçük oranlarda iyi bir zihinden hesap yöntemidir; oran büyüdükçe sapar.`,
          fx: [fxAdim("Katlanma süresi", ["ln", "2", ")", "÷", "ln", "1", "+", fxSayi(r), ")", "="], kesin), fxAdim("Sürekli büyümede", ["ln", "2", ")", "÷", fxSayi(r), "="], surekli)],
          ozet: `Katlanma: %${r * 100} → ${B(kesin)} dönem`,
        };
      }
      const y0 = Motor.deger(d.y1), t = Motor.deger(d.t);
      const bil = y0 * Math.pow(1 + r, t), sur = y0 * Math.exp(r * t);
      return {
        satirlar: [satir("Bileşik büyümeyle", B(bil, 10), { ana: true }), satir("Sürekli büyümeyle", B(sur, 10))],
        adimlar: String.raw`$$y_t = y_0 (1+r)^t = ${S(y0)}(${S(1 + r)})^{${S(t)}} = ${S(bil)}$$ $$y_t = y_0 e^{rt} = ${S(y0)}\,e^{${S(r)}\cdot ${S(t)}} = ${S(sur)}$$ Sürekli bileşik her zaman biraz daha fazladır, çünkü büyüme her an kendi üstüne eklenir.`,
        grafikler: [{ egriler: [{ f: (s) => y0 * Math.pow(1 + r, s), renk: "turuncu", ad: "(1+r)ᵗ", kisa: "bileşik" }, { f: (s) => y0 * Math.exp(r * s), renk: "gri", kesikli: true, ad: "eʳᵗ", kisa: "sürekli" }], x: [0, t], sadePozitif: true, eksen: { x: "t" } }],
        fx: [fxAdim("Bileşik", [fxSayi(y0), "×", "(", "1", "+", fxSayi(r), ")", "x■", fxSayi(t), "="], bil), fxAdim("Sürekli", [fxSayi(y0), "×", "SHIFT", "ln", fxSayi(r), "×", fxSayi(t), "="], sur)],
        ozet: `Projeksiyon: ${y0}, %${r * 100}, ${t} dönem → ${B(bil)}`,
      };
    },
  });

  // ---------------------------------------------------------------- FAİZ
  ekle({
    id: "faiz", ad: "Faiz: basit, bileşik, sürekli", grup: "finans", konu: 5,
    not: "Aynı anapara ve yıllık faizle üç yöntemi yan yana kıyaslar; efektif yıllık faizi verir.",
    alanlar: [
      { id: "p", etiket: "Anapara", tur: "sayi", v: "10000" },
      { id: "r", etiket: "Yıllık nominal faiz %", tur: "sayi", v: "12", yarim: true },
      { id: "t", etiket: "Süre (yıl)", tur: "sayi", v: "3", yarim: true },
      { id: "m", etiket: "Yılda kaç kez bileşik?", tur: "secim", v: "12", secenekler: [["1", "1 (yıllık)"], ["2", "2"], ["4", "4 (çeyrek)"], ["12", "12 (aylık)"], ["365", "365 (günlük)"]] },
    ],
    hesapla(d) {
      const p = Motor.deger(d.p), r = yuzdeOku(d.r, "Faiz"), t = Motor.deger(d.t), m = Number(d.m) || 1;
      const basit = p * (1 + r * t), bil = p * Math.pow(1 + r / m, m * t), sur = p * Math.exp(r * t);
      const efektif = Math.pow(1 + r / m, m) - 1, efSur = Math.exp(r) - 1;
      return {
        satirlar: [
          satir("Bileşik ile son değer", P(bil), { ana: true }),
          satir("Basit faizle", P(basit)), satir("Sürekli bileşikle", P(sur)),
          satir("Bileşik faiz tutarı", P(bil - p)),
          satir("Efektif yıllık faiz", "%" + B(efektif * 100, 6)), satir("Sürekli için efektif", "%" + B(efSur * 100, 6)),
        ],
        adimlar: String.raw`**Basit faiz** — faiz yalnız anaparaya işler: $$FV = P(1 + rt) = ${S(p)}(1 + ${S(r)}\cdot ${S(t)}) = ${S(basit)}$$` +
          String.raw`**Bileşik faiz** — faiz faize de işler, yılda $m = ${m}$ kez: $$FV = P\left(1 + \frac{r}{m}\right)^{mt} = ${S(p)}\left(1 + \frac{${S(r)}}{${m}}\right)^{${S(m * t)}} = ${S(bil)}$$` +
          String.raw`**Sürekli bileşik** — $m \to \infty$ limiti: $$FV = P e^{rt} = ${S(p)}\,e^{${S(r * t)}} = ${S(sur)}$$` +
          String.raw`**Efektif yıllık faiz** — bir yılda gerçekte ne kadar büyüdüğün: $$r_{ef} = \left(1 + \frac{r}{m}\right)^m - 1 = ${S(efektif)}$$ Bankanın söylediği %${B(r * 100)} nominaldir; aylık bileşikle gerçek getiri %${B(efektif * 100, 5)}.`,
        grafikler: [{ egriler: [{ f: (s) => p * Math.pow(1 + r / m, m * s), renk: "turuncu", ad: "Bileşik", kisa: "bileşik" }, { f: (s) => p * (1 + r * s), renk: "gri", ad: "Basit", kisa: "basit" }, { f: (s) => p * Math.exp(r * s), renk: "soluk", kesikli: true, ad: "Sürekli", kisa: "sürekli" }], x: [0, t], sadePozitif: true, eksen: { x: "yıl" } }],
        fx: [fxAdim("Basit faiz", [fxSayi(p), "×", "(", "1", "+", fxSayi(r), "×", fxSayi(t), ")", "="], basit), fxAdim("Bileşik faiz", [fxSayi(p), "×", "(", "1", "+", fxSayi(r), "÷", fxSayi(m), ")", "x■", fxSayi(m), "×", fxSayi(t), "="], bil), fxAdim("Sürekli bileşik", [fxSayi(p), "×", "SHIFT", "ln", fxSayi(r), "×", fxSayi(t), "="], sur), fxAdim("Efektif yıllık faiz (ondalık)", ["(", "1", "+", fxSayi(r), "÷", fxSayi(m), ")", "x■", fxSayi(m), "→", "−", "1", "="], efektif)],
        ozet: `Faiz: P=${p}, r=%${r * 100}, t=${t} yıl, m=${m}; bileşik FV=${P(bil)}`,
      };
    },
  });

  // ---------------------------------------------------------------- TVM
  ekle({
    id: "tvm", ad: "Paranın zaman değeri (TVM)", grup: "finans", konu: 6,
    not: "HP-12C usulü: beş kutudan bulmak istediğini BOŞ bırak. Cebinden çıkan para eksi (−), cebine giren artı (+). Örnek: 100 000 TL kredi çekersen PV = +100000, taksitler eksi çıkar.",
    alanlar: [
      { id: "n", etiket: "n — dönem sayısı", tur: "sayi", v: "12", yarim: true },
      { id: "i", etiket: "i — dönem faizi %", tur: "sayi", v: "3", yarim: true },
      { id: "pv", etiket: "PV — bugünkü değer", tur: "sayi", v: "100000", yarim: true },
      { id: "pmt", etiket: "PMT — dönemlik ödeme", tur: "sayi", v: "", yarim: true },
      { id: "fv", etiket: "FV — gelecek değer", tur: "sayi", v: "0" },
      { id: "tip", etiket: "Ödeme zamanı", tur: "secim", v: "0", secenekler: [["0", "Dönem sonu"], ["1", "Dönem başı"]] },
    ],
    hesapla(d) {
      const anahtarlar = ["n", "i", "pv", "pmt", "fv"];
      const boslar = anahtarlar.filter((k) => bos(d[k]));
      if (boslar.length !== 1) throw new Error(boslar.length ? "Yalnız BİR kutuyu boş bırak — onu bulacağım." : "Bulmak istediğin kutuyu boş bırak.");
      const aranan = boslar[0];
      const b = { tip: Number(d.tip) || 0 };
      for (const k of anahtarlar) if (k !== aranan) b[k] = k === "i" ? yuzdeOku(d.i, "Faiz") : Motor.deger(d[k]);
      let sonuc = Motor.tvmCoz(b, aranan);
      if (Array.isArray(sonuc)) sonuc = sonuc.length === 1 ? sonuc[0] : sonuc;
      if (Array.isArray(sonuc)) throw new Error("Birden fazla faiz oranı bu nakit akışını sağlıyor; işaretleri kontrol et.");
      if (!Number.isFinite(sonuc)) throw new Error(aranan === "i" ? "Bu değerleri sağlayan faiz yok. İşaretlere bak: PV ile FV (ya da PMT) zıt işaretli olmalı." : aranan === "n" ? "Bu değerlerle dönem sayısı bulunamıyor. İşaretlere bak: para hem çıkıp hem girmeli." : "Hesaplanamadı; değerleri kontrol et.");
      const tum = { ...b, [aranan]: sonuc };
      const AD = { n: "n", i: "i (dönem faizi)", pv: "PV", pmt: "PMT", fv: "FV" };
      const goster = (k, x) => (k === "i" ? "%" + B(x * 100, 8) : k === "n" ? B(x, 8) : P(x));
      const satirlar = [satir(AD[aranan], goster(aranan, sonuc), { ana: true })];
      if (aranan === "pmt" || (!bos(d.pmt) && tum.pmt !== 0)) {
        const toplamOdeme = tum.pmt * tum.n;
        satirlar.push(satir("Toplam ödeme (PMT × n)", P(toplamOdeme)));
        if (tum.fv === 0) satirlar.push(satir("Toplam faiz", P(Math.abs(toplamOdeme) - Math.abs(tum.pv))));
      }
      const tipYazi = tum.tip ? String.raw`(1 + i)` : "";
      let adim = String.raw`Genel TVM denklemi (para akışlarının toplamı sıfır): $$PV(1+i)^n + PMT${tipYazi}\frac{(1+i)^n - 1}{i} + FV = 0$$`;
      adim += String.raw`Değerler: $n = ${S(tum.n)}$, $i = ${S(tum.i)}$, $PV = ${S(tum.pv)}$, $PMT = ${S(tum.pmt)}$, $FV = ${S(tum.fv)}$.`;
      const ozel = [];
      if (tum.pmt === 0) ozel.push(String.raw`**Tek ödeme:** $FV = PV(1+i)^n$, $PV = \dfrac{FV}{(1+i)^n}$ (işaretler zıt).`);
      if (tum.fv === 0 && aranan === "pmt") ozel.push(String.raw`**Kredi taksiti (amortisman):** $$PMT = PV\,\frac{i}{1 - (1+i)^{-n}} = ${S(Math.abs(tum.pv))}\cdot\frac{${S(tum.i)}}{1 - (${S(1 + tum.i)})^{-${S(tum.n)}}} = ${S(Math.abs(sonuc))}$$`);
      if (tum.fv === 0 && aranan === "pv") ozel.push(String.raw`**Anüitenin bugünkü değeri:** $$PV = PMT\,\frac{1 - (1+i)^{-n}}{i}${tum.tip ? "(1+i)" : ""}$$`);
      if (tum.pv === 0 && aranan === "fv") ozel.push(String.raw`**Anüitenin gelecek değeri:** $$FV = PMT\,\frac{(1+i)^n - 1}{i}${tum.tip ? "(1+i)" : ""}$$`);
      if (tum.pv === 0 && aranan === "pmt") ozel.push(String.raw`**Birikim fonu (sinking fund):** $$PMT = FV\,\frac{i}{(1+i)^n - 1}$$`);
      if (aranan === "n") ozel.push(String.raw`**Dönem sayısı** logaritmayla çıkar: $(1+i)^n$ yalnız bırakılır, iki tarafın $\ln$'i alınır.`);
      if (aranan === "i") ozel.push("**Faiz oranının** kapalı formülü yoktur; sayısal olarak (denklemi sıfır yapan oran aranarak) bulunur.");
      if (ozel.length) adim += "\n\n" + ozel.join("\n\n");
      adim += `\n\n**İşaret kuralı:** sonuç ${sonuc < 0 && aranan !== "i" && aranan !== "n" ? "eksi çıktı: bu para cebinden ÇIKAR" : aranan === "i" || aranan === "n" ? "işaretsizdir" : "artı çıktı: bu para cebine GİRER"}.`;
      if (tum.i > 0 && tum.n > 0 && tum.n < 1000 && Math.abs(tum.i) < 5) {
        const yillik = Math.pow(1 + tum.i, 12) - 1;
        adim += `\n\nDönem ay ise: dönem faizi %${B(tum.i * 100, 5)} ⇒ yıllık efektif %${B(yillik * 100, 5)}.`;
      }
      const fx = tvmFx(tum, aranan, sonuc);
      return { satirlar, adimlar: adim, fx, fxNot: fx.length ? "İşaretleri sınavda sen yazarsın; makinede büyüklüğü hesapla." : "Bu durumun 82ES'te tek satırlık formülü yok (faiz oranı ancak deneme–yanılmayla bulunur).", ozet: `TVM: n=${B(tum.n)}, i=%${B(tum.i * 100)}, PV=${B(tum.pv)}, PMT=${B(tum.pmt)}, FV=${B(tum.fv)}, ${tum.tip ? "dönem başı" : "dönem sonu"} (bulunan: ${aranan})` };
    },
  });

  // ---------------------------------------------------------------- ÖDEME TABLOSU
  ekle({
    id: "odeme", ad: "Kredi ödeme tablosu", grup: "finans", konu: 6,
    not: "Eşit taksitli kredinin her taksitte ne kadarının faiz, ne kadarının anapara olduğunu gösterir.",
    alanlar: [
      { id: "p", etiket: "Kredi tutarı", tur: "sayi", v: "100000" },
      { id: "i", etiket: "Dönem (aylık) faizi %", tur: "sayi", v: "3", yarim: true },
      { id: "n", etiket: "Taksit sayısı", tur: "sayi", v: "12", yarim: true },
    ],
    hesapla(d) {
      const p = Motor.deger(d.p), i = yuzdeOku(d.i, "Faiz"), n = Math.round(Motor.deger(d.n));
      if (!(n >= 1 && n <= 600)) throw new Error("Taksit sayısı 1 ile 600 arasında olmalı.");
      if (!(p > 0)) throw new Error("Kredi tutarı pozitif olmalı.");
      const pmt = i === 0 ? p / n : p * i / (1 - Math.pow(1 + i, -n));
      let kalan = p, topFaiz = 0;
      const satirlarT = [];
      for (let k = 1; k <= n; k++) {
        const faiz = kalan * i, ana = pmt - faiz;
        kalan -= ana; topFaiz += faiz;
        satirlarT.push([k, P(pmt), P(faiz), P(ana), P(Math.abs(kalan) < 1e-6 ? 0 : kalan)]);
      }
      return {
        satirlar: [satir("Taksit", P(pmt), { ana: true }), satir("Toplam ödeme", P(pmt * n)), satir("Toplam faiz", P(topFaiz)), satir("Faiz / kredi", "%" + B(topFaiz / p * 100, 5))],
        tablo: { basliklar: ["#", "Taksit", "Faiz", "Anapara", "Kalan"], satirlar: satirlarT },
        adimlar: String.raw`$$PMT = P\,\frac{i}{1-(1+i)^{-n}} = ${S(p)}\cdot\frac{${S(i)}}{1-(${S(1 + i)})^{-${n}}} = ${S(pmt)}$$ Her taksitte önce kalan borcun faizi ödenir ($\text{faiz}_k = \text{kalan}_{k-1}\cdot i$), taksitin geri kalanı anaparayı düşer. Bu yüzden ilk taksitlerde faiz payı büyük, son taksitlerde küçüktür.`,
        fx: [fxAdim("Taksit", [fxSayi(p), "×", fxSayi(i), "÷", "(", "1", "−", "(", "1", "+", fxSayi(i), ")", "x■", "(−)", fxSayi(n), "→", ")", "="], pmt)],
        ozet: `Kredi: ${p} TL, aylık %${i * 100}, ${n} taksit → taksit ${P(pmt)}`,
      };
    },
  });

  // ---------------------------------------------------------------- NBD / İVO
  function akisOku(s) {
    let t = String(s || "").trim();
    if (!t) throw new Error("Nakit akışlarını yaz.");
    let parca;
    if (/[;\n]/.test(t)) parca = t.split(/[;\n]+/);
    else if (/,\s/.test(t)) parca = t.split(/,\s+/);
    else if ((t.match(/,/g) || []).length > 1 && !/\s/.test(t)) parca = t.split(",");
    else parca = t.split(/\s+/);
    return parca.map((x) => x.trim()).filter(Boolean).map((x) => Motor.deger(x.replace(/^([-+−]?\d+),(\d+)$/, "$1.$2")));
  }
  ekle({
    id: "nbd", ad: "Net bugünkü değer ve iç verim", grup: "finans", konu: 7,
    not: "İlk akış bugünkü yatırımdır (eksi). Akışları ; ya da alt satırla ayır. Ondalıkta virgül kullanabilirsin.",
    alanlar: [
      { id: "r", etiket: "İskonto oranı % (dönem başına)", tur: "sayi", v: "10" },
      { id: "akis", etiket: "Nakit akışları (CF₀; CF₁; …)", tur: "metin", v: "-1000; 300; 400; 500" },
    ],
    hesapla(d) {
      const r = yuzdeOku(d.r, "Oran"), cf = akisOku(d.akis);
      if (cf.length < 2) throw new Error("En az iki akış gerekir (yatırım ve en az bir getiri).");
      const npv = Motor.nbd(r, cf);
      const irr = Motor.ivo(cf);
      const ind = cf.map((c, k) => c / Math.pow(1 + r, k));
      let kum = 0, geriDonus = null;
      for (let k = 0; k < ind.length; k++) {
        const once = kum; kum += ind[k];
        if (geriDonus == null && once < 0 && kum >= 0) geriDonus = k - 1 + (-once / ind[k]);
      }
      const gir = ind.slice(1).reduce((a, b) => a + b, 0);
      const satirlar = [satir("NBD (NPV)", P(npv), { ana: true })];
      satirlar.push(satir("İç verim oranı (IRR)", irr.length ? irr.map((x) => "%" + B(x * 100, 6)).join("  ") : "yok", { metin: !irr.length }));
      if (cf[0] < 0) satirlar.push(satir("Kârlılık endeksi", B(gir / -cf[0], 6)));
      satirlar.push(satir("İskontolu geri dönüş", geriDonus != null ? B(geriDonus, 4) + " dönem" : "proje süresinde dönmüyor", { metin: geriDonus == null }));
      let adim = String.raw`$$NBD = \sum_{t=0}^{${cf.length - 1}} \frac{CF_t}{(1+r)^t} = ${cf.map((c, k) => (k === 0 ? S(c) : String.raw`\frac{${S(c)}}{${S(1 + r)}^{${k}}}`)).join(" + ").replace(/\+ -/g, "- ")} = ${S(npv)}$$`;
      adim += `\n\n**Karar:** NBD ${npv > 0 ? "> 0 → proje, %" + B(r * 100) + " getiri beklentisini aşıyor; YAPILMALI" : npv < 0 ? "< 0 → proje beklenen getiriyi karşılamıyor; YAPILMAMALI" : "= 0 → proje tam olarak beklenen getiriyi sağlıyor"}.`;
      adim += String.raw`\n\n**İç verim oranı:** NBD'yi sıfır yapan oran: $\sum CF_t/(1+IRR)^t = 0$. ${irr.length ? `IRR = %${B(irr[0] * 100, 6)}; ${irr[0] > r ? "iskonto oranından büyük, NBD ile aynı karar" : "iskonto oranından küçük"}.` : "Bu akışta işaret değişimi olmadığı için IRR yok."}`;
      if (irr.length > 1) adim += "\n\nAkışların işareti birden fazla kez değiştiği için birden çok IRR var — bu durumda NBD'ye güven.";
      const rmax = Math.max(0.3, (irr.length ? Math.max(...irr) : r) * 2);
      return {
        satirlar, adimlar: adim.replace(SATIR, "\n"),
        tablo: { basliklar: ["t", "CFₜ", "İskonto çarpanı", "Bugünkü değer"], satirlar: cf.map((c, k) => [k, P(c), B(1 / Math.pow(1 + r, k), 6), P(ind[k])]) },
        grafikler: [{ egriler: [{ f: (x) => Motor.nbd(x / 100, cf), renk: "turuncu", ad: "NBD(r)", kisa: "NBD" }], x: [0, rmax * 100], noktalar: irr.filter((x) => x >= 0).map((x) => ({ x: x * 100, y: 0, etiket: `IRR %${B(x * 100, 4)}` })).concat([{ x: r * 100, y: npv, etiket: "NBD" }]), eksen: { x: "r %" } }],
        fx: cf.length <= 8 ? [fxAdim("NBD", [fxSayi(cf[0]), cf.slice(1).map((c, k) => [c < 0 ? "−" : "+", fxSayi(Math.abs(c)), "÷", "(", "1", "+", fxSayi(r), ")", k >= 1 ? ["x■", String(k + 1), "→"] : []]), "="], npv)] : [],
        fxNot: "82ES'te İVO tuşu yok: iki farklı oranda NBD hesaplayıp işaretin değiştiği aralığı daraltırsın.",
        ozet: `NBD: r=%${r * 100}, akışlar ${cf.join("; ")} → NBD=${P(npv)}, IRR=${irr.map((x) => "%" + B(x * 100)).join(", ") || "yok"}`,
      };
    },
  });

  // ---------------------------------------------------------------- TÜREV
  ekle({
    id: "turev", ad: "Türev ve teğet", grup: "turev", konu: 9,
    not: "Tek değişkende f′, f″ ve bir noktadaki teğet. Birden fazla değişken yazarsan (ör. 10K^0.3L^0.7) kısmi türevleri verir.",
    alanlar: [
      { id: "f", etiket: "f", tur: "ifade", v: "x^3 - 6x^2 + 9x + 1" },
      { id: "x0", etiket: "Nokta (isteğe bağlı)", tur: "metin1", v: "4", ipucu: () => "Tek değişkende bir sayı; çok değişkende K=8, L=27 gibi" },
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
      if (kur.length) adim += "\n\n**Kullanılan kurallar:**\n\n" + kur.map((k) => "- " + k).join("\n");
      const grafik = { egriler: [{ f: F.f, renk: "turuncu", ad: "f", kisa: "f" }, { f: f1, renk: "gri", kesikli: true, ad: "f′", kisa: "f′" }], noktalar: [], eksen: { x: v } };
      let merkez = [0];
      if (!bos(d.x0)) {
        const x0 = Motor.deger(String(d.x0).replace(/^\s*\w+\s*=\s*/, ""));
        const y0 = F.f(x0), m = f1(x0), k2 = f2(x0);
        if (!Number.isFinite(y0)) throw new Error(`f, ${v} = ${B(x0)} noktasında tanımsız.`);
        satirlar.push(satir(`f(${B(x0)})`, B(y0)), satir(`f′(${B(x0)}) — eğim`, B(m), { ana: true }), satir(`f″(${B(x0)})`, B(k2)));
        const b = y0 - m * x0;
        satirlar.push(satir("Teğet doğrusu", `y = ${B(m)}${v} ${b < 0 ? "−" : "+"} ${B(Math.abs(b))}`, { metin: true }));
        adim += String.raw`\n\n**$${v} = ${S(x0)}$ noktasında:** $f(${S(x0)}) = ${S(y0)}$, eğim $f'(${S(x0)}) = ${S(m)}$. Teğet: $$y - f(x_0) = f'(x_0)(${v} - x_0) \;\Rightarrow\; y = ${S(m)}${v} ${b < 0 ? "-" : "+"} ${S(Math.abs(b))}$$`;
        adim += `\n\n**Marjinal okuma:** ${v} bir birim artarsa f yaklaşık ${B(m, 6)} değişir (gerçek değişim f(${B(x0 + 1, 6)}) − f(${B(x0, 6)}) = ${B(F.f(x0 + 1) - y0, 6)}). f″ ${k2 > 0 ? "> 0: eğim artıyor, fonksiyon dışbükey (konveks)" : k2 < 0 ? "< 0: eğim azalıyor, fonksiyon içbükey (konkav)" : "= 0"}.`;
        grafik.egriler.push({ f: (x) => m * x + b, renk: "soluk", ad: "teğet", kisa: "teğet" });
        grafik.noktalar.push({ x: x0, y: y0, etiket: `(${B(x0, 4)}, ${B(y0, 4)})` });
        merkez = [x0];
      }
      const krit = Motor.kokler(f1, -50, 50);
      grafik.x = Motor.otomatikAralik([...merkez, ...krit.slice(0, 6)]);
      return { satirlar, adimlar: adim.replace(SATIR, "\n"), grafikler: [grafik], ozet: `Türev: f = ${d.f}; f′ = ${Motor.duz(Motor.duzenle(d1, v))}${bos(d.x0) ? "" : `; nokta ${d.x0}`}` };
    },
  });

  function kismi(d, C) {
    const vars = C.vars;
    const nokta = {};
    if (!bos(d.x0)) {
      for (const p of String(d.x0).split(/[,;]\s*/)) {
        const m = p.match(/^\s*([A-Za-z])\s*=\s*(.+)$/);
        if (!m) throw new Error(`Noktayı “${vars[0]}=1, ${vars[1]}=2” biçiminde yaz.`);
        nokta[m[1]] = Motor.deger(m[2]);
      }
      const eksik = vars.filter((v) => !(v in nokta));
      if (eksik.length) throw new Error(`Noktada ${eksik.join(", ")} değeri eksik.`);
    }
    const varMi = Object.keys(nokta).length > 0;
    const satirlar = [];
    let adim = String.raw`$$f(${vars.join(", ")}) = ${Motor.tex(C.dugum)}$$ Kısmi türevde öteki değişkenler SABİT sayılır.\n\n`;
    const ilk = {};
    for (const v of vars) {
      const dv = Motor.turevDugum(C.dugum, v);
      ilk[v] = dv;
      const deger = varMi ? Motor.sayiyaCevir(dv.evaluate({ ...nokta })) : null;
      satirlar.push(satir(`∂f/∂${v}`, Motor.duz(dv) + (varMi ? `  =  ${B(deger, 8)}` : ""), { metin: true }));
      adim += String.raw`$$\frac{\partial f}{\partial ${v}} = ${Motor.tex(dv)}${varMi ? String.raw` \;\Big|_{\text{nokta}} = ${S(deger)}` : ""}$$`;
    }
    adim += "\n\n**İkinci kısmi türevler:**\n\n";
    for (const a of vars) for (const b of vars) {
      if (vars.indexOf(b) < vars.indexOf(a)) continue;
      const dd = Motor.turevDugum(ilk[a], b);
      adim += String.raw`$\dfrac{\partial^2 f}{\partial ${a}\,\partial ${b}} = ${Motor.tex(dd)}$${varMi ? String.raw` $= ${S(Motor.sayiyaCevir(dd.evaluate({ ...nokta })))}$` : ""}\n\n`;
    }
    if (vars.length === 2 && varMi) {
      const [a, b] = vars;
      const fa = Motor.sayiyaCevir(ilk[a].evaluate({ ...nokta })), fb = Motor.sayiyaCevir(ilk[b].evaluate({ ...nokta }));
      if (fb !== 0) adim += String.raw`\n**Eş-ürün/eş-fayda eğrisinin eğimi** (marjinal ikame oranı): $\dfrac{d${b}}{d${a}} = -\dfrac{f_{${a}}}{f_{${b}}} = ${S(-fa / fb)}$`;
    }
    adim += "\n\n**İktisatta:** Cobb–Douglas üretimde ∂Q/∂L emeğin marjinal ürünü (MPL), ∂Q/∂K sermayenin marjinal ürünüdür (MPK).";
    return { satirlar, adimlar: adim.replace(SATIR, "\n"), ozet: `Kısmi türev: f = ${d.f}${varMi ? `; nokta ${d.x0}` : ""}` };
  }

  // ---------------------------------------------------------------- MAKS / MİN
  ekle({
    id: "ekstremum", ad: "Maksimum ve minimum", grup: "turev", konu: 11,
    not: "Kritik noktaları (f′ = 0) bulur ve ikinci türevle sınıflar. Aralık verirsen kapalı aralıktaki EN BÜYÜK ve EN KÜÇÜK değeri de verir.",
    alanlar: [
      { id: "f", etiket: "f(x)", tur: "ifade", v: "x^3 - 6x^2 + 9x + 1" },
      { id: "a", etiket: "Aralık başı (isteğe bağlı)", tur: "sayi", v: "0", yarim: true },
      { id: "b", etiket: "Aralık sonu (isteğe bağlı)", tur: "sayi", v: "5", yarim: true },
    ],
    hesapla(d) {
      const kapali = !bos(d.a) && !bos(d.b);
      const a = kapali ? Motor.deger(d.a) : -1000, b = kapali ? Motor.deger(d.b) : 1000;
      if (!(b > a)) throw new Error("Aralık sonu başından büyük olmalı.");
      const E = Motor.ekstremum(d.f, a, b);
      const v = E.v;
      const TUR = { max: "yerel maksimum", min: "yerel minimum", bukum: "ne maks ne min (büküm)" };
      const satirlar = E.kritik.length
        ? E.kritik.map((k) => satir(TUR[k.tur], `${v} = ${B(k.x, 8)},  f = ${B(k.y, 8)}`, { metin: true }))
        : [satir("Kritik nokta", kapali ? "aralıkta yok" : "bulunamadı", { metin: true })];
      const hepsi = (liste) => liste.map((p) => `f(${B(p.x, 6)})`).join(" = ") + ` = ${B(liste[0].y, 8)}`;
      if (kapali && E.gmax) satirlar.push(satir("Aralıkta en büyük", hepsi(E.gmaxlar), { ana: true, metin: true }), satir("Aralıkta en küçük", hepsi(E.gminler), { ana: true, metin: true }));
      E.bukum.forEach((p) => satirlar.push(satir("Büküm noktası", `(${B(p.x, 6)}, ${B(p.y, 6)})`, { metin: true })));
      let adim = String.raw`**1. Birinci türevi sıfıra eşitle** (eğimin sıfır olduğu yerler): $$f'(${v}) = ${txd(E.d1, v)} = 0$$`;
      adim += E.kritik.length ? `Kritik noktalar: ${E.kritik.map((k) => `$${v} = ${S(k.x)}$`).join(", ")}.` : "Bu aralıkta f′ sıfır olmuyor.";
      if (E.kritik.length) {
        adim += String.raw`\n\n**2. İkinci türev testi:** $$f''(${v}) = ${txd(E.d2, v)}$$`;
        for (const k of E.kritik) {
          adim += String.raw`\n- $f''(${S(k.x)}) = ${S(k.ikinci)}$ ${k.ikinci > 0 ? String.raw`$> 0$ → çukur (∪), **yerel minimum**` : k.ikinci < 0 ? String.raw`$< 0$ → tepe (∩), **yerel maksimum**` : `= 0 → test sonuç vermez; f′'nün işaretine bakıldı: **${TUR[k.tur]}**`}, $f(${S(k.x)}) = ${S(k.y)}$`;
        }
      }
      if (E.monoton.length > 1 || E.kritik.length) {
        adim += "\n\n**Artan / azalan aralıklar** (f′'nün işareti):\n\n| aralık | f′ | f |\n|---|---|---|\n" +
          E.monoton.map((m) => `| (${kapali || Math.abs(m.a) < 999 ? B(m.a, 5) : "−∞"}, ${kapali || Math.abs(m.b) < 999 ? B(m.b, 5) : "∞"}) | ${m.yon === "artan" ? "+" : m.yon === "azalan" ? "−" : "0"} | ${m.yon} |`).join("\n");
      }
      if (kapali) {
        const tablo = [...E.kritik.map((k) => ({ x: k.x, y: k.y, ne: "kritik" })), { x: a, y: E.F.f(a), ne: "uç" }, { x: b, y: E.F.f(b), ne: "uç" }].sort((p, q) => p.x - q.x);
        adim += `\n\n**3. Kapalı aralık [${B(a)}, ${B(b)}]:** kritik noktalar ve iki UÇ birlikte karşılaştırılır:\n\n| x | f(x) | |\n|---|---|---|\n` +
          tablo.map((p) => `| ${B(p.x, 6)} | ${B(p.y, 8)} | ${p.ne} |`).join("\n") +
          `\n\nEn büyük ${hepsi(E.gmaxlar)}, en küçük ${hepsi(E.gminler)}. Uç noktayı unutmak en sık yapılan hatadır.`;
      }
      const xs = [...E.kritik.map((k) => k.x), ...E.bukum.map((p) => p.x)];
      const ar = kapali ? [a - (b - a) * 0.08, b + (b - a) * 0.08] : Motor.otomatikAralik(xs);
      return {
        satirlar, adimlar: adim.replace(SATIR, "\n"),
        grafikler: [{ egriler: [{ f: E.F.f, renk: "turuncu", ad: "f", kisa: "f" }, { f: E.f1, renk: "gri", kesikli: true, ad: "f′", kisa: "f′" }], x: ar, noktalar: [...E.kritik.map((k) => ({ x: k.x, y: k.y, etiket: k.tur === "max" ? "maks" : k.tur === "min" ? "min" : "büküm" })), ...E.bukum.map((p) => ({ x: p.x, y: p.y, renk: "soluk" }))], dikeyler: kapali ? [{ x: a }, { x: b }] : [], eksen: { x: v } }],
        ozet: `Maks/min: f = ${d.f}${kapali ? `, aralık [${a}, ${b}]` : ""}; kritik: ${E.kritik.map((k) => `${k.tur} x=${B(k.x)}`).join(", ") || "yok"}`,
      };
    },
  });

  // ---------------------------------------------------------------- KÂR MAKS
  ekle({
    id: "kar", ad: "Kâr maksimizasyonu", grup: "turev", konu: 11,
    not: "Ters talep P(Q) ya da toplam gelir TR(Q) ile toplam maliyet TC(Q) ver; MR = MC koşuluyla kârı en büyük yapan miktarı bulur.",
    alanlar: [
      { id: "girdi", etiket: "Gelir tarafı", tur: "secim", v: "talep", secenekler: [["talep", "Ters talep P(Q)"], ["gelir", "Toplam gelir TR(Q)"]] },
      { id: "p", etiket: "P(Q)", tur: "ifade", v: "100 - 2Q", kosul: (d) => d.girdi === "talep" },
      { id: "tr", etiket: "TR(Q)", tur: "ifade", v: "100Q - 2Q^2", kosul: (d) => d.girdi === "gelir" },
      { id: "tc", etiket: "Toplam maliyet TC(Q)", tur: "ifade", v: "50 + 10Q + 0.5Q^2" },
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
      if (!maks) throw new Error("Pozitif üretimde kârı en büyük yapan nokta bulunamadı (kâr fonksiyonunun tepe noktası yok).");
      const Q = maks.x;
      const MR = Motor.turevDugum(TR.dugum, v), MC = Motor.turevDugum(TC.dugum, v);
      const mr = Motor.derleDugum(MR, v), mc = Motor.derleDugum(MC, v);
      const satirlar = [satir(`Kârı en büyük yapan ${v}*`, B(Q), { ana: true })];
      if (Pf) satirlar.push(satir("Fiyat P*", B(Pf.f(Q)), { ana: true }));
      satirlar.push(satir("En büyük kâr π*", B(maks.y), { ana: true }), satir("Toplam gelir TR*", B(TR.f(Q))), satir("Toplam maliyet TC*", B(TC.f(Q))), satir("MR = MC", B(mr(Q))));
      let adim = (Pf ? String.raw`Toplam gelir $TR = P\cdot ${v} = \left(${tx(Pf)}\right)${v}$.\n\n` : "") +
        String.raw`**1. Marjinal gelir ve maliyet:** $$MR = TR'(${v}) = ${txd(MR, v)}$$ $$MC = TC'(${v}) = ${txd(MC, v)}$$` +
        String.raw`**2. Birinci sıra koşul** — kâr $\pi = TR - TC$, $\pi' = 0 \iff MR = MC$: $$${txd(MR, v)} = ${txd(MC, v)} \;\Rightarrow\; ${v}^* = ${S(Q)}$$` +
        String.raw`**3. İkinci sıra koşul:** $\pi''(${v}^*) = ${S(maks.ikinci)} < 0$ → bu nokta gerçekten bir **maksimum**.\n\n` +
        String.raw`**4. Sonuç:** ${Pf ? String.raw`$P^* = ${S(Pf.f(Q))}$, ` : ""}$\pi^* = TR - TC = ${S(TR.f(Q))} - ${S(TC.f(Q))} = ${S(maks.y)}$.`;
      if (Pf) adim += `\n\nMonopol fiyatı marjinal maliyetin üstündedir: P* = ${B(Pf.f(Q), 6)} > MC = ${B(mc(Q), 6)}. Aradaki fark piyasa gücünün göstergesi (Lerner endeksi (P−MC)/P = ${B((Pf.f(Q) - mc(Q)) / Pf.f(Q), 4)}).`;
      const xb = Math.min(ust, Q * 2.2);
      return {
        satirlar, adimlar: adim.replace(SATIR, "\n"),
        grafikler: [
          { egriler: [{ f: mr, renk: "turuncu", ad: "MR", kisa: "MR" }, { f: mc, renk: "gri", ad: "MC", kisa: "MC" }, ...(Pf ? [{ f: Pf.f, renk: "soluk", kesikli: true, ad: "Talep P(Q)", kisa: "P" }] : [])], x: [0, xb], sadePozitif: true, noktalar: [{ x: Q, y: mr(Q), etiket: "MR = MC" }, ...(Pf ? [{ x: Q, y: Pf.f(Q), etiket: "P*" }] : [])], dikeyler: [{ x: Q }], eksen: { x: v } },
          { egriler: [{ f: PI.f, renk: "turuncu", ad: "Kâr π(Q)", kisa: "π" }], x: [0, xb], noktalar: [{ x: Q, y: maks.y, etiket: "π*" }], eksen: { x: v } },
        ],
        ozet: `Kâr maks: ${Pf ? "P(Q) = " + d.p : "TR = " + d.tr}, TC = ${d.tc}; Q*=${B(Q)}, π*=${B(maks.y)}`,
      };
    },
  });

  // ---------------------------------------------------------------- ESNEKLİK
  ekle({
    id: "esneklik", ad: "Talep esnekliği", grup: "turev", konu: 10,
    not: "Nokta esnekliği (türevle) ya da iki nokta arası yay esnekliği (orta nokta formülü). Aynı formül gelir esnekliği için de geçer.",
    alanlar: [
      { id: "mod", etiket: "Elimde ne var?", tur: "secim", v: "qp", secenekler: [["qp", "Q = f(P)"], ["pq", "P = f(Q)"], ["yay", "İki nokta"]] },
      { id: "f", etiket: "Talep fonksiyonu", tur: "ifade", v: "120 - 3P", kosul: (d) => d.mod !== "yay", ipucu: (d) => (d.mod === "pq" ? "P'yi Q cinsinden yaz" : "Q'yu P cinsinden yaz") },
      { id: "x0", etiket: "Hangi noktada?", tur: "sayi", v: "30", kosul: (d) => d.mod !== "yay", ipucu: (d) => (d.mod === "pq" ? "Q değeri" : "P değeri") },
      { id: "p1", etiket: "P₁", tur: "sayi", v: "10", yarim: true, kosul: (d) => d.mod === "yay" },
      { id: "q1", etiket: "Q₁", tur: "sayi", v: "100", yarim: true, kosul: (d) => d.mod === "yay" },
      { id: "p2", etiket: "P₂", tur: "sayi", v: "12", yarim: true, kosul: (d) => d.mod === "yay" },
      { id: "q2", etiket: "Q₂", tur: "sayi", v: "90", yarim: true, kosul: (d) => d.mod === "yay" },
    ],
    hesapla(d) {
      const yorum = (e) => {
        const a = Math.abs(e);
        if (a < 1e-9) return "Tam inelastik: miktar fiyata hiç tepki vermiyor.";
        if (Math.abs(a - 1) < 1e-6) return "Birim esnek (|ε| = 1): fiyat değişince toplam harcama DEĞİŞMEZ. Toplam gelir burada en büyüktür.";
        if (a > 1) return `Esnek (|ε| > 1): fiyat %1 artınca miktar %${B(a, 4)} düşer. Fiyat ARTIŞI toplam harcamayı AZALTIR; firma fiyatı düşürerek gelirini artırabilir.`;
        return `İnelastik (|ε| < 1): fiyat %1 artınca miktar yalnız %${B(a, 4)} düşer. Fiyat ARTIŞI toplam harcamayı ARTIRIR (ör. ilaç, akaryakıt).`;
      };
      if (d.mod === "yay") {
        const p1 = Motor.deger(d.p1), q1 = Motor.deger(d.q1), p2 = Motor.deger(d.p2), q2 = Motor.deger(d.q2);
        if (p1 === p2) throw new Error("İki fiyat farklı olmalı.");
        const e = ((q2 - q1) / ((q1 + q2) / 2)) / ((p2 - p1) / ((p1 + p2) / 2));
        return {
          satirlar: [satir("Yay esnekliği ε", B(e, 6), { ana: true }), satir("Yorum", yorum(e), { metin: true })],
          adimlar: String.raw`Orta nokta formülü (iki yönde aynı sonucu verir): $$\varepsilon = \frac{\dfrac{Q_2 - Q_1}{(Q_1 + Q_2)/2}}{\dfrac{P_2 - P_1}{(P_1 + P_2)/2}} = \frac{${S(q2 - q1)}/${S((q1 + q2) / 2)}}{${S(p2 - p1)}/${S((p1 + p2) / 2)}} = ${S(e)}$$`,
          fx: [fxAdim("Yay esnekliği (orta noktadaki ÷2'ler sadeleşir)", ["(", fxSayi(q2), "−", fxSayi(q1), ")", "÷", "(", fxSayi(q1), "+", fxSayi(q2), ")", "÷", "(", "(", fxSayi(p2), "−", fxSayi(p1), ")", "÷", "(", fxSayi(p1), "+", fxSayi(p2), ")", ")", "="], e)],
          ozet: `Yay esnekliği: (P,Q) = (${p1},${q1}) → (${p2},${q2}); ε = ${B(e)}`,
        };
      }
      const F = fonk(d.f, d.mod === "pq" ? "Q" : "P");
      const v = F.v;
      const d1 = Motor.turevDugum(F.dugum, v), f1 = Motor.derleDugum(d1, v);
      const x0 = Motor.deger(d.x0), y0 = F.f(x0), m = f1(x0);
      if (!Number.isFinite(y0) || y0 === 0) throw new Error("Bu noktada fonksiyon sıfır ya da tanımsız; esneklik hesaplanamaz.");
      let e, adim, P0, Q0;
      if (d.mod === "qp") {
        P0 = x0; Q0 = y0; e = m * P0 / Q0;
        adim = String.raw`$$\varepsilon = \frac{dQ}{dP}\cdot\frac{P}{Q}$$ $$\frac{dQ}{d${v}} = ${txd(d1, v)}$$ $P = ${S(P0)}$ iken $Q = ${S(Q0)}$: $$\varepsilon = ${S(m)}\cdot\frac{${S(P0)}}{${S(Q0)}} = ${S(e)}$$`;
      } else {
        Q0 = x0; P0 = y0;
        if (m === 0) throw new Error("dP/dQ = 0: talep yatay, esneklik sonsuz.");
        e = (1 / m) * P0 / Q0;
        adim = String.raw`Ters talepte $\dfrac{dQ}{dP} = \dfrac{1}{dP/dQ}$: $$\varepsilon = \frac{1}{dP/dQ}\cdot\frac{P}{Q}$$ $$\frac{dP}{d${v}} = ${txd(d1, v)}$$ $Q = ${S(Q0)}$ iken $P = ${S(P0)}$: $$\varepsilon = \frac{1}{${S(m)}}\cdot\frac{${S(P0)}}{${S(Q0)}} = ${S(e)}$$`;
      }
      const satirlar = [satir("Esneklik ε", B(e, 6), { ana: true }), satir("P, Q", `${B(P0, 6)},  ${B(Q0, 6)}`, { metin: true }), satir("Yorum", yorum(e), { metin: true })];
      // Birim esnek nokta (|ε| = 1)
      if (d.mod === "qp") {
        const epsF = (p) => f1(p) * p / F.f(p);
        const ustP = Motor.kokler(F.f, 0, 1e6)[0] || 1e4;
        const birim = Motor.kokler((p) => epsF(p) + 1, 1e-9, ustP * 0.999999);
        if (birim.length) {
          satirlar.push(satir("Birim esnek fiyat (|ε| = 1)", B(birim[0], 6)));
          adim += `\n\nTalep P = ${B(birim[0], 6)} fiyatında birim esnek; bu fiyatta toplam harcama (P·Q) en büyüktür. Daha yüksek fiyatlarda talep esnek, daha düşüklerde inelastiktir.`;
        }
      }
      adim += `\n\n**Yorum:** ${yorum(e)}`;
      const fx = [fxAdim(d.mod === "qp" ? "ε = (dQ/dP) × P ÷ Q" : "ε = (1 ÷ dP/dQ) × P ÷ Q",
        d.mod === "qp" ? [fxSayi(m), "×", fxSayi(P0), "÷", fxSayi(Q0), "="] : ["1", "÷", fxSayi(m), "×", fxSayi(P0), "÷", fxSayi(Q0), "="], e)];
      return { satirlar, adimlar: adim.replace(SATIR, "\n"), fx, fxNot: "Türevi kâğıtta alırsın; makineye yalnız sayılar kalır.", ozet: `Esneklik: ${d.mod === "qp" ? "Q" : "P"} = ${d.f}, nokta ${d.x0}; ε = ${B(e)}` };
    },
  });

  // ---------------------------------------------------------------- MARJİNAL / ORTALAMA
  ekle({
    id: "marjinal", ad: "Marjinal ve ortalama maliyet", grup: "turev", konu: 10,
    not: "Toplam maliyetten MC, AC, AVC; bir noktadaki marjinal maliyet ve ortalama maliyetin en düşük olduğu üretim (MC = AC).",
    alanlar: [
      { id: "c", etiket: "Toplam maliyet C(Q)", tur: "ifade", v: "0.1Q^3 - 2Q^2 + 15Q + 100" },
      { id: "q0", etiket: "Hangi üretimde? (Q₀)", tur: "sayi", v: "10" },
    ],
    hesapla(d) {
      const C = fonk(d.c, "Q");
      const v = C.v;
      const d1 = Motor.turevDugum(C.dugum, v), mc = Motor.derleDugum(d1, v);
      const FC = C.f(0);
      const ac = (q) => C.f(q) / q, avc = (q) => (C.f(q) - FC) / q;
      const q0 = Motor.deger(d.q0);
      if (!(q0 > 0)) throw new Error("Q₀ pozitif olmalı.");
      const satirlar = [satir(`MC(${v})`, Motor.duz(Motor.duzenle(d1, v)), { metin: true }), satir(`MC(${B(q0)})`, B(mc(q0)), { ana: true }),
        satir(`Gerçek ek maliyet C(${B(q0 + 1)}) − C(${B(q0)})`, B(C.f(q0 + 1) - C.f(q0))), satir(`AC(${B(q0)})`, B(ac(q0))), satir(`AVC(${B(q0)})`, B(avc(q0))), satir("Sabit maliyet FC = C(0)", Number.isFinite(FC) ? B(FC) : "tanımsız")];
      let adim = String.raw`$$MC(${v}) = C'(${v}) = ${txd(d1, v)}$$ $$AC(${v}) = \frac{C(${v})}{${v}}$$ $$AVC(${v}) = \frac{C(${v}) - FC}{${v}},\quad FC = C(0) = ${S(FC)}$$`;
      adim += `\n\n${v} = ${B(q0)} iken marjinal maliyet ${B(mc(q0), 6)}: bir birim daha üretmenin YAKLAŞIK ek maliyeti. Gerçek fark C(${B(q0 + 1)}) − C(${B(q0)}) = ${B(C.f(q0 + 1) - C.f(q0), 6)}; türev bunun doğrusal yaklaşımıdır.`;
      // AC ve AVC'nin minimumu
      const ust = Math.max(q0 * 10, 100);
      const acMin = Motor.ekstremum(Motor.fonkDugum(M.parse(`(${C.dugum.toString({ implicit: "show" })}) / ${v}`), v), 1e-6, ust).kritik.filter((k) => k.tur === "min")[0];
      const avcMin = Number.isFinite(FC) ? Motor.ekstremum(Motor.fonkDugum(M.parse(`((${C.dugum.toString({ implicit: "show" })}) - (${FC})) / ${v}`), v), 1e-6, ust).kritik.filter((k) => k.tur === "min")[0] : null;
      if (acMin) {
        satirlar.push(satir("AC'nin en düşük olduğu Q", B(acMin.x, 8)), satir("En düşük AC", B(acMin.y, 8)));
        adim += String.raw`\n\n**AC'nin en düşük noktası:** $\frac{d}{d${v}}\frac{C}{${v}} = \frac{${v}\,C' - C}{${v}^2} = 0 \iff MC = AC$. Bu da $${v} = ${S(acMin.x)}$, $AC = ${S(acMin.y)}$ verir. MC eğrisi AC'yi tam en düşük noktasından keser.`;
      }
      if (avcMin) adim += `\n\nAVC en düşük ${v} = ${B(avcMin.x, 6)} noktasında (AVC = ${B(avcMin.y, 6)}). Fiyat bunun altına düşerse firma kısa dönemde üretimi durdurur (kapanma noktası).`;
      const xb = Math.max(q0, acMin ? acMin.x : 0) * 2;
      return {
        satirlar, adimlar: adim.replace(SATIR, "\n"),
        grafikler: [{ egriler: [{ f: mc, renk: "turuncu", ad: "MC", kisa: "MC" }, { f: (q) => (q > 0 ? ac(q) : NaN), renk: "gri", ad: "AC", kisa: "AC" }, { f: (q) => (q > 0 ? avc(q) : NaN), renk: "soluk", kesikli: true, ad: "AVC", kisa: "AVC" }], x: [0, xb], y: null, sadePozitif: true, noktalar: [...(acMin ? [{ x: acMin.x, y: acMin.y, etiket: "min AC" }] : []), ...(avcMin ? [{ x: avcMin.x, y: avcMin.y, etiket: "min AVC", renk: "soluk" }] : [])], eksen: { x: v } }],
        ozet: `Maliyet: C = ${d.c}, Q0 = ${q0}; MC = ${B(mc(q0))}, AC = ${B(ac(q0))}`,
      };
    },
  });

  // ---------------------------------------------------------------- İNTEGRAL
  ekle({
    id: "integral", ad: "İntegral", grup: "integral", konu: 12,
    not: "Belirsiz integral (ilkel fonksiyon) ve sınırlar verilirse belirli integral. Üst sınıra ∞ yazabilirsin. Sınırları boş bırakırsan yalnız F(x) + C bulunur.",
    alanlar: [
      { id: "f", etiket: "f(x)", tur: "ifade", v: "3x^2 - 4x + 5" },
      { id: "a", etiket: "Alt sınır", tur: "sayi", v: "0", yarim: true },
      { id: "b", etiket: "Üst sınır", tur: "sayi", v: "2", yarim: true },
    ],
    hesapla(d) {
      const F = fonk(d.f);
      const v = F.v;
      const ilkel = Motor.belirsizIntegral(F);
      const satirlar = [satir("F(" + v + ") + C", ilkel ? Motor.duz(ilkel.dugum) + " + C" : "kapalı biçimde bulunamadı", { metin: true })];
      let adim = String.raw`$$\int ${tx(F)}\, d${v} = ${ilkel ? Motor.tex(ilkel.dugum) + " + C" : String.raw`\text{(temel fonksiyonlarla yazılamıyor)}`}$$`;
      if (ilkel) adim += String.raw`\n\nSağlama: $F'(${v}) = f(${v})$ olmalı — uygulama bunu sayısal olarak denetledi.`;
      else adim += "\n\nBu fonksiyonun ilkeli ya temel fonksiyonlarla yazılamıyor (ör. e^(x²)) ya da sembolik çözücünün sonucu sağlamadan geçemedi. Belirli integral yine de sayısal olarak hesaplanır.";
      const grafik = { egriler: [{ f: F.f, renk: "turuncu", ad: "f", kisa: "f" }], noktalar: [], eksen: { x: v } };
      if (!bos(d.a) && !bos(d.b)) {
        const a = Motor.deger(d.a), b = Motor.deger(d.b);
        const r = Motor.integralSayisal(F.f, a, b);
        if (r.tanimsiz || !Number.isFinite(r.deger)) throw new Error("Fonksiyon bu aralıkta tanımsız ya da sonsuz (ör. negatifin logu, sıfıra bölme). İntegral yakınsamıyor olabilir.");
        satirlar.unshift(satir(`∫ ${B(a)} → ${B(b)}`, B(r.deger, 10), { ana: true }));
        const isaret = Motor.kokler(F.f, Number.isFinite(a) ? a : -1e3, Number.isFinite(b) ? b : 1e3).filter((x) => x > Math.min(a, b) && x < Math.max(a, b));
        if (isaret.length && Number.isFinite(a) && Number.isFinite(b)) {
          const alan = Motor.integralSayisal((x) => Math.abs(F.f(x)), a, b).deger;
          satirlar.push(satir("Toplam alan ∫|f|", B(alan, 10)));
          adim += `\n\nf bu aralıkta ${isaret.map((x) => B(x, 5)).join(", ")} noktasında işaret değiştiriyor: x ekseninin altındaki parçalar integrale EKSİ katkı yapar. Net integral ${B(r.deger, 8)}, geometrik toplam alan ${B(alan, 8)}.`;
        }
        if (ilkel && Number.isFinite(a) && Number.isFinite(b)) {
          const Fa = ilkel.f(a), Fb = ilkel.f(b);
          adim += String.raw`\n\n**Analizin temel teoremi:** $$\int_{${S(a)}}^{${S(b)}} f\,d${v} = F(${S(b)}) - F(${S(a)}) = ${S(Fb)} - (${S(Fa)}) = ${S(Fb - Fa)}$$`;
        } else {
          adim += String.raw`\n\n$$\int_{${S(a)}}^{${b === Infinity ? String.raw`\infty` : S(b)}} f\,d${v} = ${S(r.deger)}$$` + (b === Infinity || a === -Infinity ? "\n\nSınırlardan biri sonsuz (has olmayan integral): sonuç sonluysa integral yakınsar." : "");
        }
        if (r.guvenilmez) adim += "\n\n⚠ Sayısal hata payı yüksek; fonksiyonun aralıkta kutbu olabilir.";
        const ga = Number.isFinite(a) ? a : b - 10, gb = Number.isFinite(b) ? b : a + Math.max(20, Math.abs(a) * 2);
        const pay = (gb - ga) * 0.15;
        grafik.x = [ga - pay, gb + pay];
        grafik.alanlar = [{ ust: F.f, alt: () => 0, a: ga, b: gb, renk: "alanTuruncu" }];
        grafik.dikeyler = [{ x: ga }, { x: gb }];
      } else grafik.x = [-5, 5];
      return { satirlar, adimlar: adim.replace(SATIR, "\n"), grafikler: [grafik], ozet: `İntegral: f = ${d.f}${bos(d.a) ? "" : `, [${d.a}, ${d.b}]`}` };
    },
  });

  // ---------------------------------------------------------------- ARTIKLAR
  ekle({
    id: "artik", ad: "Tüketici ve üretici artığı", grup: "integral", konu: 13,
    not: "Ters talep P = D(Q) ve ters arz P = S(Q) ver. Piyasa fiyatı verirsen o fiyattaki artıkları hesaplar, boş bırakırsan dengedekileri.",
    alanlar: [
      { id: "d", etiket: "Talep P = D(Q)", tur: "ifade", v: "120 - Q^2" },
      { id: "s", etiket: "Arz P = S(Q) (isteğe bağlı)", tur: "ifade", v: "20 + 3Q" },
      { id: "p0", etiket: "Piyasa fiyatı (isteğe bağlı)", tur: "sayi", v: "" },
    ],
    hesapla(d) {
      const D = fonk(d.d, "Q");
      const Sf = bos(d.s) ? null : fonk(d.s, D.v);
      const v = D.v;
      let Pp, Qd, Qs, adim = "";
      const satirlar = [];
      if (bos(d.p0)) {
        if (!Sf) throw new Error("Denge için arz fonksiyonu gerekir; ya arz yaz ya da piyasa fiyatı ver.");
        const q = kokAra((x) => D.f(x) - Sf.f(x));
        if (!q.length) throw new Error("Talep ve arz pozitif bölgede kesişmiyor.");
        Qd = Qs = q[0]; Pp = D.f(Qd);
        satirlar.push(satir(`Denge ${v}*`, B(Qd)), satir("Denge fiyatı P*", B(Pp)));
        adim += String.raw`**Denge:** $D(${v}) = S(${v})$: $$${tx(D)} = ${tx(Sf)} \;\Rightarrow\; ${v}^* = ${S(Qd)},\; P^* = ${S(Pp)}$$`;
      } else {
        Pp = Motor.deger(d.p0);
        const q = kokAra((x) => D.f(x) - Pp);
        if (!q.length) throw new Error("Bu fiyatta talep edilen miktar sıfır ya da yok.");
        Qd = q[0];
        if (Sf) { const qs = kokAra((x) => Sf.f(x) - Pp); Qs = qs.length ? qs[0] : 0; }
        satirlar.push(satir(`Talep edilen ${v}`, B(Qd)));
        if (Sf) satirlar.push(satir(`Arz edilen ${v}`, B(Qs)));
        adim += `Piyasa fiyatı P = ${B(Pp)}. Talep edilen miktar D(${v}) = ${B(Pp)} ⇒ ${v} = ${B(Qd, 8)}.`;
      }
      const intD = Motor.integralSayisal(D.f, 0, Qd).deger;
      const ta = intD - Pp * Qd;
      satirlar.unshift(satir("Tüketici artığı TA", B(ta, 10), { ana: true }));
      adim += String.raw`\n\n**Tüketici artığı** — tüketicilerin ödemeye razı olduğu ile ödediği arasındaki fark: $$TA = \int_0^{${S(Qd)}} D(${v})\,d${v} - P\,${v} = ${S(intD)} - ${S(Pp)}\cdot ${S(Qd)} = ${S(ta)}$$`;
      const ilkD = Motor.belirsizIntegral(D);
      if (ilkD) adim += String.raw`($\int D\,d${v} = ${Motor.tex(ilkD.dugum)}$)`;
      const grafik = { egriler: [{ f: D.f, renk: "turuncu", ad: "Talep", kisa: "D" }], x: [0, Math.max(Qd, Qs || 0) * 1.6], sadePozitif: true, noktalar: [{ x: Qd, y: Pp, etiket: bos(d.p0) ? "E" : "" }], yataylar: [{ y: Pp }], alanlar: [{ ust: D.f, alt: () => Pp, a: 0, b: Qd, renk: "alanTuruncu" }], eksen: { x: v, y: "P" } };
      if (Sf) {
        const q = bos(d.p0) ? Qd : Qs;
        const intS = Motor.integralSayisal(Sf.f, 0, q).deger;
        const ua = Pp * q - intS;
        satirlar.splice(1, 0, satir("Üretici artığı ÜA", B(ua, 10), { ana: true }), satir("Toplam artık", B(ta + ua, 10)));
        adim += String.raw`\n\n**Üretici artığı** — üreticilerin aldığı ile razı oldukları en düşük fiyat arasındaki fark: $$ÜA = P\,${v} - \int_0^{${S(q)}} S(${v})\,d${v} = ${S(Pp * q)} - ${S(intS)} = ${S(ua)}$$`;
        grafik.egriler.push({ f: Sf.f, renk: "gri", ad: "Arz", kisa: "S" });
        grafik.alanlar.push({ ust: () => Pp, alt: Sf.f, a: 0, b: q, renk: "alanGri" });
      }
      adim += "\n\nGrafikte turuncu alan tüketici, gri alan üretici artığı.";
      return { satirlar, adimlar: adim.replace(SATIR, "\n"), grafikler: [grafik], ozet: `Artık: D = ${d.d}${Sf ? ", S = " + d.s : ""}${bos(d.p0) ? "" : ", P = " + d.p0}; TA = ${B(ta)}` };
    },
  });

  // ---------------------------------------------------------------- MARJİNALDEN TOPLAMA
  ekle({
    id: "toplam", ad: "Marjinalden toplam fonksiyona", grup: "integral", konu: 14,
    not: "Marjinal maliyet (ya da gelir, tüketim eğilimi…) ve başlangıç değerinden toplam fonksiyonu kurar. İki üretim düzeyi verirsen aradaki toplam değişimi bulur.",
    alanlar: [
      { id: "f", etiket: "Marjinal fonksiyon, ör. MC(Q)", tur: "ifade", v: "3Q^2 - 12Q + 20" },
      { id: "c0", etiket: "Başlangıç değeri (Q = 0'da; maliyette sabit maliyet)", tur: "sayi", v: "50" },
      { id: "q1", etiket: "Q₁ (isteğe bağlı)", tur: "sayi", v: "2", yarim: true },
      { id: "q2", etiket: "Q₂ (isteğe bağlı)", tur: "sayi", v: "5", yarim: true },
    ],
    hesapla(d) {
      const F = fonk(d.f, "Q");
      const v = F.v;
      const c0 = Motor.deger(d.c0, 0);
      const ilkel = Motor.belirsizIntegral(F);
      const satirlar = [];
      let adim = String.raw`Toplam fonksiyon, marjinalin integralidir: $$T(${v}) = \int ${tx(F)}\,d${v} + C$$`;
      let T;
      if (ilkel) {
        const k = c0 - ilkel.f(0);
        T = (x) => ilkel.f(x) + k;
        const tam = M.simplify(M.parse(`${ilkel.dugum.toString({ implicit: "show" })} + ${Motor.yuvarla(k)}`));
        const yazi = Motor.duzenle(tam, v);
        satirlar.push(satir(`T(${v})`, Motor.duz(yazi), { metin: true, ana: true }));
        adim += String.raw`$$\int ${tx(F)}\,d${v} = ${Motor.tex(ilkel.dugum)} + C$$ Başlangıç koşulu $T(0) = ${S(c0)}$ ⇒ $C = ${S(k)}$: $$T(${v}) = ${Motor.tex(yazi)}$$`;
      } else {
        T = (x) => c0 + Motor.integralSayisal(F.f, 0, x).deger;
        satirlar.push(satir(`T(${v})`, "kapalı biçim yok; değerler sayısal", { metin: true }));
        adim += String.raw`Kapalı biçimde ilkel bulunamadı; $T(${v}) = ${S(c0)} + \int_0^{${v}} f$ sayısal olarak hesaplanır.`;
      }
      if (!bos(d.q1) && !bos(d.q2)) {
        const q1 = Motor.deger(d.q1), q2 = Motor.deger(d.q2);
        const deg = Motor.integralSayisal(F.f, q1, q2).deger;
        satirlar.unshift(satir(`${B(q1)} → ${B(q2)} toplam değişim`, B(deg, 10), { ana: true }));
        satirlar.push(satir(`T(${B(q1)})`, B(T(q1), 10)), satir(`T(${B(q2)})`, B(T(q2), 10)));
        adim += String.raw`\n\n**Üretim ${S(q1)}'den ${S(q2)}'ye çıkınca** toplamdaki değişim: $$\int_{${S(q1)}}^{${S(q2)}} ${tx(F)}\,d${v} = ${S(deg)}$$ Sabit (başlangıç) değer bu farkta yok olur — değişimi bulmak için sabit maliyeti bilmen gerekmez.`;
      }
      const xb = Math.max(10, bos(d.q2) ? 10 : Motor.deger(d.q2) * 1.4);
      return {
        satirlar, adimlar: adim.replace(SATIR, "\n"),
        grafikler: [{ egriler: [{ f: T, renk: "turuncu", ad: "Toplam T", kisa: "T" }, { f: F.f, renk: "gri", ad: "Marjinal", kisa: "marj." }], x: [0, xb], eksen: { x: v } }],
        ozet: `Marjinalden toplam: f = ${d.f}, T(0) = ${c0}${bos(d.q1) ? "" : `, aralık ${d.q1}→${d.q2}`}`,
      };
    },
  });

  // ---------------------------------------------------------------- GELİR AKIŞI BD
  ekle({
    id: "akim", ad: "Gelir akışının bugünkü değeri", grup: "integral", konu: 14,
    not: "Sürekli gelen bir gelir akışının (R(t), yılda) sürekli iskontoyla bugünkü değeri. Süreye ∞ yazarsan sonsuz akış (perpetüite).",
    alanlar: [
      { id: "r_t", etiket: "Gelir akışı R(t)", tur: "ifade", v: "5000 + 200t" },
      { id: "r", etiket: "Faiz % (sürekli)", tur: "sayi", v: "8", yarim: true },
      { id: "T", etiket: "Süre T (yıl)", tur: "sayi", v: "10", yarim: true },
    ],
    hesapla(d) {
      const R = fonk(d.r_t, "t");
      const v = R.v;
      const r = yuzdeOku(d.r, "Faiz"), T = Motor.deger(d.T);
      if (!(T > 0)) throw new Error("Süre pozitif olmalı.");
      const g = (t) => R.f(t) * Math.exp(-r * t);
      const pv = Motor.integralSayisal(g, 0, T);
      if (!Number.isFinite(pv.deger)) throw new Error("İntegral yakınsamıyor: akış iskontodan hızlı büyüyor olabilir.");
      const satirlar = [satir("Bugünkü değer", P(pv.deger), { ana: true })];
      if (Number.isFinite(T)) satirlar.push(satir("T anındaki gelecek değer", P(pv.deger * Math.exp(r * T))), satir("İskontosuz toplam gelir", P(Motor.integralSayisal(R.f, 0, T).deger)));
      let adim = String.raw`Her an gelen $R(${v})\,d${v}$ geliri, sürekli faizle $e^{-r${v}}$ çarpanıyla bugüne indirilir: $$PV = \int_0^{${Number.isFinite(T) ? S(T) : String.raw`\infty`}} R(${v})\,e^{-r${v}}\,d${v} = \int_0^{${Number.isFinite(T) ? S(T) : String.raw`\infty`}} \left(${tx(R)}\right)e^{-${S(r)}${v}}\,d${v} = ${S(pv.deger)}$$`;
      const sabit = Math.abs(R.f(0) - R.f(3.7)) < 1e-12 && Math.abs(R.f(0) - R.f(11.3)) < 1e-12;
      if (sabit) adim += String.raw`\n\nAkış sabitse kapalı formül: $$PV = R\,\frac{1 - e^{-rT}}{r}${!Number.isFinite(T) ? String.raw`\;\xrightarrow{T\to\infty}\; \frac{R}{r}` : ""}$$`;
      if (Number.isFinite(T)) adim += String.raw`\n\nGelecek değer $FV = e^{rT}\cdot PV = e^{${S(r * T)}}\cdot ${S(pv.deger)} = ${S(pv.deger * Math.exp(r * T))}$.`;
      const gb = Number.isFinite(T) ? T : Math.min(200, 6 / r);
      return {
        satirlar, adimlar: adim.replace(SATIR, "\n"),
        grafikler: [{ egriler: [{ f: R.f, renk: "gri", ad: "R(t)", kisa: "R" }, { f: g, renk: "turuncu", ad: "R(t)e^(−rt)", kisa: "iskontolu" }], x: [0, gb], sadePozitif: true, alanlar: [{ ust: g, alt: () => 0, a: 0, b: gb, renk: "alanTuruncu" }], eksen: { x: v } }],
        ozet: `Gelir akışı: R(t) = ${d.r_t}, r = %${r * 100}, T = ${d.T}; PV = ${P(pv.deger)}`,
      };
    },
  });

  const GRUPLAR = [
    { id: "temel", hafta: "1–3. hafta", ad: "Fonksiyonlar, doğrular, piyasa" },
    { id: "usel", hafta: "4. hafta", ad: "Üstel fonksiyon ve logaritma" },
    { id: "finans", hafta: "5–7. hafta", ad: "Finans matematiği ve büyüme" },
    { id: "turev", hafta: "9–11. hafta", ad: "Türev ve uygulamaları" },
    { id: "integral", hafta: "12–14. hafta", ad: "İntegral ve uygulamaları" },
    { id: "ek", hafta: "Ek", ad: "Matrisler" },
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
