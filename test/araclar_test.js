// araclar_test.js — her aracın HER modu varsayılan örnekle hatasız hesaplanmalı + bilinen cevaplar.
// Kullanım: node test/araclar_test.js                 (Türkçe: bilinen cevaplar etiketle aranır)
//           MARJINAL_DIL=en node test/araclar_test.js   (İngilizce: Türkçe harf sızıntısı taranır)
const fs = require("fs");
const vm = require("vm");
globalThis.MARJINAL_DIL = process.env.MARJINAL_DIL || "tr";
for (const f of ["js/dil.js", "lib/math.js", "lib/nerdamer.js", "js/motor.js", "js/araclar_tanim.js"]) {
  vm.runInThisContext(fs.readFileSync(`${__dirname}/../www/${f}`, "utf8"), { filename: f });
}
const { ARACLAR, Motor } = globalThis;
const EN = globalThis.DIL === "en";
console.log("dil:", globalThis.DIL);

let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { kosul ? gecti++ : kaldi++; if (!kosul) console.log("KALDI", ad, ek); };
const yakin = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));
const sayi = (s) => Number(String(s).replace(/−/g, "-").replace(/\s/g, "").replace(/[^\d.eE+-].*$/, ""));

function varsayilan(arac, ust = {}) {
  const d = {};
  for (const a of arac.alanlar) d[a.id] = a.v;
  return Object.assign(d, ust);
}
function kos(id, ust) {
  const arac = ARACLAR.find((a) => a.id === id);
  return globalThis.AracYardim.calistir(arac, varsayilan(arac, ust));
}
function deger(sonuc, etiketParca) {
  const s = sonuc.satirlar.find((x) => x.etiket.includes(etiketParca));
  return s ? s.deger : undefined;
}

// 1) Her araç, her secim modu: hata yok, en az bir satır, adımlar metin
for (const arac of ARACLAR) {
  const secimler = arac.alanlar.filter((a) => a.tur === "secim");
  const modlar = secimler.length ? secimler[0].secenekler.map(([v]) => ({ [secimler[0].id]: v })) : [{}];
  for (const m of modlar) {
    let r;
    try { r = kos(arac.id, m); } catch (e) { ok(`${arac.id} ${JSON.stringify(m)}`, false, e.stack.split("\n").slice(0, 3).join(" | ")); continue; }
    ok(`${arac.id} ${JSON.stringify(m)} satır var`, r.satirlar && r.satirlar.length > 0);
    ok(`${arac.id} ${JSON.stringify(m)} undefined/NaN basmıyor`, !JSON.stringify(r.satirlar).match(/undefined|NaN/), JSON.stringify(r.satirlar));
    if (r.adimlar) ok(`${arac.id} ${JSON.stringify(m)} adımlarda undefined yok`, !/undefined|NaN/.test(r.adimlar), r.adimlar.match(/.{0,60}(undefined|NaN).{0,30}/)?.[0]);
    if (r.adimlar) ok(`${arac.id} ${JSON.stringify(m)} çıplak \\n kalmadı`, !/\\n(?![a-z])/.test(r.adimlar), r.adimlar.match(/.{0,40}\\n.{0,20}/)?.[0]);
  }
}

