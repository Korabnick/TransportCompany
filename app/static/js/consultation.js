// Обработка заявок на консультацию
console.log('Consultation.js loaded successfully');

class ConsultationRequest {
    constructor() {
        console.log('ConsultationRequest constructor called');
        this.pageLoadTime = Date.now();
        this.initialCollapseDone = false; // Флаг для отслеживания первого сворачивания
        this.init();
    }
    
    init() {
        console.log('ConsultationRequest init called');
        this.bindEvents();
        this.initButtonAnimation();
    }
    
    initButtonAnimation() {
        const consultationBtn = document.getElementById('consultationBtn');
        if (consultationBtn) {
            // Сначала скрываем кнопку через CSS классы
            consultationBtn.classList.remove('appearing');
            consultationBtn.classList.remove('consultation-btn-expanded');
            
            // Через 2 секунды показываем кнопку
            setTimeout(() => {
                consultationBtn.classList.add('appearing');
                // Добавляем класс развернутого состояния
                consultationBtn.classList.add('consultation-btn-expanded');
                
                // Через 2 секунды после появления меняем текст на "Консультация"
                setTimeout(() => {
                    this.changeTextToConsultation();
                }, 2000);
                
                // Через 4 секунды после появления сворачиваем кнопку в кружок ОДИН РАЗ
                setTimeout(() => {
                    this.collapseButtonToCircle();
                    // Устанавливаем флаг, что первое сворачивание произошло
                    this.initialCollapseDone = true;
                }, 4000);
            }, 2000);
        }
    }
    
    changeTextToConsultation() {
        const consultationBtn = document.getElementById('consultationBtn');
        if (consultationBtn) {
            const textElement = consultationBtn.querySelector('.consultation-text');
            if (textElement) {
                // Анимация смены текста
                textElement.style.opacity = '0';
                textElement.style.transform = 'translateX(-20px)';
                
                setTimeout(() => {
                    textElement.textContent = 'Консультация';
                    textElement.style.opacity = '1';
                    textElement.style.transform = 'translateX(0)';
                }, 300); // Время анимации исчезновения
            }
        }
    }
    
    collapseButtonToCircle() {
        const consultationBtn = document.getElementById('consultationBtn');
        if (consultationBtn) {
            console.log('Collapsing button to circle...');
            
            // Просто меняем классы - CSS сам обработает переходы
            consultationBtn.classList.remove('consultation-btn-expanded');
            consultationBtn.classList.add('consultation-btn-collapsed');
        }
    }
    
    expandButton() {
        const consultationBtn = document.getElementById('consultationBtn');
        if (consultationBtn) {
            console.log('Expanding button from circle...');
            
            // Просто меняем классы - CSS сам обработает переходы
            consultationBtn.classList.remove('consultation-btn-collapsed');
            consultationBtn.classList.add('consultation-btn-expanded');
        }
    }
    
    bindEvents() {
        console.log('Binding consultation events...');
        
        // Кнопка открытия модального окна консультации
        const consultationBtn = document.getElementById('consultationBtn');
        console.log('Consultation button found:', consultationBtn);
        
        if (consultationBtn) {
            // Обработчик клика
            consultationBtn.addEventListener('click', () => {
                console.log('Consultation button clicked!');
                this.openModal();
            });
            
            // Переменные для управления состоянием
            let expandTimeout = null;
            let collapseTimeout = null;
            let isExpanded = false;
            
            // Обработчик наведения - разворачиваем кнопку
            consultationBtn.addEventListener('mouseenter', () => {
                // Очищаем таймер сворачивания
                if (collapseTimeout) {
                    clearTimeout(collapseTimeout);
                    collapseTimeout = null;
                }
                
                // Разворачиваем кнопку только если первое сворачивание произошло
                if (this.initialCollapseDone) {
                    // Небольшая задержка для стабильности
                    expandTimeout = setTimeout(() => {
                        this.expandButton();
                        isExpanded = true;
                    }, 100);
                }
            });
            
            // Обработчик ухода курсора - сворачиваем кнопку только если первое сворачивание уже произошло
            consultationBtn.addEventListener('mouseleave', () => {
                // Очищаем таймер разворачивания
                if (expandTimeout) {
                    clearTimeout(expandTimeout);
                    expandTimeout = null;
                }
                
                // Сворачиваем кнопку только если первое сворачивание уже произошло и кнопка развернута
                if (this.initialCollapseDone && isExpanded) {
                    collapseTimeout = setTimeout(() => {
                        this.collapseButtonToCircle();
                        isExpanded = false;
                    }, 300); // Увеличиваем задержку для стабильности
                }
            });
        } else {
            console.error('Consultation button not found!');
        }
        
        // Проверяем все остальные элементы
        const modal = document.getElementById('consultationModal');
        const closeBtn = document.getElementById('closeConsultationModal');
        const cancelBtn = document.getElementById('cancelConsultation');
        const form = document.getElementById('consultationForm');
        const nameInput = document.getElementById('consultationName');
        const phoneInput = document.getElementById('consultationPhone');
        const questionsInput = document.getElementById('consultationQuestions');
        
        console.log('All consultation elements found:', {
            modal: modal,
            closeBtn: closeBtn,
            cancelBtn: cancelBtn,
            form: form,
            nameInput: nameInput,
            phoneInput: phoneInput,
            questionsInput: questionsInput
        });
        
        // Кнопка закрытия модального окна консультации
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }
        
