"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile } from "@ffmpeg/util"

type Track = { id: number; title: string; artist: { name: string }; preview: string; album: { cover_small: string } }
type Clip = { id: string; name: string; base64: string; storage_url?: string; owner_email: string; folder_id: string | null; created_at: string; thumbnail?: string }
type Folder = { id: string; name: string; owner_email: string; shared_with: string[]; created_at: string; parent_id: string | null }
type VideoItem = { id: string; type: "file" | "link"; path?: string; url?: string; name: string; thumbnail?: string }
type TimestampPreview = { start: number; duration: number; name: string; description?: string }
type Lang = "EN" | "FR" | "ES" | "IT" | "DE"
type Preset = { id: string; name: string; format: string; colorGrade: string; transition: string; prompt: string; options: string[]; exportQuality: string; exportCodec: string; watermark: boolean }

const SERVER_URL = "https://climbclip-server.onrender.com"

const CG_LABELS: Record<Lang, Record<string, string>> = {
  EN: { none:"None", cinematic:"Cinematic", orange_teal:"Orange Teal", bw:"Black & White", vibrant:"Vibrant", moody:"Moody", warm:"Warm", cold:"Cold" },
  FR: { none:"Aucun", cinematic:"Cinématique", orange_teal:"Orange Teal", bw:"Noir & Blanc", vibrant:"Vibrant", moody:"Atmosphérique", warm:"Chaud", cold:"Froid" },
  ES: { none:"Ninguno", cinematic:"Cinemático", orange_teal:"Naranja Teal", bw:"Blanco y Negro", vibrant:"Vibrante", moody:"Oscuro", warm:"Cálido", cold:"Frío" },
  IT: { none:"Nessuno", cinematic:"Cinematografico", orange_teal:"Arancione Teal", bw:"Bianco e Nero", vibrant:"Vibrante", moody:"Cupo", warm:"Caldo", cold:"Freddo" },
  DE: { none:"Keiner", cinematic:"Cinematisch", orange_teal:"Orange Teal", bw:"Schwarz-Weiß", vibrant:"Lebendig", moody:"Düster", warm:"Warm", cold:"Kalt" },
}
const TR_LABELS: Record<Lang, Record<string, string>> = {
  EN: { none:"None", fade:"Fade", flash:"Flash", glitch:"Glitch", zoom_in:"Zoom In" },
  FR: { none:"Aucune", fade:"Fondu", flash:"Flash", glitch:"Glitch", zoom_in:"Zoom avant" },
  ES: { none:"Ninguna", fade:"Fundido", flash:"Flash", glitch:"Glitch", zoom_in:"Zoom" },
  IT: { none:"Nessuna", fade:"Dissolvenza", flash:"Flash", glitch:"Glitch", zoom_in:"Zoom avanti" },
  DE: { none:"Keine", fade:"Überblenden", flash:"Flash", glitch:"Glitch", zoom_in:"Hineinzoomen" },
}

const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  EN: { home:"Home",library:"Library",settings:"Settings",logout:"Logout",videos:"Videos",addFile:"+ Add file",dragVideo:"Drop a video or click to import",dragSub:"TikTok, Instagram, local file • max 50MB",addAnother:"Add another video",pasteLink:"Paste a TikTok / Instagram link...",import:"Import",outputFormat:"Output format",beatSync:"Beat sync",subtitles:"Subtitles",autoZoom:"Auto-zoom",speedRamp:"Speed ramp",capsules:"Capsules",introOutro:"Intro / Outro",addMusic:"Add music",zoomIntensity:"Zoom intensity",speedIntensity:"Speed ramp intensity",description:"Description",promptHistory:"History",preview:"Preview",promptHelper:"Prompt help",generating:"Generating...",generate:"Generate",preparingVideos:"Preparing videos...",analyzingAI:"AI analysis...",detectingEffects:"Detecting effects...",renderingClips:"Rendering clips...",generatedClips:"Generated clips",downloadAll:"Download all",download:"Download",serverStarting:"Server starting — may take 30-50s...",check:"Check",newFolder:"+ New folder",folders:"Folders",clipsInFolder:"Clips in this folder",clipsNoFolder:"Clips without folder",noClips:"No clips here",generateFirst:"Generate your first clip",back:"Back",rename:"Rename",move:"Move",delete:"Delete",shareFolder:"Share folder",sharedWith:"Shared with",cancel:"Cancel",create:"Create",apply:"Apply",close:"Close",use:"Use",newFolderName:"Folder name...",emailMember:"Member email...",addMember:"Add a member",createAccount:"Create account",creating:"Creating...",reportProblem:"Report a problem",send:"Send",compressTitle:"File too large",compressMsg:"Compress automatically?",no:"No",yesCompress:"Yes, compress",compressing:"Compressing...",chooseMusic:"Choose music",searchMusic:"Search artist, title...",timestampPreview:"Timestamp preview",timestampDesc:"Moments the AI will cut.",useTimestamps:"Use these timestamps",capsuleTitle:"Capsules",shortVideo:"Short video",shortSub:"sequential clips",longVideo:"Long video",longSub:"best moments",capsuleCount:"Number of capsules",promptGenerated:"Generated prompt:",refVideo:"Reference video",optional:"optional",addRefVideo:"+ Add reference video",lastGenerated:"Last generated",serverActive:"Server active",cmdEnterHint:"Cmd+Enter to generate",subfolders:"Subfolders",newSubfolder:"+ Subfolder",share:"Share",colorGrade:"Color grade",transition:"Transition",textOverlay:"Text overlay",stabilize:"Stabilize",vocalVolume:"Vocal volume",none:"None",exportQuality:"Export quality",exportCodec:"Codec",watermark:"Watermark",presets:"Presets",savePreset:"Save preset",presetName:"Preset name...",stats:"Stats",totalClips:"Total clips",clipsInLib:"In library",queue:"Queue",addToQueue:"+ Queue",runQueue:"Run queue",queueEmpty:"Queue is empty",copyLink:"Copy link",copied:"Copied!",autoMode:"Auto mode",autoModeDesc:"The AI chooses everything for you",manualMode:"Manual",step1:"Import your video",step2:"Describe your edit",step3:"Generate",onboardingSkip:"Skip",shareNative:"Share",advancedSettings:"Advanced settings",generatingMsg1:"Analyzing your best sequences... 🔍",generatingMsg2:"Detecting scene changes... 🎬",generatingMsg3:"Syncing to the beat... 🎵",generatingMsg4:"Applying color grade... 🎨",generatingMsg5:"Rendering your clips... ✨",generatingMsg6:"Almost there... 🚀",subtitleStyle:"Subtitle style",historyTitle:"History",exportDrive:"Export to Drive",exportingDrive:"Exporting...",connectDrive:"Connect Drive",capsuleDesc:"Slight trim to bypass duplicate detection",whatToDo:"What do you want to do?",clipGeneratorTitle:"Clip Generator",clipGeneratorDesc:"Turn your videos into viral clips with AI",upscalingModeDesc:"Enhance photo & video quality with Real-ESRGAN",backHome:"← Home",photo:"Photo",video:"Video",outputQuality:"Output quality",improveBtn:"Enhance ↑",upscalingProgress:"Processing..." },
  FR: { home:"Accueil",library:"Bibliothèque",settings:"Paramètres",logout:"Déconnexion",videos:"Vidéos",addFile:"+ Ajouter",dragVideo:"Glisse une vidéo ou clique",dragSub:"TikTok, Instagram, fichier local • max 50MB",addAnother:"Ajouter une autre vidéo",pasteLink:"Coller un lien TikTok / Instagram...",import:"Importer",outputFormat:"Format de sortie",beatSync:"Beat sync",subtitles:"Sous-titres",autoZoom:"Auto-zoom",speedRamp:"Speed ramp",capsules:"Capsules",introOutro:"Intro / Outro",addMusic:"Ajouter musique",zoomIntensity:"Intensité zoom",speedIntensity:"Intensité speed ramp",description:"Description",promptHistory:"Historique",preview:"Aperçu",promptHelper:"Aide prompt",generating:"Génération...",generate:"Générer",preparingVideos:"Préparation des vidéos...",analyzingAI:"Analyse IA...",detectingEffects:"Détection des effets...",renderingClips:"Rendu des clips...",generatedClips:"Clips générés",downloadAll:"Tout télécharger",download:"Télécharger",serverStarting:"Serveur en démarrage — 30-50 secondes...",check:"Vérifier",newFolder:"+ Dossier",folders:"Dossiers",clipsInFolder:"Clips dans ce dossier",clipsNoFolder:"Clips sans dossier",noClips:"Aucun clip ici",generateFirst:"Générer un premier clip",back:"Retour",rename:"Renommer",move:"Déplacer",delete:"Supprimer",shareFolder:"Partager le dossier",sharedWith:"Partagé avec",cancel:"Annuler",create:"Créer",apply:"Appliquer",close:"Fermer",use:"Utiliser",newFolderName:"Nom du dossier...",emailMember:"Email du membre...",addMember:"Ajouter un membre",createAccount:"Créer le compte",creating:"Création...",reportProblem:"Signaler un problème",send:"Envoyer",compressTitle:"Vidéo trop lourde",compressMsg:"Compresser automatiquement ?",no:"Non",yesCompress:"Oui, compresser",compressing:"Compression...",chooseMusic:"Choisir une musique",searchMusic:"Rechercher artiste, titre...",timestampPreview:"Aperçu timestamps",timestampDesc:"Moments que l'IA va découper.",useTimestamps:"Utiliser ces timestamps",capsuleTitle:"Capsules",shortVideo:"Vidéo courte",shortSub:"clips qui se suivent",longVideo:"Vidéo longue",longSub:"meilleurs moments",capsuleCount:"Nombre",promptGenerated:"Prompt généré :",refVideo:"Vidéo référence",optional:"optionnel",addRefVideo:"+ Ajouter",lastGenerated:"Dernier clip",serverActive:"Serveur actif",cmdEnterHint:"Cmd+Entrée pour générer",subfolders:"Sous-dossiers",newSubfolder:"+ Sous-dossier",share:"Partager",colorGrade:"Color grade",transition:"Transition",textOverlay:"Texte overlay",stabilize:"Stabiliser",vocalVolume:"Volume voix",none:"Aucun",exportQuality:"Qualité export",exportCodec:"Codec",watermark:"Watermark",presets:"Presets",savePreset:"Sauvegarder",presetName:"Nom du preset...",stats:"Stats",totalClips:"Clips générés",clipsInLib:"En bibliothèque",queue:"File d'attente",addToQueue:"+ File",runQueue:"Lancer la file",queueEmpty:"File vide",copyLink:"Copier le lien",copied:"Copié !",autoMode:"Mode Auto",autoModeDesc:"L'IA choisit tout pour toi",manualMode:"Manuel",step1:"Importe ta vidéo",step2:"Décris ton edit",step3:"Génère",onboardingSkip:"Passer",shareNative:"Partager",advancedSettings:"Paramètres avancés",generatingMsg1:"Analyse de tes meilleures séquences... 🔍",generatingMsg2:"Détection des changements de scène... 🎬",generatingMsg3:"Synchronisation sur le beat... 🎵",generatingMsg4:"Application du color grade... 🎨",generatingMsg5:"Rendu de tes clips... ✨",generatingMsg6:"Presque terminé... 🚀",subtitleStyle:"Style sous-titres",historyTitle:"Historique",exportDrive:"Exporter Drive",exportingDrive:"Export...",connectDrive:"Connecter Drive",capsuleDesc:"Micro-décalage pour reposter sans duplicate",whatToDo:"Que veux-tu faire ?",clipGeneratorTitle:"Clip Generator",clipGeneratorDesc:"Transforme tes vidéos en clips viraux avec l'IA",upscalingModeDesc:"Améliore la résolution avec Real-ESRGAN",backHome:"← Accueil",photo:"Photo",video:"Vidéo",outputQuality:"Qualité de sortie",improveBtn:"Améliorer ↑",upscalingProgress:"Upscaling en cours..." },
  ES: { home:"Inicio",library:"Biblioteca",settings:"Ajustes",logout:"Salir",videos:"Vídeos",addFile:"+ Añadir",dragVideo:"Arrastra un vídeo",dragSub:"TikTok, Instagram • máx 50MB",addAnother:"Añadir otro",pasteLink:"Enlace TikTok / Instagram...",import:"Importar",outputFormat:"Formato",beatSync:"Beat sync",subtitles:"Subtítulos",autoZoom:"Auto-zoom",speedRamp:"Speed ramp",capsules:"Cápsulas",introOutro:"Intro / Outro",addMusic:"Música",zoomIntensity:"Zoom",speedIntensity:"Speed",description:"Descripción",promptHistory:"Historial",preview:"Vista previa",promptHelper:"Ayuda",generating:"Generando...",generate:"Generar",preparingVideos:"Preparando...",analyzingAI:"IA...",detectingEffects:"Efectos...",renderingClips:"Render...",generatedClips:"Clips",downloadAll:"Descargar todo",download:"Descargar",serverStarting:"Servidor iniciando...",check:"Verificar",newFolder:"+ Carpeta",folders:"Carpetas",clipsInFolder:"Clips en carpeta",clipsNoFolder:"Sin carpeta",noClips:"Sin clips",generateFirst:"Generar clip",back:"Volver",rename:"Renombrar",move:"Mover",delete:"Eliminar",shareFolder:"Compartir",sharedWith:"Compartido",cancel:"Cancelar",create:"Crear",apply:"Aplicar",close:"Cerrar",use:"Usar",newFolderName:"Nombre...",emailMember:"Email...",addMember:"Añadir",createAccount:"Crear cuenta",creating:"Creando...",reportProblem:"Reportar",send:"Enviar",compressTitle:"Archivo grande",compressMsg:"¿Comprimir?",no:"No",yesCompress:"Sí",compressing:"Comprimiendo...",chooseMusic:"Música",searchMusic:"Buscar...",timestampPreview:"Timestamps",timestampDesc:"La IA cortará aquí.",useTimestamps:"Usar",capsuleTitle:"Cápsulas",shortVideo:"Corto",shortSub:"clips seguidos",longVideo:"Largo",longSub:"mejores momentos",capsuleCount:"Número",promptGenerated:"Prompt:",refVideo:"Referencia",optional:"opcional",addRefVideo:"+ Añadir",lastGenerated:"Último",serverActive:"Activo",cmdEnterHint:"Cmd+Enter",subfolders:"Subcarpetas",newSubfolder:"+ Subcarpeta",share:"Compartir",colorGrade:"Color",transition:"Transición",textOverlay:"Texto",stabilize:"Estabilizar",vocalVolume:"Voz",none:"Ninguno",exportQuality:"Calidad",exportCodec:"Codec",watermark:"Marca",presets:"Presets",savePreset:"Guardar",presetName:"Nombre...",stats:"Stats",totalClips:"Clips",clipsInLib:"Biblioteca",queue:"Cola",addToQueue:"+ Cola",runQueue:"Ejecutar",queueEmpty:"Vacía",copyLink:"Copiar",copied:"¡Copiado!",autoMode:"Modo Auto",autoModeDesc:"La IA elige todo",manualMode:"Manual",step1:"Importa tu vídeo",step2:"Describe tu edit",step3:"Genera",onboardingSkip:"Saltar",shareNative:"Compartir",advancedSettings:"Ajustes avanzados",generatingMsg1:"Analizando... 🔍",generatingMsg2:"Escenas... 🎬",generatingMsg3:"Beat... 🎵",generatingMsg4:"Color... 🎨",generatingMsg5:"Render... ✨",generatingMsg6:"Casi... 🚀",subtitleStyle:"Subtítulos",historyTitle:"Historial",exportDrive:"Drive",exportingDrive:"Exportando...",connectDrive:"Conectar Drive",capsuleDesc:"Micro-recorte sin duplicado",whatToDo:"¿Qué quieres hacer?",clipGeneratorTitle:"Clip Generator",clipGeneratorDesc:"Convierte tus vídeos en clips virales con IA",upscalingModeDesc:"Mejora la resolución con Real-ESRGAN",backHome:"← Inicio",photo:"Foto",video:"Vídeo",outputQuality:"Calidad de salida",improveBtn:"Mejorar ↑",upscalingProgress:"Mejorando..." },
  IT: { home:"Home",library:"Libreria",settings:"Impostazioni",logout:"Esci",videos:"Video",addFile:"+ Aggiungi",dragVideo:"Trascina un video",dragSub:"TikTok, Instagram • max 50MB",addAnother:"Aggiungi altro",pasteLink:"Link TikTok / Instagram...",import:"Importa",outputFormat:"Formato",beatSync:"Beat sync",subtitles:"Sottotitoli",autoZoom:"Auto-zoom",speedRamp:"Speed ramp",capsules:"Capsule",introOutro:"Intro / Outro",addMusic:"Musica",zoomIntensity:"Zoom",speedIntensity:"Speed",description:"Descrizione",promptHistory:"Cronologia",preview:"Anteprima",promptHelper:"Aiuto",generating:"Generazione...",generate:"Genera",preparingVideos:"Preparazione...",analyzingAI:"IA...",detectingEffects:"Effetti...",renderingClips:"Rendering...",generatedClips:"Clip",downloadAll:"Scarica tutto",download:"Scarica",serverStarting:"Server in avvio...",check:"Verifica",newFolder:"+ Cartella",folders:"Cartelle",clipsInFolder:"Clip in cartella",clipsNoFolder:"Senza cartella",noClips:"Nessuna clip",generateFirst:"Genera clip",back:"Indietro",rename:"Rinomina",move:"Sposta",delete:"Elimina",shareFolder:"Condividi",sharedWith:"Condiviso",cancel:"Annulla",create:"Crea",apply:"Applica",close:"Chiudi",use:"Usa",newFolderName:"Nome...",emailMember:"Email...",addMember:"Aggiungi",createAccount:"Crea account",creating:"Creazione...",reportProblem:"Segnala",send:"Invia",compressTitle:"File grande",compressMsg:"Comprimi?",no:"No",yesCompress:"Sì",compressing:"Compressione...",chooseMusic:"Musica",searchMusic:"Cerca...",timestampPreview:"Timestamp",timestampDesc:"L'IA taglierà qui.",useTimestamps:"Usa",capsuleTitle:"Capsule",shortVideo:"Corto",shortSub:"clip consecutive",longVideo:"Lungo",longSub:"momenti migliori",capsuleCount:"Numero",promptGenerated:"Prompt:",refVideo:"Riferimento",optional:"opzionale",addRefVideo:"+ Aggiungi",lastGenerated:"Ultimo",serverActive:"Attivo",cmdEnterHint:"Cmd+Invio",subfolders:"Sottocartelle",newSubfolder:"+ Sottocartella",share:"Condividi",colorGrade:"Colore",transition:"Transizione",textOverlay:"Testo",stabilize:"Stabilizza",vocalVolume:"Voce",none:"Nessuno",exportQuality:"Qualità",exportCodec:"Codec",watermark:"Watermark",presets:"Preset",savePreset:"Salva",presetName:"Nome...",stats:"Stats",totalClips:"Clip",clipsInLib:"Libreria",queue:"Coda",addToQueue:"+ Coda",runQueue:"Avvia",queueEmpty:"Vuota",copyLink:"Copia",copied:"Copiato!",autoMode:"Modalità Auto",autoModeDesc:"L'IA sceglie tutto",manualMode:"Manuale",step1:"Importa il video",step2:"Descrivi il tuo edit",step3:"Genera",onboardingSkip:"Salta",shareNative:"Condividi",advancedSettings:"Impostazioni avanzate",generatingMsg1:"Analisi... 🔍",generatingMsg2:"Scene... 🎬",generatingMsg3:"Beat... 🎵",generatingMsg4:"Colore... 🎨",generatingMsg5:"Render... ✨",generatingMsg6:"Quasi... 🚀",subtitleStyle:"Sottotitoli",historyTitle:"Cronologia",exportDrive:"Drive",exportingDrive:"Esportando...",connectDrive:"Connetti Drive",capsuleDesc:"Micro-taglio senza duplicato",whatToDo:"Cosa vuoi fare?",clipGeneratorTitle:"Clip Generator",clipGeneratorDesc:"Trasforma i tuoi video in clip virali con l'IA",upscalingModeDesc:"Migliora la risoluzione con Real-ESRGAN",backHome:"← Home",photo:"Foto",video:"Video",outputQuality:"Qualità output",improveBtn:"Migliora ↑",upscalingProgress:"Upscaling in corso..." },
  DE: { home:"Start",library:"Bibliothek",settings:"Einstellungen",logout:"Abmelden",videos:"Videos",addFile:"+ Hinzufügen",dragVideo:"Video ziehen",dragSub:"TikTok, Instagram • max 50MB",addAnother:"Weiteres Video",pasteLink:"TikTok / Instagram Link...",import:"Importieren",outputFormat:"Format",beatSync:"Beat sync",subtitles:"Untertitel",autoZoom:"Auto-Zoom",speedRamp:"Speed ramp",capsules:"Kapseln",introOutro:"Intro / Outro",addMusic:"Musik",zoomIntensity:"Zoom",speedIntensity:"Speed",description:"Beschreibung",promptHistory:"Verlauf",preview:"Vorschau",promptHelper:"Hilfe",generating:"Generierung...",generate:"Generieren",preparingVideos:"Vorbereitung...",analyzingAI:"KI...",detectingEffects:"Effekte...",renderingClips:"Rendern...",generatedClips:"Clips",downloadAll:"Alle laden",download:"Laden",serverStarting:"Server startet...",check:"Prüfen",newFolder:"+ Ordner",folders:"Ordner",clipsInFolder:"Clips in Ordner",clipsNoFolder:"Ohne Ordner",noClips:"Keine Clips",generateFirst:"Clip erstellen",back:"Zurück",rename:"Umbenennen",move:"Verschieben",delete:"Löschen",shareFolder:"Teilen",sharedWith:"Geteilt mit",cancel:"Abbrechen",create:"Erstellen",apply:"Anwenden",close:"Schließen",use:"Verwenden",newFolderName:"Name...",emailMember:"E-Mail...",addMember:"Hinzufügen",createAccount:"Konto erstellen",creating:"Erstelle...",reportProblem:"Melden",send:"Senden",compressTitle:"Datei groß",compressMsg:"Komprimieren?",no:"Nein",yesCompress:"Ja",compressing:"Komprimierung...",chooseMusic:"Musik",searchMusic:"Suchen...",timestampPreview:"Timestamps",timestampDesc:"KI schneidet hier.",useTimestamps:"Verwenden",capsuleTitle:"Kapseln",shortVideo:"Kurz",shortSub:"aufeinanderfolgend",longVideo:"Lang",longSub:"beste Momente",capsuleCount:"Anzahl",promptGenerated:"Prompt:",refVideo:"Referenz",optional:"optional",addRefVideo:"+ Hinzufügen",lastGenerated:"Letzter",serverActive:"Aktiv",cmdEnterHint:"Cmd+Enter",subfolders:"Unterordner",newSubfolder:"+ Unterordner",share:"Teilen",colorGrade:"Farbe",transition:"Übergang",textOverlay:"Text",stabilize:"Stabilisieren",vocalVolume:"Stimme",none:"Keiner",exportQuality:"Qualität",exportCodec:"Codec",watermark:"Wasserzeichen",presets:"Presets",savePreset:"Speichern",presetName:"Name...",stats:"Stats",totalClips:"Clips",clipsInLib:"Bibliothek",queue:"Warteschlange",addToQueue:"+ Warte",runQueue:"Starten",queueEmpty:"Leer",copyLink:"Kopieren",copied:"Kopiert!",autoMode:"Auto-Modus",autoModeDesc:"KI wählt alles",manualMode:"Manuell",step1:"Video importieren",step2:"Edit beschreiben",step3:"Generieren",onboardingSkip:"Überspringen",shareNative:"Teilen",advancedSettings:"Erweiterte Einstellungen",generatingMsg1:"Analysieren... 🔍",generatingMsg2:"Szenen... 🎬",generatingMsg3:"Beat... 🎵",generatingMsg4:"Farbe... 🎨",generatingMsg5:"Rendern... ✨",generatingMsg6:"Fast fertig... 🚀",subtitleStyle:"Untertitel",historyTitle:"Verlauf",exportDrive:"Drive",exportingDrive:"Exportiere...",connectDrive:"Drive verbinden",capsuleDesc:"Mikro-Schnitt ohne Duplikat",whatToDo:"Was möchtest du tun?",clipGeneratorTitle:"Clip Generator",clipGeneratorDesc:"Verwandle deine Videos mit KI in virale Clips",upscalingModeDesc:"Verbessere die Auflösung mit Real-ESRGAN",backHome:"← Start",photo:"Foto",video:"Video",outputQuality:"Ausgabequalität",improveBtn:"Verbessern ↑",upscalingProgress:"Upscaling läuft..." },
}

