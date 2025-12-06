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

async function getAllContainers() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("containers", "readonly");
    const req = tx.objectStore("containers").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e);
  });
}

async function updateContainer(container) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("containers", "readwrite");
    tx.objectStore("containers").put(container);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e);
  });
}

async function clearAllContainers() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("containers", "readwrite");
    tx.objectStore("containers").clear();
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e);
  });
}

/* Items inside containers */
async function addItemToContainer(containerId, item) {
  const containers = await getAllContainers();
  const container = containers.find((c) => c.id === containerId);
  if (!container) return;
  container.items.push(item);
  await updateContainer(container);
}

async function deleteItemFromContainer(containerId, itemId) {
  const containers = await getAllContainers();
  const container = containers.find((c) => c.id === containerId);
  if (!container) return;
  container.items = container.items.filter((i) => i.id !== itemId);
  await updateContainer(container);
}
