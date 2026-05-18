// Product Data
const defaultProducts = [
    {
        id: 1,
        title: "Nexus Pro Wireless Headphones",
        category: "Audio",
        price: 299.99,
        image: "assets/hero_headphones_1779082538361.png",
        description: "Immersive sound with active noise cancellation."
    },
    {
        id: 2,
        title: "Chronos Smartwatch Elite",
        category: "Wearables",
        price: 199.99,
        image: "assets/product_smartwatch_1779082557953.png",
        description: "Premium fitness tracking and notifications."
    },
    {
        id: 3,
        title: "Lumina Mirrorless Camera",
        category: "Cameras",
        price: 899.99,
        image: "assets/product_camera_1779082572903.png",
        description: "Capture the world in stunning 4K detail."
    },
    {
        id: 4,
        title: "Apex Mechanical Keyboard",
        category: "Accessories",
        price: 149.99,
        image: "assets/product_keyboard_1779082589531.png",
        description: "Tactile feedback with customizable RGB."
    }
];

let products = [];

async function initProducts() {
    try {
        const snapshot = await db.collection('products').get();
        if (snapshot.empty) {
            for (let p of defaultProducts) {
                await db.collection('products').doc(p.id.toString()).set(p);
            }
            products = [...defaultProducts];
        } else {
            products = snapshot.docs.map(doc => doc.data());
        }
        renderProducts();
        updateCartUI();
    } catch(err) {
        console.error('Error loading products from Firebase', err);
        products = [...defaultProducts]; // Fallback
        renderProducts();
        updateCartUI();
    }
}

// State
let __currentUserForCart = JSON.parse(localStorage.getItem('nexus_profile'));
let cartKey = __currentUserForCart && __currentUserForCart.email ? 'nexus_cart_' + __currentUserForCart.email : 'nexus_cart_guest';
let cart = JSON.parse(localStorage.getItem(cartKey)) || [];

function saveCart() {
    localStorage.setItem(cartKey, JSON.stringify(cart));
}

// DOM Elements
const productGrid = document.getElementById('productGrid');
const cartBtn = document.getElementById('cartBtn');
const cartModal = document.getElementById('cartModal');
const closeCartBtn = document.getElementById('closeCart');
const cartOverlay = document.getElementById('cartOverlay');
const cartItemsContainer = document.getElementById('cartItems');
const cartCount = document.getElementById('cartCount');
const cartTotalValue = document.getElementById('cartTotalValue');

