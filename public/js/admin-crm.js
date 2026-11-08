// public/js/admin-crm.js
// Complete Salon Administrative Operations & Real-Time Cloud CRM Logic

let unsubscribeListener = null;
let allAppointments = [];
let activeFilter = 'all';

// Default Admin Seed
const DEFAULT_ADMIN = {
    id: 1,
    fullName: "Salon Administrator",
    username: "admin",
    email: "admin@chanusalon.com",
    phone: "0781468988",
    password: "admin123",
    role: "Admin",
    registeredAt: "2025-01-01"
};

// Default Salon Schedule Seed
const DEFAULT_SCHEDULE = [
    { day: "Monday", open: "09:00", close: "18:00", isWorking: true, capacity: 4 },
    { day: "Tuesday", open: "09:00", close: "18:00", isWorking: true, capacity: 4 },
    { day: "Wednesday", open: "09:00", close: "18:00", isWorking: true, capacity: 4 },
    { day: "Thursday", open: "09:00", close: "18:00", isWorking: true, capacity: 4 },
    { day: "Friday", open: "09:00", close: "18:00", isWorking: true, capacity: 4 },
    { day: "Saturday", open: "09:00", close: "18:00", isWorking: true, capacity: 6 },
    { day: "Sunday", open: "10:00", close: "16:00", isWorking: false, capacity: 0 }
];

// 1. Authentication Check
window.checkAdminAuth = function() {
    const isAuth = sessionStorage.getItem('chanu_admin_auth') || sessionStorage.getItem('admin_auth');
    const user = JSON.parse(localStorage.getItem('chanu_user') || 'null');
    const authOverlay = document.getElementById('adminAuthOverlay');
    const dashboard = document.getElementById('crmDashboard');

    if (isAuth === 'true' || (user && user.role === 'Admin')) {
        if (authOverlay) authOverlay.style.display = 'none';
        if (dashboard) dashboard.style.display = 'block';
        initAdminOperations();
    } else {
        if (authOverlay) authOverlay.style.display = 'flex';
        if (dashboard) dashboard.style.display = 'none';
    }
};

window.loginAdmin = function(e) {
    e.preventDefault();
    const pin = document.getElementById('adminPin').value.trim();
    if (pin === 'chanu2025' || pin === 'admin123') {
        sessionStorage.setItem('chanu_admin_auth', 'true');
        sessionStorage.setItem('admin_auth', 'true');
        const adminSession = {
            id: 1,
            username: 'admin',
            fullName: 'Administrator',
            role: 'Admin',
            token: 'chanu_admin_verified'
        };
        localStorage.setItem('chanu_user', JSON.stringify(adminSession));
        window.checkAdminAuth();
    } else {
        alert("Invalid Admin Passcode! (Default: chanu2025 or admin123)");
    }
};

window.logoutAdmin = function() {
    sessionStorage.removeItem('chanu_admin_auth');
    sessionStorage.removeItem('admin_auth');
    const user = JSON.parse(localStorage.getItem('chanu_user') || 'null');
    if (user && user.role === 'Admin') {
        localStorage.removeItem('chanu_user');
    }
    if (unsubscribeListener) unsubscribeListener();
    window.location.href = 'login.html';
};

// 2. Initialize Admin Console
function initAdminOperations() {
    initScheduleData();
    initUserData();
    renderAdminServicesTable();
    renderAdminUsersTable();
    renderScheduleTable();
    initRealtimeCRM();

    // Check URL hash for direct tab linking (e.g. #services-manage, #crm-portal)
    const hash = window.location.hash;
    if (hash === '#services-manage') switchAdminTab('services');
    else if (hash === '#users-manage') switchAdminTab('users');
    else if (hash === '#schedule-manage') switchAdminTab('schedule');
    else if (hash === '#crm-portal') switchAdminTab('crm');
    else switchAdminTab('overview');
}

// 3. Tab Switching Architecture
window.switchAdminTab = function(tabName) {
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sidebar-menu a').forEach(el => el.classList.remove('active'));

    const pageTitle = document.getElementById('pageTitleText');
    const liveStatus = document.getElementById('liveStatusText');

    if (tabName === 'overview') {
        document.getElementById('tabOverview').classList.add('active');
        document.getElementById('nav-overview').classList.add('active');
        if (pageTitle) pageTitle.textContent = "Salon Administrative Command Centre";
        if (liveStatus) liveStatus.textContent = "LIVE CLOUD SYSTEM • SUPER ADMIN";
        updateOverviewStats();
    } else if (tabName === 'services') {
        document.getElementById('tabServices').classList.add('active');
        document.getElementById('nav-services').classList.add('active');
        if (pageTitle) pageTitle.textContent = "Services Management (සේවා කළමනාකරණය)";
        if (liveStatus) liveStatus.textContent = "INSTANT SANCTUARY SYNC";
        renderAdminServicesTable();
    } else if (tabName === 'users') {
        document.getElementById('tabUsers').classList.add('active');
        document.getElementById('nav-users').classList.add('active');
        if (pageTitle) pageTitle.textContent = "User & Staff Management (පරිශීලක කළමනාකරණය)";
        if (liveStatus) liveStatus.textContent = "SECURITY & ROLE ACCESS";
        renderAdminUsersTable();
    } else if (tabName === 'schedule') {
        document.getElementById('tabSchedule').classList.add('active');
        document.getElementById('nav-schedule').classList.add('active');
        if (pageTitle) pageTitle.textContent = "Working Hours & Schedule (කාලසටහන් කළමනාකරණය)";
        if (liveStatus) liveStatus.textContent = "ONLINE SLOT ENGINE";
        renderScheduleTable();
    } else if (tabName === 'crm') {
        document.getElementById('tabCRM').classList.add('active');
        document.getElementById('nav-crm').classList.add('active');
        if (pageTitle) pageTitle.textContent = "Real-Time Omnichannel CRM & WhatsApp Pipeline";
        if (liveStatus) liveStatus.textContent = "LIVE FIRESTORE REAL-TIME SYNC";
        renderCRMTable();
        renderClientsTable();
    }
};

