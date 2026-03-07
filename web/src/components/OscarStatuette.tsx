interface OscarStatuetteProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function OscarStatuette({ size = 24, className, style }: OscarStatuetteProps) {
  return (
    <img
      src="/oscar-statue.png"
      alt=""
      aria-hidden="true"
      className={className}
      style={{
        height: size,
        width: "auto",
        objectFit: "contain",
        ...style,
      }}
    />
  );
}
