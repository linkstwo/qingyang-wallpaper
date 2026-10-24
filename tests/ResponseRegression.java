package com.tangtang.motionwallpaper;

import java.util.Locale;

/** Deterministic input/response checks against production Java, with no Android stubs. */
public final class ResponseRegression {
    private static int assertions;
    private static void check(boolean value, String message) {
        if (!value) throw new AssertionError(message);
        assertions++;
    }

    private static float[] replay(boolean enhanced, int fps) {
        Physics physics = new Physics(enhanced);
        MotionInput input = new MotionInput();
        float peak = 0f, hair = 0f, vertical = 0f;
        int tick = 0;
        for (int frame = 0; frame < fps * 7; frame++) {
            for (int sub = 0; sub < 120 / fps; sub++, tick++) {
                double t = tick / 120.0;
                input.alphaY = t < 2 ? (float) (35 * Math.sin(t * Math.PI * 6)) : 0f;
                input.alphaX = t < 2 ? (float) (20 * Math.sin(t * Math.PI * 4.4)) : 0f;
                physics.step(1f / 120f, input);
                peak = Math.max(peak, Math.abs(physics.chestPx));
                hair = Math.max(hair, Math.abs(physics.hairPx));
                vertical = Math.max(vertical, Math.abs(physics.hairPy));
                check(Float.isFinite(physics.chestPx), "response must remain finite");
                check(Math.abs(physics.chestPx) <= 12f && Math.abs(physics.hairPx) <= 21.01f,
                        "secondary motion must respect bounds");
                check(physics.viewX == 0 && physics.viewY == 0,
                        "pure angular excitation must not drift the held view");
            }
        }
        check(Math.abs(physics.chestPx) + Math.abs(physics.hairPx) + Math.abs(physics.hairPy) < .002f,
                "motion must settle after angular input stops");
        check(!physics.moving(), "settled scene must allow idle rendering");
        return new float[]{peak, hair, vertical};
    }

