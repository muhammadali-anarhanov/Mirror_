import type { RealTimeClient, RealTimeClientConnectOptions } from "@decartai/sdk";

export const DECART_MODEL = "lucy-vton-latest";
export const SESSION_SECONDS = 60;
export type DecartGarment = {id: string; name: string; demo?: boolean};
export type FittingState = "idle" | "camera" | "connecting" | "waiting-video" | "streaming" | "switching" | "error";
type Dependencies = {
  getCamera: () => Promise<MediaStream>;
  releaseCamera: () => void;
  request: (path: string, init?: RequestInit) => Promise<Response>;
  loadSDK: () => Promise<Pick<typeof import("@decartai/sdk"), "createDecartClient" | "models" | "noopLogger">>;
  state: (state: FittingState, message?: string) => void;
  remote: (stream: MediaStream | null) => void;
};

// Error text with URLs, tokens and keys removed, for on-screen diagnosis only.
function safeDetail(error: unknown): string {
  const raw = (error as {message?: unknown})?.message;
  if (typeof raw !== "string" || !raw.trim()) return "";
  const text = raw.replace(/\S*(https?:|wss?:)\S*/gi, "[url]").replace(/\b(eyJ[\w-]*\.[\w.-]*|ek_\w+|dct_\w+|[A-Za-z0-9_-]{24,})/g, "[secret]").replace(/\s+/g, " ").trim().slice(0, 120);
  return text ? `: ${text}` : "";
}

export const CLOCK_MESSAGE = "This device's clock is wrong, so Decart rejects the fitting token as expired. Turn on automatic date and time (Windows: Settings → Time & language → Set time automatically → Sync now), reload the page and start again.";

// Provider errors can include URLs/tokens. Surface only safe SDK codes.
export function decartError(error: unknown): string {
  const name = (error as {name?: unknown})?.name;
  if (name === "NotAllowedError" || name === "SecurityError") return "Camera permission denied. Allow camera access for MIRROR in your browser, then start again.";
  if (name === "NotFoundError") return "No camera was found. Connect a camera and start again.";
  if (name === "NotReadableError") return "Camera is unavailable or in use by another application. Release it and start again.";
  if (name === "TypeError") return "Network or camera request failed. Check your connection and use HTTPS or localhost.";
  const code = (error as {code?: unknown})?.code;
  if (code === "TOKEN_EXPIRED") return CLOCK_MESSAGE;
  return typeof code === "string" && /^[A-Z][A-Z0-9_]{1,60}$/.test(code)
    ? `Decart error: ${code}. Check model access, billing and network, then start again.`
    : `AI fitting could not continue${typeof name === "string" && /^[A-Za-z]{2,40}$/.test(name) ? ` (${name}${safeDetail(error)})` : ""}. Check camera permission, authentication and Decart configuration, then start again.`;
}

/** How far this device's clock runs ahead of the server (ms); 0 when unknown or behind. */
export function clockSkew(expiresAt: string, dateHeader: string | null, now = Date.now()) {
  const fromHeader = Date.parse(dateHeader || "")
  const exp = Date.parse(expiresAt)
  const serverNow = Number.isFinite(fromHeader) ? fromHeader + 500 : Number.isFinite(exp) ? exp - SESSION_SECONDS * 1000 : NaN
  return Number.isFinite(serverNow) ? Math.max(0, now - serverNow) : 0
}

/**
 * Shows server time through Date.now until the current task ends. The SDK's
 * expiry check runs in the microtask right after the key provider resolves.
 */
export function useServerClockBriefly(skew: number) {
  const real = Date.now
  const shifted = () => real.call(Date) - skew
  Date.now = shifted
  setTimeout(() => { if (Date.now === shifted) Date.now = real }, 0)
}

