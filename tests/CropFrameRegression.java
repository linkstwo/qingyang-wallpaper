package com.tangtang.motionwallpaper;
import java.util.Locale;
public final class CropFrameRegression {
    static int checks;
    static void check(boolean b,String m){if(!b)throw new AssertionError(m);checks++;}
    static void near(float a,float b,String m){check(Math.abs(a-b)<.003f,m+" "+a+" vs "+b);}
    public static void main(String[] args){
        Locale.setDefault(Locale.US);
        int[][] screens={{1080,2400},{1260,2800},{1080,2340},{1080,1920},{720,1600},{1440,3200},{1080,1080}};
        for(int[] wh:screens){int w=wh[0],h=wh[1];CropFrame f=CropFrame.preset(w,h,0);
            near(f.x(w)+CropFrame.FOCUS_X*f.scale(w),w*.5f,"chest full-screen horizontal centre");near(f.y(w,h)+CropFrame.FOCUS_Y*f.scale(w),h*.5f,"chest full-screen vertical centre");
            check(CropFrame.HEIGHT*f.scale(w)/h>=.5999f,"60% fallback floor");if(h/(float)w>2.1f)check(CropFrame.HEIGHT*f.scale(w)/h>.75f,"default well above fallback floor");
            for(float[] p:new float[][]{{550,305},{940,490},{985,1090},{397,550},{350,1005}}){float x=f.x(w)+p[0]*f.scale(w),y=f.y(w,h)+p[1]*f.scale(w);check(x>=0&&x<=w&&y>=0&&y<=h,"new face shoulder waist hair and holding hand visible");}
            check(CropFrame.preset(w,h,1).zoom<=f.zoom,"more context");check(CropFrame.preset(w,h,2).zoom>=f.zoom,"close preset");
            CropFrame move=f.gesture(w,h,w*.5f,h*.5f,w*.5f+35,h*.5f-42,1);near(move.x(w)-f.x(w),35,"horizontal drag");near(move.y(w,h)-f.y(w,h),-42,"vertical drag");
            CropFrame pinch=f.gesture(w,h,w*.4f,h*.4f,w*.47f,h*.43f,1.3f);near((w*.4f-f.x(w))/f.scale(w),(w*.47f-pinch.x(w))/pinch.scale(w),"pinch anchor x");near((h*.4f-f.y(w,h))/f.scale(w),(h*.43f-pinch.y(w,h))/pinch.scale(w),"pinch anchor y");
            CropFrame restore=CropFrame.decode(pinch.encode());near(restore.focusX,pinch.focusX,"restore x");near(restore.focusY,pinch.focusY,"restore y");near(restore.zoom,pinch.zoom,"restore zoom");
            int[] vp=WallpaperViewport.visible(w*2,h,w,h,.5f,0,-w/2,0);near(vp[2],w,"double width surface uses display width");near(restore.x(vp[2]),restore.x(w),"wallpaper preview consistency");
            near(f.gesture(w,h,0,0,0,0,1000).zoom,CropFrame.MAX_ZOOM,"maximum zoom");near(f.gesture(w,h,0,0,0,0,.0001f).zoom,CropFrame.minZoom(w,h),"device-dependent lower bound");
        }
        check(CropFrame.decode("NaN,1,1")==null,"invalid frame");check(CropFrame.decode("oops")==null,"malformed frame");CropFrame f=CropFrame.preset(1080,2400,0);check(f.gesture(1080,2400,0,0,Float.NaN,0,1)==f,"invalid touch");
        android.content.Context c=new android.content.Context();SceneSettings a=new SceneSettings(c),b=new SceneSettings(c);int revision=b.cropRevision();CropFrame draft=f.gesture(1080,2400,100,100,130,160,1.2f);near(b.frame(1080,2400).zoom,f.zoom,"draft leaves wallpaper unchanged");a.frame(draft);check(b.cropRevision()==revision+1,"engines see revision");near(b.frame(1080,2400).focusX,draft.focusX,"saved position");near(new SceneSettings(c).frame(1080,2400).zoom,draft.zoom,"reopen keeps crop");
        System.out.println("{\"checks\":"+checks+",\"phoneTested\":false}");
    }
}
