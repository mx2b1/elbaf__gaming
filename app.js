// Elbaf Gaming - Main Application Logic (English Edition)
// Handles Catalog Rendering, Dynamic Search & Filtering, Cart State Sync, Specs Modals, and Bottom Navigation Dock.

let selectedCategory = "all";
let cart = JSON.parse(localStorage.getItem("elbaf_cart")) || [];

async function syncCartFromFirebase() {
  const currentUser = ElbafGetCurrentUser();

  if (!currentUser || window.useFirebaseMock) return;

  try {
    const doc = await window.firebaseDb
      .collection("carts")
      .doc(currentUser.userId)
      .get();

    if (doc.exists) {
      const data = doc.data();

      if (data.items) {
        cart = data.items;

        localStorage.setItem(
          "elbaf_cart",
          JSON.stringify(cart)
        );

        console.log("🛒 Cart loaded from Firebase");
      }
    }
  } catch (err) {
    console.error("Cart sync failed:", err);
  }
}

// --- 1. INITIALIZE PAGE ON LOAD ---
document.addEventListener("DOMContentLoaded", () => {
  // Sync user status on navbar and bottom dock
  syncNavbarUserStatus();
  
  // Render full game catalog
  filterAndRenderCatalog();
  
  // Render shopping cart contents
  renderCartDrawer();
  
  // Handle navbar shrink on scroll
  window.addEventListener("scroll", () => {
    const nav = document.querySelector("nav");
    if (nav) {
      if (window.scrollY > 20) {
        nav.classList.add("scrolled");
      } else {
        nav.classList.remove("scrolled");
      }
    }
  });
});

// --- 2. USER SESSION HEADER & BOTTOM DOCK SYNC ---
function syncNavbarUserStatus() {
  const currentUser = ElbafGetCurrentUser();
  
  const userNameText = document.getElementById("userNameText");
  const userAvatarText = document.getElementById("userAvatarText");
  const dropdownUsernameItem = document.getElementById("dropdownUsernameItem");
  const dropdownUsernameText = document.getElementById("dropdownUsernameText");
  const dropdownLoginItem = document.getElementById("dropdownLoginItem");
  const dropdownOrdersItem = document.getElementById("dropdownOrdersItem");
  const dropdownAdminItem = document.getElementById("dropdownAdminItem");
  const dropdownLogoutItem = document.getElementById("dropdownLogoutItem");
  
  const navOrdersLink = document.getElementById("navOrdersLink");
  const navAdminLink = document.getElementById("navAdminLink");

  // Bottom dock buttons
  const dockOrders = document.getElementById("dockOrders");
  const dockAdmin = document.getElementById("dockAdmin");

  if (currentUser) {
    // Logged in state
    if (userNameText) userNameText.innerText = currentUser.name;
    if (userAvatarText) userAvatarText.innerText = currentUser.name.charAt(0).toUpperCase();
    
    // Sync dropdown username option LTR
    if (dropdownUsernameItem) dropdownUsernameItem.style.display = "block";
    if (dropdownUsernameText) {
      const displayUsername = currentUser.username || currentUser.name.toLowerCase().replace(/\s+/g, '');
      dropdownUsernameText.innerHTML = `<i class="fa-solid fa-user-ninja" style="color: var(--gold-secondary); font-size: 0.75rem;"></i> @${displayUsername}`;
    }
    
    if (dropdownLoginItem) dropdownLoginItem.style.display = "none";
    if (dropdownOrdersItem) dropdownOrdersItem.style.display = "flex";
    if (dropdownLogoutItem) dropdownLogoutItem.style.display = "flex";
    
    if (navOrdersLink) navOrdersLink.style.display = "block";
    if (dockOrders) dockOrders.style.display = "flex";

    if (currentUser.isAdmin) {
      if (dropdownAdminItem) dropdownAdminItem.style.display = "flex";
      if (navAdminLink) navAdminLink.style.display = "block";
      if (dockAdmin) dockAdmin.style.display = "flex";
    } else {
      if (dropdownAdminItem) dropdownAdminItem.style.display = "none";
      if (navAdminLink) navAdminLink.style.display = "none";
      if (dockAdmin) dockAdmin.style.display = "none";
    }
  } else {
    // Logged out state
    if (userNameText) userNameText.innerText = "Account";
    if (userAvatarText) userAvatarText.innerText = "?";
    
    if (dropdownUsernameItem) dropdownUsernameItem.style.display = "none";
    if (dropdownLoginItem) dropdownLoginItem.style.display = "flex";
    if (dropdownOrdersItem) dropdownOrdersItem.style.display = "none";
    if (dropdownAdminItem) dropdownAdminItem.style.display = "none";
    if (dropdownLogoutItem) dropdownLogoutItem.style.display = "none";
    
    if (navOrdersLink) navOrdersLink.style.display = "none";
    if (navAdminLink) navAdminLink.style.display = "none";
    
    if (dockOrders) dockOrders.style.display = "none";
    if (dockAdmin) dockAdmin.style.display = "none";
  }
}

