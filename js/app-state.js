// js/app-state.js — Estado inicial del objeto app
const _appState = {
    db: [],
    year: '2026',
    month: 'all',
    brand: 'all',
    regionFilter: null,
    openDropdown: null,
    user: null,
    chartDist: null,
    chartBrands: null,
    chartAnnual: null,
    clients: [],
    clientRecords: [],
    regionsData: [],
    adminUsers: [],
    sort: {
        it:         { column: 'fechaAlta',      direction: 'desc' },
        itArchived: { column: 'fechaArchivado',  direction: 'desc' },
        informes:   { column: 'fechaAlta',       direction: 'desc' }
    }
};
