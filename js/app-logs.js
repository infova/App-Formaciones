// js/app-logs.js — Registro de actividad de usuarios (solo admin)
const _appLogs = {

    // Fire-and-forget: registra una acción sin bloquear la UI
    logAction(action, details) {
        if (!this.user) return;
        fetch('api/logs.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: this.user.username,
                action: action,
                details: details || ''
            })
        }).catch(() => { /* silencioso, nunca bloquea */ });
    },

    async renderLogs() {
        const container = document.getElementById('logs-body');
        const filterUser = (document.getElementById('filter-log-user')?.value || '').toLowerCase();
        const filterAction = (document.getElementById('filter-log-action')?.value || '').toLowerCase();

        if (!container) return;
        container.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-slate-500 text-xs">Cargando...</td></tr>';

        try {
            const res = await fetch('api/logs.php?limit=200');
            const logs = await res.json();

            const filtered = logs.filter(l => {
                const matchUser = !filterUser || l.username.toLowerCase().includes(filterUser);
                const matchAction = !filterAction || l.action.toLowerCase().includes(filterAction) || (l.details || '').toLowerCase().includes(filterAction);
                return matchUser && matchAction;
            });

            if (filtered.length === 0) {
                container.innerHTML = '<tr><td colspan="4" class="p-6 text-center text-slate-500 text-xs">Sin resultados</td></tr>';
                return;
            }

            const actionColors = {
                'CREAR':     '#10b981',
                'EDITAR':    '#6366f1',
                'ELIMINAR':  '#ef4444',
                'ARCHIVAR':  '#f59e0b',
                'DESARCHIVAR': '#06b6d4',
                'MOVER':     '#8b5cf6',
                'IMPORTAR':  '#3b82f6',
                'IT_':       '#f97316',
            };

            const getBadgeColor = (action) => {
                for (const [key, color] of Object.entries(actionColors)) {
                    if (action.startsWith(key)) return color;
                }
                return '#64748b';
            };

            const formatActionLabel = (action) => action.replace(/_/g, ' ');

            const formatDate = (iso) => {
                if (!iso) return '';
                const d = new Date(iso);
                return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
            };

            container.innerHTML = filtered.map(l => {
                const color = getBadgeColor(l.action);
                const badgeColor = this.getColorForString ? this.getColorForString(l.username) : '#6366f1';
                const initials = this.getUserInitials ? this.getUserInitials(l.username) : l.username.slice(0,2).toUpperCase();
                return `<tr class="border-b border-slate-700/40 hover:bg-slate-800/30 transition">
                    <td class="p-3 text-xs text-slate-500 font-mono whitespace-nowrap">${formatDate(l.created_at)}</td>
                    <td class="p-3">
                        <div style="display:inline-flex;align-items:center;gap:6px;">
                            <div style="width:22px;height:18px;border-radius:4px;background:${badgeColor};display:inline-flex;align-items:center;justify-content:center;font-size:7px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.04em;flex-shrink:0;">${initials}</div>
                            <span class="text-xs text-white font-semibold">${l.username}</span>
                        </div>
                    </td>
                    <td class="p-3">
                        <span style="background:${color}22;color:${color};border:1px solid ${color}55;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;">${formatActionLabel(l.action)}</span>
                    </td>
                    <td class="p-3 text-xs text-slate-400">${l.details || ''}</td>
                </tr>`;
            }).join('');
        } catch (e) {
            container.innerHTML = `<tr><td colspan="4" class="p-6 text-center text-red-400 text-xs">Error al cargar el log: ${e.message}</td></tr>`;
        }
    },

    exportLogsCSV() {
        const a = document.createElement('a');
        a.href = 'api/logs.php?export=csv';
        a.download = `actividad_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    }
};
