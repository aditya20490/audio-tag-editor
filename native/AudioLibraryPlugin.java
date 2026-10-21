package com.jrj.audiotageditor;

import android.content.ContentUris;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

@CapacitorPlugin(
    name = "AudioLibrary",
    permissions = {
        @Permission(alias = "audio33", strings = { "android.permission.READ_MEDIA_AUDIO" }),
        @Permission(alias = "audioOld", strings = { "android.permission.READ_EXTERNAL_STORAGE" })
    }
)
public class AudioLibraryPlugin extends Plugin {

    private String permAlias() {
        return Build.VERSION.SDK_INT >= 33 ? "audio33" : "audioOld";
    }

    private Uri collection() {
        if (Build.VERSION.SDK_INT >= 29) {
            return MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL);
        }
        return MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
    }

    @PluginMethod
    public void list(PluginCall call) {
        if (getPermissionState(permAlias()) != PermissionState.GRANTED) {
            requestPermissionForAlias(permAlias(), call, "afterPermission");
            return;
        }
        doList(call);
    }

    @PermissionCallback
    private void afterPermission(PluginCall call) {
        if (getPermissionState(permAlias()) == PermissionState.GRANTED) {
            doList(call);
        } else {
            call.reject("Permission to read your music was not given. Allow it and try again.");
        }
    }

    private void doList(PluginCall call) {
        try {
            String[] projection = {
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.DISPLAY_NAME,
                MediaStore.Audio.Media.ARTIST,
                MediaStore.Audio.Media.SIZE
            };
            JSArray arr = new JSArray();
            Cursor c = getContext().getContentResolver().query(
                collection(),
                projection,
                MediaStore.Audio.Media.SIZE + " > 0",
                null,
                null
            );
            if (c != null) {
                try {
                    while (c.moveToNext()) {
                        JSObject o = new JSObject();
                        o.put("id", c.getLong(0));
                        o.put("name", c.getString(1));
                        o.put("artist", c.getString(2));
                        o.put("size", c.getLong(3));
                        arr.put(o);
                    }
                } finally {
                    c.close();
                }
            }
            JSObject res = new JSObject();
            res.put("items", arr);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Could not read the music list: " + e.getMessage());
        }
    }

    @PluginMethod
    public void copy(PluginCall call) {
        final Long id = call.getLong("id");
        if (id == null) {
            call.reject("No song chosen");
            return;
        }
        getBridge().execute(() -> {
            try {
                Uri uri = ContentUris.withAppendedId(collection(), id);
                File out = new File(getContext().getCacheDir(), "picked_audio.tmp");
                InputStream in = getContext().getContentResolver().openInputStream(uri);
                if (in == null) {
                    throw new Exception("could not open the file");
                }
                FileOutputStream fo = new FileOutputStream(out);
                byte[] buf = new byte[65536];
                int n;
                while ((n = in.read(buf)) != -1) {
                    fo.write(buf, 0, n);
                }
                fo.close();
                in.close();
                JSObject res = new JSObject();
                res.put("path", out.getAbsolutePath());
                call.resolve(res);
            } catch (Exception e) {
                call.reject("Could not open that song: " + e.getMessage());
            }
        });
    }
}
