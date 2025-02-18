const canvasGroup = d3.select("#canvas-group");
const canvas = d3.select("#canvas");
const vertices = new Map();
const gridSize = 50;
let scale = 1;
let offsetX = 0, offsetY = 0;
let vertexCount = 1;
let selectedVertex = null;
let edgeCount = 1;
let isSelecting = false;
let selectionBox = null;
let startX = 0, startY = 0;
const modes = {
    vertex: false,
    edge: false,
    directedEdge: false,
    loop: false,
    editText: false,
    select: false,
    move: false,
    save: false,
    importFromXLSX: false,
};

document.addEventListener("DOMContentLoaded", function () {
    updateToolbar();
    drawGrid();
    blockButtons();
});

class Graph {
    constructor() {
        this.type = "undirected";
        this.vertices = new Set();
        this.edges = new Map();
        this.adjacencyList = new Map();
    }

    addVertex(vertex) {
        if (!this.vertices.has(vertex)) {
            this.vertices.add(vertex);
            this.adjacencyList.set(vertex, new Set());
        }
    }

    addEdge(v1, v2) {
        if (!this.vertices.has(v1) || !this.vertices.has(v2)) return;

        const key = this.type === "directed" ? `${v1}->${v2}` : `${Math.min(v1, v2)}-${Math.max(v1, v2)}`;
        
        if (!this.edges.has(key)) {
            this.edges.set(key, [v1, v2]);
            this.adjacencyList.get(v1).add(v2);
            if (this.type === "undirected") {
                this.adjacencyList.get(v2).add(v1);
            }
        }
    }
    
}

const graph = new Graph();

canvas.on("click", function (event) {
    const [mouseX, mouseY] = d3.pointer(event, this);
    const x = snapToGrid(mouseX / scale);
    const y = snapToGrid(mouseY / scale);

    if (modes.vertex) {
        if (![...vertices.values()].some(([vx, vy]) => vx === x && vy === y)) {
            createVertex(x, y);
        }
    } else {
        const clickedVertex = getVertexAt(x, y);
        if (!clickedVertex) return;

        if (modes.loop) {
            createLoop(clickedVertex);
        } else if (modes.edge || modes.directedEdge) {
            handleEdgeCreation(clickedVertex);
        }
    }
});

function createVertex(x, y) {
    const vertexID = vertexCount++; 
    const vertex = canvasGroup.append("circle")
        .attr("cx", x).attr("cy", y).attr("r", 15)
        .attr("fill", "black").attr("class", "vertex")
        .style("cursor", "pointer");

    canvasGroup.append("text")
        .attr("x", x).attr("y", y - 20)
        .attr("text-anchor", "middle")
        .text(vertexID).attr("class", "vertex-label");

    vertices.set(vertexID, [x, y]);
    graph.addVertex(vertexID);
}

function getVertexAt(x, y) {
    for (const [id, [vx, vy]] of vertices.entries()) {
        if (vx === x && vy === y) {
            return id;
        }
    }
    return null;
}

function handleEdgeCreation(vertexID) {
    if (!selectedVertex) {
        selectedVertex = vertexID;
    } else if (selectedVertex !== vertexID) {
        if (modes.edge) {
            createEdge(selectedVertex, vertexID);
        } else if (modes.directedEdge) {
            createDirectedEdge(selectedVertex, vertexID);
        }
        selectedVertex = null;
    }
}


function createLoop(vertex) {
    const [x, y] = vertices.get(vertex);
    const radius = 30, loopOffset = 15;
    canvasGroup.append("path")
        .attr("d", `M${x},${y - radius} A${radius},${radius} 0 1,1 ${x},${y - radius + loopOffset}`)
        .attr("stroke", "black").attr("stroke-width", 3)
        .attr("fill", "none").attr("class", "edge");

    canvasGroup.append("text")
        .attr("x", x).attr("y", y - radius - 10)
        .attr("text-anchor", "middle")
        .text(String.fromCharCode(96 + edgeCount++)).attr("class", "edge-label");

    graph.addEdge(vertex, vertex);
}

