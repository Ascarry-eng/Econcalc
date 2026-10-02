// dil_test.js — uygulamayı İngilizce açar; her sekmeyi, her aracın her modunu, her konuyu, sözlüğü,
// ayarları ve sohbeti dolaşır; görünen metin + placeholder + aria-label içinde Türkçe arar.
// Bilerek Türkçe kalanlar: .terimler (İngilizce–Türkçe terim tabloları) ve .tr-serbest (dil düğmesi).
// Kullanım: node test/dil_test.js [ekran-görüntüsü-klasörü]
const path = require("path");
const fs = require("fs");
const puppeteer = require(path.join(__dirname, "..", "_npm", "node_modules", "puppeteer-core"));

const SAYFA = "file:///" + path.join(__dirname, "..", "www", "index.html").replace(/\\/g, "/");
const CIKTI = process.argv[2];
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { kosul ? gecti++ : kaldi++; console.log(`${kosul ? "GEÇTİ" : "KALDI"} ${ad}${kosul ? "" : "\n  " + ek}`); };

// Tarayıcının içinde çalışır: görünen metni topla (gizli ve serbest bölgeler hariç)
function gorunenMetin() {
  const parcalar = [];
  const gorunur = (e) => { const s = getComputedStyle(e); return s.display !== "none" && s.visibility !== "hidden" && e.getClientRects().length > 0; };
  const yuru = (e) => {
    if (e.nodeType === 3) { if (e.textContent.trim()) parcalar.push(e.textContent.trim()); return; }
    if (e.nodeType !== 1) return;
    if (e.matches(".terimler, .tr-serbest, script, style, .katex-mathml") || !gorunur(e)) return;
    if (e.placeholder) parcalar.push("[ph] " + e.placeholder);
    if (e.getAttribute("aria-label")) parcalar.push("[aria] " + e.getAttribute("aria-label"));
    for (const c of e.childNodes) yuru(c);
  };
  yuru(document.getElementById("cihaz"));
  return parcalar;
}

const TR_HARF = /[çğıöşüÇĞİÖŞÜâÂ]/;
const TR_SOZ = /\b(yok|faiz|taksit|kalan|anapara|talep|arz|denge|fiyat|miktar|vergi|maliyet|gelir|toplam|nokta|ve|ile|bir|iki|icin|kadar|yani|ama|olur|tablo|hesapla|dikey|yatay|kritik|sabit|yerel|oran|kredi|yatirim|proje|karar|sinir|yorum|tepe|teget|dogru|denklem|egim|deger|sonuc|aralik|hafta|konu|sor|ayarlar|kapat|temizle|sil|anahtar)\b/i;
function turkce(metin) {
  const t = metin.replace(/\\[a-zA-Z]+/g, " ");
  return TR_HARF.test(t) || TR_SOZ.test(t);
}

