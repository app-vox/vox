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
        const response = await fetch('https://api.github.com/repos/rodrigoluizs/vox', {
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
        const response = await fetch('https://api.github.com/repos/rodrigoluizs/vox/releases/latest', {
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
fetchLatestRelease();

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

// Observe elements for fade-in animation
document.addEventListener('DOMContentLoaded', () => {
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

    // Sequential stage animation
    const animateStages = () => {
        const stages = document.querySelectorAll('.stage');
        let currentStage = 0;

        const activateStage = () => {
            // Remove active class from all stages
            stages.forEach(stage => stage.classList.remove('active'));

            // Add active class to current stage
            if (stages[currentStage]) {
                stages[currentStage].classList.add('active');
            }

            // Move to next stage
            currentStage = (currentStage + 1) % stages.length;
        };

        // Initial activation
        activateStage();

        // Repeat every 2 seconds
        setInterval(activateStage, 2000);
    };

    // Start stage animation when demo container is visible
    const demoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateStages();
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
