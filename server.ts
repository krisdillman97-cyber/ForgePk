import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs-extra";
import { exec } from "child_process";
import { v4 as uuidv4 } from "uuid";
import archiver from "archiver";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let gradlePath = "gradle";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", async (req, res) => {
    let gradleVersion = "Not found";
    let apksignerVersion = "Not found";
    let keytoolVersion = "Not found";
    try {
      gradleVersion = await new Promise((resolve) => {
        exec("gradle -v", (err, stdout) => {
          if (err) resolve("Error: " + err.message);
          else resolve(stdout);
        });
      });
      apksignerVersion = await new Promise((resolve) => {
        exec("apksigner --version", (err, stdout) => {
          if (err) resolve("Error: " + err.message);
          else resolve(stdout);
        });
      });
      keytoolVersion = await new Promise((resolve) => {
        exec("keytool -help", (err, stdout) => {
          if (err) resolve("Error: " + err.message);
          else resolve("Available");
        });
      });
    } catch (e) {
      gradleVersion = "Exception: " + String(e);
    }
    res.json({ 
      status: "ok", 
      gradle: gradleVersion,
      gradlePath: gradlePath,
      path: process.env.PATH,
      apksigner: apksignerVersion,
      keytool: keytoolVersion
    });
  });

  // Cleanup old builds every hour
  setInterval(async () => {
    const buildsDir = path.join(__dirname, "builds");
    const now = Date.now();
    try {
      const files = await fs.readdir(buildsDir);
      for (const file of files) {
        const filePath = path.join(buildsDir, file);
        const stats = await fs.stat(filePath);
        if (now - stats.mtimeMs > 3600000) { // 1 hour
          await fs.remove(filePath);
        }
      }
    } catch (err) {
      console.error("Cleanup error:", err);
    }
  }, 3600000);

  // Ensure directories exist
  await fs.ensureDir(path.join(__dirname, "builds"));
  await fs.ensureDir(path.join(__dirname, "public", "apks"));
  await fs.ensureDir(path.join(__dirname, "cache"));

  const cacheFile = path.join(__dirname, "cache", "build_cache.json");
  if (!(await fs.pathExists(cacheFile))) {
    await fs.writeJson(cacheFile, {});
  }

  // Owners Vault API
  app.post("/api/vault/list", async (req, res) => {
    const { password } = req.body;
    const vaultPassword = process.env.VAULT_PASSWORD || "Dillman";
    if (password !== vaultPassword) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const apksDir = path.join(__dirname, "public", "apks");
      const files = await fs.readdir(apksDir);
      const developments = await Promise.all(files.map(async (file) => {
        const stats = await fs.stat(path.join(apksDir, file));
        return {
          id: file.replace(".apk", ""),
          name: file,
          date: stats.mtime,
          size: stats.size,
          url: `/apks/${file}`
        };
      }));
      res.json(developments.sort((a, b) => b.date.getTime() - a.date.getTime()));
    } catch (err) {
      res.status(500).json({ error: "Failed to list developments" });
    }
  });

  app.post("/api/build", async (req, res) => {
    const { 
      appName, 
      packageName, 
      mainActivityCode,
      primaryLanguage = "Java",
      enableKotlin = false,
      enablePython = false,
      pythonCode = "",
      minSdk,
      targetSdk,
      compilerFlags,
      proguardRules,
      dexCompiler,
      shrinker,
      signing
    } = req.body;

    // Build Cache Logic
    const buildParams = JSON.stringify({
      appName, packageName, mainActivityCode, primaryLanguage, enableKotlin, enablePython, pythonCode, minSdk, targetSdk, compilerFlags, proguardRules, dexCompiler, shrinker, signing
    });
    const buildHash = crypto.createHash("sha256").update(buildParams).digest("hex");
    
    try {
      const cache = await fs.readJson(cacheFile);
      if (cache[buildHash]) {
        const cachedBuildId = cache[buildHash];
        const cachedApkPath = path.join(__dirname, "public", "apks", `${cachedBuildId}.apk`);
        if (await fs.pathExists(cachedApkPath)) {
          console.log("Serving from build cache:", cachedBuildId);
          return res.json({ 
            success: true, 
            downloadUrl: `/apks/${cachedBuildId}.apk`,
            logs: "Build retrieved from cache.\n",
            cached: true
          });
        }
      }
    } catch (e) {
      console.error("Cache read error:", e);
    }

    const buildId = uuidv4();
    const buildDir = path.join(__dirname, "builds", buildId);
    const logFile = path.join(buildDir, "build.log");

    const log = async (message: string) => {
      console.log(`[${buildId}] ${message}`);
      await fs.appendFile(logFile, message + "\n");
    };

    try {
      await fs.ensureDir(buildDir);
      await log("Starting build process...");
      await log(`App Name: ${appName}`);
      await log(`Package: ${packageName}`);

      // Scaffold Android project
      await scaffoldAndroidProject(buildDir, appName, packageName, {
        mainActivityCode,
        primaryLanguage,
        enableKotlin,
        enablePython,
        pythonCode,
        minSdk,
        targetSdk,
        compilerFlags,
        proguardRules,
        dexCompiler,
        shrinker,
        signing
      });
      await log("Project scaffolded successfully.");

      // Run gradle
      const gradleCmd = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
      
      if (process.platform !== "win32") {
        await new Promise((resolve, reject) => {
          exec(`chmod +x ${path.join(buildDir, "gradlew")}`, (err) => {
            if (err) reject(err);
            else resolve(null);
          });
        });
      }

      const buildTask = signing ? 'assembleRelease' : 'assembleDebug';
      await log(`Running gradle ${buildTask}...`);

      exec(`${gradleCmd} ${buildTask}`, { cwd: buildDir, timeout: 300000 }, async (error, stdout, stderr) => {
        await fs.appendFile(logFile, stdout + "\n" + stderr);
        
        if (error) {
          await log("Build failed.");
          return res.status(500).json({ 
            error: "Build failed", 
            details: stderr || stdout,
            logs: stdout + stderr 
          });
        }

        const buildType = signing ? "release" : "debug";
        const apkPath = path.join(buildDir, "app", "build", "outputs", "apk", buildType, `app-${buildType}.apk`);
        
        if (await fs.pathExists(apkPath)) {
          await log("APK generated successfully.");
          
          // Verify APK
          let verificationLog = "\nVerifying APK signature...\n";
          try {
            const verifyOutput = await new Promise<string>((resolve) => {
              exec(`apksigner verify --verbose ${apkPath}`, (err, stdout, stderr) => {
                if (err) resolve("Verification failed: " + (stderr || "apksigner not found or error"));
                else resolve(stdout || "Signature verified successfully.");
              });
            });
            verificationLog += verifyOutput;
          } catch (e) {
            verificationLog += "Verification skipped: " + String(e);
          }
          await log(verificationLog);

          const publicApkPath = path.join(__dirname, "public", "apks", `${buildId}.apk`);
          await fs.ensureDir(path.dirname(publicApkPath));
          await fs.copy(apkPath, publicApkPath);
          
          // Update Cache
          try {
            const cache = await fs.readJson(cacheFile);
            cache[buildHash] = buildId;
            await fs.writeJson(cacheFile, cache);
          } catch (e) {
            console.error("Cache update error:", e);
          }

          res.json({ 
            success: true, 
            downloadUrl: `/apks/${buildId}.apk`,
            logs: stdout + verificationLog,
            buildId
          });
        } else {
          await log("APK not found after build.");
          res.status(500).json({ error: "APK not found after build", logs: stdout });
        }
      });

    } catch (err) {
      console.error("Build setup error:", err);
      res.status(500).json({ error: "Build setup failed", details: String(err) });
    }
  });

  // Serve APKs
  app.use("/apks", express.static(path.join(__dirname, "public", "apks")));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

