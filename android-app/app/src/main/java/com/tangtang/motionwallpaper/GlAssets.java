package com.tangtang.motionwallpaper;

import android.graphics.Bitmap;
import android.opengl.GLES20;
import android.opengl.GLUtils;
import java.io.IOException;

/** GL-thread allocation ownership: a failed operation never transfers a partial handle. */
final class GlAssets {
    private GlAssets() {}

    static int texture(Bitmap bitmap, String name) throws IOException {
        int[] ids = new int[1];
        boolean transferred = false;
        try {
            GLES20.glGenTextures(1, ids, 0);
            if (ids[0] == 0) throw new IOException("贴图分配失败：" + name);
            GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, ids[0]);
            GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR);
            GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR);
            GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE);
            GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE);
            GLUtils.texImage2D(GLES20.GL_TEXTURE_2D, 0, bitmap, 0);
            int error = GLES20.glGetError();
            if (error != GLES20.GL_NO_ERROR) throw new IOException("贴图上传失败 " + name + " glError=" + error);
            transferred = true;
            return ids[0];
        } finally {
            if (!transferred && ids[0] != 0) GLES20.glDeleteTextures(1, ids, 0);
        }
    }

    static int program(String vertexSource, String fragmentSource) throws IOException {
        int vertex = 0, fragment = 0, program = 0;
        boolean transferred = false;
        try {
            vertex = compile(GLES20.GL_VERTEX_SHADER, vertexSource);
            fragment = compile(GLES20.GL_FRAGMENT_SHADER, fragmentSource);
            program = GLES20.glCreateProgram();
            if (program == 0) throw new IOException("着色器程序分配失败");
            GLES20.glAttachShader(program, vertex);
            GLES20.glAttachShader(program, fragment);
            GLES20.glLinkProgram(program);
            int[] status = new int[1];
            GLES20.glGetProgramiv(program, GLES20.GL_LINK_STATUS, status, 0);
            if (status[0] == 0) throw new IOException("着色器链接失败：" + GLES20.glGetProgramInfoLog(program));
            transferred = true;
            return program;
        } finally {
            if (vertex != 0) GLES20.glDeleteShader(vertex);
            if (fragment != 0) GLES20.glDeleteShader(fragment);
            if (!transferred && program != 0) GLES20.glDeleteProgram(program);
        }
    }

    private static int compile(int type, String source) throws IOException {
        int shader = GLES20.glCreateShader(type);
        if (shader == 0) throw new IOException("着色器分配失败 type=" + type);
        boolean transferred = false;
        try {
            GLES20.glShaderSource(shader, source);
            GLES20.glCompileShader(shader);
            int[] status = new int[1];
            GLES20.glGetShaderiv(shader, GLES20.GL_COMPILE_STATUS, status, 0);
            if (status[0] == 0) throw new IOException("着色器编译失败：" + GLES20.glGetShaderInfoLog(shader));
            transferred = true;
            return shader;
        } finally {
            if (!transferred) GLES20.glDeleteShader(shader);
        }
    }
}
