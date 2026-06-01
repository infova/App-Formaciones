// js/app-kanban.js — Vista Kanban: inicialización, render y drag & drop
const _appKanban = {

    initKanban() {
        ['col-pendiente', 'col-convocada', 'col-confirmada', 'col-realizada', 'col-norealizada'].forEach(id => {
            const el = document.getElementById(id);
            if (el && el._sortable) el._sortable.destroy();
            if (el) el._sortable = new Sortable(el, {
                group: 'kanban',
                animation: 150,
                onEnd: (evt) => app.handleKanbanDrop(evt)
            });
        });
    },

    renderKanban() {
        const search = document.getElementById('search-kanban').value.toLowerCase();
        ['Pendiente', 'Convocada', 'Confirmada', 'Realizada', 'No Realizada'].forEach(s => {
            const idStr = s.toLowerCase().replace(/ /g, '');
            const col = document.getElementById('col-' + idStr);
            if (!col) return;
            col.innerHTML = '';

            const users = this.getData().filter(u => u.reqFormacion && u.formacion.status === s && this.matchesSearch(u, search));

            users.sort((a, b) => {
                const dateA = a.formacion.date || a.formacion.dateCompleted || '9999-12-31T23:59:59';
                const dateB = b.formacion.date || b.formacion.dateCompleted || '9999-12-31T23:59:59';
                return new Date(dateA) - new Date(dateB);
            });

            const countEl = document.getElementById('count-' + idStr);
            if (countEl) countEl.innerText = users.length;

            users.forEach(u => {
                const isRealizada = s === 'Realizada';
                const isNoRealizada = s === 'No Realizada';

                const card = document.createElement('div');
                const brandColor = this.getColorForBrand(u.marca);
                card.className = 'kanban-card p-3 mb-2 rounded-lg border border-slate-700/60 shadow-md';
                const isLight = document.body.classList.contains('light-mode');
                card.style.borderLeftColor = brandColor;
                card.style.background = isLight
                    ? `linear-gradient(135deg, ${this.hexToRgba(brandColor, 0.18)} 0%, rgba(255,255,255,0.88) 45%)`
                    : `linear-gradient(135deg, ${this.hexToRgba(brandColor, 0.25)} 0%, rgba(14,22,40,0.82) 45%)`;
                card.setAttribute('data-id', u.id);

                const assignee = u.formacion.confirmedBy || (app.user ? app.user.username : 'User');

                if (isRealizada) {
                    card.innerHTML = `
                        <div class="flex justify-between items-center mb-0.5">
                            <h4 class="text-xs font-bold text-white truncate uppercase" style="max-width:65%">${u.nombre} ${u.apellidos}</h4>
                            <span class="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 rounded flex-shrink-0">${this.formatDateEU(u.formacion.date)}</span>
                        </div>
                        <div class="text-[9px] text-slate-500 uppercase truncate">${u.concesionario || '—'}</div>`;
                } else if (isNoRealizada) {
                    card.innerHTML = `
                        <div class="text-xs font-bold text-slate-300 uppercase truncate mb-1 line-through decoration-slate-500">${u.nombre} ${u.apellidos}</div>
                        <div class="text-[9px] text-slate-400 uppercase truncate mb-2">${u.concesionario}</div>
                        <div class="flex justify-between items-center border-t border-slate-700 pt-2">
                            <div class="flex gap-2">
                                <button onclick="app.editUser('${u.id}')" class="text-slate-500 hover:text-white transition"><span class="material-icons-round text-sm">edit</span></button>
                                <button onclick="app.deleteUser('${u.id}')" class="text-slate-500 hover:text-red-400 transition"><span class="material-icons-round text-sm">delete</span></button>
                            </div>
                            <span class="text-[9px] text-red-500/70 font-bold">No Presentado</span>
                        </div>`;
                } else {
                    card.innerHTML = `
                        <div class="text-xs font-bold text-white uppercase truncate mb-1">${u.nombre} ${u.apellidos}</div>
                        <div class="text-[9px] text-slate-400 uppercase truncate mb-2">${u.concesionario}</div>
                        <div class="flex items-center justify-between gap-1 mb-2">
                            <div class="flex gap-1">
                                <button onclick="app.editUser('${u.id}')" class="text-slate-400 hover:text-white transition"><span class="material-icons-round text-sm">edit</span></button>
                                <button onclick="event.stopPropagation(); app.sendEmail('${u.id}')" class="text-slate-400 hover:text-indigo-400 transition" title="Enviar Propuesta Formación"><span class="material-icons-round text-sm">mail</span></button>
                                <button onclick="app.deleteUser('${u.id}')" class="text-slate-400 hover:text-red-400 transition"><span class="material-icons-round text-sm">delete</span></button>
                            </div>
                            <div class="inline-flex items-center justify-center px-1.5 py-0.5 rounded border border-indigo-500/40 text-[9px] font-bold text-indigo-300 bg-indigo-500/10 shadow-sm" title="Días desde el alta">${this.getDaysSince(u.fechaAlta) != null ? this.getDaysSince(u.fechaAlta) + 'd' : '-'}</div>
                            <div class="text-[10px] font-semibold text-slate-300 antialiased tracking-tight">${this.formatDateTimeEU(u.formacion.date || u.formacion.dateCompleted)}</div>
                        </div>
                        ${(s === 'Confirmada' || s === 'Convocada') ? `<div class="absolute bottom-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg text-white uppercase tracking-tighter" style="background: ${this.getColorForString(assignee)}" title="Asignado por: ${assignee}">${this.getUserInitials(assignee)}</div>` : ''}
                        `;
                }
                col.appendChild(card);
            });
        });
        this.initKanban();
    },

    async handleKanbanDrop(evt) {
        const id = evt.item.getAttribute('data-id');
        const newStatus = evt.to.getAttribute('data-status');
        const u = app.db.find(x => x.id == id);
        if (!u) return;

        if (evt.from.id.includes('pendiente') && newStatus !== 'Pendiente') {
            const { value: d } = await Swal.fire({ title: 'Programar Cita', input: 'datetime-local', background: '#1e293b', color: '#fff' });
            if (d) u.formacion.date = d;
            else { app.renderKanban(); return; }
        }

        if (newStatus === 'Confirmada' || newStatus === 'Convocada') {
            if (!u.formacion.confirmedBy) {
                if (this.user.role === 'admin') {
                    const users = await this.apiGetUsers();
                    const options = users.reduce((acc, curr) => {
                        acc[curr.username] = curr.username;
                        return acc;
                    }, {});

                    const { value: assignedUser } = await Swal.fire({
                        title: '¿Quién asigna la formación?',
                        input: 'select',
                        inputOptions: options,
                        inputPlaceholder: 'Seleccionar Usuario...',
                        showCancelButton: true,
                        background: '#1e293b',
                        color: '#fff',
                        confirmButtonColor: '#6366f1',
                        customClass: {
                            input: 'bg-slate-800 text-white border-slate-700 text-sm rounded-lg p-2 focus:ring-indigo-500'
                        }
                    });

                    if (assignedUser) {
                        u.formacion.confirmedBy = assignedUser;
                    } else {
                        app.renderKanban();
                        return;
                    }
                } else {
                    u.formacion.confirmedBy = this.user.username;
                }
            }
        } else if (newStatus === 'Pendiente') {
            u.formacion.confirmedBy = null;
            u.formacion.date = "";
        } else if (newStatus !== 'Realizada') {
            u.formacion.confirmedBy = null;
        }

        const formacionBackup = JSON.parse(JSON.stringify(u.formacion));
        if (newStatus === 'Realizada') u.formacion.dateCompleted = new Date().toISOString().split('T')[0];
        u.formacion.status = newStatus;
        try {
            await app.apiUpdate(u);
            app.logAction('MOVER_KANBAN', `${u.nombre} ${u.apellidos} → ${newStatus}`);
            app.renderAll();
        } catch (e) {
            u.formacion = formacionBackup;
            if (e.message && e.message.includes('no encontrado')) {
                await app.fetchData();
            } else {
                app.renderAll();
            }
            Swal.fire({ title: 'Error al guardar', text: e.message || 'No se pudo guardar el cambio de estado. Inténtalo de nuevo.', icon: 'error', background: '#1e293b', color: '#fff', confirmButtonColor: '#6366f1' });
        }
    }
};
