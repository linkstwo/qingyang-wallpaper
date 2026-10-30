package com.tangtang.motionwallpaper;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.opengl.GLES20;
import android.opengl.GLUtils;

import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;

/**
 * GLES2 绘制核心（EGL 无关，壁纸服务与应用内预览共用）。
 * 着色器、分层顺序、mask 模式与 u_cover 逻辑都来自已验收样片的
 * character-prototype/preview/app.mjs；网格来自 MeshAssets（由样片真源码导出）。
 */
final class SceneRenderer {
    static final int SOURCE_WIDTH = 1086;
    static final int SOURCE_HEIGHT = 1448;

    private static final String VERTEX_SHADER =
            "precision highp float;\n"
            + "attribute vec2 a_source;\n"
            + "attribute float a_pin;\n"
            + "uniform vec2 u_size,u_view,u_body,u_chest,u_ndcScale,u_ndcOffset;\n"
            + "uniform float u_layer,u_hair,u_hairTip;\n"
            + "uniform vec4 u_head,u_bell0,u_bell1,u_bell2,u_bell3,u_bell4,u_bell5,u_bell6;\n"
            + "uniform float u_depth[7],u_inertia[7];\n"
            + "uniform vec4 u_squeeze,u_extra;\n"
            + "uniform vec2 u_bgRatio,u_fgRatio;\n"
            + "varying vec2 v_uv;\n"
            + "float bell(vec2 p,vec4 b){vec2 d=(p-b.xy)/b.zw;return exp(-dot(d,d)*2.0);}\n"
            + "void main(){\n"
            + "  vec2 p=a_source,q=p;\n"
            + "  v_uv=p/u_size;\n"
            + "  if(u_layer<0.5){q+=u_view*u_bgRatio;}\n"
            + "  else if(u_layer<1.5){\n"
            + "    // 人物与图纸是一整块连续贴图面：用区域场保住衣物连续性，\n"
            + "    // 图纸/双手/坐姿由 a_pin 显式固定，不被切开。\n"
            + "    // 区域场参数来自 RenderParams（编辑器导出 qingyang-params.json 可覆盖）。\n"
            + "    float active=1.0-a_pin;\n"
            + "    float head=1.0-smoothstep(u_head.x,u_head.y,p.y);\n"
            + "    float neck=bell(p,u_bell0);\n"
            + "    float chest=bell(p,u_bell1);\n"
            + "    float shoulder=bell(p,u_bell2);\n"
            + "    float torso=bell(p,u_bell3);\n"
            + "    float cheek=bell(p,u_bell4);\n"
            + "    float hair=bell(p,u_bell5);\n"
            + "    float hairTip=bell(p,u_bell6);\n"
            + "    float depth=u_depth[4]*torso+u_depth[3]*shoulder+u_depth[2]*chest+head*(u_depth[0]+u_head.w*cheek);\n"
            + "    vec2 turn=vec2(u_view.x*depth, u_view.y*depth*u_extra.x);\n"
            + "    turn.x+=(p.x-u_squeeze.z)*(u_squeeze.x*u_view.x)*head;\n"
            + "    turn.y+=(p.x-u_squeeze.w)*(u_squeeze.y*u_view.y)*torso;\n"
            + "    vec2 inertia=u_body*(u_extra.y+u_inertia[4]*torso+u_inertia[1]*neck);\n"
            + "    inertia+=u_chest*chest;\n"
            + "    inertia+=vec2(u_hair,u_hair*u_extra.z)*hair;\n"
            + "    inertia+=vec2(u_hairTip,u_hairTip*u_extra.z)*hairTip;\n"
            + "    inertia+=u_body*u_extra.w*head;\n"
            + "    q+=(turn+inertia)*active;\n"
            + "  }\n"
            + "  else if(u_layer>2.5){q+=u_view*u_fgRatio;}\n"
            + "  gl_Position=vec4(q.x*u_ndcScale.x+u_ndcOffset.x,q.y*u_ndcScale.y+u_ndcOffset.y,0.0,1.0);\n"
            + "}\n";

