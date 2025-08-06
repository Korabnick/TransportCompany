// Map Integration with Leaflet
console.log('MapIntegration: File loaded successfully');
console.log('MapIntegration: Script execution started');

// Test if DOM is already loaded
if (document.readyState === 'loading') {
    console.log('MapIntegration: DOM is still loading');
} else {
    console.log('MapIntegration: DOM is already loaded');
}

// Simple test to verify file is loaded
window.mapIntegrationTest = 'MapIntegration file loaded';

// Test function for debugging
window.testMapIntegration = function() {
    console.log('MapIntegration: Test function called');
    const buttons = document.querySelectorAll('.map-open-btn');
    console.log('MapIntegration: Found buttons:', buttons.length);
    buttons.forEach((btn, index) => {
        console.log(`MapIntegration: Button ${index}:`, {
            element: btn,
            classes: btn.className,
            dataInputId: btn.getAttribute('data-input-id'),
            innerHTML: btn.innerHTML
        });
    });
    
    if (window.mapIntegration) {
        console.log('MapIntegration: Instance exists:', window.mapIntegration);
        return true;
    } else {
        console.error('MapIntegration: No instance found');
        return false;
    }
};

// Add error handling to catch any JavaScript errors
window.addEventListener('error', function(e) {
    console.error('MapIntegration: JavaScript error caught:', e.error);
    console.error('MapIntegration: Error details:', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno
    });
});

class MapIntegration {
    constructor() {
        console.log('MapIntegration: Constructor called');
        this.map = null;
        this.marker = null;
        this.currentInputId = null;
        this.selectedCoordinates = null;
        this.selectedAddress = '';
        this.currentButton = null;
        this.isMapOpen = false; // Добавляем флаг для отслеживания состояния карты
        
        this.init();
    }
    
    init() {
        console.log('MapIntegration: Init called');
        console.log('MapIntegration: Document ready state:', document.readyState);
        console.log('MapIntegration: Document body exists:', !!document.body);
        this.bindEvents();
    }
    
