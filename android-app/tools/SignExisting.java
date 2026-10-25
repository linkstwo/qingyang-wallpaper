import java.io.*;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;

/** Sign a verified cloud APK using only the existing LOCAL Android signing.properties.
 * JDK17 source launcher: java SignExisting.java INPUT.apk PROJECT_DIR BUILD.properties [OUTPUT.apk]
 * Never creates a key; passwords are passed to apksigner through the child environment.
 */
class SignExisting {
    static Properties read(Path path) throws IOException {
        Properties p = new Properties();
        try (InputStream in = Files.newInputStream(path)) { p.load(in); }
        return p;
    }
    static String required(Properties p, String key) {
        String value = p.getProperty(key);
        if (value == null || value.isEmpty()) throw new IllegalArgumentException("Missing property: " + key);
        return value;
    }
    static String digest(Path path) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        try (InputStream in = Files.newInputStream(path)) {
            byte[] data = new byte[65536]; int count;
            while ((count = in.read(data)) != -1) md.update(data, 0, count);
        }
        return HexFormat.of().formatHex(md.digest());
    }
    static String run(List<String> args, Map<String,String> environment) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(args).redirectErrorStream(true);
        pb.environment().putAll(environment);
        Process process = pb.start();
        String result = new String(process.getInputStream().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
        int exit = process.waitFor();
        if (exit != 0) throw new IOException("Signing tool failed (exit " + exit + ").\n" + result);
        return result;
    }
    public static void main(String[] args) throws Exception {
        if (args.length < 3 || args.length > 4) throw new IllegalArgumentException(
            "Usage: java SignExisting.java INPUT.apk PROJECT_DIR BUILD.properties [OUTPUT.apk]");
        Path input = Path.of(args[0]).toAbsolutePath().normalize();
        Path project = Path.of(args[1]).toAbsolutePath().normalize();
        Properties build = read(Path.of(args[2]));
        String version = required(build, "versionName");
        Path output = args.length == 4 ? Path.of(args[3]).toAbsolutePath().normalize()
            : input.resolveSibling("qingyang-" + version + ".apk");
        if (Files.exists(output)) throw new IOException("Output already exists; choose a new path: " + output);
        if (!digest(input).equalsIgnoreCase(required(build, "unsignedSha256")))
            throw new SecurityException("Input APK does not match the recorded cloud build.");
        String expected = required(build, "releaseCertificateSha256").replace(":", "").toLowerCase(Locale.ROOT);
        if (!expected.matches("[0-9a-f]{64}")) throw new IllegalArgumentException("Invalid expected release certificate");
        Properties signing = read(project.resolve("signing.properties"));
        Path key = Path.of(required(signing, "storeFile"));
        if (!key.isAbsolute()) key = project.resolve(key).normalize();
        if (!Files.isRegularFile(key)) throw new IOException("Configured existing keystore is missing");
        Properties local = Files.exists(project.resolve("local.properties")) ? read(project.resolve("local.properties")) : new Properties();
        String sdkValue = local.getProperty("sdk.dir");
        if (sdkValue == null) sdkValue = System.getenv("ANDROID_HOME");
        if (sdkValue == null) sdkValue = System.getenv("ANDROID_SDK_ROOT");
        if (sdkValue == null) throw new IOException("Set sdk.dir in local.properties or ANDROID_HOME");
        Path sdk = Path.of(sdkValue); if (!sdk.isAbsolute()) sdk = project.resolve(sdk);
        boolean windows = System.getProperty("os.name").toLowerCase(Locale.ROOT).contains("win");
        Path tools = sdk.resolve("build-tools/34.0.0"), signer = tools.resolve("lib/apksigner.jar");
        Path align = tools.resolve(windows ? "zipalign.exe" : "zipalign");
        String java = Path.of(System.getProperty("java.home"), "bin", windows ? "java.exe" : "java").toString();
        if (!Files.isRegularFile(signer) || !Files.isRegularFile(align)) throw new IOException("Android Build Tools34.0.0 are required");
        Path aligned = output.resolveSibling(".qingyang-aligned-" + UUID.randomUUID() + ".apk");
        Path signed = output.resolveSibling(".qingyang-signed-" + UUID.randomUUID() + ".apk");
        try {
            run(List.of(align.toString(), "-f", "-p", "4", input.toString(), aligned.toString()), Map.of());
            run(List.of(java, "-jar", signer.toString(), "sign", "--ks", key.toString(),
                "--ks-key-alias", required(signing, "keyAlias"), "--ks-pass", "env:QY_STORE_PASS_055",
                "--key-pass", "env:QY_KEY_PASS_055", "--v4-signing-enabled", "false", "--out", signed.toString(), aligned.toString()),
                Map.of("QY_STORE_PASS_055", required(signing, "storePassword"), "QY_KEY_PASS_055", required(signing, "keyPassword")));
            String verify = run(List.of(java, "-jar", signer.toString(), "verify", "--verbose", "--print-certs", signed.toString()), Map.of());
            String certLine = "Signer #1 certificate SHA-256 digest: " + expected;
            if (!verify.toLowerCase(Locale.ROOT).contains(certLine.toLowerCase(Locale.ROOT)))
                throw new SecurityException("Certificate differs from the existing release; no signed APK exported.");
            run(List.of(align.toString(), "-c", "-p", "4", signed.toString()), Map.of());
            Files.move(signed, output);
            System.out.println("Signed with the existing release certificate: " + expected);
            System.out.println("APK: " + output);
            System.out.println("SHA-256: " + digest(output));
        } finally {
            Files.deleteIfExists(aligned); Files.deleteIfExists(signed);
        }
    }
}