function createEdge(v1, v2) {
    if (!vertices.has(v1) || !vertices.has(v2)) return;
    const [x1, y1] = vertices.get(v1);
    const [x2, y2] = vertices.get(v2);

    canvasGroup.append("line")
        .attr("x1", x1).attr("y1", y1).attr("x2", x2).attr("y2", y2)
        .attr("stroke", "black").attr("stroke-width", 3).attr("class", "edge");

    canvasGroup.append("text")
        .attr("x", (x1 + x2) / 2).attr("y", (y1 + y2) / 2 - 10)
        .attr("text-anchor", "middle")
        .text(String.fromCharCode(96 + edgeCount++)).attr("class", "edge-label");

    graph.addEdge(v1, v2);
}


function createDirectedEdge(v1, v2) {
    const [x1, y1] = vertices.get(v1);
    const [x2, y2] = vertices.get(v2);
    const arrowOffset = 15;
    const dx = x2 - x1, dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const unitX = dx / length, unitY = dy / length;
    const adjustedX2 = x2 - unitX * arrowOffset;
    const adjustedY2 = y2 - unitY * arrowOffset;

    canvasGroup.append("defs").append("marker")
        .attr("id", "arrowhead").attr("viewBox", "0 0 10 10")
        .attr("refX", 8).attr("refY", 5).attr("markerWidth", 6)
        .attr("markerHeight", 6).attr("orient", "auto")
        .append("path").attr("d", "M0,0 L10,5 L0,10 Z").attr("fill", "black");

    canvasGroup.append("line")
        .attr("x1", x1).attr("y1", y1).attr("x2", adjustedX2).attr("y2", adjustedY2)
        .attr("stroke", "black").attr("stroke-width", 3).attr("class", "edge")
        .attr("marker-end", "url(#arrowhead)");

    canvasGroup.append("text")
        .attr("x", (x1 + adjustedX2) / 2).attr("y", (y1 + adjustedY2) / 2 - 10)
        .attr("text-anchor", "middle")
        .text(String.fromCharCode(96 + edgeCount++)).attr("class", "edge-label");
    // Додаємо ребро в граф
    graph.addEdge(v1, v2); 
}

// Функція для виконання операцій за запитом
function executeFunction(functionName) {
    let result = null;

    if (functionName === 'undirected-size') {
        result = getGraphSize();
        document.getElementById("undirected-size-result").textContent = `Розмір графа (кількість вершин): ${result}`;
    } else  if (functionName === 'directed-size') {
        result = getGraphSize();
        document.getElementById("directed-size-result").textContent = `Розмір графа (кількість вершин): ${result}`;
    } else if (functionName === 'undirected-power') {
        result = getGraphPower();
        document.getElementById("undirected-power-result").textContent = `Потужність графа (кількість ребер): ${result}`;
    } else if (functionName === 'directed-power') {
        result = getGraphPower();
        document.getElementById("directed-power-result").textContent = `Потужність графа (кількість ребер): ${result}`;
    } else if (functionName === 'undirected-degree') {
        const vertexId = parseInt(document.getElementById("undirected-vertex-degree-input").value);
        if (isNaN(vertexId) || vertexId < 1) {
            document.getElementById("undirected-degree-result").textContent = "Будь ласка, введіть коректний номер вершини.";
        } else {
            result = getVertexDegree(vertexId);
            document.getElementById("undirected-degree-result").textContent = `Степінь вершини ${vertexId}: ${result}`;
        }
    } else if (functionName === 'directed-degree') {
        const vertexId = parseInt(document.getElementById("directed-vertex-degree-input").value);
        if (isNaN(vertexId) || vertexId < 1) {
            document.getElementById("directed-degree-result").textContent = "Будь ласка, введіть коректний номер вершини.";
        } else {
            result = getVertexDegree(vertexId);
            document.getElementById("directed-degree-result").textContent = `Степінь вершини ${vertexId}: ${result}`;
        }
    } else if (functionName === 'undirected-adjacency-matrix') {
        result = getAdjacencyMatrix();
        displayAdjacencyMatrix(result, graph.type);
    } else if (functionName === 'directed-adjacency-matrix') {
        result = getAdjacencyMatrix();
        displayAdjacencyMatrix(result, graph.type);
    } else if (functionName === 'undirected-adjacency-list') {
        result = getAdjacencyList();
        displayAdjacencyList(result, graph.type);
    } else if (functionName === 'directed-adjacency-list') {
        result = getAdjacencyList();
        displayAdjacencyList(result, graph.type);
    } else if (functionName === 'undirected-edge-list') {
        result = getEdgeList();
        displayEdgeList(result, graph.type);
    } else if (functionName === 'directed-edge-list') {
        result = getEdgeList();
        displayEdgeList(result, graph.type);
    } else if (functionName === 'undirected-incidence-matrix') {
        result = getIncidenceMatrix();
        displayIncidenceMatrix(result, graph.type);
    } else if (functionName === 'directed-incidence-matrix') {
        result = getIncidenceMatrix();
        displayIncidenceMatrix(result, graph.type);
    }      
}