    bindEvents() {
        console.log('MapIntegration: Binding events');
        
        // Привязываем события к существующим кнопкам
        this.bindMapButtons();
        
        // Закрытие popup
        const closeMapPopup = document.getElementById('closeMapPopup');
        if (closeMapPopup) {
            closeMapPopup.addEventListener('click', () => {
                this.closeMap();
            });
        } else {
            console.error('MapIntegration: closeMapPopup element not found');
        }
        
        // Отмена выбора
        const cancelMapSelection = document.getElementById('cancelMapSelection');
        if (cancelMapSelection) {
            cancelMapSelection.addEventListener('click', () => {
                this.closeMap();
            });
        } else {
            console.error('MapIntegration: cancelMapSelection element not found');
        }
        
        // Подтверждение выбора
        const confirmMapSelection = document.getElementById('confirmMapSelection');
        if (confirmMapSelection) {
            console.log('MapIntegration: Found confirmMapSelection button, adding event listener');
            confirmMapSelection.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.confirmSelection();
            });
        } else {
            console.error('MapIntegration: confirmMapSelection element not found');
        }
        
        // Поиск по адресу
        const mapSearchBtn = document.getElementById('mapSearchBtn');
        if (mapSearchBtn) {
            mapSearchBtn.addEventListener('click', () => {
                this.searchAddress();
            });
        } else {
            console.error('MapIntegration: mapSearchBtn element not found');
        }
        
        // Поиск по Enter
        const mapSearchInput = document.getElementById('mapSearchInput');
        if (mapSearchInput) {
            mapSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.searchAddress();
                }
            });
        } else {
            console.error('MapIntegration: mapSearchInput element not found');
        }
        
        // Закрытие по клику вне popup - ИСПРАВЛЕНО
        document.addEventListener('click', (e) => {
            // Проверяем, открыта ли карта
            if (!this.isMapOpen) {
                return;
            }
            
            const popup = document.getElementById('mapPopup');
            if (popup && !popup.contains(e.target) && !e.target.closest('.map-open-btn')) {
                // Не закрываем popup если клик был на кнопке подтверждения
                if (e.target.id === 'confirmMapSelection' || e.target.closest('#confirmMapSelection')) {
                    return;
                }
                this.closeMap();
            }
        });
        
        // Закрытие popup при прокрутке страницы - ИСПРАВЛЕНО
        document.addEventListener('scroll', () => {
            if (this.isMapOpen && this.currentButton) {
                this.closeMap();
            }
        });
        
        // Перепозиционирование popup при изменении размера окна - ИСПРАВЛЕНО
        window.addEventListener('resize', () => {
            if (this.isMapOpen && this.currentButton) {
                const popup = document.getElementById('mapPopup');
                if (popup && !popup.classList.contains('hidden')) {
                    this.positionPopup(popup, this.currentButton);
                }
            }
        });
    }
    
    // Метод для привязки событий к кнопкам карты
    bindMapButtons() {
        console.log('MapIntegration: Binding map buttons');
        
        // Проверяем наличие кнопок карты
        const mapButtons = document.querySelectorAll('.map-open-btn');
        console.log('MapIntegration: Found map buttons:', mapButtons.length);
        
        // Additional debugging
        console.log('MapIntegration: All buttons on page:', document.querySelectorAll('button').length);
        console.log('MapIntegration: All elements with map-open-btn class:', document.querySelectorAll('[class*="map-open-btn"]').length);
        
        // Добавляем обработчики для кнопок карты
        mapButtons.forEach((btn, index) => {
            // Проверяем, не привязан ли уже обработчик
            if (btn.hasAttribute('data-map-bound')) {
                console.log(`MapIntegration: Button ${index} already bound, skipping`);
                return;
            }
            
            console.log(`MapIntegration: Button ${index}:`, {
                classList: btn.classList.toString(),
                dataInputId: btn.getAttribute('data-input-id'),
                innerHTML: btn.innerHTML
            });
            
            btn.addEventListener('click', (e) => {
                console.log(`MapIntegration: Map button clicked for button ${index}`);
                console.log('MapIntegration: Button element:', btn);
                console.log('MapIntegration: Button classes:', btn.className);
                console.log('MapIntegration: Button data-input-id:', btn.getAttribute('data-input-id'));
                e.preventDefault();
                e.stopPropagation();
                
                const inputId = btn.getAttribute('data-input-id');
                if (inputId) {
                    console.log(`MapIntegration: Opening map for input: ${inputId}`);
                    this.openMap(inputId);
                } else {
                    console.error('MapIntegration: No data-input-id found on button');
                }
            });
            
            // Отмечаем кнопку как привязанную
            btn.setAttribute('data-map-bound', 'true');
        });
    }
    
    openMap(inputId) {
        console.log('MapIntegration: openMap called with inputId:', inputId);
        
        this.currentInputId = inputId;
        const input = document.getElementById(inputId);
        
        if (!input) {
            console.error('MapIntegration: Input element not found:', inputId);
            return;
        }
        
        // Находим кнопку карты для этого поля
        const mapButton = document.querySelector(`[data-input-id="${inputId}"]`);
        if (!mapButton) {
            console.error('MapIntegration: Map button not found for input:', inputId);
            return;
        }
        
        // Сохраняем ссылку на кнопку
        this.currentButton = mapButton;
        
        // Показываем popup
        const popup = document.getElementById('mapPopup');
        if (!popup) {
            console.error('MapIntegration: mapPopup element not found');
            return;
        }
        
        // Позиционируем popup рядом с кнопкой
        this.positionPopup(popup, mapButton);
        
        // Показываем popup
        popup.classList.remove('hidden');
        
        // Устанавливаем флаг открытой карты
        this.isMapOpen = true;
        
        // Инициализируем карту после небольшой задержки
        setTimeout(() => {
            this.initMap();
        }, 100);
        
        console.log('MapIntegration: Map popup opened');
    }
    
    positionPopup(popup, button) {
        const buttonRect = button.getBoundingClientRect();
        const popupWidth = 500;
        const popupHeight = 500;
        const margin = 20;
        
        // Вычисляем позицию
        let left = buttonRect.right + margin;
        let top = buttonRect.top;
        
        // Проверяем, не выходит ли popup за правый край экрана
        if (left + popupWidth > window.innerWidth - margin) {
            left = buttonRect.left - popupWidth - margin;
        }
        
        // Проверяем, не выходит ли popup за левый край экрана
        if (left < margin) {
            left = margin;
        }
        
        // Проверяем, не выходит ли popup за нижний край экрана
        if (top + popupHeight > window.innerHeight - margin) {
            top = window.innerHeight - popupHeight - margin;
        }
        
        // Проверяем, не выходит ли popup за верхний край экрана
        if (top < margin) {
            top = margin;
        }
        
        // Устанавливаем позицию
        popup.style.left = left + 'px';
        popup.style.top = top + 'px';
    }
    
    closeMap() {
        console.log('MapIntegration: closeMap called');
        
        // Проверяем, открыта ли карта
        if (!this.isMapOpen) {
            console.log('MapIntegration: Map is not open, skipping close');
            return;
        }
        
        const popup = document.getElementById('mapPopup');
        if (popup) {
            popup.classList.add('hidden');
        }
        
        // Уничтожаем карту, если она существует
        if (this.map) {
            try {
                this.map.remove();
                this.map = null;
                console.log('MapIntegration: Map destroyed successfully');
            } catch (error) {
                console.error('MapIntegration: Error destroying map:', error);
            }
        }
        
        // Очищаем маркер
        this.marker = null;
        
        // Очищаем выбранный адрес
        const selectedAddressSpan = document.getElementById('selectedAddress');
        if (selectedAddressSpan) {
            selectedAddressSpan.textContent = 'Выберите точку на карте';
        }
        
        // Отключаем кнопку подтверждения
        const confirmBtn = document.getElementById('confirmMapSelection');
        if (confirmBtn) {
            confirmBtn.disabled = true;
        }
        
        // Сбрасываем флаг открытой карты
        this.isMapOpen = false;
        
        // Очищаем данные только после закрытия
        this.currentInputId = null;
        this.selectedCoordinates = null;
        this.selectedAddress = '';
        this.currentButton = null;
        
        console.log('MapIntegration: Map popup closed');
    }
    
    initMap() {
        console.log('MapIntegration: Initializing map');
        const mapContainer = document.getElementById('mapContainer');
        console.log('MapIntegration: Map container:', mapContainer);
        
        if (!mapContainer) {
            console.error('MapIntegration: Map container not found!');
            return;
        }
        
        // Проверяем, не инициализирована ли уже карта
        if (this.map) {
            console.log('MapIntegration: Map already initialized, skipping');
            return;
        }
        
        // Центр карты - Санкт-Петербург
        const center = [59.9311, 30.3609];
        
        try {
            // Создаем карту без атрибуции
            this.map = L.map('mapContainer', {
                attributionControl: false
            }).setView(center, 12);
            
            // Добавляем слой OpenStreetMap без атрибуции
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '',
                maxZoom: 18
            }).addTo(this.map);
            
            console.log('MapIntegration: Map initialized successfully');
            
            // Добавляем обработчик клика по карте
            this.map.on('click', (e) => {
                this.handleMapClick(e);
            });
            
        } catch (error) {
            console.error('MapIntegration: Error initializing map:', error);
        }
    }
    
    handleMapClick(e) {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        console.log('MapIntegration: Map clicked at:', { lat, lng });
        
        // Удаляем предыдущий маркер
        if (this.marker) {
            this.map.removeLayer(this.marker);
        }
        
        // Добавляем новый маркер
        this.marker = L.marker([lat, lng]).addTo(this.map);
        
        // Получаем адрес по координатам
        this.reverseGeocode(lat, lng);
    }
    
    async reverseGeocode(lat, lng) {
        try {
            console.log('MapIntegration: Reverse geocoding for:', { lat, lng });
            
            const url = `/api/v2/proxy/nominatim?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
            console.log('MapIntegration: Reverse geocoding URL:', url);
            
            const response = await fetch(url);
            const data = await response.json();
            
            console.log('MapIntegration: Reverse geocoding response:', data);
            
            if (data.display_name) {
                this.selectedCoordinates = { lat, lng };
                this.selectedAddress = data.display_name;
                
                console.log('MapIntegration: Setting selected data:', {
                    coordinates: this.selectedCoordinates,
                    address: this.selectedAddress
                });
                
                const selectedAddressSpan = document.getElementById('selectedAddress');
                const confirmBtn = document.getElementById('confirmMapSelection');
                
                if (selectedAddressSpan) {
                    selectedAddressSpan.textContent = this.selectedAddress;
                    console.log('MapIntegration: Updated selectedAddress span');
                } else {
                    console.error('MapIntegration: selectedAddress span not found');
                }
                
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    console.log('MapIntegration: Enabled confirm button');
                } else {
                    console.error('MapIntegration: confirmMapSelection button not found');
                }
                
                console.log('MapIntegration: Address found and set:', this.selectedAddress);
            } else {
                console.error('MapIntegration: No display_name in response');
            }
        } catch (error) {
            console.error('MapIntegration: Error in reverse geocoding:', error);
        }
    }
    
    async searchAddress() {
        const query = document.getElementById('mapSearchInput').value.trim();
        
        if (!query) {
            console.log('Empty search query');
            return;
        }
        
        try {
            console.log('Searching for address:', query);
            
            // Добавляем ограничение на Санкт-Петербург и область
            const searchQuery = `${query}, Санкт-Петербург, Россия`;
            const url = `/api/v2/proxy/nominatim?format=json&q=${encodeURIComponent(searchQuery)}&limit=1&addressdetails=1`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lng = parseFloat(result.lon);
                
                console.log('Search result:', result);
                
                // Перемещаем карту к найденному адресу
                this.map.setView([lat, lng], 16);
                
                // Удаляем предыдущий маркер
                if (this.marker) {
                    this.map.removeLayer(this.marker);
                }
                
                // Добавляем маркер
                this.marker = L.marker([lat, lng]).addTo(this.map);
                
                // Обновляем выбранные данные
                this.selectedCoordinates = { lat, lng };
                this.selectedAddress = result.display_name;
                
                document.getElementById('selectedAddress').textContent = this.selectedAddress;
                document.getElementById('confirmMapSelection').disabled = false;
                
                console.log('Address found and marked on map');
            } else {
                console.log('No results found for:', query);
                alert('Адрес не найден. Попробуйте другой запрос.');
            }
        } catch (error) {
            console.error('Error searching address:', error);
            alert('Ошибка при поиске адреса. Попробуйте еще раз.');
        }
    }
    
    async calculateRoute(coordinates) {
        console.log('MapIntegration: calculateRoute called with coordinates:', coordinates);
        
        try {
            if (!coordinates || coordinates.length < 2) {
                console.error('MapIntegration: Insufficient coordinates for route calculation');
                return null;
            }
            
                        // Формируем координаты для OSRM API
            const coordsString = coordinates.map(coord => `${coord.lon},${coord.lat}`).join(';');
            const osrmUrl = `/api/v2/proxy/osrm?coordinates=${coordsString}&profile=driving&overview=false&steps=false`;

            console.log('MapIntegration: OSRM URL:', osrmUrl);

            const response = await fetch(osrmUrl);
            const data = await response.json();
            
            console.log('MapIntegration: OSRM response:', data);
            
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const distance = route.distance / 1000; // Конвертируем в километры
                const duration = route.duration / 3600; // Конвертируем в часы
                
                console.log('MapIntegration: Route calculated:', {
                    distance: distance,
                    duration: duration,
                    distanceMeters: route.distance,
                    durationSeconds: route.duration
                });
                
                return {
                    distance: distance,
                    duration: duration,
                    distanceMeters: route.distance,
                    durationSeconds: route.duration
                };
            } else {
                console.error('MapIntegration: No routes found in OSRM response');
                return null;
            }
        } catch (error) {
            console.error('MapIntegration: Error calculating route:', error);
            return null;
        }
    }
    
    confirmSelection() {
        console.log('MapIntegration: confirmSelection called');
        
        if (!this.currentInputId || !this.selectedCoordinates) {
            console.log('MapIntegration: No input or coordinates selected');
            return;
        }
        
        if (!this.selectedAddress) {
            console.log('MapIntegration: No address selected');
            return;
        }
        
        console.log('MapIntegration: Confirming selection:', {
            inputId: this.currentInputId,
            coordinates: this.selectedCoordinates,
            address: this.selectedAddress
        });
        
        // Обновляем поле ввода
        const input = document.getElementById(this.currentInputId);
        
        if (input) {
            input.value = this.selectedAddress;
            
            // Сохраняем координаты в dataset
            input.dataset.lat = this.selectedCoordinates.lat;
            input.dataset.lon = this.selectedCoordinates.lng;
            
            console.log('MapIntegration: Input updated successfully');
            
                    // Запускаем пересчет калькулятора
        if (window.calculator) {
            window.calculator.calculateStep1();
            
            // Обновляем время последней активности и запускаем таймер
            window.calculator.lastUserActivity = Date.now();
            window.calculator.startAutoPriceUpdate();
        }
        } else {
            console.error('MapIntegration: Input element not found for ID:', this.currentInputId);
        }
        
        // Закрываем карту
        this.closeMap();
    }
}

// Инициализация при загрузке страницы
console.log('MapIntegration: Adding DOMContentLoaded listener');

function initializeMapIntegration() {
    console.log('MapIntegration: Initializing MapIntegration');
    try {
        if (!window.mapIntegration) {
            window.mapIntegration = new MapIntegration();
            console.log('MapIntegration: Instance created:', window.mapIntegration);
        } else {
            console.log('MapIntegration: Instance already exists');
        }
    } catch (error) {
        console.error('MapIntegration: Error creating instance:', error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('MapIntegration: DOMContentLoaded event fired');
    initializeMapIntegration();
});

// Also try immediate initialization if DOM is already loaded
if (document.readyState !== 'loading') {
    console.log('MapIntegration: DOM already loaded, initializing immediately');
    initializeMapIntegration();
} 