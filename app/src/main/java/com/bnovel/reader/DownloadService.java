package com.bnovel.reader;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.drawable.Icon;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.util.LinkedHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

// Tải truyện chạy nền (foreground service): tắt app / khóa máy vẫn tải tiếp, có thông báo tiến độ.
// Chương lưu ở filesDir/dl/<truyện>/<vị trí>.json, ảnh ở filesDir/imgs (giống tải ảnh cũ).
public class DownloadService extends Service {
    static final String ACTION_STOP = "com.bnovel.reader.DL_STOP";
    private static final String CHANNEL = "bnovel_dl";
    private static final int NOTI_ID = 2;
    private static final int WORKERS = 3;

    static final class Job {
        final int id, total;
        final String title, base, cover;
        final int[] pos;
        final AtomicInteger done = new AtomicInteger(), failed = new AtomicInteger();
        volatile boolean cancel, abort;
        volatile String state = "queued";   // queued | run | done | cancel | error
        volatile long lastUi = 0;

        Job(int id, String title, String base, String cover, int[] pos) {
            this.id = id; this.title = title; this.base = base; this.cover = cover; this.pos = pos;
            this.total = pos.length;
        }

        boolean active() { return "queued".equals(state) || "run".equals(state); }
    }

    private static final Object LOCK = new Object();
    private static final LinkedHashMap<Integer, Job> JOBS = new LinkedHashMap<>();
    private static boolean running = false;      // luồng xử lý hàng đợi đang chạy (giữ bởi LOCK)

    private final Handler main = new Handler(Looper.getMainLooper());
    private boolean fg = false;
    private volatile int lastStartId = 0;

    // ---------- API cho MainActivity ----------
    static boolean enqueue(Context c, Job j) {
        synchronized (LOCK) {
            Job old = JOBS.get(j.id);
            if (old != null && old.active()) return false;
            JOBS.remove(j.id);
            JOBS.put(j.id, j);
        }
        try {
            c.startForegroundService(new Intent(c, DownloadService.class));
            return true;
        } catch (Exception e) {
            synchronized (LOCK) { JOBS.remove(j.id); }
            return false;
        }
    }

    static void cancel(int id) {
        boolean queued = false;
        synchronized (LOCK) {
            Job j = JOBS.get(id);
            if (j == null || !j.active()) return;
            j.cancel = true;
            if ("queued".equals(j.state)) { j.state = "cancel"; queued = true; }
        }
        if (queued) tellJs(id);
    }

    static boolean isRunning(int id) {
        synchronized (LOCK) {
            Job j = JOBS.get(id);
            return j != null && j.active();
        }
    }

    static void remove(File filesDir, int id) {
        synchronized (LOCK) {
            Job j = JOBS.remove(id);
            if (j != null) j.cancel = true;
        }
        DlCore.deleteRecursive(new File(filesDir, "dl/" + id));
    }

    static String snapshot(File filesDir, int id) {
        JSONObject o = new JSONObject();
        try {
            File root = new File(filesDir, "dl/" + id);
            JSONArray have = new JSONArray();
            File[] fs = root.listFiles();
            if (fs != null) {
                for (File f : fs) {
                    String n = f.getName();
                    if (!n.endsWith(".json")) continue;
                    try { have.put(Integer.parseInt(n.substring(0, n.length() - 5))); } catch (NumberFormatException ignored) {}
                }
            }
            JSONArray imgs = new JSONArray();
            for (String n : DlCore.readLines(new File(root, "imgs.txt"))) imgs.put(n);
            Job j;
            synchronized (LOCK) { j = JOBS.get(id); }
            o.put("have", have);
            o.put("imgs", imgs);
            o.put("state", j == null ? "idle" : j.state);
            o.put("done", j == null ? 0 : j.done.get());
            o.put("total", j == null ? 0 : j.total);
            o.put("failed", j == null ? 0 : j.failed.get());
        } catch (Exception ignored) {}
        return o.toString();
    }

    private static void tellJs(int id) {
        MainActivity a = MainActivity.instance;
        if (a != null) a.dlEvent(id);
    }

    // ---------- Service ----------
    @Override
    public int onStartCommand(Intent i, int flags, int startId) {
        lastStartId = startId;
        // startForegroundService() bắt buộc gọi startForeground() ngay, nếu không app bị văng
        if (!fg) startFg();
        if (i != null && ACTION_STOP.equals(i.getAction())) {
            java.util.ArrayList<Integer> ids = new java.util.ArrayList<>();
            synchronized (LOCK) {
                for (Job j : JOBS.values()) {
                    if (!j.active()) continue;
                    j.cancel = true;
                    if ("queued".equals(j.state)) { j.state = "cancel"; ids.add(j.id); }
                }
            }
            for (int id : ids) tellJs(id);
        }
        synchronized (LOCK) {
            if (!running) {
                running = true;
                new Thread(this::loop, "dl-loop").start();
            }
        }
        return START_NOT_STICKY;
    }

    private void startFg() {
        try {
            NotificationManager nm = getSystemService(NotificationManager.class);
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Tải truyện", NotificationManager.IMPORTANCE_LOW));
            startForeground(NOTI_ID, build("Đang tải truyện", "Đang chuẩn bị...", 0, 0), ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC);
            fg = true;
        } catch (Exception ignored) {}
    }

