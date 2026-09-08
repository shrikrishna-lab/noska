"use client";

import { type ComponentProps, type CSSProperties, useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                              frame generation                              */
/* -------------------------------------------------------------------------- */

/**
 * One frame is a flat board, one entry per cell:
 * `0` empty, `1…7` a tetromino, `8` a line about to clear, `9` the game over fill.
 */
export type TetrisFrames = number[][];

type Cell = [number, number];

/** The seven tetrominoes, each rotation listed as `[x, y]` cells. */
const SHAPES: { id: number; rot: Cell[][] }[] = [
    {
        id: 1, // I
        rot: [
            [[0, 1], [1, 1], [2, 1], [3, 1]],
            [[2, 0], [2, 1], [2, 2], [2, 3]],
        ],
    },
    {
        id: 2, // O
        rot: [[[0, 0], [1, 0], [0, 1], [1, 1]]],
    },
    {
        id: 3, // T
        rot: [
            [[1, 0], [0, 1], [1, 1], [2, 1]],
            [[1, 0], [1, 1], [2, 1], [1, 2]],
            [[0, 1], [1, 1], [2, 1], [1, 2]],
            [[1, 0], [0, 1], [1, 1], [1, 2]],
        ],
    },
    {
        id: 4, // S
        rot: [
            [[1, 0], [2, 0], [0, 1], [1, 1]],
            [[0, 0], [0, 1], [1, 1], [1, 2]],
        ],
    },
    {
        id: 5, // Z
        rot: [
            [[0, 0], [1, 0], [1, 1], [2, 1]],
            [[1, 0], [0, 1], [1, 1], [0, 2]],
        ],
    },
    {
        id: 6, // J
        rot: [
            [[0, 0], [0, 1], [1, 1], [2, 1]],
            [[1, 0], [2, 0], [1, 1], [1, 2]],
            [[0, 1], [1, 1], [2, 1], [2, 2]],
            [[1, 0], [1, 1], [0, 2], [1, 2]],
        ],
    },
    {
        id: 7, // L
        rot: [
            [[2, 0], [0, 1], [1, 1], [2, 1]],
            [[1, 0], [1, 1], [1, 2], [2, 2]],
            [[0, 1], [1, 1], [2, 1], [0, 2]],
            [[0, 0], [1, 0], [1, 1], [1, 2]],
        ],
    },
];

/**
 * Pull every rotation back to the origin. Without this a rotation whose cells
 * start away from zero — the upright I, say — can never reach the left wall.
 */
const PIECES = SHAPES.map(({ id, rot }) => ({
    id,
    rot: rot.map((cells) => {
        const left = Math.min(...cells.map((c) => c[0]));
        const top = Math.min(...cells.map((c) => c[1]));
        return cells.map(([x, y]) => [x - left, y - top] as Cell);
    }),
}));

/** Cells above the ceiling are free; the walls and the floor are not. */
function hits(board: number[], cells: Cell[], ox: number, oy: number, w: number, h: number): boolean {
    for (const [cx, cy] of cells) {
        const x = ox + cx;
        const y = oy + cy;
        if (x < 0 || x >= w || y >= h) return true;
        if (y >= 0 && board[y * w + x]) return true;
    }
    return false;
}

/** Lowest row the piece can reach from `from`. */
function fall(board: number[], cells: Cell[], ox: number, from: number, w: number, h: number): number {
    let y = from;
    while (!hits(board, cells, ox, y + 1, w, h)) y++;
    return y;
}

function stamp(board: number[], cells: Cell[], ox: number, oy: number, id: number, w: number): number[] {
    const next = [...board];
    for (const [cx, cy] of cells) {
        const y = oy + cy;
        if (y >= 0) next[y * w + ox + cx] = id;
    }
    return next;
}

function fullRows(board: number[], w: number, h: number): number[] {
    const rows: number[] = [];
    for (let r = 0; r < h; r++) {
        let full = true;
        for (let c = 0; c < w; c++) {
            if (!board[r * w + c]) {
                full = false;
                break;
            }
        }
        if (full) rows.push(r);
    }
    return rows;
}

/** Drops everything above the cleared rows down by as many rows. */
function collapse(board: number[], rows: number[], w: number, h: number): number[] {
    const kept: number[][] = [];
    for (let r = 0; r < h; r++) {
        if (rows.includes(r)) continue;
        kept.push(board.slice(r * w, r * w + w));
    }
    const next = new Array<number>((h - kept.length) * w).fill(0);
    for (const row of kept) next.push(...row);
    return next;
}

/** Low stack, few holes, flat surface, cleared lines — the usual four terms. */
function rate(board: number[], lines: number, w: number, h: number): number {
    const heights: number[] = [];
    let holes = 0;

    for (let c = 0; c < w; c++) {
        let top = h;
        for (let r = 0; r < h; r++) {
            if (board[r * w + c]) {
                top = r;
                break;
            }
        }
        heights.push(h - top);
        for (let r = top + 1; r < h; r++) if (!board[r * w + c]) holes++;
    }

    let stack = 0;
    let bumps = 0;
    for (let c = 0; c < w; c++) {
        stack += heights[c];
        if (c) bumps += Math.abs(heights[c] - heights[c - 1]);
    }

    return -0.51 * stack + 0.76 * lines - 0.36 * holes - 0.18 * bumps;
}

type Move = { rot: number; x: number; y: number; value: number };

/** Every landing spot for one piece, best first. */
function moves(board: number[], piece: { id: number; rot: Cell[][] }, w: number, h: number): Move[] {
    const out: Move[] = [];

    for (let r = 0; r < piece.rot.length; r++) {
        const cells = piece.rot[r];
        const span = Math.max(...cells.map((c) => c[0]));
        for (let x = 0; x + span < w; x++) {
            const y = fall(board, cells, x, -4, w, h);
            const landed = stamp(board, cells, x, y, piece.id, w);
            const lines = fullRows(landed, w, h);
            out.push({ rot: r, x, y, value: rate(collapse(landed, lines, w, h), lines.length, w, h) });
        }
    }

    return out.sort((a, b) => b.value - a.value);
}

/** Seven-bag randomiser, so every piece turns up. */
function bag(): number[] {
    const order = [0, 1, 2, 3, 4, 5, 6];
    for (let i = order.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
}

/** Frames of one whole game, from the first piece to the top out. */
export function generateTetrisFrames(w: number, h: number): TetrisFrames {
    const cells = w * h;
    const frames: TetrisFrames = [];
    let board = new Array<number>(cells).fill(0);
    let queue: number[] = [];
    let placed = 0;
    let alive = true;

    while (alive && placed < 60 && frames.length < 900) {
        if (!queue.length) queue = bag();
        const piece = PIECES[queue.shift()!];
        const spots = moves(board, piece, w, h);
        if (!spots.length) break;

        // The player gets sloppier the longer it survives, so every game ends.
        const slip = Math.max(0, placed - 10) * 0.06;
        const spot = spots[Math.random() < slip ? Math.min(spots.length - 1, 1 + ((Math.random() * 2) | 0)) : 0];
        const shape = piece.rot[spot.rot];
        const tall = Math.max(...shape.map((c) => c[1])) + 1;

        // The piece drifts in from above the ceiling, a row per frame.
        for (let y = -tall; y <= spot.y; y++) {
            if (y + tall <= 0) continue;
            frames.push(stamp(board, shape, spot.x, y, piece.id, w));
        }

        board = stamp(board, shape, spot.x, spot.y, piece.id, w);
        if (shape.some(([, cy]) => spot.y + cy < 0)) alive = false;

        const rows = fullRows(board, w, h);
        if (rows.length) {
            const flash = [...board];
            for (const r of rows) for (let c = 0; c < w; c++) flash[r * w + c] = 8;
            frames.push(flash, [...board], flash);
            board = collapse(board, rows, w, h);
            frames.push([...board], [...board]);
        }

        placed++;
    }

    // Game over: the stack floods the board, then blinks out.
    const flood = [...board];
    for (let r = h - 1; r >= 0; r--) {
        for (let c = 0; c < w; c++) flood[r * w + c] = 9;
        frames.push([...flood]);
    }
    const empty = new Array<number>(cells).fill(0);
    frames.push([...flood], empty, [...flood], empty, empty);

    return frames;
}

/* -------------------------------------------------------------------------- */
/*                                  component                                 */
/* -------------------------------------------------------------------------- */

/**
 * I, O, T, S, Z, J, L. Each one reads a theme variable, so a light and a dark
 * board get their own shade; the literal after the comma keeps the component
 * working on its own, without the stylesheet.
 */
const PALETTE = [
    "var(--tetris-1, oklch(0.797 0.134 211.5))",
    "var(--tetris-2, oklch(0.861 0.173 91.9))",
    "var(--tetris-3, oklch(0.709 0.159 293.5))",
    "var(--tetris-4, oklch(0.800 0.182 151.7))",
    "var(--tetris-5, oklch(0.711 0.166 22.2))",
    "var(--tetris-6, oklch(0.714 0.143 254.6))",
    "var(--tetris-7, oklch(0.758 0.159 55.9))",
];

/** A number is read as pixels; a string goes through as written, `0.4em` and all. */
type Size = number | string;

const size = (value: Size) => (typeof value === "number" ? `${value}px` : value);

export type TetrisLoaderProps = {
    /** Cells across. Default `8`, minimum `4`. */
    columns?: number;
    /** Cells down. Default `16`, minimum `6`. */
    rows?: number;
    /** Side of one cell. A number is pixels. Default `6` — the whole loader scales with it. */
    cellSize?: Size;
    /** Space between cells. A number is pixels. Default `2`. */
    gap?: Size;
    /** Milliseconds per frame. Default `40`. */
    speed?: number;
    /** Pause or resume the animation. Default `true`. */
    playing?: boolean;
    /** Start a fresh game after each game over. Default `true`. */
    loop?: boolean;
    /** Called every time a game ends. */
    onComplete?: () => void;
    /** What a screen reader announces. Default `"Loading"`. */
    label?: string;
    /** Seven CSS colours, one per tetromino, in I O T S Z J L order. */
    colors?: readonly string[];
    /** Colour of a line the moment it clears. Defaults to the foreground. */
    flashColor?: string;
    /** Colour of the stack once the game is lost. */
    deadColor?: string;
    /** Extra classes for a single cell, on top of the size and colour above. */
    dotClassName?: string;
} & ComponentProps<"div">;

/** True while the reader asks for less movement. */
function useReducedMotion(): boolean {
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        const query = window.matchMedia("(prefers-reduced-motion: reduce)");
        const read = () => setReduced(query.matches);
        read();
        query.addEventListener("change", read);
        return () => query.removeEventListener("change", read);
    }, []);

    return reduced;
}

