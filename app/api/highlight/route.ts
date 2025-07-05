import { type NextRequest, NextResponse } from "next/server"
import { codeToHtml } from "shiki"

export async function POST(request: NextRequest) {
  try {
    const { code, lang = "javascript" } = await request.json()

    if (!code) {
      return NextResponse.json({ error: "Code is required" }, { status: 400 })
    }

    const highlightedCode = await codeToHtml(code, {
      lang,
      theme: "vitesse-dark",
    })

    return NextResponse.json({ highlightedCode })
  } catch (error) {
    console.error("Highlighting Error:", error)
    return NextResponse.json({ error: "Failed to highlight code" }, { status: 500 })
  }
}
