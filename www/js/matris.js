// matris.js — matris aracı (kendi arayüzü var). Girdiler kesre çevrilebiliyorsa TAM (kesirli)
// aritmetik; √2 gibi bir hücre varsa ondalık. Adımlar KaTeX ile kâğıda basılır.
(function () {
  "use strict";
  const { el, depo, isle } = Uyg;
  const L = window.L || ((tr) => tr);
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
    const kareSart = () => { if (!kare) throw new Error(L("Bu işlem için A kare matris olmalı (satır = sütun).", "This operation needs a square matrix A (rows = columns).")); };

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
        sonuc.adim = L("**Birinci satıra göre kofaktör açılımı** (işaretler + − +):", "**Cofactor expansion along the first row** (signs + − +):") +
          String.raw`$$\det A = ${terim.map((t) => `${t.j === 1 ? "-" : t.j ? "+" : ""}(${texSayi(t.a, ops)})${texMat(t.alt, ops).replace("bmatrix", "vmatrix").replace("bmatrix", "vmatrix")}`).join(" ")}$$` +
          String.raw`$$= ${terim.map((t) => `${t.j === 1 ? "-" : t.j ? "+" : ""}(${texSayi(t.a, ops)})(${texSayi(t.m, ops)})`).join(" ")} = ${texSayi(det, ops)}$$`;
      } else {
        const g = Motor.gaussJordan(A, ops);
        sonuc.adim = L("Büyük matriste satır indirgemesiyle: determinant, pivotların çarpımıdır (her satır değişimi işareti çevirir).", "For a large matrix, by row reduction: the determinant is the product of the pivots (each row swap flips the sign).") + `\n\n${g.adimlar.map((s) => "- " + s).join("\n")}`;
      }
      sonuc.adim += ops.sifirMi(det) ? L("\n\n**det A = 0:** matris TEKİL — tersi yok, satırlar birbirine bağımlı.", "\n\n**det A = 0:** the matrix is SINGULAR — no inverse, the rows are linearly dependent.") : L("\n\ndet A ≠ 0: matrisin tersi var, Ax = b sisteminin tek çözümü var.", "\n\ndet A ≠ 0: the matrix is invertible and Ax = b has a unique solution.");
    } else if (op === "ters") {
      kareSart();
      const t = Motor.matTers(A, ops);
      if (t.tekil) { sonuc.satirlar.push([L("Sonuç", "Result"), L("Tekil matris: tersi yok (det A = 0)", "Singular matrix: no inverse (det A = 0)"), false]); sonuc.adim = L("Gauss–Jordan sırasında bir sütunda pivot bulunamadı: satırlardan biri ötekilerin birleşimi.", "Gauss–Jordan found no pivot in some column: one row is a combination of the others."); }
      else {
        sonuc.matris = t.T;
        if (n === 2) {
          const det = Motor.matDet(A, ops);
          sonuc.adim = String.raw`$$A^{-1} = \frac{1}{ad - bc}\begin{bmatrix}d & -b\\-c & a\end{bmatrix} = \frac{1}{${texSayi(det, ops)}}\begin{bmatrix}${texSayi(A[1][1], ops)} & ${texSayi(ops.neg(A[0][1]), ops)}\\${texSayi(ops.neg(A[1][0]), ops)} & ${texSayi(A[0][0], ops)}\end{bmatrix} = ${texMat(t.T, ops)}$$`;
        } else sonuc.adim = L(String.raw`$[A \mid I]$ matrisine satır işlemleri uygulanıp sol taraf birim matrise çevrilir; sağda $A^{-1}$ kalır.`, String.raw`Row operations on $[A \mid I]$ turn the left side into the identity; $A^{-1}$ is left on the right.`) + "\n\n" + t.adimlar.map((s) => "- " + s).join("\n") + String.raw`$$A^{-1} = ${texMat(t.T, ops)}$$`;
        sonuc.adim += L(String.raw`\n\nSağlama: $A\,A^{-1} = I$.`, String.raw`\n\nCheck: $A\,A^{-1} = I$.`);
      }
    } else if (op === "devrik") {
      sonuc.matris = A[0].map((_, j) => A.map((r) => r[j]));
      sonuc.adim = L("Satırlar sütun olur: $(A^T)_{ij} = A_{ji}$.", "Rows become columns: $(A^T)_{ij} = A_{ji}$.");
    } else if (op === "rank") {
      const g = Motor.gaussJordan(A, ops);
      sonuc.satirlar.push(["rank A", String(g.rank), true]);
      sonuc.matris = g.R;
      sonuc.adim = L("İndirgenmiş satır eşelon biçime getirilir; sıfır olmayan satır sayısı rank'tır.", "Reduce to reduced row echelon form; the number of non-zero rows is the rank.") + `\n\n${g.adimlar.map((s) => "- " + s).join("\n")}` + String.raw`$$\text{RREF}(A) = ${texMat(g.R, ops)}$$`;
    } else if (op === "topla" || op === "cikar") {
      if (Bm.length !== m || Bm[0].length !== n) throw new Error(L("Toplama/çıkarmada A ile B aynı boyutta olmalı.", "For addition/subtraction A and B must have the same size."));
      sonuc.matris = A.map((r, i) => r.map((x, j) => (op === "topla" ? ops.topla(x, Bm[i][j]) : ops.cikar(x, Bm[i][j]))));
      sonuc.adim = op === "topla" ? L("Karşılıklı elemanlar toplanır.", "Corresponding elements are added.") : L("Karşılıklı elemanlar çıkarılır.", "Corresponding elements are subtracted.");
    } else if (op === "carp") {
      if (n !== Bm.length) throw new Error(L(`Çarpım için A'nın sütun sayısı (${n}) B'nin satır sayısına (${Bm.length}) eşit olmalı.`, `For multiplication the number of columns of A (${n}) must equal the number of rows of B (${Bm.length}).`));
      sonuc.matris = Motor.matCarp(A, Bm, ops);
      sonuc.adim = L(String.raw`$(AB)_{ij}$ = A'nın $i$. satırı ile B'nin $j$. sütununun iç çarpımı: $\sum_k a_{ik}b_{kj}$. Sonuç ${m}×${Bm[0].length}. Genelde $AB \neq BA$.`, String.raw`$(AB)_{ij}$ = the dot product of row $i$ of A and column $j$ of B: $\sum_k a_{ik}b_{kj}$. The result is ${m}×${Bm[0].length}. In general $AB \neq BA$.`);
    } else if (op === "skaler") {
      let k = null;
      if (ops === Motor.KESIR) { try { k = Motor.M.fraction(String(dur.k).trim().replace(",", ".")); } catch (e) { k = null; } }
      if (k == null) {
        // k kesre çevrilemiyorsa (ör. √2) ya da A zaten ondalıksa: ondalık hesap
        const kk = Motor.deger(dur.k);
        sonuc.ops = Motor.ONDALIK;
        sonuc.matris = A.map((r) => r.map((x) => kk * (typeof x === "number" ? x : Number(x.valueOf()))));
      } else sonuc.matris = A.map((r) => r.map((x) => ops.carp(k, x)));
      sonuc.adim = L("Her eleman k ile çarpılır.", "Every element is multiplied by k.");
    } else if (op === "coz" || op === "leontief") {
      kareSart();
      if (Bm.length !== n || Bm[0].length !== 1) throw new Error(L(`${B_GEREK[op]} tek sütunlu ve ${n} satırlı olmalı.`, `${B_GEREK[op]} must have one column and ${n} rows.`));
      let K = A, adim = "";
      if (op === "leontief") {
        K = A.map((r, i) => r.map((x, j) => ops.cikar(i === j ? ops.bir() : ops.sifir(), x)));
        adim = L(String.raw`**Girdi–çıktı modeli:** her sektörün üretimi = ara talep + nihai talep: $x = Ax + d$, yani $(I - A)x = d$. `, String.raw`**Input–output model:** each sector's output = intermediate demand + final demand: $x = Ax + d$, i.e. $(I - A)x = d$. `) + String.raw`$$I - A = ${texMat(K, ops)}$$`;
      }
      const genis = K.map((r, i) => r.concat([Bm[i][0]]));
      const gA = Motor.gaussJordan(K, ops), gG = Motor.gaussJordan(genis, ops);
      if (gA.rank < gG.rank) { sonuc.satirlar.push([L("Sonuç", "Result"), L("Çözüm yok (tutarsız)", "No solution (inconsistent)"), false]); sonuc.adim = adim + L("\n\nrank(A) < rank([A|b]): denklemler çelişiyor.", "\n\nrank(A) < rank([A|b]): the equations contradict each other."); return sonuc; }
      if (gA.rank < n) { sonuc.satirlar.push([L("Sonuç", "Result"), L("Sonsuz çözüm", "Infinitely many solutions"), false]); sonuc.adim = adim + L(`\n\nrank = ${gA.rank} < ${n}: serbest değişken var.`, `\n\nrank = ${gA.rank} < ${n}: there is a free variable.`); return sonuc; }
      const g = Motor.gaussJordan(genis, ops, n);
      const x = g.R.map((r) => r[n]);
      sonuc.matris = x.map((v) => [v]);
      x.forEach((v, i) => sonuc.satirlar.push([op === "leontief" ? L(`x${"₁₂₃₄₅"[i]} (${i + 1}. sektör üretimi)`, `x${"₁₂₃₄₅"[i]} (output of sector ${i + 1})`) : `x${"₁₂₃₄₅"[i]}`, yazSayi(v, ops), n <= 2]));
      if (op === "leontief") {
        const T = Motor.matTers(K, ops);
        adim += String.raw`$$(I - A)^{-1} = ${texMat(T.T, ops)}$$ $$x = (I - A)^{-1} d = ${texMat(sonuc.matris, ops)}$$` +
          L("\n\n$(I − A)^{-1}$ Leontief ters matrisidir: j. sütun, j. sektörün nihai talebi 1 birim artınca HER sektörün üretiminin ne kadar artması gerektiğini gösterir (dolaylı etkiler dahil).", "\n\n$(I − A)^{-1}$ is the Leontief inverse: column j shows how much EVERY sector's output must rise when final demand for sector j rises by 1 unit (indirect effects included).");
        if (x.some((v) => ops.sayi(v) < 0)) adim += L("\n\n⚠ Negatif üretim çıktı: bu ekonomi uygulanabilir değil (Hawkins–Simon koşulu sağlanmıyor).", "\n\n⚠ Negative output: this economy is not viable (the Hawkins–Simon condition fails).");
      } else if (n <= 4) {
        const det = Motor.matDet(K, ops);
        adim += L("**Cramer kuralı:** ", "**Cramer's rule:** ") + String.raw`$\det A = ${texSayi(det, ops)}$` + x.map((v, i) => {
          const Ai = K.map((r, ri) => r.map((q, ci) => (ci === i ? Bm[ri][0] : q)));
          return String.raw`$$x_{${i + 1}} = \frac{\det A_{${i + 1}}}{\det A} = \frac{${texSayi(Motor.matDet(Ai, ops), ops)}}{${texSayi(det, ops)}} = ${texSayi(v, ops)}$$`;
        }).join("") + L("\n\n($A_i$: A'nın i. sütunu yerine b yazılmış matris.)", "\n\n($A_i$: A with its i-th column replaced by b.)");
      }
      adim += L("\n\n**Satır işlemleri:**\n\n", "\n\n**Row operations:**\n\n") + g.adimlar.map((s) => "- " + s).join("\n");
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
        class: "yuva", value: v, inputmode: "decimal", "data-serit": "matris", "aria-label": L(`${adi} ${i + 1}. satır ${j + 1}. sütun`, `${adi} row ${i + 1} column ${j + 1}`),
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
      tus("−", () => { ayar(Math.max(1, r - 1), c); yeniden(); }, L("satır azalt", "fewer rows")), el("span", { text: L(`${r} satır`, `${r} rows`) }), tus("+", () => { ayar(Math.min(5, r + 1), c); yeniden(); }, L("satır artır", "more rows")),
    );
    if (adi === "A" || !["coz", "leontief"].includes(dur.op)) {
      kutu.append(tus("−", () => { ayar(r, Math.max(1, c - 1)); yeniden(); }, L("sütun azalt", "fewer columns")), el("span", { text: L(`${c} sütun`, `${c} cols`) }), tus("+", () => { ayar(r, Math.min(5, c + 1)); yeniden(); }, L("sütun artır", "more columns")));
    }
    return kutu;
  }

  function ciz(kok) {
    kok.innerHTML = "";
    const arac = el("div", { class: "arac" });
    arac.append(el("p", { class: "arac-not", text: L("Hücrelere tam sayı, ondalık ya da 1/3 gibi kesir yaz. Hepsi kesre çevrilebiliyorsa sonuç TAM çıkar (yuvarlama yok).", "Enter integers, decimals or fractions like 1/3. If every cell is a fraction, the result is EXACT (no rounding).") }));

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
        ["coz", "leontief"].includes(dur.op) ? el("span", { class: "arac-not", style: "margin-left:auto", text: dur.op === "leontief" ? L("nihai talep", "final demand") : L("sağ taraf", "right-hand side") }) :
          boyutTusu("B", dur.B, (r, c) => { dur.B = boyutla(dur.B, r, c); }, yeniden)));
      arac.append(izgara(bAd, dur.B, sakla));
    }
    if (dur.op === "skaler") {
      arac.append(el("label", { class: "alan" }, el("span", { text: "k" }),
        el("input", { class: "yuva", value: dur.k, inputmode: "decimal", "data-serit": "matris", oninput: (e) => { dur.k = e.target.value; sakla(); } })));
    }
    const cikti = el("div", { class: "cikti" });
    arac.append(el("div", { class: "dugmeler" },
      el("button", { class: "buyuk-tus", type: "button", text: L("Hesapla", "Compute"), onclick: () => { Uyg.titret(); sonucCiz(cikti); } }),
      el("button", { class: "buyuk-tus gri", type: "button", text: dur.kesir ? L("Kesir", "Fraction") : L("Ondalık", "Decimal"), "aria-label": L("Kesir ya da ondalık gösterim", "Fraction or decimal display"), onclick: (e) => { dur.kesir = !dur.kesir; e.currentTarget.textContent = dur.kesir ? L("Kesir", "Fraction") : L("Ondalık", "Decimal"); sakla(); sonucCiz(cikti); } }),
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
    if (s.ops === Motor.ONDALIK) ekran.append(el("div", { class: "cikti-satir metin" }, el("span", { class: "etiket", text: L("Hücrelerden biri kesre çevrilemedi; ondalık hesaplandı.", "One cell could not be read as a fraction; computed in decimals.") })));
    kutu.append(ekran);
    if (s.adim) {
      const kagit = el("div", { class: "kagit" });
      kagit.innerHTML = `<p class="adim-baslik">${L("Çözüm", "Solution")}</p>` + isle(s.adim.replace(/\\n(?![a-z])/g, "\n"));
      kutu.append(kagit);
    }
    const ozet = L("Matris işlemi: ", "Matrix operation: ") + `${ISLEMLER.find((x) => x[0] === dur.op)[1]}\nA = ${JSON.stringify(dur.A)}` + (B_GEREK[dur.op] ? `\n${B_GEREK[dur.op]} = ${JSON.stringify(dur.B)}` : "");
    kutu.append(el("div", { class: "dugmeler" }, el("button", { class: "buyuk-tus gri", style: "flex:1", type: "button", text: L("DeepSeek'e sor", "Ask DeepSeek"), onclick: () => Uyg.sorHazirla(ozet) })));
  }

  window.Matris = { ciz, hesapla, _dur: () => dur, _ayarla: (d) => { dur = Object.assign({}, VARSAYILAN, d); } };
})();