// 4. TAB 2: SERVICES MANAGEMENT LOGIC (XAMPP Replica)
window.renderAdminServicesTable = function() {
    const tbody = document.getElementById('servicesManageTableBody');
    if (!tbody || !window.ChanuServices) return;

    const services = window.ChanuServices.getAll();
    const countBadge = document.getElementById('activeServicesCountBadge');
    const statServices = document.getElementById('statServicesCount');

    if (countBadge) countBadge.textContent = `${services.length} Total Services in Catalog`;
    if (statServices) statServices.textContent = `${services.length} Services`;

    if (services.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: #94a3b8;">No services in catalog. Add one above!</td></tr>`;
        return;
    }

    let rowsHtml = '';
    services.forEach((s, idx) => {
        rowsHtml += `
            <tr>
                <td><img src="${s.photo}" class="service-thumb-mini" alt="${escapeHtml(s.name)}" onerror="this.src='images/2148108899.jpg'"></td>
                <td><strong>${escapeHtml(s.name)}</strong></td>
                <td><span class="badge-channel web">${escapeHtml(s.category)}</span></td>
                <td><span class="slot-pill">${s.duration} Mins</span></td>
                <td><strong style="color: #059669;">Rs. ${Number(s.price).toLocaleString()}</strong></td>
                <td><span class="status-badge status-confirmed">${escapeHtml(s.tag || 'Standard')}</span></td>
                <td>
                    <button type="button" class="btn-edit-row" onclick="editService('${s.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button type="button" class="btn-delete-row" onclick="deleteService('${s.id}', '${escapeHtml(s.name)}')">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = rowsHtml;
};

window.handleSaveService = function(e) {
    e.preventDefault();
    if (!window.ChanuServices) return;

    const editId = document.getElementById('editServiceId').value;
    const name = document.getElementById('serviceName').value.trim();
    const category = document.getElementById('serviceCategory').value;
    const duration = document.getElementById('serviceDuration').value;
    const price = document.getElementById('servicePrice').value;
    const tag = document.getElementById('serviceTag').value;
    const description = document.getElementById('serviceDescription').value.trim();
    const photo = document.getElementById('servicePhoto').value;

    if (!name || !duration || !price || !description) {
        alert("Please complete all required service details.");
        return;
    }

    if (editId) {
        window.ChanuServices.update(editId, { name, category, duration, price, tag, description, photo });
        alert(`Service "${name}" updated successfully!`);
    } else {
        window.ChanuServices.add({ name, category, duration, price, tag, description, photo });
        alert(`Service "${name}" added to catalog successfully!`);
    }

    resetServiceForm();
    renderAdminServicesTable();
    updateOverviewStats();
};

window.editService = function(id) {
    if (!window.ChanuServices) return;
    const services = window.ChanuServices.getAll();
    const s = services.find(x => x.id === id);
    if (!s) return;

    document.getElementById('editServiceId').value = s.id;
    document.getElementById('serviceName').value = s.name;
    document.getElementById('serviceCategory').value = s.category;
    document.getElementById('serviceDuration').value = s.duration;
    document.getElementById('servicePrice').value = s.price;
    document.getElementById('serviceTag').value = s.tag || 'Popular';
    document.getElementById('serviceDescription').value = s.description;
    document.getElementById('servicePhoto').value = s.photo;

    document.getElementById('serviceFormTitle').textContent = `Edit Service: ${s.name}`;
    document.getElementById('btnSaveService').innerHTML = '<i class="fas fa-check"></i> Update Service';
    document.getElementById('btnCancelEditService').style.display = 'inline-flex';

    document.getElementById('serviceManageForm').scrollIntoView({ behavior: 'smooth' });
};

window.resetServiceForm = function() {
    document.getElementById('editServiceId').value = '';
    document.getElementById('serviceManageForm').reset();
    document.getElementById('serviceFormTitle').textContent = 'Add New Salon Service (නව සේවාවක් එක් කරන්න)';
    document.getElementById('btnSaveService').innerHTML = '<i class="fas fa-save"></i> Save Service to Catalog';
    document.getElementById('btnCancelEditService').style.display = 'none';
};

window.deleteService = function(id, name) {
    if (!confirm(`Are you sure you want to delete "${name}" from salon services?`)) return;
    if (window.ChanuServices) {
        window.ChanuServices.delete(id);
        renderAdminServicesTable();
        updateOverviewStats();
    }
};

// 5. TAB 3: USER MANAGEMENT LOGIC (Only Admin can add users)
function initUserData() {
    let users = JSON.parse(localStorage.getItem('chanu_registered_users') || '[]');
    const hasAdmin = users.some(u => u.username.toLowerCase() === 'admin');
    if (!hasAdmin) {
        users.unshift(DEFAULT_ADMIN);
        localStorage.setItem('chanu_registered_users', JSON.stringify(users));
    }
}

window.renderAdminUsersTable = function() {
    const tbody = document.getElementById('usersManageTableBody');
    if (!tbody) return;

    const users = JSON.parse(localStorage.getItem('chanu_registered_users') || '[]');
    const statUsers = document.getElementById('statUsersCount');
    if (statUsers) statUsers.textContent = `${users.length} Users`;

    let html = '';
    users.forEach((u, idx) => {
        const isAdmin = (u.role === 'Admin');
        const roleBadge = isAdmin
            ? `<span class="role-tag admin"><i class="fas fa-crown"></i> Admin / Staff</span>`
            : `<span class="role-tag client"><i class="fas fa-user"></i> Client</span>`;

        const joinedStr = u.registeredAt ? u.registeredAt.split('T')[0] : '2025-01-01';

        html += `
            <tr>
                <td><strong>#${idx + 1}</strong></td>
                <td><strong>${escapeHtml(u.fullName || u.username)}</strong></td>
                <td><code>@${escapeHtml(u.username)}</code></td>
                <td>${roleBadge}</td>
                <td><code><i class="fas fa-phone"></i> ${escapeHtml(u.phone || 'N/A')}</code></td>
                <td>${escapeHtml(u.email || 'N/A')}</td>
                <td>${joinedStr}</td>
                <td>
                    ${u.username.toLowerCase() === 'admin'
                        ? `<span style="font-size: 11px; color: #94a3b8;"><i class="fas fa-lock"></i> Protected</span>`
                        : `<button type="button" class="btn-delete-row" onclick="deleteUser('${u.username}')"><i class="fas fa-trash-alt"></i> Delete</button>`
                    }
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
};

window.handleSaveUser = function(e) {
    e.preventDefault();
    const fullName = document.getElementById('newFullName').value.trim();
    const username = document.getElementById('newUsername').value.trim();
    const role = document.getElementById('newRole').value;
    const phone = document.getElementById('newPhone').value.trim();
    const email = document.getElementById('newEmail').value.trim();
    const password = document.getElementById('newPassword').value.trim();

    if (!fullName || !username || !phone || !email || !password) {
        alert("Please fill in all user details.");
        return;
    }

    let users = JSON.parse(localStorage.getItem('chanu_registered_users') || '[]');
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        alert(`Username "${username}" already exists. Please pick another.`);
        return;
    }

    const newUser = {
        id: Date.now(),
        fullName,
        username,
        role,
        phone,
        email,
        password,
        registeredAt: new Date().toISOString()
    };

    users.push(newUser);
    localStorage.setItem('chanu_registered_users', JSON.stringify(users));
    alert(`User "${fullName}" successfully created as ${role}!`);

    document.getElementById('userManageForm').reset();
    renderAdminUsersTable();
    updateOverviewStats();
};

window.deleteUser = function(username) {
    if (username.toLowerCase() === 'admin') {
        alert("The Master Admin account cannot be deleted.");
        return;
    }
    if (!confirm(`Delete user "${username}" from the system?`)) return;

    let users = JSON.parse(localStorage.getItem('chanu_registered_users') || '[]');
    users = users.filter(u => u.username.toLowerCase() !== username.toLowerCase());
    localStorage.setItem('chanu_registered_users', JSON.stringify(users));

    renderAdminUsersTable();
    updateOverviewStats();
};

// 6. TAB 4: SCHEDULE & WORKING HOURS LOGIC
function initScheduleData() {
    let sched = localStorage.getItem('chanu_schedule');
    if (!sched) {
        localStorage.setItem('chanu_schedule', JSON.stringify(DEFAULT_SCHEDULE));
    }
}

window.renderScheduleTable = function() {
    const tbody = document.getElementById('scheduleTableBody');
    if (!tbody) return;

    const sched = JSON.parse(localStorage.getItem('chanu_schedule') || JSON.stringify(DEFAULT_SCHEDULE));
    let html = '';

    sched.forEach((row, idx) => {
        const statusBadge = row.isWorking
            ? `<span class="status-badge status-confirmed">OPEN FOR BOOKING</span>`
            : `<span class="status-badge status-cancelled">CLOSED</span>`;

        html += `
            <tr>
                <td><strong>${row.day}</strong></td>
                <td><code>${row.open}</code></td>
                <td><code>${row.close}</code></td>
                <td>${statusBadge}</td>
                <td><span class="slot-pill">${row.capacity} slots/hour</span></td>
                <td>
                    <button class="btn-edit-row" onclick="toggleScheduleDay(${idx})">
                        <i class="fas fa-toggle-on"></i> Toggle Status
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
};

window.toggleScheduleDay = function(idx) {
    let sched = JSON.parse(localStorage.getItem('chanu_schedule') || JSON.stringify(DEFAULT_SCHEDULE));
    if (sched[idx]) {
        sched[idx].isWorking = !sched[idx].isWorking;
        localStorage.setItem('chanu_schedule', JSON.stringify(sched));
        renderScheduleTable();
    }
};

// ==============================================================================
// 7. BUSINESS BRAIN: THE MEMORY, THE SENSES & THE REFLEXES (Salesforce Framework)
// ==============================================================================

let activeLifecycleFilter = 'all';
let selectedCustomerPhone = null;

// Normalize Phone Number (The Senses: Accuracy & Consistency)
function normalizePhone(raw) {
    if (!raw) return "";
    let clean = String(raw).replace(/[^0-9]/g, '');
    if (clean.startsWith('94') && clean.length === 11) {
        clean = '0' + clean.substring(2);
    } else if (clean.startsWith('7') && clean.length === 9) {
        clean = '0' + clean;
    }
    return clean;
}

function initRealtimeCRM() {
    if (!window.salonDB || !window.salonDB.db) {
        window.addEventListener('firebase-ready', () => {
            attachFirestoreListener();
        });
        return;
    }
    attachFirestoreListener();
}

function attachFirestoreListener() {
    const { db, collection, onSnapshot, query } = window.salonDB;
    const tableBody = document.getElementById('crmTableBody');

    try {
        const q = query(collection(db, "appointments"));
        
        let isInitialSnapshot = true;
        unsubscribeListener = onSnapshot(q, (snapshot) => {
            const isFirst = isInitialSnapshot;
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    if (!isFirst && (data.status === 'Pending' || data.isEscalated)) {
                        showAdminNewBookingToast(change.doc.id, data);
                    }
                }
            });
            isInitialSnapshot = false;

            allAppointments = [];
            snapshot.forEach(doc => {
                allAppointments.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            allAppointments.sort((a, b) => {
                const dateA = (a.bookingDate || "") + " " + (a.bookingTime || "");
                const dateB = (b.bookingDate || "") + " " + (b.bookingTime || "");
                return dateB.localeCompare(dateA);
            });

            updateOverviewStats();
            handleEscalations();
            calculateDataQuality();
            renderCRMTable();
            renderClientsTable();
            renderTodayScheduleTable();
        }, (err) => {
            console.error("Firestore listener error:", err);
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Listening for live bookings... (${err.message})</td></tr>`;
            }
        });
    } catch (err) {
        console.error("Error setting up onSnapshot listener:", err);
    }
}

