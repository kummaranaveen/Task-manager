// Check authentication
const token = localStorage.getItem('token');
const username = localStorage.getItem('username');

if (!token) {
    window.location.href = 'login.html';
}

document.getElementById('username').textContent = username;

// Global variables
let tasks = [];
let currentSort = { field: null, ascending: true };

// Load dashboard data
async function loadDashboard() {
    try {
        // Load stats
        const statsResponse = await fetch('http://localhost:8000/api/dashboard/stats/', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!statsResponse.ok) {
            if (statsResponse.status === 401) {
                logout();
                return;
            }
            throw new Error('Failed to load stats');
        }

        const stats = await statsResponse.json();
        updateStats(stats);

        // Load tasks
        await loadTasks();
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to load dashboard data');
    }
}

// Update statistics display
function updateStats(stats) {
    document.getElementById('totalTasks').textContent = stats.total_tasks;
    document.getElementById('completedTasks').textContent = stats.completed_tasks;
    document.getElementById('pendingTasks').textContent = stats.pending_tasks;
    document.getElementById('inProgressTasks').textContent = stats.in_progress_tasks;
}

// Load and display tasks
async function loadTasks() {
    try {
        const response = await fetch('http://localhost:8000/api/tasks/', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Failed to load tasks');

        tasks = await response.json();
        displayTasks(tasks);
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to load tasks');
    }
}

// Display tasks in table
function displayTasks(tasksToDisplay) {
    const tbody = document.getElementById('taskTableBody');
    tbody.innerHTML = '';

    tasksToDisplay.forEach(task => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${task.title}</td>
            <td class="priority-${task.priority}">${task.priority}</td>
            <td>${task.status}</td>
            <td>${task.due_date}</td>
            <td class="action-buttons">
                <button onclick="editTask(${task.id})" class="edit-btn">Edit</button>
                <button onclick="deleteTask(${task.id})" class="delete-btn">Delete</button>
                <select onchange="updateTaskStatus(${task.id}, this.value)" class="status-btn">
                    <option value="pending" ${task.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                    <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Completed</option>
                </select>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Sort tasks
function sortTasks(field) {
    if (currentSort.field === field) {
        currentSort.ascending = !currentSort.ascending;
    } else {
        currentSort.field = field;
        currentSort.ascending = true;
    }

    tasks.sort((a, b) => {
        let comparison = 0;
        if (a[field] > b[field]) comparison = 1;
        if (a[field] < b[field]) comparison = -1;
        return currentSort.ascending ? comparison : -comparison;
    });

    displayTasks(tasks);
}

// Filter tasks
function applyFilters() {
    const status = document.getElementById('statusFilter').value;
    const priority = document.getElementById('priorityFilter').value;
    const date = document.getElementById('dateFilter').value;

    let filteredTasks = tasks;

    if (status) {
        filteredTasks = filteredTasks.filter(task => task.status === status);
    }
    if (priority) {
        filteredTasks = filteredTasks.filter(task => task.priority === priority);
    }
    if (date) {
        filteredTasks = filteredTasks.filter(task => task.due_date === date);
    }

    displayTasks(filteredTasks);
}

// Task CRUD operations
async function addTask(taskData) {
    try {
        const response = await fetch('http://localhost:8000/api/tasks/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
        });

        if (!response.ok) throw new Error('Failed to add task');

        await loadTasks();
        await loadDashboard();
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to add task');
    }
}

async function updateTask(taskId, taskData) {
    try {
        const response = await fetch(`http://localhost:8000/api/tasks/${taskId}/`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(taskData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update task');
        }

      
        const updatedTask = await response.json();
        const index = tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
            tasks[index] = updatedTask;
        }

       
        displayTasks(tasks);
        await loadDashboard();
        
    
        alert('Task updated successfully');
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}
async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
        const response = await fetch(`http://localhost:8000/api/tasks/${taskId}/`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Task not found');
            }
            throw new Error('Failed to delete task');
        }

        // Remove the task from the local array
        tasks = tasks.filter(task => task.id !== taskId);
        // Refresh the display
        displayTasks(tasks);
        // Refresh dashboard stats
        await loadDashboard();
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}
// Modal handling
function showAddTaskModal() {
    document.getElementById('modalTitle').textContent = 'Add New Task';
    document.getElementById('taskForm').reset();
    document.getElementById('taskId').value = '';
    document.getElementById('taskModal').style.display = 'block';
}

function editTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    document.getElementById('modalTitle').textContent = 'Edit Task';
    document.getElementById('taskId').value = taskId;
    document.getElementById('title').value = task.title;
    document.getElementById('description').value = task.description;
    document.getElementById('priority').value = task.priority;
    document.getElementById('status').value = task.status;
    document.getElementById('dueDate').value = task.due_date;
    document.getElementById('taskModal').style.display = 'block';
}

// Form submission
document.getElementById('taskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const taskData = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        priority: document.getElementById('priority').value,
        status: document.getElementById('status').value,
        due_date: document.getElementById('dueDate').value
    };

    const taskId = document.getElementById('taskId').value;

    if (taskId) {
        await updateTask(taskId, taskData);
    } else {
        await addTask(taskData);
    }

    document.getElementById('taskModal').style.display = 'none';
});

// Close modal
document.querySelector('.close').onclick = function() {
    document.getElementById('taskModal').style.display = 'none';
}

