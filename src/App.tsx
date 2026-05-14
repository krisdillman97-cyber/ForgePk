/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Hammer,
  Package,
  Download,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Cpu,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  RotateCcw,
  Clock,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI } from "@google/genai";
import { supabase, type ForgeProject } from "./supabase";

// --- Types ---

type Step = "wizard" | "generating" | "building" | "done";
type Language = "Java" | "Kotlin" | "Python";
type Category =
  | "productivity"
  | "social"
  | "game"
  | "utility"
  | "education"
  | "health"
  | "finance"
  | "creative";

interface WizardData {
  appName: string;
  appIdea: string;
  appCategory: Category;
  primaryFeature: string;
  targetAudience: string;
  colorScheme: string;
  language: Language;
  customNotes: string;
}

const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: "productivity", label: "Productivity", icon: "⚡" },
  { value: "social", label: "Social", icon: "💬" },
  { value: "game", label: "Game", icon: "🎮" },
  { value: "utility", label: "Utility", icon: "🔧" },
  { value: "education", label: "Education", icon: "📚" },
  { value: "health", label: "Health & Fitness", icon: "💪" },
  { value: "finance", label: "Finance", icon: "💰" },
  { value: "creative", label: "Creative", icon: "🎨" },
];

const COLOR_SCHEMES = [
  { value: "modern-dark", label: "Modern Dark", colors: ["#0f0f0f", "#1a1a2e", "#e94560"] },
  { value: "ocean-blue", label: "Ocean Blue", colors: ["#0077b6", "#00b4d8", "#90e0ef"] },
  { value: "forest-green", label: "Forest Green", colors: ["#1b4332", "#2d6a4f", "#74c69d"] },
  { value: "sunset-orange", label: "Sunset Orange", colors: ["#f77f00", "#fcbf49", "#eae2b7"] },
  { value: "minimal-white", label: "Minimal Light", colors: ["#ffffff", "#f8f9fa", "#212529"] },
  { value: "tech-cyan", label: "Tech Cyan", colors: ["#0a0a0a", "#00d9ff", "#1a6b8a"] },
];

const LANGUAGES: Language[] = ["Java", "Kotlin", "Python"];

const WIZARD_STEPS = [
  { id: 0, title: "App Concept", subtitle: "What are we building?" },
  { id: 1, title: "Category & Audience", subtitle: "Who is it for?" },
  { id: 2, title: "Design & Language", subtitle: "How should it look and feel?" },
  { id: 3, title: "Review & Launch", subtitle: "Ready to forge?" },
];

// --- Supabase helpers ---

function getOrCreateSessionId(): string {
  let id = localStorage.getItem("forge_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("forge_session_id", id);
  }
  return id;
}

function toPackageName(appName: string): string {
  const clean = appName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, ".");
  return `com.forgeapp.${clean || "myapp"}`;
}

// --- AI Prompt Builder ---

