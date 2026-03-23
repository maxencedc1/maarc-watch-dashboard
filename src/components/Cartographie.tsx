import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SigmaContainer, useLoadGraph, useSigma } from '@react-sigma/core';
import Graph from 'graphology';
import { parse } from 'graphology-gexf';
import louvain from 'graphology-communities-louvain';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import circular from 'graphology-layout/circular';
import EdgeCurveProgram from "@sigma/edge-curve";
import { Upload, Network, Maximize, Minimize, ZoomIn, ZoomOut, Download, Trash2, Info, Check, RefreshCw, X, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Sigma controller to handle graph updates and interactions
const SigmaController: React.FC<{ graph: Graph }> = ({ graph }) => {
  const loadGraph = useLoadGraph();
  const sigma = useSigma();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    // Handle click on node to focus on community
    const onClickNode = (e: { node: string }) => {
      const node = e.node;
      const community = graph.getNodeAttribute(node, 'community');
      
      // Find all nodes in the same community
      const communityNodes = graph.filterNodes((n) => graph.getNodeAttribute(n, 'community') === community);
      
      if (communityNodes.length > 0) {
        // Calculate bounding box of the community in graph coordinates
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        communityNodes.forEach((n) => {
          const x = graph.getNodeAttribute(n, 'x');
          const y = graph.getNodeAttribute(n, 'y');
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        });

        const width = maxX - minX;
        const height = maxY - minY;
        const centerX = minX + width / 2;
        const centerY = minY + height / 2;

        // Focus on the community
        // Sigma camera coordinates are in graph space
        sigma.getCamera().animate(
          { 
            x: centerX, 
            y: centerY, 
            ratio: Math.max(0.05, Math.min(0.4, 800 / Math.max(width, height, 1))) 
          },
          { duration: 1000 }
        );
      }
    };

    // Handle hover events
    const onEnterNode = (e: { node: string }) => {
      setHoveredNode(e.node);
    };
    const onLeaveNode = () => {
      setHoveredNode(null);
    };

    sigma.on('clickNode', onClickNode);
    sigma.on('enterNode', onEnterNode);
    sigma.on('leaveNode', onLeaveNode);

    return () => {
      sigma.off('clickNode', onClickNode);
      sigma.off('enterNode', onEnterNode);
      sigma.off('leaveNode', onLeaveNode);
    };
  }, [sigma, graph]);

  // Apply node and edge reducers for hover effect
  useEffect(() => {
    sigma.setSetting("nodeReducer", (node, data) => {
      const res = { ...data };
      if (hoveredNode) {
        const hoveredCommunity = graph.getNodeAttribute(hoveredNode, 'community');
        const nodeCommunity = graph.getNodeAttribute(node, 'community');
        const isSameCommunity = nodeCommunity === hoveredCommunity;
        const isNeighbor = graph.hasEdge(node, hoveredNode) || graph.hasEdge(hoveredNode, node);

        if (node === hoveredNode || isNeighbor || isSameCommunity) {
          res.label = data.label;
          res.zIndex = 1;
          res.labelColor = "#ffffff";
          res.opacity = 1;
        } else {
          res.label = "";
          res.color = "#222222";
          res.opacity = 0.05;
          res.labelColor = "rgba(255, 255, 255, 0.1)";
        }
      } else {
        res.labelColor = "#ffffff";
        res.opacity = 1;
      }
      return res;
    });

    sigma.setSetting("edgeReducer", (edge, data) => {
      const res = { ...data };
      if (hoveredNode) {
        if (graph.hasExtremity(edge, hoveredNode)) {
          res.color = data.color;
          res.size = 1.5;
          res.opacity = 0.8;
        } else {
          res.opacity = 0;
          res.size = 0;
        }
      } else {
        res.color = data.color;
        res.opacity = 0.02; 
        res.size = 0.1;
      }
      return res;
    });

    sigma.refresh();
  }, [sigma, graph, hoveredNode]);

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

  // Force a refresh on every render of the controller
  useEffect(() => {
    sigma.refresh();
  });

  return null;
};

