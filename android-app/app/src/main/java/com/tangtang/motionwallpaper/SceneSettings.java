package com.tangtang.motionwallpaper;

import android.content.Context;
import android.content.SharedPreferences;

/** Composition is persistent and observed by both preview and live engines. */
final class SceneSettings {
    private final SharedPreferences preferences;
    SceneSettings(Context context) {
        preferences = context.getSharedPreferences("scene", Context.MODE_PRIVATE);
    }
    boolean wider() { return preferences.getBoolean("wider", true); }
    void wider(boolean value) { preferences.edit().putBoolean("wider", value).apply(); }
}