/**
 * A loading indicator that plays tetris. A bot stacks the pieces, clears the
 * lines, and eventually tops out — then the board wipes and a new game starts.
 * Readers who ask for less movement get one still board instead.
 */
export function TetrisLoader({
    columns = 8,
    rows = 16,
    cellSize = 6,
    gap = 2,
    speed = 40,
    playing = true,
    loop = true,
    onComplete,
    label = "Loading",
    colors = PALETTE,
    flashColor = "var(--tetris-flash, var(--foreground, currentColor))",
    deadColor = "var(--tetris-dead, color-mix(in oklab, var(--foreground, currentColor) 45%, transparent))",
    dotClassName,
    className,
    style,
    ...props
}: TetrisLoaderProps) {
    const width = Math.max(4, Math.round(columns));
    const height = Math.max(6, Math.round(rows));

    const gridRef = useRef<HTMLDivElement>(null);
    const frame = useRef(0);

    const reduced = useReducedMotion();
    const [round, setRound] = useState(0);
    const [game, setGame] = useState<TetrisFrames | null>(null);

    // Held in a ref so an inline callback does not restart the animation.
    const completeRef = useRef(onComplete);
    completeRef.current = onComplete;

    // Generated on the client so the server and the first paint agree.
    useEffect(() => {
        setGame(generateTetrisFrames(width, height));
        frame.current = 0;
    }, [width, height, round]);

    const paint = useCallback(
        (dots: HTMLDivElement[], index: number) => {
            const board = game?.[index];
            if (!board) return;

            dots.forEach((dot, i) => {
                const value = board[i] ?? 0;
                dot.style.backgroundColor = value ? `var(--tetris-cell-${value})` : "";
            });
        },
        [game],
    );

    useEffect(() => {
        if (!game) return;

        const grid = gridRef.current;
        if (!grid) return;
        const dots = Array.from(grid.children) as HTMLDivElement[];

        if (frame.current >= game.length) frame.current = 0;

        // One still board, a good way in, for anyone who asked for less movement.
        if (reduced) {
            paint(dots, Math.floor(game.length * 0.55));
            return;
        }

        paint(dots, frame.current);
        if (!playing) return;

        // A clock, not a timer: a background tab freezes the game instead of
        // banking up frames it has to rush through on the way back.
        let request = 0;
        let last = performance.now();
        let owed = 0;

        const tick = (now: number) => {
            owed += now - last;
            last = now;
            if (owed > speed * 4) owed = speed;

            let ended = false;
            while (owed >= speed) {
                owed -= speed;
                frame.current++;
                if (frame.current >= game.length) {
                    ended = true;
                    break;
                }
            }

            paint(dots, Math.min(frame.current, game.length - 1));

            if (!ended) {
                request = requestAnimationFrame(tick);
                return;
            }

            completeRef.current?.();
            // A new round replaces the frames, which restarts this effect.
            if (loop) setRound((r) => r + 1);
            else frame.current = game.length - 1;
        };

        request = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(request);
    }, [game, playing, speed, loop, paint, reduced]);

    const vars: Record<string, string> = {
        "--tetris-cell": size(cellSize),
        "--tetris-gap": size(gap),
        "--tetris-cell-8": flashColor,
        "--tetris-cell-9": deadColor,
    };
    for (let i = 0; i < 7; i++) vars[`--tetris-cell-${i + 1}`] = colors[i] ?? PALETTE[i];

    return (
        <div
            ref={gridRef}
            role="status"
            aria-label={label}
            aria-busy={playing && !reduced}
            className={cn("grid w-fit", className)}
            style={
                {
                    gridTemplateColumns: `repeat(${width}, var(--tetris-cell))`,
                    gap: "var(--tetris-gap)",
                    ...vars,
                    ...style,
                } as CSSProperties
            }
            {...props}
        >
            {Array.from({ length: width * height }).map((_, i) => (
                <div
                    key={i}
                    style={{ height: "var(--tetris-cell)", borderRadius: "calc(var(--tetris-cell) / 3)" }}
                    className={cn("bg-foreground/10", dotClassName)}
                />
            ))}
        </div>
    );
}

export default TetrisLoader;
