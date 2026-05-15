import { motion, useSpring, useMotionValue } from "framer-motion";
import { useEffect, useState, useRef } from "react";
import worldMap from "./assets/world_map.png";

export function AnimatedGradientBackground({ showParticles = false }) {
  // Motion values for smooth cursor following
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Smooth out the movement with springs
  const springX = useSpring(mouseX, { stiffness: 60, damping: 25 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 25 });

  const [particles, setParticles] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      let x = e.clientX;
      let y = e.clientY;
      
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
      }

      mouseX.set(x);
      mouseY.set(y);

      if (showParticles) {
        // Add new sparkling particle
        const newParticle = {
          id: Math.random(),
          x,
          y,
          size: Math.random() * 4 + 2,
          color: Math.random() > 0.5 ? "#f472b6" : "#fbbf24", // Pink or Yellow
        };
        setParticles((prev) => [...prev.slice(-15), newParticle]);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY, showParticles]);

  return (
    <div ref={containerRef} className="absolute inset-0 bg-black overflow-hidden pointer-events-none z-0">
      
      {/* 1. Deep Core Base Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900/40 via-black to-black" />

      {/* 2. World Map Texture Layer */}
      <div 
        className="absolute inset-0 opacity-[0.25] mix-blend-screen"
        style={{
          backgroundImage: `url(${worldMap})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* 3. Interactive Spectrum Bloom (Emerging Effect) */}
      <motion.div
        className="absolute rounded-full mix-blend-screen opacity-50"
        style={{
          width: 600,
          height: 600,
          left: -300,
          top: -300,
          x: springX,
          y: springY,
          background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(236,72,153,0.25) 20%, rgba(234,179,8,0.18) 40%, rgba(6,182,212,0.12) 60%, rgba(0,0,0,0) 80%)",
          filter: "blur(60px)",
        }}
        animate={{
          scale: [1, 1.12, 1],
        }}
        transition={{
          duration: 3.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* 4. Particle Trail (Sparkles) */}
      {showParticles && particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0.8, scale: 0.5, x: p.x - 20, y: p.y }}
          animate={{ opacity: 0, scale: 1.5, x: p.x, y: p.y }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 10px ${p.color}`,
          }}
        />
      ))}

      {/* 5. Vibrant Pink Bloom (Top Right) */}
      <motion.div
        className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full mix-blend-screen"
        style={{
          background: "radial-gradient(circle, rgba(236, 72, 153, 0.45) 0%, rgba(0,0,0,0) 65%)",
          filter: "blur(90px)",
        }}
        animate={{ 
          scale: [1, 1.25, 1],
          opacity: [0.4, 0.65, 0.4],
          x: [0, -30, 0],
          y: [0, 20, 0]
        }}
        transition={{ 
          duration: 12, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      />

      {/* 6. Warm Yellow Bloom (Bottom Left) */}
      <motion.div
        className="absolute bottom-[-10%] left-[-10%] w-[800px] h-[800px] rounded-full mix-blend-screen"
        style={{
          background: "radial-gradient(circle, rgba(234, 179, 8, 0.4) 0%, rgba(0,0,0,0) 65%)",
          filter: "blur(120px)",
        }}
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.55, 0.3],
          x: [0, 50, 0],
          y: [0, -40, 0] 
        }}
        transition={{ 
          duration: 16, 
          repeat: Infinity, 
          ease: "easeInOut", 
          delay: 1
        }}
      />
      
    </div>
  );
}



