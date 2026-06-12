import { useEffect, useState } from "react";

const placeholderUrl = new URL("../../assets/book-placeholder.svg", import.meta.url).href;

type CoverImageProps = {
  alt?: string;
  className?: string;
  src?: string | null;
};

/**
 * Purpose: Render a cover image with a reliable placeholder while the image is
 * loading or when the provider image cannot be downloaded.
 *
 * @param props - Cover image inputs.
 * @param props.alt - Accessible alt text for the loaded image.
 * @param props.className - Optional image class name.
 * @param props.src - Provider image URL.
 * @returns A cover image element that falls back to the local placeholder.
 */
export function CoverImage({ alt = "", className = "series-image", src }: CoverImageProps) {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [hasErrored, setHasErrored] = useState(false);
  const imageSource = src && !hasErrored ? src : placeholderUrl;

  useEffect(() => {
    setHasLoaded(false);
    setHasErrored(false);
  }, [src]);

  return (
    <img
      alt={alt}
      className={`${className}${hasLoaded ? " cover-image--loaded" : " cover-image--loading"}`}
      decoding="async"
      loading="lazy"
      onError={() => setHasErrored(true)}
      onLoad={() => setHasLoaded(true)}
      referrerPolicy="no-referrer"
      src={imageSource}
    />
  );
}
