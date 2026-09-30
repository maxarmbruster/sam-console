/* Sam — Talkpush demo intake console
 * UI layer over a voice transport. Transport #1 is the ElevenLabs
 * Conversation SDK; the adapter surface is small on purpose so a LiveKit
 * transport can be dropped in later without touching the UI.
 *
 * Usage (Webflow embed):
 *   <div id="sam-root" data-agent-id="agent_..." data-locale="en"
 *        data-theme="light|dark" data-title="..." data-sub="..." data-cta="..."></div>
 *   <link rel="stylesheet" href="https://<host>/sam.css">
 *   <script type="module" src="https://<host>/sam.js"></script>
 */

const SDK_URL = "https://esm.sh/@elevenlabs/client";

const COPY = {
  en: {
    role: "Talkpush AI agent",
    live: "Live",
    idle: "Ready",
    connecting: "Connecting",
    listening: "Listening",
    speaking: "Speaking",
    thinking: "Thinking",
    ended: "Ended",
    error: "Couldn't connect",
    livePill: "Sam is free right now",
    openTitle: "Skip the form. Talk to Sam.",
    openSub: "Two minutes. She puts a real slot in your calendar before you leave this tab.",
    ctaVoice: "Start the call",
    ctaTypeLead: "Prefer typing?",
    ctaType: "Chat instead",
    proofs: ["No form", "Real calendar slot", "Nothing sent until you say so"],
    micHint: "Sam is listening. Speak normally, interrupt whenever you like.",
    micMuted: "Mic is off. Tap to unmute.",
    typedPlaceholder: "Type your reply",
    send: "Send",
    end: "End",
    mute: "Mute",
    unmute: "Unmute",
    micDenied: "Your browser blocked the microphone. Allow it in the address bar, or type instead.",
    connectFail: "Sam couldn't connect. Check your connection and try again, or type instead.",
    endedNote: "Thanks. If Sam booked a slot, the invite is on its way.",
    startOver: "Start again",
    you: "You",
  },
};

/* ───────── Transport: ElevenLabs ───────── */

class ElevenLabsTransport {
  constructor(opts) {
    this.opts = opts;
    this.conv = null;
    this.sdk = null;
  }

  async load() {
    if (this.sdk) return this.sdk;
    this.sdk = await import(/* @vite-ignore */ SDK_URL);
    return this.sdk;
  }

  async connect({ textOnly, handlers }) {
    const { Conversation } = await this.load();
    const base = {
      agentId: this.opts.agentId,
      connectionType: this.opts.connectionType || "webrtc",
      textOnly: !!textOnly,
      onConnect: (e) => handlers.onConnect?.(e),
      onDisconnect: (e) => handlers.onDisconnect?.(e),
      onError: (msg, ctx) => handlers.onError?.(msg, ctx),
      onMessage: (m) => handlers.onMessage?.(m),
      onModeChange: (m) => handlers.onModeChange?.(m),
      onStatusChange: (s) => handlers.onStatusChange?.(s),
    };
    const withLang = this.opts.locale
      ? { ...base, overrides: { agent: { language: this.opts.locale } } }
      : base;

    try {
      this.conv = await Conversation.startSession(withLang);
    } catch (err) {
      // Language override must be enabled on the agent (Security → Overrides).
      // If it isn't, fall back to the agent's default language rather than fail.
      if (withLang !== base) {
        handlers.onWarn?.("language-override-rejected", err);
        this.conv = await Conversation.startSession(base);
      } else {
        throw err;
      }
    }
    return this.conv;
  }

  sendText(text) {
    if (!this.conv) return;
    if (typeof this.conv.sendUserMessage === "function") this.conv.sendUserMessage(text);
  }

  setMuted(muted) {
    if (!this.conv) return;
    if (typeof this.conv.setMicMuted === "function") this.conv.setMicMuted(muted);
  }

  outputLevel() {
    if (!this.conv) return 0;
    try {
      return typeof this.conv.getOutputVolume === "function" ? this.conv.getOutputVolume() : 0;
    } catch {
      return 0;
    }
  }

  inputLevel() {
    if (!this.conv) return 0;
    try {
      return typeof this.conv.getInputVolume === "function" ? this.conv.getInputVolume() : 0;
    } catch {
      return 0;
    }
  }

  async end() {
    if (!this.conv) return;
    const c = this.conv;
    this.conv = null;
    try {
      await c.endSession();
    } catch {
      /* already closed */
    }
  }
}

/* ───────── Analytics ───────── */

function track(name, params) {
  try {
    if (typeof window.gtag === "function") window.gtag("event", name, params);
    else if (Array.isArray(window.dataLayer)) window.dataLayer.push({ event: name, ...params });
  } catch {
    /* analytics must never break the console */
  }
}

/* ───────── UI ───────── */

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, "");
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return el;
}

