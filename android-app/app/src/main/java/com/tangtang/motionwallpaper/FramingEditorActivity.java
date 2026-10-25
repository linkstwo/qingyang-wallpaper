package com.tangtang.motionwallpaper;

import android.app.Activity;
import android.app.WallpaperManager;
import android.content.ComponentName;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Point;
import android.os.Bundle;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.TextView;
import android.widget.Toast;
import java.util.Locale;

/** Full-screen live crop editor; edits remain a draft until an explicit save. */
public final class FramingEditorActivity extends Activity {
    private PreviewView preview;
    private SceneSettings settings;
    private CropFrame draft;
    private LinearLayout panel;
    private TextView label;
    private SeekBar zoom;
    private float lastX,lastY,lastSpan,downX,downY;
    private boolean moved,pinched,dynamic;
    private float phoneAspect;
    private String restored;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN
                |View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                |View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                |View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        if(android.os.Build.VERSION.SDK_INT>=28) {
            WindowManager.LayoutParams a=getWindow().getAttributes();
            a.layoutInDisplayCutoutMode=WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(a);
        }
        Point size=new Point();getWindowManager().getDefaultDisplay().getRealSize(size);
        phoneAspect=size.x/(float)Math.max(1,size.y);
        settings=new SceneSettings(this);
        restored=state==null?null:state.getString("draft");
        FrameLayout root=new FrameLayout(this);
        root.setBackgroundColor(0xff101917);
        preview=new PreviewView(this);
        preview.freezeMotion(true);
        root.addView(preview,new FrameLayout.LayoutParams(-1,-1));
        preview.addOnLayoutChangeListener((v,l,t,r,b,ol,ot,or,ob)->{
            if(draft==null&&r>l&&b>t) {
                int[] box=box();draft=CropFrame.decode(restored);
                if(draft==null)draft=settings.frame(box[2],box[3]);
                refresh();
            }
        });
        preview.setOnTouchListener((v,event)->gesture(event));

