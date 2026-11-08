package com.tangtang.motionwallpaper;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

/**
 * RenderParams 默认值锁定：这些值 = 参数接线前的硬编码行为（居中取景、真机弹簧），
 * 改默认值必须是有意为之并同步 assets/qingyang-params.json。
 */
public class RenderParamsTest {
    @Test public void defaults_matchPreWiringBehavior() {
        RenderParams p = new RenderParams();
        // 2026-11-08 老板定调「要Q弹、幅度大」：上限 5/7/10/14→13/27/26/40，
        // 弹簧降频降阻尼（胸 2.6Hz/0.36）。数值来源 tune-springs.mjs 仿真（零撞限幅），
        // 与 assets/qingyang-params.json、编辑器 project.mjs 三处同步。
        assertEquals(2.2f, p.springBody[0], 1e-6f);
        assertEquals(2.6f, p.springChest[0], 1e-6f);
        assertEquals(1.5f, p.springHair[0], 1e-6f);
        assertEquals(13.0f, p.limitBody, 1e-6f);
        assertEquals(27.0f, p.limitChest, 1e-6f);
        assertEquals(0.5f, p.viewPanBase, 1e-6f);
        assertEquals(0.0f, p.viewPanRange, 1e-6f);
        assertEquals(19.0f, p.depth[4], 1e-6f);
        assertEquals(630.0f, p.bells[0][0], 1e-6f);
    }

    @Test public void defaults_regionCountMatchesShaderSlots() {
        RenderParams p = new RenderParams();
        assertEquals(7, p.bells.length);
        assertEquals(7, p.depth.length);
        assertEquals(7, p.inertia.length);
    }
}
