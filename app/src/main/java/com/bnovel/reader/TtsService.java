package com.bnovel.reader;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.drawable.Icon;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;

import java.net.HttpURLConnection;
import java.net.URL;

// Service foreground + MediaSession: thông báo điều khiển kiểu vBook (hiện ở màn hình khóa, thanh thông báo, tai nghe)
public class TtsService extends Service {
    static TtsService instance;
    public static final String ACTION_STOP = "com.bnovel.reader.STOP";
    public static final String ACTION_TOGGLE = "com.bnovel.reader.TOGGLE";
    public static final String ACTION_PREV = "com.bnovel.reader.PREV";
    public static final String ACTION_NEXT = "com.bnovel.reader.NEXT";
    private static final String CHANNEL = "bnovel_media";

    private final Handler main = new Handler(Looper.getMainLooper());
    private PowerManager.WakeLock wakeLock;
    private MediaSession session;
    private Bitmap art;
    private String artUrl = "", title = "B-novel", chapter = "";
    private boolean playing = true, fg = false, dead = false;

    @Override public void onCreate() { super.onCreate(); instance = this; }

    @Override
    public int onStartCommand(Intent i, int flags, int startId) {
        // startForegroundService() bắt buộc phải gọi startForeground() ngay, nếu không app bị văng
        if (dead) return START_NOT_STICKY;
        if (!fg) { try { startFgMinimal(); } catch (Exception ignored) {} }
        String act = i == null ? null : i.getAction();
        if (ACTION_STOP.equals(act)) {
            MainActivity a = MainActivity.instance;
            if (a != null) a.ttsStopFromService();
            shutdown();
            return START_NOT_STICKY;
        }
        if (ACTION_TOGGLE.equals(act)) { cmd("toggle"); return START_NOT_STICKY; }
        if (ACTION_PREV.equals(act)) { cmd("prev"); return START_NOT_STICKY; }
        if (ACTION_NEXT.equals(act)) { cmd("next"); return START_NOT_STICKY; }
        if (i != null) apply(i.getStringExtra("title"), i.getStringExtra("chapter"), i.getStringExtra("cover"), i.getBooleanExtra("playing", true));
        else apply(title, chapter, artUrl, playing);
        return START_NOT_STICKY;
    }

    private void startFgMinimal() {
        NotificationManager nm = getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Sách nói", NotificationManager.IMPORTANCE_LOW));
        Notification n = new Notification.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle(title).setContentText(chapter).build();
        startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        fg = true;
    }

    private void cmd(String c) { MainActivity a = MainActivity.instance; if (a != null) a.ttsCmd(c); }

    void apply(String t, String c, String cover, boolean p) {
        if (dead) return;
        if (t != null && !t.isEmpty()) title = t;
        if (c != null) chapter = c;
        playing = p;
        if (cover != null && !cover.equals(artUrl)) { artUrl = cover; art = null; loadArt(cover); }
        render();
    }

