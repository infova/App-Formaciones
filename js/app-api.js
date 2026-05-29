// js/app-api.js — Llamadas a la API del servidor
const _appApi = {

    async fetchClients() {
        try {
            const res = await fetch('api/clients.php');
            if (res.ok) {
                const data = await res.json();
                this.clientRecords = data;
                this.clients = [...new Set(data
                    .filter(c => !this.user || this.user.region === 'España' || c.region_name === 'Latam' || c.region === 'Latam')
                    .map(c => c.name))];
            }
        } catch (e) {
            console.error("Error fetching clients", e);
            this.clients = ['Kia', 'Hyundai', 'Kia Canarias'];
            this.clientRecords = this.clients.map((name, index) => ({ id: index + 1, name, region: 'España' }));
        }
    },

    async fetchRegions() {
        try {
            const res = await fetch('api/regions.php');
            if (res.ok) {
                this.regionsData = await res.json();
            }
        } catch (e) {
            console.error("Error fetching regions", e);
            this.regionsData = [];
        }
    },

    async fetchData() {
        try {
            const res = await fetch('api/records.php');
            if (res.ok) {
                this.db = await res.json();
                this.renderAll();
            }
        } catch (e) { console.error(e); }
    },

    async apiCreate(record) {
        await fetch('api/records.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });
    },

    async apiUpdate(record) {
        const res = await fetch('api/records.php?id=' + record.id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(record)
        });
        if (!res.ok) {
            let d = {};
            try { d = await res.json(); } catch (e) {}
            throw new Error(d.error || `Error HTTP ${res.status}`);
        }
    },

    async apiDelete(id) {
        await fetch('api/records.php?id=' + id, { method: 'DELETE' });
    },

    async apiGetUsers() {
        const res = await fetch('api/users.php');
        return res.ok ? await res.json() : [];
    },

    async apiCreateUser(user) {
        const res = await fetch('api/users.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
    },

    async apiUpdateUser(id, user) {
        const res = await fetch('api/users.php?id=' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
    },

    async apiDeleteUserAccount(id) {
        await fetch('api/users.php?id=' + id, { method: 'DELETE' });
    },

    async apiCreateClient(name, countryId, logoSvg = '') {
        const res = await fetch('api/clients.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, country_id: countryId, logo_svg: logoSvg || null })
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
    },

    async apiDeleteClient(id) {
        const res = await fetch('api/clients.php?id=' + id, { method: 'DELETE' });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
    }
};
