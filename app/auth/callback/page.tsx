"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase.auth.exchangeCodeForSession(
        window.location.search
      )
      if (data.session) {
        router.replace("/")
      } else {
        router.replace("/auth")
      }
    }
    run()
  }, [])

  return (
    <main style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#0a0a0a" }}>
      <p style={{ color:"#999", fontSize:14 }}>Connexion en cours...</p>
    </main>
  )
}