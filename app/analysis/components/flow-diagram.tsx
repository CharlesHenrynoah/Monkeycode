"use client"
import { useEffect, useMemo } from "react"
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
} from "reactflow"

const typeColor: Record<string, string> = {
  start: "#22c55e",
  end: "#ef4444",
  process: "#a855f7",
  condition: "#f97316",
  loop: "#3b82f6",
  function: "#39FF14",
  input: "#0ea5e9",
  output: "#eab308",
}

const CustomNode = ({ data, type }: { data: { label: string }; type: string }) => (
  <div
    style={{
      background: "#111",
      border: `1px solid ${typeColor[type] ?? "#39FF14"}`,
      borderRadius: 12,
      padding: "12px 16px",
      color: "#fff",
      width: 220,
      minHeight: 80,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    }}
  >
    <span className="text-xs uppercase font-mono" style={{ color: typeColor[type] ?? "#39FF14" }}>
      {type}
    </span>
    <div className="text-base font-medium mt-1">{data.label}</div>
  </div>
)

const nodeTypes = {
  start: CustomNode,
  end: CustomNode,
  process: CustomNode,
  condition: CustomNode,
  loop: CustomNode,
  function: CustomNode,
  input: CustomNode,
  output: CustomNode,
}

interface FlowDiagramProps {
  nodes: Node[]
  edges: Edge[]
}

export default function FlowDiagram({ nodes: initialNodes, edges: initialEdges }: FlowDiagramProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges, setNodes, setEdges])

  const proOptions = { hideAttribution: true }

  const defaultEdgeOptions = useMemo(
    () => ({
      type: "smoothstep",
      style: { stroke: "#39FF14", strokeWidth: 1.5 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#39FF14",
        width: 15,
        height: 15,
      },
    }),
    [],
  )

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        proOptions={proOptions}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.1 }}
      >
        <Controls
          style={{
            button: {
              backgroundColor: "#1a1a1a",
              color: "#39FF14",
              border: "1px solid #39FF14",
            },
          }}
        />
        <Background color="#39FF14" gap={24} />
      </ReactFlow>
    </div>
  )
}