const AUTO_PRESETS: Record<string, { colorGrade: string; transition: string; options: string[]; prompt: string }> = {
  sport:     { colorGrade:"vibrant",     transition:"flash",   options:["Beat sync","Auto-zoom","Speed ramp"], prompt:"edit sport dynamique, cuts sur le beat, meilleurs moments" },
  lifestyle: { colorGrade:"warm",        transition:"fade",    options:["Beat sync","Auto-zoom"],              prompt:"vlog lifestyle, moments naturels, ambiance chill" },
  gaming:    { colorGrade:"cinematic",   transition:"glitch",  options:["Beat sync","Speed ramp"],             prompt:"highlights gaming, moments épiques, cuts rapides" },
  music:     { colorGrade:"moody",       transition:"fade",    options:["Beat sync","Sous-titres"],            prompt:"clip musical, synchronisé sur le beat, cinématique" },
  travel:    { colorGrade:"orange_teal", transition:"zoom_in", options:["Beat sync","Auto-zoom"],              prompt:"montage voyage, paysages, ambiance aventure" },
}

const ClimbLogo = ({ size = 30 }: { size?: number }) => (
  <svg width={size} height={size * 0.85} viewBox="0 0 120 102" fill="none">
    <defs>
      <linearGradient id="peak1" x1="60" y1="0" x2="60" y2="80" gradientUnits="userSpaceOnUse"><stop offset="0%" stopColor="#f0f0f0"/><stop offset="60%" stopColor="#aaaaaa"/><stop offset="100%" stopColor="#666"/></linearGradient>
      <linearGradient id="peak2" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox"><stop offset="0%" stopColor="#c8c8c8"/><stop offset="100%" stopColor="#444"/></linearGradient>
      <linearGradient id="shadow1" x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop offset="0%" stopColor="#222" stopOpacity="0.9"/><stop offset="100%" stopColor="#000" stopOpacity="0.4"/></linearGradient>
    </defs>
    <polygon points="60,4 92,78 28,78" fill="url(#peak1)"/>
    <polygon points="60,4 92,78 60,78" fill="url(#shadow1)" opacity="0.7"/>
    <polygon points="28,20 52,78 4,78" fill="url(#peak2)" opacity="0.85"/>
    <polygon points="28,20 52,78 28,78" fill="#111" opacity="0.6"/>
    <polygon points="92,20 116,78 68,78" fill="url(#peak2)" opacity="0.85"/>
    <polygon points="92,20 116,78 92,78" fill="#111" opacity="0.6"/>
    <line x1="4" y1="78" x2="116" y2="78" stroke="#888" strokeWidth="1" opacity="0.4"/>
  </svg>
)

const MountainBg = ({ dark }: { dark: boolean }) => (
  <svg viewBox="0 0 1440 280" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"
    style={{ position:"fixed", bottom:0, left:0, width:"100%", height:"32vh", pointerEvents:"none", zIndex:0, opacity: dark ? 0.052 : 0.028 }}>
    <defs>
      <linearGradient id="mg1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={dark ? "#c8d86e" : "#444"} stopOpacity="0.8"/>
        <stop offset="100%" stopColor={dark ? "#ffffff" : "#000"} stopOpacity="0"/>
      </linearGradient>
    </defs>
    <polygon points="0,200 100,145 180,170 290,110 410,150 530,90 660,130 780,75 900,118 1020,68 1140,108 1260,82 1380,112 1440,95 1440,280 0,280" fill="url(#mg1)" opacity="0.3"/>
    <polygon points="0,225 70,182 150,205 240,162 360,192 470,142 590,175 700,128 820,165 940,112 1060,152 1180,124 1300,158 1440,132 1440,280 0,280" fill="url(#mg1)" opacity="0.55"/>
    <polygon points="0,252 55,222 120,240 195,205 290,228 390,188 490,215 590,172 700,205 810,165 930,198 1050,168 1165,195 1285,170 1390,192 1440,178 1440,280 0,280" fill="url(#mg1)" opacity="0.95"/>
    <polygon points="390,188 404,198 418,190 405,177" fill="white" opacity="0.45"/>
    <polygon points="810,165 825,176 840,167 826,154" fill="white" opacity="0.38"/>
    <polygon points="1165,195 1177,204 1191,196 1178,184" fill="white" opacity="0.32"/>
    <polygon points="530,90 543,100 556,91 543,79" fill="white" opacity="0.28"/>
  </svg>
)

const NoiseBg = () => (
  <svg style={{ position:"fixed", inset:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:0, opacity:0.032 }} xmlns="http://www.w3.org/2000/svg">
    <filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
    <rect width="100%" height="100%" filter="url(#noise)" fill="white"/>
  </svg>
)

const RomanColumnsBg = ({ dark }: { dark: boolean }) => {
  const fill = dark ? "rgba(232,245,66,0.038)" : "rgba(0,0,0,0.025)"
  return (
    <svg style={{ position:"fixed", inset:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:0 }}
      viewBox="0 0 1200 820" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <g fill={fill}>
        <rect x="48" y="38" width="240" height="18" rx="1"/>
        <rect x="58" y="54" width="72" height="14"/><rect x="66" y="68" width="56" height="570"/><rect x="58" y="638" width="72" height="11"/><rect x="44" y="649" width="100" height="18" rx="1"/>
        <rect x="164" y="54" width="66" height="12"/><rect x="172" y="66" width="50" height="490"/><rect x="164" y="556" width="66" height="10"/><rect x="150" y="566" width="94" height="16" rx="1"/>
        <rect x="910" y="20" width="250" height="18" rx="1"/>
        <rect x="910" y="36" width="72" height="14"/><rect x="918" y="50" width="56" height="530"/><rect x="910" y="580" width="72" height="11"/><rect x="896" y="591" width="100" height="18" rx="1"/>
        <rect x="1036" y="36" width="70" height="14"/><rect x="1044" y="50" width="54" height="600"/><rect x="1036" y="650" width="70" height="11"/><rect x="1022" y="661" width="98" height="18" rx="1"/>
        <rect x="0" y="738" width="330" height="5" rx="1"/>
        <rect x="870" y="726" width="330" height="5" rx="1"/>
      </g>
    </svg>
  )
}