    private PendingIntent openApp() {
        return PendingIntent.getActivity(this, 0,
            new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NEW_TASK),
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private Notification build(String title, String text, int done, int total) {
        PendingIntent stop = PendingIntent.getService(this, 5,
            new Intent(this, DownloadService.class).setAction(ACTION_STOP),
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification.Builder nb = new Notification.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setContentTitle(title)
            .setContentText(text)
            .setContentIntent(openApp())
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .addAction(new Notification.Action.Builder(Icon.createWithResource(this, android.R.drawable.ic_menu_close_clear_cancel), "Dừng", stop).build());
        if (total > 0) nb.setProgress(total, done, false); else nb.setProgress(0, 0, true);
        return nb.build();
    }

    private int waiting() {
        int n = 0;
        synchronized (LOCK) { for (Job j : JOBS.values()) if ("queued".equals(j.state)) n++; }
        return n;
    }

    private void progress(Job j, boolean force) {
        long now = System.currentTimeMillis();
        if (!force && now - j.lastUi < 600) return;
        j.lastUi = now;
        if (!force) {
            try {
                int w = waiting();
                String text = j.done.get() + "/" + j.total + " chương" + (w > 0 ? " · còn " + w + " truyện chờ" : "");
                getSystemService(NotificationManager.class).notify(NOTI_ID, build("Đang tải: " + j.title, text, j.done.get(), j.total));
            } catch (Exception ignored) {}
        }
        tellJs(j.id);
    }

    private void loop() {
        try {
            while (true) {
                Job j = null;
                synchronized (LOCK) {
                    for (Job x : JOBS.values()) if ("queued".equals(x.state)) { j = x; break; }
                    if (j == null) { running = false; break; }
                    j.state = "run";
                }
                runJob(j);
            }
        } catch (Throwable t) {
            synchronized (LOCK) { running = false; }
        }
        final int sid = lastStartId;
        main.post(() -> {
            synchronized (LOCK) { if (running) return; }
            stopForeground(true);
            fg = false;
            stopSelf(sid);
        });
    }

    private void runJob(final Job j) {
        final File root = new File(getFilesDir(), "dl/" + j.id);
        final File imgDir = new File(getFilesDir(), "imgs");
        root.mkdirs();
        imgDir.mkdirs();
        progress(j, false);

        if (j.cover != null && !j.cover.isEmpty()) {
            String full = DlCore.fullUrl(j.base, j.cover, 400);
            String name = DlCore.imgName(full);
            if (DlCore.fetchImage(imgDir, full, name)) DlCore.addImg(root, name);
        }

        final AtomicInteger next = new AtomicInteger();
        ExecutorService ex = Executors.newFixedThreadPool(WORKERS);
        for (int k = 0; k < WORKERS; k++) {
            ex.execute(() -> {
                while (!j.cancel && !j.abort) {
                    int i = next.getAndIncrement();
                    if (i >= j.pos.length) break;
                    if (downloadChapter(j, root, imgDir, j.pos[i])) j.done.incrementAndGet();
                    else if (j.failed.incrementAndGet() > 5) j.abort = true;
                    progress(j, false);
                }
            });
        }
        ex.shutdown();
        try {
            while (!ex.awaitTermination(1, TimeUnit.SECONDS)) { /* chờ các luồng tải xong */ }
        } catch (InterruptedException e) {
            j.cancel = true;
            ex.shutdownNow();
        }

        j.state = j.cancel ? "cancel" : (j.abort ? "error" : "done");
        progress(j, true);
        notifyEnd(j);
    }

    private boolean downloadChapter(Job j, File root, File imgDir, int pos) {
        try {
            String body = DlCore.get(j.base + "/api/chapter?story=" + j.id + "&pos=" + pos);
            JSONObject ch = new JSONObject(body).getJSONObject("chapter");
            String content = ch.optString("content", "");
            for (String u : DlCore.imagesOf(content)) {
                if (j.cancel) return false;
                String full = DlCore.fullUrl(j.base, u, 1400);
                String name = DlCore.imgName(full);
                if (DlCore.fetchImage(imgDir, full, name)) DlCore.addImg(root, name);
            }
            if (j.cancel) return false;
            DlCore.writeAtomic(new File(root, pos + ".json"), ch.toString());
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private void notifyEnd(Job j) {
        try {
            String msg = "cancel".equals(j.state) ? "Đã dừng tải" : "error".equals(j.state) ? "Tải bị gián đoạn" : "Đã tải xong";
            if ("done".equals(j.state) && j.failed.get() > 0) msg = "Tải xong, " + j.failed.get() + " chương lỗi";
            Notification n = new Notification.Builder(this, CHANNEL)
                .setSmallIcon(android.R.drawable.stat_sys_download_done)
                .setContentTitle(j.title)
                .setContentText(msg + " · " + j.done.get() + "/" + j.total + " chương")
                .setContentIntent(openApp())
                .setAutoCancel(true)
                .build();
            getSystemService(NotificationManager.class).notify(10000 + (j.id & 0xFFFF), n);
        } catch (Exception ignored) {}
    }

    @Override public IBinder onBind(Intent intent) { return null; }
}
