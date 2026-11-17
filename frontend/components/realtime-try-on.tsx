"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { DecartFittingSession, type DecartGarment, type FittingState } from "@/lib/decart-fitting";
import { stepGarment } from "@/lib/garment-step";
import styles from "./realtime-try-on.module.css";

const statusText: Record<FittingState, string> = {
  idle: "AI fitting is stopped.", camera: "Requesting camera permission…",
  connecting: "Connecting to Decart Lucy…", "waiting-video": "Waiting for AI video…",
  streaming: "Live Decart AI video", switching: "Sending garment…", error: "AI fitting failed.",
};

type CatalogGarment = DecartGarment & { image?: string };

export default function RealtimeTryOn({ productId }: { productId: string }) {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const preview = useRef<HTMLVideoElement>(null);
  const session = useRef<DecartFittingSession | null>(null);
  const [product, setProduct] = useState<DecartGarment | null>(null);
  const [catalog, setCatalog] = useState<CatalogGarment[]>([]);
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
        const products: CatalogGarment[] = await response.json();
        if (mounted && Array.isArray(products)) setCatalog(products.filter(p => !p.demo && p.image));
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
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        // Show the plain camera while Decart connects instead of a black screen.
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

  // Switch the worn garment inside the running session (no new token or paid session).
  function chooseGarment(next: CatalogGarment) {
    if (next.id === product?.id || state === "switching") return;
    setProduct(next); setImage(next.image || ""); setLoadError("");
    window.history.replaceState(null, "", `/mirror/try-on?productId=${encodeURIComponent(next.id)}`);
    if (active) void session.current?.switchGarment(next);
  }

  function step(dir: 1 | -1) {
    const next = stepGarment(catalog, product?.id, dir);
    if (next) chooseGarment(next);
  }
  const stepRef = useRef(step);
  stepRef.current = step;
  const swipeX = useRef<number | null>(null);

  // ← / → keys switch the garment (also during a live session).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { e.preventDefault(); stepRef.current(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); stepRef.current(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
    <section className={styles.stage} aria-label="AI fitting video"
      onPointerDown={e => { swipeX.current = e.clientX; }}
      onPointerUp={e => { const start = swipeX.current; swipeX.current = null; if (start !== null && Math.abs(e.clientX - start) > 60) step(e.clientX < start ? 1 : -1); }}>
      <video ref={preview} muted playsInline autoPlay style={{ opacity: active && state !== "streaming" && state !== "switching" ? 1 : 0, transform: "scaleX(-1)" }} />
      <video ref={video} data-decart-output muted playsInline autoPlay onPlaying={() => session.current?.videoPlaying()} />
      {catalog.length > 1 && <>
        <button className={`${styles.arrow} ${styles.arrowLeft}`} aria-label="Previous garment" disabled={state === "switching"} onPointerDown={e => e.stopPropagation()} onClick={() => step(-1)}>‹</button>
        <button className={`${styles.arrow} ${styles.arrowRight}`} aria-label="Next garment" disabled={state === "switching"} onPointerDown={e => e.stopPropagation()} onClick={() => step(1)}>›</button>
      </>}
      {!active && <div className={styles.placeholder}><p>{statusText[state]}</p><p>{product?.name || "Select a catalog garment"}</p></div>}
    </section>
    {catalog.length > 1 && <nav className={styles.strip} aria-label="Choose garment">
      {catalog.map(item => <button key={item.id} className={item.id === product?.id ? styles.current : ""} aria-pressed={item.id === product?.id} disabled={state === "switching"} onClick={() => chooseGarment(item)}>
        <img src={item.image} alt="" /><span>{item.name.replace(/^TEST - /, "")}</span>
      </button>)}
    </nav>}
    <footer className={styles.controls}>
      {image && <img src={image} alt={`Selected garment: ${product?.name || ""}`} />}
      <div className={styles.details}>
        <strong>{product?.name || "Loading garment…"}</strong>
        <p role="status" aria-live="polite">{statusText[state]} {state !== "error" && message}</p>
        {loadError && <p role="alert">{loadError}</p>}
        {state === "error" && <p role="alert">{message}</p>}
        {fullscreenError && <p role="alert">{fullscreenError}</p>}
        <label><input type="checkbox" checked={consent} disabled={active} onChange={e => setConsent(e.target.checked)} /> I consent to streaming my camera to Decart and associated usage charges for a session of up to 30 seconds.</label>
      </div>
      <button disabled={!active && (!consent || !product || !image)} onClick={() => active ? session.current?.stop() : product && consent && void session.current?.start(product)}>{active ? "Stop AI Fitting" : "Start AI Fitting"}</button>
      {active && <button onClick={() => void video.current?.play().catch(() => setMessage("Playback failed. Stop and check your browser permissions."))}>Play AI video</button>}
    </footer>
  </main>;
}
