import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, addDoc, collection, query, where, orderBy, getDocs, updateDoc, deleteDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Types
interface Product {
    id: string;
    name: string;
    price: number;
    image: string;
    description: string;
    category: string;
    detailedDescription?: string;
    specifications?: {
        material?: string;
        finish?: string;
        dimensions?: string;
        warranty?: string;
        features?: string[];
    };
    stock?: number;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

interface CartItem extends Product {
    quantity: number;
}

interface OrderItem {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
}

interface Order {
    id: string;
    userId: string;
    userEmail: string;
    userName: string;
    items: OrderItem[];
    total: number;
    status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
    shippingAddress: {
        name: string;
        phone: string;
        address: string;
        city: string;
        postalCode?: string;
        additionalInfo?: string;
    };
    paymentStatus: 'pending' | 'paid' | 'failed';
    paymentMethod: string;
    createdAt: string;
    updatedAt: string;
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
let isAdmin: boolean = false;
let products: Product[] = [];

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
    storageBucket: "yasam-website.firebasestorage.app",
    messagingSenderId: "1083117657137",
    appId: "1:1083117657137:web:bd12bacd24b4c080278910",
    measurementId: "G-HZY4507C27"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const functions = getFunctions(app);
const storage = getStorage(app);

// Production-ready admin checking using Firebase custom claims
function checkAdminStatus() {
    if (!currentUser) return false;
    
    // Check if user is admin using Firebase custom claims
    auth.currentUser?.getIdTokenResult().then((idTokenResult: any) => {
        isAdmin = idTokenResult.claims.admin === true;
        renderUserInterface();
    }).catch((error: any) => {
        console.error('Error getting admin status:', error);
        isAdmin = false;
        renderUserInterface();
    });
}

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
            console.error("Error signing in with Google:", error);
        });
}

// Function to make a user admin
async function makeUserAdmin(email: string) {
    if (!isAdmin) {
        showNotification('Admin yetkiniz bulunmamaktadır!');
        return;
    }

    try {
        const addAdminRole = httpsCallable(functions, 'addAdminRole');
        const result = await addAdminRole({ email });
        showNotification(`Başarılı! ${email} artık admin.`);
        console.log(result.data);
    } catch (error: any) {
        console.error('Error making user admin:', error);
        showNotification(`Hata: ${error.message}`);
    }
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
        // Check admin status using the new function
        checkAdminStatus();
    } else {
        renderUserInterface();
    }
}

