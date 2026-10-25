package com.tangtang.motionwallpaper;

import android.content.Context;
import android.content.SharedPreferences;

/** Composition is persistent and observed by both preview and live engines. */
final class SceneSettings {
    private final SharedPreferences preferences;
    SceneSettings(Context context) {
        preferences = context.getSharedPreferences("scene", Context.MODE_PRIVATE);
        if (preferences.getInt("framingRevision", 0) < 2) {
            // Activate the new subject fit once; the old size slider had a different basis.
            // Keep the user's vertical placement and all physics/view preferences.
            preferences.edit().putBoolean("wider", true).putInt("sizePercent", 90)
                    .putInt("framingRevision", 2).apply();
        }
    }
    boolean wider() { return preferences.getBoolean("wider", true); }
    void wider(boolean value) { preferences.edit().putBoolean("wider", value).apply(); }
    int topPercent() { return Math.max(0, Math.min(20, preferences.getInt("topPercent", 10))); }
    void topPercent(int value) { preferences.edit().putInt("topPercent", Math.max(0, Math.min(20, value))).apply(); }
    boolean structure() { return preferences.getBoolean("structure", true); }
    void structure(boolean value) { preferences.edit().putBoolean("structure", value).apply(); }
    int sizePercent() { return Math.max(65, Math.min(125, preferences.getInt("sizePercent", 90))); }
    void sizePercent(int value) { preferences.edit().putInt("sizePercent", Math.max(65, Math.min(125, value))).apply(); }
}
