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
        .attr("cx", x).attr("cy", y).attr("r", 20)
        .attr("fill", "black").attr("class", "vertex")
        .style("cursor", "pointer");

    canvasGroup.append("text")
        .attr("x", x).attr("y", y)
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

function createLoop(vertexID) {
    const [x, y] = vertices.get(vertexID); // Отримуємо координати вершини
    const radius = 30; // Радіус петлі
    const offsetY = 20; // Зміщення петлі вгору на 20 пікселів
    const offsetX = 25; // Зміщення вправо на 20 пікселів

    // Створюємо патерн для малювання петлі
    // Перша дуга (верхня частина) з 0 до 180 градусів
    // Друга дуга (нижня права частина) з 180 до 360 градусів
    const loopPath = `M ${x - radius + offsetX} ${y - offsetY} 
                      A ${radius} ${radius} 0 0 1 ${x + radius + offsetX} ${y - offsetY}
                      A ${radius} ${radius} 0 0 1 ${x + 17} ${y + 10}`;

    // Додаємо саму петлю з класом для стилізації
    canvasGroup.append("path")
        .attr("d", loopPath)
        .attr("class", "edge-loop");

    // Додаємо текст з індикацією петлі, зміщений вгору
    canvasGroup.append("text")
        .attr("x", x + offsetX) // Зміщуємо текст вправо
        .attr("y", y - radius - offsetY - 10)  // Зміщуємо текст вгору
        .attr("text-anchor", "middle")
        .text(String.fromCharCode(96 + edgeCount++))
        .attr("class", "edge-label");

    // Додаємо петлю в граф
    graph.addEdge(vertexID, vertexID);
}




function createEdge(v1, v2) {
    if (!vertices.has(v1) || !vertices.has(v2)) return;
    const [x1, y1] = vertices.get(v1);
    const [x2, y2] = vertices.get(v2);
    const offset = 20;
    const dx = x2 - x1, dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const unitX = dx / length, unitY = dy / length;
    const adjustedX1 = x1 + unitX * offset, adjustedY1 = y1 + unitY * offset;
    const adjustedX2 = x2 - unitX * offset, adjustedY2 = y2 - unitY * offset;

    canvasGroup.append("line")
        .attr("x1", adjustedX1).attr("y1", adjustedY1)
        .attr("x2", adjustedX2).attr("y2", adjustedY2)
        .attr("stroke", "black").attr("stroke-width", 3).attr("class", "edge");

    canvasGroup.append("text")
        .attr("x", (adjustedX1 + adjustedX2) / 2).attr("y", (adjustedY1 + adjustedY2) / 2 - 10)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .text(String.fromCharCode(96 + edgeCount++)).attr("class", "edge-label");

    graph.addEdge(v1, v2);
}

function createDirectedEdge(v1, v2) {
    const [x1, y1] = vertices.get(v1);
    const [x2, y2] = vertices.get(v2);
    const offset = 20, arrowOffset = 5;
    const dx = x2 - x1, dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    const unitX = dx / length, unitY = dy / length;
    const adjustedX1 = x1 + unitX * offset, adjustedY1 = y1 + unitY * offset;
    const adjustedX2 = x2 - unitX * (offset + arrowOffset), adjustedY2 = y2 - unitY * (offset + arrowOffset);

    canvasGroup.append("defs").append("marker")
        .attr("id", "arrowhead").attr("viewBox", "0 0 10 10")
        .attr("refX", 8).attr("refY", 5).attr("markerWidth", 6)
        .attr("markerHeight", 6).attr("orient", "auto")
        .append("path").attr("d", "M0,0 L10,5 L0,10 Z").attr("fill", "black");

    canvasGroup.append("line")
        .attr("x1", adjustedX1).attr("y1", adjustedY1)
        .attr("x2", adjustedX2).attr("y2", adjustedY2)
        .attr("stroke", "black").attr("stroke-width", 3).attr("class", "edge")
        .attr("marker-end", "url(#arrowhead)");

    canvasGroup.append("text")
        .attr("x", (adjustedX1 + adjustedX2) / 2).attr("y", (adjustedY1 + adjustedY2) / 2 - 10)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .text(String.fromCharCode(96 + edgeCount++)).attr("class", "edge-label");

    graph.addEdge(v1, v2);
}


