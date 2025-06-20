import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// Types
interface Product {
    id: string;
    name: string;
    price: number;
    image: string;
    description: string;
    category: string;
}

interface CartItem extends Product {
    quantity: number;
}

interface User {
    id: string;
    email: string;
    name: string;
    picture?: string;
}

// State
let currentUser: User | null = null;
let cart: CartItem[] = [];

// Sample Products Data
const products: Product[] = [
    // Mutfak Muslukları
    {
        id: 'k1',
        name: 'Modern Mutfak Musluğu',
        price: 199.99,
        image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        description: 'Çağdaş tek kollu mutfak musluğu, çekilebilir duş başlığı ile',
        category: 'kitchen'
    },
    {
        id: 'k2',
        name: 'Endüstriyel Mutfak Musluğu',
        price: 299.99,
        image: 'https://images.unsplash.com/photo-1584622781860-6d1a0d0c9c0c?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        description: 'Profesyonel mutfaklar için yüksek basınçlı musluk',
        category: 'kitchen'
    },
    {
        id: 'k3',
        name: 'Köşe Mutfak Musluğu',
        price: 249.99,
        image: 'https://images.unsplash.com/photo-1584622781860-6d1a0d0c9c0d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        description: 'Köşe lavabolar için özel tasarlanmış musluk',
        category: 'kitchen'
    },

    // Banyo Muslukları
    {
        id: 'b1',
        name: 'Klasik Banyo Musluğu',
        price: 149.99,
        image: 'https://images.unsplash.com/photo-1584622781860-6d1a0d0c9c0a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        description: 'Seramik diskli vanalara sahip geleneksel çift kollu banyo musluğu',
        category: 'bathroom'
    },
    {
        id: 'b2',
        name: 'Modern Banyo Musluğu',
        price: 179.99,
        image: 'https://images.unsplash.com/photo-1584622781860-6d1a0d0c9c0e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        description: 'Tek kollu, LED aydınlatmalı modern banyo musluğu',
        category: 'bathroom'
    },
    {
        id: 'b3',
        name: 'Termostatik Banyo Musluğu',
        price: 299.99,
        image: 'https://images.unsplash.com/photo-1584622781860-6d1a0d0c9c0f?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        description: 'Sabit sıcaklık kontrolü sağlayan termostatik musluk',
        category: 'bathroom'
    },

    // Duş Sistemleri
    {
        id: 'd1',
        name: 'Duvara Monte Duş Sistemi',
        price: 299.99,
        image: 'https://images.unsplash.com/photo-1584622781860-6d1a0d0c9c0b?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        description: 'Yağmur duş başlığı ve el duşu içeren tam duş sistemi',
        category: 'shower'
    },
    {
        id: 'd2',
        name: 'Tavan Duş Sistemi',
        price: 399.99,
        image: 'https://images.unsplash.com/photo-1584622781860-6d1a0d0c9c0g?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        description: 'Tavandan monte edilen lüks yağmur duş sistemi',
        category: 'shower'
    },
    {
        id: 'd3',
        name: 'Hidromasaj Duş Sistemi',
        price: 599.99,
        image: 'https://images.unsplash.com/photo-1584622781860-6d1a0d0c9c0h?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        description: 'Hidromasaj özellikli, çoklu duş başlıklı sistem',
        category: 'shower'
    },

    // Aksesuarlar
    {
        id: 'a1',
        name: 'Musluk Filtresi',
        price: 49.99,
        image: 'https://images.unsplash.com/photo-1584622781860-6d1a0d0c9c0i?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        description: 'Su kalitesini artıran aktif karbon filtre',
        category: 'accessories'
    },
    {
        id: 'a2',
        name: 'Duş Askısı',
        price: 29.99,
        image: 'https://images.unsplash.com/photo-1584622781860-6d1a0d0c9c0j?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        description: 'Paslanmaz çelik duş askısı seti',
        category: 'accessories'
    },
    {
        id: 'a3',
        name: 'Musluk Başlığı',
        price: 19.99,
        image: 'https://images.unsplash.com/photo-1584622781860-6d1a0d0c9c0k?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        description: 'Su tasarrufu sağlayan özel musluk başlığı',
        category: 'accessories'
    }
];