// User Profile dropdown menu toggle
function toggleUserDropdown() {
  document.getElementById("userDropdown").classList.toggle("active");
}

// Close Dropdown on click outside
window.addEventListener("click", (e) => {
  const dropdown = document.getElementById("userDropdown");
  const profileBtn = document.getElementById("userProfileBtn");
  if (dropdown && dropdown.classList.contains("active") && !profileBtn.contains(e.target)) {
    dropdown.classList.remove("active");
  }
});

// Trigger Logout action
function triggerLogout() {
  ElbafLogout().then(() => {
    showToast("Sign out successful. Hope to see you back soon!", "success");
    setTimeout(() => {
      window.location.href = "index.html";
    }, 1000);
  });
}

// =========================================================================
// ==================== DYNAMIC CATALOG OPERATIONS ========================
// =========================================================================

// Set active category filter
function setCategoryFilter(category, tabBtn) {
  selectedCategory = category;
  
  // Update UI active state on tabs
  const tabs = document.querySelectorAll(".filter-tab");
  tabs.forEach(t => t.classList.remove("active"));
  tabBtn.classList.add("active");
  
  // Re-render
  filterAndRenderCatalog();
}

// Search, Category and Sort computation
function filterAndRenderCatalog() {
  const searchInput = document.getElementById("catalogSearch");
  const sortSelect = document.getElementById("catalogSort");
  const grid = document.getElementById("gamesGrid");
  
  if (!grid) return; // safety if not on games.html

  const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : "";
  const sortVal = sortSelect ? sortSelect.value : "featured";

  // 1. Filtration
  let filteredGames = GAMES_DATA.filter(game => {
    const matchesSearch = game.name.toLowerCase().includes(searchQuery);
    const matchesCategory = selectedCategory === "all" || game.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // 2. Sorting
  if (sortVal === "price-low") {
    filteredGames.sort((a, b) => a.price - b.price);
  } else if (sortVal === "price-high") {
    filteredGames.sort((a, b) => b.price - a.price);
  } else if (sortVal === "name-az") {
    filteredGames.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortVal === "name-za") {
    filteredGames.sort((a, b) => b.name.localeCompare(a.name));
  } else if (sortVal === "rating") {
    filteredGames.sort((a, b) => b.rating - a.rating);
  }

  // 3. Render Cards
  grid.innerHTML = "";
  
  if (filteredGames.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;" class="glass-panel">
        <i class="fa-solid fa-gamepad" style="font-size: 3rem; color: var(--text-muted); opacity: 0.3; margin-bottom: 15px;"></i>
        <h3 style="font-size: 1.2rem;">No games match your query!</h3>
        <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 5px;">Try changing keywords or clearing the category tabs.</p>
      </div>
    `;
    const statsText = document.getElementById("catalogStatsText");
    if (statsText) statsText.innerText = "Showing 0 of 50 digital games";
    return;
  }

  filteredGames.forEach(game => {
    const isFree = game.price === 0;
    const priceText = isFree ? "FREE" : `$${game.price}`;
    const priceClass = isFree ? "card-price free" : "card-price";
    
    // Pick category label
    let categoryLabel = "Adventure";
    if (game.category === 'anime') categoryLabel = "Anime & Fight";
    if (game.category === 'sports') categoryLabel = "Sports & Racing";
    if (game.category === 'horror') categoryLabel = "Horror & Survival";
    if (game.category === 'packages') categoryLabel = "Prepaid Pack";
    if (game.category === 'action-rpg') categoryLabel = "Action & RPG";

    grid.innerHTML += `
      <div class="game-card glass-panel glass-panel-interactive">
        <div class="card-img-container">
          <img src="${game.image}" class="card-img" alt="${game.name}" loading="lazy">
          <span class="card-category-badge">${categoryLabel}</span>
        </div>
        <div class="card-body">
          <h3 class="card-title">${game.name}</h3>
          <p class="card-desc">${game.desc}</p>
          <div class="card-rating">
            <i class="fa-solid fa-star"></i>
            <span>${game.rating} (${(game.rating * 14).toFixed(0)} choices)</span>
          </div>
          <div class="card-price-row">
            <span class="${priceClass}">${priceText}</span>
            <div class="card-actions">
              <button class="btn btn-secondary" onclick="openGameDetailsById(${game.id})">Details</button>
              <button class="btn btn-primary" onclick="addGameToCartById(${game.id})"><i class="fa-solid fa-cart-shopping"></i></button>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  // Update counters
  const statsText = document.getElementById("catalogStatsText");
  if (statsText) statsText.innerText = `Showing ${filteredGames.length} of 50 premium digital games`;
}

// =========================================================================
// ======================= GAME DETAILS MODAL =============================
// =========================================================================

function openGameDetailsById(id) {
  const game = GAMES_DATA.find(g => g.id === id);
  if (!game) return;

  const modal = document.getElementById("detailsModal");
  if (!modal) return;
  
  // Fill text and values
  document.getElementById("modalGameTitle").innerText = game.name;
  
  let categoryLabel = "Action & RPG";
  if (game.category === 'anime') categoryLabel = "Anime & Fight";
  if (game.category === 'sports') categoryLabel = "Sports & Racing";
  if (game.category === 'horror') categoryLabel = "Horror & Survival";
  if (game.category === 'packages') categoryLabel = "Prepaid Voucher";
  
  document.getElementById("modalGameCategory").innerText = categoryLabel;
  document.getElementById("modalGamePlatform").innerText = game.platform;
  document.getElementById("modalGameRating").innerText = `★ ${game.rating}`;
  document.getElementById("modalGameDesc").innerText = game.desc;
  
  // System Specs
  document.getElementById("modalSpecCpu").innerText = game.cpu;
  document.getElementById("modalSpecRam").innerText = game.ram;
  document.getElementById("modalSpecGpu").innerText = game.gpu;
  document.getElementById("modalSpecStorage").innerText = game.storage;
  document.getElementById("modalSpecEsrb").innerText = game.esrb;
  
  document.getElementById("modalGamePrice").innerText = game.price === 0 ? "FREE" : `$${game.price}`;
  
  document.getElementById("modalBannerImg").src = game.image;

  // Add Buy button handler inside modal
  const addBtn = document.getElementById("modalAddCartBtn");
  addBtn.onclick = () => {
    addGameToCartById(game.id);
    closeDetailsModalDirect();
  };

  // Generate dynamic gaming user reviews
  const reviewNames = ["NeonWarlord", "ShadowGamer", "CyberShinobi", "LuffySama", "PixelHunter"];
  const reviewTexts = [
    "Phenomenal visuals and immersive game loop! Absolutely worth every dollar.",
    "Extremely addictive gameplay. Runs extremely stable on high configurations.",
    "Elbaf is the best! The activation key arrived instantly in my vault page and activated on Steam.",
    "Stunning storytelling, cinematic soundtracks and beautiful character models.",
    "A masterpiece. Smooth inputs, zero glitches, and direct key activation."
  ];

  const reviewsContainer = document.getElementById("modalPlayerReviews");
  reviewsContainer.innerHTML = "";
  for (let i = 0; i < 2; i++) {
    const idxName = Math.floor(Math.random() * reviewNames.length);
    const idxText = Math.floor(Math.random() * reviewTexts.length);
    reviewsContainer.innerHTML += `
      <div class="modal-review-item">
        <div class="review-header">
          <span class="review-username">@${reviewNames[idxName]}</span>
          <span class="review-badge"><i class="fa-solid fa-circle-check"></i> Verified Gamer</span>
        </div>
        <p class="review-text">"${reviewTexts[idxText]}"</p>
      </div>
    `;
  }

  modal.classList.add("active");
}

function closeDetailsModal(event) {
  if (event.target.id === "detailsModal") {
    closeDetailsModalDirect();
  }
}

function closeDetailsModalDirect() {
  const modal = document.getElementById("detailsModal");
  if (modal) modal.classList.remove("active");
}

// =========================================================================
// ==================== SHOPPING CART STATE SYNC =========================
// =========================================================================

// Add Item
function addGameToCartById(id) {
  const game = GAMES_DATA.find(g => g.id === id);
  if (!game) return;

  const existingItem = cart.find(item => item.id === id);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: game.id,
      name: game.name,
      price: game.price,
      quantity: 1,
      image: game.image
    });
  }

  saveCartState();
  renderCartDrawer();
  showToast(`Added ${game.name} to Shopping Vault! 🚀`, "success");
}

