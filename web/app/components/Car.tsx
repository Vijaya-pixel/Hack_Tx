// The demo customer's car: a transparent cutout from a studio photo, kept in /public, so it sits on any surface
// (white, grey or dark) with just a soft ground shadow. Shows a Toyota RAV4 Hybrid (2022 to 2025 styling).
export function Car({ className = '' }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/rav4-cutout.webp" width={1100} height={487} alt="Silver Toyota RAV4 Hybrid with black alloy wheels"
      className={`h-auto w-full select-none drop-shadow-[0_22px_20px_rgba(0,0,0,0.22)] ${className}`} loading="eager" draggable={false} />
  );
}
