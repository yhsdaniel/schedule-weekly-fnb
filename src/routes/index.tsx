import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Coffee, Calendar, Users, Settings as SettingsIcon, Shuffle,
    Plus, Trash2, Sunrise, Sun, Moon, Crown, Store, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { Toaster } from "../components/ui/sonner";
import { useStoreState } from "../lib/use-store-state";
import {
    DAY_LABELS, DAY_LABELS_LONG, SHIFT_LABELS, SHIFT_TIMES,
    dayCoverage, generateSchedule, type Assignment, type Employee, type ShiftKey,
} from "../lib/scheduler";

export const Route = createFileRoute("/")({
    component: App,
});

type Tab = "schedule" | "team" | "settings";

function App() {
    const [state, setState] = useStoreState();
    const [tab, setTab] = useState<Tab>("schedule");
    const [currentDay, setCurrentDay] = useState<number>(() => new Date().getDay());

    const regen = () => {
        setState((s) => ({
            ...s,
            schedule: generateSchedule(s.employees, s.shiftConfig, s.seniorsPerDay),
        }));
        toast.success("Roster generated", { description: "Random placement with senior coverage." });
    };

    return (
        <div className="min-h-screen coffee-grain pb-28">
            <Toaster position="top-center" />
            <Header storeName={state.storeName} />

            <main className="mx-auto max-w-2xl px-4 pt-4">
                <AnimatePresence mode="wait">
                    {tab === "schedule" && (
                        <motion.div
                            key="schedule"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                        >
                            <ScheduleView
                                state={state}
                                currentDay={currentDay}
                                setCurrentDay={setCurrentDay}
                                onRegenerate={regen}
                                onChangeAssignment={(day, eid, val) =>
                                    setState((s) => ({
                                        ...s,
                                        schedule: {
                                            ...s.schedule,
                                            [day]: { ...(s.schedule[day] ?? {}), [eid]: val },
                                        },
                                    }))
                                }
                            />
                        </motion.div>
                    )}
                    {tab === "team" && (
                        <motion.div
                            key="team"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                        >
                            <TeamManager
                                employees={state.employees}
                                onChange={(employees) => setState((s) => ({ ...s, employees }))}
                            />
                        </motion.div>
                    )}
                    {tab === "settings" && (
                        <motion.div
                            key="settings"
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.25 }}
                        >
                            <SettingsPanel state={state} setState={setState} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <BottomNav tab={tab} setTab={setTab} />
        </div>
    );
}

function Header({ storeName }: { storeName: string }) {
    return (
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
            <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                    <Coffee className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        Store Manager
                    </p>
                    <h1 className="truncate text-lg font-bold text-foreground">{storeName}</h1>
                </div>
            </div>
        </header>
    );
}

/* ---------------- Schedule ---------------- */