const MIC_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a4 4 0 0 0 4-4V6a4 4 0 1 0-8 0v5a4 4 0 0 0 4 4Zm6-4a6 6 0 0 1-12 0H4a8 8 0 0 0 7 7.93V22h2v-3.07A8 8 0 0 0 20 11h-2Z"/></svg>';
const MIC_OFF_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4.3 4.4 3l16.6 16.6-1.4 1.4-3.9-3.9A7.9 7.9 0 0 1 13 18.9V22h-2v-3.07A8 8 0 0 1 4 11h2a6 6 0 0 0 8.6 5.4l-1.5-1.5A4 4 0 0 1 8 11V8.3L3 4.3ZM12 2a4 4 0 0 1 4 4v5c0 .5-.1 1-.3 1.4L10 6.7V6a4 4 0 0 1 2-4Zm6 9h2c0 1.3-.3 2.5-.9 3.6l-1.5-1.5c.2-.7.4-1.4.4-2.1Z"/></svg>';

class SamConsole {
  constructor(root, config) {
    this.root = root;
    this.config = config;
    this.copy = COPY[config.locale] || COPY.en;
    this.transport = new ElevenLabsTransport(config);
    this.state = "idle"; // idle | connecting | live | ended | error
    this.mode = null; // voice | typed
    this.status = "idle"; // listening | speaking | thinking
    this.muted = false;
    this.raf = null;
    this.build();
  }

  build() {
    const c = this.copy;
    this.root.classList.add("sam");
    this.root.setAttribute("data-state", this.state);

    // Head
    this.statusPill = h("span", { class: "sam-pill", "data-s": "idle" }, h("i"), c.idle);
    this.root.append(
      h(
        "div",
        { class: "sam-head" },
        h("div", {}, h("b", {}, "Sam"), h("span", { class: "sam-role" }, c.role)),
        this.statusPill
      )
    );

    // Stage (orb)
    this.orb = h("button", { class: "sam-orb", type: "button", "aria-label": "Talk to Sam", onclick: () => this.start("voice") });
    this.stage = h("div", { class: "sam-stage" }, h("div", { class: "sam-orbwrap" }, this.orb));
    this.root.append(this.stage);

    // Open state
    const cfg = this.config;
    const title = cfg.title || c.openTitle;
    const sub = cfg.sub || c.openSub;
    const cta = cfg.cta || c.ctaVoice;
    this.open = h(
      "div",
      { class: "sam-open" },
      h("span", { class: "sam-live" }, h("i"), c.livePill),
      h("h3", {}, title),
      h("p", {}, sub),
      h(
        "button",
        { class: "sam-cta", type: "button", onclick: () => this.start("voice") },
        h("span", { class: "sam-cta-ic", html: MIC_SVG, "aria-hidden": "true" }),
        cta
      ),
      h(
        "p",
        { class: "sam-optrow" },
        c.ctaTypeLead + " ",
        h("button", { class: "sam-opt", type: "button", onclick: () => this.start("typed") }, c.ctaType)
      ),
      h("div", { class: "sam-proof" }, c.proofs.map((t) => h("span", {}, t)))
    );
    this.root.append(this.open);

    // Thread
    this.thread = h("div", { class: "sam-thread", role: "log", "aria-live": "polite" });
    this.root.append(this.thread);

    // Composer
    this.micBtn = h(
      "button",
      { class: "sam-mic", type: "button", "aria-label": c.mute, html: MIC_SVG, onclick: () => this.toggleMute() }
    );
    this.micHint = h("p", {}, c.micHint);
    this.microw = h("div", { class: "sam-microw" }, this.micBtn, this.micHint);

    this.input = h("input", {
      type: "text",
      placeholder: c.typedPlaceholder,
      autocomplete: "off",
      onkeydown: (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.sendTyped();
        }
      },
    });
    this.typed = h(
      "div",
      { class: "sam-typed" },
      this.input,
      h("button", { class: "sam-btn", type: "button", onclick: () => this.sendTyped() }, c.send)
    );

    this.endBtn = h("button", { class: "sam-tlink", type: "button", onclick: () => this.end() }, c.end);
    this.composer = h("div", { class: "sam-composer" }, this.microw, this.typed, h("div", { class: "sam-cfoot" }, this.endBtn));
    this.root.append(this.composer);

    // Ended state
    this.endedBox = h(
      "div",
      { class: "sam-ended" },
      h("p", {}, c.endedNote),
      h("button", { class: "sam-opt", type: "button", onclick: () => this.reset() }, c.startOver)
    );
    this.root.append(this.endedBox);

