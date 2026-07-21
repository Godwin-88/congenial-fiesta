import { NextResponse } from "next/server"
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs"

if (!process.env.QSTASH_CURRENT_SIGNING_KEY) {
  throw new Error("Missing env var QSTASH_CURRENT_SIGNING_KEY")
}

export const GET = verifySignatureAppRouter(async () => {
  // Keep Supabase free tier database from pausing
  // by issuing a trivial API request
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""}`,
        },
      }
    )
    if (!response.ok) {
      console.error("Keep-alive fetch error:", response.status)
    }
  } catch (e) {
    console.error("Keep-alive error:", e)
  }

  return NextResponse.json({
    status: "alive",
    timestamp: new Date().toISOString(),
  })
})