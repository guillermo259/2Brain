import React, { useRef, useEffect } from 'react';

interface DotFieldProps {
  width: number;
  height: number;
  mousePos: { x: number; y: number } | null;
}

export const DotField: React.FC<DotFieldProps> = ({ width, height, mousePos }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const currentMouseRef = useRef({ x: -1000, y: -1000 });

  // Smooth mouse interpolation for fluid wave feel
  useEffect(() => {
    if (mousePos) {
      currentMouseRef.current = mousePos;
    }
  }, [mousePos]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const dotSpacing = 20;
    const baseRadius = 0.65;
    const hoverRadius = 160;

    let targetMouseX = currentMouseRef.current.x;
    let targetMouseY = currentMouseRef.current.y;
    let smoothMouseX = targetMouseX;
    let smoothMouseY = targetMouseY;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      targetMouseX = currentMouseRef.current.x * dpr;
      targetMouseY = currentMouseRef.current.y * dpr;

      // Smooth lerp mouse
      smoothMouseX += (targetMouseX - smoothMouseX) * 0.12;
      smoothMouseY += (targetMouseY - smoothMouseY) * 0.12;

      const cols = Math.ceil((width * dpr) / (dotSpacing * dpr)) + 1;
      const rows = Math.ceil((height * dpr) / (dotSpacing * dpr)) + 1;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * dotSpacing * dpr;
          const y = j * dotSpacing * dpr;

          const dx = x - smoothMouseX;
          const dy = y - smoothMouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let r = baseRadius * dpr;
          let alpha = 0.12;
          let color = '255, 255, 255';

          if (dist < hoverRadius * dpr) {
            const factor = 1 - dist / (hoverRadius * dpr);
            r = (baseRadius + factor * 1.2) * dpr;
            alpha = 0.12 + factor * 0.55;

            // Subtle color tint near mouse (coral accent)
            if (factor > 0.4) {
              color = '254, 118, 116';
            } else {
              color = '200, 191, 255';
            }
          }

          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${color}, ${alpha})`;
          ctx.fill();
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-80"
    />
  );
};
