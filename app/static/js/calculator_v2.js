// Calculator V2 - Основной класс калькулятора
class CalculatorV2 {
    constructor() {
        console.log('CalculatorV2 constructor called');
        this.baseUrl = '/api/v2';
        this.currentStep = 1;
        this.calculationData = {
            step1: {},
            step2: {},
            step3: {}
        };
        this.selectedVehicle = null;
        this.rateLimitInfo = {
            remaining: 10,
            max: 10,
            window: 60
        };
        
        // Инициализация стоимости дополнительных услуг
        this.additionalServicesCost = 0;
        
        // Инициализация таймера для автоматического обновления цены
        this.priceUpdateTimer = null;
        this.lastUserActivity = Date.now();
        this.debounceTimer = null; // Новый таймер для debounce-логики
        
        this.init();
    }
    
    init() {
        console.log('CalculatorV2 init called');
        this.bindEvents();
        this.checkRateLimitStatus();
        this.loadVehicles();
        // Транспорт будет загружен и отображен при показе шага 2
    }
    
    bindEvents() {
        console.log('CalculatorV2 bindEvents called');
        // Шаг 1: Маршрут и время
        this.bindStep1Events();
        
        // Шаг 2: Выбор транспорта
        this.bindStep2Events();
        
        // Шаг 3: Итоговая стоимость
        this.bindStep3Events();
        
        // Общие события
        this.bindCommonEvents();
    }
    
