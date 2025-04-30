// Get course ID from URL parameters
const urlParams = new URLSearchParams(window.location.search);
const courseId = urlParams.get('id');

// DOM Elements
const userNameElement = document.getElementById('userName');
const courseNameElement = document.getElementById('courseName');
const courseCodeElement = document.getElementById('courseCode');
const courseDescriptionElement = document.getElementById('courseDescription');
const totalStudentsElement = document.getElementById('totalStudents');
const ungradedStudentsElement = document.getElementById('ungradedStudents');
const studentsGrid = document.getElementById('studentsGrid');
const searchInput = document.getElementById('searchStudent');
const filterStatus = document.getElementById('filterStatus');

// Modal Elements
const modal = document.getElementById('gradeModal');
const modalTitle = document.getElementById('modalTitle');
const modalStudentName = document.getElementById('modalStudentName');
const modalStudentId = document.getElementById('modalStudentId');
const gradeInput = document.getElementById('gradeInput');
const gradeError = document.getElementById('gradeError');

let currentStudentId = null;

// Function to check authentication
function checkAuth() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!userData || !userData.name) {
        window.location.replace('/login.html');
        return false;
    }
    return true;
}

// Function to handle logout
function logout() {
    console.log('Logging out...'); // Debug log
    
    // Clear all stored data
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    // Clear browser history
    window.history.pushState(null, '', '/login.html');
    
    // Force redirect to login page
    window.location.href = '/login.html';
    
    // Prevent any further navigation
    window.onpopstate = function() {
        window.history.pushState(null, '', '/login.html');
        window.location.href = '/login.html';
    };
    
    // Additional prevention of navigation
    window.onbeforeunload = function() {
        window.history.pushState(null, '', '/login.html');
        window.location.href = '/login.html';
    };
}

// Function to set user name
function setUserName() {
    if (!checkAuth()) return;
    const userData = JSON.parse(localStorage.getItem('userData'));
    userNameElement.textContent = userData.name;
    console.log('Setting name to:', userData.name);
}

// Update course details in the UI
function updateCourseDetails() {
    const facultyCourseData = JSON.parse(localStorage.getItem('facultyCourseData'));
    if (!facultyCourseData) {
        console.error('No course data found');
        return;
    }

    // Update course information
    courseNameElement.textContent = facultyCourseData.course_name;
    courseCodeElement.textContent = facultyCourseData.course_id;
    courseDescriptionElement.textContent = facultyCourseData.course_detail;

    // Update student counts
    const totalStudents = facultyCourseData.students ? facultyCourseData.students.length : 0;
    const ungradedStudents = facultyCourseData.students ? 
        facultyCourseData.students.filter(student => student.grade === 'NA').length : 0;

    totalStudentsElement.textContent = totalStudents;
    ungradedStudentsElement.textContent = ungradedStudents;

    // Render students
    if (facultyCourseData.students) {
        renderStudents(facultyCourseData.students);
    }
}

// Render students in the grid
function renderStudents(students) {
    studentsGrid.innerHTML = '';
    
    students.forEach(student => {
        const studentCard = createStudentCard(student);
        studentsGrid.appendChild(studentCard);
    });
}

// Create a student card element
function createStudentCard(student) {
    const card = document.createElement('div');
    card.className = 'student-card';
    
    const isGraded = student.grade !== 'NA';
    
    // Create the card content first
    card.innerHTML = `
        <div class="student-header">
            <span class="student-name">${student.student_name}</span>
            <span class="student-id">${student.student_id}</span>
        </div>
        <div class="student-status ${isGraded ? 'graded' : 'ungraded'}">
            ${isGraded 
                ? `<span class="grade">Grade: ${student.grade}%</span>`
                : '<span class="ungraded">Not Graded</span>'
            }
        </div>
    `;
    
    // Create the button
    const button = document.createElement('button');
    button.className = isGraded ? 'edit-grade-btn' : 'grade-btn';
    button.textContent = isGraded ? 'Edit Grade' : 'Grade Student';
    button.setAttribute('data-student-id', student.student_id);
    
    // Add click event listener using addEventListener
    button.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (isGraded) {
            editGrade(student.student_id);
        } else {
            gradeStudent(student.student_id);
        }
    }, true);
    
    // Append the button to the card
    card.appendChild(button);
    
    return card;
}

// Filter students based on search input and status
function filterStudents() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusFilter = filterStatus.value;
    const facultyCourseData = JSON.parse(localStorage.getItem('facultyCourseData'));
    
    if (!facultyCourseData || !facultyCourseData.students) return;
    
    let filtered = facultyCourseData.students.filter(student => 
        (student.student_name.toLowerCase().includes(searchTerm) ||
        student.student_id.toLowerCase().includes(searchTerm))
    );
    
    if (statusFilter !== 'all') {
        filtered = filtered.filter(student => 
            statusFilter === 'graded' ? student.grade !== 'NA' : student.grade === 'NA'
        );
    }
    
    renderStudents(filtered);
}

