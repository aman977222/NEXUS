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
    
    // Disable submit button / show status
    const submitBtn = e ? e.target.querySelector('button[type="submit"]') : null;
    const originalBtnText = submitBtn ? submitBtn.innerText : "";
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "Logging in...";
    }
    if (errorDiv) errorDiv.style.display = 'none';

    try {
        const userDoc = await db.collection('users').doc(email).get();
        if (userDoc.exists) {
            const user = userDoc.data();
            
            // Bypass Firebase Auth for admins to prevent lockout
            if (user.role === 'admin' || user.role === 'superadmin') {
                const hashedPassword = typeof CryptoJS !== 'undefined' ? CryptoJS.SHA256(password).toString() : password;
                if (user.password === hashedPassword || user.password === password) {
                    localStorage.setItem('nexus_auth', 'true');
                    localStorage.setItem('nexus_profile', JSON.stringify(user));
                    window.location.href = 'admin.html';
                    return;
                } else {
                    throw new Error('User not found or wrong password');
                }
            }

            // Sign in with Firebase Auth to check email verification
            const authResult = await firebase.auth().signInWithEmailAndPassword(email, password);
            const fbUser = authResult.user;

            if (!fbUser.emailVerified) {
                // Send another verification email
                await fbUser.sendEmailVerification();
                throw new Error("Apka Email id verified nahi hai! Ek naya verification link aapke mail par send kiya gaya hai. Kripya use verify karein.");
            }

            const hashedPassword = typeof CryptoJS !== 'undefined' ? CryptoJS.SHA256(password).toString() : password;
            if (user.password === hashedPassword || user.password === password) {
                localStorage.setItem('nexus_auth', 'true');
                localStorage.setItem('nexus_profile', JSON.stringify(user));
                window.location.href = 'profile.html';
                return;
            } else {
                throw new Error('User not found or wrong password');
            }
        }
        
        throw new Error('User not found or wrong password');
    } catch (err) {
        console.error(err);
        if (errorDiv) {
            errorDiv.style.display = 'block';
            errorDiv.innerText = err.message || 'Error logging in. Check connection.';
        } else {
            alert(err.message || 'Error logging in. Check connection.');
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = originalBtnText;
        }
    }
}

async function register(e) {
    if (e) e.preventDefault();
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const address = document.getElementById('regAddress').value;
    const password = document.getElementById('regPassword').value;
    
    const submitBtn = e ? e.target.querySelector('button[type="submit"]') : null;
    const originalBtnText = submitBtn ? submitBtn.innerText : "";
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "Creating Account...";
    }

    try {
        const userDoc = await db.collection('users').doc(email).get();
        if (userDoc.exists) {
            alert('User with this email already exists!');
            return;
        }
        
        // 1. Create account in Firebase Auth
        const authResult = await firebase.auth().createUserWithEmailAndPassword(email, password);
        
        // 2. Send Verification Email
        await authResult.user.sendEmailVerification();

        const newUser = {
            name, email, phone, address, 
            password: typeof CryptoJS !== 'undefined' ? CryptoJS.SHA256(password).toString() : password,
            photo: regPhotoData || null,
            role: 'user'
        };
        
        // 3. Save to Firestore
        await db.collection('users').doc(email).set(newUser);
        
        alert('Registration successful! 🎉 A verification email has been sent to your inbox. Please check your inbox (or spam folder) and verify your email before logging in.');
        if (typeof showLogin === 'function') {
            showLogin();
        } else {
            window.location.href = 'auth.html';
        }
    } catch (err) {
        console.error(err);
        alert(err.message || 'Error registering user.');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = originalBtnText;
        }
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
