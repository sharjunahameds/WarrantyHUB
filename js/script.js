/**
 * WarrantyHUB - Core JavaScript Utility & Page Logic
 * Built with Vanilla JavaScript
 */

// --- GLOBAL CONSTANTS & DEFAULTS ---
const API_URL = "http://localhost:5000";
let token = localStorage.getItem("token");

const USER_KEY = 'warrantyhub_user';
const PRODUCTS_KEY = 'warrantyhub_products';
const SETTINGS_KEY = 'warrantyhub_settings';

const DEFAULT_USER = {
  name: 'Alex Mercer',
  email: 'alex.mercer@warrantyhub.io',
  joinedDate: '2026-01-15'
};

const DEFAULT_SETTINGS = {
  enableReminders: true,
  reminder7: true,
  reminder15: true,
  reminder30: false
};

// --- INITIALIZE STORAGE DATA ---
function initStorage() {
  if (!localStorage.getItem(SETTINGS_KEY)) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
  }
}

// Initialize on script load
initStorage();

// --- DATE CALCULATIONS HELPERS ---

/**
 * Calculates the expiry date based on purchase date and duration.
 * @param {string} purchaseDateStr - Format YYYY-MM-DD
 * @param {number} durationMonths 
 * @returns {Date}
 */
function calculateExpiryDate(purchaseDateStr, durationMonths) {
  const purchaseDate = new Date(purchaseDateStr);
  if (isNaN(purchaseDate.getTime())) return null;
  
  const expiryDate = new Date(purchaseDate);
  expiryDate.setMonth(purchaseDate.getMonth() + parseInt(durationMonths));
  return expiryDate;
}

/**
 * Returns details about warranty status and remaining time.
 * @param {string} purchaseDateStr 
 * @param {number} durationMonths 
 */
function getWarrantyStatusInfo(purchaseDateStr, durationMonths) {
  const expiryDate = calculateExpiryDate(purchaseDateStr, durationMonths);
  if (!expiryDate) {
    return { status: 'Expired', daysLeft: 0, formattedExpiry: 'N/A' };
  }

  const today = new Date();
  // Clear time components for pure day comparison
  today.setHours(0, 0, 0, 0);
  const expiryDateMidnight = new Date(expiryDate);
  expiryDateMidnight.setHours(0, 0, 0, 0);

  const msPerDay = 1000 * 60 * 60 * 24;
  const timeDiff = expiryDateMidnight.getTime() - today.getTime();
  const daysLeft = Math.ceil(timeDiff / msPerDay);

  let status = 'Active';
  if (daysLeft < 0) {
    status = 'Expired';
  } else if (daysLeft <= 30) {
    status = 'Expiring Soon';
  }

  return {
    status: status,
    daysLeft: daysLeft,
    expiryDate: expiryDate,
    formattedExpiry: expiryDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }),
    formattedPurchase: new Date(purchaseDateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  };
}

// --- AUTHENTICATION & ROUTING ---

function getLoggedInUser() {
  return JSON.parse(localStorage.getItem(USER_KEY));
}

function checkAuthentication() {
  const user = getLoggedInUser();
  const path = window.location.pathname;
  const page = path.substring(path.lastIndexOf('/') + 1);

  // Private routes
  const privatePages = ['dashboard.html', 'products.html', 'profile.html'];
  
  if (privatePages.includes(page) && !user) {
    window.location.href = 'login.html';
  }

  // Public authentication routes (prevent re-entering if logged in)
  if ((page === 'login.html' || page === 'register.html') && user) {
    window.location.href = 'dashboard.html';
  }
}

function logout() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem("token");
  window.location.href = 'index.html';
}

