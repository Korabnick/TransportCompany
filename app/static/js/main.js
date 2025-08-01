// Обработка радиокнопок
document.addEventListener("DOMContentLoaded", function () {
  const radioButtons = document.querySelectorAll(
    'input[type="radio"][name="time"], input[type="radio"][name="payment"]',
  );
  
  radioButtons.forEach((radio) => {
    radio.addEventListener("change", function () {
      const name = this.getAttribute("name");
      const radios = document.querySelectorAll(
        `input[type="radio"][name="${name}"]`,
      );
      
      radios.forEach((rb) => {
        const indicator = rb.nextElementSibling.querySelector("span");
        indicator.classList.remove("bg-primary");
        indicator.classList.add("bg-transparent");
      });
      
      if (this.checked) {
        const indicator = this.nextElementSibling.querySelector("span");
        indicator.classList.remove("bg-transparent");
        indicator.classList.add("bg-primary");
      }
    });
  });
});

// Обработка кнопок пассажиров/грузчиков
document.addEventListener("DOMContentLoaded", function() {
  const passengerBtns = document.querySelectorAll('.passenger-btn');
  passengerBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      passengerBtns.forEach(b => b.classList.remove('bg-primary', 'text-white'));
      this.classList.add('bg-primary', 'text-white');
    });
  });

  const loaderBtns = document.querySelectorAll('.loader-btn');
  loaderBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      loaderBtns.forEach(b => b.classList.remove('bg-primary', 'text-white'));
      this.classList.add('bg-primary', 'text-white');
    });
  });
});

// Карусель новостей
document.addEventListener("DOMContentLoaded", function() {
  const carousel = document.querySelector('.carousel-slides');
  const dots = document.querySelectorAll('.carousel-dot');
  const prevBtn = document.querySelector('.carousel-prev');
  const nextBtn = document.querySelector('.carousel-next');
  let currentIndex = 0;
  const slideCount = document.querySelectorAll('.carousel-slide').length;

  function updateCarousel() {
    carousel.style.transform = `translateX(-${currentIndex * 100}%)`;
    dots.forEach((dot, index) => {
      if (index === currentIndex) {
        dot.style.backgroundColor = 'white';
        dot.style.width = '8px';
        dot.style.borderRadius = '4px';
      } else {
        dot.style.backgroundColor = '';
        dot.style.width = '';
        dot.style.borderRadius = '';
      }
    });
  }

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      currentIndex = parseInt(dot.dataset.index);
      updateCarousel();
    });
  });

  prevBtn.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + slideCount) % slideCount;
    updateCarousel();
  });

  nextBtn.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % slideCount;
    updateCarousel();
  });

  // Автопрокрутка
  setInterval(() => {
    currentIndex = (currentIndex + 1) % slideCount;
    updateCarousel();
  }, 5000);
});

// Показываем шаги калькулятора при вводе
document.addEventListener("DOMContentLoaded", function() {
  const step1Inputs = document.querySelectorAll('#step1 input');
  const newsCarousel = document.getElementById('newsCarousel');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');

  step1Inputs.forEach(input => {
    input.addEventListener('input', function() {
      if (this.value.trim() !== '') {
        newsCarousel.classList.add('hidden');
        step2.classList.remove('hidden');
        step3.classList.remove('hidden');
        step2.classList.add('md:col-span-1');
        step3.classList.add('md:col-span-1');
        
        // Вызываем метод калькулятора для загрузки транспорта
        if (window.calculatorV2) {
          window.calculatorV2.showStep2();
        }
      } else {
        const allEmpty = Array.from(step1Inputs).every(i => i.value.trim() === '');
        if (allEmpty) {
          newsCarousel.classList.remove('hidden');
          step2.classList.add('hidden');
          step3.classList.add('hidden');
          step2.classList.remove('md:col-span-1');
          step3.classList.remove('md:col-span-1');
        }
      }
    });
  });
});

