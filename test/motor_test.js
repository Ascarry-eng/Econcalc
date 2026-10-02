// motor_test.js — hesap çekirdeğinin bilinen cevaplı sınavı. Kullanım: node test/motor_test.js
// Kütüphaneler uygulamanın GÖNDERDİĞİ kopyalardan (www/lib) yüklenir — telefondakiyle aynı dosyalar.
// require() yerine global kapsamda çalıştırılır: tarayıcıdaki <script> yüklemesinin aynısı.
const fs = require("fs");
const vm = require("vm");
for (const f of ["math.js", "nerdamer.js"]) vm.runInThisContext(fs.readFileSync(`${__dirname}/../www/lib/${f}`, "utf8"), { filename: f });
const Motor = require("../www/js/motor.js");

let gecti = 0, kaldi = 0;
function yakin(ad, gercek, beklenen, tol = 1e-6) {
  const ok = Math.abs(gercek - beklenen) <= tol * Math.max(1, Math.abs(beklenen));
  ok ? gecti++ : kaldi++;
  if (!ok) console.log(`KALDI ${ad}: ${gercek} ≠ ${beklenen}`);
}
function esit(ad, gercek, beklenen) {
  const ok = JSON.stringify(gercek) === JSON.stringify(beklenen);
  ok ? gecti++ : kaldi++;
  if (!ok) console.log(`KALDI ${ad}: ${JSON.stringify(gercek)} ≠ ${JSON.stringify(beklenen)}`);
}
function dizi(ad, gercek, beklenen, tol = 1e-6) {
  if (!Array.isArray(gercek) || gercek.length !== beklenen.length) { kaldi++; console.log(`KALDI ${ad}: ${JSON.stringify(gercek)} ≠ ${JSON.stringify(beklenen)}`); return; }
  beklenen.forEach((b, i) => yakin(`${ad}[${i}]`, gercek[i], b, tol));
}

// --- çeviri
esit("normalle xe^x", Motor.normalle("xe^x"), "x*e^x");
esit("normalle ln", Motor.normalle("ln(x)+log(100)"), "log(x)+log10(100)");
esit("normalle 2pix", Motor.normalle("2pix"), "2pi*x");
esit("normalle kök kare", Motor.normalle("√(4)+3x²"), "sqrt(4)+3x^2");
esit("normalle exp korunur", Motor.normalle("exp(2)"), "exp(2)");

// --- hesap makinesi
yakin("sin30 DEG", Motor.hesapla("sin(30)", { derece: true }).deger, 0.5);
yakin("log100", Motor.hesapla("log(100)").deger, 2);
yakin("ln e", Motor.hesapla("ln(e)").deger, 1);
yakin("5!", Motor.hesapla("5!").deger, 120);
yakin("yüzde", Motor.hesapla("200*10%").deger, 20);
yakin("bileşik", Motor.hesapla("1000(1+0.05)^10").deger, 1628.894626777442);
yakin("Ans", Motor.hesapla("Ans*2", { ans: 21 }).deger, 42);
yakin("bilimsel", Motor.hesapla("2e3").deger, 2000);
yakin("bilimsel öncelik", Motor.hesapla("1/2e3").deger, 0.0005);
yakin("bilimsel negatif üs", Motor.hesapla("1.5e-4*2").deger, 0.0003);
yakin("e sabiti bozulmaz", Motor.hesapla("2e^1").deger, 2 * Math.E);
yakin("Ans çarpım", Motor.hesapla("2Ans", { ans: 4 }).deger, 8);
esit("negatif kök NaN", Number.isNaN(Motor.hesapla("sqrt(-4)").deger), true);

// --- kökler
dizi("x^2-4", Motor.kokler(Motor.fonk("x^2-4").f, -10, 10), [-2, 2]);
dizi("çift kök", Motor.kokler(Motor.fonk("(x-2)^2").f, -10, 10), [2]);
dizi("kutup kök değil", Motor.kokler(Motor.fonk("1/x").f, -10, 10), []);
dizi("kübik", Motor.kokler(Motor.fonk("x^3-6x^2+11x-6").f, -10, 10), [1, 2, 3]);
dizi("sin", Motor.kokler(Motor.fonk("sin(x)").f, -4, 4), [-Math.PI, 0, Math.PI]);

// --- ekstremum
{
  const e = Motor.ekstremum("x^3-6x^2+9x+1", -10, 10);
  esit("kübik kritik türler", e.kritik.map((k) => k.tur), ["max", "min"]);
  dizi("kübik kritik x", e.kritik.map((k) => k.x), [1, 3]);
  dizi("kübik kritik y", e.kritik.map((k) => k.y), [5, 1]);
  dizi("kübik büküm", e.bukum.map((k) => k.x), [2]);
  esit("türev metni", Motor.duz(Motor.duzenle(e.d1, "x")), "3x^2 - 12x + 9");
}
{
  const e = Motor.ekstremum("x^4", -5, 5);
  esit("x^4 min (f''=0, birinci türev testi)", e.kritik.map((k) => k.tur), ["min"]);
  const k = Motor.ekstremum("x^3", -5, 5);
  esit("x^3 büküm", k.kritik.map((q) => q.tur), ["bukum"]);
}
{ // kâr: TR = (100-2Q)Q, TC = 10Q + 50 -> π = 90Q - 2Q^2 - 50, Q*=22.5
  const e = Motor.ekstremum("(100-2Q)Q-(10Q+50)", 0, 100);
  esit("kâr değişkeni Q", e.v, "Q");
  dizi("kâr Q*", e.kritik.map((k) => k.x), [22.5]);
  dizi("kâr π*", e.kritik.map((k) => k.y), [962.5]);
}

