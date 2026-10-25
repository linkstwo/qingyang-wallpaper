package com.tangtang.motionwallpaper;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Point;
import android.hardware.display.DisplayManager;
import android.view.Display;
import android.opengl.GLES20;
import android.opengl.GLUtils;

import java.io.IOException;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;

/**
 * GLES2 绘制核心（EGL 无关，壁纸服务与应用内预览共用）。
 * 着色器、分层顺序、mask 模式与 u_cover 逻辑都来自已验收样片的
 * character-prototype/preview/app.mjs；网格来自 MeshAssets（由样片真源码导出）。
 */
final class SceneRenderer {
    static final int SOURCE_WIDTH = 1152;
    static final int SOURCE_HEIGHT = 1536;

    private float backdropScaleX,backdropScaleY,backdropOffsetX,backdropOffsetY;
    private final Context context;
    private final SceneSettings settings;
    private boolean wider;
    private boolean phonePreview;
    private int viewportWidth = 1, viewportHeight = 1;
    private int viewportX, viewportY, sizePercent, topPercent;
    private float xOffset = 0.5f, yOffset = 0.5f;
    private int xPixels, yPixels;
    private float motionGain = 1f;
    private CropFrame cropOverride;
    private CropFrame renderedOverride;
    private int cropRevision;
    private CropFrame currentCrop;
    private MeshAssets meshes;
    private int program;
    private int aSource;
    private int aPin, aDepth;
    private int uSize;
    private int uView;
    private int uBody;
    private int uChest;
    private int uHair;
    private int uLayer;
    private int uMaskMode;
    private int uCover;
    private int uNdcScale;
    private int uMotionGain, uTipMode, uSoftFrame, uStructureMode;
    private int uNdcOffset;
    private int uTexture;
    private int uMask;
    private int texOriginal;
    private int texMask;
    private int texBackground;
    private int quadBuffer;
    private int characterBuffer;
    private int pinBuffer, depthBuffer;
    private int foregroundBuffer;
    private int quadCount;
    private int characterCount;
    private int foregroundCount;
    private int surfaceWidth = 1;
    private int surfaceHeight = 1;
    private float ndcScaleX = 1.0f;
    private float ndcScaleY = 1.0f;
    private float ndcOffsetX = 0.0f;
    private float ndcOffsetY = 0.0f;
    private boolean ready;
    private long drawnFrames;

    SceneRenderer(Context context) {
        this.context = context.getApplicationContext();
        settings = new SceneSettings(this.context);
    }

    void phonePreview(boolean value) { phonePreview = value; }
    void cropOverride(CropFrame value) { cropOverride=value; }

    void offsets(float x, float y, int px, int py) {
        xOffset = x; yOffset = y; xPixels = px; yPixels = py;
    }

