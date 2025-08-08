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

// Логика показа шагов калькулятора
document.addEventListener("DOMContentLoaded", function() {
  const step1 = document.getElementById('step1');
  const newsCarousel = document.getElementById('newsCarousel');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');
  
  // Флаг для предотвращения множественных вызовов
  let stepsShown = false;

  // Функция для показа шагов 2 и 3
  function showCalculatorSteps() {
    if (stepsShown) {
      console.log('Steps already shown, skipping...');
      return;
    }
    
    console.log('showCalculatorSteps called');
    stepsShown = true;
    newsCarousel.classList.add('hidden');
    step2.classList.remove('hidden');
    step3.classList.remove('hidden');
    step2.classList.add('md:col-span-1');
    step3.classList.add('md:col-span-1');
    
    // Загружаем транспорт при показе шага 2
    if (window.calculator && window.calculator.showStep2) {
      window.calculator.showStep2();
    }
  }

  // Функция для скрытия шагов 2 и 3
  function hideCalculatorSteps() {
    console.log('hideCalculatorSteps called');
    stepsShown = false;
    newsCarousel.classList.remove('hidden');
    step2.classList.add('hidden');
    step3.classList.add('hidden');
    step2.classList.remove('md:col-span-1');
    step3.classList.remove('md:col-span-1');
  }

  // Обработчики кликов на элементы первого шага
  const step1Elements = step1.querySelectorAll('input, select, button, label');
  step1Elements.forEach(element => {
    element.addEventListener('click', function(e) {
      console.log('Step1 element clicked:', this.id || this.tagName);
      showCalculatorSteps();
    });
  });

  // Обработчики для адресных полей (показывают шаги при фокусе и вводе)
  const addressInputs = step1.querySelectorAll('input[type="text"]');
  addressInputs.forEach(input => {
    // Показываем шаги при фокусе на поле ввода адреса
    input.addEventListener('focus', function() {
      console.log('Address input focused:', this.id);
      showCalculatorSteps();
    });
    
    // Показываем шаги при вводе текста
    input.addEventListener('input', function() {
      console.log('Address input changed:', this.value);
      if (this.value.trim() !== '') {
        showCalculatorSteps();
      }
    });
  });

  // Обработчики для других полей первого шага
  const otherInputs = step1.querySelectorAll('input[type="datetime-local"], input[type="checkbox"], select');
  otherInputs.forEach(input => {
    input.addEventListener('change', function() {
      console.log('Other input changed:', this.id, this.value);
      showCalculatorSteps();
    });
  });

  // Обработчики для радиокнопок времени
  const timeRadios = step1.querySelectorAll('input[type="radio"][name="time"]');
  timeRadios.forEach(radio => {
    radio.addEventListener('change', function() {
      console.log('Time radio changed:', this.value);
      showCalculatorSteps();
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


// Скролл из футера к калькулятору с подсветкой и двойным «прыжком»
document.addEventListener('DOMContentLoaded', function() {
  const calc = document.getElementById('calculatorContainer');
  const footerServiceLinks = document.querySelectorAll('footer .grid > div:nth-child(2) ul li a');
  footerServiceLinks.forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      if (!calc) return;
      calc.scrollIntoView({ behavior: 'smooth', block: 'start' });
      calc.classList.remove('highlight-calc');
      void calc.offsetWidth;
      calc.classList.add('highlight-calc');
      setTimeout(() => {
        calc.classList.remove('highlight-calc');
        void calc.offsetWidth;
        calc.classList.add('highlight-calc');
      }, 450);
    });
  });
});

// Модалка «Перезвоним за 8 сек» + маска и валидация телефонов (модалка и шаг 3)
document.addEventListener('DOMContentLoaded', function() {
  const openBtn = document.querySelector('header .ri-phone-line')?.closest('button');
  const modal = document.getElementById('callbackModal');
  const closeBtn = document.getElementById('closeCallbackModal');
  const submitBtn = document.getElementById('callbackSubmit');
  const nameInput = document.getElementById('callbackName');
  const callbackPhone = document.getElementById('callbackPhone');
  const phoneError = document.getElementById('callbackPhoneError');

  function openModal() {
    if (!modal) return;
    modal.classList.add('show');
    nameInput?.focus();
  }
  function closeModal() {
    modal?.classList.remove('show');
  }

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  // Функция валидации телефона
  function isValidPhone(phone) {
    const phoneDigits = phone.replace(/\D/g, '');
    return phoneDigits.length === 11;
  }

  // Сабмит модалки (валидация телефона)
  if (submitBtn) submitBtn.addEventListener('click', () => {
    const ok = isValidPhone(callbackPhone?.value || '');
    callbackPhone?.classList.toggle('phone-invalid', !ok);
    if (phoneError) phoneError.classList.toggle('hidden', ok);
    if (!ok) return;
    closeModal();
  });
});