"""derle.py — Marjinal APK'sını Gradle'sız derler: aapt2 -> javac -> d8 -> zipalign -> apksigner.

Kullanım:  python apk/derle.py
Çıktı:     apk/cikti/Marjinal.apk

Gerekenler (bir kez indirildi, apk/sdk altında): build-tools 35.0.1 (aapt2, d8, zipalign, apksigner)
ve platform android-35 (android.jar). JDK: JAVA_HOME (17+).

İMZA: apk/marjinal.jks ve apk/imza_sifre.txt ilk derlemede üretilir (ikisi de depoya girmez). BUNLARI SİLME — telefondaki uygulamayı
güncellemek için yeni APK aynı anahtarla imzalanmalı. Anahtar değişirse Android güncellemeyi reddeder;
eskisini kaldırmak gerekir ve kaldırınca uygulama verisi (DeepSeek anahtarı, geçmiş) silinir.
"""
import os
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

KOK = Path(__file__).resolve().parent
PROJE = KOK.parent
BT = KOK / "sdk" / "bt" / "android-15"
ANDROID_JAR = KOK / "sdk" / "pf" / "android-35" / "android.jar"
JAVA_HOME = Path(os.environ.get("JAVA_HOME", ""))
JAVA, JAVAC, KEYTOOL = (JAVA_HOME / "bin" / f"{a}.exe" for a in ("java", "javac", "keytool"))
IS = KOK / "is"
CIKTI = KOK / "cikti"
ANAHTAR = KOK / "marjinal.jks"
SIFRE_DOSYASI = KOK / "imza_sifre.txt"  # depoya GİRMEZ (.gitignore); anahtarla birlikte saklanır
SURUM_DOSYASI = KOK / "surum.txt"


def kos(*komut):
    print("  >", " ".join(str(k) for k in komut)[:160])
    r = subprocess.run([str(k) for k in komut], capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout, r.stderr, sep="\n")
        sys.exit(f"HATA: {Path(str(komut[0])).name} başarısız ({r.returncode})")
    return r.stdout


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    for gerekli in (BT / "aapt2.exe", BT / "lib" / "d8.jar", BT / "zipalign.exe", BT / "lib" / "apksigner.jar", ANDROID_JAR, JAVAC):
        if not gerekli.exists():
            sys.exit(f"Eksik: {gerekli}")

    if SIFRE_DOSYASI.exists():
        sifre = SIFRE_DOSYASI.read_text(encoding="utf-8").strip()
    elif not ANAHTAR.exists():
        import secrets
        sifre = secrets.token_urlsafe(18)
        SIFRE_DOSYASI.write_text(sifre, encoding="utf-8")
        print(f"  Yeni imza şifresi üretildi: {SIFRE_DOSYASI} (anahtarla birlikte sakla)")
    else:
        sys.exit(f"{ANAHTAR} var ama şifresi ({SIFRE_DOSYASI}) yok. Şifre dosyasını geri koy.")

    surum = int(SURUM_DOSYASI.read_text().strip()) + 1 if SURUM_DOSYASI.exists() else 1
    print(f"Marjinal sürüm {surum} derleniyor")

    if IS.exists():
        shutil.rmtree(IS)
    (IS / "assets").mkdir(parents=True)
    CIKTI.mkdir(exist_ok=True)

    # 1) Web dosyaları -> assets/www
    shutil.copytree(PROJE / "www", IS / "assets" / "www")

    # 2) Kaynaklar + manifest -> temel.apk
    kos(BT / "aapt2.exe", "compile", "--dir", KOK / "res", "-o", IS / "res.zip")
    kos(BT / "aapt2.exe", "link", "-o", IS / "temel.apk", "-I", ANDROID_JAR,
        "--manifest", KOK / "AndroidManifest.xml", "-A", IS / "assets",
        "--min-sdk-version", "26", "--target-sdk-version", "34",
        "--version-code", str(surum), "--version-name", f"1.{surum}", IS / "res.zip")

    # 3) Java -> .class -> classes.dex
    siniflar = IS / "siniflar"
    kaynaklar = [str(p) for p in (KOK / "src").rglob("*.java")]
    kos(JAVAC, "--release", "11", "-encoding", "UTF-8", "-nowarn", "-cp", ANDROID_JAR, "-d", siniflar, *kaynaklar)
    dex = IS / "dex"
    dex.mkdir()
    kos(JAVA, "-cp", BT / "lib" / "d8.jar", "com.android.tools.r8.D8", "--release", "--min-api", "26",
        "--lib", ANDROID_JAR, "--output", dex, *[str(p) for p in siniflar.rglob("*.class")])

    # 4) classes.dex'i ekle — mevcut girdilerin sıkıştırma türü KORUNUR (resources.arsc sıkıştırılmamış kalmalı)
    with zipfile.ZipFile(IS / "temel.apk") as zi, zipfile.ZipFile(IS / "dexli.apk", "w") as zo:
        for bilgi in zi.infolist():
            zo.writestr(bilgi, zi.read(bilgi.filename))
        zo.write(dex / "classes.dex", "classes.dex", compress_type=zipfile.ZIP_DEFLATED)

    # 5) Hizala + imzala
    kos(BT / "zipalign.exe", "-f", "-p", "4", IS / "dexli.apk", IS / "hizali.apk")
    if not ANAHTAR.exists():
        print("  İmza anahtarı yok, üretiliyor (bir kez)")
        kos(KEYTOOL, "-genkeypair", "-keystore", ANAHTAR, "-alias", "marjinal", "-keyalg", "RSA", "-keysize", "2048",
            "-validity", "10000", "-storepass", sifre, "-keypass", sifre, "-dname", "CN=Marjinal, O=Kisisel, C=TR")
    apk = CIKTI / "Marjinal.apk"
    kos(JAVA, "-jar", BT / "lib" / "apksigner.jar", "sign", "--ks", ANAHTAR, "--ks-pass", f"pass:{sifre}",
        "--key-pass", f"pass:{sifre}", "--out", apk, IS / "hizali.apk")
    print(kos(JAVA, "-jar", BT / "lib" / "apksigner.jar", "verify", "--verbose", apk).splitlines()[0])

    SURUM_DOSYASI.write_text(str(surum))
    print(f"\nHazır: {apk}  ({apk.stat().st_size / 1e6:.1f} MB, sürüm 1.{surum})")


if __name__ == "__main__":
    main()
