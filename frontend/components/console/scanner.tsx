"use client"

// Barcode scanning for phones and desktops. Uses the browser BarcodeDetector
// when present (Android, ChromeOS, macOS), otherwise loads ZXing on demand.
// USB/Bluetooth scanners type like a keyboard, so the manual field works too.
import { useEffect, useRef, useState, type FormEvent } from "react"
import { Camera, ScanLine } from "lucide-react"
import { useText } from "@/components/marketing-language"
import { Modal } from "./ui"

type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> }
type ZXingReader = { decodeFromVideoDevice: (id: string | undefined, video: HTMLVideoElement, cb: (result: { getText: () => string } | null) => void) => Promise<unknown>; reset: () => void }
declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats: string[] }) => Detector
    ZXing?: { BrowserMultiFormatReader: new () => ZXingReader }
  }
}

const ZXING_URL = "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js"
let zxingLoading: Promise<void> | null = null
function loadZXing() {
  if (window.ZXing) return Promise.resolve()
  zxingLoading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = ZXING_URL
    script.async = true
    script.crossOrigin = "anonymous"
    script.onload = () => resolve()
    script.onerror = () => { zxingLoading = null; reject(new Error("Scanner library could not be loaded. Type the code instead.")) }
    document.head.appendChild(script)
  })
  return zxingLoading
}

export function ScanDialog({ title, onCode, onClose }: { title: string; onCode: (code: string) => void; onClose: () => void }) {
  const t = useText()
  const video = useRef<HTMLVideoElement>(null)
  const [manual, setManual] = useState("")
  const [status, setStatus] = useState("Starting camera…")
  const done = useRef(false)
  const onCodeRef = useRef(onCode)
  onCodeRef.current = onCode

  useEffect(() => {
    let stream: MediaStream | null = null
    let reader: ZXingReader | null = null
    let timer: ReturnType<typeof setInterval> | null = null
    let cancelled = false
    const found = (code: string) => {
      if (done.current || !code.trim()) return
      done.current = true
      navigator.vibrate?.(80)
      onCodeRef.current(code.trim())
    }
    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) { setStatus("Camera is unavailable here. Type or scan the code with a USB scanner."); return }
      try {
        if (window.BarcodeDetector) {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
          if (cancelled || !video.current) return
          video.current.srcObject = stream
          await video.current.play().catch(() => {})
          const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "code_93", "itf", "codabar", "qr_code", "data_matrix"] })
          setStatus("Point the camera at the barcode")
          timer = setInterval(async () => {
            if (!video.current || video.current.readyState < 2) return
            try { const codes = await detector.detect(video.current); if (codes[0]?.rawValue) found(codes[0].rawValue) } catch { /* next frame */ }
          }, 220)
        } else {
          await loadZXing()
          if (cancelled || !video.current || !window.ZXing) return
          reader = new window.ZXing.BrowserMultiFormatReader()
          setStatus("Point the camera at the barcode")
          await reader.decodeFromVideoDevice(undefined, video.current, (result) => { if (result) found(result.getText()) })
        }
      } catch (error) {
        const name = (error as { name?: string })?.name
        setStatus(name === "NotAllowedError" ? "Camera permission was denied. Allow it in the browser or type the code." : error instanceof Error && error.message.startsWith("Scanner") ? error.message : "Camera could not start. Type or scan the code with a USB scanner.")
      }
    }
    void start()
    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
      reader?.reset()
      stream?.getTracks().forEach((track) => track.stop())
      const current = video.current?.srcObject as MediaStream | null
      current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  function submit(event: FormEvent) {
    event.preventDefault()
    if (manual.trim()) { done.current = true; onCode(manual.trim()) }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <div className="cx-scanner"><video ref={video} muted playsInline autoPlay /><span className="cx-scanner-frame" /><span className="cx-scanner-line" /></div>
      <p className="cx-muted cx-small" role="status"><Camera aria-hidden="true" style={{ width: 14, verticalAlign: -2 }} /> {t(status)}</p>
      <form className="cx-input-row" onSubmit={submit}>
        <input className="cx-input" value={manual} onChange={(e) => setManual(e.target.value)} placeholder={t("Barcode or SKU")} aria-label={t("Barcode or SKU")} autoFocus inputMode="text" />
        <button className="cx-btn is-primary" type="submit"><ScanLine aria-hidden="true" />{t("Find")}</button>
      </form>
    </Modal>
  )
}

/** Field that also receives USB scanner input (they type the code and press Enter). */
export function ScanBar({ onCode, onCamera, placeholder, title, text, button }: { onCode: (code: string) => void; onCamera: () => void; placeholder: string; title: string; text: string; button: string }) {
  const t = useText()
  const [value, setValue] = useState("")
  return (
    <form className="cx-scan-hero" onSubmit={(e) => { e.preventDefault(); if (value.trim()) { onCode(value.trim()); setValue("") } }}>
      <ScanLine aria-hidden="true" />
      <div><strong>{t(title)}</strong><span>{t(text)}</span></div>
      <input className="cx-input" value={value} onChange={(e) => setValue(e.target.value)} placeholder={t(placeholder)} aria-label={t(placeholder)} />
      <button type="button" className="cx-btn is-big" onClick={onCamera}><Camera aria-hidden="true" />{t(button)}</button>
    </form>
  )
}
