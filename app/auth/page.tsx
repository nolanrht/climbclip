"use client"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function Auth() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<"login"|"signup">("login")
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleLogin = async () => {
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError("Email ou mot de passe incorrect")
    else router.push("/")
    setLoading(false)
  }

  const handleSignup = async () => {
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else setSuccess(true)
    setLoading(false)
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: 'https://climbclip.vercel.app/auth/callback' }
    })
  }

  return (
    <main style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", width:"100%", background:"#0a0a0a" }}>
      <div style={{ width:360, display:"flex", flexDirection:"column", gap:24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"center" }}>
          <div style={{ width:28, height:28, borderRadius:6, background:"#e8f542", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ color:"#0a0a0a", fontSize:13, fontWeight:700 }}>✂</span>
          </div>
          <span style={{ color:"#fff", fontWeight:500, fontSize:16 }}>Climb<span style={{ color:"#e8f542" }}>Clip</span></span>
        </div>
        <div style={{ background:"#141414", border:"1px solid rgba(255,255,255,0.08)", borderRadius:16, padding:28, display:"flex", flexDirection:"column", gap:16 }}>
          {success ? (
            <p style={{ fontSize:13, color:"#4ade80", textAlign:"center" }}>✓ Compte créé ! Vérifie ton email pour confirmer.</p>
          ) : (
            <>
              <p style={{ fontSize:15, fontWeight:500, color:"#f0f0f0", textAlign:"center" }}>{mode === "login" ? "Connexion" : "Créer un compte"}</p>
              <button onClick={handleGoogle} style={{ background:"#fff", border:"none", borderRadius:8, padding:"11px 0", fontSize:13, fontWeight:500, color:"#0a0a0a", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                <img src="https://www.google.com/favicon.ico" style={{ width:16, height:16 }}/> Continuer avec Google
              </button>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.1)" }}/>
                <span style={{ fontSize:11, color:"#666" }}>ou</span>
                <div style={{ flex:1, height:1, background:"rgba(255,255,255,0.1)" }}/>
              </div>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#f0f0f0", outline:"none" }}
                placeholder="Adresse e-mail"/>
              <input value={password} onChange={e => setPassword(e.target.value)} type="password"
                onKeyDown={e => e.key === "Enter" && (mode === "login" ? handleLogin() : handleSignup())}
                style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#f0f0f0", outline:"none" }}
                placeholder="Mot de passe"/>
              {error && <p style={{ fontSize:12, color:"#e8453a", textAlign:"center" }}>{error}</p>}
              <button onClick={mode === "login" ? handleLogin : handleSignup} disabled={loading}
                style={{ background:"#e8f542", border:"none", borderRadius:8, padding:"11px 0", fontSize:13, fontWeight:500, color:"#0a0a0a", cursor:"pointer", opacity:loading ? 0.6 : 1 }}>
                {loading ? "..." : mode === "login" ? "Se connecter" : "Créer le compte"}
              </button>
              <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null) }}
                style={{ background:"none", border:"none", color:"#666", fontSize:12, cursor:"pointer" }}>
                {mode === "login" ? "Pas de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}