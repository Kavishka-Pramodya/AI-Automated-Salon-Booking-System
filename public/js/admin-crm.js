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
            : `<span class="role-tag client"><i class="fas fa-gem"></i> VIP Client</span>`;

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

// 7. TAB 5: REAL-TIME CLOUD CRM & OMNICHANNEL STREAM
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
        
        unsubscribeListener = onSnapshot(q, (snapshot) => {
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

        html += `
            <tr>
                <td><strong>#${idx + 1}</strong></td>
                <td><span class="slot-pill">${escapeHtml(item.bookingTime || '--:--')}</span></td>
                <td><strong>${escapeHtml(item.customerName || 'Valued Client')}</strong> <span class="client-phone">${escapeHtml(item.customerPhone || '')}</span></td>
                <td>${escapeHtml(item.service || 'General Service')}</td>
                <td>${channelBadge}</td>
                <td><strong>Rs. ${Number(item.price || 0).toLocaleString()}</strong></td>
                <td><span class="status-badge ${statusClass}">${escapeHtml(item.status || 'Confirmed')}</span></td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

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

        let cleanPhone = (item.customerPhone || "").replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = '94' + cleanPhone.substring(1);
        const waMsg = encodeURIComponent(`Hello ${item.customerName || 'Valued Client'}! This is Chanu Salon confirming your appointment for ${item.service} on ${item.bookingDate} at ${item.bookingTime}.`);
        const waLink = `https://wa.me/${cleanPhone}?text=${waMsg}`;

        rowsHtml += `
            <tr>
                <td><strong>#${index + 1}</strong></td>
                <td>${channelBadge}</td>
                <td>
                    <div class="client-cell">
                        <strong>${escapeHtml(item.customerName || 'Valued Client')}</strong>
                        <span class="client-phone"><i class="fas fa-phone-alt"></i> ${escapeHtml(item.customerPhone || 'N/A')}</span>
                    </div>
                </td>
                <td>
                    <strong>${escapeHtml(item.service || 'General Service')}</strong>
                    <span class="sub-text">${item.duration || 45} mins</span>
                </td>
                <td>
                    <strong>${escapeHtml(item.bookingDate || '--')}</strong>
                    <span class="slot-pill">${escapeHtml(item.bookingTime || '--:--')}</span>
                </td>
                <td><strong>Rs. ${Number(item.price || 0).toLocaleString()}</strong></td>
                <td><span class="status-badge ${statusClass}">${escapeHtml(item.status || 'Confirmed')}</span></td>
                <td>
                    <div class="action-buttons-group">
                        <button class="btn-action check" title="Mark Confirmed" onclick="updateStatus('${item.id}', 'Confirmed')"><i class="fas fa-check"></i></button>
                        <button class="btn-action complete" title="Mark Completed" onclick="updateStatus('${item.id}', 'Completed')"><i class="fas fa-check-double"></i></button>
                        <button class="btn-action cancel" title="Cancel Booking" onclick="updateStatus('${item.id}', 'Cancelled')"><i class="fas fa-times"></i></button>
                        ${cleanPhone ? `<a href="${waLink}" target="_blank" class="btn-action wa-btn" title="Chat on WhatsApp"><i class="fab fa-whatsapp"></i></a>` : ''}
                    </div>
                </td>
            </tr>
        `;
    });

    tableBody.innerHTML = rowsHtml;
}

function renderClientsTable() {
    const clientsBody = document.getElementById('clientsTableBody');
    if (!clientsBody) return;

    const clientsMap = {};

    allAppointments.forEach(item => {
        const phone = (item.customerPhone || "").trim();
        if (!phone) return;

        if (!clientsMap[phone]) {
            clientsMap[phone] = {
                name: item.customerName || 'VIP Client',
                phone: phone,
                visits: 0,
                totalSpend: 0,
                lastService: item.service || 'Hair Treatment',
                lastDate: item.bookingDate || '',
                channels: new Set()
            };
        }

        clientsMap[phone].visits++;
        if (item.status === 'Confirmed' || item.status === 'Completed') {
            clientsMap[phone].totalSpend += Number(item.price || 0);
        }
        if (item.channel) {
            clientsMap[phone].channels.add(item.channel);
        }
        if (item.bookingDate && item.bookingDate >= clientsMap[phone].lastDate) {
            clientsMap[phone].lastDate = item.bookingDate;
            clientsMap[phone].lastService = item.service || clientsMap[phone].lastService;
        }
    });

    const clientList = Object.values(clientsMap);
    clientList.sort((a, b) => b.totalSpend - a.totalSpend);

    if (clientList.length === 0) {
        clientsBody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 30px; color: #94a3b8;">No client CRM profiles recorded yet.</td></tr>`;
        return;
    }

    let html = '';
    clientList.forEach((c, idx) => {
        let cleanPhone = c.phone.replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = '94' + cleanPhone.substring(1);
        const waMsg = encodeURIComponent(`Hello ${c.name}! This is Chanu Salon reaching out to check on your recent experience and invite you to our latest VIP beauty offers.`);
        const waLink = `https://wa.me/${cleanPhone}?text=${waMsg}`;
        const channelsArr = Array.from(c.channels);

        html += `
            <tr>
                <td><strong>#${idx + 1}</strong></td>
                <td><strong>${escapeHtml(c.name)}</strong></td>
                <td><code><i class="fas fa-phone"></i> ${escapeHtml(c.phone)}</code></td>
                <td><span class="slot-pill">${c.visits} Appointments</span></td>
                <td><strong style="color: #059669;">Rs. ${c.totalSpend.toLocaleString()}</strong></td>
                <td>${escapeHtml(c.lastService)}</td>
                <td>
                    ${channelsArr.map(ch => ch === 'whatsapp' ? '<span class="badge-channel wa">WhatsApp</span>' : '<span class="badge-channel web">Web</span>').join(' ')}
                </td>
                <td>
                    <a href="${waLink}" target="_blank" class="filter-pill" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; background: #25d366; color: white; border: none; font-size: 12px; padding: 6px 14px;">
                        <i class="fab fa-whatsapp"></i> Message Client
                    </a>
                </td>
            </tr>
        `;
    });

    clientsBody.innerHTML = html;
}

window.updateStatus = async function(docId, newStatus) {
    if (!window.salonDB || !window.salonDB.db) return;
    try {
        const { db, doc, updateDoc } = window.salonDB;
        await updateDoc(doc(db, "appointments", docId), {
            status: newStatus
        });
        console.log(`Updated appointment ${docId} to ${newStatus}`);
    } catch (err) {
        alert("Failed to update status: " + err.message);
    }
};

window.setFilter = function(filterName, btn) {
    activeFilter = filterName;
    document.querySelectorAll('#tabCRM .filter-bar .filter-pill').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderCRMTable();
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
