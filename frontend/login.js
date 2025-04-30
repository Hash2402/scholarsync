import config from './config.js';

// Clear all stored data and reset the page state
function resetPageState() {
    // Clear all stored data
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });

    // Clear form fields
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const facultyCheckbox = document.getElementById('facultyLogin');
    const errorMessage = document.getElementById('errorMessage');

    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (facultyCheckbox) facultyCheckbox.checked = false;
    if (errorMessage) errorMessage.textContent = '';

    // Replace the current history state
    window.history.replaceState(null, '', '/login.html');
}

// Function to handle navigation attempts
function handleNavigation() {
    // Clear form fields
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const facultyCheckbox = document.getElementById('facultyLogin');
    const errorMessage = document.getElementById('errorMessage');

    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (facultyCheckbox) facultyCheckbox.checked = false;
    if (errorMessage) errorMessage.textContent = '';

    // Push a new state to prevent back navigation
    window.history.pushState(null, '', '/login.html');
    // Force redirect to login page
    window.location.href = '/login.html';
}

// Call reset immediately when script loads
resetPageState();

document.addEventListener('DOMContentLoaded', () => {
    console.log('Login page loaded');
    
    // Reset again when DOM is ready
    resetPageState();

    // Initialize history state
    window.history.pushState(null, '', '/login.html');

    // Handle all navigation attempts
    window.addEventListener('popstate', function() {
        // Clear form fields
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const facultyCheckbox = document.getElementById('facultyLogin');
        const errorMessage = document.getElementById('errorMessage');

        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';
        if (facultyCheckbox) facultyCheckbox.checked = false;
        if (errorMessage) errorMessage.textContent = '';

        window.history.pushState(null, '', '/login.html');
        window.location.href = '/login.html';
    });
    
    // Additional prevention
    window.onbeforeunload = function() {
        // Clear form fields
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const facultyCheckbox = document.getElementById('facultyLogin');
        const errorMessage = document.getElementById('errorMessage');

        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';
        if (facultyCheckbox) facultyCheckbox.checked = false;
        if (errorMessage) errorMessage.textContent = '';

        window.history.pushState(null, '', '/login.html');
        window.location.href = '/login.html';
    };

    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const loadingSpinner = document.getElementById('loadingSpinner');

    if (!loginForm) {
        console.error('Login form not found!');
        return;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Login form submitted');
        
        // Show loading spinner
        loadingSpinner.style.display = 'block';
        errorMessage.textContent = '';
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const isProfessor = document.getElementById('facultyLogin').checked;
        
        console.log('Login attempt:', { email, isProfessor });
        
        try {
            const apiUrl = config.API_ENDPOINTS.LOGIN;
            const payload = {
                username: email,
                password: password,
                isProfessor: isProfessor
            };

            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                console.error("HTTP error! Status:", response.status);
                const errorText = await response.text();
                console.error("Error body:", errorText);
                errorMessage.textContent = 'Login failed. Please try again.';
                return;
            }

            const data = await response.json();
            console.log("Login Successful! Complete API Response:", data);

            // Store only essential data
            const userData = {
                user_id: data.user_id,
                name: data.name,
                isProfessor: data.isProfessor,
                email: data.email
            };

            //Store courses taught by professor
            if (isProfessor) {
                userData.courses = data.courses_taught;
            }

            //Store enrolled courses by student
            if (!isProfessor) {
                userData.enrolled_courses = data.enrolled_courses;
            }

            console.log("Storing user data:", userData);
            localStorage.setItem('userData', JSON.stringify(userData));
            
            // Redirect based on role
            if (isProfessor) {
                window.location.replace('faculty/index.html');
            } else {
                window.location.replace('student/index.html');
            }
        } catch (error) {
            console.error("Network Error:", error);
            errorMessage.textContent = 'An error occurred. Please try again later.';
        } finally {
            // Hide loading spinner
            loadingSpinner.style.display = 'none';
        }
    });
}); 