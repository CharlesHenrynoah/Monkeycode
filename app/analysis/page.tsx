"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCw, Star, GitFork, Folder, FileText, MessageSquare, Send, ChevronRight, Loader2 } from "lucide-react"
import Link from "next/link"
import FlowDiagram from "./components/flow-diagram"
import { useChat } from "@ai-sdk/react"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"

export default function AnalysisPage() {
  const { toast } = useToast()
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
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [fileTree, setFileTree] = useState<any[]>([])
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set())
  const [loadingFolders, setLoadingFolders] = useState<Set<string>>(new Set())

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setMessages,
    isLoading: isChatLoading,
  } = useChat({
    api: "/api/analyze",
    body: {
      analysisType: "chat",
      code: currentFileContent,
      fileName: selectedFile,
      apiKey: apiKey,
      apiKeyType: apiKeyType,
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Chat Error",
        description: err.message,
      })
    },
  })

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

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
    if (currentFileContent && selectedFile && !analysisResults.diagram && !loading && apiKey) {
      console.log("Auto-generating diagram for:", selectedFile)
      analyzeCode("diagram")
    }
  }, [currentFileContent, selectedFile, apiKey])

  const loadRepository = async (url: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/github?repo=${encodeURIComponent(url)}`)
      const data = await response.json()

      if (data.error) {
        console.error("Error loading repository:", data.error)
        toast({
          variant: "destructive",
          title: "Failed to load repository",
          description: data.error,
        })
        return
      }

      setRepoData(data)
      const sortedContents = data.contents.sort((a: any, b: any) => {
        if (a.type === "dir" && b.type === "file") return -1
        if (a.type === "file" && b.type === "dir") return 1
        return a.name.localeCompare(b.name)
      })
      setFileTree(sortedContents)
    } catch (error) {
      console.error("Error loading repository:", error)
      toast({
        variant: "destructive",
        title: "Failed to load repository",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      })
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
        toast({
          variant: "destructive",
          title: "Failed to load file",
          description: data.error,
        })
        return
      }

      setFileContents((prev) => ({ ...prev, [filePath]: data.content }))
      setCurrentFileContent(data.content)
      highlightCode(data.content)
    } catch (error) {
      console.error("Error loading file:", error)
      toast({
        variant: "destructive",
        title: "Failed to load file",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      })
    } finally {
      setLoading(false)
    }
  }

  const analyzeCode = async (analysisType: string) => {
    // Always pull the freshest values from localStorage
    const freshApiKey = localStorage.getItem("apiKey")
    const freshApiKeyType = localStorage.getItem("apiKeyType")

    if (!currentFileContent || !selectedFile || !freshApiKey) {
      toast({
        variant: "destructive",
        title: "Session Error",
        description: "API Key not found. Please return to the homepage and reconnect.",
      })
      router.push("/")
      return
    }

    try {
      setLoading(true)

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: currentFileContent,
          fileName: selectedFile,
          apiKey: freshApiKey,
          apiKeyType: freshApiKeyType,
          analysisType,
          language,
        }),
      })

      // -- Sécurisation du parsing -------------------------
      const raw = await res.text()
      let data: any
      try {
        data = JSON.parse(raw)
      } catch (e) {
        console.error("Analyse – réponse non JSON :", raw)
        toast({
          variant: "destructive",
          title: "Invalid AI Response",
          description: "The AI returned an invalid response. Please try again or check your API quota.",
        })
        setLoading(false) // Assurez-vous de réinitialiser le chargement ici
        return
      }
      // ----------------------------------------------------

      if (data.error) {
        console.error("Analysis error:", data.error, data.raw)
        toast({
          variant: "destructive",
          title: "Analysis Failed",
          description: data.error,
        })
        setLoading(false) // Et ici aussi
        return
      }

      setAnalysisResults((prev) => ({ ...prev, [analysisType]: data.result }))

      if (analysisType === "diagram") setActiveTab("diagram")
      if (analysisType === "natural") setActiveTab("natural")
      if (analysisType === "pseudocode") setActiveTab("pseudocode")
    } catch (error) {
      console.error("Error analyzing code:", error)
      toast({
        variant: "destructive",
        title: "Analysis Error",
        description: "An unexpected error occurred while analyzing the code.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChatSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input) return
    // Use the handleSubmit from useChat, but provide the most up-to-date context in the body
    handleSubmit(e, {
      body: {
        analysisType: "chat",
        code: currentFileContent,
        fileName: selectedFile,
        apiKey: localStorage.getItem("apiKey"),
        apiKeyType: localStorage.getItem("apiKeyType"),
        language, // Pass language for context
      },
    })
  }

  const updateTreeWithChildren = (tree: any[], path: string, children: any[]): any[] => {
    return tree.map((node) => {
      if (node.path === path) {
        const sortedChildren = children.sort((a: any, b: any) => {
          if (a.type === "dir" && b.type === "file") return -1
          if (a.type === "file" && b.type === "dir") return 1
          return a.name.localeCompare(b.name)
        })
        return { ...node, children: sortedChildren }
      }
      if (node.children) {
        return { ...node, children: updateTreeWithChildren(node.children, path, children) }
      }
      return node
    })
  }

  const handleItemClick = async (item: any) => {
    if (item.type === "file") {
      setSelectedFile(item.path)
      setHighlightedCode("")
      setAnalysisResults({})
      setMessages([])
      await loadFileContent(item.path)
      setActiveTab("diagram")
    } else if (item.type === "dir") {
      const path = item.path
      const newOpenFolders = new Set(openFolders)
      if (newOpenFolders.has(path)) {
        newOpenFolders.delete(path)
      } else {
        newOpenFolders.add(path)
        if (!item.children) {
          setLoadingFolders((prev) => new Set(prev).add(path))
          try {
            const response = await fetch(
              `/api/github?repo=${encodeURIComponent(repoUrl)}&path=${encodeURIComponent(path)}`,
            )
            const data = await response.json()
            if (data.error) {
              console.error("Error loading folder contents:", data.error)
              toast({
                variant: "destructive",
                title: "Failed to load folder",
                description: data.error,
              })
              newOpenFolders.delete(path)
            } else {
              setFileTree((prevTree) => updateTreeWithChildren(prevTree, path, data.contents))
            }
          } catch (error) {
            console.error("Error fetching folder contents:", error)
            toast({
              variant: "destructive",
              title: "Failed to load folder",
              description: error instanceof Error ? error.message : "An unknown error occurred.",
            })
            newOpenFolders.delete(path)
          } finally {
            setLoadingFolders((prev) => {
              const newLoading = new Set(prev)
              newLoading.delete(path)
              return newLoading
            })
          }
        }
      }
      setOpenFolders(newOpenFolders)
    }
  }

  const renderFileTree = (items: any[], level = 0) => {
    return items.map((item) => (
      <div key={item.path}>
        <div
          className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-[#39FF14]/10 ${
            selectedFile === item.path ? "bg-[#39FF14]/20" : ""
          }`}
          onClick={() => handleItemClick(item)}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          {item.type === "dir" ? (
            <>
              <ChevronRight
                className={`h-4 w-4 transition-transform ${openFolders.has(item.path) ? "rotate-90" : ""}`}
              />
              <Folder className="h-4 w-4 text-[#39FF14]" />
              <span className="text-white text-sm">{item.name}</span>
              {loadingFolders.has(item.path) && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 text-blue-400 ml-4" />
              <span className="text-white text-sm">{item.name}</span>
            </>
          )}
        </div>
        {item.type === "dir" && openFolders.has(item.path) && item.children && renderFileTree(item.children, level + 1)}
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
      <Toaster />
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
              {fileTree.length > 0 ? (
                renderFileTree(fileTree)
              ) : (
                <div className="text-gray-400 text-sm p-4">{loading ? "Loading files..." : "No files found."}</div>
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
            <div className="bg-black/40 backdrop-blur-md border border-[#39FF14]/30 mx-2 rounded-lg flex-1 flex flex-col overflow-hidden">
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
              <div className="flex-1 p-4 flex flex-col min-h-0">
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
                      <TabsTrigger
                        value="chat"
                        className="data-[state=active]:bg-[#39FF14] data-[state=active]:text-black"
                      >
                        Chat
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="diagram" className="mt-4 flex-1 min-h-0">
                      <div className="h-full bg-black/60 rounded-lg border border-[#39FF14]/30">
                        {analysisResults.diagram?.nodes && analysisResults.diagram.nodes.length > 0 ? (
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
                            <p className="text-gray-400">
                              {loading ? "Generating diagram..." : "Click to generate the flow diagram."}
                            </p>
                            {analysisResults.diagram && !analysisResults.diagram.nodes && (
                              <p className="text-red-400 mt-2">Error: No diagram data received</p>
                            )}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="source" className="mt-4 flex-1 min-h-0">
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

                    <TabsContent value="natural" className="mt-4 flex-1 min-h-0">
                      <div className="bg-black/60 rounded-lg border border-[#39FF14]/30 h-full overflow-auto p-6">
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

                    <TabsContent value="pseudocode" className="mt-4 flex-1 min-h-0">
                      <div className="bg-black/60 rounded-lg border border-[#39FF14]/30 h-full overflow-auto p-6">
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
                    <TabsContent value="chat" className="mt-4 flex-1 flex flex-col min-h-0">
                      <div className="bg-black/60 rounded-lg border border-[#39FF14]/30 h-full flex flex-col overflow-hidden">
                        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                          {messages.length === 0 && !isChatLoading ? (
                            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                              <MessageSquare className="h-12 w-12 mb-4 text-[#39FF14]" />
                              <h3 className="text-lg font-semibold text-white">Chat with your code</h3>
                              <p>
                                Ask anything about <span className="font-bold text-[#39FF14]">{selectedFile}</span>.
                              </p>
                            </div>
                          ) : (
                            messages.map((m) => (
                              <div
                                key={m.id}
                                className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                              >
                                {m.role === "assistant" && (
                                  <div className="w-8 h-8 rounded-full bg-[#39FF14] flex items-center justify-center font-bold text-black text-sm shrink-0">
                                    AI
                                  </div>
                                )}
                                <div
                                  className={`rounded-lg px-4 py-2 max-w-lg prose prose-invert prose-p:my-0 prose-pre:my-0 prose-pre:bg-gray-900 prose-pre:p-2 ${m.role === "user" ? "bg-[#39FF14] text-black prose-strong:text-black" : "bg-gray-800 text-white"}`}
                                >
                                  <div dangerouslySetInnerHTML={{ __html: m.content.replace(/\n/g, "<br />") }} />
                                </div>
                                {m.role === "user" && (
                                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center font-bold text-white text-sm shrink-0">
                                    You
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                          {isChatLoading && messages.length > 0 && messages[messages.length - 1].role === "user" && (
                            <div className="flex gap-3 justify-start">
                              <div className="w-8 h-8 rounded-full bg-[#39FF14] flex items-center justify-center font-bold text-black text-sm shrink-0">
                                AI
                              </div>
                              <div className="rounded-lg px-4 py-2 max-w-lg bg-gray-800 text-white">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-0"></div>
                                  <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-150"></div>
                                  <div className="w-2 h-2 bg-white rounded-full animate-pulse delay-300"></div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="p-4 border-t border-[#39FF14]/20">
                          <form onSubmit={handleChatSubmit} className="flex items-center gap-2">
                            <Input
                              value={input}
                              onChange={handleInputChange}
                              placeholder="Ask a question about the code..."
                              className="flex-1 bg-black/50 border-[#39FF14]/30 text-white"
                              disabled={isChatLoading}
                            />
                            <Button
                              type="submit"
                              size="icon"
                              className="bg-[#39FF14] text-black hover:bg-[#39FF14]/80"
                              disabled={isChatLoading || !input}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </form>
                        </div>
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
