let items = JSON.parse(localStorage.getItem("items") || "[]");

const addBtn = document.getElementById("addBtn");
const modal = document.getElementById("addModal");
const closeModal = document.getElementById("closeModal");
const saveItem = document.getElementById("saveItem");
const itemsContainer = document.getElementById("items");

const progressContainer = document.getElementById("progressContainer");
const uploadProgress = document.getElementById("uploadProgress");

function renderItems() {
  itemsContainer.innerHTML = "";
  items.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "item-card";
    card.innerHTML = `
      <img src="${item.image}" />
      <h3>${item.name}</h3>
      <p>${item.note}</p>
      <small>${item.date}</small>
      <button onclick="deleteItem(${index})">Delete</button>
    `;
    itemsContainer.appendChild(card);
  });
}

function deleteItem(index) {
  items.splice(index, 1);
  localStorage.setItem("items", JSON.stringify(items));
  renderItems();
}

addBtn.onclick = () => {
  modal.classList.remove("hidden");
};

closeModal.onclick = () => {
  modal.classList.add("hidden");
};

// ✅ MOBILE-SAFE SAVE WITH PROGRESS BAR
saveItem.onclick = () => {
  const name = document.getElementById("itemName").value.trim();
  const note = document.getElementById("itemNote").value.trim();
  const fileInput = document.getElementById("itemImage");
  const file = fileInput.files[0];

  if (!name) return alert("Please enter a name");
  if (!file) return alert("Please add a photo");

  // ✅ Show progress bar
  progressContainer.classList.remove("hidden");
  uploadProgress.value = 0;

  // ✅ Create a NEW FileReader every time (mobile fix)
  const reader = new FileReader();

  // ✅ Track progress
  reader.onprogress = (event) => {
    if (event.lengthComputable) {
      uploadProgress.value = Math.round((event.loaded / event.total) * 100);
    }
  };

  // ✅ Mobile-safe final event
  reader.onloadend = () => {
    // ✅ Force microtask flush (critical for iOS/Android)
    setTimeout(() => {
      const newItem = {
        name,
        note,
        image: reader.result,
        date: new Date().toLocaleString()
      };

      items.push(newItem);
      localStorage.setItem("items", JSON.stringify(items));

      renderItems();

      // ✅ Reset inputs
      document.getElementById("itemName").value = "";
      document.getElementById("itemNote").value = "";
      fileInput.value = "";

      // ✅ Hide progress bar AFTER everything is saved
      setTimeout(() => {
        progressContainer.classList.add("hidden");
        uploadProgress.value = 0;
        modal.classList.add("hidden");
      }, 200);
    }, 50); // ✅ This delay is the key fix
  };

  // ✅ Start reading AFTER handlers are set
  reader.readAsDataURL(file);
};


renderItems();

// ✅ Service worker registration
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
