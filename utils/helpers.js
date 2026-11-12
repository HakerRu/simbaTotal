const crypto = require('crypto');

const generateOrderNumber = () => {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const random = crypto.randomInt(1000, 9999);
    return `SB-${yearMonth}-${random}`;
};

const CYRILLIC_MAP = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
    з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
    п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
    ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
};

const transliterate = (text) => {
    return String(text)
        .toLowerCase()
        .split('')
        .map((ch) => (Object.prototype.hasOwnProperty.call(CYRILLIC_MAP, ch) ? CYRILLIC_MAP[ch] : ch))
        .join('');
};

const slugify = (text) => {
    if (!text || text.trim() === '') {
        return 'item-' + Date.now();
    }
    const slug = transliterate(text)
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');

    return slug || 'item-' + Date.now();
};

const uniqueSlug = (text, fallbackPrefix = 'item') => {
    const base = text && text.trim() ? slugify(text) : fallbackPrefix;
    const suffix = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    return `${base}-${suffix}`;
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
    uniqueSlug,
    formatDate,
    generateTimeSlots,
};