// Функція для виконання операцій за запитом
function executeFunction(functionName) {
    let result = null;

    if (functionName === 'undirected-size') {
        result = getGraphSize();
        document.getElementById("undirected-size-result").textContent = `Розмір графа (кількість вершин): ${result}`;
    } else if (functionName === 'directed-size') {
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
    } else if (functionName === 'undirected-distance-matrix') {
        result = getDistanceMatrix();
        displayDistanceMatrix(result, graph.type);
    } else if (functionName === 'directed-distance-matrix') {
        result = getDistanceMatrix();
        displayDistanceMatrix(result, graph.type);
    } else if (functionName === 'undirected-eccentricities-vertices') {
        result = getEccentricitiesVertices();
        displayEccentricitiesVertices(result, graph.type);
    } else if (functionName === 'directed-eccentricities-vertices') {
        result = getEccentricitiesVertices();
        displayEccentricitiesVertices(result, graph.type);
    } else if (functionName === 'undirected-radius-graph') {
        result = getRadiusGraph();
        displayRadiusGraph(result, graph.type);
    } else if (functionName === 'directed-radius-graph') {
        result = getRadiusGraph();
        displayRadiusGraph(result, graph.type);
    } else if (functionName === 'undirected-diameter-graph') {
        result = getDiameterGraph();
        displayDiameterGraph(result, graph.type);
    } else if (functionName === 'directed-diameter-graph') {
        result = getDiameterGraph();
        displayDiameterGraph(result, graph.type);
    } else if (functionName === 'undirected-center-graph') {
        result = getCenterGraph();
        displayCenterGraph(result, graph.type);
    } else if (functionName === 'directed-center-graph') {
        result = getCenterGraph();
        displayCenterGraph(result, graph.type);
    } else if (functionName === 'undirected-cyclomatic-number') {
        result = getCyclomaticNumber(graph);
        displayCyclomaticNumber(result, graph.type);
    } else if (functionName === 'directed-cyclomatic-number') {
        result = getCyclomaticNumber(graph);
        displayCyclomaticNumber(result, graph.type);
    }
}
// Алгоритм DFS для пошуку компонент зв'язності
function getConnectedComponents(graph) {
    let visited = new Set();
    let components = 0;

    const dfs = (vertex) => {
        visited.add(vertex);
        for (let neighbor of graph.adjacencyList.get(vertex)) {
            if (!visited.has(neighbor)) {
                dfs(neighbor);
            }
        }
    };

    // Проходимо по всіх вершинах
    for (let vertex of graph.vertices) {
        if (!visited.has(vertex)) {
            dfs(vertex);
            components++;
        }
    }

    return components;
}

// Функція для обчислення цикломатичного числа
function getCyclomaticNumber(graph) {
    const verticesCount = graph.vertices.size;
    const edgesCount = graph.edges.size;
    const components = getConnectedComponents(graph);

    // Цикломатичне число: E - V + P
    return edgesCount - verticesCount + components;
}
// Функція для відображення цикломатичного числа
function displayCyclomaticNumber(result, graphType) {
    let resultElement;

    if (graphType === "directed") {
        resultElement = document.getElementById("directed-cyclomatic-number-result");
    } else if (graphType === "undirected") {
        resultElement = document.getElementById("undirected-cyclomatic-number-result");
    } else {
        console.error("Невідомий тип графа");
        return;
    }

    // Очищуємо попередній вміст
    resultElement.innerHTML = "";

    // Виводимо результат
    const resultText = document.createElement("p");
    resultText.textContent = `Цикломатичне число графа: ${result}`;
    resultElement.appendChild(resultText);
}
function getCenterGraph() {
    const eccentricities = getEccentricitiesVertices(); // Отримуємо ексцентриситети для всіх вершин
    const radius = getRadiusGraph(); // Отримуємо радіус графа

    if (radius === "Граф не з'єднаний") {
        return "Граф не з'єднаний";
    }

    // Фільтруємо вершини, ексцентриситет яких дорівнює радіусу
    const centerVertices = Object.entries(eccentricities)
        .filter(([vertex, eccentricity]) => eccentricity == radius)
        .map(([vertex]) => vertex);

    if (centerVertices.length === 0) {
        return "Центр не знайдений";
    }

    return centerVertices;
}

