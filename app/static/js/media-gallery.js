/**
 * Media Gallery Manager
 * Управление галереей изображений и видео
 */
class MediaGallery {
    constructor() {
        this.currentMediaIndex = 0;
        this.mediaItems = [];
        this.currentFilter = 'all';
        this.isModalOpen = false;
        
        this.init();
    }
    
    init() {
        this.createModalElements();
        this.bindEvents();
        this.loadMediaData();
    }
    
    createModalElements() {
        // Создаем модальное окно для изображений
        const imageModal = document.createElement('div');
        imageModal.id = 'imageModal';
        imageModal.className = 'fixed inset-0 bg-black/70 z-50 hidden flex items-center justify-center p-4 transition-opacity duration-300 opacity-0 pointer-events-none';
        imageModal.innerHTML = `
            <div class="modal-overlay fixed inset-0 bg-black/70 z-40 transition-opacity duration-500 opacity-0 pointer-events-none"></div>
            <div class="modal-content-wrapper relative z-50">
                <button id="closeImageModal" class="absolute top-4 right-4 z-20">
                    <i class="ri-close-line"></i>
                </button>
                <button id="prevImage" class="absolute left-4 top-1/2 -translate-y-1/2 rounded-full p-2 bg-white border border-gray-300 shadow-lg transition-colors transition-transform hover:bg-primary hover:border-primary hover:text-white dark:bg-gray-800 dark:text-white dark:border-gray-700 z-20">
                    <i class="ri-arrow-left-s-line text-gray-800 dark:text-white"></i>
                </button>
                <button id="nextImage" class="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-2 bg-white border border-gray-300 shadow-lg transition-colors transition-transform hover:bg-primary hover:border-primary hover:text-white dark:bg-gray-800 dark:text-white dark:border-gray-700 z-20">
                    <i class="ri-arrow-right-s-line text-gray-800 dark:text-white"></i>
                </button>
                <img id="modalImage" src="" alt="" class="max-w-full max-h-full object-contain">
                <div id="imageInfo" class="absolute bottom-4 left-4 right-4 text-white">
                    <h3 id="imageTitle" class="text-lg font-bold mb-2"></h3>
                    <p id="imageDescription" class="text-sm"></p>
                </div>
            </div>
        `;
        
        // Создаем модальное окно для видео
        const videoModal = document.createElement('div');
        videoModal.id = 'videoModal';
        videoModal.className = 'fixed inset-0 bg-black bg-opacity-90 z-50 hidden flex items-center justify-center p-4';
        videoModal.innerHTML = `
            <div class="modal-content-wrapper">
                <button id="closeVideoModal" class="absolute top-4 right-4 z-20">
                    <i class="ri-close-line"></i>
                </button>
                <video id="modalVideo" controls class="max-w-full max-h-full">
                    <source src="" type="video/mp4">
                    Ваш браузер не поддерживает видео.
                </video>
                <div id="videoPlaceholder" class="max-w-full max-h-full" style="display: none;"></div>
                <div id="videoInfo" class="absolute bottom-4 left-4 right-4 text-white">
                    <h3 id="videoTitle" class="text-lg font-bold mb-2"></h3>
                    <p id="videoDescription" class="text-sm"></p>
                </div>
            </div>
        `;
        
        // Добавляем модальные окна в body
        document.body.appendChild(imageModal);
        document.body.appendChild(videoModal);
    }
    