    private static final String FRAGMENT_SHADER =
            "precision highp float;varying vec2 v_uv;\n"
            + "uniform sampler2D u_texture,u_mask;\n"
            + "uniform float u_maskMode,u_cover;uniform vec2 u_size;\n"
            + "void main(){\n"
            + "  float alpha=1.0;\n"
            + "  if(u_maskMode>0.5){\n"
            + "    alpha=texture2D(u_mask,v_uv).r;\n"
            + "    if(u_maskMode>1.5){\n"
            + "      vec2 d=vec2(3.0)/u_size;\n"
            + "      alpha=max(alpha,texture2D(u_mask,v_uv+d).r);\n"
            + "      alpha=max(alpha,texture2D(u_mask,v_uv-d).r);\n"
            + "      alpha=max(alpha,texture2D(u_mask,v_uv+vec2(d.x,-d.y)).r);\n"
            + "      alpha=max(alpha,texture2D(u_mask,v_uv+vec2(-d.x,d.y)).r);\n"
            + "      alpha*=u_cover;\n"
            + "    }\n"
            + "  }\n"
            + "  gl_FragColor=vec4(texture2D(u_texture,v_uv).rgb,alpha);\n"
            + "}\n";

    private final Context context;
    private MeshAssets meshes;
    private RenderParams params;
    private int program;
    private int aSource;
    private int aPin;
    private int uSize;
    private int uView;
    private int uBody;
    private int uChest;
    private int uHair;
    private int uLayer;
    private int uMaskMode;
    private int uCover;
    private int uNdcScale;
    private int uNdcOffset;
    private int uHairTip;
    private int uHead;
    private final int[] uBells = new int[7];
    private int uDepth;
    private int uInertia;
    private int uSqueeze;
    private int uExtra;
    private int uBgRatio;
    private int uFgRatio;
    private int uTexture;
    private int uMask;
    private int texOriginal;
    private int texMask;
    private int texBackground;
    private int quadBuffer;
    private int characterBuffer;
    private int pinBuffer;
    private int foregroundBuffer;
    private int quadCount;
    private int characterCount;
    private int foregroundCount;
    private int surfaceWidth = 1;
    private int surfaceHeight = 1;
    private float viewPan01 = 0.5f;
    private float ndcScaleX = 1.0f;
    private float ndcScaleY = 1.0f;
    private float ndcOffsetX = 0.0f;
    private float ndcOffsetY = 0.0f;
    private boolean ready;
    private long drawnFrames;

    SceneRenderer(Context context) {
        this.context = context.getApplicationContext();
    }

    boolean isReady() {
        return ready;
    }

    int characterTriangles() {
        return characterCount / 3;
    }

    long drawnFrames() {
        return drawnFrames;
    }

