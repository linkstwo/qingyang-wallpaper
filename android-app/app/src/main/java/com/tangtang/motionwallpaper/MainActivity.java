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