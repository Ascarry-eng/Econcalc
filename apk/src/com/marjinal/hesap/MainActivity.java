package com.marjinal.hesap;

import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.Window;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * Marjinal'in Android kabuğu: tek bir WebView. Uygulama dosyaları APK içindeki assets/www'den,
 * https://appassets.androidplatform.net/ sahte kökeniyle sunulur. Böylece sayfa güvenli bir köken
 * (localStorage, pano) olur ve DeepSeek'in CORS izni bu kökene açıktır.
 */
public class MainActivity extends Activity {
    private static final String ALAN = "appassets.androidplatform.net";
    private static final String KOK = "https://" + ALAN + "/";
    private static final int DOSYA_ISTEGI = 41;

    private WebView web;
    private ValueCallback<Uri[]> dosyaGeri;
    private Uri kameraUri;

    @Override
    protected void onCreate(Bundle durum) {
        super.onCreate(durum);
        Window pencere = getWindow();
        pencere.setStatusBarColor(0xFF36383B);
        pencere.setNavigationBarColor(0xFF2A2B2E);

        web = new WebView(this);
        web.setBackgroundColor(0xFF36383B);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        // Sistem yazı boyutu büyütülse de tuş takımı yerleşimi bozulmasın
        s.setTextZoom(100);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest istek) {
                Uri u = istek.getUrl();
                if (!ALAN.equals(u.getHost())) return null;
                String yol = u.getPath();
                if (yol == null || yol.isEmpty() || yol.equals("/")) yol = "/index.html";
                try {
                    InputStream girdi = getAssets().open("www" + yol);
                    String tur = tur(yol);
                    boolean metin = tur.startsWith("text/") || tur.endsWith("javascript") || tur.endsWith("json");
                    WebResourceResponse cevap = new WebResourceResponse(tur, metin ? "utf-8" : null, girdi);
                    Map<String, String> basliklar = new HashMap<>();
                    basliklar.put("Cache-Control", "no-cache");
                    cevap.setResponseHeaders(basliklar);
                    return cevap;
                } catch (Exception e) {
                    return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", new HashMap<String, String>(), null);
                }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest istek) {
                Uri u = istek.getUrl();
                if (ALAN.equals(u.getHost())) return false;
                // Dış bağlantılar (ör. platform.deepseek.com) tarayıcıda açılsın
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception e) { /* tarayıcı yok */ }
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> geri, FileChooserParams p) {
                if (dosyaGeri != null) dosyaGeri.onReceiveValue(null);
                dosyaGeri = geri;
                kameraUri = null;
                Intent niyet = p.createIntent();
                // capture="environment" -> doğrudan kamera. Android 10+ izinsiz MediaStore'a yazabilir;
                // daha eskide izin gerekeceği için galeriye düşülür.
                if (p.isCaptureEnabled() && Build.VERSION.SDK_INT >= 29) {
                    try {
                        ContentValues cv = new ContentValues();
                        cv.put(MediaStore.Images.Media.DISPLAY_NAME, "marjinal_" + System.currentTimeMillis() + ".jpg");
                        cv.put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg");
                        kameraUri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, cv);
                    } catch (Exception e) {
                        kameraUri = null;
                    }
                    if (kameraUri != null) {
                        niyet = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                        niyet.putExtra(MediaStore.EXTRA_OUTPUT, kameraUri);
                        niyet.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    }
                }
                try {
                    startActivityForResult(niyet, DOSYA_ISTEGI);
                } catch (Exception e) {
                    kameraUri = null;
                    try {
                        startActivityForResult(p.createIntent(), DOSYA_ISTEGI);
                    } catch (Exception e2) {
                        dosyaGeri = null;
                        return false;
                    }
                }
                return true;
            }
        });

        if (durum != null) web.restoreState(durum);
        else web.loadUrl(KOK + "index.html");
    }

    @Override
    protected void onActivityResult(int istek, int sonuc, Intent veri) {
        if (istek != DOSYA_ISTEGI || dosyaGeri == null) {
            super.onActivityResult(istek, sonuc, veri);
            return;
        }
        Uri[] secilen = null;
        if (sonuc == RESULT_OK) {
            secilen = kameraUri != null ? new Uri[] { kameraUri } : WebChromeClient.FileChooserParams.parseResult(sonuc, veri);
        } else if (kameraUri != null) {
            // Vazgeçilen çekim galeride boş kayıt bırakmasın
            try { getContentResolver().delete(kameraUri, null, null); } catch (Exception e) { /* */ }
        }
        dosyaGeri.onReceiveValue(secilen);
        dosyaGeri = null;
        kameraUri = null;
    }

    @Override
    public void onBackPressed() {
        // Önce uygulama içi geri (açık panel, alt sayfa); JS "1" demezse uygulamadan çık
        web.evaluateJavascript("(window.geriTusu && window.geriTusu()) ? 1 : 0", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String deger) {
                if (!"1".equals(deger)) finish();
            }
        });
    }

    @Override
    protected void onSaveInstanceState(Bundle cikis) {
        super.onSaveInstanceState(cikis);
        web.saveState(cikis);
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    private static String tur(String yol) {
        String y = yol.toLowerCase();
        if (y.endsWith(".html")) return "text/html";
        if (y.endsWith(".js")) return "text/javascript";
        if (y.endsWith(".css")) return "text/css";
        if (y.endsWith(".woff2")) return "font/woff2";
        if (y.endsWith(".png")) return "image/png";
        if (y.endsWith(".svg")) return "image/svg+xml";
        if (y.endsWith(".json")) return "application/json";
        return "application/octet-stream";
    }
}
