// OS and Architecture Detection
const detectOS = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const platform = window.navigator.platform.toLowerCase();

    // Check for iOS/iPhone/iPad first (they sometimes report as Mac)
    if (userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('ipod')) {
        return { os: 'ios', arch: null };
    }

    // Check for macOS (desktop only)
    if ((platform.includes('mac') || userAgent.includes('mac')) && !userAgent.includes('iphone') && !userAgent.includes('ipad')) {
        // Additional check: if it's a touch device claiming to be Mac, it's probably iOS
        if ('maxTouchPoints' in navigator && navigator.maxTouchPoints > 1) {
            return { os: 'ios', arch: null };
        }

        // Detect architecture (Apple Silicon vs Intel)
        // Apple Silicon reports as 'arm' in platform or has specific indicators
        const isAppleSilicon = platform.includes('arm') ||
                               userAgent.includes('apple') && userAgent.includes('arm') ||
                               // MacBook Air/Pro M1/M2/M3 indicators
                               (platform === 'macintel' && navigator.maxTouchPoints > 0);

        return {
            os: 'macos',
            arch: isAppleSilicon ? 'arm64' : 'intel'
        };
    }

    if (platform.includes('win') || userAgent.includes('win')) {
        return { os: 'windows', arch: null };
    }

    if (platform.includes('linux') || userAgent.includes('linux')) {
        return { os: 'linux', arch: null };
    }

    return { os: 'other', arch: null };
};

// Update download button based on OS
const updateDownloadButton = () => {
    const downloadBtn = document.getElementById('download-btn');
    const downloadText = document.getElementById('download-text');
    const platformNote = document.getElementById('platform-note');
    const { os } = detectOS();

    // Enable download for any macOS
    if (os !== 'macos') {
        downloadBtn.classList.add('btn-disabled');
        downloadBtn.removeAttribute('href');
        downloadBtn.style.cursor = 'not-allowed';
        downloadBtn.style.opacity = '0.6';
        downloadText.textContent = window.i18n.t('platform.comingSoon');

        // Show platform note
        if (platformNote) {
            platformNote.style.display = 'block';
        }

        // Set appropriate tooltip message
        let tooltipMessage = '';
        if (os === 'windows' || os === 'linux') {
            tooltipMessage = window.i18n.t('platform.windowsLinuxSoon');
        } else if (os === 'ios') {
            tooltipMessage = window.i18n.t('platform.iosSoon');
        } else {
            tooltipMessage = window.i18n.t('platform.macOnly');
        }

        downloadBtn.setAttribute('title', tooltipMessage);

        // Prevent click
        downloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
        });
    }
};

// Language Switcher Initialization
const initLanguageSwitcher = () => {
    const toggle = document.getElementById('language-toggle');
    const menu = document.getElementById('language-menu');
    const menuButtons = menu.querySelectorAll('button');

    // Toggle menu visibility
    toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!toggle.contains(e.target) && !menu.contains(e.target)) {
            menu.classList.remove('active');
        }
    });

    // Handle language selection
    menuButtons.forEach(button => {
        button.addEventListener('click', () => {
            const lang = button.getAttribute('data-lang');
            window.i18n.setLanguage(lang);
            menu.classList.remove('active');

            // Update download button with new language
            updateDownloadButton();
        });
    });

    // Close menu on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menu.classList.contains('active')) {
            menu.classList.remove('active');
            toggle.focus();
        }
    });
};

// Consolidated initialization - will be merged with animation code below

// Theme Toggle
const themeToggle = document.getElementById('theme-toggle');
const html = document.documentElement;

// Check for saved theme preference or default to system preference
const getPreferredTheme = () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

// Set theme
const setTheme = (theme) => {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
};

// Initialize theme
setTheme(getPreferredTheme());

// Toggle theme on button click
themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
});

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
        setTheme(e.matches ? 'light' : 'dark');
    }
});

