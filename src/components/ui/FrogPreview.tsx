import { useEffect, useRef } from 'react';
import { FrogType } from '../../types/game';
import { FROG_STATS } from '@data/constants';

interface FrogPreviewProps {
  frogType: FrogType;
  size?: number;
}

export const FrogPreview: React.FC<FrogPreviewProps> = ({ frogType, size = 48 }) => {
  const canvasRef = useRef < HTMLCanvasElement > (null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get frog color
    const stats = FROG_STATS[frogType];
    const centerX = size / 2;
    const centerY = size / 2;
    const frogSize = size * 0.7; // Make frog slightly smaller than canvas

    // Draw frog body
    ctx.fillStyle = stats.color;
    ctx.beginPath();
    ctx.arc(centerX, centerY, frogSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw eyes (white)
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(centerX - frogSize / 4, centerY - frogSize / 4, frogSize / 6, 0, Math.PI * 2);
    ctx.arc(centerX + frogSize / 4, centerY - frogSize / 4, frogSize / 6, 0, Math.PI * 2);
    ctx.fill();

    // Draw pupils (black)
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(centerX - frogSize / 4, centerY - frogSize / 4, frogSize / 12, 0, Math.PI * 2);
    ctx.arc(centerX + frogSize / 4, centerY - frogSize / 4, frogSize / 12, 0, Math.PI * 2);
    ctx.fill();
  }, [frogType, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ display: 'block' }}
    />
  );
};