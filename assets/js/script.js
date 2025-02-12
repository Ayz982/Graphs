let scale = 1;
const grid = document.getElementById("grid");
let offsetX = 0, offsetY = 0;
let vertexCount = 1; // Лічильник вершин

// Статуси режимів
const modes = {
    vertex: false,
    edge: false,
};

// Функція для активації кнопки
function setActiveButton(button) {
    // Відновлюємо фон для всіх кнопок
    const buttons = document.querySelectorAll('.toolbar button');
    buttons.forEach(btn => btn.classList.remove('active'));

    // Додаємо активний клас тільки до натиснутої кнопки
    button.classList.add('active');
}

// Масштабування (Zoom In / Out)
function zoomIn() {
    scale = Math.min(scale + 0.1, 2);
    updateTransform();
}

function zoomOut() {
    scale = Math.max(scale - 0.1, 0.5);
    updateTransform();
}

// Оновлення масштабу
function updateTransform() {
    grid.style.transform = `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`;
}

// Прив’язка до сітки
function snapToGrid(value) {
    const gridSize = 50; // Розмір клітинки сітки
    return Math.round(value / gridSize) * gridSize;
}

// Перемикання режиму додавання вершин
function toggleVertexMode(button) {
    // Деактивуємо всі режими
    modes.vertex = true;
    modes.edge = false;
    setActiveButton(button);
}

// Додавання вершини на клік (тільки в активному режимі)
grid.addEventListener("click", function (event) {
    if (!modes.vertex) return;

    const rect = grid.getBoundingClientRect();
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;

    createVertex(snapToGrid(x), snapToGrid(y));
});

// Функція створення вершини
function createVertex(x, y) {
    const vertex = document.createElement("div");
    vertex.classList.add("vertex");
    vertex.style.left = `${x}px`;
    vertex.style.top = `${y}px`;

    // Додавання мітки вершини
    const label = document.createElement("div");
    label.classList.add("vertex-label");
    label.innerText = vertexCount++;

    vertex.appendChild(label);
    grid.appendChild(vertex);
}

// CSS для вершин
const style = document.createElement("style");
style.innerHTML = `
    .vertex {
        width: 30px;
        height: 30px;
        background-color: rgb(0, 0, 0);
        border-radius: 50%;
        position: absolute;
        transform: translate(-50%, -50%);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        color: white;
        font-size: 14px;
    }
    
    .vertex-label {
        position: absolute;
        bottom: 40px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 14px;
        font-weight: bold;
        color: black;
    }
`;
document.head.appendChild(style);

let edgeMode = false; // Чи активний режим створення ребер
let selectedVertex = null; // Вибрана вершина для створення ребра

function toggleEdgeMode(button) {
    // Деактивуємо всі режими
    modes.vertex = false;
    modes.edge = true;
    setActiveButton(button);
}

// Додавання обробника кліку по вершинах для режиму ребер
document.addEventListener("click", function (event) {
    if (!modes.edge) return;

    const vertex = event.target.closest(".vertex");
    if (!vertex) return;

    if (!selectedVertex) {
        // Обираємо першу вершину
        selectedVertex = vertex;
        vertex.classList.add("selected");
    } else {
        // Обираємо другу вершину і створюємо ребро
        createEdge(selectedVertex, vertex);
        selectedVertex.classList.remove("selected");
        selectedVertex = null;
    }
});

let edgeCount = 1; // Лічильник ребер

// Створення ребра
function createEdge(vertex1, vertex2) {
    const edge = document.createElement("div");
    edge.classList.add("edge");

    const x1 = vertex1.offsetLeft; 
    const y1 = vertex1.offsetTop; 
    const x2 = vertex2.offsetLeft;
    const y2 = vertex2.offsetTop;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    edge.style.width = `${length}px`;
    edge.style.left = `${x1}px`;
    edge.style.top = `${y1}px`;
    edge.style.transform = `rotate(${angle}deg) translateY(-50%)`;

    grid.appendChild(edge);

    // Додавання назви ребра
    const edgeLabel = document.createElement("div");
    edgeLabel.classList.add("edge-label");
    edgeLabel.innerText = String.fromCharCode(96 + edgeCount++); // Генерація малих латинських літер (a, b, c, ...)
    
    // Позиціюємо назву ребра по центру з відступом
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    edgeLabel.style.left = `${midX}px`;
    edgeLabel.style.top = `${midY - 10}px`; // Відступ на 10 пікселів вгору
    edgeLabel.style.transform = `translate(-50%, -50%)`; // Центруємо текст

    grid.appendChild(edgeLabel);
}

