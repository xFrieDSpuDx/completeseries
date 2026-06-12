const logoUrl = new URL("../../assets/logo-background-transparent.webp", import.meta.url).href;

type BrandMarkProps = {
  size?: "standard" | "small";
};

/**
 * Purpose: Render the Complete Series logo consistently across staged app
 * screens.
 *
 * @param props - Logo display options.
 * @param props.size - Visual size variant for form headers or compact page
 * headers.
 * @returns The branded logo image.
 */
export function BrandMark({ size = "standard" }: BrandMarkProps) {
  return (
    <div className={`logo-mark logo-mark--${size}`} aria-hidden="true">
      <img src={logoUrl} alt="" />
    </div>
  );
}
