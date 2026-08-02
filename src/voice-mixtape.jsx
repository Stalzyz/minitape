import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Mic, Square, Play, Pause, SkipForward, SkipBack, Copy, Share2, QrCode,
  Trash2, RotateCcw, ChevronRight, Settings as SettingsIcon, Plus, Link2,
  Lock, Globe, EyeOff, GripVertical, Check, ArrowLeft, LogOut, X, Edit,
  Headphones, Sparkles, Heart, Sun, Moon, Music, Smile, Disc, Shield, Search, Users
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

const PROFANITY_LIST = [
  // English
  "fuck", "shit", "bitch", "asshole", "bastard", "cunt", "dick", "pussy", "whore", "slut", "motherfucker",
  // Spanish
  "mierda", "puta", "puto", "cabron", "maricon", "joder", "coño",
  // French
  "merde", "putain", "salope", "connard", "chier",
  // Hindi / Urdu / Punjabi
  "chutiya", "madarchod", "behenchod", "bhadwa", "gaand", "laund", "loda", "kamine", "harami", "saala",
  // Tamil / Malayalam / Telugu
  "oolu", "punda", "sunni", "thevadiya", "poolu", "munda", "lanja"
];

function containsProfanity(text) {
  if (!text) return false;
  const cleanText = text.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, " ");
  const words = cleanText.split(/\s+/);
  return words.some(word => 
    PROFANITY_LIST.some(profane => {
      if (word === profane) return true;
      if (profane.length > 3 && word.includes(profane)) return true;
      return false;
    })
  );
}

const COVERS = ["Mic", "Headphones", "Sparkles", "Heart", "Sun", "Moon", "Music", "Smile"];

const iconMap = {
  Mic: Mic,
  Headphones: Headphones,
  Sparkles: Sparkles,
  Heart: Heart,
  Sun: Sun,
  Moon: Moon,
  Music: Music,
  Smile: Smile
};

function CoverIcon({ name, size = 20, className = "", style = {} }) {
  const IconComponent = iconMap[name];
  if (!IconComponent) {
    return <span className={className} style={{ fontSize: size - 4, display: "inline-flex", alignItems: "center", justifyContent: "center", ...style }}>{name || "🎧"}</span>;
  }
  return <IconComponent size={size} className={className} style={style} />;
}
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
function getInboxCode(email) {
  if (!email) return "";
  let hash = 0;
  const cleanEmail = email.trim().toLowerCase();
  for (let i = 0; i < cleanEmail.length; i++) {
    hash = cleanEmail.charCodeAt(i) + ((hash << 5) - hash);
  }
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  let temp = Math.abs(hash);
  for (let i = 0; i < 6; i++) {
    code += chars[temp % chars.length];
    temp = Math.floor(temp / chars.length);
  }
  return code;
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
    } else if (type === "eject") {
      // Mechanical slide + eject sound
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(60, now);
      osc.frequency.linearRampToValueAtTime(20, now + 0.25);
      
      gainNode.gain.setValueAtTime(0.08, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.25);
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
    
    // Automatically resume suspended AudioContext on play events to unmute audio output
    const resumeCtx = () => {
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
    };
    audioElement.addEventListener("play", resumeCtx);
    audioElement.addEventListener("playing", resumeCtx);
    audioElement.addEventListener("canplay", resumeCtx);

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
    if (window.storage?.get) {
      const r = await window.storage.get(key, shared);
      return r ? r.value : null;
    }
    return localStorage.getItem(key);
  } catch {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
}

