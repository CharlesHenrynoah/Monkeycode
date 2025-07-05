import { type NextRequest, NextResponse } from "next/server"

async function fetchGithub(url: string) {
  const headers: HeadersInit = { Accept: "application/vnd.github.v3+json" }
  const token = process.env.GITHUB_TOKEN
  const withAuth = token ? { ...headers, Authorization: `Bearer ${token}` } : headers

  let res = await fetch(url, { headers: withAuth })
  if ((res.status === 401 || res.status === 403) && token) {
    res = await fetch(url, { headers })
  }
  return res
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const repoUrl = searchParams.get("repo")
  const filePath = searchParams.get("path")

  if (!repoUrl || !filePath) {
    return NextResponse.json({ error: "Repository URL and file path are required" }, { status: 400 })
  }

  // Extract {owner}/{repo}
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
  if (!match) {
    return NextResponse.json({ error: "Invalid GitHub URL" }, { status: 400 })
  }
  const [, owner, repo] = match
  const cleanRepo = repo.replace(/\.git$/, "")

  try {
    const apiUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/contents/${filePath}`
    const res = await fetchGithub(apiUrl)

    if (!res.ok) {
      const txt = await res.text()
      console.error("GitHub file fetch failed:", res.status, txt)
      throw new Error(`GitHub file fetch failed: ${res.status}`)
    }

    const fileData = await res.json()
    if (fileData.type !== "file") {
      return NextResponse.json({ error: "Path is not a file" }, { status: 400 })
    }

    const content = Buffer.from(fileData.content, "base64").toString("utf-8")

    return NextResponse.json({
      name: fileData.name,
      path: fileData.path,
      content,
      size: fileData.size,
    })
  } catch (err) {
    console.error("GitHub File API Error:", err)
    return NextResponse.json({ error: "Failed to fetch file content" }, { status: 500 })
  }
}
