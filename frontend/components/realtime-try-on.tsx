"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { DecartFittingSession, type DecartGarment, type FittingState } from "@/lib/decart-fitting";
import styles from "./realtime-try-on.module.css";

const statusText: Record<FittingState, string> = {
  idle: "AI fitting is stopped.", camera: "Requesting camera permission…",
  connecting: "Connecting to Decart Lucy…", "waiting-video": "Waiting for AI video…",
  streaming: "Live Decart AI video", switching: "Sending garment…", error: "AI fitting failed.",
};

export default function RealtimeTryOn({ productId }: { productId: string }) {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const session = useRef<DecartFittingSession | null>(null);
  const [product, setProduct] = useState<DecartGarment | null>(null);
  const [image, setImage] = useState("");
  const [loadError, setLoadError] = useState("");
  const [state, setState] = useState<FittingState>("idle");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const active = !["idle", "error"].includes(state);

  useEffect(() => {
    let mounted = true;
    let objectURL = "";
    const controller = new AbortController();
    setProduct(null); setImage(""); setLoadError(""); setConsent(false);
    async function load() {
      try {
        if (!/^[0-9a-f-]{36}$/i.test(productId)) throw new Error("Choose a real garment from the catalog.");
        const response = await apiFetch("/products", { signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "Sign in to your branch account to load this garment." : "Catalog unavailable. Check your network and try again.");
        const products: DecartGarment[] = await response.json();
        const selected = Array.isArray(products) ? products.find(p => p.id === productId && !p.demo) : null;
        if (!selected) throw new Error("This garment is unavailable in your catalog.");
        const garment = await apiFetch(`/decart/garments/${encodeURIComponent(productId)}`, { signal: controller.signal });
        if (!garment.ok) throw new Error(`Approved garment image unavailable (HTTP ${garment.status}). Check sign-in, publication and image approval.`);
        const blob = await garment.blob();
        if (!["image/jpeg", "image/png"].includes(blob.type) || !blob.size || blob.size > 5 * 1024 * 1024) throw new Error("The garment needs an approved JPEG or PNG image up to 5 MiB.");
        if (!mounted) return;
        objectURL = URL.createObjectURL(blob);
        setImage(objectURL); setProduct(selected);
      } catch (error) { if (mounted) setLoadError(error instanceof Error ? error.message : "Could not load garment. Check your network."); }
    }
    void load();
    return () => { mounted = false; controller.abort(); if (objectURL) URL.revokeObjectURL(objectURL); };
  }, [productId]);

  useEffect(() => {
    let mounted = true;
    const fitting = new DecartFittingSession({
      getCamera: async () => {
        if (window.self !== window.top) throw { code: "TOP_LEVEL_PAGE_REQUIRED" };
        if (!navigator.mediaDevices?.getUserMedia) throw { code: "CAMERA_HTTPS_REQUIRED" };
        return navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      },
      releaseCamera: () => {},
      request: (path, init) => apiFetch(path, init, { retryAuth: path !== "/decart/token" }),
      loadSDK: () => import("@decartai/sdk"),
      state: (next, detail = "") => { if (mounted) { setState(next); setMessage(detail); } },
      remote: stream => {
        if (video.current) {
          video.current.srcObject = stream;
          if (stream) void video.current.play().catch(() => { if (mounted) setMessage("Video playback blocked. Use Play AI video."); });
        }
      },
    });
    session.current = fitting;
    const stop = () => fitting.stop();
    window.addEventListener("pagehide", stop);
    return () => { mounted = false; window.removeEventListener("pagehide", stop); fitting.stop(); session.current = null; };
  }, [productId]);

  useEffect(() => {
    const changed = () => setFullscreen(document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);

  async function toggleFullscreen() {
    try {
      setFullscreenError("");
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (root.current?.requestFullscreen) await root.current.requestFullscreen();
      else setFullscreenError("Fullscreen is unavailable in this browser. The video still fills this page.");
    } catch { setFullscreenError("Fullscreen was denied by the browser. Try the fullscreen button again."); }
  }

  return <main ref={root} className={styles.page}>
    <header className={styles.toolbar}>
      <a href="/mirror" onClick={() => session.current?.stop()}>← Back to Catalog</a>
      <strong>MIRROR AI · Decart Lucy</strong>
      <button onClick={() => void toggleFullscreen()}>{fullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}</button>
    </header>
    <section className={styles.stage} aria-label="AI fitting video">
      <video ref={video} data-decart-output muted playsInline autoPlay onPlaying={() => session.current?.videoPlaying()} />
      {state !== "streaming" && <div className={styles.placeholder}><p>{statusText[state]}</p><p>{product?.name || "Select a catalog garment"}</p></div>}
    </section>
    <footer className={styles.controls}>
      {image && <img src={image} alt={`Selected garment: ${product?.name || ""}`} />}
      <div className={styles.details}>
        <strong>{product?.name || "Loading garment…"}</strong>
        <p role="status" aria-live="polite">{statusText[state]} {state !== "error" && message}</p>
        {loadError && <p role="alert">{loadError}</p>}
        {state === "error" && <p role="alert">{message}</p>}
        {fullscreenError && <p role="alert">{fullscreenError}</p>}
        <label><input type="checkbox" checked={consent} disabled={active} onChange={e => setConsent(e.target.checked)} /> I consent to streaming my camera to Decart and associated usage charges for a session of up to 60 seconds.</label>
      </div>
      <button disabled={!active && (!consent || !product || !image)} onClick={() => active ? session.current?.stop() : product && consent && void session.current?.start(product)}>{active ? "Stop AI Fitting" : "Start AI Fitting"}</button>
      {active && <button onClick={() => void video.current?.play().catch(() => setMessage("Playback failed. Stop and check your browser permissions."))}>Play AI video</button>}
    </footer>
  </main>;
}
