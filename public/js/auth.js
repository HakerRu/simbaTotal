// Проверка результата верификации при загрузке страницы регистрации
const urlParams = new URLSearchParams(window.location.search);
const verified = urlParams.get('verified');

if (verified === 'true' || verified === 'false') {
    const registerSection = document.getElementById('registerSection');
    const verificationSection = document.getElementById('verificationSection');

    if (registerSection) registerSection.style.display = 'none';
    if (verificationSection) verificationSection.style.display = 'block';

    if (verified === 'true') {
        const role = urlParams.get('role');
        const verifySuccess = document.getElementById('verifySuccess');
        const verifyMessage = document.getElementById('verifyMessage');

        if (verifySuccess) verifySuccess.style.display = 'block';
        if (verifyMessage) {
            verifyMessage.textContent = role === 'doctor'
                ? 'Ваш аккаунт врача отправлен на проверку администратору.'
                : 'Вы успешно вошли в систему!';
        }
    } else {
        const verifyFailed = document.getElementById('verifyFailed');
        const verifyErrorMessage = document.getElementById('verifyErrorMessage');
        const resendBtn = document.getElementById('resendVerificationBtn');

        if (verifyFailed) verifyFailed.style.display = 'block';

        const reason = urlParams.get('reason');
        const messages = {
            'expired': 'Срок действия ссылки истёк. Запросите новую.',
            'invalid': 'Недействительная ссылка подтверждения.',
            'error': 'Произошла ошибка. Попробуйте позже.',
            'no-token': 'Токен не найден.'
        };

        if (verifyErrorMessage) {
            verifyErrorMessage.textContent = messages[reason] || 'Неизвестная ошибка';
        }

        if (resendBtn) {
            resendBtn.addEventListener('click', async () => {
                const email = prompt('Введите ваш email для повторной отправки:');
                if (email) {
                    try {
                        const data = await API.post('/auth/resend-verification', { userEmail: email });
                        alert(data.message);
                    } catch (e) {
                        alert(e.message || 'Ошибка');
                    }
                }
            });
        }
    }
}

// Логин (клиент/врач)
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = document.getElementById('loginBtn');
        const alert = document.getElementById('loginAlert');

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Вход...';
        alert.style.display = 'none';

        try {
            const data = await API.post('/auth/login', {
                userEmail: document.getElementById('loginEmail').value.trim(),
                userPassword: document.getElementById('loginPassword').value
            });

            if (data.success) {
                window.location.href = '/';
            }
        } catch (e) {
            alert.style.display = 'block';
            alert.className = 'alert alert-danger py-2 small';
            alert.textContent = e.message || 'Ошибка входа';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Войти';
        }
    });
}

// Регистрация
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    document.querySelectorAll('input[name="regRole"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const doctorNote = document.getElementById('doctorNote');
            if (doctorNote) {
                doctorNote.style.display = radio.value === 'doctor' ? 'block' : 'none';
            }
        });
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = document.getElementById('registerBtn');
        const alert = document.getElementById('registerAlert');

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Регистрация...';
        alert.style.display = 'none';

        const role = document.querySelector('input[name="regRole"]:checked').value;

        try {
            const data = await API.post('/auth/register', {
                userEmail: document.getElementById('regEmail').value.trim(),
                userPassword: document.getElementById('regPassword').value,
                userFirstName: document.getElementById('regFirstName').value.trim(),
                userLastName: document.getElementById('regLastName').value.trim(),
                userPhone: document.getElementById('regPhone').value.trim(),
                role: role
            });

            if (data.success) {
                alert.style.display = 'block';
                alert.className = 'alert alert-success py-3';
                alert.innerHTML = `
                    <i class="bi bi-envelope-check"></i> <strong>Регистрация успешна!</strong><br>
                    <small>На ваш email отправлена ссылка для подтверждения. Проверьте почту (включая папку "Спам").</small>
                    <div class="mt-2">
                        <button class="btn btn-sm btn-outline-success rounded-pill" id="resendFromAlert">
                            <i class="bi bi-arrow-repeat"></i> Отправить повторно
                        </button>
                    </div>`;

                document.getElementById('resendFromAlert').addEventListener('click', async () => {
                    try {
                        const resend = await API.post('/auth/resend-verification', {
                            userEmail: document.getElementById('regEmail').value.trim()
                        });
                        alert(resend.message);
                    } catch (err) {
                        alert(err.message);
                    }
                });

                registerForm.reset();
            }
        } catch (e) {
            alert.style.display = 'block';
            alert.className = 'alert alert-danger py-2 small';
            alert.textContent = e.message || 'Ошибка регистрации';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-person-plus"></i> Зарегистрироваться';
        }
    });
}

// Показать/скрыть пароль
document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = btn.previousElementSibling;
        const icon = btn.querySelector('i');

        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.replace('bi-eye', 'bi-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.replace('bi-eye-slash', 'bi-eye');
        }
    });
});

// ==================== ТАБЫ ЛОГИНА ====================
document.querySelectorAll('#loginTabs .nav-link').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('#loginTabs .nav-link').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const target = tab.dataset.tab;
        const formClient = document.getElementById('formClient');
        const formAdmin = document.getElementById('formAdmin');
        if (formClient) formClient.style.display = target === 'client' ? 'block' : 'none';
        if (formAdmin) formAdmin.style.display = target === 'admin' ? 'block' : 'none';
    });
});

// ==================== АДМИН ЛОГИН ====================
const adminForm = document.getElementById('adminForm');
if (adminForm) {
    adminForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btn = document.getElementById('adminBtn');
        const alert = document.getElementById('adminAlert');

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Вход...';
        alert.style.display = 'none';

        const loginValue = document.getElementById('adminLogin').value.trim();
        const passwordValue = document.getElementById('adminPassword').value;

        try {
            const data = await API.post('/auth/login', {
                userEmail: loginValue,
                userPassword: passwordValue
            });

            console.log('Ответ сервера:', data);

            // Если сервер сказал что успешно — кидаем в админку
            if (data.success) {
                window.location.href = '/admin.html';
            } else {
                alert.style.display = 'block';
                alert.className = 'alert alert-danger py-2 small';
                alert.textContent = data.message || 'Ошибка входа';
            }
        } catch (e) {
            alert.style.display = 'block';
            alert.className = 'alert alert-danger py-2 small';
            alert.textContent = e.message || 'Ошибка входа';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-shield-check"></i> Войти как админ';
        }
    });
}