export default function CRMPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">CRM</h1>
      </div>
      <div className="rounded-md border p-4">
        <h2 className="text-lg font-semibold">Contacts & Users</h2>
        <p className="text-muted-foreground">
          Manage your customer relationships here.
        </p>
        {/* TODO: Implement Contacts Table */}
      </div>
    </div>
  );
}