(async () => {
  const tarayici = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--allow-file-access-from-files"] });
  const sayfa = await tarayici.newPage();
  await sayfa.emulate({ viewport: { width: 412, height: 915, deviceScaleFactor: 1, isMobile: true, hasTouch: true }, userAgent: "Mozilla/5.0 (Linux; Android 14) Mobile" });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message));
  sayfa.on("console", (m) => { if (m.type() === "error") hatalar.push(m.text()); });

  await sayfa.goto(SAYFA + "#hesap");
  await sayfa.evaluate(() => { localStorage.clear(); localStorage.setItem("marjinal.dil", JSON.stringify("en")); });
  await sayfa.reload({ waitUntil: "load" });
  ok("html lang = en", (await sayfa.evaluate(() => document.documentElement.lang)) === "en");

  // Önce tarayıcının kendisini sına: bilinen Türkçeyi yakalamalı, İngilizceyi geçirmeli
  ok("dedektör Türkçeyi yakalar", turkce("Toplam faiz") && turkce("Geçmiş") && !turkce("Total interest on the balance"));

  const sizinti = new Map();
  let durumSayisi = 0, metinSayisi = 0;
  const topla = async (yer) => {
    durumSayisi++;
    for (const m of await sayfa.evaluate(gorunenMetin)) {
      metinSayisi++;
      if (turkce(m) && !sizinti.has(m)) sizinti.set(m, yer);
    }
  };
  const git = async (r) => { await sayfa.evaluate((x) => Uyg.git(x), r); await new Promise((ok_) => setTimeout(ok_, 120)); };

  // Hesap + geçmiş çekmecesi
  await git("hesap"); await topla("hesap");
  await sayfa.evaluate(() => { const t = document.querySelector('[data-id="kaydir"]'); t.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" })); });
  await topla("hesap 2nd");
  await sayfa.evaluate(() => { const t = document.querySelector('[data-id="gecmis"]'); t.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" })); });
  await topla("geçmiş"); await sayfa.evaluate(() => window.geriTusu());
  // Hesap hata mesajları
  for (const ifade of [["1", "÷", "0"], ["(", "esit"]]) {
    await sayfa.evaluate((tuslar) => {
      document.querySelector('[data-id="ac"]').dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" }));
      for (const et of tuslar) {
        const t = [...document.querySelectorAll("#tuslar .tus")].find((b) => b.dataset.id === et || b.querySelector(".ana").textContent.trim() === et);
        t.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" }));
      }
      document.querySelector('[data-id="esit"]').dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" }));
    }, ifade);
    await topla("hesap hata");
  }

  // Araçlar: liste + her araç + her seçim modu + boş form hatası
  await git("araclar"); await topla("araç listesi");
  const araclar = await sayfa.evaluate(() => [...ARACLAR.map((a) => a.id), "matris"]);
  for (const id of araclar) {
    await git("araclar/" + id); await topla(id);
    if (id === "matris") {
      const n = await sayfa.evaluate(() => document.querySelectorAll(".islem-izgara button").length);
      for (let i = 0; i < n; i++) {
        await sayfa.evaluate((k) => document.querySelectorAll(".islem-izgara button")[k].click(), i);
        await sayfa.evaluate(() => [...document.querySelectorAll("#aracKaydir .buyuk-tus")].find((b) => /Compute|Hesapla/.test(b.textContent)).click());
        await topla("matris op " + i);
      }
      continue;
    }
    // fx paneli açık
    await sayfa.evaluate(() => { const d = document.querySelector(".fx"); if (d) d.open = true; });
    await topla(id + " fx");
    const secimSay = await sayfa.evaluate(() => document.querySelectorAll("#aracKaydir .secim button").length);
    for (let i = 0; i < secimSay; i++) {
      await sayfa.evaluate((k) => { const b = document.querySelectorAll("#aracKaydir .secim button")[k]; if (b) b.click(); }, i);
      await sayfa.evaluate(() => { const d = document.querySelector(".fx"); if (d) d.open = true; });
      await topla(`${id} mod ${i}`);
    }
    // Hata yolu: ilk metin alanını boşalt
    await sayfa.evaluate(() => { const g = document.querySelector("#aracKaydir .arac input, #aracKaydir .arac textarea"); if (g) { g.value = ""; g.dispatchEvent(new Event("input", { bubbles: true })); } [...document.querySelectorAll("#aracKaydir .buyuk-tus")].find((b) => /Compute|Hesapla/.test(b.textContent)).click(); });
    await topla(id + " hata");
  }

  // Konular: liste, her konu, sözlük, arama
  await git("konular"); await topla("konu listesi");
  const konular = await sayfa.evaluate(() => KONULAR.filter((k) => !k.sinav).map((k) => k.id));
  for (const id of konular) { await git("konular/" + id); await topla("konu " + id); }
  await git("konular/sozluk"); await topla("sözlük");
  await git("konular");
  await sayfa.type(".ara-kutu input", "qwxyz");
  await new Promise((ok_) => setTimeout(ok_, 400));
  await topla("arama sonuçsuz");

  // Sor: anahtarsız, anahtarlı boş ekran, model düğmesi bildirimi
  await git("sor"); await topla("sor anahtarsız");
  await sayfa.evaluate(() => { localStorage.setItem("marjinal.anahtar", JSON.stringify("sk-deneme")); document.getElementById("yeniSohbet").click(); });
  await topla("sor boş");
  await sayfa.evaluate(() => document.querySelector('#modelSecim button[data-model="deepseek-v4-pro"]').click());
  ok("model bildirimi İngilizce", !turkce(await sayfa.$eval("#bildirim", (e) => e.textContent)), await sayfa.$eval("#bildirim", (e) => e.textContent));
  if (CIKTI) await sayfa.screenshot({ path: path.join(CIKTI, "en_sor.png") });

  // Ayarlar
  await sayfa.evaluate(() => document.getElementById("ayarTus").click()); await topla("ayarlar");
  if (CIKTI) await sayfa.screenshot({ path: path.join(CIKTI, "en_ayar.png") });
  await sayfa.evaluate(() => window.geriTusu());

  ok("yeterince durum ve metin tarandı", durumSayisi > 80 && metinSayisi > 3000, `${durumSayisi} durum, ${metinSayisi} metin`);
  ok("İngilizce arayüzde Türkçe sızıntısı yok", sizinti.size === 0, [...sizinti].slice(0, 40).map(([m, y]) => `${y}: ${m.slice(0, 100)}`).join("\n  "));
  ok("sayfa hatası yok", hatalar.length === 0, hatalar.join(" | "));

  // Dil geri Türkçeye: seçim düğmesi çalışıyor mu
  await sayfa.evaluate(() => document.getElementById("ayarTus").click());
  await Promise.all([sayfa.waitForNavigation({ waitUntil: "load" }), sayfa.evaluate(() => document.querySelector('#dilSecim button[data-v="tr"]').click())]);
  ok("dil düğmesi Türkçeye döndürür", (await sayfa.evaluate(() => window.DIL)) === "tr" && (await sayfa.$eval('.mod-tus[data-mod="hesap"]', (e) => e.textContent.trim())) === "Hesap");

  await tarayici.close();
  console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
  process.exit(kaldi ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