    bindEvents() {
        // Закрытие модальных окон
        document.getElementById('closeImageModal').addEventListener('click', () => this.closeImageModal());
        document.getElementById('closeVideoModal').addEventListener('click', () => this.closeVideoModal());
        
        // Навигация по изображениям
        document.getElementById('prevImage').addEventListener('click', () => this.showPreviousImage());
        document.getElementById('nextImage').addEventListener('click', () => this.showNextImage());
        
        // Закрытие по клику вне контента
        document.getElementById('imageModal').addEventListener('click', (e) => {
            if (e.target.id === 'imageModal') this.closeImageModal();
        });
        
        document.getElementById('videoModal').addEventListener('click', (e) => {
            if (e.target.id === 'videoModal') this.closeVideoModal();
        });
        
        // Закрытие по Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeImageModal();
                this.closeVideoModal();
            }
        });
        
        // Навигация по стрелкам
        document.addEventListener('keydown', (e) => {
            if (!this.isModalOpen) return;
            
            if (e.key === 'ArrowLeft') {
                this.showPreviousImage();
            } else if (e.key === 'ArrowRight') {
                this.showNextImage();
            }
        });
    }
    
    async loadMediaData() {
        try {
            // Загружаем изображения
            const imagesResponse = await fetch('/api/v2/media/images');
            const imagesData = await imagesResponse.json();
            
            // Загружаем видео
            const videosResponse = await fetch('/api/v2/media/videos');
            const videosData = await videosResponse.json();
            
            if (imagesData.success && videosData.success) {
                this.mediaItems = [...imagesData.data.images, ...videosData.data.videos];
                this.renderGallery();
            }
        } catch (error) {
            console.error('Error loading media data:', error);
            this.showError('Ошибка загрузки медиа-данных');
        }
    }
    
    renderGallery() {
        const imagesContainer = document.getElementById('imagesGallery');
        const videosContainer = document.getElementById('videosGallery');
        
        if (!imagesContainer || !videosContainer) {
            console.error('Gallery containers not found');
            return;
        }
        
        // Очищаем контейнеры
        imagesContainer.innerHTML = '';
        videosContainer.innerHTML = '';
        
        // Фильтруем медиа по типу
        const images = this.mediaItems.filter(item => item.media_type === 'image');
        const videos = this.mediaItems.filter(item => item.media_type === 'video');
        
        // Рендерим изображения
        images.forEach((image, index) => {
            const imageElement = this.createImageElement(image, index);
            imagesContainer.appendChild(imageElement);
        });
        
        // Рендерим видео
        videos.forEach((video, index) => {
            const videoElement = this.createVideoElement(video, index);
            videosContainer.appendChild(videoElement);
        });
        
        // Обновляем счетчики
        this.updateCounters(images.length, videos.length);
    }
    
    createImageElement(image, index) {
        const div = document.createElement('div');
        div.className = 'gallery-item bg-gray-100 rounded-lg overflow-hidden h-64 transition-transform duration-300 hover:scale-105 cursor-pointer';
        div.innerHTML = `
            <img 
                src="${image.thumbnail_path || image.file_path}" 
                alt="${image.title}"
                class="w-full h-full object-cover"
                data-media-id="${image.id}"
                data-media-type="image"
                data-media-index="${index}"
            >
        `;
        
        div.addEventListener('click', () => this.openImageModal(index));
        return div;
    }
    
    createVideoElement(video, index) {
        const div = document.createElement('div');
        div.className = 'video-thumbnail gallery-item bg-gray-100 rounded-lg overflow-hidden h-64 transition-transform duration-300 hover:scale-105 cursor-pointer relative';
        div.innerHTML = `
            <img 
                src="${video.thumbnail_path || video.file_path}" 
                alt="${video.title}"
                class="w-full h-full object-cover"
                data-media-id="${video.id}"
                data-media-type="video"
                data-media-index="${index}"
            >
            <button class="video-play-btn absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 hover:bg-opacity-50 transition-all">
                <i class="ri-play-fill text-4xl text-white"></i>
            </button>
        `;
        
        div.addEventListener('click', () => this.openVideoModal(index));
        return div;
    }
    
    updateCounters(imagesCount, videosCount) {
        // Обновляем заголовки с количеством
        const worksGallery = document.getElementById('worksGallery');
        if (worksGallery) {
            const h3Elements = worksGallery.querySelectorAll('h3');
            h3Elements.forEach(h3 => {
                if (h3.textContent.includes('Фотогалерея')) {
                    h3.textContent = `Фотогалерея (${imagesCount})`;
                } else if (h3.textContent.includes('Видеогалерея')) {
                    h3.textContent = `Видеогалерея (${videosCount})`;
                }
            });
        }
    }
    
    openImageModal(index) {
        const images = this.mediaItems.filter(item => item.media_type === 'image');
        if (index < 0 || index >= images.length) return;
        
        const image = images[index];
        this.currentMediaIndex = index;
        this.isModalOpen = true;
        
        const modal = document.getElementById('imageModal');
        const modalImage = document.getElementById('modalImage');
        const imageTitle = document.getElementById('imageTitle');
        const imageDescription = document.getElementById('imageDescription');
        
        modalImage.src = image.file_path;
        modalImage.alt = image.title;
        imageTitle.textContent = image.title;
        imageDescription.textContent = image.description;
        
        const overlay = modal.querySelector('.modal-overlay');
        overlay.classList.add('opacity-100', 'pointer-events-auto');
        overlay.classList.remove('opacity-0', 'pointer-events-none');
        modal.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
        modal.classList.add('show');
        modal.style.opacity = '';
        modal.style.pointerEvents = '';
        document.body.style.overflow = 'hidden';
    }
    
    openVideoModal(index) {
        const videos = this.mediaItems.filter(item => item.media_type === 'video');
        if (index < 0 || index >= videos.length) return;
        
        const video = videos[index];
        this.isModalOpen = true;
        
        const modal = document.getElementById('videoModal');
        const modalVideo = document.getElementById('modalVideo');
        const videoTitle = document.getElementById('videoTitle');
        const videoDescription = document.getElementById('videoDescription');
        const placeholderDiv = document.getElementById('videoPlaceholder');
        
        // Проверяем, является ли файл реальным видео (имеет расширение .mp4, .avi, .mov и т.д.)
        const isRealVideo = video.file_path.match(/\.(mp4|avi|mov|wmv|flv|webm)$/i);
        
        if (isRealVideo) {
            // Показываем реальное видео
            modalVideo.style.display = 'block';
            if (placeholderDiv) {
                placeholderDiv.style.display = 'none';
            }
            
            modalVideo.src = video.file_path;
            modalVideo.load(); // Принудительно загружаем видео
            
            // Автоматически запускаем видео
            modalVideo.play().catch(e => console.log('Auto-play prevented:', e));
        } else {
            // Показываем placeholder изображение
            modalVideo.style.display = 'none';
            if (placeholderDiv) {
                placeholderDiv.style.display = 'block';
                placeholderDiv.innerHTML = `
                    <div class="text-center p-8 bg-white rounded-lg shadow-lg max-w-2xl mx-auto">
                        <img src="${video.file_path}" alt="${video.title}" class="max-w-full max-h-96 mx-auto mb-6 rounded-lg shadow-md">
                        <div class="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-blue-800 px-6 py-4 rounded-lg mb-4">
                            <div class="flex items-center justify-center mb-2">
                                <i class="ri-video-line text-2xl mr-2"></i>
                                <p class="font-bold text-lg">Видео в разработке</p>
                            </div>
                            <p class="text-sm">Это демонстрационная версия. Реальное видео будет добавлено позже.</p>
                        </div>
                        <div class="flex items-center justify-center text-gray-600 bg-gray-50 px-4 py-2 rounded-lg">
                            <i class="ri-time-line mr-2"></i>
                            <span>Длительность: ${Math.floor(video.duration / 60)}:${(video.duration % 60).toString().padStart(2, '0')}</span>
                        </div>
                    </div>
                `;
            }
        }
        
        videoTitle.textContent = video.title;
        videoDescription.textContent = video.description;
        
        modal.classList.remove('hidden', 'opacity-0', 'pointer-events-none');
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    
    closeImageModal() {
        const modal = document.getElementById('imageModal');
        const overlay = modal.querySelector('.modal-overlay');
        overlay.classList.remove('opacity-100', 'pointer-events-auto');
        overlay.classList.add('opacity-0', 'pointer-events-none');
        modal.classList.remove('show');
        modal.classList.add('hidden', 'opacity-0', 'pointer-events-none');
        modal.style.opacity = '';
        modal.style.pointerEvents = '';
        this.isModalOpen = false;
        document.body.style.overflow = '';
    }
    
    closeVideoModal() {
        const modal = document.getElementById('videoModal');
        const video = document.getElementById('modalVideo');
        const placeholderDiv = document.getElementById('videoPlaceholder');
        
        // Останавливаем видео если оно воспроизводится
        if (video.src) {
            video.pause();
            video.currentTime = 0;
        }
        
        // Скрываем placeholder и показываем видео элемент
        if (placeholderDiv) {
            placeholderDiv.style.display = 'none';
        }
        video.style.display = 'block';
        
        modal.classList.remove('show');
        modal.classList.add('hidden', 'opacity-0', 'pointer-events-none');
        this.isModalOpen = false;
        document.body.style.overflow = '';
    }
    
    showPreviousImage() {
        const images = this.mediaItems.filter(item => item.media_type === 'image');
        const newIndex = this.currentMediaIndex > 0 ? this.currentMediaIndex - 1 : images.length - 1;
        this.openImageModal(newIndex);
    }
    
    showNextImage() {
        const images = this.mediaItems.filter(item => item.media_type === 'image');
        const newIndex = this.currentMediaIndex < images.length - 1 ? this.currentMediaIndex + 1 : 0;
        this.openImageModal(newIndex);
    }
    
    showError(message) {
        // Показываем уведомление об ошибке
        if (typeof showNotification === 'function') {
            showNotification(message, 'error');
        } else {
            console.error(message);
        }
    }
    
    // Метод для обновления галереи при переключении вкладок
    refreshGallery() {
        if (document.getElementById('worksGallery') && !document.getElementById('worksGallery').classList.contains('hidden')) {
            this.loadMediaData();
        }
    }
}

// Инициализация галереи при загрузке страницы
let mediaGallery;

document.addEventListener('DOMContentLoaded', function() {
    mediaGallery = new MediaGallery();
    
    // Обновляем галерею при переключении на вкладку "Работы"
    const worksTab = document.querySelector('.works-tab');
    if (worksTab) {
        worksTab.addEventListener('click', () => {
            setTimeout(() => {
                if (mediaGallery) {
                    mediaGallery.refreshGallery();
                }
            }, 100);
        });
    }
});

// Экспорт для использования в других модулях
window.MediaGallery = MediaGallery; 