// Переключение темы
document.addEventListener("DOMContentLoaded", function () {
  const themeToggle = document.getElementById("themeToggle");
  const html = document.documentElement;
  
  // Проверка системных настроек
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  
  // Установка начальной темы
  if (prefersDarkScheme.matches) {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
  
  // Обработка сохраненной темы
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    html.classList.add('dark');
  } else if (savedTheme === 'light') {
    html.classList.remove('dark');
  }
  
  // Переключение темы
  themeToggle.addEventListener("click", function() {
    html.classList.toggle("dark");
    localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
  });
});

// Развертывание текста
function toggleText() {
  const textElement = document.getElementById('expandableText');
  const fadeElement = document.getElementById('fadeOverlay');
  const iconElement = document.getElementById('expandIcon');
  
  if (textElement.classList.contains('max-h-[4.5em]')) {
    textElement.classList.remove('max-h-[4.5em]');
    textElement.classList.add('max-h-[1000px]');
    fadeElement.classList.add('hidden');
    iconElement.className = 'ri-arrow-up-s-line text-gray-600';
  } else {
    textElement.classList.remove('max-h-[1000px]');
    textElement.classList.add('max-h-[4.5em]');
    fadeElement.classList.remove('hidden');
    iconElement.className = 'ri-arrow-down-s-line text-gray-600';
  }
}

// Переключение между калькулятором и галереей работ
document.addEventListener("DOMContentLoaded", function() {
  const calculatorContainer = document.getElementById('calculatorContainer');
  const worksGallery = document.getElementById('worksGallery');
  const calculatorTab = document.querySelector('.calculator-tab');
  const worksTab = document.querySelector('.works-tab');
  
  function switchTab(tab) {
    calculatorTab.classList.remove('active-tab');
    worksTab.classList.remove('active-tab');
    tab.classList.add('active-tab');
    
    if (tab === calculatorTab) {
      calculatorContainer.classList.remove('hidden');
      worksGallery.classList.add('hidden');
    } else {
      calculatorContainer.classList.add('hidden');
      worksGallery.classList.remove('hidden');
    }
  }
  
  calculatorTab.addEventListener('click', function(e) {
    e.preventDefault();
    switchTab(this);
  });
  
  worksTab.addEventListener('click', function(e) {
    e.preventDefault();
    switchTab(this);
  });
});

// === Новый калькулятор v2.0 ===

/**
 * Оптимизированный калькулятор v2.0
 * Поддерживает кэширование, rate limiting и защиту от спама
 */

class CalculatorV2 {
    constructor() {
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
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.checkRateLimitStatus();
        this.loadVehicles();
    }
    
