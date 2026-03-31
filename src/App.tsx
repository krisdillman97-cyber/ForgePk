/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Hammer, 
  Package, 
  Download, 
  Terminal, 
  Settings, 
  Code, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Cpu,
  Smartphone,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI } from "@google/genai";

export default function App() {
  const [appName, setAppName] = useState("My Awesome App");
  const [packageName, setPackageName] = useState("com.example.awesomeapp");
  const [mainActivityCode, setMainActivityCode] = useState("");
  const [minSdk, setMinSdk] = useState(24);
  const [targetSdk, setTargetSdk] = useState(34);
  const [compilerFlags, setCompilerFlags] = useState("-Xlint:deprecation");
  const [proguardRules, setProguardRules] = useState("-keep class * extends android.app.Activity");
  const [useCustomSigning, setUseCustomSigning] = useState(false);
  const [keystoreAlias, setKeystoreAlias] = useState("my-key-alias");
  const [keystorePassword, setKeystorePassword] = useState("password123");
  const [dexCompiler, setDexCompiler] = useState<"D8" | "Dx">("D8");
  const [shrinker, setShrinker] = useState<"R8" | "ProGuard">("R8");
  const [primaryLanguage, setPrimaryLanguage] = useState<"Java" | "Kotlin" | "Python">("Java");
  const [enableKotlin, setEnableKotlin] = useState(false);
  const [enablePython, setEnablePython] = useState(false);
  const [pythonCode, setPythonCode] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Vault State
  const [showVault, setShowVault] = useState(false);
  const [vaultPassword, setVaultPassword] = useState("");
  const [vaultData, setVaultData] = useState<any[]>([]);
  const [vaultError, setVaultError] = useState("");
  const [isVaultLoading, setIsVaultLoading] = useState(false);
  const [isVaultAuthenticated, setIsVaultAuthenticated] = useState(false);

  const [isBuilding, setIsBuilding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [buildStatus, setBuildStatus] = useState<"idle" | "building" | "success" | "error">("idle");
  const [buildLogs, setBuildLogs] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [error, setError] = useState("");
  const [systemStatus, setSystemStatus] = useState<any>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch("/api/health");
        const data = await response.json();
        setSystemStatus(data);
      } catch (err) {
        console.error("Health check failed:", err);
      }
    };
    checkHealth();
  }, []);

  const handleGenerateAI = async () => {
    if (!process.env.GEMINI_API_KEY) {
      setError("Gemini API Key is missing. Please set it in the environment.");
      return;
    }

    setIsGenerating(true);
    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Write a complete, production-ready Android ${primaryLanguage} MainActivity class for an app named "${appName}". 
        The package name is "${packageName}". 
        The app should be modern and functional. 
        Only return the code, no markdown blocks.`,
        config: {
          systemInstruction: "You are an expert Android developer. You write clean, optimized, and modern code."
        }
      });
      const response = await model;
      const text = response.text;
      if (text) {
        setMainActivityCode(text.trim());
      }
    } catch (err) {
      console.error("AI Generation failed:", err);
      setError("AI Generation failed: " + String(err));
    } finally {
      setIsGenerating(false);
    }
  };
  const handleBuild = async () => {
    setIsBuilding(true);
    setBuildStatus("building");
    setBuildLogs("Starting build process...\nScaffolding project...\n");
    setError("");
    setDownloadUrl("");

    try {
      const response = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName,
          packageName,
          mainActivityCode: mainActivityCode || undefined,
          primaryLanguage,
          enableKotlin: primaryLanguage === "Kotlin" || enableKotlin,
          enablePython: primaryLanguage === "Python" || enablePython,
          pythonCode: (primaryLanguage === "Python" || enablePython) ? pythonCode : undefined,
          minSdk,
          targetSdk,
          compilerFlags,
          proguardRules,
          dexCompiler,
          shrinker,
          signing: useCustomSigning ? {
            alias: keystoreAlias,
            password: keystorePassword
          } : undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        setBuildStatus("success");
        setDownloadUrl(data.downloadUrl);
        setBuildLogs(prev => prev + data.logs + (data.cached ? "\n[CACHE HIT] Build retrieved from cache." : "\nBuild successful!"));
      } else {
        setBuildStatus("error");
        setError(data.error || "Build failed");
        setBuildLogs(prev => prev + (data.details || "") + "\n" + (data.logs || "") + "\nBuild failed.");
      }
    } catch (err) {
      setBuildStatus("error");
      setError("Network error or server unavailable");
      setBuildLogs(prev => prev + "\nError: " + String(err));
    } finally {
      setIsBuilding(false);
    }
  };

  const handleVaultAccess = async () => {
    setIsVaultLoading(true);
    setVaultError("");
    try {
      const response = await fetch("/api/vault/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: vaultPassword })
      });
      const data = await response.json();
      if (response.ok) {
        setVaultData(data);
        setIsVaultAuthenticated(true);
      } else {
        setVaultError(data.error || "Access Denied");
      }
    } catch (err) {
      setVaultError("Connection error");
    } finally {
      setIsVaultLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-orange-500/30">
      {/* Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <header className="relative z-10 border-b border-white/10 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">APK Forge</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/50">
            <button 
              onClick={() => setShowVault(true)}
              className="px-4 py-1.5 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-xs font-bold uppercase tracking-widest"
            >
              Owners Vault
            </button>
            <span className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full animate-pulse ${systemStatus?.status === 'ok' ? 'bg-green-500' : 'bg-yellow-500'}`} />
              {systemStatus?.status === 'ok' ? 'Compiler Ready' : 'System Initializing...'}
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Configuration */}
        <div className="lg:col-span-5 space-y-8">
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-orange-500">
                <Settings className="w-5 h-5" />
                <h2 className="text-lg font-semibold uppercase tracking-wider text-sm">Project Settings</h2>
              </div>
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs font-bold uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors"
              >
                {showAdvanced ? "Hide Advanced" : "Show Advanced"}
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/40 uppercase tracking-widest">App Name</label>
                <input 
                  type="text" 
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500/50 transition-colors"
                  placeholder="My Awesome App"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-white/40 uppercase tracking-widest">Package Name</label>
                <input 
                  type="text" 
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500/50 transition-colors"
                  placeholder="com.example.app"
                />
              </div>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-4 overflow-hidden pt-4 border-t border-white/5"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-white/40 uppercase tracking-widest">Min SDK</label>
                        <input 
                          type="number" 
                          value={minSdk}
                          onChange={(e) => setMinSdk(parseInt(e.target.value))}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500/50 transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-white/40 uppercase tracking-widest">Target SDK</label>
                        <input 
                          type="number" 
                          value={targetSdk}
                          onChange={(e) => setTargetSdk(parseInt(e.target.value))}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500/50 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-white/40 uppercase tracking-widest">Compiler Flags</label>
                      <input 
                        type="text" 
                        value={compilerFlags}
                        onChange={(e) => setCompilerFlags(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500/50 transition-colors"
                        placeholder="-Xlint:deprecation"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-white/40 uppercase tracking-widest">ProGuard / R8 Rules</label>
                      <textarea 
                        value={proguardRules}
                        onChange={(e) => setProguardRules(e.target.value)}
                        className="w-full h-24 bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500/50 transition-colors resize-none font-mono text-xs"
                        placeholder="-keep class * extends android.app.Activity"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-white/40 uppercase tracking-widest">Dex Compiler</label>
                        <select 
                          value={dexCompiler}
                          onChange={(e) => setDexCompiler(e.target.value as any)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500/50 transition-colors text-sm"
                        >
                          <option value="D8" className="bg-[#111]">D8 (Modern)</option>
                          <option value="Dx" className="bg-[#111]">Dx (Legacy)</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-medium text-white/40 uppercase tracking-widest">Optimizer / Shrinker</label>
                        <select 
                          value={shrinker}
                          onChange={(e) => setShrinker(e.target.value as any)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500/50 transition-colors text-sm"
                        >
                          <option value="R8" className="bg-[#111]">R8 (Default)</option>
                          <option value="ProGuard" className="bg-[#111]">ProGuard</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-white/60">
                          <ShieldCheck className="w-4 h-4" />
                          <span className="text-xs font-bold uppercase tracking-widest">Signing Configuration</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={useCustomSigning}
                            onChange={(e) => setUseCustomSigning(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                          <span className="ml-3 text-xs font-medium text-white/40">Custom Signer</span>
                        </label>
                      </div>

                      {useCustomSigning && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-white/40 uppercase tracking-widest">Key Alias</label>
                            <input 
                              type="text" 
                              value={keystoreAlias}
                              onChange={(e) => setKeystoreAlias(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500/50 transition-colors"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-white/40 uppercase tracking-widest">Key Password</label>
                            <input 
                              type="password" 
                              value={keystorePassword}
                              onChange={(e) => setKeystorePassword(e.target.value)}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500/50 transition-colors"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-400">
                <Code className="w-5 h-5" />
                <h2 className="text-lg font-semibold uppercase tracking-wider text-sm">Source Code</h2>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateAI}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 transition-all disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  AI Generate
                </button>
                {(["Java", "Kotlin", "Python"] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setPrimaryLanguage(lang)}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${
                      primaryLanguage === lang 
                        ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" 
                        : "bg-white/5 text-white/40 hover:bg-white/10"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <div className="absolute top-3 left-4 z-10 flex items-center gap-2 pointer-events-none">
                  <div className={`w-1.5 h-1.5 rounded-full ${primaryLanguage === 'Java' ? 'bg-orange-400' : primaryLanguage === 'Kotlin' ? 'bg-purple-400' : 'bg-blue-400'}`} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Main Activity ({primaryLanguage})</span>
                </div>
                <textarea 
                  value={mainActivityCode}
                  onChange={(e) => setMainActivityCode(e.target.value)}
                  className="w-full h-64 bg-black/40 border border-white/10 rounded-xl p-4 pt-10 font-mono text-sm focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
                  placeholder={`// Custom ${primaryLanguage === 'Java' ? 'MainActivity.java' : primaryLanguage === 'Kotlin' ? 'MainActivity.kt' : 'Python Entry'} code...`}
                />
              </div>

              {(primaryLanguage === "Python" || enablePython) && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-white/40">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">script.py</span>
                  </div>
                  <textarea 
                    value={pythonCode}
                    onChange={(e) => setPythonCode(e.target.value)}
                    className="w-full h-48 bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-sm focus:outline-none focus:border-yellow-500/50 transition-colors resize-none"
                    placeholder="# Python logic goes here..."
                  />
                </div>
              )}

              <div className="flex flex-wrap gap-4 pt-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={enableKotlin} 
                    onChange={(e) => setEnableKotlin(e.target.checked)}
                    disabled={primaryLanguage === "Kotlin"}
                    className="sr-only peer"
                  />
                  <div className="w-4 h-4 border border-white/20 rounded peer-checked:bg-purple-500 peer-checked:border-purple-500 transition-all flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-sm scale-0 peer-checked:scale-100 transition-transform" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white/60 transition-colors">Hybrid Kotlin</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={enablePython} 
                    onChange={(e) => setEnablePython(e.target.checked)}
                    disabled={primaryLanguage === "Python"}
                    className="sr-only peer"
                  />
                  <div className="w-4 h-4 border border-white/20 rounded peer-checked:bg-yellow-500 peer-checked:border-yellow-500 transition-all flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-sm scale-0 peer-checked:scale-100 transition-transform" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-white/60 transition-colors">Hybrid Python</span>
                </label>
              </div>
            </div>
          </section>

          <button 
            onClick={handleBuild}
            disabled={isBuilding}
            className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-lg transition-all active:scale-95 ${
              isBuilding 
                ? "bg-white/10 text-white/40 cursor-not-allowed" 
                : "bg-gradient-to-r from-orange-500 to-red-600 hover:shadow-xl hover:shadow-orange-500/30 text-white"
            }`}
          >
            {isBuilding ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Forging APK...
              </>
            ) : (
              <>
                <Hammer className="w-6 h-6" />
                Build APK
              </>
            )}
          </button>
        </div>

        {/* Right Column: Status & Logs */}
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col h-full min-h-[600px]">
            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-white/40" />
                <span className="text-xs font-medium uppercase tracking-widest text-white/40">Build Logs</span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
              </div>
            </div>
            
            <div className="flex-1 p-6 font-mono text-xs overflow-y-auto bg-black/20 space-y-2">
              {buildLogs ? (
                buildLogs.split('\n').map((line, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-white/20 select-none w-4 text-right">{i + 1}</span>
                    <span className={line.includes('Error') ? 'text-red-400' : 'text-white/70'}>{line}</span>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-white/20 space-y-4">
                  <Package className="w-12 h-12 stroke-[1]" />
                  <p className="text-sm">Waiting for build initialization...</p>
                </div>
              )}
            </div>

            <AnimatePresence>
              {buildStatus !== "idle" && (
                <motion.div 
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  className="p-6 bg-white/5 border-t border-white/10"
                >
                  {buildStatus === "building" && (
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full border-2 border-orange-500/20 border-t-orange-500 animate-spin" />
                      <div>
                        <h3 className="font-semibold">Compiling Resources</h3>
                        <p className="text-sm text-white/40">This may take a minute or two...</p>
                      </div>
                    </div>
                  )}

                  {buildStatus === "success" && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-green-400">Build Complete</h3>
                          <p className="text-sm text-white/40">APK is ready for download</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => {
                            setBuildLogs(prev => prev + "\n[MANUAL VERIFY] Re-running signature check...\n" + "Signature verified successfully (Mock).");
                          }}
                          className="px-4 py-3 rounded-xl border border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-white/5 transition-colors"
                        >
                          Verify APK
                        </button>
                        <a 
                          href={downloadUrl} 
                          download={`${appName.replace(/\s+/g, '_')}.apk`}
                          className="bg-white text-black px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-white/90 transition-colors"
                        >
                          <Download className="w-5 h-5" />
                          Download APK
                        </a>
                      </div>
                    </div>
                  )}

                  {buildStatus === "error" && (
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-red-400">Build Failed</h3>
                        <p className="text-sm text-white/40">{error}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/10 py-12 mt-12 bg-black/50">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white/60">
              <Smartphone className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Compiler</span>
            </div>
            <p className="text-sm text-white/40 leading-relaxed">
              Utilizing Gradle 8.x, D8/Dx dexers, and R8/ProGuard optimizers for high-performance APK compilation. Supports Java, Kotlin, and Python (Chaquopy).
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white/60">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Signer</span>
            </div>
            <p className="text-sm text-white/40 leading-relaxed">
              Automatic debug signing enabled. Release signing with custom keystores supported in advanced mode.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white/60">
              <Package className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Packager</span>
            </div>
            <p className="text-sm text-white/40 leading-relaxed">
              Multi-architecture support (arm64-v8a, armeabi-v7a, x86_64) for maximum device compatibility.
            </p>
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
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#111] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6 text-orange-500" />
                  <h2 className="text-xl font-bold">Owners Vault</h2>
                </div>
                <button 
                  onClick={() => {
                    setShowVault(false);
                    setIsVaultAuthenticated(false);
                    setVaultPassword("");
                    setVaultError("");
                  }}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  &times;
                </button>
              </div>

              <div className="p-8">
                {!isVaultAuthenticated ? (
                  <div className="space-y-6 max-w-sm mx-auto text-center">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">Restricted Access</h3>
                      <p className="text-sm text-white/40">Enter the owner password to view other developments.</p>
                    </div>
                    <div className="space-y-4">
                      <input 
                        type="password" 
                        value={vaultPassword}
                        onChange={(e) => setVaultPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleVaultAccess()}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center focus:outline-none focus:border-orange-500/50 transition-colors"
                        placeholder="Password"
                        autoFocus
                      />
                      {vaultError && <p className="text-xs text-red-500 font-medium">{vaultError}</p>}
                      <button 
                        onClick={handleVaultAccess}
                        disabled={isVaultLoading}
                        className="w-full py-3 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold transition-colors disabled:opacity-50"
                      >
                        {isVaultLoading ? "Verifying..." : "Access Vault"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-white/40">Recent Developments</h3>
                      <span className="text-xs text-white/20">{vaultData.length} builds found</span>
                    </div>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {vaultData.length > 0 ? (
                        vaultData.map((dev) => (
                          <div key={dev.id} className="group bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:border-white/20 transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <Package className="w-5 h-5 text-blue-400" />
                              </div>
                              <div>
                                <h4 className="font-medium text-sm">{dev.name}</h4>
                                <p className="text-[10px] text-white/30 uppercase tracking-wider">
                                  {new Date(dev.date).toLocaleDateString()} • {(dev.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <a 
                              href={dev.url}
                              download
                              className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white text-black transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12 text-white/20">
                          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                          <p>No developments found in the vault.</p>
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
