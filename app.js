let containers = [];
let currentContainer = null;

const addBtn = document.getElementById("addBtn");
const modal = document.getElementById("addModal");
const closeModal = document.getElementById("closeModal");
const saveItem = document.getElementById("saveItem");

const itemsContainer = document.getElementById("items");

const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importInput = document.getElementById("importInput");

/* Add button opens modal */
addBtn.onclick = () => modal.classList.remove("hidden");
closeModal.onclick = () => modal.classList.add("hidden");

/* Save Item or Container */
saveItem.onclick = async () => {
  const typeSelect = document.getElementById("itemType").value;
  const name = document.getElementById("itemName").value.trim();
  const note = document.getElementById("itemNote").value.trim();
  const fileInput = document.getElementById("itemImage");
  const file = fileInput.files[0];

  if (!name) {
    alert("Name is required");
    return;
  }

  if (typeSelect === "container") {
    const newContainer = {
      id: Date.now(),
      name,
      note,
      imageBlob: file || null,
      items: []
    };

    if (currentContainer) {
      await addItemToContainer(currentContainer, newContainer);
      await renderItems(currentContainer); // auto refresh
    } else {
      await addContainerToDB(newContainer);
      await loadContainers();
    }
  } else {
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
      await addItemToContainer(currentContainer, newItem);
      await renderItems(currentContainer); // auto refresh
    } else {
      // root-level item is stored as a container-like entry
      const newContainer = {
        id: Date.now(),
        name,
        note,
        imageBlob: file,
        items: []
      };
      await addContainerToDB(newContainer);
      await loadContainers();
    }
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

    let imgUrl = "";
    if (c.imageBlob) imgUrl = URL.createObjectURL(c.imageBlob);

    card.innerHTML = `
      ${imgUrl ? `<img src="${imgUrl}" />` : ""}
      <h3>📦 ${c.name}</h3>
      <p>${c.note || ""}</p>
      <small>Contains ${c.items.length} items</small>
      <button data-id="${c.id}" class="open-btn">Open</button>
      <button data-id="${c.id}" class="delete-btn">Delete Container</button>
    `;

    card.querySelector(".open-btn").onclick = () => {
      currentContainer = c.id;
      renderItems(c.id);
    };
    card.querySelector(".delete-btn").onclick = async () => {
      await deleteContainer(c.id);
      await loadContainers();
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
      <small>${item.date || ""}</small>
      <button data-id="${item.id}" class="delete-item">Delete</button>
    `;
    card.querySelector(".delete-item").onclick = async () => {
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
    if (c.imageBlob) {
      const filename = `images/container-${c.id}.png`;
      const arrayBuffer = await c.imageBlob.arrayBuffer();
      zip.file(filename, arrayBuffer);
      containerCopy.imageFile = filename;
      delete containerCopy.imageBlob;
    }
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
    const container = { id: c.id, name: c.name, note: c.note, items: [] };
    if (c.imageFile && zip.file(c.imageFile)) {
      const arrayBuffer = await zip.file(c.imageFile).async("arraybuffer");
      container.imageBlob = new Blob([arrayBuffer], { type: "image/png" });
    }
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
