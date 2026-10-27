package com.tangtang.motionwallpaper;
import android.content.Context;import java.nio.*;import java.nio.file.*;import java.io.IOException;import java.util.*;
public final class MeshIntegrityRegression {
 static int checks;static void check(boolean b,String m){checks++;if(!b)throw new AssertionError(m);}
 static Path root=Path.of(System.getProperty("assets"));
 static void corrupt(String file,byte[] changed)throws Exception{
  Path p=root.resolve(file);byte[] original=Files.readAllBytes(p);boolean rejected=false;
  try{Files.write(p,changed);try{MeshAssets.load(new Context());}catch(IOException e){rejected=true;check(e.getMessage().contains(file),"diagnostic identifies corrupted asset");}}
  finally{Files.write(p,original);}check(rejected,"malformed mesh silently accepted: "+file);
 }
 public static void main(String[]a)throws Exception{
  MeshAssets m=MeshAssets.load(new Context());check(m.characterMesh.position()==0,"loading preserves position");
  byte[] original=Files.readAllBytes(root.resolve("character_mesh.bin"));corrupt("character_mesh.bin",Arrays.copyOf(original,original.length+4));
  for(String f:new String[]{"character_mesh.bin","character_pins.bin","character_depth.bin","foreground_mesh.bin"})for(float v:new float[]{Float.NaN,Float.POSITIVE_INFINITY}){
   byte[] bytes=Files.readAllBytes(root.resolve(f));ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).putFloat(v);corrupt(f,bytes);
  }
  for(float v:new float[]{-.1f,1.1f}){byte[] bytes=Files.readAllBytes(root.resolve("character_pins.bin"));ByteBuffer.wrap(bytes).order(ByteOrder.LITTLE_ENDIAN).putFloat(v);corrupt("character_pins.bin",bytes);}
  byte[] fg=Files.readAllBytes(root.resolve("foreground_mesh.bin"));corrupt("foreground_mesh.bin",Arrays.copyOf(fg,fg.length-4));
  m=MeshAssets.load(new Context());check(m.characterMesh.capacity()==18089*6,"unmodified mesh still accepted");
  System.out.println("{\"assertions\":"+checks+",\"mutations\":12,\"actualMeshAssets\":true,\"originalAssetsModified\":false,\"phoneTested\":false}");
 }
}
