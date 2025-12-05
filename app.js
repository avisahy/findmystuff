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

  reader.onloadend = () => {
  const img = new Image();

  img.onload = async () => {
    const canvas = document.createElement("canvas");
    const MAX_WIDTH = 800;
    const scale = MAX_WIDTH / img.width;

    canvas.width = MAX_WIDTH;
    canvas.height = img.height * scale;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const compressedImage = canvas.toDataURL("image/jpeg", 0.7);

    const newItem = {
      name,
      note,
      image: compressedImage,
      date: new Date().toLocaleString()
    };

    // ✅ 1. Save to DB and WAIT for it
    await addItemToDB(newItem);

    // ✅ 2. Force browser to release memory
    await new Promise(r => setTimeout(r, 50));

    // ✅ 3. Reload items AFTER DB is fully done
    await loadItems();

    // ✅ 4. Reset inputs
    document.getElementById("itemName").value = "";
    document.getElementById("itemNote").value = "";
    fileInput.value = "";

    // ✅ 5. Hide progress bar and close modal
    setTimeout(() => {
      progressContainer.classList.add("hidden");
      uploadProgress.value = 0;
      modal.classList.add("hidden");
    }, 150);
  };

  img.src = reader.result;
};



  reader.readAsDataURL(file);
};

loadItems();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
