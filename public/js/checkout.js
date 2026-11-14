let checkoutState = {
    cartItems: [],
    selectedTime: null,
    total: 0
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadCart();
    setupDateInput();
    setupForm();
});

async function loadCart() {
    try {
        const data = await API.get('/shop/cart');
        if (!data.success || data.items.length === 0) {
            window.location.href = '/cart.html';
            return;
        }

        checkoutState.cartItems = data.items;
        checkoutState.total = data.items.reduce((sum, item) => {
            const price = item.productDiscountPrice || item.productPrice;
            return sum + (price * item.quantity);
        }, 0);

        renderSummary();
    } catch (e) {
        window.location.href = '/cart.html';
    }
}

function renderSummary() {
    document.getElementById('orderSummary').innerHTML = `
        ${checkoutState.cartItems.map(item => `
            <div class="d-flex justify-content-between mb-2 small">
                <span>${escapeHtml(item.productName)} <span class="text-muted">× ${item.quantity}</span></span>
                <span class="fw-semibold">${Number((item.productDiscountPrice || item.productPrice) * item.quantity).toLocaleString()} ₽</span>
            </div>
        `).join('')}
        <hr>
        <div class="d-flex justify-content-between mb-3">
            <span class="fw-bold">Итого:</span>
            <span class="fw-bold text-accent fs-5">${Number(checkoutState.total).toLocaleString()} ₽</span>
        </div>
        <button class="btn btn-accent w-100 rounded-pill py-2 fw-semibold" id="confirmOrderBtn">
            <i class="bi bi-check-lg"></i> Подтвердить заказ
        </button>
        <small class="text-muted d-block text-center mt-2">
            <i class="bi bi-info-circle"></i> Оплата при получении
        </small>
    `;

    document.getElementById('confirmOrderBtn').addEventListener('click', submitOrder);
}

function setupDateInput() {
    const dateInput = document.getElementById('pickupDate');
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    dateInput.min = today;

    dateInput.addEventListener('change', () => {
        checkoutState.selectedTime = null;
        if (dateInput.value) generateTimeSlots();
    });
}

async function generateTimeSlots() {
    const container = document.getElementById('timeSlots');
    const date = document.getElementById('pickupDate').value;

    if (!date) {
        container.innerHTML = '<p class="text-muted small">Сначала выберите дату</p>';
        return;
    }

    const [year, month, day] = date.split('-').map(Number);
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const startHour = isWeekend ? 10 : 11;
    const endHour = isWeekend ? 16 : 20;

    const slots = [];
    for (let h = startHour; h < endHour; h++) {
        for (let m = 0; m < 60; m += 15) {
            slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }
    }

    container.innerHTML = slots.map(time => `
        <div class="col-4 col-md-3">
            <button type="button" class="btn btn-outline-primary btn-sm w-100 time-slot" data-time="${time}">
                ${time}
            </button>
        </div>
    `).join('');

    checkAllSlots(date, slots);

    container.querySelectorAll('.time-slot').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.time-slot').forEach(b => {
                b.classList.remove('btn-primary');
                b.classList.add('btn-outline-primary');
            });
            btn.classList.remove('btn-outline-primary');
            btn.classList.add('btn-primary');
            checkoutState.selectedTime = btn.dataset.time;
        });
    });
}

async function checkAllSlots(date, slots) {
    try {
        const data = await API.get(`/shop/orders/slots?date=${encodeURIComponent(date)}`);
        if (!data.success) return;
        const maxPerSlot = data.maxPerSlot || 4;
        const counts = data.slots || {};

        for (const time of slots) {
            if ((counts[time] || 0) >= maxPerSlot) {
                const btn = document.querySelector(`.time-slot[data-time="${time}"]`);
                if (btn) {
                    btn.disabled = true;
                    btn.classList.remove('btn-outline-primary');
                    btn.classList.add('btn-outline-secondary');
                    btn.innerHTML = `${time}<br><small>занято</small>`;
                }
            }
        }
    } catch (e) {}
}

function setupForm() {
    API.get('/auth/me').then(data => {
        if (data.success) {
            document.getElementById('customerName').value =
                `${data.user.userFirstName || ''} ${data.user.userLastName || ''}`.trim();
            document.getElementById('customerPhone').value = data.user.userPhone || '';
        }
    }).catch(() => {});
}

async function submitOrder() {
    const btn = document.getElementById('confirmOrderBtn');
    const alert = document.getElementById('checkoutAlert');

    const customerName = document.getElementById('customerName').value.trim();
    const customerPhone = document.getElementById('customerPhone').value.trim();
    const pickupAddressEl = document.querySelector('input[name="pickupAddress"]:checked');
    const pickupAddress = pickupAddressEl ? pickupAddressEl.value : '';
    const pickupDate = document.getElementById('pickupDate').value;
    const pickupTime = checkoutState.selectedTime;
    const orderNotes = document.getElementById('orderNotes').value.trim();

    alert.style.display = 'none';

    if (!customerName || !customerPhone || !pickupAddress || !pickupDate || !pickupTime) {
        alert.style.display = 'block';
        alert.className = 'alert alert-danger py-2 small';
        alert.textContent = 'Заполните все обязательные поля и выберите филиал самовывоза';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Оформляем...';

    try {
        const data = await API.post('/shop/orders', {
            customerName,
            customerPhone,
            pickupAddress,
            pickupDate,
            pickupTime,
            orderNotes
        });

        if (data.success) {
            window.location.href = `/order-success.html?number=${encodeURIComponent(data.order.orderNumber)}&address=${encodeURIComponent(pickupAddress)}`;
        }
    } catch (e) {
        alert.style.display = 'block';
        alert.className = 'alert alert-danger py-2 small';
        alert.textContent = e.message || 'Ошибка оформления';
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check-lg"></i> Подтвердить заказ';
    }
}