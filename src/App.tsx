import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MachineProfile, MaterialProfile, PatternType } from './types';
import {
  getStoredMachines,
  getStoredMaterials,
  saveStoredMachines,
  saveStoredMaterials,
  INITIAL_MATERIALS,
  INITIAL_MACHINES
} from './lib/materialPresets';
import { generatePatternPaths, GeneratedData } from './lib/gcodeGenerator';

// Components
import MachineSelector from './components/MachineSelector';
import MaterialDatabase from './components/MaterialDatabase';
import PatternConfigurator from './components/PatternConfigurator';
import SVGVisualizer from './components/SVGVisualizer';
import GCodeOutput from './components/GCodeOutput';

import { Flame, Compass, Info, Github, HelpCircle, Layers } from 'lucide-react';

export default function App() {
  // 1. Core States
  const [machines, setMachines] = useState<MachineProfile[]>([]);
  const [materials, setMaterials] = useState<MaterialProfile[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [selectedPattern, setSelectedPattern] = useState<PatternType>('matrix');

  // 2. Pattern Range configuration parameters
  const [powerMin, setPowerMin] = useState<number>(50);
  const [powerMax, setPowerMax] = useState<number>(255);
  const [speedMin, setSpeedMin] = useState<number>(500);
  const [speedMax, setSpeedMax] = useState<number>(2500);
  const [powerSteps, setPowerSteps] = useState<number>(5);
  const [speedSteps, setSpeedSteps] = useState<number>(5);

  // Kerf test dimensions
  const [nominalThickness, setNominalThickness] = useState<number>(3.0);
  const [kerfValues, setKerfValues] = useState<number[]>([0.05, 0.10, 0.15, 0.20, 0.25]);

  // Focus ladder bounds
  const [zMin, setZMin] = useState<number>(-43.0);
  const [zMax, setZMax] = useState<number>(-37.0);
  const [zSteps, setZSteps] = useState<number>(5);

  // Active generation results
  const [generatedResults, setGeneratedResults] = useState<GeneratedData | null>(null);

  // 3. Database Initializer
  useEffect(() => {
    const loadedMachines = getStoredMachines();
    const loadedMaterials = getStoredMaterials();
    setMachines(loadedMachines);
    setMaterials(loadedMaterials);

    if (loadedMachines.length > 0) {
      setSelectedMachineId(loadedMachines[0].id);
    }
    if (loadedMaterials.length > 0) {
      setSelectedMaterialId(loadedMaterials[0].id);
    }
  }, []);

  const activeMachine = machines.find((m) => m.id === selectedMachineId) || machines[0];
  const activeMaterial = materials.find((m) => m.id === selectedMaterialId) || materials[0];

  // Adjust parameters when machine or material selection changes
  useEffect(() => {
    if (activeMachine) {
      // update default bounds for power min/max
      setPowerMin(Math.round(activeMachine.pwmMax * 0.2));
      setPowerMax(activeMachine.pwmMax);

      // adjust Z limits based on target machine workZ
      setZMin(activeMachine.workZ - 3.0);
      setZMax(activeMachine.workZ + 3.0);
    }
    if (activeMaterial) {
      // load default nominal thickness for the kerf test
      setNominalThickness(activeMaterial.thickness);
    }
  }, [selectedMachineId, selectedMaterialId]);

  // Main Path Calculation Trigger
  // Triggers dynamically upon parameter adjustment to give instant, premium GUI feedback!
  useEffect(() => {
    if (!activeMachine || !activeMaterial) return;

    const res = generatePatternPaths(selectedPattern, activeMachine, activeMaterial, {
      powerMin,
      powerMax,
      speedMin,
      speedMax,
      powerSteps,
      speedSteps,
      nominalThickness,
      kerfValues,
      zMin,
      zMax,
      zSteps,
    });
    setGeneratedResults(res);
  }, [
    selectedPattern,
    selectedMachineId,
    selectedMaterialId,
    powerMin,
    powerMax,
    speedMin,
    speedMax,
    powerSteps,
    speedSteps,
    nominalThickness,
    kerfValues,
    zMin,
    zMax,
    zSteps,
    machines, // if machine properties are edited, regenerate
    materials, // if material properties are edited, regenerate
  ]);

  // Database mutations
  const handleUpdateMachine = (updated: MachineProfile) => {
    const updatedList = machines.map((m) => (m.id === updated.id ? updated : m));
    setMachines(updatedList);
    saveStoredMachines(updatedList);
  };

  const handleCreateMachine = (created: MachineProfile) => {
    const updatedList = [...machines, created];
    setMachines(updatedList);
    saveStoredMachines(updatedList);
  };

  const handleDeleteMachine = (id: string) => {
    const updatedList = machines.filter((m) => m.id !== id);
    setMachines(updatedList);
    saveStoredMachines(updatedList);
    if (selectedMachineId === id && updatedList.length > 0) {
      setSelectedMachineId(updatedList[0].id);
    }
  };

  const handleUpdateMaterial = (updated: MaterialProfile) => {
    const updatedList = materials.map((m) => (m.id === updated.id ? updated : m));
    setMaterials(updatedList);
    saveStoredMaterials(updatedList);
  };

  const handleCreateMaterial = (created: MaterialProfile) => {
    const updatedList = [...materials, created];
    setMaterials(updatedList);
    saveStoredMaterials(updatedList);
  };

  const handleDeleteMaterial = (id: string) => {
    const updatedList = materials.filter((m) => m.id !== id);
    setMaterials(updatedList);
    saveStoredMaterials(updatedList);
    if (selectedMaterialId === id && updatedList.length > 0) {
      setSelectedMaterialId(updatedList[0].id);
    }
  };

  return (
    <div id="laserbench-root" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased">
      {/* Premium Dark Tech Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-50 px-6 py-4 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-amber-500 to-red-600 p-2.5 rounded-xl shadow-lg border border-amber-400/25">
              <Flame className="w-6 h-6 text-slate-950 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white font-sans">LaserBench</h1>
                <span className="bg-emerald-950 border border-emerald-800 text-emerald-300 text-[9px] font-bold px-2 py-0.5 rounded-full font-mono uppercase">
                  v1.2 Prod-Calibrator
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generate repeatable laser-material calibration G-code tests and SVG toolpath pre-visualizations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-850">
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              <span>Laser Characterization Workflow Suite</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Page Layout Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-full">
        
        {/* Left Column (Colspan = 4): Machine Profiles & Material Database */}
        <div className="lg:col-span-4 space-y-6 flex flex-col h-full justify-start">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <MachineSelector
              machines={machines}
              selectedMachineId={selectedMachineId}
              onSelectMachine={setSelectedMachineId}
              onUpdateMachine={handleUpdateMachine}
              onCreateMachine={handleCreateMachine}
              onDeleteMachine={handleDeleteMachine}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex-1"
          >
            <MaterialDatabase
              materials={materials}
              selectedMaterialId={selectedMaterialId}
              pwmMax={activeMachine ? activeMachine.pwmMax : 255}
              onSelectMaterial={setSelectedMaterialId}
              onUpdateMaterial={handleUpdateMaterial}
              onCreateMaterial={handleCreateMaterial}
              onDeleteMaterial={handleDeleteMaterial}
            />
          </motion.div>
        </div>

        {/* Middle Column (Colspan = 4): Calibration Pattern Configurator */}
        <div className="lg:col-span-4 h-full flex flex-col justify-start">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <PatternConfigurator
              selectedPattern={selectedPattern}
              onSelectPattern={setSelectedPattern}
              powerMin={powerMin}
              powerMax={powerMax}
              speedMin={speedMin}
              speedMax={speedMax}
              powerSteps={powerSteps}
              speedSteps={speedSteps}
              nominalThickness={nominalThickness}
              kerfValues={kerfValues}
              zMin={zMin}
              zMax={zMax}
              zSteps={zSteps}
              pwmMax={activeMachine ? activeMachine.pwmMax : 255}
              onSetPowerMin={setPowerMin}
              onSetPowerMax={setPowerMax}
              onSetSpeedMin={setSpeedMin}
              onSetSpeedMax={setSpeedMax}
              onSetPowerSteps={setPowerSteps}
              onSetSpeedSteps={setSpeedSteps}
              onSetNominalThickness={setNominalThickness}
              onSetKerfValues={setKerfValues}
              onSetZMin={setZMin}
              onSetZMax={setZMax}
              onSetZSteps={setZSteps}
            />
          </motion.div>
        </div>

        {/* Right Column (Colspan = 4): Interactivity Visualizer + GCode Block Code View */}
        <div className="lg:col-span-4 space-y-6 h-full flex flex-col justify-start">
          {generatedResults && activeMachine && activeMaterial && (
            <>
              {/* Toolpath visualizer SVG canvas with Pan Zoom hover coordination */}
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="flex-1"
              >
                <SVGVisualizer
                  svgPathData={generatedResults.svgPathData}
                  machine={activeMachine}
                  material={activeMaterial}
                  patternType={selectedPattern}
                  paths={generatedResults.paths}
                />
              </motion.div>

              {/* Code copy and files downloader block */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.25 }}
              >
                <GCodeOutput
                  gcode={generatedResults.gcode}
                  patternType={selectedPattern}
                  machine={activeMachine}
                  material={activeMaterial}
                  paths={generatedResults.paths}
                />
              </motion.div>
            </>
          )}
        </div>
      </main>

      {/* Footer copyright info */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-slate-500 text-xs shrink-0 font-mono flex items-center justify-center gap-1.5">
        <span>© 2026 LaserBench calibration suite. Open-source workspace.</span>
        <span>•</span>
        <button
          onClick={() => {
            alert(
              "LaserBench Characterizer Guide:\n\n1. Select your target Machine Profile (Marlin Delta or GRBL Rectangular).\n2. Load or Add a wood/acrylic sheet inside the Database.\n3. Choose your calibration pattern (e.g. Power-Speed Matrix).\n4. Customize power ranges, speed ranges or kerf thicknesses.\n5. Click 'Download' or Copy G-code to burn physical tests. Use optical safety goggles!"
            );
          }}
          className="text-indigo-400 hover:text-indigo-300 font-semibold underline flex items-center gap-0.5 whitespace-nowrap"
        >
          <Info className="w-3 w-3 inline" />
          Troubleshoot instructions
        </button>
      </footer>
    </div>
  );
}
