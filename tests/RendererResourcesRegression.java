package com.tangtang.motionwallpaper;
import android.opengl.GLES20;import android.graphics.Bitmap;import android.content.Context;
public final class RendererResourcesRegression {
 static int checks;static void check(boolean b,String m){checks++;if(!b)throw new AssertionError(m);}
 static void empty(){check(GLES20.textures.isEmpty()&&GLES20.shaders.isEmpty()&&GLES20.programs.isEmpty()&&GLES20.buffers.isEmpty(),"GL allocations leaked at "+GLES20.fail);check(Bitmap.live==0,"bitmap leaked at "+GLES20.fail);}
 public static void main(String[]a)throws Exception{
  for(String fault:new String[]{"uploadError","uploadThrow","bindThrow","fragment","vertex","link","compileThrow","attachThrow","linkThrow","textureZero","shaderZero","programZero"}){
   GLES20.fail=fault;SceneRenderer r=new SceneRenderer(new Context());boolean failed=false;try{r.create(540,1176);}catch(Exception e){failed=true;}check(failed,"fault did not fail "+fault);r.release();empty();
   GLES20.fail="";r.create(540,1176);check(r.isReady(),"same renderer retries after "+fault);check(r.characterTriangles()==18089,"real mesh loaded");r.draw(new Physics());check(r.drawnFrames()==1,"renderer actually issued draw path");r.release();empty();
  }
  System.out.println("{\"assertions\":"+checks+",\"faultPaths\":12,\"actualSceneRendererAndGlAssets\":true,\"actualMeshBytes\":true,\"fakeGLAndBitmapDecode\":true,\"rasterOrPhoneTested\":false}");
 }
}