// ------------------------------------------------------------------------------
// THE REFLEXES: HUMAN ESCALATION DETECTOR & ALERT (Slide 23 & 25)
// ------------------------------------------------------------------------------
function handleEscalations() {
    const escalations = allAppointments.filter(x => x.isEscalated === true || x.status === 'Escalated');
    const badge = document.getElementById('escalatedCountBadge');
    const statBadge = document.getElementById('statEscalationsCount');
    const banner = document.getElementById('escalationAlertBanner');
    const actionBtns = document.getElementById('escalationActionBtns');

    if (badge) badge.textContent = escalations.length;
    if (statBadge) statBadge.textContent = escalations.length;

    if (!banner) return;

    if (escalations.length > 0) {
        banner.style.display = 'flex';
        const urgent = escalations[0];
        let phone = normalizePhone(urgent.customerPhone);
        let intlPhone = phone.startsWith('0') ? '94' + phone.substring(1) : phone;
        const msg = encodeURIComponent(`Dear ${urgent.customerName || 'Client'}, this is the Salon Director at Chanu Salon. Our AI concierge alerted us regarding your inquiry. I am personally following up to make sure your experience is perfect.`);
        
        if (actionBtns) {
            actionBtns.innerHTML = `
                <a href="https://wa.me/${intlPhone}?text=${msg}" target="_blank" class="btn-save-form" style="background: #dc2626; padding: 8px 14px; font-size: 12px; text-decoration: none;">
                    <i class="fab fa-whatsapp"></i> Resolve on WhatsApp
                </a>
                <button class="btn-edit-row" onclick="updateStatus('${urgent.id}', 'Confirmed')" style="background: #ffffff; border-color: #f87171; color: #dc2626;">
                    Mark Resolved
                </button>
            `;
        }
    } else {
        banner.style.display = 'none';
    }
}

