interface CoinIconProps {
  size?: number;
  className?: string;
}

export const CoinIcon = ({ size = 16, className = '' }: CoinIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    className={`inline-block align-middle ${className}`}
    style={{ verticalAlign: 'middle' }}
  >
    <circle cx="10" cy="10" r="9" fill="#FFD700" stroke="#B8860B" strokeWidth="1.5" />
    <circle cx="10" cy="10" r="6" fill="none" stroke="#DAA520" strokeWidth="1" />
    <ellipse cx="8" cy="7" rx="3" ry="2" fill="#FFF8DC" opacity="0.4" />
  </svg>
);
