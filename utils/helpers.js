const crypto = require('crypto');

const generateOrderNumber = () => {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const random = crypto.randomInt(1000, 9999);
    return `SB-${yearMonth}-${random}`;
};

const slugify = (text) => {
    if (!text || text.trim() === '') {
        return 'item-' + Date.now();
    }
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

const formatDate = (date) => {
    return new Date(date).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

const generateTimeSlots = (startHour, endHour, intervalMinutes) => {
    const slots = [];
    const start = startHour * 60;
    const end = endHour * 60;

    for (let minutes = start; minutes < end; minutes += intervalMinutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const time = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        slots.push(time);
    }
    return slots;
};

module.exports = {
    generateOrderNumber,
    slugify,
    formatDate,
    generateTimeSlots,
};