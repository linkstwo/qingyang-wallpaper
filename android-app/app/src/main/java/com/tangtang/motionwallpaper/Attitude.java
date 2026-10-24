package com.tangtang.motionwallpaper;

/** Relative fused quaternion in the device frame at calibration, radians.
 * No Euler-angle subtraction, no raw-gyro integration and no magnetic heading dependency.
 * Game rotation-vector heading can still drift over long sessions; visibility reset/recenter
 * establishes a fresh reference. q and -q describe exactly the same orientation.
 */
final class Attitude {
    private float bx, by, bz, bw;
    private boolean base;
    float yaw, pitch, roll;

    void reset() { base = false; yaw = pitch = roll = 0f; }

    boolean update(float x, float y, float z, float w, int rotation) {
        if (!MathX.valid(x, y, z) || !Float.isFinite(w)) return false;
        float norm = (float) Math.sqrt(x*x + y*y + z*z + w*w);
        if (norm < 0.5f || norm > 1.5f) return false;
        x /= norm; y /= norm; z /= norm; w /= norm;
        if (!base) { bx=x; by=y; bz=z; bw=w; base=true; }
        // conjugate(baseline) * current: axes stay local to the phone at entry.
        float rx=bw*x-bx*w-by*z+bz*y;
        float ry=bw*y+bx*z-by*w-bz*x;
        float rz=bw*z-bx*y+by*x-bz*w;
        float rw=bw*w+bx*x+by*y+bz*z;
        float sx=MotionInput.mapX(rx, ry, rotation), sy=MotionInput.mapY(rx, ry, rotation);
        float nx=2f*(sx*rz+rw*sy), ny=2f*(sy*rz-rw*sx);
        float nz=1f-2f*(sx*sx+sy*sy);
        yaw=(float)Math.atan2(nx,nz);
        pitch=(float)Math.atan2(-ny,Math.sqrt(nx*nx+nz*nz));
        roll=(float)Math.atan2(2f*(rw*rz+sx*sy),1f-2f*(sy*sy+rz*rz));
        return true;
    }
}
