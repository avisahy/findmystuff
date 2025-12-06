let containers = [];
let currentContainer = null;

const addBtn = document.getElementById("addBtn");
const choiceModal = document.getElementById("choiceModal");
const addItemBtn = document.getElementById("addItemBtn");
const addContainerBtn = document.getElementById("addContainerBtn");
const closeChoice = document.getElementById("closeChoice");

const modal = document.getElementById("addModal");
const closeModal = document.getElementById("closeModal");
const saveItem = document.getElementById("saveItem");

const containerModal = document.getElementById("containerModal");
const closeContainerModal = document.getElementById("closeContainerModal");
const saveContainer = document.getElementById("saveContainer");

const itemsContainer = document.getElementById("items");

const darkToggle = document.getElementById("darkToggle");
const installBtn = document.getElementById("installBtn");

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

/* Add button opens choice */
addBtn.onclick = () => choiceModal.classList.remove("hidden");
closeChoice.onclick = () => choiceModal.classList.add("hidden");

/* Add Item */
addItemBtn.onclick = () => {
  choiceModal.classList.add("hidden");
  modal.classList.remove("hidden");
};
closeModal.onclick = () => modal.classList.add("hidden");

/* Add Container */
addContainerBtn.onclick = () => {
  choiceModal.classList.add("hidden");
  containerModal.classList.remove("hidden");
};
closeContainerModal.onclick = () => containerModal.classList.add("hidden");

saveContainer.onclick = async () => {
  const name = document.getElementById("containerName").value.trim();
  if (!name) return alert("Enter a container name");

  const newContainer = { id: Date.now(), name, items: [] };
  await addContainerToDB(newContainer);
  await loadContainers();
  containerModal.classList.add("hidden");
};

/* Save Item */
saveItem.onclick = async () => {
  const name = document.getElementById("itemName").value.trim();
  const note = document.getElementById("itemNote").value.trim();
  const fileInput = document.getElementById("itemImage");
  const file = fileInput.files[0];

  if (!name) return alert("Enter item name");

  const newItem = {
    id: Date.now(),
    name,
    note,
    date: new Date().toLocaleString(),
    imageBlob: file || null
  };

  if (currentContainer) {
    await addItemToContainer(currentContainer, newItem);
    await renderItems(currentContainer);
  } else {
    alert("Please open a container first to add items.");
  }

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

/* Init */
loadContainers();

/* Service worker */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/findmystuff/service-worker.js");
}
