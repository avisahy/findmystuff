let items = [];

const addBtn = document.getElementById("addBtn");
const modal = document.getElementById("addModal");
const closeModal = document.getElementById("closeModal");
const saveItem = document.getElementById("saveItem");
const itemsContainer = document.getElementById("items");

const progressContainer = document.getElementById("progressContainer");
const uploadProgress = document.getElementById("uploadProgress");

const searchInput = document.getElementById("searchInput");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importInput = document.getElementById("importInput");

const darkToggle = document.getElementById("darkToggle");
const installBtn = document.getElementById("installBtn");

let deferredPrompt;

/* ✅ DARK MODE */
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

/* ✅ INSTALL BUTTON LOGIC */
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.style.display = "inline-flex"; // show button
});

// Detect platform
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
    alert("Install option not available yet. Try again after browsing a bit.");
  }
};

/* ✅ Load items */
async function loadItems() {
  items = await getAllItems();
  renderItems();
}

function renderItems() {
  const query = (searchInput.value || "").toLowerCase();

  itemsContainer.innerHTML = "";
  items
    .filter((item) => item.name.toLowerCase().includes(query))
    .forEach((item) => {
      const card = document.createElement("div");
      card.className = "item-card";

      let imgUrl = "";
      if (item.imageBlob) imgUrl = URL.createObjectURL(item.imageBlob);

      card.innerHTML = `
        ${imgUrl ? `<img src="${imgUrl}" />` : ""}
        <h3>${item.name}</h3>
        <p>${item.note || ""}</p>
        <small>${item.date}</small>
        <div class="spacer"></div>
        <button data-id="${item.id}">Delete</button>
      `;

      card.querySelector("button").onclick = async () => {
        await deleteItemFromDB(item.id);
        await loadItems();
      };

      itemsContainer.appendChild(card);
    });
}


addBtn.onclick = () => modal.classList.remove("hidden");
closeModal.onclick = () => modal.classList.add("hidden");

searchInput.addEventListener("input", renderItems);

/* ✅ Save item (Blob-based) */
saveItem.onclick = async () => {
  const name = document.getElementById("itemName").value.trim();
  const note = document.getElementById("itemNote").value.trim();
  const fileInput = document.getElementById("itemImage");
  const file = fileInput.files[0];

  if (!name) return alert("Please enter a name");
  if (!file) return alert("Please add a photo");

  progressContainer.classList.remove("hidden");
  uploadProgress.value = 0;

  let fakeProgress = 0;
  const interval = setInterval(() => {
    fakeProgress += 10;
    if (fakeProgress > 90) fakeProgress = 90;
    uploadProgress.value = fakeProgress;
  }, 80);

  try {
    const newItem = {
      name,
      note,
      imageBlob: file,
      date: new Date().toLocaleString()
    };

    await addItemToDB(newItem);
    await loadItems();

    clearInterval(interval);
    uploadProgress.value = 100;

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
    alert("Error saving item.");
  }
};

/* ✅ Export */
exportBtn.onclick = async () => {
  const allItems = await getAllItems();

  const serializable = await Promise.all(
    allItems.map(
      (item) =>
        new Promise((resolve) => {
          if (!item.imageBlob) return resolve(item);

          const reader = new FileReader();
          reader.onloadend = () => {
            resolve({ ...item, imageBlob: reader.result });
          };
          reader.readAsDataURL(item.imageBlob);
        })
    )
  );

  const blob = new Blob([JSON.stringify(serializable)], {
    type: "application/json"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "find-my-stuff-backup.json";
  a.click();
  URL.revokeObjectURL(url);
};

/* ✅ Import */
importBtn.onclick = () => importInput.click();

importInput.onchange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async () => {
    let data = JSON.parse(reader.result);

    data = data.map((item) => {
      if (typeof item.imageBlob === "string") {
        item.imageBlob = dataUrlToBlob(item.imageBlob);
      }
      return item;
    });

    await clearAllItems();
    await bulkAddItems(data);
    await loadItems();
    alert("Import complete.");
  };

  reader.readAsText(file);
  importInput.value = "";
};

function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
  return new Blob([array], { type: mime });
}

loadItems();

/* ✅ Service worker registration (GitHub Pages path) */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/findmystuff/service-worker.js");
}
