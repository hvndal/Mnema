import React, { useState, useEffect, useRef } from 'react';
import type { RawGamepadState } from '../types/telemetry';
import type { IntegrationProfile, ControllerMappingEntry } from '../types/integration';
import { DEFAULT_INTEGRATION_PROFILES } from '../utils/defaultIntegrationProfiles';
import { ControllerMappingEngine, type EvaluatedActionTrigger } from '../utils/controllerMappingEngine';
import { WebMidiManager, type MidiPortInfo } from '../utils/midiManager';
import { RoboticsWebSocketBridge } from '../utils/roboticsBridge';

interface ControllerIntegrationLabProps {
  controller: RawGamepadState | null;
  browserRenderHz: number;
}

export const ControllerIntegrationLab: React.FC<ControllerIntegrationLabProps> = ({ controller }) => {
  const [profiles, setProfiles] = useState<IntegrationProfile[]>(DEFAULT_INTEGRATION_PROFILES);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('profile-midi-music');
  const activeProfile = profiles.find(p => p.id === selectedProfileId) || profiles[0];

  const [externalOutputEnabled, setExternalOutputEnabled] = useState<boolean>(false);
  const [eventLog, setEventLog] = useState<{ id: string; time: string; text: string; isError?: boolean }[]>([]);

  // -------------------------------------------------------------
  // PROFILE A: MIDI CONTROLLER STATE
  // -------------------------------------------------------------
  const [midiPorts, setMidiPorts] = useState<MidiPortInfo[]>([]);
  const [selectedMidiPortId, setSelectedMidiPortId] = useState<string>('');
  const [midiError, setMidiError] = useState<string | null>(null);
  const midiManagerRef = useRef<WebMidiManager>(new WebMidiManager());

  // -------------------------------------------------------------
  // PROFILE B: PRESENTATION SLIDE SIMULATOR STATE
  // -------------------------------------------------------------
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isMediaPlaying, setIsMediaPlaying] = useState<boolean>(false);
  const [simVolume, setSimVolume] = useState<number>(75);
  const totalSlides = 5;

  // -------------------------------------------------------------
  // PROFILE C: VIDEO TIMELINE EDITING SIMULATOR STATE
  // -------------------------------------------------------------
  const [timelinePlayheadSec, setTimelinePlayheadSec] = useState<number>(12.5);
  const [inPointSec, setInPointSec] = useState<number | null>(null);
  const [outPointSec, setOutPointSec] = useState<number | null>(null);
  const [cutPoints, setCutPoints] = useState<number[]>([5.0, 20.0]);

  // -------------------------------------------------------------
  // PROFILE D: ROBOTICS SIMULATOR & WEBSOCKET STATE
  // -------------------------------------------------------------
  const [robotWsUrl, setRobotWsUrl] = useState<string>('ws://localhost:8765/teleop');
  const [robotConnected, setRobotConnected] = useState<boolean>(false);
  const [robotPose, setRobotPose] = useState<{ x: number; y: number; headingDeg: number }>({ x: 150, y: 150, headingDeg: 0 });
  const [gripperOpen, setGripperOpen] = useState<boolean>(true);
  const [estopActive, setEstopActive] = useState<boolean>(false);
  const robotBridgeRef = useRef<RoboticsWebSocketBridge>(new RoboticsWebSocketBridge());

  // -------------------------------------------------------------
  // MAPPING ENGINE INSTANCE
  // -------------------------------------------------------------
  const mappingEngineRef = useRef<ControllerMappingEngine>(new ControllerMappingEngine(activeProfile));

  // Sync engine when active profile changes
  useEffect(() => {
    mappingEngineRef.current.setProfile(activeProfile);
  }, [activeProfile]);

  const logAction = (text: string, isError: boolean = false) => {
    setEventLog(prev => [
      { id: `${Date.now()}-${Math.random()}`, time: new Date().toLocaleTimeString(), text, isError },
      ...prev.slice(0, 40),
    ]);
  };

  // Initialize Web MIDI access
  const handleRequestMidi = async () => {
    const res = await midiManagerRef.current.requestAccess();
    if (res.success) {
      setMidiPorts(res.ports);
      if (res.ports.length > 0) setSelectedMidiPortId(res.ports[0].id);
      setMidiError(null);
      logAction(`Web MIDI initialized: Found ${res.ports.length} output ports.`);
    } else {
      setMidiError(res.error || 'Failed to access Web MIDI.');
      logAction(`Web MIDI Error: ${res.error}`, true);
    }
  };

  // Connect WebSocket Bridge
  const handleToggleRobotWs = () => {
    if (robotConnected) {
      robotBridgeRef.current.disconnect();
      setRobotConnected(false);
      logAction('WebSocket robot teleoperation disconnected. Neutral stop sent.');
    } else {
      robotBridgeRef.current.setCallbacks(
        (connected, err) => {
          setRobotConnected(connected);
          if (err) logAction(`WebSocket error: ${err}`, true);
        },
        (msg, isOut) => {
          if (!isOut) logAction(`Robot Bridge: ${msg}`);
        }
      );
      robotBridgeRef.current.connect(robotWsUrl);
      logAction(`Connecting to robot bridge: ${robotWsUrl}...`);
    }
  };

  // Emergency Software Stop
  const handleTriggerEstop = () => {
    setEstopActive(true);
    robotBridgeRef.current.sendEmergencyStop();
    logAction('⚠️ EMERGENCY SOFTWARE STOP TRIGGERED! Velocity clamped to 0.', true);
  };

  const handleResetEstop = () => {
    setEstopActive(false);
    robotBridgeRef.current.sendNeutralState();
    logAction('Emergency software stop cleared. Resuming neutral posture.');
  };

  // Continuous frame evaluation loop
  useEffect(() => {
    let animId: number;

    const loop = () => {
      const now = performance.now();

      if (controller) {
        const triggers = mappingEngineRef.current.evaluateFrame(controller, now);

        for (const trig of triggers) {
          executeAction(trig);
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [controller, externalOutputEnabled, estopActive, currentSlideIndex, inPointSec, outPointSec, gripperOpen]);

  // Dispatch evaluated action to simulator / external hardware
  const executeAction = (trigger: EvaluatedActionTrigger) => {
    const act = trigger.action;
    const cat = act.category;

    // 1. MIDI Handling
    if (cat === 'midi') {
      const params = act.parameters;
      if (params.midiType === 'note_on_off') {
        const note = params.midiNote ?? 60;
        const channel = params.midiChannel ?? 1;
        const vel = params.midiVelocity ?? 100;

        if (trigger.event === 'activated') {
          logAction(`[MIDI NOTE ON] Ch:${channel} Note:${note} Vel:${vel}`);
          if (externalOutputEnabled) {
            midiManagerRef.current.sendNoteOn(channel, note, vel);
          }
        } else if (trigger.event === 'released') {
          logAction(`[MIDI NOTE OFF] Ch:${channel} Note:${note}`);
          if (externalOutputEnabled) {
            midiManagerRef.current.sendNoteOff(channel, note);
          }
        }
      } else if (params.midiType === 'cc' && trigger.event === 'continuous_update') {
        const cc = params.midiCcNumber ?? 1;
        const channel = params.midiChannel ?? 1;
        const val = Math.round(trigger.value * 127);
        if (externalOutputEnabled) {
          midiManagerRef.current.sendControlChange(channel, cc, val);
        }
      }
    }

    // 2. Media & Presentation Handling
    else if (cat === 'media_slide') {
      const p = act.parameters;
      if (trigger.event === 'activated') {
        if (p.mediaAction === 'next_slide') {
          setCurrentSlideIndex(curr => Math.min(totalSlides - 1, curr + 1));
          logAction(`[Presentation] Advanced to slide ${Math.min(totalSlides, currentSlideIndex + 2)}`);
        } else if (p.mediaAction === 'prev_slide') {
          setCurrentSlideIndex(curr => Math.max(0, curr - 1));
          logAction(`[Presentation] Returned to slide ${Math.max(1, currentSlideIndex)}`);
        } else if (p.mediaAction === 'play_pause') {
          setIsMediaPlaying(curr => !curr);
          logAction(`[Media] Toggled playback: ${!isMediaPlaying ? 'PLAYING' : 'PAUSED'}`);
        } else if (p.mediaAction === 'volume_up') {
          setSimVolume(v => Math.min(100, v + 5));
          logAction(`[Media] Volume: ${Math.min(100, simVolume + 5)}%`);
        } else if (p.mediaAction === 'volume_down') {
          setSimVolume(v => Math.max(0, v - 5));
          logAction(`[Media] Volume: ${Math.max(0, simVolume - 5)}%`);
        }
      }
    }

    // 3. Editing Timeline Handling
    else if (cat === 'editing_timeline') {
      const p = act.parameters;
      if (trigger.event === 'activated') {
        if (p.editAction === 'mark_in') {
          setInPointSec(timelinePlayheadSec);
          logAction(`[NLE] Set In-Point at ${timelinePlayheadSec.toFixed(2)}s`);
        } else if (p.editAction === 'mark_out') {
          setOutPointSec(timelinePlayheadSec);
          logAction(`[NLE] Set Out-Point at ${timelinePlayheadSec.toFixed(2)}s`);
        } else if (p.editAction === 'cut') {
          setCutPoints(cp => [...cp, timelinePlayheadSec].sort((a, b) => a - b));
          logAction(`[NLE] Razor cut created at ${timelinePlayheadSec.toFixed(2)}s`);
        } else if (p.editAction === 'undo') {
          logAction('[NLE] Undo command executed');
        } else if (p.editAction === 'redo') {
          logAction('[NLE] Redo command executed');
        }
      } else if (p.continuousParam === 'playhead_scrub' && trigger.event === 'continuous_update') {
        // Scrub playhead proportionally to analog stick deflection
        setTimelinePlayheadSec(curr => Math.max(0, Math.min(60, curr + trigger.value * 0.4)));
      }
    }

    // 4. Robotics Teleoperation Handling
    else if (cat === 'robotics_network') {
      const p = act.parameters;
      if (trigger.event === 'activated') {
        if (p.robotCommand === 'gripper') {
          setGripperOpen(g => !g);
          logAction(`[Robot] Toggled Gripper: ${!gripperOpen ? 'OPEN' : 'CLOSED'}`);
        } else if (p.robotCommand === 'emergency_stop') {
          handleTriggerEstop();
        }
      } else if (trigger.event === 'continuous_update') {
        if (!estopActive) {
          if (p.channelKey === 'linear_x') {
            // Forward/Reverse update
            setRobotPose(prev => {
              const rad = (prev.headingDeg * Math.PI) / 180;
              const move = -trigger.value * 2.5; // Up on stick is negative Y
              return {
                ...prev,
                x: Math.max(20, Math.min(280, prev.x + Math.sin(rad) * move)),
                y: Math.max(20, Math.min(280, prev.y - Math.cos(rad) * move)),
              };
            });
          } else if (p.channelKey === 'angular_z') {
            // Steering yaw update
            setRobotPose(prev => ({
              ...prev,
              headingDeg: (prev.headingDeg + trigger.value * 3.5) % 360,
            }));
          }

          if (externalOutputEnabled && robotConnected) {
            robotBridgeRef.current.sendTeleopPacket(-trigger.value, trigger.value, gripperOpen, false);
          }
        }
      }
    }
  };

  // Profile JSON Export
  const handleExportProfile = () => {
    const jsonStr = JSON.stringify(activeProfile, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeProfile.id}-v${activeProfile.version}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    logAction(`Exported profile JSON: ${activeProfile.name}`);
  };

  // Profile JSON Import
  const handleImportProfile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target?.result as string) as IntegrationProfile;
        if (!imported.id || !imported.mappings || !Array.isArray(imported.mappings)) {
          throw new Error('Malformed profile JSON: missing required id or mappings array.');
        }

        setProfiles(prev => [imported, ...prev.filter(p => p.id !== imported.id)]);
        setSelectedProfileId(imported.id);
        logAction(`Successfully imported profile: ${imported.name} (v${imported.version})`);
      } catch (err: any) {
        logAction(`Profile import error: ${err.message}`, true);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="w-full flex flex-col gap-6 font-mono text-neutral-200">
      {/* Top Banner & Profile Switcher */}
      <div className="border border-neutral-800 bg-neutral-900/90 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide">
            CONTROLLER INTEGRATION LAB & REUSABLE MAPPING ENGINE
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Assign EvoFox physical inputs to MIDI instruments, presentation controls, NLE editing, and robotics teleoperation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={handleExportProfile}
            className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 rounded cursor-pointer"
          >
            Export Profile JSON
          </button>
          <label className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 rounded cursor-pointer">
            Import Profile
            <input type="file" accept=".json" onChange={handleImportProfile} className="hidden" />
          </label>
        </div>
      </div>

      {/* Safety Gate & Output Mode Bar */}
      <div className="border border-neutral-800 bg-neutral-900/70 p-3 rounded-lg flex flex-wrap justify-between items-center gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-neutral-500 font-bold uppercase">ACTIVE PROFILE:</span>
          <select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            className="bg-neutral-950 border border-neutral-700 text-white rounded px-3 py-1 font-bold cursor-pointer"
          >
            {profiles.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Explicit External Transmission Safety Gate */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 font-bold uppercase">EXTERNAL TRANSMISSION:</span>
            <button
              onClick={() => {
                const next = !externalOutputEnabled;
                setExternalOutputEnabled(next);
                logAction(`External output route ${next ? 'ARMED & ENABLED' : 'DISABLED (Preview/Simulation Mode)'}`);
              }}
              className={`px-3 py-1 rounded border text-xs font-bold cursor-pointer transition-colors ${
                externalOutputEnabled
                  ? 'bg-rose-950 border-rose-600 text-rose-300 animate-pulse'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400'
              }`}
            >
              {externalOutputEnabled ? '● LIVE OUTPUT ARMED' : '○ SIMULATION PREVIEW (SAFE)'}
            </button>
          </div>
        </div>
      </div>

      {/* Profile Demonstration & Action Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Interactive Simulation Arena */}
        <div className="border border-neutral-800 bg-neutral-900/70 p-5 rounded-lg flex flex-col gap-4 min-h-[460px]">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              IN-APP SIMULATOR & HARDWARE MONITOR
            </span>
            <span className="text-xs text-neutral-500">
              Target: {activeProfile.outputDestination.targetName || activeProfile.outputDestination.type}
            </span>
          </div>

          {/* SIMULATOR A: MIDI PRODUCER */}
          {activeProfile.category === 'midi' && (
            <div className="flex flex-col gap-4 text-xs">
              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded flex flex-col gap-2">
                <span className="font-bold text-neutral-300">WEB MIDI OUTPUT CONFIGURATION:</span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleRequestMidi}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold cursor-pointer"
                  >
                    Request MIDI Device Access
                  </button>
                  {midiPorts.length > 0 && (
                    <select
                      value={selectedMidiPortId}
                      onChange={(e) => {
                        setSelectedMidiPortId(e.target.value);
                        midiManagerRef.current.selectOutput(e.target.value);
                      }}
                      className="bg-neutral-900 border border-neutral-700 text-white rounded px-2 py-1"
                    >
                      {midiPorts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.manufacturer})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {midiError && <span className="text-rose-400 text-[11px]">{midiError}</span>}
              </div>

              {/* Visual Drum Pads */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { name: 'KICK (A)', note: 36, color: 'border-emerald-600' },
                  { name: 'SNARE (X)', note: 38, color: 'border-blue-600' },
                  { name: 'CLOSED HH (Y)', note: 42, color: 'border-amber-600' },
                  { name: 'OPEN HH (B)', note: 46, color: 'border-purple-600' },
                ].map(pad => (
                  <div
                    key={pad.note}
                    className={`h-24 rounded border-2 ${pad.color} bg-neutral-950 flex flex-col items-center justify-center p-2 text-center select-none`}
                  >
                    <span className="font-bold text-neutral-200">{pad.name}</span>
                    <span className="text-[10px] text-neutral-500 mt-1">MIDI Note {pad.note}</span>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-neutral-950 border border-neutral-800 rounded text-[11px] text-neutral-500 leading-normal">
                Notice: Web MIDI is natively supported in Chromium browsers. To drive desktop DAWs like Ableton Live, FL Studio or Reaper, route this output via a free virtual MIDI cable like loopMIDI on Windows.
              </div>
            </div>
          )}

          {/* SIMULATOR B: PRESENTATION SLIDES */}
          {activeProfile.category === 'media_slide' && (
            <div className="flex flex-col gap-4 text-xs">
              <div className="h-56 bg-neutral-950 border border-neutral-800 rounded-lg p-6 flex flex-col justify-between select-none">
                <div className="flex justify-between items-center text-neutral-500">
                  <span>SLIDE DECK SIMULATOR</span>
                  <span>SLIDE {currentSlideIndex + 1} OF {totalSlides}</span>
                </div>
                <div className="flex flex-col items-center text-center gap-2">
                  <h3 className="text-xl font-bold text-white">
                    {currentSlideIndex === 0 && 'Title: Controller Psychophysics Lab'}
                    {currentSlideIndex === 1 && 'Slide 2: EvoFox Low-Latency Polling'}
                    {currentSlideIndex === 2 && 'Slide 3: Fitts Law Target Acquisition'}
                    {currentSlideIndex === 3 && 'Slide 4: Pursuit Rotor Tracking Error'}
                    {currentSlideIndex === 4 && 'Slide 5: Conclusions & Open Data Export'}
                  </h3>
                  <p className="text-neutral-400 text-xs">
                    Press <strong>Right Bumper (RB)</strong> to advance • <strong>Left Bumper (LB)</strong> to rewind.
                  </p>
                </div>
                <div className="flex justify-between items-center text-[11px] text-neutral-500">
                  <span>Media: {isMediaPlaying ? '▶ PLAYING' : '⏸ PAUSED'}</span>
                  <span>Simulated Volume: {simVolume}%</span>
                </div>
              </div>
            </div>
          )}

          {/* SIMULATOR C: NLE TIMELINE */}
          {activeProfile.category === 'editing_timeline' && (
            <div className="flex flex-col gap-4 text-xs">
              <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-lg flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white">VIDEO TIMELINE SCRUBBER</span>
                  <span className="text-emerald-400 font-mono font-bold">
                    PLAYHEAD: {timelinePlayheadSec.toFixed(2)}s / 60.00s
                  </span>
                </div>

                {/* Scrubber Track */}
                <div className="w-full h-12 bg-neutral-900 border border-neutral-800 rounded relative overflow-hidden">
                  {/* In / Out selection overlay */}
                  {inPointSec !== null && outPointSec !== null && outPointSec > inPointSec && (
                    <div
                      style={{
                        left: `${(inPointSec / 60) * 100}%`,
                        width: `${((outPointSec - inPointSec) / 60) * 100}%`,
                      }}
                      className="h-full bg-blue-500/20 border-x border-blue-400 absolute top-0"
                    />
                  )}

                  {/* Cut markers */}
                  {cutPoints.map((cp, idx) => (
                    <div
                      key={idx}
                      style={{ left: `${(cp / 60) * 100}%` }}
                      className="w-0.5 h-full bg-amber-400 absolute top-0"
                      title={`Razor Cut at ${cp}s`}
                    />
                  ))}

                  {/* Playhead needle */}
                  <div
                    style={{ left: `${(timelinePlayheadSec / 60) * 100}%` }}
                    className="w-1 h-full bg-rose-500 absolute top-0 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                  />
                </div>

                <div className="flex justify-between items-center text-[11px] text-neutral-400">
                  <span>In-Point: {inPointSec !== null ? `${inPointSec.toFixed(1)}s` : 'None'}</span>
                  <span>Out-Point: {outPointSec !== null ? `${outPointSec.toFixed(1)}s` : 'None'}</span>
                  <span>Razor Cuts: {cutPoints.length}</span>
                </div>
              </div>
            </div>
          )}

          {/* SIMULATOR D: ROBOTICS TELEOP */}
          {activeProfile.category === 'robotics_network' && (
            <div className="flex flex-col gap-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-neutral-950 border border-neutral-800 rounded">
                <input
                  type="text"
                  value={robotWsUrl}
                  onChange={(e) => setRobotWsUrl(e.target.value)}
                  className="bg-neutral-900 border border-neutral-700 text-white rounded px-2.5 py-1 text-xs flex-1 min-w-[200px]"
                />
                <button
                  onClick={handleToggleRobotWs}
                  className={`px-3 py-1 rounded font-bold text-xs cursor-pointer ${
                    robotConnected
                      ? 'bg-rose-950 text-rose-300 border border-rose-700'
                      : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                  }`}
                >
                  {robotConnected ? 'Disconnect Bridge' : 'Connect WebSocket'}
                </button>
              </div>

              {/* 2D Robot Arena */}
              <div className="h-60 bg-neutral-950 border border-neutral-800 rounded relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2028_1px,transparent_1px),linear-gradient(to_bottom,#1f2028_1px,transparent_1px)] bg-[size:30px_30px] opacity-15" />

                {/* Robot Agent Avatar */}
                <div
                  style={{
                    left: `${robotPose.x}px`,
                    top: `${robotPose.y}px`,
                    transform: `translate(-50%, -50%) rotate(${robotPose.headingDeg}deg)`,
                  }}
                  className={`absolute w-8 h-8 rounded border-2 flex items-center justify-center transition-transform ${
                    estopActive
                      ? 'border-rose-600 bg-rose-600/30'
                      : 'border-emerald-400 bg-emerald-500/20'
                  }`}
                >
                  <div className="w-1.5 h-3 bg-white rounded-t" />
                </div>

                {/* Emergency Stop Button Overlay */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  {estopActive ? (
                    <button
                      onClick={handleResetEstop}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded cursor-pointer"
                    >
                      RESET E-STOP
                    </button>
                  ) : (
                    <button
                      onClick={handleTriggerEstop}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded cursor-pointer shadow-lg shadow-rose-950"
                    >
                      EMERGENCY STOP (E-STOP)
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Mapping Configuration & Live Event Telemetry Stream */}
        <div className="flex flex-col gap-6">
          {/* Mappings Table */}
          <div className="border border-neutral-800 bg-neutral-900/70 p-5 rounded-lg flex flex-col gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              CONFIGURED ACTION MAPPINGS ({activeProfile.mappings.length})
            </span>
            <div className="flex flex-col gap-2 max-h-56 overflow-y-auto">
              {activeProfile.mappings.map((m: ControllerMappingEntry) => (
                <div
                  key={m.id}
                  className="p-2.5 rounded bg-neutral-950 border border-neutral-800 flex justify-between items-center text-xs"
                >
                  <div>
                    <span className="font-bold text-neutral-200 block">{m.label}</span>
                    <span className="text-[10px] text-neutral-500">
                      Type: {m.input.type} • Behavior: {m.action.behavior}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-emerald-400 font-bold">
                    ACTIVE
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Live Action Event Monitor */}
          <div className="border border-neutral-800 bg-neutral-900/70 p-5 rounded-lg flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                LIVE ACTION DISPATCH MONITOR
              </span>
              <button
                onClick={() => setEventLog([])}
                className="text-[11px] text-neutral-400 hover:text-white underline cursor-pointer"
              >
                Clear Log
              </button>
            </div>
            <div className="h-44 overflow-y-auto bg-neutral-950 border border-neutral-800 p-2.5 rounded text-[11px] font-mono flex flex-col gap-1">
              {eventLog.length === 0 ? (
                <span className="text-neutral-600 italic">
                  Awaiting input triggers. Move sticks or press buttons to dispatch actions.
                </span>
              ) : (
                eventLog.map(e => (
                  <div key={e.id} className="flex items-center gap-2">
                    <span className="text-neutral-500">[{e.time}]</span>
                    <span className={e.isError ? 'text-rose-400 font-bold' : 'text-neutral-200'}>
                      {e.text}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
