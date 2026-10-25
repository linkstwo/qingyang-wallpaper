package com.tangtang.motionwallpaper;

/** Immutable source-pixel composition. Shared by editor, preview and live wallpaper. */
final class CropFrame {
    static final float WIDTH = 1086f, HEIGHT = 1448f;
    static final float MIN_ZOOM = .45f, MAX_ZOOM = 3.5f;
    final float zoom, focusX, focusY;

    CropFrame(float zoom, float focusX, float focusY) {
        this.zoom = finiteClamp(zoom, MIN_ZOOM, MAX_ZOOM, 1f);
        this.focusX = finiteClamp(focusX, -WIDTH, WIDTH*2, WIDTH*.5f);
        this.focusY = finiteClamp(focusY, -HEIGHT, HEIGHT*2, HEIGHT*.5f);
    }

    float scale(int width) { return Math.max(1,width)/WIDTH*zoom; }
    float x(int width) { return Math.max(1,width)*.5f-focusX*scale(width); }
    float y(int width,int height) { return Math.max(1,height)*.5f-focusY*scale(width); }

    static CropFrame preset(int width,int height,int mode) {
        float w=Math.max(1,width),h=Math.max(1,height);
        // Mode0 includes the actual shoulder, both forearms, waist and hair.
        float left=mode==0?120:0, right=mode==0?1038:WIDTH;
        float top=0, bottom=mode==0?1265:HEIGHT;
        float scale;
        if(mode==2) scale=Math.max(w/WIDTH,h/HEIGHT);
        else scale=Math.min((w*(mode==0?.88f:.94f))/(right-left),(h*.9f)/(bottom-top));
        float x=w*.5f-(left+right)*.5f*scale;
        float y=mode==2?(h-HEIGHT*scale)*.5f:Math.min(h*.07f,(h-(bottom-top)*scale)*.5f);
        return fromPixels(width,height,scale,x,y);
    }

    static CropFrame fromPixels(int width,int height,float scale,float x,float y) {
        float w=Math.max(1,width),h=Math.max(1,height);
        float z=finiteClamp(scale*WIDTH/w,MIN_ZOOM,MAX_ZOOM,1f);
        float s=w/WIDTH*z;
        return new CropFrame(z,(w*.5f-x)/s,(h*.5f-y)/s).bounded(width,height);
    }

    CropFrame gesture(int width,int height,float oldX,float oldY,float newX,float newY,float ratio) {
        if(!Float.isFinite(oldX)||!Float.isFinite(oldY)||!Float.isFinite(newX)
                ||!Float.isFinite(newY)||!Float.isFinite(ratio)||ratio<=0) return this;
        float oldScale=scale(width);
        float sx=(oldX-x(width))/oldScale,sy=(oldY-y(width,height))/oldScale;
        float z=finiteClamp(zoom*ratio,MIN_ZOOM,MAX_ZOOM,zoom),s=Math.max(1,width)/WIDTH*z;
        return fromPixels(width,height,s,newX-sx*s,newY-sy*s);
    }

    CropFrame bounded(int width,int height) {
        float w=Math.max(1,width),h=Math.max(1,height),s=scale(width);
        // Keep part of the source on screen, but allow background around a small portrait.
        float x=finiteClamp(x(width),w*.15f-WIDTH*s,w*.85f,0);
        float y=finiteClamp(y(width,height),h*.12f-HEIGHT*s,h*.88f,0);
        return new CropFrame(zoom,(w*.5f-x)/s,(h*.5f-y)/s);
    }

    String encode() { return Float.toString(zoom)+","+focusX+","+focusY; }
    static CropFrame decode(String value) {
        try {
            String[] p=value.split(",");
            if(p.length!=3)return null;
            float z=Float.parseFloat(p[0]),x=Float.parseFloat(p[1]),y=Float.parseFloat(p[2]);
            if(!Float.isFinite(z)||!Float.isFinite(x)||!Float.isFinite(y))return null;
            return new CropFrame(z,x,y);
        } catch(Exception bad) { return null; }
    }
    private static float finiteClamp(float v,float a,float b,float fallback) {
        return Float.isFinite(v)?Math.max(a,Math.min(b,v)):fallback;
    }
}