// DOM Elements
const mainContent = document.getElementById('main-content');
const cartIcon = document.getElementById('cart-icon');
const cartCount = document.getElementById('cart-count');
const loginButton = document.getElementById('login-button');
const userInfo = document.getElementById('user-info');

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyC9o8-lBqkwYC_y9DJYMV-7Is69ySmOP34",
    authDomain: "yasam-website.firebaseapp.com",
    projectId: "yasam-website",
    storageBucket: "yasam-website.appspot.com",
    messagingSenderId: "1083117657137",
    appId: "1:1083117657137:web:bd12bacd24b4c080278910",
    measurementId: "G-HZY4507C27"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// Add Firebase Google Sign-In
function signInWithGoogle() {
    signInWithPopup(auth, provider)
        .then((result) => {
            const user = result.user;
            currentUser = {
                id: user.uid,
                email: user.email || "",
                name: user.displayName || "",
                picture: user.photoURL || ""
            };
            updateUserInterface();
        })
        .catch((error) => {
            showNotification("Giriş başarısız: " + error.message);
        });
}

function logout() {
    signOut(auth).then(() => {
        currentUser = null;
        updateUserInterface();
    });
}

// Listen for auth state changes
onAuthStateChanged(auth, (user: FirebaseUser | null) => {
    if (user) {
        currentUser = {
            id: user.uid,
            email: user.email || "",
            name: user.displayName || "",
            picture: user.photoURL || ""
        };
    } else {
        currentUser = null;
    }
    updateUserInterface();
});

// Update User Interface
function updateUserInterface() {
    if (currentUser) {
        loginButton?.classList.add('hidden');
        userInfo!.innerHTML = `
            <div class="user-profile-clean">
                <img src="${currentUser.picture}" alt="${currentUser.name}" class="user-avatar-top" id="profile-avatar" title="${currentUser.name}">
                <div class="profile-dropdown" id="profile-dropdown">
                  <a href="/profile" class="profile-dropdown-item" id="profile-menu-profilim">Profilim</a>
                  <button id="profile-menu-logout" class="profile-dropdown-item">Çıkış Yap</button>
                </div>
            </div>
        `;
        userInfo?.classList.remove('hidden');
        userInfo!.style.position = "fixed";
        userInfo!.style.top = "18px";
        userInfo!.style.right = "16px";
        userInfo!.style.zIndex = "1000";
        userInfo!.style.background = "none";
        userInfo!.style.border = "none";
        userInfo!.style.boxShadow = "none";
        userInfo!.style.display = "flex";
        userInfo!.style.alignItems = "center";
        // Dropdown logic
        const profileAvatar = document.getElementById('profile-avatar');
        const profileDropdown = document.getElementById('profile-dropdown');
        if (profileAvatar && profileDropdown) {
            profileDropdown.style.display = 'none';
            profileAvatar.addEventListener('click', (e) => {
                e.stopPropagation();
                profileDropdown.style.display = profileDropdown.style.display === 'block' ? 'none' : 'block';
            });
            document.addEventListener('click', (e) => {
                if (profileDropdown.style.display === 'block') {
                    profileDropdown.style.display = 'none';
                }
            });
        }
        // Dropdown menu actions
        const profilimLink = document.getElementById('profile-menu-profilim');
        const logoutBtn = document.getElementById('profile-menu-logout');
        if (profilimLink) {
            profilimLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/profile');
                navigateTo('/profile');
                const profileDropdown = document.getElementById('profile-dropdown');
                if (profileDropdown) profileDropdown.style.display = 'none';
            });
        }
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                logout();
                const profileDropdown = document.getElementById('profile-dropdown');
                if (profileDropdown) profileDropdown.style.display = 'none';
            });
        }
    } else {
        // Render custom Google sign-in button with SVG
        if (loginButton) {
            loginButton.innerHTML = `
                <button class="google-signin-btn" type="button">
                  <svg class="google-icon" width="20" height="20" viewBox="0 0 48 48">
                    <g>
                      <path fill="#4285F4" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.3-5.7 7-11.3 7-6.6 0-12-5.4-12-12s5.4-12 12-12c2.7 0 5.2 0.9 7.2 2.4l6-6C36.1 5.1 30.4 3 24 3 12.9 3 4 11.9 4 23s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-0.1-2.7-0.3-4z"/>
                      <path fill="#34A853" d="M6.3 14.7l6.6 4.8C14.5 16.1 18.9 13 24 13c2.7 0 5.2 0.9 7.2 2.4l6-6C36.1 5.1 30.4 3 24 3 15.6 3 8.1 8.5 6.3 14.7z"/>
                      <path fill="#FBBC05" d="M24 43c6.2 0 11.4-2 15.2-5.4l-7.1-5.8C29.7 33.9 27 35 24 35c-5.6 0-10.3-3.8-12-9l-7.1 5.5C8.1 39.5 15.6 45 24 45z"/>
                      <path fill="#EA4335" d="M43.6 20.5h-1.9V20H24v8h11.3c-0.7 2-2.1 3.7-3.9 4.9l7.1 5.8C41.9 39.5 44 32.7 44 24c0-1.3-0.1-2.7-0.4-3.5z"/>
                    </g>
                  </svg>
                  Giriş Yap
                </button>
            `;
            loginButton.classList.remove('hidden');
            userInfo?.classList.add('hidden');
            // Add event listener to the custom button
            const googleBtn = loginButton.querySelector('.google-signin-btn');
            if (googleBtn) {
                googleBtn.addEventListener('click', signInWithGoogle);
            }
        }
    }
    updateCartCount();
}