    String framingSnapshot() {
        return "surface=" + surfaceWidth + "x" + surfaceHeight + " visible=" + viewportX + "," + viewportY
                + ":" + viewportWidth + "x" + viewportHeight + " crop=" + (currentCrop==null?"pending":currentCrop.encode());
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
        aDepth = GLES20.glGetAttribLocation(program, "a_depth");
        uStructureMode = GLES20.glGetUniformLocation(program, "u_structureMode");
        uSize = GLES20.glGetUniformLocation(program, "u_size");
        uView = GLES20.glGetUniformLocation(program, "u_view");
        uBody = GLES20.glGetUniformLocation(program, "u_body");
        uChest = GLES20.glGetUniformLocation(program, "u_chest");
        uHair = GLES20.glGetUniformLocation(program, "u_hair");
        uMotionGain = GLES20.glGetUniformLocation(program, "u_motionGain");
        uTipMode = GLES20.glGetUniformLocation(program, "u_tipMode");
        uSoftFrame = GLES20.glGetUniformLocation(program, "u_softFrame");
        uLayer = GLES20.glGetUniformLocation(program, "u_layer");
        uMaskMode = GLES20.glGetUniformLocation(program, "u_maskMode");
        uCover = GLES20.glGetUniformLocation(program, "u_cover");
        uNdcScale = GLES20.glGetUniformLocation(program, "u_ndcScale");
        uNdcOffset = GLES20.glGetUniformLocation(program, "u_ndcOffset");
        uTexture = GLES20.glGetUniformLocation(program, "u_texture");
        uMask = GLES20.glGetUniformLocation(program, "u_mask");
        if (aDepth < 0 || aSource < 0 || aPin < 0 || uSize < 0 || uView < 0 || uHair < 0) {
            throw new IOException("着色器变量缺失");
        }

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
        depthBuffer = makeBuffer(meshes.characterDepth);
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

    /** Persistent wider/close composition. Uncovered space uses the clean workshop background. */
    void resize(int width, int height) {
        surfaceWidth = Math.max(1, width);
        surfaceHeight = Math.max(1, height);
        wider = settings.wider();
        sizePercent = settings.sizePercent();
        topPercent = settings.topPercent();
        Point displaySize = new Point(surfaceWidth, surfaceHeight);
        DisplayManager manager = (DisplayManager) context.getSystemService(Context.DISPLAY_SERVICE);
        Display display = manager == null ? null : manager.getDisplay(Display.DEFAULT_DISPLAY);
        if (display != null) display.getRealSize(displaySize);
        int[] viewport = phonePreview
                ? Framing.previewViewport(surfaceWidth, surfaceHeight, displaySize.x / (float) Math.max(1, displaySize.y))
                : WallpaperViewport.visible(surfaceWidth, surfaceHeight, displaySize.x, displaySize.y,
                        xOffset, yOffset, xPixels, yPixels);
        viewportX = viewport[0]; viewportY = viewport[1];
        viewportWidth = viewport[2]; viewportHeight = viewport[3];
        float backdrop=Math.max(viewportWidth/(float)SOURCE_WIDTH,viewportHeight/(float)SOURCE_HEIGHT);
        backdropScaleX=2f*backdrop/viewportWidth;backdropScaleY=-2f*backdrop/viewportHeight;
        backdropOffsetX=-SOURCE_WIDTH*backdrop/viewportWidth;backdropOffsetY=SOURCE_HEIGHT*backdrop/viewportHeight;
        updateCrop();
        GLES20.glViewport(viewportX, surfaceHeight - viewportY - viewportHeight, viewportWidth, viewportHeight);
    }

    // A gesture changes transforms only; never query the display or rebuild assets here.
    private void updateCrop() {
        CropFrame frame = (cropOverride!=null?cropOverride:settings.frame(viewportWidth,viewportHeight)).bounded(viewportWidth,viewportHeight);
        currentCrop=frame;
        renderedOverride=cropOverride; cropRevision=settings.cropRevision();
        ndcScaleX = 2f * frame.scale(viewportWidth) / viewportWidth;
        ndcScaleY = -2f * frame.scale(viewportWidth) / viewportHeight;
        ndcOffsetX = 2f * frame.x(viewportWidth) / viewportWidth - 1f;
        ndcOffsetY = 1f - 2f * frame.y(viewportWidth,viewportHeight) / viewportHeight;
        float cover=Math.max(viewportWidth/(float)SOURCE_WIDTH,viewportHeight/(float)SOURCE_HEIGHT);
        motionGain = Math.min(1.45f,cover/frame.scale(viewportWidth));
    }

    void draw(Physics physics) {
        if (!ready) {
            return;
        }
        physics.lively(settings.lively());
        if (renderedOverride!=cropOverride || cropRevision!=settings.cropRevision()) updateCrop();
        // Always fill the old silhouette. A motion-dependent cover made it flash at rest.
        final float cover = 1f;
        GLES20.glUseProgram(program);
        GLES20.glUniform2f(uView, physics.viewX, physics.viewY);
        GLES20.glUniform2f(uBody, physics.bodyPx, physics.bodyPy);
        GLES20.glUniform3f(uChest, physics.chestPx, physics.chestPy, physics.chestPz);
        GLES20.glUniform2f(uHair, physics.hairPx, physics.hairPy);
        GLES20.glUniform1f(uMotionGain, motionGain);
        GLES20.glUniform1f(uTipMode, 1f);
        GLES20.glUniform1f(uStructureMode, settings.structure() ? 1f : 0f);
        GLES20.glUniform1f(uSoftFrame, 1f);
        GLES20.glUniform1f(uCover, cover);
        GLES20.glUniform2f(uNdcScale, ndcScaleX, ndcScaleY);
        GLES20.glUniform2f(uNdcOffset, ndcOffsetX, ndcOffsetY);

        GLES20.glClearColor(0.06f, 0.09f, 0.12f, 1.0f);
        GLES20.glClear(GLES20.GL_COLOR_BUFFER_BIT);

        {
            GLES20.glUniform2f(uNdcScale,backdropScaleX,backdropScaleY);
            GLES20.glUniform2f(uNdcOffset,backdropOffsetX,backdropOffsetY);
            drawLayer(quadBuffer, quadCount, texBackground, -1f, 0f, false);
            GLES20.glUniform2f(uNdcScale, ndcScaleX, ndcScaleY);
            GLES20.glUniform2f(uNdcOffset, ndcOffsetX, ndcOffsetY);
        }
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
            GLES20.glEnableVertexAttribArray(aDepth);
            GLES20.glBindBuffer(GLES20.GL_ARRAY_BUFFER, depthBuffer);
            GLES20.glVertexAttribPointer(aDepth, 1, GLES20.GL_FLOAT, false, 0, 0);
            GLES20.glBindBuffer(GLES20.GL_ARRAY_BUFFER, pinBuffer);
            GLES20.glVertexAttribPointer(aPin, 1, GLES20.GL_FLOAT, false, 0, 0);
        } else {
            GLES20.glDisableVertexAttribArray(aPin);
            GLES20.glDisableVertexAttribArray(aDepth);
            GLES20.glVertexAttrib1f(aDepth, 0f);
            GLES20.glVertexAttrib1f(aPin, 0.0f);
        }
        GLES20.glBindBuffer(GLES20.GL_ARRAY_BUFFER, buffer);
        GLES20.glVertexAttribPointer(aSource, 2, GLES20.GL_FLOAT, false, 0, 0);
        GLES20.glDrawArrays(GLES20.GL_TRIANGLES, 0, vertexCount);
    }

