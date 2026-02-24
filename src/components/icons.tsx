import { cn } from "@/lib/utils";

export function Logo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 125"
      className={cn("h-8 w-auto", className)}
      {...props}
    >
      <path
        fill="#007A53"
        d="M50 0L10 20v60l40 20 40-20V20L50 0z"
      />
      <path
        fill="#FFC845"
        d="M50 5l35 17.5v55L50 95 15 77.5v-55L50 5z"
      />
      <path
        fill="#007A53"
        d="M50 10.8L20 26v48l30 15.2 30-15.2V26L50 10.8z"
      />
      <text 
        x="50" 
        y="62" 
        fontFamily="Impact, sans-serif"
        fontSize="30"
        fill="#FFC845"
        textAnchor="middle"
        stroke="#2D2926"
        strokeWidth="1.5"
      >
        LEÓN
      </text>
    </svg>
  );
}
