// ekran_test.js — uygulamayı Chrome'da telefon boyutunda açar, her görünümün ekran görüntüsünü alır,
// konsol/sayfa hatalarını toplar. Kullanım: node test/ekran_test.js <çıktı-klasörü> [rota1 rota2 ...]
const path = require("path");
const fs = require("fs");
const puppeteer = require(path.join(__dirname, "..", "_npm", "node_modules", "puppeteer-core"));

const CIKTI = process.argv[2] || path.join(__dirname, "ekran");
const ROTALAR = process.argv.slice(3);
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const SAYFA = "file:///" + path.join(__dirname, "..", "www", "index.html").replace(/\\/g, "/");

(async () => {
  fs.mkdirSync(CIKTI, { recursive: true });
  const tarayici = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--allow-file-access-from-files"] });
  const sayfa = await tarayici.newPage();
  await sayfa.emulate({
    viewport: { width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    userAgent: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Mobile Safari/537.36",
  });
  const hatalar = [];
  sayfa.on("console", (m) => { if (["error", "warning"].includes(m.type())) hatalar.push(`[${m.type()}] ${m.text()}`); });
  sayfa.on("pageerror", (e) => hatalar.push(`[pageerror] ${e.message}`));

  const rotalar = ROTALAR.length ? ROTALAR : ["hesap", "araclar", "araclar/kar", "araclar/integral", "araclar/denge", "araclar/tvm", "araclar/matris", "konular", "konular/9", "sor"];
  await sayfa.goto(SAYFA + "#hesap");
  await sayfa.evaluate(() => localStorage.clear());
  for (const r of rotalar) {
    await sayfa.goto(SAYFA + "#" + r, { waitUntil: "load" });
    await sayfa.evaluate(() => document.fonts.ready);
    await new Promise((ok) => setTimeout(ok, 500));
    const ad = r.replace(/\//g, "_");
    await sayfa.screenshot({ path: path.join(CIKTI, ad + ".png") });
    // Kaydırılabilir içeriğin tamamı (uzun araç sayfaları için)
    const yukseklik = await sayfa.evaluate(() => { const k = document.querySelector(".gorunum.aktif .kaydir"); return k ? k.scrollHeight : 0; });
    if (yukseklik > 915) {
      await sayfa.evaluate(() => {
        const k = document.querySelector(".gorunum.aktif .kaydir");
        document.getElementById("cihaz").style.height = (k.scrollHeight + 200) + "px";
      });
      await sayfa.setViewport({ width: 412, height: Math.min(yukseklik + 160, 6000), deviceScaleFactor: 1, isMobile: true, hasTouch: true });
      await new Promise((ok) => setTimeout(ok, 300));
      await sayfa.screenshot({ path: path.join(CIKTI, ad + "_tam.png") });
      await sayfa.setViewport({ width: 412, height: 915, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    }
  }
  fs.writeFileSync(path.join(CIKTI, "hatalar.txt"), hatalar.join("\n") || "hata yok");
  console.log(hatalar.length ? hatalar.join("\n") : "Konsol hatası yok");
  await tarayici.close();
})().catch((e) => { console.error(e); process.exit(1); });
