/**
 * Spotify Clone - Authentication Module (Sign In & Registration)
 * Handles user login, new account registration, logout, form validations, & credential persistence
 */

export const authState = {
    isLoggedIn: true, // starts logged in by default with Alex Morgan
    currentUser: {
        name: "Alex Morgan",
        email: "alex.morgan@example.com",
        avatar: "./assesst/logo.png",
        tier: "Spotify Free",
        isPremium: false
    }
};

export function initAuthModule({ onLoginSuccess, onRegisterSuccess, onLogout, toast, navigate }) {
    const $ = (id) => document.getElementById(id);
    const $$ = (sel) => document.querySelectorAll(sel);

    let activeTab = "login"; // 'login' | 'register'

    // Form elements
    const loginForm = $("loginForm");
    const registerForm = $("registerForm");
    const loginTabBtn = $("authTabLogin");
    const registerTabBtn = $("authTabRegister");
    const switchPromptToReg = $("switchToRegisterPrompt");
    const switchPromptToLog = $("switchToLoginPrompt");

    // Inputs
    const loginEmail = $("loginEmailInput");
    const loginPass = $("loginPasswordInput");
    const regEmail = $("regEmailInput");
    const regPass = $("regPasswordInput");
    const regName = $("regNameInput");
    const regYear = $("regBirthYear");

    // Password visibility toggles
    const toggleLoginPassBtn = $("toggleLoginPass");
    const toggleRegPassBtn = $("toggleRegPass");

    function switchTab(tab) {
        activeTab = tab;
        if (tab === "login") {
            if (loginTabBtn) loginTabBtn.classList.add("active-auth-tab");
            if (registerTabBtn) registerTabBtn.classList.remove("active-auth-tab");
            if (loginForm) loginForm.style.display = "flex";
            if (registerForm) registerForm.style.display = "none";
        } else {
            if (registerTabBtn) registerTabBtn.classList.add("active-auth-tab");
            if (loginTabBtn) loginTabBtn.classList.remove("active-auth-tab");
            if (registerForm) registerForm.style.display = "flex";
            if (loginForm) loginForm.style.display = "none";
        }
    }

    if (loginTabBtn) loginTabBtn.addEventListener("click", () => switchTab("login"));
    if (registerTabBtn) registerTabBtn.addEventListener("click", () => switchTab("register"));
    if (switchPromptToReg) switchPromptToReg.addEventListener("click", (e) => {
        e.preventDefault();
        switchTab("register");
    });
    if (switchPromptToLog) switchPromptToLog.addEventListener("click", (e) => {
        e.preventDefault();
        switchTab("login");
    });

    // Password visibility toggle helpers
    if (toggleLoginPassBtn && loginPass) {
        toggleLoginPassBtn.addEventListener("click", () => {
            const isText = loginPass.type === "text";
            loginPass.type = isText ? "password" : "text";
            toggleLoginPassBtn.innerHTML = isText ? '<i class="fa-regular fa-eye"></i>' : '<i class="fa-regular fa-eye-slash"></i>';
        });
    }

    if (toggleRegPassBtn && regPass) {
        toggleRegPassBtn.addEventListener("click", () => {
            const isText = regPass.type === "text";
            regPass.type = isText ? "password" : "text";
            toggleRegPassBtn.innerHTML = isText ? '<i class="fa-regular fa-eye"></i>' : '<i class="fa-regular fa-eye-slash"></i>';
        });
    }

    // Social Auth click simulations
    $$(".social-auth-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const provider = btn.textContent.trim();
            btn.disabled = true;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Connecting to ${provider}...`;

            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML;
                
                // Successful social login
                authState.isLoggedIn = true;
                authState.currentUser = {
                    name: "Alex Morgan",
                    email: "alex.morgan@gmail.com",
                    avatar: "./assesst/logo.png",
                    tier: "Spotify Free",
                    isPremium: false
                };

                if (onLoginSuccess) onLoginSuccess(authState.currentUser);
                toast(`Connected via ${provider}! Welcome back.`, "fa-circle-check");
                navigate("home");
            }, 800);
        });
    });

    // Save original innerHTML of social buttons
    $$(".social-auth-btn").forEach(btn => {
        btn.dataset.originalHtml = btn.innerHTML;
    });

    // Log In Form Submission
    if (loginForm) {
        loginForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const email = loginEmail.value.trim();
            const pass = loginPass.value.trim();

            if (!email) {
                toast("Please enter your email or username", "fa-circle-exclamation");
                loginEmail.focus();
                return;
            }
            if (!pass || pass.length < 4) {
                toast("Please enter your password (minimum 4 characters)", "fa-circle-exclamation");
                loginPass.focus();
                return;
            }

            const loginBtn = $("loginSubmitBtn");
            loginBtn.disabled = true;
            loginBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Logging in...`;

            setTimeout(() => {
                loginBtn.disabled = false;
                loginBtn.innerHTML = "Log In";

                // Extract display name from email or use existing
                const displayName = email.includes("@") ? email.split("@")[0] : email;
                const formattedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

                authState.isLoggedIn = true;
                authState.currentUser = {
                    name: formattedName,
                    email: email.includes("@") ? email : `${email}@spotify-user.com`,
                    avatar: "./assesst/logo.png",
                    tier: "Spotify Free",
                    isPremium: false
                };

                loginForm.reset();
                if (onLoginSuccess) onLoginSuccess(authState.currentUser);
                toast(`Welcome back, ${formattedName}!`, "fa-circle-check");
                navigate("home");
            }, 750);
        });
    }

    // Register Form Submission
    if (registerForm) {
        registerForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const email = regEmail.value.trim();
            const pass = regPass.value.trim();
            const name = regName.value.trim() || (email.includes("@") ? email.split("@")[0] : "New Listener");

            if (!email || !email.includes("@")) {
                toast("Please enter a valid email address", "fa-circle-exclamation");
                regEmail.focus();
                return;
            }
            if (!pass || pass.length < 6) {
                toast("Password must be at least 6 characters long", "fa-circle-exclamation");
                regPass.focus();
                return;
            }
            if (regYear && regYear.value && parseInt(regYear.value, 10) > 2018) {
                toast("Please enter a valid birth year", "fa-circle-exclamation");
                regYear.focus();
                return;
            }

            const regBtn = $("registerSubmitBtn");
            regBtn.disabled = true;
            regBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...`;

            setTimeout(() => {
                regBtn.disabled = false;
                regBtn.innerHTML = "Sign Up";

                authState.isLoggedIn = true;
                authState.currentUser = {
                    name: name,
                    email: email,
                    avatar: "./assesst/logo.png",
                    tier: "Spotify Free",
                    isPremium: false
                };

                registerForm.reset();
                if (onRegisterSuccess) onRegisterSuccess(authState.currentUser);
                toast(`Welcome to Spotify, ${name}! Your account is ready.`, "fa-circle-check");
                navigate("profile");
            }, 850);
        });
    }

    // Logout Action function
    function performLogout() {
        authState.isLoggedIn = false;
        authState.currentUser = {
            name: "Guest Listener",
            email: "",
            avatar: "./assesst/logo.png",
            tier: "Guest Mode",
            isPremium: false
        };

        if (onLogout) onLogout();
        toast("You have been logged out of Spotify", "fa-arrow-right-from-bracket");
        // Open Auth screen for easy sign in / register
        switchTab("login");
        navigate("auth");
    }

    return {
        switchTab,
        logout: performLogout,
        isLoggedIn: () => authState.isLoggedIn,
        getUser: () => authState.currentUser
    };
}

