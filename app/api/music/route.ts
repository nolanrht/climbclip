export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q") || "phonk"

  const res = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=12`)
  const data = await res.json()

  return Response.json(data)
}