import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { SigmaContainer, useLoadGraph, useSigma } from '@react-sigma/core';
import Graph from 'graphology';
import { parse } from 'graphology-gexf';
import Papa from 'papaparse';
import louvain from 'graphology-communities-louvain';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import circular from 'graphology-layout/circular';
import EdgeCurveProgram from "@sigma/edge-curve";
import { Upload, Network, Maximize, Minimize, ZoomIn, ZoomOut, Download, Trash2, Info, Check, RefreshCw, X, Edit2, FileText, User, MessageSquare, Calendar, ExternalLink, Layers, Eye, EyeOff, Share2, Filter, Plus, Minus, Sparkles, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

interface Publication {
  id: string;
  author: string;
  normalizedAuthor: string;
  content: string;
  date: string;
  url?: string;
  sentiment?: number;
  reach?: number;
  engagement?: number;
  retweets?: number;
  followers?: number;
  [key: string]: any;
}

// Sigma controller to handle graph updates and interactions
const SigmaController: React.FC<{ 
  graph: Graph;
  hoveredNode: string | null;
  setHoveredNode: (node: string | null) => void;
  selectedNode: string | null;
  setSelectedNode: (node: string | null | ((prev: string | null) => string | null)) => void;
  selectedCommunity: number | null;
  nodeSizeMultiplier: number;
  hiddenCommunities: Set<number>;
}> = ({ graph, hoveredNode, setHoveredNode, selectedNode, setSelectedNode, selectedCommunity, nodeSizeMultiplier, hiddenCommunities }) => {
  const loadGraph = useLoadGraph();
  const sigma = useSigma();

  // Identify top 15 nodes by size for default label display
  const topNodes = useMemo(() => {
    if (!graph || graph.order === 0) return new Set<string>();
    return new Set(
      graph.nodes()
        .sort((a, b) => (graph.getNodeAttribute(b, 'size') || 0) - (graph.getNodeAttribute(a, 'size') || 0))
        .slice(0, 15)
    );
  }, [graph]);

  // Pre-calculate top 10 nodes for each community to strictly limit labels on hover
  const topCommunityNodes = useMemo(() => {
    if (!graph || graph.order === 0) return {} as Record<number, Set<string>>;
    const communityGroups: Record<number, string[]> = {};
    
    graph.forEachNode((node, attr) => {
      const comm = attr.community;
      if (comm === undefined) return;
      if (!communityGroups[comm]) communityGroups[comm] = [];
      communityGroups[comm].push(node);
    });

    const result: Record<number, Set<string>> = {};
    Object.entries(communityGroups).forEach(([comm, nodes]) => {
      const sortedNodes = nodes
        .sort((a, b) => (graph.getNodeAttribute(b, 'size') || 0) - (graph.getNodeAttribute(a, 'size') || 0))
        .slice(0, 10); // Limit to top 10 per community
      result[Number(comm)] = new Set(sortedNodes);
    });
    return result;
  }, [graph]);

  // Pre-calculate community adjacency to identify neighboring clusters
  const communityAdjacency = useMemo(() => {
    if (!graph || graph.order === 0) return {} as Record<number, Set<number>>;
    const adjacency: Record<number, Set<number>> = {};
    
    graph.forEachEdge((edge, attr, source, target) => {
      const sourceComm = graph.getNodeAttribute(source, 'community');
      const targetComm = graph.getNodeAttribute(target, 'community');
      if (sourceComm !== undefined && targetComm !== undefined && sourceComm !== targetComm) {
        if (!adjacency[sourceComm]) adjacency[sourceComm] = new Set();
        if (!adjacency[targetComm]) adjacency[targetComm] = new Set();
        adjacency[sourceComm].add(targetComm);
        adjacency[targetComm].add(sourceComm);
        adjacency[sourceComm].add(targetComm);
        adjacency[targetComm].add(sourceComm);
      }
    });
    return adjacency;
  }, [graph]);

  // Calculate active context: visible nodes and top 10 labels when a node/community is active
  const activeContext = useMemo(() => {
    const activeNode = hoveredNode || selectedNode;
    if (!activeNode && selectedCommunity === null) return null;

    const activeCommunity = activeNode 
      ? graph.getNodeAttribute(activeNode, 'community') 
      : selectedCommunity;
    
    if (activeCommunity === null || activeCommunity === undefined) return null;

    const visibleNodes = new Set<string>();
    const connectedNeighborNodes = new Set<string>();

    // 1. All nodes in the active community are visible
    graph.forEachNode((node, attr) => {
      if (attr.community === activeCommunity) {
        visibleNodes.add(node);
      }
    });

    // 2. Nodes in other communities are visible ONLY if directly connected to the active community
    graph.forEachEdge((edge, attr, source, target) => {
      const sourceComm = graph.getNodeAttribute(source, 'community');
      const targetComm = graph.getNodeAttribute(target, 'community');
      
      if (sourceComm === activeCommunity && targetComm !== activeCommunity) {
        visibleNodes.add(target);
        connectedNeighborNodes.add(target);
      } else if (targetComm === activeCommunity && sourceComm !== activeCommunity) {
        visibleNodes.add(source);
        connectedNeighborNodes.add(source);
      }
    });

    // 3. Pick top 10 labels from the entire visible set
    const topLabels = new Set(
      Array.from(visibleNodes)
        .sort((a, b) => (graph.getNodeAttribute(b, 'size') || 0) - (graph.getNodeAttribute(a, 'size') || 0))
        .slice(0, 10)
    );

    // Ensure the active node itself is always labeled if it's not in the top 10
    if (activeNode) topLabels.add(activeNode);

    return { visibleNodes, topLabels, activeCommunity, connectedNeighborNodes };
  }, [graph, hoveredNode, selectedNode, selectedCommunity]);

  useEffect(() => {
    // Handle click on node to highlight community
    const onClickNode = (e: { node: string }) => {
      const node = e.node;
      setSelectedNode((prev) => (prev === node ? null : node));
    };

    // Handle click on stage to clear selection
    const onClickStage = () => {
      setSelectedNode(null);
    };

    // Handle hover events
    const onEnterNode = (e: { node: string }) => {
      setHoveredNode(e.node);
    };
    const onLeaveNode = () => {
      setHoveredNode(null);
    };

    sigma.on('clickNode', onClickNode);
    sigma.on('clickStage', onClickStage);
    sigma.on('enterNode', onEnterNode);
    sigma.on('leaveNode', onLeaveNode);

    // Disable mouse wheel zoom
    const mouseCaptor = sigma.getMouseCaptor();
    const preventWheel = (e: any) => {
      if (e.original) {
        e.original.preventDefault();
        e.original.stopPropagation();
      }
    };
    const preventDoubleClick = (e: any) => {
      if (e.original) {
        e.original.preventDefault();
        e.original.stopPropagation();
      }
    };
    
    mouseCaptor.on('wheel', preventWheel);
    mouseCaptor.on('doubleClick', preventDoubleClick);

    return () => {
      sigma.off('clickNode', onClickNode);
      sigma.off('clickStage', onClickStage);
      sigma.off('enterNode', onEnterNode);
      sigma.off('leaveNode', onLeaveNode);
      mouseCaptor.off('wheel', preventWheel);
      mouseCaptor.off('doubleClick', preventDoubleClick);
    };
  }, [sigma, graph]);

  // Center camera on selected node
  useEffect(() => {
    if (selectedNode && graph.hasNode(selectedNode)) {
      const nodeData = sigma.getNodeDisplayData(selectedNode);
      if (nodeData) {
        sigma.getCamera().animate(
          { x: nodeData.x, y: nodeData.y, ratio: 0.15 },
          { duration: 600 }
        );
      }
    }
  }, [selectedNode, sigma, graph]);

  // Apply node and edge reducers for highlight effect
  useEffect(() => {
    const activeNode = hoveredNode || selectedNode;

    sigma.setSetting("nodeReducer", (node, data) => {
      const res = { ...data };
      const nodeCommunity = graph.getNodeAttribute(node, 'community');
      const baseSize = graph.getNodeAttribute(node, 'size') || 2;
      const finalSize = baseSize * nodeSizeMultiplier;
      const labelSize = graph.getNodeAttribute(node, 'labelSize') || 12;
      
      // Faded style for hidden communities
      if (hiddenCommunities.has(nodeCommunity)) {
        res.label = "";
        res.color = "#f1f5f9";
        res.opacity = 0.05;
        res.size = finalSize;
        res.labelColor = "rgba(0, 0, 0, 0.02)";
        return res;
      }

      res.size = finalSize;
      
      if (activeContext) {
        const { visibleNodes, topLabels, activeCommunity } = activeContext;
        const isVisible = visibleNodes.has(node);
        const nodeCommunity = graph.getNodeAttribute(node, 'community');
        const isSameCommunity = nodeCommunity === activeCommunity;

        if (isVisible) {
          res.opacity = isSameCommunity ? 1 : 0.8;
          res.color = graph.getNodeAttribute(node, 'color');
          
          if (topLabels.has(node)) {
            res.label = data.label;
            res.zIndex = 100;
            res.labelColor = "#000000";
            res.labelWeight = node === activeNode ? "900" : "800";
            res.labelSize = node === activeNode ? labelSize * 1.2 : labelSize;
          } else {
            res.label = "";
          }
        } else {
          res.label = "";
          res.color = "#f1f5f9"; // Very light gray for faded nodes
          res.opacity = 0.05;
          res.labelColor = "rgba(0, 0, 0, 0.02)";
        }
      } else {
        res.labelColor = "#000000";
        res.opacity = 1;
        res.labelWeight = "900";
        
        // Default state: exactly top 15 nodes labeled
        if (topNodes.has(node)) {
          res.label = data.label;
          res.zIndex = 10;
          res.labelSize = labelSize;
        } else {
          res.label = "";
        }
      }
      return res;
    });

    sigma.setSetting("edgeReducer", (edge, data) => {
      const res = { ...data };
      const source = graph.source(edge);
      const target = graph.target(edge);
      const sourceComm = graph.getNodeAttribute(source, 'community');
      const targetComm = graph.getNodeAttribute(target, 'community');

      // Faded style if either community is hidden
      if (hiddenCommunities.has(sourceComm) || hiddenCommunities.has(targetComm)) {
        res.opacity = 0.01;
        res.color = "#f1f5f9";
        res.size = 0.05;
        return res;
      }

      if (activeContext) {
        const { activeCommunity, visibleNodes } = activeContext;
        const source = graph.source(edge);
        const target = graph.target(edge);
        const sourceComm = graph.getNodeAttribute(source, 'community');
        const targetComm = graph.getNodeAttribute(target, 'community');
        
        const isInternal = sourceComm === activeCommunity && targetComm === activeCommunity;
        const isToVisibleNeighbor = (sourceComm === activeCommunity && visibleNodes.has(target)) ||
                                    (targetComm === activeCommunity && visibleNodes.has(source));
        const activeNode = hoveredNode || selectedNode;
        const isConnectedToActive = source === activeNode || target === activeNode;

        if (isConnectedToActive || isInternal || isToVisibleNeighbor) {
          res.color = data.color;
          res.size = data.size * 2;
          res.opacity = isInternal ? 0.6 : 0.3;
        } else {
          res.opacity = 0.01;
          res.color = "#f1f5f9";
          res.size = 0.05;
        }
      } else {
        res.color = data.color;
        res.opacity = 0.04; // Even fainter edges by default
        res.size = data.size;
      }
      return res;
    });

    sigma.refresh();
  }, [sigma, graph, hoveredNode, selectedNode, nodeSizeMultiplier, hiddenCommunities]);

  useEffect(() => {
    const container = sigma.getContainer();
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        console.log("Sigma container size changed:", entry.contentRect.width, "x", entry.contentRect.height);
        sigma.refresh();
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [sigma]);

  useEffect(() => {
    if (graph && graph.order > 0) {
      console.log("SigmaController: Loading graph with", graph.order, "nodes");
      loadGraph(graph);
      
      // Give Sigma a moment to process the layout before centering
      const timeout = setTimeout(() => {
        const dims = sigma.getDimensions();
        const rect = sigma.getContainer()?.getBoundingClientRect();
        console.log("Sigma dimensions during reset:", dims, "Rect:", rect, "Window:", { w: window.innerWidth, h: window.innerHeight }, "DOffH:", document.documentElement.offsetHeight);
        sigma.refresh();
        // Try to reset camera to fit all nodes
        try {
          // Force a camera reset to the center of the graph bounds
          console.log("SigmaController: Resetting camera");
          sigma.getCamera().animatedReset({ duration: 800 });
        } catch (e) {
          console.error("Camera reset failed", e);
          sigma.getCamera().setState({ x: 0.5, y: 0.5, ratio: 1, angle: 0 });
        }
        
        // Second refresh to be sure
        setTimeout(() => sigma.refresh(), 100);
      }, 800);
      
      return () => clearTimeout(timeout);
    }
  }, [graph, loadGraph, sigma]);

  // Force a refresh when sigma instance or nodeSizeMultiplier changes
  useEffect(() => {
    sigma.refresh();
  }, [sigma, nodeSizeMultiplier]);

  return null;
};

// Legend component for communities
const Legend: React.FC<{
  graph: Graph;
  communityNames: Record<number, string>;
  setCommunityNames: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  hiddenCommunities: Set<number>;
  setHiddenCommunities: React.Dispatch<React.SetStateAction<Set<number>>>;
}> = ({ graph, communityNames, setCommunityNames, hiddenCommunities, setHiddenCommunities }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const totalNodes = useMemo(() => graph.order, [graph]);

  const communities = useMemo(() => {
    const counts: Record<number, { count: number; color: string }> = {};
    graph.forEachNode((node, attr) => {
      const comm = attr.community;
      if (comm === undefined) return;
      if (!counts[comm]) {
        counts[comm] = { count: 0, color: attr.color || "#ccc" };
      }
      counts[comm].count++;
    });
    return Object.entries(counts)
      .map(([id, data]) => ({ 
        id: Number(id), 
        ...data,
        percentage: ((data.count / totalNodes) * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count);
  }, [graph, totalNodes]);

  const toggleCommunity = (id: number) => {
    setHiddenCommunities(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        // Prevent hiding all communities
        if (next.size < communities.length - 1) {
          next.add(id);
        }
      }
      return next;
    });
  };

  const startEditing = (id: number, name: string) => {
    setEditingId(id);
    setEditValue(name);
  };

  const saveName = () => {
    if (editingId !== null) {
      setCommunityNames(prev => ({ ...prev, [editingId]: editValue }));
      setEditingId(null);
    }
  };

  return (
    <div className="absolute bottom-4 left-4 z-10 flex flex-col items-start">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white/90 backdrop-blur-sm w-[52px] h-[52px] rounded-2xl border border-slate-200 shadow-xl flex items-center justify-center hover:bg-slate-50 transition-colors"
        title="Légende"
      >
        <Layers size={18} className="text-secondary" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl border border-slate-200 shadow-2xl w-42 flex flex-col gap-2 mt-2"
          >
            <div className="flex items-center justify-between px-1">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Clusters</span>
              <div className="flex gap-2">
                <button 
                  onClick={() => setHiddenCommunities(new Set())}
                  className="text-[7px] font-black text-secondary hover:underline uppercase"
                >
                  Tous
                </button>
              </div>
            </div>

            <div className="space-y-1.5 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
              {communities.map(comm => (
                <div key={comm.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button 
                      onClick={() => toggleCommunity(comm.id)}
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${hiddenCommunities.has(comm.id) ? 'border-slate-300' : 'border-transparent'}`}
                      style={{ backgroundColor: hiddenCommunities.has(comm.id) ? 'transparent' : comm.color }}
                    >
                      {hiddenCommunities.has(comm.id) ? <EyeOff size={8} className="text-slate-400" /> : <Eye size={8} className="text-white" />}
                    </button>
                    
                    {editingId === comm.id ? (
                      <input 
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveName}
                        onKeyDown={(e) => e.key === 'Enter' && saveName()}
                        className="text-[10px] font-bold text-slate-900 bg-slate-100 px-1 rounded border-none focus:ring-1 focus:ring-secondary w-full"
                      />
                    ) : (
                      <div className="flex items-center gap-1 min-w-0 flex-1">
                        <span 
                          className={`text-[10px] font-bold truncate ${hiddenCommunities.has(comm.id) ? 'text-slate-300 line-through' : 'text-slate-700'}`}
                          title={communityNames[comm.id]}
                        >
                          {communityNames[comm.id]}
                        </span>
                        <button 
                          onClick={() => startEditing(comm.id, communityNames[comm.id])}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-secondary transition-all"
                        >
                          <Edit2 size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <span className="text-[8px] font-black text-slate-300">{comm.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Controls component that lives inside SigmaContainer
const GraphControls: React.FC<{
  nodeSizeMultiplier: number;
  setNodeSizeMultiplier: (val: number) => void;
}> = ({ nodeSizeMultiplier, setNodeSizeMultiplier }) => {
  const sigma = useSigma();

  const zoomIn = () => {
    sigma.getCamera().animatedZoom(1.5);
  };

  const zoomOut = () => {
    sigma.getCamera().animatedZoom(0.6);
  };

  const resetView = () => {
    try {
      sigma.getCamera().animatedReset({ duration: 800 });
    } catch (e) {
      sigma.getCamera().setState({ x: 0.5, y: 0.5, ratio: 1, angle: 0 });
    }
  };

  return (
    <div className="absolute bottom-4 right-4 z-10 flex flex-col items-end gap-3">
      {/* Zoom Controls */}
      <div 
        style={{ backgroundColor: '#FBC33C' }}
        className="rounded-2xl shadow-2xl flex flex-col items-center justify-between w-[52px] h-[140px] py-1"
      >
        <button 
          onClick={zoomIn}
          className="p-2 hover:bg-white/20 rounded-2xl text-slate-900 transition-colors" 
          title="Zoom In"
        >
          <ZoomIn size={20} />
        </button>
        <div className="w-8 h-px bg-white/40" />
        <button 
          onClick={zoomOut}
          className="p-2 hover:bg-white/20 rounded-2xl text-slate-900 transition-colors" 
          title="Zoom Out"
        >
          <ZoomOut size={20} />
        </button>
        <div className="w-8 h-px bg-white/40" />
        <button 
          onClick={resetView}
          className="p-2 hover:bg-white/20 rounded-2xl text-slate-900 transition-colors" 
          title="Reset View"
        >
          <Maximize size={20} />
        </button>
      </div>
    </div>
  );
};

// TopRightControls component for node size
const TopRightControls: React.FC<{
  nodeSizeMultiplier: number;
  setNodeSizeMultiplier: React.Dispatch<React.SetStateAction<number>>;
}> = ({ nodeSizeMultiplier, setNodeSizeMultiplier }) => {
  return (
    <div className="absolute top-4 right-4 z-10 flex flex-col items-center gap-3">
      {/* Node Size Control */}
      <div className="bg-white/90 backdrop-blur-sm p-2 rounded-2xl border border-slate-200 shadow-xl flex flex-col items-center gap-1 w-[52px]">
        <div className="text-[7px] font-black text-slate-400 uppercase tracking-tighter text-center leading-none mb-1">Taille</div>
        <button 
          onClick={() => setNodeSizeMultiplier(prev => Math.min(prev + 0.2, 5))}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
          title="Augmenter la taille"
        >
          <Plus size={16} />
        </button>
        <div className="text-[9px] font-black text-slate-900 leading-none py-1">{nodeSizeMultiplier.toFixed(1)}x</div>
        <button 
          onClick={() => setNodeSizeMultiplier(prev => Math.max(prev - 0.2, 0.1))}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 transition-colors"
          title="Diminuer la taille"
        >
          <Minus size={16} />
        </button>
      </div>
    </div>
  );
};

export default function Cartographie() {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [graphId, setGraphId] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ nodes: number; edges: number; clusters: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [communityNames, setCommunityNames] = useState<Record<number, string>>({});
  const [editingCommunity, setEditingCommunity] = useState<number | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodeSizeMultiplier, setNodeSizeMultiplier] = useState(1);
  const [hiddenCommunities, setHiddenCommunities] = useState<Set<number>>(new Set());
  const [publications, setPublications] = useState<Publication[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<number | null>(null);
  const [synthesis, setSynthesis] = useState<string>("");
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isSynthesisExpanded, setIsSynthesisExpanded] = useState(false);
  const [isCsvDragging, setIsCsvDragging] = useState(false);
  const [isGexfDragging, setIsGexfDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Debug log to check container height
    const checkHeight = () => {
      const container = document.querySelector('.sigma-container');
      if (container) {
        const rect = container.getBoundingClientRect();
        console.log(`Sigma container height:`, rect.height, "width:", rect.width);
      }
    };
    
    checkHeight();
    const timer = setTimeout(checkHeight, 1000);
    return () => clearTimeout(timer);
  }, [graph]);

  const finalizeGraph = useCallback((newGraph: Graph) => {
    try {
      if (newGraph.order === 0) {
        throw new Error('Le graphe ne contient aucun noeud.');
      }

      // 1. Ensure all nodes have positions and basic attributes
      newGraph.forEachNode((node, attr) => {
        if (attr.x === undefined || attr.y === undefined || isNaN(attr.x) || isNaN(attr.y) || (attr.x === 0 && attr.y === 0)) {
          newGraph.setNodeAttribute(node, 'x', Math.random() * 1000);
          newGraph.setNodeAttribute(node, 'y', Math.random() * 1000);
        }
        
        const degree = newGraph.degree(node);
        const currentSize = attr.size || (3 + Math.pow(degree, 0.7) * 2.5);
        newGraph.setNodeAttribute(node, 'size', Math.max(currentSize, 4));
        
        if (!attr.label) {
          newGraph.setNodeAttribute(node, 'label', node);
        }
      });

      // 2. Run Louvain clustering with weight awareness
      const communities = louvain(newGraph, {
        resolution: 1.2,
        getEdgeWeight: (edge) => newGraph.getEdgeAttribute(edge, 'weight') || 1
      });

      // 3. Sort communities by size (number of nodes)
      const communityCounts: Record<number, number> = {};
      Object.values(communities).forEach(c => {
        communityCounts[c] = (communityCounts[c] || 0) + 1;
      });

      const sortedCommunityIds = Object.entries(communityCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => Number(id));

      const communityMapping: Record<number, number> = {};
      sortedCommunityIds.forEach((oldId, index) => {
        communityMapping[oldId] = index;
      });

      const clusterCount = sortedCommunityIds.length;
      
      const colors = [
        '#E91E63', '#2196F3', '#4CAF50', '#FF9800', '#9C27B0', 
        '#00BCD4', '#FFEB3B', '#795548', '#607D8B', '#FF5722',
        '#3F51B5', '#009688', '#CDDC39', '#FFC107', '#FF4081'
      ];

      newGraph.forEachNode((node) => {
        const oldCommunity = communities[node];
        const community = communityMapping[oldCommunity];
        newGraph.setNodeAttribute(node, 'community', community);
        newGraph.setNodeAttribute(node, 'color', colors[community % colors.length]);
        const size = newGraph.getNodeAttribute(node, 'size') || 5;
        const labelSize = Math.max(12, Math.min(32, 10 + (size - 4) * 1.8));
        newGraph.setNodeAttribute(node, 'labelSize', labelSize);
      });

      // 4. Set edge colors and sizes (with reduced opacity)
      newGraph.forEachEdge((edge, attr, source, target) => {
        const sourceColor = newGraph.getNodeAttribute(source, 'color');
        // Add opacity to the hex color (e.g., B2 for ~70% opacity)
        const colorWithOpacity = sourceColor.length === 7 ? `${sourceColor}B2` : sourceColor;
        newGraph.setEdgeAttribute(edge, 'color', colorWithOpacity);
        const weight = attr.weight || 1;
        // Vary size more noticeably based on weight: base 0.2, max 2.5
        newGraph.setEdgeAttribute(edge, 'size', Math.max(0.2, Math.min(0.2 + (weight * 0.4), 2.5)));
      });

      // 5. Run ForceAtlas2 layout optimized for cluster separation (Visibrain-style)
      forceAtlas2.assign(newGraph, {
        iterations: 2000,
        settings: {
          gravity: 1.2, // Increased gravity to pull clusters together and reduce empty space
          scalingRatio: 8.0, // Balanced scaling to separate clusters without creating huge gaps
          strongGravityMode: true, // Strong gravity helps in forming more cohesive global structure
          barnesHutOptimize: true,
          linLogMode: true, // Essential for the "cloud" clustering effect
          adjustSizes: true, // Prevent node overlap
          outboundAttractionDistribution: true // Hubs attract more, pushing them to cluster centers
        }
      });

      // 5. Final check for bounds
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      newGraph.forEachNode((node, attr) => {
        minX = Math.min(minX, attr.x);
        maxX = Math.max(maxX, attr.x);
        minY = Math.min(minY, attr.y);
        maxY = Math.max(maxY, attr.y);
      });
      setGraphId(prev => prev + 1);
      setGraph(newGraph);

      const width = maxX - minX;
      const height = maxY - minY;

      if (width < 1 || height < 1 || isNaN(width) || isNaN(height)) {
        circular.assign(newGraph, { scale: 500 });
      }

      setGraphId(prev => prev + 1);

      setGraph(newGraph);
      setStats({
        nodes: newGraph.order,
        edges: newGraph.size,
        clusters: clusterCount
      });

      const names: Record<number, string> = {};
      for (let i = 0; i < clusterCount; i++) {
        names[i] = `Cluster ${i + 1}`;
      }
      setCommunityNames(names);
      setSelectedCommunity(null);
      setSelectedNode(null);
      setSynthesis("");
      setIsProcessing(false);
    } catch (err) {
      console.error('Error finalizing graph:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du traitement du graphe.');
      setIsProcessing(false);
    }
  }, []);

  const processGexf = useCallback((content: string) => {
    setIsProcessing(true);
    setError(null);
    
    setTimeout(() => {
      try {
        const newGraph = parse(Graph, content);
        finalizeGraph(newGraph);
      } catch (err) {
        console.error('Error parsing GEXF:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors de la lecture du fichier GEXF.');
        setIsProcessing(false);
      }
    }, 50);
  }, [finalizeGraph]);

  const processCsv = useCallback((content: string) => {
    setIsProcessing(true);
    setError(null);

    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const data = results.data as any[];
          if (data.length === 0) throw new Error('Le fichier CSV est vide.');

          // Mapping Talkwalker columns to our Publication interface
          const newPubs: Publication[] = data.map((row, index) => {
            const rawAuthor = row['Id'] || row['screen name'] || row['extra_author_attributes.name'] || row['Author'] || 'Inconnu';
            return {
              id: `pub-${index}`,
              author: rawAuthor,
              normalizedAuthor: String(rawAuthor).toLowerCase().trim().replace(/^@/, ''),
              content: row['text'] || row['content'] || row['Snippet'] || row['Title'] || '',
              date: row['published'] || '',
              url: row['permalink'] || row['url'] || '',
              engagement: Number(row['engagement']) || 0,
              retweets: Number(row['retweets']) || 0,
              followers: Number(row['followers']) || 0,
              ...row
            };
          }).sort((a, b) => (b.retweets || 0) - (a.retweets || 0));

          setPublications(newPubs);
          setIsProcessing(false);
        } catch (err: any) {
          setError(err.message || 'Erreur lors de la lecture du CSV.');
          setIsProcessing(false);
        }
      },
      error: () => {
        setError('Erreur lors de la lecture du fichier CSV.');
        setIsProcessing(false);
      }
    });
  }, []);

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        processCsv(content);
      };
      reader.readAsText(file);
    }
  };

  const generateSynthesis = async (communityId: number) => {
    if (!publications.length || !graph) return;
    
    setIsSynthesizing(true);
    setSynthesis("");
    
    try {
      // Get nodes in this community
      const communityNodes = new Set<string>();
      graph.forEachNode((node, attr) => {
        if (attr.community === communityId) {
          communityNodes.add(node.toLowerCase().trim().replace(/^@/, ''));
        }
      });
      
      // Filter publications by these authors
      const communityPubs = publications.filter(pub => 
        communityNodes.has(pub.normalizedAuthor)
      ).slice(0, 50); // Limit to top 50 for context
      
      if (communityPubs.length === 0) {
        setSynthesis("Aucune publication trouvée pour ce Cluster pour générer une synthèse.");
        setIsSynthesizing(false);
        setIsSynthesisExpanded(true);
        return;
      }
      
      const pubsText = communityPubs.map(p => `- ${p.author}: ${p.content}`).join('\n');
      
      const response = await fetch('/api/cartographie/synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pubsText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors de la synthèse");
      }

      const data = await response.json();
      setSynthesis(data.synthesis || "Erreur lors de la génération de la synthèse.");
      setIsSynthesisExpanded(true);
    } catch (err: any) {
      console.error("Synthesis error:", err);
      setSynthesis(`Une erreur est survenue lors de la génération de la synthèse : ${err.message}`);
      setIsSynthesisExpanded(true);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const onCsvDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsCsvDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        processCsv(content);
      };
      reader.readAsText(file);
    }
  };

  const onGexfDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsGexfDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.gexf') || file.type === 'text/xml')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        processGexf(content);
      };
      reader.readAsText(file);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        processGexf(content);
      };
      reader.readAsText(file);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.gexf') || file.type === 'text/xml')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        processGexf(content);
      };
      reader.readAsText(file);
    } else {
      setError('Veuillez déposer un fichier au format .gexf');
    }
  };

  const clearGraph = () => {
    setGraph(null);
    setStats(null);
    setError(null);
    setCommunityNames({});
    setEditingCommunity(null);
    setPublications([]);
    setNodeSizeMultiplier(1);
    setHiddenCommunities(new Set());
    setGraphId(0);
  };

  const filteredPublications = useMemo(() => {
    if (!graph) return publications;
    
    let filtered = publications;

    if (selectedNode) {
      const nodeAttr = graph.getNodeAttributes(selectedNode);
      const possibleIds = new Set([
        String(selectedNode).toLowerCase().trim().replace(/^@/, ''),
        String(nodeAttr.label || '').toLowerCase().trim().replace(/^@/, ''),
        String(nodeAttr.displayName || '').toLowerCase().trim().replace(/^@/, ''),
        String(nodeAttr.screen_name || '').toLowerCase().trim().replace(/^@/, '')
      ].filter(Boolean));
      
      filtered = publications.filter(p => possibleIds.has(p.normalizedAuthor));
    } else if (selectedCommunity !== null) {
      const communityNodes = new Set<string>();
      graph.forEachNode((node, attr) => {
        if (attr.community === selectedCommunity) {
          communityNodes.add(node.toLowerCase().trim().replace(/^@/, ''));
        }
      });
      filtered = publications.filter(p => communityNodes.has(p.normalizedAuthor));
    }
    
    return filtered.sort((a, b) => (b.retweets || 0) - (a.retweets || 0));
  }, [publications, selectedNode, selectedCommunity, graph]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6 bg-slate-50/50 rounded-2xl">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-center justify-between shrink-0 px-2 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary to-slate-700 flex items-center justify-center text-white shadow-lg shadow-secondary/20">
            <Network size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-secondary tracking-tight">Cartographie <span className="text-primary">Maarc</span></h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Analyse des réseaux & clusters</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end shrink-0 gap-3">
          {/* Compact GEXF Upload */}
          <div className="w-[130px] flex items-center gap-2 bg-white border border-dashed border-slate-300 rounded-2xl px-4 h-[42px] hover:border-secondary transition-colors group relative shadow-sm">
            <Network size={16} className={graph ? 'text-emerald-500' : 'text-slate-400'} />
            <div className="flex flex-col justify-center">
              <span className="text-[10px] font-bold text-slate-900 leading-none">Réseau GEXF</span>
              <span className="text-[9px] text-slate-400 leading-none mt-0.5">{graph ? 'Chargé' : 'Attente...'}</span>
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".gexf" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </div>

          {/* Compact CSV Upload */}
          <div className="w-[130px] flex items-center gap-2 bg-white border border-dashed border-slate-300 rounded-2xl px-4 h-[42px] hover:border-secondary transition-colors group relative shadow-sm">
            <FileText size={16} className={publications.length > 0 ? 'text-emerald-500' : 'text-slate-400'} />
            <div className="flex flex-col justify-center">
              <span className="text-[10px] font-bold text-slate-900 leading-none">Publications CSV</span>
              <span className="text-[9px] text-slate-400 leading-none mt-0.5">{publications.length > 0 ? `${publications.length} posts` : 'Attente...'}</span>
            </div>
            <input type="file" ref={csvInputRef} onChange={handleCsvUpload} accept=".csv" className="hidden" />
            <button onClick={() => csvInputRef.current?.click()} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
          </div>

          <button 
            onClick={clearGraph}
            disabled={!graph && publications.length === 0}
            className={`w-[130px] flex items-center justify-center gap-2 px-4 h-[42px] text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all border ${
              (graph || publications.length > 0) 
                ? 'text-red-500 bg-red-50 border-red-100 hover:bg-red-100' 
                : 'text-slate-300 bg-slate-50 border-slate-100 cursor-not-allowed'
            }`}
          >
            Réinitialiser
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-6 min-h-0">
        {/* Left Column: Map (Expanded) */}
        <div className="col-span-8 relative bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col min-h-0 h-[450px]">
          {!graph ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <Network size={48} className="text-slate-200 mb-4" />
              <h3 className="text-lg font-bold text-slate-400">En attente du fichier GEXF...</h3>
              <p className="text-slate-400 text-sm max-w-xs mt-2">Importez la structure de votre réseau pour commencer l'analyse.</p>
            </div>
          ) : (
            <>
              {/* Stats Overlay */}
              <div className="absolute top-4 left-4 z-10">
                <div 
                  style={{ backgroundColor: '#FBC33C' }}
                  className="rounded-2xl shadow-2xl flex flex-col items-center justify-between w-[52px] h-[140px] py-3"
                >
                  <div className="text-center">
                    <div className="text-[8px] text-slate-900/70 font-bold uppercase tracking-tighter leading-none mb-1">Noeuds</div>
                    <div className="text-xs font-black text-slate-900 leading-none">{stats?.nodes.toLocaleString()}</div>
                  </div>
                  <div className="w-8 h-px bg-white/40" />
                  <div className="text-center">
                    <div className="text-[8px] text-slate-900/70 font-bold uppercase tracking-tighter leading-none mb-1">Liens</div>
                    <div className="text-xs font-black text-slate-900 leading-none">{stats?.edges.toLocaleString()}</div>
                  </div>
                  <div className="w-8 h-px bg-white/40" />
                  <div className="text-center">
                    <div className="text-[8px] text-slate-900/70 font-bold uppercase tracking-tighter leading-none mb-1">Clusters</div>
                    <div className="text-xs font-black text-slate-900 leading-none">{stats?.clusters}</div>
                  </div>
                </div>
              </div>

              {/* Graph Container */}
              <div className="flex-1 w-full bg-white relative overflow-hidden">
                <SigmaContainer 
                  key={graph ? `graph-${graphId}` : 'empty'}
                  className="sigma-container"
                  style={{ height: '100%', width: '100%' }}
                  settings={{
                    allowInvalidContainer: true,
                    labelFont: 'Inter, sans-serif',
                    labelSize: 12,
                    labelWeight: '900',
                    labelColor: { color: "#000000" },
                    defaultNodeColor: '#3b82f6',
                    labelRenderedSizeThreshold: 0,
                    hideEdgesOnMove: true,
                    renderLabels: true,
                    labelDensity: 0.07,
                    labelGridCellSize: 60,
                    edgeProgramClasses: {
                      curved: EdgeCurveProgram,
                    },
                    defaultEdgeType: "curved",
                  }}
                >
                  <SigmaController 
                    graph={graph} 
                    hoveredNode={hoveredNode}
                    setHoveredNode={setHoveredNode}
                    selectedNode={selectedNode}
                    setSelectedNode={setSelectedNode}
                    selectedCommunity={selectedCommunity}
                    nodeSizeMultiplier={nodeSizeMultiplier}
                    hiddenCommunities={hiddenCommunities}
                  />
                  <GraphControls 
                    nodeSizeMultiplier={nodeSizeMultiplier} 
                    setNodeSizeMultiplier={setNodeSizeMultiplier}
                  />
                  <TopRightControls 
                    nodeSizeMultiplier={nodeSizeMultiplier}
                    setNodeSizeMultiplier={setNodeSizeMultiplier}
                  />
                  <Legend 
                    graph={graph}
                    communityNames={communityNames}
                    setCommunityNames={setCommunityNames}
                    hiddenCommunities={hiddenCommunities}
                    setHiddenCommunities={setHiddenCommunities}
                  />
                </SigmaContainer>
              </div>
            </>
          )}
        </div>

        {/* Right Column: Publications (Styled) */}
        <div className="col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xl flex flex-col min-h-0 h-[450px] overflow-hidden">
          <div className="p-5 bg-white shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-black text-slate-900 flex items-center gap-2 uppercase tracking-widest">
                <MessageSquare size={14} className="text-secondary" />
                Flux de Publications
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black bg-secondary/10 text-secondary px-2.5 py-1 rounded-lg">
                  {filteredPublications.length}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <select 
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-black text-slate-700 outline-none focus:ring-2 focus:ring-secondary/20 transition-all uppercase tracking-widest"
                  value={selectedCommunity ?? ""}
                  onChange={(e) => {
                    const val = e.target.value === "" ? null : Number(e.target.value);
                    setSelectedCommunity(val);
                    setSelectedNode(null); // Clear node selection when changing community
                  }}
                >
                  <option value="">Tous les Clusters</option>
                  {Object.entries(communityNames)
                    .slice(0, 5)
                    .map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                </select>

                <button
                  onClick={() => selectedCommunity !== null && generateSynthesis(selectedCommunity)}
                  disabled={selectedCommunity === null || isSynthesizing}
                  className="flex items-center gap-2 bg-secondary text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-secondary/90 transition-all disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isSynthesizing ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <Sparkles size={12} />
                  )}
                  Synthèse
                </button>
              </div>

              {/* AI Synthesis Accordion (Moved here) */}
              <AnimatePresence>
                {(synthesis || isSynthesizing) && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-[#FBC33C] rounded-2xl overflow-hidden shadow-sm"
                  >
                    <button 
                      onClick={() => setIsSynthesisExpanded(!isSynthesisExpanded)}
                      className="w-full px-4 py-2.5 flex items-center justify-between text-black hover:bg-black/5 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-black" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Synthèse IA {selectedCommunity !== null ? `(${communityNames[selectedCommunity]})` : ''}</span>
                    </div>
                      {isSynthesisExpanded ? <Minus size={14} className="text-black" /> : <Plus size={14} className="text-black" />}
                    </button>
                    
                    <AnimatePresence>
                      {isSynthesisExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="px-4 pb-4 max-h-[250px] overflow-y-auto custom-scrollbar-light"
                        >
                          {isSynthesizing ? (
                            <div className="py-6 flex flex-col items-center justify-center gap-3">
                              <RefreshCw size={20} className="text-black animate-spin" />
                              <p className="text-[9px] font-black text-black/60 uppercase tracking-widest animate-pulse">Génération en cours...</p>
                            </div>
                          ) : (
                            <div className="prose prose-sm max-w-none text-[11px] text-left leading-relaxed prose-headings:text-black prose-headings:font-black prose-headings:uppercase prose-headings:tracking-widest prose-h1:text-[12px] prose-headings:mb-3 prose-p:text-black prose-p:font-medium prose-p:mb-3 prose-strong:text-black prose-strong:font-black prose-ul:list-none prose-ul:pl-0 prose-ul:mb-3 prose-li:text-black prose-li:mb-1 prose-li:relative prose-li:pl-4 prose-li:before:content-['-'] prose-li:before:absolute prose-li:before:left-0 prose-li:before:top-0">
                              <Markdown>{synthesis}</Markdown>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>

              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                {selectedNode 
                  ? `Filtré par compte : ${graph?.getNodeAttribute(selectedNode, 'label') || selectedNode}` 
                  : ''}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {selectedNode && graph && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-4 p-4 bg-white rounded-2xl border-2 border-secondary/20 shadow-sm relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-2">
                  <button 
                    onClick={() => setSelectedNode(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
                
                <div className="flex items-center gap-3 mb-3">
                  <div 
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg rotate-3 group-hover:rotate-0 transition-transform"
                    style={{ backgroundColor: graph.getNodeAttribute(selectedNode, 'color') || '#FBC33C' }}
                  >
                    {(graph.getNodeAttribute(selectedNode, 'label') || selectedNode).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">
                      {graph.getNodeAttribute(selectedNode, 'label') || selectedNode}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Cluster {graph.getNodeAttribute(selectedNode, 'community') + 1}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  <div className="bg-slate-50 p-2 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Abonnés</div>
                    <div className="text-xs font-black text-slate-900">
                      {graph.getNodeAttribute(selectedNode, 'followers')?.toLocaleString() || 
                       graph.getNodeAttribute(selectedNode, 'follower_count')?.toLocaleString() || 
                       graph.getNodeAttribute(selectedNode, 'extra_author_attributes.followers_count')?.toLocaleString() || 'N/A'}
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Description du compte</div>
                    <div className="text-[10px] text-slate-600 leading-relaxed italic line-clamp-4">
                      {graph.getNodeAttribute(selectedNode, 'description') || 
                       graph.getNodeAttribute(selectedNode, 'bio') || 
                       graph.getNodeAttribute(selectedNode, 'extra_author_attributes.description') || 
                       'Aucune description disponible.'}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <AnimatePresence mode="popLayout">
              {filteredPublications.length > 0 ? (
                filteredPublications.map((pub) => (
                  <motion.div
                    key={pub.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer group hover:shadow-md ${
                      selectedNode && (pub.normalizedAuthor === String(selectedNode).toLowerCase().trim().replace(/^@/, '') || 
                      pub.normalizedAuthor === String(graph?.getNodeAttribute(selectedNode, 'label') || '').toLowerCase().trim().replace(/^@/, ''))
                        ? 'border-secondary bg-white shadow-lg ring-1 ring-secondary/20'
                        : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                    }`}
                    onClick={() => {
                      // Select node in graph by author name
                      if (graph) {
                        const normAuthor = pub.normalizedAuthor;
                        const nodeId = graph.nodes().find(n => {
                          const attr = graph.getNodeAttributes(n);
                          const nId = String(n).toLowerCase().trim().replace(/^@/, '');
                          const nLabel = String(attr.label || '').toLowerCase().trim().replace(/^@/, '');
                          const nDisplay = String(attr.displayName || '').toLowerCase().trim().replace(/^@/, '');
                          const nScreen = String(attr.screen_name || '').toLowerCase().trim().replace(/^@/, '');
                          
                          return nId === normAuthor || nLabel === normAuthor || nDisplay === normAuthor || nScreen === normAuthor;
                        });
                        if (nodeId) setSelectedNode(nodeId);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-black text-slate-900 truncate group-hover:text-secondary transition-colors">
                            {pub.author}
                          </span>
                          {pub.followers !== undefined && pub.followers > 0 && (
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">
                              {pub.followers >= 1000 ? `${(pub.followers / 1000).toFixed(1)}k` : pub.followers} abonnés
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-bold uppercase tracking-widest whitespace-nowrap ml-2">
                        <Calendar size={10} className="text-slate-300" />
                        {pub.date}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-4 mb-4 leading-relaxed font-medium">
                      {pub.content}
                    </p>

                    <div className="flex items-center justify-between pt-3">
                      <div className="flex items-center gap-4">
                        {pub.retweets !== undefined && (
                          <div className="flex items-center gap-1.5 text-[10px] font-black text-secondary">
                            <RefreshCw size={12} strokeWidth={3} />
                            {pub.retweets}
                          </div>
                        )}
                        {pub.engagement !== undefined && pub.engagement > 0 && (
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Eng: {pub.engagement}
                          </div>
                        )}
                      </div>
                      
                      {pub.url && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(pub.url, '_blank');
                          }}
                          className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 hover:text-secondary transition-all uppercase tracking-widest group/btn"
                        >
                          <span className="opacity-0 group-hover/btn:opacity-100 transition-opacity">Source</span>
                          <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center group-hover/btn:bg-secondary/10 group-hover/btn:text-secondary transition-colors">
                            <ExternalLink size={12} />
                          </div>
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare size={32} className="text-slate-100 mb-3" />
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Aucune publication</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Community Analysis Section Removed */}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
        
        .custom-scrollbar-light::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar-light::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar-light::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar-light::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
