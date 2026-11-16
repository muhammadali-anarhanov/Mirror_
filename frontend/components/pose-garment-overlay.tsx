"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { DEMO_AR_SHIRTS, SHIRT_HEIGHT, SHIRT_WIDTH, garmentTransform, smoothTransform, type Affine, type ARShirt, type Viewport } from "@/lib/pose-overlay";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm";
const MODEL = "/models/pose_landmarker_lite.task";
type Phase = "off" | "loading" | "searching" | "tracking" | "error";

type Props = { videoRef: RefObject<HTMLVideoElement | null>; active: boolean; shirt: ARShirt; statusTarget: HTMLElement | null };

export default function PoseGarmentOverlay({ videoRef, active, shirt, statusTarget }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shirtRef = useRef(shirt);
  const images = useRef(new Map<ARShirt, HTMLImageElement>());
  const [status, setStatus] = useState<{ phase: Phase; text: string }>({ phase: "off", text: "Start the camera and show both shoulders and hips." });
  const [retry, setRetry] = useState(0);
  useEffect(() => { shirtRef.current = shirt; }, [shirt]);
  useEffect(() => {
    for (const item of DEMO_AR_SHIRTS) { const image = new Image(); image.src = item.image; images.current.set(item.id, image); }
    return () => images.current.clear();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !video || !ctx) return;
    const clear = () => { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); };
    if (!active) { clear(); setStatus({ phase: "off", text: "Start the camera or enable live 2D AR. Show your shoulders and hips." }); return; }
    let disposed = false, failed = false, frame = 0, lastTime = -1, lastInference = 0, detectedFrames = 0, drawnFrames = 0;
    let task: import("@mediapipe/tasks-vision").PoseLandmarker | null = null;
    let transform: Affine | null = null;
    let lastPhase = "", lastText = "";
    const report = (phase: Phase, text: string) => {
      if (disposed || (phase === lastPhase && text === lastText)) return;
      lastPhase = phase; lastText = text; canvas.dataset.poseState = phase; setStatus({ phase, text });
    };
    report("loading", "Loading pose tracking. No photos leave this browser.");
    const render = () => {
      if (disposed || failed || !task) return;
      if (video.readyState >= 2 && video.videoWidth && video.videoHeight && video.currentTime !== lastTime && performance.now() - lastInference >= 50) {
        lastTime = video.currentTime; lastInference = performance.now();
        const rect = canvas.getBoundingClientRect();
        const style = getComputedStyle(video);
        const ratio = Math.min(devicePixelRatio || 1, 2);
        const width = Math.round(rect.width * ratio), height = Math.round(rect.height * ratio);
        if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; transform = null; }
        clear();
        try {
          const result = task.detectForVideo(video, lastInference);
          detectedFrames++; canvas.dataset.poseFrames = String(detectedFrames);
          const cssMatrix = new DOMMatrixReadOnly(style.transform === "none" ? undefined : style.transform);
          const position = style.objectPosition.split(" ").map(v => v.endsWith("%") ? parseFloat(v) / 100 : 0.5);
          const view: Viewport = { videoWidth: video.videoWidth, videoHeight: video.videoHeight, width: rect.width, height: rect.height, fit: style.objectFit === "contain" ? "contain" : "cover", mirrored: cssMatrix.a < 0, positionX: position[0] ?? 0.5, positionY: position[1] ?? 0.5 };
          const next = garmentTransform(result.landmarks[0] ?? [], view);
          result.close();
          if (!next) { transform = null; report("searching", "Pose not detected clearly. Face the camera and step back until both shoulders and hips are visible."); }
          else {
            transform = smoothTransform(transform, next);
            const image = images.current.get(shirtRef.current);
            if (image?.complete && image.naturalWidth) {
              ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
              ctx.transform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);
              ctx.drawImage(image, 0, 0, SHIRT_WIDTH, SHIRT_HEIGHT);
              drawnFrames++; canvas.dataset.overlayFrames = String(drawnFrames); canvas.dataset.shirt = shirtRef.current;
              report("tracking", "Torso tracked — live 2D shirt overlay. Move slowly; keep hips visible.");
            } else report("loading", "Loading the transparent demo shirt.");
          }
        } catch { failed = true; clear(); report("error", "Pose tracking failed. The live camera is still available; retry tracking."); }
      }
      frame = requestAnimationFrame(render);
    };
    void (async () => {
      try {
        const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(WASM);
        const next = await PoseLandmarker.createFromOptions(vision, { baseOptions: { modelAssetPath: MODEL, delegate: "CPU" }, runningMode: "VIDEO", numPoses: 1, minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5, outputSegmentationMasks: false });
        if (disposed) { next.close(); return; }
        task = next; report("searching", "Face the camera and show both shoulders and hips."); frame = requestAnimationFrame(render);
      } catch { report("error", "Pose model/WASM could not load. Check the connection and retry. Camera remains usable."); }
    })();
    return () => { disposed = true; cancelAnimationFrame(frame); task?.close(); clear(); };
  }, [active, videoRef, retry]);

  const message = <div className={`mirror-pose-status is-${active ? status.phase : "off"}`} role="status" aria-live="polite">
    {active ? status.text : "Start the camera and enable live 2D AR. Stand back to show your shoulders and hips."}
    {active && status.phase === "error" && <button type="button" onClick={() => setRetry(n => n + 1)}>Retry pose tracking</button>}
  </div>;
  return <>
    <canvas ref={canvasRef} className={`mirror-garment-overlay${active ? " is-active" : ""}`} aria-label="Live torso-tracked 2D shirt overlay" data-pose-state={active ? status.phase : "off"} />
    {statusTarget ? createPortal(message, statusTarget) : null}
  </>;
}
