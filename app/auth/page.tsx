"use client"
import { useState } from "react"
import { supabase } from "@/lib/supabase"

const ALLOWED_EMAILS = [
  "nolanrochette20@gmail.com",
  "nolanrochette26@gmail.com",
  "mgabriel16.01.07@gmail.com",
]

export default function Auth() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    if (!ALLOWED_EMAILS.includes(trimmed)) {
      setError("Accès non autorisé")
      return
    }
    setLoading(true)
    setError(null)
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    })
    if (otpError) setError(otpError.message)
    else setSent(true)
    setLoading(false)
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
          {sent ? (
            <>
              <p style={{ fontSize:15, fontWeight:500, color:"#f0f0f0", textAlign:"center" }}>Lien envoyé ✓</p>
              <p style={{ fontSize:13, color:"#aaa", textAlign:"center", lineHeight:1.5 }}>
                Vérifie ta boîte mail et clique sur le lien pour te connecter.
              </p>
              <button
                onClick={() => { setSent(false); setEmail("") }}
                style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"11px 0", fontSize:13, color:"#aaa", cursor:"pointer" }}
              >
                Utiliser un autre email
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize:15, fontWeight:500, color:"#f0f0f0", textAlign:"center" }}>Connexion</p>
              <input
                value={email}
                onChange={e => { setEmail(e.target.value); setError(null) }}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                type="email"
                style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#f0f0f0", outline:"none" }}
                placeholder="Adresse e-mail"
                autoFocus
              />
              {error && <p style={{ fontSize:12, color:"#e8453a", textAlign:"center" }}>{error}</p>}
              <button
                onClick={handleSend}
                disabled={loading || !email.trim()}
                style={{ background:"#e8f542", border:"none", borderRadius:8, padding:"11px 0", fontSize:13, fontWeight:500, color:"#0a0a0a", cursor:"pointer", opacity:(loading || !email.trim()) ? 0.6 : 1 }}
              >
                {loading ? "Envoi..." : "Envoyer le lien"}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
