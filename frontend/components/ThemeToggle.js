// Componente para cambiar entre tema claro y oscuro
const { useState, useEffect } = React;

const ThemeToggle = ({ className = '' }) => {
    const [isDark, setIsDark] = useState(false);

    // Cargar tema guardado al montar el componente
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
        setIsDark(shouldUseDark);
        applyTheme(shouldUseDark);
    }, []);

    // Aplicar tema al documento
    const applyTheme = (useDark) => {
        const root = document.documentElement;
        if (useDark) {
            root.setAttribute('data-theme', 'dark');
        } else {
            root.removeAttribute('data-theme');
        }
    };

    // Cambiar tema
    const toggleTheme = () => {
        const newTheme = !isDark;
        setIsDark(newTheme);
        applyTheme(newTheme);
        
        // Guardar preferencia en localStorage
        localStorage.setItem('theme', newTheme ? 'dark' : 'light');
        
        // Dispatch evento personalizado para notificar el cambio
        window.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { isDark: newTheme } 
        }));
    };

    return (
        <button
            className={`theme-toggle ${className}`}
            onClick={toggleTheme}
            title={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            type="button"
        >
            <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'}`}></i>
        </button>
    );
};

// Exportar el componente al objeto global window
window.ThemeToggle = ThemeToggle;