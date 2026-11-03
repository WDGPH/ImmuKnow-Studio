import { expect, test } from "@playwright/test";

for (const shape of ["square", "dots", "rounded"]) {
  for (const corner of ["square", "rounded"]) {
    test(`QR ${shape} modules with ${corner} corners have solid marker centres`, async ({
      page,
    }) => {
      await page.goto("proof.html");
      await page.waitForFunction(() => Boolean(window.proof?.compiler.compilerVersion));
      const revision = await page.evaluate(
        ({ shape, corner }) => {
          const job = window.proof.job;
          const source = `#import "setup.typ": *
#show: immuknow.letter
#immuknow.qr-code(url: "https://example.org/update", width: 113.7pt,
  foreground: rgb("176b78"), module-shape: "${shape}", corner-style: "${corner}")`;
          return window.proof.submit([
            {
              ...job,
              files: { ...job.files, [`/${job.template}`]: new TextEncoder().encode(source) },
            },
          ]);
        },
        { shape, corner },
      );
      await page.waitForFunction(
        (revision) =>
          Boolean(
            window.proof.results.find((result) => result.revision === revision)?.timing?.committed,
          ),
        revision,
      );
      const colours = await page.evaluate((revision) => {
        const preview = window.proof.results.find(
          (result) => result.revision === revision,
        )?.preview;
        const link = preview?.pages[0].links?.find(
          (link) => "url" in link && link.url === "https://example.org/update",
        );
        const canvas = document.querySelector<HTMLCanvasElement>(".preview-page canvas");
        if (!preview || !link || !canvas) throw new Error("Missing QR preview");
        const scale = canvas.width / preview.pages[0].width;
        const unit = link.width / 33; // Version 2, including the four-module quiet zone.
        const left = Math.ceil((link.x + 6.5 * unit) * scale);
        const top = Math.ceil((link.y + 6.5 * unit) * scale);
        const right = Math.floor((link.x + 8.5 * unit) * scale);
        const bottom = Math.floor((link.y + 8.5 * unit) * scale);
        const pixels = canvas
          .getContext("2d")
          ?.getImageData(left, top, right - left, bottom - top).data;
        if (!pixels?.length) throw new Error("Missing QR pixels");
        const colours = new Set<string>();
        for (let i = 0; i < pixels.length; i += 4)
          colours.add(Array.from(pixels.slice(i, i + 4)).join(","));
        return [...colours];
      }, revision);
      expect(colours).toEqual(["23,107,120,255"]);
    });
  }
}
