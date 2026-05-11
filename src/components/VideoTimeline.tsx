import React from "react";
import { motion } from "motion/react";

interface ClipProps {
  start: number;
  width: number;
  color: string;
  label?: string;
  track?: number;
}

const Clip = ({ start, width, color, label }: ClipProps) => (
  <div
    className={`absolute h-6 border border-black/20 rounded-sm flex items-center px-2 overflow-hidden ${color}`}
    style={{
      left: `${start}%`,
      width: `${width}%`,
      fontSize: "8px",
    }}
  >
    {label && (
      <span className="text-white/60 truncate uppercase font-bold">
        {label}
      </span>
    )}
  </div>
);

export default function VideoTimeline() {
  const videoTracks = [
    {
      id: "V4",
      clips: [
        { start: 10, width: 20, color: "bg-blue-400/40", label: "" },
        { start: 40, width: 30, color: "bg-blue-400/40", label: "" },
      ],
    },
    {
      id: "V3",
      clips: [
        { start: 5, width: 15, color: "bg-purple-500/40", label: "" },
        { start: 25, width: 10, color: "bg-purple-500/40" },
        { start: 60, width: 20, color: "bg-purple-500/40" },
      ],
    },
    {
      id: "V2",
      clips: [
        { start: 0, width: 100, color: "bg-zinc-800/60", label: "" },
      ],
    },
    {
      id: "V1",
      clips: [
        { start: 15, width: 5, color: "bg-yellow-500/40", label: "" },
        { start: 45, width: 8, color: "bg-yellow-500/40" },
        { start: 75, width: 12, color: "bg-yellow-500/40" },
      ],
    },
  ];

  const audioTracks = [
    {
      id: "A1",
      clips: [
        { start: 0, width: 40, color: "bg-green-500/30", label: "" },
        { start: 50, width: 50, color: "bg-green-500/30" },
      ],
    },
    {
      id: "A2",
      clips: [
        { start: 10, width: 80, color: "bg-emerald-500/40", label: "" },
      ],
    },
  ];

  return (
    <div className="w-full h-full bg-[#1e1e1e] border border-outline flex flex-col font-sans select-none overflow-hidden rounded-md shadow-2xl">
      {/* Timecode Header */}
      <div className="h-8 border-b border-white/5 bg-[#252525] flex items-center px-4 justify-between">
        <div className="text-[10px] text-white/40 font-mono tracking-widest">
          01:00:12:00
        </div>

        <div className="flex gap-4">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <div className="w-12 h-1 bg-white/10 rounded-full" />
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Video Section */}
        <div className="flex-1 border-b border-white/10 p-4 space-y-2 relative">
          {videoTracks.map((track) => (
            <div key={track.id} className="flex items-center gap-4 h-6">
              <span className="text-[9px] text-white/30 w-4 font-bold">
                {track.id}
              </span>

              <div className="flex-1 h-full bg-white/[0.02] rounded-sm relative">
                {track.clips.map((clip, i) => (
                  <div key={`${track.id}-clip-${i}`}>
                    <Clip {...clip} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Red Playhead */}
          <motion.div
            animate={{ left: ["20%", "80%", "20%"] }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "linear",
            }}
            className="absolute top-0 bottom-0 w-[1px] bg-red-500 z-20 pointer-events-none"
          >
            <div className="absolute top-0 -left-1 w-2.5 h-2.5 bg-red-500 rotate-45" />
          </motion.div>
        </div>

        {/* Audio Section */}
        <div className="flex-1 p-4 space-y-2 bg-black/20">
          {audioTracks.map((track) => (
            <div key={track.id} className="flex items-center gap-4 h-6">
              <span className="text-[9px] text-white/30 w-4 font-bold">
                {track.id}
              </span>

              <div className="flex-1 h-full bg-white/[0.02] rounded-sm relative">
                {track.clips.map((clip, i) => (
                  <div key={`${track.id}-clip-${i}`}>
                    <Clip {...clip} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="h-6 bg-[#181818] border-t border-white/5 flex items-center px-4 gap-6">
        <div className="flex gap-2">
          <div className="w-1.5 h-1.5 bg-white/10 rounded-sm" />
          <div className="w-1.5 h-1.5 bg-white/10 rounded-sm" />
          <div className="w-1.5 h-1.5 bg-white/10 rounded-sm" />
        </div>

        <div className="text-[8px] text-white/20 uppercase tracking-tighter">
          Timeline_Master_01
        </div>
      </div>
    </div>
  );
}