// Modify quantities
function updateCartQuantity(id, change) {
  const item = cart.find(it => it.id === id);
  if (!item) return;

  item.quantity += change;
  if (item.quantity <= 0) {
    cart = cart.filter(it => it.id !== id);
  }

  saveCartState();
  renderCartDrawer();
}

// Remove Item from cart
function removeFromCart(id) {
  cart = cart.filter(it => it.id !== id);
  saveCartState();
  renderCartDrawer();
  showToast("Item removed from cart.", "info");
}

// Sync cart data to localStorage
function saveCartState() {
  localStorage.setItem("elbaf_cart", JSON.stringify(cart));

  const currentUser = ElbafGetCurrentUser();

  if (!currentUser || window.useFirebaseMock) return;

  window.firebaseDb.collection("carts")
    .doc(currentUser.userId)
    .set({
      userId: currentUser.userId,
      email: currentUser.email,
      items: cart,
      updatedAt: new Date().toISOString()
    })
    .then(() => {
      console.log("🛒 Cart saved to Firebase");
    })
    .catch(err => {
      console.error("Cart save failed:", err);
    });
}

// Render dynamic cart counters
function renderCartDrawer() {
  const totalCounter = document.getElementById("cartCounter");
  const dockCartCounter = document.getElementById("dockCartCounter");
  
  let totalQty = 0;
  cart.forEach(item => {
    totalQty += item.quantity;
  });

  if (totalCounter) totalCounter.innerText = totalQty;
  if (dockCartCounter) dockCartCounter.innerText = totalQty;
}

// Toast Notification Engine
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  let icon = "fa-circle-check";
  if (type === "error") icon = "fa-circle-exclamation";
  if (type === "info") icon = "fa-circle-info";
  
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  
  // Transition out and destroy
  setTimeout(() => {
    toast.style.animation = "toast-slide-ltr 0.3s ease reverse";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}

syncCartFromFirebase();