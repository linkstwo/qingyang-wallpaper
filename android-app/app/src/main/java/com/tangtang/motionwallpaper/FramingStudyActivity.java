package com.tangtang.motionwallpaper;

import android.app.Activity;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.io.InputStream;

/** Original-image composition study. A fixed reference is never labelled live 3D. */
public final class FramingStudyActivity extends Activity {
    private StudyView study;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        FrameLayout root = new FrameLayout(this);
        study = new StudyView();
        root.addView(study, new FrameLayout.LayoutParams(-1, -1));
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(dp(10), dp(6), dp(10), dp(12));
        panel.setBackgroundColor(0xdc111b18);
        TextView description = new TextView(this);
        description.setTextColor(0xffeff7ed);
        description.setTextSize(13);
        description.setText("肩背构图对照 · 轻点画面隐藏/显示按钮\n肩背图是固定角度参考，尚未接入动态壁纸。");
        panel.addView(description);
        LinearLayout choices = new LinearLayout(this);
        String[] labels = {"原版", "前侧", "肩背"};
        for (int n = 0; n < labels.length; n++) {
            final int mode = n;
            Button b = new Button(this);
            b.setText(labels[n]);
            b.setContentDescription("全屏查看" + labels[n] + "构图");
            b.setOnClickListener(v -> { study.mode = mode; study.invalidate(); });
            choices.addView(b, new LinearLayout.LayoutParams(0, -2, 1));
        }
        panel.addView(choices);
        Button done = new Button(this);
        done.setText("返回动态壁纸");
        done.setOnClickListener(v -> finish());
        panel.addView(done);
        FrameLayout.LayoutParams controls = new FrameLayout.LayoutParams(-1, -2, Gravity.BOTTOM);
        root.addView(panel, controls);
        study.setOnClickListener(v -> panel.setVisibility(panel.getVisibility() == View.VISIBLE ? View.GONE : View.VISIBLE));
        setContentView(root);
    }

    @Override protected void onDestroy() {
        study.dispose();
        super.onDestroy();
    }

    private int dp(float n) { return Math.round(n * getResources().getDisplayMetrics().density); }

    private final class StudyView extends View {
        private final Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG | Paint.FILTER_BITMAP_FLAG);
        private Bitmap front, back, background;
        private String failure;
        int mode = 2;

        StudyView() {
            super(FramingStudyActivity.this);
            setContentDescription("肩背全屏静态构图，轻点隐藏或显示控制按钮");
            try {
                front = load("original.png");
                back = load("back-reference.png");
                background = load("background.png");
            } catch (Exception problem) {
                failure = "参考图加载失败，请返回：" + problem.getMessage();
            }
        }

        private Bitmap load(String name) throws Exception {
            try (InputStream in = getAssets().open(name)) {
                Bitmap b = BitmapFactory.decodeStream(in);
                if (b == null || b.getWidth() != 1086 || b.getHeight() != 1448)
                    throw new IllegalStateException(name + "尺寸不符");
                return b;
            }
        }

        @Override protected void onDraw(Canvas canvas) {
            super.onDraw(canvas);
            canvas.drawColor(Color.rgb(12, 20, 17));
            if (failure != null) {
                paint.setColor(Color.WHITE); paint.setTextSize(dp(14));
                canvas.drawText(failure, dp(12), getHeight()*.4f, paint);
                return;
            }
            float w = getWidth(), h = getHeight();
            float cover = Math.max(w/1086f, h/1448f);
            drawImage(canvas, background, cover, (w-1086f*cover)/2, (h-1448f*cover)/2);
            float scale, x, y;
            if (mode == 0) {
                // Reproduce 0.5.5 defaults for a meaningful same-screen comparison.
                scale = Math.min(cover, w/1086f*.9f);
                x = w*.5f-590f*scale;
                y = (h-1448f*scale)*.5f >= 0 ? Math.min(h-1448f*scale,h*.1f) : (h-1448f*scale)*.5f;
            } else {
                StudyFraming frame = StudyFraming.fit(getWidth(), getHeight(), mode == 2, 90, 5);
                scale = frame.scale; x = frame.x; y = frame.y;
            }
            drawImage(canvas, mode == 2 ? back : front, scale, x, y);
        }

        private void drawImage(Canvas canvas, Bitmap image, float scale, float x, float y) {
            canvas.drawBitmap(image, null, new RectF(x, y, x+1086f*scale, y+1448f*scale), paint);
        }

        void dispose() {
            if (front != null) front.recycle();
            if (back != null) back.recycle();
            if (background != null) background.recycle();
        }
    }
}
