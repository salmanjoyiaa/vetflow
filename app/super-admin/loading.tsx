export default function SuperAdminLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-40 rounded-3xl bg-white/80 border border-border/40" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-white border border-border/40" />
        ))}
      </div>
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 h-72 rounded-2xl bg-white border border-border/40" />
        <div className="lg:col-span-5 h-72 rounded-2xl bg-white border border-border/40" />
      </div>
    </div>
  );
}