    bindEvents() {
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
        // Обработка изменения адресов
        const fromInput = document.getElementById('fromAddress');
        const toInput = document.getElementById('toAddress');
        const durationSelect = document.getElementById('durationSelect');
        const pickupTimeInput = document.getElementById('pickupTime');
        const urgentCheckbox = document.getElementById('urgentPickup');
        
        if (fromInput && toInput) {
            // Debounce для предотвращения спама
            let timeout;
            const debouncedCalculation = () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.calculateStep1();
                }, 500);
            };
            
            [fromInput, toInput].forEach(input => {
                input.addEventListener('input', debouncedCalculation);
            });
        }
        
        if (durationSelect) {
            durationSelect.addEventListener('change', () => {
                this.calculateStep1();
            });
        }
        
        if (pickupTimeInput) {
            // Установка минимальной даты как текущей
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const minDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
            
            pickupTimeInput.min = minDateTime;
            
            // Установка текущего времени как значения по умолчанию
            pickupTimeInput.value = minDateTime;
            
            pickupTimeInput.addEventListener('change', () => {
                this.calculateStep1();
            });
            
            // Обработка ввода времени
            pickupTimeInput.addEventListener('input', () => {
                this.calculateStep1();
            });
        }
        
        if (urgentCheckbox) {
            urgentCheckbox.addEventListener('change', () => {
                this.calculateStep1();
            });
        }
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
    }
    
    async calculateStep1() {
        try {
            const fromAddress = document.getElementById('fromAddress')?.value || '';
            const toAddress = document.getElementById('toAddress')?.value || '';
            const durationHours = parseInt(document.getElementById('durationSelect')?.value) || 1;
            const pickupTime = document.getElementById('pickupTime')?.value || '';
            const urgentPickup = document.getElementById('urgentPickup')?.checked || false;
            
            if (!fromAddress || !toAddress || !pickupTime) {
                return;
            }
            
            const data = {
                from_address: fromAddress,
                to_address: toAddress,
                duration_hours: durationHours,
                pickup_time: pickupTime,
                urgent_pickup: urgentPickup
            };
            
            const response = await this.makeRequest(`${this.baseUrl}/calculator/step1`, 'POST', data);
            
            if (response.success) {
                this.calculationData.step1 = response.data;
                this.updateStep1Display(response.data);
                this.showStep2();
            } else {
                this.showError('Ошибка расчета маршрута: ' + response.error);
            }
            
        } catch (error) {
            console.error('Step1 calculation error:', error);
            this.showError('Ошибка расчета маршрута');
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
            
            const data = {
                step1_result: this.calculationData.step1,
                selected_vehicle_id: this.selectedVehicle.id,
                loaders: this.calculationData.step2.loaders || 0,
                duration_hours: parseInt(document.getElementById('durationSelect')?.value) || 1
            };
            
            const response = await this.makeRequest(`${this.baseUrl}/calculator/step3`, 'POST', data);
            
            if (response.success) {
                this.calculationData.step3 = response.data;
                this.updateStep3Display(response.data);
            } else {
                this.showError('Ошибка расчета итоговой стоимости: ' + response.error);
            }
            
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
        
        this.filterVehicles();
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
            
            // Показываем третий шаг
            this.showStep3();
            this.calculateStep3();
        }
    }
    
    updateStep1Display(data) {
        const priceElement = document.getElementById('step1Price');
        if (priceElement) {
            priceElement.textContent = `${Math.round(data.total)} ₽`;
        }
        
        const distanceElement = document.getElementById('step1Distance');
        if (distanceElement) {
            distanceElement.textContent = `${data.distance} км`;
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
    }
    
    updateStep3Display(data) {
        const breakdown = data.breakdown;
        
        // Обновляем детализацию
        const routeCostElement = document.getElementById('routeCost');
        const vehicleCostElement = document.getElementById('vehicleCost');
        const loadersCostElement = document.getElementById('loadersCost');
        const additionalServicesCostElement = document.getElementById('additionalServicesCost');
        const additionalServicesCostRow = document.getElementById('additionalServicesCostRow');
        const totalElement = document.getElementById('totalCost');
        
        if (routeCostElement) routeCostElement.textContent = `${Math.round(breakdown.route_cost)} ₽`;
        if (vehicleCostElement) vehicleCostElement.textContent = `${Math.round(breakdown.vehicle_cost)} ₽`;
        if (loadersCostElement) loadersCostElement.textContent = `${Math.round(breakdown.loaders_cost)} ₽`;
        
        // Обновляем дополнительные услуги
        const additionalCost = this.calculationData.additionalServicesCost || 0;
        if (additionalServicesCostElement) {
            additionalServicesCostElement.textContent = `${additionalCost} ₽`;
        }
        
        if (additionalServicesCostRow) {
            if (additionalCost > 0) {
                additionalServicesCostRow.style.display = 'flex';
            } else {
                additionalServicesCostRow.style.display = 'none';
            }
        }
        
        // Обновляем итоговую стоимость
        const totalCost = Math.round(breakdown.total) + additionalCost;
        if (totalElement) totalElement.textContent = `${totalCost} ₽`;
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
    
    showStep2() {
        console.log('Showing step 2...');
        const step2 = document.getElementById('step2');
        const newsCarousel = document.getElementById('newsCarousel');
        
        console.log('Step2 element:', step2);
        console.log('News carousel element:', newsCarousel);
        
        if (step2 && newsCarousel) {
            newsCarousel.classList.add('hidden');
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
        const step3 = document.getElementById('step3');
        const step2 = document.getElementById('step2');
        
        if (step3 && step2) {
            step3.classList.remove('hidden');
            step3.classList.add('md:col-span-1');
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
        this.calculationData.additionalServicesCost = totalAdditionalCost;
        
        // Обновляем отображение стоимости (если третий шаг активен)
        if (this.calculationData.step3 && this.calculationData.step3.breakdown) {
            this.updateStep3Display(this.calculationData.step3);
        }
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
            const name = document.getElementById('customerName')?.value;
            const phone = document.getElementById('customerPhone')?.value;
            
            if (!name || !phone) {
                this.showError('Пожалуйста, заполните все обязательные поля');
                return;
            }
            
            if (!this.selectedVehicle) {
                this.showError('Пожалуйста, выберите транспорт');
                return;
            }
            
            // Здесь будет отправка заказа на сервер
            this.showError('Функция оформления заказа в разработке');
            
        } catch (error) {
            console.error('Order submission error:', error);
            this.showError('Ошибка оформления заказа');
        }
    }
}

// Инициализация калькулятора при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing calculator...');
    
    // Небольшая задержка для полной загрузки DOM
    setTimeout(() => {
        window.calculatorV2 = new CalculatorV2();
        console.log('Calculator initialized:', window.calculatorV2);
    }, 100);
    
    // Инициализация функционала для кнопок "добавить адрес" и "примечания к заказу"
    initializeAdditionalFeatures();
});

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
        addressField.innerHTML = `
            <div class="flex items-center space-x-2">
                <div class="flex-1">
                    <label class="block text-sm text-gray-600 mb-1">Дополнительный адрес ${addressCount + 1}</label>
                    <div class="relative">
                        <input
                            type="text"
                            placeholder="Укажите адрес"
                            class="w-full px-4 py-2 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                            class="absolute right-2 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 transition-transform hover:scale-125"
                        >
                            <i class="ri-map-pin-line"></i>
                        </button>
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
        });
        
        additionalAddressesContainer.appendChild(addressField);
    }
    
    function updateAddressNumbers() {
        const addressFields = additionalAddressesContainer.querySelectorAll('.additional-address-field');
        addressFields.forEach((field, index) => {
            const label = field.querySelector('label');
            if (label) {
                label.textContent = `Дополнительный адрес ${index + 1}`;
            }
        });
    }
    
    // Функционал кнопки "примечания к заказу"
    const orderNotesBtn = document.getElementById('orderNotesBtn');
    const orderNotesPopup = document.getElementById('orderNotesPopup');
    const closeOrderNotesPopup = document.getElementById('closeOrderNotesPopup');
    const cancelOrderNotes = document.getElementById('cancelOrderNotes');
    const saveOrderNotes = document.getElementById('saveOrderNotes');
    const orderNotesText = document.getElementById('orderNotesText');
    
    if (orderNotesBtn && orderNotesPopup) {
        orderNotesBtn.addEventListener('click', function() {
            orderNotesPopup.classList.remove('hidden');
            orderNotesText.focus();
        });
    }
    
    function closePopup() {
        orderNotesPopup.classList.add('hidden');
        orderNotesText.value = '';
    }
    
    if (closeOrderNotesPopup) {
        closeOrderNotesPopup.addEventListener('click', closePopup);
    }
    
    if (cancelOrderNotes) {
        cancelOrderNotes.addEventListener('click', closePopup);
    }
    
    if (saveOrderNotes) {
        saveOrderNotes.addEventListener('click', function() {
            const notes = orderNotesText.value.trim();
            if (notes) {
                // Здесь можно сохранить примечания в переменную или отправить на сервер
                console.log('Примечания к заказу:', notes);
                
                // Показываем уведомление о сохранении
                showNotification('Примечания к заказу сохранены', 'success');
            }
            closePopup();
        });
    }
    
    // Закрытие popup при клике вне его
    if (orderNotesPopup) {
        orderNotesPopup.addEventListener('click', function(e) {
            if (e.target === orderNotesPopup) {
                closePopup();
            }
        });
    }
    
    // Закрытие popup по клавише Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !orderNotesPopup.classList.contains('hidden')) {
            closePopup();
        }
    });
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