// public/js/admin-crm.js
// Real-time Cloud CRM Dashboard Logic with Firebase Firestore onSnapshot

let unsubscribeListener = null;
let allAppointments = [];
let activeFilter = 'all';

// 1. Admin Authentication Check
window.checkAdminAuth = function() {
    const isAuth = sessionStorage.getItem('chanu_admin_auth');
    const authOverlay = document.getElementById('adminAuthOverlay');
    const dashboard = document.getElementById('crmDashboard');

    if (isAuth === 'true') {
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
    // Default master passcode or env passcode
    if (pin === 'chanu2025' || pin === 'admin123') {
        sessionStorage.setItem('chanu_admin_auth', 'true');
        window.checkAdminAuth();
    } else {
        alert("Invalid Admin Passcode! (Default: chanu2025)");
    }
};

window.logoutAdmin = function() {
    sessionStorage.removeItem('chanu_admin_auth');
    if (unsubscribeListener) unsubscribeListener();
    window.location.reload();
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
    const { db, collection, onSnapshot, query, orderBy } = window.salonDB;
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
                    No appointments or leads found.
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

// 5. Update Status in Firebase Firestore
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
    document.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
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
