// public/js/admin-crm.js
// Real-time Cloud CRM Dashboard Logic with Firebase Firestore onSnapshot

let unsubscribeListener = null;
let allAppointments = [];
let activeFilter = 'all';

// 1. Admin Authentication Check
window.checkAdminAuth = function() {
    const isAuth = sessionStorage.getItem('chanu_admin_auth') || sessionStorage.getItem('admin_auth');
    const user = JSON.parse(localStorage.getItem('chanu_user') || 'null');
    const authOverlay = document.getElementById('adminAuthOverlay');
    const dashboard = document.getElementById('crmDashboard');

    if (isAuth === 'true' || (user && user.role === 'Admin')) {
        if (authOverlay) authOverlay.style.display = 'none';
        if (dashboard) dashboard.style.display = 'block';
        initRealtimeCRM();
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
            username: 'Administrator',
            role: 'Admin',
            token: 'chanu_admin_verified'
        };
        localStorage.setItem('chanu_user', JSON.stringify(adminSession));
        window.checkAdminAuth();
    } else {
        alert("Invalid Admin Passcode! (Default: chanu2025)");
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

// 2. Real-time Firestore Sync
function initRealtimeCRM() {
    if (!window.salonDB || !window.salonDB.db) {
        // Wait for Firebase to finish initializing
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
        
        // Real-time Live Listener
        unsubscribeListener = onSnapshot(q, (snapshot) => {
            allAppointments = [];
            snapshot.forEach(doc => {
                allAppointments.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Sort newest first
            allAppointments.sort((a, b) => {
                const dateA = (a.bookingDate || "") + " " + (a.bookingTime || "");
                const dateB = (b.bookingDate || "") + " " + (b.bookingTime || "");
                return dateB.localeCompare(dateA);
            });

            updateCRMStats();
            renderCRMTable();
            renderClientsTable();
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

// 3. Compute Stats
function updateCRMStats() {
    const todayStr = new Date().toISOString().split('T')[0];
    
    let todayCount = 0;
    let upcomingCount = 0;
    let totalRevenue = 0;
    let waCount = 0;
    const customersSet = new Set();

    allAppointments.forEach(item => {
        if (item.bookingDate === todayStr && item.status !== 'Cancelled') {
            todayCount++;
        }
        if (item.bookingDate > todayStr && item.status !== 'Cancelled') {
            upcomingCount++;
        }
        if (item.status === 'Confirmed' || item.status === 'Completed') {
            totalRevenue += Number(item.price || 0);
        }
        if (item.channel === 'whatsapp') {
            waCount++;
        }
        if (item.customerPhone) {
            customersSet.add(item.customerPhone);
        }
    });

    const elToday = document.getElementById('statToday');
    const elUpcoming = document.getElementById('statUpcoming');
    const elRevenue = document.getElementById('statRevenue');
    const elClients = document.getElementById('statClients');

    if (elToday) elToday.textContent = todayCount;
    if (elUpcoming) elUpcoming.textContent = upcomingCount;
    if (elRevenue) elRevenue.textContent = "Rs. " + totalRevenue.toLocaleString();
    if (elClients) elClients.textContent = `${customersSet.size} Clients (${waCount} via WA)`;
}

// 4. Render Table with Omnichannel Badges & Action Buttons
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

        // Clean phone for WhatsApp Link (e.g. 071... -> 9471...)
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

// 5. Render Consolidated Client CRM Directory
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
        clientsBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 30px; color: #94a3b8;">
                    No client profiles recorded yet.
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    clientList.forEach((c, idx) => {
        let cleanPhone = c.phone.replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = '94' + cleanPhone.substring(1);
        const waMsg = encodeURIComponent(`Hello ${c.name}! This is Chanu Salon reaching out to check on your recent salon experience and offer you our latest VIP booking slots.`);
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

// 6. Section & Tab Switchers
window.switchCRMSection = function(section, btn) {
    const streamSec = document.getElementById('sectionStream');
    const clientsSec = document.getElementById('sectionClients');
    const btnStream = document.getElementById('btnViewStream');
    const btnClients = document.getElementById('btnViewClients');

    if (btnStream) btnStream.classList.toggle('active', section === 'stream');
    if (btnClients) btnClients.classList.toggle('active', section === 'clients');

    if (section === 'stream') {
        if (streamSec) streamSec.style.display = 'block';
        if (clientsSec) clientsSec.style.display = 'none';
    } else {
        if (streamSec) streamSec.style.display = 'none';
        if (clientsSec) clientsSec.style.display = 'block';
    }
};

window.switchAdminTab = function(tabName, linkEl) {
    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
    if (linkEl) linkEl.classList.add('active');

    if (tabName === 'overview') {
        window.switchCRMSection('stream');
        window.setFilter('all', document.getElementById('pillAll'));
    } else if (tabName === 'bookings') {
        window.switchCRMSection('stream');
        window.setFilter('website', document.getElementById('pillWeb'));
    } else if (tabName === 'whatsapp') {
        window.switchCRMSection('stream');
        window.setFilter('whatsapp', document.getElementById('pillWA'));
    } else if (tabName === 'clients') {
        window.switchCRMSection('clients');
    }
};

// 7. Update Status in Firebase Firestore
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
    document.querySelectorAll('.filter-bar .filter-pill').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderCRMTable();
};

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
}

// Check auth on load
document.addEventListener('DOMContentLoaded', () => {
    window.checkAdminAuth();
});
