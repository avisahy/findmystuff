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

addBtn.onclick = () => modal.classList.remove("hidden");
closeModal.onclick = () => modal.classList.add("hidden");

saveItem.onclick = () => {
  const name = document.getElementById("itemName").value;
  const note = document.getElementById("itemNote").value;
  const file = document.getElementById("itemImage").files[0];

  if (!file) return alert("Please add a photo");

  const reader = new FileReader();
  reader.onload = () => {
    items.push({
      name,
      note,
      image: reader.result,
      date: new Date().toLocaleString()
    });

    localStorage.setItem("items", JSON.stringify(items));
    renderItems();
    modal.classList.add("hidden");
  };

  reader.readAsDataURL(file);
};

renderItems();

// Register service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
