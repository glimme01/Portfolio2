import { motion, useScroll, useTransform } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import React, { useRef } from "react";
import VideoTimeline from "../components/VideoTimeline";
import { TextReveal } from "../components/InteractiveText";

function StickySection({
  children,
  className = "",
  zIndex = 10,
}: {
  children: React.ReactNode;
  className?: string;
  zIndex?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <div
      ref={ref}
      className={`sticky top-20 min-h-screen border-b border-outline overflow-hidden ${className}`}
      style={{ zIndex }}
    >
      <motion.div style={{ opacity, y }} className="h-full w-full">
        {children}
      </motion.div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* ── Section 1: Hero ── bg-surface */}
      <StickySection className="bg-surface" zIndex={10}>
        <div className="flex flex-col lg:flex-row min-h-screen">
          <section className="flex-1 p-8 md:p-12 lg:p-24 flex flex-col justify-between border-r border-outline">
            <div className="relative pt-12">
              <h1 className="font-serif text-[clamp(80px,15vw,160px)] leading-[0.8] tracking-tighter mb-12">
                <TextReveal text="Moritz" />
                <br />
                <span className="italic opacity-40">
                  <TextReveal text="Freund." delay={0.15} />
                </span>
              </h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 0.6, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="max-w-md text-lg leading-relaxed font-sans tracking-tight"
              >
                Ich schneide{" "}
                <span className="text-highlight font-semibold">Videos.</span>
              </motion.p>
            </div>

            <div className="pb-12">
              <Link
                to="/projects"
                className="group inline-flex items-center gap-6 text-xl font-serif italic hover:gap-10 transition-all duration-500"
              >
                Projekte
                <ArrowUpRight size={24} strokeWidth={1} className="group-hover:rotate-45 transition-transform" />
              </Link>
            </div>
          </section>

          {/* Timeline */}
          <section className="flex-1 p-0 relative overflow-hidden bg-primary/5 min-h-[50vh] lg:min-h-0 flex items-center justify-center">
            <div className="absolute top-8 right-8 text-subtle opacity-30">Studio_Ref // Timeline</div>
            <div className="w-full h-full flex items-center justify-center p-8 lg:p-12">
              <div className="w-full h-full max-h-[500px]">
                <VideoTimeline />
              </div>
            </div>
          </section>
        </div>
      </StickySection>

      {/* ── Section 2: About ── bg-surface-low */}
      <StickySection className="bg-surface-low" zIndex={20}>
        <section className="px-8 md:px-12 lg:px-24 py-0 min-h-screen flex items-center">
          <div className="max-w-5xl w-full py-24">
            {/* Left accent bar */}
            <motion.div
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: false }}
              transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
              className="w-[3px] h-16 bg-primary mb-16 origin-top"
            />

            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 0.4 }}
              viewport={{ once: false }}
              className="text-subtle mb-12 uppercase tracking-[0.3em] text-xs font-bold"
            >
              Über mich
            </motion.div>

            <h2 className="font-serif text-5xl md:text-8xl leading-[1.05] mb-16 italic tracking-tighter">
              <span className="text-highlight">"Warum nicht?"</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-end">
              <div className="font-sans text-xl leading-relaxed opacity-60 space-y-2">
                {["Hi.", "Ich bin Moritz.", "Bin 14.", "Schneide Videos."].map((line, i) => (
                  <motion.p
                    key={line}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: false }}
                    transition={{ delay: i * 0.12, duration: 0.5 }}
                  >
                    {line}
                  </motion.p>
                ))}
              </div>

              <div className="flex flex-col gap-4">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "100%" }}
                  viewport={{ once: false }}
                  transition={{ duration: 0.8, ease: [0.19, 1, 0.22, 1] }}
                  className="h-[1px] bg-outline"
                />
                <div className="flex justify-between text-subtle opacity-40">
                  <span>Minimalismus</span>
                  <div className="flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500/40" />
                    <div className="w-2 h-2 rounded-full bg-blue-500/40" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </StickySection>
    </div>
  );
}
