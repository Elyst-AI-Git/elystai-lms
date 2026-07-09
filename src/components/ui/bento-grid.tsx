"use client";

import { cn } from "@/lib/utils";
import {
    CheckCircle,
    TrendingUp,
    Video,
    Globe,
} from "lucide-react";

export interface BentoItem {
    title: string;
    description: string;
    icon: React.ReactNode;
    status?: string;
    tags?: string[];
    meta?: string;
    cta?: string;
    colSpan?: number;
    hasPersistentHover?: boolean;
}

interface BentoGridProps {
    items: BentoItem[];
}

const itemsSample: BentoItem[] = [
    {
        title: "Analytics Dashboard",
        meta: "v2.4.1",
        description:
            "Real-time metrics with AI-powered insights and predictive analytics",
        icon: <TrendingUp className="w-4 h-4 text-blue-500" />,
        status: "Live",
        tags: ["Statistics", "Reports", "AI"],
        colSpan: 2,
        hasPersistentHover: true,
    },
    {
        title: "Task Manager",
        meta: "84 completed",
        description: "Automated workflow management with priority scheduling",
        icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
        status: "Updated",
        tags: ["Productivity", "Automation"],
    },
    {
        title: "Media Library",
        meta: "12GB used",
        description: "Cloud storage with intelligent content processing",
        icon: <Video className="w-4 h-4 text-purple-500" />,
        tags: ["Storage", "CDN"],
        colSpan: 2,
    },
    {
        title: "Global Network",
        meta: "6 regions",
        description: "Multi-region deployment with edge computing",
        icon: <Globe className="w-4 h-4 text-sky-500" />,
        status: "Beta",
        tags: ["Infrastructure", "Edge"],
    },
];

function BentoGrid({ items = itemsSample }: BentoGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-7xl mx-auto">
            {items.map((item, index) => {
                const isBlack = item.colSpan === 2;
                return (
                    <div
                        key={index}
                        className={cn(
                            "group relative p-6 rounded-2xl overflow-hidden transition-all duration-300",
                            "border border-white/10",
                            "hover:shadow-[0_10px_30px_rgba(3,98,76,0.28)]",
                            "hover:-translate-y-1 will-change-transform",
                            isBlack ? "bg-black" : "bg-[#03543B]",
                            isBlack ? "md:col-span-2" : "col-span-1",
                            {
                                "shadow-[0_10px_30px_rgba(3,98,76,0.28)] -translate-y-1":
                                    item.hasPersistentHover,
                            }
                        )}
                    >
                        {/* Dotted radial overlay — brighter on black cards */}
                        <div
                            className={`absolute inset-0 ${
                                item.hasPersistentHover
                                    ? "opacity-100"
                                    : "opacity-0 group-hover:opacity-100"
                            } transition-opacity duration-300`}
                        >
                            <div
                                className="absolute inset-0 bg-[length:5px_5px]"
                                style={{
                                    backgroundImage: `radial-gradient(circle at center, ${
                                        isBlack
                                            ? "rgba(255,255,255,0.18)"
                                            : "rgba(255,255,255,0.08)"
                                    } 1px, transparent 1px)`,
                                }}
                            />
                        </div>

                        <div className="relative flex flex-col space-y-3">
                            <div className="flex items-center justify-between">
                                <span
                                    className="inline-flex h-11 w-11 items-center justify-center rounded-md"
                                    style={
                                        isBlack
                                            ? {
                                                  // Light-grey metal tile on black cards
                                                  background:
                                                      "linear-gradient(180deg, #f8faf9 0%, #dde4e0 55%, #ebefed 100%)",
                                                  borderTop: "1px solid rgba(255,255,255,0.92)",
                                                  borderBottom: "1px solid rgba(3,98,76,0.2)",
                                                  boxShadow:
                                                      "inset 0 1px 0 rgba(255,255,255,0.8), 0 2px 4px rgba(0,0,0,0.12)",
                                                  color: "var(--elyst-emerald)",
                                              }
                                            : {
                                                  // Dark-green metal tile on green cards
                                                  background:
                                                      "linear-gradient(180deg, hsl(160 38% 16%) 0%, hsl(160 38% 9%) 55%, hsl(160 38% 12%) 100%)",
                                                  borderTop: "1px solid rgba(255,255,255,0.14)",
                                                  borderBottom: "1px solid rgba(0,0,0,0.4)",
                                                  boxShadow:
                                                      "inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 6px rgba(0,0,0,0.3)",
                                                  color: "rgba(255,255,255,0.9)",
                                              }
                                    }
                                >
                                    {item.icon}
                                </span>
                                {item.status && (
                                    <span
                                        className={cn(
                                            "text-xs font-semibold px-2.5 py-1 rounded-lg backdrop-blur-sm",
                                            "bg-white/10 text-fg-on-dark/80",
                                            "transition-colors duration-300 group-hover:bg-white/20"
                                        )}
                                    >
                                        {item.status}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-2">
                                <h3 className="font-bold text-fg-on-dark tracking-tight" style={{ fontSize: "1.28rem" }}>
                                    {item.title}
                                    {item.meta && (
                                        <span className="ml-2 text-xs text-fg-on-dark/55 font-normal">
                                            {item.meta}
                                        </span>
                                    )}
                                </h3>
                                <p className="text-fg-on-dark/75 leading-snug" style={{ fontSize: "1.05rem" }}>
                                    {item.description}
                                </p>
                            </div>

                            {(item.tags?.length || item.cta) && (
                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-fg-on-dark/65">
                                        {item.tags?.map((tag, i) => (
                                            <span
                                                key={i}
                                                className="px-2 py-1 rounded-md bg-white/10 backdrop-blur-sm transition-all duration-200 group-hover:bg-white/15"
                                            >
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                    {item.cta && (
                                        <span className="text-xs text-green opacity-0 group-hover:opacity-100 transition-opacity">
                                            {item.cta}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export { BentoGrid }
