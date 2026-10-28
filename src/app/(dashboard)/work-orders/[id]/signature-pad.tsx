"use client";

import { Eraser, Loader2, PenLine } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { buttonClass } from "@/components/ui/styles";
import { useToast } from "@/components/ui/toast";
import { saveSignature } from "../actions";

const CANVAS_HEIGHT_CSS = 192;
const EXPORT_WIDTH = 600;

type Point = { x: number; y: number };

/**
 * Pad tanda tangan klien. Menggambar langsung di canvas memakai pointer events (jari, stylus, atau mouse);
 * `touch-action: none` mencegah halaman ikut bergulir saat menandatangani.
 * Koordinat dihitung dalam piksel canvas sehingga tetap akurat jika lebar tampilan berubah.
 */
export function SignaturePad({ workOrderId, savedPath, version }: { workOrderId: number; savedPath: string | null; version: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const last = useRef<Point | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [editing, setEditing] = useState(savedPath === null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  const setup = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.round(CANVAS_HEIGHT_CSS * ratio);
    const context = canvas.getContext("2d");
    if (!context) return;
    context.lineWidth = 2.5 * ratio;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#0f172a";
    setHasInk(false);
  }, []);

  useEffect(() => {
    if (editing) setup();
  }, [editing, setup]);

  function pointFrom(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return { x: ((event.clientX - rect.left) * canvas.width) / rect.width, y: ((event.clientY - rect.top) * canvas.height) / rect.height };
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFrom(event);
    last.current = point;
    // Titik tunggal saat hanya mengetuk.
    context.beginPath();
    context.arc(point.x, point.y, context.lineWidth / 2, 0, Math.PI * 2);
    context.fillStyle = "#0f172a";
    context.fill();
    context.beginPath();
    context.moveTo(point.x, point.y);
    setHasInk(true);
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const previous = last.current;
    const context = event.currentTarget.getContext("2d");
    if (!previous || !context) return;
    const point = pointFrom(event);
    const middle = { x: (previous.x + point.x) / 2, y: (previous.y + point.y) / 2 };
    context.quadraticCurveTo(previous.x, previous.y, middle.x, middle.y);
    context.stroke();
    context.beginPath();
    context.moveTo(middle.x, middle.y);
    last.current = point;
  }

  function endStroke() {
    last.current = null;
  }

  function clear() {
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  }

  function save() {
    const canvas = canvasRef.current;
    if (!canvas || !hasInk) return;
    // Perkecil ke lebar tetap agar berkas kecil (puluhan KB) dan ukurannya seragam.
    const output = document.createElement("canvas");
    output.width = EXPORT_WIDTH;
    output.height = Math.round((EXPORT_WIDTH * canvas.height) / canvas.width);
    output.getContext("2d")?.drawImage(canvas, 0, 0, output.width, output.height);
    const dataUrl = output.toDataURL("image/png");

    startTransition(async () => {
      const result = await saveSignature(workOrderId, dataUrl);
      if (result.status === "error") {
        toast.show({ type: "error", message: result.message });
        return;
      }
      toast.show({ type: "success", message: "Tanda tangan klien tersimpan." });
      setEditing(false);
    });
  }

  if (!editing && savedPath) {
    return (
      <div className="space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/files/${savedPath}?v=${version}`} alt="Tanda tangan klien" className="h-32 rounded-lg border border-slate-200 bg-white p-2" />
        <button type="button" onClick={() => setEditing(true)} className={buttonClass("secondary", "sm")}>
          <PenLine aria-hidden="true" className="size-4" />
          Tanda tangan ulang
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Area tanda tangan klien. Gambar tanda tangan dengan jari atau stylus."
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endStroke}
        onPointerCancel={endStroke}
        style={{ height: CANVAS_HEIGHT_CSS, touchAction: "none" }}
        className="w-full cursor-crosshair rounded-lg border-2 border-dashed border-slate-300 bg-white"
      />
      <p className="text-xs text-slate-500">Minta klien menandatangani di kotak di atas.</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={save} disabled={!hasInk || pending} className={buttonClass("primary")}>
          {pending && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
          {pending ? "Menyimpan…" : "Simpan tanda tangan"}
        </button>
        <button type="button" onClick={clear} disabled={!hasInk || pending} className={buttonClass("secondary")}>
          <Eraser aria-hidden="true" className="size-4" />
          Hapus
        </button>
        {savedPath && (
          <button type="button" onClick={() => setEditing(false)} disabled={pending} className={buttonClass("ghost")}>
            Batal
          </button>
        )}
      </div>
    </div>
  );
}
