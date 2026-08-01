import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic, Square, Play, Pause, SkipForward, SkipBack, Copy, Share2, QrCode,
  Trash2, RotateCcw, ChevronRight, Settings as SettingsIcon, Plus, Link2,
  Lock, Globe, EyeOff, GripVertical, Check, ArrowLeft, LogOut, X,
  Headphones, Sparkles
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

const COVERS = ["🎙️", "🌙", "☀️", "💌", "🎧", "✨", "🌊", "🔥"];
const THEMES = ["#E8A548", "#4FAE9B", "#E2654A", "#7C9CE0", "#C97BD1"];
const FONTS = ["Felt-Tip", "Retro Typewriter", "Ink Marker", "Clean Script"];
const MIN_CLIPS = 3;
const MAX_CLIPS = 5;

function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
function genCode() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}
function formatTime(s) {
  s = Math.max(0, Math.round(s || 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return "";
  }
}
function totalDuration(clips) {
  return (clips || []).reduce((a, c) => a + (c.duration || 0), 0);
}
function blankDraft() {
  return {
    id: genId(),
    title: "My Story",
    cover: COVERS[0],
    theme: THEMES[0],
    stickerFont: "Felt-Tip",
    privacy: "public",
    password: "",
    clips: [],
  };
}

function playTapeClick(type = "heavy") {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    const now = ctx.currentTime;
    
    if (type === "heavy") {
      // Mechanical button clack (metallic thump + spring click)
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.12);
      
      gainNode.gain.setValueAtTime(0.35, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Friction noise burst
      const bufferSize = ctx.sampleRate * 0.04;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.4, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);
      
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1100;
      filter.Q.value = 2.5;
      
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.12);
      noise.start(now);
      noise.stop(now + 0.04);
    } else {
      // Crisp mechanical switch click (settings, select, back)
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = "triangle";
      osc.frequency.setValueAtTime(750, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.05);
      
      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Minor noise spark
      const bufferSize = ctx.sampleRate * 0.008;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.18, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.008);
      
      noise.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.05);
      noise.start(now);
      noise.stop(now + 0.008);
    }
  } catch (e) {
    console.warn("AudioContext init error:", e);
  }
}

function applyWowFlutter(audioElement) {
  if (!audioElement || audioElement.__wowFlutterInitialized) return;
  try {
    audioElement.__wowFlutterInitialized = true;
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    const source = ctx.createMediaElementSource(audioElement);
    const delayNode = ctx.createDelay();
    delayNode.delayTime.value = 0.005; // 5ms baseline delay
    
    // Wow (0.45Hz slow engine drift)
    const wowOsc = ctx.createOscillator();
    const wowGain = ctx.createGain();
    wowOsc.frequency.value = 0.45;
    wowGain.gain.value = 0.0018; 
    
    // Flutter (4.8Hz fast capstan flutter)
    const flutterOsc = ctx.createOscillator();
    const flutterGain = ctx.createGain();
    flutterOsc.frequency.value = 4.8;
    flutterGain.gain.value = 0.0006;
    
    wowOsc.connect(wowGain);
    wowGain.connect(delayNode.delayTime);
    flutterOsc.connect(flutterGain);
    flutterGain.connect(delayNode.delayTime);
    
    source.connect(delayNode);
    delayNode.connect(ctx.destination);
    
    wowOsc.start();
    flutterOsc.start();

    audioElement.__wowOsc = wowOsc;
    audioElement.__flutterOsc = flutterOsc;
    audioElement.__audioCtx = ctx;
  } catch (e) {
    console.warn("Could not apply Wow & Flutter:", e);
  }
}

async function storageGet(key, shared = false) {
  try {
    const r = await window.storage.get(key, shared);
    return r ? r.value : null;
  } catch {
    return null;
  }
}

// Encode the full mixtape JSON into a base64 URL-safe string
function encodeMixtapePayload(mixtape) {
  try {
    const json = JSON.stringify(mixtape);
    return btoa(unescape(encodeURIComponent(json)));
  } catch {
    return null;
  }
}

// Decode a base64 mixtape payload back to a mixtape object
function decodeMixtapePayload(b64) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(b64))));
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  faux QR renderer (decorative, deterministic per code)              */
/* ------------------------------------------------------------------ */

function drawQr(canvas, code) {
  if (!canvas) return;
  const size = 21;
  const px = canvas.width / size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#F3EEE3";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let seed = 7;
  for (let i = 0; i < code.length; i++) seed = (seed * 31 + code.charCodeAt(i)) >>> 0;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return (seed >>> 16) / 65535;
  };
  ctx.fillStyle = "#12151C";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inFinder =
        (x < 7 && y < 7) || (x > size - 8 && y < 7) || (x < 7 && y > size - 8);
      if (inFinder) continue;
      if (rand() > 0.56) ctx.fillRect(x * px, y * px, px - 1, px - 1);
    }
  }
  const finder = (fx, fy) => {
    ctx.fillStyle = "#12151C";
    ctx.fillRect(fx * px, fy * px, 7 * px, 7 * px);
    ctx.fillStyle = "#F3EEE3";
    ctx.fillRect((fx + 1) * px, (fy + 1) * px, 5 * px, 5 * px);
    ctx.fillStyle = "#12151C";
    ctx.fillRect((fx + 2) * px, (fy + 2) * px, 3 * px, 3 * px);
  };
  finder(0, 0);
  finder(size - 7, 0);
  finder(0, size - 7);
}

/* ------------------------------------------------------------------ */
/*  small shared UI bits                                               */
/* ------------------------------------------------------------------ */

