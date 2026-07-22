const BLOCKED_WORDS: string[] = [
  'fuck',
  'shit',
  'damn',
  'ass',
  'bitch',
  'cunt',
  'dick',
  'pussy',
  'whore',
  'slut',
  'rape',
  'nigger',
  'nigga',
  'chink',
  'spic',
  'kike',
  'retard',
  'retarded',
]

export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase()
  return BLOCKED_WORDS.some(word => lower.includes(word))
}
