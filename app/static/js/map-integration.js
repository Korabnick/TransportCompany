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
        
        // Проверяем наличие кнопок карты
        const mapButtons = document.querySelectorAll('.map-open-btn');
        console.log('MapIntegration: Found map buttons:', mapButtons.length);
        
        // Additional debugging
        console.log('MapIntegration: All buttons on page:', document.querySelectorAll('button').length);
        console.log('MapIntegration: All elements with map-open-btn class:', document.querySelectorAll('[class*="map-open-btn"]').length);
        
        // Добавляем обработчики для кнопок карты
        mapButtons.forEach((btn, index) => {
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
        });
        
        // Закрытие модального окна
        const closeMapModal = document.getElementById('closeMapModal');
        if (closeMapModal) {
            closeMapModal.addEventListener('click', () => {
                this.closeMap();
            });
        } else {
            console.error('MapIntegration: closeMapModal element not found');
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
            confirmMapSelection.addEventListener('click', () => {
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
        
        // Закрытие по клику вне модального окна
        const mapModal = document.getElementById('mapModal');
        if (mapModal) {
            mapModal.addEventListener('click', (e) => {
                if (e.target.id === 'mapModal') {
                    this.closeMap();
                }
            });
        } else {
            console.error('MapIntegration: mapModal element not found');
        }
        
        console.log('MapIntegration: Events bound successfully');
    }
    
    openMap(inputId) {
        console.log('MapIntegration: Opening map for input:', inputId);
        this.currentInputId = inputId;
        
        // Показываем модальное окно
        const modal = document.getElementById('mapModal');
        console.log('MapIntegration: Modal element:', modal);
        if (modal) {
            modal.classList.remove('hidden');
            console.log('MapIntegration: Modal shown');
        } else {
            console.error('MapIntegration: Modal not found!');
            return;
        }
        
        // Инициализируем карту после небольшой задержки
        setTimeout(() => {
            this.initMap();
        }, 100);
    }
    
    closeMap() {
        console.log('MapIntegration: Closing map');
        const modal = document.getElementById('mapModal');
        if (modal) {
            modal.classList.add('hidden');
        }
        
        // Уничтожаем карту при закрытии
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        
        this.currentInputId = null;
        this.selectedCoordinates = null;
        this.selectedAddress = '';
    }
    
    initMap() {
        console.log('MapIntegration: Initializing map');
        const mapContainer = document.getElementById('mapContainer');
        console.log('MapIntegration: Map container:', mapContainer);
        
        if (!mapContainer) {
            console.error('MapIntegration: Map container not found!');
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
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.display_name) {
                this.selectedCoordinates = { lat, lng };
                this.selectedAddress = data.display_name;
                
                document.getElementById('selectedAddress').textContent = this.selectedAddress;
                document.getElementById('confirmMapSelection').disabled = false;
                
                console.log('MapIntegration: Address found:', this.selectedAddress);
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
        if (!this.currentInputId || !this.selectedCoordinates) {
            console.log('No input or coordinates selected');
            return;
        }
        
        console.log('Confirming selection:', {
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
            
            console.log('Input updated:', {
                value: input.value,
                lat: input.dataset.lat,
                lon: input.dataset.lon
            });
            
            // Запускаем пересчет калькулятора
            if (window.calculator) {
                window.calculator.calculateStep1();
            }
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