// Render Products
function renderProducts() {
    if (!productGrid) return;
    productGrid.innerHTML = '';
    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
            <img src="${product.image}" alt="${product.title}" class="product-image">
            <div class="product-category">${product.category}</div>
            <h3 class="product-title">${product.title}</h3>
            <div class="product-footer">
                <div class="product-price">$${product.price.toFixed(2)}</div>
                <button class="add-to-cart" onclick="addToCart(${product.id})" aria-label="Add to cart">
                    <i data-lucide="plus"></i>
                </button>
            </div>
        `;
        
        // Mouse tracking for hover effect
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });

        productGrid.appendChild(card);
    });
    // Re-initialize icons for newly added HTML
    lucide.createIcons();
}

// Cart Functions
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    saveCart();
    updateCartUI();
    
    // Visual feedback
    cartBtn.style.transform = 'scale(1.2)';
    setTimeout(() => {
        cartBtn.style.transform = 'scale(1)';
    }, 200);
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
}

function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart();
            updateCartUI();
        }
    }
}

function updateCartUI() {
    // Update count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCount) cartCount.textContent = totalItems;
    
    // Update Total
    const totalValue = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (cartTotalValue) cartTotalValue.textContent = `$${totalValue.toFixed(2)}`;
    
    // Render Items
    if (!cartItemsContainer) return;
    
    cartItemsContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="cart-empty">Your cart is empty.</p>';
        return;
    }
    
    cart.forEach(item => {
        const cartItemEl = document.createElement('div');
        cartItemEl.className = 'cart-item';
        cartItemEl.innerHTML = `
            <img src="${item.image}" alt="${item.title}" class="cart-item-img">
            <div class="cart-item-details">
                <div class="cart-item-title">${item.title}</div>
                <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                <div class="cart-item-actions">
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)"><i data-lucide="minus" width="14" height="14"></i></button>
                        <span>${item.quantity}</span>
                        <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)"><i data-lucide="plus" width="14" height="14"></i></button>
                    </div>
                    <button class="remove-item" onclick="removeFromCart(${item.id})"><i data-lucide="trash-2" width="18" height="18"></i></button>
                </div>
            </div>
        `;
        cartItemsContainer.appendChild(cartItemEl);
    });
    
    lucide.createIcons();
}

// Checkout
async function checkout() {
    if (!__currentUserForCart) {
        alert('Please login to checkout!');
        window.location.href = 'auth.html';
        return;
    }
    
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }
    
    const totalValue = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const newOrder = {
        id: 'NX-' + Math.floor(1000 + Math.random() * 9000),
        userEmail: __currentUserForCart.email,
        items: [...cart],
        total: totalValue,
        status: 'Pending',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
    
    try {
        await db.collection('orders').doc(newOrder.id).set(newOrder);
        cart = [];
        saveCart();
        updateCartUI();
        toggleCart();
        
        showOrderSuccessPopup(newOrder.id);
    } catch (err) {
        console.error('Checkout failed', err);
        alert('Failed to place order.');
    }
}

function showOrderSuccessPopup(orderId) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.background = 'rgba(0,0,0,0.7)';
    overlay.style.backdropFilter = 'blur(5px)';
    overlay.style.zIndex = '3000';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s';

    const modal = document.createElement('div');
    modal.style.background = 'var(--bg-color)';
    modal.style.border = '1px solid var(--border-color)';
    modal.style.padding = '2.5rem 2rem';
    modal.style.borderRadius = 'var(--radius-lg)';
    modal.style.textAlign = 'center';
    modal.style.maxWidth = '400px';
    modal.style.width = '90%';
    modal.style.transform = 'translateY(-50px)';
    modal.style.transition = 'transform 0.3s';
    modal.style.boxShadow = '0 20px 40px rgba(0,0,0,0.8)';

    modal.innerHTML = `
        <div style="width: 70px; height: 70px; border-radius: 50%; background: rgba(34, 197, 94, 0.2); color: #4ade80; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem auto;">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        </div>
        <h2 style="margin-bottom: 1rem; color: #4ade80; font-size: 1.8rem;">Order Placed!</h2>
        <p style="margin-bottom: 2rem; color: var(--text-secondary); font-size: 1.1rem; line-height: 1.5;">
            Order <strong style="color: white;">#${orderId}</strong> placed successfully!<br>Your order is seccusfilly placed and will be delivered in a few minutes.
        </p>
        <button class="cta-button" style="width: 100%; background: #4ade80; color: #000;" id="closeOrderPopupBtn">Continue</button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    setTimeout(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'translateY(0)';
    }, 10);

    document.getElementById('closeOrderPopupBtn').onclick = () => {
        overlay.style.opacity = '0';
        modal.style.transform = 'translateY(-50px)';
        setTimeout(() => {
            document.body.removeChild(overlay);
            if (window.location.pathname.endsWith('profile.html')) {
                window.location.reload();
            }
        }, 300);
    };
}

// Modal Toggle
function toggleCart() {
    if (cartModal) cartModal.classList.toggle('active');
}

if (cartBtn) cartBtn.addEventListener('click', toggleCart);
if (closeCartBtn) closeCartBtn.addEventListener('click', toggleCart);
if (cartOverlay) cartOverlay.addEventListener('click', toggleCart);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProducts);
} else {
    initProducts();
}