        panel=new LinearLayout(this);panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(dp(12),dp(10),dp(12),dp(26));
        panel.setBackgroundColor(0xe6152420);
        label=new TextView(this);label.setTextColor(Color.WHITE);label.setTextSize(15);
        panel.addView(label);
        TextView hint=new TextView(this);hint.setTextColor(0xffb4d7c4);hint.setTextSize(12);
        hint.setText("双指缩放 · 单指拖动 · 轻点画面收起按钮\n保存后预览与现有壁纸共用此取景；系统裁切以手机实际锁屏为准。");
        panel.addView(hint);
        zoom=new SeekBar(this);zoom.setMax(305);
        zoom.setContentDescription("取景缩放，45%到350%");
        zoom.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){
            public void onProgressChanged(SeekBar bar,int p,boolean user){
                if(!user||draft==null)return;
                int[] b=box();float cx=b[2]*.5f,cy=b[3]*.5f;
                draft=draft.gesture(b[2],b[3],cx,cy,cx,cy,(p+45)/100f/draft.zoom);refresh();
            }
            public void onStartTrackingTouch(SeekBar bar){}
            public void onStopTrackingTouch(SeekBar bar){}
        });panel.addView(zoom);
        LinearLayout presets=row();
        String[] names={"肩臂腰","完整原图","近景"};
        for(int n=0;n<3;n++) {final int mode=n;
            add(presets,names[n],()->{int[] b=box();draft=CropFrame.preset(b[2],b[3],mode);refresh();});
        }
        panel.addView(presets);
        LinearLayout compare=row();
        Button before=add(compare,"按住看0.5.6",()->{});
        before.setOnTouchListener((v,e)->{
            if(draft==null)return true;
            if(e.getActionMasked()==MotionEvent.ACTION_DOWN){
                int[] b=box();Framing old=new Framing(b[2],b[3],true,90,10);
                preview.crop(CropFrame.fromPixels(b[2],b[3],old.scale,old.x,old.y));
                return true;
            }
            if(e.getActionMasked()==MotionEvent.ACTION_UP||e.getActionMasked()==MotionEvent.ACTION_CANCEL){
                preview.crop(draft);return true;
            }
            return true;
        });
        Button motion=add(compare,"试看动态",()->{});
        motion.setOnClickListener(v->{dynamic=!dynamic;preview.freezeMotion(!dynamic);
            motion.setText(dynamic?"暂停，精确取景":"试看动态");});
        panel.addView(compare);
        LinearLayout actions=row();
        add(actions,"返回不保存",()->finish());
        add(actions,"保存",()->{if(save()){Toast.makeText(this,"已保存取景，壁纸会读取新位置",Toast.LENGTH_SHORT).show();finish();}});
        add(actions,"保存并设置",()->{if(!save())return;
            Intent intent=new Intent(WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER);
            intent.putExtra(WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,new ComponentName(this,MotionWallpaperService.class));
            try{startActivity(intent);finish();}catch(Exception e){Toast.makeText(this,"请从系统壁纸设置中选择轻漾",Toast.LENGTH_LONG).show();}
        });panel.addView(actions);
        root.addView(panel,new FrameLayout.LayoutParams(-1,-2,Gravity.BOTTOM));
        setContentView(root);
    }

    private int[] box(){return Framing.previewViewport(preview.getWidth(),preview.getHeight(),phoneAspect);}
    private boolean gesture(MotionEvent e) {
        if(draft==null)return true;
        int action=e.getActionMasked(),count=e.getPointerCount();
        int[] b=box();
        if(action==MotionEvent.ACTION_DOWN){
            lastX=downX=e.getX();lastY=downY=e.getY();lastSpan=0;moved=pinched=false;
            preview.getParent().requestDisallowInterceptTouchEvent(true);return true;
        }
        if(action==MotionEvent.ACTION_POINTER_DOWN){
            pinched=true;lastX=(e.getX(0)+e.getX(1))*.5f;lastY=(e.getY(0)+e.getY(1))*.5f;
            lastSpan=span(e);return true;
        }
        if(action==MotionEvent.ACTION_POINTER_UP){
            int first=-1,second=-1;
            for(int n=0;n<count;n++)if(n!=e.getActionIndex()){if(first<0)first=n;else if(second<0)second=n;}
            lastX=e.getX(first);lastY=e.getY(first);lastSpan=0;
            if(second>=0){lastX=(lastX+e.getX(second))*.5f;lastY=(lastY+e.getY(second))*.5f;
                lastSpan=(float)Math.hypot(e.getX(first)-e.getX(second),e.getY(first)-e.getY(second));}
            moved=true;return true;
        }
        if(action==MotionEvent.ACTION_MOVE){
            float x=count>1?(e.getX(0)+e.getX(1))*.5f:e.getX();
            float y=count>1?(e.getY(0)+e.getY(1))*.5f:e.getY();
            float span=count>1?span(e):0;
            float ratio=span>0&&lastSpan>0?span/lastSpan:1;
            if(Math.hypot(x-downX,y-downY)>dp(5)||count>1)moved=true;
            if(moved){draft=draft.gesture(b[2],b[3],lastX-b[0],lastY-b[1],x-b[0],y-b[1],ratio);refresh();}
            lastX=x;lastY=y;lastSpan=span;return true;
        }
        if(action==MotionEvent.ACTION_UP){
            if(!moved&&!pinched){panel.setVisibility(panel.getVisibility()==View.VISIBLE?View.GONE:View.VISIBLE);preview.performClick();}
            return true;
        }
        return true;
    }
    private float span(MotionEvent e){return (float)Math.hypot(e.getX(1)-e.getX(0),e.getY(1)-e.getY(0));}
    private void refresh(){
        if(draft==null)return;
        preview.crop(draft);
        label.setText(String.format(Locale.CHINA,"锁屏取景 · %.0f%%",draft.zoom*100));
        zoom.setProgress(Math.round(draft.zoom*100)-45);
    }
    private boolean save(){if(draft==null)return false;settings.frame(draft);return true;}
    private LinearLayout row(){LinearLayout r=new LinearLayout(this);r.setOrientation(LinearLayout.HORIZONTAL);return r;}
    private Button add(LinearLayout row,String text,Runnable action){
        Button b=new Button(this);b.setText(text);b.setTextSize(12);b.setAllCaps(false);
        b.setPadding(dp(2),0,dp(2),0);b.setOnClickListener(v->action.run());
        row.addView(b,new LinearLayout.LayoutParams(0,dp(46),1));return b;
    }
    @Override protected void onSaveInstanceState(Bundle out){if(draft!=null)out.putString("draft",draft.encode());super.onSaveInstanceState(out);}
    @Override protected void onResume(){super.onResume();preview.start();}
    @Override protected void onPause(){preview.stop();super.onPause();}
    private int dp(float v){return Math.round(v*getResources().getDisplayMetrics().density);}
}
