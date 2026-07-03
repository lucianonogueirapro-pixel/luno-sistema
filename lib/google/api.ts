import { starToNumber } from './auth'

// APIs do Google Business Profile (versões atuais 2024+)
const BASE_ACCOUNT = 'https://mybusinessaccountmanagement.googleapis.com/v1'
const BASE_INFO    = 'https://mybusinessinformation.googleapis.com/v1'
const BASE_REVIEWS = 'https://mybusiness.googleapis.com/v4'

async function gmbFetch<T>(url: string, token: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Google API ${res.status} ${url}: ${err}`)
  }
  return res.json() as Promise<T>
}

export async function listAccounts(token: string): Promise<{ name: string; accountName: string }[]> {
  const data = await gmbFetch<{ accounts?: { name: string; accountName: string }[] }>(
    `${BASE_ACCOUNT}/accounts`, token
  )
  return data.accounts ?? []
}

export async function listLocations(token: string, accountName: string): Promise<{
  name: string
  title?: string
  storefrontAddress?: { addressLines?: string[] }
}[]> {
  // API nova usa 'title' em vez de 'locationName'
  const data = await gmbFetch<{ locations?: { name: string; title?: string }[] }>(
    `${BASE_INFO}/${accountName}/locations?readMask=name,title,storefrontAddress`, token
  )
  return data.locations ?? []
}

export interface GmbReview {
  reviewId: string
  reviewer: { displayName: string; profilePhotoUrl?: string }
  starRating: string
  comment?: string
  createTime: string
  updateTime: string
  reviewReply?: { comment: string; updateTime: string }
}

export async function listReviews(token: string, accountName: string, locationName: string): Promise<GmbReview[]> {
  // Reviews ainda usam a API v4
  const data = await gmbFetch<{ reviews?: GmbReview[] }>(
    `${BASE_REVIEWS}/${accountName}/${locationName}/reviews?pageSize=50`, token
  )
  return data.reviews ?? []
}

export async function replyToReview(
  token: string,
  accountName: string,
  locationName: string,
  reviewId: string,
  reply: string
): Promise<void> {
  await gmbFetch(
    `${BASE_REVIEWS}/${accountName}/${locationName}/reviews/${reviewId}/reply`,
    token,
    { method: 'PUT', body: JSON.stringify({ comment: reply }) }
  )
}

export function parseRating(star: string): number {
  return starToNumber(star)
}
