import { Client } from "@upstash/qstash"

if (!process.env.QSTASH_TOKEN) {
  throw new Error("Missing env var QSTASH_TOKEN")
}

export const qstash = new Client({
  token: process.env.QSTASH_TOKEN,
})

export async function publishJob(url: string, body: object, delay?: number) {
  const response = await qstash.publishJSON({
    url,
    body,
    delay,
  })
  return response
}

export async function createSchedule(destination: string, cron: string) {
  const response = await fetch("https://qstash.upstash.io/v2/schedules/" + encodeURIComponent(destination), {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.QSTASH_TOKEN}`,
      "Upstash-Cron": cron,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`QStash schedule creation failed: ${response.status} ${text}`)
  }

  return response.json()
}