    public static void main(String[] args) {
        Locale.setDefault(Locale.US);
        float[] old = replay(false, 60), enhanced = replay(true, 60);
        check(enhanced[0] > old[0] * 2f, "gyro response must measurably exceed the baseline");
        check(enhanced[1] > old[1] * 1.5f && enhanced[2] > .1f, "tip movement must have two axes");
        for (int fps : new int[]{30, 120}) {
            float[] other = replay(true, fps);
            for (int i = 0; i < 3; i++) check(Math.abs(other[i] - enhanced[i]) < .0001f,
                    "fixed-step response must not depend on render frame rate");
        }
        Physics hold = new Physics(); MotionInput input = new MotionInput();
        input.tiltX = .15f; input.tiltZ = -.09f;
        for (int n = 0; n < 120 * 6; n++) hold.step(1f / 120f, input);
        check(Math.abs(hold.viewX - .5f) < .0001f && Math.abs(hold.viewY + .3f) < .0001f,
                "constant tilt must hold its view");
        float x = hold.viewX;
        hold.step(0f, input); hold.step(Float.NaN, input); hold.step(-1f, input);
        check(hold.viewX == x, "invalid time steps must not poison state");
        MotionInput sensor = new MotionInput();
        sensor.gyro(0f, 0f, 0f, 1_000_000_000L);
        sensor.gyro(0f, 3f, 0f, 1_020_000_000L);
        check(sensor.alphaY > 0 && sensor.excited(), "actual gyro ingestion must excite the mapped axis");
        float alpha = sensor.alphaY;
        sensor.gyro(Float.NaN, 0, 0, 1_040_000_000L);
        sensor.gyro(0, -8, 0, 1_010_000_000L);
        check(sensor.alphaY == alpha, "invalid or out-of-order sensor events must be ignored");
        MotionInput sample = sensor.copy();
        sensor.gyro(0, -3f, 0, 1_040_000_000L);
        check(sample.alphaY == alpha, "render snapshot must not change with the next sensor event");
        sensor.age(1_300_000_000L);
        check(sensor.alphaY == 0 && sensor.wy == 0, "stale angular input must stop applying force");
        check(MotionInput.mapX(1, 2, 1) == 2 && MotionInput.mapY(1, 2, 1) == -1,
                "screen rotation must remap axes consistently");
        for (int[] screen : new int[][]{{1080,2400},{1260,2800},{1080,1080},{2400,1080},{0,0}}) {
            Framing frame = new Framing(screen[0], screen[1], true);
            check(Float.isFinite(frame.scale) && frame.scale > 0, "composition mapping must remain valid");
        }
        int[] viewport = Framing.previewViewport(390, 500, 1260f / 2800f);
        check(viewport[2] == 225 && viewport[3] == 500, "app preview must preserve phone aspect ratio");
        Framing close = new Framing(1260, 2800, false), wide = new Framing(1260, 2800, true);
        float oldRight = (1260 - close.x) / close.scale, newRight = (1260 - wide.x) / wide.scale;
        check(oldRight < 950 && newRight > 1020, "wider frame must actually reveal the back contour");
        check(wide.motionGain > 1f && wide.motionGain <= 1.45f,
                "inertia compensation must stay bounded instead of inflating a small portrait");
        for (float offset : new float[]{0f, .5f, 1f}) {
            int[] rect = WallpaperViewport.visible(2520, 2800, 1260, 2800, offset, 0f, -Math.round(1260*offset), 0);
            check(rect[0] == Math.round(1260*offset) && rect[2] == 1260, "compose inside the scrolled display, not full Surface");
        }
        int[] clamped = WallpaperViewport.visible(800, 600, 1260, 2800, Float.NaN, Float.NaN, -9999, -9999);
        check(clamped[0]==0 && clamped[1]==0 && clamped[2]==800 && clamped[3]==600, "small system preview must remain in bounds");
        Framing lowered=new Framing(1260,2800,true,90,10);
        check(lowered.y>=280f-.01f, "top margin must reserve room for a compositor centre crop");
        check(lowered.y+333f*lowered.scale>2800*.1f, "face must remain below the simulated 25% crop edge");
        // The source back contour x=1010 stays visible through a 25% centre crop.
        float back = wide.x + 1010f * wide.scale;
        check(back < 1260*.9f && back > 1260*.5f, "back contour must have compositor crop margin");
        Physics translation = new Physics(); MotionInput shove = new MotionInput(); shove.ax = 5f;
        for(int n=0;n<30;n++) translation.step(1f/120f,shove);
        check(translation.chestPx < -.1f && translation.bodyPx < 0, "translation must drive inertia opposite the applied acceleration");
        shove.ax=0;
        for(int n=0;n<120*6;n++) translation.step(1f/120f,shove);
        check(!translation.moving(), "linear acceleration response must settle");
        Physics pushPull=new Physics(); MotionInput depthForce=new MotionInput(); depthForce.az=4f;
        for(int n=0;n<60;n++)pushPull.step(1f/120f,depthForce);
        check(pushPull.chestPz<-.1f && pushPull.chestPx==0 && pushPull.chestPy==0,
                "forward acceleration must excite depth inertia without fake lateral motion");
        depthForce.az=0;
        for(int n=0;n<120*6;n++)pushPull.step(1f/120f,depthForce);
        check(Math.abs(pushPull.chestPz)<.001f && !pushPull.moving(), "depth spring must settle and allow idle rendering");
        // Relative fused quaternion: yaw must work even while gravity is unchanged.
        MotionInput fused = new MotionInput();
        fused.orientation(0,0,0,1,1_000_000_000L);
        float half=.14f;
        fused.orientation(0,(float)Math.sin(half),0,(float)Math.cos(half),1_020_000_000L);
        check(fused.hasPose && Math.abs(fused.poseYaw-.28f)<.00001f && fused.tiltX==0,
                "upright yaw must be observable without a gravity tilt");
        MotionInput fusedSample=fused.copy();
        fused.orientation(0,-(float)Math.sin(half),0,-(float)Math.cos(half),1_040_000_000L);
        check(Math.abs(fused.poseYaw-fusedSample.poseYaw)<.00001f, "q and -q represent the same pose");
        fused.orientation(0,0,0,0,1_060_000_000L);
        fused.orientation(0,0,0,1,1_010_000_000L);
        check(Math.abs(fused.poseYaw-.28f)<.00001f, "bad and out-of-order pose events must be ignored");
        Physics observed=new Physics();
        for(int n=0;n<120*5;n++)observed.step(1f/120f,fusedSample);
        check(Math.abs(observed.viewX-(float)Math.tanh(-1))<.00001f, "held fused yaw must hold the viewing direction");
        check(Math.abs(observed.chestPx)+Math.abs(observed.hairPx)<.001f, "holding a view must not keep shaking the body");
        fused.rotation(1); fused.orientation(0,0,0,1,2_000_000_000L);
        fused.orientation((float)Math.sin(half),0,0,(float)Math.cos(half),2_020_000_000L);
        check(Math.abs(fused.poseYaw+.28f)<.00001f, "landscape must remap quaternion axes consistently");
        MotionInput arbitrary=new MotionInput();
        float b=(float)Math.sqrt(.5);
        arbitrary.orientation(b,0,0,b,3_000_000_000L);
        arbitrary.orientation(b*(float)Math.cos(half),b*(float)Math.sin(half),b*(float)Math.sin(half),b*(float)Math.cos(half),3_020_000_000L);
        check(Math.abs(arbitrary.poseYaw-.28f)<.00001f && Math.abs(arbitrary.posePitch)<.00001f,
                "a tilted entry pose must use local relative axes, not world Euler subtraction");
        fused.age(2_700_000_000L);
        check(!fused.hasPose, "stale fusion must fall back to gravity");
        fused.reset(); check(!fused.hasPose && fused.poseYaw==0, "calibration must clear pose and baseline");
        Physics depthReplay=new Physics(); MotionInput depthSignal=new MotionInput(); float depthPeak=0;
        for(int n=0;n<120*6;n++){
            double t=n/120.0;depthSignal.az=t<2?(float)(4*Math.sin(t*Math.PI*4)):0;
            depthReplay.step(1f/120f,depthSignal);depthPeak=Math.max(depthPeak,Math.abs(depthReplay.chestPz));
        }
        check(depthPeak>.2f && Math.abs(depthReplay.chestPz)<.001f,"oscillating forward/back input must excite and settle the third axis");
        System.out.printf("{\"assertions\":%d,\"legacyChestPeak\":%.7f,\"enhancedChestPeak\":%.7f,"
                + "\"legacyHairPeak\":%.7f,\"enhancedHairPeak\":%.7f,\"hairYPeak\":%.7f,"
                + "\"depthPeak\":%.7f,\"oldVisibleRight\":%.3f,\"newVisibleRight\":%.3f,\"phoneTested\":false}%n",
                assertions, old[0], enhanced[0], old[1], enhanced[1], enhanced[2], depthPeak, oldRight, newRight);
    }
}
