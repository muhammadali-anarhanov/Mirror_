"use client";

import { useEffect, useState, type RefObject } from "react";

const SEGMENTER_WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm";
const PERSON_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";
const MAX_PREVIEW_WIDTH = 720;
const SEGMENT_INTERVAL_MS = 80;

type PersonCutoutCameraProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  active: boolean;
  showPreview: boolean;
  loadingText: string;
  errorText: string;
  onReadyChange: (ready: boolean) => void;
};

export default function PersonCutoutCamera({
  videoRef,
  canvasRef,
  active,
  showPreview,
  loadingText,
  errorText,
  onReadyChange,
}: PersonCutoutCameraProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [hasSegmentationMask, setHasSegmentationMask] = useState(false);

  useEffect(() => {
    if (!active) {
      setIsLoading(false);
      setHasError(false);
      setHasSegmentationMask(false);
      onReadyChange(false);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!video || !canvas || !context) {
      setHasError(true);
      onReadyChange(false);
      return;
    }

    let disposed = false;
    let animationFrame = 0;
    let segmenter: import("@mediapipe/tasks-vision").ImageSegmenter | null = null;
    let maskCanvas: HTMLCanvasElement | null = null;
    let maskContext: CanvasRenderingContext2D | null = null;
    let maskImageData: ImageData | null = null;
    let hasMask = false;
    let isReady = false;
    let lastVideoTime = -1;
    let lastSegmentedAt = 0;

    setIsLoading(true);
    setHasError(false);
    onReadyChange(false);

    const fail = () => {
      if (disposed) return;
      setIsLoading(false);
      setHasError(true);
      setHasSegmentationMask(false);
      onReadyChange(false);
      segmenter?.close();
      segmenter = null;
    };

    const renderFrame = () => {
      if (disposed || !segmenter) return;

      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth && video.videoHeight) {
        const now = performance.now();
        const canSegment = video.currentTime !== lastVideoTime && now - lastSegmentedAt >= SEGMENT_INTERVAL_MS;

        if (canSegment) {
          lastVideoTime = video.currentTime;
          lastSegmentedAt = now;

          try {
            segmenter.segmentForVideo(video, now, (result) => {
              const masks = result.confidenceMasks ?? [];
              const personMask = masks[1];

              try {
                if (!personMask) {
                  fail();
                  return;
                }

                if (!maskCanvas || !maskContext) {
                  maskCanvas = document.createElement("canvas");
                  maskContext = maskCanvas.getContext("2d", { willReadFrequently: true });
                }

                if (!maskContext) {
                  fail();
                  return;
                }

                if (maskCanvas.width !== personMask.width || maskCanvas.height !== personMask.height || !maskImageData) {
                  maskCanvas.width = personMask.width;
                  maskCanvas.height = personMask.height;
                  maskImageData = maskContext.createImageData(personMask.width, personMask.height);
                }

                const currentMaskImageData = maskImageData;
                const confidence = personMask.getAsFloat32Array();
                const pixels = currentMaskImageData.data;

                for (let index = 0; index < confidence.length; index += 1) {
                  const alpha = Math.max(0, Math.min(1, (confidence[index] - 0.12) / 0.72)) * 255;
                  const pixelIndex = index * 4;
                  pixels[pixelIndex] = 255;
                  pixels[pixelIndex + 1] = 255;
                  pixels[pixelIndex + 2] = 255;
                  pixels[pixelIndex + 3] = alpha;
                }

                maskContext.putImageData(currentMaskImageData, 0, 0);
                hasMask = true;

                if (!isReady) {
                  isReady = true;
                  setIsLoading(false);
                  setHasSegmentationMask(true);
                  onReadyChange(true);
                }
              } finally {
                masks.forEach((mask) => mask.close());
              }
            });
          } catch {
            fail();
            return;
          }
        }

        if (hasMask && maskCanvas) {
          const scale = Math.min(1, MAX_PREVIEW_WIDTH / video.videoWidth);
          const width = Math.max(1, Math.round(video.videoWidth * scale));
          const height = Math.max(1, Math.round(video.videoHeight * scale));

          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
          }

          context.clearRect(0, 0, width, height);
          context.drawImage(video, 0, 0, width, height);
          context.globalCompositeOperation = "destination-in";
          context.drawImage(maskCanvas, 0, 0, width, height);
          context.globalCompositeOperation = "source-over";
        }
      }

      animationFrame = requestAnimationFrame(renderFrame);
    };

    const initialize = async () => {
      try {
        const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(SEGMENTER_WASM_URL);
        const nextSegmenter = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: PERSON_MODEL_URL,
            delegate: "CPU",
          },
          runningMode: "VIDEO",
          outputCategoryMask: false,
          outputConfidenceMasks: true,
        });

        if (disposed) {
          nextSegmenter.close();
          return;
        }

        segmenter = nextSegmenter;
        animationFrame = requestAnimationFrame(renderFrame);
      } catch {
        fail();
      }
    };

    void initialize();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      segmenter?.close();
    };
  }, [active, canvasRef, onReadyChange, videoRef]);

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        aria-hidden="true"
        tabIndex={-1}
        className={`mirror-source-video${active ? " is-live-background" : ""}${active && showPreview && (!hasSegmentationMask || hasError) ? " is-visible" : ""}`}
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`mirror-person-canvas${!active || !showPreview ? " is-hidden" : ""}`}
      />
      {active && showPreview && isLoading && (
        <p className="mirror-camera-status" role="status">{loadingText}</p>
      )}
      {active && showPreview && hasError && (
        <p className="mirror-camera-status is-error" role="alert">{errorText}</p>
      )}
    </>
  );
}
