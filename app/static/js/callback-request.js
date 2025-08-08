// Обработка заявок на перезвон
class CallbackRequest {
    constructor() {
        this.init();
    }
    
    init() {
        this.bindEvents();
    }
    
    bindEvents() {
        // Кнопка открытия модального окна
        const callbackBtn = document.getElementById('callbackRequestBtn');
        if (callbackBtn) {
            callbackBtn.addEventListener('click', () => {
                this.openModal();
            });
        }
        
        // Кнопка закрытия модального окна
        const closeBtn = document.getElementById('closeCallbackModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }
        
        // Кнопка отмены
        const cancelBtn = document.getElementById('cancelCallback');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }
        
        // Кнопка отправки заявки
        const submitBtn = document.getElementById('submitCallback');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                this.submitCallback();
            });
        }
        
        // Закрытие по клику вне модального окна
        const modal = document.getElementById('callbackModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }
        
        // Закрытие по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
        
        // Маска для телефона
        const phoneInput = document.getElementById('callbackPhone');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                this.formatPhoneNumber(e.target);
            });
        }
    }
    
    openModal() {
        const modal = document.getElementById('callbackModal');
        if (modal) {
            modal.classList.remove('hidden');
            // Фокус на поле имени
            const nameInput = document.getElementById('callbackName');
            if (nameInput) {
                nameInput.focus();
            }
        }
    }
    
    closeModal() {
        const modal = document.getElementById('callbackModal');
        if (modal) {
            modal.classList.add('hidden');
            this.clearForm();
        }
    }
    
    clearForm() {
        const nameInput = document.getElementById('callbackName');
        const phoneInput = document.getElementById('callbackPhone');
        
        if (nameInput) nameInput.value = '';
        if (phoneInput) phoneInput.value = '';
    }
    
    formatPhoneNumber(input) {
        let value = input.value.replace(/\D/g, '');
        
        if (value.length === 0) {
            input.value = '';
            return;
        }
        
        if (value.length === 1 && value[0] === '8') {
            value = '7' + value.substring(1);
        }
        
        if (value.length === 1 && value[0] === '7') {
            value = '7' + value.substring(1);
        }
        
        let formattedValue = '';
        
        if (value.length >= 1) {
            formattedValue = '+7';
        }
        
        if (value.length >= 2) {
            formattedValue += ' (' + value.substring(1, 4);
        }
        
        if (value.length >= 5) {
            formattedValue += ') ' + value.substring(4, 7);
        }
        
        if (value.length >= 8) {
            formattedValue += '-' + value.substring(7, 9);
        }
        
        if (value.length >= 10) {
            formattedValue += '-' + value.substring(9, 11);
        }
        
        input.value = formattedValue;
    }
    
    validateForm() {
        const nameInput = document.getElementById('callbackName');
        const phoneInput = document.getElementById('callbackPhone');
        
        const name = nameInput ? nameInput.value.trim() : '';
        const phone = phoneInput ? phoneInput.value.trim() : '';
        
        // Проверка имени
        if (!name) {
            this.showError('Пожалуйста, введите ваше имя');
            if (nameInput) nameInput.focus();
            return false;
        }
        
        if (name.length < 2) {
            this.showError('Имя должно содержать минимум 2 символа');
            if (nameInput) nameInput.focus();
            return false;
        }
        
        // Проверка телефона
        if (!phone) {
            this.showError('Пожалуйста, введите номер телефона');
            if (phoneInput) phoneInput.focus();
            return false;
        }
        
        // Проверка формата телефона (должен содержать 11 цифр)
        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length !== 11) {
            this.showError('Номер телефона должен содержать 11 цифр');
            if (phoneInput) phoneInput.focus();
            return false;
        }
        
        return true;
    }
    
    async submitCallback() {
        if (!this.validateForm()) {
            return;
        }
        
        const nameInput = document.getElementById('callbackName');
        const phoneInput = document.getElementById('callbackPhone');
        
        const name = nameInput ? nameInput.value.trim() : '';
        const phone = phoneInput ? phoneInput.value.trim() : '';
        
        try {
            // Показываем индикатор загрузки
            const submitBtn = document.getElementById('submitCallback');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Отправка...';
            }
            
            // Отправляем заявку
            const response = await fetch('/api/v2/callback-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    customer_name: name,
                    customer_phone: phone,
                    order_type: 'callback'
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showSuccess('Заявка успешно отправлена! Мы перезвоним вам в течение 8 секунд.');
                this.closeModal();
            } else {
                const error = await response.json();
                this.showError(error.message || 'Ошибка при отправке заявки');
            }
        } catch (error) {
            console.error('Ошибка при отправке заявки:', error);
            this.showError('Ошибка при отправке заявки. Попробуйте еще раз.');
        } finally {
            // Восстанавливаем кнопку
            const submitBtn = document.getElementById('submitCallback');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Отправить заявку';
            }
        }
    }
    
    showError(message) {
        // Создаем уведомление об ошибке
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Удаляем уведомление через 5 секунд
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
    
    showSuccess(message) {
        // Создаем уведомление об успехе
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Удаляем уведомление через 5 секунд
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    window.callbackRequest = new CallbackRequest();
}); 