export class DecartFittingSession {
  private deps: Dependencies;
  private epoch = 0;
  private rt: RealTimeClient | null = null;
  private stream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private switchQueue: Promise<void> = Promise.resolve();
  private garmentVersion = 0;
  private gotVideo = false;
  constructor(deps: Dependencies) { this.deps = deps; }
  stop(releaseCamera = true) {
    ++this.epoch; ++this.garmentVersion;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const rt = this.rt; this.rt = null;
    rt?.disconnect();
    this.remoteStream?.getTracks().forEach(track => track.stop());
    this.remoteStream = null;
    if (releaseCamera) this.stream?.getTracks().forEach(track => track.stop());
    this.stream = null;
    this.deps.remote(null); if (releaseCamera) this.deps.releaseCamera();
    this.gotVideo = false;
    this.deps.state("idle");
  }
  private fail(message: string) { this.stop(); this.deps.state("error", message); }
  private async garment(product: DecartGarment): Promise<Blob> {
    if (product.demo || !/^[0-9a-f-]{36}$/i.test(product.id)) throw new Error("catalog required");
    const response = await this.deps.request(`/decart/garments/${encodeURIComponent(product.id)}`);
    if (!response.ok) throw new Error("invalid catalog image");
    const blob = await response.blob();
    if (!["image/jpeg", "image/png"].includes(blob.type) || !blob.size || blob.size > 5 * 1024 * 1024) throw new Error("invalid garment bytes");
    return blob;
  }
  private prompt(product: DecartGarment) {
    return `Substitute the corresponding clothing with the garment shown in the reference image: ${product.name.slice(0, 160)}. Preserve the person and background.`;
  }
  async start(product: DecartGarment) {
    this.stop(false);
    const epoch = this.epoch;
    if (product.demo) { this.fail("Select a real catalog garment. Demo images cannot be used for AI fitting."); return; }
    this.deps.state("camera");
    try {
      const stream = await this.deps.getCamera();
      if (epoch !== this.epoch) { stream.getTracks().forEach(track => track.stop()); return; }
      this.stream = stream;
      stream.getVideoTracks().forEach(track => track.addEventListener("ended", () => {
        if (epoch === this.epoch) this.fail("Camera disconnected. Start a new session.");
      }, {once: true}));
      // Validate garment before any token or billable connection is requested.
      let image: Blob;
      try { image = await this.garment(product); }
      catch { if (epoch === this.epoch) this.fail("Selected garment image is unavailable or unsupported. Use an approved JPEG/PNG catalog image."); return; }
      if (epoch !== this.epoch) return;
      const sdk = await this.deps.loadSDK();
      if (epoch !== this.epoch) return;
      this.deps.state("connecting");
      const response = await this.deps.request("/decart/token", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({consent: true, productId: product.id})});
      if (epoch !== this.epoch) return;
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const status = typeof body.providerStatus === "number" ? ` (Decart HTTP ${body.providerStatus})` : ` (HTTP ${response.status})`;
        this.fail(`AI fitting token unavailable${status}. Check sign-in, DECART_ENABLE_REALTIME, API key, model access and billing.`); return;
      }
      const token = await response.json();
      if (epoch !== this.epoch) return;
      if (token.model !== DECART_MODEL || typeof token.apiKey !== "string" || !token.apiKey || token.apiKey.startsWith("dct_") || token.maxSessionSeconds !== SESSION_SECONDS) throw new Error("invalid token");
      // No automatic retry or extra token mint on reconnect. An explicit new
      // click is required after failure; the server caps every session at SESSION_SECONDS.
      // The SDK calls the provider again when it redials (capacity queue, reconnect).
      // Reuse this session's short-lived token while valid instead of failing; the
      // 60 s timer still caps the session and a stopped session never gets a key.
      // Measure validity on the local clock from receipt: a kiosk whose clock is
      // off (wrong timezone/date) would otherwise see a fresh token as expired.
      const serverLifetime = Date.parse(token.expiresAt) - Date.parse(response.headers.get("Date") || "");
      const lifetime = Number.isFinite(serverLifetime) && serverLifetime > 0 ? Math.min(serverLifetime, SESSION_SECONDS * 1000) : SESSION_SECONDS * 1000;
      const tokenExpiry = Date.now() + lifetime;
      // The Decart SDK checks the token expiry against this device's clock before it
      // dials and refuses with TOKEN_EXPIRED when the clock runs fast. Estimate the
      // server time (Date header, else expiry minus the 60 s token lifetime) and
      // present it to the SDK for that check only.
      const skew = clockSkew(token.expiresAt, response.headers.get("Date"));
      const client = sdk.createDecartClient({logger: sdk.noopLogger, telemetry: false, apiKeyProvider: async () => {
        if (epoch !== this.epoch || !(tokenExpiry - 2000 > Date.now())) throw new Error("Explicit restart required");
        if (skew > 2000) useServerClockBriefly(skew);
        return token.apiKey;
      }});
      const options: RealTimeClientConnectOptions = {
        model: sdk.models.realtime(DECART_MODEL), mirror: true, retries: 0,
        initialState: {image, prompt: {text: this.prompt(product), enhance: false}},
        onRemoteStream: remote => {
          if (epoch === this.epoch) {
            if (this.remoteStream && this.remoteStream !== remote) this.remoteStream.getTracks().forEach(track => track.stop());
            this.remoteStream = remote;
            this.deps.remote(remote); this.deps.state("waiting-video");
          }
          else remote.getTracks().forEach(track => track.stop());
        },
        onConnectionChange: state => {
          if (epoch !== this.epoch) return;
          if (state === "reconnecting") this.fail("Connection lost. Automatic reconnect is disabled; start again explicitly.");
        },
      };
      this.timer = setTimeout(() => { if (epoch === this.epoch) {this.stop(); this.deps.state("idle", `The ${SESSION_SECONDS}-second demo session has ended.`);} }, SESSION_SECONDS * 1000);
      const rt = await client.realtime.connect(stream, options);
      if (epoch !== this.epoch) {rt.disconnect(); return;}
      this.rt = rt;
      if (!this.gotVideo) this.deps.state("waiting-video");
      rt.on("error", error => { if (epoch === this.epoch) this.fail(decartError(error)); });
      rt.on("sessionEnded", () => { if (epoch === this.epoch) {this.stop();this.deps.state("idle", "Decart ended the session. Check account usage before starting again.");} });
      rt.on("connectionChange", state => {if (epoch === this.epoch && state === "disconnected") this.fail("Decart disconnected. Start a new session explicitly.");});
    } catch (error) { if (epoch === this.epoch) this.fail(decartError(error)); }
  }
  videoPlaying() { if (!this.stream) return; this.gotVideo = true; this.deps.state("streaming"); }
  switchGarment(product: DecartGarment) {
    const epoch = this.epoch, version = ++this.garmentVersion;
    this.switchQueue = this.switchQueue.catch(() => {}).then(async () => {
      if (!this.rt || epoch !== this.epoch || version !== this.garmentVersion) return;
      this.deps.state("switching");
      try {
        const image = await this.garment(product);
        if (!this.rt || epoch !== this.epoch || version !== this.garmentVersion) return;
        await this.rt.setImage(image, {prompt: this.prompt(product), enhance: false});
        if (epoch === this.epoch) this.deps.state(this.gotVideo ? "streaming" : "waiting-video", "Garment reference sent. Check the live video for the result.");
      } catch {if (epoch === this.epoch) this.fail("The selected garment could not be processed. Session stopped; choose an approved JPEG/PNG and start again.");}
    });
    return this.switchQueue;
  }
}
