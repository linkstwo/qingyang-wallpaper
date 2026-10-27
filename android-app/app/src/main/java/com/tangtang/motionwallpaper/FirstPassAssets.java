package com.tangtang.motionwallpaper;

import android.content.Context;
import java.io.IOException;
import java.nio.FloatBuffer;

/** Separate, reversible first-pass scene; legacy assets remain byte-identical. */
final class FirstPassAssets {
    final FloatBuffer body,pins,depth,paper,side,sideDepth,sideUv;
    FirstPassAssets(Context context) throws IOException {
        body=MeshAssets.read(context,"round_character_mesh.bin");
        pins=MeshAssets.read(context,"round_character_pins.bin");
        depth=MeshAssets.read(context,"round_character_depth.bin");
        paper=MeshAssets.read(context,"round_foreground_mesh.bin");
        side=MeshAssets.read(context,"side_back_mesh.bin");
        sideDepth=MeshAssets.read(context,"side_back_depth.bin");
        sideUv=MeshAssets.read(context,"side_back_uv.bin");
        if(body.capacity()%6!=0||paper.capacity()%6!=0||side.capacity()%6!=0
                ||pins.capacity()!=body.capacity()/2||depth.capacity()!=pins.capacity()
                ||sideDepth.capacity()!=side.capacity()/2||sideUv.capacity()!=side.capacity())
            throw new IOException("首轮场景资产不完整");
    }
}
