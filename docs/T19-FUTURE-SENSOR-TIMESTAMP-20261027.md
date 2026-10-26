# T19 future sensor timestamp recovery

Independent branch candidate based on 5c3bf05. No edits to the main branch's active fence12 geometry.

Actual failure reproduced before the change: injecting an accelerometer event timestamped Long.MAX_VALUE establishes accelStamp so all later real accelerometer samples are rejected. A future gyro sample similarly makes gyroStamp un-ageable and blocks recovery. This is a fault-injection case; there is no observed report of this Android vendor failure on the target phone.

Fix: SensorFeed captures receipt elapsedRealtimeNanos once and rejects timestamps later than receipt before updating any motion/filter/health state. Existing 500ms late-batch rejection remains. Timestamp and receipt use the same monotonic clock. No normal signal mapping or Q-elastic parameter changed.

Verification: baseline test exited1 at future accelerometer recovery assertion. Fixed production SensorFeed compiled against deterministic host Android sensor fixtures; 12 queue assertions and 16263 existing sampled trajectory assertions passed, including future acceleration/gyro rejection, genuine subsequent movement and stale decay. Original Java/JS response and lifecycle results are separately recorded in checkpoint. Device/native lockscreen acceptance remains pending. No APK built from this isolated candidate.

Selectively apply SensorFeed.java and SensorQueueRegression.java only after checking the main worker's latest sensor diff. Do not merge this branch's lease or overwrite newer main state. Next: inspect unsupported/failed sensor registration fallback and lifecycle resources independently if main geometry remains busy.

## Gravity camera wake

A second actual baseline failure: dedicated gravity changes tilt but SensorFeed never sets poseChanged, so an idle renderer receives no wake without a fused quaternion or inertial excitation. Changed MotionInput.gravity to return meaningful fallback pose change, used by both dedicated gravity and accelerometer-derived gravity paths. No force is fabricated. Valid fused pose suppresses this fallback wake; settled gravity stops wakeups instead of running forever at sensor rate.

Baseline failed at gravity-only pose wake. Fixed combined queue now passes17 assertions (future timestamp recovery, gravity baseline silence, actual camera wake, no fake impulse, settled silence and fused-pose noise suppression), sampled trajectories16263, original response10132 and host lifecycle52. These are deterministic host tests, not phone latency or power measurements. Exported Android assets remain exact; parts-warp1678 also passed. T10/T15/T19 are not wholly accepted.
