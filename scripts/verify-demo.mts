import assert from "node:assert/strict";
import { demoVideo } from "../packages/nextjs/lib/demo-video.ts";

// Synthetic IDs test URL handling; they are never configured as product media.
const id = "a1B2c3D4e5F";
for (const input of [
  `https://youtu.be/${id}?si=tracking`,
  `https://www.youtube.com/watch?v=${id}&list=unused`,
  `https://m.youtube.com/watch?v=${id}`,
  `https://youtube.com/embed/${id}`,
  `https://www.youtube.com/shorts/${id}`,
]) {
  assert.deepEqual(demoVideo(input), {
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0`,
  });
}
for (const input of [
  undefined,
  "",
  " ",
  "not-a-url",
  `http://youtu.be/${id}`,
  `https://youtube.com.evil.example/watch?v=${id}`,
  `https://evil.example/?v=${id}`,
  `https://user:password@youtu.be/${id}`,
  `https://youtu.be:444/${id}`,
  "https://youtu.be/short",
  `https://youtu.be/${id}/extra`,
  "javascript:alert(1)",
  "https://youtube.com/watch?v=%3Ciframe%3E",
])
  assert.equal(demoVideo(input), null);
console.log(
  "Demo video: 5 supported URL shapes and 13 missing/unsafe values pass.",
);
