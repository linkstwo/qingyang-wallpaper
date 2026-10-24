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
import android.widget.SeekBar;

/** 入口页：应用内预览（与壁纸同一个渲染器和物理）＋ 一个“设为动态壁纸”按钮。 */
public final class MainActivity extends Activity {
    private PreviewView preview;
    private SceneSettings sceneSettings;
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

        sceneSettings = new SceneSettings(this);
        preview = new PreviewView(this);
        root.addView(preview, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));

        Button framing = new Button(this);
        framing.setText(sceneSettings.wider() ? "构图：舒展肩背 · 点此切近景" : "构图：近景 · 点此看更多肩背");
        framing.setOnClickListener(v -> {
            sceneSettings.wider(!sceneSettings.wider());
            framing.setText(sceneSettings.wider() ? "构图：舒展肩背 · 点此切近景" : "构图：近景 · 点此看更多肩背");
        });
        root.addView(framing);

        TextView sizeLabel = new TextView(this);
        sizeLabel.setTextColor(Color.parseColor("#cfe6e0"));
        sizeLabel.setPadding(dp(14), dp(4), dp(14), 0);
        sizeLabel.setText("人物大小 " + sceneSettings.sizePercent() + "% · 锁屏仍裁剪就向左调小");
        root.addView(sizeLabel);
        SeekBar size = new SeekBar(this);
        size.setMax(60);
        size.setProgress(sceneSettings.sizePercent() - 65);
        size.setContentDescription("人物大小，65%到125%，锁屏裁剪时调小");
        size.setPadding(dp(14), 0, dp(14), 0);
        size.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            public void onProgressChanged(SeekBar bar, int progress, boolean fromUser) {
                if (!fromUser) return;
                sceneSettings.sizePercent(progress + 65);
                // Editing this slider is an explicit request for the wider composition.
                sceneSettings.wider(true);
                framing.setText("构图：舒展肩背 · 点此切近景");
                sizeLabel.setText("人物大小 " + sceneSettings.sizePercent() + "% · 锁屏仍裁剪就向左调小");
            }
            public void onStartTrackingTouch(SeekBar bar) {}
            public void onStopTrackingTouch(SeekBar bar) {}
        });
        root.addView(size);

        TextView hint = new TextView(this);
        hint.setText("轻漾 0.5.3 · 预览按手机比例显示。大小会立即保存到壁纸。\n缓慢倾斜手机 → 人物小幅连续转向；快速轻晃 → 身体、胸部与头发的惯性回弹。\n"
                + "系统可能额外放大；先调小人物留出肩背，再点【设为动态壁纸】进入系统选择器，按系统提供的选项应用。");
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
        row.setPadding(dp(10), 0, dp(10), dp(12));
        Button apply = new Button(this);
        apply.setText("设为动态壁纸");
        Button center = new Button(this);
        center.setText("校准回正");
        row.addView(apply, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        row.addView(center, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        root.addView(row);
        setContentView(root);

        apply.setOnClickListener(new android.view.View.OnClickListener() {
            @Override
            public void onClick(android.view.View view) {
                Intent intent = new Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER);
                intent.putExtra(WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,
                        new ComponentName(MainActivity.this, MotionWallpaperService.class));
                try {
                    startActivity(intent);
                } catch (Exception failure) {
                    status.setText("打不开系统壁纸选择器：" + failure.getMessage());
                }
            }
        });
        center.setOnClickListener(new android.view.View.OnClickListener() {
            @Override
            public void onClick(android.view.View view) {
                preview.recalibrate();
                status.setText("已重新取中性姿态：手怎么拿着都算正中");
            }
        });
        handler.post(tick);
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