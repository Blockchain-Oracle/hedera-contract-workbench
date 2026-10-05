"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUpRight, Film, Play } from "lucide-react";
import { Button } from "./ui/button";

export function DemoVideo({
  video,
}: {
  video: { watchUrl: string; embedUrl: string } | null;
}) {
  const [playing, setPlaying] = useState(false);
  return (
    <figure className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 text-xs sm:px-6">
        <span className="flex items-center gap-2 font-medium">
          <Film className="size-3.5" aria-hidden="true" /> Product walkthrough
        </span>
        <span className="text-muted-foreground">
          {video ? "Video available" : "YouTube video pending"}
        </span>
      </div>
      <div
        className={`relative aspect-video w-full bg-[#121316] ${video ? "" : "min-h-64 sm:min-h-0"}`}
      >
        {playing && video ? (
          <iframe
            src={video.embedUrl}
            title="Contract Workbench product demonstration"
            className="absolute inset-0 size-full border-0"
            allow="encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <>
            <Image
              src="/demo/functions.png"
              alt="The actual contract workspace behind the upcoming video"
              fill
              preload
              unoptimized
              className="object-cover opacity-10"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center text-[#f4f4f5]">
              {video ? (
                <>
                  <button
                    onClick={() => setPlaying(true)}
                    aria-label="Load the Contract Workbench demo video"
                    className="mb-4 grid size-14 place-items-center rounded-full border border-white/30 bg-white/10 transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:size-18"
                  >
                    <Play
                      className="size-5 fill-current sm:size-6"
                      aria-hidden="true"
                    />
                  </button>
                  <p className="max-w-full text-xl font-medium tracking-tight sm:text-3xl">
                    See Contract Workbench in action.
                  </p>
                  <p className="mt-3 hidden text-sm text-[#c3c4ca] sm:block">
                    Press play to load the YouTube player.
                  </p>
                </>
              ) : (
                <>
                  <Film
                    className="mb-4 size-6 text-[#c3c4ca] sm:size-8"
                    aria-hidden="true"
                  />
                  <p className="max-w-full text-xl font-medium tracking-tight sm:text-3xl">
                    The walkthrough is on its way.
                  </p>
                  <p className="mt-3 w-full max-w-sm text-xs leading-5 text-[#c3c4ca] sm:text-sm">
                    The recording is coming to YouTube. You can already try a
                    real contract below.
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    asChild
                    className="mt-5"
                  >
                    <a href="#try-it">
                      Try the live demo{" "}
                      <ArrowDown className="size-3.5" aria-hidden="true" />
                    </a>
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs leading-5 text-muted-foreground sm:px-6">
        <span>
          {video
            ? "Browser, terminal and agents — the same typed contract tools."
            : "Video pending. The screenshots and interactive demo below come from the working product."}
        </span>
        {video && (
          <a
            href={video.watchUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1 font-medium text-foreground hover:underline"
          >
            Watch on YouTube{" "}
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </a>
        )}
      </figcaption>
    </figure>
  );
}
