document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    renderUsers();
    renderProducts();
    renderOrders();
    renderMessages();
    renderAdminProfile();
    setupAdminPhotoUpload();
    setupProductPhotoUpload();
});

let deleteAction = null;

function customConfirm(action) {
    deleteAction = action;
    const modal = document.getElementById('confirmModal');
    if (!modal) return;
    modal.classList.add('active');
    setTimeout(() => {
        document.getElementById('confirmModalContent').style.opacity = '1';
        document.getElementById('confirmModalContent').style.transform = 'translateY(0)';
    }, 10);
    
    document.getElementById('confirmYesBtn').onclick = () => {
        if(deleteAction) deleteAction();
        closeConfirmModal();
    };
}

function closeConfirmModal() {
    const content = document.getElementById('confirmModalContent');
    if (content) {
        content.style.opacity = '0';
        content.style.transform = 'translateY(-50px)';
    }
    setTimeout(() => {
        const modal = document.getElementById('confirmModal');
        if(modal) modal.classList.remove('active');
        deleteAction = null;
    }, 300);
}

function switchTab(tabId) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(tabId + 'Section').classList.add('active');
    event.currentTarget.classList.add('active');
}

// Users
async function renderUsers() {
    const currentUser = JSON.parse(localStorage.getItem('nexus_profile'));
    const isSuperAdmin = currentUser && currentUser.role === 'superadmin';
    
    try {
        const snapshot = await db.collection('users').get();
        let allUsers = snapshot.docs.map(doc => doc.data());
        
        let customers = allUsers.filter(u => u.role !== 'admin' && u.role !== 'superadmin');
        let admins = allUsers.filter(u => u.role === 'admin' || u.role === 'superadmin');
        
        if (isSuperAdmin) {
            const btn = document.getElementById('addAdminBtn');
            if(btn) btn.style.display = 'inline-block';
            
            const adminContainer = document.getElementById('adminsTableContainer');
            if (adminContainer) adminContainer.style.display = 'block';
            
            const adminTbody = document.getElementById('adminsTableBody');
            if (adminTbody) {
                adminTbody.innerHTML = admins.map(u => `
                    <tr>
                        <td>${u.name}</td>
                        <td>${u.email}</td>
                        <td><span style="background: var(--accent-gradient); color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem;">${u.role === 'superadmin' ? 'SUPER ADMIN' : 'ADMIN'}</span></td>
                        <td>${u.phone || 'N/A'}</td>
                        <td>
                            <button class="action-btn delete" onclick="deleteUser('${u.email}')"><i data-lucide="trash-2" width="18"></i></button>
                        </td>
                    </tr>
                `).join('');
            }
        } else {
            const btn = document.getElementById('addAdminBtn');
            if(btn) btn.style.display = 'none';
            
            const adminContainer = document.getElementById('adminsTableContainer');
            if (adminContainer) adminContainer.style.display = 'none';
        }

        const tbody = document.getElementById('usersTableBody');
        if (tbody) {
            tbody.innerHTML = customers.map(u => `
                <tr>
                    <td>${u.name}</td>
                    <td>${u.email}</td>
                    <td>${u.role || 'user'}</td>
                    <td>${u.phone || 'N/A'}</td>
                    <td>
                        <button class="action-btn delete" onclick="deleteUser('${u.email}')"><i data-lucide="trash-2" width="18"></i></button>
                    </td>
                </tr>
            `).join('');
        }
        
        lucide.createIcons();
    } catch(err) { console.error('Error fetching users', err); }
}

function showAddAdminModal() {
    document.getElementById('adminForm').reset();
    document.getElementById('adminModal').classList.add('active');
}

function closeAdminModal() {
    document.getElementById('adminModal').classList.remove('active');
}

async function saveAdmin(e) {
    e.preventDefault();
    const currentUser = JSON.parse(localStorage.getItem('nexus_profile'));
    if (!currentUser || currentUser.role !== 'superadmin') {
        alert("Unauthorized. Only Super Admin can add new admins.");
        return;
    }
    
    const email = document.getElementById('adminEmail').value;
    
    try {
        const docRef = await db.collection('users').doc(email).get();
        if (docRef.exists) {
            alert("Email already exists.");
            return;
        }
        
        const plainPassword = document.getElementById('adminPass').value;
        const hashedPassword = typeof CryptoJS !== 'undefined' ? CryptoJS.SHA256(plainPassword).toString() : plainPassword;
        
        await db.collection('users').doc(email).set({
            name: document.getElementById('adminName').value,
            email: email,
            password: hashedPassword,
            role: 'admin',
            phone: 'N/A',
            address: 'N/A',
            photo: null
        });
        
        closeAdminModal();
        renderUsers();
    } catch(err) { console.error('Error saving admin', err); }
}

