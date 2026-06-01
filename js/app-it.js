// js/app-it.js — Vista Configuración IT: tabla, archivado, comentarios y bulk
const _appIT = {

    toggleSelectAllIT(master) {
        document.querySelectorAll('.it-row-checkbox').forEach(cb => {
            cb.checked = master.checked;
        });
        this.updateBulkActionVisibility();
    },

    updateBulkActionVisibility() {
        const selected = document.querySelectorAll('.it-row-checkbox:checked');
        const bulkActions = document.getElementById('it-bulk-actions');
        const bulkCount = document.getElementById('it-bulk-count');
        if (bulkActions && bulkCount) {
            if (selected.length > 0) {
                bulkActions.classList.remove('hidden');
                bulkCount.innerText = `${selected.length} seleccionados`;
            } else {
                bulkActions.classList.add('hidden');
                bulkCount.innerText = `0 seleccionados`;
            }
        }
    },

    getSelectedITIds() {
        const ids = [];
        document.querySelectorAll('.it-row-checkbox:checked').forEach(cb => {
            ids.push(cb.value);
        });
        return ids;
    },

    async setConfigBulkSelected() {
        const ids = this.getSelectedITIds();
        if (ids.length === 0) return;
        const { value: d } = await Swal.fire({
            title: 'Fecha Intervención IT Masiva',
            input: 'date',
            background: '#1e293b',
            color: '#fff',
            confirmButtonColor: '#6366f1',
            inputValue: new Date().toISOString().split('T')[0]
        });
        if (d) {
            Swal.fire({ title: 'Actualizando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            try {
                for (const id of ids) {
                    const u = this.db.find(x => x.id == id);
                    if (u) {
                        u.fechaConfig = d;
                        u.isArchived = true;
                        u.fechaArchivado = d;
                        u.motivoArchivado = "iPad Configurado";
                        u.itComment = "iPad Configurado";
                        await this.apiUpdate(u);
                    }
                }
                this.logAction('IT_CONFIGURAR_BULK', `${ids.length} iPad(s) configurados y archivados`);
                await this.fetchData();
                this.renderAll();
                Swal.fire({ icon: 'success', title: 'Ipad(s) configurados y archivados correctamente', background: '#1e293b', color: '#fff' });
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    },

    async archiveITBulkSelected() {
        const ids = this.getSelectedITIds();
        if (ids.length === 0) return;
        const { value: form } = await Swal.fire({
            title: 'Archivar Configuraciones IT Seleccionadas',
            html: `<div class="text-left text-xs text-slate-400 mb-2">Indica el motivo por el cual archivas a estos comerciales:</div>
                   <input id="sw-arch-date" type="date" class="swal2-input text-sm" value="${new Date().toISOString().split('T')[0]}">
                   <textarea id="sw-arch-motive" class="swal2-textarea text-sm" placeholder="Motivo del archivado..."></textarea>`,
            background: '#1e293b', color: '#fff',
            showCancelButton: true, confirmButtonColor: '#d97706',
            preConfirm: () => {
                return {
                    date: document.getElementById('sw-arch-date').value,
                    motive: document.getElementById('sw-arch-motive').value
                }
            }
        });

        if (form) {
            Swal.fire({ title: 'Archivando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            try {
                for (const id of ids) {
                    const u = this.db.find(x => x.id == id);
                    if (u) {
                        u.isArchived = true;
                        u.fechaArchivado = form.date;
                        u.motivoArchivado = form.motive;
                        await this.apiUpdate(u);
                    }
                }
                this.logAction('IT_ARCHIVAR_BULK', `${ids.length} comercial(es) archivados — Motivo: ${form.motive || 'sin especificar'}`);
                await this.fetchData();
                this.renderAll();
                Swal.fire({ icon: 'success', title: 'Comerciales archivados correctamente', background: '#1e293b', color: '#fff' });
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    },

    renderIT() {
        const list = this.getData().filter(u => u.reqConfig === true && !u.isArchived);
        const search = document.getElementById('search-it')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('filter-it-status')?.value || 'all';
        const startStr = document.getElementById('filter-it-start')?.value;
        const endStr = document.getElementById('filter-it-end')?.value;

        const filtered = list.filter(u => {
            if (!this.matchesSearch(u, search, 'it')) return false;
            if (statusFilter === 'pending' && u.fechaConfig) return false;
            if (statusFilter === 'configured' && !u.fechaConfig) return false;
            if (startStr || endStr) {
                const dateObj = new Date(u.fechaConfig || u.fechaAlta);
                if (startStr && dateObj < new Date(startStr)) return false;
                if (endStr) {
                    const endD = new Date(endStr);
                    endD.setHours(23, 59, 59, 999);
                    if (dateObj > endD) return false;
                }
            }
            return true;
        });

        const masterCheckbox = document.getElementById('it-select-all');
        if (masterCheckbox) masterCheckbox.checked = false;
        this.updateBulkActionVisibility();

        const sorted = this.sortList(filtered, this.sort.it);

        const iconNombre = document.getElementById('sort-icon-it-nombre');
        if (iconNombre) iconNombre.innerHTML = this.getSortIcon('it', 'nombre');
        const iconDea = document.getElementById('sort-icon-it-concesionario');
        if (iconDea) iconDea.innerHTML = this.getSortIcon('it', 'concesionario');
        const iconAlta = document.getElementById('sort-icon-it-fechaAlta');
        if (iconAlta) iconAlta.innerHTML = this.getSortIcon('it', 'fechaAlta');
        const iconConf = document.getElementById('sort-icon-it-fechaConfig');
        if (iconConf) iconConf.innerHTML = this.getSortIcon('it', 'fechaConfig');

        document.getElementById('it-body').innerHTML = sorted.map(u => `<tr>
            <td class="p-3"><input type="checkbox" class="it-row-checkbox w-4 h-4 rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-0" value="${u.id}" onchange="app.updateBulkActionVisibility()"></td>
            <td class="p-3"><b>${u.nombre} ${u.apellidos}</b><br><small class="text-slate-500 font-mono">${u.tabletSN || u.serial || 'S/N'}</small></td>
            <td class="p-3 text-xs text-amber-500 uppercase">${u.concesionario}</td>
            <td class="p-3 text-center"><div class="inline-flex items-center justify-center w-8 h-8 rounded-full border border-indigo-500/50 text-indigo-400 font-bold text-xs">${this.getDaysSince(u.fechaAlta) ?? '-'}</div></td>
            <td class="p-3">${u.fechaConfig ? `✅ ${u.fechaConfig}` : '<span class="text-red-400 font-bold uppercase">Pendiente</span>'}</td>
            <td class="p-3 text-xs text-slate-400 italic">${u.itComment || ''}</td>
            <td class="p-3 text-right flex justify-end gap-2 items-center">
                <button onclick="app.editITComment('${u.id}')" class="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded transition mr-4" title="Comentar"><span class="material-icons-round text-sm">comment</span></button>
                <button onclick="app.sendITEmail('${u.id}')" class="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded transition" title="Enviar Email"><span class="material-icons-round text-sm">mail</span></button>
                <button onclick="app.archiveUserIT('${u.id}')" class="bg-amber-600/20 text-amber-500 px-2 py-1 rounded transition text-xs font-bold uppercase border border-amber-500/30 hover:bg-amber-600/30" title="Archivar"><span class="material-icons-round text-sm">inventory_2</span></button>
                <button onclick="app.setConfig('${u.id}')" class="bg-indigo-600 text-xs px-3 py-1 rounded uppercase font-bold text-white transition hover:bg-indigo-500">Actualizar</button>
            </td>
        </tr>`).join('');
    },

    exportITCSV() {
        try {
            const list = this.getData().filter(u => u.reqConfig === true && !u.isArchived);
            const search = document.getElementById('search-it')?.value.toLowerCase() || '';
            const statusFilter = document.getElementById('filter-it-status')?.value || 'all';
            const startStr = document.getElementById('filter-it-start')?.value;
            const endStr = document.getElementById('filter-it-end')?.value;

            const data = list.filter(u => {
                if (!this.matchesSearch(u, search, 'it')) return false;
                if (statusFilter === 'pending' && u.fechaConfig) return false;
                if (statusFilter === 'configured' && !u.fechaConfig) return false;
                if (startStr || endStr) {
                    const dateObj = new Date(u.fechaConfig || u.fechaAlta);
                    if (startStr && dateObj < new Date(startStr)) return false;
                    if (endStr) { const endD = new Date(endStr); endD.setHours(23, 59, 59, 999); if (dateObj > endD) return false; }
                }
                return true;
            });
            if (data.length === 0) return Swal.fire('Vacio', 'No hay registros con ese criterio.', 'info');

            let csv = "\uFEFFUsuario;Concesionario;Días Alta;S_N_Tablet;Estado;Comentario\n";
            data.forEach(u => {
                const obs = (u.itComment || '').replace(/(\r\n|\n|\r)/gm, " ").replace(/;/g, ",");
                csv += `${u.nombre} ${u.apellidos};${u.concesionario};${this.getDaysSince(u.fechaAlta) ?? '-'};${u.tabletSN || u.serial || ''};${u.fechaConfig || 'Pendiente'};${obs}\n`;
            });
            const l = document.createElement("a");
            l.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
            l.download = "Export_Config_iPad.csv";
            l.click();
        } catch (e) { Swal.fire('Error CSV', e.message, 'error'); }
    },

    async editITComment(id) {
        const u = this.db.find(x => x.id == id);
        if (!u) return;
        const { value: text } = await Swal.fire({
            title: 'Comentarios IT',
            input: 'textarea',
            inputValue: u.itComment || '',
            inputPlaceholder: 'Escribe un comentario...',
            showCancelButton: true,
            background: '#1e293b',
            color: '#fff',
            confirmButtonText: 'Guardar',
            confirmButtonColor: '#6366f1'
        });
        if (text !== undefined) {
            u.itComment = text;
            await this.apiUpdate(u);
            this.logAction('IT_COMENTARIO', `${u.nombre} ${u.apellidos} — ${text.substring(0, 80)}`);
            this.renderIT();
        }
    },

    async archiveUserIT(id) {
        const user = this.db.find(u => u.id == id);
        const { value: form } = await Swal.fire({
            title: 'Archivar Configuración IT',
            html: `<div class="text-left text-xs text-slate-400 mb-2">Indica el motivo por el cual archivas a este comercial:</div>
                   <input id="sw-arch-date" type="date" class="swal2-input text-sm" value="${new Date().toISOString().split('T')[0]}">
                   <textarea id="sw-arch-motive" class="swal2-textarea text-sm" placeholder="Motivo del archivado..."></textarea>`,
            background: '#1e293b', color: '#fff',
            showCancelButton: true, confirmButtonColor: '#d97706',
            preConfirm: () => {
                return {
                    date: document.getElementById('sw-arch-date').value,
                    motive: document.getElementById('sw-arch-motive').value
                }
            }
        });

        if (form) {
            user.isArchived = true;
            user.fechaArchivado = form.date;
            user.motivoArchivado = form.motive;
            await this.apiUpdate(user);
            this.logAction('IT_ARCHIVAR', `${user.nombre} ${user.apellidos} — Motivo: ${form.motive || 'sin especificar'}`);
            this.renderAll();
            Swal.fire({ icon: 'success', title: 'Usuario Archivado', background: '#1e293b', color: '#fff' });
        }
    },

    async unarchiveUserIT(id) {
        const user = this.db.find(u => u.id == id);
        const result = await Swal.fire({
            title: '¿Desarchivar usuario?',
            text: "El comercial volverá a la lista activa de IT",
            icon: 'question',
            showCancelButton: true,
            background: '#1e293b', color: '#fff',
            confirmButtonColor: '#6366f1'
        });

        if (result.isConfirmed) {
            user.isArchived = false;
            user.fechaArchivado = null;
            user.motivoArchivado = null;
            user.formacion = { ...user.formacion, status: 'Pendiente', date: '', confirmedBy: null };
            await this.apiUpdate(user);
            this.logAction('IT_DESARCHIVAR', `${user.nombre} ${user.apellidos} — estado restaurado a Pendiente`);
            this.renderAll();
            this.renderITArchived();
        }
    },

    renderITArchived() {
        const list = this.db.filter(u => u.isArchived === true);
        const search = document.getElementById('search-it-archived').value.toLowerCase();
        const filtered = list.filter(u => this.matchesSearch(u, search, 'it') || (u.motivoArchivado && u.motivoArchivado.toLowerCase().includes(search)));

        const iconNombre = document.getElementById('sort-icon-itArchived-nombre');
        if (iconNombre) iconNombre.innerHTML = this.getSortIcon('itArchived', 'nombre');
        const iconSN = document.getElementById('sort-icon-itArchived-tabletSN');
        if (iconSN) iconSN.innerHTML = this.getSortIcon('itArchived', 'tabletSN');
        const iconArch = document.getElementById('sort-icon-itArchived-fechaArchivado');
        if (iconArch) iconArch.innerHTML = this.getSortIcon('itArchived', 'fechaArchivado');

        const sorted = this.sortList(filtered, this.sort.itArchived);

        document.getElementById('it-archived-body').innerHTML = sorted.map(u => `
            <tr>
                <td class="p-3">
                    <b>${u.nombre} ${u.apellidos}</b><br>
                    <small class="text-slate-500 uppercase">${u.concesionario}</small>
                </td>
                <td class="p-3 font-mono text-xs text-slate-400">${u.tabletSN || u.serial || 'S/N'}</td>
                <td class="p-3">
                    <div class="text-[9px] text-slate-500 font-bold">Formación General</div>
                    <div class="text-[10px] text-slate-400 mb-1 uppercase font-bold">${u.fechaArchivado || ''}</div>
                    <div class="text-xs text-slate-300 italic">"${u.motivoArchivado || 'Sin motivo'}"</div>
                </td>
                <td class="p-3 text-right">
                    <button onclick="app.unarchiveUserIT('${u.id}')" class="bg-indigo-600/20 text-indigo-400 border border-indigo-400/30 px-2 py-1 rounded text-[10px] font-bold uppercase transition hover:bg-indigo-600/30">Desarchivar</button>
                </td>
            </tr>
        `).join('');
    },

    async setConfig(id) {
        const u = this.db.find(x => x.id == id);
        if (!u) return;
        const { value: d } = await Swal.fire({
            title: 'Fecha Intervención IT',
            input: 'date',
            background: '#1e293b',
            color: '#fff',
            confirmButtonColor: '#6366f1',
            inputValue: new Date().toISOString().split('T')[0]
        });
        if (d) {
            u.fechaConfig = d;
            u.isArchived = true;
            u.fechaArchivado = d;
            u.motivoArchivado = "iPad Configurado";
            u.itComment = "iPad Configurado";
            await this.apiUpdate(u);
            this.logAction('IT_CONFIGURAR', `${u.nombre} ${u.apellidos} — iPad configurado el ${d}`);
            this.renderAll();
            Swal.fire({ icon: 'success', title: 'iPad Configurado y Archivado', background: '#1e293b', color: '#fff' });
        }
    },

    sendITEmail(id) {
        const u = this.db.find(x => x.id == id);
        if (!u) return;

        const subject = `Cambio de titularidad ${u.marca} ${u.concesionario}`;
        const body = `Te envío los datos para el cambio de titularidad relacionado con ${u.marca} ${u.concesionario}.

Nombre de contacto: ${u.nombre} ${u.apellidos}
Teléfono de contacto: ${u.telefono || 'No disponible'}

DATOS DEL COMERCIAL:
---------------------------------------------
ID: ${u.id}
Fecha Alta: ${u.fechaAlta}
Marca: ${u.marca}
Nombre: ${u.nombre}
Apellidos: ${u.apellidos}
Email: ${u.email}
Concesionario: ${u.concesionario}
Tipo Acceso: ${u.tipoAcceso === 'Acceso a informes' ? 'Formación General' : u.tipoAcceso}
${u.tabletSN || u.serial ? `S/N Tablet: ${u.tabletSN || u.serial}` : ''}
${u.usuarioAnterior ? `Comercial Anterior: ${u.usuarioAnterior}` : ''}
---------------------------------------------

Si tienes dificultad para localizarles o contactar con ellos, dínoslo para poder ayudarte.`;

        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
};