export default function Home() {
  const router = useRouter()
  const [dark, setDark] = useState(true)
  const [lang, setLang] = useState<Lang>("FR")
  const [user, setUser] = useState<any>(null)
  const [currentMode, setCurrentMode] = useState<"home"|"clips"|"upscaling">("home")
  const [currentPage, setCurrentPage] = useState<"home"|"library"|"history">("home")
  const [activeOptions, setActiveOptions] = useState<string[]>(["Beat sync"])
  const [showSettings, setShowSettings] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showMusic, setShowMusic] = useState(false)
  const [showCompressModal, setShowCompressModal] = useState(false)
  const [showPromptHelper, setShowPromptHelper] = useState(false)
  const [showCapsulesModal, setShowCapsulesModal] = useState(false)
  const [showTimestampPreview, setShowTimestampPreview] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [showSavePreset, setShowSavePreset] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showNavMenu, setShowNavMenu] = useState(false)
  const [upscaleFile, setUpscaleFile] = useState<File|null>(null)
  const [upscalePreviewUrl, setUpscalePreviewUrl] = useState<string|null>(null)
  const [upscaleResultUrl, setUpscaleResultUrl] = useState<string|null>(null)
  const [upscaling, setUpscaling] = useState(false)
  const [upscaleScale, setUpscaleScale] = useState<2|4>(4)
  const [upscaleSlider, setUpscaleSlider] = useState(50)
  const [upscaleMediaType, setUpscaleMediaType] = useState<"image"|"video"|null>(null)
  const [upscaleError, setUpscaleError] = useState<string|null>(null)
  const [upscaleProgress, setUpscaleProgress] = useState(0)
  const [upscaleResultName, setUpscaleResultName] = useState("")
  const [upscaleRenaming, setUpscaleRenaming] = useState(false)
  const [capsulesType, setCapsulesType] = useState<"courte"|"longue"|null>(null)
  const [capsulesCount, setCapsulesCount] = useState(4)
  const [capsuleModeActive, setCapsuleModeActive] = useState(false)
  const [pendingFile, setPendingFile] = useState<File|null>(null)
  const [compressing, setCompressing] = useState(false)
  const [selectedProblems, setSelectedProblems] = useState<string[]>([])
  const [hasGenerated, setHasGenerated] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [generatingMsgIndex, setGeneratingMsgIndex] = useState(0)
  const [generatingServerMsg, setGeneratingServerMsg] = useState("")
  const [promptText, setPromptText] = useState("")
  const [generatedClips, setGeneratedClips] = useState<any[]>([])
  const [selectedMusic, setSelectedMusic] = useState<Track|null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [tracks, setTracks] = useState<Track[]>([])
  const [loadingTracks, setLoadingTracks] = useState(false)
  const [playingId, setPlayingId] = useState<number|null>(null)
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [linkInput, setLinkInput] = useState("")
  const [importingLink, setImportingLink] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState("")
  const [newMemberPassword, setNewMemberPassword] = useState("")
  const [addingMember, setAddingMember] = useState(false)
  const [memberSuccess, setMemberSuccess] = useState<string|null>(null)
  const [helperInput, setHelperInput] = useState("")
  const [helperResult, setHelperResult] = useState("")
  const [helperLoading, setHelperLoading] = useState(false)
  const [helperRefVideo, setHelperRefVideo] = useState<File|null>(null)
  const [selectedFormat, setSelectedFormat] = useState("9:16")
  const [zoomIntensity, setZoomIntensity] = useState(50)
  const [speedIntensity, setSpeedIntensity] = useState(50)
  const [addIntroOutro, setAddIntroOutro] = useState(false)
  const [colorGrade, setColorGrade] = useState("none")
  const [transition, setTransition] = useState("fade")
  const [textOverlay, setTextOverlay] = useState("")
  const [stabilize, setStabilize] = useState(false)
  const [vocalVolume, setVocalVolume] = useState(30)
  const [watermark, setWatermark] = useState(false)
  const [exportQuality, setExportQuality] = useState("1080p")
  const [exportCodec, setExportCodec] = useState("H264")
  const [subtitleStyle, setSubtitleStyle] = useState("tiktok")
  const [timestampPreviews, setTimestampPreviews] = useState<TimestampPreview[]>([])
  const [loadingTimestamps, setLoadingTimestamps] = useState(false)
  const [customTimestamps, setCustomTimestamps] = useState<TimestampPreview[]|null>(null)
  const [promptHistory, setPromptHistory] = useState<string[]>([])
  const [showPromptHistory, setShowPromptHistory] = useState(false)
  const [serverAwake, setServerAwake] = useState<boolean|null>(null)
  const [renamingClip, setRenamingClip] = useState<string|null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [lastGeneratedClip, setLastGeneratedClip] = useState<any|null>(null)
  const [folders, setFolders] = useState<Folder[]>([])
  const [clips, setClips] = useState<Clip[]>([])
  const [folderStack, setFolderStack] = useState<string[]>([])
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [newFolderParent, setNewFolderParent] = useState<string|null>(null)
  const [clipMenu, setClipMenu] = useState<string|null>(null)
  const [folderMenu, setFolderMenu] = useState<string|null>(null)
  const [showMoveModal, setShowMoveModal] = useState<string|null>(null)
  const [showShareModal, setShowShareModal] = useState<string|null>(null)
  const [shareEmail, setShareEmail] = useState("")
  const [showLangMenu, setShowLangMenu] = useState(false)
  const [presets, setPresets] = useState<Preset[]>([])
  const [presetName, setPresetName] = useState("")
  const [copiedId, setCopiedId] = useState<string|null>(null)
  const [autoMode, setAutoMode] = useState(true)
  const [onboardingDone, setOnboardingDone] = useState(false)
  const [detectedContentType, setDetectedContentType] = useState<string|null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [autoAnalysisDesc, setAutoAnalysisDesc] = useState<string|null>(null)
  const [generationHistory, setGenerationHistory] = useState<any[]>([])
  const [totalClipsGenerated, setTotalClipsGenerated] = useState(0)
  const [exportingDrive, setExportingDrive] = useState<string|null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [generatingStartTime, setGeneratingStartTime] = useState<number|null>(null)
  const [estimatedRemaining, setEstimatedRemaining] = useState<string|null>(null)
  const [driveConnected, setDriveConnected] = useState(false)
  const [videoPlayerClip, setVideoPlayerClip] = useState<any|null>(null)

  const audioRef = useRef<HTMLAudioElement|null>(null)
  const searchTimeout = useRef<ReturnType<typeof setTimeout>|null>(null)
  const generatingMsgRef = useRef<ReturnType<typeof setInterval>|null>(null)
  const defaultQueries = ["phonk","rap us","drill","travis scott","central cee"]
  const T = TRANSLATIONS[lang]
  const CGL = CG_LABELS[lang]
  const TRL = TR_LABELS[lang]
  const currentFolder = folderStack.length > 0 ? folderStack[folderStack.length-1] : null
  const generatingMsgs = [T.generatingMsg1, T.generatingMsg2, T.generatingMsg3, T.generatingMsg4, T.generatingMsg5, T.generatingMsg6]

  const t = {
    bg: dark ? "#0b0b0b" : "#e5e5e0",
    bgNav: dark ? "rgba(11,11,11,0.92)" : "rgba(235,235,230,0.92)",
    bgCard: dark ? "#131313" : "#ebebE6",
    bgInput: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)",
    bgPill: dark ? "rgba(255,255,255,0.035)" : "rgba(0,0,0,0.04)",
    bgThumb: dark ? "#1c1c1c" : "#d5d5d0",
    bgModal: dark ? "#141414" : "#ebebE6",
    border: dark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.09)",
    borderMed: dark ? "1px solid rgba(255,255,255,0.09)" : "1px solid rgba(0,0,0,0.13)",
    text: dark ? "#efefef" : "#0f0f0f",
    textSub: dark ? "#999" : "#2f2f2f",
    textMuted: dark ? "#4a4a4a" : "#5a5a5a",
    textHint: dark ? "#383838" : "#7a7a7a",
    overlay: dark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.25)",
    overlayHeavy: dark ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.45)",
    accent: "#e8f542",
  }

  useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    const u = data.session?.user ?? null
    if (!u) { router.push("/auth"); return }
    setUser(u)
    if (u.email) checkDriveConnection(u.email)
  })
  checkServerStatus()
  const saved = localStorage.getItem("promptHistory"); if (saved) setPromptHistory(JSON.parse(saved))
  const savedLang = localStorage.getItem("lang") as Lang|null; if (savedLang && TRANSLATIONS[savedLang]) setLang(savedLang)
  const savedPresets = localStorage.getItem("climbPresets"); if (savedPresets) setPresets(JSON.parse(savedPresets))
  const savedOnboarding = localStorage.getItem("climbOnboarding"); if (savedOnboarding) setOnboardingDone(true)
  const savedHistory = localStorage.getItem("climbHistory"); if (savedHistory) setGenerationHistory(JSON.parse(savedHistory))
  const savedTotal = localStorage.getItem("climbTotalClips"); if (savedTotal) setTotalClipsGenerated(parseInt(savedTotal) || 0)
  if ("Notification" in window && Notification.permission === "default") Notification.requestPermission()
  if (window.location.hash === "#drive_connected") { setDriveConnected(true); window.history.replaceState({}, "", window.location.pathname) }
}, [])

  useEffect(() => {
    if (!user) return
    loadLibrary()
    const channel = supabase
      .channel('clips-realtime')
      .on('postgres_changes' as any, { event: 'INSERT', schema: 'public', table: 'clips', filter: `owner_email=eq.${user.email}` }, () => { loadLibrary() })
      .on('postgres_changes' as any, { event: 'DELETE', schema: 'public', table: 'clips', filter: `owner_email=eq.${user.email}` }, () => { loadLibrary() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!upscaling) { setUpscaleProgress(0); return }
    const id = setInterval(() => {
      setUpscaleProgress(prev => prev >= 85 ? prev : prev + (85 - prev) * 0.06)
    }, 600)
    return () => clearInterval(id)
  }, [upscaling])

  useEffect(() => {
    if (generating) {
      setGeneratingMsgIndex(0)
      generatingMsgRef.current = setInterval(() => setGeneratingMsgIndex(prev => (prev + 1) % generatingMsgs.length), 4000)
    } else {
      if (generatingMsgRef.current) clearInterval(generatingMsgRef.current)
    }
    return () => { if (generatingMsgRef.current) clearInterval(generatingMsgRef.current) }
  }, [generating])

  const setLangAndSave = (l: Lang) => { setLang(l); localStorage.setItem("lang", l); setShowLangMenu(false) }
  const checkServerStatus = async () => { try { const res = await fetch(`${SERVER_URL}/health`, { signal: AbortSignal.timeout(5000) }); setServerAwake(res.ok) } catch { setServerAwake(false) } }
  const completeOnboarding = () => { setOnboardingDone(true); localStorage.setItem("climbOnboarding", "1") }

  const checkDriveConnection = async (email: string) => {
    try {
      const res = await fetch(`${SERVER_URL}/auth/google/status?email=${encodeURIComponent(email)}`)
      const data = await res.json()
      setDriveConnected(data.connected)
    } catch {}
  }

  const connectDrive = () => {
    if (!user?.email) return
    const currentOrigin = window.location.origin
    window.location.href = `${SERVER_URL}/auth/google?email=${encodeURIComponent(user.email)}&redirect=${encodeURIComponent(currentOrigin)}`
  }

  const playDoneSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const playNote = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = freq; osc.type = "sine"
        gain.gain.setValueAtTime(0, ctx.currentTime + start)
        gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + start + 0.01)
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + duration)
        osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + duration + 0.1)
      }
      playNote(523, 0, 0.15); playNote(659, 0.18, 0.15); playNote(784, 0.36, 0.3)
    } catch {}
  }

  const notifyDone = (clipsCount: number) => {
    playDoneSound()
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("ClimbClip ✦", { body: `${clipsCount} clip${clipsCount > 1 ? "s" : ""} prêt${clipsCount > 1 ? "s" : ""} !`, icon: "/favicon.ico" })
    }
  }

  const loadLibrary = async () => {
    const { data: { session }, error: sessErr } = await supabase.auth.getSession()
    const email = session?.user?.email
    console.log("[loadLibrary] session email:", email, sessErr ? "sessErr:" + sessErr.message : "")
    if (!email) { console.warn("[loadLibrary] no session — skipping"); return }
    const { data: fd, error: fe } = await supabase.from("folders").select("*").or(`owner_email.eq.${email},shared_with.cs.{${email}}`).order("created_at", { ascending: false })
    if (fe) console.error("[loadLibrary] folders error:", fe.message)
    const { data: cd, error: ce } = await supabase.from("clips").select("*").eq("owner_email", email).order("created_at", { ascending: false })
    if (ce) { console.error("[loadLibrary] clips error:", ce.message, ce.code); return }
    console.log("[loadLibrary] loaded", cd?.length ?? 0, "clips")
    setFolders(fd || []); setClips(cd || [])
  }

  const saveClipToLibrary = async (clip: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.email) { console.error("NO SESSION EMAIL"); return }
      const { data, error } = await supabase.from("clips").insert({
        name: clip.name || "clip",
        base64: null,
        storage_url: clip.storageUrl || clip.storage_url || null,
        owner_email: session.user.email,
        folder_id: null,
      }).select()
      console.log("INSERT:", data, error)
      if (!error) loadLibrary()
    } catch(e) { console.error("save error:", e) }
  }

  const uploadFile = async (file: File): Promise<string|null> => {
    try { const fd = new FormData(); fd.append("file", file); const res = await fetch(`${SERVER_URL}/upload`, { method:"POST", body:fd }); const d = await res.json(); return d.path || null } catch { return null }
  }

  const handleFileAdd = async (file: File) => {
    if (file.size > 50*1024*1024) { setPendingFile(file); setShowCompressModal(true); return }
    const p = await uploadFile(file)
    if (p) {
      setVideos(prev => [...prev, { id:Date.now().toString(), type:"file", path:p, name:file.name }])
      if (autoMode) {
        setAnalyzing(true); setAutoAnalysisDesc(null)
        try {
          const res = await fetch(`${SERVER_URL}/analyze-video`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ videoPath: p }) })
          const analysis = await res.json()
          if (analysis.prompt) setPromptText(analysis.prompt)
          if (analysis.contentType) setDetectedContentType(analysis.contentType)
          if (analysis.suggestedFormat) setSelectedFormat(analysis.suggestedFormat)
          if (analysis.description) setAutoAnalysisDesc(analysis.description)
        } catch {}
        setAnalyzing(false)
      }
    }
  }

  const compressAndUpload = async () => {
    if (!pendingFile) return; setShowCompressModal(false); setCompressing(true)
    try {
      const ff = new FFmpeg(); await ff.load()
      await ff.writeFile("input.mp4", await fetchFile(pendingFile))
      await ff.exec(["-i","input.mp4","-vcodec","libx264","-crf","28","-preset","fast","-acodec","aac","output.mp4"])
      const data = await ff.readFile("output.mp4")
      const compressed = new File([data as unknown as BlobPart], "compressed.mp4", { type:"video/mp4" })
      const p = await uploadFile(compressed); if (p) setVideos(prev => [...prev, { id:Date.now().toString(), type:"file", path:p, name:pendingFile.name }])
    } catch (err: any) { alert(err.message) }
    setCompressing(false)
  }

  const handleLinkImport = async () => {
    const url = linkInput.trim(); if (!url) return; setImportingLink(true)
    try {
      const [thumbRes, res] = await Promise.all([
        fetch(`${SERVER_URL}/thumbnail`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ url }) }),
        fetch(`${SERVER_URL}/download`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ url }) })
      ])
      const [thumbData, data] = await Promise.all([thumbRes.json(), res.json()])
      if (data.path) {
        setVideos(prev => [...prev, { id:Date.now().toString(), type:"link", path:data.path, url, name:url.slice(0,40)+"...", thumbnail:thumbData.thumbnail||undefined }])
        setLinkInput("")
        if (autoMode) {
          setAnalyzing(true); setAutoAnalysisDesc(null)
          try {
            const analysis = await (await fetch(`${SERVER_URL}/analyze-video`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ videoPath: data.path }) })).json()
            if (analysis.prompt) setPromptText(analysis.prompt)
            if (analysis.contentType) setDetectedContentType(analysis.contentType)
            if (analysis.suggestedFormat) setSelectedFormat(analysis.suggestedFormat)
            if (analysis.description) setAutoAnalysisDesc(analysis.description)
          } catch {}
          setAnalyzing(false)
        }
      } else alert("Erreur")
    } catch (err: any) { alert(`Erreur: ${err.message}`) }
    setImportingLink(false)
  }

  const removeVideo = (id: string) => { setVideos(prev => prev.filter(v => v.id !== id)); setAutoAnalysisDesc(null) }
  const savePromptToHistory = (p: string) => { if (!p.trim()) return; const u = [p, ...promptHistory.filter(h => h !== p)].slice(0,10); setPromptHistory(u); localStorage.setItem("promptHistory", JSON.stringify(u)) }

  const detectContentType = async (): Promise<string> => {
    if (!promptText) return "sport"
    const lower = promptText.toLowerCase()
    if (lower.includes("sport") || lower.includes("foot") || lower.includes("basket") || lower.includes("gym")) return "sport"
    if (lower.includes("gaming") || lower.includes("game") || lower.includes("highlight")) return "gaming"
    if (lower.includes("voyage") || lower.includes("travel") || lower.includes("vacances")) return "travel"
    if (lower.includes("musique") || lower.includes("music") || lower.includes("clip")) return "music"
    return "lifestyle"
  }

  const buildPayload = (overrideOptions?: any) => ({
    videoPaths: videos.map(v => v.path).filter(Boolean),
    videoUrls: [],
    prompt: promptText || AUTO_PRESETS[detectedContentType || "sport"]?.prompt,
    options: overrideOptions?.options || activeOptions,
    musicUrl: selectedMusic?.preview || null,
    format: selectedFormat,
    zoomIntensity: (overrideOptions?.options || activeOptions).includes("Auto-zoom") ? zoomIntensity : null,
    speedIntensity: (overrideOptions?.options || activeOptions).includes("Speed ramp") ? speedIntensity : null,
    addIntroOutro,
    customTimestamps,
    colorGrade: (overrideOptions?.colorGrade || colorGrade) !== "none" ? (overrideOptions?.colorGrade || colorGrade) : null,
    transition: (overrideOptions?.transition || transition) !== "none" ? (overrideOptions?.transition || transition) : null,
    textOverlay: textOverlay || null,
    stabilize,
    vocalVolume: selectedMusic ? vocalVolume/100 : null,
    watermark,
    exportQuality,
    exportCodec,
    subtitleStyle,
  })

  const handleGenerate = useCallback(async () => {
    if (videos.length === 0) return
    savePromptToHistory(promptText)
    setHasGenerated(false); setGenerating(true); setProgress(0); setServerAwake(null); setGeneratingServerMsg("")
    setGeneratingStartTime(Date.now()); setEstimatedRemaining(null)
    let payload = buildPayload()
    if (autoMode) {
      const contentType = detectedContentType || await detectContentType()
      setDetectedContentType(contentType)
      const preset = AUTO_PRESETS[contentType]
      payload = buildPayload({ colorGrade: preset.colorGrade, transition: preset.transition, options: [...new Set([...activeOptions, ...preset.options])] })
      if (!promptText) payload.prompt = preset.prompt
    }
    try {
      const res = await fetch(`${SERVER_URL}/generate`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) })
      setServerAwake(true); const { jobId } = await res.json()
      const startTime = Date.now()
      const eventSource = new EventSource(`${SERVER_URL}/stream/${jobId}`)
      eventSource.onmessage = async (e) => {
        const d = JSON.parse(e.data)
        if (d.progress) {
          setProgress(d.progress)
          const elapsed = (Date.now() - startTime) / 1000
          if (d.progress > 10) {
            const totalEst = elapsed / (d.progress / 100)
            const remaining = Math.max(0, Math.round(totalEst - elapsed))
            setEstimatedRemaining(remaining > 5 ? `~${remaining}s` : null)
          }
        }
        if (d.message) setGeneratingServerMsg(d.message)
        if (d.status === "done") {
          eventSource.close()
          console.log("[handleGenerate] done —", d.clips.length, "clips:", d.clips.map((c: any) => ({ name: c.name, storageUrl: c.storageUrl?.slice(0,50) })))
          setGeneratedClips(d.clips); setHasGenerated(true); setGenerating(false); setProgress(100)
          setEstimatedRemaining(null)
          if (d.clips.length > 0) setLastGeneratedClip(d.clips[0])
          notifyDone(d.clips.length)
          console.log("[handleGenerate] saving clips to library...")
          for (let i = 0; i < d.clips.length; i++) await saveClipToLibrary(d.clips[i])
          console.log("[handleGenerate] all saves done — reloading library")
          await loadLibrary()
          console.log("[handleGenerate] library reloaded")
          if (d.clips.length > 0) {
            setTotalClipsGenerated(prev => { const n = prev + d.clips.length; localStorage.setItem("climbTotalClips", String(n)); return n })
          }
          const historyEntry = { id:`${Date.now()}_${d.clips.length}`, date:new Date().toLocaleString(), prompt:promptText, contentType:detectedContentType, settings:{ format:selectedFormat, colorGrade:payload.colorGrade, transition:payload.transition }, clipsCount: d.clips.length }
          setGenerationHistory(prev => { const h = [historyEntry, ...prev].slice(0, 20); localStorage.setItem("climbHistory", JSON.stringify(h)); return h })
          if (!onboardingDone) completeOnboarding()
        }
        else if (d.status === "error") { eventSource.close(); alert("Erreur génération"); setGenerating(false); setEstimatedRemaining(null) }
      }
      eventSource.onerror = () => { eventSource.close(); alert("Connexion perdue"); setGenerating(false); setEstimatedRemaining(null) }
    } catch { alert("Erreur"); setGenerating(false) }
  }, [videos, promptText, activeOptions, selectedMusic, selectedFormat, zoomIntensity, speedIntensity, addIntroOutro, customTimestamps, colorGrade, transition, textOverlay, stabilize, vocalVolume, watermark, exportQuality, exportCodec, autoMode, detectedContentType, subtitleStyle, generationHistory, onboardingDone])

  const handleGenerateCapsules = useCallback(async () => {
    if (videos.length === 0) return
    setHasGenerated(false); setGenerating(true); setProgress(0); setGeneratingServerMsg("")
    setGeneratingStartTime(Date.now()); setEstimatedRemaining(null)
    const payload = { videoPaths: videos.map(v => v.path).filter(Boolean), videoUrls: [], format: selectedFormat, exportQuality, exportCodec, isCapsule: true, capsulesCount }
    try {
      const res = await fetch(`${SERVER_URL}/generate`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) })
      setServerAwake(true); const { jobId } = await res.json()
      const startTime = Date.now()
      const eventSource = new EventSource(`${SERVER_URL}/stream/${jobId}`)
      eventSource.onmessage = async (e) => {
        const d = JSON.parse(e.data)
        if (d.progress) { setProgress(d.progress); const elapsed = (Date.now() - startTime) / 1000; if (d.progress > 10) { const remaining = Math.max(0, Math.round(elapsed / (d.progress/100) - elapsed)); setEstimatedRemaining(remaining > 5 ? `~${remaining}s` : null) } }
        if (d.message) setGeneratingServerMsg(d.message)
        if (d.status === "done") {
          eventSource.close(); setCapsuleModeActive(false)
          console.log("[handleGenerateCapsules] done —", d.clips.length, "clips:", d.clips.map((c: any) => ({ name: c.name, storageUrl: c.storageUrl?.slice(0,50) })))
          setGeneratedClips(d.clips); setHasGenerated(true); setGenerating(false); setProgress(100); setEstimatedRemaining(null)
          if (d.clips.length > 0) setLastGeneratedClip(d.clips[0]); notifyDone(d.clips.length)
          console.log("[handleGenerateCapsules] saving to library...")
          for (let i = 0; i < d.clips.length; i++) await saveClipToLibrary(d.clips[i])
          console.log("[handleGenerateCapsules] all saves done — reloading library")
          await loadLibrary()
          console.log("[handleGenerateCapsules] library reloaded")
          if (d.clips.length > 0) {
            setTotalClipsGenerated(prev => { const n = prev + d.clips.length; localStorage.setItem("climbTotalClips", String(n)); return n })
          }
          const historyEntry = { id:`${Date.now()}_${d.clips.length}`, date:new Date().toLocaleString(), prompt:"Capsules", contentType:"capsule", settings:{ format:selectedFormat }, clipsCount: d.clips.length }
          setGenerationHistory(prev => { const h = [historyEntry, ...prev].slice(0, 20); localStorage.setItem("climbHistory", JSON.stringify(h)); return h })
        }
        else if (d.status === "error") { eventSource.close(); setCapsuleModeActive(false); alert(`Erreur capsules: ${d.error || "inconnue"}`); setGenerating(false); setEstimatedRemaining(null) }
      }
      eventSource.onerror = () => { eventSource.close(); setGenerating(false); setEstimatedRemaining(null) }
    } catch { alert("Erreur"); setGenerating(false) }
  }, [videos, selectedFormat, exportQuality, exportCodec, capsulesCount])


  const savePreset = () => {
    if (!presetName.trim()) return
    const p: Preset = { id:Date.now().toString(), name:presetName, format:selectedFormat, colorGrade, transition, prompt:promptText, options:activeOptions, exportQuality, exportCodec, watermark }
    const updated = [...presets, p]; setPresets(updated); localStorage.setItem("climbPresets", JSON.stringify(updated)); setPresetName(""); setShowSavePreset(false)
  }
  const loadPreset = (p: Preset) => { setSelectedFormat(p.format); setColorGrade(p.colorGrade); setTransition(p.transition); setPromptText(p.prompt); setActiveOptions(p.options); setExportQuality(p.exportQuality); setExportCodec(p.exportCodec); setWatermark(p.watermark); setShowPresets(false) }
  const deletePreset = (id: string) => { const updated = presets.filter(p => p.id !== id); setPresets(updated); localStorage.setItem("climbPresets", JSON.stringify(updated)) }
  const getClipSrc = (clip: any) => clip.storageUrl || clip.storage_url || clip.base64 || ""

  const exportToDrive = async (clip: any) => {
    const storageUrl = clip.storageUrl || clip.storage_url
    if (!storageUrl) { downloadClip(clip); return }
    if (!driveConnected) { connectDrive(); return }
    const clipId = clip.id || clip.name; setExportingDrive(clipId)
    try {
      const res = await fetch(`${SERVER_URL}/drive/upload`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email: user.email || "", storageUrl, fileName: `${clip.name || "clip"}.mp4` }) })
      const data = await res.json()
      if (data.success) alert(`✓ Exporté sur Drive : ${data.fileName}`)
      else if (data.error === "not_connected") { setDriveConnected(false); connectDrive() }
      else downloadClip(clip)
    } catch { downloadClip(clip) }
    setExportingDrive(null)
  }

  const getDriveButtonLabel = (clipId: string) => { if (exportingDrive === clipId) return T.exportingDrive; if (!driveConnected) return T.connectDrive; return T.exportDrive }

  const shareClipPublic = async (clip: any) => {
    const src = getClipSrc(clip)
    if (clip.storageUrl || clip.storage_url) { await navigator.clipboard.writeText(clip.storageUrl || clip.storage_url); setCopiedId(clip.name || clip.id); setTimeout(() => setCopiedId(null), 2500); return }
    try {
      const res = await fetch(`${SERVER_URL}/share`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ base64: src, name:clip.name }) })
      const data = await res.json()
      if (data.url) { await navigator.clipboard.writeText(data.url); setCopiedId(clip.name || clip.id); setTimeout(() => setCopiedId(null), 2500) }
      else alert(data.error)
    } catch (err: any) { alert(err.message) }
  }

  const shareNative = async (clip: any) => {
    try {
      const storageUrl = clip.storageUrl || clip.storage_url
      if (navigator.share && storageUrl) { await navigator.share({ title: clip.name, url: storageUrl }); return }
      const src = getClipSrc(clip)
      if (navigator.share && src && src.startsWith("data:")) {
        const b64 = src.split(",")[1]; const bytes = atob(b64); const arr = new Uint8Array(bytes.length)
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
        const blob = new Blob([arr], { type:"video/mp4" }); const file = new File([blob], `${clip.name || "clip"}.mp4`, { type:"video/mp4" })
        await navigator.share({ title: clip.name, files: [file] }); return
      }
      shareClipPublic(clip)
    } catch {}
  }

  const downloadClip = async (clip: any) => {
    const src = getClipSrc(clip)
    if (!src) return
    const filename = `${clip.name || "clip"}.mp4`
    if (src.startsWith("data:")) {
      const a = document.createElement("a"); a.href = src; a.download = filename; a.click(); return
    }
    try {
      const res = await fetch(src)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement("a"); a.href = blobUrl; a.download = filename
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30000)
    } catch { window.open(src, "_blank") }
  }
  const downloadAllClips = () => generatedClips.forEach(clip => downloadClip(clip))

  const handlePreviewTimestamps = async () => {
    if (videos.length === 0) return; setLoadingTimestamps(true)
    try { const res = await fetch(`${SERVER_URL}/preview-timestamps`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ videoPaths:videos.map(v => v.path).filter(Boolean), prompt:promptText, options:activeOptions }) }); const data = await res.json(); setTimestampPreviews(data.timestamps || []); setShowTimestampPreview(true) }
    catch (err: any) { alert(err.message) }
    setLoadingTimestamps(false)
  }

  const handlePromptHelper = async () => {
    if (!helperInput.trim()) return; setHelperLoading(true); setHelperResult("")
    try {
      let refVideoFrames = null
      if (helperRefVideo) { const v = document.createElement("video"); v.src = URL.createObjectURL(helperRefVideo); await new Promise(r => { v.onloadeddata = r }); const c = document.createElement("canvas"); c.width = 320; c.height = 180; c.getContext("2d")?.drawImage(v, 0, 0, 320, 180); refVideoFrames = [c.toDataURL("image/jpeg", 0.8).split(",")[1]]; URL.revokeObjectURL(v.src) }
      const res = await fetch(`${SERVER_URL}/prompt-help`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ description:helperInput, refVideoFrames }) })
      const data = await res.json(); setHelperResult(data.prompt || "")
    } catch (err: any) { alert(err.message) }
    setHelperLoading(false)
  }

  const handleUpscale = async () => {
    if (!upscaleFile) return
    setUpscaling(true); setUpscaleResultUrl(null); setUpscaleError(null); setUpscaleProgress(5)
    try {
      const fd = new FormData()
      fd.append("file", upscaleFile)
      fd.append("scale", String(upscaleScale))
      const res = await fetch(`${SERVER_URL}/upscale`, { method:"POST", body:fd })
      const data = await res.json()
      if (data.error) { setUpscaleError(data.error); return }
      setUpscaleProgress(100)
      setUpscaleResultName(`upscaled_x${upscaleScale}_${upscaleFile.name}`)
      setUpscaleSlider(50)
      setUpscaleResultUrl(data.url)
    } catch (e: any) { setUpscaleError(e.message) }
    finally { setUpscaling(false) }
  }

  const makeSliderHandler = (setSlider: (v: number) => void) =>
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      const container = e.currentTarget
      const update = (clientX: number) => {
        const rect = container.getBoundingClientRect()
        const pct = Math.max(1, Math.min(99, ((clientX - rect.left) / rect.width) * 100))
        setSlider(pct)
      }
      update(e.clientX)
      const onMove = (ev: PointerEvent) => update(ev.clientX)
      const onUp = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp) }
      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onUp)
    }

  const applyCapsules = () => { if (!capsulesType) return; if (videos.length === 0) { alert("Importe une vidéo d'abord"); return }; setCapsuleModeActive(true); setShowCapsulesModal(false); setCapsulesType(null) }
  const fetchTracks = async (query: string) => { setLoadingTracks(true); try { const res = await fetch(`/api/music?q=${encodeURIComponent(query)}`); const data = await res.json(); setTracks(data.data || []) } catch { setTracks([]) }; setLoadingTracks(false) }
  const handleSearch = (val: string) => { setSearchQuery(val); if (searchTimeout.current) clearTimeout(searchTimeout.current); searchTimeout.current = setTimeout(() => { if (val.trim()) fetchTracks(val) }, 500) }
  const togglePlay = (track: Track) => { if (playingId === track.id) { audioRef.current?.pause(); audioRef.current = null; setPlayingId(null) } else { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }; const a = new Audio(track.preview); audioRef.current = a; a.play(); a.onended = () => { audioRef.current = null; setPlayingId(null) }; setPlayingId(track.id) } }
  const closeMusic = () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }; setPlayingId(null); setShowMusic(false) }
  const selectTrack = (track: Track) => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }; setPlayingId(null); setSelectedMusic(track); setShowMusic(false) }
  const toggleOption = (opt: string) => setActiveOptions(prev => prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt])
  const toggleProblem = (p: string) => setSelectedProblems(prev => prev.includes(p) ? prev.filter(o => o !== p) : [...prev, p])
  const createFolder = async () => { if (!newFolderName.trim()) return; await supabase.from("folders").insert({ name:newFolderName, owner_email:user.email, shared_with:[], parent_id:newFolderParent }); setNewFolderName(""); setShowNewFolder(false); setNewFolderParent(null); loadLibrary() }
  const deleteClip = async (id: string) => { await supabase.from("clips").delete().eq("id", id); setClipMenu(null); loadLibrary() }
  const deleteFolder = async (id: string) => { await supabase.from("folders").delete().eq("id", id); setFolderMenu(null); if (currentFolder === id) setFolderStack(prev => prev.slice(0,-1)); loadLibrary() }
  const moveClip = async (clipId: string, folderId: string|null) => { await supabase.from("clips").update({ folder_id:folderId }).eq("id", clipId); setShowMoveModal(null); loadLibrary() }
  const renameClip = async (id: string) => { if (!renameValue.trim()) return; await supabase.from("clips").update({ name:renameValue }).eq("id", id); setRenamingClip(null); loadLibrary() }
  const shareFolder = async (folderId: string) => { if (!shareEmail.trim()) return; const folder = folders.find(f => f.id === folderId); if (!folder) return; await supabase.from("folders").update({ shared_with:[...(folder.shared_with||[]), shareEmail] }).eq("id", folderId); setShareEmail(""); setShowShareModal(null); loadLibrary() }

  const problems = ["Vidéo non générée","Mauvaise qualité","Sous-titres incorrects","Téléchargement échoué","Musique désynchronisée","Lien non reconnu","Bug d'affichage","Autre"]
  const formats = ["9:16","16:9","1:1","4:5"]
  const colorGrades = ["none","cinematic","orange_teal","bw","vibrant","moody","warm","cold"]
  const transitions = ["none","fade","flash","glitch","zoom_in"]
  const currentFolderData = currentFolder ? folders.find(f => f.id === currentFolder) : null
  const displayedFolders = folders.filter(f => f.parent_id === currentFolder)
  const displayedClips = currentFolder ? clips.filter(c => c.folder_id === currentFolder) : clips.filter(c => !c.folder_id)
  const modalBase: React.CSSProperties = { background:t.bgModal, border:t.border, borderRadius:16, padding:24, display:"flex", flexDirection:"column", gap:16 }
  const Pill = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button onClick={onClick} style={{ padding:"7px 15px", borderRadius:20, fontSize:12, cursor:"pointer", border:active ? `1px solid rgba(232,245,66,0.55)` : t.borderMed, background:active ? "rgba(232,245,66,0.08)" : t.bgPill, color:active ? t.accent : t.textSub, fontWeight:active ? 500 : 400, transition:"all 0.15s", whiteSpace:"nowrap" }}>{label}</button>
  )

  const ClipCard = ({ clip, index }: { clip: any; index: number }) => {
    const src = getClipSrc(clip); const clipId = clip.id || clip.name || String(index)
    return (
      <div style={{ background:t.bgCard, border:t.border, borderRadius:11, overflow:"hidden", display:"flex", flexDirection:"column" }}>
        <div onClick={() => setVideoPlayerClip(clip)} style={{ aspectRatio:"9/16", background:t.bgThumb, overflow:"hidden", cursor:"pointer", position:"relative" }}>
          {clip.thumbnail ? <img src={clip.thumbnail} style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:28, opacity:0.4 }}>▶</span></div>}
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.18)", opacity:0, transition:"opacity 0.15s" }} onMouseEnter={e => (e.currentTarget.style.opacity="1")} onMouseLeave={e => (e.currentTarget.style.opacity="0")}><span style={{ fontSize:32, color:"#fff" }}>▶</span></div>
        </div>
        <div style={{ padding:"9px 10px 11px", display:"flex", flexDirection:"column", gap:5 }}>
          <p style={{ fontSize:11, color:t.text, fontWeight:500 }}>{clip.name}</p>
          <button onClick={() => shareNative(clip)} style={{ padding:"7px", borderRadius:7, fontSize:11, border:t.border, background:t.bgInput, color:t.textSub, cursor:"pointer" }}>{T.shareNative}</button>
          <button onClick={() => shareClipPublic(clip)} style={{ padding:"7px", borderRadius:7, fontSize:11, border:t.border, background:t.bgInput, color:copiedId === clipId ? "#4ade80" : t.textMuted, cursor:"pointer" }}>{copiedId === clipId ? T.copied : T.copyLink}</button>
          <button onClick={() => exportToDrive(clip)} disabled={exportingDrive === clipId} style={{ padding:"7px", borderRadius:7, fontSize:11, border:driveConnected ? "1px solid rgba(66,133,244,0.35)" : t.borderMed, background:driveConnected ? "rgba(66,133,244,0.06)" : t.bgInput, color:exportingDrive === clipId ? t.textMuted : driveConnected ? "#4285f4" : t.textSub, cursor:"pointer", opacity:exportingDrive === clipId ? 0.6 : 1 }}>{getDriveButtonLabel(clipId)}</button>
        </div>
      </div>
    )
  }

  if (!onboardingDone) {

    return (
      <main style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", background:t.bg, padding:24, position:"relative" }}>
        <MountainBg dark={dark}/>
        {dark && <NoiseBg/>}
        <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:32, maxWidth:380, width:"100%", textAlign:"center" }}>
          <ClimbLogo size={48}/>
          <div>
            <p style={{ fontSize:22, fontWeight:700, color:t.text, marginBottom:8 }}>CLIMB CLIP</p>
            <p style={{ fontSize:14, color:t.textSub }}>Génère des clips TikTok/Instagram en quelques secondes grâce à l'IA</p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:12, width:"100%" }}>
            {[T.step1, T.step2, T.step3].map((step, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", background:t.bgCard, border:t.border, borderRadius:12 }}>
                <div style={{ width:32, height:32, borderRadius:"50%", background:"rgba(232,245,66,0.1)", border:"1px solid rgba(232,245,66,0.3)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <span style={{ fontSize:14, fontWeight:700, color:t.accent }}>{i+1}</span>
                </div>
                <p style={{ fontSize:14, color:t.text, fontWeight:500 }}>{step}</p>
              </div>
            ))}
          </div>
          <button onClick={completeOnboarding} style={{ width:"100%", padding:"14px 0", borderRadius:12, border:"none", background:t.accent, color:"#0a0a0a", fontWeight:700, fontSize:15, cursor:"pointer", boxShadow:"0 0 28px rgba(232,245,66,0.22)" }}>Commencer →</button>
          <button onClick={completeOnboarding} style={{ background:"none", border:"none", color:t.textMuted, cursor:"pointer", fontSize:13 }}>{T.onboardingSkip}</button>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight:"100vh", width:"100%", background:t.bg, position:"relative", overflowX:"hidden" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {currentMode === "home" && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", position:"relative" }}>
          <RomanColumnsBg dark={dark}/>
          {dark && <NoiseBg/>}
          <div style={{ position:"fixed", inset:0, backgroundImage:"linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)", backgroundSize:"44px 44px", pointerEvents:"none", zIndex:0 }}/>
          <div style={{ position:"relative", zIndex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:44, padding:"56px 20px" }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:14 }}>
              <ClimbLogo size={48}/>
              <div style={{ textAlign:"center", lineHeight:1 }}>
                <div style={{ color:t.text, fontWeight:800, fontSize:28, letterSpacing:"0.09em" }}>CLIMB</div>
                <div style={{ color:t.textMuted, fontSize:11, letterSpacing:"0.25em" }}>CLIP</div>
              </div>
            </div>
            <h1 style={{ fontSize:22, fontWeight:700, color:t.text, textAlign:"center", margin:0 }}>{T.whatToDo}</h1>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, width:"100%", maxWidth:460 }}>
              {([
                { key:"clips" as const, title:T.clipGeneratorTitle, desc:T.clipGeneratorDesc, icon:(
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="6" width="20" height="14" rx="2"/><path d="m8 6-2-4"/><path d="m16 6 2-4"/><line x1="12" y1="10" x2="12" y2="16"/><line x1="9" y1="13" x2="15" y2="13"/>
                  </svg>
                )},
                { key:"upscaling" as const, title:"Upscaling", desc:T.upscalingModeDesc, icon:(
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
                  </svg>
                )},
              ] as {key:"clips"|"upscaling", title:string, desc:string, icon:React.ReactNode}[]).map(card => (
                <button key={card.key} onClick={() => setCurrentMode(card.key)}
                  onMouseEnter={e => { e.currentTarget.style.borderColor="rgba(232,245,66,0.4)"; e.currentTarget.style.transform="translateY(-3px)" }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor=dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.1)"; e.currentTarget.style.transform="translateY(0)" }}
                  style={{ display:"flex", flexDirection:"column", alignItems:"flex-start", gap:16, padding:"26px 20px", background:t.bgCard, border:dark?"1px solid rgba(255,255,255,0.08)":"1px solid rgba(0,0,0,0.1)", borderRadius:18, cursor:"pointer", textAlign:"left", transition:"border-color 0.2s, transform 0.2s", color:t.textMuted }}>
                  {card.icon}
                  <div>
                    <p style={{ fontSize:15, fontWeight:700, color:t.text, marginBottom:5 }}>{card.title}</p>
                    <p style={{ fontSize:12, color:t.textMuted, lineHeight:1.55 }}>{card.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <div style={{ position:"relative" }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowLangMenu(!showLangMenu)} style={{ fontSize:13, color:t.textMuted, background:"none", border:t.border, borderRadius:8, padding:"7px 14px", cursor:"pointer" }}>{lang}</button>
              {showLangMenu && (
                <div style={{ position:"absolute", bottom:"calc(100% + 6px)", left:"50%", transform:"translateX(-50%)", background:t.bgModal, border:t.border, borderRadius:8, padding:"4px 0", minWidth:70, boxShadow:"0 8px 24px rgba(0,0,0,0.5)", zIndex:100 }}>
                  {(["EN","FR","ES","IT","DE"] as Lang[]).map(l => (
                    <button key={l} onClick={() => setLangAndSave(l)} style={{ width:"100%", padding:"7px 12px", background:lang===l?"rgba(232,245,66,0.07)":"none", border:"none", color:lang===l?t.accent:t.text, cursor:"pointer", fontSize:12, textAlign:"left" }}>{l}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {currentMode === "clips" && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", minHeight:"100vh", width:"100%" }}
          onClick={() => { setClipMenu(null); setFolderMenu(null); setShowPromptHistory(false); setShowLangMenu(false) }}>

          {dark && <>
            <NoiseBg/>
            <div style={{ position:"fixed", top:"-20%", left:"10%", width:"55vw", height:"55vw", borderRadius:"50%", background:"radial-gradient(circle, rgba(232,245,66,0.022) 0%, transparent 70%)", pointerEvents:"none", zIndex:0 }}/>
            <div style={{ position:"fixed", bottom:"25%", right:"5%", width:"40vw", height:"40vw", borderRadius:"50%", background:"radial-gradient(circle, rgba(180,180,255,0.015) 0%, transparent 70%)", pointerEvents:"none", zIndex:0 }}/>
            <div style={{ position:"fixed", inset:0, backgroundImage:"repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.007) 3px, rgba(255,255,255,0.007) 4px)", pointerEvents:"none", zIndex:0 }}/>
          </>}
          <MountainBg dark={dark}/>

      {serverAwake === false && (
        <div style={{ width:"100%", background:"rgba(232,245,66,0.04)", borderBottom:"1px solid rgba(232,245,66,0.11)", padding:"10px 24px", display:"flex", alignItems:"center", gap:10, position:"relative", zIndex:10 }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:t.accent, opacity:0.8 }}/>
          <span style={{ fontSize:12, color:t.accent }}>{T.serverStarting}</span>
          <button onClick={checkServerStatus} style={{ marginLeft:"auto", fontSize:11, color:t.textMuted, background:"none", border:t.border, borderRadius:6, padding:"3px 8px", cursor:"pointer" }}>{T.check}</button>
        </div>
      )}

      <nav style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 16px", borderBottom:t.border, background:t.bgNav, backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", position:"sticky", top:0, zIndex:50 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <ClimbLogo size={26}/>
          <div style={{ display:"flex", flexDirection:"column", lineHeight:1, gap:1 }}>
            <span style={{ color:t.text, fontWeight:700, fontSize:12, letterSpacing:"0.1em" }}>CLIMB</span>
            <span style={{ color:t.textMuted, fontSize:7, letterSpacing:"0.2em" }}>CLIP</span>
          </div>
          {serverAwake === true && <div style={{ width:5, height:5, borderRadius:"50%", background:"#4ade80" }}/>}
        </div>
        {isMobile ? (
          <div style={{ position:"relative" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowNavMenu(!showNavMenu)} style={{ fontSize:18, color:t.textSub, background:"none", border:"none", cursor:"pointer", lineHeight:1, padding:"4px 6px" }}>☰</button>
            {showNavMenu && (
              <div style={{ position:"absolute", left:"50%", transform:"translateX(-50%)", top:"calc(100% + 6px)", background:t.bgModal, border:t.border, borderRadius:10, padding:"4px 0", minWidth:160, boxShadow:"0 8px 24px rgba(0,0,0,0.6)", zIndex:300 }}>
                {([["home", T.home], ["library", T.library], ["history", "Historique"]] as [string,string][]).map(([page, label]) => (
                  <button key={page} onClick={() => { setCurrentPage(page as any); if (page === "library") loadLibrary(); setShowNavMenu(false) }} style={{ width:"100%", padding:"12px 18px", background:currentPage === page ? "rgba(232,245,66,0.07)" : "none", border:"none", borderBottom:t.border, color:currentPage === page ? t.accent : t.text, cursor:"pointer", fontSize:14, textAlign:"left", fontWeight:currentPage === page ? 600 : 400 }}>{label}</button>
                ))}
                <button onClick={() => { setCurrentMode("home"); setShowNavMenu(false) }} style={{ width:"100%", padding:"12px 18px", background:"none", border:"none", color:t.textMuted, cursor:"pointer", fontSize:14, textAlign:"left" }}>{T.backHome}</button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <button onClick={() => setCurrentPage("home")} style={{ fontSize:13, color:currentPage === "home" ? t.accent : t.textSub, background:"none", border:"none", cursor:"pointer", fontWeight:currentPage === "home" ? 600 : 400 }}>{T.home}</button>
            <button onClick={() => { setCurrentPage("library"); loadLibrary() }} style={{ fontSize:13, color:currentPage === "library" ? t.accent : t.textSub, background:"none", border:"none", cursor:"pointer", fontWeight:currentPage === "library" ? 600 : 400 }}>{T.library}</button>
            <button onClick={() => setCurrentPage("history")} style={{ fontSize:13, color:currentPage === "history" ? t.accent : t.textSub, background:"none", border:"none", cursor:"pointer", fontWeight:currentPage === "history" ? 600 : 400 }}>Historique</button>
            <button onClick={() => setCurrentMode("home")} style={{ fontSize:13, color:t.textMuted, background:"none", border:"none", cursor:"pointer" }}>{T.backHome}</button>
          </div>
        )}
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <button onClick={() => driveConnected ? null : connectDrive()} style={{ fontSize:11, color:driveConnected ? "#4ade80" : t.textMuted, border:driveConnected ? "1px solid rgba(74,222,128,0.3)" : t.border, borderRadius:7, padding:"6px 10px", background:driveConnected ? "rgba(74,222,128,0.06)" : t.bgInput, cursor:driveConnected ? "default" : "pointer" }}>{driveConnected ? "✓ Drive" : "Drive"}</button>
          <button onClick={() => setShowStats(true)} style={{ fontSize:13, color:t.textSub, border:t.border, borderRadius:7, padding:"6px 10px", background:t.bgInput, cursor:"pointer" }}>📊</button>
          <div style={{ position:"relative" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowLangMenu(!showLangMenu)} style={{ fontSize:12, color:t.textSub, background:t.bgInput, border:t.border, borderRadius:7, padding:"6px 10px", cursor:"pointer" }}>{lang}</button>
            {showLangMenu && (
              <div style={{ position:"absolute", right:0, top:"calc(100% + 4px)", background:t.bgModal, border:t.border, borderRadius:8, padding:"4px 0", minWidth:70, boxShadow:"0 8px 24px rgba(0,0,0,0.5)", zIndex:100 }}>
                {(["EN","FR","ES","IT","DE"] as Lang[]).map(l => (
                  <button key={l} onClick={() => setLangAndSave(l)} style={{ width:"100%", padding:"7px 12px", background:lang === l ? "rgba(232,245,66,0.07)" : "none", border:"none", color:lang === l ? t.accent : t.text, cursor:"pointer", fontSize:12, textAlign:"left" }}>{l}</button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => setShowSettings(true)} style={{ fontSize:18, color:t.textSub, border:t.borderMed, borderRadius:7, padding:"7px 11px", background:t.bgInput, cursor:"pointer", lineHeight:1 }}>⚙</button>
        </div>
      </nav>

      {currentPage === "home" && (
        <div style={{ width:"100%", maxWidth:600, display:"flex", flexDirection:"column", gap:22, padding:"32px 16px 120px", position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, background:t.bgCard, border:t.border, borderRadius:12, padding:"12px 16px" }}>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:13, fontWeight:600, color:autoMode ? t.accent : t.text, marginBottom:2 }}>{autoMode ? `✦ ${T.autoMode}` : T.manualMode}</p>
              <p style={{ fontSize:11, color:t.textMuted }}>{autoMode ? T.autoModeDesc : "Contrôle total sur les paramètres"}</p>
            </div>
            <button onClick={() => setAutoMode(!autoMode)} style={{ width:44, height:24, borderRadius:12, border:"none", background:autoMode ? t.accent : "rgba(255,255,255,0.1)", cursor:"pointer", position:"relative", flexShrink:0 }}>
              <div style={{ width:18, height:18, borderRadius:"50%", background:autoMode ? "#0a0a0a" : "#888", position:"absolute", top:3, left:autoMode ? 23 : 3, transition:"left 0.2s" }}/>
            </button>
          </div>

          {analyzing && (
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:"rgba(232,245,66,0.04)", border:"1px solid rgba(232,245,66,0.18)", borderRadius:10 }}>
              <div style={{ width:16, height:16, borderRadius:"50%", border:`2px solid ${t.accent}`, borderTopColor:"transparent", flexShrink:0, animation:"spin 0.8s linear infinite" }}/>
              <p style={{ fontSize:12, color:t.accent }}>L'IA analyse ta vidéo... 🔍</p>
            </div>
          )}
          {autoAnalysisDesc && !analyzing && (
            <div style={{ padding:"12px 14px", background:"rgba(232,245,66,0.04)", border:"1px solid rgba(232,245,66,0.12)", borderRadius:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
                <span style={{ fontSize:10, color:t.accent, textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:700 }}>✦ Analyse IA</span>
                {detectedContentType && <span style={{ fontSize:10, padding:"2px 7px", borderRadius:10, background:"rgba(232,245,66,0.1)", color:t.accent }}>{detectedContentType}</span>}
              </div>
              <p style={{ fontSize:12, color:t.text, lineHeight:1.5 }}>{autoAnalysisDesc}</p>
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <p style={{ fontSize:12, color:t.textSub }}>{T.videos} ({videos.length})</p>
              <button onClick={() => document.getElementById("fileInput")?.click()} style={{ background:t.bgInput, border:t.borderMed, borderRadius:7, padding:"5px 10px", fontSize:11, color:t.textSub, cursor:"pointer" }}>{T.addFile}</button>
            </div>
            <input id="fileInput" type="file" accept="video/*" multiple style={{ display:"none" }} onChange={async e => { if (e.target.files) for (const f of Array.from(e.target.files)) await handleFileAdd(f) }}/>
            {videos.length > 0 ? (
              <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                {videos.map(v => (
                  <div key={v.id} style={{ display:"flex", alignItems:"center", gap:10, background:t.bgCard, border:t.border, borderRadius:9, padding:"9px 12px" }}>
                    {v.thumbnail ? <img src={v.thumbnail} style={{ width:46, height:30, borderRadius:4, objectFit:"cover", flexShrink:0 }}/> : <div style={{ width:46, height:30, borderRadius:4, background:t.bgThumb, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:12, color:t.textMuted }}>▶</span></div>}
                    <p style={{ flex:1, fontSize:12, color:t.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v.name}</p>
                    <button onClick={() => removeVideo(v.id)} style={{ background:"none", border:"none", color:t.textMuted, cursor:"pointer", fontSize:15, flexShrink:0 }}>✕</button>
                  </div>
                ))}
                <div style={{ border:`1px dashed ${dragOver ? t.accent : dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.1)"}`, borderRadius:9, padding:"12px", display:"flex", alignItems:"center", justifyContent:"center", gap:7, cursor:"pointer", color:dragOver ? t.accent : t.textMuted, fontSize:12, transition:"all 0.15s" }}
                  onClick={() => document.getElementById("fileInput")?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={async e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files) for (const f of Array.from(e.dataTransfer.files)) await handleFileAdd(f) }}>
                  {compressing ? T.compressing : T.addAnother}
                </div>
              </div>
            ) : (
              <div style={{ border:`1px dashed ${dragOver ? t.accent : dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.11)"}`, borderRadius:14, padding:"44px 20px", display:"flex", flexDirection:"column", alignItems:"center", gap:12, cursor:"pointer", background:dragOver ? "rgba(232,245,66,0.03)" : dark ? "rgba(255,255,255,0.008)" : "rgba(0,0,0,0.01)", transition:"all 0.15s" }}
                onClick={() => document.getElementById("fileInput")?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={async e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files) for (const f of Array.from(e.dataTransfer.files)) await handleFileAdd(f) }}>
                <div style={{ width:52, height:52, borderRadius:14, background:dragOver ? "rgba(232,245,66,0.1)" : "rgba(232,245,66,0.05)", border:`1px solid ${dragOver ? "rgba(232,245,66,0.4)" : "rgba(232,245,66,0.1)"}`, display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }}>
                  <span style={{ fontSize:20, color:t.accent }}>{dragOver ? "📥" : "↑"}</span>
                </div>
                <div style={{ textAlign:"center" }}>
                  <p style={{ fontSize:14, color:dragOver ? t.accent : t.textSub, marginBottom:3, fontWeight:500 }}>{dragOver ? "Lâche ta vidéo ici !" : T.dragVideo}</p>
                  <p style={{ fontSize:12, color:t.textMuted }}>{T.dragSub}</p>
                </div>
              </div>
            )}
            <div style={{ display:"flex", gap:7 }} onClick={e => e.stopPropagation()}>
              <input value={linkInput} onChange={e => setLinkInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLinkImport()} style={{ flex:1, background:t.bgInput, border:t.borderMed, borderRadius:8, padding:"9px 12px", fontSize:13, color:t.text, outline:"none" }} placeholder={T.pasteLink}/>
              <button onClick={handleLinkImport} disabled={importingLink} style={{ background:t.bgInput, border:t.borderMed, borderRadius:8, padding:"9px 12px", fontSize:13, color:t.textSub, cursor:"pointer", opacity:importingLink ? 0.6 : 1 }}>{importingLink ? "⏳" : T.import}</button>
            </div>
          </div>

          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            <p style={{ fontSize:11, color:t.textMuted, textTransform:"uppercase", letterSpacing:"0.06em" }}>{T.outputFormat}</p>
            <div style={{ display:"flex", gap:6 }}>
              {formats.map(f => {
                const fr: Record<string,[number,number,number,number]> = {"9:16":[7,2,6,16],"16:9":[2,7,16,6],"1:1":[5,5,10,10],"4:5":[6,4,8,12]}
                const [rx,ry,rw,rh] = fr[f]
                return (
                  <button key={f} onClick={() => setSelectedFormat(f)} style={{ flex:1, padding:"8px 4px", borderRadius:8, border:selectedFormat === f ? `1px solid rgba(232,245,66,0.55)` : t.borderMed, background:selectedFormat === f ? "rgba(232,245,66,0.08)" : t.bgInput, color:selectedFormat === f ? t.accent : t.textSub, cursor:"pointer", fontSize:11, fontWeight:selectedFormat === f ? 600 : 400, display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <rect x={rx} y={ry} width={rw} height={rh} stroke="currentColor" strokeWidth="1.5" rx="1.5"/>
                    </svg>
                    {f}
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {[["Beat sync","Beat sync"],["Sous-titres",T.subtitles],["Auto-zoom",T.autoZoom],["Speed ramp",T.speedRamp]].map(([key,label]) => (
              <Pill key={key} label={label} active={activeOptions.includes(key)} onClick={() => toggleOption(key)}/>
            ))}
            <Pill label={T.capsules} active={false} onClick={() => setShowCapsulesModal(true)}/>
            <Pill label={T.introOutro} active={addIntroOutro} onClick={() => setAddIntroOutro(!addIntroOutro)}/>
            <Pill label={watermark ? `✓ ${T.watermark}` : T.watermark} active={watermark} onClick={() => setWatermark(!watermark)}/>
            <button onClick={() => { setShowMusic(true); fetchTracks(searchQuery || "phonk") }} style={{ padding:"7px 15px", borderRadius:20, fontSize:12, cursor:"pointer", border:selectedMusic ? `1px solid rgba(232,245,66,0.55)` : t.borderMed, background:selectedMusic ? "rgba(232,245,66,0.08)" : t.bgPill, color:selectedMusic ? t.accent : t.textSub, display:"flex", alignItems:"center", gap:6, whiteSpace:"nowrap" }}>
              {selectedMusic ? <><img src={selectedMusic.album.cover_small} style={{ width:15, height:15, borderRadius:3 }}/>{selectedMusic.title}</> : T.addMusic}
            </button>
          </div>

          {activeOptions.includes("Sous-titres") && (
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              <p style={{ fontSize:11, color:t.textMuted, textTransform:"uppercase", letterSpacing:"0.05em" }}>{T.subtitleStyle}</p>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {[["tiktok","TikTok"],["yellow","Jaune"],["white_box","Fond blanc"],["neon","Néon"]].map(([val,label]) => (
                  <button key={val} onClick={() => setSubtitleStyle(val)} style={{ padding:"6px 13px", borderRadius:20, fontSize:11, cursor:"pointer", border:subtitleStyle === val ? `1px solid rgba(232,245,66,0.55)` : t.borderMed, background:subtitleStyle === val ? "rgba(232,245,66,0.08)" : t.bgPill, color:subtitleStyle === val ? t.accent : t.textSub }}>{label}</button>
                ))}
              </div>
            </div>
          )}

          {!autoMode && (
            <button onClick={() => setShowAdvanced(!showAdvanced)} style={{ display:"flex", alignItems:"center", gap:7, background:"none", border:t.border, borderRadius:9, padding:"10px 14px", cursor:"pointer", color:t.textSub, fontSize:12, width:"100%" }}>
              <span style={{ flex:1, textAlign:"left" }}>⚙ {T.advancedSettings}</span>
              <span style={{ fontSize:10 }}>{showAdvanced ? "▲" : "▼"}</span>
            </button>
          )}

          {!autoMode && showAdvanced && (
            <div style={{ display:"flex", flexDirection:"column", gap:14, background:t.bgCard, border:t.border, borderRadius:12, padding:"16px" }}>
              <div style={{ display:"flex", gap:10 }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:11, color:t.textMuted, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.05em" }}>{T.colorGrade}</p>
                  <select value={colorGrade} onChange={e => setColorGrade(e.target.value)} style={{ width:"100%", background:t.bgInput, border:t.borderMed, borderRadius:8, padding:"8px 10px", fontSize:12, color:t.text, outline:"none", cursor:"pointer", appearance:"none", WebkitAppearance:"none" }}>
                    {colorGrades.map(g => <option key={g} value={g}>{CGL[g]}</option>)}
                  </select>
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:11, color:t.textMuted, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.05em" }}>{T.transition}</p>
                  <select value={transition} onChange={e => setTransition(e.target.value)} style={{ width:"100%", background:t.bgInput, border:t.borderMed, borderRadius:8, padding:"8px 10px", fontSize:12, color:t.text, outline:"none", cursor:"pointer", appearance:"none", WebkitAppearance:"none" }}>
                    {transitions.map(tr => <option key={tr} value={tr}>{TRL[tr]}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:11, color:t.textMuted, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.05em" }}>{T.exportQuality}</p>
                  <select value={exportQuality} onChange={e => setExportQuality(e.target.value)} style={{ width:"100%", background:t.bgInput, border:t.borderMed, borderRadius:8, padding:"8px 10px", fontSize:12, color:t.text, outline:"none", cursor:"pointer", appearance:"none", WebkitAppearance:"none" }}>
                    {["720p","1080p","4K"].map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:11, color:t.textMuted, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.05em" }}>{T.exportCodec}</p>
                  <select value={exportCodec} onChange={e => setExportCodec(e.target.value)} style={{ width:"100%", background:t.bgInput, border:t.borderMed, borderRadius:8, padding:"8px 10px", fontSize:12, color:t.text, outline:"none", cursor:"pointer", appearance:"none", WebkitAppearance:"none" }}>
                    {["H264","H265","VP9"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <p style={{ fontSize:11, color:t.textMuted, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.05em" }}>{T.textOverlay}</p>
                <input value={textOverlay} onChange={e => setTextOverlay(e.target.value)} style={{ width:"100%", background:t.bgInput, border:t.borderMed, borderRadius:8, padding:"8px 12px", fontSize:12, color:t.text, outline:"none" }} placeholder="Ex: CLIMB AGENCY"/>
              </div>
              <Pill label={stabilize ? `✓ ${T.stabilize}` : T.stabilize} active={stabilize} onClick={() => setStabilize(!stabilize)}/>
              {(activeOptions.includes("Auto-zoom") || activeOptions.includes("Speed ramp") || selectedMusic) && (
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {activeOptions.includes("Auto-zoom") && (<div><div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}><p style={{ fontSize:11, color:t.textMuted }}>{T.zoomIntensity}</p><span style={{ fontSize:11, color:t.accent, fontWeight:600 }}>{zoomIntensity}%</span></div><input type="range" min={10} max={100} value={zoomIntensity} onChange={e => setZoomIntensity(Number(e.target.value))} style={{ width:"100%", accentColor:t.accent }}/></div>)}
                  {activeOptions.includes("Speed ramp") && (<div><div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}><p style={{ fontSize:11, color:t.textMuted }}>{T.speedIntensity}</p><span style={{ fontSize:11, color:t.accent, fontWeight:600 }}>{speedIntensity}%</span></div><input type="range" min={10} max={100} value={speedIntensity} onChange={e => setSpeedIntensity(Number(e.target.value))} style={{ width:"100%", accentColor:t.accent }}/></div>)}
                  {selectedMusic && (<div><div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}><p style={{ fontSize:11, color:t.textMuted }}>{T.vocalVolume}</p><span style={{ fontSize:11, color:t.accent, fontWeight:600 }}>{vocalVolume}%</span></div><input type="range" min={0} max={100} value={vocalVolume} onChange={e => setVocalVolume(Number(e.target.value))} style={{ width:"100%", accentColor:t.accent }}/></div>)}
                </div>
              )}
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={() => setShowPresets(true)} style={{ padding:"6px 12px", borderRadius:8, fontSize:11, border:t.borderMed, background:t.bgInput, color:t.textSub, cursor:"pointer" }}>⚡ {T.presets}{presets.length > 0 ? ` (${presets.length})` : ""}</button>
                <button onClick={() => setShowSavePreset(true)} style={{ padding:"6px 12px", borderRadius:8, fontSize:11, border:t.borderMed, background:t.bgInput, color:t.textSub, cursor:"pointer" }}>+ {T.savePreset}</button>
              </div>
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                <p style={{ fontSize:12, color:t.textMuted }}>{T.description}</p>
                {promptHistory.length > 0 && <button onClick={e => { e.stopPropagation(); setShowPromptHistory(!showPromptHistory) }} style={{ fontSize:10, color:t.textMuted, background:t.bgInput, border:t.border, borderRadius:5, padding:"2px 7px", cursor:"pointer" }}>{T.promptHistory}</button>}
              </div>
              <div style={{ display:"flex", gap:5 }}>
                <button onClick={handlePreviewTimestamps} disabled={loadingTimestamps || videos.length === 0} style={{ fontSize:11, color:t.textSub, background:t.bgInput, border:t.borderMed, borderRadius:6, padding:"4px 9px", cursor:"pointer", opacity:videos.length === 0 ? 0.35 : 1 }}>{loadingTimestamps ? "⏳" : T.preview}</button>
                <button onClick={() => setShowPromptHelper(true)} style={{ fontSize:11, color:t.accent, background:"rgba(232,245,66,0.06)", border:"1px solid rgba(232,245,66,0.2)", borderRadius:6, padding:"4px 9px", cursor:"pointer" }}>✦ {T.promptHelper}</button>
              </div>
            </div>
            {showPromptHistory && promptHistory.length > 0 && (
              <div onClick={e => e.stopPropagation()} style={{ background:t.bgModal, border:t.border, borderRadius:8, overflow:"hidden" }}>
                {promptHistory.map((h, i) => <button key={i} onClick={() => { setPromptText(h); setShowPromptHistory(false) }} style={{ width:"100%", padding:"8px 13px", background:"none", border:"none", borderBottom:i < promptHistory.length-1 ? t.border : "none", color:t.textSub, cursor:"pointer", fontSize:12, textAlign:"left", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{h}</button>)}
              </div>
            )}
            <textarea value={promptText} onChange={e => setPromptText(e.target.value)} style={{ width:"100%", background:t.bgInput, border:t.borderMed, borderRadius:8, padding:"11px 13px", fontSize:13, color:t.text, outline:"none", resize:"none", height:52, lineHeight:"1.5", fontFamily:"sans-serif", boxSizing:"border-box" }}
              placeholder={autoMode ? "Optionnel — l'IA a déjà analysé ta vidéo" : "Ex : 1 clip 20s edit foot, cuts sur le beat..."}/>
            {capsuleModeActive && (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", background:"rgba(232,245,66,0.06)", border:"1px solid rgba(232,245,66,0.2)", borderRadius:8, padding:"7px 11px" }}>
                <span style={{ fontSize:11, color:t.accent, fontWeight:600 }}>Mode capsules · {capsulesCount} clips</span>
                <button onClick={() => setCapsuleModeActive(false)} style={{ background:"none", border:"none", color:t.textMuted, fontSize:13, cursor:"pointer", padding:"0 2px", lineHeight:1 }}>✕</button>
              </div>
            )}
            <button onClick={capsuleModeActive ? handleGenerateCapsules : handleGenerate} disabled={generating || videos.length === 0} style={{ width:"100%", background:generating ? "rgba(232,245,66,0.35)" : videos.length === 0 ? "rgba(232,245,66,0.15)" : t.accent, color:"#0a0a0a", fontWeight:700, fontSize:14, borderRadius:10, padding:"13px", border:"none", cursor:generating || videos.length === 0 ? "not-allowed" : "pointer", boxShadow:videos.length > 0 && !generating ? "0 0 24px rgba(232,245,66,0.2)" : "none" }}>
              {generating ? T.generating : capsuleModeActive ? `✦ Générer capsules (${capsulesCount})` : `✦ ${T.generate}`}
            </button>
            <p style={{ fontSize:10, color:t.textHint, textAlign:"right" }}>{T.cmdEnterHint}</p>
          </div>

          {generating && (
            <div style={{ display:"flex", flexDirection:"column", gap:10, background:t.bgCard, border:t.border, borderRadius:12, padding:"16px" }}>
              <p style={{ fontSize:13, color:t.text, fontWeight:500 }}>{generatingServerMsg || generatingMsgs[generatingMsgIndex]}</p>
              <div style={{ width:"100%", height:4, background:dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)", borderRadius:4 }}>
                <div style={{ width:`${progress}%`, height:"100%", background:`linear-gradient(90deg, ${t.accent}, rgba(232,245,66,0.5))`, borderRadius:4, transition:"width 0.5s ease", boxShadow:"0 0 8px rgba(232,245,66,0.35)" }}/>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:11, color:t.textMuted }}>{autoMode && detectedContentType ? `✦ Mode Auto · ${detectedContentType}` : "Mode Manuel"}</span>
                <span style={{ fontSize:11, color:t.accent, fontWeight:600 }}>{estimatedRemaining || `${progress}%`}</span>
              </div>
            </div>
          )}

          {hasGenerated && generatedClips.length > 0 && (
            <>
              <div style={{ width:"100%", height:1, background:dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)" }}/>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <p style={{ fontSize:11, color:t.textHint, textTransform:"uppercase", letterSpacing:"0.07em" }}>{T.generatedClips} — {generatedClips.length}</p>
                  {generatedClips.length > 1 && <button onClick={downloadAllClips} style={{ fontSize:11, color:t.accent, background:"rgba(232,245,66,0.06)", border:"1px solid rgba(232,245,66,0.18)", borderRadius:6, padding:"4px 9px", cursor:"pointer" }}>↓ {T.downloadAll}</button>}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))", gap:10 }}>
                  {generatedClips.map((clip, i) => <ClipCard key={i} clip={clip} index={i}/>)}
                </div>
                <button onClick={() => { setVideos([]); setPromptText(""); setGeneratedClips([]); setHasGenerated(false); setLastGeneratedClip(null); window.scrollTo({ top:0, behavior:"smooth" }) }} style={{ marginTop:4, padding:"11px", borderRadius:10, border:t.border, background:"none", color:t.textSub, fontSize:13, cursor:"pointer" }}>
                  Générer d'autres clips
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {currentPage === "library" && (
        <div style={{ width:"100%", maxWidth:800, display:"flex", flexDirection:"column", gap:22, padding:"32px 16px 120px", position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:9 }}>
              {folderStack.length > 0 && <button onClick={() => setFolderStack(prev => prev.slice(0,-1))} style={{ background:"none", border:"none", color:t.textSub, cursor:"pointer", fontSize:13 }}>← {T.back}</button>}
              <p style={{ fontSize:16, fontWeight:600, color:t.text }}>{currentFolderData ? currentFolderData.name : T.library}</p>
            </div>
            <div style={{ display:"flex", gap:7 }}>
              {currentFolder && <button onClick={() => { setNewFolderParent(currentFolder); setShowNewFolder(true) }} style={{ background:t.bgInput, border:t.borderMed, borderRadius:7, padding:"6px 10px", fontSize:11, color:t.textSub, cursor:"pointer" }}>{T.newSubfolder}</button>}
              <button onClick={() => { setNewFolderParent(null); setShowNewFolder(true) }} style={{ background:t.bgInput, border:t.borderMed, borderRadius:7, padding:"6px 11px", fontSize:12, color:t.textSub, cursor:"pointer" }}>{T.newFolder}</button>
            </div>
          </div>
          {displayedFolders.length > 0 && (
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              <p style={{ fontSize:10, color:t.textHint, textTransform:"uppercase", letterSpacing:"0.06em" }}>{currentFolder ? T.subfolders : T.folders}</p>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))", gap:9 }}>
                {displayedFolders.map(folder => (
                  <div key={folder.id} style={{ position:"relative" }}>
                    <div onClick={() => setFolderStack(prev => [...prev, folder.id])} style={{ background:t.bgCard, border:t.border, borderRadius:9, padding:"12px 13px", cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ width:28, height:28, borderRadius:7, background:"rgba(232,245,66,0.05)", border:"1px solid rgba(232,245,66,0.08)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}><span style={{ fontSize:12, opacity:0.6 }}>▣</span></div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:12, color:t.text, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{folder.name}</p>
                        <p style={{ fontSize:10, color:t.textMuted }}>{clips.filter(c => c.folder_id === folder.id).length} clip(s)</p>
                      </div>
                      <button onClick={e => { e.stopPropagation(); setFolderMenu(folderMenu === folder.id ? null : folder.id) }} style={{ background:"none", border:"none", color:t.textMuted, cursor:"pointer", fontSize:15 }}>⋯</button>
                    </div>
                    {folderMenu === folder.id && (
                      <div onClick={e => e.stopPropagation()} style={{ position:"absolute", right:0, top:"100%", zIndex:50, background:t.bgModal, border:t.border, borderRadius:8, padding:"4px 0", minWidth:120, boxShadow:"0 6px 24px rgba(0,0,0,0.4)" }}>
                        <button onClick={() => { setShowShareModal(folder.id); setFolderMenu(null) }} style={{ width:"100%", padding:"7px 13px", background:"none", border:"none", color:t.text, cursor:"pointer", fontSize:12, textAlign:"left" }}>{T.share}</button>
                        <button onClick={() => deleteFolder(folder.id)} style={{ width:"100%", padding:"7px 13px", background:"none", border:"none", color:"#e8453a", cursor:"pointer", fontSize:12, textAlign:"left" }}>{T.delete}</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <p style={{ fontSize:10, color:t.textHint, textTransform:"uppercase", letterSpacing:"0.06em" }}>{currentFolder ? T.clipsInFolder : T.clipsNoFolder} — {displayedClips.length}</p>
            {displayedClips.length === 0 ? (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:11, padding:"56px 0" }}>
                <div style={{ width:50, height:50, borderRadius:13, background:t.bgCard, border:t.border, display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:20, opacity:0.3 }}>▶</span></div>
                <p style={{ fontSize:13, color:t.textMuted }}>{T.noClips}</p>
                <button onClick={() => setCurrentPage("home")} style={{ fontSize:12, color:t.accent, background:"rgba(232,245,66,0.06)", border:"1px solid rgba(232,245,66,0.15)", borderRadius:8, padding:"7px 15px", cursor:"pointer" }}>{T.generateFirst}</button>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(150px, 1fr))", gap:10 }}>
                {displayedClips.map((clip, i) => (
                  <div key={clip.id} style={{ background:t.bgCard, border:t.border, borderRadius:11, overflow:"hidden", display:"flex", flexDirection:"column", position:"relative" }}>
                    <div onClick={() => setVideoPlayerClip(clip)} style={{ aspectRatio:"9/16", background:t.bgThumb, overflow:"hidden", cursor:"pointer", position:"relative" }}>
                      {clip.thumbnail ? <img src={clip.thumbnail} style={{ width:"100%", height:"100%", objectFit:"cover" }}/> : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:28, opacity:0.4 }}>▶</span></div>}
                      <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.18)", opacity:0, transition:"opacity 0.15s" }} onMouseEnter={e => (e.currentTarget.style.opacity="1")} onMouseLeave={e => (e.currentTarget.style.opacity="0")}><span style={{ fontSize:32, color:"#fff" }}>▶</span></div>
                    </div>
                    <div style={{ padding:"9px 10px 11px", display:"flex", flexDirection:"column", gap:5 }}>
                      {renamingClip === clip.id ? (
                        <div style={{ display:"flex", gap:4 }}>
                          <input value={renameValue} onChange={e => setRenameValue(e.target.value)} onKeyDown={e => { if (e.key === "Enter") renameClip(clip.id); if (e.key === "Escape") setRenamingClip(null) }} style={{ flex:1, background:t.bgInput, border:t.borderMed, borderRadius:5, padding:"4px 7px", fontSize:11, color:t.text, outline:"none" }} autoFocus/>
                          <button onClick={() => renameClip(clip.id)} style={{ background:t.accent, border:"none", borderRadius:5, padding:"4px 7px", fontSize:11, color:"#0a0a0a", cursor:"pointer", fontWeight:700 }}>✓</button>
                        </div>
                      ) : (
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                          <p style={{ fontSize:11, color:t.text, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>{clip.name}</p>
                          <button onClick={e => { e.stopPropagation(); setClipMenu(clipMenu === clip.id ? null : clip.id) }} style={{ background:"none", border:"none", color:t.textMuted, cursor:"pointer", fontSize:15, flexShrink:0 }}>⋯</button>
                        </div>
                      )}
                      {clipMenu === clip.id && (
                        <div onClick={e => e.stopPropagation()} style={{ position:"absolute", right:7, bottom:46, zIndex:50, background:t.bgModal, border:t.border, borderRadius:8, padding:"4px 0", minWidth:130, boxShadow:"0 6px 24px rgba(0,0,0,0.4)" }}>
                          <button onClick={() => { setRenamingClip(clip.id); setRenameValue(clip.name); setClipMenu(null) }} style={{ width:"100%", padding:"7px 13px", background:"none", border:"none", color:t.text, cursor:"pointer", fontSize:12, textAlign:"left" }}>{T.rename}</button>
                          <button onClick={() => { downloadClip(clip); setClipMenu(null) }} style={{ width:"100%", padding:"7px 13px", background:"none", border:"none", color:t.text, cursor:"pointer", fontSize:12, textAlign:"left" }}>{T.download}</button>
                          <button onClick={() => { shareNative(clip); setClipMenu(null) }} style={{ width:"100%", padding:"7px 13px", background:"none", border:"none", color:t.text, cursor:"pointer", fontSize:12, textAlign:"left" }}>{T.shareNative}</button>
                          <button onClick={() => { exportToDrive(clip); setClipMenu(null) }} style={{ width:"100%", padding:"7px 13px", background:"none", border:"none", color:"#4285f4", cursor:"pointer", fontSize:12, textAlign:"left" }}>{driveConnected ? T.exportDrive : T.connectDrive}</button>
                          <button onClick={() => { setShowMoveModal(clip.id); setClipMenu(null) }} style={{ width:"100%", padding:"7px 13px", background:"none", border:"none", color:t.text, cursor:"pointer", fontSize:12, textAlign:"left" }}>{T.move}</button>
                          <button onClick={() => { shareClipPublic(clip); setClipMenu(null) }} style={{ width:"100%", padding:"7px 13px", background:"none", border:"none", color:t.textSub, cursor:"pointer", fontSize:12, textAlign:"left" }}>{T.copyLink}</button>
                          <button onClick={() => deleteClip(clip.id)} style={{ width:"100%", padding:"7px 13px", background:"none", border:"none", color:"#e8453a", cursor:"pointer", fontSize:12, textAlign:"left" }}>{T.delete}</button>
                        </div>
                      )}
                      <button onClick={() => exportToDrive(clip)} disabled={exportingDrive === clip.id} style={{ padding:7, borderRadius:7, fontSize:11, border:driveConnected ? "1px solid rgba(66,133,244,0.3)" : t.borderMed, background:driveConnected ? "rgba(66,133,244,0.05)" : t.bgInput, color:exportingDrive === clip.id ? t.textMuted : driveConnected ? "#4285f4" : t.textSub, cursor:"pointer", opacity:exportingDrive === clip.id ? 0.6 : 1 }}>{getDriveButtonLabel(clip.id)}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {currentPage === "history" && (
        <div style={{ width:"100%", maxWidth:600, display:"flex", flexDirection:"column", gap:18, padding:"32px 16px 120px", position:"relative", zIndex:1 }}>
          <p style={{ fontSize:16, fontWeight:600, color:t.text }}>{T.historyTitle}</p>
          {generationHistory.length === 0 ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:11, padding:"56px 0" }}>
              <span style={{ fontSize:32, opacity:0.3 }}>⏺</span>
              <p style={{ fontSize:13, color:t.textMuted }}>Aucune génération pour l'instant</p>
              <button onClick={() => setCurrentPage("home")} style={{ fontSize:12, color:t.accent, background:"rgba(232,245,66,0.06)", border:"1px solid rgba(232,245,66,0.15)", borderRadius:8, padding:"7px 15px", cursor:"pointer" }}>{T.generateFirst}</button>
            </div>
          ) : generationHistory.map(entry => (
            <div key={entry.id} style={{ background:t.bgCard, border:t.border, borderRadius:12, padding:"14px 16px", display:"flex", flexDirection:"column", gap:10 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                  <span style={{ fontSize:11, color:t.textMuted }}>{entry.date}</span>
                  {entry.contentType && <span style={{ fontSize:10, padding:"2px 7px", borderRadius:10, background:"rgba(232,245,66,0.08)", color:t.accent }}>{entry.contentType}</span>}
                </div>
                <span style={{ fontSize:11, color:t.textMuted }}>{entry.clipsCount || 0} clip(s)</span>
              </div>
              {entry.prompt && <p style={{ fontSize:12, color:t.text, lineHeight:1.4 }}>{entry.prompt}</p>}
              {entry.settings && <p style={{ fontSize:10, color:t.textMuted }}>{entry.settings.format} · {entry.settings.colorGrade || "auto"} · {entry.settings.transition || "auto"}</p>}
              <button onClick={() => { if (entry.prompt) setPromptText(entry.prompt); setCurrentPage("home") }} style={{ padding:"7px 12px", borderRadius:8, fontSize:11, border:"1px solid rgba(232,245,66,0.22)", background:"rgba(232,245,66,0.05)", color:t.accent, cursor:"pointer", alignSelf:"flex-start" }}>↺ Réutiliser ces settings</button>
            </div>
          ))}
        </div>
      )}

        </div>
      )}

      {currentMode === "upscaling" && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", minHeight:"100vh", width:"100%" }}>
          {dark && <>
            <NoiseBg/>
            <div style={{ position:"fixed", inset:0, backgroundImage:"repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.007) 3px, rgba(255,255,255,0.007) 4px)", pointerEvents:"none", zIndex:0 }}/>
          </>}
          <nav style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 16px", borderBottom:t.border, background:t.bgNav, backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", position:"sticky", top:0, zIndex:50 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <ClimbLogo size={26}/>
              <div style={{ display:"flex", flexDirection:"column", lineHeight:1, gap:1 }}>
                <span style={{ color:t.text, fontWeight:700, fontSize:12, letterSpacing:"0.1em" }}>CLIMB</span>
                <span style={{ color:t.textMuted, fontSize:7, letterSpacing:"0.2em" }}>CLIP</span>
              </div>
            </div>
            <button onClick={() => { setCurrentMode("home"); setUpscaleMediaType(null); setUpscaleFile(null); setUpscalePreviewUrl(null); setUpscaleResultUrl(null); setUpscaleError(null) }}
              style={{ fontSize:13, color:t.textMuted, background:"none", border:t.border, borderRadius:8, padding:"6px 12px", cursor:"pointer" }}>{T.backHome}</button>
            <div style={{ display:"flex", alignItems:"center", gap:6 }} onClick={e => e.stopPropagation()}>
              <div style={{ position:"relative" }}>
                <button onClick={() => setShowLangMenu(!showLangMenu)} style={{ fontSize:12, color:t.textSub, background:t.bgInput, border:t.border, borderRadius:7, padding:"6px 10px", cursor:"pointer" }}>{lang}</button>
                {showLangMenu && (
                  <div style={{ position:"absolute", right:0, top:"calc(100% + 4px)", background:t.bgModal, border:t.border, borderRadius:8, padding:"4px 0", minWidth:70, boxShadow:"0 8px 24px rgba(0,0,0,0.5)", zIndex:100 }}>
                    {(["EN","FR","ES","IT","DE"] as Lang[]).map(l => (
                      <button key={l} onClick={() => setLangAndSave(l)} style={{ width:"100%", padding:"7px 12px", background:lang===l?"rgba(232,245,66,0.07)":"none", border:"none", color:lang===l?t.accent:t.text, cursor:"pointer", fontSize:12, textAlign:"left" }}>{l}</button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => setShowSettings(true)} style={{ fontSize:18, color:t.textSub, border:t.borderMed, borderRadius:7, padding:"7px 11px", background:t.bgInput, cursor:"pointer", lineHeight:1 }}>⚙</button>
            </div>
          </nav>
          <div style={{ width:"100%", padding:"10px 20px", background:"linear-gradient(90deg, rgba(232,245,66,0.07) 0%, transparent 100%)", borderBottom:"1px solid rgba(232,245,66,0.1)", display:"flex", alignItems:"center", gap:10, zIndex:1 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:t.accent, boxShadow:`0 0 8px ${t.accent}80` }} />
            <span style={{ fontSize:12, fontWeight:600, color:t.text }}>Upscaling IA</span>
            <span style={{ fontSize:11, color:t.textMuted }}>Sharp lanczos3 · x2/x4</span>
          </div>

          <div style={{ width:"100%", maxWidth:600, display:"flex", flexDirection:"column", gap:16, padding:"24px 16px 120px", position:"relative", zIndex:1 }}>

            {/* Step 1 — type selection */}
            {!upscaleMediaType && !upscaleResultUrl && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:4 }}>
                {([
                  { type:"image" as const, icon:"📷", label:"Photo", desc1:"JPG, PNG, WebP", desc2:"Swin2SR · x2 ou x4" },
                  { type:"video" as const, icon:"🎬", label:"Vidéo", desc1:"MP4, MOV", desc2:"Upscaling · 1080p ou 4K" },
                ]).map(({ type, icon, label, desc1, desc2 }) => (
                  <button key={type} onClick={() => setUpscaleMediaType(type)}
                    style={{ display:"flex", flexDirection:"column", alignItems:"flex-start", gap:12, padding:"22px 18px", background:t.bgCard, border:t.border, borderRadius:16, cursor:"pointer", textAlign:"left" }}>
                    <span style={{ fontSize:34 }}>{icon}</span>
                    <div>
                      <p style={{ fontSize:15, fontWeight:700, color:t.text, marginBottom:5 }}>{label}</p>
                      <p style={{ fontSize:11, color:t.textMuted, lineHeight:1.55 }}>{desc1}</p>
                      <p style={{ fontSize:11, color:t.textMuted, lineHeight:1.55 }}>{desc2}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2 — upload + configure */}
            {upscaleMediaType && !upscaleResultUrl && (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <button onClick={() => { setUpscaleMediaType(null); setUpscaleFile(null); setUpscalePreviewUrl(null); setUpscaleError(null) }}
                    style={{ background:"none", border:"none", color:t.textMuted, cursor:"pointer", fontSize:18, lineHeight:1, padding:"0 2px", display:"flex", alignItems:"center" }}>←</button>
                  <span style={{ fontSize:14, fontWeight:600, color:t.text }}>{upscaleMediaType === "image" ? "📷 Photo" : "🎬 Vidéo"}</span>
                </div>

                {!upscaleFile && !upscaling && (
                  <label style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:14, padding:"52px 20px", border:`2px dashed rgba(232,245,66,0.2)`, borderRadius:16, background:t.bgCard, cursor:"pointer" }}>
                    <input type="file" accept={upscaleMediaType === "image" ? ".jpg,.jpeg,.png,.webp" : ".mp4,.mov"} style={{ display:"none" }} onChange={e => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      setUpscaleFile(f); setUpscaleResultUrl(null); setUpscaleError(null); setUpscaleSlider(50)
                      const reader = new FileReader()
                      reader.onload = ev => setUpscalePreviewUrl(ev.target?.result as string)
                      reader.readAsDataURL(f)
                    }} />
                    <span style={{ fontSize:38, opacity:0.5 }}>{upscaleMediaType === "image" ? "🖼" : "🎬"}</span>
                    <div style={{ textAlign:"center" }}>
                      <p style={{ fontSize:14, color:t.text, fontWeight:500 }}>Clique ou glisse ton fichier</p>
                      <p style={{ fontSize:11, color:t.textMuted, marginTop:4 }}>{upscaleMediaType === "image" ? "JPG, PNG, WebP · max 20MB" : "MP4, MOV · max 200MB"}</p>
                    </div>
                  </label>
                )}

                {upscaleFile && (
                  <div style={{ background:t.bgCard, border:t.border, borderRadius:12, padding:"13px 16px", display:"flex", alignItems:"center", gap:12 }}>
                    <span style={{ fontSize:20 }}>{upscaleMediaType === "image" ? "🖼" : "🎬"}</span>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:13, color:t.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{upscaleFile.name}</p>
                      <p style={{ fontSize:11, color:t.textMuted }}>{(upscaleFile.size/1024/1024).toFixed(1)} MB</p>
                    </div>
                    {!upscaling && (
                      <button onClick={() => { setUpscaleFile(null); setUpscalePreviewUrl(null); setUpscaleError(null) }}
                        style={{ background:"none", border:"none", color:t.textMuted, cursor:"pointer", fontSize:15 }}>✕</button>
                    )}
                  </div>
                )}

                {upscaleFile && !upscaling && (
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    <p style={{ fontSize:11, color:t.textMuted }}>Qualité de sortie</p>
                    <div style={{ display:"flex", gap:10 }}>
                      {(upscaleMediaType === "image"
                        ? [{ v:2 as const, label:"x2", sub:"2× résolution" }, { v:4 as const, label:"x4", sub:"4× résolution" }]
                        : [{ v:2 as const, label:"1080p", sub:"Full HD" }, { v:4 as const, label:"4K", sub:"Ultra HD" }]
                      ).map(({ v, label, sub }) => (
                        <button key={v} onClick={() => setUpscaleScale(v)}
                          style={{ flex:1, padding:"11px 8px", borderRadius:10, border:upscaleScale===v ? "1px solid rgba(232,245,66,0.5)" : t.border, background:upscaleScale===v ? "rgba(232,245,66,0.07)" : t.bgCard, color:upscaleScale===v ? t.accent : t.textSub, cursor:"pointer", textAlign:"center" }}>
                          <p style={{ fontSize:14, fontWeight:upscaleScale===v ? 700 : 400 }}>{label}</p>
                          <p style={{ fontSize:10, color:upscaleScale===v ? "rgba(232,245,66,0.6)" : t.textMuted, marginTop:2 }}>{sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {upscaleFile && !upscaling && (
                  <button onClick={handleUpscale} style={{ width:"100%", padding:"16px", borderRadius:14, border:"none", background:t.accent, color:"#0a0a0a", fontSize:15, fontWeight:700, cursor:"pointer", marginTop:4 }}>
                    Améliorer ↑
                  </button>
                )}

                {upscaling && (
                  <div style={{ display:"flex", flexDirection:"column", gap:10, padding:"8px 0" }}>
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <p style={{ fontSize:12, color:t.textSub }}>Upscaling en cours...</p>
                      <p style={{ fontSize:11, color:t.textMuted }}>{Math.round(upscaleProgress)}%</p>
                    </div>
                    <div style={{ height:3, background:"rgba(255,255,255,0.06)", borderRadius:2, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${upscaleProgress}%`, background:t.accent, borderRadius:2, transition:"width 0.6s ease" }} />
                    </div>
                    <p style={{ fontSize:11, color:t.textMuted }}>{upscaleMediaType === "image" ? "Swin2SR via Hugging Face..." : "FFmpeg lanczos + unsharp..."}</p>
                  </div>
                )}

                {upscaleError && (
                  <div style={{ padding:"12px 16px", background:"rgba(255,107,107,0.07)", border:"1px solid rgba(255,107,107,0.2)", borderRadius:10 }}>
                    <p style={{ fontSize:12, color:"#ff6b6b" }}>{upscaleError}</p>
                  </div>
                )}
              </>
            )}

            {/* Step 3 — result */}
            {upscaleResultUrl && (
              <>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <button onClick={() => { setUpscaleResultUrl(null); setUpscaleFile(null); setUpscalePreviewUrl(null); setUpscaleError(null); setUpscaleRenaming(false) }}
                    style={{ background:"none", border:"none", color:t.textMuted, cursor:"pointer", fontSize:18, lineHeight:1, padding:"0 2px" }}>←</button>
                  {upscaleRenaming ? (
                    <input value={upscaleResultName} onChange={e => setUpscaleResultName(e.target.value)}
                      onBlur={() => setUpscaleRenaming(false)}
                      onKeyDown={e => e.key === "Enter" && setUpscaleRenaming(false)}
                      autoFocus
                      style={{ flex:1, background:"none", border:"none", borderBottom:`1px solid ${t.accent}`, color:t.text, fontSize:14, fontWeight:600, outline:"none", padding:"2px 0" }} />
                  ) : (
                    <span style={{ fontSize:14, fontWeight:600, color:t.text, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{upscaleResultName}</span>
                  )}
                  <span style={{ fontSize:10, padding:"2px 8px", borderRadius:8, background:"rgba(232,245,66,0.1)", color:t.accent, flexShrink:0 }}>
                    {upscaleMediaType === "video" ? (upscaleScale === 2 ? "1080p" : "4K") : `x${upscaleScale}`}
                  </span>
                </div>

                {upscaleMediaType === "image" && upscalePreviewUrl && upscaleResultUrl && (
                  <>
                    <p style={{ fontSize:11, color:t.textMuted }}>Glisse ← → pour comparer avant / après</p>
                    <div
                      style={{ position:"relative", borderRadius:12, overflow:"hidden", userSelect:"none", lineHeight:0, cursor:"col-resize", touchAction:"none" }}
                      onPointerDown={makeSliderHandler(setUpscaleSlider)}>
                      <img src={upscaleResultUrl} style={{ width:"100%", display:"block" }} alt="après" draggable={false} />
                      <div style={{ position:"absolute", top:0, left:0, bottom:0, width:`${upscaleSlider}%`, overflow:"hidden", pointerEvents:"none" }}>
                        <img src={upscalePreviewUrl} style={{ width:`${10000/upscaleSlider}%`, maxWidth:"none", display:"block" }} alt="avant" draggable={false} />
                      </div>
                      <div style={{ position:"absolute", top:0, bottom:0, left:`${upscaleSlider}%`, width:2, background:"rgba(255,255,255,0.85)", transform:"translateX(-50%)", pointerEvents:"none" }} />
                      <div style={{ position:"absolute", top:"50%", left:`${upscaleSlider}%`, transform:"translate(-50%,-50%)", width:32, height:32, borderRadius:"50%", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 10px rgba(0,0,0,0.55)", fontSize:12, pointerEvents:"none", fontWeight:600, color:"#333" }}>↔</div>
                      <div style={{ position:"absolute", top:8, left:10, padding:"2px 8px", background:"rgba(0,0,0,0.65)", borderRadius:5, fontSize:10, color:"rgba(255,255,255,0.85)", pointerEvents:"none" }}>Avant</div>
                      <div style={{ position:"absolute", top:8, right:10, padding:"2px 8px", background:"rgba(0,0,0,0.65)", borderRadius:5, fontSize:10, color:t.accent, pointerEvents:"none", fontWeight:600 }}>×{upscaleScale}</div>
                    </div>
                  </>
                )}

                {upscaleMediaType === "video" && upscalePreviewUrl && upscaleResultUrl && (
                  <>
                    <p style={{ fontSize:11, color:t.textMuted }}>Glisse ← → pour redimensionner avant / après</p>
                    <div
                      style={{ position:"relative", display:"flex", borderRadius:12, overflow:"hidden", userSelect:"none", background:"#000", cursor:"col-resize", touchAction:"none" }}
                      onPointerDown={makeSliderHandler(setUpscaleSlider)}>
                      <div style={{ width:`${upscaleSlider}%`, flexShrink:0, overflow:"hidden", pointerEvents:"none" }}>
                        <video src={upscalePreviewUrl} autoPlay loop muted playsInline style={{ width:`${10000/upscaleSlider}%`, maxWidth:"none", display:"block" }} />
                      </div>
                      <div style={{ flex:1, overflow:"hidden", pointerEvents:"none" }}>
                        <video src={upscaleResultUrl} autoPlay loop muted playsInline style={{ width:`${10000/(100-upscaleSlider)}%`, maxWidth:"none", display:"block", marginLeft:`${-(upscaleSlider/(100-upscaleSlider))*100}%` }} />
                      </div>
                      <div style={{ position:"absolute", top:0, bottom:0, left:`${upscaleSlider}%`, width:2, background:"rgba(255,255,255,0.85)", transform:"translateX(-50%)", pointerEvents:"none", zIndex:2 }} />
                      <div style={{ position:"absolute", top:"50%", left:`${upscaleSlider}%`, transform:"translate(-50%,-50%)", width:32, height:32, borderRadius:"50%", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 10px rgba(0,0,0,0.55)", fontSize:12, pointerEvents:"none", fontWeight:600, color:"#333", zIndex:2 }}>↔</div>
                      <div style={{ position:"absolute", top:8, left:10, padding:"2px 8px", background:"rgba(0,0,0,0.65)", borderRadius:5, fontSize:10, color:"rgba(255,255,255,0.85)", pointerEvents:"none", zIndex:2 }}>Avant</div>
                      <div style={{ position:"absolute", top:8, right:10, padding:"2px 8px", background:"rgba(0,0,0,0.65)", borderRadius:5, fontSize:10, color:t.accent, pointerEvents:"none", fontWeight:600, zIndex:2 }}>{upscaleScale===2?"1080p":"4K"}</div>
                    </div>
                  </>
                )}

                <button onClick={() => { const a = document.createElement("a"); a.href = upscaleResultUrl!; a.download = upscaleResultName||"upscaled"; document.body.appendChild(a); a.click(); document.body.removeChild(a) }}
                  style={{ width:"100%", padding:"16px", borderRadius:14, border:"none", background:t.accent, color:"#0a0a0a", fontSize:15, fontWeight:700, cursor:"pointer" }}>
                  Télécharger
                </button>

                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
                  <button onClick={() => shareNative({ name:upscaleResultName||"upscaled", storageUrl:upscaleResultUrl||"", storage_url:upscaleResultUrl||"" })}
                    style={{ padding:"12px 8px", borderRadius:12, border:t.border, background:t.bgCard, color:t.textSub, fontSize:12, cursor:"pointer" }}>↗ Partager</button>
                  <button onClick={() => exportToDrive({ name:upscaleResultName||"upscaled", storageUrl:upscaleResultUrl||"", storage_url:upscaleResultUrl||"" })}
                    style={{ padding:"12px 8px", borderRadius:12, border:driveConnected ? "1px solid rgba(66,133,244,0.3)" : t.border, background:driveConnected ? "rgba(66,133,244,0.06)" : t.bgCard, color:driveConnected ? "#4285f4" : t.textSub, fontSize:12, cursor:"pointer" }}>{driveConnected ? "▲ Drive" : "Drive"}</button>
                  <button onClick={() => setUpscaleRenaming(true)}
                    style={{ padding:"12px 8px", borderRadius:12, border:t.border, background:t.bgCard, color:t.textSub, fontSize:12, cursor:"pointer" }}>✎ Renommer</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {lastGeneratedClip && (
        <div style={{ position:"fixed", bottom:0, left:0, right:0, background:dark ? "rgba(11,11,11,0.96)" : "rgba(229,229,224,0.96)", borderTop:t.border, backdropFilter:"blur(14px)", padding:"9px 16px", display:"flex", alignItems:"center", gap:10, zIndex:40 }}>
          {lastGeneratedClip.thumbnail && <img src={lastGeneratedClip.thumbnail} style={{ width:34, height:22, borderRadius:4, objectFit:"cover", flexShrink:0 }}/>}
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:10, color:t.textMuted }}>{T.lastGenerated}</p>
            <p style={{ fontSize:12, color:t.text, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{lastGeneratedClip.name}</p>
          </div>
          <button onClick={() => shareNative(lastGeneratedClip)} style={{ fontSize:11, color:t.textSub, background:t.bgInput, border:t.border, borderRadius:7, padding:"5px 9px", cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>↗</button>
          <button onClick={() => exportToDrive(lastGeneratedClip)} style={{ fontSize:11, color:driveConnected ? "#4285f4" : t.textMuted, background:driveConnected ? "rgba(66,133,244,0.06)" : t.bgInput, border:driveConnected ? "1px solid rgba(66,133,244,0.25)" : t.border, borderRadius:7, padding:"5px 9px", cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>▲</button>
          <button onClick={() => downloadClip(lastGeneratedClip)} style={{ fontSize:11, color:t.accent, background:"rgba(232,245,66,0.06)", border:"1px solid rgba(232,245,66,0.18)", borderRadius:7, padding:"5px 9px", cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>↓</button>
          <button onClick={() => setLastGeneratedClip(null)} style={{ background:"none", border:"none", color:t.textMuted, cursor:"pointer", fontSize:15, flexShrink:0 }}>✕</button>
        </div>
      )}

      {showStats && (
        <div onClick={() => setShowStats(false)} style={{ position:"fixed", inset:0, background:t.overlayHeavy, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...modalBase, width:"100%", maxWidth:300 }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ fontSize:14, fontWeight:600, color:t.text }}>📊 {T.stats}</span><button onClick={() => setShowStats(false)} style={{ background:"none", border:"none", color:t.textMuted, fontSize:17, cursor:"pointer" }}>✕</button></div>
            {[[T.totalClips, totalClipsGenerated],[T.clipsInLib, clips.length],["Générations", generationHistory.length]].map(([label, val]) => (
              <div key={String(label)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:t.border }}>
                <span style={{ fontSize:13, color:t.textSub }}>{label}</span>
                <span style={{ fontSize:20, fontWeight:700, color:t.accent }}>{val}</span>
              </div>
            ))}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:t.border }}>
              <span style={{ fontSize:13, color:t.textSub }}>Google Drive</span>
              <span style={{ fontSize:13, fontWeight:600, color:driveConnected ? "#4ade80" : t.textMuted }}>{driveConnected ? "Connecté" : "Non connecté"}</span>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:7, marginTop:4 }}>
              <button onClick={() => setShowStats(false)} style={{ padding:9, borderRadius:8, border:t.borderMed, background:"none", color:t.textSub, cursor:"pointer", fontSize:13 }}>{T.close}</button>
              <button onClick={() => { setTotalClipsGenerated(0); localStorage.removeItem("climbTotalClips"); setGenerationHistory([]); localStorage.removeItem("climbHistory") }} style={{ padding:9, borderRadius:8, border:"1px solid rgba(239,68,68,0.3)", background:"rgba(239,68,68,0.05)", color:"#f87171", cursor:"pointer", fontSize:12 }}>Réinitialiser les statistiques</button>
            </div>
          </div>
        </div>
      )}

      {showPresets && (
        <div onClick={() => setShowPresets(false)} style={{ position:"fixed", inset:0, background:t.overlayHeavy, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...modalBase, width:"100%", maxWidth:360, maxHeight:"75vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ fontSize:14, fontWeight:600, color:t.text }}>⚡ {T.presets}</span><button onClick={() => setShowPresets(false)} style={{ background:"none", border:"none", color:t.textMuted, fontSize:17, cursor:"pointer" }}>✕</button></div>
            {presets.length === 0 ? <p style={{ fontSize:13, color:t.textMuted, textAlign:"center", padding:"20px 0" }}>—</p> : presets.map(p => (
              <div key={p.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px", background:t.bgInput, border:t.border, borderRadius:9 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, color:t.text, fontWeight:500 }}>{p.name}</p>
                  <p style={{ fontSize:10, color:t.textMuted, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.format} · {CGL[p.colorGrade]} · {TRL[p.transition]} · {p.exportQuality}</p>
                </div>
                <button onClick={() => loadPreset(p)} style={{ padding:"4px 10px", borderRadius:6, fontSize:11, border:"1px solid rgba(232,245,66,0.28)", background:"rgba(232,245,66,0.06)", color:t.accent, cursor:"pointer", flexShrink:0 }}>{T.use}</button>
                <button onClick={() => deletePreset(p.id)} style={{ padding:"4px 8px", borderRadius:6, fontSize:11, border:"none", background:"none", color:"#e8453a", cursor:"pointer", flexShrink:0 }}>✕</button>
              </div>
            ))}
            <button onClick={() => setShowPresets(false)} style={{ padding:9, borderRadius:8, border:t.borderMed, background:"none", color:t.textSub, cursor:"pointer", fontSize:13 }}>{T.close}</button>
          </div>
        </div>
      )}

      {showSavePreset && (
        <div onClick={() => setShowSavePreset(false)} style={{ position:"fixed", inset:0, background:t.overlayHeavy, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...modalBase, width:"100%", maxWidth:310 }}>
            <p style={{ fontSize:14, fontWeight:600, color:t.text }}>+ {T.savePreset}</p>
            <input value={presetName} onChange={e => setPresetName(e.target.value)} onKeyDown={e => e.key === "Enter" && savePreset()} style={{ background:t.bgInput, border:t.borderMed, borderRadius:8, padding:"9px 13px", fontSize:13, color:t.text, outline:"none" }} placeholder={T.presetName} autoFocus/>
            <p style={{ fontSize:11, color:t.textMuted }}>{selectedFormat} · {CGL[colorGrade]} · {TRL[transition]} · {exportQuality}</p>
            <div style={{ display:"flex", gap:7 }}>
              <button onClick={() => setShowSavePreset(false)} style={{ flex:1, padding:9, borderRadius:8, border:t.borderMed, background:"none", color:t.textSub, cursor:"pointer", fontSize:13 }}>{T.cancel}</button>
              <button onClick={savePreset} style={{ flex:1, padding:9, borderRadius:8, border:"none", background:t.accent, color:"#0a0a0a", cursor:"pointer", fontSize:13, fontWeight:700 }}>{T.savePreset}</button>
            </div>
          </div>
        </div>
      )}


      {showTimestampPreview && (
        <div onClick={() => setShowTimestampPreview(false)} style={{ position:"fixed", inset:0, background:t.overlayHeavy, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...modalBase, width:"100%", maxWidth:460, maxHeight:"80vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ fontSize:14, fontWeight:600, color:t.text }}>{T.timestampPreview}</span><button onClick={() => setShowTimestampPreview(false)} style={{ background:"none", border:"none", color:t.textMuted, fontSize:17, cursor:"pointer" }}>✕</button></div>
            <p style={{ fontSize:12, color:t.textMuted }}>{T.timestampDesc}</p>
            {timestampPreviews.length > 0 && (
              <div style={{ position:"relative", height:32, background:t.bgInput, borderRadius:8, overflow:"hidden", marginBottom:4 }}>
                {timestampPreviews.map((ts, i) => { const total = timestampPreviews.reduce((acc, t2) => Math.max(acc, t2.start + t2.duration), 0); const colors = ["rgba(232,245,66,0.6)","rgba(100,200,255,0.6)","rgba(255,150,100,0.6)","rgba(150,255,150,0.6)"]; return <div key={i} style={{ position:"absolute", top:4, height:24, left:`${(ts.start/total)*100}%`, width:`${(ts.duration/total)*100}%`, background:colors[i%colors.length], borderRadius:4, display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:9, fontWeight:700, color:"#0a0a0a" }}>{i+1}</span></div> })}
              </div>
            )}
            {timestampPreviews.map((ts, i) => (
              <div key={i} style={{ background:t.bgInput, border:t.border, borderRadius:9, padding:"11px 13px" }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ fontSize:13, color:t.text, fontWeight:500 }}>{ts.name}</span><span style={{ fontSize:11, color:t.accent }}>{ts.start}s → {ts.start+ts.duration}s</span></div>
                {ts.description && <p style={{ fontSize:11, color:t.textMuted, marginTop:3 }}>{ts.description}</p>}
              </div>
            ))}
            <div style={{ display:"flex", gap:7 }}>
              <button onClick={() => setShowTimestampPreview(false)} style={{ flex:1, padding:9, borderRadius:8, border:t.borderMed, background:"none", color:t.textSub, cursor:"pointer", fontSize:13 }}>{T.cancel}</button>
              <button onClick={() => { setCustomTimestamps(timestampPreviews); setShowTimestampPreview(false) }} style={{ flex:1, padding:9, borderRadius:8, border:"none", background:t.accent, color:"#0a0a0a", cursor:"pointer", fontSize:13, fontWeight:600 }}>{T.useTimestamps}</button>
            </div>
          </div>
        </div>
      )}

      {showCapsulesModal && (
        <div onClick={() => { setShowCapsulesModal(false); setCapsulesType(null) }} style={{ position:"fixed", inset:0, background:t.overlayHeavy, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...modalBase, width:"100%", maxWidth:370 }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ fontSize:14, fontWeight:600, color:t.text }}>{T.capsuleTitle}</span><button onClick={() => { setShowCapsulesModal(false); setCapsulesType(null) }} style={{ background:"none", border:"none", color:t.textMuted, fontSize:17, cursor:"pointer" }}>✕</button></div>
            <p style={{ fontSize:12, color:t.textMuted }}>{T.capsuleDesc}</p>
            <div style={{ display:"flex", gap:7 }}>
              {(["courte","longue"] as const).map(type => (
                <button key={type} onClick={() => setCapsulesType(type)} style={{ flex:1, padding:"13px 9px", borderRadius:9, border:capsulesType === type ? `1px solid rgba(232,245,66,0.5)` : t.borderMed, background:capsulesType === type ? "rgba(232,245,66,0.07)" : t.bgInput, color:capsulesType === type ? t.accent : t.textSub, cursor:"pointer", fontSize:12, textAlign:"center" }}>
                  {type === "courte" ? T.shortVideo : T.longVideo}<br/><span style={{ fontSize:10, opacity:0.65 }}>{type === "courte" ? T.shortSub : T.longSub}</span>
                </button>
              ))}
            </div>
            <div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}><p style={{ fontSize:12, color:t.textMuted }}>{T.capsuleCount}</p><span style={{ fontSize:15, fontWeight:700, color:t.accent }}>{capsulesCount}</span></div>
              <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                <button onClick={() => setCapsulesCount(Math.max(1,capsulesCount-1))} style={{ width:30, height:30, borderRadius:7, border:t.borderMed, background:t.bgInput, color:t.text, cursor:"pointer", fontSize:15 }}>−</button>
                <input type="range" min={1} max={10} value={capsulesCount} onChange={e => setCapsulesCount(Number(e.target.value))} style={{ flex:1, accentColor:t.accent }}/>
                <button onClick={() => setCapsulesCount(Math.min(10,capsulesCount+1))} style={{ width:30, height:30, borderRadius:7, border:t.borderMed, background:t.bgInput, color:t.text, cursor:"pointer", fontSize:15 }}>+</button>
              </div>
            </div>
            <div style={{ display:"flex", gap:7 }}>
              <button onClick={() => { setShowCapsulesModal(false); setCapsulesType(null) }} style={{ flex:1, padding:9, borderRadius:8, border:t.borderMed, background:"none", color:t.textSub, cursor:"pointer", fontSize:13 }}>{T.cancel}</button>
              <button onClick={applyCapsules} disabled={!capsulesType} style={{ flex:1, padding:9, borderRadius:8, border:"none", background:capsulesType ? t.accent : t.bgInput, color:capsulesType ? "#0a0a0a" : t.textMuted, cursor:capsulesType ? "pointer" : "not-allowed", fontSize:13, fontWeight:600 }}>{T.apply}</button>
            </div>
          </div>
        </div>
      )}

      {showPromptHelper && (
        <div onClick={() => setShowPromptHelper(false)} style={{ position:"fixed", inset:0, background:t.overlayHeavy, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...modalBase, width:"100%", maxWidth:450 }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ fontSize:14, fontWeight:600, color:t.text }}>✦ {T.promptHelper}</span><button onClick={() => setShowPromptHelper(false)} style={{ background:"none", border:"none", color:t.textMuted, fontSize:17, cursor:"pointer" }}>✕</button></div>
            <textarea value={helperInput} onChange={e => setHelperInput(e.target.value)} style={{ background:t.bgInput, border:t.borderMed, borderRadius:8, padding:"11px 13px", fontSize:13, color:t.text, outline:"none", resize:"none", height:76, fontFamily:"sans-serif", width:"100%" }} placeholder="Edit de Dybala, style TikTok foot, musique phonk..."/>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <input type="file" accept="video/*" id="helperRefInput" style={{ display:"none" }} onChange={e => setHelperRefVideo(e.target.files?.[0] || null)}/>
              <button onClick={() => document.getElementById("helperRefInput")?.click()} style={{ background:t.bgInput, border:t.borderMed, borderRadius:7, padding:"6px 11px", fontSize:11, color:t.textSub, cursor:"pointer" }}>{helperRefVideo ? `✓ ${helperRefVideo.name.slice(0,16)}...` : T.addRefVideo}</button>
              {helperRefVideo && <button onClick={() => setHelperRefVideo(null)} style={{ background:"none", border:"none", color:t.textMuted, cursor:"pointer" }}>✕</button>}
              <span style={{ fontSize:10, color:t.textHint }}>({T.optional})</span>
            </div>
            {helperResult && (
              <div style={{ background:"rgba(232,245,66,0.03)", border:"1px solid rgba(232,245,66,0.15)", borderRadius:8, padding:"11px 13px" }}>
                <p style={{ fontSize:10, color:t.accent, marginBottom:5, fontWeight:700, textTransform:"uppercase" }}>{T.promptGenerated}</p>
                <p style={{ fontSize:13, color:t.text, lineHeight:1.55 }}>{helperResult}</p>
              </div>
            )}
            <div style={{ display:"flex", gap:7 }}>
              <button onClick={() => setShowPromptHelper(false)} style={{ flex:1, padding:9, borderRadius:8, border:t.borderMed, background:"none", color:t.textSub, cursor:"pointer", fontSize:13 }}>{T.close}</button>
              {helperResult && <button onClick={() => { setPromptText(helperResult); setShowPromptHelper(false) }} style={{ flex:1, padding:9, borderRadius:8, border:"1px solid rgba(232,245,66,0.28)", background:"rgba(232,245,66,0.06)", color:t.accent, cursor:"pointer", fontSize:13 }}>{T.use}</button>}
              <button onClick={handlePromptHelper} disabled={helperLoading} style={{ flex:1, padding:9, borderRadius:8, border:"none", background:helperLoading ? "rgba(232,245,66,0.35)" : t.accent, color:"#0a0a0a", cursor:"pointer", fontSize:13, fontWeight:700 }}>{helperLoading ? "⏳" : `✦ ${T.generate}`}</button>
            </div>
          </div>
        </div>
      )}

      {showNewFolder && (
        <div onClick={() => setShowNewFolder(false)} style={{ position:"fixed", inset:0, background:t.overlayHeavy, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...modalBase, width:"100%", maxWidth:310 }}>
            <p style={{ fontSize:14, fontWeight:600, color:t.text }}>{newFolderParent ? T.newSubfolder : T.newFolder}</p>
            <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === "Enter" && createFolder()} style={{ background:t.bgInput, border:t.borderMed, borderRadius:8, padding:"9px 13px", fontSize:13, color:t.text, outline:"none" }} placeholder={T.newFolderName} autoFocus/>
            <div style={{ display:"flex", gap:7 }}>
              <button onClick={() => setShowNewFolder(false)} style={{ flex:1, padding:9, borderRadius:8, border:t.borderMed, background:"none", color:t.textSub, cursor:"pointer", fontSize:13 }}>{T.cancel}</button>
              <button onClick={createFolder} style={{ flex:1, padding:9, borderRadius:8, border:"none", background:t.accent, color:"#0a0a0a", cursor:"pointer", fontSize:13, fontWeight:700 }}>{T.create}</button>
            </div>
          </div>
        </div>
      )}

      {showMoveModal && (
        <div onClick={() => setShowMoveModal(null)} style={{ position:"fixed", inset:0, background:t.overlayHeavy, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...modalBase, width:"100%", maxWidth:310 }}>
            <p style={{ fontSize:14, fontWeight:600, color:t.text }}>{T.move}...</p>
            <button onClick={() => moveClip(showMoveModal, null)} style={{ padding:"9px 13px", borderRadius:8, border:t.border, background:t.bgInput, color:t.text, cursor:"pointer", fontSize:12, textAlign:"left" }}>▣ {T.clipsNoFolder}</button>
            {folders.map(f => <button key={f.id} onClick={() => moveClip(showMoveModal, f.id)} style={{ padding:"9px 13px", borderRadius:8, border:t.border, background:t.bgInput, color:t.text, cursor:"pointer", fontSize:12, textAlign:"left" }}>▣ {f.name}</button>)}
            <button onClick={() => setShowMoveModal(null)} style={{ padding:8, borderRadius:8, border:t.borderMed, background:"none", color:t.textSub, cursor:"pointer", fontSize:13 }}>{T.cancel}</button>
          </div>
        </div>
      )}

      {showShareModal && (
        <div onClick={() => setShowShareModal(null)} style={{ position:"fixed", inset:0, background:t.overlayHeavy, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...modalBase, width:"100%", maxWidth:310 }}>
            <p style={{ fontSize:14, fontWeight:600, color:t.text }}>{T.shareFolder}</p>
            <p style={{ fontSize:11, color:t.textMuted }}>{T.sharedWith} : {folders.find(f => f.id === showShareModal)?.shared_with?.join(", ") || "—"}</p>
            <input value={shareEmail} onChange={e => setShareEmail(e.target.value)} style={{ background:t.bgInput, border:t.borderMed, borderRadius:8, padding:"9px 13px", fontSize:13, color:t.text, outline:"none" }} placeholder={T.emailMember}/>
            <div style={{ display:"flex", gap:7 }}>
              <button onClick={() => setShowShareModal(null)} style={{ flex:1, padding:9, borderRadius:8, border:t.borderMed, background:"none", color:t.textSub, cursor:"pointer", fontSize:13 }}>{T.cancel}</button>
              <button onClick={() => shareFolder(showShareModal)} style={{ flex:1, padding:9, borderRadius:8, border:"none", background:t.accent, color:"#0a0a0a", cursor:"pointer", fontSize:13, fontWeight:700 }}>{T.share}</button>
            </div>
          </div>
        </div>
      )}

      {showCompressModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ ...modalBase, width:"100%", maxWidth:330 }}>
            <p style={{ fontSize:15, fontWeight:600, color:t.text }}>{T.compressTitle}</p>
            <p style={{ fontSize:13, color:t.textMuted }}>{T.compressMsg}</p>
            <div style={{ display:"flex", gap:7 }}>
              <button onClick={() => setShowCompressModal(false)} style={{ flex:1, padding:9, borderRadius:8, border:t.borderMed, background:"none", color:t.textSub, cursor:"pointer", fontSize:13 }}>{T.no}</button>
              <button onClick={compressAndUpload} style={{ flex:1, padding:9, borderRadius:8, border:"none", background:t.accent, color:"#0a0a0a", cursor:"pointer", fontSize:13, fontWeight:700 }}>{T.yesCompress}</button>
            </div>
          </div>
        </div>
      )}

      {showMusic && (
        <div onClick={closeMusic} style={{ position:"fixed", inset:0, background:t.overlayHeavy, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...modalBase, width:"100%", maxWidth:450, maxHeight:"85vh" }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ fontSize:14, fontWeight:600, color:t.text }}>{T.chooseMusic}</span><button onClick={closeMusic} style={{ background:"none", border:"none", color:t.textMuted, fontSize:17, cursor:"pointer" }}>✕</button></div>
            <input value={searchQuery} onChange={e => handleSearch(e.target.value)} style={{ background:t.bgInput, border:t.borderMed, borderRadius:8, padding:"9px 13px", fontSize:13, color:t.text, outline:"none" }} placeholder={T.searchMusic}/>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>{defaultQueries.map(q => <button key={q} onClick={() => { setSearchQuery(q); fetchTracks(q) }} style={{ padding:"3px 9px", borderRadius:20, fontSize:11, cursor:"pointer", border:t.border, background:t.bgPill, color:t.textMuted }}>{q}</button>)}</div>
            <div style={{ overflowY:"auto", display:"flex", flexDirection:"column", gap:5, maxHeight:"50vh" }}>
              {loadingTracks ? <p style={{ fontSize:13, color:t.textMuted, textAlign:"center", padding:"18px 0" }}>...</p>
                : tracks.length === 0 ? <p style={{ fontSize:13, color:t.textMuted, textAlign:"center", padding:"18px 0" }}>—</p>
                : tracks.map(track => (
                  <div key={track.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 9px", borderRadius:8, background:selectedMusic?.id === track.id ? "rgba(232,245,66,0.06)" : t.bgInput, border:selectedMusic?.id === track.id ? "1px solid rgba(232,245,66,0.28)" : "1px solid transparent" }}>
                    <img src={track.album.cover_small} style={{ width:36, height:36, borderRadius:5, flexShrink:0 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:12, color:t.text, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{track.title}</p>
                      <p style={{ fontSize:10, color:t.textMuted }}>{track.artist.name}</p>
                    </div>
                    <button onClick={() => togglePlay(track)} style={{ width:28, height:28, borderRadius:"50%", border:t.border, background:t.bgInput, color:t.textSub, cursor:"pointer", fontSize:11, flexShrink:0 }}>{playingId === track.id ? "⏸" : "▶"}</button>
                    <button onClick={() => selectTrack(track)} style={{ padding:"4px 9px", borderRadius:5, fontSize:11, fontWeight:600, cursor:"pointer", border:"1px solid rgba(232,245,66,0.28)", background:"rgba(232,245,66,0.06)", color:t.accent, flexShrink:0 }}>OK</button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div onClick={() => setShowSettings(false)} style={{ position:"fixed", inset:0, background:t.overlay, zIndex:100, display:"flex" }}>
          <div onClick={e => e.stopPropagation()} style={{ position:"absolute", right:0, top:0, bottom:0, width:260, background:dark ? "rgba(11,11,11,0.98)" : t.bgModal, borderLeft:t.border, padding:"20px 16px", display:"flex", flexDirection:"column", gap:18, overflowY:"auto", backdropFilter:"blur(16px)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}><span style={{ fontSize:14, fontWeight:600, color:t.text }}>{T.settings}</span><button onClick={() => setShowSettings(false)} style={{ background:"none", border:"none", color:t.textMuted, fontSize:17, cursor:"pointer" }}>✕</button></div>
            <div style={{ height:1, background:dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)" }}/>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <p style={{ fontSize:9, color:t.textHint, textTransform:"uppercase", letterSpacing:"0.08em" }}>Apparence</p>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={() => setDark(false)} style={{ flex:1, padding:7, border:!dark ? `1px solid ${t.accent}` : t.border, borderRadius:7, background:!dark ? "rgba(232,245,66,0.07)" : "none", color:!dark ? t.accent : t.textMuted, fontSize:11, cursor:"pointer" }}>☀ Clair</button>
                <button onClick={() => setDark(true)} style={{ flex:1, padding:7, border:dark ? `1px solid ${t.accent}` : t.border, borderRadius:7, background:dark ? "rgba(232,245,66,0.07)" : "none", color:dark ? t.accent : t.textMuted, fontSize:11, cursor:"pointer" }}>☾ Sombre</button>
              </div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <p style={{ fontSize:9, color:t.textHint, textTransform:"uppercase", letterSpacing:"0.08em" }}>Google Drive</p>
              {driveConnected ? (
                <div style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 11px", background:"rgba(74,222,128,0.05)", border:"1px solid rgba(74,222,128,0.2)", borderRadius:8 }}>
                  <div style={{ width:7, height:7, borderRadius:"50%", background:"#4ade80", flexShrink:0 }}/>
                  <span style={{ fontSize:12, color:"#4ade80" }}>Drive connecté</span>
                </div>
              ) : (
                <button onClick={connectDrive} style={{ padding:9, borderRadius:8, border:"1px solid rgba(66,133,244,0.3)", background:"rgba(66,133,244,0.06)", color:"#4285f4", cursor:"pointer", fontSize:12, fontWeight:500 }}>🔗 {T.connectDrive}</button>
              )}
            </div>
            <button onClick={() => { setOnboardingDone(false); localStorage.removeItem("climbOnboarding"); setShowSettings(false) }} style={{ background:"none", border:t.border, borderRadius:8, padding:9, fontSize:12, color:t.textSub, cursor:"pointer" }}>↺ Revoir l'intro</button>
            {user?.email === "nolanrochette26@gmail.com" && (
              <>
                <div style={{ height:1, background:dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)" }}/>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  <p style={{ fontSize:9, color:t.textHint, textTransform:"uppercase", letterSpacing:"0.08em" }}>{T.addMember}</p>
                  <input value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} style={{ background:t.bgInput, border:t.borderMed, borderRadius:7, padding:"8px 11px", fontSize:12, color:t.text, outline:"none" }} placeholder="Email" type="email"/>
                  <input value={newMemberPassword} onChange={e => setNewMemberPassword(e.target.value)} style={{ background:t.bgInput, border:t.borderMed, borderRadius:7, padding:"8px 11px", fontSize:12, color:t.text, outline:"none" }} placeholder="Password" type="password"/>
                  {memberSuccess && <p style={{ fontSize:11, color:t.accent, textAlign:"center" }}>{memberSuccess}</p>}
                  <button onClick={async () => { if (!newMemberEmail || !newMemberPassword) return; setAddingMember(true); setMemberSuccess(null); const { error } = await supabase.auth.signUp({ email:newMemberEmail, password:newMemberPassword }); if (error) alert(error.message); else { await supabase.from("allowed_users").insert({ email:newMemberEmail }); setMemberSuccess(`✓ ${newMemberEmail}`); setNewMemberEmail(""); setNewMemberPassword("") }; setAddingMember(false) }} disabled={addingMember} style={{ background:t.accent, border:"none", borderRadius:7, padding:9, fontSize:12, fontWeight:700, color:"#0a0a0a", cursor:"pointer", opacity:addingMember ? 0.6 : 1 }}>{addingMember ? T.creating : T.createAccount}</button>
                </div>
              </>
            )}
            <div style={{ height:1, background:dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)" }}/>
            <button onClick={async () => { await supabase.auth.signOut(); setUser(null) }} style={{ background:"none", border:"1px solid rgba(232,69,58,0.25)", borderRadius:8, padding:9, fontSize:12, fontWeight:500, color:"#e8453a", cursor:"pointer" }}>{T.logout}</button>
            <button onClick={() => { setShowSettings(false); setShowReport(true) }} style={{ background:"none", border:"1px solid rgba(255,255,255,0.07)", borderRadius:8, padding:9, fontSize:12, color:t.textSub, cursor:"pointer" }}>⚠ {T.reportProblem}</button>
          </div>
        </div>
      )}

      {showReport && (
        <div onClick={() => setShowReport(false)} style={{ position:"fixed", inset:0, background:t.overlayHeavy, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...modalBase, width:"100%", maxWidth:330 }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ fontSize:14, fontWeight:600, color:t.text }}>⚠ {T.reportProblem}</span><button onClick={() => setShowReport(false)} style={{ background:"none", border:"none", color:t.textMuted, fontSize:17, cursor:"pointer" }}>✕</button></div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>{problems.map(p => <button key={p} onClick={() => toggleProblem(p)} style={{ padding:"5px 11px", borderRadius:20, fontSize:11, cursor:"pointer", border:selectedProblems.includes(p) ? "1px solid rgba(232,69,58,0.4)" : t.border, background:selectedProblems.includes(p) ? "rgba(232,69,58,0.06)" : t.bgPill, color:selectedProblems.includes(p) ? "#e8453a" : t.textSub }}>{p}</button>)}</div>
            <textarea style={{ background:t.bgInput, border:t.border, borderRadius:8, padding:"9px 11px", fontSize:12, color:t.text, outline:"none", resize:"none", height:70, fontFamily:"sans-serif", width:"100%" }} placeholder="Détails..."/>
            <button style={{ background:t.bgInput, border:t.borderMed, borderRadius:8, padding:9, fontSize:12, fontWeight:500, color:t.textSub, cursor:"pointer" }}>{T.send}</button>
          </div>
        </div>
      )}

      {videoPlayerClip && (
        <div onClick={() => setVideoPlayerClip(null)} style={{ position:"fixed", inset:0, zIndex:1000, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"center", justifyContent:"center", padding:"16px" }}>
          <div onClick={e => e.stopPropagation()} style={{ width:"100%", maxWidth:380, background:"#161616", borderRadius:22, overflow:"hidden", boxShadow:"0 32px 96px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 16px 10px" }}>
              <p style={{ fontSize:13, fontWeight:600, color:"#f0f0f0", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1, marginRight:10, letterSpacing:"-0.01em" }}>{videoPlayerClip.name}</p>
              <button onClick={() => setVideoPlayerClip(null)} style={{ background:"rgba(255,255,255,0.08)", border:"none", borderRadius:8, width:32, height:32, color:"#888", fontSize:15, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, lineHeight:1 }}>✕</button>
            </div>
            <video
              src={getClipSrc(videoPlayerClip)}
              controls
              autoPlay
              playsInline
              style={{ width:"100%", maxHeight:"72vh", background:"#000", display:"block", objectFit:"contain" }}
            />
            <div style={{ padding:"14px 14px 18px", display:"flex", flexDirection:"column", gap:10 }}>
              <button onClick={() => downloadClip(videoPlayerClip)} style={{ width:"100%", padding:"15px", borderRadius:14, border:"none", background:"#e8f542", color:"#0a0a0a", fontSize:14, fontWeight:700, cursor:"pointer", letterSpacing:"-0.01em" }}>{T.download}</button>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => shareNative(videoPlayerClip)} style={{ flex:1, padding:"13px", borderRadius:14, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)", color:"#ccc", fontSize:13, fontWeight:500, cursor:"pointer" }}>{T.shareNative}</button>
                <button onClick={() => exportToDrive(videoPlayerClip)} disabled={exportingDrive === (videoPlayerClip.id || videoPlayerClip.name)} style={{ flex:1, padding:"13px", borderRadius:14, border:driveConnected ? "1px solid rgba(66,133,244,0.35)" : "1px solid rgba(255,255,255,0.08)", background:driveConnected ? "rgba(66,133,244,0.1)" : "rgba(255,255,255,0.03)", color:driveConnected ? "#4285f4" : "#666", fontSize:13, fontWeight:500, cursor:"pointer" }}>Drive</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}