    void create(int width, int height) throws IOException {
        release();
        program = buildProgram();
        GLES20.glUseProgram(program);
        aSource = GLES20.glGetAttribLocation(program, "a_source");
        aPin = GLES20.glGetAttribLocation(program, "a_pin");
        uSize = GLES20.glGetUniformLocation(program, "u_size");
        uView = GLES20.glGetUniformLocation(program, "u_view");
        uBody = GLES20.glGetUniformLocation(program, "u_body");
        uChest = GLES20.glGetUniformLocation(program, "u_chest");
        uHair = GLES20.glGetUniformLocation(program, "u_hair");
        uLayer = GLES20.glGetUniformLocation(program, "u_layer");
        uMaskMode = GLES20.glGetUniformLocation(program, "u_maskMode");
        uCover = GLES20.glGetUniformLocation(program, "u_cover");
        uNdcScale = GLES20.glGetUniformLocation(program, "u_ndcScale");
        uNdcOffset = GLES20.glGetUniformLocation(program, "u_ndcOffset");
        uHairTip = GLES20.glGetUniformLocation(program, "u_hairTip");
        uHead = GLES20.glGetUniformLocation(program, "u_head");
        for (int i = 0; i < 7; i++) {
            uBells[i] = GLES20.glGetUniformLocation(program, "u_bell" + i);
        }
        uDepth = GLES20.glGetUniformLocation(program, "u_depth");
        uInertia = GLES20.glGetUniformLocation(program, "u_inertia");
        uSqueeze = GLES20.glGetUniformLocation(program, "u_squeeze");
        uExtra = GLES20.glGetUniformLocation(program, "u_extra");
        uBgRatio = GLES20.glGetUniformLocation(program, "u_bgRatio");
        uFgRatio = GLES20.glGetUniformLocation(program, "u_fgRatio");
        uTexture = GLES20.glGetUniformLocation(program, "u_texture");
        uMask = GLES20.glGetUniformLocation(program, "u_mask");
        if (aSource < 0 || aPin < 0 || uSize < 0 || uView < 0 || uHair < 0 || uHead < 0 || uDepth < 0) {
            throw new IOException("着色器变量缺失");
        }

        params = RenderParams.load(context);
        uploadParams();

        meshes = MeshAssets.load(context);
        texOriginal = loadTexture("original.png");
        texMask = loadTexture("mask.png");
        texBackground = loadTexture("background.png");

        quadBuffer = makeBuffer(new float[]{
                0.0f, 0.0f, SOURCE_WIDTH, 0.0f, 0.0f, SOURCE_HEIGHT,
                0.0f, SOURCE_HEIGHT, SOURCE_WIDTH, 0.0f, SOURCE_WIDTH, SOURCE_HEIGHT});
        quadCount = 6;
        characterBuffer = makeBuffer(meshes.characterMesh);
        characterCount = meshes.characterMesh.capacity() / 2;
        pinBuffer = makeBuffer(meshes.characterPins);
        foregroundBuffer = makeBuffer(meshes.foregroundMesh);
        foregroundCount = meshes.foregroundMesh.capacity() / 2;

        GLES20.glUniform2f(uSize, SOURCE_WIDTH, SOURCE_HEIGHT);
        GLES20.glUniform1i(uTexture, 0);
        GLES20.glUniform1i(uMask, 1);
        GLES20.glEnableVertexAttribArray(aSource);
        GLES20.glDisable(GLES20.GL_DEPTH_TEST);
        GLES20.glEnable(GLES20.GL_BLEND);
        GLES20.glBlendFunc(GLES20.GL_SRC_ALPHA, GLES20.GL_ONE_MINUS_SRC_ALPHA);
        resize(width, height);
        ready = true;
    }

    /** 屏幕尺寸变化：按"铺满并居中裁切"算 NDC 变换（与原轻漾 0.4.0 的 ViewMapping 同策略）。 */
    void resize(int width, int height) {
        surfaceWidth = Math.max(1, width);
        surfaceHeight = Math.max(1, height);
        updateNdc();
        GLES20.glViewport(0, 0, surfaceWidth, surfaceHeight);
    }

    /**
     * 跟移取景（T02 选项 A）：pan01 ∈ [0,1] 为取景窗口基准偏移，
     * 由 Physics 按视角给出（base + viewX*range）。横向有裁切余量时窗口随 pan01 移动，
     * 余量为负（纵向裁切/铺满）时自动退回居中——永不越界。
     */
    void setViewPan(float pan01) {
        final float clamped = MathX.clamp(pan01, 0.0f, 1.0f);
        if (clamped != viewPan01) {
            viewPan01 = clamped;
            if (ready) {
                updateNdc();
            }
        }
    }

    private void updateNdc() {
        final float k = Math.max(surfaceWidth / (float) SOURCE_WIDTH, surfaceHeight / (float) SOURCE_HEIGHT);
        final float slackX = surfaceWidth - SOURCE_WIDTH * k;
        final float slackY = surfaceHeight - SOURCE_HEIGHT * k;
        final float offsetX = slackX > 0.0f ? viewPan01 * slackX : slackX * 0.5f;
        final float offsetY = slackY > 0.0f ? 0.5f * slackY : slackY * 0.5f;
        ndcScaleX = 2.0f * k / surfaceWidth;
        ndcOffsetX = 2.0f * offsetX / surfaceWidth - 1.0f;
        ndcScaleY = -2.0f * k / surfaceHeight;
        ndcOffsetY = 1.0f - 2.0f * offsetY / surfaceHeight;
    }

