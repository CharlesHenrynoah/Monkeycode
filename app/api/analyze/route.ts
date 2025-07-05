import { type NextRequest, NextResponse } from "next/server"
import { generateObject, streamText, type CoreMessage } from "ai"
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
  g.setGraph({ rankdir: "LR", nodesep: 30, ranksep: 60 })

  const W = 220,
    H = 80
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

const MAX_CODE_LENGTH = 100000 // ~25k tokens, a safe limit for context windows

/* -------------------------------------------------- */
/* Route handler                                      */
/* -------------------------------------------------- */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const isChatRequest = body.data?.analysisType === "chat"
    const { code, apiKey, apiKeyType, analysisType, language = "English", fileName } = isChatRequest ? body.data : body
    const messages: CoreMessage[] = body.messages ?? []

    if (!apiKey || !apiKeyType) {
      return NextResponse.json({ error: "Missing API credentials" }, { status: 400 })
    }

    const model = AIProvider(apiKey, apiKeyType)
    let truncatedCode = code
    if (code && typeof code === "string" && code.length > MAX_CODE_LENGTH) {
      truncatedCode = code.substring(0, MAX_CODE_LENGTH)
      console.warn(`Code truncated from ${code.length} to ${MAX_CODE_LENGTH} characters for AI analysis.`)
    }

    if (analysisType === "chat") {
      if (!messages.length || !truncatedCode || !fileName) {
        return NextResponse.json({ error: "Missing messages, code, or filename for chat analysis" }, { status: 400 })
      }
      const systemPrompt = `You are MONKEYCODE, an expert code assistant. Your role is to provide educational and concise explanations about the user's code. Answer the user's questions based on the provided file context. Your responses must be a maximum of four sentences and formatted using Markdown.

File Name: ${fileName}

File Content:
\`\`\`
${truncatedCode}
\`\`\`
${code.length > MAX_CODE_LENGTH ? "\n[Note: The code has been truncated due to its length. The analysis is based on the first 100,000 characters.]" : ""}`
      const result = await streamText({ model, system: systemPrompt, messages, temperature: 0.3 })
      return result.toDataStreamResponse()
    }

    const diagramPrompt = `Convert the following code into a highly detailed JSON object for a React Flow diagram. Your response must be extremely granular.

- Decompose the code into the smallest possible logical units.
- Every function call, variable assignment, conditional check, loop, and return statement must be a distinct node.
- Use 'process' for assignments and operations, 'function' for calls, 'condition' for if/else, 'loop' for loops, 'input' for parameters, and 'output' for return values.
- Ensure the flow is logical and easy to follow, creating branches where necessary.
- The goal is a complex, comprehensive, and accurate representation of the code's execution flow.

Code:
\`\`\`
${truncatedCode}
\`\`\``

    if (analysisType === "diagram") {
      const diagramSchema = z.object({
        nodes: z.array(
          z.object({
            id: z.string().describe("Unique identifier for the node."),
            type: z
              .enum(["start", "end", "process", "condition", "loop", "function", "input", "output"])
              .describe("The type of the node."),
            data: z.object({ label: z.string().describe("The text to display inside the node.") }),
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

      let object: any
      try {
        const result = await generateObject({
          model,
          schema: diagramSchema,
          prompt: diagramPrompt,
          maxTokens: 4000,
          temperature: 0.1,
        })
        object = result.object
      } catch (error) {
        console.warn("First attempt to generate diagram failed. Retrying with lower temperature.", error)
        try {
          const result = await generateObject({
            model,
            schema: diagramSchema,
            prompt: diagramPrompt,
            maxTokens: 4000,
            temperature: 0,
          })
          object = result.object
        } catch (finalError) {
          console.error("Second attempt to generate diagram also failed.", finalError)
          throw new Error("AI failed to generate valid diagram JSON after two attempts.")
        }
      }

      if (!object || !object.nodes || !object.nodes.length) {
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
${truncatedCode}
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
${truncatedCode}
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