// Profile Edit Functions
const editProfileBtn = document.getElementById('editProfileBtn');
if (editProfileBtn) {
    const editProfileModal = document.getElementById('editProfileModal');
    const closeEditProfile = document.getElementById('closeEditProfile');
    const editProfileOverlay = document.getElementById('editProfileOverlay');
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    
    // Display Elements
    const headerName = document.getElementById('headerName');
    const headerEmail = document.getElementById('headerEmail');
    const detailName = document.getElementById('detailName');
    const detailEmail = document.getElementById('detailEmail');
    const detailPhone = document.getElementById('detailPhone');
    
    // Input Elements
    const inputName = document.getElementById('inputName');
    const inputEmail = document.getElementById('inputEmail');
    const inputPhone = document.getElementById('inputPhone');
    const inputAddress = document.getElementById('inputAddress');
    const inputPhoto = document.getElementById('inputPhoto');
    const detailAddress = document.getElementById('detailAddress');
    const profileAvatarImg = document.getElementById('profileAvatarImg');
    const defaultAvatarIcon = document.getElementById('defaultAvatarIcon');

    let currentPhotoData = null;

    if (inputPhoto) {
        inputPhoto.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 300;
                        const MAX_HEIGHT = 300;
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_WIDTH) {
                                height *= MAX_WIDTH / width;
                                width = MAX_WIDTH;
                            }
                        } else {
                            if (height > MAX_HEIGHT) {
                                width *= MAX_HEIGHT / height;
                                height = MAX_HEIGHT;
                            }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        currentPhotoData = canvas.toDataURL('image/jpeg', 0.8);
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Load from local storage if exists
    const savedProfile = JSON.parse(localStorage.getItem('nexus_profile'));
    if (savedProfile) {
        headerName.textContent = savedProfile.name;
        detailName.textContent = savedProfile.name;
        inputName.value = savedProfile.name;
        
        headerEmail.textContent = savedProfile.email;
        detailEmail.textContent = savedProfile.email;
        inputEmail.value = savedProfile.email;
        
        detailPhone.textContent = savedProfile.phone;
        inputPhone.value = savedProfile.phone;
        
        if (savedProfile.address) {
            detailAddress.textContent = savedProfile.address;
            inputAddress.value = savedProfile.address;
        }
        
        if (savedProfile.photo) {
            currentPhotoData = savedProfile.photo;
            if (profileAvatarImg) {
                profileAvatarImg.src = savedProfile.photo;
                profileAvatarImg.style.display = 'block';
            }
            if (defaultAvatarIcon) defaultAvatarIcon.style.display = 'none';
        }
        
        // Render Orders
        const orderHistoryList = document.getElementById('orderHistoryList');
        if (orderHistoryList) {
            db.collection('orders').where('userEmail', '==', savedProfile.email).get().then(snapshot => {
                const myOrders = snapshot.docs.map(doc => doc.data());
                
                if (myOrders.length === 0) {
                    orderHistoryList.innerHTML = '<p class="text-secondary">No orders placed yet.</p>';
                } else {
                    orderHistoryList.innerHTML = myOrders.reverse().map(order => {
                        const itemsDisplay = order.items ? order.items.map(i => `
                            <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
                                <img src="${i.image}" style="width: 30px; height: 30px; border-radius: 4px; object-fit: cover;">
                                <span style="font-size: 0.9rem; color: var(--text-secondary); flex-grow: 1;">${i.title} (x${i.quantity})</span>
                                <span style="font-size: 0.9rem; font-weight: 600;">$${(i.price * i.quantity).toFixed(2)}</span>
                            </div>
                        `).join('') : '';
    
                        return `
                        <div class="order-item" style="flex-direction: column; align-items: flex-start; gap: 10px;">
                            <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                                <div class="order-info">
                                    <h4>Order #${order.id}</h4>
                                    <span class="text-secondary">${order.date} - $${order.total.toFixed(2)}</span>
                                </div>
                                <div class="order-status ${order.status.toLowerCase()}">${order.status}</div>
                            </div>
                            <div style="width: 100%; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.1);">
                                <span style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-secondary);">Items</span>
                                ${itemsDisplay}
                            </div>
                        </div>
                    `}).join('');
                }
            }).catch(err => console.error('Error fetching orders', err));
        }
    }

    function toggleEditProfile() {
        editProfileModal.classList.toggle('active');
    }

    async function saveProfile() {
        const newProfile = {
            name: inputName.value,
            email: inputEmail.value,
            phone: inputPhone.value,
            address: inputAddress.value,
            photo: currentPhotoData
        };
        
        const savedProfile = JSON.parse(localStorage.getItem('nexus_profile'));
        if (savedProfile) {
            try {
                await db.collection('users').doc(savedProfile.email).set({
                    name: newProfile.name,
                    phone: newProfile.phone,
                    address: newProfile.address,
                    photo: newProfile.photo
                }, { merge: true });
                newProfile.password = savedProfile.password;
                newProfile.role = savedProfile.role;
                localStorage.setItem('nexus_profile', JSON.stringify(newProfile));
            } catch(err) { console.error('Error updating profile', err); }
        }
        
        // Update UI
        headerName.textContent = newProfile.name;
        detailName.textContent = newProfile.name;
        headerEmail.textContent = newProfile.email;
        detailEmail.textContent = newProfile.email;
        detailPhone.textContent = newProfile.phone;
        detailAddress.textContent = newProfile.address;
        
        if (newProfile.photo && profileAvatarImg) {
            profileAvatarImg.src = newProfile.photo;
            profileAvatarImg.style.display = 'block';
            if (defaultAvatarIcon) defaultAvatarIcon.style.display = 'none';
        }
        
        toggleEditProfile();
    }

    editProfileBtn.addEventListener('click', toggleEditProfile);
    closeEditProfile.addEventListener('click', toggleEditProfile);
    editProfileOverlay.addEventListener('click', toggleEditProfile);
    saveProfileBtn.addEventListener('click', saveProfile);
}

