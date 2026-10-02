// etkilesim_test.js — tuşlara basarak hesap makinesini, form doldurarak bir aracı ve (DEEPSEEK_API_KEY
// ortamda varsa) gerçek DeepSeek çağrısını uçtan uca sınar. Sayfa yerel http sunucusundan açılır ki
// tarayıcı gerçek bir Origin göndersin (telefonda https://appassets.androidplatform.net olur).
// Anahtar yalnız bu sürecin belleğinde kalır; hiçbir dosyaya yazılmaz.
// Kullanım: node test/etkilesim_test.js [ekran-görüntüsü-klasörü] [--api]
const path = require("path");
const fs = require("fs");
const http = require("http");
const puppeteer = require(path.join(__dirname, "..", "_npm", "node_modules", "puppeteer-core"));

const KOK = path.join(__dirname, "..", "www");
const CIKTI = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : path.join(__dirname, "ekran");
const API = process.argv.includes("--api") && process.env.DEEPSEEK_API_KEY;
const TIP = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2", ".png": "image/png" };

let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { kosul ? gecti++ : kaldi++; console.log(`${kosul ? "GEÇTİ" : "KALDI"} ${ad}${kosul ? "" : "  → " + ek}`); };

(async () => {
  fs.mkdirSync(CIKTI, { recursive: true });
  const sunucu = http.createServer((q, s) => {
    const yol = path.join(KOK, decodeURIComponent(q.url.split("?")[0]).replace(/^\/$/, "/index.html"));
    if (!yol.startsWith(KOK) || !fs.existsSync(yol)) { s.writeHead(404); s.end(); return; }
    s.writeHead(200, { "Content-Type": TIP[path.extname(yol)] || "application/octet-stream" });
    fs.createReadStream(yol).pipe(s);
  }).listen(0);
  const ADRES = `http://localhost:${sunucu.address().port}/index.html`;

  const tarayici = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new" });
  const sayfa = await tarayici.newPage();
  await sayfa.emulate({ viewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: "Mozilla/5.0 (Linux; Android 14) Mobile" });
  const hatalar = [];
  sayfa.on("pageerror", (e) => hatalar.push(e.message));
  sayfa.on("console", (m) => { if (m.type() === "error") hatalar.push(m.text()); });

  await sayfa.goto(ADRES + "#hesap", { waitUntil: "load" });
  await sayfa.evaluate(() => localStorage.clear());
  await sayfa.reload({ waitUntil: "load" });

  // ---------------------------------------------------------------- hesap makinesi
  const bas = async (...etiketler) => {
    for (const e of etiketler) {
      const ok_ = await sayfa.evaluate((et) => {
        const t = [...document.querySelectorAll("#tuslar .tus")].find((b) => (b.dataset.id === et) || b.querySelector(".ana").textContent.trim() === et || b.querySelector(".ana").innerHTML.trim() === et);
        if (!t) return false;
        t.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerType: "touch" }));
        return true;
      }, e);
      if (!ok_) throw new Error("Tuş bulunamadı: " + e);
    }
  };
  const sonuc = () => sayfa.$eval("#sonucSatir", (e) => e.textContent.trim());
  const ifade = () => sayfa.$eval("#ifadeSatir", (e) => e.textContent.trim());

  await bas("2", "×", "(", "3", "+", "4", ")", "esit");
  ok("2×(3+4) = 14", (await sonuc()) === "14", await sonuc());
  await bas("×", "2", "esit");
  ok("sonuçtan devam: Ans×2 = 28", (await sonuc()) === "28", `${await ifade()} = ${await sonuc()}`);
  await bas("ac", "kaydir", "sin", "0", ".", "5", "esit");
  ok("2nd sin: sin⁻¹(0.5) = 30 (DEG)", (await sonuc()) === "30", `${await ifade()} = ${await sonuc()}`);
  await bas("ac", "1", "0", "0", "0", "×", "1", ".", "0", "5", "x<sup>y</sup>", "1", "0", "esit");
  // .ana metni "xy" (sup), bu yüzden data-id'siz tuşu üs etiketiyle ara
  ok("1000×1.05^10", (await sonuc()).startsWith("1628.89"), await sonuc());
  await bas("ac", "1", "÷", "0", "esit");
  ok("1÷0 hata mesajı", /Sonsuz|Tanımsız/.test(await sonuc()), await sonuc());
  await bas("ac", "2", "+", "3");
  ok("canlı önizleme 5", (await sonuc()) === "5", await sonuc());
  await bas("sil", "sil", "esit");
  ok("⌫ iki jeton siler: 2", (await sonuc()) === "2", `${await ifade()} = ${await sonuc()}`);
  await bas("ac", "ln", "e<sup>x</sup>", "2", "esit");
  ok("ln(e^(2)) = 2", (await sonuc()) === "2", `${await ifade()} = ${await sonuc()}`);
  await bas("gecmis");
  const gecmisSay = await sayfa.$$eval(".gecmis-ogesi", (l) => l.length);
  ok("geçmişte kayıtlar var", gecmisSay >= 5, String(gecmisSay));
  await sayfa.screenshot({ path: path.join(CIKTI, "etk_gecmis.png") });
  const geri = await sayfa.evaluate(() => window.geriTusu());
  ok("geri tuşu çekmeceyi kapatır", geri === true && !(await sayfa.$(".cekmece.acik")));
  await bas("ac", "1", "+", "2");
  await sayfa.screenshot({ path: path.join(CIKTI, "etk_hesap.png") });

  // ---------------------------------------------------------------- araç formu
  await sayfa.evaluate(() => Uyg.git("araclar/turev"));
  await sayfa.waitForSelector(".arac input");
  const alan = await sayfa.$(".arac input");
  await alan.evaluate((e) => { e.focus(); e.select(); });
  await alan.type("x^2*e^x");
  const seritAcik = await sayfa.$eval("#serit", (e) => e.classList.contains("acik"));
  ok("ifade alanında yardımcı tuş şeridi açılır", seritAcik);
  await sayfa.evaluate(() => [...document.querySelectorAll(".buyuk-tus")].find((b) => b.textContent === "Hesapla").click());
  await new Promise((r) => setTimeout(r, 300));
  const turev = await sayfa.$$eval(".cikti-satir", (l) => l.map((x) => x.textContent));
  ok("türev aracı x^2·e^x → f′ = x^2·e^x + 2x·e^x", turev.some((t) => /f′\(x\)/.test(t) && /e\^x/.test(t) && !/x\^3|6x/.test(t)), turev.join(" | "));
  await sayfa.evaluate(() => window.geriTusu());
  ok("geri tuşu araçtan listeye döner", await sayfa.evaluate(() => Uyg.rota === "araclar"));
  await sayfa.evaluate(() => Uyg.git("araclar/turev"));
  const kalici = await sayfa.$eval(".arac input", (e) => e.value);
  ok("araç girdisi kalıcı", kalici === "x^2*e^x", kalici);

  // ---------------------------------------------------------------- hatalı ifade
  await sayfa.evaluate(() => Uyg.git("araclar/integral"));
  await sayfa.waitForSelector(".arac input");
  const i1 = await sayfa.$(".arac input");
  await i1.evaluate((e) => { e.focus(); e.select(); });
  await i1.type("3x^2 +");
  await sayfa.evaluate(() => [...document.querySelectorAll(".buyuk-tus")].find((b) => b.textContent === "Hesapla").click());
  const hataYazi = await sayfa.$eval(".cikti-hata", (e) => e.textContent).catch(() => "");
  ok("yarım ifade Türkçe hata verir", /okunamadı|yarım/.test(hataYazi), hataYazi);

  // ---------------------------------------------------------------- DeepSeek
  if (API) {
    await sayfa.evaluate((k) => { localStorage.setItem("marjinal.anahtar", JSON.stringify(k)); }, process.env.DEEPSEEK_API_KEY);
    await sayfa.evaluate(() => Uyg.git("sor"));
    await sayfa.evaluate(() => { document.getElementById("yeniSohbet").click(); });
    await sayfa.type("#soruAlan", "f(x) = x^2 fonksiyonunun türevi nedir? Tek satır, LaTeX ile.");
    await sayfa.click("#gonderTus");
    await sayfa.waitForFunction(() => document.getElementById("gonderTus").getAttribute("aria-label") === "Gönder" && document.querySelector(".mesaj-o"), { timeout: 120000 });
    const cevap = await sayfa.$eval(".mesaj-o .kagit", (e) => e.innerHTML).catch(() => "");
    const hataM = await sayfa.$eval(".mesaj-hata", (e) => e.textContent).catch(() => "");
    ok("DeepSeek metin cevabı geldi", cevap.length > 10 && !hataM, hataM || cevap.slice(0, 200));
    ok("cevapta KaTeX işlendi", cevap.includes("katex"), cevap.slice(0, 200));
    // fotoğraf: MARJINAL_TEST_RESIM = içinde haftalık konu tablosu olan bir görsel (12. hafta: Integration)
    const resim = process.env.MARJINAL_TEST_RESIM;
    if (!resim) console.log("(fotoğraf testi atlandı: MARJINAL_TEST_RESIM tanımlı değil)");
    else {
    const girdi = await sayfa.$("#galeriGirdi");
    await girdi.uploadFile(resim);
    await sayfa.waitForSelector("#ekOnizleme.var", { timeout: 10000 });
    await sayfa.type("#soruAlan", "Bu tabloda 12. haftanın konusu ne? Tek kelime.");
    await sayfa.click("#gonderTus");
    await sayfa.waitForFunction(() => document.getElementById("gonderTus").getAttribute("aria-label") === "Gönder" && document.querySelectorAll(".mesaj-o").length >= 2, { timeout: 120000 });
    const c2 = await sayfa.$$eval(".mesaj-o .kagit", (l) => l[l.length - 1].textContent).catch(() => "");
    ok("fotoğraflı soru doğru okundu (Integration)", /integra|İntegral|integral/i.test(c2), c2.slice(0, 200));
    await sayfa.screenshot({ path: path.join(CIKTI, "etk_sor.png") });
    // sohbet kalıcılığı: fotoğraf yerine not
    const kayit = await sayfa.evaluate(() => JSON.parse(localStorage.getItem("marjinal.sohbet")));
    ok("sohbet kaydında fotoğraf verisi YOK, işareti var", kayit.length === 4 && !JSON.stringify(kayit).includes("data:image") && kayit[2].resimVardi === true);
    }
    await sayfa.evaluate(() => localStorage.removeItem("marjinal.anahtar"));
  } else console.log("(DeepSeek testi atlandı: --api ve DEEPSEEK_API_KEY gerekir)");

  ok("sayfa hatası yok", !hatalar.length, hatalar.join(" | "));
  await tarayici.close();
  sunucu.close();
  console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
  process.exit(kaldi ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
