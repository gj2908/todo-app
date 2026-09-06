import axios from "../axiosConfig";
import { enqueueOperation, getQueue, removeQueuedOperation, cacheSnapshot, getCachedSnapshot } from "./offlineDb";

export const isOnline = () => navigator.onLine;

const makeTempId = () => `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
  await enqueueOperation({ type: "create", tempId, payload });
  return { synced: false, data: optimistic };
};

export const updateTodoOffline = async (id: string, payload: any): Promise<{ synced: boolean; data: any }> => {
  if (isOnline()) {
    const res = await axios.put(`/todos/${id}`, payload);
    return { synced: true, data: res.data };
  }
  await enqueueOperation({ type: "update", todoId: id, payload });
  return { synced: false, data: { _id: id, ...payload } };
};

export const deleteTodoOffline = async (id: string): Promise<{ synced: boolean }> => {
  if (isOnline()) {
    await axios.delete(`/todos/${id}`);
    return { synced: true };
  }
  await enqueueOperation({ type: "delete", todoId: id });
  return { synced: false };
};

// Replays the queue in order; stops at the first genuine network failure
// (preserving order for next time) but drops an operation outright on a
// definitive 404 (the todo no longer exists server-side).
export const trySync = async (): Promise<{ synced: number; remaining: number }> => {
  if (!isOnline()) return { synced: 0, remaining: (await getQueue()).length };

  const queue = await getQueue();
  let synced = 0;

  for (const op of queue) {
    try {
      if (op.type === "create") {
        await axios.post("/todos", op.payload);
      } else if (op.type === "update" && op.todoId) {
        await axios.put(`/todos/${op.todoId}`, op.payload);
      } else if (op.type === "delete" && op.todoId) {
        await axios.delete(`/todos/${op.todoId}`);
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
