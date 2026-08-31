export interface ClusterQuality {
  label: string;
  tooltip: string;
}

export function getClusterQuality(silhouette: number): ClusterQuality {
  if (silhouette >= 0.5) {
    return { label: 'Strong', tooltip: 'These build patterns separate cleanly.' };
  }
  if (silhouette >= 0.25) {
    return {
      label: 'Moderate',
      tooltip: 'The patterns are useful, though some builds overlap.',
    };
  }
  return { label: 'Limited', tooltip: 'Top players are using many similar variations.' };
}