function renderUserInterface() {
    if (currentUser) {
        loginButton?.classList.add('hidden');
        userInfo!.innerHTML = `
            <div class="user-profile-clean">
                <img src="${currentUser.picture}" alt="${currentUser.name}" class="user-avatar-top" id="profile-avatar" title="${currentUser.name}">
                <div class="profile-dropdown" id="profile-dropdown">
                  <a href="/profile" class="profile-dropdown-item" id="profile-menu-profilim">Profilim</a>
                  ${isAdmin ? '<a href="/admin" class="profile-dropdown-item" id="profile-menu-admin">Admin Paneli</a>' : ''}
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
        const adminLink = document.getElementById('profile-menu-admin');
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
        if (adminLink) {
            adminLink.addEventListener('click', (e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/admin');
                navigateTo('/admin');
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
                    <div class="product-card" onclick="showProductDetail('${product.id}')" style="cursor: pointer;">
                        <div class="product-image" style="background-image: url('${product.image}')"></div>
                        <div class="product-details">
                            <h3>${product.name}</h3>
                            <p>${product.description}</p>
                            <span class="price">₺${product.price.toFixed(2)}</span>
                            <button onclick="event.stopPropagation(); window.addToCartById && window.addToCartById('${product.id}')" class="add-to-cart-btn">Sepete Ekle</button>
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
        'kitchen': 'Evye Bataryası',
        'bathroom': 'Banyo Bataryası',
        'shower': 'Duş Sistemi',
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
        showNotification("Lütfen ödeme yapmak için giriş yapın");
        return;
    }
    
    if (cart.length === 0) {
        showNotification("Sepetinizde ürün bulunmamaktadır");
        return;
    }
    
    // Check if user has complete profile information
    checkUserProfileAndProceed();
}

async function checkUserProfileAndProceed() {
    if (!currentUser) return;
    
    try {
        const userDoc = await getDoc(doc(db, "users", currentUser.id));
        const userData = userDoc.exists() ? userDoc.data() : {};
        
        // Check if required fields are filled
        const requiredFields = ['name', 'phone', 'address', 'city'];
        const missingFields = requiredFields.filter(field => !userData[field]);
        
        if (missingFields.length > 0) {
            showNotification("Lütfen önce profil bilgilerinizi tamamlayın");
            showProfile();
            return;
        }
        
        // Proceed to checkout with user data
        renderCheckoutForm(userData);
        
    } catch (error) {
        showNotification("Profil bilgileri kontrol edilemedi");
        console.error('Profile check error:', error);
    }
}

function renderCheckoutForm(userData: any) {
    if (!mainContent) return;
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderItems = cart.map(item => ({
        productId: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image
    }));
    
    mainContent.innerHTML = `
        <div class="checkout-container">
            <h2>Sipariş Onayı</h2>
            
            <div class="checkout-sections">
                <div class="shipping-info">
                    <h3>Teslimat Bilgileri</h3>
                    <div class="info-card">
                        <p><strong>Ad Soyad:</strong> ${userData.name}</p>
                        <p><strong>Telefon:</strong> ${userData.phone}</p>
                        <p><strong>Adres:</strong> ${userData.address}</p>
                        <p><strong>Şehir:</strong> ${userData.city}</p>
                        ${userData.postalCode ? `<p><strong>Posta Kodu:</strong> ${userData.postalCode}</p>` : ''}
                        ${userData.additionalInfo ? `<p><strong>Ek Bilgiler:</strong> ${userData.additionalInfo}</p>` : ''}
                    </div>
                    <button onclick="showProfile()" class="btn btn-secondary">Bilgileri Düzenle</button>
                </div>
                
                <div class="order-summary">
                    <h3>Sipariş Özeti</h3>
                    <div class="order-items">
                        ${orderItems.map(item => `
                            <div class="order-item">
                                <img src="${item.image}" alt="${item.name}">
                                <div class="item-details">
                                    <h4>${item.name}</h4>
                                    <p>${item.price.toFixed(2)} TL x ${item.quantity}</p>
                                </div>
                                <div class="item-total">
                                    ${(item.price * item.quantity).toFixed(2)} TL
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="order-total">
                        <h4>Toplam: ${total.toFixed(2)} TL</h4>
                    </div>
                </div>
            </div>
            
            <div class="payment-section">
                <h3>Ödeme Yöntemi</h3>
                <div class="payment-methods">
                    <label class="payment-method">
                        <input type="radio" name="payment" value="iyzico" checked>
                        <span>Kredi/Banka Kartı (Iyzico)</span>
                    </label>
                </div>
                
                <button onclick="processOrder()" class="btn btn-primary checkout-btn">
                    Siparişi Onayla ve Ödeme Yap
                </button>
            </div>
        </div>
    `;
}

async function processOrder() {
    if (!currentUser || cart.length === 0) return;
    
    try {
        // Get user data
        const userDoc = await getDoc(doc(db, "users", currentUser.id));
        const userData = userDoc.exists() ? userDoc.data() : {};
        
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const orderItems = cart.map(item => ({
            productId: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image
        }));
        
        // Create order object
        const order: Omit<Order, 'id'> = {
            userId: currentUser.id,
            userEmail: currentUser.email,
            userName: userData.name || currentUser.name,
            items: orderItems,
            total: total,
            status: 'pending',
            shippingAddress: {
                name: userData.name || currentUser.name,
                phone: userData.phone,
                address: userData.address,
                city: userData.city,
                postalCode: userData.postalCode,
                additionalInfo: userData.additionalInfo
            },
            paymentStatus: 'pending',
            paymentMethod: 'iyzico',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Save order to Firestore
        const orderRef = await addDoc(collection(db, "orders"), order);
        
        showNotification("Sipariş kaydedildi! Ödeme sayfasına yönlendiriliyorsunuz...");
        
        // Here you would integrate with Iyzico
        // For now, we'll simulate the payment process
        await simulatePayment(orderRef.id);
        
    } catch (error) {
        showNotification("Sipariş kaydedilemedi!");
        console.error('Order processing error:', error);
    }
}

async function simulatePayment(orderId: string) {
    // Simulate payment processing
    setTimeout(async () => {
        try {
            // Update order status to paid
            await updateDoc(doc(db, "orders", orderId), {
                paymentStatus: 'paid',
                status: 'confirmed',
                updatedAt: new Date().toISOString()
            });
            
            // Clear cart
            cart = [];
            updateCartCount();
            
            showNotification("Ödeme başarılı! Siparişiniz onaylandı.");
            
            // Redirect to order confirmation
            renderOrderConfirmation(orderId);
            
        } catch (error) {
            showNotification("Ödeme işlemi tamamlanamadı!");
            console.error('Payment simulation error:', error);
        }
    }, 2000);
}

function renderOrderConfirmation(orderId: string) {
    if (!mainContent) return;
    
    mainContent.innerHTML = `
        <div class="order-confirmation">
            <div class="success-icon">✓</div>
            <h2>Siparişiniz Alındı!</h2>
            <p>Sipariş numaranız: <strong>${orderId}</strong></p>
            <p>Siparişiniz başarıyla oluşturuldu ve ödemeniz alındı.</p>
            <p>Kargo bilgileri email adresinize gönderilecektir.</p>
            
            <div class="confirmation-actions">
                <button onclick="renderProducts()" class="btn btn-primary">Alışverişe Devam Et</button>
                <button onclick="showOrderHistory()" class="btn btn-secondary">Siparişlerimi Görüntüle</button>
            </div>
        </div>
    `;
}

async function showOrderHistory() {
    if (!currentUser) return;
    
    try {
        const ordersQuery = query(
            collection(db, "orders"),
            where("userId", "==", currentUser.id),
            orderBy("createdAt", "desc")
        );
        
        const querySnapshot = await getDocs(ordersQuery);
        const orders: Order[] = [];
        
        querySnapshot.forEach((doc) => {
            orders.push({ id: doc.id, ...doc.data() } as Order);
        });
        
        renderOrderHistory(orders);
        
    } catch (error) {
        showNotification("Sipariş geçmişi yüklenemedi!");
        console.error('Order history error:', error);
    }
}

function renderOrderHistory(orders: Order[]) {
    if (!mainContent) return;
    
    mainContent.innerHTML = `
        <div class="order-history">
            <h2>Sipariş Geçmişim</h2>
            ${orders.length === 0 ? 
                '<p class="no-orders">Henüz siparişiniz bulunmamaktadır.</p>' :
                orders.map(order => `
                    <div class="order-card">
                        <div class="order-header">
                            <h3>Sipariş #${order.id.slice(-8)}</h3>
                            <span class="order-status ${order.status}">${getStatusText(order.status)}</span>
                        </div>
                        <div class="order-items">
                            ${order.items.map(item => `
                                <div class="order-item">
                                    <img src="${item.image}" alt="${item.name}">
                                    <div class="item-details">
                                        <h4>${item.name}</h4>
                                        <p>${item.price.toFixed(2)} TL x ${item.quantity}</p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                        <div class="order-footer">
                            <p><strong>Toplam:</strong> ${order.total.toFixed(2)} TL</p>
                            <p><strong>Tarih:</strong> ${new Date(order.createdAt).toLocaleDateString('tr-TR')}</p>
                        </div>
                    </div>
                `).join('')
            }
        </div>
    `;
}

function getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
        'pending': 'Beklemede',
        'confirmed': 'Onaylandı',
        'shipped': 'Kargoda',
        'delivered': 'Teslim Edildi',
        'cancelled': 'İptal Edildi'
    };
    return statusMap[status] || status;
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
    const city = profileData.city || '';
    const postalCode = profileData.postalCode || '';
    const additionalInfo = profileData.additionalInfo || '';
    
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
                    <label for="name">Ad Soyad *</label>
                    <input type="text" id="name" value="${displayName}" required>
                </div>
                <div class="form-group">
                    <label for="phone">Telefon *</label>
                    <input type="tel" id="phone" value="${phone}" placeholder="05XX XXX XX XX" required>
                </div>
                <div class="form-group">
                    <label for="address">Adres *</label>
                    <textarea id="address" rows="3" required>${address}</textarea>
                </div>
                <div class="form-group">
                    <label for="city">Şehir *</label>
                    <input type="text" id="city" value="${city}" required>
                </div>
                <div class="form-group">
                    <label for="postalCode">Posta Kodu</label>
                    <input type="text" id="postalCode" value="${postalCode}" placeholder="34000">
                </div>
                <div class="form-group">
                    <label for="additionalInfo">Ek Bilgiler</label>
                    <textarea id="additionalInfo" rows="2" placeholder="Apartman, kat, kapı no vb.">${additionalInfo}</textarea>
                </div>
                <button type="submit" class="btn btn-primary">Kaydet</button>
                <button type="button" class="btn btn-secondary" onclick="renderProfileForm(${JSON.stringify(profileData)}, false, container)">İptal</button>
                ` : `
                <div class="profile-view-field"><strong>Telefon:</strong> ${phone || 'Belirtilmemiş'}</div>
                <div class="profile-view-field"><strong>Adres:</strong> ${address || 'Belirtilmemiş'}</div>
                <div class="profile-view-field"><strong>Şehir:</strong> ${city || 'Belirtilmemiş'}</div>
                ${postalCode ? `<div class="profile-view-field"><strong>Posta Kodu:</strong> ${postalCode}</div>` : ''}
                ${additionalInfo ? `<div class="profile-view-field"><strong>Ek Bilgiler:</strong> ${additionalInfo}</div>` : ''}
                `}
            </form>
            ${!editMode ? '<button id="edit-profile-btn" class="profile-btn btn btn-primary">Düzenle</button>' : ''}
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
            renderProfileForm({ name: displayName, address, phone, city, postalCode, additionalInfo }, true, container);
        });
    }
}

