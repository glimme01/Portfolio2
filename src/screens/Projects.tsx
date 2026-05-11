import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { TextReveal, MagneticText } from "../components/InteractiveText";

const projects = [
  {
    id: "01",
    title: "Showreel",
    tags: ["Clean"],
    info: "Apple Style / Clean / Motion Graphics",
  },
  {
    id: "02",
    title: "Nix mehr",
    tags: ["", ""],
    info: "leer / leer",
  },
];

export default function Projects() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col"
    >
      <header className="px-8 md:px-12 lg:px-24 py-32 border-b border-outline">
        <div className="flex items-center gap-4 text-subtle mb-10 opacity-30">
          <div className="w-1.5 h-1.5 bg-primary rounded-full" />
          Archive // Selected_Works
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-baseline gap-12">
          <h1 className="font-serif text-[clamp(64px,12vw,160px)] leading-none tracking-tighter italic">
            <TextReveal text="Work." />
          </h1>

          <div className="max-w-md border-l border-outline pl-10">
            <p className="text-sm font-sans leading-relaxed opacity-60 uppercase tracking-widest font-bold">
              Passt schon.
            </p>
          </div>
        </div>
      </header>

      {/* Project Index */}
      <section className="bg-surface">
        {projects.map((project, i) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group border-b border-outline hover:bg-primary/5 transition-all cursor-pointer"
          >
            <div className="px-8 md:px-12 lg:px-24 py-20 md:py-28 grid grid-cols-1 md:grid-cols-12 items-center gap-10">
              <div className="md:col-span-1 font-serif italic text-2xl opacity-10 group-hover:opacity-100 transition-opacity duration-500">
                {project.id}
              </div>

              <div className="md:col-span-6">
                {/* Title: slides right + italicizes on hover, each char animates in */}
                <h2 className="font-serif text-5xl md:text-8xl tracking-tighter group-hover:italic group-hover:translate-x-4 transition-all duration-700 italic md:not-italic">
                  <span className="text-highlight">{project.title}</span>
                </h2>
              </div>

              <div className="md:col-span-3 text-subtle opacity-30 lowercase group-hover:opacity-100 transition-opacity duration-500 font-bold tracking-[0.2em]">
                {project.info}
              </div>

              <div className="md:col-span-2 flex justify-end">
                <MagneticText>
                  <div className="w-16 h-16 border border-outline rounded-full flex items-center justify-center group-hover:bg-primary group-hover:text-surface transition-all duration-500">
                    <Plus size={24} strokeWidth={1} className="group-hover:rotate-45 transition-transform duration-500" />
                  </div>
                </MagneticText>
              </div>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Collaboration Area */}
      <section className="py-60 px-8 text-center border-b border-outline bg-primary text-surface relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 artistic-grid" />
        <div className="relative z-10">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.4 }}
            viewport={{ once: true }}
            className="text-sm text-surface mb-12 block tracking-[0.5em] italic"
          >
            Open for Collaboration
          </motion.span>
          <h2 className="font-serif text-6xl md:text-[140px] leading-none mb-16 tracking-tighter italic">
            <TextReveal text="Connect." />
          </h2>
          <MagneticText>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                to="/contact"
                className="font-serif text-2xl italic border-b border-surface/30 pb-2 hover:border-surface transition-colors"
              >
                Email_an_Moritz
              </Link>
            </motion.div>
          </MagneticText>
        </div>
      </section>
    </motion.div>
  );
}
