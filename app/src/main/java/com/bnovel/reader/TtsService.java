package com.bnovel.reader;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.os.IBinder;
import android.os.PowerManager;

// Service foreground: giữ app sống khi tắt màn hình, có nút Tạm dừng/Tiếp tục và Dừng trên thông báo
public class TtsService extends Service {
    public static final String ACTION_STOP = "com.bnovel.reader.TTS_STOP";
    public static final String ACTION_TOGGLE = "com.bnovel.reader.TTS_TOGGLE";
    private static final String CHANNEL = "bnovel_tts";
    private PowerManager.WakeLock wakeLock;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String act = intent == null ? null : intent.getAction();
        if (ACTION_STOP.equals(act)) {
            MainActivity a = MainActivity.instance;
            if (a != null) a.ttsStopFromService();
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }
        if (ACTION_TOGGLE.equals(act)) {
            MainActivity a = MainActivity.instance;
            if (a != null) a.ttsToggleFromService();
            return START_NOT_STICKY;
        }

        boolean playing = intent == null || intent.getBooleanExtra("playing", true);
        String title = intent == null ? "" : intent.getStringExtra("title");
        if (title == null || title.isEmpty()) title = "B-novel";

        NotificationManager nm = getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Sách nói", NotificationManager.IMPORTANCE_LOW));

        PendingIntent open = PendingIntent.getActivity(this, 0,
            new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        PendingIntent toggle = PendingIntent.getService(this, 2,
            new Intent(this, TtsService.class).setAction(ACTION_TOGGLE),
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        PendingIntent stop = PendingIntent.getService(this, 1,
            new Intent(this, TtsService.class).setAction(ACTION_STOP),
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        Notification n = new Notification.Builder(this, CHANNEL)
            .setSmallIcon(playing ? android.R.drawable.ic_media_play : android.R.drawable.ic_media_pause)
            .setContentTitle(title)
            .setContentText(playing ? "Đang đọc sách nói" : "Đã tạm dừng")
            .setContentIntent(open)
            .setOngoing(true)
            .addAction(new Notification.Action.Builder(null, playing ? "Tạm dừng" : "Tiếp tục", toggle).build())
            .addAction(new Notification.Action.Builder(null, "Dừng", stop).build())
            .build();

        startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);

        if (playing) {
            if (wakeLock == null) {
                wakeLock = getSystemService(PowerManager.class).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "bnovel:tts");
                wakeLock.acquire(6 * 60 * 60 * 1000L);
            }
        } else releaseLock();
        return START_NOT_STICKY;
    }

    private void releaseLock() {
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        wakeLock = null;
    }

    @Override
    public void onDestroy() { releaseLock(); super.onDestroy(); }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
