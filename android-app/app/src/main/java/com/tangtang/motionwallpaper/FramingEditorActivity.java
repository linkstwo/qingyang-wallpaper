package com.tangtang.motionwallpaper;

import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Point;
import android.os.Bundle;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.SeekBar;
import android.widget.TextView;

/** A full-screen draft editor; compact controls leave the character visible. */
public final class FramingEditorActivity extends Activity {
    private PreviewView preview;
    private SceneSettings settings;
    private CropFrame draft;
    private LinearLayout details;
    private TextView label,hint;
    private SeekBar zoom;
    private FocusGuide guide;
    private Button motion,saveButton;
    private float lastX,lastY,lastSpan,downX,downY,phoneAspect;
    private boolean moved,pinched,dynamic;
    private String restored,initial;
    private int touchSlop;
    @Override public void onCreate(Bundle state){
        super.onCreate(state);Ui.immersive(this);getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        Point size=new Point();getWindowManager().getDefaultDisplay().getRealSize(size);phoneAspect=size.x/(float)Math.max(1,size.y);
        touchSlop=ViewConfiguration.get(this).getScaledTouchSlop();settings=new SceneSettings(this);
        restored=state==null?null:state.getString("draft");dynamic=state!=null&&state.getBoolean("dynamic",false);
        FrameLayout root=new FrameLayout(this);root.setBackgroundColor(0xff17221c);
        preview=new PreviewView(this);preview.freezeMotion(!dynamic);root.addView(preview,new FrameLayout.LayoutParams(-1,-1));
        guide=new FocusGuide(this);root.addView(guide,new FrameLayout.LayoutParams(-1,-1));
        preview.setOnTouchListener((v,e)->gesture(e));
        preview.addOnLayoutChangeListener((v,l,t,r,b,ol,ot,or,ob)->{
            if(r<=l||b<=t)return;int[] box=box();
            if(draft==null){initial=state==null?settings.frame(box[2],box[3]).encode():state.getString("initial",settings.frame(box[2],box[3]).encode());draft=CropFrame.decode(restored);if(draft==null)draft=CropFrame.decode(initial);}
            zoom.setMin((int)Math.ceil(CropFrame.minZoom(box[2],box[3])*100));zoom.setMax(350);
            draft=draft.bounded(box[2],box[3]);refresh();
        });
        LinearLayout top=new LinearLayout(this);top.setGravity(Gravity.CENTER_VERTICAL);top.setPadding(dp(14),dp(40),dp(14),dp(10));add(top,"取消",false,()->finish());
        TextView title=Ui.text(this,"锁屏构图",17,Ui.INK);title.setGravity(Gravity.CENTER);top.addView(title,new LinearLayout.LayoutParams(0,dp(48),1));
        saveButton=Ui.button(this,"保存",true,()->save(false));saveButton.setEnabled(false);top.addView(saveButton,new LinearLayout.LayoutParams(dp(80),dp(48)));root.addView(top,new FrameLayout.LayoutParams(-1,-2,Gravity.TOP));
        LinearLayout bottom=new LinearLayout(this);bottom.setOrientation(LinearLayout.VERTICAL);bottom.setPadding(dp(12),dp(10),dp(12),dp(10));bottom.setBackground(Ui.card(this,0xec1b2a22));
        hint=Ui.text(this,"双指缩放 · 单指移动 · 胸部对齐画面中心",12,Ui.MUTED);bottom.addView(hint);
        details=new LinearLayout(this);details.setOrientation(LinearLayout.VERTICAL);details.setVisibility(View.GONE);label=Ui.text(this,"正在加载…",13,Ui.INK);details.addView(label);
        zoom=new SeekBar(this);zoom.setContentDescription("人物大小");zoom.setMax(350);
        zoom.setOnSeekBarChangeListener(new SeekBar.OnSeekBarChangeListener(){public void onStartTrackingTouch(SeekBar b){}public void onStopTrackingTouch(SeekBar b){}public void onProgressChanged(SeekBar b,int p,boolean user){if(!user||draft==null)return;int[] v=box();float x=v[2]*.5f,y=v[3]*.5f;draft=draft.gesture(v[2],v[3],x,y,x,y,p/100f/draft.zoom);refresh();}});details.addView(zoom);
        LinearLayout presets=row();add(presets,"主体突出",false,()->preset(0));add(presets,"保留更多",false,()->preset(1));add(presets,"近景",false,()->preset(2));details.addView(presets);
        LinearLayout tools=row();add(tools,"胸部居中",false,()->{if(draft!=null){draft=new CropFrame(draft.zoom,CropFrame.FOCUS_X,CropFrame.FOCUS_Y);refresh();}});add(tools,"保存并设置壁纸",true,()->save(true));details.addView(tools);bottom.addView(details);
        LinearLayout bar=row();Button expand=add(bar,"调整大小",false,()->{});expand.setOnClickListener(v->{boolean show=details.getVisibility()!=View.VISIBLE;details.setVisibility(show?View.VISIBLE:View.GONE);expand.setText(show?"收起面板":"调整大小");});
        motion=add(bar,dynamic?"暂停动态":"试看动态",false,()->{});motion.setOnClickListener(v->{dynamic=!dynamic;preview.freezeMotion(!dynamic);guide.setVisibility(dynamic?View.GONE:View.VISIBLE);motion.setText(dynamic?"暂停动态":"试看动态");});bottom.addView(bar);
        FrameLayout.LayoutParams bp=new FrameLayout.LayoutParams(-1,-2,Gravity.BOTTOM);bp.setMargins(dp(12),0,dp(12),dp(24));root.addView(bottom,bp);
        preview.listener(error->{hint.setText(error.isEmpty()?"双指缩放 · 单指移动 · 胸部对齐画面中心":"加载失败："+error);saveButton.setEnabled(error.isEmpty()&&draft!=null);});guide.setVisibility(dynamic?View.GONE:View.VISIBLE);setContentView(root);
    }
    private void preset(int mode){int[] b=box();draft=CropFrame.preset(b[2],b[3],mode);refresh();}
    private int[] box(){return Framing.previewViewport(preview.getWidth(),preview.getHeight(),phoneAspect);}
    private boolean gesture(MotionEvent e){
        if(draft==null)return true;int action=e.getActionMasked(),count=e.getPointerCount();int[] b=box();
        if(action==MotionEvent.ACTION_DOWN){lastX=downX=e.getX();lastY=downY=e.getY();lastSpan=0;moved=pinched=false;return true;}
        if(action==MotionEvent.ACTION_POINTER_DOWN){pinched=true;lastX=(e.getX(0)+e.getX(1))*.5f;lastY=(e.getY(0)+e.getY(1))*.5f;lastSpan=span(e);return true;}
        if(action==MotionEvent.ACTION_POINTER_UP){int first=-1,second=-1;for(int n=0;n<count;n++)if(n!=e.getActionIndex()){if(first<0)first=n;else if(second<0)second=n;}if(first<0)return true;lastX=e.getX(first);lastY=e.getY(first);lastSpan=0;if(second>=0){lastX=(lastX+e.getX(second))*.5f;lastY=(lastY+e.getY(second))*.5f;lastSpan=(float)Math.hypot(e.getX(first)-e.getX(second),e.getY(first)-e.getY(second));}moved=true;return true;}
        if(action==MotionEvent.ACTION_MOVE){float x=count>1?(e.getX(0)+e.getX(1))*.5f:e.getX(),y=count>1?(e.getY(0)+e.getY(1))*.5f:e.getY(),s=count>1?span(e):0,ratio=s>0&&lastSpan>0?s/lastSpan:1;if(Math.hypot(x-downX,y-downY)>touchSlop||count>1)moved=true;if(moved){draft=draft.gesture(b[2],b[3],lastX-b[0],lastY-b[1],x-b[0],y-b[1],ratio);refresh();}lastX=x;lastY=y;lastSpan=s;return true;}
        if(action==MotionEvent.ACTION_UP){if(!moved&&!pinched){guide.setVisibility(guide.getVisibility()==View.VISIBLE?View.GONE:View.VISIBLE);preview.performClick();}return true;}return true;
    }
    private float span(MotionEvent e){return (float)Math.hypot(e.getX(1)-e.getX(0),e.getY(1)-e.getY(0));}
    private void refresh(){if(draft==null)return;preview.crop(draft);int[] b=box();float coverage=Math.min(100,100*CropFrame.HEIGHT*draft.scale(b[2])/Math.max(1,b[3]));label.setText("人物大小 "+Math.round(draft.zoom*100)+"% · 原图高度占屏约 "+Math.round(coverage)+"%");zoom.setProgress(Math.round(draft.zoom*100));}
    private void save(boolean apply){if(draft==null)return;settings.frame(draft);initial=draft.encode();if(!apply||Ui.apply(this))finish();}
    @Override public void onBackPressed(){if(draft==null||draft.encode().equals(initial)){super.onBackPressed();return;}new AlertDialog.Builder(this).setTitle("保留这次构图？").setPositiveButton("保存",(d,w)->save(false)).setNegativeButton("放弃修改",(d,w)->finish()).setNeutralButton("继续编辑",null).show();}
    private LinearLayout row(){return new LinearLayout(this);}
    private Button add(LinearLayout row,String text,boolean primary,Runnable action){Button b=Ui.button(this,text,primary,action);LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(48),1);p.setMargins(dp(3),dp(3),dp(3),dp(3));row.addView(b,p);return b;}
    @Override protected void onSaveInstanceState(Bundle out){if(draft!=null)out.putString("draft",draft.encode());out.putString("initial",initial);out.putBoolean("dynamic",dynamic);super.onSaveInstanceState(out);}
    @Override protected void onResume(){super.onResume();Ui.immersive(this);preview.start();}
    @Override protected void onPause(){preview.stop();super.onPause();}
    private int dp(float v){return Ui.dp(this,v);}
}