    /** 把 RenderParams 上传为 uniform（编辑器导出的 qingyang-params.json 决定这些值）。 */
    private void uploadParams() {
        RenderParams p = params;
        GLES20.glUniform4f(uHead, p.headY0, p.headY1, p.headDepth, p.headCheekGain);
        for (int i = 0; i < 7; i++) {
            float[] b = p.bells[i];
            GLES20.glUniform4f(uBells[i], b[0], b[1], b[2], b[3]);
        }
        GLES20.glUniform1fv(uDepth, 7, p.depth, 0);
        GLES20.glUniform1fv(uInertia, 7, p.inertia, 0);
        GLES20.glUniform4f(uSqueeze, p.squeeze[0], p.squeeze[1], p.squeeze[2], p.squeeze[3]);
        GLES20.glUniform4f(uExtra, p.turnRatioY, p.inertiaBase, p.hairYRatio, p.headBodyGain);
        GLES20.glUniform2f(uBgRatio, p.bgRatio[0], p.bgRatio[1]);
        GLES20.glUniform2f(uFgRatio, p.fgRatio[0], p.fgRatio[1]);
    }

    void draw(Physics physics) {
        if (!ready) {
            return;
        }
        final float cover = MathX.clamp(
                (float) Math.hypot(physics.viewX, physics.viewY) * 100.0f
                        + Math.max(Math.abs(physics.bodyPx), Math.max(Math.abs(physics.chestPx), Math.abs(physics.hairPx))) * 3.0f,
                0.0f, 1.0f);
        GLES20.glUseProgram(program);
        setViewPan(physics.pan01);
        GLES20.glUniform2f(uView, physics.viewX, physics.viewY);
        GLES20.glUniform2f(uBody, physics.bodyPx, physics.bodyPy);
        GLES20.glUniform2f(uChest, physics.chestPx, physics.chestPy);
        GLES20.glUniform1f(uHair, physics.hairPx);
        GLES20.glUniform1f(uHairTip, physics.hairTipPx);
        GLES20.glUniform1f(uCover, cover);
        GLES20.glUniform2f(uNdcScale, ndcScaleX, ndcScaleY);
        GLES20.glUniform2f(uNdcOffset, ndcOffsetX, ndcOffsetY);

        GLES20.glClearColor(0.06f, 0.09f, 0.12f, 1.0f);
        GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT);

