interface Props {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-4xl",
};

export function AulaLogo({ size = "md", className = "" }: Props) {
  return (
    <span
      className={`font-heading font-extrabold tracking-tight ${SIZE_CLASSES[size]} ${className}`}
      aria-label="AULA"
    >
      <span className="text-aula-blue">A</span>
      <span className="text-aula-red">U</span>
      <span className="text-aula-yellow">L</span>
      <span className="text-aula-green">A</span>
    </span>
  );
}
