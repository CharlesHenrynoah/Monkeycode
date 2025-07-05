"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCw, Star, GitFork, Folder, FileText } from "lucide-react"
import Link from "next/link"
import FlowDiagram from "./components/flow-diagram"

export default function AnalysisPage() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [language, setLanguage] = useState("English")
  const [activeTab, setActiveTab] = useState("diagram")

  const [repoData, setRepoData] = useState<any>(null)
  const [fileContents, setFileContents] = useState<any>({})
  const [currentFileContent, setCurrentFileContent] = useState("")
  const [highlightedCode, setHighlightedCode] = useState("")
  const [analysisResults, setAnalysisResults] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [isHighlighting, setIsHighlighting] = useState(false)
  const [apiKey, setApiKey] = useState("")
  const [apiKeyType, setApiKeyType] = useState("")
  const [repoUrl, setRepoUrl] = useState("")
  const [isInitialized, setIsInitialized] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const storedApiKey = localStorage.getItem("apiKey")
    const storedApiKeyType = localStorage.getItem("apiKeyType")
    const storedRepoUrl = localStorage.getItem("repoUrl")

    if (!storedApiKey || !storedRepoUrl) {
      router.push("/")
    } else {
      setApiKey(storedApiKey)
      if (storedApiKeyType) setApiKeyType(storedApiKeyType)
      setRepoUrl(storedRepoUrl)
      loadRepository(storedRepoUrl)
      setIsInitialized(true)
    }
  }, [])

  // Auto-generate diagram when file content is loaded
  useEffect(() => {
    if (currentFileContent && selectedFile && !analysisResults.diagram && !loading) {
      analyzeCode("diagram")
    }
  }, [currentFileContent, selectedFile])

  const loadRepository = async (url: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/github?repo=${encodeURIComponent(url)}`)
      const data = await response.json()

      if (data.error) {
        console.error("Error loading repository:", data.error)
        return
      }

      setRepoData(data)
    } catch (error) {
      console.error("Error loading repository:", error)
    } finally {
      setLoading(false)
    }
  }

  const highlightCode = async (content: string) => {
    setIsHighlighting(true)
    try {
      const response = await fetch("/api/highlight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: content, lang: "javascript" }),
      })
      const data = await response.json()
      if (data.highlightedCode) {
        setHighlightedCode(data.highlightedCode)
      } else {
        // Fallback for safety
        setHighlightedCode(`<pre>${content}</pre>`)
      }
    } catch (error) {
      console.error("Highlighting error:", error)
      setHighlightedCode(`<pre>${content}</pre>`)
    } finally {
      setIsHighlighting(false)
    }
  }

  const loadFileContent = async (filePath: string) => {
    if (fileContents[filePath]) {
      setCurrentFileContent(fileContents[filePath])
      highlightCode(fileContents[filePath])
      return
    }

    try {
      setLoading(true)
      const response = await fetch(
        `/api/github/file?repo=${encodeURIComponent(repoUrl)}&path=${encodeURIComponent(filePath)}`,
      )
      const data = await response.json()

      if (data.error) {
        console.error("Error loading file:", data.error)
        return
      }

      setFileContents((prev) => ({ ...prev, [filePath]: data.content }))
      setCurrentFileContent(data.content)
      highlightCode(data.content)
    } catch (error) {
      console.error("Error loading file:", error)
    } finally {
      setLoading(false)
    }
  }

  const analyzeCode = async (analysisType: string) => {
    // Always pull the freshest values from localStorage
    const freshApiKey = localStorage.getItem("apiKey")
    const freshApiKeyType = localStorage.getItem("apiKeyType")

    if (!currentFileContent || !selectedFile || !freshApiKey) {
      alert("Session error: API Key not found. Please return to the homepage and reconnect.")
      router.push("/")
      return
    }

    try {
      setLoading(true)
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: currentFileContent,
          fileName: selectedFile,
          apiKey: freshApiKey, // Use the freshest key
          apiKeyType: freshApiKeyType, // Use the freshest type
          analysisType,
          language,
        }),
      })

      const data = await response.json()

      if (data.error) {
        console.error("Analysis error:", data.error, data.raw)
        alert(`Analysis failed: ${data.error}`)
        return
      }

      setAnalysisResults((prev) => ({ ...prev, [analysisType]: data.result }))

      // Switch to the relevant tab after analysis
      if (analysisType === "diagram") {
        setActiveTab("diagram")
      } else if (analysisType === "natural") {
        setActiveTab("natural")
      } else if (analysisType === "pseudocode") {
        setActiveTab("pseudocode")
      }
    } catch (error) {
      console.error("Error analyzing code:", error)
    } finally {
      setLoading(false)
    }
  }

  const FileIcon = ({ type }: { type: string }) => {
    return type === "folder" ? (
      <Folder className="h-4 w-4 text-[#39FF14]" />
    ) : (
      <FileText className="h-4 w-4 text-blue-400" />
    )
  }

  const handleFileSelect = async (file: any) => {
    if (file.type === "file") {
      setSelectedFile(file.name)
      setHighlightedCode("") // Clear previous highlighted code
      setAnalysisResults({}) // Clear previous analysis
      await loadFileContent(file.path)
      // Auto-generate diagram after loading file content
      setActiveTab("diagram")
    }
  }

  const renderFileTree = (files: any[], level = 0) => {
    if (!files) return null

    return files.map((file, index) => (
      <div key={index} style={{ paddingLeft: `${level * 16}px` }}>
        <div
          className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-[#39FF14]/10 ${
            selectedFile === file.name ? "bg-[#39FF14]/20" : ""
          }`}
          onClick={() => handleFileSelect(file)}
        >
          <FileIcon type={file.type} />
          <span className="text-white text-sm">{file.name}</span>
        </div>
      </div>
    ))
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <p>Initializing session...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/sourcebg.png')" }}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <header className="bg-black/20 backdrop-blur-md border-b border-[#39FF14]/20 p-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-[#39FF14]" style={{ fontFamily: "Orbitron, monospace" }}>
              MONKEYCODE
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link href="/" className="text-white hover:text-[#39FF14] transition-colors">
                Home
              </Link>
              <Link href="/#vision" className="text-white hover:text-[#39FF14] transition-colors">
                Our Vision
              </Link>
              <Link href="/#memecoin" className="text-white hover:text-[#39FF14] transition-colors">
                Our Meme Coin
              </Link>
              <Link href="/#faq" className="text-white hover:text-[#39FF14] transition-colors">
                FAQ
              </Link>
            </nav>

            {/* API Key Status */}
            <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-lg border border-[#39FF14]/30 px-3 py-2">
              <div className="w-2 h-2 bg-[#39FF14] rounded-full"></div>
              <span className="text-[#39FF14] text-sm">API Connected</span>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-80 bg-black/40 backdrop-blur-md border-r border-[#39FF14]/30 flex flex-col">
            {/* Refresh Button */}
            <div className="p-4 border-b border-[#39FF14]/20">
              <Button
                className="w-full bg-[#39FF14] text-black hover:bg-[#39FF14]/80"
                style={{ fontFamily: "Orbitron, monospace" }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh code
              </Button>
            </div>

            {/* Repository Info */}
            <div className="p-4 border-b border-[#39FF14]/20">
              {repoData?.repo && (
                <div className="bg-black/60 rounded-lg border border-[#39FF14]/30 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <GitFork className="h-4 w-4 text-[#39FF14]" />
                    <span className="text-[#39FF14] font-semibold">{repoData.repo.name}</span>
                  </div>
                  <p className="text-gray-300 text-sm mb-2">{repoData.repo.description}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-[#39FF14]" />
                      <span className="text-[#39FF14]">{repoData.repo.stars}</span>
                    </div>
                    <Badge variant="outline" className="border-[#39FF14]/30 text-[#39FF14]">
                      {repoData.repo.branch}
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            {/* Files */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-4 sticky top-0 bg-black/40 backdrop-blur-md z-10 py-2">
                <h3 className="text-white font-semibold">Files</h3>
                <Badge className="bg-[#39FF14]/20 text-[#39FF14] border-[#39FF14]/30">
                  {repoData?.contents?.length || 0} FILES
                </Badge>
              </div>
              {repoData?.contents ? (
                renderFileTree(repoData.contents)
              ) : (
                <div className="text-gray-400 text-sm p-4">Loading files...</div>
              )}
            </div>

            {/* Mode Selector */}
            <div className="p-4 border-t border-[#39FF14]/20">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-[#39FF14]/30 text-[#39FF14] bg-transparent"
                >
                  UML
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-[#39FF14]/30 text-[#39FF14] bg-transparent"
                >
                  Flow
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            <div className="bg-black/40 backdrop-blur-md border border-[#39FF14]/30 m-4 rounded-lg flex-1 overflow-hidden">
              {/* Language Selector */}
              <div className="p-4 border-b border-[#39FF14]/20">
                <div className="flex items-center gap-4">
                  <Input
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="max-w-xs bg-black/50 border-[#39FF14]/30 text-white"
                    placeholder="Language..."
                  />
                  <Button size="sm" className="bg-[#39FF14] text-black hover:bg-[#39FF14]/80">
                    Change
                  </Button>
                </div>
                {selectedFile && <div className="mt-2 text-[#39FF14] text-sm">Selected: {selectedFile}</div>}
              </div>

              {/* Content Area */}
              <div className="flex-1 p-4">
                {selectedFile ? (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
                    <TabsList className="bg-black/60 border border-[#39FF14]/30">
                      <TabsTrigger
                        value="diagram"
                        className="data-[state=active]:bg-[#39FF14] data-[state=active]:text-black"
                      >
                        Diagram
                      </TabsTrigger>
                      <TabsTrigger
                        value="source"
                        className="data-[state=active]:bg-[#39FF14] data-[state=active]:text-black"
                      >
                        Source Code
                      </TabsTrigger>
                      <TabsTrigger
                        value="natural"
                        className="data-[state=active]:bg-[#39FF14] data-[state=active]:text-black"
                      >
                        Natural Language
                      </TabsTrigger>
                      <TabsTrigger
                        value="pseudocode"
                        className="data-[state=active]:bg-[#39FF14] data-[state=active]:text-black"
                      >
                        Pseudocode
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="diagram" className="mt-4 flex-1">
                      <div className="h-full bg-black/60 rounded-lg border border-[#39FF14]/30">
                        {analysisResults.diagram?.nodes ? (
                          <FlowDiagram nodes={analysisResults.diagram.nodes} edges={analysisResults.diagram.edges} />
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center">
                            <Button
                              onClick={() => analyzeCode("diagram")}
                              disabled={!currentFileContent || loading}
                              className="mb-4 bg-[#39FF14] text-black hover:bg-[#39FF14]/80"
                            >
                              {loading ? "Analyzing..." : "Generate Diagram"}
                            </Button>
                            <p className="text-gray-400">Click to generate the flow diagram.</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="source" className="mt-4 flex-1">
                      <div className="bg-black/60 rounded-lg border border-[#39FF14]/30 h-full overflow-auto">
                        {isHighlighting || loading ? (
                          <div className="p-8 text-center text-gray-400">Loading & Highlighting...</div>
                        ) : (
                          <div
                            className="p-4 text-sm [&>pre]:bg-transparent [&>pre]:p-0"
                            dangerouslySetInnerHTML={{ __html: highlightedCode }}
                          />
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="natural" className="mt-4 flex-1">
                      <div className="bg-black/60 rounded-lg border border-[#39FF14]/30 p-6 h-full overflow-auto">
                        {!analysisResults.natural && (
                          <Button
                            onClick={() => analyzeCode("natural")}
                            disabled={!currentFileContent || loading}
                            className="mb-4 bg-[#39FF14] text-black hover:bg-[#39FF14]/80"
                          >
                            {loading ? "Analyzing..." : "Generate Explanation"}
                          </Button>
                        )}
                        {analysisResults.natural?.explanation ? (
                          <div className="space-y-4">
                            {analysisResults.natural.explanation.map((item: any, index: number) => (
                              <div key={index}>
                                <h4 className="text-[#39FF14] font-semibold text-lg mb-1">
                                  {item.emoji} {item.title}
                                </h4>
                                <p className="text-gray-300">{item.text}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center text-gray-400">
                            Click "Generate Explanation" to analyze the code.
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="pseudocode" className="mt-4 flex-1">
                      <div className="bg-black/60 rounded-lg border border-[#39FF14]/30 p-6 h-full overflow-auto">
                        {!analysisResults.pseudocode && (
                          <Button
                            onClick={() => analyzeCode("pseudocode")}
                            disabled={!currentFileContent || loading}
                            className="mb-4 bg-[#39FF14] text-black hover:bg-[#39FF14]/80"
                          >
                            {loading ? "Analyzing..." : "Generate Pseudocode"}
                          </Button>
                        )}
                        {analysisResults.pseudocode?.pseudocode ? (
                          <pre className="text-[#39FF14] font-mono text-sm whitespace-pre-wrap">
                            {analysisResults.pseudocode.pseudocode}
                          </pre>
                        ) : (
                          <div className="text-center text-gray-400">
                            Click "Generate Pseudocode" to analyze the code.
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center bg-black/60 rounded-lg border border-[#39FF14]/30 p-12">
                      <FileText className="h-16 w-16 text-[#39FF14] mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: "Orbitron, monospace" }}>
                        Select a File
                      </h3>
                      <p className="text-[#39FF14]">Choose a file from the sidebar to generate its FLOW diagram</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
