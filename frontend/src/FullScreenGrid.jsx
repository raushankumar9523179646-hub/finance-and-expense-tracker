import { motion } from 'framer-motion';

export function FullScreenGrid() {
  return (
    // The container covers the whole screen, is pushed to the back (z-0), and ignores clicks
    <div className="absolute inset-0 bg-black overflow-hidden pointer-events-none z-0">
      
      {/* Container for the grids, more visible now */}
      <div className="absolute inset-0 opacity-[0.45]">
        
        {/* 1. Large Animated Grid (4rem spacing) */}
        <motion.div 
          // We make it 200% size so as it drifts, it doesn't run out of space before looping
          className="absolute inset-0 w-[200%] h-[200%]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(34, 211, 238, 0.5) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(34, 211, 238, 0.5) 1px, transparent 1px)
            `,
            backgroundSize: '4rem 4rem', // Large squares
          }}
          animate={{
            x: [0, -64], // Moves left by exactly 4rem (64px) to loop perfectly
            y: [0, -64], // Moves up by exactly 4rem (64px) to loop perfectly
          }}
          transition={{
            duration: 8,       // How long it takes to move 1 square. Lower = faster.
            repeat: Infinity,  // Loops forever
            ease: "linear"     // Keeps the speed consistent, no easing
          }}
        />
        
        {/* 2. Smaller Static Subdivision Grid (1rem spacing) */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(34, 211, 238, 0.25) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(34, 211, 238, 0.25) 1px, transparent 1px)
            `,
            backgroundSize: '1rem 1rem', // Small squares
          }}
        />

      </div>
    </div>
  );
}
