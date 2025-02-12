let scale = 1;
const canvasGroup = d3.select("#canvas-group");
let offsetX = 0, offsetY = 0;
let vertexCount = 1;
let selectedVertex = null;
let edgeCount = 1;

const gridSize = 50;
const modes = {
    vertex: false,
    edge: false,
    save: false,
    move: false,
    loop: false,
};

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

drawGrid();

// Функція для перемикання режиму петлі
function toggleLoopMode(button) {
    if (modes.loop) {
        resetModes();
    } else {
        modes.loop = true;
        modes.vertex = false;
        modes.edge = false;
        modes.save = false;
        modes.move = false;
        setActiveButton(button);
    }
}

function toggleMoveMode(button) {
    if (modes.move) {
        resetModes();
    } else {
        modes.move = true;
        modes.vertex = false;
        modes.edge = false;
        modes.save = false;
        modes.loop = false;
        setActiveButton(button);
    }
}

function toggleVertexMode(button) {
    if (modes.vertex) {
        resetModes();
    } else {
        modes.vertex = true;
        modes.edge = false;
        modes.save = false;
        modes.move = false;
        modes.loop = false;
        setActiveButton(button);
    }
}

function toggleEdgeMode(button) {
    if (modes.edge) {
        resetModes();
    } else {
        modes.vertex = false;
        modes.edge = true;
        modes.save = false;
        modes.move = false;
        modes.loop = false;
        setActiveButton(button);
    }
}

function toggleSelectionMode(button) {
    if (modes.save) {
        resetModes();
    } else {
        modes.save = true;
        modes.edge = false;
        modes.vertex = false;
        modes.move = false;
        modes.loop = false;
        setActiveButton(button);
    }
}

function setActiveButton(button) {
    document.querySelectorAll('.toolbar button').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
}

function resetModes() {
    modes.vertex = false;
    modes.edge = false;
    modes.save = false;
    modes.move = false;
    modes.loop = false;
    document.querySelectorAll('.toolbar button').forEach(btn => btn.classList.remove('active'));
}


// Масив для збереження координат вершин
const vertices = new Map();

d3.select("#canvas").on("click", function (event) {
    const [mouseX, mouseY] = d3.pointer(event, this);

    // Компенсація масштабування
    const transformedX = snapToGrid(mouseX / scale);
    const transformedY = snapToGrid(mouseY / scale);

    if (modes.vertex) {
        if (![...vertices.values()].some(([vx, vy]) => vx === transformedX && vy === transformedY)) {
            createVertex(transformedX, transformedY);
        }
    } else if (modes.edge) {
        const clickedVertex = getVertexAt(transformedX, transformedY);
        if (clickedVertex) {
            if (!selectedVertex) {
                selectedVertex = clickedVertex;
                d3.select(clickedVertex.element).classed("selected", true);
            } else if (selectedVertex !== clickedVertex) {
                createEdge(selectedVertex, clickedVertex);
                d3.select(selectedVertex.element).classed("selected", false);
                selectedVertex = null;
            }
        }
    }
});

function createVertex(x, y) {
    const vertex = canvasGroup.append("circle")
        .attr("cx", x).attr("cy", y)
        .attr("r", 15)
        .attr("fill", "black")
        .attr("class", "vertex")
        .style("cursor", "pointer");

    canvasGroup.append("text")
        .attr("x", x).attr("y", y - 20)
        .attr("text-anchor", "middle")
        .text(vertexCount++)
        .attr("class", "vertex-label");

    vertices.set(vertex.node(), [x, y]);
}

function getVertexAt(x, y) {
    for (const [element, [vx, vy]] of vertices) {
        if (vx === x && vy === y) return { element, x: vx, y: vy };
    }
    return null;
}

function createEdge(v1, v2) {
    canvasGroup.append("line")
        .attr("x1", v1.x).attr("y1", v1.y)
        .attr("x2", v2.x).attr("y2", v2.y)
        .attr("stroke", "black").attr("stroke-width", 3)
        .attr("class", "edge");

    canvasGroup.append("text")
        .attr("x", (v1.x + v2.x) / 2)
        .attr("y", (v1.y + v2.y) / 2 - 10)
        .attr("text-anchor", "middle")
        .text(String.fromCharCode(96 + edgeCount++))
        .attr("class", "edge-label");
}

d3.select("style").append("style").text(`
    .vertex-label, .edge-label {
        font-size: 14px;
        font-weight: bold;
        fill: black;
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
}
let isSelecting = false;
let selectionBox = null;
let startX = 0, startY = 0;

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
