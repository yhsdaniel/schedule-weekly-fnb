import { useEffect, useState } from "react";
import { defaultState, type StoreState } from "./scheduler";

const KEY = "fnb-scheduler-v1";

export function useStoreState() {
    const [state, setState] = useState<StoreState>(() => defaultState());
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) setState(JSON.parse(raw));
        } catch { }
        setHydrated(true);
    }, []);

    useEffect(() => {
        if (!hydrated) return;
        try {
            localStorage.setItem(KEY, JSON.stringify(state));
        } catch { }
    }, [state, hydrated]);

    return [state, setState, hydrated] as const;
}