async function handleProfileSave(event: Event) {
    event.preventDefault();
    if (!currentUser) return;
    
    const name = (document.getElementById('name') as HTMLInputElement).value;
    const phone = (document.getElementById('phone') as HTMLInputElement).value;
    const address = (document.getElementById('address') as HTMLTextAreaElement).value;
    const city = (document.getElementById('city') as HTMLInputElement).value;
    const postalCode = (document.getElementById('postalCode') as HTMLInputElement).value;
    const additionalInfo = (document.getElementById('additionalInfo') as HTMLTextAreaElement).value;
    
    const userProfile = { 
        name, 
        phone, 
        address, 
        city, 
        postalCode, 
        additionalInfo,
        updatedAt: new Date().toISOString()
    };
    
    try {
        await setDoc(doc(db, "users", currentUser.id), userProfile);
        currentUser.name = name;
        updateUserInterface();
        showNotification("Profil kaydedildi!");
        // Switch back to view mode
        renderProfileForm(userProfile, false);
    } catch (error) {
        showNotification("Profil kaydedilemedi!");
        console.error('Profile save error:', error);
    }
}

// Category mapping for dropdown links
const categoryMap: { [key: string]: string } = {
    'Evye Bataryası': 'kitchen',
    'Banyo Bataryası': 'bathroom',
    'Duş Sistemi': 'shower',
    'Aksesuarlar': 'accessories',
    // For hrefs
    'kitchen': 'kitchen',
    'bathroom': 'bathroom',
    'shower': 'shower',
    'accessories': 'accessories'
};

