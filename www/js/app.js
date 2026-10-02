// app.js — yönlendirme, kalıcı depo, ortak yardımcılar, Markdown+KaTeX işleyici, Android geri tuşu.
(function () {
  "use strict";

  // ---------------------------------------------------------------- depo (localStorage; erişim atabilir)
  const ON = "marjinal.";
  const depo = {
    al(k, varsayilan) {
      try { const v = localStorage.getItem(ON + k); return v == null ? varsayilan : JSON.parse(v); }
      catch (e) { return varsayilan; }
    },
    koy(k, v) { try { localStorage.setItem(ON + k, JSON.stringify(v)); } catch (e) { /* dolu ya da kapalı */ } },
    sil(k) { try { localStorage.removeItem(ON + k); } catch (e) { /* */ } },
  };

  // ---------------------------------------------------------------- küçük DOM yardımcıları
  function el(etiket, ozellik, ...cocuklar) {
    const e = document.createElement(etiket);
    if (ozellik) for (const [k, v] of Object.entries(ozellik)) {
      if (v == null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "html") e.innerHTML = v;
      else if (k === "text") e.textContent = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    for (const c of cocuklar.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
    return e;
  }
  const kacis = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let bildirimZaman = 0;
  function bildir(metin, sure = 2200) {
    const b = document.getElementById("bildirim");
    b.textContent = metin;
    b.classList.add("acik");
    clearTimeout(bildirimZaman);
    bildirimZaman = setTimeout(() => b.classList.remove("acik"), sure);
  }

  function titret() {
    if (depo.al("titresim", true) && navigator.vibrate) { try { navigator.vibrate(7); } catch (e) { /* */ } }
  }

  // ---------------------------------------------------------------- Markdown + KaTeX (güvenli)
  // Yapay zekâ cevabı da buradan geçer: ham HTML kaçışlanır, yalnız http(s) bağlantı, resim yok.
  // (WebView'de JS açık; bir fotoğraftaki gizli talimat <img onerror> ürettirip anahtarı sızdıramasın.)
  if (window.marked) {
    marked.use({
      gfm: true, breaks: false,
      renderer: {
        html(t) { return kacis(t.raw != null ? t.raw : t.text || ""); },
        image(t) { return kacis(t.text || ""); },
        link(t) {
          const yazi = this.parser.parseInline(t.tokens);
          return /^https?:\/\//i.test(t.href || "") ? `<a href="${kacis(t.href)}" target="_blank" rel="noopener">${yazi}</a>` : yazi;
        },
      },
    });
  }

  function formul(tex, blok) {
    try { return katex.renderToString(tex, { displayMode: blok, throwOnError: false, output: "html", strict: "ignore" }); }
    catch (e) { return kacis(tex); }
  }

  function isle(md) {
    const parca = [];
    const yer = (m, blok) => { parca.push({ m, blok }); return `\u0001M${parca.length - 1}\u0001`; };
    let t = String(md || "");
    // Kod bloklarını formülden önce koru
    const kodlar = [];
    t = t.replace(/```[\s\S]*?```/g, (k) => { kodlar.push(k); return `\u0002K${kodlar.length - 1}\u0002`; });
    // Blok formülün etrafına satır sonu EKLENMEZ: "> $$...$$" alıntı (formül kutusu) içinde kalabilsin
    t = t.replace(/\$\$([\s\S]+?)\$\$/g, (_, m) => yer(m, true))
      .replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => yer(m, true))
      .replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => yer(m, false))
      .replace(/(^|[^\\$])\$(?!\s)((?:[^$\n\\]|\\.)+?)(?<!\s)\$(?!\d)/g, (_, on, m) => on + yer(m, false));
    t = t.replace(/\u0002K(\d+)\u0002/g, (_, i) => kodlar[i]);
    let html = window.marked ? marked.parse(t) : kacis(t);
    html = html.replace(/<p>\s*\u0001M(\d+)\u0001\s*<\/p>/g, (_, i) => formul(parca[i].m, true));
    html = html.replace(/\u0001M(\d+)\u0001/g, (_, i) => formul(parca[i].m, parca[i].blok));
    return html;
  }

  // ---------------------------------------------------------------- yönlendirme
  // rota: "hesap" | "araclar" | "araclar/<id>" | "konular" | "konular/<id>" | "sor"
  const gorunumler = {};   // mod -> { goster(alt), baslik(alt) }
  let rota = "hesap";

  function kaydet(mod, nesne) { gorunumler[mod] = nesne; }

  function git(yeni, { gecmiseYazma } = {}) {
    rota = yeni;
    const [mod, alt] = yeni.split("/");
    document.querySelectorAll(".gorunum").forEach((g) => g.classList.toggle("aktif", g.id === "v-" + mod));
    document.querySelectorAll(".mod-tus").forEach((b) => b.classList.toggle("aktif", b.dataset.mod === mod));
    const g = gorunumler[mod];
    if (g && g.goster) g.goster(alt);
    const plaka = document.getElementById("plaka");
    const baslik = alt && g && g.baslik ? g.baslik(alt) : "";
    plaka.classList.toggle("icerde", !!alt);
    document.getElementById("plakaBaslik").textContent = baslik;
    if (!gecmiseYazma) depo.koy("rota", mod === "hesap" || mod === "sor" ? mod : yeni);
    serit.kapat();
  }

  // Android geri tuşu: true dönerse uygulama içinde işlendi, false ise uygulama kapanır.
  window.geriTusu = function () {
    const panel = document.getElementById("ayarPanel");
    if (panel.classList.contains("acik")) { panel.classList.remove("acik"); return true; }
    const cekmece = document.querySelector(".cekmece.acik");
    if (cekmece) { cekmece.classList.remove("acik"); return true; }
    if (document.getElementById("serit").classList.contains("acik")) { document.activeElement && document.activeElement.blur(); serit.kapat(); return true; }
    const [mod, alt] = rota.split("/");
    if (alt) { git(mod); return true; }
    if (mod !== "hesap") { git("hesap"); return true; }
    return false;
  };

  // ---------------------------------------------------------------- ifade alanları için yardımcı tuş şeridi
  // Telefon klavyesinde ^ ( ) gizli; bir ifade alanı odaklanınca altta matematik tuşları çıkar.
  // data-serit="ifade" | "sayi" | "matris" | "metin" (metin: denklem kutusu, = de lazım)
  const SERITLER = {
    ifade: ["x", "^", "(", ")", "*", "/", "-", "e^(", "ln(", "√(", "Q", "P", "t", "."],
    metin: ["=", "x", "y", "^", "(", ")", "*", "/", "-", "P", "Q", "."],
    sayi: ["-", "/", ".", "(", ")", "^", "e", "π", "∞"],
    matris: ["-", "/", ".", "(", ")", "√("],
  };
  const serit = {
    hedef: null,
    tur: null,
    kur() {
      const s = document.getElementById("serit");
      document.addEventListener("focusin", (e) => {
        const t = e.target;
        if (!(t.matches && t.matches("[data-serit]"))) return;
        this.hedef = t;
        const tur = t.dataset.serit;
        if (tur !== this.tur) {
          s.innerHTML = "";
          for (const j of SERITLER[tur] || []) {
            s.append(el("button", { type: "button", text: j, onpointerdown: (ev) => { ev.preventDefault(); this.ekle(j); } }));
          }
          this.tur = tur;
        }
        s.classList.add("acik");
      });
      document.addEventListener("focusout", () => {
        setTimeout(() => { if (!document.activeElement || !document.activeElement.matches("[data-serit]")) this.kapat(); }, 120);
      });
      // Klavye açılınca görsel alan küçülür; şeridi klavyenin hemen üstüne taşı
      if (window.visualViewport) {
        const yerlestir = () => {
          const vv = window.visualViewport;
          s.style.bottom = Math.max(0, window.innerHeight - vv.height - vv.offsetTop) + "px";
        };
        visualViewport.addEventListener("resize", yerlestir);
        visualViewport.addEventListener("scroll", yerlestir);
      }
    },
    ekle(metin) {
      const g = this.hedef;
      if (!g) return;
      const a = g.selectionStart ?? g.value.length, b = g.selectionEnd ?? g.value.length;
      g.value = g.value.slice(0, a) + metin + g.value.slice(b);
      const yeni = a + metin.length;
      g.setSelectionRange(yeni, yeni);
      g.dispatchEvent(new Event("input", { bubbles: true }));
    },
    kapat() { document.getElementById("serit").classList.remove("acik"); },
  };

  // ---------------------------------------------------------------- ayarlar
  function ayarlariKur() {
    const panel = document.getElementById("ayarPanel");
    const alan = document.getElementById("anahtarAlan");
    const durum = document.getElementById("anahtarDurum");
    document.getElementById("ayarTus").addEventListener("click", () => {
      alan.value = depo.al("anahtar", "") || "";
      durum.textContent = alan.value ? "Kayıtlı bir anahtar var." : "Henüz anahtar yok.";
      panel.classList.add("acik");
    });
    document.getElementById("ayarKapat").addEventListener("click", () => panel.classList.remove("acik"));
    document.getElementById("anahtarGoster").addEventListener("click", (e) => {
      alan.type = alan.type === "password" ? "text" : "password";
      e.currentTarget.textContent = alan.type === "password" ? "Göster" : "Gizle";
    });
    document.getElementById("anahtarKaydet").addEventListener("click", async () => {
      const k = alan.value.trim();
      depo.koy("anahtar", k);
      if (!k) { durum.textContent = "Anahtar silindi."; return; }
      durum.textContent = "Sınanıyor…";
      try {
        const r = await fetch("https://api.deepseek.com/models", { headers: { Authorization: "Bearer " + k } });
        durum.textContent = r.ok ? "Kaydedildi, anahtar çalışıyor." : r.status === 401 ? "Kaydedildi ama DeepSeek anahtarı reddetti (401). Doğru kopyaladığından emin ol." : `Kaydedildi; DeepSeek ${r.status} döndü.`;
      } catch (e) {
        durum.textContent = "Kaydedildi; internet olmadığı için sınanamadı.";
      }
    });
    const secimKur = (id, anahtar, varsayilan, cevir = (v) => v) => {
      const kutu = document.getElementById(id);
      const yenile = () => {
        const v = String(depo.al(anahtar, varsayilan));
        kutu.querySelectorAll("button").forEach((b) => b.classList.toggle("secili", String(cevir(b.dataset.v)) === v));
      };
      kutu.addEventListener("click", (e) => {
        const b = e.target.closest("button"); if (!b) return;
        depo.koy(anahtar, cevir(b.dataset.v)); yenile();
      });
      yenile();
    };
    secimKur("titresimSecim", "titresim", true, (v) => v === "1" || v === true);
    secimKur("eforSecim", "efor", "high");
  }

  // ---------------------------------------------------------------- başlat
  function basla() {
    document.getElementById("modlar").addEventListener("click", (e) => {
      const b = e.target.closest(".mod-tus"); if (!b) return;
      titret();
      git(b.dataset.mod);
    });
    document.getElementById("geriTus").addEventListener("click", () => window.geriTusu());
    serit.kur();
    ayarlariKur();
    for (const g of Object.values(gorunumler)) if (g.kur) g.kur();
    // Masaüstünde denerken: #araclar/turev gibi doğrudan adres
    const adres = decodeURIComponent((location.hash || "").slice(1));
    git(adres || depo.al("rota", "hesap"), { gecmiseYazma: !!adres });
    // Masaüstü tarayıcıda Esc = geri; adres çubuğundaki #rota değişirse oraya git
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") window.geriTusu(); });
    window.addEventListener("hashchange", () => {
      const r = decodeURIComponent(location.hash.slice(1));
      if (r && r !== rota) git(r, { gecmiseYazma: true });
    });
  }

  window.Uyg = { depo, el, kacis, bildir, titret, isle, formul, kaydet, git, basla, serit, get rota() { return rota; } };
})();
