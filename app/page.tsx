"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

type Track = {
  id: number
  title: string
  artist: { name: string }
  preview: string
  album: { cover_small: string }
}

const ADMIN_EMAIL = "nolanrochette26@gmail.com"

export default function Home() {
  const router = useRouter()
  const [dark, setDark] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [activeOptions, setActiveOptions] = useState<string[]>(["Beat sync"])
  const [showSettings, setShowSettings] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showMusic, setShowMusic] = useState(false)
  const [selectedProblems, setSelectedProblems] = useState<string[]>([])
  const [hasGenerated, setHasGenerated] = useState(false)
  const [selectedMusic, setSelectedMusic] = useState<Track | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [tracks, setTracks] = useState<Track[]>([])
  const [loadingTracks, setLoadingTracks] = useState(false)
  const [playingId, setPlayingId] = useState<number | null>(null)
  const audioRef = { current: null as HTMLAudioElement | null }
  const searchTimeout = { current: null as ReturnType<typeof setTimeout> | null }

  const defaultQueries = ["phonk", "rap us", "drill", "travis scott", "central cee"]

  // THEME COLORS
  const t = {
    bg: dark ? "#0a0a0a" : "#e8e8e3",
    bgNav: dark ? "#0f0f0f" : "#f0f0eb",
    bgCard: dark ? "#141414" : "#f0f0eb",
    bgInput: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)",
    bgPill: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)",
    bgThumb: dark ? "#1a1a1a" : "#d8d8d3",
    bgPanel: dark ? "#111" : "#f0f0eb",
    bgModal: dark ? "#161616" : "#f0f0eb",
    border: dark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.1)",
    borderMed: dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.15)",
    text: dark ? "#f0f0f0" : "#111111",
    textSub: dark ? "#aaa" : "#333333",
    textMuted: dark ? "#555" : "#555555",
    textHint: dark ? "#444" : "#777777",
    overlay: dark ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.3)",
    overlayHeavy: dark ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0.4)",
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
  }, [])

  const fetchTracks = async (query: string) => {
    setLoadingTracks(true)
    try {
      const res = await fetch(`/api/music?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      setTracks(data.data || [])
    } catch {
      setTracks([])
    }
    setLoadingTracks(false)
  }

  const handleSearch = (val: string) => {
    setSearchQuery(val)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      if (val.trim()) fetchTracks(val)
    }, 500)
  }

  const togglePlay = (track: Track) => {
    if (playingId === track.id) {
      audioRef.current?.pause()
      setPlayingId(null)
    } else {
      if (audioRef.current) audioRef.current.pause()
      audioRef.current = new Audio(track.preview)
      audioRef.current.play()
      audioRef.current.onended = () => setPlayingId(null)
      setPlayingId(track.id)
    }
  }

  const selectTrack = (track: Track) => {
    setSelectedMusic(track)
    audioRef.current?.pause()
    setPlayingId(null)
    setShowMusic(false)
  }

  const toggleOption = (opt: string) => {
    setActiveOptions(prev =>
      prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt]
    )
  }

  const toggleProblem = (p: string) => {
    setSelectedProblems(prev =>
      prev.includes(p) ? prev.filter(o => o !== p) : [...prev, p]
    )
  }

  const problems = ["Vidéo non générée", "Mauvaise qualité", "Sous-titres incorrects", "Téléchargement échoué", "Musique désynchronisée", "Lien non reconnu", "Bug d'affichage", "Autre"]
  const clips = [
    { id: 1, name: "Edit #1", meta: "Beat sync · FR", duration: "0:28" },
    { id: 2, name: "Edit #2", meta: "Beat sync · EN", duration: "0:22" },
    { id: 3, name: "Edit #3", meta: "Speed ramp · FR", duration: "0:31" },
  ]

  return (
    <main style={{ display: "flex", flexDirection: "column", alignItems: "center", minHeight: "100vh", width: "100%", background: t.bg, transition: "background 0.2s" }}>

      {/* NAV */}
      <nav style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 32px", borderBottom: t.border, background: t.bgNav }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: "#e8f542", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#0a0a0a", fontSize: 13, fontWeight: 700 }}>✂</span>
          </div>
          <span style={{ color: t.text, fontWeight: 500 }}>Climb<span style={{ color: "#e8f542" }}>Clip</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setShowSettings(true)} style={{ fontSize: 13, color: t.textSub, border: t.borderMed, borderRadius: 8, padding: "7px 16px", background: t.bgInput, cursor: "pointer" }}>
            Paramètres
          </button>
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: t.textSub }}>{user.email}</span>
              <button onClick={async () => { await supabase.auth.signOut(); setUser(null) }} style={{ fontSize: 13, color: "#e8453a", border: "1px solid rgba(232,69,58,0.3)", borderRadius: 8, padding: "7px 14px", background: "none", cursor: "pointer" }}>
                Déconnexion
              </button>
            </div>
          ) : (
            <button onClick={() => router.push("/auth")} style={{ fontSize: 13, fontWeight: 500, background: "#e8f542", color: "#0a0a0a", borderRadius: 8, padding: "7px 16px", border: "none", cursor: "pointer" }}>
              Se connecter / Inscription
            </button>
          )}
        </div>
      </nav>

      {/* CONTENT */}
      <div style={{ width: "100%", maxWidth: 640, display: "flex", flexDirection: "column", alignItems: "center", gap: 28, padding: "48px 24px" }}>

        {/* UPLOAD */}
        <div style={{ width: "100%", border: `2px dashed ${dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`, borderRadius: 16, padding: "40px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, cursor: "pointer" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(232,245,66,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#e8f542", fontSize: 20 }}>↑</span>
          </div>
          <p style={{ fontSize: 15, fontWeight: 500, color: t.text }}>Insérer une vidéo</p>
          <p style={{ fontSize: 12, color: t.textMuted }}>MP4, MOV, AVI — jusqu'à 2 Go</p>
          <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
            <div style={{ flex: 1, height: 1, background: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }} />
            <span style={{ fontSize: 12, color: t.textHint }}>ou</span>
            <div style={{ flex: 1, height: 1, background: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }} />
          </div>
          <div style={{ display: "flex", gap: 8, width: "100%" }} onClick={e => e.stopPropagation()}>
            <input
              style={{ flex: 1, background: t.bgInput, border: t.borderMed, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: t.text, outline: "none" }}
              placeholder="Coller un lien TikTok / Instagram / YouTube..."
            />
            <button style={{ background: t.bgInput, border: t.borderMed, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: t.textSub, cursor: "pointer", whiteSpace: "nowrap" }}>
              Importer
            </button>
          </div>
        </div>

        {/* OPTIONS */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, width: "100%" }}>
          {["Beat sync", "Sous-titres", "Auto-zoom", "Speed ramp"].map(opt => (
            <button key={opt} onClick={() => toggleOption(opt)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer", border: activeOptions.includes(opt) ? "1px solid rgba(232,245,66,0.5)" : t.borderMed, background: activeOptions.includes(opt) ? "rgba(232,245,66,0.07)" : t.bgPill, color: activeOptions.includes(opt) ? "#e8f542" : t.textSub }}>
              {opt}
            </button>
          ))}
          <button onClick={() => { setShowMusic(true); fetchTracks(searchQuery || "phonk") }} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer", border: selectedMusic ? "1px solid rgba(232,245,66,0.5)" : t.borderMed, background: selectedMusic ? "rgba(232,245,66,0.07)" : t.bgPill, color: selectedMusic ? "#e8f542" : t.textSub, display: "flex", alignItems: "center", gap: 6 }}>
            {selectedMusic ? (
              <>
                <img src={selectedMusic.album.cover_small} style={{ width: 16, height: 16, borderRadius: 3 }} />
                {selectedMusic.title} — {selectedMusic.artist.name}
              </>
            ) : "🎵 Ajouter musique"}
          </button>
        </div>

        {/* PROMPT */}
        <div style={{ display: "flex", gap: 8, width: "100%", alignItems: "flex-end" }}>
          <textarea
            style={{ flex: 1, background: t.bgInput, border: t.borderMed, borderRadius: 8, padding: "12px 14px", fontSize: 13, color: t.text, outline: "none", resize: "none", height: 48, lineHeight: "1.5", fontFamily: "sans-serif" }}
            placeholder="Ex : 3 clips style edit foot, cuts sur le beat, texte blanc en bas..."
          />
          <button onClick={() => setHasGenerated(true)} style={{ background: "#e8f542", color: "#0a0a0a", fontWeight: 500, fontSize: 13, borderRadius: 8, padding: "12px 20px", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
            ✦ Générer
          </button>
        </div>

        {/* RESULTS */}
        {hasGenerated && (
          <>
            <div style={{ width: "100%", height: 1, background: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }} />
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: 11, color: t.textHint, textTransform: "uppercase", letterSpacing: "0.05em" }}>Clips générés — 3 résultats</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {clips.map(clip => (
                  <div key={clip.id} style={{ background: t.bgCard, border: t.border, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    <div style={{ aspectRatio: "9/16", background: t.bgThumb, position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(232,245,66,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ color: "#e8f542", fontSize: 14 }}>▶</span>
                      </div>
                      <span style={{ position: "absolute", top: 8, left: 8, fontSize: 10, color: "#e8f542", background: "rgba(232,245,66,0.12)", border: "1px solid rgba(232,245,66,0.25)", padding: "2px 7px", borderRadius: 4 }}>Clip {clip.id}</span>
                      <span style={{ position: "absolute", bottom: 6, right: 8, fontSize: 10, color: "rgba(255,255,255,0.4)", background: "rgba(0,0,0,0.5)", padding: "2px 6px", borderRadius: 4 }}>{clip.duration}</span>
                    </div>
                    <div style={{ padding: "10px 10px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <p style={{ fontSize: 12, color: t.text, fontWeight: 500 }}>{clip.name}</p>
                      <p style={{ fontSize: 11, color: t.textMuted }}>{clip.meta}</p>
                      <button style={{ width: "100%", padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "1px solid rgba(232,245,66,0.3)", background: "rgba(232,245,66,0.07)", color: "#e8f542", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                        ↓ Télécharger
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* MUSIC MODAL */}
      {showMusic && (
        <div onClick={() => { setShowMusic(false); audioRef.current?.pause(); setPlayingId(null) }} style={{ position: "fixed", inset: 0, background: t.overlayHeavy, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: t.bgModal, border: t.border, borderRadius: 16, padding: 24, width: 460, maxHeight: "80vh", display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: t.text }}>🎵 Choisir une musique</span>
              <button onClick={() => { setShowMusic(false); audioRef.current?.pause(); setPlayingId(null) }} style={{ background: "none", border: "none", color: t.textMuted, fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <input
              value={searchQuery}
              onChange={e => handleSearch(e.target.value)}
              style={{ background: t.bgInput, border: t.borderMed, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: t.text, outline: "none", width: "100%" }}
              placeholder="Rechercher un artiste, un titre..."
            />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {defaultQueries.map(q => (
                <button key={q} onClick={() => { setSearchQuery(q); fetchTracks(q) }} style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, cursor: "pointer", border: t.border, background: t.bgPill, color: t.textMuted }}>
                  {q}
                </button>
              ))}
            </div>
            <div style={{ height: 1, background: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }} />
            <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {loadingTracks ? (
                <p style={{ fontSize: 13, color: t.textMuted, textAlign: "center", padding: "20px 0" }}>Chargement...</p>
              ) : tracks.length === 0 ? (
                <p style={{ fontSize: 13, color: t.textMuted, textAlign: "center", padding: "20px 0" }}>Aucun résultat</p>
              ) : tracks.map(track => (
                <div key={track.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", borderRadius: 8, background: selectedMusic?.id === track.id ? "rgba(232,245,66,0.07)" : t.bgInput, border: selectedMusic?.id === track.id ? "1px solid rgba(232,245,66,0.3)" : "1px solid transparent" }}>
                  <img src={track.album.cover_small} style={{ width: 40, height: 40, borderRadius: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, color: t.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.title}</p>
                    <p style={{ fontSize: 11, color: t.textMuted }}>{track.artist.name}</p>
                  </div>
                  <button onClick={() => togglePlay(track)} style={{ width: 32, height: 32, borderRadius: "50%", border: t.border, background: t.bgInput, color: t.textSub, cursor: "pointer", fontSize: 12, flexShrink: 0 }}>
                    {playingId === track.id ? "⏸" : "▶"}
                  </button>
                  <button onClick={() => selectTrack(track)} style={{ padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer", border: "1px solid rgba(232,245,66,0.3)", background: "rgba(232,245,66,0.07)", color: "#e8f542", flexShrink: 0 }}>
                    Choisir
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS PANEL */}
      {showSettings && (
        <div onClick={() => setShowSettings(false)} style={{ position: "fixed", inset: 0, background: t.overlay, zIndex: 100, display: "flex" }}>
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 280, background: t.bgPanel, borderLeft: t.border, padding: "22px 18px", display: "flex", flexDirection: "column", gap: 20, overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: t.text }}>Paramètres</span>
              <button onClick={() => setShowSettings(false)} style={{ background: "none", border: "none", color: t.textMuted, fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ height: 1, background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 10, color: t.textHint, textTransform: "uppercase", letterSpacing: "0.06em" }}>Apparence</p>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setDark(false)} style={{ flex: 1, padding: 8, border: !dark ? "1px solid #e8f542" : t.border, borderRadius: 8, background: !dark ? "rgba(232,245,66,0.07)" : "none", color: !dark ? "#e8f542" : t.textMuted, fontSize: 12, cursor: "pointer" }}>☀ Clair</button>
                <button onClick={() => setDark(true)} style={{ flex: 1, padding: 8, border: dark ? "1px solid #e8f542" : t.border, borderRadius: 8, background: dark ? "rgba(232,245,66,0.07)" : "none", color: dark ? "#e8f542" : t.textMuted, fontSize: 12, cursor: "pointer" }}>☾ Sombre</button>
              </div>
            </div>
            <div style={{ height: 1, background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }} />
            <button onClick={() => { setShowSettings(false); setShowReport(true) }} style={{ background: "none", border: "1px solid #e8453a", borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 500, color: "#e8453a", cursor: "pointer", width: "100%" }}>
              ⚠ Signaler un problème
            </button>
          </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {showReport && (
        <div onClick={() => setShowReport(false)} style={{ position: "fixed", inset: 0, background: t.overlayHeavy, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: t.bgModal, border: t.border, borderRadius: 16, padding: 24, width: 340, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 500, color: t.text }}>⚠ Signaler un problème</span>
              <button onClick={() => setShowReport(false)} style={{ background: "none", border: "none", color: t.textMuted, fontSize: 18, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ height: 1, background: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)" }} />
            <p style={{ fontSize: 11, color: t.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Problèmes fréquents</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {problems.map(p => (
                <button key={p} onClick={() => toggleProblem(p)} style={{ padding: "6px 12px", borderRadius: 20, fontSize: 12, cursor: "pointer", border: selectedProblems.includes(p) ? "1px solid rgba(232,69,58,0.4)" : t.border, background: selectedProblems.includes(p) ? "rgba(232,69,58,0.07)" : t.bgPill, color: selectedProblems.includes(p) ? "#e8453a" : t.textSub }}>
                  {p}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ fontSize: 12, color: t.textMuted }}>Décrivez votre problème <span style={{ fontSize: 10, color: t.textHint }}>optionnel</span></p>
              <textarea style={{ background: t.bgInput, border: t.border, borderRadius: 8, padding: "10px 12px", fontSize: 13, color: t.text, outline: "none", resize: "none", height: 80, fontFamily: "sans-serif", width: "100%" }} placeholder="Donnez plus de détails si vous le souhaitez..." />
            </div>
            <button style={{ background: t.bgInput, border: t.borderMed, borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 500, color: t.textSub, cursor: "pointer", width: "100%" }}>
              Envoyer le signalement
            </button>
          </div>
        </div>
      )}

    </main>
  )
}