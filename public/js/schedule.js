let scheduleState = {
    doctors: [],
    selectedDoctor: null,
    currentDate: new Date(),
    selectedDate: null,
    slots: []
};

document.addEventListener('DOMContentLoaded', async () => {
    await loadDoctors();
    renderCalendar();
    setupControls();
});

async function loadDoctors() {
    try {
        const data = await API.get('/doctors');
        if (data.success) {
            scheduleState.doctors = data.doctors;
            renderDoctorsList();
        }
    } catch (e) {
        console.error('Ошибка загрузки врачей:', e);
    }
}

function renderDoctorsList() {
    const container = document.getElementById('doctorsList');

    if (scheduleState.doctors.length === 0) {
        container.innerHTML = '<p class="text-muted small">Нет доступных врачей</p>';
        return;
    }

    container.innerHTML = scheduleState.doctors.map(doc => `
        <div class="doctor-option p-2 rounded-3 mb-1 ${scheduleState.selectedDoctor === doc.userId ? 'bg-primary bg-opacity-10' : ''}" 
             data-doctor-id="${doc.userId}" style="cursor:pointer">
            <div class="d-flex align-items-center gap-2">
                ${doc.avatarUrl ? `<img src="${doc.avatarUrl}" class="rounded-circle" width="36" height="36" alt="${doc.userFirstName}" style="object-fit:cover">`
        : `<div class="bg-primary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center" style="width:36px;height:36px"><i class="bi bi-person text-primary"></i></div>`}
                <div>
                    <small class="fw-semibold d-block">${doc.userFirstName} ${doc.userLastName}</small>
                    <small class="text-muted">${doc.doctorSpecialization || 'Врач'}</small>
                </div>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.doctor-option').forEach(opt => {
        opt.addEventListener('click', () => {
            scheduleState.selectedDoctor = parseInt(opt.dataset.doctorId);
            renderDoctorsList();
            document.getElementById('selectedDoctorLabel').textContent =
                `— ${scheduleState.doctors.find(d => d.userId === scheduleState.selectedDoctor)?.userFirstName || ''}`;
            if (scheduleState.selectedDate) loadSlots();
        });
    });
}

function renderCalendar() {
    const year = scheduleState.currentDate.getFullYear();
    const month = scheduleState.currentDate.getMonth();

    document.getElementById('currentMonth').textContent = new Date(year, month).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;

    let html = '';

    for (let i = 0; i < adjustedFirstDay; i++) {
        html += '<div></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        date.setHours(0, 0, 0, 0);

        const isPast = date < today;
        const isSelected = scheduleState.selectedDate &&
            date.getTime() === new Date(scheduleState.selectedDate).setHours(0,0,0,0);
        const isToday = date.getTime() === today.getTime();

        html += `
            <button class="calendar-day btn btn-sm ${isSelected ? 'btn-primary' : isToday ? 'btn-outline-primary' : 'btn-light'} 
                    rounded-2 p-1" 
                    data-date="${date.toISOString().split('T')[0]}"
                    ${isPast ? 'disabled' : ''}
                    style="aspect-ratio:1;font-size:0.85rem;min-width:0">
                ${day}
            </button>`;
    }

    document.getElementById('calendarGrid').innerHTML = html;

    document.querySelectorAll('.calendar-day:not([disabled])').forEach(btn => {
        btn.addEventListener('click', () => {
            scheduleState.selectedDate = btn.dataset.date;
            renderCalendar();
            document.getElementById('selectedDateLabel').textContent =
                new Date(scheduleState.selectedDate).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
            if (scheduleState.selectedDoctor) loadSlots();
        });
    });
}

function setupControls() {
    document.getElementById('prevMonth').addEventListener('click', () => {
        scheduleState.currentDate.setMonth(scheduleState.currentDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        scheduleState.currentDate.setMonth(scheduleState.currentDate.getMonth() + 1);
        renderCalendar();
    });
}

async function loadSlots() {
    const container = document.getElementById('slotsContainer');
    container.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="text-muted mt-2">Загрузка слотов...</p>
        </div>`;

    try {
        const data = await API.get(`/schedule/slots?doctorId=${scheduleState.selectedDoctor}&date=${scheduleState.selectedDate}`);
        if (data.success) {
            scheduleState.slots = data.slots;
            renderSlots();
        }
    } catch (e) {
        container.innerHTML = '<p class="text-danger">Ошибка загрузки</p>';
    }
}

function renderSlots() {
    const container = document.getElementById('slotsContainer');

    if (scheduleState.slots.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="bi bi-calendar-x display-1"></i>
                <h5>Нет слотов на эту дату</h5>
                <p>Выберите другой день или позвоните нам</p>
            </div>`;
        return;
    }

    container.innerHTML = `
        <div class="row g-2">
            ${scheduleState.slots.map(slot => `
                <div class="col-6 col-md-3">
                    <div class="slot-card rounded-3 p-3 text-center ${slot.isAvailable ? 'bg-success bg-opacity-10 border border-success' : 'bg-secondary bg-opacity-10 border border-secondary opacity-50'}">
                        <span class="fw-bold d-block ${slot.isAvailable ? 'text-success' : 'text-secondary'}">
                            ${slot.startTime?.substring(0, 5) || '--:--'}
                        </span>
                        <small class="text-muted">
                            ${slot.isAvailable ? '<i class="bi bi-check-circle text-success"></i> Свободно' : '<i class="bi bi-x-circle text-secondary"></i> Занято'}
                        </small>
                        ${!slot.isAvailable && slot.clientName ? `<small class="d-block text-muted mt-1">${slot.clientName}</small>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>`;
}