// Функція для отримання матриці інцидентності
function getIncidenceMatrix() {
    const verticesArray = [...graph.vertices];  // Масив всіх вершин
    const edgesArray = getEdgeList();           // Отримуємо список ребер
    const matrix = [];

    // Створюємо порожню матрицю розміру vertices.length x edges.length
    for (let i = 0; i < verticesArray.length; i++) {
        matrix[i] = [];
        for (let j = 0; j < edgesArray.length; j++) {
            matrix[i][j] = 0;  // Ініціалізуємо всі елементи як 0
        }
    }

    // Заповнюємо матрицю залежно від інцидентності ребер
    edgesArray.forEach((edge, j) => {
        const [vertex1, vertex2] = edge;
        const vertex1Index = verticesArray.indexOf(vertex1);
        const vertex2Index = verticesArray.indexOf(vertex2);

        if (graph.type === "undirected") {
            // Для неорієнтованого графа обидві вершини інцидентні цьому ребру
            matrix[vertex1Index][j] = 1;
            matrix[vertex2Index][j] = 1;
        } else if (graph.type === "directed") {
            // Для орієнтованого графа лише вершина 1 інцидентна з вихідним ребром
            matrix[vertex1Index][j] = -1;
            matrix[vertex2Index][j] = 1;  // Для орієнтованих ребер друга вершина отримує -1
        }
    });

    return matrix;
}