// Update Cart Count
function updateCartCount() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    console.log('Updating cart count:', totalItems); // Debug log
    if (cartCount) {
        cartCount.textContent = totalItems.toString();
    } else {
        console.error('Cart count element not found!'); // Debug log
    }
}

// Add to Cart
function addToCart(product: Product) {
    console.log('Adding to cart:', product); // Debug log
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
        existingItem.quantity += 1;
        console.log('Updated existing item quantity:', existingItem); // Debug log
    } else {
        const newItem = { ...product, quantity: 1 };
        cart.push(newItem);
        console.log('Added new item to cart:', newItem); // Debug log
    }
    updateCartCount();
    showNotification('Ürün sepete eklendi!');
    console.log('Current cart state:', cart); // Debug log
}

// Show Notification
function showNotification(message: string) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Render Products
function renderProducts(category?: string) {
    hideHomeSections();
    if (!mainContent) return;
    mainContent.style.display = '';
    // Always hide carousel when showing products page
    const carousel = document.querySelector('.hero-carousel') as HTMLElement;
    if (carousel) {
        carousel.classList.remove('active');
    }
    // Use real products array
    let filteredProducts = category ? products.filter(p => p.category === category) : products;
    const categoryTitle = category ? getCategoryName(category) : 'Tüm Ürünler';
    mainContent.innerHTML = `
        <section class="products-section">
            <h2>${categoryTitle}</h2>
            <div class="products-grid">
                ${filteredProducts.length === 0 ? `<p>Bu kategoride ürün bulunamadı. (category: ${category})</p>` : filteredProducts.map(product => `
                    <div class="product-card">
                        <div class="product-image" style="background-image: url('${product.image}')"></div>
                        <div class="product-details">
                            <h3>${product.name}</h3>
                            <p>${product.description}</p>
                            <span class="price">₺${product.price.toFixed(2)}</span>
                            <button onclick="window.addToCartById && window.addToCartById('${product.id}')" class="add-to-cart-btn">Sepete Ekle</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </section>
    `;
    setupCartIconHandler();
}

// Helper function to get category name in Turkish
function getCategoryName(category: string): string {
    const categories: { [key: string]: string } = {
        'kitchen': 'Mutfak Muslukları',
        'bathroom': 'Banyo Muslukları',
        'shower': 'Duş Sistemleri',
        'accessories': 'Aksesuarlar'
    };
    return categories[category] || category;
}

// Render Cart: always show a visible cart page, even if empty, with all features
function renderCart() {
    if (!mainContent) return;
    mainContent.style.display = '';
    hideHomeSections();
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    mainContent.innerHTML = `
        <div class="cart-container">
            <h2>Alışveriş Sepeti</h2>
            ${cart.length === 0 ? '<p class="empty-cart">Sepetinizde ürün bulunmamaktadır.</p>' : cart.map(item => `
                <div class="cart-item">
                    <img src="${item.image}" alt="${item.name}">
                    <div class="cart-item-info">
                        <h3>${item.name}</h3>
                        <p>${item.price.toFixed(2)} TL x ${item.quantity}</p>
                    </div>
                    <div class="cart-item-actions">
                        <button onclick="updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
                    </div>
                </div>
            `).join('')}
            ${cart.length > 0 ? `
                <div class="cart-total">
                    <p>Toplam: ${total.toFixed(2)} TL</p>
                    <button onclick="proceedToCheckout()" class="checkout-button add-to-cart-btn">
                        Ödemeye Geç
                    </button>
                </div>
            ` : ''}
        </div>
    `;
    setupCartIconHandler();
}

// Update Quantity
function updateQuantity(productId: string, newQuantity: number) {
    if (newQuantity <= 0) {
        cart = cart.filter(item => item.id !== productId);
    } else {
        const item = cart.find(item => item.id === productId);
        if (item) {
            item.quantity = newQuantity;
        }
    }
    updateCartCount();
    renderCart();
}

// Proceed to Checkout
function proceedToCheckout() {
    if (!currentUser) {
        showNotification('Lütfen ödeme yapmak için giriş yapın');
        return;
    }
    renderPaymentForm();
}

// Render Payment Form
function renderPaymentForm() {
    if (!mainContent) return;

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    mainContent.innerHTML = `
        <div class="payment-form">
            <h2>Ödeme Bilgileri</h2>
            <form id="payment-form" onsubmit="handlePayment(event)">
                <div class="form-group">
                    <label for="card-number">Kart Numarası</label>
                    <input type="text" id="card-number" placeholder="1234 5678 9012 3456" required>
                </div>
                <div class="form-group">
                    <label for="expiry">Son Kullanma Tarihi</label>
                    <input type="text" id="expiry" placeholder="AA/YY" required>
                </div>
                <div class="form-group">
                    <label for="cvv">CVV</label>
                    <input type="text" id="cvv" placeholder="123" required>
                </div>
                <div class="form-group">
                    <label for="name">Kart Üzerindeki İsim</label>
                    <input type="text" id="name" placeholder="Ad Soyad" required>
                </div>
                <div class="order-summary">
                    <h3>Sipariş Özeti</h3>
                    <p>Toplam Tutar: ${total.toFixed(2)} TL</p>
                </div>
                <button type="submit">Ödemeyi Tamamla</button>
            </form>
        </div>
    `;
}

// Handle Payment
function handlePayment(event: Event) {
    event.preventDefault();
    // This is a dummy payment handler
    showNotification('Ödeme başarılı! Alışverişiniz için teşekkür ederiz.');
    cart = [];
    updateCartCount();
    renderProducts();
}

// SPA: Show profile view in main-content with #profile-area before calling loadUserProfile
function showProfile() {
    console.log('Profilim: showProfile called');
    // 1) Update breadcrumb
    const bc = document.getElementById('breadcrumb');
    if (bc) {
        bc.innerHTML = `<a href="/">Ana Sayfa</a> › <span>Profilim</span>`;
    }
    // 2) Inject a container that loadUserProfile can target
    const main = document.getElementById('main-content');
    if (!main) {
        console.error('Main content container bulunamadı');
        return;
    }
    main.style.display = '';
    hideHomeSections();
    main.innerHTML = `
        <section id="profile-area" class="profile">
          <h2>Profilim</h2>
          <p>Yükleniyor…</p>
        </section>
    `;
    // Remove slide-in animation class if present
    main.classList.remove('slide-in');
    main.classList.remove('fade-out');
    // 3) Now call loadUserProfile (it will find #profile-area)
    try {
        loadUserProfile();
    } catch (err: any) {
        console.error('Bir hata oluştu:', err.message);
    }
}

// In loadUserProfile, render inside #profile-area if it exists
async function loadUserProfile() {
    showNotification('Profilim: loadUserProfile called');
    if (!currentUser) {
        showNotification('Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.');
        return;
    }
    let container = document.getElementById('profile-area');
    if (!container) {
        container = mainContent;
    }
    const docRef = doc(db, "users", currentUser.id);
    const docSnap = await getDoc(docRef);
    const profileData = docSnap.exists() ? docSnap.data() : {};
    renderProfileForm(profileData, false, container);
    setTimeout(() => {
        const profileForm = document.querySelector('.profile-form-container');
        if (profileForm) {
            profileForm.scrollIntoView({ behavior: 'smooth' });
            showNotification('Profil sayfası gösterildi!');
        }
    }, 100);
}

// Update renderProfileForm to accept a container
function renderProfileForm(profileData: any = {}, editMode: boolean = false, container?: HTMLElement | null) {
    if (!container) {
        container = mainContent;
    }
    hideHomeSections();
    if (!container) {
        showNotification('Bir hata oluştu: Profil alanı bulunamadı.');
        return;
    }
    container.style.display = '';
    const displayName = profileData.name || currentUser?.name || '';
    const address = profileData.address || '';
    const phone = profileData.phone || '';
    container.innerHTML = `
        <div class="profile-form-container">
            <h2>Profil Bilgileri</h2>
            <div class="profile-google-info">
                <img src="${currentUser?.picture}" alt="${displayName}" class="user-avatar-profile">
                <div>
                    <div><strong>Ad Soyad:</strong> ${displayName}</div>
                    <div><strong>Email:</strong> ${currentUser?.email}</div>
                </div>
            </div>
            <form id="profile-form">
                ${editMode ? `
                <div class="form-group">
                    <label for="name">Ad Soyad</label>
                    <input type="text" id="name" value="${displayName}" required>
                </div>
                <div class="form-group">
                    <label for="address">Adres</label>
                    <input type="text" id="address" value="${address}" required>
                </div>
                <div class="form-group">
                    <label for="phone">Telefon</label>
                    <input type="text" id="phone" value="${phone}" required>
                </div>
                <button type="submit">Kaydet</button>
                ` : `
                <div class="profile-view-field"><strong>Adres:</strong> ${address}</div>
                <div class="profile-view-field"><strong>Telefon:</strong> ${phone}</div>
                `}
            </form>
            ${!editMode ? '<button id="edit-profile-btn" class="profile-btn">Düzenle</button>' : ''}
        </div>
    `;
    showNotification('Profil formu başarıyla render edildi!');
    const form = document.getElementById('profile-form') as HTMLFormElement;
    if (editMode) {
        form.onsubmit = handleProfileSave;
    } else {
        form.onsubmit = (e) => e.preventDefault();
    }
    const editBtn = document.getElementById('edit-profile-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            renderProfileForm({ name: displayName, address, phone }, true, container);
        });
    }
}

async function handleProfileSave(event: Event) {
    event.preventDefault();
    if (!currentUser) return;
    const name = (document.getElementById('name') as HTMLInputElement).value;
    const address = (document.getElementById('address') as HTMLInputElement).value;
    const phone = (document.getElementById('phone') as HTMLInputElement).value;
    const userProfile = { name, address, phone };
    try {
        await setDoc(doc(db, "users", currentUser.id), userProfile);
        currentUser.name = name;
        updateUserInterface();
        showNotification("Profil kaydedildi!");
        // Switch back to view mode
        renderProfileForm(userProfile, false);
    } catch (error) {
        showNotification("Profil kaydedilemedi!");
    }
}

// Category mapping for dropdown links
const categoryMap: { [key: string]: string } = {
    'Evye Bataryası': 'kitchen',
    'Banyo Bataryası': 'bathroom',
    'Lavabo Bataryası': 'bathroom',
    'Duş Sistemi': 'shower',
    'Musluk Başlığı': 'accessories',
    'kitchen': 'kitchen',
    'bathroom': 'bathroom',
    'lavabo': 'bathroom',
    'shower': 'shower',
    'accessories': 'accessories',
};

// --- SPA Router ---
const routes: { [key: string]: () => void } = {
    '/': () => showHomeSections(),
    '/products': () => renderProducts(),
    '/products/kitchen': () => renderProducts('kitchen'),
    '/products/bathroom': () => renderProducts('bathroom'),
    '/products/lavabo': () => renderProducts('bathroom'),
    '/products/shower': () => renderProducts('shower'),
    '/products/accessories': () => renderProducts('accessories'),
    '/cart': () => renderCart(),
    '/profile': () => showProfile(),
};

function showHomeSections() {
    // Show all homepage sections and carousel
    const carousel = document.querySelector('.hero-carousel') as HTMLElement;
    const productsSection = document.getElementById('products-section');
    const aboutSection = document.getElementById('about-section');
    const contactSection = document.getElementById('contact-section');
    if (carousel) carousel.classList.add('active');
    if (productsSection) productsSection.style.display = '';
    if (aboutSection) aboutSection.style.display = '';
    if (contactSection) contactSection.style.display = '';
    // Hide main-content if present
    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.style.display = 'none';
}

function hideHomeSections() {
    // Hide homepage sections and carousel
    const carousel = document.querySelector('.hero-carousel') as HTMLElement;
    const productsSection = document.getElementById('products-section');
    const aboutSection = document.getElementById('about-section');
    const contactSection = document.getElementById('contact-section');
    if (carousel) carousel.classList.remove('active');
    if (productsSection) productsSection.style.display = 'none';
    if (aboutSection) aboutSection.style.display = 'none';
    if (contactSection) contactSection.style.display = 'none';
    // Show main-content if present
    const mainContent = document.getElementById('main-content');
    if (mainContent) mainContent.style.display = '';
}

function render404() {
    if (mainContent) {
        mainContent.innerHTML = `
            <section class="error-page">
                <h2>404 - Sayfa Bulunamadı</h2>
                <p>Aradığınız sayfa mevcut değil.</p>
                <a href="/" class="btn btn-primary">Ana Sayfaya Dön</a>
            </section>
        `;
    }
}

function updateActiveNav() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link, .nav-actions a');
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath || (currentPath === '/' && href === '/products')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

function updateBreadcrumb(path: string) {
    const bc = document.getElementById('breadcrumb');
    if (!bc) return;
    let html = `<a href="/">Ana Sayfa</a>`;
    if (path.startsWith('/products')) {
        html += `<a href="/products">Ürünler</a>`;
        const parts = path.split('/');
        if (parts.length === 3) {
            const cat = parts[2];
            const name = getCategoryName(cat);
            html += `<a href="${path}">${name}</a>`;
        }
    } else if (path === '/about') {
        html += `<a href="${path}">Hakkımızda</a>`;
    } else if (path === '/contact') {
        html += `<a href="${path}">İletişim</a>`;
    } else if (path === '/cart') {
        html += `<a href="${path}">Sepetim</a>`;
    } else if (path === '/profile') {
        html += `<a href="${path}">Profilim</a>`;
    }
    bc.innerHTML = html;
}

function showLoading() {
    if (mainContent) {
        mainContent.innerHTML = '<div class="loading">Yükleniyor...</div>';
    }
}

async function navigateTo(path: string) {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        if (path === '/products' || path === '/cart' || path === '/profile') {
            // Instantly render these pages, no animation
            showLoading();
            window.history.pushState({}, '', path);
            const route = routes[path] || routes['/'];
            route();
            updateActiveNav();
            updateBreadcrumb(path);
            mainContent.classList.remove('fade-out', 'slide-in');
            window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            return;
        }
        // Fade and slide out for other pages
        mainContent.classList.add('fade-out');
        mainContent.classList.remove('slide-in');
        await new Promise(resolve => setTimeout(resolve, 300));
        showLoading();
        window.history.pushState({}, '', path);
        const route = routes[path] || routes['/'];
        route();
        updateActiveNav();
        updateBreadcrumb(path);
        requestAnimationFrame(() => {
            mainContent.classList.remove('fade-out');
            mainContent.classList.add('slide-in');
            if (path !== '/' && path !== '/products') {
                mainContent.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    }
}

// Initialize router
function initRouter() {
    // Handle browser back/forward buttons
    window.addEventListener('popstate', async () => {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            // Fade and slide out
            mainContent.classList.add('fade-out');
            mainContent.classList.remove('slide-in');
            
            await new Promise(resolve => setTimeout(resolve, 300));
            
            const path = window.location.pathname;
            const route = routes[path] || routes['/'];
            route();
            updateActiveNav();
            updateBreadcrumb(path);
            
            // Add slide-in animation and scroll
            requestAnimationFrame(() => {
                mainContent.classList.remove('fade-out');
                mainContent.classList.add('slide-in');
                
                // Smooth scroll to content area if not on home page
                if (path !== '/' && path !== '/products') {
                    mainContent.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        }
    });

    // Handle all navigation clicks
    document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const link = target.closest('a');
        
        if (link && link.href.startsWith(window.location.origin)) {
            e.preventDefault();
            const path = new URL(link.href).pathname;
            navigateTo(path);
        }
    });

    // Load initial route with animation
    const path = window.location.pathname;
    const route = routes[path] || routes['/'];
    route();
    updateActiveNav();
    updateBreadcrumb(path);
    
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
        requestAnimationFrame(() => {
            if (path !== '/products' && path !== '/cart' && path !== '/profile') {
                mainContent.classList.add('slide-in');
            } else {
                mainContent.classList.remove('slide-in');
            }
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initRouter);

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded'); // Debug log
    
    // Initialize cart
    cart = [];
    updateCartCount();
    
    // Initialize UI
    renderProducts();
    
    // Set up cart icon click handler
    if (cartIcon) {
        console.log('Cart icon found, setting up click handler'); // Debug log
        cartIcon.addEventListener('click', (e) => {
            e.preventDefault();
            window.history.pushState({}, '', '/cart');
            renderCart();
            updateActiveNav();
            updateBreadcrumb('/cart');
        });
    } else {
        console.error('Cart icon element not found!'); // Debug log
    }

    // Update navigation handlers
    document.querySelectorAll('.nav-link, .dropdown-content a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const path = (e.target as HTMLAnchorElement).getAttribute('href');
            if (path === '/') {
                renderProducts();
            } else if (path === '/cart') {
                renderCart();
            } else if (path?.startsWith('/products/')) {
                const category = path.split('/').pop();
                renderProducts(category);
            }
        });
    });

    // Logo click returns to homepage and shows homepage sections
    const logoLink = document.querySelector('.logo a');
    if (logoLink) {
        logoLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.history.pushState({}, '', '/');
            showHomeSections();
            updateActiveNav();
            updateBreadcrumb('/');
        });
    }
    // Ürünler nav-link click shows all products
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === '/products') {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/products');
                renderProducts();
                updateActiveNav();
                updateBreadcrumb('/products');
            });
        }
    });
    // Dropdown category links
    document.querySelectorAll('.dropdown-content a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const text = link.textContent?.trim() || '';
            const category = categoryMap[text] || categoryMap[link.getAttribute('href')?.split('/').pop() || ''];
            if (category) {
                window.history.pushState({}, '', `/products/${category}`);
                renderProducts(category);
                updateActiveNav();
                updateBreadcrumb(`/products/${category}`);
            }
        });
    });
    // Carousel CTA buttons show all products
    document.querySelectorAll('.cta-button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            window.history.pushState({}, '', '/products');
            renderProducts();
            updateActiveNav();
            updateBreadcrumb('/products');
        });
    });
});

// Make functions available globally
(window as any).addToCart = addToCart;
(window as any).updateQuantity = updateQuantity;
(window as any).proceedToCheckout = proceedToCheckout;
(window as any).handlePayment = handlePayment;
(window as any).signInWithGoogle = signInWithGoogle;
(window as any).logout = logout;
(window as any).loadUserProfile = loadUserProfile;
(window as any).handleProfileSave = handleProfileSave;
(window as any).addToCartById = function(productId: string) {
    const product = products.find(p => p.id === productId);
    if (product) addToCart(product);
};
(window as any).renderCart = renderCart;

// --- Carousel Functionality ---
let currentSlideIndex = 0;
let slideInterval: number;

function showSlide(index: number) {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    
    if (index >= slides.length) currentSlideIndex = 0;
    if (index < 0) currentSlideIndex = slides.length - 1;
    
    // Hide all slides
    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));
    
    // Show current slide
    slides[currentSlideIndex].classList.add('active');
    dots[currentSlideIndex].classList.add('active');
}

function changeSlide(direction: number) {
    currentSlideIndex += direction;
    showSlide(currentSlideIndex);
    resetInterval();
}

function currentSlide(index: number) {
    currentSlideIndex = index - 1;
    showSlide(currentSlideIndex);
    resetInterval();
}

function resetInterval() {
    clearInterval(slideInterval);
    slideInterval = window.setInterval(() => {
        currentSlideIndex++;
        showSlide(currentSlideIndex);
    }, 5000);
}

function initCarousel() {
    showSlide(currentSlideIndex);
    resetInterval();
    
    // Pause auto-slide on hover
    const carousel = document.querySelector('.hero-carousel');
    if (carousel) {
        carousel.addEventListener('mouseenter', () => clearInterval(slideInterval));
        carousel.addEventListener('mouseleave', resetInterval);
    }
}

// Initialize carousel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initRouter();
    initCarousel();
});

// Make functions globally available
(window as any).changeSlide = changeSlide;
(window as any).currentSlide = currentSlide;

// Smooth scroll for nav links
function setupSmoothScroll() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = (e.target as HTMLAnchorElement).getAttribute('href');
            if (href === '/about') {
                e.preventDefault();
                showHomeSections();
                document.getElementById('about-section')?.scrollIntoView({ behavior: 'smooth' });
            } else if (href === '/contact') {
                e.preventDefault();
                showHomeSections();
                document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
            } else if (href === '/products') {
                e.preventDefault();
                showHomeSections();
                document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupSmoothScroll();
    // ... existing code ...
});

// Cart icon handler: always show cart page and update URL
function setupCartIconHandler() {
    if (cartIcon) {
        cartIcon.onclick = () => {
            window.history.pushState({}, '', '/cart');
            hideHomeSections();
            renderCart();
            updateActiveNav();
            updateBreadcrumb('/cart');
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupCartIconHandler();
    setupStaticAddToCartButtons();
    // ... existing code ...
});

// Attach add-to-cart listeners for static homepage preview section
function setupStaticAddToCartButtons() {
    document.querySelectorAll('.products-preview-section .add-to-cart-btn').forEach((btn, idx) => {
        btn.addEventListener('click', () => {
            // Use the first three products for the static preview
            const previewProducts = [
                {
                    id: 'k1',
                    name: 'Modern Mutfak Musluğu',
                    price: 199.99,
                    image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
                    description: 'Çağdaş tek kollu mutfak musluğu, çekilebilir duş başlığı ile',
                    category: 'kitchen'
                },
                {
                    id: 'k2',
                    name: 'Endüstriyel Mutfak Musluğu',
                    price: 299.99,
                    image: 'https://images.unsplash.com/photo-1584622781860-6d1a0d0c9c0c?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
                    description: 'Profesyonel mutfaklar için yüksek basınçlı musluk',
                    category: 'kitchen'
                },
                {
                    id: 'b1',
                    name: 'Klasik Banyo Musluğu',
                    price: 149.99,
                    image: 'https://images.unsplash.com/photo-1584622781860-6d1a0d0c9c0a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
                    description: 'Seramik diskli vanalara sahip geleneksel çift kollu banyo musluğu',
                    category: 'bathroom'
                }
            ];
            addToCart(previewProducts[idx]);
        });
    });
    setupCartIconHandler();
}

document.addEventListener('DOMContentLoaded', () => {
    setupCartIconHandler();
    setupStaticAddToCartButtons();
    // ... existing code ...
});

// Ensure router handles direct navigation to /profile
window.addEventListener('DOMContentLoaded', () => {
    setupCartIconHandler();
    setupStaticAddToCartButtons();
    const path = window.location.pathname;
    const route = routes[path] || showHomeSections;
    route();
}); 