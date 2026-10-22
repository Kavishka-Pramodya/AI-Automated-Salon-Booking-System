// public/js/services-manager.js
// Dynamic Salon Services Catalog & Manager for Chanu Salon
// Synchronizes across Admin Management, Client Home Page, and Booking Form

const DEFAULT_SERVICES = [
    {
        id: "srv_1",
        name: "Couture Hair Cutting & Styling",
        category: "Hair Treatments",
        duration: 45,
        price: 1500,
        description: "Tailored precision cut designed to enhance your facial contours, finished with a signature blowout.",
        photo: "images/2148108899.jpg",
        tag: "Popular"
    },
    {
        id: "srv_2",
        name: "Botanical Gold & Diamond Facials",
        category: "Facial & Skin Treatments",
        duration: 60,
        price: 3000,
        description: "Deep-cleansing cellular hydration and micro-massage to restore natural elasticity, firmness, and youth.",
        photo: "images/2148660858.jpg",
        tag: "Radiance"
    },
    {
        id: "srv_3",
        name: "Balayage, Ombre & Creative Tint",
        category: "Color Artistry",
        duration: 90,
        price: 5000,
        description: "Rich, multi-dimensional hair tones formulated with ammonia-free conditioning glazes for brilliance.",
        photo: "images/20673.jpg",
        tag: "Trending"
    },
    {
        id: "srv_4",
        name: "Kandyan & Western Bridal Dressing",
        category: "Bridal Dressing",
        duration: 180,
        price: 15000,
        description: "Comprehensive bridal glamour package including saree draping, high-definition makeup, and jewelry styling.",
        photo: "images/2148398640.jpg",
        tag: "Royal Lounge"
    }
];

window.ChanuServices = {
    // 1. Get all active services
    getAll: function() {
        let stored = localStorage.getItem('chanu_services');
        if (!stored) {
            localStorage.setItem('chanu_services', JSON.stringify(DEFAULT_SERVICES));
            return DEFAULT_SERVICES;
        }
        try {
            const list = JSON.parse(stored);
            if (!Array.isArray(list) || list.length === 0) {
                localStorage.setItem('chanu_services', JSON.stringify(DEFAULT_SERVICES));
                return DEFAULT_SERVICES;
            }
            return list;
        } catch(e) {
            return DEFAULT_SERVICES;
        }
    },

    // 2. Add new service
    add: function(service) {
        const list = this.getAll();
        const newService = {
            id: 'srv_' + Date.now(),
            name: service.name,
            category: service.category || 'Hair Treatments',
            duration: Number(service.duration) || 45,
            price: Number(service.price) || 1500,
            description: service.description || '',
            photo: service.photo || 'images/2148108899.jpg',
            tag: service.tag || 'Bespoke'
        };
        list.push(newService);
        localStorage.setItem('chanu_services', JSON.stringify(list));
        return newService;
    },

    // 3. Update existing service
    update: function(id, updatedData) {
        let list = this.getAll();
        const idx = list.findIndex(s => s.id === id);
        if (idx !== -1) {
            list[idx] = { ...list[idx], ...updatedData };
            localStorage.setItem('chanu_services', JSON.stringify(list));
            return list[idx];
        }
        return null;
    },

    // 4. Delete service
    delete: function(id) {
        let list = this.getAll();
        list = list.filter(s => s.id !== id);
        localStorage.setItem('chanu_services', JSON.stringify(list));
        return list;
    },

    // 5. Render Services on Client index.html
    renderClientGrid: function(containerId = 'servicesGrid') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const services = this.getAll();
        let html = '';

        services.forEach(item => {
            const safeName = item.name.replace(/'/g, "\\'");
            const safeCategory = (item.category || 'Beauty Care').replace(/'/g, "\\'");
            const tagStyle = item.tag === 'Radiance' ? 'style="background: linear-gradient(135deg, #f59e0b, #d97706);"' :
                             item.tag === 'Royal Lounge' ? 'style="background: linear-gradient(135deg, #8b5cf6, #ec4899);"' : '';

            let icon = 'fas fa-cut';
            if (item.category && item.category.includes('Facial')) icon = 'fas fa-spa';
            else if (item.category && item.category.includes('Color')) icon = 'fas fa-palette';
            else if (item.category && item.category.includes('Bridal')) icon = 'fas fa-heart';

            html += `
                <div class="service-card" id="card-${item.id}">
                    <div class="card-img-wrap">
                        <img src="${item.photo}" alt="${escapeHtml(item.name)}" onerror="this.src='images/2148108899.jpg'">
                        <span class="card-tag" ${tagStyle}>${escapeHtml(item.tag || 'Signature')}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-meta">
                            <span class="card-category"><i class="${icon}"></i> ${escapeHtml(item.category)}</span>
                            <span><i class="far fa-clock"></i> ${item.duration} Mins</span>
                        </div>
                        <h3 class="card-title">${escapeHtml(item.name)}</h3>
                        <p class="card-desc">${escapeHtml(item.description)}</p>
                        <div class="card-footer">
                            <span class="price-text">Rs. ${Number(item.price).toLocaleString()}</span>
                            <button class="btn-select-service" onclick="selectServiceCard('${safeName}', ${item.duration}, ${item.price}, '${safeCategory}')">Book Slot</button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
        this.renderClientSelect();
    },

    // 6. Populate Booking Form Dropdown on index.html
    renderClientSelect: function(selectId = 'bookingServiceSelect') {
        const select = document.getElementById(selectId);
        if (!select) return;

        const services = this.getAll();
        let optionsHtml = '<option value="">-- Choose Desired Treatment --</option>';

        services.forEach(item => {
            optionsHtml += `
                <option value="${item.id}" data-name="${escapeHtml(item.name)}" data-duration="${item.duration}" data-price="${item.price}" data-category="${escapeHtml(item.category)}">
                    ${escapeHtml(item.name)} (${item.duration} Mins) • Rs. ${Number(item.price).toLocaleString()}
                </option>
            `;
        });

        select.innerHTML = optionsHtml;
    }
};

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function(m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
}

// Auto-render when on client page
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('servicesGrid')) {
        window.ChanuServices.renderClientGrid();
    }
});