function displayCenterGraph(result, graphType) {
    let resultElement;

    if (graphType === "directed") {
        resultElement = document.getElementById("directed-center-graph-result");
    } else if (graphType === "undirected") {
        resultElement = document.getElementById("undirected-center-graph-result");
    } else {
        console.error("Невідомий тип графа");
        return;
    }

    // Очищуємо попередній вміст
    resultElement.innerHTML = "";

    // Виводимо результат
    const resultText = document.createElement("p");
    if (Array.isArray(result)) {
        resultText.textContent = `Центр графа: ${result.join(", ")}`;
    } else {
        resultText.textContent = result; // Якщо центр не знайдено або граф не з'єднаний
    }
    resultElement.appendChild(resultText);
}

function getDiameterGraph() {
    const eccentricities = getEccentricitiesVertices(); // Отримуємо ексцентриситети для всіх вершин
    const eccentricityValues = Object.values(eccentricities);

    // Фільтруємо значення "∞" (ізольовані вершини), оскільки вони не враховуються для діаметра
    const finiteEccentricities = eccentricityValues.filter(ecc => ecc !== "∞");

    // Якщо всі ексцентриситети "∞", це означає, що граф не з'єднаний, діаметр неможливий
    if (finiteEccentricities.length === 0) {
        return "Граф не з'єднаний";
    }

    // Знаходимо максимальний ексцентриситет
    const diameter = Math.max(...finiteEccentricities);
    return diameter;
}

function displayDiameterGraph(result, graphType) {
    let resultElement;

    if (graphType === "directed") {
        resultElement = document.getElementById("directed-diameter-graph-result");
    } else if (graphType === "undirected") {
        resultElement = document.getElementById("undirected-diameter-graph-result");
    } else {
        console.error("Невідомий тип графа");
        return;
    }

    // Очищуємо попередній вміст
    resultElement.innerHTML = "";

    // Виводимо результат
    const resultText = document.createElement("p");
    resultText.textContent = `Діаметр графа: ${result}`;
    resultElement.appendChild(resultText);
}

function getRadiusGraph() {
    const eccentricities = getEccentricitiesVertices(); // Отримуємо ексцентриситети для всіх вершин
    const eccentricityValues = Object.values(eccentricities);

    // Фільтруємо значення "∞" (ізольовані вершини), оскільки вони не враховуються для радіусу
    const finiteEccentricities = eccentricityValues.filter(ecc => ecc !== "∞");

    // Якщо всі ексцентриситети "∞", це означає, що граф не з'єднаний, радіус неможливий
    if (finiteEccentricities.length === 0) {
        return "Граф не з'єднаний";
    }

    // Знаходимо мінімальний ексцентриситет
    const radius = Math.min(...finiteEccentricities);
    return radius;
}

function displayRadiusGraph(result, graphType) {
    let resultElement;

    if (graphType === "directed") {
        resultElement = document.getElementById("directed-radius-graph-result");
    } else if (graphType === "undirected") {
        resultElement = document.getElementById("undirected-radius-graph-result");
    } else {
        console.error("Невідомий тип графа");
        return;
    }

    // Очищуємо попередній вміст
    resultElement.innerHTML = "";

    // Виводимо результат
    const resultText = document.createElement("p");
    resultText.textContent = `Радіус графа: ${result}`;
    resultElement.appendChild(resultText);
}

