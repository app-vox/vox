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
