package com.tangtang.motionwallpaper;

/** Immutable source-pixel composition. Shared by editor, preview and live wallpaper. */
final class CropFrame {
    static final float WIDTH = 1152f, HEIGHT = 1536f;
    static final float FOCUS_X = 725f, FOCUS_Y = 755f;
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
        // Focus is the complete screen centre, including the lower environment.
        float desired=mode==1?1.10f:mode==2?1.48f:1.28f;
        float z=Math.max(minZoom(width,height),desired);
        if(mode!=2) z=Math.max(minZoom(width,height),Math.min(z,h*.92f*WIDTH/(w*1390f)));
        return new CropFrame(z,FOCUS_X,FOCUS_Y).bounded(width,height);
    }

    static CropFrame fromPixels(int width,int height,float scale,float x,float y) {
        float w=Math.max(1,width),h=Math.max(1,height);
        float z=finiteClamp(scale*WIDTH/w,minZoom(width,height),MAX_ZOOM,1f);
        float s=w/WIDTH*z;
        return new CropFrame(z,(w*.5f-x)/s,(h*.5f-y)/s).bounded(width,height);
    }

    CropFrame gesture(int width,int height,float oldX,float oldY,float newX,float newY,float ratio) {
        if(!Float.isFinite(oldX)||!Float.isFinite(oldY)||!Float.isFinite(newX)
                ||!Float.isFinite(newY)||!Float.isFinite(ratio)||ratio<=0) return this;
        float oldScale=scale(width);
        float sx=(oldX-x(width))/oldScale,sy=(oldY-y(width,height))/oldScale;
        float z=finiteClamp(zoom*ratio,minZoom(width,height),MAX_ZOOM,zoom),s=Math.max(1,width)/WIDTH*z;
        return fromPixels(width,height,s,newX-sx*s,newY-sy*s);
    }

    CropFrame bounded(int width,int height) {
        float w=Math.max(1,width),h=Math.max(1,height);
        if(zoom<minZoom(width,height))return new CropFrame(minZoom(width,height),focusX,focusY).bounded(width,height);
        float s=scale(width);
        // Keep part of the source on screen, but allow background around a small portrait.
        float x=finiteClamp(x(width),w*.15f-WIDTH*s,w*.85f,0);
        float y=finiteClamp(y(width,height),h*.12f-HEIGHT*s,h*.88f,0);
        return new CropFrame(zoom,(w*.5f-x)/s,(h*.5f-y)/s);
    }

    static float minZoom(int width,int height) { return Math.min(MAX_ZOOM,Math.max(MIN_ZOOM,.6f*Math.max(1,height)*WIDTH/(Math.max(1,width)*HEIGHT))); }

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
