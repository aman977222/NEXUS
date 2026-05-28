const isLoggedIn = localStorage.getItem('nexus_auth') === 'true';

// Setup photo handling for registration
let regPhotoData = null;
document.addEventListener('DOMContentLoaded', () => {
    // Admin is now managed securely via Firebase.
    // No hardcoded credentials here.
    const regPhotoInput = document.getElementById('regPhoto');
    if (regPhotoInput) {
        regPhotoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        const MAX = 300;
                        let w = img.width, h = img.height;
                        if (w > h) { if (w > MAX) { h *= MAX/w; w = MAX; } }
                        else { if (h > MAX) { w *= MAX/h; h = MAX; } }
                        canvas.width = w; canvas.height = h;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, w, h);
                        regPhotoData = canvas.toDataURL('image/jpeg', 0.8);
                    };
                    img.src = event.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    updateNavForAuth();
});

function updateNavForAuth() {
    const loginBtn = document.querySelector('.auth-login-btn');
    const signupBtn = document.querySelector('.auth-signup-btn');
    const logoutBtn = document.querySelector('.auth-logout-btn');
    
    const navLinks = document.querySelector('.nav-links');
    let profileLink = null;
    if (navLinks) {
        profileLink = Array.from(navLinks.querySelectorAll('a')).find(a => {
            const href = a.getAttribute('href');
            return href === 'profile.html' || href === 'admin.html';
        });
    }

    if (isLoggedIn) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (signupBtn) signupBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (profileLink) {
            profileLink.style.display = 'inline-block';
            const profile = JSON.parse(localStorage.getItem('nexus_profile'));
            if (profile && (profile.role === 'admin' || profile.role === 'superadmin')) {
                profileLink.setAttribute('href', 'admin.html');
            } else {
                profileLink.setAttribute('href', 'profile.html');
            }
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (signupBtn) signupBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (profileLink) {
            profileLink.style.display = 'none';
            profileLink.setAttribute('href', 'profile.html');
        }
    }
}

function logout() {
    localStorage.setItem('nexus_auth', 'false');
    localStorage.removeItem('nexus_profile');
    window.location.href = 'index.html';
}

async function login(e) {
    if (e) e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    try {
        const userDoc = await db.collection('users').doc(email).get();
        if (userDoc.exists) {
            const user = userDoc.data();
            const hashedPassword = typeof CryptoJS !== 'undefined' ? CryptoJS.SHA256(password).toString() : password;
            // Also allow plain text check for older users before we added hashing
            if (user.password === hashedPassword || user.password === password) {
                localStorage.setItem('nexus_auth', 'true');
                localStorage.setItem('nexus_profile', JSON.stringify(user));
                
                if (user.role === 'admin' || user.role === 'superadmin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'profile.html';
                }
                return;
            }
        }
        
        if (errorDiv) {
            errorDiv.style.display = 'block';
            errorDiv.innerText = 'User not found or wrong password';
        } else {
            alert('User not found or wrong password');
        }
    } catch (err) {
        console.error(err);
        alert('Error logging in. Check connection.');
    }
}

async function register(e) {
    if (e) e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const address = document.getElementById('regAddress').value;
    const password = document.getElementById('regPassword').value;
    
    try {
        const userDoc = await db.collection('users').doc(email).get();
        if (userDoc.exists) {
            alert('User with this email already exists!');
            return;
        }
        
        const newUser = {
            name, email, phone, address, 
            password: typeof CryptoJS !== 'undefined' ? CryptoJS.SHA256(password).toString() : password,
            photo: regPhotoData || null,
            role: 'user'
        };
        
        await db.collection('users').doc(email).set(newUser);
        
        alert('Registration successful! Please login.');
        if (typeof showLogin === 'function') {
            showLogin();
        } else {
            window.location.href = 'auth.html';
        }
    } catch (err) {
        console.error(err);
        alert('Error registering user.');
    }
}

// Redirects
const currentPath = window.location.pathname.toLowerCase();
if ((currentPath.endsWith('profile.html') || currentPath.endsWith('contact.html')) && !isLoggedIn) {
    window.location.href = 'auth.html';
}
if (currentPath.endsWith('auth.html') && isLoggedIn) {
    const profile = JSON.parse(localStorage.getItem('nexus_profile'));
    if (profile && (profile.role === 'admin' || profile.role === 'superadmin')) {
        window.location.href = 'admin.html';
    } else {
        window.location.href = 'profile.html';
    }
}
if (currentPath.endsWith('admin.html')) {
    const profile = JSON.parse(localStorage.getItem('nexus_profile'));
    if (!isLoggedIn || !profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
        window.location.href = 'index.html';
    }
}
