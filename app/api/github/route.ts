import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const repoUrl = searchParams.get("repo")
  const path = searchParams.get("path") || ""

  if (!repoUrl) {
    return NextResponse.json({ error: "Repository URL is required" }, { status: 400 })
  }

  try {
    // Extract owner and repo from GitHub URL
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
    if (!match) {
      return NextResponse.json({ error: "Invalid GitHub URL" }, { status: 400 })
    }

    const [, owner, repo] = match
    const cleanRepo = repo.replace(".git", "")

    // Get repository info
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}`, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    })

    if (!repoResponse.ok) {
      throw new Error("Failed to fetch repository")
    }

    const repoData = await repoResponse.json()

    // Get repository contents
    const contentsResponse = await fetch(`https://api.github.com/repos/${owner}/${cleanRepo}/contents/${path}`, {
      headers: {
        Authorization: `token ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    })

    if (!contentsResponse.ok) {
      throw new Error("Failed to fetch repository contents")
    }

    const contents = await contentsResponse.json()

    return NextResponse.json({
      repo: {
        name: repoData.full_name,
        description: repoData.description,
        stars: repoData.stargazers_count,
        branch: repoData.default_branch,
      },
      contents: Array.isArray(contents) ? contents : [contents],
    })
  } catch (error) {
    console.error("GitHub API Error:", error)
    return NextResponse.json({ error: "Failed to fetch repository data" }, { status: 500 })
  }
}
