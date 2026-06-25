import * as React from "react";
import type { TrackState } from "../../views/shared/types.js";

const BEAT_WIDTH = 40;
const HEADER_HEIGHT = 24;
const RULER_HEIGHT = 24;
const MIN_TRACK_HEIGHT = 60;

export interface TimelineCanvasProps {
  tracks: TrackState[];
  positionBeats: number;
  loopStart: number;
  loopEnd: number;
  timeSignatureNumerator?: number;
  onSeek: (beats: number) => void;
  onSelectRegion: (regionId: string | null) => void;
  onMoveRegion: (regionId: string, start: number) => void;
}

interface CanvasSize {
  width: number;
  height: number;
  dpr: number;
}

function useCanvasSize(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = React.useState<CanvasSize>({ width: 0, height: 0, dpr: 1 });

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
      setSize({
        width: Math.max(0, Math.floor(rect.width)),
        height: Math.max(0, Math.floor(rect.height)),
        dpr,
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [containerRef]);

  return size;
}

export const TimelineCanvas: React.FC<TimelineCanvasProps> = ({
  tracks,
  positionBeats,
  loopStart,
  loopEnd,
  timeSignatureNumerator = 4,
  onSeek,
  onSelectRegion,
  onMoveRegion,
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);
  const [scrollX, setScrollX] = React.useState(0);
  const [drag, setDrag] = React.useState<
    | { type: "seek"; startX: number }
    | { type: "region"; regionId: string; startBeats: number; startX: number }
    | null
  >(null);
  const pendingMoveRef = React.useRef<{ regionId: string; start: number } | null>(null);

  const sizedTracks = React.useMemo(
    () =>
      tracks.map((t) => ({
        ...t,
        height: Math.max(MIN_TRACK_HEIGHT, t.height || MIN_TRACK_HEIGHT),
      })),
    [tracks],
  );

  const totalHeight = React.useMemo(
    () => HEADER_HEIGHT + RULER_HEIGHT + sizedTracks.reduce((sum, t) => sum + t.height, 0),
    [sizedTracks],
  );

  const { width, height, dpr } = useCanvasSize(containerRef);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reset transform before resizing to avoid compounding scales.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    canvas.width = Math.max(1, width * dpr);
    canvas.height = Math.max(1, (height > 0 ? height : totalHeight) * dpr);
    ctx.scale(dpr, dpr);

    const drawWidth = width;
    const drawHeight = height > 0 ? height : totalHeight;

    const styles = getComputedStyle(document.documentElement);
    const bg = styles.getPropertyValue("--vsdaw-bg").trim();
    const fg = styles.getPropertyValue("--vsdaw-fg").trim();
    const border = styles.getPropertyValue("--vsdaw-border").trim();
    const active = styles.getPropertyValue("--vsdaw-active-bg").trim();
    const button = styles.getPropertyValue("--vsdaw-button-bg").trim();

    // Background
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, drawWidth, drawHeight);

    // Time ruler
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.fillStyle = fg;
    ctx.font = "11px sans-serif";
    ctx.textBaseline = "middle";

    const beatWidth = BEAT_WIDTH * scale;
    const visibleStart = scrollX / beatWidth;
    const visibleBeats = drawWidth / beatWidth;
    const startBar = Math.max(0, Math.floor(visibleStart / timeSignatureNumerator));
    const endBar = Math.max(0, Math.ceil((visibleStart + visibleBeats) / timeSignatureNumerator));

    for (let bar = startBar; bar <= endBar; bar++) {
      const x = bar * timeSignatureNumerator * beatWidth - scrollX;
      if (x < -beatWidth || x > drawWidth + beatWidth) continue;
      ctx.beginPath();
      ctx.moveTo(x, HEADER_HEIGHT);
      ctx.lineTo(x, HEADER_HEIGHT + RULER_HEIGHT);
      ctx.stroke();
      ctx.fillText(`B${bar + 1}`, x + 4, HEADER_HEIGHT + RULER_HEIGHT / 2);
      for (let beat = 1; beat < timeSignatureNumerator; beat++) {
        const bx = x + beat * beatWidth;
        ctx.beginPath();
        ctx.moveTo(bx, HEADER_HEIGHT + RULER_HEIGHT - 8);
        ctx.lineTo(bx, HEADER_HEIGHT + RULER_HEIGHT);
        ctx.stroke();
      }
    }

    // Loop markers
    const loopXs = [loopStart, loopEnd].map((b) => b * beatWidth - scrollX);
    const loopLeft = Math.min(loopXs[0], loopXs[1]);
    const loopRight = Math.max(loopXs[0], loopXs[1]);
    ctx.fillStyle = button;
    ctx.globalAlpha = 0.15;
    ctx.fillRect(loopLeft, HEADER_HEIGHT + RULER_HEIGHT, loopRight - loopLeft, drawHeight);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = button;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(loopLeft, HEADER_HEIGHT + RULER_HEIGHT);
    ctx.lineTo(loopLeft, drawHeight);
    ctx.moveTo(loopRight, HEADER_HEIGHT + RULER_HEIGHT);
    ctx.lineTo(loopRight, drawHeight);
    ctx.stroke();
    ctx.setLineDash([]);

    // Tracks
    let y = HEADER_HEIGHT + RULER_HEIGHT;
    for (const track of sizedTracks) {
      ctx.fillStyle = track.color;
      ctx.globalAlpha = 0.08;
      ctx.fillRect(0, y, drawWidth, track.height);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = border;
      ctx.beginPath();
      ctx.moveTo(0, y + track.height);
      ctx.lineTo(drawWidth, y + track.height);
      ctx.stroke();

      for (const region of track.regions) {
        const rx = region.start * beatWidth - scrollX;
        const rw = Math.max(4, region.duration * beatWidth);
        if (rx + rw < 0 || rx > drawWidth) continue;
        ctx.fillStyle = region.color || track.color;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(rx + 1, y + 4, rw - 2, track.height - 8);
        ctx.globalAlpha = 1;
        ctx.fillStyle = fg;
        ctx.save();
        ctx.beginPath();
        ctx.rect(rx + 6, y + 4, Math.max(0, rw - 12), track.height - 8);
        ctx.clip();
        ctx.fillText(region.name, rx + 6, y + track.height / 2);
        ctx.restore();
      }
      y += track.height;
    }

    // Playhead
    const px = positionBeats * beatWidth - scrollX;
    ctx.strokeStyle = active || "#007fd4";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, HEADER_HEIGHT + RULER_HEIGHT);
    ctx.lineTo(px, drawHeight);
    ctx.stroke();
  }, [
    sizedTracks,
    positionBeats,
    loopStart,
    loopEnd,
    scale,
    scrollX,
    width,
    height,
    dpr,
    totalHeight,
    timeSignatureNumerator,
  ]);

  // Flush pending region move on mouse up (throttle bus traffic).
  const flushPendingMove = React.useCallback(() => {
    if (pendingMoveRef.current) {
      onMoveRegion(pendingMoveRef.current.regionId, pendingMoveRef.current.start);
      pendingMoveRef.current = null;
    }
  }, [onMoveRegion]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setScale((s) => Math.max(0.25, Math.min(4, s - e.deltaY * 0.001)));
    } else {
      setScrollX((x) => Math.max(0, x + e.deltaX));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + scrollX;
    const beats = x / (BEAT_WIDTH * scale);

    if (e.shiftKey) {
      onSeek(Math.max(0, beats));
      setDrag({ type: "seek", startX: e.clientX });
      return;
    }

    // Hit-test regions
    let y = HEADER_HEIGHT + RULER_HEIGHT;
    for (const track of sizedTracks) {
      if (e.clientY - rect.top >= y && e.clientY - rect.top < y + track.height) {
        for (const region of track.regions) {
          const rx = region.start * BEAT_WIDTH * scale;
          const rw = Math.max(4, region.duration * BEAT_WIDTH * scale);
          if (x >= rx && x <= rx + rw) {
            onSelectRegion(region.id);
            setDrag({
              type: "region",
              regionId: region.id,
              startBeats: region.start,
              startX: e.clientX,
            });
            return;
          }
        }
      }
      y += track.height;
    }

    onSelectRegion(null);
    onSeek(Math.max(0, beats));
    setDrag({ type: "seek", startX: e.clientX });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drag) return;
    if (drag.type === "seek") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollX;
      const beats = x / (BEAT_WIDTH * scale);
      onSeek(Math.max(0, beats));
    } else if (drag.type === "region") {
      const deltaPixels = e.clientX - drag.startX;
      const deltaBeats = deltaPixels / (BEAT_WIDTH * scale);
      pendingMoveRef.current = {
        regionId: drag.regionId,
        start: Math.max(0, drag.startBeats + deltaBeats),
      };
    }
  };

  const handleMouseUp = () => {
    flushPendingMove();
    setDrag(null);
  };

  const emptyState = sizedTracks.length === 0 && (
    <output
      aria-live="polite"
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--vsdaw-fg)",
        opacity: 0.5,
        fontSize: 12,
        pointerEvents: "none",
      }}
    >
      No tracks to display
    </output>
  );

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      style={{ flex: 1, overflow: "auto", position: "relative" }}
    >
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Timeline canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          display: "block",
          width: width > 0 ? width : "100%",
          height: Math.max(height, totalHeight),
          cursor: drag ? "grabbing" : "default",
        }}
      />
      {emptyState}
    </div>
  );
};
