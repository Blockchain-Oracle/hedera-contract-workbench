/** Only public YouTube video URLs can become an embedded demo. */
export function demoVideo(url: string | undefined) {
  if (!url?.trim()) return null;
  try {
    const parsed = new URL(url.trim());
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.port
    )
      return null;
    const host = parsed.hostname;
    const path = parsed.pathname.split("/").filter(Boolean);
    let id: string | null = null;
    if (host === "youtu.be" && path.length === 1) id = path[0];
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)) {
      if (parsed.pathname === "/watch") id = parsed.searchParams.get("v");
      if (["embed", "shorts"].includes(path[0]) && path.length === 2)
        id = path[1];
    }
    if (!id || !/^[\w-]{11}$/.test(id)) return null;
    return {
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0`,
    };
  } catch {
    return null;
  }
}
