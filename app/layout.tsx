import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "ClimbClip",
  description: "Générateur de clips IA",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        <script src="https://www.dropbox.com/static/api/2/dropins.js" id="dropboxjs" data-app-key="1flb9unzl19fr1i" async></script>
      </head>
      <body style={{ margin: 0, padding: 0, width: "100%", background: "#0a0a0a" }}>
        {children}
      </body>
    </html>
  )
}