// ------------------------------------------------------------------------------
// THE SENSES: 5 DATA QUALITY CHECKS & HEALTH SCORE (Slide 14 & 15)
// Complete, Accurate, Consistent, Timely, Unique
// ------------------------------------------------------------------------------
function calculateDataQuality() {
    if (allAppointments.length === 0) return;

    let completenessPass = 0;
    let accuracyPass = 0;
    let consistencyPass = 0;
    let timelinessPass = 0;
    let uniquenessMap = new Set();
    let duplicatesCount = 0;

    allAppointments.forEach(item => {
        // 1. Complete: Has name & phone
        if (item.customerName && item.customerPhone) completenessPass++;

        // 2. Accurate: Sri Lankan mobile format (07X XXX XXXX)
        const clean = normalizePhone(item.customerPhone);
        if (/^07[0-9]{8}$/.test(clean)) accuracyPass++;

        // 3. Consistent: Clean service and casing
        if (item.service && item.customerName && item.customerName !== item.customerName.toLowerCase()) consistencyPass++;

        // 4. Timely: Has valid date
        if (item.bookingDate && item.bookingDate.length >= 8) timelinessPass++;

        // 5. Unique: Deduplication check
        if (clean) {
            if (uniquenessMap.has(clean)) duplicatesCount++;
            else uniquenessMap.add(clean);
        }
    });

    const total = allAppointments.length;
    const completenessScore = (completenessPass / total) * 20;
    const accuracyScore = (accuracyPass / total) * 25;
    const consistencyScore = (consistencyPass / total) * 20;
    const timelinessScore = (timelinessPass / total) * 15;
    const uniquenessScore = Math.max(0, 20 - (duplicatesCount * 2));

    const totalHealth = Math.round(completenessScore + accuracyScore + consistencyScore + timelinessScore + uniquenessScore);

    const badge = document.getElementById('dataHealthScoreBadge');
    const bar = document.getElementById('dataHealthBar');
    const summary = document.getElementById('dataHealthQualitySummary');
    const statHealth = document.getElementById('statDataHealth');

    if (badge) badge.textContent = `${totalHealth}% HEALTH`;
    if (bar) bar.style.width = `${totalHealth}%`;
    if (statHealth) statHealth.textContent = `${totalHealth}%`;
    if (summary) {
        summary.textContent = duplicatesCount === 0 
            ? "Unified 0 Duplicate Conflicts" 
            : `${duplicatesCount} Records Resolved into Customer 360`;
    }
}

