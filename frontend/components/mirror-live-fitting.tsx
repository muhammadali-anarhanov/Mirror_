"use client";

// Live Decart fitting inside the mirror catalog frame. The carousel's current
// product is worn; changing it during a session calls switchGarment on the open
// connection, so no new token or paid session is created.
import { useEffect, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { DecartFittingSession, type DecartGarment, type FittingState } from "@/lib/decart-fitting";

const statusText: Record<FittingState, string> = {
  idle: "", camera: "Requesting camera permission…", connecting: "Connecting to Decart Lucy…",
  "waiting-video": "Waiting for AI video…", streaming: "Live AI fitting", switching: "Changing garment…", error: "AI fitting failed.",
};

export function MirrorLiveFitting({ product }: { product: (DecartGarment & { image?: string }) | null | undefined }) {
  const video = useRef<HTMLVideoElement>(null);
  const preview = useRef<HTMLVideoElement>(null);
  const session = useRef<DecartFittingSession | null>(null);
  const [state, setState] = useState<FittingState>("idle");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const active = !["idle", "error"].includes(state);
  const stateRef = useRef(state);
  stateRef.current = state;
  // play() rejects with AbortError when a failed session clears the stream; never let that hide the real error.
  const playFailed = (text: string) => (e: unknown) => { if ((e as { name?: string })?.name !== "AbortError" && stateRef.current !== "error") setMessage(text); };
  const usable = Boolean(product && product.image && !product.demo);

  useEffect(() => {
    let mounted = true;
    const fitting = new DecartFittingSession({
      getCamera: async () => {
        if (!navigator.mediaDevices?.getUserMedia) throw { code: "CAMERA_HTTPS_REQUIRED" };
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        // Show the plain camera while Decart connects instead of a black frame.
        if (preview.current) { preview.current.srcObject = stream; void preview.current.play().catch(() => {}); }
        return stream;
      },
      releaseCamera: () => { if (preview.current) preview.current.srcObject = null; },
      request: (path, init) => apiFetch(path, init, { retryAuth: path !== "/decart/token" }),
      loadSDK: () => import("@decartai/sdk"),
      state: (next, detail = "") => { if (mounted) { setState(next); setMessage(detail); } },
      remote: stream => {
        if (video.current) {
          video.current.srcObject = stream;
          if (stream) void video.current.play().catch(e => { if (mounted) playFailed("Tap the video to play.")(e); });
        }
      },
    });
    session.current = fitting;
    const stop = () => fitting.stop();
    window.addEventListener("pagehide", stop);
    return () => { mounted = false; window.removeEventListener("pagehide", stop); fitting.stop(); session.current = null; };
  }, []);

  // Carousel moved to another garment: wear it in the running session.
  const productId = product?.id;
  const activeRef = useRef(active);
  activeRef.current = active;
  useEffect(() => {
    if (product && usable && activeRef.current) void session.current?.switchGarment(product);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const showVideo = state === "streaming" || state === "switching";
  const showPreview = active && !showVideo;
  return (
    <div className={`mirror-camera-frame ${showVideo ? "" : "is-camera-off"}`}>
      <video ref={preview} className="mirror-tryon-result" style={{ opacity: showPreview ? 1 : 0, transform: "scaleX(-1)" }} muted playsInline autoPlay />
      <video ref={video} className="mirror-tryon-result" style={{ opacity: showVideo ? 1 : 0 }} muted playsInline autoPlay
        onPlaying={() => session.current?.videoPlaying()} onClick={() => void video.current?.play().catch(() => {})} />
      {!active && (
        <div className="mirror-camera-cover">
          <span className="mirror-camera-icon"><Camera aria-hidden="true" /></span>
          <h1>Decart Lucy · Real-time AI fitting</h1>
          {<>
            <p>{usable ? "Use ‹ › to change clothes live during fitting." : "Select a catalog garment with an image."}</p>
            {state === "error" && <p className="mirror-camera-error" role="alert">{message || statusText.error}</p>}
            <label style={{ display: "flex", gap: 8, maxWidth: 260, margin: "0 0 14px", fontSize: 11, color: "rgba(255,250,241,.85)", textAlign: "left" }}>
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
              I consent to streaming my camera to Decart and usage charges for a session of up to 30 seconds.
            </label>
            <button type="button" className="mirror-primary-button" disabled={!consent || !usable} onClick={() => product && void session.current?.start(product)}>
              <Camera aria-hidden="true" /> Start AI fitting
            </button>
          </>}
        </div>
      )}
      {active && (
        <div style={{ position: "absolute", left: "50%", bottom: 12, zIndex: 2, transform: "translateX(-50%)", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#fff", textShadow: "0 1px 8px #000" }}>{statusText[state]}</span>
          <button type="button" className="mirror-secondary-button" style={{ minHeight: 32, padding: "0 12px" }} onClick={() => session.current?.stop()}>Stop</button>
        </div>
      )}
    </div>
  );
}
