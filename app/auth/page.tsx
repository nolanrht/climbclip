"use client"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function Auth() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push("/")
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setSuccess("Vérifie ton email pour confirmer ton compte !")
    }
    setLoading(false)
  }

  return (
    <main style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", width: "100%", background: "#0a0a0a" }}>

      {/* CROIX */}
      <button onClick={() => router.push("/")} style={{ position: "fixed", top: 20, right: 24, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#666", fontSize: 16 }}>
        ✕
      </button>

      <div style={{ width: 360, display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "#e8f542", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#0a0a0a", fontSize: 13, fontWeight: 700 }}>✂</span>
          </div>
          <span style={{ color: "#fff", fontWeight: 500, fontSize: 16 }}>Climb<span style={{ color: "#e8f542" }}>Clip</span></span>
        </div>

        <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 0, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 3 }}>
            <button onClick={() => setIsLogin(true)} style={{ flex: 1, padding: "7px 0", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", background: isLogin ? "#e8f542" : "none", color: isLogin ? "#0a0a0a" : "#666" }}>
              Connexion
            </button>
            <button onClick={() => setIsLogin(false)} style={{ flex: 1, padding: "7px 0", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", background: !isLogin ? "#e8f542" : "none", color: !isLogin ? "#0a0a0a" : "#666" }}>
              Inscription
            </button>
          </div>

          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#f0f0f0", outline: "none", width: "100%" }}
            placeholder="Adresse e-mail"
            type="email"
          />
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#f0f0f0", outline: "none", width: "100%" }}
            placeholder="Mot de passe"
            type="password"
          />

          {error && <p style={{ fontSize: 12, color: "#e8453a", textAlign: "center" }}>{error}</p>}
          {success && <p style={{ fontSize: 12, color: "#e8f542", textAlign: "center" }}>{success}</p>}

          <button onClick={handleSubmit} disabled={loading} style={{ background: "#e8f542", border: "none", borderRadius: 8, padding: "11px 0", fontSize: 13, fontWeight: 500, color: "#0a0a0a", cursor: "pointer", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Chargement..." : isLogin ? "Se connecter" : "Créer mon compte"}
          </button>
        </div>
      </div>
    </main>
  )
}