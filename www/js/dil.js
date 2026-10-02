// dil.js — arayüz dili. Her metin yerinde iki dilli yazılır: L("Türkçe", "English").
// Dil sayfa açılırken bir kez okunur; değiştirince sayfa yeniden yüklenir (bkz. app.js ayarlar).
// Node testinde: globalThis.MARJINAL_DIL = "en" ile İngilizce koşturulur.
(function (kok) {
  "use strict";
  let dil = "tr";
  try {
    const kayit = kok.localStorage && kok.localStorage.getItem("marjinal.dil");
    if (kayit) dil = JSON.parse(kayit);
  } catch (e) { /* depo kapalı: varsayılan */ }
  if (kok.MARJINAL_DIL) dil = kok.MARJINAL_DIL;
  if (dil !== "en") dil = "tr";
  kok.DIL = dil;
  kok.L = (tr, en) => (dil === "en" && en != null ? en : tr);
  // Yüzde: Türkçede işaret başta (%12), İngilizcede sonda (12%)
  kok.Lyuzde = (metin) => (dil === "en" ? metin + "%" : "%" + metin);
  if (kok.document && kok.document.documentElement) kok.document.documentElement.lang = dil;
})(typeof window !== "undefined" ? window : globalThis);
