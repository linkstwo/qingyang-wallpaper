#!/bin/bash
# M08 性能采集脚本 - 真机连接后运行
# 用法: adb shell 或通过USB连接iQOO Z9 Turbo后执行
# 采集: 帧时间、内存、传感器状态、30分钟可见运行 + 熄屏对照

PACKAGE="com.tangtang.motionwallpaper"
LOG_DIR="validation/perf-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$LOG_DIR"

echo "=== 性能采集开始 ==="
echo "日志目录: $LOG_DIR"

# 1. 基础信息
adb shell dumpsys package $PACKAGE | grep -E "versionName|versionCode" > "$LOG_DIR/info.txt"
adb shell getprop ro.build.version.release >> "$LOG_DIR/info.txt"
adb shell getprop ro.product.model >> "$LOG_DIR/info.txt"

# 2. FPS采集（连续60秒）
echo "采集FPS 60秒..."
adb shell dumpsys gfxinfo $PACKAGE framestats > "$LOG_DIR/fps-60s.csv" 2>&1

# 3. 内存快照
echo "采集内存快照..."
adb shell dumpsys meminfo $PACKAGE > "$LOG_DIR/meminfo.txt" 2>&1

# 4. CPU占用
echo "采集CPU 10秒..."
adb shell top -m 5 -n 2 -d 5 > "$LOG_DIR/cpu.txt" 2>&1

# 5. 传感器状态
echo "采集传感器状态..."
adb shell dumpsys sensorservice | grep -A5 "qingyang\|motion" > "$LOG_DIR/sensors.txt" 2>&1

# 6. 壁纸服务状态
echo "采集壁纸服务状态..."
adb shell dumpsys wallpaper > "$LOG_DIR/wallpaper.txt" 2>&1

# 7. 完整日志（过滤Qingyang标签）
echo "采集logcat 30秒..."
timeout 30 adb logcat -s QingyangRender:V MotionWallpaper:V > "$LOG_DIR/logcat-30s.txt" 2>&1

echo "=== 采集完成 ==="
echo "结果保存在: $LOG_DIR"
echo ""
echo "下一步: 熄屏后重复以上采集，对比亮屏/熄屏差异"
