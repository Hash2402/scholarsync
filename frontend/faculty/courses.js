// Configuration
const API_ENDPOINT = 'https://fyimr127r0.execute-api.us-east-1.amazonaws.com/dev';

// DOM Elements
const userNameElement = document.getElementById('userName');
const coursesGrid = document.getElementById('coursesGrid');

// Function to handle logout
function logout() {
    console.log('Logging out...'); // Debug log
    // Clear all stored data
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    // Directly replace with login page and prevent any navigation
    window.location.replace('/login.html');
    // Immediately prevent any further navigation
    window.onpopstate = function() {
        window.location.replace('/login.html');
    };
}

// Function to clear all states and redirect to login
function redirectToLogin() {
    console.log('Logging out...'); // Debug log
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
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

// Function to render courses
function renderCourses() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    console.log('User Data from localStorage:', userData);
    
    if (userData) {
        setUserName(userData.name);
        if (userData.courses) {
            if (coursesGrid) {
                coursesGrid.innerHTML = userData.courses.map(course => `
                    <div class="course-card">
                        <div class="course-header">
                            <h3>${course.course_name}</h3>
                            <span class="course-code">${course.course_id}</span>
                        </div>
                        <div class="course-info">
                            <p class="course-description">${course.course_detail}</p>
                            <div class="course-stats">
                                <div class="stat">
                                    <span class="stat-label">Enrolled Students</span>
                                    <span class="stat-value">${course.enrolled_students[0]}</span>
                                </div>
                            </div>
                        </div>
                        <button class="view-course-btn" onclick="viewCourse('${course.course_id}')">View Course</button>
                    </div>
                `).join('');
                console.log('Courses populated:', userData.courses);
            } else {
                console.error('coursesGrid element not found in DOM');
            }
        } else {
            console.error('No courses found in userData');
        }
    } else {
        console.error('No user data found');
        redirectToLogin();
    }
}

// View course function
async function viewCourse(courseId) {
    try {
        const userData = JSON.parse(localStorage.getItem('userData'));
        if (!userData || !userData.email) {
            console.error('No user data or email found');
            return;
        }

        // Show loading state
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = 'Loading...';
        button.disabled = true;

        // Get current course details
        const currentCourse = userData.courses.find(course => course.course_id === courseId);
        if (!currentCourse) {
            throw new Error('Course not found');
        }

        // Fetch course data from API
        const response = await fetch(`${API_ENDPOINT}/grades?isProfessor=true&email=${userData.email}&course_id=${courseId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const courseData = await response.json();
        console.log('Course data fetched:', courseData);

        // Add course details to the fetched data
        const completeCourseData = {
            ...courseData,
            course_id: currentCourse.course_id,
            course_name: currentCourse.course_name,
            course_detail: currentCourse.course_detail
        };

        // Store the complete course data in localStorage
        localStorage.setItem('facultyCourseData', JSON.stringify(completeCourseData));

        // Navigate to course page
        window.location.href = `course.html?id=${courseId}`;
    } catch (error) {
        console.error('Error fetching course data:', error);
        // Restore button state
        const button = event.target;
        button.textContent = 'View Course';
        button.disabled = false;
        // Show error message to user
        alert('Error loading course data. Please try again.');
    }
}

// Function to show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Remove notification after 2 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check for refresh parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('refresh')) {
        // Remove the refresh parameter from URL without reloading
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
        
        // Force reload the page
        window.location.reload(true);
        return;
    }

    renderCourses();
    
    // Initialize history state
    window.history.pushState({ page: 'faculty' }, '', window.location.href);

    // Add event listener for beforeunload to restore button states
    window.addEventListener('beforeunload', function() {
        // Find all buttons with 'Loading...' text and restore them
        const buttons = document.querySelectorAll('.view-course-btn');
        buttons.forEach(button => {
            if (button.textContent === 'Loading...') {
                button.textContent = 'View Course';
                button.disabled = false;
            }
        });
    });
});

// Handle browser navigation
window.addEventListener('popstate', function(event) {
    // If going forward (or if state is null), stay on faculty index
    if (!event.state || event.state.page === 'faculty') {
        window.history.pushState({ page: 'faculty' }, '', window.location.href);
        return;
    }
    
    // Show notification before redirecting
    showNotification('Redirecting to login page...');
    
    // Wait for notification to be visible before redirecting
    setTimeout(() => {
        // Clear all stored data
        localStorage.clear();
        sessionStorage.clear();
        document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
        // Redirect to login page
        window.location.replace('/login.html');
    }, 1000);
}); 