async function storageSet(key, value, shared = false) {
  try {
    if (window.storage?.set) {
      await window.storage.set(key, value, shared);
      return true;
    }
    localStorage.setItem(key, value);
    return true;
  } catch {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
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

function Shell({ children, wide, onShowTerms }) {
  return (
    <div
      style={{ fontFamily: "Inter, sans-serif" }}
      className="min-h-screen w-full flex flex-col items-center justify-center py-10 px-4 bg-grid"
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
          width: 100%;
          max-width: 280px;
          aspect-ratio: 300 / 190;
        }

        /* Strict mobile viewport optimizations to avoid scrolling and overflow */
        @media (max-width: 480px) {
          .cassette-flip-container {
            max-width: 210px !important;
            margin-bottom: 1rem !important;
          }
          .vu-meter {
            height: 110px !important;
            width: 8px !important;
            gap: 1.5px !important;
          }
          .card {
            padding: 1.25rem !important;
            border-radius: 1.5rem !important;
          }
          .min-h-screen {
            padding-top: 1rem !important;
            padding-bottom: 1rem !important;
          }
          .record-btn {
            width: 76px !important;
            height: 76px !important;
          }
          .btn-amber, .btn-ghost {
            padding-top: 0.65rem !important;
            padding-bottom: 0.65rem !important;
          }
          .text-3xl {
            font-size: 1.5rem !important;
            line-height: 1.875rem !important;
          }
          .text-2xl {
            font-size: 1.25rem !important;
            line-height: 1.625rem !important;
          }
          .mb-8 {
            margin-bottom: 1.25rem !important;
          }
          .mb-6 {
            margin-bottom: 1rem !important;
          }
          .mt-8 {
            margin-top: 1.25rem !important;
          }
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
        
        .font-display{ font-family:'Fraunces', serif; letter-spacing: -0.01em; }
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
        .play-tape-large-btn {
          width: 110px !important;
          height: 110px !important;
          border-radius: 9999px !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 6px !important;
          border: none !important;
          cursor: pointer !important;
          padding: 0 !important;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 16px -6px rgba(0, 0, 0, 0.05) !important;
        }
        .play-tape-large-btn:hover {
          transform: scale(1.04);
        }
        .play-tape-large-btn:active {
          transform: scale(0.96);
        }
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

        /* Awwwards View Transitions */
        ::view-transition-group(root) {
          animation: 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes slide-to-left {
          to { transform: translateX(-15%); opacity: 0; filter: blur(3px); }
        }
        @keyframes slide-from-right {
          from { transform: translateX(15%); opacity: 0; filter: blur(3px); }
        }
        @keyframes slide-to-right {
          to { transform: translateX(15%); opacity: 0; filter: blur(3px); }
        }
        @keyframes slide-from-left {
          from { transform: translateX(-15%); opacity: 0; filter: blur(3px); }
        }
        html:active-view-transition-type(forward)::view-transition-old(root) {
          animation-name: slide-to-left;
        }
        html:active-view-transition-type(forward)::view-transition-new(root) {
          animation-name: slide-from-right;
        }
        html:active-view-transition-type(backward)::view-transition-old(root) {
          animation-name: slide-to-right;
        }
        html:active-view-transition-type(backward)::view-transition-new(root) {
          animation-name: slide-from-left;
        }
        @media (prefers-reduced-motion: reduce) {
          ::view-transition-group(root) {
            animation: none !important;
          }
        }
      `}</style>
      <div className={`w-full ${wide ? "max-w-md" : "max-w-sm"} fade-in flex flex-col justify-center`}>{children}</div>
      {onShowTerms && (
        <div className="mt-8 text-center shrink-0">
          <button
            onClick={onShowTerms}
            className="text-[11px] font-mono text-low hover:text-mid cursor-pointer bg-transparent border-none underline"
          >
            Terms & Privacy Policy
          </button>
        </div>
      )}
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

  const containerRef = useRef(null);
  const glareRef = useRef(null);

  function handleMouseMove(e) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rotateY = ((x / rect.width) - 0.5) * 16;
    const rotateX = ((y / rect.height) - 0.5) * -16;

    el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

    if (glareRef.current) {
      glareRef.current.style.opacity = "0.15";
      glareRef.current.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 65%)`;
    }
  }

  function handleMouseLeave() {
    const el = containerRef.current;
    if (!el) return;
    el.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
    if (glareRef.current) {
      glareRef.current.style.opacity = "0";
    }
  }

  let fontClass = "font-felt";
  if (stickerFont === "Felt-Tip") fontClass = "font-felt";
  else if (stickerFont === "Retro Typewriter") fontClass = "font-typewriter";
  else if (stickerFont === "Ink Marker") fontClass = "font-marker";
  else if (stickerFont === "Clean Script") fontClass = "font-script";

  return (
    <div className="relative mx-auto select-none" style={{ width: "100%", height: "100%", perspective: "800px" }}>
      <style>{`
        @keyframes cassette-spin-cw {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spinning-reel {
          animation: cassette-spin-cw 4s linear infinite;
          transition: animation-duration 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        @keyframes spool-wobble {
          0% { transform: translate(-0.3px, -0.3px); }
          100% { transform: translate(0.3px, 0.3px); }
        }
        .wobbling {
          animation: spool-wobble 0.08s infinite alternate ease-in-out;
        }
      `}</style>

      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full h-full relative"
        style={{
          transition: "transform 0.1s ease-out",
          transformStyle: "preserve-3d"
        }}
      >
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
          <g style={{ transformOrigin: '112px 79px', animationDuration: isSpinning ? '4s' : '99999s' }} className={`spinning-reel ${isSpinning ? 'wobbling' : ''}`}>
            <circle cx="112" cy="79" r="13" fill="var(--paper)" stroke="var(--text-low)" strokeWidth="1" />
            <circle cx="112" cy="79" r="6" fill="var(--ink)" />
            <line x1="112" y1="67" x2="112" y2="91" stroke="var(--text-low)" strokeWidth="2.5" />
            <line x1="101" y1="73" x2="123" y2="85" stroke="var(--text-low)" strokeWidth="2.5" />
            <line x1="101" y1="85" x2="123" y2="73" stroke="var(--text-low)" strokeWidth="2.5" />
          </g>

          {/* Right Gear Spool */}
          <g style={{ transformOrigin: '188px 79px', animationDuration: isSpinning ? '4s' : '99999s' }} className={`spinning-reel ${isSpinning ? 'wobbling' : ''}`}>
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

        {/* Reflection Glare Overlay */}
        <div
          ref={glareRef}
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            opacity: 0,
            transition: "opacity 0.25s ease-out",
            mixBlendMode: "overlay",
            zIndex: 10
          }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  main app                                                            */
/* ------------------------------------------------------------------ */

export default function VoiceMixtapeApp() {
  const [view, setViewRaw] = useState("landing");

  const setView = useCallback((nextView) => {
    const update = () => {
      setViewRaw(nextView);
      localStorage.setItem("minitape_view", nextView);
    };
    if (!document.startViewTransition) {
      update();
      return;
    }
    const backwardsViews = ["dashboard", "landing"];
    const isBack = backwardsViews.includes(nextView) || nextView === "terms";
    const direction = isBack ? "backward" : "forward";

    try {
      const transition = document.startViewTransition({
        update,
        types: [direction]
      });
      transition.ready.catch(() => {});
      transition.finished.catch(() => {});
    } catch (e) {
      update();
    }
  }, []);

  const [user, setUser] = useState(null);

  // Restore user session and view state on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("minitape_user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
      const isDeepLink = window.location.pathname.startsWith("/m/") || window.location.pathname.startsWith("/inbox/");
      if (!isDeepLink) {
        const savedView = localStorage.getItem("minitape_view");
        if (savedView) {
          setViewRaw(savedView);
        }
      }
    } catch (e) {
      console.error("Failed to restore state on mount:", e);
    }
  }, []);

  // Sync user changes to localStorage
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem("minitape_user", JSON.stringify(user));
      } else {
        localStorage.removeItem("minitape_user");
        localStorage.removeItem("minitape_view");
      }
    } catch (e) {}
  }, [user]);
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
  const [autoPlayPublic, setAutoPlayPublic] = useState(false);

  // Anonymous Inbox States
  const [inboxCode, setInboxCode] = useState("");
  const [inboxRecipient, setInboxRecipient] = useState("");
  const [inboxNotes, setInboxNotes] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [activeTab, setActiveTab] = useState("tapes"); // tapes | inbox
  const [prevView, setPrevView] = useState("landing");
  const [editingCode, setEditingCode] = useState(null);
  const [hasBackup, setHasBackup] = useState(false);

  // Check for unsaved draft backup on mount
  useEffect(() => {
    try {
      const backup = localStorage.getItem("mixtape_draft_backup");
      if (backup) {
        const d = JSON.parse(backup);
        if (d && d.clips && d.clips.length > 0) {
          setHasBackup(true);
        }
      }
    } catch (e) {}
  }, []);

  // Autosave draft when it changes
  useEffect(() => {
    if (draft && draft.clips && draft.clips.length > 0) {
      localStorage.setItem("mixtape_draft_backup", JSON.stringify(draft));
    }
  }, [draft]);

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

  // URL deep-link: handle /m/CODE and /inbox/CODE on initial load and browser back/forward
  useEffect(() => {
    async function handlePath(pathname, hash) {
      const inboxMatch = pathname.match(/^\/inbox\/([A-Z0-9]+)$/i);
      if (inboxMatch) {
        const code = inboxMatch[1].toUpperCase();
        setInboxCode(code);
        try {
          const res = await fetch(`/shares/inbox_names/${code}.json`);
          if (res.ok) {
            const data = await res.json();
            setInboxRecipient(data.name);
          } else {
            setInboxRecipient("Someone");
          }
        } catch {
          setInboxRecipient("Someone");
        }
        setView("inbox-send");
        return;
      }

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
    localStorage.removeItem("mixtape_draft_backup");
    setDraft(blankDraft());
    setClipIndex(0);
    setView("record");
  }

  function handleRestoreDraft() {
    playTapeClick("heavy");
    try {
      const backup = localStorage.getItem("mixtape_draft_backup");
      if (backup) {
        const d = JSON.parse(backup);
        setDraft(d);
        setClipIndex(d.clips.length);
        setView("builder");
        setHasBackup(false);
        flash("Draft restored!");
      }
    } catch (e) {
      console.error("Draft restore failed:", e);
    }
  }

  function handleEditMixtape(mixtape) {
    playTapeClick("heavy");
    setEditingCode(mixtape.code);
    setDraft({
      id: mixtape.id,
      title: mixtape.title,
      cover: mixtape.cover || COVERS[0],
      theme: mixtape.theme || THEMES[0],
      stickerFont: mixtape.stickerFont || "Felt-Tip",
      privacy: mixtape.privacy || "public",
      password: mixtape.password || "",
      description: mixtape.description || "",
      clips: mixtape.clips || [],
    });
    setClipIndex(mixtape.clips.length);
    setView("builder");
  }

  async function publishMixtape(finalDraft) {
    const code = editingCode || genCode();
    const mixtape = {
      ...finalDraft,
      code,
      author: user?.name || "Anonymous",
      createdAt: finalDraft.createdAt || new Date().toISOString(),
      plays: finalDraft.plays || 0,
    };
    try {
      await storageSet(`mixtape:${mixtape.id}`, JSON.stringify(mixtape));
      await storageSet(`public:${code}`, JSON.stringify(mixtape), true);
      
      const idsRaw = await storageGet("user-mixtape-ids");
      const ids = idsRaw ? JSON.parse(idsRaw) : [];
      if (!ids.includes(mixtape.id)) {
        ids.unshift(mixtape.id);
        await storageSet("user-mixtape-ids", JSON.stringify(ids));
      }
      
      setMixtapes((prev) => {
        const filtered = prev.filter((m) => m.id !== mixtape.id);
        return [mixtape, ...filtered];
      });
      setLastCode(code);
      setEditingCode(null);

      // Save to VPS static storage backend API
      try {
        await fetch("/api/mixtape", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mixtape),
        });
      } catch (err) {
        console.error("Failed to sync with server:", err);
      }

      // Build clean short share URL
      const shareUrl = `https://minitape.grafty.pro/m/${code}`;
      setLastShareUrl(shareUrl);
      localStorage.removeItem("mixtape_draft_backup");
      setView("share");
    } catch (e) {
      flash("Couldn't publish — try again");
    }
  }

  async function deleteMixtape(code, id) {
    if (!window.confirm("Are you sure you want to delete this mixtape? This will deactivate its shared link permanently.")) {
      return;
    }
    playTapeClick("light");
    try {
      // 1. Remove locally
      localStorage.removeItem(`mixtape:${id}`);
      localStorage.removeItem(`public:${code}`);

      const idsRaw = await storageGet("user-mixtape-ids");
      const ids = idsRaw ? JSON.parse(idsRaw) : [];
      const newIds = ids.filter((x) => x !== id);
      await storageSet("user-mixtape-ids", JSON.stringify(newIds));

      setMixtapes((prev) => prev.filter((m) => m.id !== id));

      // 2. Call server DELETE API
      await fetch(`/api/mixtape/${code}`, {
        method: "DELETE",
      });

      flash("Mixtape deleted");
      window.history.pushState({}, "", "/");
      setView(user ? "dashboard" : "landing");
    } catch (e) {
      console.error(e);
      flash("Failed to delete mixtape");
    }
  }

  async function openByCode(raw) {
    const code = (raw || "").trim().toUpperCase();
    if (!code) return;
    playTapeClick("heavy");
    setPublicError("");

    let m;
    // 1. Try local storage first
    const found = await storageGet(`public:${code}`, true);
    if (found) {
      try {
        m = JSON.parse(found);
      } catch (e) {}
    }

    // 2. Fallback: Fetch from VPS shares folder
    if (!m) {
      try {
        const response = await fetch(`/shares/${code}.json`);
        if (response.ok) {
          m = await response.json();
        }
      } catch (e) {
        console.error("Error fetching mixtape from VPS:", e);
      }
    }

    if (!m) {
      setPublicError("No mixtape found for that code.");
      return;
    }

    m.plays = (m.plays || 0) + 1;
    storageSet(`public:${code}`, JSON.stringify(m), true).catch(() => {});
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
          onShowTerms={() => { setPrevView("landing"); setView("terms"); }}
        />
      )}
      {view === "login" && (
        <Login
          onDone={(u) => {
            playTapeClick("heavy");
            setUser(u);
            setView("dashboard");
            const code = getInboxCode(u.email);
            fetch("/api/inbox/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code, name: u.name, email: u.email })
            }).catch(e => console.error("Inbox registration failed:", e));
          }}
          onBack={() => { playTapeClick("light"); setView("landing"); }}
          onShowTerms={() => { setPrevView("login"); setView("terms"); }}
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
          onShowTerms={() => { setPrevView("dashboard"); setView("terms"); }}
          hasBackup={hasBackup}
          onRestoreDraft={handleRestoreDraft}
          onAdmin={() => { playTapeClick("light"); setView("admin"); }}
          isAdmin={user && ['stalinkumar18@gmail.com', 'team@grafty.pro'].includes(user.email)}
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
            if (pwInput === publicMixtape?.password) {
              setPasswordUnlocked(true);
              setView("public-intro");
            } else {
              flash("Wrong password");
            }
          }}
          onBack={() => {
            playTapeClick("light");
            window.history.pushState({}, "", "/");
            setView(user ? "dashboard" : "landing");
          }}
          autoPlayOnMount={autoPlayPublic}
          user={user}
          onEdit={() => handleEditMixtape(publicMixtape)}
          onImport={async () => {
            await storageSet(`mixtape:${publicMixtape.id}`, JSON.stringify(publicMixtape));
            const idsRaw = await storageGet("user-mixtape-ids");
            const ids = idsRaw ? JSON.parse(idsRaw) : [];
            if (!ids.includes(publicMixtape.id)) {
              ids.unshift(publicMixtape.id);
              await storageSet("user-mixtape-ids", JSON.stringify(ids));
            }
            loadMyMixtapes();
            flash("Imported to Dashboard!");
          }}
          isImported={mixtapes.some((m) => m.id === publicMixtape?.id)}
          onDelete={() => deleteMixtape(publicMixtape.code, publicMixtape.id)}
        />
      )}
      {view === "public-intro" && (
        <PublicIntro
          mixtape={publicMixtape}
          onPlay={() => {
            playTapeClick("heavy");
            setAutoPlayPublic(true);
            setView("public");
          }}
        />
      )}
      {view === "loading-public" && (
        <Shell>
          <div className="card rounded-3xl p-8 text-center flex flex-col items-center justify-center">
            <div className="animate-spin mb-4" style={{ color: "var(--amber)" }}>
              <Disc size={36} />
            </div>
            <p className="text-mid text-sm font-mono">Loading mixtape...</p>
          </div>
        </Shell>
      )}
      {view === "error-public" && (
        <Shell>
          <div className="card rounded-3xl p-8 text-center">
            <Lock size={22} className="mx-auto mb-4 text-coral" />
            <h2 className="font-display text-hi text-xl mb-2" style={{ fontWeight: 600 }}>
              Mixtape not found
            </h2>
            <p className="text-mid text-xs mb-6">
              The mixtape link might be broken or expired.
            </p>
            <button
              onClick={() => {
                window.history.pushState({}, "", "/");
                setView("landing");
              }}
              className="btn-amber w-full rounded-full py-3 text-sm"
            >
              Go to Home Page
            </button>
          </div>
        </Shell>
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
      {view === "admin" && (
        <AdminPanel
          user={user}
          onBack={() => { playTapeClick("light"); setView("dashboard"); }}
          flash={flash}
        />
      )}
      {view === "inbox-send" && (
        <InboxSend
          recipientName={inboxRecipient}
          inboxCode={inboxCode}
          onBack={() => {
            playTapeClick("light");
            window.history.pushState({}, "", "/");
            setView(user ? "dashboard" : "landing");
          }}
        />
      )}
      {view === "terms" && (
        <TermsAndPrivacy
          onBack={() => {
            playTapeClick("light");
            setView(prevView);
          }}
        />
      )}
      <Toast toast={toast} />
    </>
  );
}

