// Функція для динамічного завантаження питань з файлу
async function loadQuestionsFromFile(filePath, containerId, formId, resultId) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error('Не вдалося завантажити файл');
        }
        const questions = await response.json();

        // Додавання питань у контейнер
        const container = document.getElementById(containerId);
        questions.forEach((questionData, index) => {
            const questionElement = createQuestion(questionData, index + 1);
            container.appendChild(questionElement);
        });

        // Обробка відправки форми
        document.getElementById(formId).addEventListener('submit', function (e) {
            e.preventDefault();
            const formData = new FormData(this);
            let score = 0;

            questions.forEach((questionData, index) => {
                const selectedAnswer = formData.get(`question${index + 1}`);
                if (selectedAnswer === questionData.correct) {
                    score++;
                }
            });

            const result = document.getElementById(resultId);
            result.textContent = `Ваш результат: ${score} з ${questions.length}`;
        });
    } catch (error) {
        console.error('Помилка:', error);
    }
}

// Функція для створення HTML для кожного питання
function createQuestion(questionData, index) {
    const questionDiv = document.createElement('div');
    questionDiv.classList.add('test-question');

    const questionText = document.createElement('p');
    questionText.textContent = questionData.question;
    questionDiv.appendChild(questionText);

    const optionsDiv = document.createElement('div');
    optionsDiv.classList.add('options');

    questionData.options.forEach((option, i) => {
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = `question${index}`;
        input.value = String.fromCharCode(97 + i); // a, b, c...
        label.appendChild(input);
        label.appendChild(document.createTextNode(option));
        optionsDiv.appendChild(label);
    });

    questionDiv.appendChild(optionsDiv);
    return questionDiv;
}

// Функція для перевірки, чи вибрано хоча б одне питання
function checkAnswersSelected(form) {
    const inputs = form.querySelectorAll('input[type="radio"]');
    const submitButton = form.querySelector('.submit-btn');
    
    // Перевірка, чи хоча б один варіант відповіді вибраний
    const isAnyChecked = Array.from(inputs).some(input => input.checked);

    // Якщо вибрано хоча б одну відповідь, додаємо клас 'active' до кнопки
    if (isAnyChecked) {
        submitButton.classList.add('active');
    } else {
        submitButton.classList.remove('active');
    }
}

// Додаємо слухачів подій для кожної форми за допомогою делегування подій
document.addEventListener('change', function(event) {
    // Перевірка, чи подія стосується вибору радіо-кнопки всередині форми
    if (event.target && event.target.type === 'radio' && event.target.closest('form')) {
        const form = event.target.closest('form');
        checkAnswersSelected(form);
    }
});
