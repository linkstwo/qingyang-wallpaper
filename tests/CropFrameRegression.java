package com.tangtang.motionwallpaper;
import java.util.Locale;
public final class CropFrameRegression {
    static int checks;
    static void check(boolean b,String m){if(!b)throw new AssertionError(m);checks++;}
    static void near(float a,float b,String m){check(Math.abs(a-b)<.002f,m+" "+a+" vs "+b);}
    public static void main(String[] args){
        Locale.setDefault(Locale.US);
        int[][] screens={{1080,2400},{1260,2800},{1080,2340},{1080,1920},{720,1600},{1440,3200},{1080,1080}};
        for(int[] wh:screens){int w=wh[0],h=wh[1];
            CropFrame f=CropFrame.preset(w,h,0);
            for(float[] p:new float[][]{{815,430},{170,1170},{1005,1030},{430,330},{240,480}}){
                float x=f.x(w)+p[0]*f.scale(w),y=f.y(w,h)+p[1]*f.scale(w);
                check(x>=0&&x<=w&&y>=0&&y<=h,"shoulder/arm/waist/face/hair inside default crop");
                if(h>w){float zx=(x-w*.5f)*1.12f+w*.5f,zy=(y-h*.5f)*1.12f+h*.5f;
                    check(zx>=0&&zx<=w&&zy>=0&&zy<=h,"landmark keeps a declared simulated12% centre-zoom reserve");}
            }
            CropFrame full=CropFrame.preset(w,h,1);
            check(full.x(w)>=0&&full.x(w)+1086*full.scale(w)<=w+.001,"full image width");
            check(full.y(w,h)>=0&&full.y(w,h)+1448*full.scale(w)<=h+.001,"full image height");
            CropFrame close=CropFrame.preset(w,h,2);
            check(close.scale(w)*1086>=w-.001&&close.scale(w)*1448>=h-.001,"close preset covers viewport");
            CropFrame move=f.gesture(w,h,w*.5f,h*.5f,w*.5f+35,h*.5f-42,1);
            near(move.x(w)-f.x(w),35,"horizontal drag actually changes wallpaper transform");
            near(move.y(w,h)-f.y(w,h),-42,"vertical drag actually changes wallpaper transform");
            CropFrame pinch=f.gesture(w,h,w*.4f,h*.4f,w*.47f,h*.43f,1.3f);
            near((w*.4f-f.x(w))/f.scale(w),(w*.47f-pinch.x(w))/pinch.scale(w),"pinch source anchor x");
            near((h*.4f-f.y(w,h))/f.scale(w),(h*.43f-pinch.y(w,h))/pinch.scale(w),"pinch source anchor y");
            CropFrame restored=CropFrame.decode(pinch.encode());
            near(restored.scale(w),pinch.scale(w),"serialization scale");near(restored.x(w),pinch.x(w),"serialization x");near(restored.y(w,h),pinch.y(w,h),"serialization y");
            int[] vp=WallpaperViewport.visible(w*2,h,w,h,.5f,0,-w/2,0);
            near(vp[0]+restored.x(vp[2])-vp[0],restored.x(w),"double-width Surface uses same display-relative crop");
            CropFrame zoomIn=f.gesture(w,h,w*.5f,h*.5f,w*.5f,h*.5f,1000);
            near(zoomIn.zoom,CropFrame.MAX_ZOOM,"upper zoom bound");
            CropFrame zoomOut=f.gesture(w,h,w*.5f,h*.5f,w*.5f,h*.5f,.0001f);
            near(zoomOut.zoom,CropFrame.MIN_ZOOM,"lower zoom bound");
        }
        check(CropFrame.decode("NaN,1,1")==null,"invalid saved crop rejected");
        check(CropFrame.decode("oops")==null,"malformed saved crop rejected");
        CropFrame f=CropFrame.preset(1080,2400,0);
        check(f.gesture(1080,2400,0,0,Float.NaN,0,1)==f,"invalid touch ignored");
        android.content.Context c=new android.content.Context();SceneSettings a=new SceneSettings(c),b=new SceneSettings(c);
        CropFrame draft=f.gesture(1080,2400,100,100,130,160,1.2f);
        near(b.frame(1080,2400).zoom,f.zoom,"uncommitted edit does not alter wallpaper");
        a.frame(draft);check(b.cropRevision()==1,"all engine instances observe committed revision");
        near(b.frame(1080,2400).focusX,draft.focusX,"saved horizontal position reaches wallpaper");
        near(new SceneSettings(c).frame(1080,2400).zoom,draft.zoom,"reopen does not erase user's framing");
        System.out.println("{\"checks\":"+checks+",\"phoneTested\":false}");
    }
}