// Contact Form Submit
async function submitContactForm(e) {
    e.preventDefault();
    
    const isLoggedIn = localStorage.getItem('nexus_auth') === 'true';
    if (!isLoggedIn) {
        alert('Please login to send a message.');
        window.location.href = 'auth.html';
        return;
    }

    const name = document.getElementById('contactName').value;
    const email = document.getElementById('contactEmail').value;
    const phone = document.getElementById('contactPhone').value;
    const subject = document.getElementById('contactSubject').value;
    const message = document.getElementById('contactMessage').value;
    
    const messageObj = {
        id: Date.now(),
        name,
        email,
        phone,
        subject,
        message,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
    
    try {
        await db.collection('messages').doc(messageObj.id.toString()).set(messageObj);
        alert('Thank you for contacting us! We will get back to you soon.');
        document.getElementById('contactForm').reset();
        autoFillContactForm();
    } catch(err) {
        console.error('Error sending message', err);
        alert('Failed to send message.');
    }
}

function autoFillContactForm() {
    const contactName = document.getElementById('contactName');
    const contactEmail = document.getElementById('contactEmail');
    const contactPhone = document.getElementById('contactPhone');
    
    if (contactName && contactEmail) {
        const isLoggedIn = localStorage.getItem('nexus_auth') === 'true';
        const profile = JSON.parse(localStorage.getItem('nexus_profile'));
        
        if (isLoggedIn && profile) {
            contactName.value = profile.name || '';
            contactName.readOnly = true;
            contactEmail.value = profile.email || '';
            contactEmail.readOnly = true;
            
            if (contactPhone && profile.phone && profile.phone !== 'N/A') {
                contactPhone.value = profile.phone;
                contactPhone.readOnly = true;
            }
        }
    }
}

// Initialize autofill
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoFillContactForm);
} else {
    autoFillContactForm();
}
