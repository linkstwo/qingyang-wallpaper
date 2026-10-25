package com.tangtang.motionwallpaper;

import android.app.Activity;
import android.app.WallpaperManager;
import android.content.ComponentName;
import android.content.Intent;
import android.graphics.drawable.GradientDrawable;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

final class Ui {
    static final int INK=0xffeef4ed,MUTED=0xffb8c6bb,ACCENT=0xffc8dfba;
    static int dp(Activity a,float v){return Math.round(v*a.getResources().getDisplayMetrics().density);}
    static TextView text(Activity a,String value,int size,int color){TextView t=new TextView(a);t.setText(value);t.setTextSize(size);t.setTextColor(color);return t;}
    static GradientDrawable card(Activity a,int color){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(a,20));return d;}
    static Button button(Activity a,String text,boolean primary,Runnable action){Button b=new Button(a);b.setAllCaps(false);b.setText(text);b.setTextSize(14);b.setTextColor(primary?0xff1d3025:INK);b.setBackground(card(a,primary?ACCENT:0xeb25372e));b.setMinHeight(dp(a,48));b.setMinimumWidth(0);b.setPadding(dp(a,10),0,dp(a,10),0);b.setOnClickListener(v->action.run());return b;}
    static void immersive(Activity a){a.getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_STABLE);if(android.os.Build.VERSION.SDK_INT>=28){WindowManager.LayoutParams p=a.getWindow().getAttributes();p.layoutInDisplayCutoutMode=WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;a.getWindow().setAttributes(p);}}
    static boolean apply(Activity a){Intent i=new Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER);i.putExtra(WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,new ComponentName(a,MotionWallpaperService.class));try{a.startActivity(i);return true;}catch(android.content.ActivityNotFoundException e){try{a.startActivity(new Intent(WallpaperManager.ACTION_LIVE_WALLPAPER_CHOOSER));return true;}catch(android.content.ActivityNotFoundException missing){Toast.makeText(a,"请在系统壁纸设置中选择轻漾",Toast.LENGTH_LONG).show();return false;}}}
}
