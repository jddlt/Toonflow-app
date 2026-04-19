export type StoredVendorModel = {
  modelName: string;
  deleted?: boolean;
  [key: string]: unknown;
};

function isStoredVendorModel(value: unknown): value is StoredVendorModel {
  return typeof value === "object" && value !== null && typeof (value as StoredVendorModel).modelName === "string";
}

function normalizeStoredVendorModels(models: unknown[]): StoredVendorModel[] {
  const map = new Map<string, StoredVendorModel>();
  for (const model of models) {
    if (!isStoredVendorModel(model)) continue;
    map.set(model.modelName, model);
  }
  return [...map.values()];
}

export function parseStoredVendorModels(value: unknown): StoredVendorModel[] {
  if (Array.isArray(value)) return normalizeStoredVendorModels(value);
  if (typeof value !== "string" || value.trim() === "") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? normalizeStoredVendorModels(parsed) : [];
  } catch {
    return [];
  }
}

export function serializeStoredVendorModels(value: unknown): string {
  return JSON.stringify(parseStoredVendorModels(value));
}

export function mergeVendorModels(baseModels: unknown, storedModels: unknown): StoredVendorModel[] {
  const base = parseStoredVendorModels(baseModels).filter((item) => !item.deleted);
  const stored = parseStoredVendorModels(storedModels);
  const deleted = new Set(stored.filter((item) => item.deleted).map((item) => item.modelName));
  const baseMap = new Map(base.map((item) => [item.modelName, item]));
  const overlay = stored
    .filter((item) => !item.deleted && !deleted.has(item.modelName))
    .map((item) => ({
      ...(baseMap.get(item.modelName) ?? {}),
      ...item,
    }));
  return normalizeStoredVendorModels([...base, ...overlay]).filter((item) => !item.deleted && !deleted.has(item.modelName));
}

export function appendVendorModel(existing: unknown, model: StoredVendorModel): StoredVendorModel[] {
  return replaceVendorModel(existing, model.modelName, model);
}

export function replaceVendorModel(existing: unknown, originalModelName: string, model: StoredVendorModel): StoredVendorModel[] {
  const models = parseStoredVendorModels(existing);
  const replaceIndex = models.findIndex((item) => item.modelName === originalModelName);
  const filtered = models.filter((item) => item.modelName !== originalModelName && item.modelName !== model.modelName);

  if (replaceIndex === -1) {
    filtered.push(model);
    return filtered;
  }

  filtered.splice(Math.min(replaceIndex, filtered.length), 0, model);
  return filtered;
}

export function removeVendorModel(existing: unknown, modelName: string): StoredVendorModel[] {
  return [...parseStoredVendorModels(existing).filter((item) => item.modelName !== modelName), { modelName, deleted: true }];
}
