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
        framing.setText(sceneSettings.wider() ? "构图：主体优先 · 点此切近景" : "构图：近景 · 点此保留肩背侧缘");
        framing.setOnClickListener(v -> {
            sceneSettings.wider(!sceneSettings.wider());
            framing.setText(sceneSettings.wider() ? "构图：主体优先 · 点此切近景" : "构图：近景 · 点此保留肩背侧缘");
        });
        root.addView(framing);

        TextView sizeLabel = new TextView(this);
        sizeLabel.setTextColor(Color.parseColor("#cfe6e0"));
        sizeLabel.setPadding(dp(14), dp(4), dp(14), 0);
        sizeLabel.setText("人物大小 " + sceneSettings.sizePercent() + "% · 调整人物占屏大小");
        root.addView(sizeLabel);
        SeekBar size = new SeekBar(this);
        size.setMax(60);
        size.setProgress(sceneSettings.sizePercent() - 65);
        size.setContentDescription("人物大小，65%到125%");
        size.setPadding(dp(14), 0, dp(14), 0);
        size.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            public void onProgressChanged(SeekBar bar, int progress, boolean fromUser) {
                if (!fromUser) return;
                sceneSettings.sizePercent(progress + 65);
                // Editing this slider is an explicit request for the wider composition.
                sceneSettings.wider(true);
                framing.setText("构图：主体优先 · 点此切近景");
                sizeLabel.setText("人物大小 " + sceneSettings.sizePercent() + "% · 调整人物占屏大小");
            }
            public void onStartTrackingTouch(SeekBar bar) {}
            public void onStopTrackingTouch(SeekBar bar) {}
        });
        root.addView(size);

        TextView topLabel = new TextView(this);
        topLabel.setTextColor(Color.parseColor("#cfe6e0"));
        topLabel.setPadding(dp(14), 0, dp(14), 0);
        topLabel.setText("上下位置 " + sceneSettings.topPercent() + "% · 头部被裁时向右下移");
        root.addView(topLabel);
        SeekBar top = new SeekBar(this);
        top.setMax(20); top.setProgress(sceneSettings.topPercent());
        top.setContentDescription("人物上下位置，向右下移，给头部留出空间");
        top.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener() {
            public void onProgressChanged(SeekBar bar, int progress, boolean fromUser) {
                if (!fromUser) return;
                sceneSettings.topPercent(progress); sceneSettings.wider(true);
                framing.setText("构图：主体优先 · 点此切近景");
                topLabel.setText("上下位置 " + progress + "% · 头部被裁时向右下移");
            }
            public void onStartTrackingTouch(SeekBar bar) {}
            public void onStopTrackingTouch(SeekBar bar) {}
        });
        root.addView(top);

        Button structure = new Button(this);
        structure.setText(sceneSettings.structure() ? "视角：立体观察 · 点此仅保留回弹" : "视角：仅回弹 · 点此开启立体观察");
        structure.setOnClickListener(v -> {
            sceneSettings.structure(!sceneSettings.structure());
            structure.setText(sceneSettings.structure() ? "视角：立体观察 · 点此仅保留回弹" : "视角：仅回弹 · 点此开启立体观察");
        });
        root.addView(structure);

        TextView hint = new TextView(this);
        hint.setText("轻漾 0.5.6 · 主体优先构图已用于动态壁纸，大小与位置会保存。\n"
                + "【全屏肩背构图对照】可查看前侧与背向参考；背向图目前是静态对照。");
        hint.setTextColor(Color.parseColor("#cfe6e0"));
        hint.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13.0f);
        hint.setPadding(dp(14), dp(10), dp(14), dp(4));
        root.addView(hint);

        Button study = new Button(this);
        study.setText("全屏肩背构图对照");
        study.setOnClickListener(v -> startActivity(new Intent(this, FramingStudyActivity.class)));
        root.addView(study);

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