// ------------------------------------------------------------------------------
// OVERVIEW STATS
// ------------------------------------------------------------------------------
function updateOverviewStats() {
    const todayStr = new Date().toISOString().split('T')[0];
    let todayCount = 0;
    let upcomingCount = 0;

    allAppointments.forEach(item => {
        if (item.bookingDate === todayStr && item.status !== 'Cancelled') {
            todayCount++;
        }
        if (item.bookingDate > todayStr && item.status !== 'Cancelled') {
            upcomingCount++;
        }
    });

    const elToday = document.getElementById('statToday');
    const elUpcoming = document.getElementById('statUpcoming');
    const todayDateBadge = document.getElementById('todayDateBadge');

    if (elToday) elToday.textContent = todayCount;
    if (elUpcoming) elUpcoming.textContent = upcomingCount;
    if (todayDateBadge) todayDateBadge.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ------------------------------------------------------------------------------
// TODAY SCHEDULE
// ------------------------------------------------------------------------------
function renderTodayScheduleTable() {
    const tbody = document.getElementById('todayScheduleBody');
    if (!tbody) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayAppointments = allAppointments.filter(x => x.bookingDate === todayStr);

    if (todayAppointments.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 24px; color: #94a3b8;">
                    <i class="far fa-calendar-check" style="font-size: 24px; margin-bottom: 6px; display: block;"></i>
                    No appointments scheduled for today yet.
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    todayAppointments.forEach((item, idx) => {
        const isWA = (item.channel === 'whatsapp');
        const channelBadge = isWA 
            ? `<span class="badge-channel wa"><i class="fab fa-whatsapp"></i> WhatsApp</span>`
            : `<span class="badge-channel web"><i class="fas fa-globe"></i> Web</span>`;

        let statusClass = 'status-pending';
        if (item.status === 'Confirmed') statusClass = 'status-confirmed';
        else if (item.status === 'Completed') statusClass = 'status-completed';
        else if (item.status === 'Cancelled') statusClass = 'status-cancelled';
        else if (item.status === 'Escalated') statusClass = 'status-cancelled';

        const displayTime = item.requestedSlot || item.bookingTime || item.submissionTime || '--:--';
        html += `
            <tr onclick="openBookingDetailModal('${item.id}')" style="cursor: pointer;" title="Click to view full booking details & actions">
                <td><strong>#${idx + 1}</strong></td>
                <td><span class="slot-pill" title="Booking submitted at (SLST)">${escapeHtml(displayTime)}</span></td>
                <td><strong>${escapeHtml(item.customerName || 'Valued Client')}</strong> <span class="client-phone">${escapeHtml(item.customerPhone || '')}</span></td>
                <td>${escapeHtml(item.service || 'General Service')}</td>
                <td>${channelBadge}</td>
                <td><strong>Rs. ${Number(item.price || 0).toLocaleString()}</strong></td>
                <td><span class="status-badge ${statusClass}">${escapeHtml(item.status || 'Pending')}</span></td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// ------------------------------------------------------------------------------
// REAL-TIME OMNICHANNEL CRM STREAM TABLE
// ------------------------------------------------------------------------------
function renderCRMTable() {
    const tableBody = document.getElementById('crmTableBody');
    if (!tableBody) return;

    let filtered = allAppointments;
    if (activeFilter === 'website') {
        filtered = allAppointments.filter(x => x.channel === 'website');
    } else if (activeFilter === 'whatsapp') {
        filtered = allAppointments.filter(x => x.channel === 'whatsapp');
    } else if (activeFilter === 'confirmed') {
        filtered = allAppointments.filter(x => x.status === 'Confirmed');
    } else if (activeFilter === 'escalated') {
        filtered = allAppointments.filter(x => x.isEscalated === true || x.status === 'Escalated');
    }

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #94a3b8;">
                    <i class="fas fa-inbox" style="font-size: 32px; margin-bottom: 10px; display: block;"></i>
                    No appointments or leads found in this stream.
                </td>
            </tr>
        `;
        return;
    }

    let rowsHtml = '';
    filtered.forEach((item, index) => {
        const isWA = (item.channel === 'whatsapp');
        const channelBadge = isWA 
            ? `<span class="badge-channel wa"><i class="fab fa-whatsapp"></i> WhatsApp</span>`
            : `<span class="badge-channel web"><i class="fas fa-globe"></i> Website</span>`;

        let statusClass = 'status-pending';
        if (item.status === 'Confirmed') statusClass = 'status-confirmed';
        else if (item.status === 'Completed') statusClass = 'status-completed';
        else if (item.status === 'Cancelled') statusClass = 'status-cancelled';
        else if (item.status === 'Escalated' || item.isEscalated) statusClass = 'status-cancelled';

        let cleanPhone = normalizePhone(item.customerPhone);
        let intlPhone = cleanPhone.startsWith('0') ? '94' + cleanPhone.substring(1) : cleanPhone;
        const waMsg = encodeURIComponent(`Hello ${item.customerName || 'Valued Client'}! This is Chanu Salon regarding your inquiry for ${item.service} on ${item.bookingDate} at ${item.bookingTime}.`);
        const waLink = `https://wa.me/${intlPhone}?text=${waMsg}`;

        const displayTime = item.requestedSlot || item.bookingTime || item.submissionTime || '--:--';
        rowsHtml += `
            <tr onclick="openBookingDetailModal('${item.id}')" style="cursor: pointer; ${item.isEscalated ? 'background: #fff5f5;' : ''}" title="Click to view full booking details & actions">
                <td><strong>#${index + 1}</strong></td>
                <td>${channelBadge}</td>
                <td>
                    <div class="client-cell">
                        <strong>${escapeHtml(item.customerName || 'Valued Client')}</strong>
                        <span class="client-phone"><i class="fas fa-phone-alt"></i> ${escapeHtml(item.customerPhone || 'N/A')}</span>
                        ${item.isEscalated ? `<span style="font-size: 10px; color: #dc2626; font-weight: 800;"><i class="fas fa-exclamation-circle"></i> ESCALATED</span>` : ''}
                    </div>
                </td>
                <td>
                    <strong>${escapeHtml(item.service || 'General Service')}</strong>
                    <span class="sub-text">${item.duration || 45} mins</span>
                </td>
                <td>
                    <strong>${escapeHtml(item.bookingDate || '--')}</strong>
                    <span class="slot-pill" title="Booking submitted at (SLST)">${escapeHtml(displayTime)}</span>
                </td>
                <td><strong>Rs. ${Number(item.price || 0).toLocaleString()}</strong></td>
                <td><span class="status-badge ${statusClass}">${escapeHtml(item.status || 'Pending')}</span></td>
                <td onclick="event.stopPropagation()">
                    <div class="action-buttons-group">
                        <button class="btn-action check" title="Confirm Booking with Alert" onclick="confirmAppointmentWithAlert('${item.id}')"><i class="fas fa-check"></i></button>
                        <button class="btn-action complete" title="Mark Completed" onclick="updateStatus('${item.id}', 'Completed')"><i class="fas fa-check-double"></i></button>
                        <button class="btn-action cancel" title="Cancel Booking" onclick="cancelAppointmentWithAlert('${item.id}')"><i class="fas fa-times"></i></button>
                        ${cleanPhone ? `<a href="${waLink}" target="_blank" class="btn-action wa-btn" title="Chat on WhatsApp"><i class="fab fa-whatsapp"></i></a>` : ''}
                    </div>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = rowsHtml;
}

// ------------------------------------------------------------------------------
// THE MEMORY: CUSTOMER 360 DIRECTORY & 5-STAGE LIFECYCLE (Slide 8, 10, 16)
// Lead -> Prospect -> Customer -> Repeat -> Advocate
// ------------------------------------------------------------------------------
function buildCustomer360Profiles() {
    const clientsMap = {};

    allAppointments.forEach(item => {
        const rawPhone = (item.customerPhone || "").trim();
        const phone = normalizePhone(rawPhone) || rawPhone;
        if (!phone) return;

        if (!clientsMap[phone]) {
            clientsMap[phone] = {
                name: item.customerName || 'VIP Client',
                phone: phone,
                visits: 0,
                totalSpend: 0,
                lastService: item.service || 'Hair Treatment',
                lastDate: item.bookingDate || '',
                channels: new Set(),
                appointments: [],
                hasEscalation: false,
                stage: 'Lead',
                isChurnRisk: false
            };
        }

        const profile = clientsMap[phone];
        profile.appointments.push(item);
        if (item.channel) profile.channels.add(item.channel);
        if (item.isEscalated || item.status === 'Escalated') profile.hasEscalation = true;

        if (item.status === 'Confirmed' || item.status === 'Completed') {
            profile.visits++;
            profile.totalSpend += Number(item.price || 0);
        }

        if (item.bookingDate && item.bookingDate >= profile.lastDate) {
            profile.lastDate = item.bookingDate;
            profile.lastService = item.service || profile.lastService;
            if (item.customerName && item.customerName !== 'Website Visitor') {
                profile.name = item.customerName;
            }
        }
    });

    // Compute Lifecycle Stages & Churn Risk
    const today = new Date();
    let churnRiskCount = 0;

    Object.values(clientsMap).forEach(c => {
        // 5 Lifecycle Stages (Slide 10)
        if (c.visits >= 5 || c.totalSpend >= 20000) {
            c.stage = 'Advocate';
        } else if (c.visits >= 2) {
            c.stage = 'Repeat';
        } else if (c.visits === 1) {
            c.stage = 'Customer';
        } else if (c.appointments.length > 0 && c.appointments.some(a => a.status === 'Pending' || a.service.includes('Booking'))) {
            c.stage = 'Prospect';
        } else {
            c.stage = 'Lead';
        }

        // Predictive Churn Risk (Slide 16): > 30 days without return for existing customers
        if (c.lastDate && (c.stage === 'Customer' || c.stage === 'Repeat' || c.stage === 'Advocate')) {
            const lastBooking = new Date(c.lastDate);
            const diffDays = Math.round((today - lastBooking) / (1000 * 60 * 60 * 24));
            if (diffDays > 30) {
                c.isChurnRisk = true;
                churnRiskCount++;
            }
        }
    });

    const churnBadge = document.getElementById('churnRiskCountBadge');
    if (churnBadge) churnBadge.textContent = churnRiskCount;

    const statUnified = document.getElementById('statUnifiedClients');
    if (statUnified) statUnified.textContent = Object.keys(clientsMap).length;

    return clientsMap;
}

function renderClientsTable() {
    const clientsBody = document.getElementById('clientsTableBody');
    if (!clientsBody) return;

    const clientsMap = buildCustomer360Profiles();
    let clientList = Object.values(clientsMap);

    // Apply Lifecycle Filter
    if (activeLifecycleFilter === 'churn_risk') {
        clientList = clientList.filter(c => c.isChurnRisk);
    } else if (activeLifecycleFilter !== 'all') {
        clientList = clientList.filter(c => c.stage === activeLifecycleFilter);
    }

    clientList.sort((a, b) => b.totalSpend - a.totalSpend);

    if (clientList.length === 0) {
        clientsBody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 30px; color: #94a3b8;">No customer profiles match the '${activeLifecycleFilter}' filter.</td></tr>`;
        return;
    }

    let html = '';
    clientList.forEach((c, idx) => {
        let cleanPhone = normalizePhone(c.phone);
        let intlPhone = cleanPhone.startsWith('0') ? '94' + cleanPhone.substring(1) : cleanPhone;
        
        // Stage Badge Styling (Slide 10)
        let stageClass = 'stage-lead';
        if (c.stage === 'Prospect') stageClass = 'stage-prospect';
        else if (c.stage === 'Customer') stageClass = 'stage-customer';
        else if (c.stage === 'Repeat') stageClass = 'stage-repeat';
        else if (c.stage === 'Advocate') stageClass = 'stage-advocate';

        const waMsg = encodeURIComponent(
            c.isChurnRisk 
                ? `Hello ${c.name}! We've missed pampering you at Chanu Salon. 🌸 Enjoy an exclusive 15% VIP Return Courtesy on your next hair or facial treatment this month!`
                : `Hello ${c.name}! This is Chanu Salon checking in. Let us know if you'd like to reserve your next VIP beauty slot!`
        );
        const waLink = `https://wa.me/${intlPhone}?text=${waMsg}`;
        const channelsArr = Array.from(c.channels);

        html += `
            <tr style="cursor: pointer;" onclick="openCustomer360('${cleanPhone}')">
                <td><strong>#${idx + 1}</strong></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 28px; height: 28px; border-radius: 50%; background: #fdf2f8; color: var(--crm-primary); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800;">
                            ${escapeHtml(c.name.substring(0, 2).toUpperCase())}
                        </div>
                        <strong>${escapeHtml(c.name)}</strong>
                    </div>
                </td>
                <td><code><i class="fas fa-phone"></i> ${escapeHtml(c.phone)}</code></td>
                <td><span class="stage-badge ${stageClass}">${escapeHtml(c.stage)}</span></td>
                <td><span class="slot-pill">${c.visits} Bookings</span></td>
                <td><strong style="color: #059669;">Rs. ${c.totalSpend.toLocaleString()}</strong></td>
                <td>${escapeHtml(c.lastService)}</td>
                <td>
                    ${c.isChurnRisk 
                        ? `<span class="badge-churn-risk"><i class="fas fa-exclamation-triangle"></i> >30d Inactive</span>` 
                        : `<span style="font-size: 11px; color: #10b981; font-weight: 700;"><i class="fas fa-check-circle"></i> Active</span>`
                    }
                </td>
                <td onclick="event.stopPropagation()">
                    <div style="display: flex; gap: 6px;">
                        <button class="filter-pill" style="padding: 5px 10px; font-size: 11px;" onclick="openCustomer360('${cleanPhone}')">
                            <i class="fas fa-user-circle"></i> 360 View
                        </button>
                        <a href="${waLink}" target="_blank" class="filter-pill" style="text-decoration: none; display: inline-flex; align-items: center; gap: 4px; background: #25d366; color: white; border: none; font-size: 11px; padding: 5px 10px;">
                            <i class="fab fa-whatsapp"></i> Chat
                        </a>
                    </div>
                </td>
            </tr>
        `;
    });

    clientsBody.innerHTML = html;
}

// ------------------------------------------------------------------------------
// CUSTOMER 360 DRAWER LOGIC (Slide 8 & 9)
// ------------------------------------------------------------------------------
window.openCustomer360 = function(phone) {
    selectedCustomerPhone = phone;
    const clientsMap = buildCustomer360Profiles();
    const c = clientsMap[phone];
    if (!c) return;

    const overlay = document.getElementById('customer360Overlay');
    if (!overlay) return;

    // Set Header
    document.getElementById('c360Name').textContent = c.name;
    document.getElementById('c360Phone').textContent = c.phone;
    document.getElementById('c360Avatar').textContent = c.name.substring(0, 2).toUpperCase();
    
    const stageBadge = document.getElementById('c360StageBadge');
    stageBadge.className = `stage-badge stage-${c.stage.toLowerCase()}`;
    stageBadge.textContent = c.stage;

    // Set Key Metrics
    document.getElementById('c360TotalSpend').textContent = `Rs. ${c.totalSpend.toLocaleString()}`;
    document.getElementById('c360VisitsCount').textContent = c.visits;
    
    const riskEl = document.getElementById('c360RiskStatus');
    if (c.isChurnRisk) {
        riskEl.textContent = 'High (>30d)';
        riskEl.style.color = '#e11d48';
    } else {
        riskEl.textContent = 'Low (Active)';
        riskEl.style.color = '#059669';
    }

    // Set WhatsApp link
    let intlPhone = phone.startsWith('0') ? '94' + phone.substring(1) : phone;
    const waMsg = encodeURIComponent(`Hello ${c.name}! This is the senior concierge team from Chanu Salon. We are delighted to assist with your next beauty experience.`);
    document.getElementById('c360WaBtn').href = `https://wa.me/${intlPhone}?text=${waMsg}`;

    // Render Timeline
    const timeline = document.getElementById('c360TimelineList');
    if (timeline) {
        if (c.appointments.length === 0) {
            timeline.innerHTML = `<p style="font-size: 12.5px; color: #94a3b8;">No past interaction records found.</p>`;
        } else {
            timeline.innerHTML = c.appointments.map(a => `
                <div class="c360-history-item">
                    <div>
                        <strong style="font-size: 13px; color: #0f172a;">${escapeHtml(a.service || 'Salon Service')}</strong>
                        <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">
                            <i class="far fa-calendar-alt"></i> ${escapeHtml(a.bookingDate || '--')} at ${escapeHtml(a.bookingTime || '--')} · 
                            <span style="text-transform: capitalize;">${escapeHtml(a.channel || 'web')}</span>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <strong style="color: #059669; font-size: 13px;">Rs. ${Number(a.price || 0).toLocaleString()}</strong>
                        <div><span class="status-badge status-${(a.status || 'pending').toLowerCase()}">${escapeHtml(a.status || 'Pending')}</span></div>
                    </div>
                </div>
            `).join('');
        }
    }

    // Render Cases & Special Notes (Slide 9 & 11)
    renderCustomerCases(phone);

    overlay.style.display = 'flex';
};

window.closeCustomer360Drawer = function(e) {
    if (e && e.target && e.target.id !== 'customer360Overlay' && !e.target.classList.contains('c360-close-btn')) return;
    const overlay = document.getElementById('customer360Overlay');
    if (overlay) overlay.style.display = 'none';
};

// Cases / Notes Storage & Renderer
function renderCustomerCases(phone) {
    const list = document.getElementById('c360CasesList');
    if (!list) return;

    const savedCases = JSON.parse(localStorage.getItem(`chanu_cases_${phone}`) || '[]');
    if (savedCases.length === 0) {
        list.innerHTML = `<p style="font-size: 12px; color: #94a3b8; font-style: italic;">No specific scalp sensitivities, allergies, or complaint notes recorded for this client yet.</p>`;
        return;
    }

    list.innerHTML = savedCases.map((c, i) => `
        <div class="c360-case-card">
            <div style="display: flex; justify-content: space-between; font-weight: 700; color: #92400e; margin-bottom: 3px;">
                <span><i class="fas fa-tag"></i> ${escapeHtml(c.type)}</span>
                <span style="font-size: 11px; font-weight: 400; color: #b45309;">${new Date(c.date).toLocaleDateString()}</span>
            </div>
            <div>${escapeHtml(c.description)}</div>
        </div>
    `).join('');
}

window.openAddCaseModal = function() {
    if (!selectedCustomerPhone) return;
    document.getElementById('caseTargetPhone').value = selectedCustomerPhone;
    document.getElementById('caseDescriptionText').value = '';
    document.getElementById('addCaseModal').style.display = 'flex';
};

window.closeAddCaseModal = function() {
    document.getElementById('addCaseModal').style.display = 'none';
};

window.handleSaveCustomerCase = async function(e) {
    e.preventDefault();
    const phone = document.getElementById('caseTargetPhone').value;
    const type = document.getElementById('caseTypeSelect').value;
    const desc = document.getElementById('caseDescriptionText').value.trim();
    if (!phone || !desc) return;

    // Save locally
    const cases = JSON.parse(localStorage.getItem(`chanu_cases_${phone}`) || '[]');
    cases.unshift({
        type: type,
        description: desc,
        date: new Date().toISOString()
    });
    localStorage.setItem(`chanu_cases_${phone}`, JSON.stringify(cases));

    // Post to serverless endpoint
    fetch('/api/case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, type, description: desc })
    }).catch(() => {});

    closeAddCaseModal();
    renderCustomerCases(phone);
};

// ------------------------------------------------------------------------------
// CONTROLS & EVENT LISTENERS
// ------------------------------------------------------------------------------
window.updateStatus = async function(docId, newStatus) {
    if (!window.salonDB || !window.salonDB.db) return;
    try {
        const { db, doc, updateDoc } = window.salonDB;
        await updateDoc(doc(db, "appointments", docId), {
            status: newStatus,
            isEscalated: (newStatus === 'Escalated')
        });
        console.log(`Updated appointment ${docId} to ${newStatus}`);
    } catch (err) {
        alert("Failed to update status: " + err.message);
    }
};

window.setFilter = function(filterName, btn) {
    activeFilter = filterName;
    document.querySelectorAll('#tabCRM .filter-bar:not(#lifecycleFilterBar) .filter-pill').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderCRMTable();
};

window.setLifecycleFilter = function(stageName, btn) {
    activeLifecycleFilter = stageName;
    document.querySelectorAll('#lifecycleFilterBar .filter-pill').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderClientsTable();
};

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
}

// Start on DOM load
document.addEventListener('DOMContentLoaded', () => {
    window.checkAdminAuth();
});



// ------------------------------------------------------------------------------
// BOOKING DETAILS MODAL & CUSTOMER CONFIRMATION SOUND ALERT
// ------------------------------------------------------------------------------
window.playChimeSound = function() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') ctx.resume();
        const now = ctx.currentTime;
        
        // Bell 1: E5 (659.25 Hz)
        const osc1 = ctx.createOscillator();
        const g1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, now);
        g1.gain.setValueAtTime(0.25, now);
        g1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc1.connect(g1);
        g1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.35);

        // Bell 2: B5 (987.77 Hz)
        const osc2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(987.77, now + 0.12);
        g2.gain.setValueAtTime(0.3, now + 0.12);
        g2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        osc2.connect(g2);
        g2.connect(ctx.destination);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.65);
    } catch (e) {
        console.warn('Audio chime notice:', e);
    }
};

