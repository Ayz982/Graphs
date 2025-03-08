/*=============== SHOW MENU ===============*/
const showMenu = (toggleId, navId) => {
    const toggle = document.getElementById(toggleId),
          nav = document.getElementById(navId);

    if (toggle && nav) {
        toggle.addEventListener('click', () => {
            nav.classList.toggle('show-menu');
            toggle.classList.toggle('show-icon');
        });
    }
};
showMenu('nav-toggle', 'nav-menu');

/*=============== CLOSE MENU ON LINK CLICK ===============*/
document.querySelectorAll(".nav__link").forEach((link) => {
    link.addEventListener("click", (event) => {
        const parentItem = link.parentElement;

        // Перевіряємо, чи це dropdown-елемент (має підменю)
        if (parentItem.classList.contains("dropdown__item")) {
            // Додаємо/знімаємо клас відкриття dropdown
            parentItem.classList.toggle("dropdown-open");
        } else {
            // Закриваємо меню при кліку на звичайне посилання
            const nav = document.getElementById("nav-menu");
            const toggle = document.getElementById("nav-toggle");

            if (nav.classList.contains("show-menu")) {
                nav.classList.remove("show-menu");
                toggle.classList.remove("show-icon");
            }
        }
    });
});

/*=============== FIXED MENU ON RESIZE ===============*/
window.addEventListener("resize", () => {
    if (window.innerWidth >= 992) {
        const nav = document.getElementById("nav-menu");
        if (nav.classList.contains("show-menu")) {
            nav.classList.remove("show-menu");
        }
    }
});
