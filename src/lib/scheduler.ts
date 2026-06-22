export type Role = "senior" | "junior";
export type ShiftKey = "morning" | "mid" | "closing";
export type Assignment = ShiftKey | "OFF";

export interface Employee {
    id: string;
    name: string;
    role: Role;
    offDays: number[]; // 0=Sun ... 6=Sat, length should be 2
}

export interface ShiftConfig {
    morning: number;
    mid: number;
    closing: number;
}

export const SHIFT_LABELS: Record<ShiftKey, string> = {
    morning: "Morning",
    mid: "Mid",
    closing: "Closing",
};

export const SHIFT_TIMES: Record<ShiftKey, string> = {
    morning: "06:00 – 14:00",
    mid: "10:00 – 18:00",
    closing: "14:00 – 22:00",
};

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const DAY_LABELS_LONG = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

export interface StoreState {
    storeName: string;
    shiftConfig: ShiftConfig;
    seniorsPerDay: number; // total seniors needed each day (besides open/close requirement)
    employees: Employee[];
    // schedule[dayIndex 0..6][employeeId] = Assignment
    schedule: Record<number, Record<string, Assignment>>;
    weekStartISO: string; // sunday date for the week being viewed
}

export const defaultState = (): StoreState => ({
    storeName: "Pantai Indah Kapuk",
    shiftConfig: { morning: 3, mid: 2, closing: 3 },
    seniorsPerDay: 2,
    employees: seedEmployees(),
    schedule: {},
    weekStartISO: getWeekStart(new Date()).toISOString(),
});

export function getWeekStart(d: Date): Date {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - x.getDay());
    return x;
}

export function addDays(d: Date, n: number): Date {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
}

function seedEmployees(): Employee[] {
    const names = [
        "Andi", "Bayu", "Citra", "Dewi", "Eka", "Fajar", "Gita", "Hadi",
        "Indah", "Joko", "Kirana", "Lestari",
    ];
    return names.map((name, i) => ({
        id: crypto.randomUUID(),
        name,
        role: i < 4 ? "senior" : "junior",
        offDays: [(i * 2) % 7, ((i * 2) + 3) % 7].slice(0, 2),
    }));
}

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Generate a 7-day schedule.
 * - Respects each employee's offDays (2/week).
 * - Random placement.
 * - Guarantees ≥1 senior on Morning (opening) and ≥1 senior on Closing each day.
 * - Aims for shiftConfig counts per shift.
 */
export function generateSchedule(
    employees: Employee[],
    cfg: ShiftConfig,
    seniorsPerDay: number,
): Record<number, Record<string, Assignment>> {
    const schedule: Record<number, Record<string, Assignment>> = {};

    for (let day = 0; day < 7; day++) {
        const dayPlan: Record<string, Assignment> = {};
        const offToday = employees.filter((e) => e.offDays.includes(day));
        const available = employees.filter((e) => !e.offDays.includes(day));

        offToday.forEach((e) => (dayPlan[e.id] = "OFF"));

        const seniors = shuffle(available.filter((e) => e.role === "senior"));
        const juniors = shuffle(available.filter((e) => e.role === "junior"));

        const slots: ShiftKey[] = [];
        (Object.keys(cfg) as ShiftKey[]).forEach((k) => {
            for (let i = 0; i < cfg[k]; i++) slots.push(k);
        });

        const assigned: Record<string, Assignment> = {};

        // 1. Place 1 senior on Morning (opening) and 1 on Closing — required rule.
        const placeSeniorOn = (shift: ShiftKey) => {
            const s = seniors.shift();
            if (s) {
                assigned[s.id] = shift;
                const idx = slots.indexOf(shift);
                if (idx >= 0) slots.splice(idx, 1);
            }
        };
        placeSeniorOn("morning");
        placeSeniorOn("closing");

        // 2. Place remaining seniors up to seniorsPerDay (extras counted across all shifts).
        const remainingSeniorTarget = Math.max(0, seniorsPerDay - 2);
        for (let i = 0; i < remainingSeniorTarget; i++) {
            const s = seniors.shift();
            if (!s) break;
            const shift = slots.shift() ?? shuffleShift(cfg);
            assigned[s.id] = shift;
        }

        // 3. Any leftover seniors fill remaining slots first.
        const leftoverSeniors = [...seniors];
        leftoverSeniors.forEach((s) => {
            const shift = slots.shift();
            if (shift) assigned[s.id] = shift;
            else assigned[s.id] = shuffleShift(cfg);
        });

        // 4. Fill juniors into remaining slots randomly.
        const shuffledSlots = shuffle(slots);
        juniors.forEach((j) => {
            const shift = shuffledSlots.shift();
            assigned[j.id] = shift ?? shuffleShift(cfg);
        });

        Object.assign(dayPlan, assigned);
        schedule[day] = dayPlan;
    }
    return schedule;
}

function shuffleShift(cfg: ShiftConfig): ShiftKey {
    const keys = Object.keys(cfg) as ShiftKey[];
    return keys[Math.floor(Math.random() * keys.length)];
}

export function dayCoverage(
    day: number,
    employees: Employee[],
    schedule: Record<number, Record<string, Assignment>>,
) {
    const plan = schedule[day] ?? {};
    const result: Record<ShiftKey, Employee[]> & { off: Employee[] } = {
        morning: [], mid: [], closing: [], off: [],
    };
    employees.forEach((e) => {
        const a = plan[e.id];
        if (!a || a === "OFF") result.off.push(e);
        else result[a].push(e);
    });
    return result;
}