        // Кнопка отмены
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }
        
        // Форма консультации
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitConsultation();
            });
        }
        
        // Закрытие по клику вне модального окна
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
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                this.formatPhoneNumber(e.target);
            });
        }
    }
    
    openModal() {
        console.log('openModal called');
        const modal = document.getElementById('consultationModal');
        console.log('Modal element found:', modal);
        
        if (modal) {
            console.log('Showing modal with style.display');
            modal.style.display = 'flex';
            modal.style.opacity = '1';
            modal.style.visibility = 'visible';
            modal.style.pointerEvents = 'auto';
            console.log('Modal styles after showing:', {
                display: modal.style.display,
                opacity: modal.style.opacity,
                visibility: modal.style.visibility
            });
            
            // Фокус на поле имени
            const nameInput = document.getElementById('consultationName');
            if (nameInput) {
                nameInput.focus();
                console.log('Focus set on name input');
            }
        } else {
            console.error('Modal element not found!');
        }
    }
    
    closeModal() {
        console.log('closeModal called');
        const modal = document.getElementById('consultationModal');
        if (modal) {
            console.log('Hiding modal with style.display');
            modal.style.display = 'none';
            this.clearForm();
        }
    }
    
    clearForm() {
        const nameInput = document.getElementById('consultationName');
        const phoneInput = document.getElementById('consultationPhone');
        const questionsInput = document.getElementById('consultationQuestions');
        
        if (nameInput) nameInput.value = '';
        if (phoneInput) phoneInput.value = '';
        if (questionsInput) questionsInput.value = '';
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
        const nameInput = document.getElementById('consultationName');
        const phoneInput = document.getElementById('consultationPhone');
        
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
    
    async submitConsultation() {
        if (!this.validateForm()) {
            return;
        }
        
        const nameInput = document.getElementById('consultationName');
        const phoneInput = document.getElementById('consultationPhone');
        const questionsInput = document.getElementById('consultationQuestions');
        
        const name = nameInput ? nameInput.value.trim() : '';
        const phone = phoneInput ? phoneInput.value.trim() : '';
        const questions = questionsInput ? questionsInput.value.trim() : '';
        
        try {
            // Показываем индикатор загрузки
            const submitBtn = document.getElementById('submitConsultation');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="ri-loader-4-line mr-2 animate-spin"></i>Отправка...';
            }
            
            // Отправляем заявку на консультацию
            const response = await fetch('/api/v2/consultation-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    customer_name: name,
                    customer_phone: phone,
                    questions: questions,
                    order_type: 'consultation'
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showSuccess('Заявка на консультацию успешно отправлена! Мы свяжемся с вами в ближайшее время.');
                this.closeModal();
            } else {
                const error = await response.json();
                this.showError(error.message || 'Ошибка при отправке заявки');
            }
        } catch (error) {
            console.error('Ошибка при отправке заявки на консультацию:', error);
            this.showError('Ошибка при отправке заявки. Попробуйте еще раз.');
        } finally {
            // Восстанавливаем кнопку
            const submitBtn = document.getElementById('submitConsultation');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="ri-send-plane-line mr-2"></i>Отправить заявку';
            }
        }
    }
    
    showError(message) {
        // Создаем уведомление об ошибке
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center';
        notification.innerHTML = `
            <i class="ri-error-warning-line mr-2"></i>
            <span>${message}</span>
        `;
        
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
        notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center';
        notification.innerHTML = `
            <i class="ri-check-line mr-2"></i>
            <span>${message}</span>
        `;
        
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
    console.log('DOM loaded, initializing ConsultationRequest...');
    try {
        window.consultationRequest = new ConsultationRequest();
        console.log('ConsultationRequest initialized successfully');
    } catch (error) {
        console.error('Error initializing ConsultationRequest:', error);
    }
});
