function toggleDropdown(button) {
    let content = button.nextElementSibling;
    content.style.display = content.style.display === "block" ? "none" : "block";
}
let scale = 1;
let isMoving = false;
let lastX, lastY;

const grid = document.getElementById('grid');
const canvasContainer = document.querySelector('.canvas-container');

// Функція для збільшення області побудови
function zoomIn(button) {
    scale += 0.1;
    applyScale();
    setActiveButton(button); // Активуємо кнопку
}

// Функція для зменшення області побудови
function zoomOut(button) {
    scale = Math.max(0.1, scale - 0.1); // не дозволяємо зменшити масштаб менше за 0.1
    applyScale();
    setActiveButton(button); // Активуємо кнопку
}

// Функція для застосування масштабу до канвасу
function applyScale() {
    grid.style.transform = `scale(${scale})`;
}

// Функція для увімкнення/вимкнення режиму переміщення
function toggleMoveMode(button) {
    isMoving = !isMoving;
    setActiveButton(button); // Активуємо кнопку

    if (isMoving) {
        grid.style.cursor = 'grabbing';
        canvasContainer.addEventListener('mousedown', startMove);
        canvasContainer.addEventListener('mousemove', moveCanvas);
        canvasContainer.addEventListener('mouseup', stopMove);
        canvasContainer.addEventListener('mouseleave', stopMove);
    } else {
        grid.style.cursor = 'grab';
        canvasContainer.removeEventListener('mousedown', startMove);
        canvasContainer.removeEventListener('mousemove', moveCanvas);
        canvasContainer.removeEventListener('mouseup', stopMove);
        canvasContainer.removeEventListener('mouseleave', stopMove);
    }
}

// Функція для початку переміщення
function startMove(event) {
    if (event.button !== 0) return;
    lastX = event.clientX;
    lastY = event.clientY;
}

// Функція для переміщення канвасу
function moveCanvas(event) {
    if (!isMoving || !lastX || !lastY) return;
    const deltaX = event.clientX - lastX;
    const deltaY = event.clientY - lastY;
    grid.style.transform = `scale(${scale}) translate(${deltaX}px, ${deltaY}px)`;
    lastX = event.clientX;
    lastY = event.clientY;
}

// Функція для зупинки переміщення
function stopMove() {
    lastX = null;
    lastY = null;
}

// Функція для активації кнопки
function setActiveButton(button) {
    // Відновлюємо фон для всіх кнопок
    const buttons = document.querySelectorAll('.toolbar button');
    buttons.forEach(btn => btn.classList.remove('active'));

    // Додаємо активний клас тільки до натиснутої кнопки
    button.classList.add('active');
}