package com.tangtang.motionwallpaper;

import android.content.Context;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

/**
 * 渲染/物理参数（轻漾 2.5D 编辑器参数接线）。
 *
 * <p>默认值 = 本类构造时的字段初值 = 接线前 SceneRenderer/Physics 的硬编码常量
 * （区域场取自已验收样片 app.mjs，弹簧取自真机调整值），所以 assets 里
 * 没有 qingyang-params.json 时行为与接线前完全一致（向后兼容）。
 *
 * <p>编辑器导出的 editor/export/export-android-assets.mjs 会把工程里的
 * 区域场/弹簧/增益/限幅写成同格式的 qingyang-params.json；放进 assets 后
 * 在下次构建时被读取覆盖默认值。解析失败一律回落默认值，绝不让壁纸黑屏。
 */
final class RenderParams {
    static final String ASSET_NAME = "qingyang-params.json";
    private static final String TAG = "QingyangParams";

    // ---- 人物层区域场（与编辑器 gl-scene.mjs 的 uniform 同构）----
    float headY0 = 340.0f, headY1 = 495.0f, headDepth = 11.0f, headCheekGain = 13.0f;
    // bell: neck, chest, shoulder, torso, cheek, hairRoot（cx, cy, rx, ry）
    final float[][] bells = {
            {630.0f, 410.0f, 220.0f, 180.0f},   // neck
            {577.0f, 785.0f, 165.0f, 205.0f},   // chest
            {815.0f, 528.0f, 170.0f, 210.0f},   // shoulder
            {721.0f, 789.0f, 310.0f, 430.0f},   // torso
            {392.0f, 333.0f, 170.0f, 155.0f},   // cheek
            {246.0f, 367.0f, 110.0f, 210.0f},   // hairRoot
            {235.0f, 520.0f, 95.0f, 170.0f},    // hairTip（分段发束通道）
    };
    // depth 权重：head, neck, chest, shoulder, torso, cheek, hairRoot（hairTip 不参与 depth）
    final float[] depth = {11.0f, 0.0f, 20.0f, 11.0f, 19.0f, 0.0f, 0.0f};
    // 惯性增益（同序）：head 0.30, neck 0.22, torso 0.68，其余 0
    final float[] inertia = {0.30f, 0.22f, 0.0f, 0.0f, 0.68f, 0.0f, 0.0f};
    // 挤压修正：headSqueezeX, torsoSqueezeY, pivotX, pivotY
    final float[] squeeze = {-0.006f, 0.008f, 560.0f, 650.0f};
    // turn 纵比 / 惯性基线 / 发梢纵比 / 头部身体增益
    float turnRatioY = 0.63f;
    float inertiaBase = 0.32f;
    float hairYRatio = 0.35f;
    float headBodyGain = 0.30f;
    // 背景层/前景层视差比
    final float[] bgRatio = {3.0f, 2.0f};
    final float[] fgRatio = {4.0f, 2.5f};

    // ---- 物理弹簧（Android 真机调整值为默认；编辑器导出可覆盖）----
    final float[] springBody = {2.4f, 0.88f, 1.2f};
    final float[] springChest = {3.2f, 0.50f, 1.4f};
    final float[] springHair = {1.7f, 0.58f, 1.5f};
    final float[] springHairTip = {1.4f, 0.45f, 1.6f};
    // 激发增益
    float gainBody = 1.4f;
    float gainChestX = 3.4f, gainChestY = 4.2f, gainChestCoupling = 60.0f, gainChestCouplingY = 75.0f;
    float gainHair = 2.2f;
    float gainHairTip = 3.0f;
    // 位移上限（像素）
    float limitBody = 5.0f, limitChest = 7.0f, limitHair = 10.0f, limitHairTip = 14.0f;

    /** 从 assets 加载；文件缺失或解析失败返回全默认（保证壁纸永不因参数黑屏）。 */
    static RenderParams load(Context context) {
        RenderParams params = new RenderParams();
        try (InputStream in = context.getAssets().open(ASSET_NAME)) {
            params.applyJson(new JSONObject(readAll(in)));
            Log.i(TAG, "已加载 " + ASSET_NAME);
        } catch (IOException missing) {
            Log.i(TAG, "assets 无 " + ASSET_NAME + "，使用内置默认参数");
        } catch (Exception broken) {
            Log.w(TAG, ASSET_NAME + " 解析失败，使用内置默认参数: " + broken);
        }
        return params;
    }

