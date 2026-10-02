// hesap.js — bilimsel hesap makinesi. İfade jeton dizisi olarak tutulur (⌫ "sin(" gibi bir birimi
// tek seferde siler), imleç jetonlar arasında gezer. Değerlendirme Motor.hesapla ile.
(function () {
  "use strict";
  const { depo, el, titret } = Uyg;

  const OK_SOL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"><path d="M14 6l-6 6 6 6"/></svg>';
  const OK_SAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"><path d="M10 6l6 6-6 6"/></svg>';
  const SIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 5h13v14H8l-6-7z"/><path d="m11.5 9 6 6M17.5 9l-6 6"/></svg>';

  // Tuş tablosu. j: eklenecek jeton, j2: 2nd ile eklenecek jeton.
  const TUSLAR = [
    { id: "kaydir", ana: "2nd", s: "turuncu kucuk kaydir-tus" },
    { id: "aci", ana: "DEG", s: "kucuk" },
    { id: "sol", ana: OK_SOL, s: "kucuk", etiket: "İmleç sola" },
    { id: "sag", ana: OK_SAG, s: "kucuk", etiket: "İmleç sağa" },
    { id: "gecmis", ana: "Geçmiş", s: "kucuk" },

    { ana: "sin", j: "sin(", ikinci: "sin⁻¹", j2: "sin⁻¹(" },
    { ana: "cos", j: "cos(", ikinci: "cos⁻¹", j2: "cos⁻¹(" },
    { ana: "tan", j: "tan(", ikinci: "tan⁻¹", j2: "tan⁻¹(" },
    { ana: "ln", j: "ln(", ikinci: "|x|", j2: "abs(" },
    { ana: "log", j: "log(", ikinci: "10ˣ", j2: "10^(" },

    { ana: "x<sup>2</sup>", j: "²", ikinci: "x³", j2: "³", etiket: "kare" },
    { ana: "x<sup>y</sup>", j: "^", ikinci: "ʸ√x", j2: "^(1/", etiket: "üs" },
    { ana: "√", j: "√(", ikinci: "∛", j2: "∛(" },
    { ana: "1/x", j: "⁻¹", ikinci: "n!", j2: "!" },
    { ana: "π", j: "π", ikinci: "e", j2: "e" },

    { ana: "(", j: "(" },
    { ana: ")", j: ")" },
    { ana: "%", j: "%" },
    { ana: "e<sup>x</sup>", j: "e^(", etiket: "e üssü" },
    { ana: "Ans", j: "Ans" },

    { ana: "7", j: "7", s: "acik" }, { ana: "8", j: "8", s: "acik" }, { ana: "9", j: "9", s: "acik" },
    { id: "sil", ana: SIL, etiket: "Sil" },
    { id: "ac", ana: "AC" },

    { ana: "4", j: "4", s: "acik" }, { ana: "5", j: "5", s: "acik" }, { ana: "6", j: "6", s: "acik" },
    { ana: "×", j: "×", s: "islem" }, { ana: "÷", j: "÷", s: "islem" },

    { ana: "1", j: "1", s: "acik" }, { ana: "2", j: "2", s: "acik" }, { ana: "3", j: "3", s: "acik" },
    { ana: "+", j: "+", s: "islem" }, { ana: "−", j: "−", s: "islem" },

    { ana: "0", j: "0", s: "acik" }, { ana: ".", j: ".", s: "acik" },
    { ana: "EXP", j: "E", etiket: "on üzeri" },
    { id: "esit", ana: "=", s: "turuncu esittir" },
  ];

  // Görünen jeton -> Motor sözdizimi
  const CEVIR = {
    // "E" (EXP) bitişik "e" olur ki 2E3 bilimsel gösterim okunsun; sabit e ise boşluklu kalır (2e3 ≠ 2·e·3)
    "×": "*", "÷": "/", "−": "-", "²": "^2", "³": "^3", "⁻¹": "^(-1)", "%": "/100", "π": "pi", "E": "e", "e": " e ",
    "√(": "sqrt(", "∛(": "cbrt(", "sin⁻¹(": "asin(", "cos⁻¹(": "acos(", "tan⁻¹(": "atan(",
  };
  const OPERATOR = new Set(["+", "−", "×", "÷", "^"]);

  const durum = {
    jeton: [], imlec: 0, kaydir: false, derece: depo.al("derece", true),
    ans: depo.al("ans", 0), bitti: false, gecmis: depo.al("gecmis", []),
  };

  let ifadeSatir, sonucSatir, tuslarKutu;

  function metin(jetonlar) {
    const s = jetonlar.map((j) => CEVIR[j] ?? j).join("");
    // Kapanmamış parantezleri tamamla
    let acik = 0;
    for (const c of s) { if (c === "(") acik++; else if (c === ")") acik = Math.max(0, acik - 1); }
    return s + ")".repeat(acik);
  }

  function degerlendir() {
    return Motor.hesapla(metin(durum.jeton), { derece: durum.derece, ans: durum.ans });
  }

  function ciz(sonucMod) {
    const once = durum.jeton.slice(0, durum.imlec).join(""), sonra = durum.jeton.slice(durum.imlec).join("");
    const yaz = (s) => Uyg.kacis(s).replace(/%/g, '<span class="yuzde">%</span>');
    ifadeSatir.innerHTML = yaz(once) + '<span class="imlec"></span>' + yaz(sonra);
    const imlec = ifadeSatir.querySelector(".imlec");
    if (imlec) {
      const sol = imlec.offsetLeft - ifadeSatir.clientWidth + 30;
      ifadeSatir.scrollLeft = Math.max(0, sol);
    }
    document.getElementById("isKaydir").classList.toggle("yanik", durum.kaydir);
    document.getElementById("isDeg").classList.toggle("yanik", durum.derece);
    document.getElementById("isRad").classList.toggle("yanik", !durum.derece);
    document.getElementById("isAns").classList.toggle("yanik", durum.jeton.includes("Ans"));
    tuslarKutu.classList.toggle("kaydirmali", durum.kaydir);
    tuslarKutu.querySelector('[data-id="aci"] .ana').textContent = durum.derece ? "DEG" : "RAD";

    sonucSatir.className = "sonuc-satir";
    if (sonucMod && sonucMod.hata) {
      sonucSatir.classList.add("hata");
      sonucSatir.textContent = sonucMod.hata;
      return;
    }
    if (sonucMod && sonucMod.kesin != null) {
      yazSonuc(sonucMod.kesin, false);
      return;
    }
    // Canlı önizleme: yalnız gerçekten bir işlem varsa
    if (!durum.jeton.length) { sonucSatir.textContent = durum.bitti ? "" : "0"; return; }
    const islemVar = durum.jeton.some((j) => OPERATOR.has(j) || /\($/.test(j) || ["²", "³", "⁻¹", "%", "!"].includes(j) || j === "Ans" || j === "π" || j === "e");
    if (!islemVar) { sonucSatir.textContent = ""; return; }
    try {
      const r = degerlendir();
      if (r && Number.isFinite(r.deger)) yazSonuc(r.deger, true);
      else sonucSatir.textContent = "";
    } catch (e) { sonucSatir.textContent = ""; }
  }

  function yazSonuc(x, onizleme) {
    const s = Motor.bicim(x, 12);
    sonucSatir.textContent = s;
    sonucSatir.classList.toggle("onizleme", onizleme);
    sonucSatir.classList.toggle("uzun", s.length > 11 && s.length <= 15);
    sonucSatir.classList.toggle("cok-uzun", s.length > 15);
  }

  function ekle(j) {
    if (durum.bitti) {
      // Sonuçtan sonra: işlemle devam ederse Ans'tan başla, rakamla başlarsa yeni ifade
      durum.jeton = OPERATOR.has(j) || ["²", "³", "⁻¹", "%", "!"].includes(j) ? ["Ans"] : [];
      durum.imlec = durum.jeton.length;
      durum.bitti = false;
    }
    durum.jeton.splice(durum.imlec, 0, j);
    durum.imlec++;
  }

  function esittir() {
    if (!durum.jeton.length) return ciz();
    let r;
    try { r = degerlendir(); }
    catch (e) { return ciz({ hata: "Söz dizimi hatası" }); }
    if (!r || r.bos) return ciz();
    if (!Number.isFinite(r.deger)) {
      return ciz({ hata: Number.isNaN(r.deger) ? "Tanımsız (ör. negatifin kökü, 0'ın logu)" : "Sonsuz — sıfıra bölme olabilir" });
    }
    const ifade = durum.jeton.join("");
    durum.ans = r.deger;
    depo.koy("ans", r.deger);
    durum.gecmis.unshift({ i: ifade, s: r.deger });
    durum.gecmis = durum.gecmis.slice(0, 60);
    depo.koy("gecmis", durum.gecmis);
    durum.bitti = true;
    ciz({ kesin: r.deger });
  }

  function bas(tus) {
    titret();
    const kaydirli = durum.kaydir;
    if (tus.id !== "kaydir") durum.kaydir = false;
    switch (tus.id) {
      case "kaydir": durum.kaydir = !kaydirli; return ciz();
      case "aci": durum.derece = !durum.derece; depo.koy("derece", durum.derece); return ciz();
      case "sol": durum.bitti = false; durum.imlec = Math.max(0, durum.imlec - 1); return ciz();
      case "sag": durum.bitti = false; durum.imlec = Math.min(durum.jeton.length, durum.imlec + 1); return ciz();
      case "gecmis": return gecmisAc();
      case "sil":
        if (durum.bitti) { durum.bitti = false; durum.imlec = durum.jeton.length; }
        if (durum.imlec > 0) { durum.jeton.splice(durum.imlec - 1, 1); durum.imlec--; }
        return ciz();
      case "ac": durum.jeton = []; durum.imlec = 0; durum.bitti = false; return ciz();
      case "esit": return esittir();
    }
    ekle(kaydirli && tus.j2 ? tus.j2 : tus.j);
    ciz();
  }

  // ---------------------------------------------------------------- geçmiş
  function gecmisAc() {
    const liste = document.getElementById("gecmisListe");
    liste.innerHTML = "";
    if (!durum.gecmis.length) liste.append(el("div", { class: "bos-not", text: "Henüz hesap yok. = tuşuna bastığın her işlem buraya düşer." }));
    for (const g of durum.gecmis) {
      liste.append(el("button", {
        class: "gecmis-ogesi",
        onclick: () => {
          durum.jeton = jetonla(g.i); durum.imlec = durum.jeton.length; durum.bitti = false;
          document.getElementById("gecmisCekmece").classList.remove("acik");
          ciz();
        },
      }, el("div", { class: "g-ifade", text: g.i }), el("div", { class: "g-sonuc", text: Motor.bicim(g.s, 12) })));
    }
    document.getElementById("gecmisCekmece").classList.add("acik");
  }

  // Kayıtlı metni yeniden jetonlara böl (en uzun jeton önce)
  const TUM_JETON = [...new Set(TUSLAR.flatMap((t) => [t.j, t.j2]).filter(Boolean))].sort((a, b) => b.length - a.length);
  function jetonla(s) {
    const out = [];
    let i = 0;
    while (i < s.length) {
      const j = TUM_JETON.find((t) => s.startsWith(t, i));
      if (j) { out.push(j); i += j.length; } else { out.push(s[i]); i++; }
    }
    return out;
  }

  // ---------------------------------------------------------------- klavye (masaüstünde deneme)
  const KLAVYE = { "*": "×", "/": "÷", "-": "−", "+": "+", "^": "^", "(": "(", ")": ")", ".": ".", ",": ".", "%": "%", "!": "!" };
  function klavye(e) {
    if (Uyg.rota !== "hesap" || e.target.matches("input, textarea")) return;
    if (/^\d$/.test(e.key)) { bas({ j: e.key }); return; }
    if (KLAVYE[e.key]) { bas({ j: KLAVYE[e.key] }); return; }
    if (e.key === "Enter" || e.key === "=") { e.preventDefault(); bas({ id: "esit" }); return; }
    if (e.key === "Backspace") { bas({ id: "sil" }); return; }
    if (e.key === "Delete") { bas({ id: "ac" }); return; }
    if (e.key === "ArrowLeft") { bas({ id: "sol" }); return; }
    if (e.key === "ArrowRight") { bas({ id: "sag" }); return; }
  }

  Uyg.kaydet("hesap", {
    kur() {
      ifadeSatir = document.getElementById("ifadeSatir");
      sonucSatir = document.getElementById("sonucSatir");
      tuslarKutu = document.getElementById("tuslar");
      for (const t of TUSLAR) {
        const b = el("button", {
          class: "tus " + (t.s || ""), "data-id": t.id || null, "data-ikinci": t.ikinci ? "1" : null,
          "aria-label": t.etiket || null, type: "button",
        });
        b.innerHTML = (t.ikinci ? `<span class="ikinci">${t.ikinci}</span>` : "") + `<span class="ana">${t.ana}</span>`;
        // pointerdown: dokunmatikte gecikmesiz tepki. click yedek olarak klavye/erişilebilirlik için.
        let dokundu = false;
        b.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse" && e.button !== 0) return; dokundu = true; bas(t); });
        b.addEventListener("click", () => { if (!dokundu) bas(t); dokundu = false; });
        tuslarKutu.append(b);
      }
      document.getElementById("gecmisKapat").addEventListener("click", () => document.getElementById("gecmisCekmece").classList.remove("acik"));
      document.getElementById("gecmisCekmece").addEventListener("click", (e) => { if (e.target.id === "gecmisCekmece") e.currentTarget.classList.remove("acik"); });
      document.getElementById("gecmisSil").addEventListener("click", () => { durum.gecmis = []; depo.koy("gecmis", []); gecmisAc(); });
      document.addEventListener("keydown", klavye);
      ciz();
    },
    goster() { ciz(); },
  });

  // Araçlardan hesap makinesine değer göndermek için
  Uyg.hesabaYaz = function (deger) {
    durum.jeton = jetonla(String(deger)); durum.imlec = durum.jeton.length; durum.bitti = false;
    Uyg.git("hesap");
  };
})();
