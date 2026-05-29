// js/app-utils.js — Funciones puras de formateo, color y ordenamiento
const _appUtils = {

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16),
              g = parseInt(hex.slice(3, 5), 16),
              b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },

    formatDateEU(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    },

    formatDateTimeEU(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        const date = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        const time = iso.includes('T') ? d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';
        return time ? `${date} ${time}` : date;
    },

    isoToInput(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    },

    getTimeFromDate(iso) {
        if (!iso || !iso.includes('T')) return '--:--';
        return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    },

    getDaysSince(dateStr) {
        if (!dateStr) return null;
        const start = new Date(dateStr);
        if (isNaN(start.getTime())) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        return Math.ceil(Math.abs(today - start) / (1000 * 60 * 60 * 24));
    },

    getUserInitials(username) {
        if (!username) return '';
        const clean = username.trim().toLowerCase();
        if (clean.length <= 2) return clean;
        return clean.substring(0, 2);
    },

    // --- Ordenamiento ---

    sortList(list, sortConfig) {
        const { column, direction } = sortConfig;
        return list.sort((a, b) => {
            let valA, valB;
            if (column === 'nombre') {
                valA = `${a.nombre || ''} ${a.apellidos || ''}`.toLowerCase();
                valB = `${b.nombre || ''} ${b.apellidos || ''}`.toLowerCase();
            } else if (column === 'fechaConfig') {
                valA = a.fechaConfig ? '1_' + a.fechaConfig : '0_pendiente';
                valB = b.fechaConfig ? '1_' + b.fechaConfig : '0_pendiente';
            } else {
                valA = (a[column] || '').toString().toLowerCase();
                valB = (b[column] || '').toString().toLowerCase();
            }
            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    },

    handleHeaderSort(tableKey, column) {
        const current = this.sort[tableKey];
        if (current.column === column) {
            current.direction = current.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.sort[tableKey] = { column, direction: 'asc' };
        }
        this.renderAll();
    },

    getSortIcon(tableKey, column) {
        const current = this.sort[tableKey];
        if (current.column !== column) return '<span class="text-slate-600 text-xs">↕</span>';
        return current.direction === 'asc'
            ? '<span class="text-indigo-400 text-xs">▲</span>'
            : '<span class="text-indigo-400 text-xs">▼</span>';
    },

    // --- Color / Marca ---

    getColorForString(str) {
        if (!str) return '#64748b';
        if (this.adminUsers) {
            const appUser = this.adminUsers.find(u => u.username === str.trim().toLowerCase() || u.username === str.trim());
            if (appUser && appUser.profile_color) return appUser.profile_color;
        }
        const s = str.trim().toLowerCase();
        if (s === 'ialegre' || s === 'iñaki alegre' || (s.includes('iñaki') && s.includes('alegre')))
            return 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%); color: #0f172a; text-shadow: none';
        if (s === 'scristobal' || s === 'sergio cristobal' || (s.includes('sergio') && s.includes('cristobal')))
            return 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%); color: #ffffff; text-shadow: none';
        const palette = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#a855f7'];
        let h = 0;
        for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
        return palette[Math.abs(h) % palette.length];
    },

    getColorForBrand(brand) {
        if (this.clientRecords) {
            const rec = this.clientRecords.find(c => c.name === brand);
            if (rec && rec.brand_color) return rec.brand_color;
        }
        const palette = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#a855f7'];
        if (brand === 'Kia') return '#ef4444';
        if (brand === 'Hyundai') return '#3b82f6';
        if (brand === 'Kia Canarias') return '#f97316';
        let h = 0;
        for (let i = 0; i < brand.length; i++) h = brand.charCodeAt(i) + ((h << 5) - h);
        return palette[Math.abs(h) % palette.length];
    },

    getBrandName() {
        if (this.brand === 'all') return 'GLOBAL';
        const rec = this.clientRecords.find(c => c.id == this.brand);
        return rec ? rec.name : String(this.brand);
    },

    matchesBrand(u) {
        if (this.brand === 'all') return true;
        if (u.client_id && u.client_id == this.brand) return true;
        if (!u.client_id) {
            const rec = this.clientRecords.find(c => c.id == this.brand);
            return rec ? u.marca === rec.name : false;
        }
        return false;
    }
};
