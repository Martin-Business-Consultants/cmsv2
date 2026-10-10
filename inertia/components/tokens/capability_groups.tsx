export default function CapabilityGroups({
  groups,
}: {
  groups: { group: string; capabilities: string[] }[]
}) {
  if (!groups.length) {
    return (
      <p className="text-muted-foreground text-sm">
        Nothing yet — your role grants no capabilities.
      </p>
    )
  }
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {groups.map((group) => (
        <div key={group.group} className="bg-muted/40 grid gap-1 rounded-lg border px-4 py-3">
          <dt className="text-sm font-medium">{group.group}</dt>
          <dd className="text-muted-foreground font-mono text-xs">
            {group.capabilities.join(', ')}
          </dd>
        </div>
      ))}
    </dl>
  )
}
