import { createSchedule } from "@/lib/upstash/qstash"

async function main() {
  const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000"
  const url = `${baseUrl}/api/cron/keep-alive`

  const result = await createSchedule(url, "0 0 */5 * *")

  console.log("Keep-alive cron registered:", result)
}

main().catch((err) => {
  console.error("Failed to register keep-alive cron:", err)
  process.exit(1)
})