    void release() {
        ready = false;
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
        int[] buffers = {quadBuffer, characterBuffer, pinBuffer, depthBuffer, foregroundBuffer};
        for (int buffer : buffers) {
            if (buffer != 0) {
                GLES20.glDeleteBuffers(1, new int[]{buffer}, 0);
            }
        }
        quadBuffer = characterBuffer = pinBuffer = depthBuffer = foregroundBuffer = 0;
        meshes = null;
    }

    /** A lost context already owns/deletes these objects; never delete its IDs in another context. */
    void abandonGlResources() {
        ready = false;
        program = texOriginal = texMask = texBackground = 0;
        quadBuffer = characterBuffer = pinBuffer = depthBuffer = foregroundBuffer = 0;
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
        if (!name.equals("background.png") && (bitmap.getWidth() != SOURCE_WIDTH || bitmap.getHeight() != SOURCE_HEIGHT)) {
            String detail=name + " 尺寸与网格画布不一致：" + bitmap.getWidth() + "x" + bitmap.getHeight();
            bitmap.recycle();
            throw new IOException(detail);
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

    private String shaderAsset(String name) throws IOException {
        try (InputStream input = context.getAssets().open(name);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] chunk = new byte[4096]; int read;
            while ((read = input.read(chunk)) != -1) output.write(chunk, 0, read);
            return output.toString("UTF-8");
        }
    }

    private int buildProgram() throws IOException {
        final int vertex = compile(GLES20.GL_VERTEX_SHADER, shaderAsset("scene.vert"));
        final int fragment = compile(GLES20.GL_FRAGMENT_SHADER, shaderAsset("scene.frag"));
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