// Render dynamic user menu in Header
function renderHeaderUserMenu() {
  const user = getLoggedInUser();
  const navActions = document.getElementById('nav-actions');
  const navLinks = document.getElementById('nav-links');
  
  if (!navActions) return;

  if (user) {
    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    navActions.innerHTML = `
      <div class="user-menu" id="user-menu-trigger">
        <div class="user-avatar">${initials}</div>
        <span class="user-name">${user.name}</span>
        <i class="fa-solid fa-chevron-down" style="font-size: 0.8rem; color: hsla(217, 19%, 70%, 0.6)"></i>
      </div>
    `;

    // Dropdown trigger or navigation list enhancements
    const userMenuTrigger = document.getElementById('user-menu-trigger');
    if (userMenuTrigger) {
      userMenuTrigger.addEventListener('click', () => {
        window.location.href = 'profile.html';
      });
    }

    // Insert Logged in links in nav-links if they aren't already there
    if (navLinks && !navLinks.querySelector('[data-private]')) {
      navLinks.innerHTML = `
        <li><a href="dashboard.html" class="${isActivePage('dashboard.html')}" data-private>Dashboard</a></li>
        <li><a href="products.html" class="${isActivePage('products.html')}" data-private>Products</a></li>
        <li><a href="profile.html" class="${isActivePage('profile.html')}" data-private>Settings</a></li>
        <li><a href="#" id="logout-btn" style="color: hsl(350, 89%, 60%)">Sign Out</a></li>
      `;

      document.getElementById('logout-btn').addEventListener('click', (e) => {
        e.preventDefault();
        logout();
      });
    }
  } else {
    // Guest layout
    navActions.innerHTML = `
      <a href="login.html" class="btn btn-secondary">Sign In</a>
      <a href="register.html" class="btn btn-primary">Get Started</a>
    `;
    if (navLinks) {
      navLinks.innerHTML = `
        <li><a href="index.html#features">Features</a></li>
        <li><a href="index.html#how-it-works">How It Works</a></li>
        <li><a href="index.html#testimonials">Reviews</a></li>
      `;
    }
  }
}

function isActivePage(pageName) {
  const path = window.location.pathname;
  return path.endsWith(pageName) ? 'active' : '';
}

// Hamburger menu toggle for mobile
function initMobileNavigation() {
  const toggle = document.querySelector('.mobile-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
      const icon = toggle.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-xmark');
      }
    });
  }
}

// --- TOAST NOTIFICATIONS ---
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let iconClass = 'fa-circle-check';
  if (type === 'danger') iconClass = 'fa-circle-exclamation';
  if (type === 'warning') iconClass = 'fa-triangle-exclamation';

  toast.innerHTML = `
    <i class="fa-solid ${iconClass}"></i>
    <div>${message}</div>
  `;

  container.appendChild(toast);
  
  // Trigger animation frame for transition
  requestAnimationFrame(() => {
    toast.classList.add('active');
  });

  // Remove toast after duration
  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}

// --- DATA LOGIC: PRODUCTS MANAGEMENT ---

let cachedProducts = [];

async function loadProductsFromServer() {
  const token = localStorage.getItem("token");
  if (!token) {
    cachedProducts = [];
    return;
  }
  try {
    const res = await fetch(`${API_URL}/products`, {
      headers: {
        "authorization": token
      }
    });
    const data = await res.json();
    if (data && (data.message === "No token provided" || data.message === "Invalid token")) {
      logout();
      cachedProducts = [];
      return;
    }
    if (Array.isArray(data)) {
      cachedProducts = data.map(p => ({
        id: p.id,
        name: p.product_name,
        brand: p.brand || '',
        category: p.category || 'Others',
        purchaseDate: p.purchase_date ? p.purchase_date.split('T')[0] : '',
        duration: p.warranty_months || 0,
        price: p.price ? parseFloat(p.price) : 0,
        notes: p.notes || ''
      }));
    } else {
      cachedProducts = [];
    }
  } catch (err) {
    console.error("Error fetching products:", err);
    cachedProducts = [];
  }
}

function getProducts() {
  return cachedProducts;
}