// Функція для відображення матриці інцидентності з автоматичним визначенням назв ребер
function displayIncidenceMatrix(matrix, type) {
    let resultElement;  // Оголошуємо змінну resultElement поза умовами

    if (type === "directed") {
        resultElement = document.getElementById("directed-incidence-matrix-result");
    } else if (type === "undirected") {
        resultElement = document.getElementById("undirected-incidence-matrix-result");
    } else {
        console.error("Невідомий тип графа");
        return;
    }
  
    // Очистити вміст перед відображенням нових даних
    resultElement.innerHTML = "";

    if (!matrix || matrix.length === 0) {
        resultElement.textContent = "Матриця порожня або некоректні дані.";
        return;
    }

    const table = document.createElement("table");
    table.style.borderCollapse = "collapse";

    // Визначаємо назви ребер за їхнім розташуванням у матриці
    const edges = matrix[0].map((_, colIndex) => {
        let vertices = [];
        matrix.forEach((row, rowIndex) => {
            if (row[colIndex] !== 0) {
                vertices.push(rowIndex + 1); // Вершини нумеруємо з 1
            }
        });

        return vertices.length === 2 
            ? `Ребро ${vertices[0]}-${vertices[1]}` 
            : `Ребро ${vertices.join(",")}`; // Для орієнтованих або мультиграфів
    });

    // Створюємо заголовок для стовпців (імена ребер)
    const headerRow = document.createElement("tr");

    // Додати порожню клітинку в лівий верхній кут
    const emptyHeaderCell = document.createElement("th");
    headerRow.appendChild(emptyHeaderCell);

    // Додаємо заголовки для стовпців (ребра у форматі "Ребро x-y")
    edges.forEach(edgeName => {
        const th = document.createElement("th");
        th.textContent = edgeName;
        th.style.border = "1px solid black";
        th.style.padding = "5px";
        headerRow.appendChild(th);
    });

    table.appendChild(headerRow);

    // Додаємо рядки для кожної вершини
    matrix.forEach((row, rowIndex) => {
        const tr = document.createElement("tr");

        // Додаємо заголовок для рядка (ім'я вершини)
        const th = document.createElement("th");
        th.textContent = `Вершина ${rowIndex + 1}`;
        th.style.border = "1px solid black";
        th.style.padding = "5px";
        tr.appendChild(th);

        // Додаємо клітинки для елементів матриці
        row.forEach(cell => {
            const td = document.createElement("td");
            td.textContent = cell;
            td.style.border = "1px solid black";
            td.style.padding = "5px";
            tr.appendChild(td);
        });

        table.appendChild(tr);
    });

    resultElement.appendChild(table);
}

// Функція для отримання списку ребер
function getEdgeList() {
    const edgeList = [];

    // Ітеруємо через всі вершини графа і додаємо ребра
    graph.vertices.forEach(vertex => {
        graph.adjacencyList.get(vertex).forEach(neighbor => {
            // Для неорієнтованого графа додаємо ребра без зворотних
            if (graph.type === "undirected") {
                // Перевіряємо, чи не додано вже зворотне ребро
                if (!edgeList.some(edge => (edge[0] === vertex && edge[1] === neighbor) || (edge[0] === neighbor && edge[1] === vertex))) {
                    edgeList.push([vertex, neighbor]);
                }
            } else if (graph.type === "directed") {
                // Для орієнтованого графа додаємо ребра з напрямком
                edgeList.push([vertex, neighbor]);
            }
        });
    });

    return edgeList;
}
// Функція для відображення списку ребер
function displayEdgeList(edgeList, type) {
    let resultElement;

    if (type === "directed") {
        resultElement = document.getElementById("directed-edge-list-result");
    } else if (type === "undirected") {
        resultElement = document.getElementById("undirected-edge-list-result");
    } else {
        console.error("Невідомий тип графа");
        return;
    }

    resultElement.innerHTML = "<ul>";

    edgeList.forEach(edge => {
        if (type === "directed") {
            resultElement.innerHTML += `<li>${edge[0]} → ${edge[1]}</li>`; // Для орієнтованого графа
        } else if (type === "undirected") {
            resultElement.innerHTML += `<li>${edge[0]} - ${edge[1]}</li>`; // Для неорієнтованого графа
        }
    });

    resultElement.innerHTML += "</ul>";
}

// Функція для отримання списку суміжності
function getAdjacencyList() {
    const adjacencyList = new Map();

    // Ітеруємо через всі вершини і додаємо сусідів
    graph.vertices.forEach(vertex => {
        const neighbors = Array.from(graph.adjacencyList.get(vertex));
        adjacencyList.set(vertex, neighbors);

        // Для неорієнтованого графа додаємо зворотні зв'язки
        if (graph.type === "undirected") {
            neighbors.forEach(neighbor => {
                if (!adjacencyList.get(neighbor)) {
                    adjacencyList.set(neighbor, []);
                }
                if (!adjacencyList.get(neighbor).includes(vertex)) {
                    adjacencyList.get(neighbor).push(vertex);
                }
            });
        }
    });

    return adjacencyList;
}
// Функція для відображення списку суміжності
function displayAdjacencyList(adjacencyList, type) {
    let resultElement;

    if (type === "directed") {
        resultElement = document.getElementById("directed-adjacency-list-result");
    } else if (type === "undirected") {
        resultElement = document.getElementById("undirected-adjacency-list-result");
    } else {
        console.error("Невідомий тип графа");
        return;
    }

    resultElement.innerHTML = "<ul>";

    adjacencyList.forEach((neighbors, vertex) => {
        resultElement.innerHTML += `<li><strong>${vertex}:</strong> ${neighbors.join(', ')}</li>`;
    });

    resultElement.innerHTML += "</ul>";
}

