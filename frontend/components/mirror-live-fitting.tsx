"use client";

// Live Decart fitting inside the mirror room. While a session runs, the camera
// preview and then the AI video replace the showroom background image and fill
// the whole screen (rendered into the room's media layer through a portal); the
// catalog UI stays on top. The carousel's current product is worn; changing it
// during a session calls switchGarment on the open connection, so no new token
// or paid session is created.
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { createPortal } from "react-dom";
import { Camera, Square } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { DecartFittingSession, type DecartGarment, type FittingState } from "@/lib/decart-fitting";

const statusText: Record<FittingState, string> = {
  idle: "", camera: "Requesting camera permission…", connecting: "Connecting to Decart Lucy…",
  "waiting-video": "Waiting for AI video…", streaming: "Live AI fitting", switching: "Changing garment…", error: "AI fitting failed.",
};

export type MirrorLiveFittingHandle = {
  /** Start with consent, or ask for consent first. Stops a running session. */
  toggle: () => void;
};

export function MirrorLiveFitting({ product, mediaHost, onLiveChange, controlRef, deviceId = "" }: {
  deviceId?: string;
  product: (DecartGarment & { image?: string }) | null | undefined;
  mediaHost: HTMLElement | null;
  onLiveChange?: (live: boolean) => void;
  controlRef?: Ref<MirrorLiveFittingHandle>;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const preview = useRef<HTMLVideoElement>(null);
  const consentBox = useRef<HTMLInputElement>(null);
  const session = useRef<DecartFittingSession | null>(null);
  const [state, setState] = useState<FittingState>("idle");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [needConsent, setNeedConsent] = useState(false);
  const active = !["idle", "error"].includes(state);
  const stateRef = useRef(state);
  stateRef.current = state;
  // play() rejects with AbortError when a failed session clears the stream; never let that hide the real error.
  const playFailed = (text: string) => (e: unknown) => { if ((e as { name?: string })?.name !== "AbortError" && stateRef.current !== "error") setMessage(text); };
  const usable = Boolean(product && product.image && !product.demo);
  const pendingStream = useRef<MediaStream | null>(null);

  useEffect(() => {
    let mounted = true;
    const fitting = new DecartFittingSession({
      getCamera: async () => {
        if (!navigator.mediaDevices?.getUserMedia) throw { code: "CAMERA_HTTPS_REQUIRED" };
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }, audio: false });
        // Show the plain camera full screen while Decart connects instead of a black frame.
        pendingStream.current = stream;
        if (preview.current) { preview.current.srcObject = stream; void preview.current.play().catch(() => {}); }
        return stream;
      },
      releaseCamera: () => { pendingStream.current = null; if (preview.current) preview.current.srcObject = null; },
      request: (path, init) => apiFetch(path, init, { retryAuth: path !== "/decart/token" }),
      loadSDK: () => import("@decartai/sdk"),
      state: (next, detail = "") => { if (mounted) { setState(next); setMessage(detail); } },
      remote: stream => {
        if (video.current) {
          video.current.srcObject = stream;
          if (stream) void video.current.play().catch(e => { if (mounted) playFailed("Tap the screen to play the AI video.")(e); });
        }
      },
    });
    session.current = fitting;
    const stop = () => fitting.stop();
    window.addEventListener("pagehide", stop);
    return () => { mounted = false; window.removeEventListener("pagehide", stop); fitting.stop(); session.current = null; };
  }, []);

  // The portal host can appear after the camera was requested; attach the stream then.
  useEffect(() => {
    if (preview.current && pendingStream.current && preview.current.srcObject !== pendingStream.current) {
      preview.current.srcObject = pendingStream.current;
      void preview.current.play().catch(() => {});
    }
  }, [mediaHost, state]);

  useEffect(() => { onLiveChange?.(active); }, [active, onLiveChange]);

  // Carousel moved to another garment: wear it in the running session.
  const productId = product?.id;
  const activeRef = useRef(active);
  activeRef.current = active;
  useEffect(() => {
    if (product && usable && activeRef.current) void session.current?.switchGarment(product);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const start = () => {
    if (!product || !usable) return;
    if (!consent) { setNeedConsent(true); consentBox.current?.focus(); return; }
    setNeedConsent(false);
    void session.current?.start(product, deviceId);
  };

  useImperativeHandle(controlRef, () => ({
    toggle: () => { if (activeRef.current) session.current?.stop(); else start(); },
  }));

  const showVideo = state === "streaming" || state === "switching";
  const showPreview = active && !showVideo;

  const media = (
    <>
      <video ref={preview} className="mirror-live-video" style={{ opacity: showPreview ? 1 : 0, transform: "scaleX(-1)" }} muted playsInline autoPlay />
      <video ref={video} className="mirror-live-video" data-decart-output style={{ opacity: showVideo ? 1 : 0 }} muted playsInline autoPlay
        onPlaying={() => session.current?.videoPlaying()} />
    </>
  );

  return (
    <div className={`mirror-camera-frame ${active ? "is-live" : "is-camera-off"}`}>
      {mediaHost ? createPortal(media, mediaHost) : null}
      {!active && (
        <div className="mirror-camera-cover">
          <span className="mirror-camera-icon"><Camera aria-hidden="true" /></span>
          <h1>Decart Lucy · Real-time AI fitting</h1>
          <p>{usable ? "Use ‹ › to change clothes live during fitting." : "Select a catalog garment with an image."}</p>
          {state === "error" && <p className="mirror-camera-error" role="alert">{message || statusText.error}</p>}
          {state === "idle" && message && <p role="status">{message}</p>}
          <label className={`mirror-consent ${needConsent && !consent ? "is-required" : ""}`}>
            <input ref={consentBox} type="checkbox" checked={consent} onChange={e => { setConsent(e.target.checked); if (e.target.checked) setNeedConsent(false); }} />
            I consent to streaming my camera to Decart and usage charges for a session of up to 60 seconds.
          </label>
          <button type="button" className="mirror-primary-button" disabled={!consent || !usable} onClick={start}>
            <Camera aria-hidden="true" /> Start AI fitting
          </button>
        </div>
      )}
      {active && mediaHost?.parentElement && createPortal(
        <div className="mirror-camera-live-indicator" role="status" aria-live="polite">
          <span className="mirror-camera-live-dot" aria-hidden="true" />
          <span>{statusText[state]}{state !== "streaming" && message ? ` · ${message}` : ""}</span>
          {state === "waiting-video" && <button type="button" className="mirror-live-stop" onClick={() => void video.current?.play().catch(playFailed("Playback failed. Stop and check browser permissions."))}>Play</button>}
          <button type="button" className="mirror-live-stop" onClick={() => session.current?.stop()}>
            <Square aria-hidden="true" /> Stop
          </button>
        </div>,
        mediaHost.parentElement,
      )}
    </div>
  );
}
