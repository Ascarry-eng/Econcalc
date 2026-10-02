// sor.js — DeepSeek'e soru. Tarayıcıdan doğrudan api.deepseek.com (CORS açık), akışlı cevap.
// Anahtar yalnız localStorage'da; başka hiçbir yere gönderilmez.
(function () {
  "use strict";
  const { el, depo, isle, bildir } = Uyg;
  const ADRES = "https://api.deepseek.com/chat/completions";

  const L = window.L || ((tr) => tr);
  const SISTEM_TR = `Sen, iktisat bölümü birinci sınıf öğrencisine Mathematics I (ekonomi matematiği) dersinde yardım eden sabırlı bir öğretmensin. Ders İngilizce işleniyor; öğrenci Türk.

Kurallar:
- Türkçe cevap ver. Önemli terimlerin İngilizcesini ilk geçtiği yerde parantez içinde ver (ör. marjinal maliyet (marginal cost)), çünkü sınav İngilizce.
- Adım adım çöz; her adımda NE yaptığını ve NEDEN yaptığını bir cümleyle söyle. Sonucu en sonda açıkça yaz.
- Matematiği LaTeX ile yaz: satır içi $...$, ayrı satırda $$...$$. Ondalık ayırıcı olarak nokta kullan.
- Sayısal hesapları kontrol et; emin olmadığın yerde bunu söyle.
- Amaç öğrencinin yöntemi öğrenmesi: benzer soruyu sınavda kendisi çözebilsin. Uygun yerde kısa bir sezgi ya da iktisadi yorum ekle.
- Fotoğraf gelirse önce soruyu kendi cümlelerinle yaz (doğru okuduğunu teyit etmek için), sonra çöz.
- Gereksiz uzatma; kısa paragraflar ve gerekirse başlıklar kullan.

Dersin haftaları: 1 Matematiğe giriş; 2 Doğrusal denklemler ve iktisatta uygulamaları; 3 İkinci derece denklemler; 4 Üstel fonksiyon ve logaritma; 5–7 Finans matematiği ve büyüme; 8 Ara sınav; 9 Türev; 10–11 Türevin iktisatta uygulamaları; 12 İntegral; 13–14 İntegralin iktisatta uygulamaları; 15 Final.

Öğrencinin telefonunda "Marjinal" adlı bir hesap uygulaması var; araçları: grafik, denklem çözme, doğru denklemi, doğrusal sistem, piyasa dengesi ve vergi, başabaş, ikinci derece, logaritma, büyüme oranı, faiz, TVM, kredi tablosu, NBD/İVO, türev, maks/min, kâr maksimizasyonu, esneklik, marjinal/ortalama maliyet, integral, tüketici/üretici artığı, marjinalden toplam, gelir akışının bugünkü değeri, matris. Uygun olduğunda sonucu hangi araçla kontrol edebileceğini söyleyebilirsin.`;

  const SISTEM_EN = `You are a patient teacher helping a first-year economics student with Mathematics I (mathematics for economics). The course is taught in English; the student is Turkish.

Rules:
- Answer in English. The first time a key term appears you may add its Turkish equivalent in parentheses, e.g. marginal cost (marjinal maliyet).
- Solve step by step; at each step say in one sentence WHAT you do and WHY. State the final result clearly at the end.
- Write mathematics in LaTeX: inline $...$, display $$...$$. Use a dot as the decimal separator.
- Check your arithmetic; say so where you are not sure.
- The goal is for the student to learn the method and solve a similar exam question alone. Add a short intuition or economic interpretation where it helps.
- If a photo is sent, first restate the question in your own words (to confirm you read it correctly), then solve it.
- Keep it concise; use short paragraphs and headings where useful.

Course weeks: 1 Introduction to mathematics; 2 Linear equations and economic applications; 3 Quadratic equations; 4 Exponential functions and logarithms; 5–7 Mathematics of finance and growth; 8 Midterm; 9 Derivatives; 10–11 Applications of derivatives in economics; 12 Integration; 13–14 Applications of integration in economics; 15 Final.

The student has a calculator app called "Marjinal" on their phone with these tools: graph, equation solver, line equation, linear system, market equilibrium and tax, break-even, quadratic, logarithms, growth rate, interest, TVM, loan table, NPV/IRR, derivative, max/min, profit maximization, elasticity, marginal/average cost, integral, consumer/producer surplus, marginal to total, present value of an income stream, matrices. Where useful you can say which tool would check the result.`;
  const SISTEM = L(SISTEM_TR, SISTEM_EN);

  const ONERILER = L([
    "Bileşik faiz ile sürekli bileşik faiz arasındaki fark ne? Sınavda hangisini ne zaman kullanırım?",
    "MR = MC neden kârı en büyük yapar? Sezgisel olarak anlat.",
    "Tüketici artığını integralle nasıl hesaplarım? Basit bir örnekle göster.",
  ], [
    "What is the difference between compound and continuous compounding? When do I use which in the exam?",
    "Why does MR = MC maximize profit? Explain it intuitively.",
    "How do I compute consumer surplus with an integral? Show me a simple example.",
  ]);

  // mesaj: { rol: "user"|"assistant", metin, dusunce?, resim? (yalnız bellekte), resimVardi?, hata?, bilgi? }
  let mesajlar = depo.al("sohbet", []);
  let ek = null;
  let iptal = null;
  let sohbet, kaydir, alan, gonderTus;

  const kaydet = () => depo.koy("sohbet", mesajlar.slice(-40).map(({ resim, ...m }) => ({ ...m, resimVardi: m.resimVardi || !!resim })));
  const model = () => depo.al("model", "deepseek-flash");

  // ---------------------------------------------------------------- çizim
  function bosCiz() {
    const k = el("div", { class: "sor-bos" });
    if (!depo.al("anahtar", "")) {
      k.append(el("h2", { text: L("Önce DeepSeek anahtarını gir", "First enter your DeepSeek key") }),
        el("p", { text: L("Anahtar platform.deepseek.com → API keys bölümünden alınır. Bir kez girmen yeter; yalnız bu telefonda saklanır.", "Get a key at platform.deepseek.com → API keys. You only enter it once; it is stored only on this phone.") }),
        el("button", { class: "buyuk-tus", type: "button", text: L("Anahtarı gir", "Enter the key"), onclick: () => document.getElementById("ayarTus").click() }));
      return k;
    }
    k.append(el("h2", { text: L("Takıldığın yeri sor", "Ask where you're stuck") }),
      el("p", { text: L("Ödev sorusunun fotoğrafını çekip gönderebilirsin. Araçlardaki “DeepSeek'e sor” düğmesi de hesabı buraya taşır.", "You can photograph a homework question and send it. The “Ask DeepSeek” button in the tools also brings your calculation here.") }));
    for (const o of ONERILER) k.append(el("button", { class: "oneri", type: "button", text: o, onclick: () => { alan.value = o; boyutla(); alan.focus(); } }));
    return k;
  }

  function mesajCiz(m, i) {
    if (m.rol === "user") {
      const k = el("div", { class: "mesaj-sen" });
      if (m.resim) k.append(el("img", { src: m.resim, alt: L("Gönderilen fotoğraf", "Sent photo") }));
      else if (m.resimVardi) k.append(el("div", { class: "s-not", style: "color:var(--yazi-soluk);font-size:13px;margin-bottom:4px", text: L("[fotoğraf — uygulama kapanınca silindi]", "[photo — removed when the app closed]") }));
      k.append(document.createTextNode(m.metin));
      return k;
    }
    const k = el("div", { class: "mesaj-o", "data-i": i });
    if (m.dusunce) {
      const d = el("details", { class: "dusunce" }, el("summary", { text: m.metin ? L("Düşünme adımları", "Reasoning") : L("Düşünüyor…", "Thinking…") }), el("div", { class: "dusunce-ic", text: m.dusunce }));
      if (!m.metin && m.akiyor) d.open = true;
      k.append(d);
    }
    if (m.metin || m.akiyor) {
      const kg = el("div", { class: "kagit" + (m.akiyor ? " yaziyor" : "") });
      kg.innerHTML = m.metin ? isle(m.metin) : "";
      if (!m.metin && m.akiyor && !m.dusunce) kg.innerHTML = `<p style="color:var(--murekkep-soluk)">${L("Bağlanıyor…", "Connecting…")}</p>`;
      k.append(kg);
    }
    if (m.hata) k.append(el("div", { class: "mesaj-hata", text: m.hata }));
    if (!m.akiyor && (m.metin || m.bilgi)) {
      const alt = el("div", { class: "mesaj-alt" });
      if (m.metin) alt.append(el("button", { type: "button", text: L("Kopyala", "Copy"), onclick: () => kopyala(m.metin) }));
      if (m.bilgi) alt.append(el("span", { text: m.bilgi }));
      k.append(alt);
    }
    return k;
  }

  function hepsiniCiz() {
    sohbet.innerHTML = "";
    if (!mesajlar.length) { sohbet.append(bosCiz()); return; }
    mesajlar.forEach((m, i) => sohbet.append(mesajCiz(m, i)));
  }

  function sonuGuncelle() {
    const i = mesajlar.length - 1;
    const eski = sohbet.querySelector(`.mesaj-o[data-i="${i}"]`);
    const yeni = mesajCiz(mesajlar[i], i);
    // Açık/kapalı düşünce kutusu durumunu koru
    const eskiD = eski && eski.querySelector("details"), yeniD = yeni.querySelector("details");
    if (eskiD && yeniD && !mesajlar[i].metin) yeniD.open = eskiD.open;
    if (eski) eski.replaceWith(yeni); else sohbet.append(yeni);
    const altta = kaydir.scrollHeight - kaydir.scrollTop - kaydir.clientHeight < 140;
    if (altta) kaydir.scrollTop = kaydir.scrollHeight;
  }

  function kopyala(metin) {
    const bitti = () => bildir(L("Kopyalandı", "Copied"));
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(metin).then(bitti, () => eskiKopya(metin, bitti));
    else eskiKopya(metin, bitti);
  }
  function eskiKopya(metin, bitti) {
    const t = el("textarea", { style: "position:fixed;opacity:0" }); t.value = metin; document.body.append(t); t.select();
    try { document.execCommand("copy"); bitti(); } catch (e) { bildir(L("Kopyalanamadı", "Could not copy")); }
    t.remove();
  }

  // ---------------------------------------------------------------- gönderim
  function apiMesajlari() {
    const out = [{ role: "system", content: SISTEM }];
    for (const m of mesajlar) {
      if (m.hata && !m.metin) continue;
      if (m.rol === "user") {
        const metin = m.metin || (m.resim ? L("Bu fotoğraftaki soruyu çöz.", "Solve the question in this photo.") : "");
        if (m.resim) out.push({ role: "user", content: [{ type: "text", text: metin }, { type: "image_url", image_url: { url: m.resim } }] });
        else out.push({ role: "user", content: m.resimVardi ? metin + L("\n[Bu mesajda bir fotoğraf vardı, artık görünmüyor.]", "\n[This message had a photo that is no longer available.]") : metin });
      } else if (m.metin) out.push({ role: "assistant", content: m.metin });
    }
    return out;
  }

  async function gonder() {
    if (iptal) { iptal.abort(); return; }
    const metin = alan.value.trim();
    if (!metin && !ek) return;
    const anahtar = depo.al("anahtar", "");
    if (!anahtar) { bildir(L("Önce Ayarlar'dan DeepSeek anahtarını gir.", "First enter your DeepSeek key in Settings.")); document.getElementById("ayarTus").click(); return; }

    if (!mesajlar.length) sohbet.innerHTML = "";
    const kullanici = { rol: "user", metin, resim: ek ? ek.url : null };
    mesajlar.push(kullanici);
    sohbet.append(mesajCiz(kullanici, mesajlar.length - 1));
    alan.value = ""; boyutla(); ekTemizle();

    let secilen = model();
    let not = "";
    if (secilen !== "deepseek-flash" && mesajlar.some((m) => m.resim)) { secilen = "deepseek-flash"; not = L("Fotoğraf olduğu için Hızlı model kullanıldı. ", "Fast model used because of the photo. "); }
    const cevap = { rol: "assistant", metin: "", dusunce: "", akiyor: true };
    mesajlar.push(cevap);
    sonuGuncelle();
    kaydir.scrollTop = kaydir.scrollHeight;

    iptal = new AbortController();
    gonderTusDurum(true);
    const govde = { model: secilen, messages: apiMesajlari(), stream: true, stream_options: { include_usage: true }, max_tokens: 16000 };
    if (secilen !== "deepseek-flash") govde.reasoning_effort = depo.al("efor", "high");
    let kullanim = null;
    try {
      const r = await fetch(ADRES, {
        method: "POST", signal: iptal.signal,
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + anahtar },
        body: JSON.stringify(govde),
      });
      if (!r.ok) {
        const g = await r.text().catch(() => "");
        throw new Error(hataMetni(r.status, g));
      }
      const okuyucu = r.body.getReader();
      const coz = new TextDecoder();
      let tampon = "", son = 0;
      for (;;) {
        const { value, done } = await okuyucu.read();
        if (done) break;
        tampon += coz.decode(value, { stream: true });
        const satirlar = tampon.split("\n");
        tampon = satirlar.pop();
        for (const s of satirlar) {
          const t = s.trim();
          if (!t.startsWith("data:")) continue;
          const veri = t.slice(5).trim();
          if (veri === "[DONE]") continue;
          let j; try { j = JSON.parse(veri); } catch (e) { continue; }
          if (j.usage) kullanim = j.usage;
          const dl = j.choices && j.choices[0] && j.choices[0].delta;
          if (!dl) continue;
          if (dl.reasoning_content) cevap.dusunce += dl.reasoning_content;
          if (dl.content) cevap.metin += dl.content;
        }
        const simdi = Date.now();
        if (simdi - son > 120) { son = simdi; sonuGuncelle(); }
      }
      if (!cevap.metin) cevap.hata = L("Cevap boş geldi. Tekrar dene.", "The answer came back empty. Try again.");
    } catch (e) {
      if (e.name === "AbortError") cevap.bilgi = L("Durduruldu.", "Stopped.");
      else cevap.hata = e instanceof TypeError ? L("İnternete bağlanılamadı. Bağlantını kontrol et.", "Could not reach the internet. Check your connection.") : e.message;
    } finally {
      iptal = null;
      cevap.akiyor = false;
      const ad = secilen === "deepseek-flash" ? L("Hızlı", "Fast") : L("Derin", "Deep");
      if (!cevap.hata && !cevap.bilgi) cevap.bilgi = `${not}${ad} model${kullanim ? `, ${kullanim.total_tokens.toLocaleString(L("tr-TR", "en-US"))} ${L("token", "tokens")}` : ""}`;
      sonuGuncelle();
      kaydet();
      gonderTusDurum(false);
    }
  }

  function hataMetni(kod, govde) {
    let ayrinti = "";
    try { ayrinti = JSON.parse(govde).error.message; } catch (e) { ayrinti = govde.slice(0, 200); }
    if (kod === 401) return L("DeepSeek anahtarı reddetti (401). Ayarlar'dan anahtarı kontrol et.", "DeepSeek rejected the key (401). Check it in Settings.");
    if (kod === 402) return L("DeepSeek bakiyen bitmiş (402). platform.deepseek.com üzerinden yükleme yap.", "Your DeepSeek balance has run out (402). Top up at platform.deepseek.com.");
    if (kod === 429) return L("Çok sık istek gönderildi (429). Birkaç saniye bekleyip tekrar dene.", "Too many requests (429). Wait a few seconds and try again.");
    if (kod >= 500) return L(`DeepSeek şu an yanıt vermiyor (${kod}). Biraz sonra tekrar dene.`, `DeepSeek is not responding right now (${kod}). Try again later.`);
    return L(`DeepSeek ${kod} hatası: ${ayrinti}`, `DeepSeek error ${kod}: ${ayrinti}`);
  }

  function gonderTusDurum(akiyor) {
    gonderTus.setAttribute("aria-label", akiyor ? L("Durdur", "Stop") : L("Gönder", "Send"));
    gonderTus.innerHTML = akiyor
      ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"><path d="M12 20V5M5 11l7-7 7 7"/></svg>';
  }

  // ---------------------------------------------------------------- fotoğraf
  function resimOku(dosya) {
    if (!dosya) return;
    const okuyucu = new FileReader();
    okuyucu.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Uzun kenarı 1600 px'e indir: yükleme hızlansın, token az harcansın
        const olcek = Math.min(1, 1600 / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * olcek); c.height = Math.round(img.height * olcek);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        ek = { url: c.toDataURL("image/jpeg", 0.85) };
        const on = document.getElementById("ekOnizleme");
        on.querySelector("img").src = ek.url;
        on.classList.add("var");
      };
      img.onerror = () => bildir(L("Fotoğraf okunamadı.", "Could not read the photo."));
      img.src = okuyucu.result;
    };
    okuyucu.readAsDataURL(dosya);
  }
  function ekTemizle() {
    ek = null;
    document.getElementById("ekOnizleme").classList.remove("var");
    document.getElementById("kameraGirdi").value = "";
    document.getElementById("galeriGirdi").value = "";
  }

  function boyutla() {
    alan.style.height = "46px";
    alan.style.height = Math.min(140, alan.scrollHeight + 2) + "px";
  }

  function modelCiz() {
    document.querySelectorAll("#modelSecim button").forEach((b) => b.classList.toggle("secili", b.dataset.model === model()));
  }

  // ---------------------------------------------------------------- kurulum
  Uyg.kaydet("sor", {
    kur() {
      sohbet = document.getElementById("sohbet");
      kaydir = document.getElementById("sohbetKaydir");
      alan = document.getElementById("soruAlan");
      gonderTus = document.getElementById("gonderTus");
      gonderTus.addEventListener("click", gonder);
      alan.addEventListener("input", boyutla);
      document.getElementById("modelSecim").addEventListener("click", (e) => {
        const b = e.target.closest("button"); if (!b) return;
        depo.koy("model", b.dataset.model); modelCiz();
        bildir(b.dataset.model === "deepseek-flash" ? L("Hızlı: çabuk cevap, fotoğraf okur", "Fast: quick answers, reads photos") : L("Derin: daha uzun düşünür, yalnız metin", "Deep: thinks longer, text only"));
      });
      document.getElementById("yeniSohbet").addEventListener("click", () => {
        if (iptal) iptal.abort();
        mesajlar = []; kaydet(); ekTemizle(); hepsiniCiz();
      });
      document.getElementById("kameraTus").addEventListener("click", () => document.getElementById("kameraGirdi").click());
      document.getElementById("galeriTus").addEventListener("click", () => document.getElementById("galeriGirdi").click());
      document.getElementById("kameraGirdi").addEventListener("change", (e) => resimOku(e.target.files[0]));
      document.getElementById("galeriGirdi").addEventListener("change", (e) => resimOku(e.target.files[0]));
      document.getElementById("ekKaldir").addEventListener("click", ekTemizle);
      // Yarım kalmış (uygulama kapanırken akan) cevapları temizle
      mesajlar.forEach((m) => { if (m.akiyor) { m.akiyor = false; if (!m.metin) m.hata = L("Cevap yarım kaldı.", "The answer was cut off."); } });
      modelCiz();
      hepsiniCiz();
    },
    goster() {
      if (!mesajlar.length) hepsiniCiz();
      requestAnimationFrame(() => { kaydir.scrollTop = kaydir.scrollHeight; });
    },
  });

  // Araçlardan / konulardan soru hazırlama
  Uyg.sorHazirla = function (metin) {
    Uyg.git("sor");
    alan.value = metin;
    boyutla();
    alan.focus();
    alan.setSelectionRange(alan.value.length, alan.value.length);
    alan.scrollTop = alan.scrollHeight;
  };
})();
