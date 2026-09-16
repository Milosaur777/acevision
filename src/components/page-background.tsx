"use client";

export default function PageBackground({
  mobileSrc,
  desktopSrc,
}: {
  mobileSrc: string;
  desktopSrc: string;
}) {
  return (
    <div className="fixed inset-0 -z-10 animate-fade-in">
      <img
        src={mobileSrc}
        alt=""
        className="w-full h-full object-cover md:hidden"
      />
      <img
        src={desktopSrc}
        alt=""
        className="w-full h-full object-cover hidden md:block"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background md:from-background/60 md:via-background/40 md:to-background" />
    </div>
  );
}
