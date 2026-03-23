export default function SectionTitle({ eyebrow, title, body }) {
  return (
    <div className="max-w-2xl">
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.3em] text-mint-300">{eyebrow}</p> : null}
      <h2 className={`${eyebrow ? "mt-3" : ""} font-display text-3xl text-white md:text-4xl`}>{title}</h2>
      <p className="mt-4 text-sm leading-7 text-slate-300 md:text-base">{body}</p>
    </div>
  );
}