function buildPrompt(data: WizardData, language: Language): string {
  const colorInfo = COLOR_SCHEMES.find((c) => c.value === data.colorScheme);
  const colorDesc = colorInfo ? colorInfo.label : data.colorScheme;

  if (language === "Kotlin") {
    return `You are an expert Android Kotlin developer.

Write a complete, production-ready Android Kotlin MainActivity for an app with these specs:
- App Name: ${data.appName}
- Package: ${toPackageName(data.appName)}
- Category: ${data.appCategory}
- Core Idea: ${data.appIdea}
- Primary Feature: ${data.primaryFeature}
- Target Audience: ${data.targetAudience}
- Color Scheme: ${colorDesc}
${data.customNotes ? `- Extra Notes: ${data.customNotes}` : ""}

Requirements:
1. Write a COMPLETE, fully functional Kotlin MainActivity class
2. Use Android Views (no Compose - keep it compatible with minSdk 24)
3. Implement the PRIMARY FEATURE in a meaningful, working way - not a placeholder
4. Use RecyclerView, ListView, or ScrollView where showing lists/content
5. Build all layouts programmatically (no XML layout files required)
6. Apply the color scheme through programmatic styling
7. Handle all lifecycle events properly
8. Include all required imports
9. Return ONLY the Kotlin code, no markdown fences

The app must feel like a real, polished app. Implement real logic for ${data.primaryFeature}.`;
  }

  if (language === "Python") {
    return `You are an expert Android Python developer using Chaquopy.

Write a complete Python script.py for an Android app with these specs:
- App Name: ${data.appName}
- Category: ${data.appCategory}
- Core Idea: ${data.appIdea}
- Primary Feature: ${data.primaryFeature}
- Target Audience: ${data.targetAudience}
- Color Scheme: ${colorDesc}
${data.customNotes ? `- Extra Notes: ${data.customNotes}` : ""}

Requirements:
1. The script must have a main(activity) function as entry point
2. Build the UI using Android widgets via Chaquopy (TextView, Button, EditText, LinearLayout)
3. Implement the PRIMARY FEATURE with real, working logic
4. Use ScrollView for lists/content
5. Apply the color scheme in UI elements
6. Return ONLY the Python code, no markdown fences

The app must be functional and polished. Implement real logic for ${data.primaryFeature}.`;
  }

  return `You are an expert Android Java developer.

Write a complete, production-ready Android Java MainActivity for an app with these specs:
- App Name: ${data.appName}
- Package: ${toPackageName(data.appName)}
- Category: ${data.appCategory}
- Core Idea: ${data.appIdea}
- Primary Feature: ${data.primaryFeature}
- Target Audience: ${data.targetAudience}
- Color Scheme: ${colorDesc}
${data.customNotes ? `- Extra Notes: ${data.customNotes}` : ""}

Requirements:
1. Write a COMPLETE, fully functional Java MainActivity class (extends Activity)
2. Use Android Views (no Jetpack Compose - keep it compatible with minSdk 24)
3. Implement the PRIMARY FEATURE in a meaningful, working way - not a placeholder
4. Use RecyclerView, ListView, or ScrollView where appropriate for lists/content
5. Build all layouts programmatically (no XML layout files required)
6. Apply the color scheme through programmatic styling using android.graphics.Color
7. Handle all lifecycle events properly with @Override
8. Include ALL necessary imports (android.app.Activity, android.widget.*, android.view.*, android.graphics.*)
9. Return ONLY the Java code, no markdown fences, no explanation

The app must feel like a real, polished app. Implement real, working logic for: ${data.primaryFeature}.`;
}

// --- Components ---

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`transition-all duration-500 rounded-full ${
            i < current
              ? "w-6 h-2 bg-orange-500"
              : i === current
              ? "w-8 h-2 bg-orange-500 shadow-lg shadow-orange-500/40"
              : "w-2 h-2 bg-white/10"
          }`}
        />
      ))}
    </div>
  );
}

function CategoryGrid({
  selected,
  onSelect,
}: {
  selected: Category;
  onSelect: (c: Category) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          onClick={() => onSelect(cat.value)}
          className={`p-3 rounded-xl border text-left transition-all ${
            selected === cat.value
              ? "border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/10"
              : "border-white/10 bg-white/5 hover:border-white/20"
          }`}
        >
          <div className="text-xl mb-1">{cat.icon}</div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-white/60 leading-tight">
            {cat.label}
          </div>
        </button>
      ))}
    </div>
  );
}

