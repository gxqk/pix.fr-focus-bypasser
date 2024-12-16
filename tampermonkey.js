// ==UserScript==
// @name         Pix Focus Override
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Désactive les systèmes de surveillance de focus sur Pix
// @author       Skyflizz
// @match        https://app.pix.fr/*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    // État initial
    let isEnabled = GM_getValue('pixOverrideEnabled', true);
    let isDarkMode = GM_getValue('pixOverrideDarkMode', false);
    let originalFunctions = {};
    let styleElement = null;
    let uiElement = null;
    let uiStyleElement = null;

    // Fonction pour générer les styles UI en fonction du thème
    function generateUIStyles(darkMode) {
        return `
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap');

        .pix-override-ui {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${darkMode ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
            backdrop-filter: blur(10px);
            padding: 15px 20px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            z-index: 9999;
            font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
            transition: all 0.3s ease;
            display: flex;
            align-items: center;
            gap: 12px;
            border: 1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'};
        }
        .pix-override-ui:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 25px rgba(0, 0, 0, 0.12);
        }
        .pix-override-toggle {
            position: relative;
            width: 50px;
            height: 26px;
            background: #e0e0e0;
            border-radius: 13px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .pix-override-toggle.active {
            background: #4CAF50;
        }
        .pix-override-toggle::after {
            content: '';
            position: absolute;
            top: 3px;
            left: 3px;
            width: 20px;
            height: 20px;
            background: white;
            border-radius: 50%;
            transition: all 0.3s ease;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        }
        .pix-override-toggle.active::after {
            transform: translateX(24px);
        }
        .pix-override-status {
            font-size: 14px;
            font-weight: 500;
            color: ${darkMode ? '#fff' : '#333'};
            user-select: none;
        }
        .pix-override-title {
            font-size: 12px;
            font-weight: 600;
            color: ${darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)'};
            margin: 0;
            padding: 0;
            letter-spacing: 0.5px;
        }
        .pix-override-controls {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .pix-override-theme {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: ${darkMode ? '#fff' : '#000'};
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            color: ${darkMode ? '#000' : '#fff'};
            transition: all 0.2s ease;
        }
        .pix-override-theme:hover {
            transform: scale(1.1);
        }
        .pix-override-minimize {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: ${darkMode ? 'rgba(255, 255, 255, 0.1)' : '#f0f0f0'};
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            color: ${darkMode ? '#fff' : '#666'};
            transition: all 0.2s ease;
        }
        .pix-override-minimize:hover {
            background: ${darkMode ? 'rgba(255, 255, 255, 0.2)' : '#e0e0e0'};
        }
        .pix-override-ui.minimized {
            padding: 10px;
            border-radius: 50%;
        }
        .pix-override-ui.minimized .pix-override-status,
        .pix-override-ui.minimized .pix-override-toggle,
        .pix-override-ui.minimized .pix-override-title {
            display: none;
        }
    `;
    }

    const overrideStyles = `
        .challenge-statement__out-of-focus-border {
            display: none !important;
        }
        .assessment-banner__out-of-focus {
            display: none !important;
        }
    `;

    // Fonction pour mettre à jour le thème
    function updateTheme(darkMode) {
        // Supprimer les anciens éléments
        if (uiStyleElement) {
            uiStyleElement.remove();
        }
        if (uiElement) {
            const wasMinimized = uiElement.classList.contains('minimized');
            uiElement.remove();

            // Recréer avec le nouveau thème
            createUI();

            // Restaurer l'état minimisé si nécessaire
            if (wasMinimized) {
                const newUI = document.querySelector('.pix-override-ui');
                const minimizeBtn = newUI.querySelector('.pix-override-minimize');
                newUI.classList.add('minimized');
                minimizeBtn.textContent = '+';
            }
        }
    }

    // Création de l'interface
    function createUI() {
        // Styles de l'interface
        uiStyleElement = document.createElement('style');
        uiStyleElement.textContent = generateUIStyles(isDarkMode);
        document.head.appendChild(uiStyleElement);

        uiElement = document.createElement('div');
        uiElement.className = 'pix-override-ui';
        uiElement.innerHTML = `
            <div>
                <div class="pix-override-title">Focus Bypass par Skyflizz</div>
                <div class="pix-override-status">${isEnabled ? 'Protection activée' : 'Protection désactivée'}</div>
            </div>
            <div class="pix-override-toggle ${isEnabled ? 'active' : ''}"></div>
            <div class="pix-override-controls">
                <button class="pix-override-theme">${isDarkMode ? '☀️' : '🌙'}</button>
                <button class="pix-override-minimize">_</button>
            </div>
        `;
        document.body.appendChild(uiElement);

        // Gestion des événements
        const toggle = uiElement.querySelector('.pix-override-toggle');
        const status = uiElement.querySelector('.pix-override-status');
        const minimize = uiElement.querySelector('.pix-override-minimize');
        const themeToggle = uiElement.querySelector('.pix-override-theme');

        toggle.addEventListener('click', () => {
            isEnabled = !isEnabled;
            GM_setValue('pixOverrideEnabled', isEnabled);
            toggle.classList.toggle('active');
            status.textContent = isEnabled ? 'Protection activée' : 'Protection désactivée';
            toggleOverride(isEnabled);
        });

        minimize.addEventListener('click', () => {
            uiElement.classList.toggle('minimized');
            minimize.textContent = uiElement.classList.contains('minimized') ? '+' : '_';
        });

        themeToggle.addEventListener('click', () => {
            isDarkMode = !isDarkMode;
            GM_setValue('pixOverrideDarkMode', isDarkMode);
            updateTheme(isDarkMode);
        });
    }

    // Fonctions de surcharge
    function applyOverride() {
        // Sauvegarde des fonctions originales si pas déjà fait
        if (!originalFunctions.hasFocus) {
            originalFunctions.hasFocus = document.hasFocus;
            originalFunctions.addEventListener = EventTarget.prototype.addEventListener;
            originalFunctions.blur = window.blur;
            originalFunctions.CustomEvent = window.CustomEvent;
        }

        // Surcharge de document.hasFocus
        document.hasFocus = function() {
            return true;
        };

        // Empêcher la création des écouteurs d'événements de focus
        EventTarget.prototype.addEventListener = function(type, listener, options) {
            if (type === 'blur' || type === 'focusout' || type === 'focusedout') {
                return;
            }
            return originalFunctions.addEventListener.call(this, type, listener, options);
        };

        // Surcharge de window.blur
        window.blur = function() {
            return null;
        };

        // Surcharge de CustomEvent
        window.CustomEvent = function(type, eventInitDict) {
            if (type === 'focusedout') {
                return null;
            }
            return new originalFunctions.CustomEvent(type, eventInitDict);
        };

        // Nettoyer le localStorage
        const keysToClean = [
            'hasConfirmedFocusChallengeScreen',
            'focusState',
            'lastQuestionState'
        ];
        keysToClean.forEach(key => localStorage.removeItem(key));

        // Ajouter les styles d'override
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.textContent = overrideStyles;
            document.head.appendChild(styleElement);
        }

        // Désactiver les intervalles
        clearFocusIntervals();
    }

    // Fonction pour restaurer les fonctions originales
    function removeOverride() {
        if (originalFunctions.hasFocus) {
            document.hasFocus = originalFunctions.hasFocus;
            EventTarget.prototype.addEventListener = originalFunctions.addEventListener;
            window.blur = originalFunctions.blur;
            window.CustomEvent = originalFunctions.CustomEvent;

            // Réinitialiser les fonctions sauvegardées
            originalFunctions = {};
        }

        // Supprimer les styles d'override
        if (styleElement) {
            styleElement.remove();
            styleElement = null;
        }

        // Restaurer le localStorage si nécessaire
        localStorage.removeItem('hasConfirmedFocusChallengeScreen');
    }

    // Fonction pour désactiver les intervalles
    function clearFocusIntervals() {
        const intervals = window.setInterval(() => {}, 100000);
        for(let i = 0; i < intervals; i++) {
            window.clearInterval(i);
        }
    }

    // Fonction pour basculer l'état
    function toggleOverride(enabled) {
        if (enabled) {
            applyOverride();
        } else {
            removeOverride();
        }
    }

    // Initialisation
    createUI();
    if (isEnabled) {
        applyOverride();
    }

    // Nettoyage périodique des intervalles si activé
    setInterval(() => {
        if (isEnabled) {
            clearFocusIntervals();
        }
    }, 5000);

})();
