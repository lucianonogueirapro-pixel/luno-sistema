const KEY = process.env.GOOGLE_PLACES_KEY!
const BASE = 'https://places.googleapis.com/v1'

export interface PlaceReview {
  author_name: string
  rating: number
  text: string
  time: number
  relative_time_description: string
  profile_photo_url?: string
}

export interface PlaceDetails {
  place_id: string
  name: string
  rating: number
  user_ratings_total: number
  formatted_phone_number?: string
  website?: string
  business_status?: string
  editorial_summary?: { overview?: string }
  opening_hours?: {
    open_now?: boolean
    weekday_text?: string[]
  }
  photos?: { photo_reference: string }[]
  reviews?: PlaceReview[]
}

export async function findPlaceId(query: string): Promise<string | null> {
  const res = await fetch(`${BASE}/places:searchText`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.userRatingCount',
    },
    body: JSON.stringify({ textQuery: query, languageCode: 'pt-BR' }),
  })
  const data = await res.json()
  return data.places?.[0]?.id ?? null
}

export async function getPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const fields = [
    'id', 'displayName', 'rating', 'userRatingCount',
    'nationalPhoneNumber', 'websiteUri', 'businessStatus',
    'editorialSummary', 'currentOpeningHours', 'photos', 'reviews',
  ].join(',')

  const res = await fetch(`${BASE}/places/${placeId}?languageCode=pt-BR`, {
    headers: {
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': fields,
    },
  })
  const d = await res.json()
  if (!d.id) return null

  // Normaliza para o formato interno
  return {
    place_id:            d.id,
    name:                d.displayName?.text ?? '',
    rating:              d.rating ?? 0,
    user_ratings_total:  d.userRatingCount ?? 0,
    formatted_phone_number: d.nationalPhoneNumber,
    website:             d.websiteUri,
    business_status:     d.businessStatus,
    editorial_summary:   d.editorialSummary ? { overview: d.editorialSummary.text } : undefined,
    opening_hours: d.currentOpeningHours ? {
      open_now:     d.currentOpeningHours.openNow,
      weekday_text: d.currentOpeningHours.weekdayDescriptions,
    } : undefined,
    photos: (d.photos ?? []).map((p: { name: string }) => ({ photo_reference: p.name })),
    reviews: (d.reviews ?? []).map((r: {
      authorAttribution?: { displayName?: string }
      rating?: number
      text?: { text?: string }
      relativePublishTimeDescription?: string
      publishTime?: string
    }) => ({
      author_name:                r.authorAttribution?.displayName ?? 'Anônimo',
      rating:                     r.rating ?? 0,
      text:                       r.text?.text ?? '',
      time:                       0,
      relative_time_description:  r.relativePublishTimeDescription ?? '',
    })),
  }
}

export function photoUrl(ref: string, maxWidth = 400): string {
  return `${BASE}/${ref}/media?maxWidthPx=${maxWidth}&key=${KEY}`
}

export type SugestaoTipo = 'descricao' | 'horarios' | 'avaliacoes_pedido' | 'nota_resposta' | 'fotos_checklist' | 'telefone' | 'site'

export interface DiagnosticoItem {
  ok: boolean
  texto: string
  acao?: string
  sugestaoTipo?: SugestaoTipo
}

export function diagnosticoPerfil(d: PlaceDetails): {
  score: number
  itens: DiagnosticoItem[]
} {
  const itens: DiagnosticoItem[] = []

  // Avaliações
  const totalAvals = d.user_ratings_total ?? 0
  itens.push({
    ok: totalAvals >= 10,
    texto: `Avaliações: ${totalAvals} no total`,
    acao: totalAvals < 10 ? `Meta: 10 avaliações — peça para as primeiras pacientes avaliarem (faltam ${10 - totalAvals})` : undefined,
    sugestaoTipo: totalAvals < 10 ? 'avaliacoes_pedido' : undefined,
  })

  // Nota
  const nota = d.rating ?? 0
  itens.push({
    ok: nota >= 4.5,
    texto: `Nota média: ${nota.toFixed(1)} ★`,
    acao: nota < 4.5 ? 'Responda todas as avaliações negativas com empatia e resolução' : undefined,
    sugestaoTipo: nota < 4.5 ? 'nota_resposta' : undefined,
  })

  // Telefone
  itens.push({
    ok: !!d.formatted_phone_number,
    texto: d.formatted_phone_number ? `Telefone cadastrado: ${d.formatted_phone_number}` : 'Telefone não cadastrado',
    acao: !d.formatted_phone_number ? 'Adicione o telefone (86) 99436-1010 no perfil' : undefined,
    sugestaoTipo: !d.formatted_phone_number ? 'telefone' : undefined,
  })

  // Site
  itens.push({
    ok: !!d.website,
    texto: d.website ? `Site vinculado: ${d.website}` : 'Site não vinculado',
    acao: !d.website ? 'Adicione lunoface.com.br como site do negócio' : undefined,
    sugestaoTipo: !d.website ? 'site' : undefined,
  })

  // Descrição — Places API não expõe a descrição do dono, apenas editorial do Google
  itens.push({
    ok: true,
    texto: 'Descrição do negócio — verificar manualmente no Google Perfil',
    sugestaoTipo: 'descricao',
  })

  // Horários
  const temHorarios = !!(d.opening_hours?.weekday_text?.length)
  itens.push({
    ok: temHorarios,
    texto: temHorarios ? 'Horários de funcionamento cadastrados' : 'Horários não cadastrados',
    acao: !temHorarios ? 'Cadastre os horários de funcionamento da clínica' : undefined,
    sugestaoTipo: !temHorarios ? 'horarios' : undefined,
  })

  // Fotos
  const totalFotos = d.photos?.length ?? 0
  itens.push({
    ok: totalFotos >= 10,
    texto: `Fotos: ${totalFotos} publicadas`,
    acao: totalFotos < 10 ? `Adicione pelo menos ${10 - totalFotos} fotos (fachada, interior, equipe, procedimentos)` : undefined,
    sugestaoTipo: totalFotos < 10 ? 'fotos_checklist' : undefined,
  })

  // Avaliações com nota baixa
  const reviews = d.reviews ?? []
  const semResposta = reviews.filter(r => r.rating <= 3).length
  if (semResposta > 0) {
    itens.push({
      ok: false,
      texto: `${semResposta} avaliação(ões) com nota baixa visível(is)`,
      acao: 'Responda imediatamente com empatia — avaliações sem resposta prejudicam o ranqueamento',
      sugestaoTipo: 'nota_resposta',
    })
  }

  const score = Math.round((itens.filter(i => i.ok).length / itens.length) * 100)
  return { score, itens }
}
