import Image from "next/image";
export function WorkbenchMark({
  className = "size-7",
}: {
  className?: string;
}) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect
        x="4"
        y="5"
        width="24"
        height="22"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M4 12h24M12 12v15M17 17l3 3-3 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
/** Official assets remain separate from the product identity and unmodified. */
export function HederaIdentity({ light = false }: { light?: boolean }) {
  return (
    <a
      href="https://hedera.com/"
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-4"
      aria-label="Built on Hedera"
    >
      <span className="text-xs text-muted-foreground">Built on</span>
      {light ? (
        <Image
          src="/brand/hedera-white.svg"
          width={102}
          height={28}
          alt="Hedera"
          unoptimized
        />
      ) : (
        <>
          <Image
            src="/brand/hedera-black.svg"
            width={102}
            height={28}
            alt="Hedera"
            className="dark:hidden"
            unoptimized
          />
          <Image
            src="/brand/hedera-white.svg"
            width={102}
            height={28}
            alt="Hedera"
            className="hidden dark:block"
            unoptimized
          />
        </>
      )}
    </a>
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
