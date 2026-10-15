import * as admin from 'firebase-admin';
import { env } from './environment';
import fs from 'fs';

let firebaseInitialized = false;

// In-Memory Dev Store for standalone execution without Firebase setup
class InMemoryDocRef {
  constructor(private store: Map<string, any>, private path: string) {}

  async get() {
    const data = this.store.get(this.path);
    return {
      exists: data !== undefined,
      data: () => (data ? JSON.parse(JSON.stringify(data)) : undefined),
      id: this.path.split('/').pop() || '',
      ref: this,
    };
  }

  async set(data: any, options?: { merge?: boolean }) {
    if (options?.merge) {
      const existing = this.store.get(this.path) || {};
      this.store.set(this.path, { ...existing, ...data });
    } else {
      this.store.set(this.path, { ...data });
    }
    return { writeTime: Date.now() };
  }

  async update(data: any) {
    const existing = this.store.get(this.path);
    if (!existing) {
      throw new Error(`Document does not exist at ${this.path}`);
    }
    this.store.set(this.path, { ...existing, ...data });
    return { writeTime: Date.now() };
  }

  async delete() {
    this.store.delete(this.path);
    return { writeTime: Date.now() };
  }

  collection(subName: string) {
    return new InMemoryCollectionRef(this.store, `${this.path}/${subName}`);
  }
}

class InMemoryCollectionRef {
  private filters: Array<{ field: string; op: string; val: any }> = [];
  private limitCount: number | null = null;

  constructor(private store: Map<string, any>, private path: string) {}

  doc(id: string) {
    return new InMemoryDocRef(this.store, `${this.path}/${id}`);
  }

  where(field: string, op: string, val: any) {
    const cloned = new InMemoryCollectionRef(this.store, this.path);
    cloned.filters = [...this.filters, { field, op, val }];
    cloned.limitCount = this.limitCount;
    return cloned;
  }

  limit(count: number) {
    const cloned = new InMemoryCollectionRef(this.store, this.path);
    cloned.filters = [...this.filters];
    cloned.limitCount = count;
    return cloned;
  }

  async get() {
    let docs: any[] = [];
    for (const [key, val] of this.store.entries()) {
      // Must be direct child of this collection path
      const prefix = `${this.path}/`;
      if (key.startsWith(prefix) && !key.slice(prefix.length).includes('/')) {
        let matches = true;
        for (const f of this.filters) {
          const itemVal = val[f.field];
          if (f.op === '==' && itemVal !== f.val) matches = false;
          else if (f.op === '!=' && itemVal === f.val) matches = false;
          else if (f.op === '>=' && (itemVal < f.val || itemVal === undefined)) matches = false;
          else if (f.op === '<=' && (itemVal > f.val || itemVal === undefined)) matches = false;
          else if (f.op === 'array-contains' && (!Array.isArray(itemVal) || !itemVal.includes(f.val))) matches = false;
        }
        if (matches) {
          docs.push({
            id: key.slice(prefix.length),
            exists: true,
            data: () => JSON.parse(JSON.stringify(val)),
            ref: new InMemoryDocRef(this.store, key),
          });
        }
      }
    }

    if (this.limitCount !== null) {
      docs = docs.slice(0, this.limitCount);
    }

    return {
      empty: docs.length === 0,
      size: docs.length,
      docs,
      forEach: (callback: (doc: any) => void) => docs.forEach(callback),
    };
  }
}

class InMemoryFirestore {
  private store = new Map<string, any>();

  collection(name: string) {
    return new InMemoryCollectionRef(this.store, name);
  }

  collectionGroup(name: string) {
    return {
      where: (_field: string, _op: string, _val: any) => ({
        where: () => ({
          limit: () => ({
            get: async () => ({ empty: true, size: 0, docs: [], forEach: () => {} }),
          }),
        }),
      }),
    };
  }

  batch() {
    const operations: Array<() => Promise<any>> = [];
    return {
      delete: (ref: InMemoryDocRef) => {
        operations.push(() => ref.delete());
      },
      commit: async () => {
        for (const op of operations) await op();
      },
    };
  }
}

class InMemoryAuth {
  async verifyIdToken(idToken: string) {
    // Decode JWT structure or return dummy identity for dev
    try {
      const parts = idToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        return {
          uid: payload.user_id || payload.sub || payload.uid || 'dev-user-id',
          email: payload.email || 'dev@securechat.app',
        };
      }
    } catch {
      // Fallback
    }
    return {
      uid: idToken,
      email: `${idToken}@securechat.app`,
    };
  }
}

let firestoreInstance: any;
let firebaseAuthInstance: any;

try {
  if (admin.apps.length > 0) {
    firebaseInitialized = true;
    firestoreInstance = admin.firestore();
    firebaseAuthInstance = admin.auth();
  } else if (env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(env.GOOGLE_APPLICATION_CREDENTIALS)) {
    admin.initializeApp({
      credential: admin.credential.cert(env.GOOGLE_APPLICATION_CREDENTIALS),
    });
    firebaseInitialized = true;
    firestoreInstance = admin.firestore();
    firebaseAuthInstance = admin.auth();
  } else if (
    env.FIREBASE_PROJECT_ID &&
    env.FIREBASE_CLIENT_EMAIL &&
    env.FIREBASE_PRIVATE_KEY &&
    env.FIREBASE_PRIVATE_KEY.includes('BEGIN PRIVATE KEY') &&
    !env.FIREBASE_PRIVATE_KEY.includes('...')
  ) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    firebaseInitialized = true;
    firestoreInstance = admin.firestore();
    firebaseAuthInstance = admin.auth();
  } else {
    // In-memory standalone development store
    firestoreInstance = new InMemoryFirestore();
    firebaseAuthInstance = new InMemoryAuth();
    console.log('⚡ Firebase running with in-memory dev store (no external GCP credentials needed)');
  }
} catch (error) {
  firestoreInstance = new InMemoryFirestore();
  firebaseAuthInstance = new InMemoryAuth();
  console.log('⚡ Fallback: in-memory dev store initialized');
}

export const firebaseAdmin = admin;
export const firestore = firestoreInstance;
export const firebaseAuth = firebaseAuthInstance;
export const isFirebaseConfigured = () => firebaseInitialized;
