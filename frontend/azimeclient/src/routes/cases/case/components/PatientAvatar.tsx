import { cn } from "@/lib/utils";

export function PatientAvatar({
  firstName,
  lastName,
  className,
}: {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  className?: string;
}) {
  const initials = [firstName, lastName]
    .map((part) => part?.trim().charAt(0) ?? "")
    .join("")
    .toUpperCase();
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-blue-600 font-semibold text-white",
        className
      )}
    >
      {initials || "?"}
    </div>
  );
}