// Logout function
async function logout() {
    try {
        // Show loading animation
        showLoadingOverlay();
        
        // Call logout API
        const response = await fetch('http://localhost:8000/api/auth/logout/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok && response.status !== 401) {
            throw new Error('Logout failed');
        }

    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        // Clear authentication data
        localStorage.clear();
        sessionStorage.setItem('logoutSuccess', 'true');
        
        // Redirect with fade effect
        document.body.classList.add('fade-out');
        setTimeout(() => {
            window.location.replace('login.html');
        }, 300);
    }
}

// Add loading overlay functions
function showLoadingOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-spinner"></div>
        <p>Loading Dashboard...</p>
    `;
    document.body.appendChild(overlay);
}

function hideLoadingOverlay() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.classList.add('fade-out');
        setTimeout(() => overlay.remove(), 300);
    }
}

// Add these functions to your existing code
function initializeNavigation() {
    // Home button
    document.getElementById('homeBtn').addEventListener('click', function() {
        // Show loading animation
        showLoadingOverlay();
        
        // Reset all filters
        document.getElementById('statusFilter').value = '';
        document.getElementById('priorityFilter').value = '';
        document.getElementById('dateFilter').value = '';
        
        // Refresh dashboard
        loadDashboard().then(() => {
            hideLoadingOverlay();
            // Smooth scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // About button
    document.getElementById('aboutBtn').addEventListener('click', showAboutModal);
}

// About modal function
function showAboutModal() {
    const modalHtml = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>About Task Manager</h2>
            <div class="about-content">
                <p>Welcome to our Task Management System!</p>
                <p>This application helps you organize and track your tasks efficiently.</p>
                <p>Features:</p>
                <ul>
                    <li>Task organization and tracking</li>
                    <li>Priority management</li>
                    <li>Status updates</li>
                    <li>Due date tracking</li>
                </ul>
                <p>Version: 1.0.0</p>
            </div>
        </div>
    `;

    showModal(modalHtml);
}

// Dashboard overview function
function showDashboardOverview() {
    const username = document.getElementById('username').textContent;
    const modalHtml = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>${username}'s Dashboard Overview</h2>
            <div class="overview-content">
                <div class="overview-stats">
                    <div class="stat-item">
                        <h3>Total Tasks</h3>
                        <p>${document.getElementById('totalTasks').textContent}</p>
                    </div>
                    <div class="stat-item">
                        <h3>Completed</h3>
                        <p>${document.getElementById('completedTasks').textContent}</p>
                    </div>
                    <div class="stat-item">
                        <h3>Pending</h3>
                        <p>${document.getElementById('pendingTasks').textContent}</p>
                    </div>
                    <div class="stat-item">
                        <h3>In Progress</h3>
                        <p>${document.getElementById('inProgressTasks').textContent}</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    showModal(modalHtml);
}

// Helper function to show modal
function showModal(content) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = content;
    document.body.appendChild(modal);

    modal.style.display = 'block';

    // Close button functionality
    modal.querySelector('.close').onclick = function() {
        modal.remove();
    };

    // Click outside to close
    window.onclick = function(event) {
        if (event.target === modal) {
            modal.remove();
        }
    };
}

// Update your DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            // Show confirmation dialog
            const confirmLogout = await showLogoutConfirmation();
            
            if (confirmLogout) {
                await logout();
            }
        });
    }
    
    // Initialize navigation
    initializeNavigation();
    
    // Initial load
    loadDashboard();
});

// Add a professional confirmation dialog
function showLogoutConfirmation() {
    return new Promise((resolve) => {
        const modalHtml = `
            <div class="modal-content logout-confirm">
                <h2>Confirm Logout</h2>
                <p>Are you sure you want to logout?</p>
                <div class="button-group">
                    <button class="modal-btn secondary" id="cancelLogout">Cancel</button>
                    <button class="modal-btn primary" id="confirmLogout">Logout</button>
                </div>
            </div>
        `;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = modalHtml;
        document.body.appendChild(modal);

        modal.style.display = 'block';

        // Handle button clicks
        modal.querySelector('#cancelLogout').onclick = function() {
            modal.remove();
            resolve(false);
        };

        modal.querySelector('#confirmLogout').onclick = function() {
            modal.remove();
            resolve(true);
        };

        // Click outside to cancel
        window.onclick = function(event) {
            if (event.target === modal) {
                modal.remove();
                resolve(false);
            }
        };
    });
}

// Update the function to show tasks by status and count
function showTasksByStatus(status) {
    let tasksWithStatus;
    let statusTitle;
    
    if (status === 'all') {
        tasksWithStatus = tasks;
        statusTitle = 'All';
    } else {
        tasksWithStatus = tasks.filter(task => task.status === status);
        statusTitle = status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1);
    }
    
    const modalHtml = `
        <div class="modal-content task-list-modal">
            <span class="close">&times;</span>
            <h2>${statusTitle} Tasks</h2>
            <div class="status-summary">
                <span class="task-count">Total: ${tasksWithStatus.length} tasks</span>
            </div>
            <div class="task-list">
                ${tasksWithStatus.length > 0 ? `
                    <table class="status-task-table">
                        <thead>
                            <tr>
                                <th>Title</th>
                                <th>Priority</th>
                                <th>Due Date</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tasksWithStatus.map(task => `
                                <tr>
                                    <td>${task.title}</td>
                                    <td><span class="priority-badge ${task.priority}">${task.priority}</span></td>
                                    <td>${task.due_date}</td>
                                    <td>${task.description || 'No description'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : '<p class="no-tasks">No tasks found with this status</p>'}
            </div>
        </div>
    `;

    showModal(modalHtml);
}