// GitHub Star Count
const fetchStarCount = async () => {
    const starCountElement = document.getElementById('star-count');

    try {
        const response = await fetch('https://api.github.com/repos/app-vox/vox', {
            headers: {
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch star count');
        }

        const data = await response.json();
        const starCount = data.stargazers_count;

        // Format star count (e.g., 1234 -> 1.2k)
        const formatStarCount = (count) => {
            if (count >= 1000) {
                return (count / 1000).toFixed(1) + 'k';
            }
            return count.toString();
        };

        starCountElement.textContent = formatStarCount(starCount);
    } catch (error) {
        console.error('Error fetching GitHub star count:', error);
        starCountElement.textContent = 'Star';
    }
};

// Fetch star count on page load
fetchStarCount();

// Fetch latest release download link
const fetchLatestRelease = async () => {
    const downloadButtons = document.querySelectorAll('a[href*="releases"]');

    try {
        const response = await fetch('https://api.github.com/repos/app-vox/vox/releases/latest', {
            headers: {
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            // No releases yet, keep default link
            return;
        }

        const data = await response.json();
        const dmgAsset = data.assets.find(asset => asset.name.endsWith('.dmg'));

        if (dmgAsset) {
            downloadButtons.forEach(button => {
                if (button.textContent.includes('Download')) {
                    button.href = dmgAsset.browser_download_url;
                }
            });
        }
    } catch (error) {
        console.error('Error fetching latest release:', error);
        // Keep default link on error
    }
};

// Fetch latest release on page load
// Disabled: using direct link to latest ARM64 DMG
// fetchLatestRelease();

// Scroll Animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Main initialization on page load
document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize i18n first
    const preferredLang = window.i18n.detectLanguage();
    window.i18n.setLanguage(preferredLang);

    // 2. Initialize language switcher
    initLanguageSwitcher();

    // 3. Update download button based on OS
    updateDownloadButton();

    // 4. Observe elements for fade-in animation
    const elementsToAnimate = [
        '.hero-content',
        '.demo-container',
        '.privacy-card'
    ];

    elementsToAnimate.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            observer.observe(element);
        }
    });

    // 5. Sequential status overlay animation
    const animateStatusOverlays = () => {
        const overlays = document.querySelectorAll('.status-overlay');
        const labels = document.querySelectorAll('.stage-label');
        const inputField = document.querySelector('.demo-input-field');
        const typedText = document.querySelector('.typed-text');
        const cursor = document.querySelector('.typing-cursor');

        let currentIndex = 0;
        let typingTimeout;
        let cycleTimeout;

        // Helper to get current translated text
        const getFullText = () => {
            return window.i18n && window.i18n.t
                ? window.i18n.t('demo.sampleText')
                : "Hey team, let's sync up tomorrow at 10 AM to discuss the new feature rollout. I'll share the design specs beforehand.";
        };

        const typeText = (text, element, callback) => {
            element.textContent = '';
            cursor.classList.add('active');
            inputField.classList.add('active');

            // Show text almost instantly (simulating paste behavior)
            let i = 0;
            const type = () => {
                if (i < text.length) {
                    element.textContent += text.charAt(i);
                    i++;
                    typingTimeout = setTimeout(type, 8); // Very fast - 8ms per char (~0.8s total)
                } else {
                    setTimeout(() => {
                        cursor.classList.remove('active');
                        inputField.classList.remove('active');
                        if (callback) callback();
                    }, 1000); // Stay 1 second after text appears
                }
            };
            type();
        };

        const activateStatus = () => {
            // Clear any ongoing typing
            if (typingTimeout) {
                clearTimeout(typingTimeout);
            }

            // Remove active class from all overlays and labels
            overlays.forEach(overlay => overlay.classList.remove('active'));
            labels.forEach(label => label.classList.remove('active'));

            // Clear text when starting new cycle
            if (typedText) {
                typedText.textContent = '';
            }
            cursor.classList.remove('active');
            inputField.classList.remove('active');

            // Determine delay based on current stage
            let delay;

            if (currentIndex === 0) {
                // Listening - 2.5 seconds
                delay = 2500;
                if (overlays[currentIndex]) {
                    overlays[currentIndex].classList.add('active');
                }
                if (labels[currentIndex]) {
                    labels[currentIndex].classList.add('active');
                }
            } else if (currentIndex === 1) {
                // Transcribing - 1.2 seconds (faster)
                delay = 1200;
                if (overlays[currentIndex]) {
                    overlays[currentIndex].classList.add('active');
                }
                if (labels[currentIndex]) {
                    labels[currentIndex].classList.add('active');
                }
            } else if (currentIndex === 2) {
                // Enhancing - 1 second (faster)
                delay = 1000;
                if (overlays[currentIndex]) {
                    overlays[currentIndex].classList.add('active');
                }
                if (labels[currentIndex]) {
                    labels[currentIndex].classList.add('active');
                }

                // After enhancing, trigger paste with typing
                setTimeout(() => {
                    overlays.forEach(overlay => overlay.classList.remove('active'));
                    labels.forEach(label => label.classList.remove('active'));
                    if (labels[3]) {
                        labels[3].classList.add('active');
                    }
                    // Typing takes ~3s + 1s display = 4s total
                    // Get translated text dynamically
                    typeText(getFullText(), typedText, () => {
                        // After typing finishes and 1s display, move to next
                        cycleTimeout = setTimeout(() => {
                            currentIndex = (currentIndex + 1) % overlays.length;
                            activateStatus();
                        }, 0);
                    });
                }, delay);

                // Don't set cycleTimeout here, it will be set after typing
                return;
            }

            // Move to next status after delay
            currentIndex = (currentIndex + 1) % overlays.length;
            cycleTimeout = setTimeout(activateStatus, delay);
        };

        // Initial activation
        activateStatus();
    };

    // Start animation when demo container is visible
    const demoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateStatusOverlays();
                demoObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });

    const demoContainer = document.querySelector('.demo-container');
    if (demoContainer) {
        demoObserver.observe(demoContainer);
    }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Keyboard Navigation Enhancement
document.addEventListener('keydown', (e) => {
    // Allow ESC to close modals or focused elements
    if (e.key === 'Escape') {
        document.activeElement.blur();
    }
});