// 2) Bilinen cevaplar (etiketle aranır: yalnız Türkçede)
if (!EN) {
{ const r = kos("denge"); ok("denge Q*", yakin(sayi(deger(r, "Denge miktarı")), 30)); ok("denge P*", yakin(sayi(deger(r, "Denge fiyatı")), 40));
  ok("vergi Qt", yakin(sayi(deger(r, "Vergili miktar")), 28)); ok("vergi Pc", yakin(sayi(deger(r, "Tüketicinin ödediği")), 44));
  ok("vergi geliri", yakin(sayi(deger(r, "Vergi geliri")), 168)); ok("ölü ağırlık", yakin(sayi(deger(r, "Ölü ağırlık")), 6, 1e-8)); }
{ const r = kos("denge", { bicim: "duz", talep: "50 - 0.5P", arz: "-10 + P", t: "6" });
  // P0: 50-0.5P = -10+P -> P=40, Q=30; vergi: 50-0.5P = -10+(P-6) -> 1.5P=66 -> Pc=44, Qt=28
  ok("denge düz P*", yakin(sayi(deger(r, "Denge fiyatı")), 40)); ok("denge düz Qt", yakin(sayi(deger(r, "Vergili miktar")), 28));
  ok("denge düz ölü ağırlık = ters biçimdeki", yakin(sayi(deger(r, "Ölü ağırlık")), 6, 1e-6), deger(r, "Ölü ağırlık")); }
{ const r = kos("sistem"); ok("sistem P", deger(r, "P") && yakin(sayi(deger(r, "P")), 20)); ok("sistem Q", yakin(sayi(deger(r, "Q")), 60)); }
{ const r = kos("sistem", { s: "2x + 3y = 8\nx - y = -1" }); ok("sistem kesir x", deger(r, "x").startsWith("1")); ok("sistem y", yakin(sayi(deger(r, "y")), 2)); }
{ const r = kos("sistem", { s: "x + y = 1\n2x + 2y = 5" }); ok("tutarsız sistem", /yok/.test(deger(r, "Sonuç"))); }
{ let hata = ""; try { kos("sistem", { s: "Qd = 100 - 2P\nQs = 20 + 2P\nQd = Qs" }); } catch (e) { hata = e.message; } ok("çok harfli ad uyarısı", /iki harfli/.test(hata), hata); }
{ const r = kos("basabas"); ok("başabaş Q=80", yakin(sayi(deger(r, "Başabaş")), 80)); ok("doğrusal kısayol", /Q_\{BE\}/.test(r.adimlar)); }
{ const r = kos("ikinci"); ok("ikinci tepe", deger(r, "Tepe").includes("25") && deger(r, "Tepe").includes("1250")); }
{ const r = kos("log", { mod: "log" }); ok("log2 1024", yakin(sayi(deger(r, "log")), 10)); }
{ const r = kos("log"); ok("1000·1.08^x=2000", yakin(sayi(deger(r, "x")), 9.006468342)); }
{ const r = kos("buyume"); ok("CAGR", yakin(sayi(deger(r, "bileşik").replace("%", "")), 8.447177120, 1e-5)); }
{ const r = kos("faiz"); ok("aylık bileşik FV", yakin(sayi(deger(r, "Bileşik ile")), 14307.69, 1e-6)); }
{ const r = kos("tvm"); ok("taksit", yakin(sayi(deger(r, "PMT")), -10046.21, 1e-6), deger(r, "PMT")); }
{ const r = kos("tvm", { n: "", pmt: "-10046.2083" }); ok("tvm n", yakin(sayi(deger(r, "n")), 12, 1e-6)); }
{ const r = kos("tvm", { i: "", pmt: "-10046.2083" }); ok("tvm i", yakin(sayi(deger(r, "i").replace("%", "")), 3, 1e-6), deger(r, "i")); }
{ let hata = ""; try { kos("tvm", { pmt: "5" }); } catch (e) { hata = e.message; } ok("tvm hiç boş yok uyarısı", /boş bırak/.test(hata)); }
{ const r = kos("odeme"); ok("ödeme tablosu satır", r.tablo.satirlar.length === 12); ok("son kalan 0", r.tablo.satirlar[11][4] === "0.00"); }
{ const r = kos("nbd"); ok("NBD", yakin(sayi(deger(r, "NBD")), -21.04, 1e-6)); ok("IRR", deger(r, "İç verim").includes("8.896")); }
{ const r = kos("nbd", { akis: "-1000,300,400,500" }); ok("virgülle ayrılmış akış", yakin(sayi(deger(r, "NBD")), -21.04, 1e-6)); }
{ const r = kos("nbd", { akis: "-1000; 300,5; 400; 500" }); ok("virgül ondalık", yakin(sayi(deger(r, "NBD")), -21.0368 + 0.5 / 1.1, 1e-3)); }
{ const r = kos("turev"); ok("türev metni", deger(r, "f′(x)") === "3x^2 - 12x + 9", deger(r, "f′(x)")); ok("eğim x=4", yakin(sayi(deger(r, "eğim")), 9)); }
{ const r = kos("turev", { f: "10K^0.3 L^0.7", x0: "K=8, L=27" }); ok("kısmi MPL var", r.satirlar.some((s) => s.etiket === "∂f/∂L")); }
{ const r = kos("ekstremum"); ok("aralıkta en büyük uçta: f(5)=21", deger(r, "en büyük") === "f(5) = 21", deger(r, "en büyük")); ok("eşit en küçükler birlikte", deger(r, "en küçük") === "f(0) = f(3) = 1", deger(r, "en küçük")); }
{ const r = kos("ekstremum", { f: "x^4", a: "", b: "" }); ok("x^4 geniş aralıkta tek min", r.satirlar.filter((s) => /minimum/.test(s.etiket)).length === 1 && r.satirlar.length === 1, JSON.stringify(r.satirlar)); }
{ const r = kos("ekstremum", { f: "x^2 + 1", a: "", b: "" }); ok("x^2+1 tek min, sahte kök yok", r.satirlar.length === 1, JSON.stringify(r.satirlar)); }
{ const r = kos("kar"); ok("kâr Q*", yakin(sayi(deger(r, "Q*")), 18)); ok("kâr P*", yakin(sayi(deger(r, "Fiyat")), 64)); ok("kâr π*", yakin(sayi(deger(r, "En büyük kâr")), 760)); }
{ const r = kos("kar", { girdi: "gelir" }); ok("kâr TR girişi aynı sonuç", yakin(sayi(deger(r, "Q*")), 18)); }
{ const r = kos("kar", { p: "100 - 2Q", tc: "50 + 10ln(Q+1)" }); ok("kâr ln içeren TC (çift normalle tuzağı)", Number.isFinite(sayi(deger(r, "Q*")))); }
{ const r = kos("esneklik"); ok("nokta esnekliği -3", yakin(sayi(deger(r, "Esneklik")), -3)); ok("birim esnek P=20", yakin(sayi(deger(r, "Birim esnek")), 20)); }
{ const r = kos("esneklik", { mod: "pq", f: "40 - Q/3", x0: "30" }); ok("ters talep esneklik -3", yakin(sayi(deger(r, "Esneklik")), -3), deger(r, "Esneklik")); }
{ const r = kos("esneklik", { mod: "yay" }); ok("yay esnekliği", yakin(sayi(deger(r, "Yay")), (-10 / 95) / (2 / 11))); }
{ const r = kos("marjinal"); ok("MC(10)", yakin(sayi(deger(r, "MC(10)")), 5)); ok("min AVC Q=10", /Q = 10 /.test(r.adimlar) || r.adimlar.includes("Q = 10 noktasında"), r.adimlar.slice(-200)); }
{ const r = kos("integral"); ok("∫0^2 3x²−4x+5", yakin(sayi(deger(r, "∫")), 10)); ok("ilkel", deger(r, "F(x)").startsWith("x^3 - 2x^2 + 5x"), deger(r, "F(x)")); }
{ const r = kos("integral", { f: "100e^(-0.05t)", a: "0", b: "∞" }); ok("has olmayan integral", yakin(sayi(deger(r, "∫")), 2000, 1e-8)); }
{ const r = kos("integral", { f: "x", a: "-1", b: "1" }); ok("net 0, alan 1", yakin(sayi(deger(r, "∫")), 0) && yakin(sayi(deger(r, "Toplam alan")), 1)); }
{ const r = kos("artik"); const Q = (-3 + Math.sqrt(409)) / 2; ok("tüketici artığı", yakin(sayi(deger(r, "Tüketici")), 2 * Q ** 3 / 3, 1e-8)); ok("üretici artığı", yakin(sayi(deger(r, "Üretici")), 1.5 * Q * Q, 1e-8)); }
{ const r = kos("artik", { s: "", p0: "56" }); ok("fiyat verilince TA", yakin(sayi(deger(r, "Tüketici")), 2 * 8 ** 3 / 3, 1e-8)); }
{ const r = kos("toplam"); ok("TC(Q)", deger(r, "T(Q)") === "Q^3 - 6Q^2 + 20Q + 50", deger(r, "T(Q)")); ok("2→5 değişim", yakin(sayi(deger(r, "toplam değişim")), 51)); }
{ const r = kos("akim", { r_t: "1000", T: "∞" }); ok("perpetüite R/r", yakin(sayi(deger(r, "Bugünkü")), 12500, 1e-8)); }
{ const r = kos("akim"); const pv = 5000 * (1 - Math.exp(-0.8)) / 0.08 + 200 * (1 - Math.exp(-0.8) * 1.8) / 0.0064; ok("akış PV", yakin(sayi(deger(r, "Bugünkü")), pv, 1e-6), `${deger(r, "Bugünkü")} vs ${pv}`); }
{ const r = kos("grafik"); ok("grafik kesişim (20,60)", deger(r, "kesişim").includes("(20, 60)")); }
{ const r = kos("denklem"); ok("denklem kökleri 1,2,3", ["x₁", "x₂", "x₃"].every((k, i) => yakin(sayi(deger(r, k)), i + 1))); }
{ const r = kos("dogru"); ok("doğru eğim -2", yakin(sayi(deger(r, "Eğim")), -2)); ok("doğru b 100", yakin(sayi(deger(r, "y-kesişimi")), 100)); }
}