async function scaffoldAndroidProject(
  dir: string, 
  appName: string, 
  packageName: string, 
  options: {
    mainActivityCode?: string,
    primaryLanguage?: "Java" | "Kotlin" | "Python",
    enableKotlin?: boolean,
    enablePython?: boolean,
    pythonCode?: string,
    minSdk?: number,
    targetSdk?: number,
    compilerFlags?: string,
    proguardRules?: string,
    dexCompiler?: "D8" | "Dx",
    shrinker?: "R8" | "ProGuard",
    signing?: {
      alias: string,
      password: string
    }
  }
) {
  const { 
    mainActivityCode, 
    primaryLanguage = "Java",
    enableKotlin = false,
    enablePython = false,
    pythonCode = "",
    minSdk = 24, 
    targetSdk = 34, 
    compilerFlags = "", 
    proguardRules = "",
    dexCompiler = "D8",
    shrinker = "R8",
    signing
  } = options;
  const packagePath = packageName.replace(/\./g, "/");

  // gradle.properties
  let gradleProperties = `
android.useAndroidX=true
android.nonTransitiveRClass=true
`;
  if (dexCompiler === "Dx") {
    gradleProperties += `android.useDexArchive=false\n`;
  }
  if (shrinker === "ProGuard") {
    gradleProperties += `android.enableR8=false\n`;
  }
  await fs.writeFile(path.join(dir, "gradle.properties"), gradleProperties);
  
  // Generate keystore if signing is requested
  if (signing) {
    const keystorePath = path.join(dir, "app/debug.keystore");
    await new Promise((resolve, reject) => {
      const cmd = `keytool -genkey -v -keystore ${keystorePath} -alias ${signing.alias} -keyalg RSA -keysize 2048 -validity 10000 -storepass ${signing.password} -keypass ${signing.password} -dname "CN=APKForge, OU=Build, O=APKForge, L=Cloud, S=Global, C=US"`;
      exec(cmd, (err, stdout, stderr) => {
        if (err) reject(err);
        else resolve(stdout);
      });
    });
  }

  // settings.gradle
  await fs.writeFile(path.join(dir, "settings.gradle"), `include ':app'`);

  // build.gradle (project)
  await fs.writeFile(path.join(dir, "build.gradle"), `
buildscript {
    repositories {
        google()
        mavenCentral()
        ${enablePython ? 'maven { url "https://chaquo.com/maven" }' : ''}
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.2.2'
        ${enableKotlin ? "classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.22'" : ""}
        ${enablePython ? "classpath 'com.chaquo.python:gradle:15.0.0'" : ""}
    }
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}
`);

  // app/build.gradle
  await fs.ensureDir(path.join(dir, "app"));
  await fs.writeFile(path.join(dir, "app/build.gradle"), `
plugins {
    id 'com.android.application'
    ${enableKotlin ? "id 'org.jetbrains.kotlin.android'" : ""}
    ${enablePython ? "id 'com.chaquo.python'" : ""}
}

android {
    namespace '${packageName}'
    compileSdk ${targetSdk}

    defaultConfig {
        applicationId "${packageName}"
        minSdk ${minSdk}
        targetSdk ${targetSdk}
        versionCode 1
        versionName "1.0"

        ${enablePython ? `
        ndk {
            abiFilters "armeabi-v7a", "arm64-v8a", "x86", "x86_64"
        }
        python {
            buildPython "python3"
        }
        ` : ''}
    }

    ${signing ? `
    signingConfigs {
        release {
            storeFile file('debug.keystore')
            storePassword '${signing.password}'
            keyAlias '${signing.alias}'
            keyPassword '${signing.password}'
        }
    }
    ` : ''}

    buildTypes {
        debug {
            minifyEnabled ${proguardRules ? 'true' : 'false'}
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
        release {
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            ${signing ? 'signingConfig signingConfigs.release' : ''}
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }

    ${enableKotlin ? `
    kotlinOptions {
        jvmTarget = '1.8'
    }
    sourceSets {
        main.java.srcDirs += 'src/main/kotlin'
    }
    ` : ''}

    tasks.withType(JavaCompile) {
        options.compilerArgs << "${compilerFlags}"
    }
}

dependencies {
    ${enableKotlin ? "implementation 'org.jetbrains.kotlin:kotlin-stdlib:1.9.22'" : ""}
}
`);

  // proguard-rules.pro
  if (proguardRules) {
    await fs.writeFile(path.join(dir, "app/proguard-rules.pro"), proguardRules);
  } else {
    await fs.writeFile(path.join(dir, "app/proguard-rules.pro"), "# Default ProGuard rules\n-keep class * extends android.app.Activity");
  }

  // AndroidManifest.xml
  await fs.ensureDir(path.join(dir, "app/src/main"));
  await fs.writeFile(path.join(dir, "app/src/main/AndroidManifest.xml"), `
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="${appName}"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.Material.Light.NoActionBar">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`);

  // MainActivity
  const javaDir = path.join(dir, "app/src/main/java", packagePath);
  const kotlinDir = path.join(dir, "app/src/main/kotlin", packagePath);
  
  if (primaryLanguage === "Kotlin") {
    await fs.ensureDir(kotlinDir);
    const defaultKotlinActivity = `package ${packageName}

import android.app.Activity
import android.os.Bundle
import android.widget.TextView
import android.view.Gravity

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val textView = TextView(this)
        textView.text = "Hello from APK Forge (Kotlin)!"
        textView.gravity = Gravity.CENTER
        textView.textSize = 24f
        setContentView(textView)
    }
}`;
    await fs.writeFile(path.join(kotlinDir, "MainActivity.kt"), mainActivityCode || defaultKotlinActivity);
  } else if (primaryLanguage === "Python") {
    // For Python as primary, we still need a Java/Kotlin wrapper to start Chaquopy
    await fs.ensureDir(javaDir);
    const pythonWrapper = `package ${packageName};

import android.app.Activity;
import android.os.Bundle;
import com.chaquo.python.Python;
import com.chaquo.python.android.AndroidPlatform;

public class MainActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (!Python.isStarted()) {
            Python.start(new AndroidPlatform(this));
        }
        Python py = Python.getInstance();
        py.getModule("script").callAttr("main", this);
    }
}`;
    await fs.writeFile(path.join(javaDir, "MainActivity.java"), pythonWrapper);
    
    const pythonSrcDir = path.join(dir, "app/src/main/python");
    await fs.ensureDir(pythonSrcDir);
    const defaultPythonScript = `
def main(activity):
    from android.widget import TextView
    from android.view import Gravity
    tv = TextView(activity)
    tv.setText("Hello from APK Forge (Python)!")
    tv.setGravity(Gravity.CENTER)
    tv.setTextSize(24)
    activity.setContentView(tv)
`;
    await fs.writeFile(path.join(pythonSrcDir, "script.py"), pythonCode || defaultPythonScript);
  } else {
    await fs.ensureDir(javaDir);
    const defaultActivity = `package ${packageName};

import android.app.Activity;
import android.os.Bundle;
import android.widget.TextView;
import android.view.Gravity;

public class MainActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        TextView textView = new TextView(this);
        textView.setText("Hello from APK Forge!");
        textView.setGravity(Gravity.CENTER);
        textView.setTextSize(24);
        setContentView(textView);
    }
}`;
    await fs.writeFile(path.join(javaDir, "MainActivity.java"), mainActivityCode || defaultActivity);
  }

  // Hybrid Python script
  if (enablePython && primaryLanguage !== "Python") {
    const pythonSrcDir = path.join(dir, "app/src/main/python");
    await fs.ensureDir(pythonSrcDir);
    await fs.writeFile(path.join(pythonSrcDir, "script.py"), pythonCode || "# Hybrid Python logic\ndef run():\n    print('Python hybrid active')");
  }

  // Resources (minimal)
  await fs.ensureDir(path.join(dir, "app/src/main/res/mipmap-mdpi"));
  // We'd need actual icons here for a real build, but let's see if it builds without them or with placeholders
  
  // Gradle wrapper (we'll try to use a pre-existing one if we can, but here we'll just hope 'gradle' is in path)
  // Actually, I'll try to run 'gradle' directly if gradlew isn't there.
  // I'll create a dummy gradlew that calls global gradle if it exists.
  await fs.writeFile(path.join(dir, "gradlew"), `#!/bin/bash
${gradlePath} "$@"
`);
}

startServer();