window.confirmAppointmentWithAlert = async function(docId) {
    window.playChimeSound();
    await window.updateStatus(docId, 'Confirmed');

    // Broadcast confirmation to client session via localStorage
    try {
        localStorage.setItem('chanu_last_confirmed_id', docId);
        localStorage.setItem('chanu_last_confirmed_time', Date.now());
    } catch(e) {}

    // Update modal badge if currently open for this booking
    if (window._currentModalAppointment && window._currentModalAppointment.id === docId) {
        const badge = document.getElementById('bmStatusBadge');
        if (badge) badge.innerHTML = `<span class="status-badge status-confirmed">Confirmed</span>`;
    }

    window.showAdminToast("✅ Appointment Confirmed! Notification & alert chime dispatched to client.");
};

window.openBookingDetailModal = function(id) {
    const item = allAppointments.find(x => x.id === id);
    if (!item) return;
    window._currentModalAppointment = item;
    window._currentModalAppointmentId = id;

    const modal = document.getElementById('bookingDetailModal');
    if (!modal) return;

    const shortId = (item.id || '').length > 6 ? item.id.slice(-6).toUpperCase() : item.id;
    document.getElementById('bmModalTitle').textContent = `Appointment #${shortId}`;
    document.getElementById('bmModalId').textContent = `Record ID: ${item.id} • Channel: ${item.channel || 'web'}`;
    document.getElementById('bmCustomerName').textContent = item.customerName || 'Valued Client';
    document.getElementById('bmCustomerPhone').textContent = item.customerPhone || 'Not provided';
    document.getElementById('bmServiceName').textContent = item.service || 'General Service';
    document.getElementById('bmServicePrice').textContent = `Rs. ${Number(item.price || 0).toLocaleString()}`;
    
    const displayTime = item.requestedSlot || item.bookingTime || item.submissionTime || '--:--';
    document.getElementById('bmSubmissionTime').textContent = `${displayTime} (Date: ${item.bookingDate || '--'})`;
    
    let statusClass = 'status-pending';
    if (item.status === 'Confirmed') statusClass = 'status-confirmed';
    else if (item.status === 'Completed') statusClass = 'status-completed';
    else if (item.status === 'Cancelled') statusClass = 'status-cancelled';
    else if (item.status === 'Escalated') statusClass = 'status-cancelled';

    document.getElementById('bmStatusBadge').innerHTML = `<span class="status-badge ${statusClass}">${escapeHtml(item.status || 'Pending')}</span>`;
    document.getElementById('bmInquiryText').textContent = item.inquiry || item.inquiry_text || 'No extra notes provided.';

    // WhatsApp quick link
    const cleanPhone = normalizePhone(item.customerPhone);
    const intlPhone = cleanPhone.startsWith('0') ? '94' + cleanPhone.substring(1) : cleanPhone;
    const waLink = document.getElementById('bmBtnWhatsApp');
    if (waLink) {
        if (cleanPhone) {
            waLink.style.display = 'inline-flex';
            const msg = encodeURIComponent(`Hello ${item.customerName || 'Valued Client'}! This is Chanu Salon regarding your appointment for ${item.service} booked at ${displayTime}.`);
            waLink.href = `https://wa.me/${intlPhone}?text=${msg}`;
        } else {
            waLink.style.display = 'none';
        }
    }

    modal.style.display = 'flex';
};