// --- integral
yakin("∫0^1 x^2", Motor.integralSayisal(Motor.fonk("x^2").f, 0, 1).deger, 1 / 3, 1e-10);
yakin("∫0^∞ 100e^-0.05t", Motor.integralSayisal(Motor.fonk("100e^(-0.05t)").f, 0, Infinity).deger, 2000, 1e-8);
yakin("∫1^e 1/x", Motor.integralSayisal(Motor.fonk("1/x").f, 1, Math.E).deger, 1, 1e-10);
yakin("∫0^1 1/sqrt(x)", Motor.integralSayisal(Motor.fonk("1/sqrt(x)").f, 0, 1).deger, 2, 1e-5);
yakin("ters sınır", Motor.integralSayisal(Motor.fonk("x").f, 2, 0).deger, -2, 1e-10);
{
  const F = Motor.belirsizIntegral("3x^2+2x");
  esit("∫3x^2+2x", F && Motor.duz(F.dugum), "x^3 + x^2");
  esit("nerdamer yanlış seri reddedilir", Motor.belirsizIntegral("x^0.5*e^(-x)"), null);
  esit("e^(x^2) kapalı form yok", Motor.belirsizIntegral("e^(x^2)"), null);
  const G = Motor.belirsizIntegral("log(x)"); // 10 tabanlı
  esit("∫log10 bulundu", !!G, true);
  if (G) yakin("∫log10 doğru", G.f(10) - G.f(1), Motor.integralSayisal(Motor.fonk("log(x)").f, 1, 10).deger, 1e-8);
  const H = Motor.belirsizIntegral("100e^(-0.05t)");
  esit("∫ akış değişkeni t", H && H.v, "t");
}

// --- finans (HP-12C işaret kuralı)
yakin("FV", Motor.tvmCoz({ n: 10, i: 0.05, pv: -1000, pmt: 0, tip: 0 }, "fv"), 1628.894627, 1e-9);
yakin("kredi taksiti", Motor.tvmCoz({ n: 360, i: 0.01, pv: 100000, fv: 0, tip: 0 }, "pmt"), -1028.612597, 1e-8);
dizi("faiz çöz", Motor.tvmCoz({ n: 10, pv: -1000, pmt: 0, fv: 2000, tip: 0 }, "i"), [0.0717734625], 1e-8);
yakin("süre çöz", Motor.tvmCoz({ i: 0.07, pv: -1000, pmt: 0, fv: 2000, tip: 0 }, "n"), 10.24476835, 1e-8);
yakin("anüite PV dönem başı", Motor.tvmCoz({ n: 5, i: 0.1, pmt: -100, fv: 0, tip: 1 }, "pv"), 416.9865446, 1e-8);
yakin("NBD", Motor.nbd(0.1, [-1000, 300, 400, 500]), -21.036814425244188, 1e-9);
dizi("İVO", Motor.ivo([-1000, 300, 400, 500]), [0.0889633947], 1e-7);

// --- matris
{
  const { A, ops } = Motor.aritmetik([["2", "1"], ["1", "3"]]);
  esit("det 2x2", ops.yaz(Motor.matDet(A, ops)), "5");
  const t = Motor.matTers(Motor.aritmetik([["4", "7"], ["2", "6"]]).A, Motor.KESIR);
  esit("ters kesirli", t.T.map((s) => s.map((x) => Motor.KESIR.yaz(x))), [["3/5", "-7/10"], ["-1/5", "2/5"]]);
  const B = Motor.aritmetik([["1", "2", "3"], ["4", "5", "6"], ["7", "8", "10"]]);
  esit("det 3x3", B.ops.yaz(Motor.matDet(B.A, B.ops)), "-3");
  esit("gauss det = kofaktör det", B.ops.yaz(Motor.gaussJordan(B.A, B.ops).det), "-3");
  const S = Motor.aritmetik([["1", "2"], ["2", "4"]]);
  esit("tekil", Motor.matTers(S.A, S.ops).tekil, true);
  esit("rank", Motor.gaussJordan(S.A, S.ops).rank, 1);
  const D = Motor.aritmetik([["0.2", "1/3"], ["sqrt(2)", "1"]]);
  esit("irrasyonel → ondalık", D.kesirli, false);
}

// --- biçim
esit("0.1+0.2", Motor.bicim(0.1 + 0.2), "0.3");
esit("büyük", Motor.bicim(1.5e15), "1.5×10¹⁵");
esit("negatif", Motor.bicim(-2), "−2");
esit("küçük", Motor.bicim(0.000123456), "0.000123456");
esit("çok küçük", Motor.bicim(1.2e-9), "1.2×10⁻⁹");
esit("kesir", Motor.kesirBul(0.3333333333333333), { p: 1, q: 3 });
esit("para", Motor.para(1234567.891), "1 234 567.89");

console.log(`\n${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
