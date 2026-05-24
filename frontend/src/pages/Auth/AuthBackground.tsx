/**
 * AuthBackground – shared full-page wrapper for all auth pages.
 * Renders the MarketMind background image with a dark overlay,
 * then centres its children on top.
 */
export function AuthBackground({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 relative text-[var(--text-color)]"
      style={{
        backgroundImage: "url('/MarketMind%20Bgr.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60" />
      {/* Content */}
      <div className="relative z-10 w-full flex flex-col items-center">
        {children}
      </div>
    </div>
  );
}