window.closeBookingDetailModal = function() {
    const modal = document.getElementById('bookingDetailModal');
    if (modal) modal.style.display = 'none';
    window._currentModalAppointment = null;
    window._currentModalAppointmentId = null;
};

window.confirmFromModal = async function() {
    if (!window._currentModalAppointmentId) return;
    await window.confirmAppointmentWithAlert(window._currentModalAppointmentId);
};

window.completeFromModal = async function() {
    if (!window._currentModalAppointmentId) return;
    await window.updateStatus(window._currentModalAppointmentId, 'Completed');
    const badge = document.getElementById('bmStatusBadge');
    if (badge) badge.innerHTML = `<span class="status-badge status-completed">Completed</span>`;
    window.showAdminToast("Appointment marked as Completed.");
};

window.cancelFromModal = async function() {
    if (!window._currentModalAppointmentId) return;
    if (confirm("Are you sure you want to cancel this booking? An alert notice and sound will be sent to the client.")) {
        await window.cancelAppointmentWithAlert(window._currentModalAppointmentId);
    }
};

window.showAdminToast = function(msg) {
    const existing = document.getElementById('adminToastNotification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'adminToastNotification';
    toast.style.cssText = 'position: fixed; bottom: 24px; right: 24px; background: #0f172a; color: #fff; padding: 12px 20px; border-radius: 12px; font-size: 13px; font-weight: 700; z-index: 100000; box-shadow: 0 10px 25px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 10px; border-left: 4px solid #10b981; animation: slideInUp 0.3s ease;';
    toast.innerHTML = `<span>${msg}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 350);
    }, 3500);
};

window.toggleAdminSidebar = function(force) {
    const sidebar = document.getElementById('adminSidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (!sidebar) return;
    const isOpen = sidebar.classList.contains('open');
    const shouldOpen = (force !== undefined) ? force : !isOpen;
    if (shouldOpen) {
        sidebar.classList.add('open');
        if (backdrop) backdrop.classList.add('active');
    } else {
        sidebar.classList.remove('open');
        if (backdrop) backdrop.classList.remove('active');
    }
};

// Auto close mobile sidebar on tab switch
const origSwitchAdminTab = window.switchAdminTab;
if (typeof origSwitchAdminTab === 'function') {
    window.switchAdminTab = function(tabName) {
        window.toggleAdminSidebar(false);
        return origSwitchAdminTab(tabName);
    };
}



// Admin Notification Audio Chime (Ascending 3-tone Concierge Bell)
function playAdminNewBookingChime() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') ctx.resume();
        const now = ctx.currentTime;

        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.12);
            gain.gain.setValueAtTime(0.28, now + idx * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.12);
            osc.stop(now + idx * 0.12 + 0.35);
        });
    } catch(e) {
        console.warn('Admin audio chime notice:', e);
    }
}

function showAdminNewBookingToast(docId, data) {
    playAdminNewBookingChime();

    // Flash document title for background tabs
    const oldTitle = document.title;
    document.title = "🔔 (1) New Booking Request! - Chanu Admin";
    setTimeout(() => { document.title = oldTitle; }, 12000);

    let toast = document.getElementById('adminNewBookingToast');
    if (toast) toast.remove();

    toast = document.createElement('div');
    toast.id = 'adminNewBookingToast';
    toast.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        background: #0f172a;
        color: #ffffff;
        padding: 16px 22px;
        border-radius: 16px;
        border-left: 5px solid #e11d48;
        box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        z-index: 100000;
        display: flex;
        align-items: center;
        gap: 16px;
        min-width: 320px;
        max-width: 440px;
        animation: slideInDown 0.4s ease;
    `;

    const name = data.customerName || 'Valued Client';
    const time = data.requestedSlot || data.bookingTime || 'New Slot';
    const serv = data.service || 'Salon Service';

    toast.innerHTML = `
        <div style="width: 42px; height: 42px; border-radius: 12px; background: rgba(225,29,72,0.15); color: #f43f5e; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">
            <i class="fas fa-bell"></i>
        </div>
        <div style="flex: 1;">
            <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #f43f5e; letter-spacing: 0.5px;">New Booking Request</div>
            <div style="font-size: 14px; font-weight: 700; color: #f8fafc; margin-top: 2px;">${name} • ${time}</div>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 2px;">${serv}</div>
        </div>
        <button type="button" style="background: #e11d48; color: #fff; border: none; padding: 7px 13px; border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap;" onclick="openBookingDetailModal('${docId}'); this.closest('#adminNewBookingToast').remove();">View</button>
        <button type="button" style="background: none; border: none; color: #64748b; font-size: 18px; cursor: pointer;" onclick="this.closest('#adminNewBookingToast').remove();">&times;</button>
    `;

    document.body.appendChild(toast);
    setTimeout(() => {
        if (toast && toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.4s';
            setTimeout(() => toast.remove(), 400);
        }
    }, 15000);
}


window.cancelAppointmentWithAlert = async function(docId) {
    if (!docId) return;
    await window.updateStatus(docId, 'Cancelled');

    // Broadcast cancellation to client session via localStorage
    try {
        localStorage.setItem('chanu_last_cancelled_id', docId);
        localStorage.setItem('chanu_last_cancelled_time', Date.now().toString());
    } catch(e) {}

    // Update modal badge if currently open for this booking
    if (window._currentModalAppointment && window._currentModalAppointment.id === docId) {
        const badge = document.getElementById('bmStatusBadge');
        if (badge) badge.innerHTML = `<span class="status-badge status-cancelled">Cancelled</span>`;
    }

    window.showAdminToast("⚠️ Appointment marked as Cancelled. Alert message & chime dispatched to client.");
};
