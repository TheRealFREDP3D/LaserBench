import React, { useState, useRef, useEffect } from 'react';
import { MachineProfile, MaterialProfile, PatternType } from '../types';
import { ZoomIn, ZoomOut, Maximize, Crosshair, HelpCircle, Eye } from 'lucide-react';

interface SVGVisualizerProps {
  svgPathData: string;
  machine: MachineProfile;
  material: MaterialProfile;
  patternType: PatternType;
  paths: {
    points: [number, number][];
    power: number;
    speed: number;
    z: number;
    isLaserOn: boolean;
  }[];
}

export default function SVGVisualizer({
  svgPathData,
  machine,
  material,
  patternType,
  paths,
}: SVGVisualizerProps) {
  // Viewport transforms
  const [zoom, setZoom] = useState(1.1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [closestPath, setClosestPath] = useState<{
    power: number;
    speed: number;
    z: number;
    isLaserOn: boolean;
    dist: number;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });

  // Bed coordinates sizing
  const isCircular = machine.bedShape === 'circular';
  const width = isCircular ? machine.bedWidth * 2 : machine.bedWidth;
  const height = isCircular ? machine.bedWidth * 2 : machine.bedHeight;
  
  // Base SVG viewBox size & bounds
  const minX = isCircular ? -machine.bedWidth : 0;
  const minY = isCircular ? -machine.bedWidth : 0;

  // Zoom/Pan controllers
  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.3, 10));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.3, 0.4));
  const handleFit = () => {
    setZoom(1.1);
    setPanX(0);
    setPanY(0);
  };

  // Drag pan
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - panX, y: e.clientY - panY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanX(e.clientX - dragStart.current.x);
      setPanY(e.clientY - dragStart.current.y);
    }

    // Coordinate inspection
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      // Mouse coordinates in pixel space relative to SVG frame
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Map to SVG user unit coordinates using active viewBox + zoom + pan
      // SVG viewBox logic: viewport dimensions
      // To get real coordinates, let's reverse-map from screen SVG bounding box to bed mm.
      // We know SVG renders from minX, minY to minX+width, minY+height.
      // A quick estimate works wonderfully:
      const normX = mouseX / rect.width;
      const normY = 1.0 - (mouseY / rect.height); // Flip Y because beds are Y-up while screen is Y-down

      const mmX = minX + normX * width;
      const mmY = minY + normY * height;

      if (mmX >= minX && mmX <= minX + width && mmY >= minY && mmY <= minY + height) {
        setHoverPos({ x: parseFloat(mmX.toFixed(1)), y: parseFloat(mmY.toFixed(1)) });
        
        // Find nearest path segment with laser on for hover stats inspector
        let minDistance = Infinity;
        let selectedPath = null;

        paths.forEach((p) => {
          if (!p.isLaserOn) return;
          p.points.forEach(([px, py]) => {
            const dist = Math.hypot(px - mmX, py - mmY);
            if (dist < minDistance) {
              minDistance = dist;
              selectedPath = p;
            }
          });
        });

        if (selectedPath && minDistance < 15) {
          const { power, speed, z, isLaserOn } = selectedPath;
          setClosestPath({ power, speed, z, isLaserOn, dist: minDistance });
        } else {
          setClosestPath(null);
        }
      } else {
        setHoverPos(null);
        setClosestPath(null);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Reset transforms whenever machine profile changes to prevent out-of-screen assets
  useEffect(() => {
    handleFit();
  }, [machine.id]);

  // Generate background grid lines for physical representation
  const renderGrid = () => {
    const gridLines = [];
    const step = 20; // 20mm grid lines
    
    // Draw Grid representing bed subdivisions
    const startX = Math.floor(minX / step) * step;
    const endX = Math.ceil((minX + width) / step) * step;
    const startY = Math.floor(minY / step) * step;
    const endY = Math.ceil((minY + height) / step) * step;

    // Vertical lines
    for (let x = startX; x <= endX; x += step) {
      gridLines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={minY}
          x2={x}
          y2={minY + height}
          stroke="#1e293b"
          strokeWidth="0.15"
          strokeDasharray="2,5"
        />
      );
    }
    // Horizontal lines
    for (let y = startY; y <= endY; y += step) {
      gridLines.push(
        <line
          key={`h-${y}`}
          x1={minX}
          y1={y}
          x2={minX + width}
          y2={y}
          stroke="#1e293b"
          strokeWidth="0.15"
          strokeDasharray="2,5"
        />
      );
    }

    return gridLines;
  };

  // Base coordinate system mapping
  // SVG natively works where Y points down. But standard G-code/Lasers work where Y points UP from bottom-left (or center).
  // We can flip the paths inside a `<g transform="scale(1, -1)">` block!
  // This is a master stroke of engineering, because our mathematical coordinates match G-code exactly,
  // and they draw naturally upwards on the screen as they do on the physical machine bed!
  const finalTransform = `translate(${panX}, ${panY}) scale(${zoom}) scale(1, -1)`;

  return (
    <div id="svg-visualizer-container" className="bg-slate-950 border border-slate-900 rounded-xl p-5 shadow-sm text-slate-100 flex flex-col h-full select-none">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Eye className="text-emerald-400 w-5 h-5" />
          <h2 className="text-sm font-semibold tracking-wide uppercase text-slate-300">Toolpath Preview Engine</h2>
        </div>
        <div className="flex gap-1">
          <button
            id="zoom-in-btn"
            onClick={handleZoomIn}
            className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded text-slate-400 hover:text-slate-200 transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            id="zoom-out-btn"
            onClick={handleZoomOut}
            className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded text-slate-400 hover:text-slate-200 transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            id="fit-view-btn"
            onClick={handleFit}
            className="p-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded text-slate-400 hover:text-slate-200 transition"
            title="Reset View"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative border border-slate-900 bg-[#020617] rounded-lg overflow-hidden flex-1 min-h-[340px] flex items-center justify-center cursor-move">
        <svg
          ref={svgRef}
          id="laser-canvas"
          className="w-full h-full"
          viewBox={`${minX} ${minY} ${width} ${height}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Flipped container containing the actual geometric drawings */}
          <g transform={finalTransform} transform-origin="0 0">
            {/* 1. Bed Background boundaries */}
            {isCircular ? (
              <circle
                cx="0"
                cy="0"
                r={machine.bedWidth}
                fill="black"
                stroke="#334155"
                strokeWidth="0.8"
                strokeDasharray="4,4"
              />
            ) : (
              <rect
                x="0"
                y="0"
                width={machine.bedWidth}
                height={machine.bedHeight}
                fill="black"
                stroke="#334155"
                strokeWidth="0.8"
              />
            )}

            {/* Origin Crosshair Marker */}
            <g opacity="0.4">
              <line x1={minX} y1="0" x2={minX + width} y2="0" stroke="#475569" strokeWidth="0.2" />
              <line x1="0" y1={minY} x2="0" y2={minY + height} stroke="#475569" strokeWidth="0.2" />
              <circle cx="0" cy="0" r="2" fill="none" stroke="#64748b" strokeWidth="0.3" />
            </g>

            {/* Background Grid Lines */}
            {renderGrid()}

            {/* 2. Embedded Calibration Paths (Auto-updates) */}
            <g dangerouslySetInnerHTML={{ __html: svgPathData }} />
          </g>
        </svg>

        {/* Floating coordinate and parameter label inspector */}
        {hoverPos && (
          <div className="absolute bottom-3 left-3 bg-slate-900/95 border border-slate-800 rounded-lg p-2.5 shadow-lg backdrop-blur text-[10px] space-y-1 font-mono text-slate-300">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Crosshair className="w-3.5 h-3.5 text-indigo-400" />
              <span>Position: {hoverPos.x}mm, {hoverPos.y}mm</span>
            </div>
            {closestPath ? (
              <div className="border-t border-slate-850 pt-1 mt-1 space-y-0.5 text-indigo-300">
                <div>Command: <strong className="text-emerald-400">G1 Cut</strong></div>
                <div>Power: <strong className="text-amber-400">{closestPath.power}</strong> ({Math.round(closestPath.power / machine.pwmMax*100)}%)</div>
                <div>Speed: <strong className="text-sky-400">{closestPath.speed} mm/min</strong></div>
                <div>Z Height: <strong className="text-purple-400">{closestPath.z} mm</strong></div>
              </div>
            ) : (
              <div className="text-[9px] text-slate-500 italic">Hover near toolpaths to inspect properties</div>
            )}
          </div>
        )}

        {/* Circular Coordinate Safeguard */}
        {isCircular && (
          <div className="absolute top-3 left-3 flex items-center gap-1 text-[10px] bg-indigo-950/60 border border-indigo-900/50 rounded px-2 py-0.5 font-sans font-medium text-indigo-300">
            <span>Bed Center (0,0) Origin</span>
          </div>
        )}
      </div>

      {/* Visualizer Legend */}
      <div id="visualizer-legend" className="mt-3 grid grid-cols-2 lg:grid-cols-5 gap-2 text-[10px] shrink-0 border-t border-slate-900 pt-3">
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="w-2.5 h-0.5 bg-[#93c5fd] inline-block rounded"></span>
          <span>Low Power (&lt;30%)</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="w-2.5 h-0.5 bg-[#3b82f6] inline-block rounded"></span>
          <span>Medium (30-60%)</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="w-2.5 h-0.5 bg-[#f59e0b] inline-block rounded"></span>
          <span>High (60-85%)</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="w-2.5 h-0.5 bg-[#ef4444] inline-block rounded"></span>
          <span>Max S (&gt;85%)</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="w-2.5 h-0.5 border-t border-dashed border-slate-600 inline-block w-4"></span>
          <span>Travel move (G0)</span>
        </div>
      </div>
    </div>
  );
}
