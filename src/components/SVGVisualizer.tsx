import { useState, useRef, useEffect, useMemo, memo, type MouseEvent as ReactMouseEvent } from 'react';
import { MachineProfile, MaterialProfile, PatternType } from '../types';
import type { SvgPathElement } from '../lib/gcodeGenerator';
import { ZoomIn, ZoomOut, Maximize, Crosshair, HelpCircle, Eye } from 'lucide-react';
import { useTheme } from '../lib/themeContext';

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
  hoveredPathIndex?: number | null;
  onHoverPath?: (index: number | null) => void;
}

export default memo(function SVGVisualizer({
  svgPaths,
  machine,
  material,
  patternType,
  paths = [],
  hoveredPathIndex = null,
  onHoverPath,
}: SVGVisualizerProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Viewport transforms
  const [zoom, setZoom] = useState(0.95);
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
  const rafRef = useRef<number | null>(null);

  const laserPaths = useMemo(() => paths.filter(p => p.isLaserOn), [paths]);
  const laserPathCount = laserPaths.length;

  const laserStats = useMemo(() => {
    if (laserPathCount === 0) {
      return { powerMin: 0, powerMax: machine.pwmMax, speedMin: 0, speedMax: 0 };
    }
    let powerMin = Infinity, powerMax = -Infinity, speedMin = Infinity, speedMax = -Infinity;
    for (const p of laserPaths) {
      if (p.power < powerMin) powerMin = p.power;
      if (p.power > powerMax) powerMax = p.power;
      if (p.speed < speedMin) speedMin = p.speed;
      if (p.speed > speedMax) speedMax = p.speed;
    }
    return { powerMin, powerMax, speedMin, speedMax };
  }, [laserPaths, laserPathCount, machine.pwmMax]);

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
    setZoom(0.95);
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

    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const normX = mouseX / rect.width;
      const normY = 1.0 - (mouseY / rect.height);

      const mmX = minX + normX * width;
      const mmY = minY + normY * height;

      if (mmX >= minX && mmX <= minX + width && mmY >= minY && mmY <= minY + height) {
        setHoverPos({ x: parseFloat(mmX.toFixed(1)), y: parseFloat(mmY.toFixed(1)) });
        
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
    });
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

    return paths.map((path, idx) => {
      const d = path.points.map((pt, pIdx) => `${pIdx === 0 ? 'M' : 'L'} ${pt[0]} ${pt[1]}`).join(' ');

      let stroke = '#666';
      let strokeDasharray = undefined;
      let strokeWidth = path.isLaserOn ? '0.35' : '0.12';
      let opacity = 1.0;

      if (path.isLaserOn) {
        if (intensityOverlay === 'power') {
          stroke = getGradientColor(path.power, laserStats.powerMin, laserStats.powerMax, false);
        } else if (intensityOverlay === 'speed') {
          stroke = getGradientColor(path.speed, laserStats.speedMin, laserStats.speedMax, true);
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
          stroke = getGradientColor(path.power, laserStats.powerMin, laserStats.powerMax, false);
        } else if (intensityOverlay === 'speed') {
          stroke = getGradientColor(path.speed, laserStats.speedMin, laserStats.speedMax, true);
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

  // Reset simulation when paths change (new pattern generated)
  useEffect(() => {
    setSimStep(0);
    setIsPlaying(false);
  }, [paths]);

  const finalTransform = `translate(${panX}, ${panY}) scale(${zoom}) scale(1, -1)`;

  return (
    <div id="svg-visualizer-container" className={`border rounded-lg p-3 shadow-sm flex flex-col select-none transition-all duration-200 h-full ${
      isLight 
        ? 'bg-white border-zinc-200 text-zinc-800' 
        : 'bg-[#0F0F0F] border-white/10 text-[#E8E8E8]'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <Eye className="text-red-500 w-4 h-4" />
          <h2 className={`text-[11px] font-semibold tracking-wide uppercase font-sans ${isLight ? 'text-zinc-800' : 'text-white'}`}>Toolpath Preview</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Intensity Overlay Mode */}
          <div className="flex items-center gap-1">
            <span className={`text-[10px] font-sans font-bold uppercase tracking-wider ${isLight ? 'text-zinc-500' : 'text-neutral-400'}`}>Overlay:</span>
            <select
              id="intensity-overlay-select"
              value={intensityOverlay}
              onChange={(e) => setIntensityOverlay(e.target.value as 'none' | 'power' | 'speed')}
              className={`text-[10px] px-1.5 py-0.5 rounded border border-solid outline-none cursor-pointer font-sans font-medium transition duration-150 ${
                isLight 
                  ? 'bg-zinc-100 border-zinc-300 text-zinc-800 hover:bg-zinc-200' 
                  : 'bg-[#222] border-white/10 text-neutral-300 hover:border-white/20'
              }`}
            >
              <option value="none">Normal</option>
              <option value="power">Power</option>
              <option value="speed">Speed</option>
            </select>
          </div>

          {/* Automatically reset viewport toggle */}
          <label className="flex items-center gap-1 text-[10px] font-semibold cursor-pointer select-none">
            <input
              id="auto-fit-toggle-input"
              type="checkbox"
              checked={autoFitOnChange}
              onChange={(e) => setAutoFitOnChange(e.target.checked)}
              className="accent-indigo-600 rounded cursor-pointer w-3 h-3"
            />
            <span className={isLight ? 'text-zinc-500' : 'text-neutral-400'}>Auto-fit</span>
          </label>

          <div className="flex gap-1">
            <button
              id="zoom-in-btn"
              onClick={handleZoomIn}
              aria-label="Zoom in"
              className={`p-1 border rounded transition duration-200 cursor-pointer ${
                isLight 
                  ? 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200 hover:text-black' 
                  : 'bg-[#222] border-white/10 hover:bg-[#333] text-[#AAA] hover:text-white'
              }`}
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              id="zoom-out-btn"
              onClick={handleZoomOut}
              aria-label="Zoom out"
              className={`p-1 border rounded transition duration-200 cursor-pointer ${
                isLight 
                  ? 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200 hover:text-black' 
                  : 'bg-[#222] border-white/10 hover:bg-[#333] text-[#AAA] hover:text-white'
              }`}
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              id="fit-view-btn"
              onClick={handleFit}
              aria-label="Reset view to fit"
              className={`p-1 border rounded transition duration-200 cursor-pointer ${
                isLight 
                  ? 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200 hover:text-black' 
                  : 'bg-[#222] border-white/10 hover:bg-[#333] text-[#AAA] hover:text-white'
              }`}
              title="Reset View"
            >
              <Maximize className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* G-code Simulation Control Bar — compact single row above the canvas */}
      <div className={`flex flex-wrap items-center gap-2 px-3 py-1.5 rounded border shrink-0 transition-all duration-200 ${
        isLight ? 'bg-zinc-50 border-zinc-200' : 'bg-[#1A1A1A] border-white/8'
      }`}>
        <div className="flex items-center gap-1.5">
          <input
            id="enable-simulation"
            type="checkbox"
            checked={simActive}
            onChange={(e) => {
              setSimActive(e.target.checked);
              setIsPlaying(false);
              setSimStep(0);
            }}
            className="accent-red-650 rounded cursor-pointer w-3 h-3"
          />
          <label htmlFor="enable-simulation" className={`text-[10px] font-bold uppercase tracking-wider cursor-pointer whitespace-nowrap ${
            isLight ? 'text-zinc-700' : 'text-neutral-300'
          }`}>
            Sim
          </label>
        </div>

        {simActive && paths && paths.length > 0 && (
          <>
            <div className="h-3 w-px bg-white/10 shrink-0" />
            <div className="flex items-center gap-1">
              <button onClick={handleResetSim} className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer font-medium transition border shrink-0 ${isLight ? 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200' : 'bg-[#222] border-white/8 hover:bg-[#333] text-neutral-300'}`} title="Reset">Rst</button>
              <button onClick={handleStepBack} disabled={simStep === 0} className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer font-medium transition border shrink-0 ${isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200 disabled:opacity-40' : 'bg-[#222] border-white/8 hover:bg-[#333] text-neutral-300 disabled:opacity-40'}`} title="Step back">-</button>
              <button onClick={togglePlay} className={`px-2.5 py-0.5 rounded text-[10px] font-bold cursor-pointer font-sans transition border text-white shrink-0 ${isPlaying ? 'bg-amber-600 hover:bg-amber-700 border-amber-700' : 'bg-red-600 hover:bg-red-700 border-red-700'}`} title={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? 'Pause' : 'Play'}</button>
              <button onClick={handleStepForward} disabled={simStep >= paths.length - 1} className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer font-medium transition border shrink-0 ${isLight ? 'bg-zinc-100 border-zinc-200 text-zinc-700 hover:bg-zinc-200 disabled:opacity-40' : 'bg-[#222] border-white/8 hover:bg-[#333] text-neutral-300 disabled:opacity-40'}`} title="Step forward">+</button>
            </div>
            <div className="h-3 w-px bg-white/10 shrink-0" />
            <div className="flex items-center gap-1.5 flex-1 min-w-[120px]">
              <span className="text-[9px] font-mono text-neutral-500 shrink-0">0</span>
              <input id="sim-scrubber" type="range" min="0" max={paths.length - 1} value={simStep} onChange={(e) => { setIsPlaying(false); setSimStep(parseInt(e.target.value) || 0); }} className={`flex-1 h-1 rounded appearance-none cursor-pointer accent-red-650 ${isLight ? 'bg-zinc-300' : 'bg-[#222]'}`} />
              <span className="text-[9px] font-mono text-neutral-500 shrink-0">{paths.length - 1}</span>
            </div>
            <div className="h-3 w-px bg-white/10 shrink-0" />
            <div className="flex items-center gap-1 shrink-0">
              <span className={`text-[9px] font-medium whitespace-nowrap ${isLight ? 'text-zinc-500' : 'text-[#888]'}`}>Spd:</span>
              <select value={playSpeed} onChange={(e) => setPlaySpeed(parseInt(e.target.value) || 1)} className={`text-[9px] px-1 py-0.5 rounded border outline-none cursor-pointer font-sans ${isLight ? 'bg-white border-zinc-300 text-zinc-800' : 'bg-[#222] border-white/10 text-[#EEE]'}`}>
                <option value="1">1x</option>
                <option value="5">5x</option>
                <option value="10">10x</option>
                <option value="25">25x</option>
              </select>
            </div>
            <span className={`text-[9px] font-mono shrink-0 ${isLight ? 'text-zinc-600' : 'text-neutral-400'}`}>
              <strong className="text-red-500">{simStep + 1}</strong>/{paths.length}
            </span>
          </>
        )}

        {simActive && paths && paths[simStep] && (
          <>
            <div className="h-3 w-px bg-white/10 shrink-0" />
            <div className={`text-[9px] font-mono flex items-center gap-2 shrink-0 ${isLight ? 'text-zinc-600' : 'text-neutral-400'}`}>
              <span>{paths[simStep].isLaserOn ? <strong className="text-green-600">G1</strong> : <span className="text-neutral-500">G0</span>}</span>
              <span>S<strong className="text-amber-500">{paths[simStep].power}</strong></span>
              <span>F<strong className="text-blue-500">{paths[simStep].speed}</strong></span>
              <span>Z<strong className="text-purple-500">{paths[simStep].z.toFixed(1)}</strong></span>
            </div>
          </>
        )}
      </div>

      {/* SVG Canvas Area */}
      <div className={`relative border bg-[#050505] rounded overflow-hidden flex-1 min-h-0 flex items-center justify-center cursor-move ${
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
              : 'bg-[#1A1A1A]/95 border-white/10 text-neutral-300'
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

      {/* Visualizer Legend */}
      {intensityOverlay === 'power' ? (
        <div id="visualizer-legend" className={`mt-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[9px] shrink-0 border-t pt-1.5 ${
          isLight ? 'border-zinc-200' : 'border-white/8'
        }`}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-neutral-400 whitespace-nowrap">Power Heatmap:</span>
            <span className="font-mono text-blue-500 font-bold">Min S{laserStats.powerMin}</span>
            <div className="w-28 h-1.5 rounded bg-gradient-to-r from-[#3b82f6] via-[#06b6d4] via-[#10b981] via-[#eab308] to-[#ef4444]" />
            <span className="font-mono text-red-500 font-bold">Max S{laserStats.powerMax}</span>
          </div>
          <div className="flex items-center gap-1 text-neutral-500">
            <span className="w-3 h-px border-t border-dashed border-neutral-600 inline-block"></span>
            <span className={isLight ? 'text-zinc-650' : ''}>G0 Transit</span>
          </div>
        </div>
      ) : intensityOverlay === 'speed' ? (
        <div id="visualizer-legend" className={`mt-1.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[9px] shrink-0 border-t pt-1.5 ${
          isLight ? 'border-zinc-200' : 'border-white/8'
        }`}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-neutral-400 whitespace-nowrap">Speed Heatmap:</span>
            <span className="font-mono text-violet-500 font-bold">Slow {laserPathCount > 0 ? laserStats.speedMin : 100} mm/m</span>
            <div className="w-28 h-1.5 rounded bg-gradient-to-r from-[#8b5cf6] via-[#f97316] to-[#06b6d4]" />
            <span className="font-mono text-cyan-500 font-bold">Fast {laserPathCount > 0 ? laserStats.speedMax : machine.travelSpeed} mm/m</span>
          </div>
          <div className="flex items-center gap-1 text-neutral-500">
            <span className="w-3 h-px border-t border-dashed border-neutral-600 inline-block"></span>
            <span className={isLight ? 'text-zinc-650' : ''}>G0 Transit</span>
          </div>
        </div>
      ) : (
        <div id="visualizer-legend" className={`mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[9px] shrink-0 border-t pt-1.5 ${
          isLight ? 'border-zinc-200' : 'border-white/8'
        }`}>
          <div className="flex items-center gap-1 text-neutral-400">
            <span className="w-2 h-0.5 bg-[#93c5fd] inline-block rounded"></span>
            <span className={isLight ? 'text-zinc-650' : ''}>Low (&lt;30%)</span>
          </div>
          <div className="flex items-center gap-1 text-neutral-400">
            <span className="w-2 h-0.5 bg-[#3b82f6] inline-block rounded"></span>
            <span className={isLight ? 'text-zinc-650' : ''}>Med (30-60%)</span>
          </div>
          <div className="flex items-center gap-1 text-[#AAA]">
            <span className="w-2 h-0.5 bg-[#f59e0b] inline-block rounded"></span>
            <span className={isLight ? 'text-zinc-650' : ''}>High (60-85%)</span>
          </div>
          <div className="flex items-center gap-1 text-red-400">
            <span className="w-2 h-0.5 bg-[#ef4444] inline-block rounded"></span>
            <span className={isLight ? 'text-zinc-650' : ''}>Max (&gt;85%)</span>
          </div>
          <div className="flex items-center gap-1 text-neutral-500">
            <span className="w-3 h-px border-t border-dashed border-neutral-600 inline-block"></span>
            <span className={isLight ? 'text-zinc-600' : ''}>G0 Travel</span>
          </div>
        </div>
      )}
    </div>
  );
});