// Функція для отримання матриці суміжності
function getAdjacencyMatrix() {
    const verticesArray = [...graph.vertices];  // Масив всіх вершин
    const matrix = [];

    // Створюємо пусту матрицю розміру vertices.length x vertices.length
    for (let i = 0; i < verticesArray.length; i++) {
        matrix[i] = [];
        for (let j = 0; j < verticesArray.length; j++) {
            matrix[i][j] = 0;  // Ініціалізуємо всі елементи як 0
        }
    }

    // Заповнюємо матрицю залежно від наявності ребер, включаючи петлі
    verticesArray.forEach((vertex1, i) => {
        verticesArray.forEach((vertex2, j) => {
            if (graph.adjacencyList.get(vertex1).has(vertex2)) {
                if (graph.type === "undirected") {
                    matrix[i][j] = 1;  // Для неорієнтованого графа ставимо 1 для обох напрямків
                    matrix[j][i] = 1;  // Зв'язок двосторонній
                } else if (graph.type === "directed") {
                    matrix[i][j] = 1;  // Для орієнтованого графа лише один напрямок
                }
            }
        });
    });

    return matrix;
}

// Функція для відображення матриці суміжності
function displayAdjacencyMatrix(matrix, type) {
    let resultElement;

    if (type === "directed") {
        resultElement = document.getElementById("directed-adjacency-matrix-result");
    } else if (type === "undirected") {
        resultElement = document.getElementById("undirected-adjacency-matrix-result");
    } else {
        console.error("Невідомий тип графа");
        return;
    }

    // Очистити вміст перед відображенням нових даних
    resultElement.innerHTML = "";

    if (!matrix || matrix.length === 0) {
        resultElement.textContent = "Матриця порожня.";
        return;
    }

    const table = document.createElement("table");
    table.style.borderCollapse = "collapse";

    // Створюємо заголовок для стовпців (імена вершин)
    const headerRow = document.createElement("tr");

    // Додати порожню клітинку в лівий верхній кут
    const emptyHeaderCell = document.createElement("th");
    headerRow.appendChild(emptyHeaderCell);

    // Додаємо заголовки для стовпців (вершини)
    matrix.forEach((_, index) => {
        const th = document.createElement("th");
        th.textContent = `Вершина ${index + 1}`;
        th.style.border = "1px solid black";
        th.style.padding = "5px";
        headerRow.appendChild(th);
    });

    table.appendChild(headerRow);

    // Додаємо рядки для кожної вершини
    matrix.forEach((row, rowIndex) => {
        const tr = document.createElement("tr");

        // Додаємо заголовок для рядка (номер вершини)
        const th = document.createElement("th");
        th.textContent = `Вершина ${rowIndex + 1}`;
        th.style.border = "1px solid black";
        th.style.padding = "5px";
        tr.appendChild(th);

        // Додаємо клітинки для елементів матриці
        row.forEach(cell => {
            const td = document.createElement("td");
            td.textContent = cell;
            td.style.border = "1px solid black";
            td.style.padding = "5px";
            tr.appendChild(td);
        });

        table.appendChild(tr);
    });

    resultElement.appendChild(table);
}

