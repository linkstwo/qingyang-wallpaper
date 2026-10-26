package com.tangtang.motionwallpaper;

import android.content.Context;

import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;

/**
 * 网格资产。这些 .bin 由 tools/export_mesh.mjs 用样片真源码
 * （preview/layered-mesh.mjs + contact-rig.mjs 的 bodyContactWeights）导出，
 * 所以安卓端的三角化结果与浏览器里通过验收的那套逐字节一致，不在手机端重算。
 */
final class MeshAssets {
    /** 与样片一致的必需三角数，用来在加载阶段就发现资产被换过。 */
    static final int EXPECTED_CHARACTER_TRIANGLES = 18089;

    final FloatBuffer characterMesh;
    final FloatBuffer characterPins;
    final FloatBuffer characterDepth;
    final FloatBuffer foregroundMesh;

    private MeshAssets(FloatBuffer characterMesh, FloatBuffer characterPins, FloatBuffer characterDepth, FloatBuffer foregroundMesh) {
        this.characterMesh = characterMesh;
        this.characterPins = characterPins;
        this.characterDepth = characterDepth;
        this.foregroundMesh = foregroundMesh;
    }

    static MeshAssets load(Context context) throws IOException {
        FloatBuffer mesh = read(context, "character_mesh.bin");
        FloatBuffer pins = read(context, "character_pins.bin");
        FloatBuffer depth = read(context, "character_depth.bin");
        FloatBuffer foreground = read(context, "foreground_mesh.bin");

        int triangles = mesh.capacity() / 6;
        if (triangles != EXPECTED_CHARACTER_TRIANGLES) {
            throw new IOException("character_mesh.bin 三角数不对：期望 " + EXPECTED_CHARACTER_TRIANGLES + "，实际 " + triangles);
        }
        if (pins.capacity() != mesh.capacity() / 2 || depth.capacity() != pins.capacity()) {
            throw new IOException("character_pins.bin 顶点数不匹配：" + pins.capacity() + " vs " + mesh.capacity() / 2);
        }
        return new MeshAssets(mesh, pins, depth, foreground);
    }

    private static FloatBuffer read(Context context, String name) throws IOException {
        try (InputStream in = context.getAssets().open(name)) {
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream(in.available() + 16);
            byte[] chunk = new byte[64 * 1024];
            int read;
            while ((read = in.read(chunk)) > 0) {
                out.write(chunk, 0, read);
            }
            byte[] bytes = out.toByteArray();
            if (bytes.length == 0 || bytes.length % 4 != 0) {
                throw new IOException(name + " 字节数非法：" + bytes.length);
            }
            ByteBuffer buffer = ByteBuffer.allocateDirect(bytes.length).order(ByteOrder.LITTLE_ENDIAN);
            buffer.put(bytes);
            buffer.position(0);
            return buffer.asFloatBuffer();
        }
    }
}