// Configuration
const API_ENDPOINT = 'https://fyimr127r0.execute-api.us-east-1.amazonaws.com/dev';

// DOM Elements
const userNameElement = document.getElementById('userName');
const coursesList = document.getElementById('coursesList');
const logoutBtn = document.getElementById('logoutBtn');

// Function to clear all states and redirect to login
function redirectToLogin() {
    console.log('Logging out...'); // Debug log
    // Clear all localStorage data
    localStorage.clear();
    // Clear session storage
    sessionStorage.clear();
    // Clear any cookies
    document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    // Replace current page with login page (prevents back navigation)
    window.location.replace('/login.html');
}

// Function to set user name
function setUserName(name) {
    if (userNameElement) {
        userNameElement.textContent = name;
        console.log('Setting name to:', name);
    } else {
        console.error('userName element not found in DOM');
    }
}

// Function to populate enrolled courses
function populateEnrolledCourses(courses) {
    if (coursesList) {
        coursesList.innerHTML = courses.map(course => `
            <div class="grade-item">
                <div class="course-info">
                    <span class="course-name">${course.course_name}</span>
                    <span class="course-id">${course.course_id}</span>
                </div>
                <span class="grade-value">${course.grade !== 'NA' ? `${course.grade}%` : course.grade}</span>
            </div>
        `).join('');
        console.log('Courses populated:', courses);
    } else {
        console.error('coursesList element not found in DOM');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const userData = JSON.parse(localStorage.getItem('userData'));
    console.log('User Data from localStorage:', userData);
    
    if (userData) {
        setUserName(userData.name);
        if (userData.enrolled_courses) {
            populateEnrolledCourses(userData.enrolled_courses);
        } else {
            console.error('No enrolled courses found in userData');
        }
    } else {
        console.error('No user data found');
        redirectToLogin();
    }

    // Add logout button event listener
    if (logoutBtn) {
        console.log('Adding logout event listener'); // Debug log
        logoutBtn.addEventListener('click', () => {
            console.log('Logout button clicked'); // Debug log
            redirectToLogin();
        });
    } else {
        console.error('Logout button not found in DOM'); // Debug log
    }
});

// Prevent back navigation
window.addEventListener('popstate', function(event) {
    // Clear all stored data
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    // Redirect to login page
    window.location.replace('/login.html');
});

// Initialize history state
window.history.pushState(null, '', window.location.href); 