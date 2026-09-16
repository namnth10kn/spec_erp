"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type QueryKey = readonly unknown[];

interface QueryRecord {
  key: QueryKey;
  data?: unknown;
  error?: unknown;
  status: "idle" | "loading" | "success" | "error";
  queryFn?: () => Promise<unknown>;
  subscribers: Set<() => void>;
}

function hashKey(key: QueryKey) {
  return JSON.stringify(key);
}

function startsWith(key: QueryKey, prefix: QueryKey) {
  return prefix.every((part, index) => hashKey([key[index]]) === hashKey([part]));
}

class QueryClient {
  private records = new Map<string, QueryRecord>();

  private getOrCreate(key: QueryKey): QueryRecord {
    const id = hashKey(key);
    let record = this.records.get(id);
    if (!record) {
      record = { key, status: "idle", subscribers: new Set() };
      this.records.set(id, record);
    }
    return record;
  }

  subscribe(key: QueryKey, listener: () => void) {
    const record = this.getOrCreate(key);
    record.subscribers.add(listener);
    return () => {
      record.subscribers.delete(listener);
    };
  }

  get(key: QueryKey) {
    return this.records.get(hashKey(key));
  }

  private notify(record: QueryRecord) {
    record.subscribers.forEach((listener) => listener());
  }

  async fetchQuery<T>(key: QueryKey, queryFn: () => Promise<T>): Promise<T> {
    const record = this.getOrCreate(key);
    record.queryFn = queryFn;
    record.status = "loading";
    this.notify(record);
    try {
      const data = await queryFn();
      record.data = data;
      record.error = undefined;
      record.status = "success";
      this.notify(record);
      return data;
    } catch (error) {
      record.error = error;
      record.status = "error";
      this.notify(record);
      throw error;
    }
  }

  async invalidateQueries(prefix: QueryKey) {
    const jobs: Promise<unknown>[] = [];
    for (const record of this.records.values()) {
      if (!startsWith(record.key, prefix)) continue;
      if (record.queryFn && record.subscribers.size > 0) {
        jobs.push(this.fetchQuery(record.key, record.queryFn as () => Promise<unknown>));
      } else {
        record.status = "idle";
        record.data = undefined;
        this.notify(record);
      }
    }
    await Promise.allSettled(jobs);
  }
}

const QueryClientContext = createContext<QueryClient | null>(null);

export function QueryClientProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<QueryClient | null>(null);
  if (!clientRef.current) clientRef.current = new QueryClient();
  return (
    <QueryClientContext.Provider value={clientRef.current}>
      {children}
    </QueryClientContext.Provider>
  );
}

export function useQueryClient() {
  const client = useContext(QueryClientContext);
  if (!client) throw new Error("QueryClientProvider is required");
  return client;
}

export function useQuery<T>({
  queryKey,
  queryFn,
  enabled = true,
}: {
  queryKey: QueryKey;
  queryFn: () => Promise<T>;
  enabled?: boolean;
}) {
  const client = useQueryClient();
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;
  const [, setTick] = useState(0);

  useEffect(() => {
    return client.subscribe(queryKey, () => setTick((n) => n + 1));
  }, [client, hashKey(queryKey)]);

  useEffect(() => {
    if (!enabled) return;
    void client.fetchQuery(queryKey, () => queryFnRef.current());
  }, [client, enabled, hashKey(queryKey)]);

  const record = client.get(queryKey);
  return {
    data: record?.data as T | undefined,
    error: record?.error,
    isLoading:
      enabled &&
      (!record || (record.status === "loading" && record.data === undefined) || record.status === "idle"),
    isFetching: record?.status === "loading",
    isError: record?.status === "error",
    refetch: () => client.fetchQuery(queryKey, () => queryFnRef.current()),
  };
}

export function useMutation<TData, TVariables>({
  mutationFn,
  onSuccess,
  onError,
}: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
  onError?: (error: unknown, variables: TVariables) => void;
}) {
  const [isPending, setPending] = useState(false);
  const [error, setError] = useState<unknown>();

  const mutateAsync = useCallback(
    async (variables: TVariables) => {
      setPending(true);
      setError(undefined);
      try {
        const data = await mutationFn(variables);
        await onSuccess?.(data, variables);
        setPending(false);
        return data;
      } catch (err) {
        setError(err);
        setPending(false);
        onError?.(err, variables);
        throw err;
      }
    },
    [mutationFn, onSuccess, onError],
  );

  return { mutateAsync, isPending, error };
}
