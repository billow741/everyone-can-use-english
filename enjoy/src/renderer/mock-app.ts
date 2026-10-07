// Browser Universal Mock Proxy for window.__ENJOY_APP__
// Allows the React renderer to run completely smoothly in normal browsers (Chrome/Edge/Firefox) without Electron IPC

const DB_CONVERSATIONS_KEY = "sb_conversations";
const DB_MESSAGES_KEY = "sb_messages";
const lookupListeners = new Set<Function>();

function getConversations(): any[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(DB_CONVERSATIONS_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveConversations(list: any[]) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(DB_CONVERSATIONS_KEY, JSON.stringify(list));
    }
  } catch {}
}

function getMessages(): any[] {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(DB_MESSAGES_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(list: any[]) {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(DB_MESSAGES_KEY, JSON.stringify(list));
    }
  } catch {}
}

const dbTransactionListeners: Array<(event: any, state: any) => void> = [];

function notifyDbChange(model: string, action: string, record: any) {
  const state = { model, action, record };
  for (const listener of [...dbTransactionListeners]) {
    try {
      listener(null, state);
    } catch (err) {
      console.error("db transaction listener error:", err);
    }
  }
}

function createUniversalProxy(name = "__ENJOY_APP__"): any {
  const targetFn: any = function (...args: any[]) {
    if (args.length > 0 && typeof args[0] === "function") {
      return () => {};
    }
    return Promise.resolve([]);
  };

  return new Proxy(targetFn, {
    get(_target, prop: string | symbol) {
      if (prop === "then") return undefined;
      if (prop === Symbol.toPrimitive) return () => "";
      if (prop === "toString") return () => `[Proxy ${name}]`;
      if (prop === "valueOf") return () => 0;

      // Special deterministic values
      if (prop === "state") return "connected";
      if (prop === "path") return "browser-preview";
      if (prop === "error") return undefined;
      if (prop === "isPackaged") return async () => false;
      if (prop === "platform") return "win32";
      if (prop === "arch") return "x64";
      if (prop === "apiUrl")
        return async () =>
          typeof window !== "undefined" && window.location
            ? window.location.origin
            : "https://app.sunnybridge.qzz.io";
      if (prop === "wsUrl")
        return async () =>
          typeof window !== "undefined" && window.location
            ? (window.location.protocol === "https:" ? "wss://" : "ws://") +
              window.location.host
            : "wss://app.sunnybridge.qzz.io";

      // Database namespace
      if (prop === "db") {
        return {
          state: "connected",
          path: "browser-storage",
          connect: async () => ({
            state: "connected",
            path: "browser-storage",
            error: undefined,
          }),
          disconnect: async () => ({
            state: "disconnected",
            path: undefined,
            error: undefined,
          }),
          onTransaction: (cb: any) => {
            dbTransactionListeners.push(cb);
            return () => {
              const idx = dbTransactionListeners.indexOf(cb);
              if (idx >= 0) dbTransactionListeners.splice(idx, 1);
            };
          },
          removeListeners: () => {
            dbTransactionListeners.length = 0;
          },
        };
      }

      // Conversations DB
      if (prop === "conversations") {
        return {
          findAll: async (query?: any) => {
            const list = getConversations();
            return list;
          },
          findOne: async (query?: any) => {
            const list = getConversations();
            const id = typeof query === "string" ? query : query?.id || query?.where?.id;
            return list.find((c: any) => c.id === id) || null;
          },
          create: async (data: any) => {
            const list = getConversations();
            const newConv = {
              id: data.id || `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              name: data.name || "口语伴读对话",
              type: data.type || "gpt",
              engine: data.engine || "openai",
              configuration: data.configuration || {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              ...data,
            };
            list.unshift(newConv);
            saveConversations(list);
            notifyDbChange("Conversation", "create", newConv);
            return newConv;
          },
          update: async (idOrData: any, data?: any) => {
            const list = getConversations();
            const id = typeof idOrData === "string" ? idOrData : idOrData?.id;
            const updateFields = data || idOrData;
            const idx = list.findIndex((c: any) => c.id === id);
            if (idx >= 0) {
              list[idx] = { ...list[idx], ...updateFields, updatedAt: new Date().toISOString() };
              saveConversations(list);
              notifyDbChange("Conversation", "update", list[idx]);
              return list[idx];
            }
            return null;
          },
          destroy: async (id: string) => {
            let list = getConversations();
            const item = list.find((c: any) => c.id === id);
            list = list.filter((c: any) => c.id !== id);
            saveConversations(list);
            if (item) notifyDbChange("Conversation", "destroy", item);
            return true;
          },
        };
      }

      // Messages DB
      if (prop === "messages") {
        return {
          findAll: async (query?: any) => {
            const list = getMessages();
            const convId = query?.where?.conversationId;
            let filtered = convId ? list.filter((m: any) => m.conversationId === convId) : list;
            filtered.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            if (query?.limit) {
              const offset = query.offset || 0;
              return filtered.slice(offset, offset + query.limit);
            }
            return filtered;
          },
          findOne: async (query?: any) => {
            const list = getMessages();
            const id = typeof query === "string" ? query : query?.id || query?.where?.id;
            return list.find((m: any) => m.id === id) || null;
          },
          createInBatch: async (records: any[]) => {
            const list = getMessages();
            const created: any[] = [];
            for (const r of records) {
              const newMsg = {
                id: r.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                conversationId: r.conversationId,
                role: r.role || "user",
                content: r.content || "",
                status: r.status || "success",
                createdAt: r.createdAt || new Date().toISOString(),
                updatedAt: r.updatedAt || new Date().toISOString(),
                ...r,
              };
              list.push(newMsg);
              created.push(newMsg);
              notifyDbChange("Message", "create", newMsg);
            }
            saveMessages(list);
            return created;
          },
          create: async (record: any) => {
            const list = getMessages();
            const newMsg = {
              id: record.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              ...record,
              createdAt: record.createdAt || new Date().toISOString(),
              updatedAt: record.updatedAt || new Date().toISOString(),
            };
            list.push(newMsg);
            saveMessages(list);
            notifyDbChange("Message", "create", newMsg);
            return newMsg;
          },
          update: async (idOrData: any, data?: any) => {
            const list = getMessages();
            const id = typeof idOrData === "string" ? idOrData : idOrData?.id;
            const updateFields = data || idOrData;
            const idx = list.findIndex((m: any) => m.id === id);
            if (idx >= 0) {
              list[idx] = { ...list[idx], ...updateFields, updatedAt: new Date().toISOString() };
              saveMessages(list);
              notifyDbChange("Message", "update", list[idx]);
              return list[idx];
            }
            return null;
          },
          destroy: async (id: string) => {
            let list = getMessages();
            const item = list.find((m: any) => m.id === id);
            list = list.filter((m: any) => m.id !== id);
            saveMessages(list);
            if (item) notifyDbChange("Message", "destroy", item);
            return true;
          },
        };
      }

      // Recordings DB
      if (prop === "recordings") {
        return {
          findAll: async () => {
            try {
              return JSON.parse(localStorage.getItem("sunnybridge_recordings") || "[]");
            } catch { return []; }
          },
          findOne: async (query?: any) => {
            const list = JSON.parse(localStorage.getItem("sunnybridge_recordings") || "[]");
            const id = typeof query === "string" ? query : query?.id || query?.where?.id || query?.targetId;
            return list.find((r: any) => r.id === id || r.targetId === id) || null;
          },
          create: async (record: any) => {
            const list = JSON.parse(localStorage.getItem("sunnybridge_recordings") || "[]");
            const newRec = {
              id: record.id || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              duration: record.duration || 5000,
              language: record.language || "en-US",
              referenceText: record.referenceText || "",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              ...record,
            };
            list.unshift(newRec);
            localStorage.setItem("sunnybridge_recordings", JSON.stringify(list));
            notifyDbChange("Recording", "create", newRec);
            return newRec;
          },
          sync: async () => true,
          syncAll: async () => true,
          stats: async ({ from, to }: any = {}) => {
            try {
              const list = JSON.parse(localStorage.getItem("sunnybridge_recordings") || "[]");
              const duration = list.reduce((acc: number, cur: any) => acc + (cur.duration || 5000), 0);
              return {
                count: list.length,
                duration,
              };
            } catch {
              return { count: 0, duration: 0 };
            }
          },
          groupByTarget: async ({ from, to }: any = {}) => {
            return [];
          },
          groupByDate: async ({ from, to }: any = {}) => {
            return [];
          },
          upload: async () => true,
          destroy: async (id: string) => {
            let list = JSON.parse(localStorage.getItem("sunnybridge_recordings") || "[]");
            list = list.filter((r: any) => r.id !== id);
            localStorage.setItem("sunnybridge_recordings", JSON.stringify(list));
            return true;
          }
        };
      }

      // Pronunciation Assessments DB
      if (prop === "pronunciationAssessments") {
        const getPopulatedAssessments = () => {
          try {
            const list = JSON.parse(
              localStorage.getItem("sunnybridge_assessments") || "[]"
            );
            const recordings = JSON.parse(
              localStorage.getItem("sunnybridge_recordings") || "[]"
            );
            return list.map((a: any) => {
              const rec = recordings.find((r: any) => r.id === a.targetId);
              const effectiveSrc = rec?.src || a.recordingSrc || a.target?.src || "";
              return {
                ...a,
                recordingSrc: effectiveSrc,
                target: rec
                  ? { ...rec, src: effectiveSrc }
                  : a.target
                  ? { ...a.target, src: effectiveSrc }
                  : {
                      id: a.targetId || a.id,
                      referenceText:
                        a.referenceText || a.result?.display || "",
                      src: effectiveSrc,
                      duration: a.result?.duration || 5000,
                      language: a.language || "en-US",
                    },
              };
            });
          } catch {
            return [];
          }
        };

        return {
          findAll: async (query?: any) => {
            const list = getPopulatedAssessments();
            list.sort(
              (a: any, b: any) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            );
            return list;
          },
          findOne: async (query?: any) => {
            const list = getPopulatedAssessments();
            const id =
              typeof query === "string"
                ? query
                : query?.id || query?.where?.id;
            return list.find((a: any) => a.id === id) || null;
          },
          create: async (data: any) => {
            const list = JSON.parse(
              localStorage.getItem("sunnybridge_assessments") || "[]"
            );
            const recordings = JSON.parse(
              localStorage.getItem("sunnybridge_recordings") || "[]"
            );
            const rec = recordings.find((r: any) => r.id === data.targetId);

            const newAssessment = {
              id:
                data.id ||
                `pa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              ...data,
              target: rec || data.target || {
                id: data.targetId || `rec_${Date.now()}`,
                referenceText:
                  data.referenceText || data.result?.display || "",
                src: "",
                duration: data.result?.duration || 5000,
                language: data.language || "en-US",
              },
            };
            list.unshift(newAssessment);
            localStorage.setItem(
              "sunnybridge_assessments",
              JSON.stringify(list)
            );
            notifyDbChange("PronunciationAssessment", "create", newAssessment);
            return newAssessment;
          },
          destroy: async (id: string) => {
            let list = JSON.parse(
              localStorage.getItem("sunnybridge_assessments") || "[]"
            );
            list = list.filter((a: any) => a.id !== id);
            localStorage.setItem(
              "sunnybridge_assessments",
              JSON.stringify(list)
            );
            return true;
          },
        };
      }

      if (prop === "connect") {
        return async () => ({
          state: "connected",
          path: "browser-preview",
          error: undefined,
        });
      }
      if (prop === "disconnect") {
        return async () => ({
          state: "disconnected",
          path: undefined,
          error: undefined,
        });
      }
      if (prop === "getLibrary") return async () => "browser-preview";
      if (prop === "get") {
        return async (key?: string) => {
          if (key === "learning_language") return "en-US";
          if (key === "native_language") return "zh-CN";
          if (key === "language") return "zh-CN";
          if (key === "profile") {
            const saved = typeof localStorage !== "undefined" ? localStorage.getItem("sunnybridge_user") : null;
            return saved ? JSON.parse(saved) : null;
          }
          return null;
        };
      }
      if (prop === "getUser") {
        return async () => {
          const saved = typeof localStorage !== "undefined" ? localStorage.getItem("sunnybridge_user") : null;
          return saved ? JSON.parse(saved) : null;
        };
      }
      if (prop === "setUser") {
        return async (user: any) => {
          if (typeof localStorage !== "undefined") {
            if (user) {
              localStorage.setItem("sunnybridge_user", JSON.stringify(user));
            } else {
              localStorage.removeItem("sunnybridge_user");
            }
          }
        };
      }
      if (prop === "shell") {
        return {
          openExternal: (url: string) => window.open(url, "_blank")
        };
      }

      if (prop === "lookup") {
        return (word: string, context?: string, position?: { x: number; y: number }) => {
          lookupListeners.forEach((cb) => {
            try {
              cb(null, word, context, position);
            } catch (err) {
              console.error("Lookup callback error:", err);
            }
          });
        };
      }

      if (prop === "onLookup") {
        return (cb: Function) => {
          lookupListeners.add(cb);
          return () => lookupListeners.delete(cb);
        };
      }

      if (prop === "offLookup") {
        return () => {
          lookupListeners.clear();
        };
      }

      // Event listeners that take callbacks
      if (
        prop === "onNotification" ||
        prop === "onUpdater" ||
        prop === "onCmdOutput" ||
        prop === "onTransaction" ||
        prop === "onChange" ||
        prop === "on"
      ) {
        return (_cb: any) => () => {};
      }

      if (
        prop === "removeListeners" ||
        prop === "removeUpdaterListeners" ||
        prop === "removeCmdOutputListeners" ||
        prop === "removeListener"
      ) {
        return () => {};
      }

      // Return a recursive proxy for child namespaces (e.g. EnjoyApp.db, EnjoyApp.audios, etc.)
      return createUniversalProxy(`${name}.${String(prop)}`);
    },
    apply(_target, _thisArg, args) {
      if (args.length > 0 && typeof args[0] === "function") {
        return () => {};
      }
      return Promise.resolve([]);
    }
  });
}

if (typeof window !== "undefined" && !window.__ENJOY_APP__) {
  console.info("⚡ [SunnyBridge Enjoy] Web Browser Universal DB Mode activated");
  window.__ENJOY_APP__ = createUniversalProxy();
}

export {};
