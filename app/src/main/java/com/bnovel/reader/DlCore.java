package com.bnovel.reader;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// Phần "lõi" của tải truyện nền: không phụ thuộc Android (trừ java.io/net) để dễ kiểm thử.
// Cách đặt tên file ảnh PHẢI giống hệt hash()/imgFile()/cdn()/abs() trong assets/app/app.js,
// để giao diện tìm đúng ảnh đã tải qua https://appassets.androidplatform.net/imgcache/<tên>.
final class DlCore {
    private DlCore() {}

    private static final Pattern EXT = Pattern.compile("\\.(jpg|jpeg|png|webp|gif)$", Pattern.CASE_INSENSITIVE);
    private static final Pattern IMG = Pattern.compile("^!\\[\\]\\((.+)\\)$");
    private static final Object IMG_LOCK = new Object();

    static String hash(String s) {
        int h1 = 0xdeadbeef, h2 = 0x41c6ce57;
        for (int i = 0; i < s.length(); i++) {
            int c = s.charAt(i);
            h1 = (h1 ^ c) * (int) 2654435761L;
            h2 = (h2 ^ c) * (int) 1597334677L;
        }
        h1 = ((h1 ^ (h1 >>> 16)) * (int) 2246822507L) ^ ((h2 ^ (h2 >>> 13)) * (int) 3266489909L);
        h2 = ((h2 ^ (h2 >>> 16)) * (int) 2246822507L) ^ ((h1 ^ (h1 >>> 13)) * (int) 3266489909L);
        long v = 4294967296L * (long) (2097151 & h2) + (h1 & 0xFFFFFFFFL);
        return Long.toString(v, 36);
    }

    static String imgName(String full) {
        String q = full;
        int i = q.indexOf('?');
        if (i >= 0) q = q.substring(0, i);
        String ext = "jpg";
        Matcher m = EXT.matcher(q);
        if (m.find()) ext = m.group(1).toLowerCase(Locale.ROOT);
        return hash(full) + "." + ext;
    }

    // = imgFull(u, w) trong app.js: abs() rồi cdn()
    static String fullUrl(String base, String u, int w) {
        if (u == null || u.isEmpty()) return "";
        String a = (u.startsWith("http:") || u.startsWith("https:")) ? u : base + (u.charAt(0) == '/' ? "" : "/") + u;
        if (a.startsWith("https://res.cloudinary.com/")) {
            String key = "/image/upload/";
            int i = a.indexOf(key);
            if (i >= 0) a = a.substring(0, i) + key + "f_auto,q_auto:best,w_" + w + "/" + a.substring(i + key.length());
        }
        return a;
    }

    // = imgsOf(text) trong app.js: các dòng dạng ![](url)
    static List<String> imagesOf(String text) {
        List<String> out = new ArrayList<>();
        if (text == null) return out;
        for (String l : text.split("\n+")) {
            Matcher m = IMG.matcher(l.trim());
            if (m.matches()) out.add(m.group(1));
        }
        return out;
    }

    static byte[] readAll(InputStream is) throws IOException {
        ByteArrayOutputStream bo = new ByteArrayOutputStream();
        byte[] buf = new byte[16384];
        int n;
        while ((n = is.read(buf)) > 0) bo.write(buf, 0, n);
        return bo.toByteArray();
    }

    static String get(String url) throws IOException {
        if (!url.startsWith("https://")) throw new IOException("URL không hợp lệ");
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        try {
            c.setConnectTimeout(15000);
            c.setReadTimeout(30000);
            c.setRequestProperty("Accept", "application/json");
            int st = c.getResponseCode();
            if (st != 200) throw new IOException("HTTP " + st);
            try (InputStream is = c.getInputStream()) {
                return new String(readAll(is), StandardCharsets.UTF_8);
            }
        } finally {
            c.disconnect();
        }
    }

    static boolean fetchImage(File dir, String url, String name) {
        try {
            if (!url.startsWith("https://") || name.contains("/") || name.contains("..")) return false;
            File dst = new File(dir, name);
            if (dst.exists() && dst.length() > 0) return true;
            HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
            try {
                c.setConnectTimeout(15000);
                c.setReadTimeout(30000);
                if (c.getResponseCode() != 200) return false;
                File tmp = new File(dir, name + ".tmp");
                try (InputStream is = c.getInputStream(); FileOutputStream fo = new FileOutputStream(tmp)) {
                    byte[] buf = new byte[16384];
                    int n;
                    while ((n = is.read(buf)) > 0) fo.write(buf, 0, n);
                }
                return tmp.renameTo(dst);
            } finally {
                c.disconnect();
            }
        } catch (Exception e) {
            return false;
        }
    }

    static void writeAtomic(File dst, String text) throws IOException {
        File tmp = new File(dst.getPath() + ".tmp");
        try (FileOutputStream fo = new FileOutputStream(tmp)) {
            fo.write(text.getBytes(StandardCharsets.UTF_8));
        }
        if (!tmp.renameTo(dst)) throw new IOException("không ghi được " + dst.getName());
    }

    // danh sách tên ảnh đã tải của một truyện (mỗi dòng một tên)
    static void addImg(File root, String name) {
        synchronized (IMG_LOCK) {
            try (FileOutputStream fo = new FileOutputStream(new File(root, "imgs.txt"), true)) {
                fo.write((name + "\n").getBytes(StandardCharsets.UTF_8));
            } catch (IOException ignored) {}
        }
    }

    static List<String> readLines(File f) {
        List<String> out = new ArrayList<>();
        if (!f.isFile()) return out;
        synchronized (IMG_LOCK) {
            try (FileInputStream in = new FileInputStream(f)) {
                for (String l : new String(readAll(in), StandardCharsets.UTF_8).split("\n")) if (!l.isEmpty()) out.add(l);
            } catch (IOException ignored) {}
        }
        return out;
    }

    static String readChapter(File filesDir, int id, int pos) {
        File f = new File(filesDir, "dl/" + id + "/" + pos + ".json");
        if (!f.isFile()) return "";
        try (FileInputStream in = new FileInputStream(f)) {
            return new String(readAll(in), StandardCharsets.UTF_8);
        } catch (IOException e) {
            return "";
        }
    }

    static void deleteRecursive(File f) {
        File[] kids = f.listFiles();
        if (kids != null) for (File k : kids) deleteRecursive(k);
        f.delete();
    }
}
