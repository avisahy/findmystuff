let containers = [];
let currentContainer = null;

const addBtn = document.getElementById("addBtn");
const modal = document.getElementById("addModal");
const closeModal = document.getElementById("closeModal");
const saveItem = document.getElementById("saveItem");

const itemsContainer = document.getElementById("items");

const darkToggle = document.getElementById("darkToggle");
const installBtn = document.getElementById("installBtn");

const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importInput = document.getElementById("importInput");

let deferredPrompt;

/* Dark mode */
if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark");
  darkToggle.textContent = "☀️";
}
darkToggle.onclick = () => {
  document.body.classList.toggle("dark");
  const isDark = document.body.classList.contains("dark");
  localStorage.setItem("darkMode", isDark);
  darkToggle.textContent = isDark ? "☀️" : "🌙";
};

/* Install button */
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = "inline-flex";
});
function getPlatform() {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}
installBtn.onclick = async () => {
  const platform = getPlatform();
  if (platform === "ios") {
    alert("On iPhone/iPad: Tap the Share icon → Add to Home Screen to install.");
    return;
  }
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
  } else {
    alert("Install option not available yet.");
  }
};

/* Add button opens item modal */
addBtn.onclick = () => modal.classList.remove("hidden");
closeModal.onclick = () => modal.classList.add("hidden");

/* Save Item or Container */
saveItem.onclick = async () => {
  const typeSelect = document.getElementById("itemType").value; // "item" or "container"
  const name = document.getElementById("itemName").value.trim();
  const note = document.getElementById("itemNote").value.trim();
  const fileInput = document.getElementById("itemImage");
  const file = fileInput.files[0];

  if (!name) {
    alert("Name is required");
    return;
  }

  if (typeSelect === "container") {
    // ✅ Container: name required, desc + image optional
    const newContainer = {
      id: Date.now(),
      name,
      note,
      imageBlob: file || null,
      items: []
    };
    await addContainerToDB(newContainer);
    await loadContainers(); // refresh container list
  } else {
    // ✅ Item: name + image required, desc optional
    if (!file) {
      alert("Image is required for items");
      return;
    }
    const newItem = {
      id: Date.now(),
      name,
      note,
      date: new Date().toLocaleString(),
      imageBlob: file
    };

    if (currentContainer) {
      // Inside a container → add and refresh immediately
      await addItemToContainer(currentContainer, newItem);
      await renderItems(currentContainer); // ✅ auto refresh
    } else {
      // On main page → add item directly
      let rootContainer = containers.find(c => c.id === "root");
      if (!rootContainer) {
        rootContainer = { id: "root", name: "Main Items", items: [] };
        await addContainerToDB(rootContainer);
        containers.push(rootContainer);
      }
      rootContainer.items.push(newItem);
      await updateContainer(rootContainer);
      await loadContainers(); // refresh main page
    }
  }

  // Reset modal
  modal.classList.add("hidden");
  document.getElementById("itemName").value = "";
  document.getElementById("itemNote").value = "";
  fileInput.value = "";
};

/* Render containers */
async function loadContainers() {
  containers = await getAllContainers();
  renderContainers();
}

function renderContainers() {
  itemsContainer.innerHTML = "";
  containers.forEach((c) => {
    const card = document.createElement("div");
    card.className = "item-card";
    card.innerHTML = `
      <h3>📦 ${c.name}</h3>
      <small>Contains ${c.items.length} items</small>
      <button data-id="${c.id}">Open</button>
    `;
    card.querySelector("button").onclick = () => {
      currentContainer = c.id;
      renderItems(c.id);
    };
    itemsContainer.appendChild(card);
  });
}

/* Render items inside container */
async function renderItems(containerId) {
  const container = containers.find((c) => c.id === containerId);
  if (!container) return;

  itemsContainer.innerHTML = "";

  const backBtn = document.createElement("button");
  backBtn.textContent = "⬅ Back to Containers";
  backBtn.onclick = () => {
    currentContainer = null;
    renderContainers();
  };
  itemsContainer.appendChild(backBtn);

  container.items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "item-card";

    let imgUrl = "";
    if (item.imageBlob) imgUrl = URL.createObjectURL(item.imageBlob);

    card.innerHTML = `
      ${imgUrl ? `<img src="${imgUrl}" />` : ""}
      <h3>${item.name}</h3>
      <p>${item.note || ""}</p>
      <small>${item.date}</small>
      <button data-id="${item.id}">Delete</button>
    `;
    card.querySelector("button").onclick = async () => {
      await deleteItemFromContainer(containerId, item.id);
      await renderItems(containerId);
    };
    itemsContainer.appendChild(card);
  });
}

/* Export: JSON + images in ZIP */
exportBtn.onclick = async () => {
  const allContainers = await getAllContainers();
  const zip = new JSZip();

  const data = { containers: [] };

  for (const c of allContainers) {
    const containerCopy = { ...c, items: [] };
    for (const item of c.items) {
      const itemCopy = { ...item };
      if (item.imageBlob) {
        const filename = `images/item-${item.id}.png`;
        const arrayBuffer = await item.imageBlob.arrayBuffer();
        zip.file(filename, arrayBuffer);
        itemCopy.imageFile = filename;
        delete itemCopy.imageBlob;
      }
      containerCopy.items.push(itemCopy);
    }
    data.containers.push(containerCopy);
  }

  zip.file("backup.json", JSON.stringify(data, null, 2));
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "find-my-stuff-backup.zip";
  a.click();
  URL.revokeObjectURL(url);
};

/* Import: read ZIP */
importBtn.onclick = () => importInput.click();
importInput.onchange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const zip = await JSZip.loadAsync(file);
  const jsonData = await zip.file("backup.json").async("string");
  const data = JSON.parse(jsonData);

  await clearAllContainers();

  for (const c of data.containers) {
    const container = { id: c.id, name: c.name, items: [] };
    for (const item of c.items) {
      let imageBlob = null;
      if (item.imageFile && zip.file(item.imageFile)) {
        const arrayBuffer = await zip.file(item.imageFile).async("arraybuffer");
        imageBlob = new Blob([arrayBuffer], { type: "image/png" });
      }
      container.items.push({
        id: item.id,
        name: item.name,
        note: item.note,
        date: item.date,
        imageBlob
      });
    }
    await addContainerToDB(container);
  }

  await loadContainers();
  alert("Import complete.");
  importInput.value = "";
};

/* Init */
loadContainers();

/* Service worker */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/findmystuff/service-worker.js");
}
