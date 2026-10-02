import { useEffect, useRef, useState } from 'react'

// A 1080×1350 submission fits without cropping. Essential details live in text.
export function EventPoster({
  imageUrl,
  title,
}: {
  imageUrl: string | null
  title: string
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const image = useRef<HTMLImageElement>(null)
  useEffect(() => {
    // A failed SSR image may finish before React can attach its error handler.
    if (imageUrl && image.current?.complete && image.current.naturalWidth === 0)
      setFailedUrl(imageUrl)
  }, [imageUrl])
  return (
    <figure className="w-full min-w-0 max-w-sm">
      {imageUrl && failedUrl !== imageUrl ? (
        <img
          ref={image}
          alt={`${title} poster`}
          className="aspect-[4/5] w-full rounded-md bg-muted object-contain"
          src={imageUrl}
          onError={() => setFailedUrl(imageUrl)}
        />
      ) : (
        <div className="flex aspect-[4/5] items-center justify-center rounded-md border bg-muted p-6 text-center text-muted-foreground">
          Poster unavailable
        </div>
      )}
      {imageUrl ? (
        <figcaption className="mt-2 text-sm">
          <a
            className="underline underline-offset-4 focus-visible:outline-2"
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open original poster
          </a>
        </figcaption>
      ) : null}
    </figure>
  )
}
