import axios from "../axiosConfig";
import { enqueueOperation, getQueue, removeQueuedOperation, cacheSnapshot, getCachedSnapshot, EntityType } from "./offlineDb";

export const isOnline = () => navigator.onLine;

const makeTempId = () => `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const ROUTES: Record<EntityType, string> = {
  todo: "/todos",
  note: "/notes",
  document: "/documents",
};

// Each wrapper tries the network first; if that fails because the browser is
// offline (not because the server rejected the request), it queues the
// operation and returns an optimistic result instead of throwing, so the UI
// can keep working. `synced: false` tells the caller the change is pending.

export const createTodoOffline = async (payload: any): Promise<{ synced: boolean; data: any }> => {
  if (isOnline()) {
    const res = await axios.post("/todos", payload);
    return { synced: true, data: res.data };
  }
  const tempId = makeTempId();
  const optimistic = { ...payload, _id: tempId, completed: false, createdAt: new Date().toISOString(), comments: [] };
  await enqueueOperation({ entity: "todo", type: "create", tempId, payload });
  return { synced: false, data: optimistic };
};

export const updateTodoOffline = async (id: string, payload: any): Promise<{ synced: boolean; data: any }> => {
  if (isOnline()) {
    const res = await axios.put(`/todos/${id}`, payload);
    return { synced: true, data: res.data };
  }
  await enqueueOperation({ entity: "todo", type: "update", todoId: id, entityId: id, payload });
  return { synced: false, data: { _id: id, ...payload } };
};

export const deleteTodoOffline = async (id: string): Promise<{ synced: boolean }> => {
  if (isOnline()) {
    await axios.delete(`/todos/${id}`);
    return { synced: true };
  }
  await enqueueOperation({ entity: "todo", type: "delete", todoId: id, entityId: id });
  return { synced: false };
};

export const createNoteOffline = async (payload: any): Promise<{ synced: boolean; data: any }> => {
  if (isOnline()) {
    const res = await axios.post("/notes", payload);
    return { synced: true, data: res.data };
  }
  const tempId = makeTempId();
  const optimistic = { ...payload, _id: tempId, pinned: false, updatedAt: new Date().toISOString() };
  await enqueueOperation({ entity: "note", type: "create", tempId, payload });
  return { synced: false, data: optimistic };
};

export const updateNoteOffline = async (id: string, payload: any): Promise<{ synced: boolean; data: any }> => {
  if (isOnline()) {
    const res = await axios.put(`/notes/${id}`, payload);
    return { synced: true, data: res.data };
  }
  await enqueueOperation({ entity: "note", type: "update", entityId: id, payload });
  return { synced: false, data: { _id: id, updatedAt: new Date().toISOString(), ...payload } };
};

export const deleteNoteOffline = async (id: string): Promise<{ synced: boolean }> => {
  if (isOnline()) {
    await axios.delete(`/notes/${id}`);
    return { synced: true };
  }
  await enqueueOperation({ entity: "note", type: "delete", entityId: id });
  return { synced: false };
};

// Documents only support offline metadata edits (title/tags/checklist) -
// uploads and deletes need a live connection to Cloudinary and can't be
// meaningfully queued as a JSON payload, so there's no create/delete wrapper.
export const updateDocumentOffline = async (id: string, payload: any): Promise<{ synced: boolean; data: any }> => {
  if (isOnline()) {
    const res = await axios.put(`/documents/${id}`, payload);
    return { synced: true, data: res.data };
  }
  await enqueueOperation({ entity: "document", type: "update", entityId: id, payload });
  return { synced: false, data: { _id: id, ...payload } };
};

// Multiple mounted views (HomePage, NotesPanel, DocumentVault) each listen
// for the browser's "online" event and call trySync() independently - without
// a guard, a single reconnect fires several concurrent passes over the same
// shared queue, double-submitting whatever hasn't been removed yet. This
// in-flight promise makes every concurrent caller await one shared pass
// instead of starting their own.
let syncInFlight: Promise<{ synced: number; remaining: number }> | null = null;

export const trySync = (): Promise<{ synced: number; remaining: number }> => {
  if (!syncInFlight) {
    syncInFlight = runSyncPass().finally(() => {
      syncInFlight = null;
    });
  }
  return syncInFlight;
};

// Replays the queue in order (across all entity types - order matters, e.g.
// an edit followed by a delete of the same note made while offline) via
// axios; stops at the first genuine network failure (preserving order for
// next time) but drops an operation outright on a definitive 404 (the
// record no longer exists server-side).
const runSyncPass = async (): Promise<{ synced: number; remaining: number }> => {
  if (!isOnline()) return { synced: 0, remaining: (await getQueue()).length };

  const queue = await getQueue();
  let synced = 0;

  for (const op of queue) {
    const entity: EntityType = op.entity || "todo";
    const base = ROUTES[entity];
    const id = op.entityId ?? op.todoId;
    try {
      if (op.type === "create") {
        await axios.post(base, op.payload);
      } else if (op.type === "update" && id) {
        await axios.put(`${base}/${id}`, op.payload);
      } else if (op.type === "delete" && id) {
        await axios.delete(`${base}/${id}`);
      }
      await removeQueuedOperation(op.id!);
      synced++;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        await removeQueuedOperation(op.id!);
        continue;
      }
      break;
    }
  }

  const remaining = (await getQueue()).length;
  return { synced, remaining };
};

export { cacheSnapshot, getCachedSnapshot, getQueue };
