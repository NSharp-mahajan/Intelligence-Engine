/**
 * Employer interleaving and diversity utility.
 * Distributes employers across a page window to prevent consecutive runs of a dominant employer
 * while preserving deterministic ordering and every valid job.
 */

export function interleaveOpportunitiesByEmployer<T extends { organization: string }>(items: T[]): T[] {
  if (items.length <= 2) return items;

  // Group items by normalized organization while preserving intra-organization order
  const orgGroups = new Map<string, T[]>();
  for (const item of items) {
    const key = (item.organization || '').toLowerCase().trim();
    if (!orgGroups.has(key)) {
      orgGroups.set(key, []);
    }
    orgGroups.get(key)!.push(item);
  }

  // If only 1 organization is present, no interleaving is possible
  if (orgGroups.size <= 1) return items;

  // Identify the dominant organization
  let dominantKey = '';
  let maxCount = -1;
  for (const [key, group] of orgGroups.entries()) {
    if (group.length > maxCount) {
      maxCount = group.length;
      dominantKey = key;
    }
  }

  const N = items.length;
  const dominantItems = [...(orgGroups.get(dominantKey) || [])];
  const D = dominantItems.length;
  const M = N - D;

  // If dominant employer does not exceed half the items, standard round-robin interleaving
  if (D <= M) {
    const remainingGroups = Array.from(orgGroups.values()).map((g) => [...g]);
    const result: T[] = [];
    let lastOrg = '';

    while (result.length < N) {
      let chosenGroupIdx = -1;
      let maxRemaining = -1;

      for (let g = 0; g < remainingGroups.length; g++) {
        if (remainingGroups[g].length === 0) continue;
        const currentOrg = (remainingGroups[g][0].organization || '').toLowerCase().trim();
        if (currentOrg !== lastOrg && remainingGroups[g].length > maxRemaining) {
          maxRemaining = remainingGroups[g].length;
          chosenGroupIdx = g;
        }
      }

      if (chosenGroupIdx === -1) {
        // Fallback to any group with items
        for (let g = 0; g < remainingGroups.length; g++) {
          if (remainingGroups[g].length > 0) {
            chosenGroupIdx = g;
            break;
          }
        }
      }

      if (chosenGroupIdx !== -1) {
        const item = remainingGroups[chosenGroupIdx].shift()!;
        result.push(item);
        lastOrg = (item.organization || '').toLowerCase().trim();
      }
    }

    return result;
  }

  // Dominant employer exceeds half the items (e.g. 14 Databricks, 5 Cloudflare, 1 Spotify).
  // Prepare ordered minority items by round-robin across minority organizations
  const minorityGroups = Array.from(orgGroups.entries())
    .filter(([key]) => key !== dominantKey)
    .map(([, group]) => [...group]);

  const minorityItems: T[] = [];
  while (minorityItems.length < M) {
    for (const group of minorityGroups) {
      if (group.length > 0) {
        minorityItems.push(group.shift()!);
      }
    }
  }

  // Calculate evenly spaced target indices for the minority items
  const minorityIndices = new Set<number>();
  for (let k = 0; k < M; k++) {
    const targetIdx = Math.min(N - 1, Math.floor((k * N) / M));
    let slot = targetIdx;
    while (minorityIndices.has(slot) && slot < N) {
      slot++;
    }
    if (slot >= N) {
      slot = targetIdx;
      while (minorityIndices.has(slot) && slot >= 0) {
        slot--;
      }
    }
    minorityIndices.add(slot);
  }

  // Assemble result array placing minority items at calculated slots and dominant items elsewhere
  const result: T[] = new Array(N);
  let minIdx = 0;
  let domIdx = 0;

  for (let i = 0; i < N; i++) {
    if (minorityIndices.has(i) && minIdx < minorityItems.length) {
      result[i] = minorityItems[minIdx++];
    } else if (domIdx < dominantItems.length) {
      result[i] = dominantItems[domIdx++];
    } else if (minIdx < minorityItems.length) {
      result[i] = minorityItems[minIdx++];
    }
  }

  return result;
}