/*  Public Intro / direct-play page                                     */
/* ------------------------------------------------------------------ */

function PublicIntro({ mixtape, onPlay }) {
  return (
    <Shell>
      <div className="card rounded-3xl p-8 text-center flex flex-col items-center justify-center">
        <div
          className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
          style={{ background: mixtape.theme + "22", border: `1px solid ${mixtape.theme}` }}
        >
          <CoverIcon name={mixtape.cover} size={28} style={{ color: mixtape.theme }} />
        </div>

        <p className="text-xs text-low font-mono uppercase tracking-wider mb-2">Mixtape Received</p>
        
        <h1 className="font-display text-hi text-2xl mb-1" style={{ fontWeight: 700 }}>
          {mixtape.title}
        </h1>
        <p className="text-mid text-sm mb-8">by {mixtape.author}</p>

        <button
          onClick={onPlay}
          className="play-tape-large-btn mx-auto"
          style={{ background: mixtape.theme, color: "var(--ink)" }}
        >
          <Play size={32} fill="var(--ink)" className="ml-1" style={{ color: "var(--ink)" }} />
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest" style={{ color: "var(--ink)" }}>Play Tape</span>
        </button>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  Landing                                                             */
/* ------------------------------------------------------------------ */

function Landing({ onLogin, onShowTerms }) {
  return (
    <Shell onShowTerms={onShowTerms}>
      <div className="card rounded-3xl p-8 text-center">
        <div className="cassette-flip-container mx-auto">
          <CassetteTape
            title="MINITAPE"
            themeColor="var(--amber)"
            isSpinning={false}
            progress={0.25}
          />
        </div>
        <h1 className="font-display text-hi text-3xl leading-tight mb-3" style={{ fontWeight: 600 }}>
          Record your voice.
        </h1>
        <p className="text-mid text-sm mb-8 leading-relaxed">
          Create a voice mixtape in under 2 minutes.
        </p>
        <button onClick={onLogin} className="btn-amber w-full rounded-full py-3 text-sm">
          Login
        </button>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  Login                                                                */
/* ------------------------------------------------------------------ */

function Login({ onDone, onBack, title = "Welcome", description = "Sign in to start recording.", onShowTerms }) {
  const googleBtnRef = useRef(null);
  const [showCreds, setShowCreds] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    function parseJwt(token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
      } catch (e) {
        return null;
      }
    }

    const handleCredentialResponse = (response) => {
      const payload = parseJwt(response.credential);
      if (payload) {
        onDone({
          name: payload.name || payload.given_name || "Google User",
          email: payload.email,
          picture: payload.picture,
          provider: "google"
        });
      }
    };

    const initGoogleSignIn = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: "925137694503-tqfil9ug38o8h6qbo6du6jsucf5fsneq.apps.googleusercontent.com",
          callback: handleCredentialResponse
        });
        if (googleBtnRef.current) {
          window.google.accounts.id.renderButton(
            googleBtnRef.current,
            { theme: "outline", size: "large", width: 280, shape: "pill" }
          );
        }
      }
    };

    if (window.google?.accounts?.id) {
      initGoogleSignIn();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          initGoogleSignIn();
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [onDone]);

  const handleCredLogin = (e) => {
    e.preventDefault();
    setError("");
    const trimmedEmail = email.trim().toLowerCase();
    if ((trimmedEmail === "stalinkumar18@gmail.com" || trimmedEmail === "team@grafty.pro") && password === "MInitapeAdmin2026!") {
      onDone({
        name: trimmedEmail === "stalinkumar18@gmail.com" ? "Stalin Kumar" : "Grafty Team",
        email: trimmedEmail,
        picture: "",
        provider: "credentials"
      });
    } else {
      setError("Invalid administrative credentials");
    }
  };

  return (
    <Shell onShowTerms={onShowTerms}>
      <BackBar onBack={onBack} />
      <div className="card rounded-3xl p-8 flex flex-col items-center">
        <h2 className="font-display text-hi text-2xl mb-1 text-center" style={{ fontWeight: 600 }}>
          {title}
        </h2>
        <p className="text-mid text-sm mb-6 text-center leading-relaxed">{description}</p>

        {!showCreds ? (
          <div className="flex flex-col items-center gap-4 w-full">
            <div ref={googleBtnRef} className="w-full flex justify-center min-h-[44px]" />
            <button
              onClick={() => { playTapeClick("light"); setShowCreds(true); }}
              className="text-xs font-mono text-low hover:text-hi transition bg-transparent border-none cursor-pointer mt-2"
            >
              Sign in with credentials
            </button>
          </div>
        ) : (
          <form onSubmit={handleCredLogin} className="w-full space-y-4">
            <div>
              <p className="text-[10px] font-mono text-low uppercase tracking-wider mb-1 text-left w-full">Email Address</p>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl px-4 py-2.5 text-xs font-mono"
              />
            </div>
            <div>
              <p className="text-[10px] font-mono text-low uppercase tracking-wider mb-1 text-left w-full">Password</p>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl px-4 py-2.5 text-xs font-mono"
              />
            </div>

            {error && (
              <p className="text-xs font-mono text-center" style={{ color: "var(--coral)" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn-amber w-full rounded-full py-2.5 text-xs font-mono font-bold"
            >
              Verify & Enter
            </button>

            <button
              type="button"
              onClick={() => { playTapeClick("light"); setShowCreds(false); setError(""); }}
              className="text-[10px] font-mono text-low hover:text-hi transition w-full text-center bg-transparent border-none cursor-pointer mt-2"
            >
              Back to Google Sign In
            </button>
          </form>
        )}
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                           */
/* ------------------------------------------------------------------ */

function Dashboard({ user, mixtapes, loading, onNew, onOpenMixtape, onSettings, onCopy, codeInput, setCodeInput, onOpenCode, error, onShowTerms, hasBackup, onRestoreDraft, onAdmin, isAdmin }) {
  const [activeTab, setActiveTab] = useState("tapes"); // tapes | inbox
  const [inboxNotes, setInboxNotes] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [playingNoteId, setPlayingNoteId] = useState(null);
  const [notePlaying, setNotePlaying] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const noteAudioRef = useRef(null);

  const inboxCode = getInboxCode(user?.email);
  const seenCountKey = `seen_inbox_count:${inboxCode}`;
  const [seenCount, setSeenCount] = useState(() => {
    try {
      return parseInt(localStorage.getItem(seenCountKey) || "0", 10);
    } catch (e) {
      return 0;
    }
  });

  const fetchInbox = useCallback(async () => {
    if (!inboxCode) return;
    setLoadingInbox(true);
    try {
      const res = await fetch(`/shares/inbox/${inboxCode}.json?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        const list = data || [];
        setInboxNotes(list);
        if (activeTab === "inbox") {
          localStorage.setItem(seenCountKey, list.length.toString());
          setSeenCount(list.length);
        }
      } else {
        setInboxNotes([]);
      }
    } catch (e) {
      console.error(e);
      setInboxNotes([]);
    }
    setLoadingInbox(false);
  }, [inboxCode, activeTab, seenCountKey]);

  useEffect(() => {
    if (inboxCode) {
      fetchInbox();
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, [inboxCode, fetchInbox]);

  useEffect(() => {
    if (activeTab === "inbox" && inboxNotes.length !== seenCount) {
      localStorage.setItem(seenCountKey, inboxNotes.length.toString());
      setSeenCount(inboxNotes.length);
    }
  }, [activeTab, inboxNotes.length, seenCount, seenCountKey]);

  const unreadCount = Math.max(0, inboxNotes.length - seenCount);

  useEffect(() => {
    if (unreadCount > 0 && activeTab !== "inbox" && "Notification" in window && Notification.permission === "granted") {
      new Notification("New Voice Notes", {
        body: `You received ${unreadCount} new anonymous voice note${unreadCount > 1 ? "s" : ""}!`,
        icon: "/favicon.svg"
      });
    }
  }, [unreadCount, activeTab]);

  useEffect(() => {
    if (activeTab === "inbox") {
      fetchInbox();
    }
  }, [activeTab, fetchInbox]);

  function playNote(note) {
    if (playingNoteId === note.id) {
      if (notePlaying) {
        noteAudioRef.current?.pause();
        setNotePlaying(false);
      } else {
        noteAudioRef.current?.play();
        setNotePlaying(true);
      }
    } else {
      setPlayingNoteId(note.id);
      setNotePlaying(true);
      if (noteAudioRef.current) {
        noteAudioRef.current.src = note.audioDataUrl;
        noteAudioRef.current.play().catch(e => console.error(e));
      }
    }
  }

  function handleCopyInbox() {
    playTapeClick("light");
    navigator.clipboard.writeText(`https://minitape.grafty.pro/inbox/${inboxCode}`);
    alert("Inbox link copied!");
  }

  return (
    <Shell wide onShowTerms={onShowTerms}>
      <div className="flex flex-col items-center text-center mb-6 relative">
        {isAdmin && (
          <button onClick={onAdmin} className="btn-ghost rounded-full p-3 absolute left-0 top-1/2 -translate-y-1/2" title="Admin Panel">
            <Shield size={16} style={{ color: "var(--amber)" }} />
          </button>
        )}
        <p className="text-xs text-low font-mono uppercase tracking-wide">Hey</p>
        <h1 className="font-display text-hi text-2xl" style={{ fontWeight: 600 }}>
          {user?.name || "there"}
        </h1>
        <button onClick={onSettings} className="btn-ghost rounded-full p-3 absolute right-0 top-1/2 -translate-y-1/2">
          <SettingsIcon size={16} />
        </button>
      </div>

      {/* Unsaved Draft Restoration Banner */}
      {hasBackup && (
        <div className="card rounded-2xl p-4 mb-6 border-coral text-center flex flex-col items-center justify-center gap-2 bg-coral-light animate-pulse" style={{ borderColor: "var(--coral)", borderWidth: "1.5px" }}>
          <p className="text-xs text-hi font-medium">You have an unsaved voice note draft!</p>
          <button
            onClick={onRestoreDraft}
            className="btn-amber rounded-full px-4 py-2 text-xs font-mono font-bold"
          >
            Restore Draft
          </button>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex border-b mb-6" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={() => { playTapeClick("light"); setActiveTab("tapes"); }}
          className="flex-1 pb-3 text-xs font-mono font-bold uppercase tracking-wider transition bg-transparent border-none cursor-pointer"
          style={{
            color: activeTab === "tapes" ? "var(--amber)" : "var(--text-low)",
            borderBottom: activeTab === "tapes" ? "2px solid var(--amber)" : "none",
            outline: "none"
          }}
        >
          My Tapes
        </button>
        <button
          onClick={() => { playTapeClick("light"); setActiveTab("inbox"); }}
          className="flex-1 pb-3 text-xs font-mono font-bold uppercase tracking-wider transition bg-transparent border-none cursor-pointer flex items-center justify-center gap-1.5"
          style={{
            color: activeTab === "inbox" ? "var(--amber)" : "var(--text-low)",
            borderBottom: activeTab === "inbox" ? "2px solid var(--amber)" : "none",
            outline: "none"
          }}
        >
          <span>Anonymous Inbox</span>
          {unreadCount > 0 && (
            <span
              className="px-1.5 py-0.5 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-pulse"
              style={{ background: "var(--coral)", minWidth: "16px" }}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      <audio
        ref={noteAudioRef}
        onEnded={() => setNotePlaying(false)}
        className="hidden"
      />

      {activeTab === "tapes" ? (
        <>
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
                    <CoverIcon name={m.cover} size={20} style={{ color: m.theme }} />
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
        </>
      ) : (
        <div className="space-y-6">
          <div className="card rounded-2xl p-5 text-center flex flex-col items-center">
            <h3 className="text-xs text-low font-mono uppercase tracking-wide mb-3">Your Inbox Link</h3>
            <p className="text-xs text-hi font-mono bg-panel2 p-3 rounded-xl w-full border break-all mb-4 leading-normal">
              minitape.grafty.pro/inbox/{inboxCode}
            </p>
            <div className="flex gap-2 w-full">
              <button onClick={handleCopyInbox} className="btn-amber flex-1 rounded-full py-2.5 text-xs flex items-center justify-center gap-1.5">
                <Copy size={12} /> Copy Link
              </button>
              <button onClick={() => { playTapeClick("light"); setShowQR(!showQR); }} className="btn-ghost flex-1 rounded-full py-2.5 text-xs flex items-center justify-center gap-1.5">
                <QrCode size={12} /> {showQR ? "Hide QR" : "Show QR"}
              </button>
            </div>
          </div>

          {showQR && (
            <div className="card rounded-2xl p-5 text-center flex flex-col items-center fade-in">
              <p className="text-xs text-low font-mono uppercase tracking-wider mb-3">Scan to send Voice Note</p>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`https://minitape.grafty.pro/inbox/${inboxCode}`)}`}
                alt="Inbox QR Code"
                className="w-40 h-40 border p-2 rounded-xl bg-white shadow-sm"
              />
            </div>
          )}

          <div>
            <h3 className="text-xs text-low font-mono uppercase tracking-wide mb-3 text-center">Anonymous Voice Notes</h3>
            {loadingInbox && <p className="text-mid text-sm text-center">Loading notes...</p>}
            {!loadingInbox && inboxNotes.length === 0 && (
              <div className="card rounded-2xl p-6 text-center">
                <p className="text-mid text-sm">No notes received yet. Share your inbox link to start receiving voice notes!</p>
              </div>
            )}
            <div className="space-y-3">
              {inboxNotes.map((note) => (
                <div
                  key={note.id}
                  className="card rounded-2xl p-4 flex items-center justify-between gap-3 text-left border"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-hi text-sm font-medium truncate">{note.title}</p>
                    <p className="text-low text-[10px] font-mono mt-0.5">
                      {formatTime(note.duration)} · {formatDate(note.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => playNote(note)}
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "var(--panel2)", border: "1px solid var(--border)", cursor: "pointer" }}
                  >
                    {playingNoteId === note.id && notePlaying ? (
                      <Pause size={14} className="text-hi" />
                    ) : (
                      <Play size={14} className="text-hi" fill="currentColor" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
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
  const recognitionRef = useRef(null);
  const transcriptAccumulatorRef = useRef("");

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
      // Speech recognition initialization for Option B
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.continuous = true;
          rec.interimResults = false;
          transcriptAccumulatorRef.current = "";
          rec.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                transcriptAccumulatorRef.current += " " + event.results[i][0].transcript;
              }
            }
          };
          rec.start();
          recognitionRef.current = rec;
        } catch (e) {
          console.warn("Speech recognition error:", e);
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: { ideal: false },
          noiseSuppression: { ideal: false },
          autoGainControl: { ideal: false },
          sampleRate: { ideal: 48000 }
        }
      });
      streamRef.current = stream;

      let options = {};
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        options = { mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: 128000 };
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        options = { mimeType: "audio/mp4", audioBitsPerSecond: 128000 };
      } else if (MediaRecorder.isTypeSupported("audio/aac")) {
        options = { mimeType: "audio/aac", audioBitsPerSecond: 128000 };
      } else {
        options = { audioBitsPerSecond: 128000 };
      }

      const mr = new MediaRecorder(stream, options);
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
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    drawIdleBars();
    clearVUMeters();
  }

  function handleStop() {
    const transcript = (transcriptAccumulatorRef.current || "").toLowerCase().trim();
    if (containsProfanity(transcript)) {
      setRecError("Profanity or abusive content detected. Please keep MInitape friendly!");
      setRecordState("idle");
      clearVUMeters();
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
      return;
    }

    const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
    const blob = new Blob(chunksRef.current, { type: mimeType });
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

        <div className="flex items-center justify-center gap-2 mb-2">
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
                <CoverIcon name={c} size={16} style={{ color: draft.cover === c ? "var(--amber)" : "var(--text-mid)" }} />
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
              style={{ boxSizing: "border-box" }}
            />
          )}
        </div>

        <div>
          <p className="text-xs text-low font-mono uppercase tracking-wide mb-2 text-center">Dedication Message (Optional)</p>
          <textarea
            value={draft.description || ""}
            onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
            placeholder="Write a personal note or dedication..."
            className="w-full rounded-xl px-4 py-2.5 text-sm"
            style={{
              background: "var(--panel2)",
              border: "1px solid var(--border)",
              color: "var(--text-hi)",
              outline: "none",
              resize: "none",
              height: "72px",
              boxSizing: "border-box",
              fontFamily: "inherit"
            }}
            maxLength={180}
          />
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
        await navigator.share({ title: draft.title, text: `Listen to "${draft.title}"`, url: link });
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
          <CoverIcon name={draft.cover} size={24} style={{ color: draft.theme }} />
        </div>
        <h2 className="font-display text-hi text-2xl mb-1" style={{ fontWeight: 600 }}>
          Published
        </h2>
        <p className="text-mid text-sm mb-6">Your mixtape is live. Share the link below.</p>

        <div className="panel2 rounded-2xl py-3 px-3 mb-4" style={{ wordBreak: "break-all", overflowWrap: "anywhere" }}>
          <p className="font-mono text-hi text-sm tracking-wide text-center">
            https://minitape.grafty.pro/m/{code}
          </p>
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

function PublicPlayer({ mixtape, passwordUnlocked, pwInput, setPwInput, onUnlock, onBack, autoPlayOnMount, user, onEdit, onImport, isImported, onDelete }) {
  const [playingIndex, setPlayingIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(null);
  const [activeSide, setActiveSide] = useState("A");
  const [showJCard, setShowJCard] = useState(false);

  // Free Web Audio API resources when player unmounts
  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        if (audio.__audioCtx) {
          audio.__audioCtx.close().catch(() => {});
          audio.__audioCtx = null;
        }
        if (audio.__wowOsc) {
          try { audio.__wowOsc.stop(); } catch (e) {}
          audio.__wowOsc = null;
        }
        if (audio.__flutterOsc) {
          try { audio.__flutterOsc.stop(); } catch (e) {}
          audio.__flutterOsc = null;
        }
        audio.__wowFlutterInitialized = false;
      }
    };
  }, []);

  useEffect(() => {
    if (playingIndex !== null) {
      const side = playingIndex <= 2 ? "A" : "B";
      setActiveSide(side);
    }
  }, [playingIndex]);

  useEffect(() => {
    if (autoPlayOnMount && mixtape && mixtape.clips && mixtape.clips.length > 0) {
      setPlayingIndex(0);
      setIsPlaying(true);
    }
  }, [autoPlayOnMount, mixtape]);

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

    // Synchronously set src and call play to bypass iOS Safari autoplay restrictions
    const audio = audioRef.current;
    if (audio) {
      const targetClip = clips[i];
      if (targetClip) {
        audio.src = targetClip.audioDataUrl;
        audio.load();
        
        // Ensure Wow & Flutter filter is initialized
        applyWowFlutter(audio);

        // Resume AudioContext synchronously inside user interaction callback
        if (audio.__audioCtx) {
          audio.__audioCtx.resume().catch(() => {});
        }

        audio.play().catch((err) => {
          console.warn("Sync play failed:", err);
        });
      }
    }
  }
  function togglePlayAll() {
    playTapeClick("heavy");
    const audio = audioRef.current;
    if (!audio) return;

    if (playingIndex === null) {
      playFrom(0);
    } else {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        if (audio.__audioCtx) {
          audio.__audioCtx.resume().catch(() => {});
        }
        audio.play().catch(() => {});
        setIsPlaying(true);
      }
    }
  }
  function onEnded() {
    if (playingIndex !== null && playingIndex + 1 < clips.length) {
      playFrom(playingIndex + 1);
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

          <div onClick={seek} className="h-2 rounded-full mb-2 cursor-pointer relative group flex items-center" style={{ background: "var(--border)" }}>
            <div
              className="h-full rounded-full relative"
              style={{ width: `${progressPct}%`, background: mixtape.theme, transition: "width .1s linear" }}
            >
              <div
                className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full shadow-md transform translate-x-1/2 scale-0 group-hover:scale-100"
                style={{
                  background: mixtape.theme,
                  border: "2px solid var(--panel)",
                  transition: "transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), scale 0.2s ease"
                }}
              />
            </div>
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

        {/* Creator / Visitor Control Actions */}
        {user && (
          <div className="flex flex-col gap-2 mt-4 w-full">
            <div className="flex gap-2 w-full">
              <button
                onClick={onEdit}
                className="btn-ghost flex-1 rounded-full py-2.5 text-xs flex items-center justify-center gap-1.5"
              >
                <Edit size={12} /> Edit Tape
              </button>
              {!isImported && (
                <button
                  onClick={onImport}
                  className="btn-ghost flex-1 rounded-full py-2.5 text-xs flex items-center justify-center gap-1.5"
                >
                  <Plus size={12} /> Import
                </button>
              )}
            </div>
            <button
              onClick={onDelete}
              className="btn-ghost w-full rounded-full py-2.5 text-xs flex items-center justify-center gap-1.5"
              style={{ color: "var(--coral)", borderColor: "var(--coral)" }}
            >
              <Trash2 size={12} /> Delete Tape
            </button>
          </div>
        )}
        {!user && !isImported && (
          <div className="mt-4">
            <button
              onClick={onImport}
              className="btn-ghost w-full rounded-full py-2.5 text-xs flex items-center justify-center gap-1.5"
            >
              <Plus size={12} /> Import to Dashboard
            </button>
          </div>
        )}

        {/* J-Card Sleeve */}
        <div className="mt-6 border-t pt-4" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => { playTapeClick("light"); setShowJCard(!showJCard); }}
            className="btn-ghost w-full rounded-full py-2 text-xs flex items-center justify-center gap-1.5"
            style={{ borderColor: mixtape.theme, color: mixtape.theme }}
          >
            {showJCard ? "Hide J-Card Sleeve" : "Flip Open J-Card Sleeve"}
          </button>
        </div>

        {showJCard && (
          <div className="card rounded-2xl p-5 mt-4 text-left fade-in" style={{ border: `1.5px dashed ${mixtape.theme}`, background: "#FAF8F5" }}>
            <div className="text-center mb-4 border-b pb-3" style={{ borderColor: "var(--border)" }}>
              <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ background: mixtape.theme + "15" }}>
                <CoverIcon name={mixtape.cover} size={18} style={{ color: mixtape.theme }} />
              </div>
              <p className="text-[10px] font-mono text-low uppercase tracking-wider">A-Side / B-Side Liners</p>
              <h3 className="font-display text-hi text-lg font-bold">{mixtape.title}</h3>
            </div>
            
            {mixtape.description && (
              <div className="mb-4 p-3 bg-panel rounded-xl text-left border" style={{ borderColor: "var(--border)", background: "var(--panel)" }}>
                <p className="text-[10px] font-mono text-low uppercase tracking-wider mb-1">Dedication Note</p>
                <p className="text-mid text-xs italic font-felt leading-relaxed" style={{ fontSize: "14px" }}>"{mixtape.description}"</p>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-[10px] font-mono text-low uppercase tracking-wider border-b pb-1">Track List</p>
              {clips.map((c, i) => (
                <div key={c.id} className="flex justify-between items-center text-xs font-mono py-1">
                  <span className="text-mid truncate">
                    {i + 1}. {c.title}
                  </span>
                  <span className="text-low shrink-0 ml-2">{formatTime(c.duration)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  Admin Panel                                                        */
/* ------------------------------------------------------------------ */

function AdminPanel({ user, onBack, flash }) {
  const [activeTab, setActiveTab] = useState("users"); // users | mixtapes
  const [users, setUsers] = useState([]);
  const [mixtapes, setMixtapes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/data", {
        headers: { "x-admin-email": user?.email || "" }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setMixtapes(data.mixtapes || []);
      } else {
        flash("Unauthorized or server error");
      }
    } catch (e) {
      console.error(e);
      flash("Failed to fetch admin statistics");
    }
    setLoading(false);
  }, [user, flash]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  async function handleDeleteMixtape(code) {
    if (!window.confirm(`Are you sure you want to moderate and delete mixtape ${code}?`)) return;
    try {
      const res = await fetch(`/api/mixtape/${code}`, {
        method: "DELETE"
      });
      if (res.ok) {
        flash("Mixtape deleted successfully");
        setMixtapes(prev => prev.filter(m => m.code !== code));
      } else {
        flash("Failed to delete mixtape");
      }
    } catch (e) {
      console.error(e);
      flash("Error deleting mixtape");
    }
  }

  async function handleDeleteUser(code) {
    if (!window.confirm(`Are you sure you want to delete user ${code}?`)) return;
    try {
      const res = await fetch(`/api/admin/user/${code}`, {
        method: "DELETE",
        headers: { "x-admin-email": user?.email || "" }
      });
      if (res.ok) {
        flash("User deleted successfully");
        setUsers(prev => prev.filter(u => u.code !== code));
      } else {
        flash("Failed to delete user");
      }
    } catch (e) {
      console.error(e);
      flash("Error deleting user");
    }
  }

  const filteredUsers = users.filter(u => 
    (u.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.code || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMixtapes = mixtapes.filter(m => 
    (m.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.author || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.code || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPlays = mixtapes.reduce((sum, m) => sum + (m.plays || 0), 0);

  return (
    <Shell wide>
      <BackBar onBack={onBack} title="Admin Control Panel" />

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card rounded-2xl p-4 text-center">
          <p className="text-[10px] text-low font-mono uppercase tracking-wide">Users</p>
          <p className="text-xl font-display text-hi font-bold mt-1">{users.length}</p>
        </div>
        <div className="card rounded-2xl p-4 text-center">
          <p className="text-[10px] text-low font-mono uppercase tracking-wide">Mixtapes</p>
          <p className="text-xl font-display text-hi font-bold mt-1">{mixtapes.length}</p>
        </div>
        <div className="card rounded-2xl p-4 text-center">
          <p className="text-[10px] text-low font-mono uppercase tracking-wide">Plays</p>
          <p className="text-xl font-display text-hi font-bold mt-1">{totalPlays}</p>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b mb-6" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={() => { playTapeClick("light"); setActiveTab("users"); setSearchQuery(""); }}
          className="flex-1 pb-3 text-xs font-mono font-bold uppercase tracking-wider transition bg-transparent border-none cursor-pointer flex items-center justify-center gap-1.5"
          style={{
            color: activeTab === "users" ? "var(--text-hi)" : "var(--text-low)",
            borderBottom: activeTab === "users" ? "2px solid var(--text-hi)" : "2px solid transparent"
          }}
        >
          <Users size={12} /> Users
        </button>
        <button
          onClick={() => { playTapeClick("light"); setActiveTab("mixtapes"); setSearchQuery(""); }}
          className="flex-1 pb-3 text-xs font-mono font-bold uppercase tracking-wider transition bg-transparent border-none cursor-pointer flex items-center justify-center gap-1.5"
          style={{
            color: activeTab === "mixtapes" ? "var(--text-hi)" : "var(--text-low)",
            borderBottom: activeTab === "mixtapes" ? "2px solid var(--text-hi)" : "2px solid transparent"
          }}
        >
          <Disc size={12} /> Mixtapes
        </button>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-low" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${activeTab}...`}
          className="w-full rounded-full pl-9 pr-4 py-2 text-xs font-mono"
        />
      </div>

      {loading ? (
        <p className="text-center text-xs font-mono text-low py-8">Loading administration data...</p>
      ) : (
        <div className="space-y-4">
          {activeTab === "users" && (
            <div className="card rounded-2xl overflow-hidden border border-[var(--border)] divide-y divide-[var(--border)]">
              {filteredUsers.length === 0 ? (
                <p className="text-center text-xs text-low p-6">No users match your query.</p>
              ) : (
                filteredUsers.map(u => (
                  <div key={u.code} className="p-4 flex justify-between items-center bg-transparent">
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-medium text-hi truncate">{u.name}</p>
                      <p className="text-xs text-low truncate font-mono mt-0.5">{u.email}</p>
                      <p className="text-[10px] text-low font-mono mt-1">Code: <span className="text-hi">{u.code}</span> · Registered: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteUser(u.code)}
                      className="btn-ghost rounded-full px-2.5 py-1 text-[10px] font-mono shrink-0"
                      style={{ color: "var(--coral)" }}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "mixtapes" && (
            <div className="card rounded-2xl overflow-hidden border border-[var(--border)] divide-y divide-[var(--border)]">
              {filteredMixtapes.length === 0 ? (
                <p className="text-center text-xs text-low p-6">No mixtapes match your query.</p>
              ) : (
                filteredMixtapes.map(m => (
                  <div key={m.code} className="p-4 flex justify-between items-center bg-transparent">
                    <div className="min-w-0 pr-4">
                      <p className="text-sm font-medium text-hi truncate">{m.title}</p>
                      <p className="text-xs text-low truncate font-mono mt-0.5">by {m.author} · {m.clipCount || 0} Clips</p>
                      <p className="text-[10px] text-low font-mono mt-1">Code: <span className="text-hi">{m.code}</span> · {m.plays || 0} Plays</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleDeleteMixtape(m.code)}
                        className="btn-ghost rounded-full px-2.5 py-1 text-[10px] font-mono shrink-0"
                        style={{ color: "var(--coral)" }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
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

/* ------------------------------------------------------------------ */
/*  InboxSend (Anonymous Notes Recorder)                              */
/* ------------------------------------------------------------------ */

function InboxSend({ recipientName, inboxCode, onBack }) {
  const [senderUser, setSenderUser] = useState(null);
  const [recordState, setRecordState] = useState("idle"); // idle | recording | recorded
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [recError, setRecError] = useState("");
  const [replaying, setReplaying] = useState(false);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const recognitionRef = useRef(null);
  const transcriptAccumulatorRef = useRef("");

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  async function startRecording() {
    playTapeClick("heavy");
    setRecError("");
    chunksRef.current = [];
    setElapsed(0);
    try {
      // Speech recognition initialization for Option B
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.continuous = true;
          rec.interimResults = false;
          transcriptAccumulatorRef.current = "";
          rec.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                transcriptAccumulatorRef.current += " " + event.results[i][0].transcript;
              }
            }
          };
          rec.start();
          recognitionRef.current = rec;
        } catch (e) {
          console.warn("Speech recognition error:", e);
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: { ideal: false },
          noiseSuppression: { ideal: false },
          autoGainControl: { ideal: false },
          sampleRate: { ideal: 48000 }
        }
      });
      streamRef.current = stream;

      let options = {};
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        options = { mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: 128000 };
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        options = { mimeType: "audio/mp4", audioBitsPerSecond: 128000 };
      } else if (MediaRecorder.isTypeSupported("audio/aac")) {
        options = { mimeType: "audio/aac", audioBitsPerSecond: 128000 };
      } else {
        options = { audioBitsPerSecond: 128000 };
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const transcript = (transcriptAccumulatorRef.current || "").toLowerCase().trim();
        if (containsProfanity(transcript)) {
          setRecError("Profanity or abusive content detected. Please keep MInitape friendly!");
          setRecordState("idle");
          setAudioUrl(null);
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
          }
          return;
        }

        const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioUrl(reader.result);
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start(100);
      setRecordState("recording");
      
      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      setRecError("Could not access microphone.");
    }
  }

  function stopRecording() {
    playTapeClick("heavy");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setRecordState("recorded");
  }

  function deleteRecording() {
    playTapeClick("light");
    setAudioUrl(null);
    setElapsed(0);
    setRecordState("idle");
    setReplaying(false);
  }

  function toggleReplay() {
    playTapeClick("light");
    if (!audioRef.current) return;
    if (replaying) {
      audioRef.current.pause();
      setReplaying(false);
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setReplaying(true);
    }
  }

  async function handleSend() {
    playTapeClick("heavy");
    if (!audioUrl) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/inbox/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientCode: inboxCode,
          clip: {
            id: genId(),
            title: noteTitle.trim() || "Anonymous Note",
            audioDataUrl: audioUrl,
            duration: elapsed,
            createdAt: new Date().toISOString()
          }
        })
      });
      if (response.ok) {
        setSubmitted(true);
      } else {
        setRecError("Failed to send note.");
      }
    } catch {
      setRecError("Server connection error.");
    }
    setSubmitting(false);
  }

  if (!senderUser) {
    return (
      <Login
        onDone={(u) => setSenderUser(u)}
        onBack={onBack}
        title="Send Anonymous Tape"
        description={`Sign in to send an anonymous note to ${recipientName || "user"}. Your identity remains 100% hidden.`}
      />
    );
  }

  if (submitted) {
    return (
      <Shell>
        <div className="card rounded-3xl p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-teal-500/10 text-teal-500 flex items-center justify-center mb-6" style={{ background: "rgba(13,148,136,0.1)" }}>
            <Check size={32} />
          </div>
          <h2 className="font-display text-hi text-2xl mb-2 font-bold">Tape Sent!</h2>
          <p className="text-mid text-sm mb-8 leading-relaxed">
            Your voice note was delivered anonymously to <strong>{recipientName}</strong>.
          </p>
          <button onClick={onBack} className="btn-amber w-full rounded-full py-3 text-sm">
            Done
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <BackBar onBack={onBack} title={`Record for ${recipientName}`} />
      <div className="card rounded-3xl p-6 text-center flex flex-col items-center">
        <p className="text-xs text-low font-mono uppercase tracking-wider mb-4">Anonymous Channel</p>

        <div className="w-full max-w-[210px] aspect-[300/190] mx-auto mb-6">
          <CassetteTape
            title={noteTitle.trim() || "Anonymous"}
            themeColor="var(--amber)"
            isSpinning={recordState === "recording" || replaying}
            progress={recordState === "recorded" ? elapsed / 60 : 0}
            stickerFont="Felt-Tip"
            side="A"
          />
        </div>

        {recordState === "idle" && (
          <>
            <button
              onClick={startRecording}
              className="w-16 h-16 rounded-full flex items-center justify-center text-white mb-4 hover:scale-105 active:scale-95 transition border-none shadow"
              style={{ background: "var(--coral)", cursor: "pointer" }}
            >
              <Mic size={24} />
            </button>
            <p className="text-hi text-sm font-medium">Tap to Record</p>
            <p className="text-low text-xs font-mono mt-1">Maximum 60 seconds</p>
          </>
        )}

        {recordState === "recording" && (
          <>
            <button
              onClick={stopRecording}
              className="w-16 h-16 rounded-full flex items-center justify-center text-white mb-4 animate-pulse hover:scale-105 active:scale-95 transition border-none shadow"
              style={{ background: "var(--coral)", cursor: "pointer" }}
            >
              <Square size={20} fill="white" />
            </button>
            <p className="text-hi text-sm font-medium">Recording…</p>
            <p className="text-low text-xs font-mono mt-1">{formatTime(elapsed)} / 1:00</p>
          </>
        )}

        {recordState === "recorded" && (
          <div className="w-full">
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setReplaying(false)}
              className="hidden"
            />
            <div className="flex items-center justify-center gap-4 mb-5">
              <button
                onClick={toggleReplay}
                className="btn-ghost rounded-full px-4 py-2 text-xs flex items-center gap-1.5"
              >
                {replaying ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}
                {replaying ? "Pause" : "Replay"}
              </button>
              <button
                onClick={deleteRecording}
                className="btn-ghost rounded-full px-4 py-2 text-xs flex items-center gap-1.5"
                style={{ color: "var(--coral)" }}
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>

            <div className="w-full text-left mb-5">
              <p className="text-[10px] font-mono text-low uppercase tracking-wider mb-2 text-center">Sticker Label Name</p>
              <input
                type="text"
                placeholder="e.g. From a student, feedback"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-sm text-center font-mono border"
                style={{ background: "var(--panel2)", borderColor: "var(--border)", color: "var(--text-hi)", boxSizing: "border-box" }}
                maxLength={24}
              />
            </div>

            <button
              onClick={handleSend}
              disabled={submitting}
              className="btn-amber w-full rounded-full py-3 text-sm font-bold"
            >
              {submitting ? "Sending..." : "Send Tape Anonymously"}
            </button>
          </div>
        )}

        {recError && <p className="text-xs text-red-500 mt-3">{recError}</p>}
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  Terms and Privacy                                                  */
/* ------------------------------------------------------------------ */

function TermsAndPrivacy({ onBack }) {
  return (
    <Shell>
      <BackBar onBack={onBack} title="Terms & Privacy" />
      <div className="card rounded-3xl p-6 text-left space-y-4 max-h-[70vh] overflow-y-auto font-mono text-[11px] leading-relaxed">
        <h2 className="text-xs font-display text-hi font-bold" style={{ letterSpacing: 'normal' }}>Terms of Service</h2>
        <p>
          Welcome to MInitape. By using this service to record, share, or send voice notes, you agree to:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Use the service only for lawful, personal purposes.</li>
          <li>Not upload or send any harassing, abusive, threatening, or illegal audio content.</li>
          <li>Acknowledge that server resources are provided as-is without warranties.</li>
        </ul>

        <h2 className="text-xs font-display text-hi font-bold mt-4" style={{ letterSpacing: 'normal' }}>Privacy Policy</h2>
        <p>
          We are committed to user privacy:
        </p>
        <ul className="list-disc pl-4 space-y-1">
          <li><strong>Authentication:</strong> Google authentication is used solely to verify human accounts and prevent platform spam/abuse.</li>
          <li><strong>Anonymous Notes:</strong> When you send a voice note anonymously, your profile name, email, and credentials are completely withheld from the recipient. No identifier is saved in the shared notes payload.</li>
          <li><strong>Data Retention:</strong> Mixtape audio payloads and inbox notes are saved on our secure VPS filesystem. You can delete your recordings at any time.</li>
        </ul>

        <p className="pt-2 border-t font-bold">
          Contact: team@grafty.pro
        </p>
      </div>
    </Shell>
  );
}
