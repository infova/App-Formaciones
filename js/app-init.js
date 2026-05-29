// js/app-init.js — Ensamblaje del objeto app y punto de entrada
const app = {};

Object.assign(app,
    _appState,
    _appUtils,
    _appApi,
    _appNav,
    _appDashboard,
    _appKanban,
    _appIT,
    _appInformes,
    _appModals,
    _appRegions,
    _appAdmin,
    _appExport,
    _appImport
);

app.init = async function () {
    const u = sessionStorage.getItem('idealer_user');
    if (!u) { window.location.href = 'login.html'; return; }
    this.user = JSON.parse(u);

    // Restaurar tema guardado
    if (localStorage.getItem('app_theme') === 'light') {
        document.body.classList.add('light-mode');
        const icon = document.getElementById('theme-icon');
        if (icon) icon.textContent = 'dark_mode';
    }

    // Actualizar header con nombre de usuario
    const headerUser = document.getElementById('header-user');
    if (headerUser) headerUser.innerText = this.user.username;

    // Ocultar iPad Config para usuarios Latam
    const navIt = document.getElementById('nav-it');
    if (navIt) {
        if (this.user.region === 'Latam') {
            navIt.classList.add('hidden');
        } else {
            navIt.classList.remove('hidden');
        }
    }

    // Ocultar elementos IT en dashboard y sidebar para Latam
    if (this.user.region === 'Latam') {
        ['card-kpi-ipad', 'card-kpi-config', 'sidebar-tablets-row'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }

    this.year = document.getElementById('global-year').value;
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    document.getElementById('range-start').value = start.toLocaleDateString('en-CA');
    document.getElementById('range-end').value = end.toLocaleDateString('en-CA');

    // Mostrar body cuando la auth está confirmada
    document.body.style.display = 'flex';

    // Valores por defecto en filtros de exportación
    if (document.getElementById('export-start')) {
        document.getElementById('export-start').value = start.toLocaleDateString('en-CA');
        document.getElementById('export-end').value = end.toLocaleDateString('en-CA');
    }

    await Promise.all([this.fetchData(), this.fetchClients(), this.fetchRegions()]);

    this.nav('dashboard');
    this.renderFilters();

    // Cerrar dropdowns al hacer click fuera
    document.addEventListener('click', (e) => {
        if (app.openDropdown !== null && !e.target.closest('.region-group')) {
            app.openDropdown = null;
            app.renderFilters();
        }
    });

    this.initKanban();
};

window.app = app;
document.addEventListener('DOMContentLoaded', () => app.init());