function getEccentricitiesVertices() {
    const distanceMatrix = getDistanceMatrix(); // Отримуємо матрицю відстаней
    const size = distanceMatrix.length;
    const eccentricities = {};

    // Перебираємо всі вершини
    Array.from(graph.vertices).forEach((vertex, i) => {
        let maxDistance = -Infinity;

        // Знаходимо максимальну відстань від поточної вершини до інших
        for (let j = 0; j < size; j++) {
            if (i !== j && distanceMatrix[i][j] !== Infinity) {
                maxDistance = Math.max(maxDistance, distanceMatrix[i][j]);
            }
        }

        // Якщо вершина ізольована (не має шляхів), ексцентриситет ∞
        eccentricities[vertex] = maxDistance === -Infinity ? "∞" : maxDistance;
    });

    return eccentricities;
}

// Функція для відображення ексцентриситетів вершин
function displayEccentricitiesVertices(eccentricities, graphType) {
    let resultElement;

    if (graphType === "directed") {
        resultElement = document.getElementById("directed-eccentricities-vertices-result");
    } else if (graphType === "undirected") {
        resultElement = document.getElementById("undirected-eccentricities-vertices-result");
    } else {
        console.error("Невідомий тип графа");
        return;
    }

    // Очищуємо попередній вміст
    resultElement.innerHTML = "";

    if (!eccentricities || Object.keys(eccentricities).length === 0) {
        resultElement.textContent = "Дані відсутні або граф порожній.";
        return;
    }

    // Створюємо таблицю
    const table = document.createElement("table");
    table.style.borderCollapse = "collapse";

    // Заголовок таблиці
    const headerRow = document.createElement("tr");

    const thVertex = document.createElement("th");
    thVertex.textContent = "Вершина";
    thVertex.style.border = "1px solid black";
    thVertex.style.padding = "5px";
    headerRow.appendChild(thVertex);

    const thEccentricity = document.createElement("th");
    thEccentricity.textContent = "Ексцентриситет";
    thEccentricity.style.border = "1px solid black";
    thEccentricity.style.padding = "5px";
    headerRow.appendChild(thEccentricity);

    table.appendChild(headerRow);

    // Додаємо рядки з даними
    for (const [vertex, eccentricity] of Object.entries(eccentricities)) {
        const row = document.createElement("tr");

        const tdVertex = document.createElement("td");
        tdVertex.textContent = vertex;
        tdVertex.style.border = "1px solid black";
        tdVertex.style.padding = "5px";
        row.appendChild(tdVertex);

        const tdEccentricity = document.createElement("td");
        tdEccentricity.textContent = eccentricity;
        tdEccentricity.style.border = "1px solid black";
        tdEccentricity.style.padding = "5px";
        row.appendChild(tdEccentricity);

        table.appendChild(row);
    }

    resultElement.appendChild(table);
}


// Функція для отримання матриці відстаней у неваговому графі
function getDistanceMatrix() {
    const verticesArray = [...graph.vertices]; // Масив вершин
    const edgesArray = getEdgeList(); // Список ребер
    const size = verticesArray.length;
    const matrix = Array.from({ length: size }, () => Array(size).fill(Infinity));

    // Відстань від вершини до самої себе = 0
    for (let i = 0; i < size; i++) {
        matrix[i][i] = 0;
    }

    // Заповнюємо матрицю суміжності (відстань між сусідніми вершинами = 1)
    edgesArray.forEach(([v1, v2]) => {
        const i = verticesArray.indexOf(v1);
        const j = verticesArray.indexOf(v2);
        matrix[i][j] = 1;

        if (graph.type === "undirected") {
            matrix[j][i] = 1; // Для неорієнтованого графа відстань симетрична
        }
    });

    // Алгоритм Флойда-Воршалла для знаходження найкоротших шляхів між усіма вершинами
    for (let k = 0; k < size; k++) {
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (matrix[i][k] !== Infinity && matrix[k][j] !== Infinity) {
                    matrix[i][j] = Math.min(matrix[i][j], matrix[i][k] + matrix[k][j]);
                }
            }
        }
    }

    return matrix;
}

