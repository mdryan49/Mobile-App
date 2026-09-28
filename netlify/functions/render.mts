import type { Config, Context } from '@netlify/functions'
import { GoogleGenAI } from '@google/genai'

/**
 * POST /api/render
 * Body: { image: base64 JPEG/PNG, mimeType, prompt, aspectRatio }
 * Returns: { image: base64, mimeType }
 *
 * The Gemini key lives ONLY in the Netlify environment variable GEMINI_API_KEY.
 * Optional env vars:
 *   GEMINI_IMAGE_MODEL   – defaults to gemini-3.1-flash-image (Nano Banana 2)
 *   RENDER_ACCESS_CODE   – if set, requests must send it in the x-access-code header
 */

const DEFAULT_MODEL = 'gemini-3.1-flash-image'
const MAX_IMAGE_BASE64 = 5_000_000 // ~3.7 MB image
const MAX_PROMPT = 6000
const ASPECT_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9']

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') return json(405, { error: 'Use POST.' })

  const apiKey = Netlify.env.get('GEMINI_API_KEY')
  if (!apiKey) return json(500, { error: 'The AI service is not set up yet (missing GEMINI_API_KEY on the server).', code: 'no_key' })

  const accessCode = Netlify.env.get('RENDER_ACCESS_CODE')
  if (accessCode && req.headers.get('x-access-code') !== accessCode) {
    return json(401, { error: 'Render access code is missing or wrong. Check Settings on this iPad.', code: 'bad_code' })
  }

  let body: { image?: string; mimeType?: string; prompt?: string; aspectRatio?: string }
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'Invalid request.' })
  }
  const { image, prompt } = body
  const mimeType = body.mimeType === 'image/png' ? 'image/png' : 'image/jpeg'
  const aspectRatio = ASPECT_RATIOS.includes(body.aspectRatio ?? '') ? body.aspectRatio : undefined
  if (!image || typeof image !== 'string' || image.length > MAX_IMAGE_BASE64) return json(400, { error: 'Photo is missing or too large.' })
  if (!prompt || typeof prompt !== 'string' || prompt.length > MAX_PROMPT) return json(400, { error: 'Prompt is missing or too long.' })

  const model = Netlify.env.get('GEMINI_IMAGE_MODEL') || DEFAULT_MODEL
  const ai = new GoogleGenAI({ apiKey })
  const started = Date.now()

  try {
    const res = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType, data: image } }, { text: prompt }] }],
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
        imageConfig: { ...(aspectRatio ? { aspectRatio } : {}), imageSize: '1K' },
      },
    })

    const parts = res.candidates?.[0]?.content?.parts ?? []
    const img = parts.find((p) => p.inlineData?.data)?.inlineData
    if (!img?.data) {
      const reason = res.candidates?.[0]?.finishReason ?? res.promptFeedback?.blockReason ?? 'no image returned'
      const text = parts.map((p) => p.text).filter(Boolean).join(' ').slice(0, 300)
      console.warn('render: no image', { model, reason, text })
      return json(502, { error: `The AI didn't return an image (${reason}). Try again.`, code: 'no_image' })
    }
    console.log('render: ok', { model, ms: Date.now() - started })
    return json(200, { image: img.data, mimeType: img.mimeType ?? 'image/png', model, ms: Date.now() - started })
  } catch (err) {
    const status = (err as { status?: number }).status
    const message = err instanceof Error ? err.message : String(err)
    console.error('render: error', { model, status, message: message.slice(0, 500), ms: Date.now() - started })
    if (status === 429) return json(429, { error: 'The AI service is busy (rate limit). Wait a moment and retry.', code: 'rate_limit' })
    if (status === 400 || status === 403) return json(502, { error: 'The AI service rejected the request. Check the API key and model name.', code: 'rejected' })
    return json(502, { error: 'The AI service had a problem. Try again.', code: 'upstream' })
  }
}

export const config: Config = {
  path: '/api/render',
}
