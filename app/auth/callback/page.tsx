"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuth = async () => {
      const { data } = await supabase.auth.getSession()
      if (data.session) { 
        await new Promise(r => setTimeout(r, 500))
        router.push("/")
        return 
      }
      
      const hash = window.location.hash
      if (hash) {
        const params = new URLSearchParams(hash.replace("#", ""))
        const accessToken = params.get("access_token")
        const refreshToken = params.get("refresh_token")
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          if (!error) { 
            await new Promise(r => setTimeout(r, 500))
            router.push("/")
            return 
          }
        }
      }
      router.push("/auth")
    }
    handleAuth()
  }, [])

  return (
    <main style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:"#0a0a0a" }}>
      <p style={{ color:"#999", fontSize:14 }}>Connexion en cours...</p>
    </main>
  )
}