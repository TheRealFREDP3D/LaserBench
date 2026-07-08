import React, { useMemo } from 'react';
import { MachineProfile } from '../types';
import { DeltaKinematics } from '../lib/deltaKinematics';

interface MachineFrontViewProps {
  machine: MachineProfile;
  currentPos: { x: number; y: number; z: number };
  width?: number;
  height?: number;
}

const MachineFrontView: React.FC<MachineFrontViewProps> = ({
  machine,
  currentPos,
  width = 300,
  height = 200,
}) => {
  const isDelta = !!machine.isDelta;

  // Z Scale: Bed at 0, max height at maybe machine.zSecure + 50
  const maxZ = Math.max(machine.zSecure, machine.zFocused, currentPos.z) + 20;
  const minZ = -10; // slightly below bed
  const scaleZ = (z: number) => height - ((z - minZ) / (maxZ - minZ)) * height;

  const deltaKin = useMemo(() => {
    if (!isDelta) return null;
    return new DeltaKinematics({
      deltaRadius: machine.deltaRadius,
      deltaRodLength: machine.deltaRodLength,
      deltaTowerAngleOffset: machine.deltaTowerAngleOffset,
      printRadius: machine.deltaPrintRadius,
    });
  }, [isDelta, machine]);

  const carriageHeights = useMemo(() => {
    if (!deltaKin) return null;
    return deltaKin.inverseKinematics(currentPos.x, currentPos.y, currentPos.z);
  }, [deltaKin, currentPos]);

  return (
    <div
      className="bg-[#0A0A0A] border border-white/10 rounded-lg p-2 overflow-hidden"
      style={{ width, height: height + 40 }}
    >
      <div className="text-[9px] font-bold uppercase text-neutral-500 mb-2 flex justify-between">
        <span>Front View (Z-Axis)</span>
        <span className="text-red-500 font-mono">Z: {currentPos.z.toFixed(2)}</span>
      </div>

      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        {/* Bed */}
        <line
          x1="0"
          y1={scaleZ(0)}
          x2={width}
          y2={scaleZ(0)}
          stroke="#444"
          strokeWidth="2"
          strokeDasharray="4 2"
        />
        <text x="5" y={scaleZ(0) - 5} fill="#444" fontSize="8" fontWeight="bold">
          BED (Z=0)
        </text>

        {/* Focused Z */}
        <line
          x1="0"
          y1={scaleZ(machine.zFocused)}
          x2={width}
          y2={scaleZ(machine.zFocused)}
          stroke="#10b981"
          strokeWidth="1"
          opacity="0.5"
        />
        <text
          x={width - 5}
          y={scaleZ(machine.zFocused) - 5}
          fill="#10b981"
          fontSize="8"
          textAnchor="end"
        >
          FOCUS: {machine.zFocused}
        </text>

        {/* Secure Z */}
        <line
          x1="0"
          y1={scaleZ(machine.zSecure)}
          x2={width}
          y2={scaleZ(machine.zSecure)}
          stroke="#3b82f6"
          strokeWidth="1"
          opacity="0.5"
        />
        <text
          x={width - 5}
          y={scaleZ(machine.zSecure) - 5}
          fill="#3b82f6"
          fontSize="8"
          textAnchor="end"
        >
          SECURE: {machine.zSecure}
        </text>

        {isDelta && carriageHeights ? (
          <g>
            {/* 3 Towers */}
            {[0.25, 0.5, 0.75].map((pos, i) => {
              const x = width * pos;
              const h = [carriageHeights.a, carriageHeights.b, carriageHeights.c][i];
              const labels = ['A', 'B', 'C'];
              return (
                <g key={i}>
                  <line x1={x} y1="0" x2={x} y2={height} stroke="#222" strokeWidth="4" />
                  <circle cx={x} cy={scaleZ(h)} r="4" fill="#ef4444" className="animate-pulse" />
                  <text x={x} y={height - 5} fill="#555" fontSize="8" textAnchor="middle">
                    {labels[i]}
                  </text>
                  {/* Rods (simplified visualization) */}
                  <line
                    x1={x}
                    y1={scaleZ(h)}
                    x2={width / 2}
                    y2={scaleZ(currentPos.z)}
                    stroke="#ef4444"
                    strokeWidth="1"
                    opacity="0.3"
                  />
                </g>
              );
            })}
          </g>
        ) : (
          /* Cartesian Laser Head Indicator */
          <g transform={`translate(${width / 2}, ${scaleZ(currentPos.z)})`}>
            <path d="M -10 -5 L 10 -5 L 0 5 Z" fill="#ef4444" />
            <line
              x1="0"
              y1="5"
              x2="0"
              y2="15"
              stroke="#ef4444"
              strokeWidth="1"
              strokeDasharray="2 1"
            />
          </g>
        )}
      </svg>
    </div>
  );
};

export default MachineFrontView;