// CSS для назви ребра
const edgeLabelStyle = document.createElement("style");
edgeLabelStyle.innerHTML = `
    .edge-label {
        position: absolute;
        font-size: 14px;
        font-weight: bold;
        color: black;
        pointer-events: none; /* Щоб текст не перехоплював події миші */
    }
`;
document.head.appendChild(edgeLabelStyle);
// CSS для ребер
const edgeStyle = document.createElement("style");
edgeStyle.innerHTML = `
    .edge {
        position: absolute;
        height: 3px;
        background-color: black;
        transform-origin: 0 50%;
    }
    .vertex.selected {
        border: 2px solid red;
    }
`;
document.head.appendChild(edgeStyle);

function deleteSelected() {
    // Видаляємо всі елементи з класами "vertex", "edge" та "edge-label"
    const vertices = document.querySelectorAll(".vertex");
    const edges = document.querySelectorAll(".edge");
    const edgeLabels = document.querySelectorAll(".edge-label");
    
    // Видалення всіх вершин
    vertices.forEach(vertex => vertex.remove());
    
    // Видалення всіх ребер
    edges.forEach(edge => edge.remove());
    
    // Видалення всіх назв ребер
    edgeLabels.forEach(label => label.remove());

    // Скидання лічильників для вершин
    vertexCount = 1;

    // Вимкнення режимів додавання вершин і ребер
    vertexMode = false;
    edgeMode = false;
    
    // Зміна стилю кнопок для скидання активного стану
    document.querySelectorAll(".active").forEach(button => {
        button.classList.remove("active");
    });
}
function saveGraphAsPDF() {
}



// function toggleDropdown(button) {
//     let content = button.nextElementSibling;
//     content.style.display = content.style.display === "block" ? "none" : "block";
// }
// let scale = 1;
// let isMoving = false;
// let lastX, lastY;
// let offsetX = 0, offsetY = 0;

// const grid = document.getElementById('grid');
// const canvasContainer = document.querySelector('.canvas-container');

// // Функція для збільшення області побудови
// function zoomIn(button) {
//     scale += 0.1;
//     applyScale();
//     setActiveButton(button); // Активуємо кнопку
// }

// // Функція для зменшення області побудови
// function zoomOut(button) {
//     scale = Math.max(0.1, scale - 0.1); // не дозволяємо зменшити масштаб менше за 0.1
//     applyScale();
//     setActiveButton(button); // Активуємо кнопку
// }

// // Функція для застосування масштабу до канвасу
// function applyScale() {
//     grid.style.transform = `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`;
// }

// // Функція для увімкнення/вимкнення режиму переміщення
// function toggleMoveMode(button) {
//     isMoving = !isMoving;
//     setActiveButton(button); // Активуємо кнопку

//     if (isMoving) {
//         grid.style.cursor = 'grabbing';
//         canvasContainer.addEventListener('mousedown', startMove);
//         canvasContainer.addEventListener('mousemove', moveCanvas);
//         canvasContainer.addEventListener('mouseup', stopMove);
//         canvasContainer.addEventListener('mouseleave', stopMove);
//     } else {
//         grid.style.cursor = 'grab';
//         canvasContainer.removeEventListener('mousedown', startMove);
//         canvasContainer.removeEventListener('mousemove', moveCanvas);
//         canvasContainer.removeEventListener('mouseup', stopMove);
//         canvasContainer.removeEventListener('mouseleave', stopMove);
//     }
// }

// // Функція для початку переміщення
// function startMove(event) {
//     if (event.button !== 0) return;
//     lastX = event.clientX;
//     lastY = event.clientY;
// }

// // Функція для переміщення канвасу
// function moveCanvas(event) {
//     if (!isMoving || !lastX || !lastY) return;
//     const deltaX = event.clientX - lastX;
//     const deltaY = event.clientY - lastY;

//     offsetX += deltaX;
//     offsetY += deltaY;

//     grid.style.transform = `scale(${scale}) translate(${offsetX}px, ${offsetY}px)`;

//     lastX = event.clientX;
//     lastY = event.clientY;
// }

// // Функція для зупинки переміщення
// function stopMove() {
//     lastX = null;
//     lastY = null;
// }

// // Функція для активації кнопки
// function setActiveButton(button) {
//     // Відновлюємо фон для всіх кнопок
//     const buttons = document.querySelectorAll('.toolbar button');
//     buttons.forEach(btn => btn.classList.remove('active'));

//     // Додаємо активний клас тільки до натиснутої кнопки
//     button.classList.add('active');
// }

// function saveGraphAsImage() {
//     const canvasContainer = document.querySelector('.canvas-container');
//     if (!canvasContainer) {
//         alert('Контейнер не знайдений!');
//         return;
//     }

//     html2canvas(canvasContainer, {
//         onrendered: function(canvas) {
//             const image = canvas.toDataURL("image/png");

//             const link = document.createElement('a');
//             link.href = image;
//             link.download = 'graph.png';
//             link.click();
//         }
//     });
// }
