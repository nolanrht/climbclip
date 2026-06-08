import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get("file") as File

  if (!file) return Response.json({ error: "Aucun fichier" }, { status: 400 })

  const filename = `${Date.now()}-${file.name}`
  const { data, error } = await supabase.storage
    .from("videos")
    .upload(filename, file, { contentType: file.type })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const { data: urlData } = supabase.storage.from("videos").getPublicUrl(filename)

  return Response.json({ url: urlData.publicUrl, path: data.path })
}