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
// import "reactflow/dist/style.css"

const typeColor: Record<string, string> = {
  start: "#22c55e",
  end: "#22c55e",
  process: "#39FF14",
  condition: "#f97316",
  loop: "#3b82f6",
  function: "#a855f7",
  input: "#0ea5e9",
  output: "#eab308",
}

const CustomNode = ({ data, type }: { data: { label: string }; type: string }) => (
  <div
    style={{
      background: "#1a1a1a",
      border: `1px solid ${typeColor[type] ?? "#39FF14"}`,
      borderRadius: 6,
      padding: "6px 10px",
      color: "#fff",
      width: 150,
      minHeight: 50,
    }}
  >
    <span className="text-xs uppercase text-gray-400">{type}</span>
    <div className="text-sm font-medium">{data.label}</div>
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
      style: { stroke: "#39FF14", strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#39FF14",
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
        <Background color="#39FF14" gap={16} />
      </ReactFlow>
    </div>
  )
}
