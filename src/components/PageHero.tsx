import Reveal from "./Reveal";

export default function PageHero({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="relative flex min-h-[52vh] items-center justify-center overflow-hidden bg-obsidian pt-20">
      <div className="absolute inset-0 bg-radial-fade opacity-80" />
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #c9a961 0, #c9a961 1px, transparent 1px, transparent 60px)",
        }}
      />
      <div className="container-lux relative z-10 py-24 text-center">
        <Reveal>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="heading-xl mt-6">{title}</h1>
          {subtitle && (
            <p className="body-muted mx-auto mt-6 max-w-2xl text-lg">{subtitle}</p>
          )}
        </Reveal>
      </div>
    </section>
  );
}