    private void loadArt(final String url) {
        if (url.isEmpty() || !url.startsWith("http")) return;
        new Thread(() -> {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                c.setConnectTimeout(10000); c.setReadTimeout(15000);
                Bitmap b = BitmapFactory.decodeStream(c.getInputStream());
                if (b == null) return;
                int max = 600;
                if (b.getWidth() > max || b.getHeight() > max) {
                    float k = Math.min((float) max / b.getWidth(), (float) max / b.getHeight());
                    b = Bitmap.createScaledBitmap(b, Math.round(b.getWidth() * k), Math.round(b.getHeight() * k), true);
                }
                final Bitmap fb = b;
                main.post(() -> { if (url.equals(artUrl)) { art = fb; if (session != null) render(); } });
            } catch (Exception ignored) {}
        }).start();
    }

    private PendingIntent act(String action, int rc) {
        return PendingIntent.getService(this, rc, new Intent(this, TtsService.class).setAction(action),
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private void render() {
        NotificationManager nm = getSystemService(NotificationManager.class);
        nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Sách nói", NotificationManager.IMPORTANCE_LOW));

        if (session == null) {
            session = new MediaSession(this, "bnovel");
            session.setCallback(new MediaSession.Callback() {
                @Override public void onPlay() { cmd("play"); }
                @Override public void onPause() { cmd("pause"); }
                @Override public void onSkipToNext() { cmd("next"); }
                @Override public void onSkipToPrevious() { cmd("prev"); }
                @Override public void onStop() { MainActivity a = MainActivity.instance; if (a != null) a.ttsStopFromService(); shutdown(); }
            });
            session.setActive(true);
        }
        MediaMetadata.Builder md = new MediaMetadata.Builder()
            .putString(MediaMetadata.METADATA_KEY_TITLE, title)
            .putString(MediaMetadata.METADATA_KEY_ARTIST, chapter)
            .putString(MediaMetadata.METADATA_KEY_ALBUM, "B-novel");
        if (art != null) md.putBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART, art).putBitmap(MediaMetadata.METADATA_KEY_ART, art);
        session.setMetadata(md.build());
        session.setPlaybackState(new PlaybackState.Builder()
            .setActions(PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_PLAY_PAUSE
                | PlaybackState.ACTION_SKIP_TO_NEXT | PlaybackState.ACTION_SKIP_TO_PREVIOUS | PlaybackState.ACTION_STOP)
            .setState(playing ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED, PlaybackState.PLAYBACK_POSITION_UNKNOWN, playing ? 1f : 0f)
            .build());

        PendingIntent open = PendingIntent.getActivity(this, 0,
            new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_NEW_TASK),
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        Notification.Builder nb = new Notification.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle(title)
            .setContentText(chapter)
            .setContentIntent(open)
            .setOngoing(playing)
            .setVisibility(Notification.VISIBILITY_PUBLIC)
            .addAction(new Notification.Action.Builder(Icon.createWithResource(this, android.R.drawable.ic_media_previous), "Chương trước", act(ACTION_PREV, 3)).build())
            .addAction(new Notification.Action.Builder(Icon.createWithResource(this, playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play), playing ? "Tạm dừng" : "Phát", act(ACTION_TOGGLE, 2)).build())
            .addAction(new Notification.Action.Builder(Icon.createWithResource(this, android.R.drawable.ic_media_next), "Chương sau", act(ACTION_NEXT, 4)).build())
            .addAction(new Notification.Action.Builder(Icon.createWithResource(this, android.R.drawable.ic_menu_close_clear_cancel), "Dừng", act(ACTION_STOP, 1)).build())
            .setStyle(new Notification.MediaStyle().setMediaSession(session.getSessionToken()).setShowActionsInCompactView(0, 1, 2));
        if (art != null) nb.setLargeIcon(art);
        Notification n = nb.build();

        if (!fg) { startForeground(1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK); fg = true; }
        else nm.notify(1, n);

        if (playing) {
            if (wakeLock == null) {
                wakeLock = getSystemService(PowerManager.class).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "bnovel:tts");
                wakeLock.acquire(6 * 60 * 60 * 1000L);
            }
        } else releaseLock();
    }

    private void releaseLock() { if (wakeLock != null && wakeLock.isHeld()) wakeLock.release(); wakeLock = null; }

    void shutdown() {
        if (dead) return;
        if (!fg) { try { startFgMinimal(); } catch (Exception ignored) {} }
        dead = true;
        if (instance == this) instance = null;
        releaseLock();
        if (session != null) { session.setActive(false); session.release(); session = null; }
        stopForeground(true); fg = false;
        stopSelf();
    }

    @Override public void onDestroy() {
        releaseLock();
        if (session != null) { session.release(); session = null; }
        if (instance == this) instance = null;
        super.onDestroy();
    }

    @Override public IBinder onBind(Intent intent) { return null; }
}
