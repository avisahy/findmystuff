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
    card.innerHTML = `
      <img src="${item.image}" />
      <h3>${item.name}</h3>
      <p>${item.note}</p>
      <small>${item.date}</small>
      <button onclick="deleteItem(${item.id})">Delete</button>
    `;
    itemsContainer.appendChild(card);
  });
}

async function deleteItem(id) {
  await deleteItemFromDB(id);
  await loadItems();
}

addBtn.onclick = () => modal.classList.remove("hidden");
closeModal.onclick = () => modal.classList.add("hidden");

saveItem.onclick = () => {
  const name = document.getElementById("itemName").value.trim();
  const note = document.getElementById("itemNote").value.trim();
  const fileInput = document.getElementById("itemImage");
  const file = fileInput.files[0];

  if (!name) return alert("Please enter a name");
  if (!file) return alert("Please add a photo");

  progressContainer.classList.remove("hidden");
  uploadProgress.value = 0;

  const reader = new FileReader();

  reader.onprogress = (event) => {
    if (event.lengthComputable) {
      uploadProgress.value = Math.round((event.loaded / event.total) * 100);
    }
  };

  reader.onloadend = async () => {
    const newItem = {
      name,
      note,
      image: reader.result,
      date: new Date().toLocaleString()
    };

    await addItemToDB(newItem);
    await loadItems();

    document.getElementById("itemName").value = "";
    document.getElementById("itemNote").value = "";
    fileInput.value = "";

    setTimeout(() => {
      progressContainer.classList.add("hidden");
      uploadProgress.value = 0;
      modal.classList.add("hidden");
    }, 200);
  };

  reader.readAsDataURL(file);
};

loadItems();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
