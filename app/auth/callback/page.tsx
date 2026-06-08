"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.replace("/")
      }
    })
  }, [])

  return (
    <main style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#0a0a0a" }}>
      <p style={{ color:"#999", fontSize:14 }}>Connexion en cours...</p>
    </main>
  )
}