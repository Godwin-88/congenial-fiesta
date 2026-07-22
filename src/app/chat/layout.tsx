export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-[calc(100vh-64px)] overflow-hidden">{children}</div>
}