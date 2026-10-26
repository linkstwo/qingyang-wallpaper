package com.tangtang.motionwallpaper;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

/** A full-screen character preview with two primary actions. */
public final class MainActivity extends Activity {
    private PreviewView preview;
    private SceneSettings settings;
    private TextView subtitle;
    @Override public void onCreate(Bundle state){
        super.onCreate(state);Ui.immersive(this);settings=new SceneSettings(this);
        FrameLayout root=new FrameLayout(this);root.setBackgroundColor(0xff17221c);
        preview=new PreviewView(this);root.addView(preview,new FrameLayout.LayoutParams(-1,-1));
        LinearLayout header=new LinearLayout(this);header.setOrientation(LinearLayout.VERTICAL);header.setPadding(dp(20),dp(42),dp(20),dp(12));
        header.addView(Ui.text(this,"轻漾",25,Ui.INK));subtitle=Ui.text(this,"正在加载人物…",12,Ui.MUTED);header.addView(subtitle);
        root.addView(header,new FrameLayout.LayoutParams(-1,-2,Gravity.TOP));
        preview.listener(error->subtitle.setText(error.isEmpty()?"轻转手机看视角 · 轻晃感受回弹":"加载失败："+error));
        LinearLayout card=new LinearLayout(this);card.setOrientation(LinearLayout.VERTICAL);card.setPadding(dp(12),dp(12),dp(12),dp(12));card.setBackground(Ui.card(this,0xe91b2a22));
        LinearLayout actions=new LinearLayout(this);add(actions,"调整构图",false,()->startActivity(new Intent(this,FramingEditorActivity.class)));add(actions,"设为壁纸",true,()->Ui.apply(this));card.addView(actions);
        LinearLayout options=new LinearLayout(this);Button response=add(options,settings.lively()?"Q弹 · 开启":"动感 · 柔和",false,()->{});
        response.setOnClickListener(v->{settings.lively(!settings.lively());response.setText(settings.lively()?"Q弹 · 开启":"动感 · 柔和");preview.requestRender();});
        add(options,"回正",false,()->preview.recalibrate());add(options,"更多",false,()->more());card.addView(options);
        FrameLayout.LayoutParams bottom=new FrameLayout.LayoutParams(-1,-2,Gravity.BOTTOM);bottom.setMargins(dp(14),0,dp(14),dp(26));root.addView(card,bottom);setContentView(root);
    }
    private void more(){new AlertDialog.Builder(this).setTitle("显示与查看").setItems(new String[]{settings.structure()?"关闭视角响应":"开启视角响应","查看静态角度参考","版本 0.5.9 · 轮廓与空间遮挡"},(d,n)->{if(n==0){settings.structure(!settings.structure());preview.requestRender();}else if(n==1)startActivity(new Intent(this,FramingStudyActivity.class));}).setNegativeButton("关闭",null).show();}
    private Button add(LinearLayout row,String text,boolean primary,Runnable action){Button b=Ui.button(this,text,primary,action);LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(48),1);p.setMargins(dp(3),dp(3),dp(3),dp(3));row.addView(b,p);return b;}
    @Override protected void onResume(){super.onResume();Ui.immersive(this);preview.start();}
    @Override protected void onPause(){preview.stop();super.onPause();}
    private int dp(float v){return Ui.dp(this,v);}
}