function ColorGrid({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (c: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {COLOR_SCHEMES.map((scheme) => (
        <button
          key={scheme.value}
          onClick={() => onSelect(scheme.value)}
          className={`p-3 rounded-xl border text-left transition-all ${
            selected === scheme.value
              ? "border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/10"
              : "border-white/10 bg-white/5 hover:border-white/20"
          }`}
        >
          <div className="flex gap-1.5 mb-2">
            {scheme.colors.map((c, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full border border-white/20"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-white/60">
            {scheme.label}
          </div>
        </button>
      ))}
    </div>
  );
}

function LanguageSelector({
  selected,
  onSelect,
}: {
  selected: Language;
  onSelect: (l: Language) => void;
}) {
  const info: Record<Language, { desc: string; activeClass: string }> = {
    Java: { desc: "Most compatible, great Android support", activeClass: "border-orange-500 bg-orange-500/10" },
    Kotlin: { desc: "Modern, concise, Google-recommended", activeClass: "border-blue-400 bg-blue-500/10" },
    Python: { desc: "Rapid prototyping via Chaquopy", activeClass: "border-yellow-400 bg-yellow-500/10" },
  };
  const labelColors: Record<Language, string> = {
    Java: "text-orange-400",
    Kotlin: "text-blue-400",
    Python: "text-yellow-400",
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      {LANGUAGES.map((lang) => {
        const { desc, activeClass } = info[lang];
        const isSelected = selected === lang;
        return (
          <button
            key={lang}
            onClick={() => onSelect(lang)}
            className={`p-4 rounded-xl border text-left transition-all ${
              isSelected ? activeClass : "border-white/10 bg-white/5 hover:border-white/20"
            }`}
          >
            <div className={`text-sm font-bold mb-1 ${isSelected ? labelColors[lang] : "text-white"}`}>
              {lang}
            </div>
            <div className="text-[11px] text-white/40 leading-tight">{desc}</div>
          </button>
        );
      })}
    </div>
  );
}

function ReviewRow({
  label,
  value,
  accent,
  mono,
}: {
  label: string;
  value: string;
  accent?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-white/30 shrink-0 min-w-[130px]">{label}</span>
      <span
        className={`text-right ${
          accent
            ? "font-bold text-orange-400"
            : mono
            ? "font-mono text-blue-400 text-xs"
            : "text-white/70"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function getDefaultCode(language: Language, appName: string, packageName: string, category: string): string {
  if (language === "Kotlin") {
    return `package ${packageName}

import android.app.Activity
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#0f0f0f"))
            setPadding(48, 48, 48, 48)
        }
        val title = TextView(this).apply {
            text = "${appName}"
            textSize = 28f
            setTextColor(Color.parseColor("#FF6B35"))
            gravity = Gravity.CENTER
            typeface = Typeface.DEFAULT_BOLD
        }
        val subtitle = TextView(this).apply {
            text = "${category} app\\nReady to use."
            textSize = 16f
            setTextColor(Color.parseColor("#AAAAAA"))
            gravity = Gravity.CENTER
            setPadding(0, 24, 0, 0)
        }
        layout.addView(title)
        layout.addView(subtitle)
        setContentView(layout)
    }
}`;
  }

  if (language === "Python") {
    return `def main(activity):
    from android.widget import LinearLayout, TextView
    from android.view import Gravity
    from android.graphics import Color

    layout = LinearLayout(activity)
    layout.setOrientation(LinearLayout.VERTICAL)
    layout.setGravity(Gravity.CENTER)
    layout.setBackgroundColor(Color.parseColor("#0f0f0f"))
    layout.setPadding(48, 48, 48, 48)

    title = TextView(activity)
    title.setText("${appName}")
    title.setTextSize(28)
    title.setTextColor(Color.parseColor("#FF6B35"))
    title.setGravity(Gravity.CENTER)

    subtitle = TextView(activity)
    subtitle.setText("${category} app\\nReady to use.")
    subtitle.setTextSize(16)
    subtitle.setTextColor(Color.parseColor("#AAAAAA"))
    subtitle.setGravity(Gravity.CENTER)

    layout.addView(title)
    layout.addView(subtitle)
    activity.setContentView(layout)`;
  }

  return `package ${packageName};

import android.app.Activity;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER);
        layout.setBackgroundColor(Color.parseColor("#0f0f0f"));
        layout.setPadding(48, 48, 48, 48);

        TextView title = new TextView(this);
        title.setText("${appName}");
        title.setTextSize(28f);
        title.setTextColor(Color.parseColor("#FF6B35"));
        title.setGravity(Gravity.CENTER);
        title.setTypeface(Typeface.DEFAULT_BOLD);

        TextView subtitle = new TextView(this);
        subtitle.setText("${category} app\\nReady to use.");
        subtitle.setTextSize(16f);
        subtitle.setTextColor(Color.parseColor("#AAAAAA"));
        subtitle.setGravity(Gravity.CENTER);

        layout.addView(title);
        layout.addView(subtitle);
        setContentView(layout);
    }
}`;
}

// --- Main App ---

export default function App() {
  const [step, setStep] = useState<Step>("wizard");
  const [wizardStep, setWizardStep] = useState(0);

  const [wizard, setWizard] = useState<WizardData>({
    appName: "",
    appIdea: "",
    appCategory: "productivity",
    primaryFeature: "",
    targetAudience: "",
    colorScheme: "modern-dark",
    language: "Java",
    customNotes: "",
  });

  const [generationStatus, setGenerationStatus] = useState("");
  const [buildLogs, setBuildLogs] = useState("");
  const [buildStatus, setBuildStatus] = useState<"idle" | "building" | "success" | "error">("idle");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [buildError, setBuildError] = useState("");

  const [recentBuilds, setRecentBuilds] = useState<ForgeProject[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const logsRef = useRef<HTMLDivElement>(null);

  const [showVault, setShowVault] = useState(false);
  const [vaultPassword, setVaultPassword] = useState("");
  const [vaultData, setVaultData] = useState<any[]>([]);
  const [vaultError, setVaultError] = useState("");
  const [isVaultLoading, setIsVaultLoading] = useState(false);
  const [isVaultAuthenticated, setIsVaultAuthenticated] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setSystemStatus)
      .catch(() => {});

    const sessionId = getOrCreateSessionId();
    supabase
      .from("forge_projects")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) setRecentBuilds(data as ForgeProject[]);
      });
  }, []);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [buildLogs]);

  const appendLog = (msg: string) =>
    setBuildLogs((prev) => prev + (prev ? "\n" : "") + msg);

  const updateWizard = (key: keyof WizardData, value: string) =>
    setWizard((prev) => ({ ...prev, [key]: value }));

  const canProceed = (): boolean => {
    if (wizardStep === 0)
      return wizard.appName.trim().length > 0 && wizard.appIdea.trim().length > 0;
    if (wizardStep === 1)
      return wizard.primaryFeature.trim().length > 0 && wizard.targetAudience.trim().length > 0;
    return true;
  };

  const navigate = (dir: 1 | -1) => {
    setWizardStep((s) => s + dir);
  };

  async function handleLaunch() {
    const sessionId = getOrCreateSessionId();
    const packageName = toPackageName(wizard.appName);

    setStep("generating");
    setGenerationStatus("Creating project record...");

    const { data: project } = await supabase
      .from("forge_projects")
      .insert({
        session_id: sessionId,
        app_name: wizard.appName,
        app_idea: wizard.appIdea,
        app_category: wizard.appCategory,
        primary_feature: wizard.primaryFeature,
        target_audience: wizard.targetAudience,
        color_scheme: wizard.colorScheme,
        custom_notes: wizard.customNotes || null,
        package_name: packageName,
        primary_language: wizard.language,
        build_status: "generating",
      })
      .select()
      .maybeSingle();

    setGenerationStatus("Analyzing app requirements...");
    await delay(600);
    setGenerationStatus("Designing architecture and writing source code with AI...");

    let code = "";
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY not set");

      const genAI = new GoogleGenAI({ apiKey });
      const prompt = buildPrompt(wizard, wizard.language);

      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash-preview-05-20",
        contents: prompt,
        config: {
          systemInstruction:
            "You are an expert Android developer. Write only production-quality code that implements the requested features. Never use placeholder comments. Always include full, working logic.",
        },
      });

      code = (response.text || "").trim();
      code = code.replace(/^```[\w]*\n?/m, "").replace(/```\s*$/m, "").trim();
    } catch (err) {
      console.error("AI generation error:", err);
      code = getDefaultCode(wizard.language, wizard.appName, packageName, wizard.appCategory);
    }

    setGenerationStatus("Source code ready. Initializing build pipeline...");

    if (project?.id) {
      await supabase
        .from("forge_projects")
        .update({
          generated_code: code,
          build_status: "building",
          updated_at: new Date().toISOString(),
        })
        .eq("id", project.id);
    }

    await delay(400);
    setStep("building");
    setBuildStatus("building");
    appendLog("=== APK Forge Build Started ===");
    appendLog(`App: ${wizard.appName}`);
    appendLog(`Package: ${packageName}`);
    appendLog(`Language: ${wizard.language}`);
    appendLog(`Category: ${wizard.appCategory}`);
    appendLog("Scaffolding Android project...");

    try {
      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName: wizard.appName,
          packageName,
          mainActivityCode: wizard.language !== "Python" ? code : undefined,
          primaryLanguage: wizard.language,
          enableKotlin: wizard.language === "Kotlin",
          enablePython: wizard.language === "Python",
          pythonCode: wizard.language === "Python" ? code : undefined,
          minSdk: 24,
          targetSdk: 34,
          compilerFlags: "-Xlint:deprecation",
          proguardRules: "-keep class * extends android.app.Activity",
          dexCompiler: "D8",
          shrinker: "R8",
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setBuildStatus("success");
        setDownloadUrl(data.downloadUrl);
        if (data.logs) appendLog(data.logs);
        if (data.cached) appendLog("[CACHE HIT] Served from build cache.");
        appendLog("=== Build Successful ===");

        if (project?.id) {
          await supabase
            .from("forge_projects")
            .update({
              build_status: "success",
              download_url: data.downloadUrl,
              build_id: data.buildId || null,
              cached: data.cached || false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", project.id);
        }

        const { data: history } = await supabase
          .from("forge_projects")
          .select("*")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false })
          .limit(5);
        if (history) setRecentBuilds(history as ForgeProject[]);
      } else {
        setBuildStatus("error");
        setBuildError(data.error || "Build failed");
        if (data.details) appendLog(data.details);
        if (data.logs) appendLog(data.logs);
        appendLog("=== Build Failed ===");

        if (project?.id) {
          await supabase
            .from("forge_projects")
            .update({ build_status: "error", updated_at: new Date().toISOString() })
            .eq("id", project.id);
        }
      }
    } catch (err) {
      setBuildStatus("error");
      setBuildError("Network error or server unavailable");
      appendLog("Error: " + String(err));
    }

    setStep("done");
  }

  function handleReset() {
    setStep("wizard");
    setWizardStep(0);
    setWizard({
      appName: "",
      appIdea: "",
      appCategory: "productivity",
      primaryFeature: "",
      targetAudience: "",
      colorScheme: "modern-dark",
      language: "Java",
      customNotes: "",
    });
    setGenerationStatus("");
    setBuildLogs("");
    setBuildStatus("idle");
    setDownloadUrl("");
    setBuildError("");
  }

  const handleVaultAccess = async () => {
    setIsVaultLoading(true);
    setVaultError("");
    try {
      const response = await fetch("/api/vault/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: vaultPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        setVaultData(data);
        setIsVaultAuthenticated(true);
      } else {
        setVaultError(data.error || "Access Denied");
      }
    } catch {
      setVaultError("Connection error");
    } finally {
      setIsVaultLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white font-sans selection:bg-orange-500/30 overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-5%] w-[50%] h-[50%] bg-orange-500/6 blur-[140px] rounded-full" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[40%] h-[50%] bg-blue-500/6 blur-[140px] rounded-full" />
        <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] bg-orange-400/4 blur-[100px] rounded-full" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/8 bg-black/40 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight leading-none">APK Forge</h1>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">
                AI-Powered Android Builder
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-[11px] font-bold uppercase tracking-widest text-white/50"
            >
              <Clock className="w-3.5 h-3.5" />
              History
              {recentBuilds.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full text-[9px] flex items-center justify-center text-white font-bold">
                  {recentBuilds.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowVault(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-[11px] font-bold uppercase tracking-widest text-white/50"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Vault
            </button>
            <div className="flex items-center gap-1.5 text-[11px] text-white/30">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  systemStatus?.status === "ok" ? "bg-green-500 animate-pulse" : "bg-yellow-500"
                }`}
              />
              {systemStatus?.status === "ok" ? "Compiler Ready" : "Initializing..."}
            </div>
          </div>
        </div>
      </header>

      {/* History dropdown */}
      <AnimatePresence>
        {showHistory && recentBuilds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed top-16 right-6 z-40 w-80 bg-[#111] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-4 border-b border-white/8 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-white/40">
                Recent Builds
              </span>
              <button
                onClick={() => setShowHistory(false)}
                className="text-white/30 hover:text-white/60 transition-colors"
              >
                &times;
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {recentBuilds.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 hover:bg-white/5 border-b border-white/5 last:border-0"
                >
                  <div>
                    <div className="text-sm font-medium">{b.app_name}</div>
                    <div className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">
                      {b.primary_language} · {b.app_category} ·{" "}
                      <span
                        className={
                          b.build_status === "success"
                            ? "text-green-400"
                            : b.build_status === "error"
                            ? "text-red-400"
                            : "text-yellow-400"
                        }
                      >
                        {b.build_status}
                      </span>
                    </div>
                  </div>
                  {b.download_url && b.build_status === "success" && (
                    <a
                      href={b.download_url}
                      download
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5 text-white/50" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="relative z-10 max-w-3xl mx-auto px-6 py-16">
        <AnimatePresence mode="wait">
          {/* ---- WIZARD ---- */}
          {step === "wizard" && (
            <motion.div
              key="wizard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Hero */}
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/8 text-orange-400 text-xs font-bold uppercase tracking-widest mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI-Powered App Builder
                </div>
                <h2 className="text-4xl font-bold tracking-tight leading-tight">
                  Answer a few questions,
                  <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
                    get a working app.
                  </span>
                </h2>
                <p className="text-white/40 text-base max-w-md mx-auto leading-relaxed">
                  Describe your idea, pick your preferences, and APK Forge will generate and
                  compile a production-ready Android app ready to install.
                </p>
              </div>

              {/* Step indicator */}
              <div className="flex items-center justify-between">
                <ProgressBar current={wizardStep} total={WIZARD_STEPS.length} />
                <span className="text-xs text-white/30 font-medium">
                  Step {wizardStep + 1} of {WIZARD_STEPS.length}
                </span>
              </div>

              {/* Step title */}
              <div>
                <h3 className="text-xl font-bold">{WIZARD_STEPS[wizardStep].title}</h3>
                <p className="text-white/40 text-sm mt-0.5">{WIZARD_STEPS[wizardStep].subtitle}</p>
              </div>

              {/* Step content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={wizardStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  {wizardStep === 0 && (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/40">
                          App Name <span className="text-orange-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={wizard.appName}
                          onChange={(e) => updateWizard("appName", e.target.value)}
                          placeholder="e.g. TaskFlow, NutriTrack, QuizBlast..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-orange-500/60 focus:bg-white/6 transition-all placeholder:text-white/20"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/40">
                          What does your app do? <span className="text-orange-500">*</span>
                        </label>
                        <textarea
                          value={wizard.appIdea}
                          onChange={(e) => updateWizard("appIdea", e.target.value)}
                          placeholder="e.g. A habit tracker that helps users build daily routines, track streaks, and get reminders for their goals..."
                          rows={4}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-orange-500/60 transition-all resize-none placeholder:text-white/20"
                        />
                        <p className="text-[11px] text-white/20">
                          Be specific — the AI uses this to generate your app's real features and logic.
                        </p>
                      </div>
                    </>
                  )}

                  {wizardStep === 1 && (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/40">
                          App Category
                        </label>
                        <CategoryGrid
                          selected={wizard.appCategory}
                          onSelect={(c) => updateWizard("appCategory", c)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/40">
                          Primary Feature <span className="text-orange-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={wizard.primaryFeature}
                          onChange={(e) => updateWizard("primaryFeature", e.target.value)}
                          placeholder="e.g. Habit streak tracker with daily check-ins and reminders"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-orange-500/60 transition-all placeholder:text-white/20"
                        />
                        <p className="text-[11px] text-white/20">
                          This will be fully implemented — not just a placeholder.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/40">
                          Target Audience <span className="text-orange-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={wizard.targetAudience}
                          onChange={(e) => updateWizard("targetAudience", e.target.value)}
                          placeholder="e.g. Students, fitness enthusiasts, small business owners..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-orange-500/60 transition-all placeholder:text-white/20"
                        />
                      </div>
                    </>
                  )}

                  {wizardStep === 2 && (
                    <>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/40">
                          Color Scheme
                        </label>
                        <ColorGrid
                          selected={wizard.colorScheme}
                          onSelect={(c) => updateWizard("colorScheme", c)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/40">
                          Programming Language
                        </label>
                        <LanguageSelector
                          selected={wizard.language}
                          onSelect={(l) => updateWizard("language", l)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-white/40">
                          Additional Notes
                          <span className="ml-2 normal-case text-white/20 font-normal">optional</span>
                        </label>
                        <textarea
                          value={wizard.customNotes}
                          onChange={(e) => updateWizard("customNotes", e.target.value)}
                          placeholder="Any specific features, APIs, or behaviors? e.g. 'Include a settings screen', 'Use SharedPreferences for persistence', 'Add a dark mode toggle'..."
                          rows={3}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-orange-500/60 transition-all resize-none placeholder:text-white/20"
                        />
                      </div>
                    </>
                  )}

                  {wizardStep === 3 && (
                    <div className="space-y-5">
                      <div className="bg-white/5 border border-white/8 rounded-2xl p-6 space-y-4">
                        <div className="flex items-center gap-2 text-white/40 text-xs font-bold uppercase tracking-widest border-b border-white/8 pb-4">
                          <Package className="w-4 h-4" />
                          Build Summary
                        </div>
                        <ReviewRow label="App Name" value={wizard.appName} accent />
                        <ReviewRow label="Package" value={toPackageName(wizard.appName)} mono />
                        <ReviewRow label="Idea" value={wizard.appIdea} />
                        <ReviewRow
                          label="Category"
                          value={
                            CATEGORIES.find((c) => c.value === wizard.appCategory)?.label ||
                            wizard.appCategory
                          }
                        />
                        <ReviewRow label="Primary Feature" value={wizard.primaryFeature} />
                        <ReviewRow label="Target Audience" value={wizard.targetAudience} />
                        <ReviewRow
                          label="Color Scheme"
                          value={
                            COLOR_SCHEMES.find((c) => c.value === wizard.colorScheme)?.label ||
                            wizard.colorScheme
                          }
                        />
                        <ReviewRow label="Language" value={wizard.language} />
                        {wizard.customNotes && (
                          <ReviewRow label="Notes" value={wizard.customNotes} />
                        )}
                      </div>

                      <div className="bg-orange-500/8 border border-orange-500/20 rounded-xl p-4 text-sm text-orange-300/70 leading-relaxed">
                        APK Forge will use Gemini AI to write your app's source code, then compile it
                        with Gradle into a signed, installable APK. This typically takes 1–3 minutes.
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => navigate(-1)}
                  disabled={wizardStep === 0}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                {wizardStep < WIZARD_STEPS.length - 1 ? (
                  <button
                    onClick={() => navigate(1)}
                    disabled={!canProceed()}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold transition-all hover:shadow-lg hover:shadow-orange-500/25 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                  >
                    Continue
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleLaunch}
                    className="flex items-center gap-3 px-8 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold text-base transition-all hover:shadow-xl hover:shadow-orange-500/30 active:scale-95"
                  >
                    <Hammer className="w-5 h-5" />
                    Generate &amp; Build APK
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* ---- GENERATING ---- */}
          {step === "generating" && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8"
            >
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-2 border-orange-500/20 border-t-orange-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-orange-500 animate-pulse" />
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-bold">AI is writing your app</h3>
                <p className="text-white/50 text-sm max-w-sm mx-auto leading-relaxed">
                  {generationStatus}
                </p>
              </div>
              <div className="flex flex-col items-center gap-2 text-xs text-white/20">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  Analyzing your app requirements
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500/50" />
                  Writing production-quality source code
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                  Compiling into installable APK
                </div>
              </div>
            </motion.div>
          )}

          {/* ---- BUILDING ---- */}
          {step === "building" && (
            <motion.div
              key="building"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold">Compiling your app</h3>
                <p className="text-white/40 text-sm">
                  Gradle is building the APK. This takes 1–3 minutes.
                </p>
              </div>

              <div className="bg-black/60 border border-white/8 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2 bg-white/3">
                  <Terminal className="w-4 h-4 text-white/30" />
                  <span className="text-xs font-bold uppercase tracking-widest text-white/30">
                    Build Output
                  </span>
                  <div className="ml-auto flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
                  </div>
                </div>
                <div
                  ref={logsRef}
                  className="h-72 overflow-y-auto p-4 font-mono text-xs space-y-1 text-white/60"
                >
                  {buildLogs.split("\n").map((line, i) => (
                    <div
                      key={i}
                      className={
                        line.includes("Error") || line.includes("FAILED") ? "text-red-400" : ""
                      }
                    >
                      {line || "\u00A0"}
                    </div>
                  ))}
                  {buildStatus === "building" && (
                    <div className="flex items-center gap-2 text-orange-400 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Building...
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ---- DONE ---- */}
          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {buildStatus === "success" ? (
                <>
                  <div className="text-center space-y-3">
                    <div className="w-20 h-20 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-10 h-10 text-green-400" />
                    </div>
                    <h3 className="text-3xl font-bold">
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500">
                        {wizard.appName}
                      </span>{" "}
                      is ready!
                    </h3>
                    <p className="text-white/40 text-sm">
                      Your production-ready APK has been compiled and signed. Install it directly on
                      any Android device (minSdk 24+).
                    </p>
                  </div>

                  <div className="bg-white/5 border border-white/8 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                        <Smartphone className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold">{wizard.appName}.apk</h4>
                        <p className="text-xs text-white/30 mt-0.5">
                          {wizard.language} ·{" "}
                          {CATEGORIES.find((c) => c.value === wizard.appCategory)?.label} · Min SDK 24
                        </p>
                      </div>
                    </div>

                    <a
                      href={downloadUrl}
                      download={`${wizard.appName.replace(/\s+/g, "_")}.apk`}
                      className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 font-bold text-white hover:shadow-xl hover:shadow-orange-500/30 transition-all active:scale-95"
                    >
                      <Download className="w-5 h-5" />
                      Download APK
                    </a>

                    <div className="bg-black/30 rounded-xl p-4 text-xs text-white/30 space-y-1 font-mono">
                      <div>Package: {toPackageName(wizard.appName)}</div>
                      <div>Language: {wizard.language}</div>
                      <div>Target SDK: 34 · Min SDK: 24</div>
                      <div>Compiler: D8 · Optimizer: R8</div>
                    </div>
                  </div>

                  <details className="group">
                    <summary className="flex items-center gap-2 cursor-pointer text-xs font-bold uppercase tracking-widest text-white/30 hover:text-white/50 transition-colors list-none">
                      <Terminal className="w-3.5 h-3.5" />
                      Build Logs
                      <ChevronDown className="w-3.5 h-3.5 ml-1 group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="mt-3 bg-black/40 rounded-xl p-4 font-mono text-xs text-white/40 max-h-60 overflow-y-auto space-y-0.5">
                      {buildLogs.split("\n").map((line, i) => (
                        <div key={i}>{line || "\u00A0"}</div>
                      ))}
                    </div>
                  </details>
                </>
              ) : (
                <>
                  <div className="text-center space-y-3">
                    <div className="w-20 h-20 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto">
                      <AlertCircle className="w-10 h-10 text-red-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-red-400">Build Failed</h3>
                    <p className="text-white/40 text-sm max-w-sm mx-auto">{buildError}</p>
                  </div>

                  <div className="bg-black/40 rounded-xl p-4 font-mono text-xs text-white/40 max-h-60 overflow-y-auto">
                    {buildLogs.split("\n").map((line, i) => (
                      <div
                        key={i}
                        className={
                          line.toLowerCase().includes("error") ? "text-red-400" : ""
                        }
                      >
                        {line || "\u00A0"}
                      </div>
                    ))}
                  </div>
                </>
              )}

              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-white/50 hover:bg-white/5 hover:text-white/80 transition-all text-sm font-medium"
              >
                <RotateCcw className="w-4 h-4" />
                Build Another App
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/6 py-10 mt-8 bg-black/30">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between text-xs text-white/20">
            <div className="flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5" />
              <span className="font-bold uppercase tracking-widest">APK Forge</span>
              <span>·</span>
              <span>Powered by Gemini AI + Gradle 8.x</span>
            </div>
            <span>Java · Kotlin · Python · minSdk 24</span>
          </div>
        </div>
      </footer>

      {/* Owners Vault Modal */}
      <AnimatePresence>
        {showVault && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 16 }}
              className="bg-[#0f0f0f] border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-white/8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-orange-500" />
                  <h2 className="font-bold">Owners Vault</h2>
                </div>
                <button
                  onClick={() => {
                    setShowVault(false);
                    setIsVaultAuthenticated(false);
                    setVaultPassword("");
                    setVaultError("");
                  }}
                  className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors text-white/50"
                >
                  &times;
                </button>
              </div>
              <div className="p-6">
                {!isVaultAuthenticated ? (
                  <div className="space-y-4 max-w-xs mx-auto text-center">
                    <p className="text-sm text-white/40">
                      Enter owner password to view all builds.
                    </p>
                    <input
                      type="password"
                      value={vaultPassword}
                      onChange={(e) => setVaultPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleVaultAccess()}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center focus:outline-none focus:border-orange-500/50 transition-colors"
                      placeholder="Password"
                      autoFocus
                    />
                    {vaultError && <p className="text-xs text-red-400">{vaultError}</p>}
                    <button
                      onClick={handleVaultAccess}
                      disabled={isVaultLoading}
                      className="w-full py-3 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold transition-colors disabled:opacity-50"
                    >
                      {isVaultLoading ? "Verifying..." : "Access Vault"}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-white/30 font-bold uppercase tracking-widest pb-2 border-b border-white/8">
                      <span>All Builds</span>
                      <span>{vaultData.length} found</span>
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {vaultData.length > 0 ? (
                        vaultData.map((dev) => (
                          <div
                            key={dev.id}
                            className="group flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/8 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <Package className="w-4 h-4 text-blue-400" />
                              </div>
                              <div>
                                <div className="text-sm font-medium">{dev.name}</div>
                                <div className="text-[10px] text-white/30 uppercase tracking-wider">
                                  {new Date(dev.date).toLocaleDateString()} ·{" "}
                                  {(dev.size / 1024 / 1024).toFixed(2)} MB
                                </div>
                              </div>
                            </div>
                            <a
                              href={dev.url}
                              download
                              className="p-2 rounded-lg bg-white/5 hover:bg-white text-white hover:text-black transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 text-white/20 text-sm">
                          No builds in vault.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
