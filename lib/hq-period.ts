export type PeriodInfo = {
    year: number;
    month: number;
    monthName: string;
    week: number;
    weekYear: number;
    weekKey: string;
    monthKey: string;
};

export function isoWeek(date: Date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    return { year: d.getUTCFullYear(), week };
}

export function periodInfo(date: Date): PeriodInfo {
    const iso = isoWeek(date);
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(date);

    return {
        year,
        month,
        monthName,
        week: iso.week,
        weekYear: iso.year,
        weekKey: `${iso.year}-W${String(iso.week).padStart(2, "0")}`,
        monthKey: `${year}-M${String(month).padStart(2, "0")}`,
    };
}
