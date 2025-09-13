document.addEventListener('DOMContentLoaded', () => {
    const languageSwitch = document.getElementById('language-switch');

    // Function to apply translations
    function applyTranslations(lang) {
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            if (translations[lang] && translations[lang][key]) {
                element.textContent = translations[lang][key];
            }
        });
        // Update the lang attribute of the html tag
        document.documentElement.lang = lang;
        // The title element's data-translate attribute should be handled by the general loop.
        // No special handling needed here.
    }

    // Load saved language preference or default to 'en'
    let currentLang = localStorage.getItem('lang') || 'en';

    // Set initial state of the switch
    if (languageSwitch) {
        languageSwitch.checked = (currentLang === 'es');
    }

    // Apply initial translations
    applyTranslations(currentLang);

    // Add event listener for the language switch
    if (languageSwitch) {
        languageSwitch.addEventListener('change', (event) => {
            currentLang = event.target.checked ? 'es' : 'en';
            localStorage.setItem('lang', currentLang);
            applyTranslations(currentLang);
        });
    }
});