        drawLayer(quadBuffer, quadCount, texOriginal, 0.0f, 0.0f, false);
        drawLayer(quadBuffer, quadCount, texBackground, 0.0f, 2.0f, false);
        drawLayer(characterBuffer, characterCount, texOriginal, 1.0f, 1.0f, true);
        drawLayer(foregroundBuffer, foregroundCount, texOriginal, 3.0f, 0.0f, false);
        drawnFrames++;
    }

    private void drawLayer(int buffer, int vertexCount, int texture, float layer, float maskMode, boolean usePins) {
        GLES20.glUniform1f(uLayer, layer);
        GLES20.glUniform1f(uMaskMode, maskMode);
        GLES20.glActiveTexture(GLES20.GL_TEXTURE0);
        GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, texture);
        GLES20.glActiveTexture(GLES20.GL_TEXTURE1);
        GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, texMask);
        GLES20.glActiveTexture(GLES20.GL_TEXTURE0);
        if (usePins) {
            GLES20.glEnableVertexAttribArray(aPin);
            GLES20.glBindBuffer(GLES20.GL_ARRAY_BUFFER, pinBuffer);
            GLES20.glVertexAttribPointer(aPin, 1, GLES20.GL_FLOAT, false, 0, 0);
        } else {
            GLES20.glDisableVertexAttribArray(aPin);
            GLES20.glVertexAttrib1f(aPin, 0.0f);
        }
        GLES20.glBindBuffer(GLES20.GL_ARRAY_BUFFER, buffer);
        GLES20.glVertexAttribPointer(aSource, 2, GLES20.GL_FLOAT, false, 0, 0);
        GLES20.glDrawArrays(GLES20.GL_TRIANGLES, 0, vertexCount);
    }

    void release() {
        ready = false;
        params = null;
        if (program != 0) {
            GLES20.glDeleteProgram(program);
            program = 0;
        }
        int[] textures = {texOriginal, texMask, texBackground};
        for (int texture : textures) {
            if (texture != 0) {
                GLES20.glDeleteTextures(1, new int[]{texture}, 0);
            }
        }
        texOriginal = texMask = texBackground = 0;
        int[] buffers = {quadBuffer, characterBuffer, pinBuffer, foregroundBuffer};
        for (int buffer : buffers) {
            if (buffer != 0) {
                GLES20.glDeleteBuffers(1, new int[]{buffer}, 0);
            }
        }
        quadBuffer = characterBuffer = pinBuffer = foregroundBuffer = 0;
        meshes = null;
    }

    private int makeBuffer(FloatBuffer source) {
        int[] ids = new int[1];
        GLES20.glGenBuffers(1, ids, 0);
        GLES20.glBindBuffer(GLES20.GL_ARRAY_BUFFER, ids[0]);
        GLES20.glBufferData(GLES20.GL_ARRAY_BUFFER, source.capacity() * 4, source, GLES20.GL_STATIC_DRAW);
        return ids[0];
    }

    private int makeBuffer(float[] source) {
        return makeBuffer(toBuffer(source));
    }

    private static FloatBuffer toBuffer(float[] values) {
        ByteBuffer bytes = ByteBuffer.allocateDirect(values.length * 4).order(ByteOrder.nativeOrder());
        FloatBuffer buffer = bytes.asFloatBuffer();
        buffer.put(values);
        buffer.position(0);
        return buffer;
    }

    private int loadTexture(String name) throws IOException {
        Bitmap bitmap;
        try (InputStream in = context.getAssets().open(name)) {
            bitmap = BitmapFactory.decodeStream(in);
        }
        if (bitmap == null) {
            throw new IOException("素材解码失败：" + name);
        }
        if (bitmap.getWidth() != SOURCE_WIDTH || bitmap.getHeight() != SOURCE_HEIGHT) {
            throw new IOException(name + " 尺寸与网格画布不一致：" + bitmap.getWidth() + "x" + bitmap.getHeight());
        }
        int[] ids = new int[1];
        GLES20.glGenTextures(1, ids, 0);
        GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, ids[0]);
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MIN_FILTER, GLES20.GL_LINEAR);
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_MAG_FILTER, GLES20.GL_LINEAR);
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_S, GLES20.GL_CLAMP_TO_EDGE);
        GLES20.glTexParameteri(GLES20.GL_TEXTURE_2D, GLES20.GL_TEXTURE_WRAP_T, GLES20.GL_CLAMP_TO_EDGE);
        GLUtils.texImage2D(GLES20.GL_TEXTURE_2D, 0, bitmap, 0);
        bitmap.recycle();
        int error = GLES20.glGetError();
        if (error != GLES20.GL_NO_ERROR) {
            throw new IOException("贴图上传失败 " + name + " glError=" + error);
        }
        return ids[0];
    }

    private int buildProgram() throws IOException {
        final int vertex = compile(GLES20.GL_VERTEX_SHADER, VERTEX_SHADER);
        final int fragment = compile(GLES20.GL_FRAGMENT_SHADER, FRAGMENT_SHADER);
        final int created = GLES20.glCreateProgram();
        GLES20.glAttachShader(created, vertex);
        GLES20.glAttachShader(created, fragment);
        GLES20.glLinkProgram(created);
        final int[] status = new int[1];
        GLES20.glGetProgramiv(created, GLES20.GL_LINK_STATUS, status, 0);
        GLES20.glDeleteShader(vertex);
        GLES20.glDeleteShader(fragment);
        if (status[0] == 0) {
            final String log = GLES20.glGetProgramInfoLog(created);
            GLES20.glDeleteProgram(created);
            throw new IOException("着色器链接失败：" + log);
        }
        return created;
    }

    private int compile(int type, String source) throws IOException {
        final int shader = GLES20.glCreateShader(type);
        GLES20.glShaderSource(shader, source);
        GLES20.glCompileShader(shader);
        final int[] status = new int[1];
        GLES20.glGetShaderiv(shader, GLES20.GL_COMPILE_STATUS, status, 0);
        if (status[0] == 0) {
            final String log = GLES20.glGetShaderInfoLog(shader);
            GLES20.glDeleteShader(shader);
            throw new IOException("着色器编译失败：" + log);
        }
        return shader;
    }
}