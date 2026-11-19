const windowMsFor = (role) => (
    role === 'doctor' || role === 'manager' ? 10 * 60 * 1000 : 24 * 60 * 60 * 1000
);

const cooldownLeft = (user) => {
    if (!user || user.role === 'admin' || !user.profileUpdatedAt) return 0;
    return Math.max(0, new Date(user.profileUpdatedAt).getTime() + windowMsFor(user.role) - Date.now());
};

const cooldownMessage = (leftMs) => {
    const minutes = Math.ceil(leftMs / 60000);
    if (minutes >= 90) return `Профиль можно обновить через ${Math.ceil(minutes / 60)} ч.`;
    return `Профиль можно обновить через ${minutes} мин.`;
};

const rejectIfCooling = (user, res) => {
    const left = cooldownLeft(user);
    if (!left) return false;
    res.status(429).json({ success: false, message: cooldownMessage(left) });
    return true;
};

module.exports = { cooldownLeft, cooldownMessage, rejectIfCooling };
