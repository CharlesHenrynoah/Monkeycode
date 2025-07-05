import { type NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { z } from "zod"
import dagre from "dagre"

/* -------------------------------------------------- */
/* Helpers                                            */
/* -------------------------------------------------- */

function isQuotaError(err: unknown) {
  return err instanceof Error && /(quota|rate limit|exceeded)/i.test(err.message)
}

function layout(nodes: any[], edges: any[]) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: "TB", nodesep: 50, ranksep: 50 })

  const W = 150,
    H = 50
  nodes.forEach((n) => g.setNode(n.id, { width: W, height: H }))
  edges.forEach((e) => g.setEdge(e.source, e.target))

  dagre.layout(g)
  const layouted = nodes.map((n) => {
    const p = g.node(n.id)
    return { ...n, position: { x: p.x - W / 2, y: p.y - H / 2 } }
  })
  return { nodes: layouted, edges }
}

const AIProvider = (apiKey: string, apiKeyType: string) => {
  if (apiKeyType === "OpenAI") {
    return createOpenAI({ apiKey })("gpt-4o")
  }
  if (apiKeyType === "Gemini") {
    return createGoogleGenerativeAI({ apiKey })("models/gemini-1.5-flash-latest")
  }
  throw new Error("Unsupported AI provider")
}

/* -------------------------------------------------- */
/* Route handler                                      */
/* -------------------------------------------------- */

export async function POST(req: NextRequest) {
  try {
    const { code, apiKey, apiKeyType, analysisType, language = "English" } = await req.json()

    if (!apiKey || !apiKeyType) return NextResponse.json({ error: "Missing API credentials" }, { status: 400 })

    const model = AIProvider(apiKey, apiKeyType)

    if (analysisType === "diagram") {
      const diagramSchema = z.object({
        nodes: z.array(
          z.object({
            id: z.string().describe("Unique identifier for the node."),
            type: z
              .enum(["start", "end", "process", "condition", "loop", "function", "input", "output"])
              .describe("The type of the node."),
            data: z.object({
              label: z.string().describe("The text to display inside the node."),
            }),
          }),
        ),
        edges: z.array(
          z.object({
            id: z.string().describe("Unique identifier for the edge, e.g., 'e1-2'."),
            source: z.string().describe("The ID of the source node."),
            target: z.string().describe("The ID of the target node."),
            label: z.string().optional().describe("Optional label for the edge (e.g., 'Yes', 'No')."),
          }),
        ),
      })

      const { object } = await generateObject({
        model,
        schema: diagramSchema,
        prompt: `Convert the following code into a JSON object representing a flowchart for React Flow. Identify the logical steps, conditions, and loops.

- Each node must have a unique 'id', a 'type', and a 'data' object with a 'label'.
- Node types can be: 'start', 'end', 'process', 'condition', 'loop', 'function', 'input', 'output'.
- Each edge must have a unique 'id', a 'source' node id, and a 'target' node id.

Code:
\`\`\`
${code}
\`\`\``,
        maxTokens: 4000,
        temperature: 0.1,
      })

      if (!object.nodes.length) {
        return NextResponse.json({ error: "AI failed to generate a graph." }, { status: 500 })
      }

      const result = layout(object.nodes, object.edges)
      return NextResponse.json({ result })
    }

    if (analysisType === "natural") {
      const explanationSchema = z.object({
        explanation: z
          .array(
            z.object({
              emoji: z.string().describe("An emoji that represents the section."),
              title: z.string().describe("A short title for the section."),
              text: z.string().describe("A detailed explanation of the code section."),
            }),
          )
          .describe("An array of explanations for different parts of the code."),
      })

      const { object } = await generateObject({
        model,
        schema: explanationSchema,
        prompt: `Provide a detailed, human-friendly explanation of the following code in ${language}. Break down the explanation into logical sections.
        
Code:
\`\`\`
${code}
\`\`\``,
        maxTokens: 4000,
        temperature: 0.1,
      })
      return NextResponse.json({ result: object })
    }

    if (analysisType === "pseudocode") {
      const pseudocodeSchema = z.object({
        pseudocode: z
          .string()
          .describe("The pseudocode representation of the code, written in a human-readable format."),
      })

      const { object } = await generateObject({
        model,
        schema: pseudocodeSchema,
        prompt: `Rewrite the following code as detailed, step-by-step pseudocode in ${language}.
        
Code:
\`\`\`
${code}
\`\`\``,
        maxTokens: 4000,
        temperature: 0.1,
      })
      return NextResponse.json({ result: object })
    }

    return NextResponse.json({ error: "Invalid analysis type" }, { status: 400 })
  } catch (err) {
    console.error("Analysis Error:", err)
    const msg = err instanceof Error ? (isQuotaError(err) ? "AI quota exceeded" : err.message) : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
