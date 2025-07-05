import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "MONKEYCODE - Understand Your Code Like A Monkey",
  description: "Universal code translator with AI-powered diagrams, pseudocode, and natural language explanations",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://esm.sh/reactflow@11.11.4/dist/style.css" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
