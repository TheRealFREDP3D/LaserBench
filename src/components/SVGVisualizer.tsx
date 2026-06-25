import React, { useState, useRef, useMemo } from 'react';
import {
  MachineProfile,
  MaterialProfile,
  PatternType,
  SvgPathElement,
  PathSegment,
} from '../types';
import { usePatternStore } from '../store/usePatternStore';
import { Crosshair, Move, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';

interface SVGVisualizerProps {
  svgPaths: SvgPathElement[];
  machine: MachineProfile;
  material: MaterialProfile;
  patternType: PatternType;
  paths: PathSegment[];
  onJog?: (x: number, y: number) => void;
  isPrinting?: boolean;
}

const SVGVisualizer: React.FC<SVGVisualizerProps> = ({ svgPaths, machine, onJog, isPrinting }) => {
  const p = usePatternStore();
  const svgRef = useRef<SVGSVGElement>(null);
  const wheelThrottleRef = useRef(0);

  const isCircular = machine.bedShape === 'circular';
  const bedW = machine.bedWidth;
  const bedH = isCircular ? machine.bedWidth : machine.bedHeight;

  const defaultViewBox = useMemo(() => {
    if (isCircular) {
      return { x: -bedW / 2 - 20, y: -bedW / 2 - 20, w: bedW + 40, h: bedW + 40 };
    }
    return { x: -20, y: -20, w: bedW + 40, h: bedH + 40 };
  }, [bedW, bedH, isCircular]);

  // Track relevant machine dimensions for state reset
  const [viewBox, setViewBox] = useState(defaultViewBox);

  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const getSVGPoint = (e: React.MouseEvent | MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const svgP = pt.matrixTransform(ctm.inverse());
    return { x: svgP.x, y: svgP.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pt = getSVGPoint(e);
    setHoverPos({ x: Math.round(pt.x), y: Math.round(pt.y) });

    if (isDragging) {
      const dx = pt.x - dragStart.x;
      const dy = pt.y - dragStart.y;
      setViewBox((prev) => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsDragging(true);
      const pt = getSVGPoint(e);
      setDragStart(pt);
      e.preventDefault();
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const now = performance.now();
    if (now - wheelThrottleRef.current < 50) return;
    wheelThrottleRef.current = now;
    const scale = e.deltaY > 0 ? 1.1 : 0.9;
    setViewBox((prev) => ({
      ...prev,
      w: prev.w * scale,
      h: prev.h * scale,
      x: prev.x + (prev.w - prev.w * scale) / 2,
      y: prev.y + (prev.h - prev.h * scale) / 2,
    }));
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const scale = direction === 'in' ? 0.9 : 1.1;
    setViewBox((prev) => ({
      ...prev,
      w: prev.w * scale,
      h: prev.h * scale,
      x: prev.x + (prev.w - prev.w * scale) / 2,
      y: prev.y + (prev.h - prev.h * scale) / 2,
    }));
  };

  const handleClick = (e: React.MouseEvent) => {
    if (e.button === 0 && !e.altKey && !isDragging) {
      if (hoverPos && onJog) {
        onJog(hoverPos.x, hoverPos.y);
      }
    }
  };

  const resetView = () => {
    setViewBox(defaultViewBox);
  };

  const renderRulers = () => {
    const ticks = [];
    const step = 50;
    const rangeX = isCircular ? [-bedW / 2, bedW / 2] : [0, bedW];
    const rangeY = isCircular ? [-bedW / 2, bedW / 2] : [0, bedH];

    for (let x = Math.ceil(rangeX[0] / step) * step; x <= rangeX[1]; x += step) {
      ticks.push(
        <g key={`tick-x-${x}`}>
          <line x1={x} y1={rangeY[0]} x2={x} y2={rangeY[1]} stroke="#1a1a1a" strokeWidth="0.5" />
          <text
            x={x}
            y={rangeY[0] - 5}
            fontSize="5"
            fill="#444"
            textAnchor="middle"
            style={{ transform: 'scaleY(-1)' }}
          >
            {x}
          </text>
        </g>
      );
    }
    for (let y = Math.ceil(rangeY[0] / step) * step; y <= rangeY[1]; y += step) {
      ticks.push(
        <g key={`tick-y-${y}`}>
          <line x1={rangeX[0]} y1={y} x2={rangeX[1]} y2={y} stroke="#1a1a1a" strokeWidth="0.5" />
          <text
            x={rangeX[0] - 5}
            y={y}
            fontSize="5"
            fill="#444"
            textAnchor="end"
            dominantBaseline="middle"
            style={{ transform: 'scaleY(-1)' }}
          >
            {y}
          </text>
        </g>
      );
    }
    return ticks;
  };

  return (
    <div
      className="relative w-full h-full flex flex-col bg-[#050505] overflow-hidden select-none group"
      data-tour="svg-canvas"
    >
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <div className="bg-[#0A0A0A]/90 backdrop-blur-md border border-white/10 rounded-lg p-1.5 flex flex-col gap-1 shadow-2xl">
          <button
            onClick={resetView}
            className="p-2 hover:bg-white/5 rounded transition-colors text-neutral-400 hover:text-white"
            title="Reset View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <div className="h-px bg-white/5 mx-1" />
          <button
            onClick={() => handleZoom('in')}
            className="p-2 hover:bg-white/5 rounded transition-colors text-neutral-400 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom('out')}
            className="p-2 hover:bg-white/5 rounded transition-colors text-neutral-400 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
        <div
          className={`bg-[#0A0A0A]/90 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 text-[10px] font-mono shadow-2xl transition-colors ${hoverPos ? 'text-red-500' : 'text-neutral-600'}`}
        >
          {hoverPos ? `X:${hoverPos.x} Y:${hoverPos.y}` : 'COORDS'}
        </div>
      </div>

      <div
        className="flex-1 overflow-hidden cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleClick}
      >
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          className="w-full h-full"
          style={{ transform: 'scaleY(-1)' }}
        >
          <defs>
            <pattern id="grid-minor" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#0A0A0A" strokeWidth="0.5" />
            </pattern>
            <pattern id="grid-major" width="50" height="50" patternUnits="userSpaceOnUse">
              <rect width="50" height="50" fill="url(#grid-minor)" />
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#111" strokeWidth="1" />
            </pattern>
          </defs>

          <rect
            x={viewBox.x}
            y={viewBox.y}
            width={viewBox.w}
            height={viewBox.h}
            fill="url(#grid-major)"
          />

          {renderRulers()}

          {isCircular ? (
            <circle
              cx="0"
              cy="0"
              r={bedW / 2}
              fill="none"
              stroke="#333"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
          ) : (
            <rect
              x="0"
              y="0"
              width={bedW}
              height={bedH}
              fill="none"
              stroke="#333"
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
          )}

          <g>
            {svgPaths.map((sp, i) => (
              <path
                key={i}
                d={sp.d}
                fill="none"
                stroke={sp.stroke}
                strokeWidth={sp.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={isPrinting ? 0.3 : 1}
              />
            ))}
          </g>

          <g transform={`translate(${p.patternPosition.x}, ${p.patternPosition.y})`}>
            <circle r="3" fill="red" opacity="0.4" className="animate-pulse" />
            <line x1="-10" y1="0" x2="10" y2="0" stroke="red" strokeWidth="0.5" opacity="0.2" />
            <line x1="0" y1="-10" x2="0" y2="10" stroke="red" strokeWidth="0.5" opacity="0.2" />
          </g>

          {isPrinting && (
            <circle
              cx="0"
              cy="0"
              r="4"
              fill="red"
              className="animate-ping"
              style={{ transform: `translate(${p.patternPosition.x}px, ${p.patternPosition.y}px)` }}
            />
          )}

          {hoverPos && (
            <g transform={`translate(${hoverPos.x}, ${hoverPos.y})`}>
              <line
                x1="-1000"
                y1="0"
                x2="1000"
                y2="0"
                stroke="red"
                strokeWidth="0.2"
                opacity="0.1"
              />
              <line
                x1="0"
                y1="-1000"
                x2="0"
                y2="1000"
                stroke="red"
                strokeWidth="0.2"
                opacity="0.1"
              />
              <circle
                r="4"
                fill="none"
                stroke="red"
                strokeWidth="0.5"
                strokeDasharray="2 2"
                className="animate-spin-slow"
              />
            </g>
          )}
        </svg>
      </div>

      <div className="p-3 bg-[#0A0A0A] border-t border-white/5 flex items-center justify-between shadow-inner">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Move className="w-3.5 h-3.5 text-neutral-500" />
            <span className="text-[10px] uppercase font-bold text-neutral-500 tracking-widest">
              Pattern Offset
            </span>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center bg-black border border-white/5 rounded px-2 py-1 gap-2">
                <span className="text-[9px] text-neutral-600 font-bold">X</span>
                <input
                  type="number"
                  value={p.patternPosition.x}
                  onChange={(e) =>
                    p.setPatternPosition({
                      ...p.patternPosition,
                      x: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-12 bg-transparent text-[10px] font-mono text-red-500 outline-none"
                />
              </div>
              <div className="flex items-center bg-black border border-white/5 rounded px-2 py-1 gap-2">
                <span className="text-[9px] text-neutral-600 font-bold">Y</span>
                <input
                  type="number"
                  value={p.patternPosition.y}
                  onChange={(e) =>
                    p.setPatternPosition({
                      ...p.patternPosition,
                      y: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-12 bg-transparent text-[10px] font-mono text-red-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[10px] text-neutral-600 font-medium">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded">
            <kbd className="font-sans border border-neutral-700 px-1 rounded text-[8px]">ALT</kbd>
            <span>+ Drag to Pan</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded">
            <Crosshair className="w-3 h-3 text-red-500/50" />
            <span>Click to Jog</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SVGVisualizer;
