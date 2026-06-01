// js/app-modals.js — Modal alta/edición de comerciales y borrado
const _appModals = {

    createModal() { this.openUserModal(); },
    editUser(id) { this.openUserModal(id); },

    async deleteUser(id) {
        const u = this.db.find(x => x.id == id);
        const result = await Swal.fire({
            title: '¿Eliminar comercial?',
            html: u ? `<span class="text-slate-300">${u.nombre} ${u.apellidos}</span><br><span class="text-xs text-slate-500 uppercase">${u.concesionario || ''}</span>` : '¿Eliminar este registro?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#475569',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            background: '#1e293b',
            color: '#fff'
        });
        if (result.isConfirmed) {
            const label = u ? `${u.nombre} ${u.apellidos} — ${u.marca || ''}` : id;
            this.db = this.db.filter(u => u.id != id);
            this.apiDelete(id);
            this.logAction('ELIMINAR_COMERCIAL', label);
            this.renderAll();
        }
    },

    async openUserModal(id = null) {
        const user = id ? this.db.find(u => u.id == id) : null;
        const years = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033];
        const yearOptions = years.map(y => `<option value="${y}" ${user?.year == y || (!user && y == 2026) ? 'selected' : ''}>${y}</option>`).join('');
        const _nameCounts = {};
        this.clientRecords.forEach(c => { _nameCounts[c.name] = (_nameCounts[c.name] || 0) + 1; });
        let brandOptions = this.clientRecords.map(c => {
            const label = _nameCounts[c.name] > 1 ? `${c.name} (${c.country_name || c.region_name || c.region})` : c.name;
            const selected = user?.client_id == c.id || (!user?.client_id && user?.marca === c.name);
            return `<option value="${c.id}" ${selected ? 'selected' : ''}>${label}</option>`;
        }).join('');
        brandOptions = `<option value="" disabled ${!user ? 'selected' : ''}>Seleccionar Marca...</option>` + brandOptions;

        const { value: form } = await Swal.fire({
            title: id ? 'Editar Comercial' : 'Alta de Comercial',
            html: `
                <div class="text-left space-y-3">
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="field-label">ID Comercial</label>
                            <input id="sw-id" value="${user?.id || ''}" class="custom-field">
                            <div id="id-error" class="text-error-msg h-4"></div>
                        </div>
                        <div>
                            <label class="field-label">Fecha Alta</label>
                            <input type="date" id="sw-date" value="${user?.fechaAlta || new Date().toISOString().split('T')[0]}" class="custom-field">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="field-label">Marca</label>
                            <select id="sw-brand" class="custom-field">${brandOptions}</select>
                        </div>
                        <div>
                            <label class="field-label">Año</label>
                            <select id="sw-year" class="custom-field">${yearOptions}</select>
                        </div>
                    </div>
                    <div><label class="field-label">Nombre</label><input id="sw-nom" value="${user?.nombre || ''}" class="custom-field"></div>
                    <div><label class="field-label">Apellidos</label><input id="sw-ape" value="${user?.apellidos || ''}" class="custom-field"></div>
                    <div><label class="field-label">Teléfono</label><input id="sw-tel" value="${user?.telefono || ''}" class="custom-field"></div>
                    <div><label class="field-label">Email</label><input id="sw-ema" type="email" value="${user?.email || ''}" class="custom-field"></div>
                    <div><label class="field-label">Concesionario</label><input id="sw-dea" value="${user?.concesionario || ''}" class="custom-field uppercase"></div>
                    <div class="bg-slate-800 p-3 rounded border border-slate-600 mt-2">
                        <label class="field-label text-indigo-400">Tipo de Acceso</label>
                        <div class="grid grid-cols-2 gap-3">
                            <select id="sw-type" class="custom-field" onchange="window.toggleFields(this.value)">
                                <option value="Tablet" ${user?.tipoAcceso === 'Tablet' ? 'selected' : ''}>Tablet</option>
                                <option value="Licencia Cloud" ${user?.tipoAcceso === 'Licencia Cloud' ? 'selected' : ''}>Licencia Cloud</option>
                                <option value="Acceso a informes" ${user?.tipoAcceso === 'Acceso a informes' ? 'selected' : ''}>Formación General</option>
                            </select>
                            <input id="sw-serial" value="${user?.tabletSN || user?.serial || ''}" placeholder="S/N Tablet" class="custom-field border-blue-500/50" style="display:${user?.tipoAcceso === 'Tablet' ? 'block' : 'none'}">
                        </div>
                        <div id="div-prev" class="mt-2" style="display:${user?.tipoAcceso === 'Tablet' ? 'block' : 'none'}">
                            <input id="sw-prev" value="${user?.usuarioAnterior || ''}" placeholder="Comercial Anterior" class="custom-field border-amber-500/50">
                        </div>
                    </div>
                    <div class="flex items-center gap-4 mt-2">
                        <div class="flex items-center gap-2">
                            <input type="checkbox" id="sw-req" class="w-4 h-4 rounded bg-slate-700 border-slate-600 text-indigo-500 focus:ring-0" ${user?.reqFormacion ? 'checked' : ''}>
                            <label for="sw-req" class="text-xs text-slate-400">Requiere Formación</label>
                        </div>
                        <div class="flex items-center gap-2">
                            <input type="checkbox" id="sw-req-config" class="w-4 h-4 rounded bg-slate-700 border-slate-600 text-indigo-500 focus:ring-0" ${user?.reqConfig ? 'checked' : ''}>
                            <label for="sw-req-config" class="text-xs text-slate-400">Requiere Configuración IT</label>
                        </div>
                    </div>
                    <div class="mt-4">
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">Observaciones</label>
                        <textarea id="sw-obs" class="custom-field h-20 text-xs w-full p-2 resize-none" placeholder="Añadir observaciones...">${user?.observaciones || ''}</textarea>
                    </div>
                </div>
            `,
            background: '#1e293b', color: '#fff', showCancelButton: true, confirmButtonText: 'Guardar', confirmButtonColor: '#6366f1', width: '600px',
            didOpen: () => {
                window.toggleFields = function (val) {
                    const isTab = val === 'Tablet';
                    document.getElementById('sw-serial').style.display = isTab ? 'block' : 'none';
                    document.getElementById('div-prev').style.display = isTab ? 'block' : 'none';
                };
                window.toggleFields(document.getElementById('sw-type').value);
                const idInput = document.getElementById('sw-id');
                const errorDiv = document.getElementById('id-error');
                idInput.addEventListener('input', () => {
                    const exists = app.db.some(u => u.id === idInput.value.trim() && u.id !== user?.id);
                    idInput.classList.toggle('field-error', exists);
                    errorDiv.innerHTML = exists ? '<span class="material-icons-round text-sm">error</span> ID Duplicado' : '';
                    errorDiv.classList.toggle('visible', exists);
                });
            },
            preConfirm: () => {
                const idVal = document.getElementById('sw-id').value;
                const brandVal = document.getElementById('sw-brand').value;
                if (!idVal) return Swal.showValidationMessage('ID obligatorio');
                if (!brandVal) return Swal.showValidationMessage('Debes seleccionar una Marca');
                const _bId = document.getElementById('sw-brand').value;
                const _bRec = app.clientRecords.find(c => c.id == _bId);
                return {
                    id: idVal,
                    fechaAlta: document.getElementById('sw-date').value,
                    year: document.getElementById('sw-year').value,
                    marca: _bRec?.name || _bId,
                    client_id: _bId ? parseInt(_bId) : null,
                    nombre: document.getElementById('sw-nom').value,
                    apellidos: document.getElementById('sw-ape').value,
                    telefono: document.getElementById('sw-tel').value,
                    email: document.getElementById('sw-ema').value,
                    concesionario: document.getElementById('sw-dea').value,
                    tipoAcceso: document.getElementById('sw-type').value,
                    usuarioAnterior: document.getElementById('sw-prev').value,
                    tabletSN: document.getElementById('sw-serial').value,
                    reqFormacion: document.getElementById('sw-req').checked,
                    reqConfig: document.getElementById('sw-req-config').checked,
                    fechaConfig: user?.fechaConfig || '',
                    formacion: user?.formacion || { status: 'Pendiente', date: '' },
                    observaciones: document.getElementById('sw-obs').value
                };
            }
        });

        if (form) {
            if (id) {
                const i = this.db.findIndex(u => u.id == id);
                this.db[i] = form;
                try {
                    await this.apiUpdate(form);
                    this.logAction('EDITAR_COMERCIAL', `${form.nombre} ${form.apellidos} — ${form.marca || ''}`);
                } catch (e) {
                    if (e.message && e.message.includes('no encontrado')) {
                        await this.fetchData();
                    }
                    Swal.fire({ title: 'Error al guardar', text: e.message || 'No se pudo guardar los cambios.', icon: 'error', background: '#1e293b', color: '#fff', confirmButtonColor: '#6366f1' });
                    return;
                }
            } else {
                this.db.push(form);
                await this.apiCreate(form);
                this.logAction('CREAR_COMERCIAL', `${form.nombre} ${form.apellidos} — ${form.marca || ''}`);
            }
            this.renderAll();
        }
    }
};
