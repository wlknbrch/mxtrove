import { env } from "@/lib/env";

export function OperatorContact({ className }: { className?: string }) {
  return env.contactEmail ? (
    <a href={`mailto:${env.contactEmail}`} className={className}>{env.contactEmail}</a>
  ) : <span>Contact your instance operator.</span>;
}