// Controls component that lives inside SigmaContainer
const GraphControls: React.FC = () => {
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
    <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
      <div 
        style={{ backgroundColor: '#FBC33C' }}
        className="p-1 rounded-lg shadow-2xl flex flex-col gap-1"
      >
        <button 
          onClick={zoomIn}
          className="p-2 hover:bg-white/20 rounded-md text-slate-900 transition-colors" 
          title="Zoom In"
        >
          <ZoomIn size={20} />
        </button>
        <button 
          onClick={zoomOut}
          className="p-2 hover:bg-white/20 rounded-md text-slate-900 transition-colors" 
          title="Zoom Out"
        >
          <ZoomOut size={20} />
        </button>
        <div className="h-px bg-white/40 mx-1" />
        <button 
          onClick={resetView}
          className="p-2 hover:bg-white/20 rounded-md text-slate-900 transition-colors" 
          title="Reset View"
        >
          <Maximize size={20} />
        </button>
      </div>
    </div>
  );
};

export default function Cartographie() {
  const [graph, setGraph] = useState<Graph | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ nodes: number; edges: number; clusters: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [communityNames, setCommunityNames] = useState<Record<number, string>>({});
  const [editingCommunity, setEditingCommunity] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const processGexf = useCallback((content: string) => {
    setIsProcessing(true);
    setError(null);
    
    // Use a small timeout to allow UI to show loading state if needed
    setTimeout(() => {
      try {
        const newGraph = parse(Graph, content);

        if (newGraph.order === 0) {
          throw new Error('Le fichier GEXF ne contient aucun noeud.');
        }

        // 1. Ensure all nodes have positions and basic attributes
        // Start with a random layout to avoid nodes being perfectly aligned
        newGraph.forEachNode((node, attr) => {
          // Use existing positions if they look valid, otherwise random
          if (attr.x === undefined || attr.y === undefined || isNaN(attr.x) || isNaN(attr.y) || (attr.x === 0 && attr.y === 0)) {
            newGraph.setNodeAttribute(node, 'x', Math.random() * 1000);
            newGraph.setNodeAttribute(node, 'y', Math.random() * 1000);
          }
          
          // Ensure size is visible
          const currentSize = attr.size || 5;
          newGraph.setNodeAttribute(node, 'size', Math.max(currentSize, 5));
          
          // Ensure label exists
          if (!attr.label) {
            newGraph.setNodeAttribute(node, 'label', node);
          }
        });

        // 2. Run Louvain clustering
        const communities = louvain(newGraph);
        const clusterCount = new Set(Object.values(communities)).size;
        
        // Color palette for clusters - Vibrant like the example
        const colors = [
          '#FF00FF', // Magenta/Pink
          '#00FFFF', // Cyan/Blue
          '#00FF00', // Green
          '#FF4500', // Orange/Red
          '#FFFF00', // Yellow
          '#8A2BE2', // BlueViolet
          '#0000FF', // Blue
          '#FF1493', // DeepPink
          '#ADFF2F', // GreenYellow
          '#FFA500'  // Orange
        ];

        newGraph.forEachNode((node) => {
          const community = communities[node];
          newGraph.setNodeAttribute(node, 'community', community);
          newGraph.setNodeAttribute(node, 'color', colors[community % colors.length]);
          
          // Increase node size scaling for more drama like the example
          const size = newGraph.getNodeAttribute(node, 'size') || 5;
          newGraph.setNodeAttribute(node, 'size', Math.max(4, size * 2));
        });

        // 3. Set edge colors and sizes
        newGraph.forEachEdge((edge, attr, source, target) => {
          const sourceColor = newGraph.getNodeAttribute(source, 'color');
          
          // Use the source node's color (community color) for the link
          newGraph.setEdgeAttribute(edge, 'color', sourceColor);
          
          // Edge size based on weight (intensity of relation)
          const weight = attr.weight || 1;
          // Scale weight to a reasonable size range (0.3 to 5)
          // Thinner edges with source color creates a "glow" effect when dense
          newGraph.setEdgeAttribute(edge, 'size', Math.max(0.3, Math.min(weight * 0.8, 5)));
        });

        // 4. Run ForceAtlas2 layout to organize the graph
        // Adjusting parameters to get more organic clusters like the example
        forceAtlas2.assign(newGraph, {
          iterations: 300,
          settings: {
            gravity: 0.8,
            scalingRatio: 15,
            strongGravityMode: true,
            barnesHutOptimize: true,
            linLogMode: true
          }
        });

        // 4. Final check: ensure nodes are not all at the same position or in a line
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        newGraph.forEachNode((_, attr) => {
          minX = Math.min(minX, attr.x);
          maxX = Math.max(maxX, attr.x);
          minY = Math.min(minY, attr.y);
          maxY = Math.max(maxY, attr.y);
        });

        const width = maxX - minX;
        const height = maxY - minY;
        console.log("Graph bounds:", { minX, maxX, minY, maxY, width, height });

        // If the graph is too squashed (like a line), force a circular layout
        if (width < 1 || height < 1 || isNaN(width) || isNaN(height)) {
          console.warn("Graph is too squashed, applying circular layout fallback");
          circular.assign(newGraph, { scale: 500 });
        }

        setGraph(newGraph);
        setStats({
          nodes: newGraph.order,
          edges: newGraph.size,
          clusters: clusterCount
        });

        // Initialize community names
        const names: Record<number, string> = {};
        for (let i = 0; i < clusterCount; i++) {
          names[i] = `Communauté ${i + 1}`;
        }
        setCommunityNames(names);
        
        setIsProcessing(false);
      } catch (err) {
        console.error('Error parsing GEXF:', err);
        setError(err instanceof Error ? err.message : 'Erreur lors de la lecture du fichier GEXF.');
        setIsProcessing(false);
      }
    }, 50);
  }, []);

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
  };

  const handleCommunityNameChange = (id: number, newName: string) => {
    setCommunityNames(prev => ({ ...prev, [id]: newName }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Network className="text-secondary" />
            Cartographie de Réseau
          </h1>
          <p className="text-slate-500 text-sm">Visualisez vos données d'influence et identifiez les clusters (format GEXF)</p>
        </div>
        
        {graph && (
          <button 
            onClick={clearGraph}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
            Réinitialiser
          </button>
        )}
      </div>

      {!graph ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`max-w-4xl mx-auto w-full min-h-[450px] h-[450px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all ${
            isDragging ? 'border-secondary bg-secondary/5' : 'border-slate-200 bg-white'
          }`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          {isProcessing ? (
            <div className="flex flex-col items-center">
              <RefreshCw className="w-12 h-12 text-secondary animate-spin mb-4" />
              <h3 className="text-lg font-bold text-slate-900 mb-2">Traitement des données...</h3>
              <p className="text-slate-500">Calcul des clusters et de la mise en page</p>
            </div>
          ) : (
            <>
              <div className="bg-slate-50 p-6 rounded-full mb-4">
                <Upload className={`w-12 h-12 ${isDragging ? 'text-secondary' : 'text-slate-400'}`} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Glissez votre fichier GEXF ici</h3>
              <p className="text-slate-500 mb-6 text-center max-w-md">
                Importez vos données issues de Visibrain ou Gephi pour générer instantanément une cartographie interactive avec détection de communautés.
              </p>
              
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".gexf"
                className="hidden"
              />
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-3 bg-secondary text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95"
              >
                Sélectionner un fichier
              </button>

              {error && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 text-red-500 text-sm font-medium"
                >
                  {error}
                </motion.p>
              )}

              <div className="mt-12 flex gap-8 text-slate-400">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
                  <Check size={14} className="text-emerald-500" />
                  Format GEXF
                </div>
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
                  <Check size={14} className="text-emerald-500" />
                  Clustering Louvain
                </div>
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider">
                  <Check size={14} className="text-emerald-500" />
                  ForceAtlas2
                </div>
              </div>
            </>
          )}
        </motion.div>
      ) : (
        <div className="max-w-4xl mx-auto w-full relative bg-secondary rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
          {/* Stats Overlay */}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            <div 
              style={{ backgroundColor: '#FBC33C' }}
              className="p-2 rounded-xl shadow-2xl w-[180px]"
            >
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <div className="text-[9px] text-slate-900/70 font-bold uppercase tracking-tighter">Noeuds</div>
                  <div className="text-sm font-black text-slate-900">{stats?.nodes.toLocaleString()}</div>
                </div>
                <div className="w-px h-5 bg-white/40" />
                <div className="text-center flex-1">
                  <div className="text-[9px] text-slate-900/70 font-bold uppercase tracking-tighter">Liens</div>
                  <div className="text-sm font-black text-slate-900">{stats?.edges.toLocaleString()}</div>
                </div>
                <div className="w-px h-5 bg-white/40" />
                <div className="text-center flex-1">
                  <div className="text-[9px] text-slate-900/70 font-bold uppercase tracking-tighter">Clusters</div>
                  <div className="text-sm font-black text-slate-900">{stats?.clusters}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Graph Container */}
          <div className="w-full bg-secondary relative border-t border-slate-800 overflow-hidden flex-1 min-h-[450px] h-[450px]">
            <SigmaContainer 
              key={graph ? `graph-${graph.order}-${graph.size}` : 'empty'}
              className="sigma-container"
              style={{ height: '100%', width: '100%', minHeight: '450px' }}
              settings={{
                allowInvalidContainer: true,
                labelFont: 'Inter, sans-serif',
                labelSize: 13,
                labelWeight: '700',
                labelColor: { attribute: "labelColor" },
                defaultNodeColor: '#3b82f6',
                labelRenderedSizeThreshold: 10,
                hideEdgesOnMove: true,
                renderLabels: true,
                labelDensity: 0.1,
                labelGridCellSize: 60,
                edgeProgramClasses: {
                  curved: EdgeCurveProgram,
                },
                defaultEdgeType: "curved",
              }}
            >
              <SigmaController graph={graph} />
              
              {/* Legend Overlay */}
              <div className="absolute bottom-4 left-4 z-10">
                <div className="bg-slate-100/95 backdrop-blur-sm border border-slate-200 p-2.5 rounded-xl shadow-xl w-[180px]">
                  <h4 className="text-[10px] font-bold text-slate-900 mb-1.5 flex items-center gap-1">
                    <Info size={10} className="text-slate-500" />
                    Légende des clusters
                  </h4>
                  <div className="space-y-1 max-h-[150px] overflow-y-auto pr-1.5 custom-scrollbar-light">
                    {Array.from({ length: Math.min(stats?.clusters || 0, 20) }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2 group">
                        <div 
                          className="w-3 h-3 rounded-full shrink-0" 
                          style={{ backgroundColor: [
                            '#FF00FF', '#00FFFF', '#00FF00', '#FF4500', '#FFFF00', 
                            '#8A2BE2', '#0000FF', '#FF1493', '#ADFF2F', '#FFA500'
                          ][i % 10] }} 
                        />
                        {editingCommunity === i ? (
                          <input
                            autoFocus
                            className="text-[10px] font-medium text-slate-900 bg-white border border-slate-200 rounded px-1 w-full focus:ring-1 focus:ring-secondary outline-none"
                            value={communityNames[i] || `Communauté ${i + 1}`}
                            onChange={(e) => handleCommunityNameChange(i, e.target.value)}
                            onBlur={() => setEditingCommunity(null)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingCommunity(null)}
                          />
                        ) : (
                          <div 
                            className="flex items-center justify-between w-full cursor-pointer hover:bg-slate-200/50 rounded px-1 py-0.5 transition-colors"
                            onClick={() => setEditingCommunity(i)}
                          >
                            <span className="text-[10px] font-medium text-slate-700 truncate">
                              {communityNames[i] || `Communauté ${i + 1}`}
                            </span>
                            <Edit2 size={8} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </div>
                    ))}
                    {(stats?.clusters || 0) > 20 && (
                      <div className="text-[10px] text-slate-400 italic">+{stats!.clusters - 20} autres...</div>
                    )}
                  </div>
                </div>
              </div>

              <GraphControls />
            </SigmaContainer>
          </div>
        </div>
      )}

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
