import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import console from "node:console";
import { fileURLToPath, URL } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const project = fileURLToPath(new URL("..", import.meta.url));
const toolchain = path.resolve(project, "../.android-toolchain");
const delivery =
  process.env.CYBERSHIELD_ANDROID_OUTPUT ||
  path.resolve(project, "../CyberShield-Android");
const signing =
  process.env.CYBERSHIELD_ANDROID_SIGNING_DIR ||
  path.join(delivery, "private-signing");
const credentials = JSON.parse(
  fs.readFileSync(path.join(signing, "credentials.json"), "utf8"),
);
const keystore = path.join(signing, "cybershield-release.p12");
if (
  !fs.existsSync(keystore) ||
  !credentials.storePassword ||
  !credentials.keyPassword
)
  throw new Error(
    "A valid private signing identity is required; an unsigned APK will not be delivered.",
  );
const env = { ...process.env };
env.JAVA_HOME ||= path.join(toolchain, "jdk21");
env.ANDROID_HOME ||= env.ANDROID_SDK_ROOT || path.join(toolchain, "sdk");
env.ANDROID_SDK_ROOT = env.ANDROID_HOME;
env.ANDROID_USER_HOME ||= path.join(toolchain, "android-user");
env.GRADLE_USER_HOME ||= path.join(toolchain, "gradle-home");
if (
  !fs.existsSync(path.join(env.JAVA_HOME, "bin/javac")) ||
  !fs.existsSync(
    path.join(env.ANDROID_HOME, "platforms/android-36/android.jar"),
  )
)
  throw new Error(
    "JDK 21 and Android SDK platform 36 are required. Set JAVA_HOME and ANDROID_HOME.",
  );
const network = path.join(toolchain, "java-network-options.txt");
if (!env.JAVA_TOOL_OPTIONS && fs.existsSync(network))
  env.JAVA_TOOL_OPTIONS = fs.readFileSync(network, "utf8");
env.CYBERSHIELD_ANDROID_KEYSTORE = keystore;
env.CYBERSHIELD_ANDROID_STORE_PASSWORD = credentials.storePassword;
env.CYBERSHIELD_ANDROID_KEY_PASSWORD = credentials.keyPassword;
const build = spawnSync(
  "./gradlew",
  [
    ":app:assembleRelease",
    ":app:lintRelease",
    "--no-daemon",
    "--console=plain",
  ],
  {
    cwd: path.join(project, "android"),
    env,
    stdio: "inherit",
  },
);
if (build.status !== 0) process.exit(build.status || 1);
const apk = path.join(
  project,
  "android/app/build/outputs/apk/release/app-release.apk",
);
if (!fs.existsSync(apk))
  throw new Error("The signed release APK was not produced.");
const signer = spawnSync(
  path.join(env.ANDROID_HOME, "build-tools/36.0.0/apksigner"),
  ["verify", "--verbose", "--print-certs", apk],
  { env, encoding: "utf8" },
);
if (signer.status !== 0) throw new Error("APK signature verification failed.");
const version = JSON.parse(
  fs.readFileSync(path.join(project, "package.json"), "utf8"),
).version;
const downloads = path.join(delivery, "downloads"),
  reports = path.join(delivery, "reports");
fs.mkdirSync(downloads, { recursive: true });
fs.mkdirSync(reports, { recursive: true });
const destination = path.join(downloads, `CyberShield-${version}.apk`);
fs.copyFileSync(apk, destination);
const bytes = fs.readFileSync(destination);
const checksum = createHash("sha256").update(bytes).digest("hex");
fs.writeFileSync(
  destination + ".sha256",
  checksum + "  " + path.basename(destination) + "\n",
);
fs.writeFileSync(path.join(reports, "APK-SIGNATURE.txt"), signer.stdout);
fs.writeFileSync(
  path.join(reports, "BUILD.json"),
  JSON.stringify(
    {
      package: "by.cybershield.app",
      version,
      versionCode: 20400,
      minSdk: 26,
      targetSdk: 36,
      minWebView: 123,
      bytes: bytes.length,
      sha256: checksum,
      signed: true,
      builtAt: new Date().toISOString(),
    },
    null,
    2,
  ) + "\n",
);
console.log(`Signed and verified APK: ${destination}`);
console.log(`SHA-256: ${checksum}`);