// 3) fx-82ES tuş sıraları: Doğal Gösterim öykünücüsünde tuşlanınca aracın sonucunu vermeli
function fx82(tuslar, ans = 0) {
  let s = "", kutu = 0;
  for (let j = 0; j < tuslar.length; j++) {
    const t = tuslar[j];
    if (t === "SHIFT") { if (tuslar[j + 1] !== "ln") throw new Error("SHIFT sonrası bilinmeyen tuş: " + tuslar[j + 1]); j++; s += "e^("; kutu++; continue; }
    if (t === "x■") { s += "^("; kutu++; continue; }
    if (t === "√■") { s += "sqrt("; kutu++; continue; }
    if (t === "→") { if (!kutu) throw new Error("→ basıldı ama açık kutu yok"); s += ")"; kutu--; continue; }
    if (t === "ln") { s += "ln("; continue; }
    if (t === "(−)") { s += "-"; continue; }
    if (t === "x²") { s += "^2"; continue; }
    if (t === "Ans") { s += `(${ans})`; continue; }
    if (t === "=") { s += ")".repeat(kutu); return Motor.hesapla(s).deger; }
    if (!/^[\d.()+]$|^[\d.]+$|^[×÷−]$/.test(t)) throw new Error("bilinmeyen tuş: " + t);
    s += { "×": "*", "÷": "/", "−": "-" }[t] ?? t;
  }
  throw new Error("dizi = ile bitmiyor");
}
const fxDurumlari = [];
for (const arac of ARACLAR) {
  const secimler = arac.alanlar.filter((a) => a.tur === "secim");
  const modlar = secimler.length ? secimler[0].secenekler.map(([v]) => ({ [secimler[0].id]: v })) : [{}];
  for (const m of modlar) fxDurumlari.push([arac.id, m]);
}
// TVM'nin her çözüm yolu ayrıca
fxDurumlari.push(
  ["tvm", { n: "", pmt: "-10046.2083" }], ["tvm", { i: "", pmt: "0", fv: "-200000" }], ["tvm", { pmt: "0", fv: "" }],
  ["tvm", { pv: "", pmt: "-1000", fv: "0" }], ["tvm", { pv: "0", pmt: "-1000", fv: "" }], ["tvm", { pv: "0", pmt: "", fv: "50000" }],
  ["tvm", { pv: "", pmt: "-1000", fv: "0", tip: "1" }], ["tvm", { n: "", pmt: "0", fv: "-200000" }],
  ["ikinci", { a: "1", b: "-5", c: "6" }], ["nbd", { akis: "-500; 200; -50; 400; 100" }], ["log", { mod: "dogal", k: "-0.05", c: "500" }],
);
let fxSayisi = 0;
for (const [id, m] of fxDurumlari) {
  const r = kos(id, m);
  let ans = 0;
  for (const a of r.fx || []) {
    let v;
    try { v = fx82(a.tuslar, ans); } catch (e) { ok(`fx ${id} ${JSON.stringify(m)} "${a.ne}"`, false, e.message); continue; }
    ok(`fx ${id} ${JSON.stringify(m)} "${a.ne}"`, Number.isFinite(a.sonuc) && yakin(v, a.sonuc, 1e-8), `öykünücü ${v} ≠ gösterilen ${a.sonuc}  [${a.tuslar.join(" ")}]`);
    ans = v; fxSayisi++;
  }
}
ok("fx dizisi en az 25 adım sınandı", fxSayisi >= 25, String(fxSayisi));
{ // Kapı yakalıyor mu: büyümede → silinirse sonuç bozulmalı (1.6^(1/20 − 1))
  const a = kos("buyume").fx[0];
  const bozuk = a.tuslar.filter((t) => t !== "→");
  ok("→ unutulunca öykünücü YANLIŞ sonuç verir (kapı kör değil)", !yakin(fx82(bozuk), a.sonuc, 1e-3), String(fx82(bozuk)));
}

