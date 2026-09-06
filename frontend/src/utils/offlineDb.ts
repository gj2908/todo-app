import { openDB, DBSchema, IDBPDatabase } from "idb";

export type EntityType = "todo" | "note" | "document";

export interface QueuedOperation {
  id?: number;
  // Absent/undefined means "todo" - keeps already-queued rows from
  // production (written before entity-tagging existed) valid.
  entity?: EntityType;
  type: "create" | "update" | "delete";
  tempId?: string;
  todoId?: string;
  entityId?: string;
  payload?: any;
  createdAt: number;
}

interface TaskflowOfflineDB extends DBSchema {
  cache: {
    key: string;
    value: any;
  };
  queue: {
    key: number;
    value: QueuedOperation;
  };
}

let dbPromise: Promise<IDBPDatabase<TaskflowOfflineDB>> | null = null;

const getDb = () => {
  if (!dbPromise) {
    dbPromise = openDB<TaskflowOfflineDB>("taskflow-offline", 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("cache")) {
          db.createObjectStore("cache");
        }
        if (!db.objectStoreNames.contains("queue")) {
          db.createObjectStore("queue", { keyPath: "id", autoIncrement: true });
        }
        // v1 -> v2: queue rows gained an optional `entity` field (todo/note/
        // document). No store/index changes needed - existing rows stay
        // valid since `entity` defaults to "todo" wherever it's read.
      },
    });
  }
  return dbPromise;
};

export const cacheSnapshot = async (key: string, value: any) => {
  try {
    const db = await getDb();
    await db.put("cache", value, key);
  } catch {
    // best-effort - offline caching should never break the app
  }
};

export const getCachedSnapshot = async (key: string) => {
  try {
    const db = await getDb();
    return await db.get("cache", key);
  } catch {
    return undefined;
  }
};

export const enqueueOperation = async (op: Omit<QueuedOperation, "id" | "createdAt">) => {
  try {
    const db = await getDb();
    await db.add("queue", { ...op, createdAt: Date.now() });
  } catch {
    // best-effort
  }
};

export const getQueue = async (): Promise<QueuedOperation[]> => {
  try {
    const db = await getDb();
    return await db.getAll("queue");
  } catch {
    return [];
  }
};

export const removeQueuedOperation = async (id: number) => {
  try {
    const db = await getDb();
    await db.delete("queue", id);
  } catch {
    // best-effort
  }
};
