package com.tangtang.motionwallpaper;

import android.app.Activity;
import android.app.WallpaperManager;
import android.content.ComponentName;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/** 入口页：应用内预览（与壁纸同一个渲染器和物理）＋ 一个“设为动态壁纸”按钮。 */
public final class MainActivity extends Activity {
    private PreviewView preview;
    private TextView status;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable tick = new Runnable() {
        @Override
        public void run() {
            if (status != null && preview != null) {
                status.setText(preview.stats());
            }
            handler.postDelayed(this, 500L);
        }
    };

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor("#0b0f14"));

        preview = new PreviewView(this);
        root.addView(preview, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        TextView hint = new TextView(this);
        hint.setText("缓慢倾斜手机 → 人物小幅连续转向；快速轻晃 → 身体、胸部与头发的惯性回弹。\n"
                + "点【设为动态壁纸】后选择“轻漾 · 感应动态壁纸”，桌面与锁屏都生效。");
        hint.setTextColor(Color.parseColor("#cfe6e0"));
        hint.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13.0f);
        hint.setPadding(dp(14), dp(10), dp(14), dp(4));
        root.addView(hint);

        status = new TextView(this);
        status.setTextColor(Color.parseColor("#8fbdb2"));
        status.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12.0f);
        status.setPadding(dp(14), dp(4), dp(14), dp(8));
        root.addView(status);

        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setPadding(dp(10), 0, dp(10), dp(6));
        Button apply = new Button(this);
        apply.setText("设为动态壁纸");
        Button center = new Button(this);
        center.setText("校准回正");
        row.addView(apply, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        row.addView(center, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        root.addView(row);

        LinearLayout row2 = new LinearLayout(this);
        row2.setOrientation(LinearLayout.HORIZONTAL);
        row2.setPadding(dp(10), 0, dp(10), dp(12));
        Button pan = new Button(this);
        pan.setText("⚙ 取景参数");
        Button panReset = new Button(this);
        panReset.setText("恢复默认取景");
        row2.addView(pan, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        row2.addView(panReset, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        root.addView(row2);
        setContentView(root);

        apply.setOnClickListener(v -> {
            Intent intent = new Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER);
            intent.putExtra(WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,
                    new ComponentName(MainActivity.this, MotionWallpaperService.class));
            try {
                startActivity(intent);
            } catch (Exception failure) {
                status.setText("打不开系统壁纸选择器：" + failure.getMessage());
            }
        });
        center.setOnClickListener(v -> {
            preview.recalibrate();
            status.setText("已重新取中性姿态：手怎么拿着都算正中");
        });
        pan.setOnClickListener(v -> showPanDialog());
        panReset.setOnClickListener(v -> {
            getSharedPreferences("qingyang_settings", MODE_PRIVATE).edit()
                    .remove("viewPanBase").remove("viewPanRange").apply();
            status.setText("取景参数已恢复默认（居中、不跟移）——完全退出重开后生效");
        });
        handler.post(tick);
    }

    /** 商品化：取景参数对话框（窗口基准 0–100%、随视角摆动 0–15%），存 SharedPreferences，重开后由 RenderParams 读取。 */
    private void showPanDialog() {
        final android.content.SharedPreferences sp = getSharedPreferences("qingyang_settings", MODE_PRIVATE);
        final float base = sp.getFloat("viewPanBase", 0.5f);
        final float range = sp.getFloat("viewPanRange", 0.0f);

        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setPadding(dp(18), dp(12), dp(18), dp(6));

        TextView baseLabel = new TextView(this);
        baseLabel.setText(String.format(java.util.Locale.US, "窗口基准偏移：%.0f%%（0=左 50=居中 100=右）", base * 100));
        android.widget.SeekBar baseBar = new android.widget.SeekBar(this);
        baseBar.setMax(100);
        baseBar.setProgress(Math.round(base * 100));
        baseBar.setOnSeekBarChangeListener(new android.widget.SeekBar.OnSeekBarChangeListener() {
            @Override public void onProgressChanged(android.widget.SeekBar bar, int value, boolean fromUser) {
                baseLabel.setText(String.format(java.util.Locale.US, "窗口基准偏移：%d%%（0=左 50=居中 100=右）", value));
            }
            @Override public void onStartTrackingTouch(android.widget.SeekBar bar) { }
            @Override public void onStopTrackingTouch(android.widget.SeekBar bar) { }
        });
        box.addView(baseLabel);
        box.addView(baseBar);

        TextView rangeLabel = new TextView(this);
        rangeLabel.setText(String.format(java.util.Locale.US, "随视角摆动幅度：±%.0f%%（0=不跟移）", range * 100));
        android.widget.SeekBar rangeBar = new android.widget.SeekBar(this);
        rangeBar.setMax(15);
        rangeBar.setProgress(Math.round(range * 100));
        rangeBar.setOnSeekBarChangeListener(new android.widget.SeekBar.OnSeekBarChangeListener() {
            @Override public void onProgressChanged(android.widget.SeekBar bar, int value, boolean fromUser) {
                rangeLabel.setText(String.format(java.util.Locale.US, "随视角摆动幅度：±%d%%（0=不跟移）", value));
            }
            @Override public void onStartTrackingTouch(android.widget.SeekBar bar) { }
            @Override public void onStopTrackingTouch(android.widget.SeekBar bar) { }
        });
        box.addView(rangeLabel);
        box.addView(rangeBar);

        TextView note = new TextView(this);
        note.setText("跟移说明：手机倾斜时取景窗口随视角平移，保持人物在窗口内（幅度建议 5–10%）。保存后完全退出重开本应用生效。");
        note.setTextColor(Color.parseColor("#8fbdb2"));
        note.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11.0f);
        box.addView(note);

        new android.app.AlertDialog.Builder(this)
                .setTitle("取景参数")
                .setView(box)
                .setPositiveButton("保存", (dialog, which) -> {
                    sp.edit()
                            .putFloat("viewPanBase", baseBar.getProgress() / 100.0f)
                            .putFloat("viewPanRange", rangeBar.getProgress() / 100.0f)
                            .apply();
                    status.setText("取景参数已保存——完全退出重开后生效");
                })
                .setNegativeButton("取消", null)
                .show();
    }

    @Override
    protected void onResume() {
        super.onResume();
        preview.start();
    }

    @Override
    protected void onPause() {
        preview.stop();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacks(tick);
        super.onDestroy();
    }

    private int dp(float value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}