import { cn } from "cn";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={cn("wb-skeleton", className)}
      {...props}
    />
  );
}

export { Skeleton };