    bindStep1Events() {
        console.log('Binding step 1 events...');
        
        const fromInput = document.getElementById('fromAddress');
        const toInput = document.getElementById('toAddress');
        const durationSelect = document.getElementById('durationSelect');
        const pickupTimeInput = document.getElementById('pickupTime');
        const urgentCheckbox = document.getElementById('urgentPickup');
        
        console.log('Step1 elements found:', { fromInput, toInput, durationSelect, pickupTimeInput, urgentCheckbox });
        
        // Функция для проверки готовности к расчету маршрута
        const canCalculateRoute = () => {
            const fromAddress = fromInput?.value || '';
            const toAddress = toInput?.value || '';
            
            console.log('canCalculateRoute check:', { fromAddress, toAddress });
            
            // Проверяем только наличие текста в полях адресов
            if (!fromAddress.trim() || !toAddress.trim()) {
                console.log('Addresses not ready:', { fromAddress: fromAddress.trim(), toAddress: toAddress.trim() });
                return false;
            }
            
            console.log('Addresses ready for calculation');
            return true;
        };
        
        // Функция для безопасного вызова calculateStep1
        const safeCalculateStep1 = () => {
            console.log('safeCalculateStep1 called');
            if (canCalculateRoute()) {
                console.log('Proceeding with calculateStep1');
                this.calculateStep1();
            } else {
                console.log('Не все данные готовы для расчета маршрута');
            }
        };
        
        // Функция для пересчета стоимости (без пересчета маршрута)
        const recalculateCost = () => {
            if (this.calculationData.step1 && this.calculationData.step1.distance) {
                const durationHours = parseInt(durationSelect?.value) || 1;
                const urgentPickup = urgentCheckbox?.checked || false;
                
                const newTotal = this.calculateTotalCost(
                    this.calculationData.step1.distance, 
                    durationHours, 
                    urgentPickup
                );
                
                this.calculationData.step1.total = newTotal;
                this.updateStep1Display(this.calculationData.step1);
                
                // Обновляем отображение стоимости маршрута в шаге 3
                this.updateRouteCostDisplay();
                
                // Обновляем время последней активности и запускаем таймер
                this.lastUserActivity = Date.now();
                this.startAutoPriceUpdate();
                
                // Показываем блок с результатами
                const resultsBlock = document.getElementById('step1Results');
                if (resultsBlock) {
                    resultsBlock.classList.remove('hidden');
                }
            }
        };
        
        if (fromInput && toInput) {
            console.log('Adding event listeners to address inputs');
            let timeout;
            const debouncedCalculation = () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    console.log('Debounced calculation triggered');
                    safeCalculateStep1();
                }, 500);
            };
            
            // Добавляем обработчики для основных адресных полей
            [fromInput, toInput].forEach(input => {
                input.addEventListener('input', debouncedCalculation);
                console.log('Added input event listener to:', input.id);
            });
            
            // Добавляем обработчик для дополнительных адресных полей через делегирование событий
            const additionalAddressesContainer = document.getElementById('additionalAddresses');
            if (additionalAddressesContainer) {
                additionalAddressesContainer.addEventListener('input', (e) => {
                    if (e.target.matches('input[type="text"]')) {
                        console.log('Additional address input changed:', e.target.value);
                        debouncedCalculation();
                    }
                });
            }
        } else {
            console.error('Address inputs not found for event binding');
        }
        
        if (durationSelect) {
            durationSelect.addEventListener('change', () => {
                recalculateCost();
                // Пересчитываем стоимость шага 2 при изменении длительности
                this.recalculateStep2Cost();
                // Обновляем время последней активности и запускаем таймер
                this.lastUserActivity = Date.now();
                this.startAutoPriceUpdate();
            });
        }
        
        if (pickupTimeInput) {
            // Функция для обновления минимальной даты (минимум 1 час от текущего времени)
            const updateMinDateTime = () => {
                const now = new Date();
                const minTime = new Date(now.getTime() + 3600000); // +1 час
                const year = minTime.getFullYear();
                const month = String(minTime.getMonth() + 1).padStart(2, '0');
                const day = String(minTime.getDate()).padStart(2, '0');
                const hours = String(minTime.getHours()).padStart(2, '0');
                const minutes = String(minTime.getMinutes()).padStart(2, '0');
                const minDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
                
                pickupTimeInput.min = minDateTime;
                
                // Проверяем, не меньше ли текущее значение минимальной даты
                if (pickupTimeInput.value && pickupTimeInput.value < minDateTime) {
                    pickupTimeInput.value = minDateTime;
                }
            };
            
            // Функция для обновления времени при срочной подаче (+20 минут)
            const updateUrgentPickupTime = () => {
                const now = new Date();
                const urgentTime = new Date(now.getTime() + 1200000); // +20 минут
                const year = urgentTime.getFullYear();
                const month = String(urgentTime.getMonth() + 1).padStart(2, '0');
                const day = String(urgentTime.getDate()).padStart(2, '0');
                const hours = String(urgentTime.getHours()).padStart(2, '0');
                const minutes = String(urgentTime.getMinutes()).padStart(2, '0');
                const urgentDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
                
                pickupTimeInput.value = urgentDateTime;
                pickupTimeInput.min = urgentDateTime;
                pickupTimeInput.max = urgentDateTime;
            };
            
            // Устанавливаем минимальную дату при инициализации
            updateMinDateTime();
            
            // Устанавливаем текущее время как значение по умолчанию
            pickupTimeInput.value = pickupTimeInput.min;
            
            // Обновляем минимальную дату каждую минуту
            setInterval(updateMinDateTime, 60000);
            
            // Валидация при изменении значения
            pickupTimeInput.addEventListener('change', () => {
                const urgentCheckbox = document.getElementById('urgentPickup');
                const isUrgent = urgentCheckbox?.checked || false;
                
                if (isUrgent) {
                    // При срочной подаче ограничиваем время до +20 минут
                    const selectedDateTime = new Date(pickupTimeInput.value);
                    const urgentTime = new Date(Date.now() + 1200000); // +20 минут
                    
                    if (selectedDateTime.getTime() !== urgentTime.getTime()) {
                        updateUrgentPickupTime();
                        this.showError('При срочной подаче время ограничено текущим временем + 20 минут.');
                    }
                } else {
                    // Обычная валидация (минимум 1 час)
                    const selectedDateTime = new Date(pickupTimeInput.value);
                    const minTime = new Date(Date.now() + 3600000); // +1 час
                    
                    if (selectedDateTime < minTime) {
                        updateMinDateTime();
                        pickupTimeInput.value = pickupTimeInput.min;
                        this.showError('Минимальное время подачи - через 1 час от текущего времени.');
                    }
                }
            });
            
            // Валидация при вводе
            pickupTimeInput.addEventListener('input', () => {
                const urgentCheckbox = document.getElementById('urgentPickup');
                const isUrgent = urgentCheckbox?.checked || false;
                
                if (!isUrgent) {
                    const selectedDateTime = new Date(pickupTimeInput.value);
                    const minTime = new Date(Date.now() + 3600000); // +1 час
                    
                    if (selectedDateTime < minTime) {
                        // Если вводится прошедшая дата, не запускаем расчет
                        return;
                    }
                }
            });
            
            // Дополнительная валидация при потере фокуса
            pickupTimeInput.addEventListener('blur', () => {
                const urgentCheckbox = document.getElementById('urgentPickup');
                const isUrgent = urgentCheckbox?.checked || false;
                
                if (isUrgent) {
                    const selectedDateTime = new Date(pickupTimeInput.value);
                    const urgentTime = new Date(Date.now() + 1200000); // +20 минут
                    
                    if (selectedDateTime.getTime() !== urgentTime.getTime()) {
                        updateUrgentPickupTime();
                        this.showError('При срочной подаче время ограничено текущим временем + 20 минут.');
                    }
                } else {
                    const selectedDateTime = new Date(pickupTimeInput.value);
                    const minTime = new Date(Date.now() + 3600000); // +1 час
                    
                    if (selectedDateTime < minTime) {
                        updateMinDateTime();
                        pickupTimeInput.value = pickupTimeInput.min;
                        this.showError('Минимальное время подачи - через 1 час от текущего времени.');
                    }
                }
            });
        }
        
        if (urgentCheckbox) {
            console.log('Adding event listener to urgent checkbox');
            urgentCheckbox.addEventListener('change', () => {
                console.log('Urgent checkbox changed');
                const pickupTimeInput = document.getElementById('pickupTime');
                
                // Обновляем время последней активности и запускаем таймер
                this.lastUserActivity = Date.now();
                this.startAutoPriceUpdate();
                
                if (urgentCheckbox.checked) {
                    // При включении срочной подачи
                    pickupTimeInput.disabled = true;
                    const now = new Date();
                    const urgentTime = new Date(now.getTime() + 1200000); // +20 минут
                    const year = urgentTime.getFullYear();
                    const month = String(urgentTime.getMonth() + 1).padStart(2, '0');
                    const day = String(urgentTime.getDate()).padStart(2, '0');
                    const hours = String(urgentTime.getHours()).padStart(2, '0');
                    const minutes = String(urgentTime.getMinutes()).padStart(2, '0');
                    const urgentDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
                    
                    pickupTimeInput.value = urgentDateTime;
                    pickupTimeInput.min = urgentDateTime;
                    pickupTimeInput.max = urgentDateTime;
                } else {
                    // При отключении срочной подачи
                    pickupTimeInput.disabled = false;
                    pickupTimeInput.max = '';
                    
                    // Обновляем минимальное время до 1 часа
                    const now = new Date();
                    const minTime = new Date(now.getTime() + 3600000); // +1 час
                    const year = minTime.getFullYear();
                    const month = String(minTime.getMonth() + 1).padStart(2, '0');
                    const day = minTime.getDate();
                    const hours = String(minTime.getHours()).padStart(2, '0');
                    const minutes = String(minTime.getMinutes()).padStart(2, '0');
                    const minDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
                    
                    pickupTimeInput.min = minDateTime;
                    pickupTimeInput.value = minDateTime;
                }
                
                // Пересчитываем стоимость при изменении срочной подачи
                if (this.calculationData.step1 && this.calculationData.step1.distance) {
                    this.recalculateStep1Cost();
                }
                
                console.log('Urgent pickup changed:', urgentCheckbox.checked);
            });
        }
        
        // Обработка радиокнопок времени подачи
        const timeRadios = document.querySelectorAll('input[name="time"]');
        timeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.updatePickupTime();
            });
        });
    }
    
    bindStep2Events() {
        console.log('Binding step 2 events...');
        
        // Обработка кнопок пассажиров
        const passengerBtns = document.querySelectorAll('.passenger-btn');
        console.log('Found passenger buttons:', passengerBtns.length);
        passengerBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectPassengers(parseInt(btn.dataset.value));
            });
        });
        
        // Обработка кнопок грузчиков
        const loaderBtns = document.querySelectorAll('.loader-btn');
        console.log('Found loader buttons:', loaderBtns.length);
        loaderBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectLoaders(parseInt(btn.dataset.value));
            });
        });
        
        // Обработка фильтров транспорта
        const heightSelect = document.getElementById('heightSelect');
        const lengthSelect = document.getElementById('lengthSelect');
        const bodyTypeSelect = document.getElementById('bodyTypeSelect');
        
        console.log('Found filter selects:', { heightSelect, lengthSelect, bodyTypeSelect });
        
        [heightSelect, lengthSelect, bodyTypeSelect].forEach(select => {
            if (select) {
                select.addEventListener('change', () => {
                    this.filterVehicles();
                    // Обновляем время последней активности и запускаем таймер
                    this.lastUserActivity = Date.now();
                    this.startAutoPriceUpdate();
                });
            }
        });
        
        // Обработка кнопки дополнительных услуг
        this.bindAdditionalServicesEvents();
    }
    
    bindStep3Events() {
        // Обработка выбора транспорта
        document.addEventListener('click', (e) => {
            if (e.target.closest('.vehicle-card')) {
                const vehicleCard = e.target.closest('.vehicle-card');
                const vehicleId = parseInt(vehicleCard.dataset.vehicleId);
                if (vehicleId) {
                this.selectVehicle(vehicleId);
                }
            }
        });
        
        // Обработка оформления заказа
        const orderBtn = document.getElementById('orderButton');
        if (orderBtn) {
            orderBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.submitOrder();
            });
        }
        
        // Обработка событий поля "Примечания к заказу"
        this.bindOrderNotesEvents();
    }
    
    bindCommonEvents() {
        // Обработка навигации между шагами
        const nextBtns = document.querySelectorAll('.next-step');
        const prevBtns = document.querySelectorAll('.prev-step');
        
        nextBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.nextStep();
            });
        });
        
        prevBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.prevStep();
            });
        });
        
        // Удаляем широкое отслеживание активности пользователя
        // Теперь debounce-логика срабатывает только при конкретных изменениях в калькуляторе
    }
    
    async calculateStep1() {
        try {
            console.log('=== calculateStep1 called ===');
            
            const fromAddressInput = document.getElementById('fromAddress');
            const toAddressInput = document.getElementById('toAddress');
            const fromAddress = fromAddressInput?.value || '';
            const toAddress = toAddressInput?.value || '';
            const durationHours = parseInt(document.getElementById('durationSelect')?.value) || 1;
            const urgentPickup = document.getElementById('urgentPickup')?.checked || false;
            
            console.log('Input values:', { fromAddress, toAddress, durationHours, urgentPickup });
            
            if (!fromAddress || !toAddress) {
                console.log('Не все обязательные поля заполнены:', { fromAddress, toAddress });
                return;
            }
            
            console.log('Proceeding with calculation...');
            
            // Собираем все адреса маршрута
            const routeAddresses = [];
            const routeCoordinates = [];
            
            // Добавляем начальный адрес
            if (fromAddress) {
                routeAddresses.push(fromAddress);
                const fromCoords = fromAddressInput?.dataset.lat && fromAddressInput?.dataset.lon ? 
                    { lat: parseFloat(fromAddressInput.dataset.lat), lon: parseFloat(fromAddressInput.dataset.lon) } : null;
                routeCoordinates.push(fromCoords);
            }
            
            // Добавляем дополнительные адреса
            const additionalAddressFields = document.querySelectorAll('.additional-address-field input[type="text"]');
            additionalAddressFields.forEach(field => {
                const address = field.value.trim();
                if (address) {
                    routeAddresses.push(address);
                    const coords = field.dataset.lat && field.dataset.lon ? 
                        { lat: parseFloat(field.dataset.lat), lon: parseFloat(field.dataset.lon) } : null;
                    routeCoordinates.push(coords);
                }
            });
            
            // Добавляем конечный адрес
            if (toAddress) {
                routeAddresses.push(toAddress);
                const toCoords = toAddressInput?.dataset.lat && toAddressInput?.dataset.lon ? 
                    { lat: parseFloat(toAddressInput.dataset.lat), lon: parseFloat(toAddressInput.dataset.lon) } : null;
                routeCoordinates.push(toCoords);
            }
            
            console.log('Route addresses:', routeAddresses);
            console.log('Route coordinates:', routeCoordinates);
            
            if (routeAddresses.length < 2) {
                console.log('Недостаточно адресов для расчета маршрута');
                return;
            }
            
            // Проверяем, есть ли координаты для всех адресов
            const hasAllCoordinates = routeCoordinates.every(coord => coord !== null);
            
            let totalDistance = 0;
            let totalDuration = 0;
            
            if (hasAllCoordinates) {
                console.log('Используем OSRM для расчета маршрута с множественными точками');
                // Используем OSRM для расчета маршрута с множественными точками
                const routeResult = await this.calculateRouteWithCoordinates(routeCoordinates, durationHours, urgentPickup);
                if (routeResult) {
                    totalDistance = routeResult.distance;
                    totalDuration = routeResult.duration;
                }
            } else {
                console.log('Координаты не найдены, используем фиксированное расстояние для демонстрации');
                // Для демонстрации рассчитываем расстояние между последовательными адресами
                for (let i = 0; i < routeAddresses.length - 1; i++) {
                    const distance = this.estimateDistance(routeAddresses[i], routeAddresses[i + 1]);
                    totalDistance += distance;
                }
                totalDuration = durationHours * 60; // в минутах
            }
            
            const totalCost = this.calculateTotalCost(totalDistance, durationHours, urgentPickup);
            
            // Получаем значение pickup_time из поля ввода
            const pickupTimeInput = document.getElementById('pickupTime');
            const pickupTime = pickupTimeInput?.value || '';
            
            const routeData = {
                distance: totalDistance,
                duration: totalDuration,
                from_address: fromAddress,
                to_address: toAddress,
                route_addresses: routeAddresses,
                coordinates: routeCoordinates.filter(Boolean),
                duration_hours: durationHours,
                urgent_pickup: urgentPickup,
                pickup_time: pickupTime,
                total: totalCost
            };
            
            this.calculationData.step1 = routeData;
            this.updateStep1Display(routeData);
            this.updateRouteCostDisplay();
            this.showStep2();
            
            console.log('Step1 calculation completed:', routeData);
            console.log('Step1 total cost:', routeData.total);
            console.log('Calling updateRouteCostDisplay...');
            
        } catch (error) {
            console.error('Step1 calculation error:', error);
            this.showError('Ошибка расчета маршрута');
        }
    }
    
    // Метод для оценки расстояния между адресами (для демонстрации)
    estimateDistance(fromAddress, toAddress) {
        console.log('estimateDistance called with:', { fromAddress, toAddress });
        
        // Простая логика для демонстрации
        const fromLower = fromAddress.toLowerCase();
        const toLower = toAddress.toLowerCase();
        
        // Проверяем, насколько похожи адреса (для близких адресов)
        const fromWords = fromLower.split(/\s+/).filter(word => word.length > 2);
        const toWords = toLower.split(/\s+/).filter(word => word.length > 2);
        
        // Считаем общие слова
        const commonWords = fromWords.filter(word => toWords.includes(word));
        const similarity = commonWords.length / Math.max(fromWords.length, toWords.length);
        
        console.log('Address similarity analysis:', { fromWords, toWords, commonWords, similarity });
        
        // Если адреса очень похожи (много общих слов), считаем их близкими
        if (similarity > 0.3) {
            console.log('Addresses are very similar, estimating short distance');
            return 0.5; // 500 метров
        }
        
        // Если адреса частично похожи, считаем их в одном районе
        if (similarity > 0.1) {
            console.log('Addresses are partially similar, estimating local distance');
            return 2.0; // 2 км
        }
        
        // Если оба адреса содержат "спб" или "санкт-петербург" - это внутри города
        if ((fromLower.includes('спб') || fromLower.includes('санкт-петербург') || fromLower.includes('питер')) &&
            (toLower.includes('спб') || toLower.includes('санкт-петербург') || toLower.includes('питер'))) {
            console.log('Both addresses are in SPb, estimating city distance');
            return 15.0; // В пределах города
        }
        
        // Если один из адресов содержит "область" - это за городом
        if (fromLower.includes('область') || toLower.includes('область')) {
            console.log('One address is in region, estimating regional distance');
            return 45.0; // За городом
        }
        
        // Если адреса содержат названия районов СПб
        const spbDistricts = ['московский', 'невский', 'центральный', 'адмиралтейский', 'василеостровский', 
                             'петроградский', 'кировский', 'красногвардейский', 'калининский', 'выборгский',
                             'приморский', 'петродворцовый', 'пушкинский', 'колпинский', 'красносельский',
                             'курортный', 'кронштадтский'];
        
        const fromHasDistrict = spbDistricts.some(district => fromLower.includes(district));
        const toHasDistrict = spbDistricts.some(district => toLower.includes(district));
        
        if (fromHasDistrict && toHasDistrict) {
            console.log('Both addresses are in SPb districts, estimating inter-district distance');
            return 20.0; // Между районами СПб
        }
        
        // Если адреса содержат номера домов или улиц, пытаемся определить близость
        const fromHasNumber = /\d+/.test(fromLower);
        const toHasNumber = /\d+/.test(toLower);
        
        if (fromHasNumber && toHasNumber) {
            // Извлекаем номера домов
            const fromNumber = fromLower.match(/\d+/)?.[0];
            const toNumber = toLower.match(/\d+/)?.[0];
            
            if (fromNumber && toNumber) {
                const numberDiff = Math.abs(parseInt(fromNumber) - parseInt(toNumber));
                if (numberDiff < 10) {
                    console.log('Addresses have close house numbers, estimating very short distance');
                    return 0.2; // 200 метров
                } else if (numberDiff < 50) {
                    console.log('Addresses have moderately close house numbers, estimating short distance');
                    return 1.0; // 1 км
                }
            }
        }
        
        // По умолчанию - среднее расстояние в городе
        console.log('Using default distance estimation');
        return 8.0; // Среднее расстояние в городе
    }

    async calculateRouteWithCoordinates(coordinates, durationHours, urgentPickup) {
        try {
            console.log('Calculating route with coordinates:', coordinates);
            
            // Проверяем валидность координат
            if (!coordinates || coordinates.length < 2) {
                console.error('Недостаточно координат для расчета маршрута');
                this.showError('Не удалось рассчитать маршрут. Проверьте адреса.');
                return null;
            }
            
            // Проверяем, что координаты находятся в пределах СПб и Лен. области
            const validBounds = {
                minLat: 59.5, maxLat: 61.5,
                minLon: 28.5, maxLon: 32.0
            };
            
            for (let coord of coordinates) {
                if (coord.lat < validBounds.minLat || coord.lat > validBounds.maxLat ||
                    coord.lon < validBounds.minLon || coord.lon > validBounds.maxLon) {
                    console.error('Координаты вне допустимых границ:', coord);
                    this.showError('Адрес должен находиться в Санкт-Петербурге или Ленинградской области.');
                    return null;
                }
            }
            
            // Используем глобальный экземпляр MapIntegration
            if (!window.mapIntegration) {
                console.error('MapIntegration instance not found');
                this.showError('Ошибка инициализации карты. Обновите страницу.');
                return null;
            }
            
            const route = await window.mapIntegration.calculateRoute(coordinates);
            
            if (route && route.distance > 0) {
                console.log('Route calculated successfully:', route);
                return route;
            } else {
                console.error('OSRM вернул пустой маршрут');
                this.showError('Не удалось рассчитать маршрут. Попробуйте другие адреса.');
                return null;
            }
        } catch (error) {
            console.error('Ошибка расчета маршрута через OSRM:', error);
            this.showError('Ошибка расчета маршрута. Попробуйте еще раз.');
            return null;
        }
    }

    calculateTotalCost(distance, durationHours, urgentPickup) {
        console.log('=== calculateTotalCost called ===');
        console.log('Input parameters:', { distance, durationHours, urgentPickup });
        
        // Новая система расчета согласно требованиям пользователя
        
        // Шаг 1: Расчет стоимости за расстояние (1 км = 10 рублей)
        const baseCostPerKm = 10;
        const distanceCost = distance * baseCostPerKm;
        console.log('Distance calculation:', { distance, baseCostPerKm, distanceCost });
        
        // Шаг 2: Расчет стоимости за длительность (100 рублей в час)
        const durationCostPerHour = 100;
        const durationCost = durationHours * durationCostPerHour;
        console.log('Duration calculation:', { durationHours, durationCostPerHour, durationCost });
        
        // Шаг 3: Общая стоимость без срочной подачи
        const baseTotalCost = distanceCost + durationCost;
        console.log('Base total cost:', { distanceCost, durationCost, baseTotalCost });
        
        // Шаг 4: Применяем срочную подачу (+30% к общей стоимости)
        let urgentMultiplier = 1;
        if (urgentPickup) {
            urgentMultiplier = 1.3; // Увеличиваем цену на 30% при срочной подаче
        }
        console.log('Urgent pickup calculation:', { urgentPickup, urgentMultiplier });
        
        const totalCost = Math.round(baseTotalCost * urgentMultiplier);
        
        console.log('=== Final calculation result ===');
        console.log('Step 1 Calculation:', {
            distance,
            distanceCost,
            durationHours,
            durationCost,
            baseTotalCost,
            urgentPickup,
            urgentMultiplier,
            totalCost
        });
        
        return totalCost;
    }
    
    // Новый метод для пересчета стоимости шага 1
    recalculateStep1Cost() {
        if (!this.calculationData.step1 || !this.calculationData.step1.distance) {
            console.log('No step1 data available for recalculation');
            return;
        }
        
        const distance = this.calculationData.step1.distance;
        const durationHours = parseInt(document.getElementById('durationSelect')?.value) || 1;
        const urgentPickup = document.getElementById('urgentPickup')?.checked || false;
        
        console.log('Recalculating step1 cost with:', { distance, durationHours, urgentPickup });
        
        const newTotal = this.calculateTotalCost(distance, durationHours, urgentPickup);
        
        // Обновляем данные
        this.calculationData.step1.total = newTotal;
        this.calculationData.step1.duration_hours = durationHours;
        this.calculationData.step1.urgent_pickup = urgentPickup;
        
        console.log('Updated step1 data with duration_hours:', durationHours);
        
        // Сохраняем pickup_time, если он уже есть
        if (!this.calculationData.step1.pickup_time) {
            const pickupTimeInput = document.getElementById('pickupTime');
            this.calculationData.step1.pickup_time = pickupTimeInput?.value || '';
        }
        
        console.log('Updated step1 total:', newTotal);
        
        // Обновляем отображение
        this.updateStep1Display(this.calculationData.step1);
        
        // Обновляем отображение стоимости маршрута в шаге 3
        this.updateRouteCostDisplay();
        
        // Если выбран транспорт, пересчитываем итоговую стоимость
        if (this.selectedVehicle) {
            this.calculateStep3();
        }
    }
    
    // Метод для обновления отображения стоимости маршрута в шаге 3
    updateRouteCostDisplay() {
        console.log('updateRouteCostDisplay called');
        console.log('Step1 data:', this.calculationData.step1);
        
        if (this.calculationData.step1 && this.calculationData.step1.total) {
            const routeCostElement = document.getElementById('routeCost');
            console.log('Route cost element found:', routeCostElement);
            
            if (routeCostElement) {
                const cost = Math.round(this.calculationData.step1.total);
                routeCostElement.textContent = `${cost} ₽`;
                console.log('Route cost updated to:', cost);
                
                // Показываем шаг 3, если он еще не виден
                const step3 = document.getElementById('step3');
                if (step3 && step3.classList.contains('hidden')) {
                    step3.classList.remove('hidden');
                    step3.classList.add('md:col-span-1');
                    console.log('Step 3 shown');
                }
                
                console.log('Route cost updated:', this.calculationData.step1.total);
            } else {
                console.error('Route cost element not found');
            }
        } else {
            console.log('No step1 data available for route cost display');
        }
    }

    // Новый метод для расчета стоимости шага 2
    calculateStep2Cost() {
        let step2Cost = 0;
        
        // Стоимость грузчиков (если выбраны)
        const loaders = this.calculationData.step2.loaders || 0;
        let loadersCost = 0;
        if (loaders > 0) {
            // Базовая стоимость за грузчика - 500 рублей в час
            const loaderHourlyRate = 500;
            const durationHours = parseInt(document.getElementById('durationSelect')?.value) || 1;
            loadersCost = loaders * loaderHourlyRate * durationHours;
            step2Cost += loadersCost;
        }
        
        // Стоимость дополнительных услуг
        const additionalServicesCost = this.additionalServicesCost || 0;
        step2Cost += additionalServicesCost;
        
        // Стоимость выбранного транспорта
        let vehicleCost = 0;
        if (this.selectedVehicle) {
            const durationHours = parseInt(document.getElementById('durationSelect')?.value) || 1;
            vehicleCost = this.selectedVehicle.base_price + (this.selectedVehicle.price_per_hour * durationHours);
            step2Cost += vehicleCost;
        }
        
        const totalStep2Cost = Math.round(step2Cost);
        
        console.log('Step 2 Calculation:', {
            loaders,
            loadersCost,
            additionalServicesCost,
            selectedVehicle: this.selectedVehicle?.name,
            vehicleCost,
            totalStep2Cost
        });
        
        return totalStep2Cost;
    }
    
    // Метод для пересчета стоимости шага 2
    recalculateStep2Cost() {
        const step2Cost = this.calculateStep2Cost();
        
        // Обновляем данные
        this.calculationData.step2.total = step2Cost;
        
        // Если выбран транспорт, пересчитываем итоговую стоимость
        if (this.selectedVehicle) {
            this.calculateStep3();
        }
    }

    // Новый метод для расчета итоговой стоимости
    calculateFinalCost() {
        const step1Cost = this.calculationData.step1.total || 0;
        const step2Cost = this.calculateStep2Cost();
        const finalCost = Math.round(step1Cost + step2Cost);
        
        console.log('Final Cost Calculation:', {
            step1Cost,
            step2Cost,
            finalCost
        });
        
        return finalCost;
    }

    // Метод для обновления времени подачи с учетом выбранного времени
    updatePickupTime() {
        const pickupTimeInput = document.getElementById('pickupTime');
        const timeRadios = document.querySelectorAll('input[name="time"]');
        
        if (!pickupTimeInput) return;
        
        // Находим выбранное время подачи
        let selectedTimeMinutes = 60; // По умолчанию 1 час
        timeRadios.forEach((radio, index) => {
            if (radio.checked) {
                const timeValues = [60, 90, 120]; // минуты (1 час, 1.5 часа, 2 часа)
                selectedTimeMinutes = timeValues[index] || 60;
            }
        });
        
        // Получаем текущее время
        const now = new Date();
        
        // Добавляем выбранное время к текущему
        const newPickupTime = new Date(now.getTime() + (selectedTimeMinutes * 60 * 1000));
        
        // Форматируем для input datetime-local
        const year = newPickupTime.getFullYear();
        const month = String(newPickupTime.getMonth() + 1).padStart(2, '0');
        const day = String(newPickupTime.getDate()).padStart(2, '0');
        const hours = String(newPickupTime.getHours()).padStart(2, '0');
        const minutes = String(newPickupTime.getMinutes()).padStart(2, '0');
        const formattedTime = `${year}-${month}-${day}T${hours}:${minutes}`;
        
        // Обновляем значение поля
        pickupTimeInput.value = formattedTime;
        
        // Обновляем минимальное время (минимум 1 час от текущего времени)
        const updateMinDateTime = () => {
            const currentTime = new Date();
            const minTime = new Date(currentTime.getTime() + 3600000); // +1 час
            const year = minTime.getFullYear();
            const month = String(minTime.getMonth() + 1).padStart(2, '0');
            const day = String(minTime.getDate()).padStart(2, '0');
            const hours = String(minTime.getHours()).padStart(2, '0');
            const minutes = String(minTime.getMinutes()).padStart(2, '0');
            const minDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
            
            pickupTimeInput.min = minDateTime;
        };
        
        updateMinDateTime();
        
        // Обновляем pickup_time в сохраненных данных
        if (this.calculationData.step1) {
            this.calculationData.step1.pickup_time = formattedTime;
        }
        
        // Пересчитываем стоимость при изменении времени подачи
        if (this.calculationData.step1 && this.calculationData.step1.distance) {
            this.recalculateStep1Cost();
        }
    }
    
    async filterVehicles() {
        try {
            const passengers = this.calculationData.step2.passengers || 0;
            const loaders = this.calculationData.step2.loaders || 0;
            const height = document.getElementById('heightSelect')?.value;
            const length = document.getElementById('lengthSelect')?.value;
            const bodyType = document.getElementById('bodyTypeSelect')?.value || 'any';
            
            // Убеждаемся, что у нас есть транспорт для фильтрации
            if (!this.calculationData.step2.vehicles || this.calculationData.step2.vehicles.length === 0) {
                await this.loadAndDisplayVehicles();
                return;
            }
            
            // Фильтруем локально для лучшей производительности
            let filteredVehicles = this.calculationData.step2.vehicles || [];
            
            // Применяем фильтры
            if (passengers > 0 || loaders > 0) {
                filteredVehicles = filteredVehicles.filter(vehicle => {
                    const totalPeople = passengers + loaders;
                    const maxPeople = vehicle.max_passengers + vehicle.max_loaders;
                    return maxPeople >= totalPeople;
                });
            }
            
            if (height && height !== 'any') {
                const heightValue = parseFloat(height);
                filteredVehicles = filteredVehicles.filter(vehicle => 
                    vehicle.dimensions.height >= heightValue
                );
            }
            
            if (length && length !== 'any') {
                const lengthValue = parseFloat(length);
                filteredVehicles = filteredVehicles.filter(vehicle => 
                    vehicle.dimensions.length >= lengthValue
                );
            }
            
            if (bodyType && bodyType !== 'any') {
                filteredVehicles = filteredVehicles.filter(vehicle => 
                    vehicle.body_type === bodyType
                );
            }
            
            this.updateVehiclesDisplay(filteredVehicles);
            
            // Обновляем время последней активности и запускаем таймер
            this.lastUserActivity = Date.now();
            this.startAutoPriceUpdate();
            
        } catch (error) {
            console.error('Vehicle filtering error:', error);
            this.showError('Ошибка фильтрации транспорта');
        }
    }
    
    async calculateStep3() {
        try {
            if (!this.selectedVehicle || !this.calculationData.step1.total) {
                return;
            }
            
            // Используем новую систему расчета
            const routeCost = this.calculationData.step1.total; // Это уже стоимость маршрута
            const durationHours = parseInt(document.getElementById('durationSelect')?.value) || 1;
            
            // Расчет стоимости транспорта
            const vehicleCost = this.selectedVehicle.base_price + (this.selectedVehicle.price_per_hour * durationHours);
            
            // Расчет стоимости грузчиков
            const loadersCost = (this.calculationData.step2.loaders || 0) * 500 * durationHours;
            
            // [ИСПРАВЛЕНО] Стоимость дополнительных услуг - используем this.additionalServicesCost
            const additionalServicesCost = this.additionalServicesCost || 0;
            
            // Итоговая стоимость
            const finalCost = routeCost + vehicleCost + loadersCost + additionalServicesCost;
            
            // Создаем объект с детализацией для отображения
            const data = {
                breakdown: {
                    route_cost: routeCost,
                    vehicle_cost: vehicleCost,
                    loaders_cost: loadersCost,
                    additional_services_cost: additionalServicesCost,
                    total: finalCost
                },
                step1_result: this.calculationData.step1,
                selected_vehicle_id: this.selectedVehicle.id,
                loaders: this.calculationData.step2.loaders || 0,
                duration_hours: durationHours
            };
            
            this.calculationData.step3 = data;
            this.updateStep3Display(data);
            
        } catch (error) {
            console.error('Step3 calculation error:', error);
            this.showError('Ошибка расчета итоговой стоимости');
        }
    }
    
    selectPassengers(count) {
        this.calculationData.step2.passengers = count;
        
        // Обновляем UI
        document.querySelectorAll('.passenger-btn').forEach(btn => {
            btn.classList.remove('bg-primary', 'text-white');
        });
        
        const selectedBtn = document.querySelector(`.passenger-btn[data-value="${count}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('bg-primary', 'text-white');
        }
        
        this.filterVehicles();
        
        // Обновляем время последней активности и запускаем таймер
        this.lastUserActivity = Date.now();
        this.startAutoPriceUpdate();
    }
    
    selectLoaders(count) {
        this.calculationData.step2.loaders = count;
        
        // Обновляем UI
        document.querySelectorAll('.loader-btn').forEach(btn => {
            btn.classList.remove('bg-primary', 'text-white');
        });
        
        const selectedBtn = document.querySelector(`.loader-btn[data-value="${count}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('bg-primary', 'text-white');
        }
        
        // Пересчитываем стоимость при изменении количества грузчиков
        this.recalculateStep2Cost();
        
        this.filterVehicles();
        
        // Обновляем время последней активности и запускаем таймер
        this.lastUserActivity = Date.now();
        this.startAutoPriceUpdate();
    }
    
    selectVehicle(vehicleId) {
        this.selectedVehicle = this.calculationData.step2.vehicles.find(v => v.id === vehicleId);
        
        if (this.selectedVehicle) {
            // Обновляем UI
            document.querySelectorAll('.vehicle-card').forEach(card => {
                card.classList.remove('selected');
            });
            
            const selectedCard = document.querySelector(`.vehicle-card[data-vehicle-id="${vehicleId}"]`);
            if (selectedCard) {
                selectedCard.classList.add('selected');
            }
            
            // Пересчитываем стоимость при выборе транспорта
            this.recalculateStep2Cost();
            
            // Показываем третий шаг
            this.showStep3();
            this.calculateStep3();
            
            // Обновляем время последней активности и запускаем таймер
            this.lastUserActivity = Date.now();
            this.startAutoPriceUpdate();
        }
    }
    
    updateStep1Display(data) {
        const priceElement = document.getElementById('step1Price');
        const distanceElement = document.getElementById('step1Distance');
        const resultsBlock = document.getElementById('step1Results');
        const step3 = document.getElementById('step3');
        
        if (priceElement) {
            priceElement.textContent = `${Math.round(data.total)} ₽`;
        }
        
        if (distanceElement) {
            distanceElement.textContent = `${data.distance} км`;
        }
        
        // Показываем блок с результатами
        if (resultsBlock) {
            resultsBlock.classList.remove('hidden');
        }
        
        // Показываем шаг 3, если он еще не виден
        if (step3 && step3.classList.contains('hidden')) {
            step3.classList.remove('hidden');
            step3.classList.add('md:col-span-1');
        }
    }
    
    updateVehiclesDisplay(vehicles) {
        console.log('Updating vehicles display with:', vehicles.length, 'vehicles');
        
        const slidesContainer = document.getElementById('vehiclesSlides');
        const dotsContainer = document.getElementById('vehicleDots');
        const prevBtn = document.getElementById('vehiclePrev');
        const nextBtn = document.getElementById('vehicleNext');
        
        console.log('Slides container:', slidesContainer);
        console.log('Dots container:', dotsContainer);
        
        if (!slidesContainer) {
            console.error('Slides container not found!');
            return;
        }
        
        if (vehicles.length === 0) {
            console.log('No vehicles to display');
            slidesContainer.innerHTML = '<div class="min-w-full flex items-center justify-center"><p class="text-gray-600 dark:text-gray-300 text-center py-8">Подходящий транспорт не найден</p></div>';
            dotsContainer.innerHTML = '';
            return;
        }
        
        // Создаем слайды для карусели
        const vehiclesHtml = vehicles.map(vehicle => `
            <div class="vehicle-slide min-w-full px-2">
                <div class="vehicle-card border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-primary transition-colors bg-white shadow-sm" 
                 data-vehicle-id="${vehicle.id}">
                    <div class="flex items-start space-x-4">
                        <!-- Миниатюра транспорта -->
                        <div class="flex-shrink-0">
                            <div class="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                                <i class="ri-truck-line text-2xl text-gray-400"></i>
                        </div>
                    </div>
                        
                        <!-- Информация о транспорте -->
                        <div class="flex-1 min-w-0">
                            <h4 class="font-bold text-gray-800 text-sm mb-1">${vehicle.name}</h4>
                            
                            <!-- Краткая информация -->
                            <div class="space-y-1 text-xs text-gray-600 dark:text-gray-300 mb-2">
                                <div class="flex items-center">
                                    <i class="ri-user-line mr-1"></i>
                                    <span>${vehicle.max_passengers + vehicle.max_loaders} чел.</span>
                    </div>
                                <div class="flex items-center">
                                    <i class="ri-ruler-2-line mr-1"></i>
                                    <span>Высота: ${vehicle.dimensions.height}м</span>
                                </div>
                                <div class="flex items-center">
                                    <i class="ri-ruler-line mr-1"></i>
                                    <span>Длина: ${vehicle.dimensions.length}м</span>
                                </div>
                                <div class="flex items-center">
                                    <i class="ri-money-dollar-circle-line mr-1"></i>
                                    <span class="font-bold text-primary">${vehicle.base_price} ₽</span>
                                </div>
                                <div class="flex items-center">
                                    <i class="ri-time-line mr-1"></i>
                                    <span class="text-xs text-gray-600 dark:text-gray-300">+ ${vehicle.price_per_hour} ₽/час</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        slidesContainer.innerHTML = vehiclesHtml;
        
        // Создаем индикаторы
        const dotsHtml = vehicles.map((_, index) => `
            <button class="vehicle-dot w-2 h-2 rounded-full bg-gray-300 transition-all" data-index="${index}"></button>
        `).join('');
        
        dotsContainer.innerHTML = dotsHtml;
        
        // Инициализируем карусель
        this.initVehicleCarousel();
        // [НОВОЕ] Автоматически выбираем первый транспорт, если есть
        if (vehicles.length > 0) {
            this.selectVehicle(vehicles[0].id);
        }
    }
    
    updateStep3Display(data) {
        const breakdown = data.breakdown;
        
        // Обновляем детализацию
        const routeCostElement = document.getElementById('routeCost');
        const vehicleCostElement = document.getElementById('vehicleCost');
        const loadersCostElement = document.getElementById('loadersCost');
        const additionalServicesCostElement = document.getElementById('additionalServicesCost');
        const additionalServicesCostRow = document.getElementById('additionalServicesCostRow');
        const additionalServicesSeparator = document.getElementById('additionalServicesSeparator');
        const loadersSeparator = document.getElementById('loadersSeparator');
        const totalElement = document.getElementById('totalCost');
        
        if (routeCostElement) routeCostElement.textContent = `${Math.round(breakdown.route_cost)} ₽`;
        if (vehicleCostElement) vehicleCostElement.textContent = `${Math.round(breakdown.vehicle_cost)} ₽`;
        if (loadersCostElement) loadersCostElement.textContent = `${Math.round(breakdown.loaders_cost)} ₽`;
        
        // Обновляем дополнительные услуги
        if (additionalServicesCostElement) {
            additionalServicesCostElement.textContent = `${Math.round(breakdown.additional_services_cost)} ₽`;
        }
        
        // Показываем/скрываем дополнительные услуги и их разделители
        if (additionalServicesCostRow && additionalServicesSeparator) {
            if (breakdown.additional_services_cost > 0) {
                additionalServicesCostRow.style.display = 'flex';
                additionalServicesSeparator.style.display = 'block';
            } else {
                additionalServicesCostRow.style.display = 'none';
                additionalServicesSeparator.style.display = 'none';
            }
        }
        
        // Показываем/скрываем разделитель грузчиков
        if (loadersSeparator) {
            if (breakdown.loaders_cost > 0) {
                loadersSeparator.style.display = 'block';
            } else {
                loadersSeparator.style.display = 'none';
            }
        }
        
        // Обновляем итоговую стоимость
        if (totalElement) totalElement.textContent = `${Math.round(breakdown.total)} ₽`;
    }
    
    initVehicleCarousel() {
        const slidesContainer = document.getElementById('vehiclesSlides');
        const dots = document.querySelectorAll('.vehicle-dot');
        const prevBtn = document.getElementById('vehiclePrev');
        const nextBtn = document.getElementById('vehicleNext');
        
        if (!slidesContainer || dots.length === 0) return;
        
        let currentIndex = 0;
        const slideCount = dots.length;
        
        const updateCarousel = () => {
            slidesContainer.style.transform = `translateX(-${currentIndex * 100}%)`;
            
            // Обновляем индикаторы
            dots.forEach((dot, index) => {
                if (index === currentIndex) {
                    dot.style.backgroundColor = '#d46a00'; // primary color
                    dot.style.width = '8px';
                    dot.style.borderRadius = '4px';
                } else {
                    dot.style.backgroundColor = '#d1d5db'; // gray-300
                    dot.style.width = '8px';
                    dot.style.borderRadius = '50%';
                }
            });
            
            // [НОВОЕ] Автоматически выбираем транспорт, который сейчас отображается
            const vehicleCards = document.querySelectorAll('.vehicle-card');
            if (vehicleCards[currentIndex]) {
                const vehicleId = parseInt(vehicleCards[currentIndex].getAttribute('data-vehicle-id'));
                if (vehicleId) {
                    this.selectVehicle(vehicleId);
                }
            }
        };
        
        // Обработчики для точек
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                currentIndex = index;
                updateCarousel();
            });
        });
        
        // Обработчики для кнопок навигации
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                currentIndex = (currentIndex - 1 + slideCount) % slideCount;
                updateCarousel();
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                currentIndex = (currentIndex + 1) % slideCount;
                updateCarousel();
            });
        }
        
        // Инициализация
        updateCarousel();
    }
    
    showStep1() {
        console.log('Showing step 1');
        document.getElementById('step1').classList.remove('hidden');
        document.getElementById('step2').classList.add('hidden');
        document.getElementById('step3').classList.add('hidden');
        this.currentStep = 1;
        this.updateStepDisplay();
        this.updateRouteCostDisplay();
    }
    
    showStep2() {
        console.log('Showing step 2...');
        const step2 = document.getElementById('step2');
        const newsCarousel = document.getElementById('newsCarousel');
        
        console.log('Step2 element:', step2);
        console.log('News carousel element:', newsCarousel);
        
        if (step2 && newsCarousel) {
            // Не скрываем newsCarousel здесь, так как это делается в main.js
            // newsCarousel.classList.add('hidden');
            step2.classList.remove('hidden');
            step2.classList.add('md:col-span-1');
            
            console.log('Step 2 shown, loading vehicles...');
            // Загружаем и отображаем все доступные ТС при показе второго шага
            this.loadAndDisplayVehicles();
        } else {
            console.error('Step2 or newsCarousel elements not found!');
        }
    }
    
    showStep3() {
        console.log('Showing step 3...');
        const step3 = document.getElementById('step3');
        
        if (step3) {
            step3.classList.remove('hidden');
            step3.classList.add('md:col-span-1');
            console.log('Step 3 shown');
        } else {
            console.error('Step3 element not found!');
        }
    }
    
    bindAdditionalServicesEvents() {
        const additionalServicesBtn = document.getElementById('additionalServicesBtn');
        const additionalServicesContent = document.getElementById('additionalServicesContent');
        const additionalServicesIcon = document.getElementById('additionalServicesIcon');
        
        if (additionalServicesBtn && additionalServicesContent) {
            additionalServicesBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleAdditionalServices(additionalServicesContent, additionalServicesIcon);
            });
        }
        
        // Обработка чекбоксов дополнительных услуг
        const driverDataCheckbox = document.getElementById('driverDataService');
        const insuranceCheckbox = document.getElementById('insuranceService');
        
        if (driverDataCheckbox) {
            driverDataCheckbox.addEventListener('change', () => {
                this.updateAdditionalServicesCost();
            });
        }
        
        if (insuranceCheckbox) {
            insuranceCheckbox.addEventListener('change', () => {
                this.updateAdditionalServicesCost();
            });
        }
    }
    
    bindOrderNotesEvents() {
        const orderNotesBtn = document.getElementById('orderNotesBtn');
        const orderNotesContent = document.getElementById('orderNotesContent');
        const orderNotesIcon = document.getElementById('orderNotesIcon');
        const orderNotesTextarea = document.getElementById('orderNotes');
        
        if (orderNotesBtn && orderNotesContent) {
            orderNotesBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleOrderNotes(orderNotesContent, orderNotesIcon);
            });
        }
        
        // Добавляем обработчик для textarea примечаний
        if (orderNotesTextarea) {
            orderNotesTextarea.addEventListener('input', () => {
                // Обновляем время последней активности и запускаем таймер
                this.lastUserActivity = Date.now();
                this.startAutoPriceUpdate();
            });
        }
    }
    
    toggleOrderNotes(content, icon) {
        const isHidden = content.classList.contains('hidden');
        
        if (isHidden) {
            // Показываем контент
            content.classList.remove('hidden');
            content.style.maxHeight = '0';
            content.style.overflow = 'hidden';
            
            // Плавная анимация
            setTimeout(() => {
                content.style.transition = 'max-height 0.3s ease-in-out';
                content.style.maxHeight = content.scrollHeight + 'px';
            }, 10);
            
            // Меняем иконку
            icon.className = 'ri-remove-circle-line mr-2 transition-transform hover:scale-125';
        } else {
            // Скрываем контент
            content.style.maxHeight = '0';
            
            setTimeout(() => {
                content.classList.add('hidden');
                content.style.transition = '';
                content.style.maxHeight = '';
            }, 300);
            
            // Меняем иконку
            icon.className = 'ri-add-circle-line mr-2 transition-transform hover:scale-125';
        }
    }
    
    toggleAdditionalServices(content, icon) {
        const isHidden = content.classList.contains('hidden');
        
        if (isHidden) {
            // Показываем контент
            content.classList.remove('hidden');
            content.style.maxHeight = '0';
            content.style.overflow = 'hidden';
            
            // Плавная анимация
            setTimeout(() => {
                content.style.transition = 'max-height 0.3s ease-in-out';
                content.style.maxHeight = content.scrollHeight + 'px';
            }, 10);
            
            // Меняем иконку
            icon.className = 'ri-remove-circle-line mr-2 transition-transform hover:scale-125';
        } else {
            // Скрываем контент
            content.style.maxHeight = '0';
            
            setTimeout(() => {
                content.classList.add('hidden');
                content.style.transition = '';
                content.style.maxHeight = '';
            }, 300);
            
            // Меняем иконку
            icon.className = 'ri-add-circle-line mr-2 transition-transform hover:scale-125';
        }
    }
    
    updateAdditionalServicesCost() {
        const driverDataCheckbox = document.getElementById('driverDataService');
        const insuranceCheckbox = document.getElementById('insuranceService');
        
        let totalAdditionalCost = 0;
        
        if (driverDataCheckbox && driverDataCheckbox.checked) {
            totalAdditionalCost += 500;
        }
        
        if (insuranceCheckbox && insuranceCheckbox.checked) {
            totalAdditionalCost += 700;
        }
        
        // Сохраняем стоимость дополнительных услуг
        this.additionalServicesCost = totalAdditionalCost;
        
        // Пересчитываем стоимость шага 2
        this.recalculateStep2Cost();
        
        // Обновляем время последней активности и запускаем таймер
        this.lastUserActivity = Date.now();
        this.startAutoPriceUpdate();
    }
    
    async checkRateLimitStatus() {
        try {
            const response = await this.makeRequest(`${this.baseUrl}/calculator/rate-limit-status`, 'GET');
            if (response.success) {
                this.rateLimitInfo = response.data;
            }
        } catch (error) {
            console.error('Rate limit check error:', error);
        }
    }
    
    async loadVehicles() {
        try {
            const response = await this.makeRequest(`${this.baseUrl}/vehicles`, 'GET');
            if (response.success) {
                this.availableVehicles = response.data.vehicles;
            }
        } catch (error) {
            console.error('Vehicles loading error:', error);
        }
    }
    
    async loadAndDisplayVehicles() {
        try {
            console.log('Loading and displaying vehicles...');
            
            // Если транспорт уже загружен, используем его
            if (this.calculationData.step2.vehicles && this.calculationData.step2.vehicles.length > 0) {
                console.log('Using cached vehicles:', this.calculationData.step2.vehicles.length);
                this.updateVehiclesDisplay(this.calculationData.step2.vehicles);
                return;
            }
            
            // Иначе загружаем с сервера
            console.log('Fetching vehicles from server...');
            const response = await this.makeRequest(`${this.baseUrl}/vehicles`, 'GET');
            console.log('Server response:', response);
            
            if (response.success) {
                this.calculationData.step2.vehicles = response.data.vehicles;
                console.log('Vehicles loaded:', response.data.vehicles.length);
                this.updateVehiclesDisplay(response.data.vehicles);
            } else {
                console.error('Failed to load vehicles:', response.error);
            }
        } catch (error) {
            console.error('Vehicles loading error:', error);
        }
    }
    
    async makeRequest(url, method, data = null) {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            }
        };
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        const result = await response.json();
        
        // Проверяем rate limit
        if (response.status === 429) {
            this.showError(`Превышен лимит запросов. Попробуйте через ${result.retry_after} секунд.`);
            return { success: false, error: 'Rate limit exceeded' };
        }
        
        // Проверяем другие ошибки HTTP
        if (!response.ok) {
            const errorMessage = result.error || `HTTP ${response.status}: ${response.statusText}`;
            console.error('HTTP Error:', response.status, result);
            return { success: false, error: errorMessage };
        }
        
        return result;
    }
    
    showError(message) {
        // Создаем уведомление об ошибке
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
    
    nextStep() {
        if (this.currentStep < 3) {
            this.currentStep++;
            this.updateStepDisplay();
        }
    }
    
    prevStep() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStepDisplay();
        }
    }
    
    updateStepDisplay() {
        // Обновляем отображение шагов
        document.querySelectorAll('.step-indicator').forEach((indicator, index) => {
            if (index + 1 <= this.currentStep) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        });
    }
    
    async submitOrder() {
        try {
            // Останавливаем автоматическое обновление цены при отправке заказа
            this.stopAutoPriceUpdate();
            
            const name = document.getElementById('customerName')?.value;
            const phone = document.getElementById('customerPhone')?.value;
            const orderNotes = document.getElementById('orderNotes')?.value || '';
            
            if (!name || !phone) {
                this.showError('Пожалуйста, заполните все обязательные поля');
                return;
            }
            
            if (!this.selectedVehicle) {
                this.showError('Пожалуйста, выберите транспорт');
                return;
            }
            
            // Проверяем, что у нас есть все необходимые данные для заявки
            if (!this.calculationData.step1 || !this.calculationData.step2 || !this.calculationData.step3) {
                this.showError('Пожалуйста, заполните все шаги калькулятора');
                return;
            }
            
            // Показываем индикатор загрузки
            const submitBtn = document.querySelector('#step3 button[class*="bg-primary"]');
            const originalText = submitBtn?.textContent;
            if (submitBtn) {
                submitBtn.textContent = 'Отправка...';
                submitBtn.disabled = true;
            }
            
            // Формируем данные заявки в новом формате (без calculation_result)
            const orderData = {
                customer_name: name,
                customer_phone: phone,
                order_notes: orderNotes,
                payment_method: 'online', // По умолчанию онлайн оплата
                from_address: this.calculationData.step1.from_address || '',
                to_address: this.calculationData.step1.to_address || '',
                pickup_time: this.calculationData.step1.pickup_time || '',
                duration_hours: this.calculationData.step1.duration_hours || 1,
                urgent_pickup: this.calculationData.step1.urgent_pickup || false,
                distance: this.calculationData.step1.distance || null,  // [НОВОЕ] Добавляем расстояние
                passengers: this.calculationData.step2.passengers || 0,
                loaders: this.calculationData.step2.loaders || 0,
                height: this.calculationData.step2.height || null,
                length: this.calculationData.step2.length || null,
                body_type: this.calculationData.step2.body_type || 'any',
                selected_vehicle_id: this.selectedVehicle.id,
                // [НОВОЕ] Добавляем стоимость дополнительных услуг
                additional_services_cost: this.additionalServicesCost || 0
            };
            
            // Отправляем заявку на сервер
            const response = await this.makeRequest('/api/v2/orders', 'POST', orderData);
            
            if (response.success) {
                // Показываем успешное сообщение
                showNotification('Заявка успешно отправлена! Мы свяжемся с вами в ближайшее время.', 'success');
                
                // Обновляем цену от backend если она есть
                if (response.calculated_total) {
                    this.updateBackendPrice(response.calculated_total);
                }
                
                // НЕ очищаем форму и НЕ переключаемся на первый шаг
                // Оставляем пользователя на текущем шаге с актуальной ценой
                
            } else {
                console.error('Order submission failed:', response);
                this.showError(response.error || 'Ошибка отправки заявки');
            }
            
        } catch (error) {
            console.error('Order submission error:', error);
            this.showError('Ошибка оформления заказа');
        } finally {
            // Восстанавливаем кнопку
            const submitBtn = document.querySelector('#step3 button[class*="bg-primary"]');
            if (submitBtn) {
                submitBtn.textContent = 'Оформить сейчас';
                submitBtn.disabled = false;
            }
        }
    }
    
    resetCalculator() {
        // Останавливаем автоматическое обновление цены
        this.stopAutoPriceUpdate();
        
        // Очищаем все поля формы
        const inputs = document.querySelectorAll('#step1 input, #step3 input');
        inputs.forEach(input => {
            if (input.type !== 'radio') {
                input.value = '';
            }
        });
        
        // Очищаем поле "Примечания к заказу"
        const orderNotes = document.getElementById('orderNotes');
        if (orderNotes) {
            orderNotes.value = '';
        }
        
        // Скрываем поле "Примечания к заказу"
        const orderNotesContent = document.getElementById('orderNotesContent');
        const orderNotesIcon = document.getElementById('orderNotesIcon');
        if (orderNotesContent && orderNotesIcon) {
            orderNotesContent.classList.add('hidden');
            orderNotesContent.style.transition = '';
            orderNotesContent.style.maxHeight = '';
            orderNotesIcon.className = 'ri-add-circle-line mr-2 transition-transform hover:scale-125';
        }
        
        // Сбрасываем выбранные значения
        this.selectedVehicle = null;
        this.calculationData = {
            step1: {},
            step2: {},
            step3: {}
        };
        
        // Сбрасываем кнопки пассажиров и грузчиков
        document.querySelectorAll('.passenger-btn, .loader-btn').forEach(btn => {
            btn.classList.remove('bg-primary', 'text-white');
        });
        
        // Сбрасываем радиокнопки
        document.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.checked = false;
            const indicator = radio.nextElementSibling?.querySelector('span');
            if (indicator) {
                indicator.classList.remove('bg-primary');
                indicator.classList.add('bg-transparent');
            }
        });
        
        // Устанавливаем первую радиокнопку как активную
        const firstRadio = document.querySelector('input[type="radio"]');
        if (firstRadio) {
            firstRadio.checked = true;
            const indicator = firstRadio.nextElementSibling?.querySelector('span');
            if (indicator) {
                indicator.classList.remove('bg-transparent');
                indicator.classList.add('bg-primary');
            }
        }
        
        // Очищаем отображение стоимости
        this.updateRouteCostDisplay();
        this.updateStep3Display({ total_cost: 0, breakdown: {} });
    }
    
    // Функция для обновления цены от backend
    updateBackendPrice(backendPrice) {
        console.log('Обновляем цену от backend:', backendPrice);
        
        // Проверяем, изменилась ли цена
        const currentPrice = this.calculationData.step3?.breakdown?.total || 0;
        const backendTotal = backendPrice.breakdown?.total || 0;
        const priceChanged = Math.abs(currentPrice - backendTotal) > 0.01; // Учитываем небольшие различия в округлении
        
        console.log('Сравнение цен:', { currentPrice, backendTotal, priceChanged });
        
        // Обновляем данные калькулятора с новыми ценами от backend
        if (this.calculationData.step3 && backendPrice.breakdown) {
            // Обновляем breakdown с данными от backend
            this.calculationData.step3.breakdown = backendPrice.breakdown;
            
            // Обновляем отображение с новыми данными
            this.updateStep3Display({
                breakdown: backendPrice.breakdown
            });
            
            console.log('Данные обновлены с backend:', backendPrice.breakdown);
        }
        
        // Показываем уведомление только если цена действительно изменилась
        if (priceChanged) {
            showNotification('Цена обновлена с сервера для обеспечения точности', 'info');
        }
    }
    
    // Функция для отправки данных на backend для пересчета цены
    async recalculatePriceFromBackend() {
        try {
            // Проверяем, что у нас есть минимальные данные для расчета
            if (!this.calculationData.step1 || !this.calculationData.step1.from_address || !this.calculationData.step1.to_address) {
                return;
            }
            
            // Получаем актуальное значение duration_hours из DOM
            const currentDurationHours = parseInt(document.getElementById('durationSelect')?.value) || 1;
            
            // Формируем данные для отправки на backend
            const calculationData = {
                from_address: this.calculationData.step1.from_address || '',
                to_address: this.calculationData.step1.to_address || '',
                pickup_time: this.calculationData.step1.pickup_time || '',
                duration_hours: currentDurationHours, // Используем актуальное значение из DOM
                urgent_pickup: this.calculationData.step1.urgent_pickup || false,
                distance: this.calculationData.step1.distance || null,
                additional_services_cost: this.additionalServicesCost || 0,
                passengers: this.calculationData.step2?.passengers || 0,
                loaders: this.calculationData.step2?.loaders || 0,
                height: this.calculationData.step2?.height || null,
                length: this.calculationData.step2?.length || null,
                body_type: this.calculationData.step2?.body_type || 'any',
                selected_vehicle_id: this.selectedVehicle?.id || null
            };
            
            console.log('Отправляем данные на backend для пересчета:', calculationData);
            console.log('Актуальное значение duration_hours из DOM:', currentDurationHours);
            console.log('Сохраненное значение duration_hours:', this.calculationData.step1.duration_hours);
            
            // Отправляем запрос на backend для пересчета
            const response = await this.makeRequest('/api/v2/calculate-price', 'POST', calculationData);
            
            console.log('Ответ от backend:', response);
            
            if (response.success && response.breakdown) {
                // Обновляем с полными данными от backend
                this.updateBackendPrice({
                    breakdown: response.breakdown
                });
            }
            
        } catch (error) {
            console.error('Ошибка при пересчете цены от backend:', error);
        }
    }
    
    // Функция для запуска автоматического обновления цены с debounce-логикой
    startAutoPriceUpdate() {
        // Останавливаем предыдущий debounce-таймер если он есть
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        // Запускаем новый debounce-таймер - сработает только один раз через 3 секунды после последней активности
        this.debounceTimer = setTimeout(() => {
            // Проверяем, что у нас есть все необходимые данные для расчета
            if (this.calculationData.step1 && 
                this.calculationData.step1.from_address && 
                this.calculationData.step1.to_address &&
                this.calculationData.step1.pickup_time) {
                
                this.recalculatePriceFromBackend();
            }
            
            // Очищаем таймер после выполнения
            this.debounceTimer = null;
        }, 3000); // 3 секунды дебаунса
    }
    
    // Функция для остановки автоматического обновления цены
    stopAutoPriceUpdate() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
    }
}

// MapIntegration класс теперь находится в отдельном файле map-integration.js

// AddressAutocomplete класс больше не используется - используется Leaflet карта

// Функционал для дополнительных кнопок
function initializeAdditionalFeatures() {
    // Функционал кнопки "добавить адрес"
    const addAddressBtn = document.getElementById('addAddressBtn');
    const additionalAddressesContainer = document.getElementById('additionalAddresses');
    let addressCount = 0;
    const maxAddresses = 3;
    
    if (addAddressBtn && additionalAddressesContainer) {
        addAddressBtn.addEventListener('click', function() {
            if (addressCount < maxAddresses) {
                addAddressField();
                addressCount++;
                
                // Скрываем кнопку, если достигнут лимит
                if (addressCount >= maxAddresses) {
                    addAddressBtn.style.display = 'none';
                }
            }
        });
    }
    
    function addAddressField() {
        const addressField = document.createElement('div');
        addressField.className = 'additional-address-field';
        const fieldId = `additionalAddress${addressCount + 1}`;
        const suggestionsId = `additionalAddress${addressCount + 1}Suggestions`;
        
        addressField.innerHTML = `
            <div class="flex items-center space-x-2">
                <div class="flex-1">
                    <label class="block text-sm text-gray-600 mb-1">Дополнительный адрес ${addressCount + 1}</label>
                    <div class="relative">
                        <input
                            id="${fieldId}"
                            type="text"
                            placeholder="Укажите адрес"
                            class="w-full px-4 py-2 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                            autocomplete="off"
                        />
                        <button
                            class="map-open-btn absolute right-2 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 transition-transform hover:scale-125"
                            data-input-id="${fieldId}"
                        >
                            <i class="ri-map-pin-line"></i>
                        </button>
                        <div id="${suggestionsId}" class="address-suggestions absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-b-lg shadow-lg z-50 max-h-60 overflow-y-auto hidden"></div>
                    </div>
                </div>
                <button class="remove-address-btn text-red-500 hover:text-red-700 transition-colors mt-6" title="Удалить адрес">
                    <i class="ri-delete-bin-line text-lg"></i>
                </button>
            </div>
        `;
        
        // Добавляем обработчик для кнопки удаления
        const removeBtn = addressField.querySelector('.remove-address-btn');
        removeBtn.addEventListener('click', function() {
            addressField.remove();
            addressCount--;
            
            // Показываем кнопку "добавить адрес" снова
            if (addAddressBtn) {
                addAddressBtn.style.display = 'flex';
            }
            
            // Обновляем нумерацию оставшихся полей
            updateAddressNumbers();
            
            // Триггерим пересчет маршрута при удалении адреса
            if (window.calculator) {
                window.calculator.calculateStep1();
            }
        });
        
        additionalAddressesContainer.appendChild(addressField);
        
        // Инициализируем автозаполнение для нового поля
        const newInput = addressField.querySelector('input');
        if (newInput && window.addressAutocomplete) {
            window.addressAutocomplete.bindInput(newInput);
        }
        
        // Привязываем события к новой кнопке карты
        if (window.mapIntegration) {
            window.mapIntegration.bindMapButtons();
        }
        
        // Триггерим пересчет маршрута при добавлении нового адреса
        if (window.calculator) {
            window.calculator.calculateStep1();
        }
    }
    
    function updateAddressNumbers() {
        const addressFields = additionalAddressesContainer.querySelectorAll('.additional-address-field');
        addressFields.forEach((field, index) => {
            const label = field.querySelector('label');
            const input = field.querySelector('input');
            const suggestions = field.querySelector('.address-suggestions');
            const mapButton = field.querySelector('.map-open-btn');
            
            if (label) {
                label.textContent = `Дополнительный адрес ${index + 1}`;
            }
            
            // Обновляем ID поля и контейнера подсказок
            if (input) {
                const newId = `additionalAddress${index + 1}`;
                input.id = newId;
            }
            
            if (suggestions) {
                const newSuggestionsId = `additionalAddress${index + 1}Suggestions`;
                suggestions.id = newSuggestionsId;
            }
            
            // Обновляем data-input-id для кнопки карты
            if (mapButton && input) {
                mapButton.setAttribute('data-input-id', input.id);
            }
        });
    }
    
    // Удаляем старый функционал модального окна "примечания к заказу"
    // Новый функционал реализован в классе CalculatorV2
}

// Функция для показа уведомлений
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full`;
    
    // Настройка стилей в зависимости от типа уведомления
    if (type === 'success') {
        notification.className += ' bg-green-500 text-white';
    } else if (type === 'error') {
        notification.className += ' bg-red-500 text-white';
    } else {
        notification.className += ' bg-blue-500 text-white';
    }
    
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // Автоматическое удаление через 3 секунды
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Инициализация калькулятора при загрузке страницы
document.addEventListener("DOMContentLoaded", function() {
    console.log('DOMContentLoaded event fired');
    
    // Инициализируем основной калькулятор
    console.log('Creating CalculatorV2 instance...');
    window.calculator = new CalculatorV2();
    console.log('CalculatorV2 instance created:', window.calculator);
    
    // Проверяем, что калькулятор создан правильно
    if (window.calculator) {
        console.log('Calculator initialized successfully');
        console.log('Calculator methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.calculator)));
    } else {
        console.error('Failed to create calculator instance');
    }
    
    // Инициализируем дополнительные функции
    initializeAdditionalFeatures();
    
    // Инициализация автодополнения адресов отключена - используется Leaflet карта
    console.log('Address autocomplete disabled - using Leaflet map instead');
}); 