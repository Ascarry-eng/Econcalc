// kutuphane_kopyala.js — _npm/node_modules içinden uygulamanın ihtiyaç duyduğu dosyaları www/lib ve
// www/fonts altına kopyalar. Uygulama tamamen ÇEVRİMDIŞI çalışsın diye hiçbir şey CDN'den gelmez.
// Kullanım: node kutuphane_kopyala.js
const fs = require("fs");
const path = require("path");

const KOK = __dirname;
const NM = path.join(KOK, "_npm", "node_modules");
const LIB = path.join(KOK, "www", "lib");
const FONT = path.join(KOK, "www", "fonts");

function kopyala(kaynak, hedef) {
  fs.mkdirSync(path.dirname(hedef), { recursive: true });
  fs.copyFileSync(kaynak, hedef);
}

// 1) Hesap motorları
kopyala(path.join(NM, "mathjs/lib/browser/math.js"), path.join(LIB, "math.js"));
kopyala(path.join(NM, "nerdamer/all.min.js"), path.join(LIB, "nerdamer.js"));
kopyala(path.join(NM, "marked/lib/marked.umd.js"), path.join(LIB, "marked.js"));

// 2) KaTeX — yalnız woff2 (WebView hepsini okur); CSS'ten woff/ttf yedeklerini at ki eksik dosya istenmesin
kopyala(path.join(NM, "katex/dist/katex.min.js"), path.join(LIB, "katex/katex.min.js"));
let css = fs.readFileSync(path.join(NM, "katex/dist/katex.min.css"), "utf8");
css = css.replace(/,url\(fonts\/[^)]+\.woff\) format\("woff"\)/g, "").replace(/,url\(fonts\/[^)]+\.ttf\) format\("truetype"\)/g, "");
fs.mkdirSync(path.join(LIB, "katex/fonts"), { recursive: true });
fs.writeFileSync(path.join(LIB, "katex/katex.min.css"), css);
for (const f of fs.readdirSync(path.join(NM, "katex/dist/fonts"))) {
  if (f.endsWith(".woff2")) kopyala(path.join(NM, "katex/dist/fonts", f), path.join(LIB, "katex/fonts", f));
}

// 3) Yazı tipleri — Türkçe harfler (ı ş ğ İ) latin-ext alt kümesinde, ikisi birden gerekli
const yazilar = [
  ["@fontsource/doto", "doto", [700, 900]],
  // IBM Plex: Q'nun kuyruğu belirgin, 0 ile karışmıyor (Barlow'da "2Q" ≈ "20" okunuyordu)
  ["@fontsource/ibm-plex-sans", "ibm-plex-sans", [400, 500, 600, 700]],
  ["@fontsource/ibm-plex-sans-condensed", "ibm-plex-sans-condensed", [500, 600, 700]],
];
for (const [paket, ad, kalinliklar] of yazilar) {
  for (const k of kalinliklar) {
    for (const alt of ["latin", "latin-ext"]) {
      const dosya = `${ad}-${alt}-${k}-normal.woff2`;
      kopyala(path.join(NM, paket, "files", dosya), path.join(FONT, dosya));
    }
  }
}
// 4) Lisans metinleri — dağıtılan her kütüphane ve yazı tipinin lisansı yanında gitmeli
const LISANS = path.join(LIB, "lisanslar");
const lisanslar = [
  ["mathjs", "LICENSE", "mathjs (Apache-2.0)"], ["nerdamer", "license.txt", "nerdamer (MIT)"],
  ["katex", "LICENSE", "KaTeX (MIT)"], ["marked", "LICENSE", "marked (MIT)"],
  ["@fontsource/doto", "LICENSE", "Doto yazı tipi (OFL-1.1)"], ["@fontsource/ibm-plex-sans", "LICENSE", "IBM Plex Sans (OFL-1.1)"],
  ["@fontsource/ibm-plex-sans-condensed", "LICENSE", "IBM Plex Sans Condensed (OFL-1.1)"],
];
for (const [paket, dosya] of lisanslar) kopyala(path.join(NM, paket, dosya), path.join(LISANS, paket.replace("@fontsource/", "") + ".txt"));
fs.writeFileSync(path.join(LISANS, "OKUBENI.txt"), "Marjinal'in içinde dağıtılan üçüncü taraf yazılım ve yazı tipleri:\n\n" +
  lisanslar.map(([paket, , ad]) => `- ${ad}: ${paket.replace("@fontsource/", "")}.txt`).join("\n") + "\n");
console.log("Kopyalandı:", LIB, FONT);