function Shell({ children, wide }) {
  return (
    <div
      style={{ fontFamily: "Inter, sans-serif" }}
      className="min-h-screen w-full flex items-center justify-center py-10 px-4 bg-grid"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,900;1,9..144,500&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Caveat:wght@700&family=Special+Elite&family=Permanent+Marker&display=swap');
        :root{
          --bg-color:#F7F5F0;
          --grid-color:rgba(0, 0, 0, 0.045);
          --ink:#1A1D24;
          --panel:#FFFFFF;
          --panel2:#F4F5F7;
          --border:#E1E4EC;
          --paper:#FAF7F0;
          --amber:#D97706;
          --amber-deep:#B45309;
          --teal:#0D9488;
          --coral:#E11D48;
          --text-hi:#111827;
          --text-mid:#4B5563;
          --text-low:#9CA3AF;
        }
        .bg-grid {
          background-color: var(--bg-color);
          background-image: 
            linear-gradient(to right, var(--grid-color) 1px, transparent 1px),
            linear-gradient(to bottom, var(--grid-color) 1px, transparent 1px);
          background-size: 10px 10px;
        }
        
        /* Layout Utilities */
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .flex-wrap { flex-wrap: wrap; }
        .items-center { align-items: center; }
        .items-start { align-items: flex-start; }
        .items-end { align-items: flex-end; }
        .justify-center { justify-content: center; }
        .justify-between { justify-content: space-between; }
        .justify-end { justify-content: flex-end; }
        .gap-1 { gap: 0.25rem; }
        .gap-1\.5 { gap: 0.375rem; }
        .gap-2 { gap: 0.5rem; }
        .gap-3 { gap: 0.75rem; }
        .gap-4 { gap: 1rem; }
        .w-full { width: 100%; box-sizing: border-box; }
        .max-w-sm { max-width: 24rem; }
        .max-w-md { max-width: 28rem; }
        .mx-auto { margin-left: auto; margin-right: auto; }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        .relative { position: relative; }
        .absolute { position: absolute; }
        .right-0 { right: 0; }
        .top-1/2 { top: 50%; }
        .-translate-y-1/2 { transform: translateY(-50%); }
        .min-h-screen { min-height: 100vh; min-height: 100svh; }
        .shrink-0 { flex-shrink: 0; }
        .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .min-w-0 { min-width: 0; }
        .fixed { position: fixed; }
        .bottom-6 { bottom: 1.5rem; }
        .left-1/2 { left: 50%; }
        .-translate-x-1/2 { transform: translateX(-50%); }
        .z-50 { z-index: 50; }
        
        /* Spacing & Sizes */
        .p-8 { padding: 2rem; }
        .p-6 { padding: 1.5rem; }
        .p-5 { padding: 1.25rem; }
        .p-4 { padding: 1rem; }
        .p-3 { padding: 0.75rem; }
        .p-2 { padding: 0.5rem; }
        .p-1\.5 { padding: 0.375rem; }
        .px-4 { padding-left: 1rem; padding-right: 1rem; }
        .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
        .py-10 { padding-top: 2.5rem; padding-bottom: 2.5rem; }
        .py-4 { padding-top: 1rem; padding-bottom: 1rem; }
        .py-3.5 { padding-top: 0.875rem; padding-bottom: 0.875rem; }
        .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
        .py-2.5 { padding-top: 0.625rem; padding-bottom: 0.625rem; }
        .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
        .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
        .mb-8 { margin-bottom: 2rem; }
        .mb-6 { margin-bottom: 1.5rem; }
        .mb-5 { margin-bottom: 1.25rem; }
        .mb-4 { margin-bottom: 1rem; }
        .mb-3 { margin-bottom: 0.75rem; }
        .mb-2 { margin-bottom: 0.5rem; }
        .mb-1 { margin-bottom: 0.25rem; }
        .mt-8 { margin-top: 2rem; }
        .mt-3 { margin-top: 0.75rem; }
        .mt-2 { margin-top: 0.5rem; }
        .mt-1 { margin-top: 0.25rem; }
        .mt-0.5 { margin-top: 0.125rem; }
        .pt-6 { padding-top: 1.5rem; }
        .divide-y > * + * { border-top: 1px solid var(--border); }

        /* VU Meter Styles */
        .vu-meter {
          display: flex;
          flex-direction: column-reverse;
          gap: 2.5px;
          height: 140px;
          width: 10px;
          background: #1C1E24;
          padding: 3px;
          border-radius: 4px;
          border: 1px solid var(--border);
          box-shadow: inset 0 2px 5px rgba(0,0,0,0.5);
          align-self: center;
        }
        .vu-segment {
          flex: 1;
          border-radius: 1px;
          background: #252833;
          transition: background 0.03s ease;
        }
        .vu-segment.vu-green { background: #10B981; box-shadow: 0 0 6px #10B981; }
        .vu-segment.vu-yellow { background: #FBBF24; box-shadow: 0 0 6px #FBBF24; }
        .vu-segment.vu-red { background: #EF4444; box-shadow: 0 0 6px #EF4444; }

        /* 3D Cassette Card Flipping */
        .cassette-flip-container {
          perspective: 1000px;
          margin-bottom: 1.5rem;
          width: 300px;
          height: 190px;
        }
        .cassette-flipper {
          position: relative;
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cassette-flipper.flipped {
          transform: rotateY(180deg);
        }
        .cassette-front, .cassette-back {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
        }
        .cassette-back {
          transform: rotateY(180deg);
        }

        /* Typography */
        .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
        .text-2xl { font-size: 1.5rem; line-height: 2rem; }
        .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
        .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
        .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
        .text-xs { font-size: 0.75rem; line-height: 1rem; }
        .text-\[10px\] { font-size: 10px; }
        .text-\[11px\] { font-size: 11px; }
        .font-medium { font-weight: 500; }
        .font-semibold { font-weight: 600; }
        .font-bold { font-weight: 700; }
        .uppercase { text-transform: uppercase; }
        .tracking-wide { letter-spacing: 0.025em; }
        .leading-tight { line-height: 1.25; }
        .leading-relaxed { line-height: 1.625; }

        /* Grid */
        .grid { display: grid; }
        .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }

        /* Radii */
        .rounded-full { border-radius: 9999px; }
        .rounded-3xl { border-radius: 1.5rem; }
        .rounded-2xl { border-radius: 1rem; }
        .rounded-xl { border-radius: 0.75rem; }
        .rounded-lg { border-radius: 0.5rem; }
        
        .font-display{ font-family:'Fraunces', serif; }
        .font-mono{ font-family:'IBM Plex Mono', monospace; }
        .font-felt{ font-family:'Caveat', cursive; }
        .font-typewriter{ font-family:'Special Elite', monospace; }
        .font-marker{ font-family:'Permanent Marker', cursive; }
        .font-script{ font-family:'Inter', sans-serif; }
        .card{ background:var(--panel); border:1px solid var(--border); box-shadow:0 10px 30px -10px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.02); width: 100%; box-sizing: border-box; }
        .panel2{ background:var(--panel2); border:1px solid var(--border); width: 100%; box-sizing: border-box; }
        .btn-amber{ background:var(--amber); color:#FFFFFF; font-weight:600; transition:transform .15s ease, background .15s ease; border-style: none; cursor: pointer; }
        .btn-amber:hover{ background:var(--amber-deep); transform:translateY(-1px); }
        .btn-amber:active{ transform:translateY(0); }
        .btn-ghost{ background:var(--panel); border:1px solid var(--border); color:var(--text-mid); transition: border-color .15s ease, background .15s ease, color .15s ease; cursor: pointer; }
        .btn-ghost:hover{ border-color:var(--teal); color:var(--teal); background:rgba(13,148,136,0.03); }
        .text-hi{ color:var(--text-hi); }
        .text-mid{ color:var(--text-mid); }
        .text-low{ color:var(--text-low); }
        .accent-amber{ color:var(--amber); }
        .accent-teal{ color:var(--teal); }
        .accent-coral{ color:var(--coral); }
        input[type=text], input[type=email], input[type=password]{
          background:var(--panel2); border:1px solid var(--border); color:var(--text-hi);
          outline:none; transition:border-color .15s ease; width: 100%; box-sizing: border-box;
        }
        input[type=text]:focus, input[type=email]:focus, input[type=password]:focus{ border-color:var(--amber); }
        .record-btn{
          width:96px; height:96px; border-radius:9999px; display:flex; align-items:center; justify-content:center;
          background:var(--coral); box-shadow:0 0 0 0 rgba(225,29,72,0.4); border-style: none; cursor: pointer;
        }
        .record-btn.pulsing{ animation:pulse 1.6s infinite; }
        @keyframes pulse{
          0%{ box-shadow:0 0 0 0 rgba(225,29,72,0.45); }
          70%{ box-shadow:0 0 0 22px rgba(225,29,72,0); }
          100%{ box-shadow:0 0 0 0 rgba(225,29,72,0); }
        }
        .fade-in{ animation:fadeIn .35s ease both; }
        @keyframes fadeIn{ from{opacity:0; transform:translateY(6px);} to{opacity:1; transform:translateY(0);} }
        .dot{ width:8px; height:8px; border-radius:9999px; }
        ::-webkit-scrollbar{ width:6px; }
        ::-webkit-scrollbar-thumb{ background:var(--border); border-radius:9999px; }
        .drag-row{ cursor:grab; }
        .drag-row:active{ cursor:grabbing; }
      `}</style>
      <div className={`w-full ${wide ? "max-w-md" : "max-w-sm"} fade-in`}>{children}</div>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium z-50"
      style={{ background: "var(--paper)", color: "var(--ink)" }}
    >
      {toast}
    </div>
  );
}

function ProgressSteps({ step }) {
  // step: 0 login, 1 recording, 2 publish
  const steps = ["Login", "Recording", "Publish"];
  return (
    <div className="flex items-center gap-3 mb-6">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className="dot"
            style={{
              background: i < step ? "var(--teal)" : i === step ? "var(--amber)" : "transparent",
              border: i >= step ? "1.5px solid var(--text-low)" : "none",
            }}
          />
          <span className="text-xs font-mono" style={{ color: i === step ? "var(--text-hi)" : "var(--text-low)" }}>
            {label}
          </span>
          {i < steps.length - 1 && <div className="w-4 h-px" style={{ background: "var(--border)" }} />}
        </div>
      ))}
    </div>
  );
}

function BackBar({ onBack, title }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <button onClick={onBack} className="btn-ghost rounded-full p-2">
        <ArrowLeft size={16} />
      </button>
      {title && <span className="text-sm text-mid font-mono uppercase tracking-wide">{title}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Cassette Tape Component                                            */
/* ------------------------------------------------------------------ */

function CassetteTape({ title, themeColor, isSpinning, progress = 0, stickerFont = "Felt-Tip", side = "A" }) {
  const pct = Math.min(Math.max(progress, 0), 1);
  const leftRadius = side === "A" ? 34 - (16 * pct) : 18 + (16 * pct);
  const rightRadius = side === "A" ? 18 + (16 * pct) : 34 - (16 * pct);

  let fontClass = "font-felt";
  if (stickerFont === "Felt-Tip") fontClass = "font-felt";
  else if (stickerFont === "Retro Typewriter") fontClass = "font-typewriter";
  else if (stickerFont === "Ink Marker") fontClass = "font-marker";
  else if (stickerFont === "Clean Script") fontClass = "font-script";

  return (
    <div className="relative mx-auto mb-6 select-none" style={{ width: "300px", height: "190px" }}>
      <style>{`
        @keyframes cassette-spin-cw {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinning-reel {
          animation: cassette-spin-cw 4s linear infinite;
        }
        .spinning-reel-paused {
          animation-play-state: paused;
        }
        @keyframes spool-wobble {
          0% { transform: translate(-0.3px, -0.3px); }
          100% { transform: translate(0.3px, 0.3px); }
        }
        .wobbling {
          animation: spool-wobble 0.08s infinite alternate ease-in-out;
        }
      `}</style>

      <svg width="100%" height="100%" viewBox="0 0 300 190" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
        {/* Outer Casing */}
        <rect x="5" y="5" width="290" height="180" rx="14" fill="var(--panel)" stroke="var(--border)" strokeWidth="3" />
        
        {/* Corner Assembly Screws */}
        <circle cx="15" cy="15" r="3" fill="var(--text-low)" />
        <line x1="13" y1="15" x2="17" y2="15" stroke="var(--ink)" strokeWidth="1" />
        <circle cx="285" cy="15" r="3" fill="var(--text-low)" />
        <line x1="283" y1="15" x2="287" y2="15" stroke="var(--ink)" strokeWidth="1" />
        <circle cx="15" cy="175" r="3" fill="var(--text-low)" />
        <line x1="13" y1="175" x2="17" y2="175" stroke="var(--ink)" strokeWidth="1" />
        <circle cx="285" cy="175" r="3" fill="var(--text-low)" />
        <line x1="283" y1="175" x2="287" y2="175" stroke="var(--ink)" strokeWidth="1" />

        {/* Outer label contour line */}
        <rect x="20" y="20" width="260" height="110" rx="8" stroke="var(--border)" strokeWidth="1.5" strokeDasharray="3 3" />

        {/* Sticker Label */}
        <rect x="35" y="28" width="230" height="92" rx="8" fill="var(--paper)" stroke={themeColor || "var(--amber)"} strokeWidth="2.5" />
        
        {/* Decorative Tape Lines on Sticker */}
        <line x1="35" y1="42" x2="265" y2="42" stroke={themeColor ? `${themeColor}44` : "var(--border)"} strokeWidth="1.5" />
        <line x1="35" y1="48" x2="265" y2="48" stroke={themeColor ? `${themeColor}22` : "var(--border)"} strokeWidth="1.5" />

        {/* Handwritten Label Info */}
        <text x="150" y="40" textAnchor="middle" fill="var(--ink)" fontSize="13" className={fontClass} fontWeight="600" letterSpacing="0.5">
          {title ? title.substring(0, 24) : "My Story"}
        </text>

        {/* A/B side indicator */}
        <text x="45" y="41" fill="var(--text-low)" fontSize="11" fontFamily="'Fraunces', serif" fontWeight="bold">{side}</text>

        {/* Center Transparent Window */}
        <rect x="75" y="55" width="150" height="48" rx="6" fill="var(--ink)" stroke="var(--border)" strokeWidth="2" />

        {/* Tape Reels (Windings) */}
        <circle cx="112" cy="79" r={leftRadius} fill="#1d222e" stroke="#12151c" strokeWidth="0.5" />
        {leftRadius > 20 && <circle cx="112" cy="79" r={leftRadius - 4} stroke="rgba(255,255,255,0.06)" strokeWidth="1" fill="none" />}
        {leftRadius > 28 && <circle cx="112" cy="79" r={leftRadius - 10} stroke="rgba(255,255,255,0.06)" strokeWidth="1" fill="none" />}

        <circle cx="188" cy="79" r={rightRadius} fill="#1d222e" stroke="#12151c" strokeWidth="0.5" />
        {rightRadius > 20 && <circle cx="188" cy="79" r={rightRadius - 4} stroke="rgba(255,255,255,0.06)" strokeWidth="1" fill="none" />}
        {rightRadius > 28 && <circle cx="188" cy="79" r={rightRadius - 10} stroke="rgba(255,255,255,0.06)" strokeWidth="1" fill="none" />}

        {/* Left Gear Spool */}
        <g style={{ transformOrigin: '112px 79px' }} className={`${isSpinning ? 'spinning-reel' : 'spinning-reel spinning-reel-paused'} ${isSpinning ? 'wobbling' : ''}`}>
          <circle cx="112" cy="79" r="13" fill="var(--paper)" stroke="var(--text-low)" strokeWidth="1" />
          <circle cx="112" cy="79" r="6" fill="var(--ink)" />
          <line x1="112" y1="67" x2="112" y2="91" stroke="var(--text-low)" strokeWidth="2.5" />
          <line x1="101" y1="73" x2="123" y2="85" stroke="var(--text-low)" strokeWidth="2.5" />
          <line x1="101" y1="85" x2="123" y2="73" stroke="var(--text-low)" strokeWidth="2.5" />
        </g>

        {/* Right Gear Spool */}
        <g style={{ transformOrigin: '188px 79px' }} className={`${isSpinning ? 'spinning-reel' : 'spinning-reel spinning-reel-paused'} ${isSpinning ? 'wobbling' : ''}`}>
          <circle cx="188" cy="79" r="13" fill="var(--paper)" stroke="var(--text-low)" strokeWidth="1" />
          <circle cx="188" cy="79" r="6" fill="var(--ink)" />
          <line x1="188" y1="67" x2="188" y2="91" stroke="var(--text-low)" strokeWidth="2.5" />
          <line x1="177" y1="73" x2="199" y2="85" stroke="var(--text-low)" strokeWidth="2.5" />
          <line x1="177" y1="85" x2="199" y2="73" stroke="var(--text-low)" strokeWidth="2.5" />
        </g>

        {/* Tape Running Path */}
        <line x1="50" y1="152" x2="250" y2="152" stroke="#1d222e" strokeWidth="4" />
        <circle cx="50" cy="152" r="6" fill="var(--border)" />
        <circle cx="50" cy="152" r="2" fill="var(--ink)" />
        <circle cx="250" cy="152" r="6" fill="var(--border)" />
        <circle cx="250" cy="152" r="2" fill="var(--ink)" />

        {/* Bottom Trapezoid Guard */}
        <polygon points="65,178 85,142 215,142 235,178" fill="var(--panel2)" stroke="var(--border)" strokeWidth="1.5" />
        <circle cx="95" cy="158" r="4.5" fill="var(--ink)" stroke="var(--border)" strokeWidth="1" />
        <circle cx="205" cy="158" r="4.5" fill="var(--ink)" stroke="var(--border)" strokeWidth="1" />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  main app                                                            */
/* ------------------------------------------------------------------ */

export default function VoiceMixtapeApp() {
  const [view, setView] = useState("landing");
  const [user, setUser] = useState(null);
  const [mixtapes, setMixtapes] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [draft, setDraft] = useState(blankDraft());
  const [clipIndex, setClipIndex] = useState(0);
  const [lastCode, setLastCode] = useState(null);
  const [lastShareUrl, setLastShareUrl] = useState("");
  const [toast, setToast] = useState(null);
  const [codeInput, setCodeInput] = useState("");
  const [publicMixtape, setPublicMixtape] = useState(null);
  const [passwordUnlocked, setPasswordUnlocked] = useState(true);
  const [pwInput, setPwInput] = useState("");
  const [publicError, setPublicError] = useState("");

  function flash(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }

  const loadMyMixtapes = useCallback(async () => {
    setLoadingList(true);
    const idsRaw = await storageGet("user-mixtape-ids");
    const ids = idsRaw ? JSON.parse(idsRaw) : [];
    const items = [];
    for (const id of ids) {
      const raw = await storageGet(`mixtape:${id}`);
      if (raw) items.push(JSON.parse(raw));
    }
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setMixtapes(items);
    setLoadingList(false);
  }, []);

  useEffect(() => {
    if (view === "dashboard") loadMyMixtapes();
  }, [view, loadMyMixtapes]);

  // URL deep-link: handle /m/CODE on initial load and browser back/forward
  useEffect(() => {
    async function handlePath(pathname, hash) {
      const match = pathname.match(/^\/m\/([A-Z0-9]+)$/i);
      if (!match) return;
      const code = match[1].toUpperCase();

      // 1. Try to decode from the URL hash payload first (works cross-device)
      const hashMatch = hash.match(/[#&]d=([^&]+)/);
      if (hashMatch) {
        const mixtape = decodeMixtapePayload(hashMatch[1]);
        if (mixtape) {
          mixtape.plays = (mixtape.plays || 0) + 1;
          setPublicMixtape(mixtape);
          setPasswordUnlocked(mixtape.privacy !== "password");
          setPwInput("");
          setView("public");
          return;
        }
      }

      // 2. Fallback: try localStorage (same-device sharing)
      await openByCode(code);
    }

    handlePath(window.location.pathname, window.location.hash);

    const onPopState = () => handlePath(window.location.pathname, window.location.hash);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // eslint-disable-next-line
  }, []);

  function goNewMixtape() {
    playTapeClick("heavy");
    setDraft(blankDraft());
    setClipIndex(0);
    setView("record");
  }

  async function publishMixtape(finalDraft) {
    const code = genCode();
    const mixtape = {
      ...finalDraft,
      code,
      author: user?.name || "Anonymous",
      createdAt: new Date().toISOString(),
      plays: 0,
    };
    try {
      await window.storage.set(`mixtape:${mixtape.id}`, JSON.stringify(mixtape));
      await window.storage.set(`public:${code}`, JSON.stringify(mixtape), true);
      const idsRaw = await storageGet("user-mixtape-ids");
      const ids = idsRaw ? JSON.parse(idsRaw) : [];
      ids.unshift(mixtape.id);
      await window.storage.set("user-mixtape-ids", JSON.stringify(ids));
      setMixtapes((prev) => [mixtape, ...prev]);
      setLastCode(code);
      // Build full self-contained share URL with encoded mixtape payload
      const payload = encodeMixtapePayload(mixtape);
      const shareUrl = payload
        ? `https://minitape.grafty.pro/m/${code}#d=${payload}`
        : `https://minitape.grafty.pro/m/${code}`;
      setLastShareUrl(shareUrl);
      setView("share");
    } catch (e) {
      flash("Couldn't publish — try again");
    }
  }

  async function openByCode(raw) {
    const code = (raw || "").trim().toUpperCase();
    if (!code) return;
    playTapeClick("heavy");
    setPublicError("");
    const found = await storageGet(`public:${code}`, true);
    if (!found) {
      setPublicError("No mixtape found for that code.");
      return;
    }
    const m = JSON.parse(found);
    m.plays = (m.plays || 0) + 1;
    window.storage.set(`public:${code}`, JSON.stringify(m), true).catch(() => {});
    setPublicMixtape(m);
    setPasswordUnlocked(m.privacy !== "password");
    setPwInput("");
    setView("public");
    // Push clean URL so the link is shareable/bookmarkable
    if (window.location.pathname !== `/m/${code}`) {
      window.history.pushState({ code }, "", `/m/${code}`);
    }
  }

  return (
    <>
      {view === "landing" && (
        <Landing
          onLogin={() => { playTapeClick("light"); setView("login"); }}
          codeInput={codeInput}
          setCodeInput={setCodeInput}
          onOpenCode={() => openByCode(codeInput)}
          error={publicError}
        />
      )}
      {view === "login" && (
        <Login
          onDone={(u) => {
            playTapeClick("heavy");
            setUser(u);
            setView("dashboard");
          }}
          onBack={() => { playTapeClick("light"); setView("landing"); }}
        />
      )}
      {view === "dashboard" && (
        <Dashboard
          user={user}
          mixtapes={mixtapes}
          loading={loadingList}
          onNew={goNewMixtape}
          onOpenMixtape={(m) => {
            playTapeClick("heavy");
            setPublicMixtape(m);
            setPasswordUnlocked(m.privacy !== "password");
            setPwInput("");
            setView("public");
          }}
          onSettings={() => { playTapeClick("light"); setView("settings"); }}
          onCopy={(code) => {
            playTapeClick("light");
            navigator.clipboard?.writeText(`https://minitape.grafty.pro/m/${code}`).catch(() => {});
            flash("Link copied");
          }}
          codeInput={codeInput}
          setCodeInput={setCodeInput}
          onOpenCode={() => openByCode(codeInput)}
          error={publicError}
        />
      )}
      {view === "record" && (
        <RecordFlow
          draft={draft}
          setDraft={setDraft}
          clipIndex={clipIndex}
          setClipIndex={setClipIndex}
          onCancel={() => { playTapeClick("light"); setView("dashboard"); }}
          onFinish={() => { playTapeClick("heavy"); setView("builder"); }}
        />
      )}
      {view === "builder" && (
        <Builder
          draft={draft}
          setDraft={setDraft}
          onBack={() => { playTapeClick("light"); setView("record"); }}
          onPublish={publishMixtape}
        />
      )}
      {view === "share" && (
        <ShareScreen
          code={lastCode}
          draft={draft}
          onDashboard={() => { playTapeClick("light"); setView("dashboard"); }}
          onPreview={() => {
            playTapeClick("heavy");
            const m = mixtapes.find((mm) => mm.code === lastCode);
            if (m) {
              setPublicMixtape(m);
              setPasswordUnlocked(m.privacy !== "password");
              setView("public");
            }
          }}
          flash={flash}
          shareUrl={lastShareUrl}
        />
      )}
      {view === "public" && (
        <PublicPlayer
          mixtape={publicMixtape}
          passwordUnlocked={passwordUnlocked}
          pwInput={pwInput}
          setPwInput={setPwInput}
          onUnlock={() => {
            playTapeClick("heavy");
            if (pwInput === publicMixtape?.password) setPasswordUnlocked(true);
            else flash("Wrong password");
          }}
          onBack={() => {
            playTapeClick("light");
            window.history.pushState({}, "", "/");
            setView(user ? "dashboard" : "landing");
          }}
        />
      )}
      {view === "settings" && (
        <Settings
          user={user}
          setUser={setUser}
          onBack={() => { playTapeClick("light"); setView("dashboard"); }}
          onSignOut={() => {
            playTapeClick("light");
            setUser(null);
            setView("landing");
          }}
        />
      )}
      <Toast toast={toast} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Landing                                                             */
/* ------------------------------------------------------------------ */

function Landing({ onLogin, codeInput, setCodeInput, onOpenCode, error }) {
  return (
    <Shell>
      <div className="card rounded-3xl p-8 text-center">
        <CassetteTape
          title="MINITAPE"
          themeColor="var(--amber)"
          isSpinning={false}
          progress={0.25}
        />
        <h1 className="font-display text-hi text-3xl leading-tight mb-3" style={{ fontWeight: 600 }}>
          Record your voice.
        </h1>
        <p className="text-mid text-sm mb-8 leading-relaxed">
          Create a voice mixtape in under 2 minutes.
        </p>
        <button onClick={onLogin} className="btn-amber w-full rounded-full py-3 text-sm">
          Login
        </button>

        <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-xs text-low font-mono uppercase tracking-wide mb-3">Have a code?</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="6XKQ82"
              className="flex-1 rounded-full px-4 py-2 text-sm font-mono text-center"
              maxLength={6}
            />
            <button onClick={onOpenCode} className="btn-ghost rounded-full px-4">
              <ChevronRight size={16} />
            </button>
          </div>
          {error && <p className="text-xs mt-2" style={{ color: "var(--coral)" }}>{error}</p>}
        </div>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  Login                                                                */
/* ------------------------------------------------------------------ */

function Login({ onDone, onBack }) {
  const [showEmail, setShowEmail] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  return (
    <Shell>
      <BackBar onBack={onBack} />
      <div className="card rounded-3xl p-8">
        <h2 className="font-display text-hi text-2xl mb-1" style={{ fontWeight: 600 }}>
          Welcome
        </h2>
        <p className="text-mid text-sm mb-6">Sign in to start recording.</p>

        {!showEmail ? (
          <div className="space-y-3">
            <button
              onClick={() => onDone({ name: "You", provider: "google" })}
              className="btn-ghost w-full rounded-full py-3 text-sm flex items-center justify-center gap-2"
            >
              Continue with Google
            </button>
            <button
              onClick={() => onDone({ name: "You", provider: "apple" })}
              className="btn-ghost w-full rounded-full py-3 text-sm flex items-center justify-center gap-2"
            >
              Continue with Apple
            </button>
            <button
              onClick={() => { playTapeClick("light"); setShowEmail(true); }}
              className="btn-ghost w-full rounded-full py-3 text-sm flex items-center justify-center gap-2"
            >
              Continue with Email
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm"
            />
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm"
            />
            <button
              disabled={!name.trim()}
              onClick={() => onDone({ name: name.trim(), provider: "email" })}
              className="btn-amber w-full rounded-full py-3 text-sm disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                           */
/* ------------------------------------------------------------------ */

function Dashboard({ user, mixtapes, loading, onNew, onOpenMixtape, onSettings, onCopy, codeInput, setCodeInput, onOpenCode, error }) {
  return (
    <Shell wide>
      <div className="flex flex-col items-center text-center mb-6 relative">
        <p className="text-xs text-low font-mono uppercase tracking-wide">Hey</p>
        <h1 className="font-display text-hi text-2xl" style={{ fontWeight: 600 }}>
          {user?.name || "there"}
        </h1>
        <button onClick={onSettings} className="btn-ghost rounded-full p-3 absolute right-0 top-1/2 -translate-y-1/2">
          <SettingsIcon size={16} />
        </button>
      </div>

      <button
        onClick={onNew}
        className="btn-amber w-full rounded-2xl py-4 mb-8 flex items-center justify-center gap-2 text-sm"
      >
        <Plus size={16} /> New Mixtape
      </button>

      <div className="mb-8">
        <h3 className="text-xs text-low font-mono uppercase tracking-wide mb-3 text-center">My Mixtapes</h3>
        {loading && <p className="text-mid text-sm text-center">Loading…</p>}
        {!loading && mixtapes.length === 0 && (
          <div className="card rounded-2xl p-6 text-center">
            <p className="text-mid text-sm">Nothing recorded yet. Your first mixtape takes about two minutes.</p>
          </div>
        )}
        <div className="space-y-3">
          {mixtapes.map((m) => (
            <button
              key={m.id}
              onClick={() => onOpenMixtape(m)}
              className="card w-full rounded-2xl p-5 flex flex-col items-center justify-center gap-3 text-center hover:brightness-105 transition"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
                style={{ background: m.theme + "22", border: `1px solid ${m.theme}55` }}
              >
                {m.cover}
              </div>
              <div className="min-w-0">
                <p className="text-hi text-sm font-medium truncate">{m.title}</p>
                <p className="text-low text-xs font-mono mt-0.5">
                  {m.clips.length} Clips · {formatTime(totalDuration(m.clips))} · {formatDate(m.createdAt)}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 text-xs font-mono text-low">
                <span className="accent-amber">{m.plays || 0} Plays</span>
                <span>·</span>
                <span className="flex items-center gap-1 uppercase text-[10px]">
                  {m.privacy === "public" && <Globe size={10} />}
                  {m.privacy === "unlisted" && <EyeOff size={10} />}
                  {m.privacy === "password" && <Lock size={10} />}
                  {m.privacy}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {mixtapes.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs text-low font-mono uppercase tracking-wide mb-3 text-center">Shared Links</h3>
          <div className="card rounded-2xl divide-y" style={{ borderColor: "var(--border)" }}>
            {mixtapes.map((m) => (
              <div key={m.id} className="flex flex-col items-center justify-center gap-2 px-4 py-3" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-center gap-2 min-w-0">
                  <Link2 size={13} className="text-low shrink-0" />
                  <span className="text-xs font-mono text-hi truncate">{m.title} · minitape.grafty.pro/m/{m.code}</span>
                </div>
                <button onClick={() => onCopy(m.code)} className="btn-ghost rounded-full px-3 py-1 text-[10px] font-mono flex items-center gap-1.5 shrink-0">
                  <Copy size={11} /> Copy Link
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card rounded-2xl p-5 text-center">
        <h3 className="text-xs text-low font-mono uppercase tracking-wide mb-3 text-center">Listen with a code</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
            placeholder="6XKQ82"
            maxLength={6}
            className="flex-1 rounded-full px-4 py-2 text-sm font-mono text-center"
          />
          <button onClick={onOpenCode} className="btn-ghost rounded-full px-4">
            <ChevronRight size={16} />
          </button>
        </div>
        {error && <p className="text-xs mt-2 text-center" style={{ color: "var(--coral)" }}>{error}</p>}
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  Recording flow                                                      */
/* ------------------------------------------------------------------ */

function RecordFlow({ draft, setDraft, clipIndex, setClipIndex, onCancel, onFinish }) {
  const [recordState, setRecordState] = useState("idle"); // idle | recording | recorded
  const [elapsed, setElapsed] = useState(0);
  const [recError, setRecError] = useState("");
  const [replaying, setReplaying] = useState(false);
  const [replayProgress, setReplayProgress] = useState(0);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const canvasRef = useRef(null);
  const timerRef = useRef(null);
  const autoStopRef = useRef(null);
  const elapsedRef = useRef(0);
  const replayAudioRef = useRef(null);
  const replayIntervalRef = useRef(null);
  const vuLeftContainerRef = useRef(null);
  const vuRightContainerRef = useRef(null);

  const currentClip = draft.clips[clipIndex];

  function stopReplay() {
    if (replayIntervalRef.current) {
      clearInterval(replayIntervalRef.current);
      replayIntervalRef.current = null;
    }
    if (replayAudioRef.current) {
      replayAudioRef.current.pause();
      replayAudioRef.current = null;
    }
    setReplaying(false);
    setReplayProgress(0);
    clearVUMeters();
  }

  useEffect(() => {
    stopReplay();
    if (currentClip) {
      setRecordState("recorded");
      elapsedRef.current = currentClip.duration;
      setElapsed(currentClip.duration);
    } else {
      setRecordState("idle");
      elapsedRef.current = 0;
      setElapsed(0);
    }
    // eslint-disable-next-line
  }, [clipIndex]);

  useEffect(() => {
    return () => {
      stopReplay();
      clearInterval(timerRef.current);
      clearTimeout(autoStopRef.current);
      cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, []);

  function drawIdleBars() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const barCount = 32;
    for (let i = 0; i < barCount; i++) {
      const w = canvas.width / barCount;
      const bw = w * 0.6;
      const x = i * w + (w - bw) / 2;
      ctx.fillStyle = "#2E3444";
      ctx.fillRect(x, canvas.height / 2 - 2, bw, 4);
    }
  }
  useEffect(() => {
    drawIdleBars();
  }, [clipIndex]);

  function updateVUMeter(level) {
    const leftContainer = vuLeftContainerRef.current;
    const rightContainer = vuRightContainerRef.current;
    if (!leftContainer || !rightContainer) return;
    const leftSegs = leftContainer.children;
    const rightSegs = rightContainer.children;
    if (!leftSegs.length || !rightSegs.length) return;
    
    const activeCount = Math.min(10, Math.round(level * 7));
    for (let i = 0; i < 10; i++) {
      const active = i < activeCount;
      const leftSeg = leftSegs[9 - i]; 
      const rightSeg = rightSegs[9 - i];
      if (leftSeg) {
        leftSeg.className = "vu-segment";
        if (active) {
          if (i >= 8) leftSeg.classList.add("vu-red");
          else if (i >= 6) leftSeg.classList.add("vu-yellow");
          else leftSeg.classList.add("vu-green");
        }
      }
      if (rightSeg) {
        rightSeg.className = "vu-segment";
        if (active) {
          if (i >= 8) rightSeg.classList.add("vu-red");
          else if (i >= 6) rightSeg.classList.add("vu-yellow");
          else rightSeg.classList.add("vu-green");
        }
      }
    }
  }

  function clearVUMeters() {
    const leftContainer = vuLeftContainerRef.current;
    const rightContainer = vuRightContainerRef.current;
    if (leftContainer) {
      Array.from(leftContainer.children).forEach(s => s.className = "vu-segment");
    }
    if (rightContainer) {
      Array.from(rightContainer.children).forEach(s => s.className = "vu-segment");
    }
  }

  function drawWaveform() {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const barCount = 32;
    const step = Math.max(1, Math.floor(bufferLength / barCount));

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength; 
      const scaledLevel = avg / 96; 
      updateVUMeter(scaledLevel);

      const w = canvas.width,
        h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const barWidth = (w / barCount) * 0.6;
      for (let i = 0; i < barCount; i++) {
        const val = dataArray[i * step] / 255;
        const barHeight = Math.max(4, val * h);
        const x = i * (w / barCount) + (w / barCount - barWidth) / 2;
        ctx.fillStyle = "#E8A548";
        ctx.fillRect(x, h / 2 - barHeight / 2, barWidth, barHeight);
      }
    }
    draw();
  }

  async function startRecording() {
    playTapeClick("heavy");
    setRecError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = handleStop;
      mr.start();
      setRecordState("recording");
      elapsedRef.current = 0;
      setElapsed(0);
      const startedAt = Date.now();
      timerRef.current = setInterval(() => {
        const s = Math.min(60, Math.floor((Date.now() - startedAt) / 1000));
        elapsedRef.current = s;
        setElapsed(s);
      }, 200);
      autoStopRef.current = setTimeout(() => stopRecording(), 60000);

      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      src.connect(analyser);
      analyserRef.current = analyser;
      drawWaveform();
    } catch (e) {
      setRecError("Microphone access is needed to record. Check your browser permissions.");
    }
  }

  function stopRecording() {
    playTapeClick("heavy");
    clearInterval(timerRef.current);
    clearTimeout(autoStopRef.current);
    cancelAnimationFrame(rafRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    drawIdleBars();
    clearVUMeters();
  }

  function handleStop() {
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      setDraft((prev) => {
        const clips = [...prev.clips];
        clips[clipIndex] = {
          id: clips[clipIndex]?.id || genId(),
          title: clips[clipIndex]?.title || `Clip ${clipIndex + 1}`,
          duration: elapsedRef.current || 1,
          audioDataUrl: dataUrl,
        };
        return { ...prev, clips };
      });
      setRecordState("recorded");
    };
    reader.readAsDataURL(blob);
  }

  function replay() {
    if (!currentClip) return;
    playTapeClick("heavy");
    stopReplay();
    setReplaying(true);
    setReplayProgress(0);

    const a = new Audio(currentClip.audioDataUrl);
    applyWowFlutter(a);
    replayAudioRef.current = a;

    let interval;
    const startProgressInterval = () => {
      interval = setInterval(() => {
        if (a.duration) {
          setReplayProgress(a.currentTime / a.duration);
        }
      }, 100);
      replayIntervalRef.current = interval;
    };

    a.oncanplay = () => {
      if (!interval) startProgressInterval();
    };

    a.onended = () => {
      stopReplay();
    };

    a.onerror = () => {
      stopReplay();
    };

    a.play().then(() => {
      if (!interval) startProgressInterval();
    }).catch(() => {
      stopReplay();
    });
  }

  function deleteClip() {
    playTapeClick("light");
    stopReplay();
    setDraft((prev) => {
      const clips = [...prev.clips];
      clips[clipIndex] = undefined;
      return { ...prev, clips: clips.filter((c, i) => i !== clipIndex || c !== undefined) };
    });
    setRecordState("idle");
    elapsedRef.current = 0;
    setElapsed(0);
    setTimeout(drawIdleBars, 0);
    clearVUMeters();
  }

  function goNext() {
    playTapeClick("heavy");
    stopReplay();
    setClipIndex((i) => i + 1);
  }

  function finishHere() {
    playTapeClick("heavy");
    stopReplay();
    const clips = draft.clips.filter(Boolean);
    setDraft((prev) => ({ ...prev, clips }));
    onFinish();
  }

  const recordedCount = draft.clips.filter(Boolean).length;
  const canFinish = recordState === "recorded" && recordedCount >= MIN_CLIPS;
  const canNext = recordState === "recorded" && clipIndex + 1 < MAX_CLIPS;
  const isLastAllowed = clipIndex + 1 >= MAX_CLIPS;

  return (
    <Shell>
      <BackBar onBack={onCancel} title="New Mixtape" />
      <ProgressSteps step={1} />
      <div className="card rounded-3xl p-8 text-center">
        <p className="text-xs text-low font-mono uppercase tracking-wide mb-1">
          Clip {clipIndex + 1} of {MAX_CLIPS}
        </p>
        <p className="text-mid text-xs mb-6">Minimum {MIN_CLIPS} clips</p>

        <div className="flex items-center justify-center gap-4 mb-2">
          <div className="vu-meter" id="vu-left" ref={vuLeftContainerRef}>
            {[...Array(10)].map((_, i) => (
              <div key={i} className="vu-segment" />
            ))}
          </div>

          <div className="cassette-flip-container mx-auto">
            <div className={`cassette-flipper ${clipIndex >= 3 ? "flipped" : ""}`}>
              <div className="cassette-front">
                <CassetteTape
                  title={currentClip?.title || `Clip ${clipIndex + 1}`}
                  themeColor={draft.theme}
                  isSpinning={recordState === "recording" || replaying}
                  progress={recordState === "recording" ? (elapsed / 60) : replaying ? replayProgress : (elapsed ? (elapsed / 60) : 0)}
                  stickerFont={draft.stickerFont}
                  side="A"
                />
              </div>
              <div className="cassette-back">
                <CassetteTape
                  title={currentClip?.title || `Clip ${clipIndex + 1}`}
                  themeColor={draft.theme}
                  isSpinning={recordState === "recording" || replaying}
                  progress={recordState === "recording" ? (elapsed / 60) : replaying ? replayProgress : (elapsed ? (elapsed / 60) : 0)}
                  stickerFont={draft.stickerFont}
                  side="B"
                />
              </div>
            </div>
          </div>

          <div className="vu-meter" id="vu-right" ref={vuRightContainerRef}>
            {[...Array(10)].map((_, i) => (
              <div key={i} className="vu-segment" />
            ))}
          </div>
        </div>

        <div className="mb-6 h-[40px] flex items-center justify-center overflow-hidden">
          <canvas ref={canvasRef} width={260} height={40} className="mx-auto" />
        </div>

        <div className="flex items-center justify-center mb-4">
          {recordState !== "recording" ? (
            <button
              onClick={startRecording}
              className="record-btn"
              style={{ background: "var(--coral)" }}
              aria-label="Record"
            >
              <Mic size={30} color="var(--paper)" />
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="record-btn pulsing"
              style={{ background: "var(--coral)" }}
              aria-label="Stop"
            >
              <Square size={26} color="var(--paper)" fill="var(--paper)" />
            </button>
          )}
        </div>

        <p className="font-mono text-hi text-lg mb-1">{formatTime(elapsed)}</p>
        <p className="text-low text-xs mb-6">Maximum 60 seconds</p>

        {recError && (
          <p className="text-xs mb-4" style={{ color: "var(--coral)" }}>
            {recError}
          </p>
        )}

        {recordState === "recorded" && (
          <div className="flex items-center justify-center gap-2 mb-2">
            <button onClick={replay} className="btn-ghost rounded-full px-4 py-2 text-xs flex items-center gap-1.5">
              <RotateCcw size={13} /> Replay
            </button>
            <button
              onClick={deleteClip}
              className="btn-ghost rounded-full px-4 py-2 text-xs flex items-center gap-1.5"
              style={{ color: "var(--coral)" }}
            >
              <Trash2 size={13} /> Delete
            </button>
          </div>
        )}

        {recordState === "recorded" && (
          <div className="flex flex-col gap-2 mt-4">
            {canNext && (
              <button onClick={goNext} className="btn-amber rounded-full py-3 text-sm">
                Next Clip
              </button>
            )}
            {canFinish && (
              <button
                onClick={finishHere}
                className={isLastAllowed ? "btn-amber rounded-full py-3 text-sm" : "btn-ghost rounded-full py-3 text-sm"}
              >
                Finish
              </button>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  Builder                                                             */
/* ------------------------------------------------------------------ */

function Builder({ draft, setDraft, onBack, onPublish }) {
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const [publishing, setPublishing] = useState(false);

  function updateClipTitle(i, title) {
    setDraft((prev) => {
      const clips = [...prev.clips];
      clips[i] = { ...clips[i], title };
      return { ...prev, clips };
    });
  }
  function removeClip(i) {
    setDraft((prev) => ({ ...prev, clips: prev.clips.filter((_, idx) => idx !== i) }));
  }
  function playClip(clip) {
    const a = new Audio(clip.audioDataUrl);
    a.play().catch(() => {});
  }
  function handleDragEnd() {
    const from = dragItem.current,
      to = dragOverItem.current;
    if (from === null || to === null || from === to) return;
    setDraft((prev) => {
      const list = [...prev.clips];
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      return { ...prev, clips: list };
    });
    dragItem.current = null;
    dragOverItem.current = null;
  }

  async function handlePublish() {
    setPublishing(true);
    await onPublish(draft);
    setPublishing(false);
  }

  return (
    <Shell wide>
      <BackBar onBack={onBack} title="Arrange & Publish" />
      <ProgressSteps step={2} />

      <div className="card rounded-3xl p-6 mb-4 text-center">
        <input
          type="text"
          value={draft.title}
          onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
          className="w-full bg-transparent font-display text-hi text-2xl mb-1 outline-none text-center"
          style={{ fontWeight: 600 }}
          placeholder="My Story"
        />
        <p className="text-low text-xs font-mono mb-5 text-center">
          {draft.clips.length} Clips · {formatTime(totalDuration(draft.clips))}
        </p>

        <div className="space-y-2 mb-2">
          {draft.clips.map((clip, i) => (
            <div
              key={clip.id}
              draggable
              onDragStart={() => (dragItem.current = i)}
              onDragEnter={() => (dragOverItem.current = i)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className="drag-row panel2 rounded-xl p-3 flex items-center gap-3"
            >
              <GripVertical size={14} className="text-low shrink-0" />
              <button onClick={() => { playTapeClick("heavy"); playClip(clip); }} className="shrink-0 rounded-full p-1.5" style={{ background: "var(--amber)" }}>
                <Play size={11} color="var(--ink)" fill="var(--ink)" />
              </button>
              <input
                type="text"
                value={clip.title}
                onChange={(e) => updateClipTitle(i, e.target.value)}
                className="flex-1 bg-transparent text-hi text-sm outline-none min-w-0"
              />
              <span className="text-low text-xs font-mono shrink-0">{formatTime(clip.duration)}</span>
              <button onClick={() => { playTapeClick("light"); removeClip(i); }} className="shrink-0 text-low hover:text-hi">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card rounded-3xl p-6 mb-4 space-y-5">
        <div>
          <p className="text-xs text-low font-mono uppercase tracking-wide mb-2 text-center">Cover</p>
          <div className="flex gap-2 flex-wrap justify-center">
            {COVERS.map((c) => (
              <button
                key={c}
                onClick={() => { playTapeClick("light"); setDraft((p) => ({ ...p, cover: c })); }}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-base"
                style={{
                  background: draft.cover === c ? "var(--amber)33" : "var(--panel2)",
                  border: draft.cover === c ? "1px solid var(--amber)" : "1px solid var(--border)",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-low font-mono uppercase tracking-wide mb-2 text-center">Theme Color</p>
          <div className="flex gap-2 justify-center">
            {THEMES.map((t) => (
              <button
                key={t}
                onClick={() => { playTapeClick("light"); setDraft((p) => ({ ...p, theme: t })); }}
                className="w-8 h-8 rounded-full"
                style={{
                  background: t,
                  outline: draft.theme === t ? "2px solid var(--text-hi)" : "none",
                  outlineOffset: "2px",
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-low font-mono uppercase tracking-wide mb-2 text-center">Sticker Font</p>
          <div className="flex gap-2 justify-center flex-wrap">
            {FONTS.map((f) => (
              <button
                key={f}
                onClick={() => { playTapeClick("light"); setDraft((p) => ({ ...p, stickerFont: f })); }}
                className="rounded-xl px-3 py-1.5 text-xs font-mono"
                style={{
                  background: draft.stickerFont === f ? "var(--amber)22" : "var(--panel2)",
                  border: draft.stickerFont === f ? "1px solid var(--amber)" : "1px solid var(--border)",
                  color: draft.stickerFont === f ? "var(--text-hi)" : "var(--text-mid)",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-low font-mono uppercase tracking-wide mb-2 text-center">Privacy</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "public", label: "Public", icon: Globe },
              { key: "unlisted", label: "Unlisted", icon: EyeOff },
              { key: "password", label: "Password", icon: Lock },
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => { playTapeClick("light"); setDraft((p) => ({ ...p, privacy: key })); }}
                className="rounded-xl py-2.5 flex flex-col items-center gap-1 text-xs"
                style={{
                  background: draft.privacy === key ? "var(--amber)22" : "var(--panel2)",
                  border: draft.privacy === key ? "1px solid var(--amber)" : "1px solid var(--border)",
                  color: draft.privacy === key ? "var(--text-hi)" : "var(--text-mid)",
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>
          {draft.privacy === "password" && (
            <input
              type="password"
              placeholder="Set a password"
              value={draft.password}
              onChange={(e) => setDraft((p) => ({ ...p, password: e.target.value }))}
              className="w-full rounded-xl px-4 py-2.5 text-sm mt-3 text-center"
            />
          )}
        </div>
      </div>

      <button
        onClick={handlePublish}
        disabled={draft.clips.length < 1 || !draft.title.trim() || publishing}
        className="btn-amber w-full rounded-full py-3.5 text-sm disabled:opacity-40"
      >
        {publishing ? "Publishing…" : "Publish"}
      </button>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  Share screen                                                        */
/* ------------------------------------------------------------------ */

function ShareScreen({ code, draft, onDashboard, onPreview, flash, shareUrl }) {
  const [showQr, setShowQr] = useState(false);
  const canvasRef = useRef(null);
  const link = shareUrl || `https://minitape.grafty.pro/m/${code}`;

  useEffect(() => {
    if (showQr) drawQr(canvasRef.current, code);
  }, [showQr, code]);

  function copy() {
    navigator.clipboard?.writeText(link).catch(() => {});
    flash("Link copied");
  }
  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: draft.title, text: `Listen to "${draft.title}"`, url: `https://${link}` });
      } catch {}
    } else {
      copy();
    }
  }

  return (
    <Shell>
      <div className="card rounded-3xl p-8 text-center">
        <div
          className="w-14 h-14 rounded-full mx-auto mb-5 flex items-center justify-center text-2xl"
          style={{ background: draft.theme + "22", border: `1px solid ${draft.theme}` }}
        >
          {draft.cover}
        </div>
        <h2 className="font-display text-hi text-2xl mb-1" style={{ fontWeight: 600 }}>
          Published
        </h2>
        <p className="text-mid text-sm mb-6">Your mixtape is live. Share the link below.</p>

        <div className="panel2 rounded-2xl py-4 px-4 mb-4">
          <p className="font-mono text-hi text-base tracking-wide">{link}</p>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={copy} className="btn-ghost flex-1 rounded-full py-2.5 text-xs flex items-center justify-center gap-1.5">
            <Copy size={13} /> Copy
          </button>
          <button onClick={share} className="btn-ghost flex-1 rounded-full py-2.5 text-xs flex items-center justify-center gap-1.5">
            <Share2 size={13} /> Share
          </button>
          <button onClick={() => setShowQr((v) => !v)} className="btn-ghost flex-1 rounded-full py-2.5 text-xs flex items-center justify-center gap-1.5">
            <QrCode size={13} /> QR
          </button>
        </div>

        {showQr && (
          <div className="flex flex-col items-center mb-4">
            <canvas ref={canvasRef} width={168} height={168} className="rounded-xl" />
            <p className="text-low text-[10px] font-mono mt-2 uppercase tracking-wide">QR code</p>
          </div>
        )}

        <div className="flex flex-col gap-2 mt-2">
          <button onClick={onPreview} className="btn-amber rounded-full py-3 text-sm">
            Preview Public Page
          </button>
          <button onClick={onDashboard} className="btn-ghost rounded-full py-3 text-sm">
            Back to Dashboard
          </button>
        </div>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  Public player                                                       */
/* ------------------------------------------------------------------ */

function PublicPlayer({ mixtape, passwordUnlocked, pwInput, setPwInput, onUnlock, onBack }) {
  const [playingIndex, setPlayingIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);
  const [activeSide, setActiveSide] = useState("A");

  useEffect(() => {
    if (playingIndex !== null) {
      const side = playingIndex <= 2 ? "A" : "B";
      setActiveSide(side);
    }
  }, [playingIndex]);

  useEffect(() => {
    setPlayingIndex(null);
    setIsPlaying(false);
    setCurrentTime(0);
  }, [mixtape?.code]);

  useEffect(() => {
    if (audioRef.current) {
      applyWowFlutter(audioRef.current);
    }
  }, [audioRef.current]);

  if (!mixtape) {
    return (
      <Shell>
        <BackBar onBack={onBack} />
        <div className="card rounded-3xl p-8 text-center text-mid text-sm">Mixtape not found.</div>
      </Shell>
    );
  }

  const clips = mixtape.clips || [];
  const clip = playingIndex !== null ? clips[playingIndex] : null;

  function playFrom(i) {
    playTapeClick("heavy");
    setPlayingIndex(i);
    setIsPlaying(true);
  }
  function togglePlayAll() {
    playTapeClick("heavy");
    if (playingIndex === null) playFrom(0);
    else setIsPlaying((p) => !p);
  }
  function onEnded() {
    if (playingIndex !== null && playingIndex + 1 < clips.length) {
      setPlayingIndex(playingIndex + 1);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }
  function seek(e) {
    playTapeClick("light");
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audio.currentTime = pct * audio.duration;
  }

  const progressPct = clip && audioRef.current?.duration ? (currentTime / audioRef.current.duration) * 100 : 0;

  const totalDur = totalDuration(clips);
  const elapsedBefore = playingIndex !== null ? clips.slice(0, playingIndex).reduce((sum, c) => sum + (c.duration || 0), 0) : 0;
  const totalElapsed = elapsedBefore + currentTime;
  const overallProgress = totalDur ? totalElapsed / totalDur : 0;

  if (!passwordUnlocked) {
    return (
      <Shell>
        <BackBar onBack={onBack} />
        <div className="card rounded-3xl p-8 text-center">
          <Lock size={22} className="mx-auto mb-4 text-mid" />
          <h2 className="font-display text-hi text-xl mb-2" style={{ fontWeight: 600 }}>
            Password protected
          </h2>
          <p className="text-mid text-xs mb-5">This mixtape needs a password to play.</p>
          <input
            type="password"
            value={pwInput}
            onChange={(e) => setPwInput(e.target.value)}
            placeholder="Enter password"
            className="w-full rounded-xl px-4 py-2.5 text-sm mb-3 text-center"
          />
          <button onClick={onUnlock} className="btn-amber w-full rounded-full py-3 text-sm">
            Unlock
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell wide>
      <BackBar onBack={onBack} />
      <div className="card rounded-3xl p-8">
        <div className="cassette-flip-container mx-auto">
          <div className={`cassette-flipper ${activeSide === "B" ? "flipped" : ""}`}>
            <div className="cassette-front">
              <CassetteTape
                title={mixtape.title}
                themeColor={mixtape.theme}
                isSpinning={isPlaying && activeSide === "A"}
                progress={overallProgress}
                stickerFont={mixtape.stickerFont}
                side="A"
              />
            </div>
            <div className="cassette-back">
              <CassetteTape
                title={mixtape.title}
                themeColor={mixtape.theme}
                isSpinning={isPlaying && activeSide === "B"}
                progress={overallProgress}
                stickerFont={mixtape.stickerFont}
                side="B"
              />
            </div>
          </div>
        </div>
        <h1 className="font-display text-hi text-2xl text-center mb-1" style={{ fontWeight: 600 }}>
          {mixtape.title}
        </h1>
        <p className="text-mid text-sm text-center mb-5">by {mixtape.author}</p>

        <div className="flex items-center justify-center gap-4 text-[11px] font-mono text-low mb-6">
          <span>{clips.length} Clips</span>
          <span>·</span>
          <span>{formatTime(totalDuration(clips))}</span>
          <span>·</span>
          <span>{formatDate(mixtape.createdAt)}</span>
          <span>·</span>
          <span style={{ color: mixtape.theme }}>{mixtape.plays || 0} Plays</span>
        </div>

        {/* player */}
        <div className="panel2 rounded-2xl p-5 mb-6">
          <audio
            ref={audioRef}
            src={clip?.audioDataUrl}
            autoPlay={isPlaying}
            onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
            onEnded={onEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => playingIndex > 0 && playFrom(playingIndex - 1)}
              disabled={!playingIndex}
              className="text-mid disabled:opacity-30"
            >
              <SkipBack size={18} />
            </button>
            <button
              onClick={togglePlayAll}
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: mixtape.theme }}
            >
              {isPlaying ? (
                <Pause size={22} color="var(--ink)" fill="var(--ink)" />
              ) : (
                <Play size={22} color="var(--ink)" fill="var(--ink)" style={{ marginLeft: 2 }} />
              )}
            </button>
            <button
              onClick={() => playingIndex !== null && playingIndex + 1 < clips.length && playFrom(playingIndex + 1)}
              disabled={playingIndex === null || playingIndex + 1 >= clips.length}
              className="text-mid disabled:opacity-30"
            >
              <SkipForward size={18} />
            </button>
          </div>

          <div onClick={seek} className="h-1.5 rounded-full mb-2 cursor-pointer" style={{ background: "var(--border)" }}>
            <div
              className="h-1.5 rounded-full"
              style={{ width: `${progressPct}%`, background: mixtape.theme, transition: "width .1s linear" }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-mono text-low">
            <span>{formatTime(currentTime)}</span>
            <span>{clip ? formatTime(clip.duration) : formatTime(totalDuration(clips))}</span>
          </div>
          {clip && (
            <p className="text-center text-hi text-xs mt-3">
              {playingIndex + 1}. {clip.title}
            </p>
          )}
        </div>

        {/* Side Selector Tabs */}
        {clips.length > 3 && (
          <div className="flex justify-center gap-3 mb-4">
            <button
              onClick={() => { playTapeClick("light"); setActiveSide("A"); }}
              className="rounded-full px-4 py-1.5 text-xs font-mono font-semibold uppercase tracking-wider transition border-none"
              style={{
                background: activeSide === "A" ? mixtape.theme : "var(--panel2)",
                color: activeSide === "A" ? "var(--ink)" : "var(--text-mid)",
                border: activeSide === "A" ? `1px solid ${mixtape.theme}` : "1px solid var(--border)",
              }}
            >
              Side A (Clips 1-3)
            </button>
            <button
              onClick={() => { playTapeClick("light"); setActiveSide("B"); }}
              className="rounded-full px-4 py-1.5 text-xs font-mono font-semibold uppercase tracking-wider transition border-none"
              style={{
                background: activeSide === "B" ? mixtape.theme : "var(--panel2)",
                color: activeSide === "B" ? "var(--ink)" : "var(--text-mid)",
                border: activeSide === "B" ? `1px solid ${mixtape.theme}` : "1px solid var(--border)",
              }}
            >
              Side B (Clips 4-5)
            </button>
          </div>
        )}

        {/* clip list */}
        <div className="space-y-2">
          {(clips.length > 3 ? (activeSide === "A" ? clips.slice(0, 3) : clips.slice(3)) : clips).map((c) => {
            const globalIndex = clips.findIndex((cc) => cc.id === c.id);
            return (
              <button
                key={c.id}
                onClick={() => playFrom(globalIndex)}
                className="w-full flex flex-col items-center justify-center gap-2 rounded-xl px-4 py-3 text-center"
                style={{
                  background: playingIndex === globalIndex ? mixtape.theme + "1a" : "var(--panel2)",
                  border: playingIndex === globalIndex ? `1px solid ${mixtape.theme}` : "1px solid var(--border)",
                }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: playingIndex === globalIndex && isPlaying ? mixtape.theme : "var(--border)" }}
                >
                  {playingIndex === globalIndex && isPlaying ? (
                    <Pause size={11} color="var(--ink)" fill="var(--ink)" />
                  ) : (
                    <Play size={11} color={playingIndex === globalIndex ? "var(--ink)" : "var(--text-mid)"} fill={playingIndex === globalIndex ? "var(--ink)" : "none"} />
                  )}
                </div>
                <span className="text-sm text-hi truncate font-medium">{c.title}</span>
                <span className="text-xs font-mono text-low">{formatTime(c.duration)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  Settings                                                            */
/* ------------------------------------------------------------------ */

function Settings({ user, setUser, onBack, onSignOut }) {
  const [name, setName] = useState(user?.name || "");
  return (
    <Shell>
      <BackBar onBack={onBack} title="Settings" />
      <div className="card rounded-3xl p-8 text-center">
        <p className="text-xs text-low font-mono uppercase tracking-wide mb-2 text-center">Display name</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setUser((u) => ({ ...u, name: name.trim() || "You" }))}
          className="w-full rounded-xl px-4 py-3 text-sm mb-8 text-center"
        />
        <button
          onClick={onSignOut}
          className="btn-ghost w-full rounded-full py-3 text-sm flex items-center justify-center gap-2"
          style={{ color: "var(--coral)" }}
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </Shell>
  );
}
