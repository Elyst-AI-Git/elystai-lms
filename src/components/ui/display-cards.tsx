"use client";

import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import { useIsTouch } from "@/lib/use-touch";

interface DisplayCardProps {
  className?: string;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  date?: string;
  iconClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  dateClassName?: string;
}

function DisplayCard({
  className,
  icon = <Sparkles className="size-4 text-blue-300" />,
  title = "Featured",
  description = "Discover amazing content",
  date = "Just now",
  iconClassName = "text-blue-500",
  titleClassName = "text-blue-500",
  descriptionClassName = "text-lg leading-snug text-fg-2",
  dateClassName = "text-base font-semibold uppercase tracking-wide text-fg-3",
}: DisplayCardProps) {
  // backdrop-blur-sm is a per-frame compositing cost on a stack of 3
  // overlapping cards; the hover lift/scale (transition-all) never fires on
  // touch since there's no hover. Drop both on touch, keep desktop as-is.
  const isTouch = useIsTouch();
  return (
    <div
      className={cn(
        "relative flex h-64 w-[32rem] -skew-y-[8deg] select-none flex-col justify-between rounded-xl border-2 bg-card/90 px-7 py-6 after:absolute after:-right-1 after:top-[-5%] after:h-[110%] after:w-[30rem] after:bg-gradient-to-l after:from-background after:to-transparent after:content-[''] [&>*]:flex [&>*]:items-center [&>*]:gap-3",
        isTouch ? "" : "backdrop-blur-sm transition-all duration-700 hover:bg-card",
        className
      )}
    >
      <div>
        <span className={cn("relative inline-flex items-center justify-center rounded-full p-2.5", iconClassName)}>
          {icon}
        </span>
        <p className={cn("font-bold", titleClassName)}>{title}</p>
      </div>
      <p className={cn(descriptionClassName)}>{description}</p>
      <p className={cn(dateClassName)}>{date}</p>
    </div>
  );
}

interface DisplayCardsProps {
  cards?: DisplayCardProps[];
}

export default function DisplayCards({ cards }: DisplayCardsProps) {
  const defaultCards = [
    {
      className: "[grid-area:stack] hover:-translate-y-10 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration:700 hover:grayscale-0 before:left-0 before:top-0",
    },
    {
      className: "[grid-area:stack] translate-x-16 translate-y-10 hover:-translate-y-1 before:absolute before:w-[100%] before:outline-1 before:rounded-xl before:outline-border before:h-[100%] before:content-[''] before:bg-blend-overlay before:bg-background/50 grayscale-[100%] hover:before:opacity-0 before:transition-opacity before:duration:700 hover:grayscale-0 before:left-0 before:top-0",
    },
    {
      className: "[grid-area:stack] translate-x-32 translate-y-20 hover:translate-y-10",
    },
  ];

  const displayCards = cards || defaultCards;

  return (
    <div className="grid [grid-template-areas:'stack'] place-items-center opacity-100 animate-in fade-in-0 duration-700">
      {displayCards.map((cardProps, index) => (
        <DisplayCard key={index} {...cardProps} />
      ))}
    </div>
  );
}