package com.tangtang.motionwallpaper;
import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.view.View;
/** Optional full-screen centre reference, independent of crop coordinates. */
final class FocusGuide extends View {
    private final Paint paint=new Paint(Paint.ANTI_ALIAS_FLAG);
    FocusGuide(Context context){super(context);setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);setClickable(false);}
    @Override protected void onDraw(Canvas canvas){float d=getResources().getDisplayMetrics().density,x=getWidth()*.5f,y=getHeight()*.5f;paint.setColor(0x99f0f7e7);paint.setStrokeWidth(d);canvas.drawLine(x-20*d,y,x-7*d,y,paint);canvas.drawLine(x+7*d,y,x+20*d,y,paint);canvas.drawLine(x,y-20*d,x,y-7*d,paint);canvas.drawLine(x,y+7*d,x,y+20*d,paint);}
}
