const DB_NAME = "FindMyStuffDB";
const DB_VERSION = 1;
let db;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      db = e.target.result;
      if (!db.objectStoreNames.contains("containers")) {
        db.createObjectStore("containers", { keyPath: "id" });
      }
    };
    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };
    request.onerror = (e) => reject(e);
  });
}

/* Containers */
async function addContainerToDB(container) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("containers", "readwrite");
    tx.objectStore("containers").add(container);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e);
  });
}

async function
