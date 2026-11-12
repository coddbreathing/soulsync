import { Layers, Smartphone, Database, Zap, Map, Route, Milestone } from "lucide-react";

export default function SystemArchitecture() {
  return (
    <div className="space-y-8 text-slate-800">
      {/* Overview */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border border-pink-100/50">
        <h2 className="text-xl font-semibold tracking-tight text-purple-950 flex items-center gap-2">
          <Layers className="w-5 h-5 text-pink-500" />
          SoulSync Production System Architecture
        </h2>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          The production implementation of SoulSync is designed as a secure, sub-100ms low-latency multi-platform application. Below is the multi-layered technical blueprint built to bridge long-distance couples across any mobile device.
        </p>
      </div>

      {/* Tech Stack Grid */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Recommended Tech Stack</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600">
              <Smartphone className="w-5 h-5" />
            </div>
            <h4 className="font-medium text-slate-900">Frontend Client</h4>
            <ul className="text-xs text-slate-500 space-y-2">
              <li><strong className="text-slate-700">Framework:</strong> Flutter (for native 60fps haptics, widgets & rendering lifecycle) or React Native.</li>
              <li><strong className="text-slate-700">Audio/Video:</strong> WebRTC MediaStream API via custom peer connection wrappers.</li>
              <li><strong className="text-slate-700">Local State:</strong> Riverpod (Flutter) or Redux Toolkit.</li>
            </ul>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <Database className="w-5 h-5" />
            </div>
            <h4 className="font-medium text-slate-900">Backend & Sync Engine</h4>
            <ul className="text-xs text-slate-500 space-y-2">
              <li><strong className="text-slate-700">Server Host:</strong> Node.js with Fastify or Express in Docker on Google Cloud Run.</li>
              <li><strong className="text-slate-700">Communications:</strong> Socket.io WebSockets for millisecond-grade sync & touch pulses.</li>
              <li><strong className="text-slate-700">Database:</strong> Firebase Firestore (for real-time couple collections) or PostgreSQL.</li>
            </ul>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center text-pink-600">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="font-medium text-slate-900">Security & Cloud Drives</h4>
            <ul className="text-xs text-slate-500 space-y-2">
              <li><strong className="text-slate-700">Encryption:</strong> Ed25519 Curve Diffie-Hellman Key Exchange (E2EE chats).</li>
              <li><strong className="text-slate-700">Video Storage:</strong> Google Cloud Storage proxy with Google Drive API syncing.</li>
              <li><strong className="text-slate-700">Identity:</strong> Auth0 or Firebase Auth for secure private couple pairing validation keys.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Screen Map */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <Map className="w-4 h-4 text-purple-500" />
          Detailed UI/UX Screen Map
        </h3>
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4 font-mono text-xs">
          <div className="space-y-1">
            <div className="text-purple-700 font-semibold">[Screen 1] Launcher & Pairing Gate</div>
            <div className="text-slate-600 pl-4 border-l border-slate-200">
              - Auth & Sign-Up Step &rarr; Link with partner using generated unique 6-Character "Chamber Key". <br />
              - Live handshake animation showing two rings floating together until code is linked.
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-purple-700 font-semibold">[Screen 2] Core Sanctuary Dashboard (Home Feed)</div>
            <div className="text-slate-600 pl-4 border-l border-slate-200">
              - Interactive top-bar showing current "Partner Status" and live Mood Check-in bubbles.<br />
              - Centerstage Relationship Pet/Plant garden with quick-action haptic triggers (Water, Sunlight, send Kiss).<br />
              - "Locket Canvas" displaying the latest quick snap taken by your partner.
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-purple-700 font-semibold">[Screen 3] Private Co-Op Chat Room</div>
            <div className="text-slate-600 pl-4 border-l border-slate-200">
              - Scrollable list with Custom Love note envelopes, synced audio recordings, and normal texts.<br />
              - Floating Gemini Romantic Talk Assistant: Choose prompts ("Deep Topic", "Cute Icebreaker") to directly inject into input.<br />
              - Video Call Portal: Support peer-to-peer overlay triggers with optional cloud-recording checkbox.
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-purple-700 font-semibold">[Screen 4] Synced Activities Pavilion</div>
            <div className="text-slate-600 pl-4 border-l border-slate-200">
              - Synced Media Player (Watches MP3/MP4 payloads simultaneously; one pauses, the other's viewport pauses).<br />
              - Real-time Drawing Board: Multi-touch canvas where both partners draw inside the exact same frame.<br />
              - Co-Browsing Sandbox to plan trips or share custom views side-by-side.
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-purple-700 font-semibold">[Screen 5] Eternal Keepsake Journal (Scrapbook & Memory Countdowns)</div>
            <div className="text-slate-600 pl-4 border-l border-slate-200">
              - Beautiful masonry polaroid album: upload photos, caption key relationships diaries, save milestone dates.<br />
              - Sync Calendar countdown showing days/hours/seconds until next flight or meeting.
            </div>
          </div>
        </div>
      </div>

      {/* Step-by-Step Roadmap */}
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <Milestone className="w-4 h-4 text-emerald-500" />
          Step-by-Step Development Roadmap
        </h3>
        <div className="relative border-l-2 border-emerald-100 pl-6 space-y-6">
          <div className="relative">
            <span className="absolute -left-9 top-1 w-5 h-5 rounded-full bg-emerald-500 border-4 border-white shadow-sm flex items-center justify-center text-[9px] font-bold text-white">1</span>
            <h4 className="text-sm font-semibold text-slate-800">Phase 1: Secure Handshake & Hand-over (Weeks 1-2)</h4>
            <p className="mt-1 text-xs text-slate-500">
              Set up Auth backend, structure pairing code database, generate secure encryption keys (Diffie-Hellman Exchange in client keychain), and establish Socket.io network frameworks.
            </p>
          </div>
          <div className="relative">
            <span className="absolute -left-9 top-1 w-5 h-5 rounded-full bg-emerald-500 border-4 border-white shadow-sm flex items-center justify-center text-[9px] font-bold text-white">2</span>
            <h4 className="text-sm font-semibold text-slate-800">Phase 2: Synced Canvas & Dynamic Haptics (Weeks 3-5)</h4>
            <p className="mt-1 text-xs text-slate-500">
              Implement collaborative WebSocket channel wrappers. Build custom Touch Engine to invoke native vibration haptics on iOS/Android via hardware integrations when the "Hug/Heartbeat" actions are triggered.
            </p>
          </div>
          <div className="relative">
            <span className="absolute -left-9 top-1 w-5 h-5 rounded-full bg-slate-400 border-4 border-white shadow-sm flex items-center justify-center text-[9px] font-bold text-white">3</span>
            <h4 className="text-sm font-semibold text-slate-800">Phase 3: WebRTC Video Chamber & Cloud Backup (Weeks 6-8)</h4>
            <p className="mt-1 text-xs text-slate-500">
              Configure coturn relay turn servers. Build RTC peer connection logic inside Flutter/RN. Complete authorization loop for Google Drive REST API to pack recording chunks and stream them securely to user cloud.
            </p>
          </div>
          <div className="relative">
            <span className="absolute -left-9 top-1 w-5 h-5 rounded-full bg-slate-400 border-4 border-white shadow-sm flex items-center justify-center text-[9px] font-bold text-white">4</span>
            <h4 className="text-sm font-semibold text-slate-800">Phase 4: Relationship Virtual Pet & Gemini Integration (Weeks 9-10)</h4>
            <p className="mt-1 text-xs text-slate-500">
              Design Vector illustrations for Pet lifecycle states. Set up Gemini LLM endpoint pipelines to suggest witty relationship prompts and write sweet tailored letters based on couple's shared histories.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
