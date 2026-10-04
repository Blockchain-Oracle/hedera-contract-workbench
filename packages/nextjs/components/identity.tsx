import Image from "next/image";
export function WorkbenchMark({
  className = "size-7",
}: {
  className?: string;
}) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path
        d="M10 7v18M22 7v18M7 12h18M7 20h18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function AgentMark({
  agent,
  className = "size-6",
}: {
  agent: string;
  className?: string;
}) {
  const name = agent === "claude-code" ? "claude" : agent;
  return (
    <Image
      src={`/agents/${name}.svg`}
      width={32}
      height={32}
      alt=""
      className={`${className} dark:invert`}
      unoptimized
    />
  );
}
export function agentName(agent: string) {
  return agent === "claude-code"
    ? "Claude Code"
    : agent === "codex"
      ? "Codex"
      : "Cursor";
}
