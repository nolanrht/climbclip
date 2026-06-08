"use client"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function Auth() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRecovery, setIsRecovery] = useState(false)
  const router = useRouter()

  useEffect(() => {
  // Détecte recovery depuis le hash AVANT tout
  if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
    setIsRecovery(true)
    return
  }
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) router.push("/")
  })
  supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") setIsRecovery(true)
    else if (event === "SIGNED_IN") router.push("/")
  })
}, [])

  const handleLogin = async () => {
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError("Email ou mot de passe incorrect")
    else router.push("/")
    setLoading(false)
  }

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) { setError("6 caractères minimum"); return }
    setLoading(true); setError(null)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) setError(error.message)
    else { await supabase.auth.signOut(); router.push("/auth") }
    setLoading(false)
  }

  return (
    <main style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", width:"100%", background:"#0a0a0a" }}>
      <button onClick={() => router.push("/")} style={{ position:"fixed", top:20, right:24, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, width:36, height:36, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"#666", fontSize:16 }}>✕</button>
      <div style={{ width:360, display:"flex", flexDirection:"column", gap:24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"center" }}>
          <div style={{ width:28, height:28, borderRadius:6, background:"#e8f542", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ color:"#0a0a0a", fontSize:13, fontWeight:700 }}>✂</span>
          </div>
          <span style={{ color:"#fff", fontWeight:500, fontSize:16 }}>Climb<span style={{ color:"#e8f542" }}>Clip</span></span>
        </div>
        <div style={{ background:"#141414", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, padding:28, display:"flex", flexDirection:"column", gap:16 }}>
          <p style={{ fontSize:15, fontWeight:500, color:"#f0f0f0", textAlign:"center" }}>{isRecovery ? "Nouveau mot de passe" : "Connexion"}</p>
          {isRecovery ? (
            <>
              <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password"
                style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#f0f0f0", outline:"none", width:"100%" }}
                placeholder="Nouveau mot de passe"/>
              {error && <p style={{ fontSize:12, color:"#e8453a", textAlign:"center" }}>{error}</p>}
              <button onClick={handleResetPassword} disabled={loading}
                style={{ background:"#e8f542", border:"none", borderRadius:8, padding:"11px 0", fontSize:13, fontWeight:500, color:"#0a0a0a", cursor:"pointer", opacity:loading ? 0.6 : 1 }}>
                {loading ? "Mise à jour..." : "Mettre à jour"}
              </button>
            </>
          ) : (
            <>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#f0f0f0", outline:"none", width:"100%" }}
                placeholder="Adresse e-mail"/>
              <input value={password} onChange={e => setPassword(e.target.value)} type="password"
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#f0f0f0", outline:"none", width:"100%" }}
                placeholder="Mot de passe"/>
              {error && <p style={{ fontSize:12, color:"#e8453a", textAlign:"center" }}>{error}</p>}
              <button onClick={handleLogin} disabled={loading}
                style={{ background:"#e8f542", border:"none", borderRadius:8, padding:"11px 0", fontSize:13, fontWeight:500, color:"#0a0a0a", cursor:"pointer", opacity:loading ? 0.6 : 1 }}>
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}