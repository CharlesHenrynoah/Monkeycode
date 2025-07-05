import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const repoUrl = searchParams.get("repo")
  const filePath = searchParams.get("path")

  if (!repoUrl || !filePath) {
    return NextResponse.json({ error: "Repository URL and file path are required" }, { status: 400 })
  }

  try {
    // Extract owner and repo from GitHub URL
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
    if (!match) {
      return NextResponse.json({ error: "Invalid GitHub URL" }, { status: 400 })
    }

    const [, owner, repo] = match
    const cleanRepo = repo.replace(".git", "")

    // Get file content
    const response = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/contents/${filePath}`, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch file content")
    }

    const fileData = await response.json()

    if (fileData.type !== "file") {
      return NextResponse.json({ error: "Path is not a file" }, { status: 400 })
    }

    // Decode base64 content
    const content = Buffer.from(fileData.content, "base64").toString("utf-8")

    return NextResponse.json({
      name: fileData.name,
      path: fileData.path,
      content,
      size: fileData.size,
    })
  } catch (error) {
    console.error("GitHub File API Error:", error)
    return NextResponse.json({ error: "Failed to fetch file content" }, { status: 500 })
  }
}
