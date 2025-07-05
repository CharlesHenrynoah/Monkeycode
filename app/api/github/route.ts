import { type NextRequest, NextResponse } from "next/server"

/**
 * Fetch a GitHub URL, first with auth (if a token exists),
 * then automatically retry without auth on 401/403 so public
 * repos still work even when the token is missing or wrong.
 */
async function fetchGithub(url: string) {
  const headers: HeadersInit = { Accept: "application/vnd.github.v3+json" }
  const token = process.env.GITHUB_TOKEN
  const withAuth = token ? { ...headers, Authorization: `Bearer ${token}` } : headers

  // First attempt (maybe authenticated)
  let res = await fetch(url, { headers: withAuth })
  if ((res.status === 401 || res.status === 403) && token) {
    // Token present but rejected -> silently retry unauthenticated
    res = await fetch(url, { headers })
  }
  return res
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const repoUrl = searchParams.get("repo")
  const path = searchParams.get("path") || ""

  if (!repoUrl) {
    return NextResponse.json({ error: "Repository URL is required" }, { status: 400 })
  }

  // Extract {owner}/{repo}
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
  if (!match) {
    return NextResponse.json({ error: "Invalid GitHub URL" }, { status: 400 })
  }
  const [, owner, repo] = match
  const cleanRepo = repo.replace(/\.git$/, "")

  try {
    // 1. Repository info
    const repoRes = await fetchGithub(`https://api.github.com/repos/${owner}/${cleanRepo}`)
    if (!repoRes.ok) {
      const txt = await repoRes.text()
      console.error("GitHub repo fetch failed:", repoRes.status, txt)
      throw new Error(`GitHub repo fetch failed: ${repoRes.status}`)
    }
    const repoData = await repoRes.json()

    // 2. Directory / file contents
    const contentsRes = await fetchGithub(`https://api.github.com/repos/${owner}/${cleanRepo}/contents/${path}`)
    if (!contentsRes.ok) {
      const txt = await contentsRes.text()
      console.error("GitHub contents fetch failed:", contentsRes.status, txt)
      throw new Error(`GitHub contents fetch failed: ${contentsRes.status}`)
    }
    const contents = await contentsRes.json()

    return NextResponse.json({
      repo: {
        name: repoData.full_name,
        description: repoData.description,
        stars: repoData.stargazers_count,
        branch: repoData.default_branch,
      },
      contents: Array.isArray(contents) ? contents : [contents],
    })
  } catch (err) {
    console.error("GitHub API Route Error:", err)
    return NextResponse.json({ error: "Failed to fetch repository data" }, { status: 500 })
  }
}
