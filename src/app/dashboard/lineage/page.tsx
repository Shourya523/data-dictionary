"use client";

import { useState, useEffect } from "react";
import { 
  ReactFlow, 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState,
  ConnectionLineType,
  Handle,
  Position,
  MarkerType 
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";

import DashboardLayout from "../../../components/dashboard/DashboardLayout";
import { getUserConnections, getDatabaseRelations, getConnectionStringById } from "../../../actions/db";
import { authClient } from "@/src/components/landing/auth";
import { Card } from "../../../components/ui/card";
import { Loader2, Table2, Network } from "lucide-react";

// --- Dagre Layout Engine ---
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: any[], edges: any[]) => {
  dagreGraph.setGraph({ rankdir: 'LR', nodesep: 100, ranksep: 250 });
  nodes.forEach((node) => dagreGraph.setNode(node.id, { width: 250, height: 250 }));
  edges.forEach((edge) => dagreGraph.setEdge(edge.source, edge.target));
  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: { x: nodeWithPosition.x - 125, y: nodeWithPosition.y - 125 },
    };
  });
  return { nodes: layoutedNodes, edges };
};

const TableNode = ({ data }: any) => (
  <div className="relative">
    <Handle type="target" position={Position.Left} className="w-3 h-3 !bg-primary border-2 border-background" />
    <Card className="min-w-[220px] border-primary/20 shadow-2xl bg-card overflow-hidden">
      <div className="bg-primary/10 px-3 py-2 border-b border-primary/10 flex items-center gap-2">
        <Table2 className="w-3.5 h-3.5 text-primary" />
        <span className="text-[11px] font-bold uppercase tracking-widest">{data.label}</span>
      </div>
      <div className="p-2 space-y-1 bg-background/50">
        {data.columns.map((col: string) => (
          <div key={col} className="text-[10px] font-mono flex items-center justify-between px-1 py-0.5 border-b border-border/10 last:border-0">
            <span className={col.includes('id') ? "text-primary font-bold" : "text-muted-foreground"}>{col}</span>
            {col.includes('id') && <span className="text-[7px] bg-primary/10 text-primary px-1 rounded font-bold">FK</span>}
          </div>
        ))}
      </div>
    </Card>
    <Handle type="source" position={Position.Right} className="w-3 h-3 !bg-primary border-2 border-background" />
  </div>
);

const nodeTypes = { table: TableNode };

// Remove watermark configuration
const proOptions = { hideAttribution: true };

export default function LineagePage() {
  const { data: session } = authClient.useSession();
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConn, setSelectedConn] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      getUserConnections(session.user.id).then((res) => {
        if (res.success) setConnections(res.data || []);
      });
    }
  }, [session]);

  const visualizeLineage = async (connId: string) => {
    if (!connId || !session?.user?.id) return;
    setSelectedConn(connId);
    setLoading(true);

    try {
      const uri = await getConnectionStringById(connId, session.user.id);
      const res = await getDatabaseRelations(uri!);

      if (res.success && res.data) {
        const tableGroups: Record<string, string[]> = res.data.schema.reduce((acc: any, curr: any) => {
          const tableName = curr.table_name || curr.TABLE_NAME;
          const columnName = curr.column_name || curr.COLUMN_NAME;
          if (!acc[tableName]) acc[tableName] = [];
          acc[tableName].push(columnName);
          return acc;
        }, {});

        const initialNodes = Object.entries(tableGroups).map(([name, columns]) => ({
          id: name,
          type: 'table',
          position: { x: 0, y: 0 },
          data: { label: name, columns },
        }));

        const initialEdges = res.data.relations.map((rel: any, i: number) => ({
          id: `e-${i}`,
          source: rel.source_table,
          target: rel.target_table,
          animated: true,
          type: ConnectionLineType.SmoothStep,
          markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20, color: 'hsl(var(--primary))' },
          style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
        }));

        const { nodes: lNodes, edges: lEdges } = getLayoutedElements(initialNodes, initialEdges);
        setNodes(lNodes);
        setEdges(lEdges);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      {/* Custom styles to darken the controls */}
      <style jsx global>{`
        .react-flow__controls-button {
          background-color: #1a1a1a !important;
          fill: white !important;
          border-bottom: 1px solid #333 !important;
        }
        .react-flow__controls-button:hover {
          background-color: #333 !important;
        }
        .react-flow__controls-button svg {
          fill: white !important;
        }
      `}</style>

      <div className="h-[calc(100vh-8rem)] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Data Lineage</h1>
            <p className="text-sm text-muted-foreground">Visualize data flow and table relationships.</p>
          </div>
          <select 
            className="h-10 w-64 rounded-md border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
            onChange={(e) => visualizeLineage(e.target.value)}
            value={selectedConn}
          >
            <option value="">Select Connection...</option>
            {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="flex-1 border rounded-2xl bg-muted/5 relative overflow-hidden shadow-inner">
          {loading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          
          {!selectedConn && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <Network className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm font-medium">Select a connection to view lineage map</p>
            </div>
          )}

          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            proOptions={proOptions}
            fitView
          >
            <Background gap={20} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      </div>
    </DashboardLayout>
  );
}