    void applyJson(JSONObject root) throws Exception {
        if (!"qingyang-render-params".equals(root.optString("format"))) {
            throw new IllegalArgumentException("format 不是 qingyang-render-params");
        }
        if (root.optInt("version", -1) != 1) {
            throw new IllegalArgumentException("不支持的参数版本 " + root.optInt("version", -1));
        }
        applyBells(root.optJSONArray("bells"));
        applyArray(root.optJSONArray("depth"), depth);
        applyArray(root.optJSONArray("inertia"), inertia);
        applyArray(root.optJSONArray("squeeze"), squeeze);
        applyArray(root.optJSONArray("bgRatio"), bgRatio);
        applyArray(root.optJSONArray("fgRatio"), fgRatio);
        headY0 = (float) root.optDouble("headY0", headY0);
        headY1 = (float) root.optDouble("headY1", headY1);
        headDepth = (float) root.optDouble("headDepth", headDepth);
        headCheekGain = (float) root.optDouble("headCheekGain", headCheekGain);
        turnRatioY = (float) root.optDouble("turnRatioY", turnRatioY);
        inertiaBase = (float) root.optDouble("inertiaBase", inertiaBase);
        hairYRatio = (float) root.optDouble("hairYRatio", hairYRatio);
        headBodyGain = (float) root.optDouble("headBodyGain", headBodyGain);
        applySpring(root.optJSONObject("springBody"), springBody);
        applySpring(root.optJSONObject("springChest"), springChest);
        applySpring(root.optJSONObject("springHair"), springHair);
        applySpring(root.optJSONObject("springHairTip"), springHairTip);
        JSONObject gains = root.optJSONObject("gains");
        if (gains != null) {
            gainBody = (float) gains.optDouble("body", gainBody);
            gainChestX = (float) gains.optDouble("chestX", gainChestX);
            gainChestY = (float) gains.optDouble("chestY", gainChestY);
            gainChestCoupling = (float) gains.optDouble("chestCoupling", gainChestCoupling);
            gainChestCouplingY = (float) gains.optDouble("chestCouplingY", gainChestCouplingY);
            gainHair = (float) gains.optDouble("hair", gainHair);
            gainHairTip = (float) gains.optDouble("hairTip", gainHairTip);
        }
        JSONObject limits = root.optJSONObject("limits");
        if (limits != null) {
            limitBody = (float) limits.optDouble("body", limitBody);
            limitChest = (float) limits.optDouble("chest", limitChest);
            limitHair = (float) limits.optDouble("hair", limitHair);
            limitHairTip = (float) limits.optDouble("hairTip", limitHairTip);
        }
    }

    /** bells 按 id 匹配：head 的 smoothstep 之外，数组每项 {id, cx, cy, rx, ry}。 */
    private void applyBells(JSONArray array) throws Exception {
        if (array == null) return;
        for (int i = 0; i < array.length(); i++) {
            JSONObject r = array.getJSONObject(i);
            int slot = regionSlot(r.optString("id"));
            if (slot < 0) continue;
            if (slot == 0) {
                headY0 = (float) r.optDouble("y0", headY0);
                headY1 = (float) r.optDouble("y1", headY1);
            } else {
                float[] bell = bells[slot - 1];
                bell[0] = (float) r.optDouble("cx", bell[0]);
                bell[1] = (float) r.optDouble("cy", bell[1]);
                bell[2] = (float) r.optDouble("rx", bell[2]);
                bell[3] = (float) r.optDouble("ry", bell[3]);
            }
        }
    }

    private static int regionSlot(String id) {
        switch (id == null ? "" : id) {
            case "head": return 0;
            case "neck": return 1;
            case "chest": return 2;
            case "shoulder": return 3;
            case "torso": return 4;
            case "cheek": return 5;
            case "hairRoot": return 6;
            case "hairTip": return 7;
            default: return -1;
        }
    }

    private static void applyArray(JSONArray array, float[] target) {
        if (array == null) return;
        int n = Math.min(array.length(), target.length);
        for (int i = 0; i < n; i++) {
            target[i] = (float) array.optDouble(i, target[i]);
        }
    }

    private static void applySpring(JSONObject spring, float[] target) {
        if (spring == null) return;
        target[0] = (float) spring.optDouble("frequency", target[0]);
        target[1] = (float) spring.optDouble("damping", target[1]);
        target[2] = (float) spring.optDouble("limit", target[2]);
    }

    private static String readAll(InputStream in) throws IOException {
        StringBuilder sb = new StringBuilder(4096);
        byte[] buf = new byte[4096];
        int n;
        while ((n = in.read(buf)) > 0) {
            sb.append(new String(buf, 0, n, StandardCharsets.UTF_8));
        }
        return sb.toString();
    }
}
