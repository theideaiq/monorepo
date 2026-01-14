export default function MarketingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Marketing</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border p-4">
          <h2 className="text-lg font-semibold">Campaigns</h2>
          <p className="text-muted-foreground">
            Create and manage email campaigns.
          </p>
          {/* TODO: Implement Campaigns */}
        </div>
        <div className="rounded-md border p-4">
          <h2 className="text-lg font-semibold">Segments</h2>
          <p className="text-muted-foreground">
            Define user segments for targeting.
          </p>
          {/* TODO: Implement Segments */}
        </div>
      </div>
    </div>
  );
}
