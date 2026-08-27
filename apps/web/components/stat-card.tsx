type StatCardProps = {
  label: string;
  value: number | string;
  helper: string;
  tone?: "dark" | "light" | "gold";
};

export function StatCard({ label, value, helper, tone = "light" }: StatCardProps) {
  const classes = {
    dark: "bg-slate-950 text-white",
    light: "bg-white text-slate-950",
    gold: "bg-yellow-300 text-slate-950",
  };

  return (
    <div className={`rounded-3xl p-5 shadow-soft ring-1 ring-black/5 ${classes[tone]}`}>
      <p className="text-sm font-medium opacity-70">{label}</p>
      <p className="mt-3 text-3xl font-black tracking-tight">
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </p>
      <p className="mt-3 text-sm opacity-75">{helper}</p>
    </div>
  );
}
