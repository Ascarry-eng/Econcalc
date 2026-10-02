"""yayinla.py — son derlenen APK'yı GitHub Releases'e yükler (sürüm etiketi apk/surum.txt'ten).

Kullanım:  python apk/derle.py  &&  python apk/yayinla.py "Bu sürümde ne değişti"
Kimlik: Git Credential Manager'da kayıtlı GitHub girişi (git push ile bir kez giriş yapılmış olmalı).
Anahtar yalnız istek başlığında kullanılır; hiçbir yere yazılmaz, basılmaz.
"""
import hashlib
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

DEPO = "Ascarry-eng/Econcalc"
KOK = Path(__file__).resolve().parent
APK = KOK / "cikti" / "Marjinal.apk"


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    surum = (KOK / "surum.txt").read_text().strip()
    notlar = sys.argv[1] if len(sys.argv) > 1 else "Yeni sürüm."
    ortam = dict(os.environ, GIT_TERMINAL_PROMPT="0", GCM_INTERACTIVE="never")
    r = subprocess.run(["git", "credential", "fill"], input="protocol=https\nhost=github.com\n\n",
                       capture_output=True, text=True, env=ortam)
    anahtar = next((l.split("=", 1)[1] for l in r.stdout.splitlines() if l.startswith("password=")), None)
    if not anahtar:
        sys.exit("Kayıtlı GitHub kimliği bulunamadı; önce bir kez git push yap.")

    def istek(url, veri=None, tur="application/json"):
        q = urllib.request.Request(url, data=veri, method="POST" if veri is not None else "GET", headers={
            "Authorization": "Bearer " + anahtar, "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28", "Content-Type": tur})
        try:
            with urllib.request.urlopen(q) as c:
                return json.load(c)
        except urllib.error.HTTPError as e:
            sys.exit(f"GitHub {e.code}: {e.read().decode()[:300]}")

    ozet = hashlib.sha256(APK.read_bytes()).hexdigest()
    govde = f"""{notlar}

**Kurulum:** `Marjinal.apk`'yı telefona indir ve aç. Önceki sürümün üstüne kurulur, veriler korunur.

**Tarayıcıda:** https://ascarry-eng.github.io/Econcalc/

SHA-256: `{ozet}`
"""
    rel = istek(f"https://api.github.com/repos/{DEPO}/releases", json.dumps({
        "tag_name": f"v1.{surum}", "target_commitish": "main", "name": f"Marjinal 1.{surum}", "body": govde}).encode())
    print("Sürüm açıldı:", rel["html_url"])
    varlik = istek(f"https://uploads.github.com/repos/{DEPO}/releases/{rel['id']}/assets?name=Marjinal.apk",
                   APK.read_bytes(), "application/vnd.android.package-archive")
    print("APK yüklendi:", varlik["browser_download_url"], f"({varlik['size'] / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
