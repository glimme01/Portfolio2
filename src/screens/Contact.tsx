import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { TextReveal, MagneticText } from "../components/InteractiveText";

const encodedContact = "aGlAbW9yaXR6ZnJldW5kLmRl";
const visibleContact = ["hi", "moritzfreund", "de"];

function getContactAddress() {
  return atob(encodedContact);
}

export default function Contact() {
  const openMail = () => {
    window.location.href = `mailto:${getContactAddress()}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-surface"
    >
      <section className="min-h-screen px-8 md:px-20 lg:px-24 py-24 border-b border-outline flex flex-col justify-between">
        <div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            transition={{ delay: 0.1 }}
            className="text-subtle mb-10 flex items-center gap-4"
          >
            <div className="w-2 h-2 bg-primary rounded-full opacity-40" />
            Volume 01 // Kontakt
          </motion.div>

          <h1 className="font-serif text-[clamp(56px,11vw,150px)] leading-[0.85] tracking-tighter italic">
            <TextReveal text="Mail." />
          </h1>
        </div>

        <div className="max-w-5xl w-full">
          <MagneticText>
            <motion.button
              type="button"
              onClick={openMail}
              whileHover={{ x: 10 }}
              className="group flex flex-col md:flex-row md:items-center gap-8 md:gap-12 text-left"
            >
              <div className="w-20 h-20 md:w-24 md:h-24 border border-outline rounded-full flex items-center justify-center group-hover:bg-primary group-hover:text-surface transition-all duration-500 shrink-0">
                <ArrowUpRight size={28} strokeWidth={1} />
              </div>

              <span className="font-serif text-[clamp(36px,7vw,92px)] leading-none italic tracking-tighter break-words text-highlight">
                {visibleContact[0]}
                <span className="opacity-45"> [at] </span>
                {visibleContact[1]}
                <span className="opacity-45"> [dot] </span>
                {visibleContact[2]}
              </span>
            </motion.button>
          </MagneticText>
        </div>
      </section>
    </motion.div>
  );
}
