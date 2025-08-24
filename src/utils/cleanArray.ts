// Removes nulls and undefineds from an array
export function cleanArray<T>(arr: Array<T | null | undefined> | null | undefined): T[] {
  if (!arr) {
    return [];
  }

  return arr.filter((item): item is T => item != null);
}