// --- SPA Router ---
const routes: { [key: string]: () => void } = {
    '/': () => showHomeSections(),
    '/products': () => renderProducts(),
    '/products/kitchen': () => renderProducts('kitchen'),
    '/products/bathroom': () => renderProducts('bathroom'),
    '/products/shower': () => renderProducts('shower'),
    '/products/accessories': () => renderProducts('accessories'),
    '/cart': () => renderCart(),
    '/profile': () => showProfile(),
    '/admin': () => showAdminPanel(),
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
    } else if (path === '/admin') {
        html += `<a href="${path}">Admin Paneli</a>`;
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
(window as any).processOrder = processOrder;
(window as any).showOrderHistory = showOrderHistory;
(window as any).signInWithGoogle = signInWithGoogle;
(window as any).logout = logout;
(window as any).loadUserProfile = loadUserProfile;
(window as any).handleProfileSave = handleProfileSave;
(window as any).addToCartById = function(productId: string) {
    const product = products.find(p => p.id === productId);
    if (product) addToCart(product);
};
(window as any).renderCart = renderCart;
(window as any).showProductDetail = showProductDetail;
(window as any).closeModal = closeModal;
(window as any).showAdminPanel = showAdminPanel;
(window as any).showAddProductForm = showAddProductForm;
(window as any).showAdminManagement = showAdminManagement;
(window as any).editProduct = editProduct;
(window as any).deleteProduct = deleteProduct;
(window as any).makeUserAdmin = makeUserAdmin;
(window as any).handleRemoveAdmin = handleRemoveAdmin;
(window as any).filterProducts = filterProducts;
(window as any).toggleProductStatus = toggleProductStatus;

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

// --- Product Detail Functionality ---
function showProductDetail(productId: string) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const modal = document.createElement('div');
    modal.className = 'product-modal';
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeModal()"></div>
        <div class="modal-content">
            <button class="modal-close" onclick="closeModal()">&times;</button>
            <div class="product-detail">
                <div class="product-detail-image">
                    <img src="${product.image}" alt="${product.name}">
                </div>
                <div class="product-detail-info">
                    <h2>${product.name}</h2>
                    <p class="product-price">₺${product.price.toFixed(2)}</p>
                    <p class="product-description">${product.description}</p>
                    ${product.detailedDescription ? `<div class="product-detailed-description">
                        <h3>Detaylı Açıklama</h3>
                        <p>${product.detailedDescription}</p>
                    </div>` : ''}
                    ${product.specifications ? `<div class="product-specifications">
                        <h3>Teknik Özellikler</h3>
                        <ul>
                            ${product.specifications.material ? `<li><strong>Malzeme:</strong> ${product.specifications.material}</li>` : ''}
                            ${product.specifications.finish ? `<li><strong>Kaplama:</strong> ${product.specifications.finish}</li>` : ''}
                            ${product.specifications.dimensions ? `<li><strong>Boyutlar:</strong> ${product.specifications.dimensions}</li>` : ''}
                            ${product.specifications.warranty ? `<li><strong>Garanti:</strong> ${product.specifications.warranty}</li>` : ''}
                        </ul>
                        ${product.specifications.features ? `<div class="product-features">
                            <h4>Özellikler:</h4>
                            <ul>
                                ${product.specifications.features.map(feature => `<li>${feature}</li>`).join('')}
                            </ul>
                        </div>` : ''}
                    </div>` : ''}
                    <div class="product-actions">
                        <button onclick="addToCartById('${product.id}'); closeModal();" class="add-to-cart-btn">Sepete Ekle</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function closeModal() {
    const modal = document.querySelector('.product-modal');
    if (modal) {
        modal.remove();
    }
}

// --- Admin Panel Functionality ---
function showAdminPanel() {
    if (!isAdmin) {
        showNotification('Admin yetkiniz bulunmamaktadır!');
        return;
    }

    hideHomeSections();
    if (!mainContent) return;
    mainContent.style.display = '';
    
    mainContent.innerHTML = `
        <div class="admin-panel">
            <h2>Admin Paneli</h2>
            <div class="admin-actions">
                <button onclick="showAddProductForm()" class="admin-btn">Yeni Ürün Ekle</button>
                <button onclick="showProductManagement()" class="admin-btn">Ürün Yönetimi</button>
                <button onclick="showAdminManagement()" class="admin-btn">Admin Yönetimi</button>
            </div>
            <div id="admin-content">
                <div class="admin-stats">
                    <h3>Genel İstatistikler</h3>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <h4>Toplam Ürün</h4>
                            <p>${products.length}</p>
                        </div>
                        <div class="stat-card">
                            <h4>Aktif Ürün</h4>
                            <p>${products.filter(p => p.isActive).length}</p>
                        </div>
                        <div class="stat-card">
                            <h4>Toplam Stok</h4>
                            <p>${products.reduce((sum, p) => sum + (p.stock || 0), 0)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function showAddProductForm() {
    const adminContent = document.getElementById('admin-content');
    if (!adminContent) return;

    adminContent.innerHTML = `
        <div class="admin-form">
            <h3>➕ Yeni Ürün Ekle</h3>
            <p class="form-help">Tüm alanları doldurun ve ürün resmini yükleyin. İsteğe bağlı alanları boş bırakabilirsiniz.</p>
            
            <form id="add-product-form">
                <div class="form-section">
                    <h4>📋 Temel Bilgiler</h4>
                    
                    <div class="form-group">
                        <label>Ürün Adı *:</label>
                        <input type="text" name="name" required placeholder="Örn: Modern Mutfak Bataryası">
                        <small>Müşterilerin göreceği ürün adı</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Fiyat (₺) *:</label>
                        <input type="number" name="price" step="0.01" required placeholder="0.00">
                        <small>Ürünün satış fiyatı</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Kategori *:</label>
                        <select name="category" required>
                            <option value="">Kategori seçin</option>
                            <option value="kitchen">🏠 Evye Bataryası</option>
                            <option value="bathroom">🚿 Banyo Bataryası</option>
                            <option value="shower">🚿 Duş Sistemi</option>
                            <option value="accessories">🔧 Aksesuarlar</option>
                        </select>
                        <small>Ürünün hangi kategoride görüneceği</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Stok Miktarı:</label>
                        <input type="number" name="stock" value="0" min="0" placeholder="0">
                        <small>Mevcut stok adedi (0 = stok yok)</small>
                    </div>
                </div>

                <div class="form-section">
                    <h4>🖼️ Ürün Resmi</h4>
                    
                    <div class="form-group">
                        <label>Ürün Resmi *:</label>
                        <input type="file" name="imageFile" accept="image/*" required>
                        <small>PNG, JPG veya JPEG formatında, tercihen 800x600 piksel</small>
                        <div class="image-preview" id="image-preview">
                            <div class="preview-placeholder">
                                <span>📷</span>
                                <p>Resim seçildiğinde burada görünecek</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h4>📝 Açıklamalar</h4>
                    
                    <div class="form-group">
                        <label>Kısa Açıklama *:</label>
                        <textarea name="description" required placeholder="Ürünün kısa tanımı (müşterilerin ilk göreceği açıklama)"></textarea>
                        <small>Maksimum 200 karakter önerilir</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Detaylı Açıklama:</label>
                        <textarea name="detailedDescription" placeholder="Ürünün detaylı özellikleri ve kullanım bilgileri"></textarea>
                        <small>İsteğe bağlı - ürün detay sayfasında görünür</small>
                    </div>
                </div>

                <div class="form-section">
                    <h4>🔧 Teknik Özellikler (İsteğe Bağlı)</h4>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Malzeme:</label>
                            <input type="text" name="material" placeholder="Örn: Pirinç, Paslanmaz Çelik">
                        </div>
                        <div class="form-group">
                            <label>Kaplama:</label>
                            <input type="text" name="finish" placeholder="Örn: Krom, Altın">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Boyutlar:</label>
                            <input type="text" name="dimensions" placeholder="Örn: 15x8x25 cm">
                        </div>
                        <div class="form-group">
                            <label>Garanti:</label>
                            <input type="text" name="warranty" placeholder="Örn: 2 Yıl">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Özellikler:</label>
                        <input type="text" name="features" placeholder="Özellik 1, Özellik 2, Özellik 3">
                        <small>Virgülle ayırarak birden fazla özellik ekleyebilirsiniz</small>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="submit" class="admin-btn primary">✅ Ürünü Kaydet</button>
                    <button type="button" onclick="showAdminPanel()" class="admin-btn secondary">❌ İptal</button>
                </div>
            </form>
        </div>
    `;

    const form = document.getElementById('add-product-form') as HTMLFormElement;
    form.addEventListener('submit', handleAddProduct);

    // Enhanced image preview
    const imageInput = form.querySelector('input[name="imageFile"]');
    const imagePreview = form.querySelector('#image-preview');
    imageInput?.addEventListener('change', (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file && imagePreview) {
            // File size validation
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                showNotification('Resim dosyası çok büyük! Maksimum 5MB olmalıdır.');
                (event.target as HTMLInputElement).value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.innerHTML = `
                    <div class="preview-image">
                        <img src="${e.target?.result}" alt="Seçilen Resim Önizlemesi">
                        <div class="file-info">
                            <span>${file.name}</span>
                            <span>${(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                    </div>
                `;
            }
            reader.readAsDataURL(file);
        }
    });

    // Character counter for description
    const descriptionInput = form.querySelector('textarea[name="description"]');
    descriptionInput?.addEventListener('input', (event) => {
        const target = event.target as HTMLTextAreaElement;
        const maxLength = 200;
        const currentLength = target.value.length;
        
        if (currentLength > maxLength) {
            target.value = target.value.substring(0, maxLength);
        }
        
        const counter = target.parentElement?.querySelector('.char-counter');
        if (counter) {
            counter.textContent = `${currentLength}/${maxLength}`;
        }
    });
}

async function handleAddProduct(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const imageFile = (form.elements.namedItem('imageFile') as HTMLInputElement).files?.[0];

    if (!imageFile) {
        showNotification('Lütfen bir ürün resmi seçin.');
        return;
    }
    
    const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    submitButton.disabled = true;
    submitButton.textContent = 'Ekleniyor...';

    try {
        const imageUrl = await uploadProductImage(imageFile);
        const formData = new FormData(form);
        
        const newProductData = {
            name: formData.get('name') as string,
            price: parseFloat(formData.get('price') as string),
            image: imageUrl,
            description: formData.get('description') as string,
            category: formData.get('category') as string,
            detailedDescription: formData.get('detailedDescription') as string || undefined,
            stock: parseInt(formData.get('stock') as string) || 0,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            specifications: {
                material: formData.get('material') as string || undefined,
                finish: formData.get('finish') as string || undefined,
                dimensions: formData.get('dimensions') as string || undefined,
                warranty: formData.get('warranty') as string || undefined,
                features: formData.get('features') as string ? (formData.get('features') as string).split(',').map(f => f.trim()) : undefined
            }
        };

        await addDoc(collection(db, 'products'), newProductData);

        showNotification('Ürün başarıyla eklendi!');
        await loadProducts(); 
        showProductManagement(); 
    } catch (error) {
        console.error("Error adding product:", error);
        showNotification('Ürün eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Ürün Ekle';
    }
}

function showProductManagement() {
    const adminContent = document.getElementById('admin-content');
    if (!adminContent) return;

    adminContent.innerHTML = `
        <div class="product-management">
            <div class="management-header">
                <h3>📦 Ürün Yönetimi</h3>
                <div class="management-actions">
                    <button onclick="showAddProductForm()" class="admin-btn primary">➕ Yeni Ürün Ekle</button>
                    <div class="search-box">
                        <input type="text" id="product-search" placeholder="🔍 Ürün ara..." onkeyup="filterProducts()">
                    </div>
                </div>
            </div>
            
            <div class="products-summary">
                <div class="summary-card">
                    <span class="summary-number">${products.length}</span>
                    <span class="summary-label">Toplam Ürün</span>
                </div>
                <div class="summary-card">
                    <span class="summary-number">${products.filter(p => p.isActive).length}</span>
                    <span class="summary-label">Aktif Ürün</span>
                </div>
                <div class="summary-card">
                    <span class="summary-number">${products.filter(p => (p.stock || 0) > 0).length}</span>
                    <span class="summary-label">Stokta Olan</span>
                </div>
            </div>

            <div class="products-table-container">
                <table class="products-table">
                    <thead>
                        <tr>
                            <th>🖼️ Resim</th>
                            <th>📝 Ad</th>
                            <th>🏷️ Kategori</th>
                            <th>💰 Fiyat</th>
                            <th>📦 Stok</th>
                            <th>📊 Durum</th>
                            <th>⚙️ İşlemler</th>
                        </tr>
                    </thead>
                    <tbody id="products-table-body">
                        ${products.map(product => `
                            <tr class="product-row" data-name="${product.name.toLowerCase()}" data-category="${product.category}">
                                <td>
                                    <div class="product-image-cell">
                                        <img src="${product.image}" alt="${product.name}" class="product-thumb" 
                                             onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg0MFY0MEgyMFYyMFoiIGZpbGw9IiNEN0Q3RDciLz4KPHBhdGggZD0iTTI1IDI1SDM1VjM1SDI1VjI1WiIgZmlsbD0iI0E5QTlBOSIvPgo8L3N2Zz4K'">
                                    </div>
                                </td>
                                <td>
                                    <div class="product-name-cell">
                                        <strong>${product.name}</strong>
                                        <small>${product.description.substring(0, 50)}${product.description.length > 50 ? '...' : ''}</small>
                                    </div>
                                </td>
                                <td>
                                    <span class="category-badge category-${product.category}">
                                        ${getCategoryName(product.category)}
                                    </span>
                                </td>
                                <td>
                                    <span class="price-display">₺${product.price.toFixed(2)}</span>
                                </td>
                                <td>
                                    <span class="stock-display ${(product.stock || 0) > 0 ? 'in-stock' : 'out-of-stock'}">
                                        ${product.stock || 0}
                                    </span>
                                </td>
                                <td>
                                    <span class="status-badge ${product.isActive ? 'active' : 'inactive'}">
                                        ${product.isActive ? '✅ Aktif' : '❌ Pasif'}
                                    </span>
                                </td>
                                <td>
                                    <div class="action-buttons">
                                        <button onclick="editProduct('${product.id}')" class="admin-btn small" title="Düzenle">
                                            ✏️
                                        </button>
                                        <button onclick="toggleProductStatus('${product.id}')" class="admin-btn small ${product.isActive ? 'warning' : 'success'}" title="${product.isActive ? 'Pasif Yap' : 'Aktif Yap'}">
                                            ${product.isActive ? '⏸️' : '▶️'}
                                        </button>
                                        <button onclick="deleteProduct('${product.id}')" class="admin-btn small danger" title="Sil">
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                ${products.length === 0 ? `
                    <div class="empty-state">
                        <div class="empty-icon">📦</div>
                        <h4>Henüz ürün eklenmemiş</h4>
                        <p>İlk ürününüzü eklemek için "Yeni Ürün Ekle" butonuna tıklayın.</p>
                        <button onclick="showAddProductForm()" class="admin-btn primary">➕ İlk Ürünü Ekle</button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Add these helper functions
function filterProducts() {
    const searchTerm = (document.getElementById('product-search') as HTMLInputElement).value.toLowerCase();
    const rows = document.querySelectorAll('.product-row');
    
    rows.forEach(row => {
        const name = row.getAttribute('data-name') || '';
        const category = row.getAttribute('data-category') || '';
        
        if (name.includes(searchTerm) || category.includes(searchTerm)) {
            (row as HTMLElement).style.display = '';
        } else {
            (row as HTMLElement).style.display = 'none';
        }
    });
}

async function toggleProductStatus(productId: string) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    try {
        const productRef = doc(db, "products", productId);
        await updateDoc(productRef, {
            isActive: !product.isActive,
            updatedAt: new Date().toISOString()
        });
        
        showNotification(`Ürün ${product.isActive ? 'pasif' : 'aktif'} yapıldı!`);
        await loadProducts();
        showProductManagement();
    } catch (error) {
        console.error("Error toggling product status:", error);
        showNotification('Durum değiştirilirken bir hata oluştu.');
    }
}

function editProduct(productId: string) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const adminContent = document.getElementById('admin-content');
    if (!adminContent) return;

    adminContent.innerHTML = `
        <div class="admin-form">
            <h3>Ürün Düzenle: ${product.name}</h3>
            <form id="edit-product-form">
                <input type="hidden" name="id" value="${product.id}">
                <div class="form-group">
                    <label>Ürün Adı:</label>
                    <input type="text" name="name" value="${product.name}" required>
                </div>
                <div class="form-group">
                    <label>Fiyat (₺):</label>
                    <input type="number" name="price" step="0.01" value="${product.price}" required>
                </div>
                <div class="form-group">
                    <label>Kategori:</label>
                    <select name="category" required>
                        <option value="kitchen" ${product.category === 'kitchen' ? 'selected' : ''}>Evye Bataryası</option>
                        <option value="bathroom" ${product.category === 'bathroom' ? 'selected' : ''}>Banyo Bataryası</option>
                        <option value="shower" ${product.category === 'shower' ? 'selected' : ''}>Duş Sistemi</option>
                        <option value="accessories" ${product.category === 'accessories' ? 'selected' : ''}>Aksesuarlar</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Ürün Resmi (değiştirmek için yeni resim seçin):</label>
                    <input type="file" name="imageFile" accept="image/*">
                    <div class="image-preview" id="image-preview">
                        <img src="${product.image}" alt="Mevcut Resim">
                    </div>
                </div>
                <div class="form-group">
                    <label>Kısa Açıklama:</label>
                    <textarea name="description" required>${product.description}</textarea>
                </div>
                <div class="form-group">
                    <label>Detaylı Açıklama:</label>
                    <textarea name="detailedDescription">${product.detailedDescription || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Stok Miktarı:</label>
                    <input type="number" name="stock" value="${product.stock || 0}">
                </div>
                <div class="form-group">
                    <label>Durum:</label>
                    <select name="isActive">
                        <option value="true" ${product.isActive ? 'selected' : ''}>Aktif</option>
                        <option value="false" ${!product.isActive ? 'selected' : ''}>Pasif</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Malzeme:</label>
                    <input type="text" name="material" value="${product.specifications?.material || ''}">
                </div>
                <div class="form-group">
                    <label>Kaplama:</label>
                    <input type="text" name="finish" value="${product.specifications?.finish || ''}">
                </div>
                <div class="form-group">
                    <label>Boyutlar:</label>
                    <input type="text" name="dimensions" value="${product.specifications?.dimensions || ''}">
                </div>
                <div class="form-group">
                    <label>Garanti:</label>
                    <input type="text" name="warranty" value="${product.specifications?.warranty || ''}">
                </div>
                <div class="form-group">
                    <label>Özellikler (virgülle ayırın):</label>
                    <input type="text" name="features" value="${product.specifications?.features?.join(', ') || ''}">
                </div>
                <div class="form-actions">
                    <button type="submit" class="admin-btn">Güncelle</button>
                    <button type="button" onclick="showProductManagement()" class="admin-btn secondary">İptal</button>
                </div>
            </form>
        </div>
    `;

    const form = document.getElementById('edit-product-form') as HTMLFormElement;
    form.addEventListener('submit', handleEditProduct);
    
    const imageInput = form.querySelector('input[name="imageFile"]');
    const imagePreview = form.querySelector('#image-preview');
    imageInput?.addEventListener('change', (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file && imagePreview) {
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.innerHTML = `<img src="${e.target?.result}" alt="Yeni Resim Önizlemesi">`;
            }
            reader.readAsDataURL(file);
        }
    });
}

async function handleEditProduct(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const productId = formData.get('id') as string;
    if (!productId) {
        console.error("No product ID found in edit form");
        showNotification("Hata: Ürün kimliği bulunamadı.");
        return;
    }
    const imageFile = (form.elements.namedItem('imageFile') as HTMLInputElement).files?.[0];

    const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    submitButton.disabled = true;
    submitButton.textContent = 'Güncelleniyor...';

    try {
        const productRef = doc(db, "products", productId);
        const originalProduct = products.find(p => p.id === productId);
        if (!originalProduct) throw new Error("Product not found in local cache");

        let imageUrl = originalProduct.image; 
        if (imageFile) {
            imageUrl = await uploadProductImage(imageFile); 
        }

        const updatedProductData = {
            name: formData.get('name') as string,
            price: parseFloat(formData.get('price') as string),
            image: imageUrl,
            description: formData.get('description') as string,
            category: formData.get('category') as string,
            detailedDescription: formData.get('detailedDescription') as string || undefined,
            stock: parseInt(formData.get('stock') as string) || 0,
            isActive: formData.get('isActive') === 'true',
            updatedAt: new Date().toISOString(),
            specifications: {
                material: formData.get('material') as string || undefined,
                finish: formData.get('finish') as string || undefined,
                dimensions: formData.get('dimensions') as string || undefined,
                warranty: formData.get('warranty') as string || undefined,
                features: formData.get('features') as string ? (formData.get('features') as string).split(',').map(f => f.trim()) : undefined
            }
        };
        
        await updateDoc(productRef, updatedProductData);
        
        showNotification('Ürün başarıyla güncellendi!');
        await loadProducts();
        showProductManagement();
    } catch (error) {
        console.error("Error updating product:", error);
        showNotification('Ürün güncellenirken bir hata oluştu.');
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = 'Güncelle';
    }
}

async function deleteProduct(productId: string) {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return;
    
    try {
        await deleteDoc(doc(db, "products", productId));
        showNotification('Ürün başarıyla silindi!');
        await loadProducts();
        showProductManagement();
    } catch (error) {
        console.error("Error deleting product:", error);
        showNotification("Ürün silinirken bir hata oluştu.");
    }
}

async function showAdminManagement() {
    const adminContent = document.getElementById('admin-content');
    if (!adminContent) return;

    adminContent.innerHTML = `
        <div class="admin-form">
            <h3>Admin Yönetimi</h3>
            <p>Yeni admin eklemek için kullanıcının email adresini girin:</p>
            <form id="add-admin-form">
                <div class="form-group">
                    <label>Email Adresi:</label>
                    <input type="email" name="email" required placeholder="user@example.com">
                </div>
                <div class="form-actions">
                    <button type="submit" class="admin-btn">Admin Yap</button>
                    <button type="button" onclick="showAdminPanel()" class="admin-btn secondary">Geri Dön</button>
                </div>
            </form>
            
            <div class="admin-list-container">
                <h4>Mevcut Adminler</h4>
                <div id="admin-list-loading">Yükleniyor...</div>
                <ul id="admin-list" class="admin-list">
                    <!-- Admin list will be populated here -->
                </ul>
            </div>
        </div>
    `;

    const form = document.getElementById('add-admin-form') as HTMLFormElement;
    form.addEventListener('submit', handleAddAdmin);

    // Load and display the list of admins
    try {
        const listAdmins = httpsCallable(functions, 'listAdmins');
        const result: any = await listAdmins();
        const adminEmails = result.data.emails || [];
        
        const adminListEl = document.getElementById('admin-list');
        const loadingEl = document.getElementById('admin-list-loading');

        if (loadingEl) loadingEl.style.display = 'none';

        if (adminListEl) {
            if (adminEmails.length === 0) {
                adminListEl.innerHTML = '<li>Mevcut admin bulunmamaktadır.</li>';
            } else {
                adminListEl.innerHTML = adminEmails.map((email: string) => `
                    <li>
                        <span>${email}</span>
                        ${email !== currentUser?.email ? `<button class="admin-btn small danger" onclick="handleRemoveAdmin('${email}')">Kaldır</button>` : '(Siz)'}
                    </li>
                `).join('');
            }
        }
    } catch (error: any) {
        console.error('Error fetching admin list:', error);
        showNotification(`Hata: ${error.message}`);
        const loadingEl = document.getElementById('admin-list-loading');
        if (loadingEl) loadingEl.textContent = 'Admin listesi yüklenemedi.';
    }
}

async function handleRemoveAdmin(email: string) {
    if (!confirm(`${email} kullanıcısının admin yetkisini kaldırmak istediğinizden emin misiniz?`)) {
        return;
    }

    try {
        const removeAdminRole = httpsCallable(functions, 'removeAdminRole');
        await removeAdminRole({ email });
        showNotification(`${email} artık admin değil.`);
        showAdminManagement(); // Refresh the list
    } catch (error: any) {
        console.error('Error removing admin:', error);
        showNotification(`Hata: ${error.message}`);
    }
}

function handleAddAdmin(event: Event) {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const email = formData.get('email') as string;
    
    makeUserAdmin(email);
    form.reset();
}

// Make functions available globally
(window as any).showProductDetail = showProductDetail;
(window as any).showAdminPanel = showAdminPanel;
(window as any).showAddProductForm = showAddProductForm;
(window as any).handleAddProduct = handleAddProduct;
(window as any).showProductManagement = showProductManagement;
(window as any).editProduct = editProduct;
(window as any).deleteProduct = deleteProduct;
(window as any).makeUserAdmin = makeUserAdmin;
(window as any).handleRemoveAdmin = handleRemoveAdmin;
(window as any).filterProducts = filterProducts;
(window as any).toggleProductStatus = toggleProductStatus;

async function uploadProductImage(file: File): Promise<string> {
    const filePath = `products/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, filePath);

    showNotification('Resim yükleniyor, lütfen bekleyin...');
    
    try {
        const uploadTask = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(uploadTask.ref);
        showNotification('Resim başarıyla yüklendi!');
        return downloadURL;
    } catch (error) {
        console.error("Error uploading image: ", error);
        showNotification('Resim yüklenirken bir hata oluştu.');
        throw error;
    }
}

async function loadProducts() {
    try {
        const productsCollection = collection(db, "products");
        const q = query(productsCollection, orderBy("name"));
        const productsSnapshot = await getDocs(q);
        products = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
        console.log('Products loaded from Firestore:', products.length);
    } catch (error) {
        console.error("Error loading products from Firestore:", error);
        showNotification("Ürünler yüklenirken bir hata oluştu.");
        products = [];
    }
}

// Main App Initialization
async function initializeAppAndRender() {
    console.log("Initializing app...");
    await loadProducts();

    // Consolidate all startup logic here
    initRouter();
    initCarousel();
    setupSmoothScroll();
    setupCartIconHandler();
    setupStaticAddToCartButtons();

    // Initial route handling based on current URL
    const path = window.location.pathname;
    const route = routes[path] || showHomeSections;
    route();
    
    console.log("App Initialized.");
}

document.addEventListener('DOMContentLoaded', initializeAppAndRender);

// Make functions globally available
(window as any).deleteProduct = deleteProduct;
(window as any).editProduct = editProduct;
(window as any).changeSlide = changeSlide;
(window as any).currentSlide = currentSlide;
(window as any).addToCartById = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
        addToCart(product);
    } else {
        console.error('Product not found for ID:', productId);
        showNotification('Ürün bulunamadı.');
    }
};