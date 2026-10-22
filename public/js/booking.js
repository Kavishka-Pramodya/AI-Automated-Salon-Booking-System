// public/js/booking.js
// Real-time Salon Slot Calculator & Firestore Appointment Submission

let selectedServiceData = null;
let selectedSlotTime = null;

// Standard working hours (09:00 - 18:00) in 30-min increments
const SLOTS_LIST = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"
];

// Preselect service when card is clicked
window.selectServiceCard = function(name, duration, price, category) {
    selectedServiceData = { name, duration: parseInt(duration), price: parseInt(price), category };
    
    // Update select dropdown
    const select = document.getElementById('bookingServiceSelect');
    if (select) {
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].text.includes(name)) {
                select.selectedIndex = i;
                break;
            }
        }
    }
    
    updateSummary();
    loadAvailableSlots();
    
    // Smooth scroll to booking section
    const bookingSection = document.getElementById('booking-section');
    if (bookingSection) {
        bookingSection.scrollIntoView({ behavior: 'smooth' });
    }
};

// Handle service change from dropdown
window.onServiceChange = function() {
    const select = document.getElementById('bookingServiceSelect');
    const opt = select.options[select.selectedIndex];
    if (opt && opt.value) {
        selectedServiceData = {
            name: opt.getAttribute('data-name') || opt.text.split('(')[0].trim(),
            duration: parseInt(opt.getAttribute('data-duration') || '45'),
            price: parseInt(opt.getAttribute('data-price') || '1500'),
            category: opt.getAttribute('data-category') || 'General'
        };
    } else {
        selectedServiceData = null;
    }
    updateSummary();
    loadAvailableSlots();
};

// Handle date change
window.onDateChange = function() {
    updateSummary();
    loadAvailableSlots();
};

// Update live summary card
function updateSummary() {
    const dateInput = document.getElementById('bookingDate');
    const dateVal = dateInput ? dateInput.value : '';

    const sumService = document.getElementById('sumService');
    const sumDuration = document.getElementById('sumDuration');
    const sumPrice = document.getElementById('sumPrice');
    const sumDate = document.getElementById('sumDate');
    const sumTime = document.getElementById('sumTime');

    if (sumService) sumService.textContent = selectedServiceData ? selectedServiceData.name : 'Not selected';
    if (sumDuration) sumDuration.textContent = selectedServiceData ? `${selectedServiceData.duration} Mins` : '-- Mins';
    if (sumPrice) sumPrice.textContent = selectedServiceData ? `Rs. ${selectedServiceData.price.toLocaleString()}` : 'Rs. 0';
    if (sumDate) sumDate.textContent = dateVal || 'Not selected';
    if (sumTime) sumTime.textContent = selectedSlotTime || '--:--';
}

// Fetch already-booked slots for selected date from Firebase
async function loadAvailableSlots() {
    const dateInput = document.getElementById('bookingDate');
    const container = document.getElementById('slotsContainer');
    if (!container) return;

    const dateVal = dateInput ? dateInput.value : '';
    if (!dateVal || !selectedServiceData) {
        container.innerHTML = `
            <div class="slot-instruction">
                <i class="fas fa-calendar-day"></i>
                <span>Please select a date and service above to view real-time available 30-min slots.</span>
            </div>
        `;
        return;
    }

    container.innerHTML = `<div class="slot-loading"><i class="fas fa-spinner fa-spin"></i> Checking live Firestore schedule for ${dateVal}...</div>`;

    let bookedTimes = new Set();

    if (window.salonDB && window.salonDB.db) {
        try {
            const { db, collection, getDocs, query, where } = window.salonDB;
            const q = query(
                collection(db, "appointments"),
                where("bookingDate", "==", dateVal)
            );
            const snap = await getDocs(q);
            snap.forEach(doc => {
                const data = doc.data();
                if (data.status !== "Cancelled" && data.bookingTime) {
                    bookedTimes.add(data.bookingTime);
                }
            });
        } catch (err) {
            console.warn("Could not query Firestore, rendering all open slots:", err);
        }
    }

    // Render slot chips
    let html = '<div class="slot-chips-grid">';
    SLOTS_LIST.forEach(time => {
        const isBooked = bookedTimes.has(time);
        if (isBooked) {
            html += `<button type="button" class="slot-chip booked" disabled title="Slot already reserved">${time} <span class="booked-tag">Booked</span></button>`;
        } else {
            const isSelected = (selectedSlotTime === time);
            html += `<button type="button" class="slot-chip ${isSelected ? 'selected' : ''}" onclick="selectSlot('${time}', this)">${time}</button>`;
        }
    });
    html += '</div>';

    container.innerHTML = html;
}

window.selectSlot = function(time, btn) {
    selectedSlotTime = time;
    document.querySelectorAll('.slot-chip').forEach(b => b.classList.remove('selected'));
    if (btn) btn.classList.add('selected');

    updateSummary();

    // Enable submit button
    const submitBtn = document.getElementById('btnSubmitBooking');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.add('active');
    }
};

// Form submission to Firestore
window.handleBookingSubmit = async function(e) {
    e.preventDefault();

    const name = document.getElementById('custName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const date = document.getElementById('bookingDate').value;
    const submitBtn = document.getElementById('btnSubmitBooking');

    if (!name || !phone || !date || !selectedServiceData || !selectedSlotTime) {
        alert("Please complete all fields and choose an available time slot!");
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Confirming Reservation in Firebase...';

    const bookingPayload = {
        customerName: name,
        customerPhone: phone,
        service: selectedServiceData.name,
        category: selectedServiceData.category,
        duration: selectedServiceData.duration,
        price: selectedServiceData.price,
        bookingDate: date,
        bookingTime: selectedSlotTime,
        channel: "website",
        status: "Confirmed",
        createdAt: new Date().toISOString()
    };

    let savedInFirestore = false;
    if (window.salonDB && window.salonDB.db) {
        try {
            const { db, collection, addDoc, serverTimestamp } = window.salonDB;
            await addDoc(collection(db, "appointments"), {
                ...bookingPayload,
                timestamp: serverTimestamp()
            });
            savedInFirestore = true;
            console.log("✅ Appointment saved to Firebase Firestore successfully!");
        } catch (err) {
            console.error("Firestore save error:", err);
        }
    }

    // Show Confirmation Dialog
    const modal = document.getElementById('bookingSuccessModal');
    if (modal) {
        document.getElementById('modalCustName').textContent = name;
        document.getElementById('modalService').textContent = selectedServiceData.name;
        document.getElementById('modalDateTime').textContent = `${date} at ${selectedSlotTime}`;
        document.getElementById('modalPrice').textContent = `Rs. ${selectedServiceData.price.toLocaleString()}`;
        modal.classList.add('active');
    } else {
        alert(`✨ Appointment Confirmed!\n\nClient: ${name}\nService: ${selectedServiceData.name}\nDate & Time: ${date} at ${selectedSlotTime}\nTotal: Rs. ${selectedServiceData.price}\n\nWe look forward to pampering you!`);
    }

    // Reset Form
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Confirm Appointment</span> <i class="fas fa-check"></i>';
    document.getElementById('bookingForm').reset();
    selectedSlotTime = null;
    selectedServiceData = null;
    updateSummary();
    loadAvailableSlots();
};

window.closeSuccessModal = function() {
    const modal = document.getElementById('bookingSuccessModal');
    if (modal) modal.classList.remove('active');
};