// Функція для відображення матриці відстаней
function displayDistanceMatrix(matrix, type) {
    let resultElement;  // Оголошуємо змінну resultElement поза умовами

    if (type === "directed") {
        resultElement = document.getElementById("directed-distance-matrix-result");
    } else if (type === "undirected") {
        resultElement = document.getElementById("undirected-distance-matrix-result");
    } else {
        console.error("Невідомий тип графа");
        return;
    }

    // Очистити старий результат
    resultElement.innerHTML = "";

    if (!matrix || matrix.length === 0) {
        resultElement.textContent = "Матриця порожня або некоректні дані.";
        return;
    }

    const table = document.createElement("table");
    table.style.borderCollapse = "collapse";

    // Заголовок таблиці (номери вершин)
    const headerRow = document.createElement("tr");
    headerRow.appendChild(document.createElement("th")); // Порожня клітинка для верхнього лівого кута

    for (let i = 0; i < matrix.length; i++) {
        const th = document.createElement("th");
        th.textContent = `В${i + 1}`;
        th.style.border = "1px solid black";
        th.style.padding = "5px";
        headerRow.appendChild(th);
    }

    table.appendChild(headerRow);

    // Додавання рядків
    for (let i = 0; i < matrix.length; i++) {
        const tr = document.createElement("tr");

        // Назва вершини (номер рядка)
        const th = document.createElement("th");
        th.textContent = `В${i + 1}`;
        th.style.border = "1px solid black";
        th.style.padding = "5px";
        tr.appendChild(th);

        // Заповнення значень матриці
        for (let j = 0; j < matrix[i].length; j++) {
            const td = document.createElement("td");
            td.textContent = matrix[i][j] === Infinity ? "∞" : matrix[i][j]; // Заміна Infinity на "∞"
            td.style.border = "1px solid black";
            td.style.padding = "5px";
            tr.appendChild(td);
        }

        table.appendChild(tr);
    }

    resultElement.appendChild(table);
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

        return `${totalDegree}; Вхідний = ${inDegree}, Вихідний = ${outDegree}`;
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
        document.getElementById('undirected-dropdown-distance-matrix'),
        document.getElementById('undirected-dropdown-eccentricities-vertices'),
        document.getElementById('undirected-dropdown-radius-graph'),
        document.getElementById('undirected-dropdown-diameter-graph'),
        document.getElementById('undirected-dropdown-center-graph'),
        document.getElementById('undirected-dropdown-cyclomatic-number'),
    ];
    const directedDropdowns = [
        document.getElementById('directed-dropdown-size'),
        document.getElementById('directed-dropdown-power'),
        document.getElementById('directed-dropdown-degree'),
        document.getElementById('directed-dropdown-adjacency-matrix'),
        document.getElementById('directed-dropdown-adjacency-list'),
        document.getElementById('directed-dropdown-edge-list'),
        document.getElementById('directed-dropdown-incidence-matrix'),
        document.getElementById('directed-dropdown-distance-matrix'),
        document.getElementById('directed-dropdown-eccentricities-vertices'),
        document.getElementById('directed-dropdown-radius-graph'),
        document.getElementById('directed-dropdown-diameter-graph'),
        document.getElementById('directed-dropdown-center-graph'),
        document.getElementById('directed-dropdown-cyclomatic-number'),
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

d3.select("head").append("style").attr("type", "text/css").text(`
    .vertex {
        fill: white; /* Білий колір заливки */
        stroke: black; /* Чорний контур */
        stroke-width: 2px; /* Товщина контуру */
        cursor: pointer;
        r: 20px; /* Збільшений розмір вершини */
    }
    
    .vertex.selected {
        stroke: red;
        stroke-width: 2px;
    }
    
    .edge {
        stroke: black;
        stroke-width: 3;
    }
    
    .vertex-label {
        font-size: 14px;
        font-weight: bold;
        fill: black;
        text-anchor: middle;
        dominant-baseline: central; /* Вирівнювання тексту по центру */
        pointer-events: none; /* Текст не реагує на події мишки */
    }
    
    .edge-label {
        font-size: 14px;
        font-weight: bold;
        fill: black;
        pointer-events: none;
        transform: translate(15px, 0px); /* Зміщення тексту вправо */
    }
        .edge-loop {
    stroke: black;
    stroke-width: 3;
    fill: none;
}
`);

function deleteSelected() {
    canvasGroup.selectAll(".vertex, .edge, .edge-label, .vertex-label, .edge-loop").remove();
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
