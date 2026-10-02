// matris.js — matris aracı (kendi arayüzü var). Girdiler kesre çevrilebiliyorsa TAM (kesirli)
// aritmetik; √2 gibi bir hücre varsa ondalık. Adımlar KaTeX ile kâğıda basılır.
(function () {
  "use strict";
  const { el, depo, isle } = Uyg;
  const B = (x, b) => Motor.bicim(x, b);

  const ISLEMLER = [
    ["det", "det A"], ["ters", "A⁻¹"], ["devrik", "Aᵀ"], ["rank", "rank A"],
    ["topla", "A + B"], ["cikar", "A − B"], ["carp", "A · B"], ["skaler", "k · A"],
    ["coz", "Ax = b"], ["leontief", "Leontief"],
  ];
  const B_GEREK = { topla: "B", cikar: "B", carp: "B", coz: "b", leontief: "d" };

  const VARSAYILAN = {
    A: [["0.2", "0.3"], ["0.4", "0.1"]], B: [["100"], ["200"]], op: "leontief", k: "2", kesir: true,
  };
  let dur = Object.assign({}, VARSAYILAN, depo.al("matris", {}));
  const sakla = () => depo.koy("matris", dur);

  function boyutla(M, r, c) {
    const out = [];
    for (let i = 0; i < r; i++) { out.push([]); for (let j = 0; j < c; j++) out[i].push(M[i] && M[i][j] != null ? M[i][j] : "0"); }
    return out;
  }

  function texSayi(x, ops) {
    if (ops === Motor.KESIR) {
      const s = x.toFraction();
      const m = s.match(/^(-?)(\d+)\/(\d+)$/);
      return m ? `${m[1]}\\dfrac{${m[2]}}{${m[3]}}` : s;
    }
    return Motor.sayiTex(x);
  }
  const texMat = (M, ops) => String.raw`\begin{bmatrix}${M.map((r) => r.map((x) => texSayi(x, ops)).join(" & ")).join(String.raw`\\`)}\end{bmatrix}`;
  const yazSayi = (x, ops) => (dur.kesir && ops === Motor.KESIR ? ops.yaz(x) : B(ops.sayi(x), 8)).replace(/^-/, "−");

  function matrisKutusu(M, ops) {
    const k = el("div", { class: "matris-sonuc", style: `grid-template-columns: repeat(${M[0].length}, auto)` });
    for (const r of M) for (const x of r) k.append(el("span", { text: yazSayi(x, ops) }));
    return k;
  }

  // ---------------------------------------------------------------- hesap
  function hesapla() {
    const op = dur.op;
    const a = Motor.aritmetik(dur.A);
    const gerekB = B_GEREK[op];
    let b = null;
    if (gerekB) b = Motor.aritmetik(dur.B);
    // İki matristen biri ondalıksa ikisi de ondalık olsun
    let ops = a.ops, A = a.A, Bm = b ? b.A : null;
    if (b && a.kesirli !== b.kesirli) {
      ops = Motor.ONDALIK;
      A = a.A.map((r) => r.map((x) => (typeof x === "number" ? x : Number(x.valueOf()))));
      Bm = b.A.map((r) => r.map((x) => (typeof x === "number" ? x : Number(x.valueOf()))));
    }
    const m = A.length, n = A[0].length;
    const kare = m === n;
    const sonuc = { ops, satirlar: [], matris: null, adim: "" };
    const kareSart = () => { if (!kare) throw new Error("Bu işlem için A kare matris olmalı (satır = sütun)."); };

    if (op === "det") {
      kareSart();
      const det = Motor.matDet(A, ops);
      sonuc.satirlar.push(["det A", yazSayi(det, ops), true]);
      if (n === 2) sonuc.adim = String.raw`$$\det\begin{bmatrix}a&b\\c&d\end{bmatrix} = ad - bc = (${texSayi(A[0][0], ops)})(${texSayi(A[1][1], ops)}) - (${texSayi(A[0][1], ops)})(${texSayi(A[1][0], ops)}) = ${texSayi(det, ops)}$$`;
      else if (n === 3) {
        const terim = [0, 1, 2].map((j) => {
          const alt = A.slice(1).map((s) => s.filter((_, k) => k !== j));
          return { j, a: A[0][j], m: Motor.matDet(alt, ops), alt };
        });
        sonuc.adim = "**Birinci satıra göre kofaktör açılımı** (işaretler + − +):" +
          String.raw`$$\det A = ${terim.map((t) => `${t.j === 1 ? "-" : t.j ? "+" : ""}(${texSayi(t.a, ops)})${texMat(t.alt, ops).replace("bmatrix", "vmatrix").replace("bmatrix", "vmatrix")}`).join(" ")}$$` +
          String.raw`$$= ${terim.map((t) => `${t.j === 1 ? "-" : t.j ? "+" : ""}(${texSayi(t.a, ops)})(${texSayi(t.m, ops)})`).join(" ")} = ${texSayi(det, ops)}$$`;
      } else {
        const g = Motor.gaussJordan(A, ops);
        sonuc.adim = `Büyük matriste satır indirgemesiyle: determinant, pivotların çarpımıdır (her satır değişimi işareti çevirir).\n\n${g.adimlar.map((s) => "- " + s).join("\n")}`;
      }
      sonuc.adim += ops.sifirMi(det) ? "\n\n**det A = 0:** matris TEKİL — tersi yok, satırlar birbirine bağımlı." : "\n\ndet A ≠ 0: matrisin tersi var, Ax = b sisteminin tek çözümü var.";
    } else if (op === "ters") {
      kareSart();
      const t = Motor.matTers(A, ops);
      if (t.tekil) { sonuc.satirlar.push(["Sonuç", "Tekil matris: tersi yok (det A = 0)", false]); sonuc.adim = "Gauss–Jordan sırasında bir sütunda pivot bulunamadı: satırlardan biri ötekilerin birleşimi."; }
      else {
        sonuc.matris = t.T;
        if (n === 2) {
          const det = Motor.matDet(A, ops);
          sonuc.adim = String.raw`$$A^{-1} = \frac{1}{ad - bc}\begin{bmatrix}d & -b\\-c & a\end{bmatrix} = \frac{1}{${texSayi(det, ops)}}\begin{bmatrix}${texSayi(A[1][1], ops)} & ${texSayi(ops.neg(A[0][1]), ops)}\\${texSayi(ops.neg(A[1][0]), ops)} & ${texSayi(A[0][0], ops)}\end{bmatrix} = ${texMat(t.T, ops)}$$`;
        } else sonuc.adim = String.raw`$[A \mid I]$ matrisine satır işlemleri uygulanıp sol taraf birim matrise çevrilir; sağda $A^{-1}$ kalır.` + "\n\n" + t.adimlar.map((s) => "- " + s).join("\n") + String.raw`$$A^{-1} = ${texMat(t.T, ops)}$$`;
        sonuc.adim += String.raw`\n\nSağlama: $A\,A^{-1} = I$.`;
      }
    } else if (op === "devrik") {
      sonuc.matris = A[0].map((_, j) => A.map((r) => r[j]));
      sonuc.adim = "Satırlar sütun olur: $(A^T)_{ij} = A_{ji}$.";
    } else if (op === "rank") {
      const g = Motor.gaussJordan(A, ops);
      sonuc.satirlar.push(["rank A", String(g.rank), true]);
      sonuc.matris = g.R;
      sonuc.adim = `İndirgenmiş satır eşelon biçime getirilir; sıfır olmayan satır sayısı rank'tır.\n\n${g.adimlar.map((s) => "- " + s).join("\n")}` + String.raw`$$\text{RREF}(A) = ${texMat(g.R, ops)}$$`;
    } else if (op === "topla" || op === "cikar") {
      if (Bm.length !== m || Bm[0].length !== n) throw new Error("Toplama/çıkarmada A ile B aynı boyutta olmalı.");
      sonuc.matris = A.map((r, i) => r.map((x, j) => (op === "topla" ? ops.topla(x, Bm[i][j]) : ops.cikar(x, Bm[i][j]))));
      sonuc.adim = "Karşılıklı elemanlar " + (op === "topla" ? "toplanır." : "çıkarılır.");
    } else if (op === "carp") {
      if (n !== Bm.length) throw new Error(`Çarpım için A'nın sütun sayısı (${n}) B'nin satır sayısına (${Bm.length}) eşit olmalı.`);
      sonuc.matris = Motor.matCarp(A, Bm, ops);
      sonuc.adim = String.raw`$(AB)_{ij}$ = A'nın $i$. satırı ile B'nin $j$. sütununun iç çarpımı: $\sum_k a_{ik}b_{kj}$. Sonuç ${m}×${Bm[0].length}. Genelde $AB \neq BA$.`;
    } else if (op === "skaler") {
      let k = null;
      if (ops === Motor.KESIR) { try { k = Motor.M.fraction(String(dur.k).trim().replace(",", ".")); } catch (e) { k = null; } }
      if (k == null) {
        // k kesre çevrilemiyorsa (ör. √2) ya da A zaten ondalıksa: ondalık hesap
        const kk = Motor.deger(dur.k);
        sonuc.ops = Motor.ONDALIK;
        sonuc.matris = A.map((r) => r.map((x) => kk * (typeof x === "number" ? x : Number(x.valueOf()))));
      } else sonuc.matris = A.map((r) => r.map((x) => ops.carp(k, x)));
      sonuc.adim = "Her eleman k ile çarpılır.";
    } else if (op === "coz" || op === "leontief") {
      kareSart();
      if (Bm.length !== n || Bm[0].length !== 1) throw new Error(`${B_GEREK[op]} tek sütunlu ve ${n} satırlı olmalı.`);
      let K = A, adim = "";
      if (op === "leontief") {
        K = A.map((r, i) => r.map((x, j) => ops.cikar(i === j ? ops.bir() : ops.sifir(), x)));
        adim = String.raw`**Girdi–çıktı modeli:** her sektörün üretimi = ara talep + nihai talep: $x = Ax + d$, yani $(I - A)x = d$. $$I - A = ${texMat(K, ops)}$$`;
      }
      const genis = K.map((r, i) => r.concat([Bm[i][0]]));
      const gA = Motor.gaussJordan(K, ops), gG = Motor.gaussJordan(genis, ops);
      if (gA.rank < gG.rank) { sonuc.satirlar.push(["Sonuç", "Çözüm yok (tutarsız)", false]); sonuc.adim = adim + "\n\nrank(A) < rank([A|b]): denklemler çelişiyor."; return sonuc; }
      if (gA.rank < n) { sonuc.satirlar.push(["Sonuç", "Sonsuz çözüm", false]); sonuc.adim = adim + `\n\nrank = ${gA.rank} < ${n}: serbest değişken var.`; return sonuc; }
      const g = Motor.gaussJordan(genis, ops, n);
      const x = g.R.map((r) => r[n]);
      sonuc.matris = x.map((v) => [v]);
      x.forEach((v, i) => sonuc.satirlar.push([op === "leontief" ? `x${"₁₂₃₄₅"[i]} (${i + 1}. sektör üretimi)` : `x${"₁₂₃₄₅"[i]}`, yazSayi(v, ops), n <= 2]));
      if (op === "leontief") {
        const T = Motor.matTers(K, ops);
        adim += String.raw`$$(I - A)^{-1} = ${texMat(T.T, ops)}$$ $$x = (I - A)^{-1} d = ${texMat(sonuc.matris, ops)}$$` +
          "\n\n$(I − A)^{-1}$ Leontief ters matrisidir: j. sütun, j. sektörün nihai talebi 1 birim artınca HER sektörün üretiminin ne kadar artması gerektiğini gösterir (dolaylı etkiler dahil).";
        if (x.some((v) => ops.sayi(v) < 0)) adim += "\n\n⚠ Negatif üretim çıktı: bu ekonomi uygulanabilir değil (Hawkins–Simon koşulu sağlanmıyor).";
      } else if (n <= 4) {
        const det = Motor.matDet(K, ops);
        adim += String.raw`**Cramer kuralı:** $\det A = ${texSayi(det, ops)}$` + x.map((v, i) => {
          const Ai = K.map((r, ri) => r.map((q, ci) => (ci === i ? Bm[ri][0] : q)));
          return String.raw`$$x_{${i + 1}} = \frac{\det A_{${i + 1}}}{\det A} = \frac{${texSayi(Motor.matDet(Ai, ops), ops)}}{${texSayi(det, ops)}} = ${texSayi(v, ops)}$$`;
        }).join("") + "\n\n($A_i$: A'nın i. sütunu yerine b yazılmış matris.)";
      }
      adim += "\n\n**Satır işlemleri:**\n\n" + g.adimlar.map((s) => "- " + s).join("\n");
      sonuc.adim = adim;
    }
    return sonuc;
  }

  // ---------------------------------------------------------------- arayüz
  function izgara(adi, M, guncelle) {
    const r = M.length, c = M[0].length;
    const kutu = el("div", { class: "izgara", style: `grid-template-columns: repeat(${c}, minmax(0, 1fr))` });
    M.forEach((satir, i) => satir.forEach((v, j) => {
      kutu.append(el("input", {
        class: "yuva", value: v, inputmode: "decimal", "data-serit": "matris", "aria-label": `${adi} ${i + 1}. satır ${j + 1}. sütun`,
        autocomplete: "off", spellcheck: "false",
        oninput: (e) => { M[i][j] = e.target.value; guncelle(); },
        onfocus: (e) => e.target.select(),
      }));
    }));
    return kutu;
  }

  function boyutTusu(adi, M, ayar, yeniden) {
    const r = M.length, c = M[0].length;
    const tus = (metin, fn, etiket) => el("button", { type: "button", text: metin, "aria-label": etiket, onclick: fn });
    const kutu = el("div", { class: "boyut" });
    kutu.append(
      tus("−", () => { ayar(Math.max(1, r - 1), c); yeniden(); }, "satır azalt"), el("span", { text: `${r} satır` }), tus("+", () => { ayar(Math.min(5, r + 1), c); yeniden(); }, "satır artır"),
    );
    if (adi === "A" || !["coz", "leontief"].includes(dur.op)) {
      kutu.append(tus("−", () => { ayar(r, Math.max(1, c - 1)); yeniden(); }, "sütun azalt"), el("span", { text: `${c} sütun` }), tus("+", () => { ayar(r, Math.min(5, c + 1)); yeniden(); }, "sütun artır"));
    }
    return kutu;
  }

  function ciz(kok) {
    kok.innerHTML = "";
    const arac = el("div", { class: "arac" });
    arac.append(el("p", { class: "arac-not", text: "Hücrelere tam sayı, ondalık ya da 1/3 gibi kesir yaz. Hepsi kesre çevrilebiliyorsa sonuç TAM çıkar (yuvarlama yok)." }));

    // işlem seçimi
    const islem = el("div", { class: "islem-izgara" });
    for (const [id, ad] of ISLEMLER) {
      islem.append(el("button", {
        type: "button", text: ad, class: dur.op === id ? "secili" : null,
        onclick: () => {
          dur.op = id;
          const n = dur.A.length;
          if (["coz", "leontief"].includes(id)) { dur.A = boyutla(dur.A, n, n); dur.B = boyutla(dur.B, n, 1); }
          sakla(); ciz(kok);
        },
      }));
    }
    arac.append(islem);

    const yeniden = () => { sakla(); ciz(kok); };
    // A
    arac.append(el("div", { class: "matris-bas" }, el("span", { class: "ad", text: "A" }),
      boyutTusu("A", dur.A, (r, c) => {
        if (["coz", "leontief"].includes(dur.op)) { dur.A = boyutla(dur.A, r, r); dur.B = boyutla(dur.B, r, 1); }
        else dur.A = boyutla(dur.A, r, c);
      }, yeniden)));
    arac.append(izgara("A", dur.A, sakla));
    // B
    const bAd = B_GEREK[dur.op];
    if (bAd) {
      arac.append(el("div", { class: "matris-bas" }, el("span", { class: "ad", text: bAd }),
        ["coz", "leontief"].includes(dur.op) ? el("span", { class: "arac-not", style: "margin-left:auto", text: dur.op === "leontief" ? "nihai talep" : "sağ taraf" }) :
          boyutTusu("B", dur.B, (r, c) => { dur.B = boyutla(dur.B, r, c); }, yeniden)));
      arac.append(izgara(bAd, dur.B, sakla));
    }
    if (dur.op === "skaler") {
      arac.append(el("label", { class: "alan" }, el("span", { text: "k" }),
        el("input", { class: "yuva", value: dur.k, inputmode: "decimal", "data-serit": "matris", oninput: (e) => { dur.k = e.target.value; sakla(); } })));
    }
    const cikti = el("div", { class: "cikti" });
    arac.append(el("div", { class: "dugmeler" },
      el("button", { class: "buyuk-tus", type: "button", text: "Hesapla", onclick: () => { Uyg.titret(); sonucCiz(cikti); } }),
      el("button", { class: "buyuk-tus gri", type: "button", text: dur.kesir ? "Kesir" : "Ondalık", "aria-label": "Kesir ya da ondalık gösterim", onclick: (e) => { dur.kesir = !dur.kesir; e.currentTarget.textContent = dur.kesir ? "Kesir" : "Ondalık"; sakla(); sonucCiz(cikti); } }),
    ));
    arac.append(cikti);
    kok.append(arac);
    sonucCiz(cikti);
  }

  function sonucCiz(kutu) {
    kutu.innerHTML = "";
    let s;
    try { s = hesapla(); }
    catch (e) { kutu.append(el("div", { class: "ekran cikti-hata", text: e.message })); return; }
    const ekran = el("div", { class: "ekran cikti-ekran" });
    for (const [et, deg, ana] of s.satirlar) ekran.append(el("div", { class: "cikti-satir" + (ana ? " ana" : "") }, el("span", { class: "etiket", text: et }), el("span", { class: "deger", text: deg })));
    if (s.matris) ekran.append(matrisKutusu(s.matris, s.ops));
    if (s.ops === Motor.ONDALIK) ekran.append(el("div", { class: "cikti-satir metin" }, el("span", { class: "etiket", text: "Hücrelerden biri kesre çevrilemedi; ondalık hesaplandı." })));
    kutu.append(ekran);
    if (s.adim) {
      const kagit = el("div", { class: "kagit" });
      kagit.innerHTML = '<p class="adim-baslik">Çözüm</p>' + isle(s.adim.replace(/\\n(?![a-z])/g, "\n"));
      kutu.append(kagit);
    }
    const ozet = `Matris işlemi: ${ISLEMLER.find((x) => x[0] === dur.op)[1]}\nA = ${JSON.stringify(dur.A)}` + (B_GEREK[dur.op] ? `\n${B_GEREK[dur.op]} = ${JSON.stringify(dur.B)}` : "");
    kutu.append(el("div", { class: "dugmeler" }, el("button", { class: "buyuk-tus gri", style: "flex:1", type: "button", text: "DeepSeek'e sor", onclick: () => Uyg.sorHazirla(ozet) })));
  }

  window.Matris = { ciz, hesapla, _dur: () => dur, _ayarla: (d) => { dur = Object.assign({}, VARSAYILAN, d); } };
})();