// 4) İngilizcede Türkçe harf sızıntısı: aracın her metni, her modu, hata mesajları
if (EN) {
  // Özel harf taraması "faiz", "taksit", "yok" gibi harfsiz Türkçe kelimeleri göremez: onlar için sözcük listesi
  const TR_HARF = /[çğıöşüÇĞİÖŞÜâÂ]/;
  const TR_SOZ = /\b(yok|faiz|taksit|kalan|anapara|talep|arz|denge|fiyat|miktar|vergi|maliyet|gelir|toplam|nokta|ve|ile|bir|iki|icin|kadar|yani|ama|olur|tablo|hesapla|dikey|yatay|kritik|sabit|yerel|oran|kredi|yatirim|proje|karar|sinir|yorum|tepe|teget|dogru|denklem|kok|kokler|egim|deger|sonuc|aralik|alt|ust)\b/i;
  const sizinti = [];
  let taranan = 0;
  const tara = (yer, metin) => {
    if (metin == null) return;
    taranan++;
    const t = String(metin).replace(/\\[a-zA-Z]+/g, " "); // LaTeX komut adları (\text, \frac) kelime sayılmasın
    const h = t.match(/.{0,40}[çğıöşüÇĞİÖŞÜâÂ].{0,40}/) || t.match(new RegExp(".{0,40}" + TR_SOZ.source + ".{0,40}", "i"));
    if (h) sizinti.push(`${yer}: ${h[0]}`);
  };
  { // Tarayıcının kendisi kör değil mi: bilinen Türkçe cümleleri yakalamalı, İngilizceyi geçirmeli
    const once = sizinti.length;
    tara("öz-sınama", "Toplam faiz"); tara("öz-sınama", "Kalan borç yok"); const yakaladi = sizinti.length - once === 2;
    tara("öz-sınama", "Total interest on the remaining balance"); const gecirdi = sizinti.length - once === 2;
    sizinti.length = once; taranan = 0;
    ok("sızıntı tarayıcısı Türkçeyi yakalar, İngilizceyi geçirir", yakaladi && gecirdi);
  }
  for (const g of globalThis.ARAC_GRUPLARI) { tara("grup", g.hafta); tara("grup", g.ad); }
  for (const [id, m] of fxDurumlari) {
    const arac = ARACLAR.find((a) => a.id === id);
    const d = varsayilan(arac, m);
    tara(`${id} ad`, arac.ad); tara(`${id} not`, arac.not);
    for (const a of arac.alanlar) {
      tara(`${id} alan`, a.etiket);
      tara(`${id} ipucu`, typeof a.ipucu === "function" ? a.ipucu(d) : a.ipucu);
      for (const [, yazi] of a.secenekler || []) tara(`${id} seçenek`, yazi);
    }
    let r;
    try { r = kos(id, m); } catch (e) { tara(`${id} hata`, e.message); continue; }
    for (const s_ of r.satirlar) { tara(`${id} etiket`, s_.etiket); tara(`${id} değer`, s_.deger); }
    tara(`${id} adımlar`, r.adimlar);
    for (const a of r.fx || []) tara(`${id} fx`, a.ne);
    tara(`${id} fxNot`, r.fxNot);
    for (const g of r.grafikler || []) {
      for (const e of [...(g.egriler || []), ...(g.parametrik || [])]) { tara(`${id} eğri`, e.ad); tara(`${id} eğri`, e.kisa); }
      for (const n of g.noktalar || []) tara(`${id} nokta`, n.etiket);
      if (g.eksen) { tara(`${id} eksen`, g.eksen.x); tara(`${id} eksen`, g.eksen.y); }
    }
    if (r.tablo) r.tablo.basliklar.forEach((b) => tara(`${id} tablo`, b));
  }
  // Hata yolları: her alan boş, ve bilinen hatalı girdiler
  const hataGirdileri = [
    ["sistem", { s: "Qd = 100 - 2P" }], ["sistem", { s: "x^2 + y = 1\nx - y = 0" }], ["sistem", { s: "x + y" }], ["tvm", { pmt: "5" }], ["tvm", { n: "", pmt: "" }],
    ["log", { mod: "log", taban: "1" }], ["ikinci", { a: "0" }], ["denge", { talep: "-5 - Q" }], ["kar", { p: "100 + 2Q" }], ["grafik", { f1: "", f2: "", f3: "" }],
    ["turev", { f: "x^2 +" }], ["turev", { f: "K^0.3 L^0.7", x0: "K=1" }], ["denklem", { f: "x y" }], ["esneklik", { mod: "yay", p2: "10" }], ["integral", { f: "1/x", a: "-1", b: "1" }],
  ];
  for (const arac of ARACLAR) {
    const bosD = Object.fromEntries(arac.alanlar.map((a) => [a.id, a.tur === "secim" ? a.v : ""]));
    try { arac.hesapla(bosD); } catch (e) { tara(`${arac.id} boş-hata`, e.message); }
  }
  for (const [id, m] of hataGirdileri) { try { kos(id, m); } catch (e) { tara(`${id} hata`, e.message); } }
  ok("sızıntı taraması yeterince metin gördü", taranan > 500, String(taranan));
  ok("İngilizcede Türkçe sızıntısı yok", sizinti.length === 0, "\n  " + [...new Set(sizinti)].slice(0, 40).join("\n  "));
}

console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