function ScheduleView({
    state, currentDay, setCurrentDay, onRegenerate, onChangeAssignment,
}: {
    state: ReturnType<typeof useStoreState>[0];
    currentDay: number;
    setCurrentDay: (d: number) => void;
    onRegenerate: () => void;
    onChangeAssignment: (day: number, eid: string, val: Assignment) => void;
}) {
    const coverage = useMemo(
        () => dayCoverage(currentDay, state.employees, state.schedule),
        [currentDay, state.employees, state.schedule],
    );

    const hasSchedule = Object.keys(state.schedule).length > 0;
    const seniorsOpen = coverage.morning.filter((e) => e.role === "senior").length;
    const seniorsClose = coverage.closing.filter((e) => e.role === "senior").length;

    return (
        <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-2xl font-bold">This Week</h2>
                <Button onClick={onRegenerate} size="sm" className="rounded-full">
                    <Shuffle className="mr-1.5 h-4 w-4" />
                    {hasSchedule ? "Re-roll" : "Generate"}
                </Button>
            </div>

            {/* Day picker */}
            <div className="-mx-4 overflow-x-auto px-4">
                <div className="flex gap-1 mb-4">
                    {DAY_LABELS.map((d, i) => {
                        const active = i === currentDay;
                        return (
                            <button
                                key={d}
                                onClick={() => setCurrentDay(i)}
                                className={`relative grid h-16 w-14 shrink-0 place-items-center rounded-2xl border text-xs font-semibold transition-all ${active
                                    ? "border-primary bg-primary text-primary-foreground shadow-md"
                                    : "border-border bg-card text-foreground hover:border-primary/40"
                                    }`}
                            >
                                <span className="text-[10px] uppercase tracking-wider opacity-70">{d}</span>
                                <span className="text-lg font-bold">{i + 1}</span>
                                {active && (
                                    <motion.span
                                        layoutId="day-dot"
                                        className="absolute -bottom-1 h-1.5 w-1.5 rounded-full bg-primary-foreground"
                                    />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {!hasSchedule && (
                <div className="rounded-3xl border border-dashed border-border bg-card/60 p-8 text-center">
                    <Coffee className="mx-auto mb-3 h-8 w-8 text-primary" />
                    <p className="font-semibold">No roster yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Tap <span className="font-medium text-foreground">Generate</span> to build this week's shifts.
                    </p>
                </div>
            )}

            {hasSchedule && (
                <>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <CoverageChip
                            ok={seniorsOpen >= 1}
                            label={`${seniorsOpen} senior on Opening`}
                        />
                        <CoverageChip
                            ok={seniorsClose >= 1}
                            label={`${seniorsClose} senior on Closing`}
                        />
                    </div>

                    <div className="space-y-3">
                        <ShiftCard
                            shift="morning"
                            icon={<Sunrise className="h-4 w-4" />}
                            employees={coverage.morning}
                            day={currentDay}
                            onChange={onChangeAssignment}
                            allEmployees={state.employees}
                        />
                        <ShiftCard
                            shift="mid"
                            icon={<Sun className="h-4 w-4" />}
                            employees={coverage.mid}
                            day={currentDay}
                            onChange={onChangeAssignment}
                            allEmployees={state.employees}
                        />
                        <ShiftCard
                            shift="closing"
                            icon={<Moon className="h-4 w-4" />}
                            employees={coverage.closing}
                            day={currentDay}
                            onChange={onChangeAssignment}
                            allEmployees={state.employees}
                        />
                        {coverage.off.length > 0 && (
                            <div className="rounded-3xl border border-border bg-shift-off p-4">
                                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-shift-off-foreground">
                                    OFF · {DAY_LABELS_LONG[currentDay]}
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {coverage.off.map((e) => (
                                        <Badge key={e.id} variant="secondary" className="rounded-full">
                                            {e.name}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </section>
    );
}

function CoverageChip({ ok, label }: { ok: boolean; label: string }) {
    return (
        <div
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${ok
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-destructive/40 bg-destructive/10 text-destructive"
                }`}
        >
            <Crown className="h-3 w-3" />
            <span className="truncate font-medium">{label}</span>
        </div>
    );
}

function ShiftCard({
    shift, icon, employees, day, onChange, allEmployees,
}: {
    shift: ShiftKey;
    icon: React.ReactNode;
    employees: Employee[];
    day: number;
    onChange: (day: number, eid: string, val: Assignment) => void;
    allEmployees: Employee[];
}) {
    const bg = `bg-shift-${shift}`;
    const fg = `text-shift-${shift}-foreground`;

    return (
        <motion.div
            layout
            className={`rounded-3xl border border-border/60 p-4 shadow-sm ${bg} ${fg}`}
        >
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-background/50">
                        {icon}
                    </span>
                    <div>
                        <p className="text-sm font-bold leading-tight">{SHIFT_LABELS[shift]}</p>
                        <p className="text-[11px] opacity-80">{SHIFT_TIMES[shift]}</p>
                    </div>
                </div>
                <span className="rounded-full bg-background/40 px-2 py-0.5 text-xs font-semibold">
                    {employees.length}
                </span>
            </div>

            <div className="space-y-1.5">
                <AnimatePresence initial={false}>
                    {employees.map((e) => (
                        <motion.div
                            key={e.id}
                            layout
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 8 }}
                            className="flex items-center justify-between gap-2 rounded-xl bg-background/60 px-3 py-2 text-foreground"
                        >
                            <div className="flex min-w-0 items-center gap-2">
                                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                    {e.name.slice(0, 1)}
                                </span>
                                <span className="truncate text-sm font-medium">{e.name}</span>
                                {e.role === "senior" && (
                                    <Crown className="h-3.5 w-3.5 shrink-0 text-primary" />
                                )}
                            </div>
                            <Select
                                value={shift}
                                onValueChange={(v) => onChange(day, e.id, v as Assignment)}
                            >
                                <SelectTrigger className="h-7 w-[88px] rounded-full border-border/60 bg-background text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="morning">Morning</SelectItem>
                                    <SelectItem value="mid">Mid</SelectItem>
                                    <SelectItem value="closing">Closing</SelectItem>
                                    <SelectItem value="OFF">OFF</SelectItem>
                                </SelectContent>
                            </Select>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {employees.length === 0 && (
                    <p className="rounded-xl bg-background/40 px-3 py-3 text-center text-xs italic opacity-80">
                        No one on this shift
                    </p>
                )}
            </div>

            {/* Quick-add: assign someone off to this shift */}
            <QuickAdd
                allEmployees={allEmployees}
                currentIds={employees.map((e) => e.id)}
                onPick={(eid) => onChange(day, eid, shift)}
            />
        </motion.div>
    );
}

function QuickAdd({
    allEmployees, currentIds, onPick,
}: {
    allEmployees: Employee[];
    currentIds: string[];
    onPick: (eid: string) => void;
}) {
    const candidates = allEmployees.filter((e) => !currentIds.includes(e.id));
    if (candidates.length === 0) return null;
    return (
        <div className="mt-3">
            <Select onValueChange={onPick} value="">
                <SelectTrigger className="h-8 w-full rounded-full border-dashed border-foreground/30 bg-transparent text-xs">
                    <span className="flex items-center gap-1.5 opacity-80">
                        <Plus className="h-3 w-3" /> Move someone to this shift
                    </span>
                </SelectTrigger>
                <SelectContent>
                    {candidates.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                            {e.name} {e.role === "senior" ? "★" : ""}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

/* ---------------- Team ---------------- */

function TeamManager({
    employees, onChange,
}: {
    employees: Employee[];
    onChange: (e: Employee[]) => void;
}) {
    const [name, setName] = useState("");
    const [role, setRole] = useState<"senior" | "junior">("junior");

    const add = () => {
        if (!name.trim()) return;
        onChange([
            ...employees,
            { id: crypto.randomUUID(), name: name.trim(), role, offDays: [0, 6] },
        ]);
        setName("");
        toast.success(`${name.trim()} added`);
    };

    const remove = (id: string) => onChange(employees.filter((e) => e.id !== id));

    const toggleOff = (id: string, day: number) =>
        onChange(
            employees.map((e) => {
                if (e.id !== id) return e;
                const has = e.offDays.includes(day);
                let next = has ? e.offDays.filter((d) => d !== day) : [...e.offDays, day];
                if (next.length > 2) next = next.slice(-2);
                return { ...e, offDays: next.sort() };
            }),
        );

    const setRoleFor = (id: string, r: "senior" | "junior") =>
        onChange(employees.map((e) => (e.id === id ? { ...e, role: r } : e)));

    return (
        <section className="space-y-4">
            <h2 className="text-2xl font-bold">Team</h2>

            <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Add barista
                </Label>
                <div className="mt-2 flex gap-2">
                    <Input
                        placeholder="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && add()}
                        className="rounded-full"
                    />
                    <Select value={role} onValueChange={(v) => setRole(v as "senior" | "junior")}>
                        <SelectTrigger className="w-[110px] rounded-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="junior">Junior</SelectItem>
                            <SelectItem value="senior">Senior</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={add} size="icon" className="rounded-full shrink-0">
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="space-y-3">
                {employees.map((e) => (
                    <motion.div
                        key={e.id}
                        layout
                        className="rounded-3xl border border-border bg-card p-4 shadow-sm"
                    >
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                                    {e.name.slice(0, 1).toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate font-semibold">{e.name}</p>
                                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                                        {e.role}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Select
                                    value={e.role}
                                    onValueChange={(v) => setRoleFor(e.id, v as "senior" | "junior")}
                                >
                                    <SelectTrigger className="h-8 w-[96px] rounded-full text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="junior">Junior</SelectItem>
                                        <SelectItem value="senior">Senior</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => remove(e.id)}
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="mt-3">
                            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                Days OFF · pick 2
                            </p>
                            <div className="grid grid-cols-7 gap-1">
                                {DAY_LABELS.map((d, i) => {
                                    const active = e.offDays.includes(i);
                                    return (
                                        <button
                                            key={d}
                                            onClick={() => toggleOff(e.id, i)}
                                            className={`h-9 rounded-xl text-xs font-semibold transition-all ${active
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : "bg-muted text-muted-foreground hover:bg-accent"
                                                }`}
                                        >
                                            {d}
                                        </button>
                                    );
                                })}
                            </div>
                            {e.offDays.length !== 2 && (
                                <p className="mt-1.5 text-[11px] text-destructive">
                                    Select exactly 2 days
                                </p>
                            )}
                        </div>
                    </motion.div>
                ))}
                {employees.length === 0 && (
                    <p className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                        No baristas yet. Add your first above.
                    </p>
                )}
            </div>
        </section>
    );
}

/* ---------------- Settings ---------------- */

function SettingsPanel({
    state, setState,
}: {
    state: ReturnType<typeof useStoreState>[0];
    setState: ReturnType<typeof useStoreState>[1];
}) {
    return (
        <section className="space-y-4">
            <h2 className="text-2xl font-bold">Settings</h2>

            <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Store name
                </Label>
                <div className="mt-2 flex items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <Input
                        value={state.storeName}
                        onChange={(e) => setState((s) => ({ ...s, storeName: e.target.value }))}
                        placeholder="e.g. Pantai Indah Kapuk"
                        className="rounded-full"
                    />
                </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Seniors per day
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">
                    Always ≥1 on Opening &amp; Closing. Extras spread across shifts.
                </p>
                <div className="mt-3 flex items-center gap-3">
                    <Button
                        size="icon"
                        variant="outline"
                        onClick={() =>
                            setState((s) => ({ ...s, seniorsPerDay: Math.max(2, s.seniorsPerDay - 1) }))
                        }
                        className="h-10 w-10 rounded-full"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 text-center">
                        <span className="text-3xl font-bold">{state.seniorsPerDay}</span>
                        <span className="ml-1 text-sm text-muted-foreground">seniors</span>
                    </div>
                    <Button
                        size="icon"
                        variant="outline"
                        onClick={() => setState((s) => ({ ...s, seniorsPerDay: s.seniorsPerDay + 1 }))}
                        className="h-10 w-10 rounded-full"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Headcount per shift
                </Label>
                <div className="mt-3 space-y-3">
                    {(["morning", "mid", "closing"] as ShiftKey[]).map((k) => (
                        <div key={k} className="flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold">{SHIFT_LABELS[k]}</p>
                                <p className="text-[11px] text-muted-foreground">{SHIFT_TIMES[k]}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="icon" variant="outline"
                                    className="h-8 w-8 rounded-full"
                                    onClick={() =>
                                        setState((s) => ({
                                            ...s,
                                            shiftConfig: { ...s.shiftConfig, [k]: Math.max(1, s.shiftConfig[k] - 1) },
                                        }))
                                    }
                                >
                                    <ChevronLeft className="h-3 w-3" />
                                </Button>
                                <span className="w-6 text-center font-bold">{state.shiftConfig[k]}</span>
                                <Button
                                    size="icon" variant="outline"
                                    className="h-8 w-8 rounded-full"
                                    onClick={() =>
                                        setState((s) => ({
                                            ...s,
                                            shiftConfig: { ...s.shiftConfig, [k]: s.shiftConfig[k] + 1 },
                                        }))
                                    }
                                >
                                    <ChevronRight className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <Button
                variant="outline"
                className="w-full rounded-full text-destructive hover:text-destructive"
                onClick={() => {
                    if (confirm("Reset everything? This clears team, schedule, and settings.")) {
                        localStorage.removeItem("fnb-scheduler-v1");
                        location.reload();
                    }
                }}
            >
                Reset all data
            </Button>
        </section>
    );
}

/* ---------------- Bottom Nav ---------------- */

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
    const items: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: "schedule", label: "Schedule", icon: <Calendar className="h-5 w-5" /> },
        { id: "team", label: "Team", icon: <Users className="h-5 w-5" /> },
        { id: "settings", label: "Settings", icon: <SettingsIcon className="h-5 w-5" /> },
    ];
    return (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 backdrop-blur-md">
            <div className="mx-auto flex max-w-2xl items-stretch justify-around px-2 py-2">
                {items.map((it) => {
                    const active = tab === it.id;
                    return (
                        <button
                            key={it.id}
                            onClick={() => setTab(it.id)}
                            className="relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl px-2 py-2 text-[11px] font-medium"
                        >
                            {active && (
                                <motion.span
                                    layoutId="tab-bg"
                                    className="absolute inset-0 rounded-2xl bg-primary/10"
                                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                                />
                            )}
                            <span className={`relative ${active ? "text-primary" : "text-muted-foreground"}`}>
                                {it.icon}
                            </span>
                            <span className={`relative ${active ? "text-primary" : "text-muted-foreground"}`}>
                                {it.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
}
