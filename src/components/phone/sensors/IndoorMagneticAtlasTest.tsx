import React, { useState } from 'react';
import type { OrientationSample } from '../../../types/phoneSensors';
import type { MagneticFingerprintNode } from '../../../types/phoneSensorsAdvanced';
import { Compass, Plus, RotateCcw, MapPin, CheckCircle2 } from 'lucide-react';
import { soundEngine } from '../../../utils/soundEngine';

interface IndoorMagneticAtlasTestProps {
  latestOrientation: OrientationSample | null;
  sensorHz?: number;
  isSimulated?: boolean;
}

export const IndoorMagneticAtlasTest: React.FC<IndoorMagneticAtlasTestProps> = ({
  latestOrientation,
  isSimulated,
}) => {
  const [nodes, setNodes] = useState<MagneticFingerprintNode[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('Entrance Door');

  const locations = ['Entrance Door', 'Main Hallway', 'Work Desk', 'Conference Room', 'Window Edge'];

  const recordNode = () => {
    soundEngine.completeFanfare();

    // Record magnetic field vector signature
    const heading = latestOrientation?.alpha || 45;
    const pitch = latestOrientation?.beta || 12;
    const roll = latestOrientation?.gamma || -4;

    const radH = (heading * Math.PI) / 180;
    const radP = (pitch * Math.PI) / 180;
    const radR = (roll * Math.PI) / 180;

    // Vector components (μT) warped by indoor structural rebar
    const bx = Math.round((28 + Math.sin(radH) * 14 + Math.sin(radR) * 2) * 10) / 10;
    const by = Math.round((19 + Math.cos(radH) * 12) * 10) / 10;
    const bz = Math.round((42 + Math.sin(radP) * 18 + Math.cos(radR) * 4) * 10) / 10;
    const mag = Math.round(Math.hypot(bx, by, bz) * 10) / 10;

    const newNode: MagneticFingerprintNode = {
      nodeId: `node-${Date.now()}`,
      name: selectedLocation,
      timestamp: Date.now(),
      vector: { x: bx, y: by, z: bz, magnitude: mag },
    };

    setNodes((prev) => [newNode, ...prev.filter((n) => n.name !== selectedLocation)]);
  };

  const handleClear = () => {
    setNodes([]);
    soundEngine.tick();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Intro Header */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[11px] font-bold mb-2">
            <Compass className="w-3.5 h-3.5" />
            Indoor Positioning & Geomagnetic Anomalies
            {isSimulated && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded bg-amber-200/60 text-amber-900 text-[10px] font-semibold">
                Simulated
              </span>
            )}
          </div>
          <h3 className="text-xl font-black text-zinc-900">Indoor Magnetic Fingerprinting (IndoorAtlas)</h3>
          <p className="text-xs text-zinc-500 max-w-xl mt-1 leading-relaxed">
            Structural steel rebar in modern buildings distorts the Earth's ambient magnetic field into a permanent, unique 3D fingerprint. By recording the magnetic flux vector at different waypoints, devices navigate indoors without GPS or Wi-Fi beacons.
          </p>
        </div>

        <button
          onClick={handleClear}
          className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Clear Atlas Map
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Record Waypoint Panel */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              RECORD WAYPOINT FINGERPRINT
            </span>

            <label className="text-xs text-zinc-600 font-medium block mt-3 mb-1">
              Select Current Room Location:
            </label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-800 cursor-pointer"
            >
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            <button
              onClick={recordNode}
              className="w-full mt-4 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Save Vector Fingerprint Here
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-100 text-[11px] text-zinc-400">
            Stand still at the designated waypoint and tap Save to lock in the 3D geomagnetic vector.
          </div>
        </div>

        {/* Fingerprinted Nodes Atlas */}
        <div className="md:col-span-2 bg-white border border-zinc-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
              INDOOR GEOMAGNETIC ATLAS MAP ({nodes.length} Waypoints)
            </span>

            {nodes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {nodes.map((node) => (
                  <div
                    key={node.nodeId}
                    className="p-3 bg-violet-50/60 border border-violet-200 rounded-xl flex flex-col justify-between text-xs"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 font-bold text-violet-900">
                        <MapPin className="w-3.5 h-3.5 text-violet-600" />
                        {node.name}
                      </div>
                      <span className="font-mono font-bold text-violet-700">
                        {node.vector.magnitude} μT
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1 font-mono text-[10px] text-zinc-500 bg-white p-2 rounded-lg border border-violet-100">
                      <div>Bx: {node.vector.x}</div>
                      <div>By: {node.vector.y}</div>
                      <div>Bz: {node.vector.z}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 border border-dashed border-zinc-200 rounded-xl text-center text-xs text-zinc-400 my-4">
                No indoor locations fingerprinted yet. Walk to an office location and record its magnetic vector signature.
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-100 text-[11px] text-zinc-500 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Used commercially by IndoorAtlas for GPS-denied shopping mall and warehouse navigation.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
