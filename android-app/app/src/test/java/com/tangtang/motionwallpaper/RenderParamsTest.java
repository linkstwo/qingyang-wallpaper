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
        assertEquals(2.4f, p.springBody[0], 1e-6f);
        assertEquals(3.2f, p.springChest[0], 1e-6f);
        assertEquals(1.7f, p.springHair[0], 1e-6f);
        assertEquals(5.0f, p.limitBody, 1e-6f);
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
