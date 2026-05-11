import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

const sections = [
  {
    id: "01",
    label: "Edit",
    headline: "Jeder Schnitt ist eine Entscheidung.",
    sub: "Timing ist alles.",
    accent: "var(--color-primary)",
    bg: "bg-surface",
    textClass: "text-primary",
  },
  {
    id: "02",
    label: "Color",
    headline: "Farbe formt Emotion.",
    sub: "HDR. Film Emulation. Präzision.",
    accent: "#C2855A",
    bg: "bg-surface-low",
    textClass: "text-primary",
  },
  {
    id: "03",
    label: "Motion",
    headline: "Bewegung erzählt.",
    sub: "Motion Graphics. VFX. Fusion.",
    accent: "#5A7AC2",
    bg: "bg-surface-lowest",
    textClass: "text-primary",
  },
  {
    id: "04",
    label: "Sound",
    headline: "Stille ist auch Ton.",
    sub: "Mix. Atmosphäre. Immersion.",
    accent: "#7AC25A",
    bg: "bg-surface-high",
    textClass: "text-primary",
  },
];

type Section = (typeof sections)[number];

function StickyPanel({
  section,
  index,
}: {
  section: Section;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);

  const opacity = useTransform(
    scrollYProgress,
    [0, 0.2, 0.8, 1],
    [0, 1, 1, 0]
  );

  return (
    <div
      ref={ref}
      className={`h-screen sticky top-0 overflow-hidden flex items-center justify-center ${section.bg} border-b border-outline`}
      style={{ zIndex: 10 + index }}
    >
      <span
        className="absolute right-8 bottom-8 font-serif italic opacity-5 select-none pointer-events-none"
        style={{ fontSize: "clamp(120px, 25vw, 300px)", lineHeight: 1 }}
      >
        {section.id}
      </span>

      <motion.div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: section.accent }}
        initial={{ scaleY: 0 }}
        whileInView={{ scaleY: 1 }}
        viewport={{ once: false, margin: "-20%" }}
        transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
      />

      <motion.div
        style={{ y, opacity }}
        className="px-12 md:px-24 lg:px-40 max-w-5xl w-full"
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 0.4, x: 0 }}
          viewport={{ once: false, margin: "-15%" }}
          transition={{ duration: 0.5 }}
          className="text-subtle uppercase tracking-[0.4em] text-sm mb-10 font-bold"
        >
          {section.label}
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-15%" }}
          transition={{
            duration: 0.7,
            delay: 0.1,
            ease: [0.19, 1, 0.22, 1],
          }}
          className={`font-serif italic tracking-tighter leading-[0.9] mb-12 ${section.textClass}`}
          style={{ fontSize: "clamp(48px, 8vw, 120px)" }}
        >
          {section.headline}
        </motion.h2>

        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: "100%" }}
          viewport={{ once: false, margin: "-15%" }}
          transition={{
            duration: 0.9,
            delay: 0.2,
            ease: [0.19, 1, 0.22, 1],
          }}
          className="h-[1px] bg-outline mb-12"
        />

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 0.6, y: 0 }}
          viewport={{ once: false, margin: "-15%" }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="font-sans text-xl tracking-wide"
        >
          {section.sub}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: false, margin: "-15%" }}
          transition={{ delay: 0.5 }}
          className="flex gap-2 mt-16"
        >
          {[...Array(4)].map((_, i) => (
            <div
              key={`dot-${section.id}-${i}`}
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: section.accent,
                opacity: i === 0 ? 1 : 0.2 + i * 0.05,
              }}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}

export default function ScrollStory() {
  return (
    <div className="relative">
      <div className="px-8 md:px-12 lg:px-24 py-20 border-b border-outline bg-surface sticky top-20 z-50 flex items-center gap-6">
        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />

        <span className="text-subtle opacity-40 uppercase tracking-[0.3em] text-xs font-bold">
          Disziplinen // Scroll to explore
        </span>
      </div>

      {sections.map((section, i) => (
        <div key={section.id}>
          <StickyPanel section={section} index={i} />
        </div>
      ))}
    </div>
  );
}