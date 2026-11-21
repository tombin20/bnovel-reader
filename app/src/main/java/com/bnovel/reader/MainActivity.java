package com.bnovel.reader;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.JsResult;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    static MainActivity instance;
    private static final String HOME = "https://appassets.androidplatform.net/assets/app/index.html";
    private static final String GOOGLE_TTS = "com.google.android.tts";

    private WebView web;
    private final ExecutorService pool = Executors.newFixedThreadPool(4);

    private TextToSpeech tts;
    private boolean ttsReady = false;
    private int ttsGen = -1, ttsLast = -1;
    private String pendingVoice = null;
    private String ttsTitle = "B-novel", ttsChapter = "", ttsCover = "";
    private boolean ttsActive = false;
    private File imgDir;
    private ValueCallback<Uri[]> fileCb;
    private static final int REQ_FILE = 7731;
    private static final int REQ_AVATAR = 7732;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        instance = this;
        web = new WebView(this);
        setContentView(web);
        initTts();

        imgDir = new File(getFilesDir(), "imgs");
        imgDir.mkdirs();
        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .addPathHandler("/imgcache/", new WebViewAssetLoader.InternalStoragePathHandler(this, imgDir))
            // Ảnh đại diện: đọc thẳng từ file người dùng đã chọn (máy/Drive), không sao chép vào app. Đường dẫn: /avatar/<base64url của content://...>
            .addPathHandler("/avatar/", new WebViewAssetLoader.PathHandler() {
                @Override public WebResourceResponse handle(String path) {
                    try {
                        String raw = new String(android.util.Base64.decode(path, android.util.Base64.URL_SAFE | android.util.Base64.NO_WRAP | android.util.Base64.NO_PADDING), "UTF-8");
                        Uri u = Uri.parse(raw);
                        if (!"content".equals(u.getScheme())) return null;
                        String mime = getContentResolver().getType(u);
                        if (mime == null || !mime.startsWith("image/")) mime = "image/jpeg";
                        java.io.InputStream in = getContentResolver().openInputStream(u);
                        if (in == null) return null;
                        return new WebResourceResponse(mime, null, in);
                    } catch (Exception e) { return null; }
                }
            })
            .build();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                return loader.shouldInterceptRequest(r.getUrl());
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                if ("appassets.androidplatform.net".equals(r.getUrl().getHost())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, r.getUrl())); } catch (Exception ignored) {}
                return true;
            }
        });

        // WebView mặc định KHÔNG hiện confirm()/alert() và luôn trả về false -> nút xóa bị hủy ngầm.
        web.setWebChromeClient(new WebChromeClient() {
            // <input type="file"> (chọn ảnh nền từ máy): WebView mặc định không mở được bộ chọn file
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
                if (fileCb != null) { try { fileCb.onReceiveValue(null); } catch (Exception ignored) {} }
                fileCb = cb;
                try {
                    String type = "*/*";
                    String[] acc = p != null ? p.getAcceptTypes() : null;
                    StringBuilder sb = new StringBuilder();
                    if (acc != null) for (String t : acc) sb.append(t).append(',');
                    String a = sb.toString().toLowerCase();
                    if (a.contains("image")) type = "image/*";
                    else if (a.contains("audio")) type = "audio/*";
                    Intent i = new Intent(Intent.ACTION_GET_CONTENT);
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType(type);
                    if (p != null && p.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    startActivityForResult(Intent.createChooser(i, "Chọn tệp"), REQ_FILE);
                } catch (Exception e) { fileCb = null; cb.onReceiveValue(null); return false; }
                return true;
            }
            @Override
            public boolean onJsConfirm(WebView v, String url, String message, final JsResult r) {
                if (isFinishing()) { r.cancel(); return true; }
                new AlertDialog.Builder(MainActivity.this)
                    .setMessage(message)
                    .setPositiveButton("Đồng ý", (d, w) -> r.confirm())
                    .setNegativeButton("Hủy", (d, w) -> r.cancel())
                    .setOnCancelListener(d -> r.cancel())
                    .show();
                return true;
            }
            @Override
            public boolean onJsAlert(WebView v, String url, String message, final JsResult r) {
                if (isFinishing()) { r.confirm(); return true; }
                new AlertDialog.Builder(MainActivity.this)
                    .setMessage(message)
                    .setPositiveButton("OK", (d, w) -> r.confirm())
                    .setOnCancelListener(d -> r.confirm())
                    .show();
                return true;
            }
        });

        web.addJavascriptInterface(new Http(), "AndroidHttp");
        web.addJavascriptInterface(new TtsBridge(), "AndroidTTS");
        web.addJavascriptInterface(new AppBridge(), "AndroidApp");
        web.addJavascriptInterface(new DlBridge(), "AndroidDl");

        if (savedInstanceState != null) web.restoreState(savedInstanceState); else web.loadUrl(HOME);
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == REQ_AVATAR) {
            if (res == RESULT_OK && data != null && data.getData() != null) {
                Uri u = data.getData();
                try { getContentResolver().takePersistableUriPermission(u, Intent.FLAG_GRANT_READ_URI_PERMISSION); } catch (Exception ignored) {}
                js("window.__avatarPicked && window.__avatarPicked(" + org.json.JSONObject.quote(u.toString()) + ")");
            }
            return;
        }
        if (req == REQ_FILE && fileCb != null) {
            Uri[] r = null;
            if (res == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int n = data.getClipData().getItemCount();
                    r = new Uri[n];
                    for (int k = 0; k < n; k++) r[k] = data.getClipData().getItemAt(k).getUri();
                } else if (data.getData() != null) r = new Uri[]{ data.getData() };
            }
            fileCb.onReceiveValue(r);
            fileCb = null;
        }
    }

    private void js(String code) {
        runOnUiThread(() -> { if (web != null) web.evaluateJavascript(code, null); });
    }

    // ================= HTTP (gọi API B-novel, tránh CORS) =================
    private class Http {
        @JavascriptInterface
        public void request(int id, String method, String url, String body, String token) {
            pool.execute(() -> {
                int status = 0; String out = "";
                try {
                    if (!url.startsWith("https://")) throw new Exception("URL không hợp lệ");
                    HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                    c.setConnectTimeout(15000);
                    c.setReadTimeout(30000);
                    c.setRequestMethod(method);
                    c.setRequestProperty("Accept", "application/json");
                    if (token != null && !token.isEmpty()) c.setRequestProperty("Cookie", "user=" + token);
                    if (body != null && !body.isEmpty()) {
                        c.setDoOutput(true);
                        c.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                        c.getOutputStream().write(body.getBytes("UTF-8"));
                    }
                    status = c.getResponseCode();
                    InputStream is = status >= 400 ? c.getErrorStream() : c.getInputStream();
                    if (is != null) {
                        ByteArrayOutputStream bo = new ByteArrayOutputStream();
                        byte[] buf = new byte[16384]; int n;
                        while ((n = is.read(buf)) > 0) bo.write(buf, 0, n);
                        out = bo.toString("UTF-8");
                    }
                } catch (Exception e) { status = 0; out = ""; }
                js("window.__http(" + id + "," + status + "," + JSONObject.quote(out) + ")");
            });
        }

        // Tải ảnh về bộ nhớ máy (đọc offline); file phục vụ qua https://appassets.androidplatform.net/imgcache/<tên>
        @JavascriptInterface
        public void cacheImage(int id, String url, String name) {
            pool.execute(() -> {
                boolean ok = false;
                try {
                    if (!url.startsWith("https://") || name.contains("/") || name.contains("..")) throw new Exception("bad");
                    File dst = new File(imgDir, name);
                    if (dst.exists() && dst.length() > 0) ok = true;
                    else {
                        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                        c.setConnectTimeout(15000); c.setReadTimeout(30000);
                        if (c.getResponseCode() == 200) {
                            File tmp = new File(imgDir, name + ".tmp");
                            try (InputStream is = c.getInputStream(); FileOutputStream fo = new FileOutputStream(tmp)) {
                                byte[] buf = new byte[16384]; int n;
                                while ((n = is.read(buf)) > 0) fo.write(buf, 0, n);
                            }
                            ok = tmp.renameTo(dst);
                        }
                    }
                } catch (Exception ignored) {}
                js("window.__img(" + id + "," + ok + ")");
            });
        }

        @JavascriptInterface
        public void deleteImages(String json) {
            pool.execute(() -> {
                try {
                    JSONArray a = new JSONArray(json);
                    for (int i = 0; i < a.length(); i++) {
                        String n = a.getString(i);
                        if (!n.contains("/") && !n.contains("..")) new File(imgDir, n).delete();
                    }
                } catch (Exception ignored) {}
            });
        }
    }

    // ================= Phiên bản + cập nhật =================
    private class AppBridge {
        @JavascriptInterface
        public String versionName() {
            try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; }
            catch (Exception e) { return ""; }
        }

        // Đồng bộ màu thanh trạng thái / thanh điều hướng của Android với giao diện đang dùng
        @JavascriptInterface
        public void setBars(final String color, final boolean lightIcons) {
            runOnUiThread(() -> {
                try {
                    int c = Color.parseColor(color);
                    getWindow().setStatusBarColor(c);
                    getWindow().setNavigationBarColor(c);
                    View d = getWindow().getDecorView();
                    int f = d.getSystemUiVisibility();
                    int m = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                    d.setSystemUiVisibility(lightIcons ? (f | m) : (f & ~m));
                } catch (Exception ignored) {}
            });
        }

        // Chia sẻ văn bản (dùng cho sao lưu dữ liệu: lưu vào Drive, Keep, Zalo...)
        // Chọn ảnh đại diện từ máy hoặc Google Drive (bộ chọn tệp của Android). Chỉ lưu đường dẫn, không sao chép ảnh.
        @JavascriptInterface
        public void pickAvatar() {
            runOnUiThread(() -> {
                try {
                    Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    i.addCategory(Intent.CATEGORY_OPENABLE);
                    i.setType("image/*");
                    i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
                    startActivityForResult(i, REQ_AVATAR);
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public void releaseUri(final String uri) {
            try { getContentResolver().releasePersistableUriPermission(Uri.parse(uri), Intent.FLAG_GRANT_READ_URI_PERMISSION); } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void shareText(final String title, final String text) {
            runOnUiThread(() -> {
                try {
                    Intent s = new Intent(Intent.ACTION_SEND);
                    s.setType("text/plain");
                    s.putExtra(Intent.EXTRA_SUBJECT, title);
                    s.putExtra(Intent.EXTRA_TEXT, text);
                    startActivity(Intent.createChooser(s, title));
                } catch (Exception ignored) {}
            });
        }

        // Giữ màn hình sáng khi đang đọc
        @JavascriptInterface
        public void keepScreenOn(final boolean on) {
            runOnUiThread(() -> {
                try {
                    if (on) getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    else getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        public void openUrl(final String url) {
            if (url == null || !url.startsWith("https://")) return;
            runOnUiThread(() -> {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ignored) {}
            });
        }
    }

    // ================= Tải truyện chạy nền =================
    void dlEvent(int id) { js("window.__dl&&window.__dl(" + id + ")"); }

    private class DlBridge {
        @JavascriptInterface
        public boolean start(String json) {
            try {
                JSONObject o = new JSONObject(json);
                JSONArray a = o.getJSONArray("pos");
                int[] pos = new int[a.length()];
                for (int i = 0; i < pos.length; i++) pos[i] = a.getInt(i);
                String base = o.getString("base");
                if (!base.startsWith("https://") || pos.length == 0) return false;
                DownloadService.Job j = new DownloadService.Job(o.getInt("id"), o.optString("title", "B-novel"), base, o.optString("cover", ""), pos);
                return DownloadService.enqueue(MainActivity.this, j);
            } catch (Exception e) { return false; }
        }

        @JavascriptInterface public void cancel(int id) { DownloadService.cancel(id); }
        @JavascriptInterface public boolean isRunning(int id) { return DownloadService.isRunning(id); }
        @JavascriptInterface public String snapshot(int id) { return DownloadService.snapshot(getFilesDir(), id); }
        @JavascriptInterface public String readChapter(int id, int pos) { return DlCore.readChapter(getFilesDir(), id, pos); }
        @JavascriptInterface public void remove(int id) { DownloadService.remove(getFilesDir(), id); }
    }

    // ================= Sách nói (Google TTS) =================
    private boolean hasGoogleTts() {
        try { getPackageManager().getPackageInfo(GOOGLE_TTS, 0); return true; } catch (Exception e) { return false; }
    }

    private void initTts() {
        TextToSpeech.OnInitListener onInit = status -> {
            if (status == TextToSpeech.SUCCESS) {
                int r = tts.setLanguage(new Locale("vi", "VN"));
                ttsReady = r != TextToSpeech.LANG_MISSING_DATA && r != TextToSpeech.LANG_NOT_SUPPORTED;
                if (ttsReady && pendingVoice != null && !pendingVoice.isEmpty()) applyVoice(pendingVoice);
            }
        };
        if (hasGoogleTts()) tts = new TextToSpeech(getApplicationContext(), onInit, GOOGLE_TTS);
        else tts = new TextToSpeech(getApplicationContext(), onInit);
        tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override public void onStart(String id) {
                int[] p = parseId(id);
                if (p != null) js("window.__ttsNative&&window.__ttsNative.onStart(" + p[0] + "," + p[1] + ")");
            }
            @Override public void onDone(String id) {
                int[] p = parseId(id);
                if (p != null && p[0] == ttsGen && p[1] == ttsLast) js("window.__ttsNative&&window.__ttsNative.onDone(" + p[0] + ")");
            }
            @Override public void onError(String id) {
                int[] p = parseId(id);
                if (p != null) js("window.__ttsNative&&window.__ttsNative.onError(" + p[0] + ",'error')");
            }
        });
    }

    private int[] parseId(String id) {
        try { String[] a = id.split(":"); return new int[]{Integer.parseInt(a[0]), Integer.parseInt(a[1])}; }
        catch (Exception e) { return null; }
    }

    private void applyVoice(String name) {
        try { for (Voice v : tts.getVoices()) if (v.getName().equals(name)) { tts.setVoice(v); return; } }
        catch (Exception ignored) {}
    }

    private void svc(boolean playing) {
        // pause() từ JS cũng được gọi khi rời trang đọc dù chưa nghe -> không được bật service mới
        if (!playing && !ttsActive && TtsService.instance == null) return;
        ttsActive = true;
        try {
            if (TtsService.instance != null) TtsService.instance.apply(ttsTitle, ttsChapter, ttsCover, playing);
            else startForegroundService(new Intent(this, TtsService.class)
                .putExtra("playing", playing).putExtra("title", ttsTitle).putExtra("chapter", ttsChapter).putExtra("cover", ttsCover));
        } catch (Exception ignored) {}
    }

    // Dừng service an toàn: không gọi stopService ngay sau startForegroundService (gây crash)
    private void stopSvc() {
        try {
            if (TtsService.instance != null) TtsService.instance.shutdown();
            else if (ttsActive) startForegroundService(new Intent(this, TtsService.class).setAction(TtsService.ACTION_STOP));
        } catch (Exception ignored) {}
        ttsActive = false;
    }

    void ttsStopFromService() {
        ttsActive = false;
        if (tts != null) tts.stop();
        js("window.__ttsNative&&window.__ttsNative.onExternalStop()");
    }

    void ttsCmd(String c) {
        js("window.__ttsNative&&window.__ttsNative.onCmd('" + c + "')");
    }

    private class TtsBridge {
        @JavascriptInterface
        public String getVoices() {
            JSONArray arr = new JSONArray();
            try {
                int n = 1;
                if (tts != null && tts.getVoices() != null) {
                    List<Voice> list = new ArrayList<>(tts.getVoices());
                    Collections.sort(list, (a, b) -> a.getName().compareTo(b.getName()));
                    for (Voice v : list) {
                        if (!"vi".equals(v.getLocale().getLanguage())) continue;
                        JSONObject o = new JSONObject();
                        o.put("name", v.getName());
                        o.put("label", "Giọng " + (n++) + (v.isNetworkConnectionRequired() ? " online" : " offline") + " · " + v.getName());
                        arr.put(o);
                    }
                }
            } catch (Exception ignored) {}
            return arr.toString();
        }

        @JavascriptInterface
        public void setVoice(String name) {
            pendingVoice = name;
            if (ttsReady && name != null && !name.isEmpty()) applyVoice(name);
        }

        @JavascriptInterface public boolean hasGoogleTts() { return MainActivity.this.hasGoogleTts(); }

        @JavascriptInterface
        public void installGoogleTts() {
            runOnUiThread(() -> {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + GOOGLE_TTS))); }
                catch (Exception e) { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=" + GOOGLE_TTS))); }
            });
        }

        @JavascriptInterface
        public void speak(String json, int from, float rate, int gen, String title, String chapter, String cover) {
            runOnUiThread(() -> {
                try {
                    if (!ttsReady) { js("window.__ttsNative&&window.__ttsNative.onError(" + gen + ",'nolang')"); return; }
                    JSONArray arr = new JSONArray(json);
                    ttsTitle = title == null || title.isEmpty() ? "B-novel" : title;
                    ttsChapter = chapter == null ? "" : chapter;
                    ttsCover = cover == null ? "" : cover;
                    tts.stop();
                    tts.setSpeechRate(rate);
                    ttsGen = gen;
                    ttsLast = arr.length() - 1;
                    for (int i = from; i < arr.length(); i++)
                        tts.speak(arr.getString(i), TextToSpeech.QUEUE_ADD, null, gen + ":" + i);
                    svc(true);
                } catch (Exception e) {
                    js("window.__ttsNative&&window.__ttsNative.onError(" + gen + ",'error')");
                }
            });
        }

        @JavascriptInterface
        public void pause() {
            runOnUiThread(() -> {
                if (tts != null) tts.stop();
                ttsGen = -1;
                svc(false);
            });
        }

        @JavascriptInterface
        public void stop() {
            runOnUiThread(() -> {
                if (tts != null) tts.stop();
                ttsGen = -1;
                stopSvc();
            });
        }

        @JavascriptInterface
        public void openSettings() {
            runOnUiThread(() -> {
                try { startActivity(new Intent("com.android.settings.TTS_SETTINGS")); }
                catch (Exception e) { startActivity(new Intent(Settings.ACTION_SETTINGS)); }
            });
        }

        @JavascriptInterface
        public void requestNotificationPermission() {
            if (Build.VERSION.SDK_INT >= 33)
                runOnUiThread(() -> requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 7));
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }

    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.__back?window.__back():false", v -> {
            if ("true".equals(v)) return;
            if (isFinishing() || isDestroyed()) return;
            if (ttsActive) moveTaskToBack(true);   // đang nghe: thu app xuống nền, vẫn đọc + có thông báo
            else MainActivity.super.onBackPressed();
        });
    }

    @Override
    protected void onDestroy() {
        if (tts != null) { tts.stop(); tts.shutdown(); }
        if (TtsService.instance != null) { try { TtsService.instance.shutdown(); } catch (Exception ignored) {} }
        if (instance == this) instance = null;
        super.onDestroy();
    }
}