async function deleteUser(email) {
    const currentUser = JSON.parse(localStorage.getItem('nexus_profile'));
    const isSuperAdmin = currentUser && currentUser.role === 'superadmin';
    
    if (email === currentUser.email) {
        alert("You cannot delete your own account.");
        return;
    }
    
    try {
        const targetDoc = await db.collection('users').doc(email).get();
        if (targetDoc.exists) {
            const targetUser = targetDoc.data();
            if (targetUser.role === 'superadmin') {
                alert("Cannot delete a superadmin account.");
                return;
            }
            if (targetUser.role === 'admin' && !isSuperAdmin) {
                alert("You do not have permission to delete admin accounts.");
                return;
            }
            customConfirm(async () => {
                await db.collection('users').doc(email).delete();
                renderUsers();
            });
        }
    } catch(err) { console.error('Error deleting user', err); }
}

// Products
let currentProductImage = null;

function setupProductPhotoUpload() {
    const photoInput = document.getElementById('prodImageUpload');
    if (photoInput) {
        photoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 500; // Slightly larger for products
                        const MAX_HEIGHT = 500;
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
                        
                        currentProductImage = canvas.toDataURL('image/jpeg', 0.8);
                        const preview = document.getElementById('prodImagePreview');
                        if (preview) {
                            preview.src = currentProductImage;
                            preview.style.display = 'block';
                        }
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

async function renderProducts() {
    try {
        const snapshot = await db.collection('products').get();
        const products = snapshot.docs.map(doc => doc.data());
        const tbody = document.getElementById('productsTableBody');
        tbody.innerHTML = products.map(p => `
            <tr>
                <td><img src="${p.image}" width="40" height="40" style="border-radius:4px; object-fit:cover;"></td>
                <td>${p.title}</td>
                <td>${p.category}</td>
                <td>$${parseFloat(p.price).toFixed(2)}</td>
                <td>
                    <button class="action-btn" onclick='editProduct(${JSON.stringify(p).replace(/'/g, "&#39;")})'><i data-lucide="edit" width="18"></i></button>
                    <button class="action-btn delete" onclick="deleteProduct('${p.id}')"><i data-lucide="trash-2" width="18"></i></button>
                </td>
            </tr>
        `).join('');
        lucide.createIcons();
    } catch(err) { console.error('Error fetching products', err); }
}

function showAddProductModal() {
    document.getElementById('productForm').reset();
    document.getElementById('prodId').value = '';
    currentProductImage = null;
    document.getElementById('prodImagePreview').style.display = 'none';
    document.getElementById('prodImagePreview').src = '';
    
    document.getElementById('productModalTitle').innerText = 'Add Product';
    document.getElementById('productModal').classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
}

function editProduct(product) {
    document.getElementById('prodId').value = product.id;
    currentProductImage = product.image;
    
    const preview = document.getElementById('prodImagePreview');
    if (preview) {
        preview.src = currentProductImage;
        preview.style.display = 'block';
    }
    
    document.getElementById('prodTitle').value = product.title;
    document.getElementById('prodCategory').value = product.category;
    document.getElementById('prodPrice').value = product.price;
    document.getElementById('prodDesc').value = product.description;
    
    document.getElementById('productModalTitle').innerText = 'Edit Product';
    document.getElementById('productModal').classList.add('active');
}

async function saveProduct(e) {
    e.preventDefault();
    
    if (!currentProductImage) {
        alert("Please upload a product image.");
        return;
    }
    
    const id = document.getElementById('prodId').value;
    const prodId = id ? id : Date.now().toString();
    const newProduct = {
        id: prodId,
        image: currentProductImage,
        title: document.getElementById('prodTitle').value,
        category: document.getElementById('prodCategory').value,
        price: parseFloat(document.getElementById('prodPrice').value),
        description: document.getElementById('prodDesc').value
    };
    
    try {
        await db.collection('products').doc(prodId.toString()).set(newProduct);
        closeProductModal();
        renderProducts();
    } catch(err) { console.error('Error saving product', err); }
}

function deleteProduct(id) {
    customConfirm(async () => {
        try {
            await db.collection('products').doc(id.toString()).delete();
            renderProducts();
        } catch(err) { console.error('Error deleting product', err); }
    });
}

// Orders
async function renderOrders() {
    try {
        const ordersSnap = await db.collection('orders').get();
        const orders = ordersSnap.docs.map(doc => doc.data());
        
        const usersSnap = await db.collection('users').get();
        const users = usersSnap.docs.map(doc => doc.data());
        
        const tbody = document.getElementById('ordersTableBody');
        tbody.innerHTML = orders.reverse().map(o => {
            const user = users.find(u => u.email === o.userEmail);
            const userName = user ? user.name : 'Unknown User';
            
            const itemsList = o.items ? o.items.map(i => `
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 5px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <img src="${i.image}" style="width: 30px; height: 30px; object-fit: cover; border-radius: 4px;">
                        <span>${i.title} (x${i.quantity})</span>
                    </div>
                    <span style="font-weight: 600;">$${(i.price * i.quantity).toFixed(2)}</span>
                </div>
            `).join('') : 'No items';
            
            return `
            <tr>
                <td>${o.id}</td>
                <td>
                    <strong>${userName}</strong><br>
                    <small style="color: var(--text-secondary);">${o.userEmail}</small>
                </td>
                <td style="font-size: 0.9rem;">${itemsList}</td>
                <td>${o.date}</td>
                <td>$${parseFloat(o.total).toFixed(2)}</td>
                <td>
                    <select onchange="updateOrderStatus('${o.id}', this.value)" style="background:rgba(0,0,0,0.3); color:var(--text-primary); border:1px solid var(--border-color); padding:5px; border-radius:4px; outline:none;">
                        <option value="Pending" ${o.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
                <td>
                    <button class="action-btn delete" onclick="deleteOrder('${o.id}')"><i data-lucide="trash-2" width="18"></i></button>
                </td>
            </tr>
        `}).join('');
        lucide.createIcons();
    } catch(err) { console.error('Error fetching orders', err); }
}

async function updateOrderStatus(id, newStatus) {
    try {
        await db.collection('orders').doc(id.toString()).update({ status: newStatus });
    } catch(err) { console.error('Error updating order status', err); }
}

function deleteOrder(id) {
    customConfirm(async () => {
        try {
            await db.collection('orders').doc(id.toString()).delete();
            renderOrders();
        } catch(err) { console.error('Error deleting order', err); }
    });
}

// Messages
async function renderMessages() {
    try {
        const snapshot = await db.collection('messages').get();
        const messages = snapshot.docs.map(doc => doc.data());
        
        const tbody = document.getElementById('messagesTableBody');
        if (tbody) {
            tbody.innerHTML = messages.reverse().map(m => `
                <tr>
                    <td style="white-space: nowrap;">${m.date}</td>
                    <td>${m.name}</td>
                    <td><a href="mailto:${m.email}" style="color: var(--accent-color); text-decoration: none;">${m.email}</a></td>
                    <td>${m.phone || 'N/A'}</td>
                    <td><strong>${m.subject}</strong></td>
                    <td style="max-width: 300px; white-space: normal; word-wrap: break-word;">${m.message}</td>
                    <td>
                        <button class="action-btn delete" onclick="deleteMessage('${m.id}')"><i data-lucide="trash-2" width="18"></i></button>
                    </td>
                </tr>
            `).join('');
            lucide.createIcons();
        }
    } catch(err) { console.error('Error fetching messages', err); }
}

function deleteMessage(id) {
    customConfirm(async () => {
        try {
            await db.collection('messages').doc(id.toString()).delete();
            renderMessages();
        } catch(err) { console.error('Error deleting message', err); }
    });
}

// Admin Profile
let currentAdminPhotoData = null;

function renderAdminProfile() {
    const profile = JSON.parse(localStorage.getItem('nexus_profile'));
    if (!profile) return;
    
    document.getElementById('adminProfileNameDisplay').innerText = profile.name;
    document.getElementById('adminProfileEmailDisplay').innerText = profile.email;
    
    document.getElementById('adminProfileName').value = profile.name;
    document.getElementById('adminProfilePhone').value = profile.phone || '';
    
    if (profile.photo) {
        currentAdminPhotoData = profile.photo;
        document.getElementById('adminProfileImg').src = profile.photo;
        document.getElementById('adminProfileImg').style.display = 'block';
        document.getElementById('adminProfileIcon').style.display = 'none';
    }
}

function setupAdminPhotoUpload() {
    const photoInput = document.getElementById('adminProfilePhotoInput');
    if (photoInput) {
        photoInput.addEventListener('change', function(e) {
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
                        
                        currentAdminPhotoData = canvas.toDataURL('image/jpeg', 0.8);
                        document.getElementById('adminProfileImg').src = currentAdminPhotoData;
                        document.getElementById('adminProfileImg').style.display = 'block';
                        document.getElementById('adminProfileIcon').style.display = 'none';
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
}

async function saveAdminProfile(e) {
    e.preventDefault();
    const profile = JSON.parse(localStorage.getItem('nexus_profile'));
    if (!profile) return;
    
    const newName = document.getElementById('adminProfileName').value;
    const newPhone = document.getElementById('adminProfilePhone').value;
    
    profile.name = newName;
    profile.phone = newPhone;
    if (currentAdminPhotoData) {
        profile.photo = currentAdminPhotoData;
    }
    
    // Update active session locally
    localStorage.setItem('nexus_profile', JSON.stringify(profile));
    
    // Update main database in Firestore
    try {
        await db.collection('users').doc(profile.email).set({
            name: newName,
            phone: newPhone,
            photo: currentAdminPhotoData || profile.photo
        }, { merge: true });
        
        renderAdminProfile();
        renderUsers();
        alert('Admin profile updated successfully!');
    } catch(err) {
        console.error('Error updating admin profile', err);
        alert('Failed to update admin profile.');
    }
}