function saveProducts(products) {
  // No-op since we use backend database
}

async function addProduct(product) {
  const token = localStorage.getItem("token");
  if (!token) return null;
  
  const expiryDate = calculateExpiryDate(product.purchaseDate, product.duration);
  const expiryDateStr = expiryDate ? expiryDate.toISOString().split('T')[0] : null;

  try {
    const res = await fetch(`${API_URL}/add-product`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "authorization": token
      },
      body: JSON.stringify({
        product_name: product.name,
        brand: product.brand,
        category: product.category,
        purchase_date: product.purchaseDate,
        warranty_months: product.duration,
        expiry_date: expiryDateStr,
        price: product.price,
        notes: product.notes
      })
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Error adding product:", err);
    return null;
  }
}

async function updateProduct(product) {
  const token = localStorage.getItem("token");
  if (!token) return false;
  
  const expiryDate = calculateExpiryDate(product.purchaseDate, product.duration);
  const expiryDateStr = expiryDate ? expiryDate.toISOString().split('T')[0] : null;

  try {
    const res = await fetch(`${API_URL}/update-product/${product.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "authorization": token
      },
      body: JSON.stringify({
        product_name: product.name,
        brand: product.brand,
        category: product.category,
        purchase_date: product.purchaseDate,
        warranty_months: product.duration,
        expiry_date: expiryDateStr,
        price: product.price,
        notes: product.notes
      })
    });
    await res.json();
    return true;
  } catch (err) {
    console.error("Error updating product:", err);
    return false;
  }
}

async function deleteProduct(id) {
  const token = localStorage.getItem("token");
  if (!token) return false;

  try {
    const res = await fetch(`${API_URL}/delete-product/${id}`, {
      method: "DELETE",
      headers: {
        "authorization": token
      }
    });
    await res.json();
    return true;
  } catch (err) {
    console.error("Error deleting product:", err);
    return false;
  }
}

// --- PAGE: USER AUTHENTICATION LOGIC ---

function handleRegistration() {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const nameInput = document.getElementById('fullname');
    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirm-password');

    let isValid = true;

    // Basic Validation
    if (!nameInput.value.trim()) {
      showInputError(nameInput, 'Full name is required');
      isValid = false;
    } else {
      clearInputError(nameInput);
    }

    if (!emailInput.value.trim() || !validateEmailFormat(emailInput.value)) {
      showInputError(emailInput, 'Enter a valid email address');
      isValid = false;
    } else {
      clearInputError(emailInput);
    }

    if (passInput.value.length < 6) {
      showInputError(passInput, 'Password must be at least 6 characters');
      isValid = false;
    } else {
      clearInputError(passInput);
    }

    if (passInput.value !== confirmInput.value) {
      showInputError(confirmInput, 'Passwords do not match');
      isValid = false;
    } else {
      clearInputError(confirmInput);
    }

    if (isValid) {
      fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: nameInput.value.trim(),
          email: emailInput.value.trim().toLowerCase(),
          password: passInput.value
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.message === "Registered Successfully") {
          showToast('Registration successful! Redirecting to Login...', 'success');
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 1500);
        } else {
          showToast(data.message || 'Registration failed', 'danger');
        }
      })
      .catch(err => {
        console.error(err);
        showToast('Server connection error', 'danger');
      });
    }
  });
}

function handleLogin() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');

    let isValid = true;

    if (!emailInput.value.trim() || !validateEmailFormat(emailInput.value)) {
      showInputError(emailInput, 'Enter a valid email address');
      isValid = false;
    } else {
      clearInputError(emailInput);
    }

    if (!passInput.value.trim()) {
      showInputError(passInput, 'Password is required');
      isValid = false;
    } else {
      clearInputError(passInput);
    }

    if (isValid) {
      fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: emailInput.value.trim().toLowerCase(),
          password: passInput.value
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          localStorage.setItem("token", data.token);
          const user = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            joinedDate: data.user.created_at ? data.user.created_at.split('T')[0] : new Date().toISOString().split('T')[0]
          };
          localStorage.setItem(USER_KEY, JSON.stringify(user));
          showToast('Welcome back! Logging you in...', 'success');
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 1500);
        } else {
          showToast(data.message || 'Invalid Credentials', 'danger');
        }
      })
      .catch(err => {
        console.error(err);
        showToast('Server connection error', 'danger');
      });
    }
  });
}

function showInputError(input, message) {
  input.classList.add('error');
  const helper = input.parentElement.querySelector('.form-helper');
  if (helper) {
    helper.textContent = message;
    helper.style.display = 'block';
  }
}

function clearInputError(input) {
  input.classList.remove('error');
  const helper = input.parentElement.querySelector('.form-helper');
  if (helper) {
    helper.style.display = 'none';
  }
}

function validateEmailFormat(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// --- PAGE: DASHBOARD LOGIC ---

function initDashboard() {
  const totalCards = document.getElementById('stat-total');
  const activeCards = document.getElementById('stat-active');
  const expiringCards = document.getElementById('stat-expiring');
  const expiredCards = document.getElementById('stat-expired');
  const recentProductsList = document.getElementById('recent-products-list');

  if (!totalCards) return; // Not on dashboard page

  const products = getProducts();
  let activeCount = 0;
  let expiringCount = 0;
  let expiredCount = 0;

  products.forEach(p => {
    const { status } = getWarrantyStatusInfo(p.purchaseDate, p.duration);
    if (status === 'Active') activeCount++;
    else if (status === 'Expiring Soon') expiringCount++;
    else if (status === 'Expired') expiredCount++;
  });

  // Animate/Set counts
  totalCards.textContent = products.length;
  activeCards.textContent = activeCount;
  expiringCards.textContent = expiringCount;
  expiredCards.textContent = expiredCount;

  // Render recent 3 products
  if (recentProductsList) {
    if (products.length === 0) {
      recentProductsList.innerHTML = `
        <div class="glass-card empty-state">
          <i class="fa-solid fa-box-open"></i>
          <p>No products added yet.</p>
          <a href="products.html?action=add" class="btn btn-primary" style="margin-top: 1rem;">Add Your First Product</a>
        </div>
      `;
    } else {
      const recent = products.slice(0, 3);
      recentProductsList.innerHTML = '';
      
      recent.forEach(p => {
        const { status, daysLeft, formattedExpiry } = getWarrantyStatusInfo(p.purchaseDate, p.duration);
        let statusBadgeClass = 'badge-active';
        let countdownText = `${daysLeft} days remaining`;
        let countdownClass = 'active';

        if (status === 'Expiring Soon') {
          statusBadgeClass = 'badge-expiring';
          countdownText = `${daysLeft} days left!`;
          countdownClass = 'expiring';
        } else if (status === 'Expired') {
          statusBadgeClass = 'badge-expired';
          countdownText = `Expired`;
          countdownClass = 'expired';
        }

        const priceFormatted = parseFloat(p.price) ? `$${parseFloat(p.price).toFixed(2)}` : 'N/A';

        const card = document.createElement('div');
        card.className = 'glass-card product-card';
        card.style.flexDirection = 'row';
        card.style.alignItems = 'center';
        card.style.justifyContent = 'space-between';
        card.style.padding = '1.25rem';
        
        card.innerHTML = `
          <div style="display:flex; align-items:center; gap: 1rem;">
            <div class="feature-icon-wrapper" style="width: 2.75rem; height: 2.75rem; margin-bottom: 0;">
              <i class="fa-solid ${p.category === 'Electronics' ? 'fa-laptop' : p.category === 'Appliances' ? 'fa-kitchen-set' : p.category === 'Audio' ? 'fa-headphones' : 'fa-box'}"></i>
            </div>
            <div>
              <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.15rem;">${escapeHtml(p.name)}</h4>
              <p style="font-size: 0.8rem; font-weight: 500;">${escapeHtml(p.brand)} • Expiry: ${formattedExpiry}</p>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap: 1.25rem;">
            <span class="badge ${statusBadgeClass}">${status}</span>
            <span class="days-left-count ${countdownClass}" style="font-size: 0.8rem; min-width: 100px; text-align: right;">${countdownText}</span>
          </div>
        `;
        recentProductsList.appendChild(card);
      });
    }
  }
}

// --- PAGE: PRODUCTS LISTING & CRUD LOGIC ---

let currentFilter = 'All';
let currentSearch = '';

function initProductsPage() {
  const productsGrid = document.getElementById('products-grid');
  if (!productsGrid) return; // Not on products page

  // Check URL params to open form automatically (Redirect from Dashboard Quick Actions)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('action') === 'add') {
    // Clear URL parameters so reloading doesn't re-trigger
    window.history.replaceState({}, document.title, window.location.pathname);
    openProductModal();
  }

  // Setup Form Live Expiry Calculation
  const purchaseDateInput = document.getElementById('prod-purchase-date');
  const durationInput = document.getElementById('prod-duration');
  
  if (purchaseDateInput && durationInput) {
    const updatePreview = () => {
      const pDate = purchaseDateInput.value;
      const dur = durationInput.value;
      const previewDiv = document.getElementById('expiry-preview-banner');
      if (pDate && dur && dur > 0) {
        const info = getWarrantyStatusInfo(pDate, dur);
        if (info && info.expiryDate) {
          previewDiv.innerHTML = `Expiry Date: <span class="val">${info.formattedExpiry}</span> (${info.daysLeft < 0 ? 'Expired' : info.daysLeft + ' days left'})`;
          previewDiv.style.display = 'flex';
          return;
        }
      }
      previewDiv.style.display = 'none';
    };

    purchaseDateInput.addEventListener('change', updatePreview);
    durationInput.addEventListener('input', updatePreview);
  }

  // Set default purchase date to today
  if (purchaseDateInput && !purchaseDateInput.value) {
    purchaseDateInput.value = new Date().toISOString().split('T')[0];
  }

  // Wire up Search Box
  const searchBox = document.getElementById('search-box');
  if (searchBox) {
    searchBox.addEventListener('keyup', (e) => {
      currentSearch = e.target.value.toLowerCase().trim();
      renderProductsGrid();
    });
  }

  // Wire up Filter Tabs
  const filterTabs = document.querySelectorAll('.filter-tab');
  filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      filterTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      renderProductsGrid();
    });
  });

  // Wire up Add Form submit
  const form = document.getElementById('product-form');
  if (form) {
    form.addEventListener('submit', handleProductFormSubmit);
  }

  // Render initial list
  renderProductsGrid();
}

function openProductModal(editingProduct = null) {
  const modal = document.getElementById('product-modal');
  const form = document.getElementById('product-form');
  const modalTitle = document.getElementById('modal-title');
  const editIdInput = document.getElementById('prod-edit-id');
  const previewDiv = document.getElementById('expiry-preview-banner');

  if (!modal || !form) return;

  // Clear errors
  form.querySelectorAll('.input-control').forEach(input => clearInputError(input));

  if (editingProduct) {
    modalTitle.textContent = 'Edit Product';
    editIdInput.value = editingProduct.id;
    document.getElementById('prod-name').value = editingProduct.name;
    document.getElementById('prod-brand').value = editingProduct.brand;
    document.getElementById('prod-category').value = editingProduct.category;
    document.getElementById('prod-purchase-date').value = editingProduct.purchaseDate;
    document.getElementById('prod-duration').value = editingProduct.duration;
    document.getElementById('prod-price').value = editingProduct.price || '';
    document.getElementById('prod-notes').value = editingProduct.notes || '';
    
    // Trigger expiry preview calculate
    const info = getWarrantyStatusInfo(editingProduct.purchaseDate, editingProduct.duration);
    if (info && info.expiryDate) {
      previewDiv.innerHTML = `Expiry Date: <span class="val">${info.formattedExpiry}</span> (${info.daysLeft < 0 ? 'Expired' : info.daysLeft + ' days left'})`;
      previewDiv.style.display = 'flex';
    }
  } else {
    modalTitle.textContent = 'Add Product';
    editIdInput.value = '';
    form.reset();
    document.getElementById('prod-purchase-date').value = new Date().toISOString().split('T')[0];
    previewDiv.style.display = 'none';
  }

  modal.classList.add('active');
}

function closeProductModal() {
  const modal = document.getElementById('product-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

async function handleProductFormSubmit(e) {
  e.preventDefault();

  const editId = document.getElementById('prod-edit-id').value;
  const nameInput = document.getElementById('prod-name');
  const brandInput = document.getElementById('prod-brand');
  const categoryInput = document.getElementById('prod-category');
  const purchaseDateInput = document.getElementById('prod-purchase-date');
  const durationInput = document.getElementById('prod-duration');
  const priceInput = document.getElementById('prod-price');
  const notesInput = document.getElementById('prod-notes');

  let isValid = true;

  if (!nameInput.value.trim()) {
    showInputError(nameInput, 'Product name is required');
    isValid = false;
  } else {
    clearInputError(nameInput);
  }

  if (!brandInput.value.trim()) {
    showInputError(brandInput, 'Brand is required');
    isValid = false;
  } else {
    clearInputError(brandInput);
  }

  if (!purchaseDateInput.value) {
    showInputError(purchaseDateInput, 'Purchase date is required');
    isValid = false;
  } else {
    clearInputError(purchaseDateInput);
  }

  const durationVal = parseInt(durationInput.value);
  if (isNaN(durationVal) || durationVal <= 0) {
    showInputError(durationInput, 'Enter a valid warranty duration in months');
    isValid = false;
  } else {
    clearInputError(durationInput);
  }

  if (isValid) {
    const productData = {
      name: nameInput.value.trim(),
      brand: brandInput.value.trim(),
      category: categoryInput.value,
      purchaseDate: purchaseDateInput.value,
      duration: durationVal,
      price: parseFloat(priceInput.value) || 0,
      notes: notesInput.value.trim()
    };

    if (editId) {
      productData.id = editId;
      const success = await updateProduct(productData);
      if (success) {
        showToast('Product updated successfully!', 'success');
      } else {
        showToast('Failed to update product', 'danger');
      }
    } else {
      const added = await addProduct(productData);
      if (added) {
        showToast('Product added successfully!', 'success');
      } else {
        showToast('Failed to add product', 'danger');
      }
    }

    closeProductModal();
    await loadProductsFromServer();
    renderProductsGrid();
  }
}

function renderProductsGrid() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  const products = getProducts();
  
  // Filter products
  const filtered = products.filter(p => {
    // Search match
    const searchMatch = p.name.toLowerCase().includes(currentSearch) || 
                        p.brand.toLowerCase().includes(currentSearch);
    
    if (!searchMatch) return false;

    // Category status filter
    if (currentFilter === 'All') return true;
    
    const { status } = getWarrantyStatusInfo(p.purchaseDate, p.duration);
    return status === currentFilter;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="glass-card empty-state" style="grid-column: 1 / -1;">
        <i class="fa-solid fa-box-open"></i>
        <h3>No products found</h3>
        <p style="margin-top: 0.5rem;">Try adjusting your search filters or add a new product.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = '';

  filtered.forEach(p => {
    const { status, daysLeft, formattedExpiry, formattedPurchase } = getWarrantyStatusInfo(p.purchaseDate, p.duration);
    let cardClass = 'active';
    let badgeClass = 'badge-active';
    let countdownText = `${daysLeft} days left`;
    let countClass = 'active';

    if (status === 'Expiring Soon') {
      cardClass = 'expiring';
      badgeClass = 'badge-expiring';
      countdownText = `${daysLeft} days left!`;
      countClass = 'expiring';
    } else if (status === 'Expired') {
      cardClass = 'expired';
      badgeClass = 'badge-expired';
      countdownText = `Expired`;
      countClass = 'expired';
    }

    const priceText = p.price ? `$${parseFloat(p.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'N/A';

    const card = document.createElement('div');
    card.className = `glass-card product-card ${cardClass}`;
    
    card.innerHTML = `
      <div class="product-card-header">
        <div class="product-title-brand">
          <h4>${escapeHtml(p.name)}</h4>
          <span>${escapeHtml(p.brand)}</span>
        </div>
        <span class="badge ${badgeClass}">${status}</span>
      </div>
      
      <div class="product-meta-list">
        <div class="product-meta-item">
          <span class="label">Category</span>
          <span class="value">${escapeHtml(p.category)}</span>
        </div>
        <div class="product-meta-item">
          <span class="label">Purchase Date</span>
          <span class="value">${formattedPurchase}</span>
        </div>
        <div class="product-meta-item">
          <span class="label">Warranty Duration</span>
          <span class="value">${p.duration} Mos</span>
        </div>
        <div class="product-meta-item">
          <span class="label">Expiry Date</span>
          <span class="value" style="font-weight: 700;">${formattedExpiry}</span>
        </div>
        <div class="product-meta-item">
          <span class="label">Price Paid</span>
          <span class="value">${priceText}</span>
        </div>
      </div>

      ${p.notes ? `<div class="product-notes" title="${escapeHtml(p.notes)}">${escapeHtml(p.notes)}</div>` : ''}

      <div class="product-card-footer">
        <span class="days-left-count ${countClass}">${countdownText}</span>
        <div class="product-card-actions">
          <button class="btn-action edit" onclick="editProductAction('${p.id}')" title="Edit Product">
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn-action delete" onclick="deleteProductAction('${p.id}')" title="Delete Product">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `;

    grid.appendChild(card);
  });
}

// Global hook handlers for inline buttons in generated cards
window.editProductAction = function(id) {
  const products = getProducts();
  const prod = products.find(p => p.id == id);
  if (prod) {
    openProductModal(prod);
  }
};

window.deleteProductAction = async function(id) {
  const products = getProducts();
  const prod = products.find(p => p.id == id);
  if (prod) {
    if (confirm(`Are you sure you want to delete the warranty record for "${prod.name}"?`)) {
      await deleteProduct(id);
      showToast('Product deleted.', 'warning');
      await loadProductsFromServer();
      renderProductsGrid();
    }
  }
};

// --- PAGE: PROFILE & SETTINGS ---

function initProfilePage() {
  const emailSettingsForm = document.getElementById('email-settings-form');
  const profileDetailsForm = document.getElementById('profile-details-form');
  
  if (!emailSettingsForm && !profileDetailsForm) return; // Not on profile settings page

  // Load and show user info
  const user = getLoggedInUser() || DEFAULT_USER;
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  // Set Profile Left Card Info
  const userDispName = document.getElementById('user-display-name');
  const userDispEmail = document.getElementById('user-display-email');
  const userDispJoined = document.getElementById('user-display-joined');
  const userDispAvatar = document.getElementById('user-display-avatar');

  if (userDispName) userDispName.textContent = user.name;
  if (userDispEmail) userDispEmail.textContent = user.email;
  if (userDispJoined) userDispJoined.textContent = new Date(user.joinedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  if (userDispAvatar) userDispAvatar.textContent = initials;

  // Populate Edit Fields
  const editNameInput = document.getElementById('profile-name');
  const editEmailInput = document.getElementById('profile-email');
  
  if (editNameInput) editNameInput.value = user.name;
  if (editEmailInput) editEmailInput.value = user.email;

    // Handle Details Form Submit
  if (profileDetailsForm) {
    profileDetailsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      let isValid = true;
      if (!editNameInput.value.trim()) {
        showInputError(editNameInput, 'Name is required');
        isValid = false;
      } else {
        clearInputError(editNameInput);
      }

      if (!editEmailInput.value.trim() || !validateEmailFormat(editEmailInput.value)) {
        showInputError(editEmailInput, 'Enter a valid email');
        isValid = false;
      } else {
        clearInputError(editEmailInput);
      }

      if (isValid) {
        const token = localStorage.getItem("token");
        fetch(`${API_URL}/update-profile`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "authorization": token
          },
          body: JSON.stringify({
            name: editNameInput.value.trim(),
            email: editEmailInput.value.trim().toLowerCase()
          })
        })
        .then(res => res.json())
        .then(data => {
          if (data.message === "Profile Updated") {
            const updatedUser = {
              id: user.id,
              name: editNameInput.value.trim(),
              email: editEmailInput.value.trim().toLowerCase(),
              joinedDate: user.joinedDate
            };
            localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
            
            // Update header navbar menu & profile page elements
            renderHeaderUserMenu();
            if (userDispName) userDispName.textContent = updatedUser.name;
            if (userDispEmail) userDispEmail.textContent = updatedUser.email;
            if (userDispAvatar) {
              userDispAvatar.textContent = updatedUser.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            }

            showToast('Profile details updated successfully!', 'success');
          } else {
            showToast(data.message || 'Failed to update profile', 'danger');
          }
        })
        .catch(err => {
          console.error(err);
          showToast('Server connection error', 'danger');
        });
      }
    });
  }

  // Load and populate Settings
  const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY)) || DEFAULT_SETTINGS;
  const toggleReminders = document.getElementById('enable-reminders');
  const check7 = document.getElementById('reminder-7');
  const check15 = document.getElementById('reminder-15');
  const check30 = document.getElementById('reminder-30');

  if (toggleReminders) {
    toggleReminders.checked = settings.enableReminders;
    check7.checked = settings.reminder7;
    check15.checked = settings.reminder15;
    check30.checked = settings.reminder30;

    // Toggle disable status of checkboxes based on master toggle
    const toggleSubCheckboxState = () => {
      const checked = toggleReminders.checked;
      check7.disabled = !checked;
      check15.disabled = !checked;
      check30.disabled = !checked;
    };
    
    toggleSubCheckboxState();
    toggleReminders.addEventListener('change', toggleSubCheckboxState);
  }

  if (emailSettingsForm) {
    emailSettingsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const newSettings = {
        enableReminders: toggleReminders.checked,
        reminder7: check7.checked,
        reminder15: check15.checked,
        reminder30: check30.checked
      };

      localStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      showToast('Notification settings saved!', 'success');
    });
  }
}

// --- UTILS: SANITIZER FOR RENDERING DYNAMIC DATA SAFETY ---
function escapeHtml(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- LIFECYCLE MANAGEMENT ---
document.addEventListener('DOMContentLoaded', async () => {
  // Check auth first to redirect unauthorized users
  checkAuthentication();

  // Load products from server before executing page-specific logic
  await loadProductsFromServer();

  renderHeaderUserMenu();
  initMobileNavigation();

  // Initialize Page-Specific Elements
  initDashboard();
  initProductsPage();
  initProfilePage();
  handleRegistration();
  handleLogin();

  // Wire up Global Add Product triggers on products page
  const addTrigger = document.getElementById('btn-add-product-modal-trigger');
  if (addTrigger) {
    addTrigger.addEventListener('click', () => openProductModal());
  }

  const cancelTrigger = document.getElementById('btn-cancel-modal');
  if (cancelTrigger) {
    cancelTrigger.addEventListener('click', () => closeProductModal());
  }
});  