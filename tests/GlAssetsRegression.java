package com.tangtang.motionwallpaper;
import android.opengl.GLES20;import android.graphics.Bitmap;
public final class GlAssetsRegression {
 static int checks;static void check(boolean ok,String s){checks++;if(!ok)throw new AssertionError(s);}
 static void empty(){check(GLES20.textures.isEmpty()&&GLES20.shaders.isEmpty()&&GLES20.programs.isEmpty(),"partial handles leaked: "+GLES20.fail);}
 public static void main(String[]a)throws Exception{
  for(String s:new String[]{"textureZero","bindThrow","uploadThrow","uploadError"}){GLES20.fail=s;boolean failed=false;try{GlAssets.texture(new Bitmap(),"probe.png");}catch(Exception e){failed=true;}check(failed,"fault ignored "+s);empty();}
  for(String s:new String[]{"shaderZero","sourceThrow","compileThrow","vertex","fragment","programZero","attachThrow","linkThrow","link"}){GLES20.fail=s;boolean failed=false;try{GlAssets.program("vertex","fragment");}catch(Exception e){failed=true;}check(failed,"fault ignored "+s);empty();}
  GLES20.fail="";int t=GlAssets.texture(new Bitmap(),"probe.png"),p=GlAssets.program("vertex","fragment");
  check(GLES20.textures.contains(t)&&GLES20.programs.contains(p),"successful allocations transferred to caller");check(GLES20.shaders.isEmpty(),"temporary shaders released after linking");
  GLES20.glDeleteTextures(1,new int[]{t},0);GLES20.glDeleteProgram(p);empty();
  System.out.println("{\"assertions\":"+checks+",\"faultPaths\":13,\"productionGlAssets\":true,\"fakeGL\":true,\"phoneTested\":false}");
 }
}
