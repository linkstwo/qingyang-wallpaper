package com.tangtang.motionwallpaper;

import android.app.Activity;
import android.app.WallpaperManager;
import android.content.ComponentName;
import android.content.Intent;
import android.graphics.Point;
import android.os.Bundle;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

/** Large live preview with direct access to the actual wallpaper crop. */
public final class MainActivity extends Activity {
    private PreviewView preview;
    private SceneSettings settings;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        settings=new SceneSettings(this);
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xff101917);
        preview=new PreviewView(this);
        root.addView(preview,new LinearLayout.LayoutParams(-1,0,1));
        LinearLayout controls=new LinearLayout(this);controls.setOrientation(LinearLayout.VERTICAL);
        controls.setPadding(dp(12),dp(8),dp(12),dp(12));
        TextView text=new TextView(this);text.setTextColor(0xffcfe6e0);text.setTextSize(13);
        text.setText("轻漾 0.5.7 · 肩、胳膊、腰由你取景\n进入全屏后双指缩放、单指移动，再保存到壁纸。");
        controls.addView(text);
        controls.addView(button("全屏调整锁屏取景",()->startActivity(new Intent(this,FramingEditorActivity.class))),
                new LinearLayout.LayoutParams(-1,dp(48)));
        LinearLayout presets=row();
        add(presets,"肩臂腰",()->preset(0));add(presets,"完整原图",()->preset(1));add(presets,"近景",()->preset(2));
        controls.addView(presets);
        LinearLayout motion=row();
        Button response=add(motion,settings.lively()?"动感：明显":"动感：原版",()->{});
        response.setOnClickListener(v->{settings.lively(!settings.lively());response.setText(settings.lively()?"动感：明显":"动感：原版");});
        Button structure=add(motion,settings.structure()?"视角：开启":"视角：关闭",()->{});
        structure.setOnClickListener(v->{settings.structure(!settings.structure());structure.setText(settings.structure()?"视角：开启":"视角：关闭");});
        add(motion,"校准回正",()->preview.recalibrate());controls.addView(motion);
        LinearLayout apply=row();
        add(apply,"设为动态壁纸",()->{
            Intent i=new Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER);
            i.putExtra(WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,new ComponentName(this,MotionWallpaperService.class));
            try{startActivity(i);}catch(Exception e){Toast.makeText(this,"请从系统壁纸设置选择轻漾",Toast.LENGTH_LONG).show();}
        });
        add(apply,"静态角度参考",()->startActivity(new Intent(this,FramingStudyActivity.class)));
        controls.addView(apply);root.addView(controls);setContentView(root);
    }
    private void preset(int mode){Point p=new Point();getWindowManager().getDefaultDisplay().getRealSize(p);settings.frame(CropFrame.preset(p.x,p.y,mode));}
    private LinearLayout row(){LinearLayout r=new LinearLayout(this);r.setOrientation(LinearLayout.HORIZONTAL);return r;}
    private Button button(String text,Runnable action){Button b=new Button(this);b.setText(text);b.setTextSize(12);b.setAllCaps(false);b.setPadding(dp(2),0,dp(2),0);b.setOnClickListener(v->action.run());return b;}
    private Button add(LinearLayout r,String text,Runnable action){Button b=button(text,action);r.addView(b,new LinearLayout.LayoutParams(0,dp(46),1));return b;}
    @Override protected void onResume(){super.onResume();preview.start();}
    @Override protected void onPause(){preview.stop();super.onPause();}
    private int dp(float value){return Math.round(value*getResources().getDisplayMetrics().density);}
}
