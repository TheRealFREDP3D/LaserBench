import { useState, useRef, useEffect, type MouseEvent as ReactMouseEvent } from 'react';
import { MachineProfile, MaterialProfile, PatternType } from '../types';
import type { SvgPathElement } from '../lib/gcodeGenerator';
import { ZoomIn, ZoomOut, Maximize, Crosshair, HelpCircle, Eye } from 'lucide-react';

interface SVGVisualizerProps {
  svgPaths: SvgPathElement[];
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
  theme?: 'dark' | 'light';
  hoveredPathIndex?: number | null;
  onHoverPath?: (index: number | null) => void;
}

export default function SVGVisualizer({
  svgPaths,
  machine,
  material,
  patternType,
  paths = [],
  theme = 'dark',
  hoveredPathIndex = null,
  onHoverPath,
}: SVGVisualizerProps) {
  const isLight = theme === 'light';

  // Viewport transforms
  const [zoom, setZoom] = useState(1.1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [autoFitOnChange, setAutoFitOnChange] = useState(true);
  const [intensityOverlay, setIntensityOverlay] = useState<'none' | 'power' | 'speed'>('none');
  const [closestPath, setClosestPath] = useState<{
    power: number;
    speed: number;
    z: number;
    isLaserOn: boolean;
    dist: number;
  } | null>(null);

  // G-code line-by-line simulation state
  const [simActive, setSimActive] = useState(true);
  const [simStep, setSimStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1); // steps to advance per tick
  const [tickMs, setTickMs] = useState(80); // timer sleep interval

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
  const handleMouseDown = (e: ReactMouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - panX, y: e.clientY - panY };
  };

  const handleMouseMove = (e: ReactMouseEvent) => {
    if (isDragging) {
      setPanX(e.clientX - dragStart.current.x);
      setPanY(e.clientY - dragStart.current.y);
    }

    // Coordinate inspection
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const normX = mouseX / rect.width;
      const normY = 1.0 - (mouseY / rect.height); // Flip Y because beds are Y-up while screen is Y-down

      const mmX = minX + normX * width;
      const mmY = minY + normY * height;

      if (mmX >= minX && mmX <= minX + width && mmY >= minY && mmY <= minY + height) {
        setHoverPos({ x: parseFloat(mmX.toFixed(1)), y: parseFloat(mmY.toFixed(1)) });
        
        // Find nearest path segment with laser on for hover stats inspector
        let minDistance = Infinity;
        let selectedPath = null;

        if (paths) {
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
        }

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

  // Reset transforms whenever generated results change, if auto-fit toggle is active
  useEffect(() => {
    if (autoFitOnChange) {
      handleFit();
    }
  }, [svgPaths, autoFitOnChange]);

  // Simulation playback effect block
  useEffect(() => {
    if (!isPlaying || !simActive || !paths || paths.length === 0) return;

    const interval = setInterval(() => {
      setSimStep((prev) => {
        const next = prev + playSpeed;
        if (next >= paths.length - 1) {
          setIsPlaying(false);
          return paths.length - 1;
        }
        return next;
      });
    }, tickMs);

    return () => clearInterval(interval);
  }, [isPlaying, simActive, paths, playSpeed, tickMs]);

  // Handle Play/Pause toggles
  const togglePlay = () => {
    if (simStep >= (paths?.length ?? 1) - 1) {
      setSimStep(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    setSimStep((prev) => Math.max(0, prev - 1));
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    setSimStep((prev) => Math.min((paths?.length ?? 1) - 1, prev + 1));
  };

  const handleResetSim = () => {
    setIsPlaying(false);
    setSimStep(0);
  };

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

  // Helper to retrieve gradient interpolation colors
  const getGradientColor = (val: number, min: number, max: number, isSpeed: boolean) => {
    const range = max - min;
    const norm = range > 0 ? (val - min) / range : 0.5;

    if (!isSpeed) {
      // Power Gradient: Cold Blue (#3b82f6) -> Cyan (#06b6d4) -> Green (#10b981) -> Yellow (#eab308) -> Red (#ef4444)
      if (norm < 0.25) {
        const t = norm * 4;
        const r = Math.round(59 + (6 - 59) * t);
        const g = Math.round(130 + (182 - 130) * t);
        const b = Math.round(246 + (212 - 246) * t);
        return `rgb(${r}, ${g}, ${b})`;
      } else if (norm < 0.5) {
        const t = (norm - 0.25) * 4;
        const r = Math.round(6 + (16 - 6) * t);
        const g = Math.round(182 + (185 - 182) * t);
        const b = Math.round(212 + (129 - 212) * t);
        return `rgb(${r}, ${g}, ${b})`;
      } else if (norm < 0.75) {
        const t = (norm - 0.5) * 4;
        const r = Math.round(16 + (234 - 16) * t);
        const g = Math.round(185 + (179 - 185) * t);
        const b = Math.round(129 + (8 - 129) * t);
        return `rgb(${r}, ${g}, ${b})`;
      } else {
        const t = (norm - 0.75) * 4;
        const r = Math.round(234 + (239 - 234) * t);
        const g = Math.round(179 + (68 - 179) * t);
        const b = Math.round(8 + (68 - 8) * t);
        return `rgb(${r}, ${g}, ${b})`;
      }
    } else {
      // Speed Gradient: Slow Purple (#8b5cf6) -> Mid Orange (#f97316) -> Fast Cyan (#06b6d4)
      if (norm < 0.5) {
        const t = norm * 2;
        const r = Math.round(139 + (249 - 139) * t);
        const g = Math.round(92 + (115 - 92) * t);
        const b = Math.round(246 + (22 - 246) * t);
        return `rgb(${r}, ${g}, ${b})`;
      } else {
        const t = (norm - 0.5) * 2;
        const r = Math.round(249 + (6 - 249) * t);
        const g = Math.round(115 + (182 - 110) * t);
        const b = Math.round(22 + (212 - 22) * t);
        return `rgb(${r}, ${g}, ${b})`;
      }
    }
  };

  // Render static full paths colored with power/speed intensity gradients
  const renderOverlayPaths = () => {
    if (!paths || paths.length === 0) return null;

    const laserPaths = paths.filter(p => p.isLaserOn);
    const powers = laserPaths.map(p => p.power);
    const speeds = laserPaths.map(p => p.speed);

    const minP = powers.length > 0 ? Math.min(...powers) : 0;
    const maxP = powers.length > 0 ? Math.max(...powers) : machine.pwmMax;
    const minS = speeds.length > 0 ? Math.min(...speeds) : 100;
    const maxS = speeds.length > 0 ? Math.max(...speeds) : machine.travelSpeed;

    return paths.map((path, idx) => {
      const d = path.points.map((pt, pIdx) => `${pIdx === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`).join(' ');

      let stroke = '#666';
      let strokeDasharray = undefined;
      let strokeWidth = path.isLaserOn ? '0.35' : '0.12';
      let opacity = 1.0;

      if (path.isLaserOn) {
        if (intensityOverlay === 'power') {
          stroke = getGradientColor(path.power, minP, maxP, false);
        } else if (intensityOverlay === 'speed') {
          stroke = getGradientColor(path.speed, minS, maxS, true);
        }
      } else {
        stroke = '#475569';
        strokeDasharray = '0.4,0.4';
        opacity = 0.22; // Keep transits faint when showing intensity heatmap
      }

      return (
        <path
          key={`overlay-${idx}`}
          d={d}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          opacity={opacity}
          fill="none"
        />
      );
    });
  };

  // Render the step simulated paths cleanly
  const renderSimulatedPaths = () => {
    if (!paths || paths.length === 0) return null;

    const laserPaths = paths.filter(p => p.isLaserOn);
    const powers = laserPaths.map(p => p.power);
    const speeds = laserPaths.map(p => p.speed);

    const minPower = powers.length > 0 ? Math.min(...powers) : 0;
    const maxPower = powers.length > 0 ? Math.max(...powers) : machine.pwmMax;
    const minSpeed = speeds.length > 0 ? Math.min(...speeds) : 100;
    const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : machine.travelSpeed;

    return paths.map((path, idx) => {
      const isPast = idx < simStep;
      const isActive = idx === simStep;
      const isFuture = idx > simStep;

      if (isFuture) {
        // Draw travel paths almost transparently and G1 cut lines very faintly
        const stroke = path.isLaserOn 
          ? (isLight ? 'rgba(120, 113, 108, 0.15)' : '#1e293b') 
          : (isLight ? 'rgba(212, 212, 216, 0.08)' : '#0f172a');
        const strokeDasharray = path.isLaserOn ? undefined : '1,3';
        const strokeWidth = '0.08';
        const d = path.points.map((pt, pIdx) => `${pIdx === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`).join(' ');

        return (
          <path
            key={`sim-future-${idx}`}
            d={d}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            fill="none"
          />
        );
      }

      const d = path.points.map((pt, pIdx) => `${pIdx === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`).join(' ');
      
      let stroke = '#666';
      let strokeDasharray = undefined;
      let strokeWidth = path.isLaserOn ? '0.35' : '0.12';
      let opacity = 1.0;

      if (path.isLaserOn) {
        if (intensityOverlay === 'power') {
          stroke = getGradientColor(path.power, minPower, maxPower, false);
        } else if (intensityOverlay === 'speed') {
          stroke = getGradientColor(path.speed, minSpeed, maxSpeed, true);
        } else {
          const ratio = path.power / machine.pwmMax;
          if (ratio < 0.3) stroke = '#93c5fd';
          else if (ratio < 0.6) stroke = '#3b82f6';
          else if (ratio < 0.85) stroke = '#f59e0b';
          else stroke = '#ef4444';
        }
      } else {
        stroke = '#475569';
        strokeDasharray = '0.4,0.4';
      }

      if (isActive) {
        stroke = '#10b981'; // Vivid green for current step line
        strokeWidth = '0.9';
        opacity = 1.0;
      } else if (isPast) {
        opacity = 0.55;
      }

      return (
        <path
          key={`sim-${idx}`}
          d={d}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          opacity={opacity}
          fill="none"
        />
      );
    });
  };

  // Render G-code laser target coordinate pointer
  const renderLaserHead = () => {
    if (!paths || paths.length === 0 || simStep >= paths.length) return null;
    const currentPath = paths[simStep];
    if (!currentPath || !currentPath.points || currentPath.points.length === 0) return null;

    const [lastX, lastY] = currentPath.points[currentPath.points.length - 1];

    return (
      <g>
        {/* Pulsing warning circle on tool focus area */}
        <circle
          cx={lastX}
          cy={lastY}
          r="1.8"
          fill={currentPath.isLaserOn ? '#ef4444' : '#3b82f6'}
          opacity="0.35"
          className="animate-pulse"
          style={{ transformOrigin: `${lastX}px ${lastY}px` }}
        />
        {/* Outer targeting frame ring */}
        <circle
          cx={lastX}
          cy={lastY}
          r="1.1"
          fill="none"
          stroke={currentPath.isLaserOn ? '#f59e0b' : '#94a3b8'}
          strokeWidth="0.18"
        />
        {/* Central hot spot */}
        <circle
          cx={lastX}
          cy={lastY}
          r="0.4"
          fill={currentPath.isLaserOn ? '#ef4444' : '#64748b'}
        />
      </g>
    );
  };

  const finalTransform = `translate(${panX}, ${panY}) scale(${zoom}) scale(1, -1)`;

  return (
    <div id="svg-visualizer-container" className={`border rounded-lg p-5 shadow-sm flex flex-col h-full select-none transition-all duration-200 ${
      isLight 
        ? 'bg-white border-zinc-200 text-zinc-800' 
        : 'bg-[#0E0E0E] border-white/10 text-[#E0E0E0]'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Eye className="text-red-500 w-5 h-5" />
          <h2 className={`text-sm font-semibold tracking-wide uppercase font-sans ${isLight ? 'text-zinc-800' : 'text-white'}`}>Toolpath Preview Engine</h2>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {/* Intensity Overlay Mode */}
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-sans font-bold uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-neutral-400'}`}>Overlay Mode:</span>
            <select
              id="intensity-overlay-select"
              value={intensityOverlay}
              onChange={(e) => setIntensityOverlay(e.target.value as 'none' | 'power' | 'speed')}
              className={`text-[11px] px-2 py-1 rounded border border-solid outline-none cursor-pointer font-sans font-medium transition duration-150 ${
                isLight 
                  ? 'bg-zinc-100 border-zinc-300 text-zinc-800 hover:bg-zinc-200' 
                  : 'bg-[#222] border-white/10 text-neutral-300 hover:border-white/20'
              }`}
            >
              <option value="none">Normal (Bands)</option>
              <option value="power">🔥 Power Gradient</option>
              <option value="speed">⚡ Speed Gradient</option>
            </select>
          </div>

          {/* Automatically reset viewport toggle */}
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
            <input
              id="auto-fit-toggle-input"
              type="checkbox"
              checked={autoFitOnChange}
              onChange={(e) => setAutoFitOnChange(e.target.checked)}
              className="accent-indigo-600 rounded cursor-pointer w-3.5 h-3.5"
            />
            <span className={isLight ? 'text-zinc-500' : 'text-neutral-400'}>Auto-fit Viewport</span>
          </label>

          <div className="flex gap-1.5">
            <button
              id="zoom-in-btn"
              onClick={handleZoomIn}
              className={`p-2 border rounded transition duration-200 cursor-pointer ${
                isLight 
                  ? 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200 hover:text-black' 
                  : 'bg-[#222] border-white/10 hover:bg-[#333] text-[#AAA] hover:text-white'
              }`}
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              id="zoom-out-btn"
              onClick={handleZoomOut}
              className={`p-2 border rounded transition duration-200 cursor-pointer ${
                isLight 
                  ? 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200 hover:text-black' 
                  : 'bg-[#222] border-white/10 hover:bg-[#333] text-[#AAA] hover:text-white'
              }`}
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              id="fit-view-btn"
              onClick={handleFit}
              className={`p-2 border rounded transition duration-200 cursor-pointer ${
                isLight 
                  ? 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200 hover:text-black' 
                  : 'bg-[#222] border-white/10 hover:bg-[#333] text-[#AAA] hover:text-white'
              }`}
              title="Reset View"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className={`relative border bg-[#050505] rounded overflow-hidden flex-1 min-h-[340px] flex items-center justify-center cursor-move ${
        isLight ? 'border-zinc-300' : 'border-white/8'
      }`}>
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
          <g transform={finalTransform} transformOrigin="0 0">
            {/* 1. Bed Background boundaries */}
            {isCircular ? (
              <circle
                cx="0"
                cy="0"
                r={machine.bedWidth}
                fill="black"
                stroke="#222"
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
                stroke="#222"
                strokeWidth="0.8"
              />
            )}

            {/* Origin Crosshair Marker */}
            <g opacity="0.35">
              <line x1={minX} y1="0" x2={minX + width} y2="0" stroke="#334155" strokeWidth="0.25" />
              <line x1="0" y1={minY} x2="0" y2={minY + height} stroke="#334155" strokeWidth="0.25" />
              <circle cx="0" cy="0" r="2" fill="none" stroke="#475569" strokeWidth="0.3" />
            </g>

            {/* Background Grid Lines */}
            {renderGrid()}

            {/* 2. Embedded Calibration Paths (Auto-updates/Simulates) */}
            {simActive ? (
              <>
                {renderSimulatedPaths()}
                {renderLaserHead()}
                {hoveredPathIndex !== null && paths[hoveredPathIndex] && (
                  <path
                    d={paths[hoveredPathIndex].points.map((pt, pIdx) => `${pIdx === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`).join(' ')}
                    stroke="#fbbf24"
                    strokeWidth="2.0"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    className="animate-pulse"
                    opacity="0.95"
                    filter="drop-shadow(0px 0px 4px rgba(251, 191, 36, 0.6))"
                  />
                )}
              </>
            ) : intensityOverlay !== 'none' ? (
              <>
                {renderOverlayPaths()}
                {hoveredPathIndex !== null && paths[hoveredPathIndex] && (
                  <path
                    d={paths[hoveredPathIndex].points.map((pt, pIdx) => `${pIdx === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`).join(' ')}
                    stroke="#fbbf24"
                    strokeWidth="2.0"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    className="animate-pulse"
                    opacity="0.95"
                    filter="drop-shadow(0px 0px 4px rgba(251, 191, 36, 0.6))"
                  />
                )}
              </>
            ) : (
              <>
                {svgPaths.map((sp, i) => (
                  <path
                    key={`svg-default-${i}`}
                    d={sp.d}
                    fill={sp.fill}
                    stroke={sp.stroke}
                    strokeWidth={sp.strokeWidth}
                    strokeLinecap={sp.strokeLinecap}
                    strokeLinejoin={sp.strokeLinejoin}
                  />
                ))}
                {hoveredPathIndex !== null && paths[hoveredPathIndex] && (
                  <path
                    d={paths[hoveredPathIndex].points.map((pt, pIdx) => `${pIdx === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`).join(' ')}
                    stroke="#fbbf24"
                    strokeWidth="2.0"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    className="animate-pulse"
                    opacity="0.95"
                    filter="drop-shadow(0px 0px 4px rgba(251, 191, 36, 0.6))"
                  />
                )}
              </>
            )}
          </g>
        </svg>

        {/* Floating coordinate and parameter label inspector */}
        {hoverPos && (
          <div className={`absolute bottom-3 left-3 border rounded p-2.5 shadow-lg backdrop-blur text-[10px] space-y-1 font-mono pointer-events-none select-none transition-all duration-200 ${
            isLight 
              ? 'bg-white/95 border-zinc-300 text-zinc-700' 
              : 'bg-[#151515]/95 border-white/10 text-neutral-300'
          }`}>
            <div className={`flex items-center gap-1.5 ${isLight ? 'text-zinc-500' : 'text-neutral-400'}`}>
              <Crosshair className="w-3.5 h-3.5 text-red-500 font-bold" />
              <span>Position: {hoverPos.x}mm, {hoverPos.y}mm</span>
            </div>
            {closestPath ? (
              <div className={`border-t pt-1 mt-1 space-y-0.5 ${isLight ? 'text-zinc-600 border-zinc-200' : 'text-red-400 border-white/8'}`}>
                <div>Command: <strong className={isLight ? 'text-zinc-900 font-bold' : 'text-white'}>G1 Cut</strong></div>
                <div>Power: <strong className="text-red-500 font-bold">{closestPath.power}</strong> ({Math.round(closestPath.power / machine.pwmMax*100)}%)</div>
                <div>Speed: <strong className={isLight ? 'text-zinc-900' : 'text-white'}>{closestPath.speed} mm/min</strong></div>
                <div>Z Height: <strong className={isLight ? 'text-zinc-900' : 'text-white'}>{closestPath.z} mm</strong></div>
              </div>
            ) : (
              <div className={`text-[9px] italic ${isLight ? 'text-zinc-400' : 'text-[#666]'}`}>Hover near toolpaths to inspect properties</div>
            )}
          </div>
        )}

        {/* Circular Coordinate Safeguard */}
        {isCircular && (
          <div className="absolute top-3 left-3 flex items-center gap-1 text-[10px] bg-red-950/40 border border-red-900/40 rounded px-2 py-0.5 font-sans font-medium text-red-400 font-bold">
            <span>Bed Center (0,0) Origin</span>
          </div>
        )}
      </div>

      {/* G-code Simulation View Control Panel */}
      <div className={`mt-3 p-3 rounded border transition-all duration-200 ${
        isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#151515] border-white/8'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <input
              id="enable-simulation"
              type="checkbox"
              checked={simActive}
              onChange={(e) => {
                setSimActive(e.target.checked);
                setIsPlaying(false);
                setSimStep(0);
              }}
              className="accent-red-650 rounded cursor-pointer w-3.5 h-3.5"
            />
            <label htmlFor="enable-simulation" className={`text-xs font-bold uppercase tracking-wider cursor-pointer ${
              isLight ? 'text-zinc-700' : 'text-neutral-300'
            }`}>
              📁 Enable G-code Path Simulation
            </label>
          </div>
          
          {simActive && (
            <div className={`text-[10px] sm:text-right font-mono px-2 py-0.5 rounded ${
              isLight ? 'bg-zinc-100 text-zinc-600' : 'bg-black/40 text-neutral-400'
            }`}>
              Path Step: <strong className="text-red-500 font-bold">{simStep + 1}</strong> of <strong>{paths?.length ?? 0}</strong>
            </div>
          )}
        </div>

        {simActive && paths && paths.length > 0 && (
          <div className={`mt-3 pt-3 border-t border-dashed space-y-3 ${
            isLight ? 'border-zinc-250' : 'border-white/8'
          }`}>
            {/* Scrubber Range Slider - Full Width */}
            <div className="flex items-center gap-2.5 w-full">
              <span className="text-[10px] font-mono text-neutral-500">0</span>
              <input
                id="sim-scrubber"
                type="range"
                min="0"
                max={paths.length - 1}
                value={simStep}
                onChange={(e) => {
                  setIsPlaying(false);
                  setSimStep(parseInt(e.target.value) || 0);
                }}
                className={`flex-1 h-1.5 rounded appearance-none cursor-pointer accent-red-650 ${
                  isLight ? 'bg-zinc-300' : 'bg-[#222]'
                }`}
              />
              <span className="text-[10px] font-mono text-neutral-500">{paths.length - 1}</span>
            </div>

            {/* Controls Button Suite + Playback Speed Multiplier Row */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Controls Button Suite */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleResetSim}
                  className={`p-1 px-2.5 rounded text-[11px] cursor-pointer font-medium transition border ${
                    isLight 
                      ? 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200' 
                      : 'bg-[#222] border-white/8 hover:bg-[#333] text-neutral-300'
                  }`}
                  title="Reset simulation to beginning"
                >
                  Reset
                </button>
                <button
                  onClick={handleStepBack}
                  disabled={simStep === 0}
                  className={`p-1 px-2.5 rounded text-[11px] cursor-pointer font-medium transition border ${
                    isLight 
                      ? 'bg-zinc-105 border-zinc-200 text-zinc-700 hover:bg-zinc-200 disabled:opacity-40' 
                      : 'bg-[#222] border-white/8 hover:bg-[#333] text-neutral-300 disabled:opacity-40'
                  }`}
                  title="Previous path step"
                >
                  Step -
                </button>
                <button
                  onClick={togglePlay}
                  className={`p-1 px-4 rounded text-[11px] font-bold cursor-pointer font-sans transition border text-white ${
                    isPlaying 
                      ? 'bg-amber-600 hover:bg-amber-700 border-amber-700' 
                      : 'bg-red-600 hover:bg-red-700 border-red-700'
                  }`}
                  title={isPlaying ? "Pause simulation" : "Play step-by-step simulation"}
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                  onClick={handleStepForward}
                  disabled={simStep >= paths.length - 1}
                  className={`p-1 px-2.5 rounded text-[11px] cursor-pointer font-medium transition border ${
                    isLight 
                      ? 'bg-zinc-105 border-zinc-200 text-zinc-700 hover:bg-zinc-200 disabled:opacity-40' 
                      : 'bg-[#222] border-white/8 hover:bg-[#333] text-neutral-300 disabled:opacity-40'
                  }`}
                  title="Next path step"
                >
                  Step +
                </button>
              </div>

              {/* Playback Speed Multiplier */}
              <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                <span className={`text-[10px] font-medium whitespace-nowrap ${isLight ? 'text-zinc-500' : 'text-[#888]'}`}>Speed:</span>
                <select
                  value={playSpeed}
                  onChange={(e) => setPlaySpeed(parseInt(e.target.value) || 1)}
                  className={`text-[10px] px-1.5 py-0.5 rounded border border-solid outline-none cursor-pointer font-sans ${
                    isLight 
                      ? 'bg-white border-zinc-300 text-zinc-800' 
                      : 'bg-[#222] border-white/10 text-[#EEE]'
                  }`}
                >
                  <option value="1">1x (Slow)</option>
                  <option value="5">5x (Med)</option>
                  <option value="10">10x (Fast)</option>
                  <option value="25">25x (Turbo)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Selected Step Information Panel */}
        {simActive && paths && paths[simStep] && (
          <div className={`mt-2.5 p-2 rounded text-[10px] font-mono grid grid-cols-2 md:grid-cols-4 gap-2 border-t border-dashed ${
            isLight ? 'bg-zinc-100/50 border-zinc-250 text-zinc-600' : 'bg-black/35 border-white/5 text-neutral-400'
          }`}>
            <div>
              Cmd: <strong className={paths[simStep].isLaserOn ? 'text-green-600 font-bold' : (isLight ? 'text-zinc-400' : 'text-neutral-500')}>
                {paths[simStep].isLaserOn ? 'G1 Laser ON' : 'G0 Transit'}
              </strong>
            </div>
            <div>
              Power: <strong className="text-amber-500">
                S{paths[simStep].power} ({Math.round(paths[simStep].power / machine.pwmMax * 100)}%)
              </strong>
            </div>
            <div>
              Speed: <strong className="text-blue-500 font-bold">F{paths[simStep].speed} mm/min</strong>
            </div>
            <div>
              Bed Z: <strong className="text-purple-500">Z{paths[simStep].z.toFixed(2)} mm</strong>
            </div>
          </div>
        )}
      </div>

      {/* Visualizer Legend */}
      {intensityOverlay === 'power' ? (
        <div id="visualizer-legend" className={`mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-[10px] shrink-0 border-t pt-3 ${
          isLight ? 'border-zinc-200' : 'border-white/8'
        }`}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-neutral-400 whitespace-nowrap">Calibration Heatmap Calibration:</span>
            <span className="font-mono text-blue-500 font-bold">Min S{paths.filter(p=>p.isLaserOn).length > 0 ? Math.min(...paths.filter(p=>p.isLaserOn).map(p=>p.power)) : 0}</span>
            <div className="w-36 h-2 rounded bg-gradient-to-r from-[#3b82f6] via-[#06b6d4] via-[#10b981] via-[#eab308] to-[#ef4444]" />
            <span className="font-mono text-red-500 font-bold">Max S{paths.filter(p=>p.isLaserOn).length > 0 ? Math.max(...paths.filter(p=>p.isLaserOn).map(p=>p.power)) : machine.pwmMax}</span>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-500">
            <span className="w-2.5 h-0.5 border-t border-dashed border-neutral-600 inline-block w-4"></span>
            <span className={isLight ? 'text-zinc-650' : ''}>Transit / Move (G0)</span>
          </div>
        </div>
      ) : intensityOverlay === 'speed' ? (
        <div id="visualizer-legend" className={`mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-[10px] shrink-0 border-t pt-3 ${
          isLight ? 'border-zinc-200' : 'border-white/8'
        }`}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-neutral-400 whitespace-nowrap">Calibration Speed Heatmap:</span>
            <span className="font-mono text-violet-500 font-bold">Slow {paths.filter(p=>p.isLaserOn).length > 0 ? Math.min(...paths.filter(p=>p.isLaserOn).map(p=>p.speed)) : 100} mm/m</span>
            <div className="w-36 h-2 rounded bg-gradient-to-r from-[#8b5cf6] via-[#f97316] to-[#06b6d4]" />
            <span className="font-mono text-cyan-500 font-bold">Fast {paths.filter(p=>p.isLaserOn).length > 0 ? Math.max(...paths.filter(p=>p.isLaserOn).map(p=>p.speed)) : machine.travelSpeed} mm/m</span>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-500">
            <span className="w-2.5 h-0.5 border-t border-dashed border-neutral-600 inline-block w-4"></span>
            <span className={isLight ? 'text-zinc-650' : ''}>Transit / Move (G0)</span>
          </div>
        </div>
      ) : (
        <div id="visualizer-legend" className={`mt-3 grid grid-cols-2 lg:grid-cols-5 gap-2 text-[10px] shrink-0 border-t pt-3 ${
          isLight ? 'border-zinc-200' : 'border-white/8'
        }`}>
          <div className="flex items-center gap-1.5 text-neutral-400">
            <span className="w-2.5 h-0.5 bg-[#93c5fd] inline-block rounded"></span>
            <span className={isLight ? 'text-zinc-650' : ''}>Low Power (&lt;30%)</span>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-400">
            <span className="w-2.5 h-0.5 bg-[#3b82f6] inline-block rounded"></span>
            <span className={isLight ? 'text-zinc-650' : ''}>Medium (30-60%)</span>
          </div>
          <div className="flex items-center gap-1.5 text-[#AAA]">
            <span className="w-2.5 h-0.5 bg-[#f59e0b] inline-block rounded"></span>
            <span className={isLight ? 'text-zinc-650' : ''}>High (60-85%)</span>
          </div>
          <div className="flex items-center gap-1.5 text-red-400">
            <span className="w-2.5 h-0.5 bg-[#ef4444] inline-block rounded"></span>
            <span className={isLight ? 'text-zinc-650' : ''}>Max S (&gt;85%)</span>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-500">
            <span className="w-2.5 h-0.5 border-t border-dashed border-neutral-600 inline-block w-4"></span>
            <span className={isLight ? 'text-zinc-600' : ''}>Travel move (G0)</span>
          </div>
        </div>
      )}
    </div>
  );
}
