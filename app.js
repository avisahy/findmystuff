let items = [];

const addBtn = document.getElementById("addBtn");
const modal = document.getElementById("addModal");
const closeModal = document.getElementById("closeModal");
const saveItem = document.getElementById("saveItem");
const itemsContainer = document.getElementById("items");

const progressContainer = document.getElementById("progressContainer");
const uploadProgress = document.getElementById("uploadProgress");

async function loadItems() {
  items = await getAllItems();
  renderItems();
}

function renderItems() {
  itemsContainer.innerHTML = "";
  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "item-card";

    // Create object URL for blob
    let imgUrl = "";
    if (item.imageBlob) {
      imgUrl = URL.createObjectURL(item.imageBlob);
    }

    card.innerHTML = `
      ${imgUrl ? `<img src="${imgUrl}" />` : ""}
      <h3>${item.name}</h3>
      <p>${item.note}</p>
      <small>${item.date}</small>
      <button data-id="${item.id}">Delete</button>
    `;

    const deleteBtn = card.querySelector("button");
    deleteBtn.onclick = async () => {
      await deleteItemFromDB(item.id);
      await loadItems();
    };

    itemsContainer.appendChild(card);
  });
}

addBtn.onclick = () => {
  modal.classList.remove("hidden");
};

closeModal.onclick = () => {
  modal.classList.add("hidden");
};

// Save item (Blob-based, no base64, mobile-safe)
saveItem.onclick = async () => {
  const name = document.getElementById("itemName").value.trim();
  const note = document.getElementById("itemNote").value.trim();
  const fileInput = document.getElementById("itemImage");
  const file = fileInput.files[0];

  if (!name) {
    alert("Please enter a name");
    return;
  }
  if (!file) {
    alert("Please add a photo");
    return;
  }

  // Show progress UI
  progressContainer.classList.remove("hidden");
  uploadProgress.value = 0;

  // Simulate progress (since we don't actually stream)
  let fakeProgress = 0;
  const interval = setInterval(() => {
    fakeProgress += 10;
    if (fakeProgress > 90) fakeProgress = 90;
    uploadProgress.value = fakeProgress;
  }, 80);

  try {
    // Create a preview URL (not stored, only for immediate UI if needed)
    // We store the blob itself in IndexedDB
    const newItem = {
      name,
      note,
      imageBlob: file,
      date: new Date().toLocaleString()
    };

    await addItemToDB(newItem);
    await loadItems();

    // Finish progress
    clearInterval(interval);
    uploadProgress.value = 100;

    // Reset inputs
    document.getElementById("itemName").value = "";
    document.getElementById("itemNote").value = "";
    fileInput.value = "";

    setTimeout(() => {
      progressContainer.classList.add("hidden");
      uploadProgress.value = 0;
      modal.classList.add("hidden");
    }, 200);
  } catch (err) {
    clearInterval(interval);
    console.error("Error saving item:", err);
    alert("There was an error saving the item.");
    progressContainer.classList.add("hidden");
    uploadProgress.value = 0;
  }
};

loadItems();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