// Функція для визначення степеня вершини
function getVertexDegree(vertexId) {
    if (!graph.vertices.has(vertexId)) {
        return `Вершина з номером ${vertexId} не існує.`;
    }

    if (graph.type === "undirected") {
        // Для неорієнтованого графа степінь — це кількість сусідніх вершин
        return `${graph.adjacencyList.get(vertexId).size}`;
    } else if (graph.type === "directed") {
        // Для орієнтованого графа обчислюємо вхідний та вихідний степінь окремо
        const outDegree = graph.adjacencyList.get(vertexId).size;
        let inDegree = 0;

        for (let neighbors of graph.adjacencyList.values()) {
            if (neighbors.has(vertexId)) inDegree++;
        }

        const totalDegree = inDegree + outDegree;

        return `${totalDegree} Вхідний = ${inDegree}, Вихідний = ${outDegree}`;
    }
}


// Функція для визначення розміру графа (кількість вершин)
function getGraphSize() {
    return graph.vertices.size;
}

// Функція для визначення потужності графа (кількість ребер)
function getGraphPower() {
    return graph.edges.size;
}

function updateToolbar() {
    var graphType = document.getElementById("graphType").value;
    var edgeButton = document.querySelector('button[title="Ребро"]');
    var directedEdgeButton = document.querySelector('button[title="Ребро з напрямком"]');
    const undirectedDropdowns = [
        document.getElementById('undirected-dropdown-size'),
        document.getElementById('undirected-dropdown-power'),
        document.getElementById('undirected-dropdown-degree'),
        document.getElementById('undirected-dropdown-adjacency-matrix'),
        document.getElementById('undirected-dropdown-adjacency-list'),
        document.getElementById('undirected-dropdown-edge-list'),
        document.getElementById('undirected-dropdown-incidence-matrix'),
    ];
    const directedDropdowns = [
        document.getElementById('directed-dropdown-size'),
        document.getElementById('directed-dropdown-power'),
        document.getElementById('directed-dropdown-degree'),
        document.getElementById('directed-dropdown-adjacency-matrix'),
        document.getElementById('directed-dropdown-adjacency-list'),
        document.getElementById('directed-dropdown-edge-list'),
        document.getElementById('directed-dropdown-incidence-matrix'),
    ];
    if (graphType === "directed") {
        graph.type = "directed";
        edgeButton.disabled = true;
        edgeButton.style.color = "grey";
        directedEdgeButton.disabled = false;
        directedEdgeButton.style.color = "initial";
        undirectedDropdowns.forEach(dropdown => {
            dropdown.style.display = 'none';
        });
        directedDropdowns.forEach(dropdown => {
            dropdown.style.display = 'block';
        });
    } else {
        graph.type = "undirected";
        edgeButton.disabled = false;
        edgeButton.style.color = "initial";
        directedEdgeButton.disabled = true;
        directedEdgeButton.style.color = "grey";
        undirectedDropdowns.forEach(dropdown => {
            dropdown.style.display = 'block';
        });
        directedDropdowns.forEach(dropdown => {
            dropdown.style.display = 'none';
        });
    }
}


function blockButtons() {
    const buttons = document.querySelectorAll('button[title="Змінити текст"], button[title="Формат xlsx"], button[title="Обрати"], button[title="Переміщення"]');

    buttons.forEach(button => {
        button.disabled = true; // Робимо кнопки неклікабельними
        button.style.backgroundColor = "#d3d3d3"; // Змінюємо фон на сірий
        button.style.cursor = "not-allowed"; // Змінюємо курсор на заборонений
    });
}

