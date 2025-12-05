let items = JSON.parse(localStorage.getItem("items") || "[]");

const addBtn = document.getElementById("addBtn");
const modal = document.getElementById("addModal");
const closeModal = document.getElementById("closeModal");
const saveItem = document.getElementById("saveItem");
const itemsContainer = document.getElementById("items");

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

// ✅ FIXED: Mobile-safe save logic
saveItem.onclick = () => {
  const name = document.getElementById("itemName").value.trim();
  const note = document.getElementById("itemNote").value.trim();
  const fileInput = document.getElementById("itemImage");
  const file = fileInput.files[0];

  if (!name) return alert("Please enter a name");
  if (!file) return alert("Please add a photo");

  const reader = new FileReader();

  // ✅ MUST WAIT for FileReader to finish (mobile fix)
  reader.onloadend = () => {
    const newItem = {
      name,
      note,
      image: reader.result,
      date: new Date().toLocaleString()
    };

    items.push(newItem);
    localStorage.setItem("items", JSON.stringify(items));

    renderItems();

    // ✅ Reset inputs (mobile fix)
    document.getElementById("itemName").value = "";
    document.getElementById("itemNote").value = "";
    fileInput.value = "";

    // ✅ Close modal AFTER everything is done
    modal.classList.add("hidden");
  };

  // ✅ Mobile requires readAsDataURL AFTER onloadend is set
  reader.readAsDataURL(file);
};

renderItems();

// ✅ Service worker registration
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