    // Error line
    this.errLine = h("p", { class: "sam-err", role: "alert" });
    this.root.append(this.errLine);
  }

  setState(s) {
    this.state = s;
    this.root.setAttribute("data-state", s);
  }

  setMode(m) {
    this.mode = m;
    if (m) this.root.setAttribute("data-mode", m);
    else this.root.removeAttribute("data-mode");
  }

  setStatus(s) {
    this.status = s;
    this.statusPill.setAttribute("data-s", s);
    this.statusPill.lastChild.textContent = this.copy[s] || s;
  }

  addMessage(text, who) {
    if (!text) return;
    const el = h("div", { class: `sam-msg sam-msg-${who}` }, text);
    this.thread.append(el);
    this.thread.scrollTop = this.thread.scrollHeight;
    return el;
  }

  showError(msg) {
    this.errLine.textContent = msg || "";
    this.errLine.hidden = !msg;
  }

  async start(mode) {
    if (this.state === "connecting" || this.state === "live") return;
    this.showError("");
    this.setMode(mode);
    this.setState("connecting");
    this.setStatus("connecting");

    const textOnly = mode === "typed";

    if (!textOnly && navigator.mediaDevices?.getUserMedia) {
      try {
        // Ask once, up front, so the SDK doesn't fail mid-handshake.
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.getTracks().forEach((t) => t.stop());
      } catch {
        track("sam_mic_denied", {});
        this.showError(this.copy.micDenied);
        this.setState("idle");
        this.setStatus("idle");
        this.setMode(null);
        return;
      }
    }

    try {
      await this.transport.connect({
        textOnly,
        handlers: {
          onConnect: () => {
            track("sam_call_start", { sam_mode: mode, sam_theme: this.config.theme || "light" });
            this.startedAt = Date.now();
            this.setState("live");
            this.setStatus(textOnly ? "listening" : "listening");
            if (!textOnly) this.startMeter();
            if (textOnly) this.input.focus();
          },
          onDisconnect: () => {
            if (this.state === "live") this.finish();
          },
          onError: (msg) => {
            this.showError(typeof msg === "string" ? msg : this.copy.connectFail);
          },
          onMessage: ({ message, source }) => {
            this.addMessage(message, source === "user" ? "you" : "sam");
            if (this.mode === "typed") this.setStatus("listening");
          },
          onModeChange: ({ mode }) => {
            if (this.mode === "typed") return;
            this.setStatus(mode === "speaking" ? "speaking" : "listening");
          },
          onStatusChange: ({ status }) => {
            if (status === "disconnected" && this.state === "live") this.finish();
          },
          onWarn: (code) => {
            if (this.config.debug) console.warn("[sam]", code);
          },
        },
      });
    } catch (err) {
      if (this.config.debug) console.error("[sam] connect failed", err);
      this.showError(this.copy.connectFail);
      this.setState("idle");
      this.setStatus("idle");
      this.setMode(null);
    }
  }

  sendTyped() {
    const text = this.input.value.trim();
    if (!text || this.state !== "live") return;
    this.input.value = "";
    this.addMessage(text, "you");
    this.setStatus("thinking");
    this.transport.sendText(text);
  }

  toggleMute() {
    this.muted = !this.muted;
    this.transport.setMuted(this.muted);
    this.micBtn.innerHTML = this.muted ? MIC_OFF_SVG : MIC_SVG;
    this.micBtn.setAttribute("aria-label", this.muted ? this.copy.unmute : this.copy.mute);
    this.micBtn.classList.toggle("is-muted", this.muted);
    this.micHint.textContent = this.muted ? this.copy.micMuted : this.copy.micHint;
  }

  startMeter() {
    const tick = () => {
      const out = this.transport.outputLevel();
      const inp = this.transport.inputLevel();
      const amp = Math.min(1, Math.max(out, inp * 0.6));
      this.root.style.setProperty("--amp", amp.toFixed(3));
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stopMeter() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    this.root.style.setProperty("--amp", "0");
  }

  async end() {
    await this.transport.end();
    this.finish();
  }

  finish() {
    if (this.startedAt) {
      track("sam_call_end", {
        sam_mode: this.mode,
        sam_theme: this.config.theme || "light",
        sam_seconds: Math.round((Date.now() - this.startedAt) / 1000),
      });
      this.startedAt = null;
    }
    this.stopMeter();
    this.setState("ended");
    this.setStatus("ended");
  }

  reset() {
    this.thread.replaceChildren();
    this.showError("");
    this.muted = false;
    this.micBtn.innerHTML = MIC_SVG;
    this.micBtn.classList.remove("is-muted");
    this.micHint.textContent = this.copy.micHint;
    this.setMode(null);
    this.setState("idle");
    this.setStatus("idle");
  }
}

/* ───────── Boot ───────── */

function boot() {
  const roots = document.querySelectorAll("[data-sam-agent], #sam-root");
  roots.forEach((root) => {
    if (root.__sam) return;
    const config = {
      agentId: root.dataset.agentId || root.dataset.samAgent,
      locale: root.dataset.locale || null,
      connectionType: root.dataset.connection || "webrtc",
      debug: root.hasAttribute("data-debug"),
      theme: root.dataset.theme || null,
      title: root.dataset.title || null,
      sub: root.dataset.sub || null,
      cta: root.dataset.cta || null,
    };
    if (config.theme) root.setAttribute("data-theme", config.theme);
    if (!config.agentId) {
      console.error("[sam] missing data-agent-id");
      return;
    }
    root.__sam = new SamConsole(root, config);
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();

export { SamConsole, ElevenLabsTransport };
