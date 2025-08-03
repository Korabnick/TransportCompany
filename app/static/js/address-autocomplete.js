// Address Autocomplete with Leaflet API
console.log('AddressAutocomplete: File loaded successfully');

class AddressAutocomplete {
    constructor() {
        console.log('AddressAutocomplete: Constructor called');
        this.currentInput = null;
        this.suggestionsContainer = null;
        this.debounceTimer = null;
        this.selectedIndex = -1;
        
        this.init();
    }
    
    init() {
        console.log('AddressAutocomplete: Init called');
        this.bindEvents();
    }
    
    bindEvents() {
        console.log('AddressAutocomplete: Binding events');
        
        // Находим все поля ввода адресов
        const addressInputs = document.querySelectorAll('input[id*="Address"]');
        console.log('AddressAutocomplete: Found address inputs:', addressInputs.length);
        
        addressInputs.forEach((input, index) => {
            console.log(`AddressAutocomplete: Input ${index}:`, {
                id: input.id,
                type: input.type,
                placeholder: input.placeholder
            });
            
            // Создаем контейнер для подсказок
            this.createSuggestionsContainer(input);
            
            // Обработчик ввода текста
            input.addEventListener('input', (e) => {
                this.handleInput(e.target);
            });
            
            // Обработчик фокуса
            input.addEventListener('focus', (e) => {
                this.handleFocus(e.target);
            });
            
            // Обработчик потери фокуса
            input.addEventListener('blur', (e) => {
                this.handleBlur(e.target);
            });
            
            // Обработчик клавиш
            input.addEventListener('keydown', (e) => {
                this.handleKeydown(e);
            });
        });
        
        // Закрытие подсказок при клике вне
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.address-input-wrapper') && !e.target.closest('.address-suggestions')) {
                this.hideSuggestions();
            }
        });
        
        console.log('AddressAutocomplete: Events bound successfully');
    }
    
    createSuggestionsContainer(input) {
        // Создаем контейнер для подсказок
        const container = document.createElement('div');
        container.className = 'address-suggestions absolute left-0 right-0 top-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto hidden';
        container.style.marginTop = '2px';
        
        // Вставляем после поля ввода
        input.parentNode.appendChild(container);
        
        // Сохраняем ссылку на контейнер
        input.suggestionsContainer = container;
    }
    
    handleInput(input) {
        const query = input.value.trim();
        console.log('AddressAutocomplete: Input changed:', query);
        
        // Очищаем предыдущий таймер
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        // Скрываем подсказки если запрос пустой
        if (!query) {
            this.hideSuggestions(input);
            return;
        }
        
        // Устанавливаем задержку для избежания частых запросов
        this.debounceTimer = setTimeout(() => {
            this.searchAddresses(input, query);
        }, 300);
    }
    
    handleFocus(input) {
        console.log('AddressAutocomplete: Input focused:', input.id);
        const query = input.value.trim();
        if (query) {
            this.searchAddresses(input, query);
        }
    }
    
    handleBlur(input) {
        console.log('AddressAutocomplete: Input blurred:', input.id);
        // Не скрываем сразу, чтобы пользователь мог кликнуть на подсказку
        setTimeout(() => {
            this.hideSuggestions(input);
        }, 200);
    }
    
    handleKeydown(e) {
        const input = e.target;
        const container = input.suggestionsContainer;
        
        if (!container || container.classList.contains('hidden')) {
            return;
        }
        
        const suggestions = container.querySelectorAll('.suggestion-item');
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, suggestions.length - 1);
                this.updateSelection(container, suggestions);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                this.updateSelection(container, suggestions);
                break;
                
            case 'Enter':
                e.preventDefault();
                if (this.selectedIndex >= 0 && suggestions[this.selectedIndex]) {
                    this.selectSuggestion(input, suggestions[this.selectedIndex]);
                }
                break;
                
            case 'Escape':
                e.preventDefault();
                this.hideSuggestions(input);
                break;
        }
    }
    
    updateSelection(container, suggestions) {
        // Убираем выделение со всех элементов
        suggestions.forEach(item => item.classList.remove('bg-primary', 'text-white'));
        
        // Выделяем выбранный элемент
        if (this.selectedIndex >= 0 && suggestions[this.selectedIndex]) {
            suggestions[this.selectedIndex].classList.add('bg-primary', 'text-white');
            
            // Прокручиваем к выбранному элементу
            suggestions[this.selectedIndex].scrollIntoView({ block: 'nearest' });
        }
    }
    
    async searchAddresses(input, query) {
        try {
            console.log('AddressAutocomplete: Searching for:', query);
            
            // Добавляем ограничение на Санкт-Петербург и область
            const searchQuery = `${query}, Санкт-Петербург, Россия`;
            const url = `/api/v2/proxy/nominatim?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&addressdetails=1`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            console.log('AddressAutocomplete: Search results:', data);
            
            if (data.length > 0) {
                this.showSuggestions(input, data);
            } else {
                this.hideSuggestions(input);
            }
        } catch (error) {
            console.error('AddressAutocomplete: Error searching addresses:', error);
            this.hideSuggestions(input);
        }
    }
    
    showSuggestions(input, results) {
        const container = input.suggestionsContainer;
        if (!container) return;
        
        // Очищаем контейнер
        container.innerHTML = '';
        
        // Добавляем подсказки
        results.forEach((result, index) => {
            const item = document.createElement('div');
            item.className = 'suggestion-item px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm';
            item.textContent = result.display_name;
            
            // Сохраняем данные результата
            item.dataset.lat = result.lat;
            item.dataset.lon = result.lon;
            item.dataset.address = result.display_name;
            
            // Обработчик клика
            item.addEventListener('click', () => {
                this.selectSuggestion(input, item);
            });
            
            // Обработчик наведения
            item.addEventListener('mouseenter', () => {
                this.selectedIndex = index;
                this.updateSelection(container, container.querySelectorAll('.suggestion-item'));
            });
            
            container.appendChild(item);
        });
        
        // Показываем контейнер
        container.classList.remove('hidden');
        this.selectedIndex = -1;
        
        console.log('AddressAutocomplete: Suggestions shown:', results.length);
    }
    
    selectSuggestion(input, item) {
        const address = item.dataset.address;
        const lat = item.dataset.lat;
        const lon = item.dataset.lon;
        
        console.log('AddressAutocomplete: Selected suggestion:', {
            address: address,
            lat: lat,
            lon: lon
        });
        
        // Обновляем поле ввода
        input.value = address;
        
        // Сохраняем координаты в dataset
        input.dataset.lat = lat;
        input.dataset.lon = lon;
        
        // Скрываем подсказки
        this.hideSuggestions(input);
        
        // Запускаем пересчет калькулятора
        if (window.calculator) {
            window.calculator.calculateStep1();
        }
        
        console.log('AddressAutocomplete: Input updated:', {
            value: input.value,
            lat: input.dataset.lat,
            lon: input.dataset.lon
        });
    }
    
    hideSuggestions(input = null) {
        if (input && input.suggestionsContainer) {
            input.suggestionsContainer.classList.add('hidden');
        } else {
            // Скрываем все контейнеры подсказок
            const containers = document.querySelectorAll('.address-suggestions');
            containers.forEach(container => {
                container.classList.add('hidden');
            });
        }
        this.selectedIndex = -1;
    }
}

// Инициализация при загрузке страницы
console.log('AddressAutocomplete: Adding DOMContentLoaded listener');

function initializeAddressAutocomplete() {
    console.log('AddressAutocomplete: Initializing AddressAutocomplete');
    try {
        if (!window.addressAutocomplete) {
            window.addressAutocomplete = new AddressAutocomplete();
            console.log('AddressAutocomplete: Instance created:', window.addressAutocomplete);
        } else {
            console.log('AddressAutocomplete: Instance already exists');
        }
    } catch (error) {
        console.error('AddressAutocomplete: Error creating instance:', error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('AddressAutocomplete: DOMContentLoaded event fired');
    initializeAddressAutocomplete();
});

// Also try immediate initialization if DOM is already loaded
if (document.readyState !== 'loading') {
    console.log('AddressAutocomplete: DOM already loaded, initializing immediately');
    initializeAddressAutocomplete();
} 