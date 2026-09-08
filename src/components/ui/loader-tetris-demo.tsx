"use client";

import { TetrisLoader } from "@/components/ui/loader-tetris";

export const settings = {
    columns: 8,
    rows: 16,
    cellSize: 3,
    gap: 1,
    speed: 40,
};

type DemoProps = {
    columns?: number;
    rows?: number;
    cellSize?: number;
    gap?: number;
    speed?: number;
};

export default function TetrisLoaderDemo(props: DemoProps) {
    const { columns, rows, cellSize, gap, speed } = { ...settings, ...props };

    return (
        <div className="flex w-full items-center justify-center p-10">
            <div className="bg-card text-card-foreground flex items-center gap-5 rounded-lg border px-5 py-4 shadow-sm">
                <TetrisLoader
                    columns={columns}
                    rows={rows}
                    cellSize={cellSize}
                    gap={gap}
                    speed={speed}
                    label="Building your app"
                />
                <div className="space-y-1">
                    <p className="text-sm font-medium">Building your app</p>
                    <p className="text-muted-foreground text-xs">Around a minute. Feel free to watch the bot play.</p>
                </div>
            </div>
        </div>
    );
}
