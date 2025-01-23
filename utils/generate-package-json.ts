export function generatePackageJson(scripts: Record<string, string>): string {
  // Always create a fresh package.json with just these fields
  const packageJson = {
    name: 'Sizzy',
    version: '0.17.0-beta.2',
    scripts: sortScripts(scripts),
  };

  return JSON.stringify(packageJson, null, 2);
}

function sortScripts(scripts: Record<string, string>): Record<string, string> {
  // Group scripts by their prefix (everything before the first :)
  const groups = Object.entries(scripts).reduce((acc, [name, command]) => {
    const group = name.split(':')[0];
    if (!acc[group]) {
      acc[group] = {};
    }
    acc[group][name] = command;
    return acc;
  }, {} as Record<string, Record<string, string>>);

  // Sort groups alphabetically
  const sortedGroups = Object.keys(groups).sort();

  // Create final sorted object
  const sorted: Record<string, string> = {};
  for (const group of sortedGroups) {
    // Sort scripts within each group
    const groupScripts = Object.entries(groups[group]).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    for (const [name, command] of groupScripts) {
      sorted[name] = command;
    }
  }

  return sorted;
}
