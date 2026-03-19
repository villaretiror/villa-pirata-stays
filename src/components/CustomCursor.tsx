import React, { useState, useEffect } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';

const CustomCursor: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [hoveredEl, setHoveredEl] = useState<string | null>(null);

  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  const springConfig = { damping: 25, stiffness: 250 };
  const springX = useSpring(cursorX, springConfig);
  const springY = useSpring(cursorY, springConfig);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);

      const target = e.target as HTMLElement;
      const isExperience = target.closest('[data-cursor="experience"]');
      const isInteractive = target.closest('button, a, input, [role="button"]');

      if (isExperience) setHoveredEl('experience');
      else if (isInteractive) setHoveredEl('pointer');
      else setHoveredEl(null);
    };

    window.addEventListener('mousemove', moveCursor);
    return () => {
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('resize', checkMobile);
    };
  }, [cursorX, cursorY]);

  if (isMobile) return null;

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 w-8 h-8 rounded-full border border-primary/30 pointer-events-none z-[9999] mix-blend-difference flex items-center justify-center overflow-hidden bg-white/5 backdrop-blur-[2px]"
        style={{
          translateX: springX,
          translateY: springY,
          x: '-50%',
          y: '-50%',
          width: hoveredEl === 'experience' ? 120 : hoveredEl === 'pointer' ? 40 : 20,
          height: hoveredEl === 'experience' ? 120 : hoveredEl === 'pointer' ? 40 : 20,
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 150 }}
      >
        {hoveredEl === 'experience' && (
          <motion.span 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-[10px] font-black uppercase tracking-tighter text-primary whitespace-nowrap"
          >
            Vivir la Experiencia
          </motion.span>
        )}
      </motion.div>
      
      {/* Follower Dot */}
      <motion.div
        className="fixed top-0 left-0 w-1.5 h-1.5 bg-primary rounded-full pointer-events-none z-[10000]"
        style={{
          translateX: cursorX,
          translateY: cursorY,
          x: '-50%',
          y: '-50%',
        }}
      />
    </>
  );
};

export default CustomCursor;