// Show modal for grading/editing
function showGradeModal(studentId, isEdit = false) {
    const facultyCourseData = JSON.parse(localStorage.getItem('facultyCourseData'));
    if (!facultyCourseData || !facultyCourseData.students) {
        console.error('No course data found in localStorage');
        return;
    }

    const student = facultyCourseData.students.find(s => s.student_id === studentId);
    if (!student) {
        console.error('Student not found:', studentId);
        return;
    }

    currentStudentId = studentId;
    modalTitle.textContent = isEdit ? 'Edit Grade' : 'Grade Student';
    modalStudentName.textContent = student.student_name;
    modalStudentId.textContent = student.student_id;
    gradeInput.value = student.grade !== 'NA' ? student.grade : '';
    gradeError.style.display = 'none';

    // Set edit mode attribute
    modal.setAttribute('data-is-edit', isEdit);

    // Show the modal
    modal.style.display = 'block';
    modal.classList.add('active');
    
    // Focus the grade input
    gradeInput.focus();
}

// Close modal
function closeGradeModal() {
    modal.classList.remove('active');
    modal.style.display = 'none';
    currentStudentId = null;
    gradeInput.value = '';
}

// Save grade
async function saveGrade() {
    const grade = parseFloat(gradeInput.value);
    const isEdit = modal.getAttribute('data-is-edit') === 'true';

    // Validate grade
    if (isNaN(grade) || grade < 0 || grade > 100) {
        gradeError.textContent = 'Please enter a valid grade between 0 and 100';
        gradeError.style.display = 'block';
        gradeInput.focus();
        return;
    }

    try {
        const facultyCourseData = JSON.parse(localStorage.getItem('facultyCourseData'));
        const userData = JSON.parse(localStorage.getItem('userData'));
        
        if (!facultyCourseData || !facultyCourseData.students || !userData) {
            console.error('Missing required data:', { facultyCourseData, userData });
            return;
        }

        const studentIndex = facultyCourseData.students.findIndex(s => s.student_id === currentStudentId);
        if (studentIndex === -1) {
            console.error('Student not found:', currentStudentId);
            return;
        }

        // Get grade_id from facultyCourseData
        const gradeId = facultyCourseData.students[studentIndex].grade_id;

        // Prepare request body
        const requestBody = {
            grade_id: gradeId,
            course_id: facultyCourseData.course_id,
            grade: grade.toString(),
            student_id: currentStudentId
        };
        console.log('Request body:', requestBody);
        // Make API call
        const response = await fetch('https://fyimr127r0.execute-api.us-east-1.amazonaws.com/dev/grades?email=' + userData.email, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            console.error('API Error:', {
                status: response.status,
                statusText: response.statusText,
                errorData
            });
            throw new Error(`Failed to save grade: ${response.statusText}`);
        }

        const result = await response.json();

        // Update student data with the response
        facultyCourseData.students[studentIndex].grade = grade.toString();
        facultyCourseData.students[studentIndex].grade_id = result.grade_id;

        // Update localStorage
        localStorage.setItem('facultyCourseData', JSON.stringify(facultyCourseData));

        // Update UI
        updateCourseDetails();

        // Close modal
        closeGradeModal();

        // Show success message
        showNotification(isEdit ? 'Grade updated successfully!' : 'Grade saved successfully!');
    } catch (error) {
        console.error('Error saving grade:', error);
        gradeError.textContent = 'Error saving grade. Please try again.';
        gradeError.style.display = 'block';
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

// Update grade student functions
function gradeStudent(studentId) {
    showGradeModal(studentId, false);
}

function editGrade(studentId) {
    showGradeModal(studentId, true);
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target === modal) {
        closeGradeModal();
    }
}

// Handle Enter key in grade input
gradeInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        saveGrade();
    }
});

// Event Listeners
searchInput.addEventListener('input', filterStudents);
filterStatus.addEventListener('change', filterStudents);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    if (!checkAuth()) return;
    setUserName();
    updateCourseDetails();
    
    // Initialize history state
    window.history.pushState({ page: 'course' }, '', window.location.href);
    
    // Add event listeners for search and filter
    searchInput.addEventListener('input', filterStudents);
    filterStatus.addEventListener('change', filterStudents);
    
    // Add global navigation prevention
    window.addEventListener('popstate', function() {
        window.history.pushState(null, '', '/login.html');
        window.location.href = '/login.html';
    });
});

// Handle browser navigation
window.addEventListener('popstate', function(event) {
    // If going forward (or if state is null), stay on course page
    if (!event.state || event.state.page === 'course') {
        window.history.pushState({ page: 'course' }, '', window.location.href);
        return;
    }
    
    // Push the state back immediately to prevent navigation
    window.history.pushState({ page: 'course' }, '', window.location.href);
});

// Function to view student portal
function viewStudentPortal() {
    // Clear browser history
    window.history.pushState(null, '', window.location.href);
    
    // Replace current page with student portal (prevents back navigation)
    window.location.replace('/student/index.html');
    
    // Prevent back navigation after redirect
    window.onpopstate = function() {
        window.history.pushState(null, '', '/student/index.html');
    };
}

// Function to back to courses
function backToCourses() {
    // Show notification
    showNotification('Returning to courses...');
    
    // Wait for notification to be visible before redirecting
    setTimeout(() => {
        // Keep only userData in localStorage
        const userData = localStorage.getItem('userData');
        localStorage.clear();
        if (userData) {
            localStorage.setItem('userData', userData);
        }
        
        // Redirect to courses page
        window.location.replace('index.html');
    }, 1000);
} 