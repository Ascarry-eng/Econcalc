// araclar.js — Araçlar sekmesi: hafta gruplu liste, araç formu, plazma çıktı + grafik + kâğıtta çözüm.
(function () {
  "use strict";
  const { el, depo, isle, titret } = Uyg;
  const L = window.L || ((tr) => tr);

  const MATRIS = { id: "matris", ad: L("Matris hesapları", "Matrix calculations"), grup: "ek", not: L("Determinant, ters, çarpım, Ax = b, Leontief girdi–çıktı modeli.", "Determinant, inverse, product, Ax = b, Leontief input–output model.") };
  const tumu = () => [...ARACLAR, MATRIS];
  const bul = (id) => tumu().find((a) => a.id === id);

  let kok;

  function listeCiz() {
    kok.innerHTML = "";
    const liste = el("div", { class: "liste" });
    for (const g of ARAC_GRUPLARI) {
      const ogeler = tumu().filter((a) => a.grup === g.id);
      if (!ogeler.length) continue;
      liste.append(el("div", { class: "grup-bas" }, el("span", { class: "hafta", text: g.hafta }), el("span", { text: g.ad })));
      for (const a of ogeler) {
        liste.append(el("button", { class: "satir", type: "button", onclick: () => { titret(); Uyg.git("araclar/" + a.id); } },
          el("div", null, el("div", { class: "s-ad", text: a.ad }), el("div", { class: "s-not", text: kisa(a.not) })),
          el("span", { class: "s-ok", "aria-hidden": "true" })));
      }
    }
    kok.append(liste);
  }

  // Listede notun ilk cümlesi yeter
  function kisa(not) { const m = String(not).match(/^[^.]*\./); return m ? m[0] : not; }

  function varsayilan(arac) {
    const d = {};
    for (const a of arac.alanlar) d[a.id] = a.v;
    return d;
  }

  function aracCiz(arac) {
    kok.innerHTML = "";
    if (arac.id === "matris") { Matris.ciz(kok); kok.scrollTop = 0; return; }
    const d = Object.assign(varsayilan(arac), depo.al("arac." + arac.id, {}));
    const kutu = el("div", { class: "arac" });
    kutu.append(el("p", { class: "arac-not", text: arac.not }));
    const alanlar = el("div", { class: "alanlar" });
    const cikti = el("div", { class: "cikti" });

    const sakla = () => depo.koy("arac." + arac.id, d);
    function alanlariCiz() {
      alanlar.innerHTML = "";
      for (const a of arac.alanlar) {
        if (a.kosul && !a.kosul(d)) continue;
        const etiket = el("span", { text: a.etiket });
        // Seçim alanı <label> OLMAMALI: etikete dokunmak içindeki ilk butonu tıklatır
        const alan = el(a.tur === "secim" ? "div" : "label", { class: "alan" + (a.yarim ? " yarim" : "") }, etiket);
        if (a.tur === "secim") {
          const s = el("div", { class: "secim", role: "group", "aria-label": a.etiket });
          for (const [v, yazi] of a.secenekler) {
            s.append(el("button", {
              type: "button", text: yazi, class: String(d[a.id]) === String(v) ? "secili" : null,
              onclick: (e) => { e.preventDefault(); d[a.id] = v; sakla(); alanlariCiz(); hesapla(); },
            }));
          }
          alan.append(s);
        } else {
          const ortak = {
            class: "yuva", autocomplete: "off", autocapitalize: "off", spellcheck: "false",
            placeholder: a.tur === "sayi" ? "" : null,
            oninput: (e) => { d[a.id] = e.target.value; sakla(); },
            onkeydown: (e) => { if (e.key === "Enter" && a.tur !== "metin") { e.preventDefault(); e.target.blur(); hesapla(); } },
          };
          let girdi;
          if (a.tur === "metin") girdi = el("textarea", { ...ortak, "data-serit": "metin", rows: 3 });
          else girdi = el("input", { ...ortak, type: "text", "data-serit": a.tur === "sayi" ? "sayi" : a.tur === "metin1" ? "metin" : "ifade", inputmode: a.tur === "sayi" ? "decimal" : "text" });
          girdi.value = d[a.id] == null ? "" : d[a.id];
          alan.append(girdi);
        }
        const ipucu = typeof a.ipucu === "function" ? a.ipucu(d) : a.ipucu;
        if (ipucu) alan.append(el("small", { text: ipucu }));
        alanlar.append(alan);
      }
    }

    function hesapla() {
      cikti.innerHTML = "";
      let r;
      try { r = AracYardim.calistir(arac, { ...d }); }
      catch (e) {
        cikti.append(el("div", { class: "ekran cikti-hata", text: e.message }));
        cikti.append(sorDugmesi(arac, d, null, e.message));
        return;
      }
      const ekran = el("div", { class: "ekran cikti-ekran" });
      for (const s of r.satirlar) {
        // Doto'da "%" işareti "X"e benziyor: yüzde işaretini düz yazı tipiyle bas
        const deger = el("span", { class: "deger", html: Uyg.kacis(s.deger).replace(/%/g, '<span class="yuzde">%</span>') });
        ekran.append(el("div", { class: "cikti-satir" + (s.ana ? " ana" : "") + (s.metin ? " metin" : "") },
          el("span", { class: "etiket", text: s.etiket }), deger));
      }
      cikti.append(ekran);
      if ((r.fx && r.fx.length) || r.fxNot) cikti.append(fxCiz(r));
      for (const g of r.grafikler || []) {
        try { cikti.append(Grafik.ciz(g)); } catch (e) { /* grafik çizilemezse sonuç yine görünsün */ }
      }
      if (r.tablo) {
        const t = el("table");
        t.append(el("thead", null, el("tr", null, r.tablo.basliklar.map((h) => el("th", { text: h })))));
        const tb = el("tbody");
        for (const row of r.tablo.satirlar) tb.append(el("tr", null, row.map((c) => el("td", { text: c }))));
        t.append(tb);
        cikti.append(el("div", { class: "ekran tablo-kutu" }, t));
      }
      if (r.adimlar) {
        const k = el("div", { class: "kagit" });
        k.innerHTML = `<p class="adim-baslik">${L("Çözüm", "Solution")}</p>` + isle(r.adimlar);
        cikti.append(k);
      }
      cikti.append(sorDugmesi(arac, d, r));
    }

    alanlariCiz();
    kutu.append(alanlar);
    kutu.append(el("div", { class: "dugmeler" },
      el("button", { class: "buyuk-tus", type: "button", text: L("Hesapla", "Compute"), onclick: () => { titret(); document.activeElement && document.activeElement.blur(); hesapla(); } }),
      el("button", { class: "buyuk-tus gri", type: "button", text: L("Örnek", "Example"), "aria-label": L("Örnek değerleri geri yükle", "Restore the example values"), onclick: () => { Object.assign(d, varsayilan(arac)); sakla(); alanlariCiz(); hesapla(); } }),
    ));
    kutu.append(cikti);
    kok.append(kutu);
    kok.scrollTop = 0;
    hesapla();
  }

  // fx-82ES tuş sırası: varsayılan KAPALI tek satır; açık/kapalı tercihi hatırlanır
  function fxCiz(r) {
    const kutu = el("details", { class: "fx" }, el("summary", { text: L("fx-82ES'te tuş sırası", "Key sequence on the fx-82ES") }));
    if (depo.al("fxAcik", false)) kutu.open = true;
    kutu.addEventListener("toggle", () => depo.koy("fxAcik", kutu.open));
    const ic = el("div", { class: "fx-ic" });
    const tum = (r.fx || []).flatMap((a) => a.tuslar);
    for (const a of r.fx || []) {
      const tuslar = el("div", { class: "fx-tuslar" });
      for (const t of a.tuslar) {
        const sinif = t === "=" ? "esit" : t === "→" ? "cik" : t === "SHIFT" ? "shift" : /^[\d.]+$/.test(t) ? "say" : "";
        tuslar.append(el("span", { class: "fx-tus " + sinif, text: t }));
      }
      tuslar.append(el("span", { class: "fx-sonuc", text: Motor.bicim(a.sonuc, 10) }));
      ic.append(el("div", null, el("div", { class: "fx-ne", text: a.ne }), tuslar));
    }
    const notlar = [];
    if (tum.includes("→")) notlar.push(L("→ sağ ok: üs ya da kök kutusundan çıkar. Unutursan sonra yazdığın her şey üssün içine girer.", "→ right arrow: leaves the exponent or root box. Forget it and everything you type next goes into the exponent."));
    if (tum.includes("x■")) notlar.push(L("x■ üs tuşu.", "x■ is the power key."));
    if (tum.includes("√■")) notlar.push(L("√■ karekök tuşu.", "√■ is the square root key."));
    if (tum.includes("SHIFT")) notlar.push(L("SHIFT ln = eˣ.", "SHIFT ln = eˣ."));
    if (tum.includes("(−)")) notlar.push(L("(−) eksi İŞARETİ tuşudur, çıkarma tuşu değil.", "(−) is the negative SIGN key, not the subtraction key."));
    if (r.fxNot) notlar.push(r.fxNot);
    if (notlar.length) ic.append(el("p", { class: "fx-not", text: notlar.join(" ") }));
    kutu.append(ic);
    return kutu;
  }

  function sorDugmesi(arac, d, r, hata) {
    const girdiler = arac.alanlar.filter((a) => !a.kosul || a.kosul(d)).map((a) => {
      const v = a.tur === "secim" ? (a.secenekler.find((s) => String(s[0]) === String(d[a.id])) || [0, d[a.id]])[1] : d[a.id];
      return `${a.etiket}: ${v === "" || v == null ? L("(boş)", "(empty)") : v}`;
    }).join("\n");
    const sonuc = r ? r.satirlar.map((s) => `${s.etiket}: ${s.deger}`).join("\n") : L(`Hata: ${hata}`, `Error: ${hata}`);
    const metin = L(`Marjinal'de “${arac.ad}” aracını kullandım.\n${girdiler}\n\nÇıkan sonuç:\n${sonuc}\n\nTakıldığım yer: `, `I used the “${arac.ad}” tool in Marjinal.\n${girdiler}\n\nResult:\n${sonuc}\n\nWhere I'm stuck: `);
    const k = el("div", { class: "dugmeler" },
      el("button", { class: "buyuk-tus gri", style: "flex:1", type: "button", text: L("DeepSeek'e sor", "Ask DeepSeek"), onclick: () => Uyg.sorHazirla(metin) }));
    if (arac.konu && window.KONULAR && KONULAR.find((x) => x.id === arac.konu)) {
      k.append(el("button", { class: "buyuk-tus gri", style: "flex:1", type: "button", text: L("Konuyu oku", "Read the topic"), onclick: () => Uyg.git("konular/" + arac.konu) }));
    }
    return k;
  }

  Uyg.kaydet("araclar", {
    kur() { kok = document.getElementById("aracKaydir"); },
    goster(alt) {
      const a = alt && bul(alt);
      if (a) aracCiz(a); else listeCiz();
    },
    baslik(alt) { const a = bul(alt); return a ? a.ad : ""; },
  });
})();
