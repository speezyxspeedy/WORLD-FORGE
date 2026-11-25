import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  Link2,
  Play,
  Plus,
  Trash2,
  Unlink,
  Zap,
} from 'lucide-react';
import type { LogicEdge, LogicGraph, LogicNode, WorldProject } from '../../types/world';
import {
  executeLogicEvent,
  LOGIC_NODE_CATALOG,
  validateLogicGraph,
  type RuntimeWorldState,
} from './logicEngine';

interface VisualLogicStudioProps {
  project: WorldProject;
  onChangeGraph: (graph: LogicGraph) => void;
}

const CATEGORY_COLORS = {
  event: {
    header: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    dot: '#f59e0b',
    label: 'Event',
  },
  condition: {
    header: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    dot: '#38bdf8',
    label: 'Condition',
  },
  action: {
    header: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
    dot: '#14b8a6',
    label: 'Action',
  },
};

export const VisualLogicStudio: React.FC<VisualLogicStudioProps> = ({
  project,
  onChangeGraph,
}) => {
  const graph = project.logicGraph;
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(graph.nodes[0]?.id || null);
  const [connectFrom, setConnectFrom] = useState<{
    nodeId: string;
    branch: 'default' | 'true' | 'false';
  } | null>(null);
  const [catalogFilter, setCatalogFilter] = useState<'event' | 'condition' | 'action'>('event');
  const [simHasKey, setSimHasKey] = useState(false);
  const [simLog, setSimLog] = useState<string[]>([]);

  const dragRef = useRef<{
    nodeId: string;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const validation = useMemo(() => validateLogicGraph(graph), [graph]);
  const selectedNode = useMemo(
    () => graph.nodes.find((n) => n.id === selectedNodeId) || null,
    [graph.nodes, selectedNodeId]
  );

  const addNodeFromCatalog = (entry: (typeof LOGIC_NODE_CATALOG)[number]) => {
    const id = `node_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
    const colOffset =
      entry.category === 'event' ? 40 : entry.category === 'condition' ? 330 : 620;
    const sameColCount = graph.nodes.filter((n) => n.category === entry.category).length;
    const newNode: LogicNode = {
      id,
      category: entry.category,
      type: entry.type,
      label: entry.label,
      position: { x: colOffset, y: 40 + sameColCount * 135 },
      params: { ...entry.defaultParams },
    };
    onChangeGraph({
      ...graph,
      nodes: [...graph.nodes, newNode],
    });
    setSelectedNodeId(id);
  };

  const deleteNode = (nodeId: string) => {
    onChangeGraph({
      nodes: graph.nodes.filter((n) => n.id !== nodeId),
      edges: graph.edges.filter((e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId),
    });
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    if (connectFrom?.nodeId === nodeId) setConnectFrom(null);
  };

  const updateNodeParam = (nodeId: string, key: string, value: string | number | boolean) => {
    onChangeGraph({
      ...graph,
      nodes: graph.nodes.map((n) =>
        n.id === nodeId ? { ...n, params: { ...n.params, [key]: value } } : n
      ),
    });
  };

  const updateNodeLabel = (nodeId: string, label: string) => {
    onChangeGraph({
      ...graph,
      nodes: graph.nodes.map((n) => (n.id === nodeId ? { ...n, label } : n)),
    });
  };

  const completeConnection = (toNodeId: string) => {
    if (!connectFrom) return;
    if (connectFrom.nodeId === toNodeId) {
      setConnectFrom(null);
      return;
    }
    const targetNode = graph.nodes.find((n) => n.id === toNodeId);
    if (!targetNode || targetNode.category === 'event') {
      setConnectFrom(null);
      return;
    }
    const alreadyExists = graph.edges.some(
      (e) =>
        e.fromNodeId === connectFrom.nodeId &&
        e.toNodeId === toNodeId &&
        e.branch === connectFrom.branch
    );
    if (!alreadyExists) {
      const newEdge: LogicEdge = {
        id: `edge_${Date.now().toString(36)}`,
        fromNodeId: connectFrom.nodeId,
        toNodeId,
        branch: connectFrom.branch,
      };
      onChangeGraph({ ...graph, edges: [...graph.edges, newEdge] });
    }
    setConnectFrom(null);
  };

  const removeEdge = (edgeId: string) => {
    onChangeGraph({
      ...graph,
      edges: graph.edges.filter((e) => e.id !== edgeId),
    });
  };

  const handleNodePointerDown = (e: React.PointerEvent, node: LogicNode) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setSelectedNodeId(node.id);
    dragRef.current = {
      nodeId: node.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: node.position.x,
      origY: node.position.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleNodePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const nx = Math.max(12, Math.round(drag.origX + (e.clientX - drag.startClientX)));
    const ny = Math.max(12, Math.round(drag.origY + (e.clientY - drag.startClientY)));
    onChangeGraph({
      ...graph,
      nodes: graph.nodes.map((n) =>
        n.id === drag.nodeId ? { ...n, position: { x: nx, y: ny } } : n
      ),
    });
  };

  const handleNodePointerUp = () => {
    dragRef.current = null;
  };

  const loadDoorKeyTemplate = () => {
    onChangeGraph({
      nodes: [
        {
          id: 'tpl_enter',
          category: 'event',
          type: 'player_enters_area',
          label: 'Player Enters: Gate Trigger',
          position: { x: 40, y: 120 },
          params: { targetName: 'Gate Trigger' },
        },
        {
          id: 'tpl_cond',
          category: 'condition',
          type: 'has_item',
          label: 'Has Gold Key?',
          position: { x: 330, y: 120 },
          params: { itemName: 'Gold Key' },
        },
        {
          id: 'tpl_open',
          category: 'action',
          type: 'open_door',
          label: 'Open Vault Door',
          position: { x: 640, y: 40 },
          params: { targetName: 'Vault Door' },
        },
        {
          id: 'tpl_locked',
          category: 'action',
          type: 'display_notification',
          label: 'Locked Door Message',
          position: { x: 640, y: 200 },
          params: { message: 'Door is locked — find the Gold Key!' },
        },
      ],
      edges: [
        { id: 'tple1', fromNodeId: 'tpl_enter', toNodeId: 'tpl_cond', branch: 'default' },
        { id: 'tple2', fromNodeId: 'tpl_cond', toNodeId: 'tpl_open', branch: 'true' },
        { id: 'tple3', fromNodeId: 'tpl_cond', toNodeId: 'tpl_locked', branch: 'false' },
      ],
    });
  };

  const runSandboxSimulation = () => {
    const firstEvent = graph.nodes.find((n) => n.category === 'event');
    if (!firstEvent) {
      setSimLog(['Add at least one Event node to run a visual logic test.']);
      return;
    }
    const baseState: RuntimeWorldState = {
      player: {
        health: project.gameplay.playerHealth,
        maxHealth: project.gameplay.playerHealth,
        score: 25,
        team: project.gameplay.teamNames[0] || 'Alpha',
        inventory: simHasKey ? ['Gold Key'] : [],
        position: { x: 0, y: 0, z: 0 },
      },
      doorsOpen: { 'Vault Door': false },
      objects: project.objects,
      notifications: [],
      activeTimerSeconds: project.gameplay.matchDuration,
      matchEnded: false,
      matchOutcome: null,
      spawnedObjects: [],
      executionLog: [],
    };
    const result = executeLogicEvent(graph, baseState, {
      eventType: firstEvent.type as Parameters<typeof executeLogicEvent>[2]['eventType'],
      targetObjectName: String(firstEvent.params.targetName || ''),
    });
    setSimLog(
      result.executionLog.length > 0
        ? result.executionLog
        : ['Event fired, but no downstream nodes executed.']
    );
  };

  return (
    <div className="flex h-full w-full bg-[#0B0E14] text-slate-100 overflow-hidden">
      {/* Left Node Palette */}
      <aside className="w-72 border-r border-white/10 bg-[#111620] flex flex-col shrink-0">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white">Visual Logic Nodes</h2>
            <span className="text-xs text-slate-400 tabular-nums">{graph.nodes.length} nodes</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Zero-code mechanics. Click a node below to place it on the canvas.
          </p>
          <div className="grid grid-cols-3 gap-1 p-1 mt-3 bg-[#0B0E14] rounded-lg border border-white/5">
            {(['event', 'condition', 'action'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCatalogFilter(cat)}
                className={`py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  catalogFilter === cat
                    ? 'bg-[#1E2636] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat === 'event' ? 'Events' : cat === 'condition' ? 'Conditions' : 'Actions'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {LOGIC_NODE_CATALOG.filter((n) => n.category === catalogFilter).map((entry) => (
            <button
              key={entry.type}
              type="button"
              onClick={() => addNodeFromCatalog(entry)}
              className="w-full text-left p-2.5 rounded-lg bg-[#161C28] hover:bg-[#1E2636] border border-white/5 transition-colors group"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-100">{entry.label}</span>
                <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 shrink-0" />
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{entry.description}</p>
            </button>
          ))}
        </div>

        <div className="p-3 border-t border-white/10 space-y-2 bg-[#0E131C]">
          <button
            type="button"
            onClick={loadDoorKeyTemplate}
            className="w-full py-2 px-3 rounded-lg bg-[#1E2636] hover:bg-[#273247] text-xs font-medium text-amber-300 flex items-center justify-center gap-1.5 transition-colors"
          >
            <GitBranch className="w-3.5 h-3.5" />
            Load Key &amp; Locked Door Example
          </button>
        </div>
      </aside>

      {/* Center Interactive Node Graph Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Validation & Sandbox Test Bar */}
        <div className="px-4 py-2.5 border-b border-white/10 bg-[#111620] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            {validation.valid ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="text-teal-300 font-medium">Sandbox Graph Valid</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400 tabular-nums">
                  {graph.edges.length} connections · Deterministic runtime
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="text-rose-300 font-medium">
                  {validation.issues.find((i) => i.severity === 'error')?.message}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {connectFrom && (
              <button
                type="button"
                onClick={() => setConnectFrom(null)}
                className="px-2.5 py-1.5 rounded-md bg-amber-500/20 text-amber-300 text-xs font-medium"
              >
                Click a target node Input · Cancel Wire
              </button>
            )}
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={simHasKey}
                onChange={(e) => setSimHasKey(e.target.checked)}
                className="rounded border-slate-600 accent-amber-500"
              />
              Simulate with Gold Key
            </label>
            <button
              type="button"
              onClick={runSandboxSimulation}
              className="px-3 py-1.5 rounded-md bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5" />
              Test Logic
            </button>
          </div>
        </div>

        {/* Scrollable Graph Canvas */}
        <div
          className="relative flex-1 overflow-auto bg-[#0B0E14]"
          style={{
            backgroundImage:
              'radial-gradient(rgba(148,163,184,0.16) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          <div className="relative min-w-[980px] min-h-[600px] w-full h-full">
            {/* SVG Connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {graph.edges.map((edge) => {
                const from = graph.nodes.find((n) => n.id === edge.fromNodeId);
                const to = graph.nodes.find((n) => n.id === edge.toNodeId);
                if (!from || !to) return null;

                const startX = from.position.x + 236;
                const branchOffset =
                  edge.branch === 'true' ? 68 : edge.branch === 'false' ? 96 : 62;
                const startY = from.position.y + branchOffset;
                const endX = to.position.x;
                const endY = to.position.y + 52;
                const midX = (startX + endX) / 2;

                const stroke =
                  edge.branch === 'true'
                    ? '#14b8a6'
                    : edge.branch === 'false'
                    ? '#f43f5e'
                    : '#f59e0b';

                return (
                  <g key={edge.id}>
                    <path
                      d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={2.5}
                      strokeOpacity={0.85}
                    />
                    <circle cx={endX} cy={endY} r={4} fill={stroke} />
                  </g>
                );
              })}
            </svg>

            {/* Draggable Nodes */}
            {graph.nodes.map((node) => {
              const style = CATEGORY_COLORS[node.category];
              const isSelected = selectedNodeId === node.id;
              return (
                <div
                  key={node.id}
                  onPointerDown={(e) => handleNodePointerDown(e, node)}
                  onPointerMove={handleNodePointerMove}
                  onPointerUp={handleNodePointerUp}
                  style={{
                    transform: `translate(${node.position.x}px, ${node.position.y}px)`,
                  }}
                  className={`absolute top-0 left-0 w-[236px] rounded-lg bg-[#161C28] border shadow-lg select-none cursor-grab active:cursor-grabbing ${
                    isSelected ? 'border-amber-400 ring-1 ring-amber-400/40' : 'border-white/10'
                  }`}
                >
                  <div
                    className={`px-3 py-2 border-b rounded-t-lg flex items-center justify-between gap-2 ${style.header}`}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wide">
                      {style.label}
                    </span>
                    <button
                      type="button"
                      aria-label={`Delete ${node.label}`}
                      onClick={() => deleteNode(node.id)}
                      className="text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-3 space-y-2.5">
                    <div className="text-xs font-semibold text-white truncate">{node.label}</div>

                    {/* Port row */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      {node.category !== 'event' ? (
                        <button
                          type="button"
                          onClick={() => completeConnection(node.id)}
                          className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
                            connectFrom
                              ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                              : 'border-white/10 bg-[#0B0E14] text-slate-400 hover:text-white'
                          }`}
                        >
                          In
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-400" />
                          Trigger
                        </span>
                      )}

                      {node.category === 'condition' ? (
                        <div className="flex flex-col gap-1 items-end">
                          <button
                            type="button"
                            onClick={() => setConnectFrom({ nodeId: node.id, branch: 'true' })}
                            className="px-2 py-0.5 rounded bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-[11px] font-medium flex items-center gap-1"
                          >
                            True <Link2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConnectFrom({ nodeId: node.id, branch: 'false' })}
                            className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-medium flex items-center gap-1"
                          >
                            False <Link2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConnectFrom({ nodeId: node.id, branch: 'default' })}
                          className="px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-[11px] font-medium flex items-center gap-1"
                        >
                          Out <Link2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {graph.nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="max-w-sm text-center space-y-3 bg-[#161C28] border border-white/10 rounded-xl p-6">
                  <h3 className="text-base font-semibold text-white">Empty Visual Logic Graph</h3>
                  <p className="text-xs text-slate-400">
                    Add Event, Condition, and Action nodes from the left panel or load the Key &amp; Locked Door example to see visual mechanics in action.
                  </p>
                  <button
                    type="button"
                    onClick={loadDoorKeyTemplate}
                    className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-semibold"
                  >
                    Load Example Logic
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sandbox Simulation Log */}
        {simLog.length > 0 && (
          <div className="px-4 py-2.5 border-t border-white/10 bg-[#111620] text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-teal-300">Sandbox Test Execution Trace</span>
              <button
                type="button"
                onClick={() => setSimLog([])}
                className="text-slate-400 hover:text-white text-[11px]"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-300 font-mono text-[11px]">
              {simLog.map((line, i) => (
                <span key={i}>
                  {i + 1}. {line}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Node Properties Inspector */}
      <aside className="w-72 border-l border-white/10 bg-[#111620] p-4 overflow-y-auto shrink-0 space-y-4">
        <h3 className="text-sm font-semibold text-white">Node Properties</h3>
        {selectedNode ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 block">Display Label</label>
              <input
                type="text"
                value={selectedNode.label}
                onChange={(e) => updateNodeLabel(selectedNode.id, e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md bg-[#0B0E14] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="space-y-3">
              {Object.entries(selectedNode.params).map(([key, val]) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs text-slate-400 capitalize block">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </label>
                  {typeof val === 'number' ? (
                    <input
                      type="number"
                      value={val}
                      onChange={(e) => updateNodeParam(selectedNode.id, key, Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-md bg-[#0B0E14] border border-white/10 text-xs text-white font-mono tabular-nums focus:outline-none focus:border-amber-500"
                    />
                  ) : key === 'operator' ? (
                    <select
                      value={String(val)}
                      onChange={(e) => updateNodeParam(selectedNode.id, key, e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md bg-[#0B0E14] border border-white/10 text-xs text-white"
                    >
                      <option value=">=">&gt;= (At least)</option>
                      <option value=">">&gt; (Greater than)</option>
                      <option value="<=">&lt;= (At most)</option>
                      <option value="<">&lt; (Less than)</option>
                      <option value="==">== (Equals)</option>
                    </select>
                  ) : key === 'outcome' ? (
                    <select
                      value={String(val)}
                      onChange={(e) => updateNodeParam(selectedNode.id, key, e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md bg-[#0B0E14] border border-white/10 text-xs text-white"
                    >
                      <option value="victory">Victory</option>
                      <option value="defeat">Defeat</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={String(val)}
                      onChange={(e) => updateNodeParam(selectedNode.id, key, e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-md bg-[#0B0E14] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Connected Wires */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <div className="text-xs font-medium text-slate-300">Outgoing Wires</div>
              {graph.edges
                .filter((e) => e.fromNodeId === selectedNode.id)
                .map((edge) => {
                  const target = graph.nodes.find((n) => n.id === edge.toNodeId);
                  return (
                    <div
                      key={edge.id}
                      className="flex items-center justify-between gap-2 p-2 rounded-md bg-[#161C28] text-xs"
                    >
                      <span className="truncate text-slate-300">
                        {edge.branch !== 'default' ? `[${edge.branch.toUpperCase()}] ` : ''}
                        {target?.label || 'Target'}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeEdge(edge.id)}
                        aria-label={`Disconnect ${target?.label || 'node'}`}
                        className="text-slate-400 hover:text-rose-400"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              {graph.edges.filter((e) => e.fromNodeId === selectedNode.id).length === 0 && (
                <p className="text-[11px] text-slate-500">
                  Click Out, True, or False on this node, then click In on another node to connect.
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400">Select a node on the canvas to configure its parameters.</p>
        )}

        {validation.issues.length > 0 && (
          <div className="pt-3 border-t border-white/10 space-y-2">
            <div className="text-xs font-medium text-slate-300">Diagnostics</div>
            {validation.issues.map((iss, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-md text-[11px] ${
                  iss.severity === 'error'
                    ? 'bg-rose-500/15 text-rose-300'
                    : 'bg-amber-500/15 text-amber-200'
                }`}
              >
                {iss.message}
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
};
