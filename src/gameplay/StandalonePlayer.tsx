import React, { useState } from 'react';
import type { GraphicsSettings, WorldProject } from '../types/world';
import {
  WorldViewport,
  type PlaytestHudSnapshot,
} from '../editor/viewport/WorldViewport';
import { PlaytestHud } from './PlaytestHud';

interface StandalonePlayerProps {
  project: WorldProject;
  graphics: GraphicsSettings;
  onExit: () => void;
}

export const StandalonePlayer: React.FC<StandalonePlayerProps> = ({
  project,
  graphics,
  onExit,
}) => {
  const [hud, setHud] = useState<PlaytestHudSnapshot>({
    health: project.gameplay.playerHealth,
    maxHealth: project.gameplay.playerHealth,
    score: 0,
    timeRemaining: project.gameplay.matchDuration,
    inventory: [...project.gameplay.startingInventory],
    notifications: [],
    cameraView: 'third',
    paused: false,
    outcome: null,
    nearbyInteractPrompt: null,
    playerPos: { x: 0, y: 0, z: 0 },
  });

  return (
    <div className="fixed inset-0 z-40 bg-[#0B0E14] overflow-hidden">
      <WorldViewport
        project={project}
        mode="playtest"
        graphics={graphics}
        editorTool="select"
        transformMode="translate"
        placeAssetType="cube"
        terrainTool="raise"
        terrainRadius={6}
        terrainStrength={1}
        terrainPaintColor="#4d7c4f"
        selectedObjectId={null}
        showGrid={false}
        onSelectObject={() => {}}
        onTransformObject={() => {}}
        onPlaceObject={() => {}}
        onUpdateTerrain={() => {}}
        onExitPlaytest={onExit}
        onHudUpdate={setHud}
      />
      <PlaytestHud
        project={project}
        hud={hud}
        isStandalonePlayer
        onStopPlaytest={onExit}
      />
    </div>
  );
};