function setActiveButton(button) {
    document.querySelectorAll('.toolbar button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
}

function toggleDropdown(button) {
    let content = button.nextElementSibling;
    content.style.display = content.style.display === "block" ? "none" : "block";
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

function updateTransform() {
    canvasGroup.attr("transform", `scale(${scale})`);
}

// Прив'язка до сітки
function snapToGrid(value) {
    return Math.round(value / gridSize) * gridSize;
}

// Малювання сітки
function drawGrid() {
    const width = 2000;
    const height = 2000;
    canvasGroup.selectAll(".grid-line").remove();

    for (let x = 0; x < width; x += gridSize) {
        canvasGroup.append("line")
            .attr("x1", x).attr("y1", 0)
            .attr("x2", x).attr("y2", height)
            .attr("stroke", "#ddd").attr("stroke-width", 1)
            .attr("class", "grid-line");
    }

    for (let y = 0; y < height; y += gridSize) {
        canvasGroup.append("line")
            .attr("x1", 0).attr("y1", y)
            .attr("x2", width).attr("y2", y)
            .attr("stroke", "#ddd").attr("stroke-width", 1)
            .attr("class", "grid-line");
    }
}

function resetOtherModes(exclude) {
    Object.keys(modes).forEach(mode => {
        if (!exclude.includes(mode)) {
            modes[mode] = false;
        }
    });
    document.querySelectorAll('.toolbar button').forEach(btn => {
        if (!exclude.includes(btn.title.toLowerCase())) {
            btn.classList.remove('active');
        }
    });
}

function resetModes() {
    Object.keys(modes).forEach(mode => modes[mode] = false); // Скидаємо всі режими
    document.querySelectorAll('.toolbar button').forEach(btn => btn.classList.remove('active'));
}

function importFromXLSX(button) {
    if (modes.importFromXLSX) {
        resetModes();
    } else {
        modes.importFromXLSX = true;
        resetOtherModes(["importFromXLSX"]);
        setActiveButton(button);
        // Реалізація імпорту з XLSX
    }
}

function toggleSelectionMode(button) {
    if (modes.save) {
        resetModes();
    } else {
        modes.save = true;
        resetOtherModes(["save"]);
        setActiveButton(button);
    }
}
function toggleMoveMode(button) {
    if (modes.move) {
        resetModes();
    } else {
        modes.move = true;
        resetOtherModes(["move"]);
        setActiveButton(button);
    }
}
function toggleSelectMode(button) {
    if (modes.select) {
        resetModes();
    } else {
        modes.select = true;
        resetOtherModes(["select"]);
        setActiveButton(button);
    }
}
function editTextMode(button) {
    if (modes.editText) {
        resetModes();
    } else {
        modes.editText = true;
        resetOtherModes(["editText"]);
        setActiveButton(button);
    }
}
function toggleLoopMode(button) {
    if (modes.loop) {
        resetModes();
    } else {
        modes.loop = true;
        resetOtherModes(["loop"]);
        setActiveButton(button);
    }
}
function toggleDirectedEdgeMode(button) {
    if (modes.directedEdge) {
        resetModes();
    } else {
        modes.directedEdge = true;
        resetOtherModes(["directedEdge"]);
        setActiveButton(button);
    }
}
function toggleEdgeMode(button) {
    if (modes.edge) {
        resetModes();
    } else {
        modes.edge = true;
        resetOtherModes(["edge"]);
        setActiveButton(button);
    }
}
function toggleVertexMode(button) {
    if (modes.vertex) {
        resetModes();
    } else {
        modes.vertex = true;
        resetOtherModes(["vertex"]);
        setActiveButton(button);
    }
}


d3.select("style").append("style").text(`
    .vertex-label, .edge-label {
        font-size: 14px;
        font-weight: bold;
        fill: black;
        text-shadow: 1px 1px 3px rgba(255, 255, 255, 0.7); /* Тінь для кращої видимості на фоні */
        pointer-events: none; /* Текст не реагує на події мишки */
        background-color: rgba(255, 255, 255, 0.7); /* Білий напівпрозорий фон для контрасту */
        padding: 3px 8px; /* Більші відступи для фону */
        border-radius: 5px; /* Округлі краї фону */
        stroke: #333; /* Обводка тексту для кращої видимості */
        stroke-width: 0.5px; /* Товщина обводки */
        z-index: 10; /* Текст завжди на передньому плані */
    }
    
    .edge-label {
        transform: translate(15px, 0px); /* Зміщення тексту вправо на 10px */
    }
    
        .vertex { cursor: pointer; }
        .vertex.selected { stroke: red; stroke-width: 2px; }
        .edge { stroke: black; stroke-width: 3; }
    `);

function deleteSelected() {
    canvasGroup.selectAll(".vertex, .edge, .edge-label, .vertex-label").remove();
    vertices.clear();
    vertexCount = 1;
    edgeCount = 1;
    modes.vertex = false;
    modes.edge = false;
    selectedVertex = null;
    document.querySelectorAll(".active").forEach(button => button.classList.remove("active"));
    drawGrid();
    // Очищення даних у класі Graph
    graph.vertices.clear(); // Очищаємо множину вершин
    graph.edges.clear(); // Очищаємо карту ребер
    graph.adjacencyList.clear(); // Очищаємо список суміжності
}

function startSelection(event) {
    if (!modes.save) return; // Якщо режим не увімкнено — не працюємо

    if (selectionBox) {
        selectionBox.remove();
    }

    const svg = document.getElementById("canvas");
    const rect = svg.getBoundingClientRect();

    startX = event.clientX - rect.left;
    startY = event.clientY - rect.top;

    selectionBox = document.createElement("div");
    selectionBox.style.position = "absolute";
    selectionBox.style.border = "2px dashed red";
    selectionBox.style.background = "rgba(255, 0, 0, 0.1)";
    selectionBox.style.left = `${startX}px`;
    selectionBox.style.top = `${startY}px`;
    selectionBox.style.width = "0px";
    selectionBox.style.height = "0px";
    selectionBox.style.pointerEvents = "none";
    selectionBox.style.zIndex = "999";

    document.body.appendChild(selectionBox);
    isSelecting = true;
}

function updateSelection(event) {
    if (!isSelecting || !selectionBox) return;

    const svg = document.getElementById("canvas");
    const rect = svg.getBoundingClientRect();

    let currentX = event.clientX - rect.left;
    let currentY = event.clientY - rect.top;

    let width = Math.abs(currentX - startX);
    let height = Math.abs(currentY - startY);

    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
    selectionBox.style.left = `${Math.min(startX, currentX)}px`;
    selectionBox.style.top = `${Math.min(startY, currentY)}px`;
}

function endSelection(event) {
    if (!isSelecting || !modes.save) return;

    isSelecting = false;

    const svg = document.getElementById("canvas");
    const rect = svg.getBoundingClientRect();

    let endX = event.clientX - rect.left;
    let endY = event.clientY - rect.top;

    let minX = Math.min(startX, endX);
    let minY = Math.min(startY, endY);
    let width = Math.abs(endX - startX);
    let height = Math.abs(endY - startY);

    if (width === 0 || height === 0) {
        console.warn("Виділена область занадто мала!");
        return;
    }

    selectionBox.remove(); // Видаляємо рамку
    saveSelectedGraph(minX, minY, width, height);

    modes.save = false;
    document.querySelector(".save-button").classList.remove("active"); // Прибираємо підсвічування кнопки
}

function saveSelectedGraph(minX, minY, width, height) {
    const svgElement = document.getElementById("canvas");
    const clonedSvg = svgElement.cloneNode(true);
    clonedSvg.setAttribute("width", width);
    clonedSvg.setAttribute("height", height);
    clonedSvg.setAttribute("viewBox", `${minX} ${minY} ${width} ${height}`);

    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = function () {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "white"; // Білий фон
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);

        // Завантаження файлу
        const link = document.createElement("a");
        link.href = canvas.toDataURL("image/png");
        link.download = "selected_graph.png";
        link.click();
    };

    img.src = url;
}

// Додаємо слухачі подій
document.getElementById("canvas").addEventListener("mousedown", startSelection);
document.addEventListener("mousemove", updateSelection);
document.addEventListener("mouseup", endSelection);
