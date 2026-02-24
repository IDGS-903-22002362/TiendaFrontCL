import { cn } from "@/lib/utils";

export function Logo({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-8 w-auto", className)}
      {...props}
    >
      <path d="M14.5 7.5a2.5 2.5 0 0 1 5 0 2.5 2.5 0 0 1-5 0Z" />
      <path d="M12 12H2v4h10v-4Z" />
      <path d="M12 12V2" />
      <path d="m19 19-3-3" />
      <path d="m14 14 5 5" />
    </svg>
  );
}
