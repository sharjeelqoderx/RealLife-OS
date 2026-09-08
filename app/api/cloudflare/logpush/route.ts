import { timingSafeEqual } from "node:crypto"

import { NextResponse } from "next/server"

import { tryGetCloudflareLogpushSecret } from "@/lib/env"
import { ingestGatewayLogpushPayload } from "@/lib/services/gateway-activity/ingest-logpush"

export const runtime = "nodejs"

function secretsEqual(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)
  if (providedBuffer.length !== expectedBuffer.length) {
    return false
  }
  return timingSafeEqual(providedBuffer, expectedBuffer)
}

function extractLogpushSecret(request: Request): string | null {
  const headerSecret = request.headers.get("x-logpush-secret")
  if (headerSecret) return headerSecret

  const authorization = request.headers.get("authorization")
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim()
  }

  const url = new URL(request.url)
  const querySecret = url.searchParams.get("secret")
  return querySecret
}

export async function POST(request: Request) {
  const expected = tryGetCloudflareLogpushSecret()
  if (!expected) {
    return NextResponse.json(
      { error: "Logpush secret is not configured" },
      { status: 503 }
    )
  }

  const provided = extractLogpushSecret(request)
  if (!provided || !secretsEqual(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const hintedDataset = new URL(request.url).searchParams.get("dataset")
  const body = Buffer.from(await request.arrayBuffer())

  try {
    const result = await ingestGatewayLogpushPayload({
      body,
      contentEncoding: request.headers.get("content-encoding"),
      hintedDataset,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error("POST /api/cloudflare/logpush:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to ingest Logpush payload",
      },
      { status: 500 }
    )
  }
}
