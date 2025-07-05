"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Lock, BarChart3, FileText, MessageSquare, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const [apiKey, setApiKey] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  const [apiKeyStatus, setApiKeyStatus] = useState<"valid" | "invalid" | null>(null)
  const [repoUrl, setRepoUrl] = useState("")
  const router = useRouter()

  const detectApiKeyType = (key: string) => {
    if (key.startsWith("sk-")) return "OpenAI"
    if (key.startsWith("AIza")) return "Gemini"
    if (key.includes("gemini") || key.length === 39) return "Gemini"
    return "Unknown"
  }

  const validateApiKey = () => {
    const keyType = detectApiKeyType(apiKey)
    if (keyType === "OpenAI" && apiKey.startsWith("sk-") && apiKey.length > 40) {
      setApiKeyStatus("valid")
    } else if (keyType === "Gemini" && (apiKey.startsWith("AIza") || apiKey.length >= 35)) {
      setApiKeyStatus("valid")
    } else {
      setApiKeyStatus("invalid")
    }
  }

  const handleConnect = () => {
    if (repoUrl && apiKeyStatus === "valid") {
      localStorage.setItem("apiKey", apiKey)
      localStorage.setItem("apiKeyType", detectApiKeyType(apiKey))
      localStorage.setItem("repoUrl", repoUrl)
      router.push("/analysis")
    } else {
      // Optional: alert the user if they try to connect with an invalid key
      if (apiKeyStatus !== "valid") {
        alert("Please validate your API key before connecting.")
      }
    }
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
      <div className="relative z-10">
        {/* Header */}
        <header className="fixed top-0 w-full z-50 bg-black/20 backdrop-blur-md border-b border-[#39FF14]/20">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="text-2xl font-bold text-[#39FF14]" style={{ fontFamily: "Orbitron, monospace" }}>
              MONKEYCODE
            </div>
            <nav className="hidden md:flex space-x-6">
              <Link href="#home" className="text-white hover:text-[#39FF14] transition-colors">
                Home
              </Link>
              <Link href="#vision" className="text-white hover:text-[#39FF14] transition-colors">
                Our Vision
              </Link>
              <Link href="#memecoin" className="text-white hover:text-[#39FF14] transition-colors">
                Our Meme Coin
              </Link>
              <Link href="#faq" className="text-white hover:text-[#39FF14] transition-colors">
                FAQ
              </Link>
            </nav>
          </div>
        </header>

        {/* API Key Configuration */}
        <div className="fixed top-20 right-4 z-40 bg-black/40 backdrop-blur-md rounded-lg border border-[#39FF14]/30 p-4 max-w-sm">
          <div className="text-sm text-[#39FF14] mb-2" style={{ fontFamily: "Orbitron, monospace" }}>
            API Key ({detectApiKeyType(apiKey)})
          </div>
          <div className="flex gap-2 mb-2">
            <div className="relative flex-1">
              <Input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value)
                  setApiKeyStatus(null) // Reset status on change
                }}
                placeholder="Enter your API key..."
                className="bg-black/50 border-[#39FF14]/30 text-white placeholder:text-gray-400 pr-10"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-6 w-6 p-0 text-[#39FF14]"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            </div>
            <Button
              onClick={validateApiKey}
              className="bg-[#39FF14] text-black hover:bg-[#39FF14]/80"
              style={{ fontFamily: "Orbitron, monospace" }}
            >
              Valider
            </Button>
          </div>
          {apiKeyStatus && (
            <div
              className={`flex items-center gap-2 text-sm ${apiKeyStatus === "valid" ? "text-[#39FF14]" : "text-red-400"}`}
            >
              {apiKeyStatus === "valid" ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {apiKeyStatus === "valid" ? "Valid" : "Invalid"}
            </div>
          )}
        </div>

        {/* Main Content */}
        <main className="pt-24 pb-12">
          {/* Hero Section */}
          <section id="home" className="container mx-auto px-4 py-20 text-center">
            <div className="max-w-4xl mx-auto">
              <h1
                className="text-6xl md:text-8xl font-bold text-[#39FF14] mb-4"
                style={{ fontFamily: "Orbitron, monospace" }}
              >
                Code Vision Flow Diagrams
              </h1>
              <p className="text-xl text-white mb-8">UNDERSTAND YOUR CODE LIKE A MONKEY</p>
              <p className="text-lg text-gray-300 mb-12">Connect your GitHub repository</p>

              {/* Repository Connection */}
              <div className="bg-black/40 backdrop-blur-md rounded-lg border border-[#39FF14]/30 p-6 mb-12">
                <div className="flex gap-4 max-w-2xl mx-auto">
                  <Input
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/username/repository"
                    className="bg-black/50 border-[#39FF14]/30 text-white placeholder:text-gray-400 flex-1"
                  />
                  <Button
                    onClick={handleConnect}
                    disabled={!repoUrl || apiKeyStatus !== "valid"}
                    className="bg-[#39FF14] text-black hover:bg-[#39FF14]/80 px-8"
                    style={{ fontFamily: "Orbitron, monospace" }}
                  >
                    Search →
                  </Button>
                </div>
                <p className="text-sm text-gray-400 mt-2">Example: https://github.com/username/repository</p>
              </div>

              {/* Features Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-black/40 backdrop-blur-md border-[#39FF14]/30">
                  <CardContent className="p-6 text-center">
                    <Lock className="h-12 w-12 text-[#39FF14] mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-[#39FF14] mb-2" style={{ fontFamily: "Orbitron, monospace" }}>
                      Bring Your Own OpenAI Key
                    </h3>
                    <p className="text-sm text-gray-300">
                      Your API key is required to use the app. It is never stored and always remains local to your
                      session.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-black/40 backdrop-blur-md border-[#39FF14]/30">
                  <CardContent className="p-6 text-center">
                    <BarChart3 className="h-12 w-12 text-[#39FF14] mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-[#39FF14] mb-2" style={{ fontFamily: "Orbitron, monospace" }}>
                      Diagram Translation
                    </h3>
                    <p className="text-sm text-gray-300">
                      Visualize your code logic instantly as a flowchart, in your chosen language.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-black/40 backdrop-blur-md border-[#39FF14]/30">
                  <CardContent className="p-6 text-center">
                    <FileText className="h-12 w-12 text-[#39FF14] mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-[#39FF14] mb-2" style={{ fontFamily: "Orbitron, monospace" }}>
                      Pseudocode Generation
                    </h3>
                    <p className="text-sm text-gray-300">
                      Get clear, step-by-step pseudocode for any file, in your preferred language.
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-black/40 backdrop-blur-md border-[#39FF14]/30">
                  <CardContent className="p-6 text-center">
                    <MessageSquare className="h-12 w-12 text-[#39FF14] mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-[#39FF14] mb-2" style={{ fontFamily: "Orbitron, monospace" }}>
                      Natural Language Explanation
                    </h3>
                    <p className="text-sm text-gray-300">
                      Understand your code with clear, human-friendly explanations in any language.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Vision Section */}
          <section id="vision" className="container mx-auto px-4 py-20">
            <div className="max-w-4xl mx-auto">
              <h2
                className="text-4xl font-bold text-[#39FF14] mb-8 text-center"
                style={{ fontFamily: "Orbitron, monospace" }}
              >
                Our Vision
              </h2>
              <Card className="bg-black/40 backdrop-blur-md border-[#39FF14]/30">
                <CardContent className="p-8">
                  <div className="bg-black rounded-lg p-6 font-mono text-[#39FF14] text-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                      <span className="text-gray-400">Terminal</span>
                    </div>
                    <div className="space-y-2">
                      <div>$ monkeycode --version</div>
                      <div className="text-gray-400">Version 1.0: Universal Code Translator</div>
                      <div className="text-gray-400">Version 2.0: Hybrid Cognitive IDE</div>
                      <div className="text-gray-400">Version 3.0: Voice-Driven IDE</div>
                      <div className="mt-4">$ monkeycode --status</div>
                      <div className="text-[#39FF14]">Ready to transform your code understanding...</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Meme Coin Section */}
          <section id="memecoin" className="container mx-auto px-4 py-20">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl font-bold text-[#39FF14] mb-8" style={{ fontFamily: "Orbitron, monospace" }}>
                $MONKEYCODE
              </h2>
              <Card className="bg-black/40 backdrop-blur-md border-[#39FF14]/30">
                <CardContent className="p-8">
                  <div className="w-32 h-32 bg-gradient-to-br from-[#39FF14] to-green-400 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl">
                    🐒
                  </div>
                  <p className="text-lg text-gray-300 mb-6">
                    Join the MONKEYCODE community and be part of the revolution in code understanding.
                  </p>
                  <Button
                    className="bg-[#39FF14] text-black hover:bg-[#39FF14]/80 text-lg px-8 py-3"
                    style={{ fontFamily: "Orbitron, monospace" }}
                  >
                    BUY $MONKEYCODE
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* FAQ Section */}
          <section id="faq" className="container mx-auto px-4 py-20">
            <div className="max-w-4xl mx-auto">
              <h2
                className="text-4xl font-bold text-[#39FF14] mb-8 text-center"
                style={{ fontFamily: "Orbitron, monospace" }}
              >
                FAQ
              </h2>
              <Card className="bg-black/40 backdrop-blur-md border-[#39FF14]/30">
                <CardContent className="p-8">
                  <Accordion type="single" collapsible className="space-y-4">
                    <AccordionItem value="security" className="border-[#39FF14]/30">
                      <AccordionTrigger className="text-[#39FF14] hover:text-[#39FF14]/80">
                        How secure is my API key?
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-300">
                        Your API key is never stored on our servers. It remains local to your browser session and is
                        only used to make direct API calls to OpenAI or Gemini.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="files" className="border-[#39FF14]/30">
                      <AccordionTrigger className="text-[#39FF14] hover:text-[#39FF14]/80">
                        What file types are supported?
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-300">
                        We support all major programming languages including JavaScript, Python, Java, C++, Go, Rust,
                        and many more.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="contribute" className="border-[#39FF14]/30">
                      <AccordionTrigger className="text-[#39FF14] hover:text-[#39FF14]/80">
                        How can I contribute to the project?
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-300">
                        MONKEYCODE is open source! You can contribute by submitting issues, feature requests, or pull
                        requests on our GitHub repository.
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
