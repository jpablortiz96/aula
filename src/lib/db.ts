import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export interface StudySession {
  id: string;
  title: string;
  subject: "math" | "science" | "language" | "history" | "other";
  messages: StoredMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface StoredMessage {
  id: string;
  role: "user" | "assistant" | "system-notice";
  content: string;
}

interface AulaDB extends DBSchema {
  sessions: {
    key: string;
    value: StudySession;
    indexes: { "by-updatedAt": number };
  };
}

const DB_NAME = "aula-db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AulaDB>> | null = null;

function getDB(): Promise<IDBPDatabase<AulaDB>> {
  if (!dbPromise) {
    dbPromise = openDB<AulaDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore("sessions", { keyPath: "id" });
        store.createIndex("by-updatedAt", "updatedAt");
      },
    });
  }
  return dbPromise;
}

export async function getAllSessions(): Promise<StudySession[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("sessions", "by-updatedAt");
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveSession(session: StudySession): Promise<void> {
  const db = await getDB();
  await db.put("sessions", session);
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("sessions", id);
}
