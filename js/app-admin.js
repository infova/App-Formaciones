// js/app-admin.js — Panel de administración de usuarios, perfil, reset y migración
const _appAdmin = {

    async openAdminPanel() {
        this.adminUsers = await this.apiGetUsers();

        const regionOptions = (this.regionsData && this.regionsData.length > 0)
            ? this.regionsData.map(r => `<option value="${r.name}">${r.name}</option>`).join('')
            : '<option value="España">España</option><option value="Latam">Latam</option>';

        const tableRows = this.adminUsers.map(u => {
            const badgeColor = u.profile_color || this.getColorForString(u.username);
            const initials = this.getUserInitials(u.username);
            return `
            <tr class="border-b border-slate-700">
                <td class="p-2 text-xs font-mono text-slate-400">
                    <div style="display:inline-flex;align-items:center;gap:6px;">
                        <div style="width:22px;height:18px;border-radius:4px;background:${badgeColor};display:inline-flex;align-items:center;justify-content:center;font-size:7px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.04em;flex-shrink:0;">${initials}</div>
                        ${u.username}
                    </div>
                </td>
                <td class="p-2 text-xs uppercase ${u.role === 'admin' ? 'text-indigo-400' : 'text-slate-300'}">${u.role}</td>
                <td class="p-2 text-xs text-slate-300">${u.region || 'España'}</td>
                <td class="p-2 text-xs text-slate-500">${u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}</td>
                <td class="p-2 text-right space-x-2">
                    <button onclick="app.editUserAccount('${u.id}')" class="text-indigo-400 hover:text-indigo-300 transition" title="Editar"><span class="material-icons-round text-sm">edit</span></button>
                    ${u.username !== 'admin' ? `<button onclick="app.deleteUserAccount('${u.id}')" class="text-red-400 hover:text-red-300 transition" title="Eliminar"><span class="material-icons-round text-sm">delete</span></button>` : ''}
                </td>
            </tr>`;
        }).join('');

        Swal.fire({
            title: 'Gestión de Usuarios',
            html: `
                <div class="text-left">
                    <div class="bg-slate-900 rounded-lg p-3 mb-4 border border-slate-700">
                        <h4 class="text-xs font-bold text-slate-400 uppercase mb-2">Crear Nuevo Usuario</h4>
                        <div class="grid grid-cols-2 gap-2 mb-2">
                            <input id="new-user" placeholder="Usuario" class="custom-field h-8 text-xs">
                            <input id="new-pass" type="password" placeholder="Contraseña" class="custom-field h-8 text-xs">
                        </div>
                        <div class="grid grid-cols-3 gap-2">
                            <select id="new-role" class="custom-field h-8 text-xs">
                                <option value="user">Usuario</option>
                                <option value="admin">Administrador</option>
                            </select>
                            <select id="new-region" class="custom-field h-8 text-xs">
                                ${regionOptions}
                            </select>
                            <button onclick="app.createUser()" class="bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold transition">Crear</button>
                        </div>
                    </div>
                    <div class="max-h-64 overflow-y-auto border border-slate-700 rounded-lg">
                        <table class="w-full text-left">
                            <thead class="bg-slate-800 text-slate-500 text-xs uppercase sticky top-0">
                                <tr><th class="p-2">Usuario</th><th class="p-2">Rol</th><th class="p-2">Región</th><th class="p-2">Acceso</th><th class="p-2 text-right">Acciones</th></tr>
                            </thead>
                            <tbody class="text-slate-300">
                                ${tableRows}
                            </tbody>
                        </table>
                    </div>
                </div>
            `,
            background: '#1e293b', color: '#fff', showConfirmButton: false, showCloseButton: true, width: '600px'
        });
    },

    async createUser() {
        const username = document.getElementById('new-user').value;
        const password = document.getElementById('new-pass').value;
        const role = document.getElementById('new-role').value;
        const region = document.getElementById('new-region').value;

        if (!username || !password) return Swal.showValidationMessage('Faltan datos');

        try {
            await this.apiCreateUser({ username, password, role, region });
            this.openAdminPanel();
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Error', text: e.message, background: '#1e293b', color: '#fff' });
        }
    },

    async editUserAccount(id) {
        const user = this.adminUsers.find(u => u.id == id);
        if (!user) return;
        const initials = this.getUserInitials(user.username);
        const currentColor = user.profile_color || this.getColorForString(user.username);

        const gradientPresets = [
            { label: 'Índigo', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
            { label: 'Fuego', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
            { label: 'Océano', value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
            { label: 'Aurora', value: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
            { label: 'Atardecer', value: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
            { label: 'Glaciar', value: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)' },
            { label: 'Magma', value: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)' },
            { label: 'Medianoche', value: 'linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)' },
            { label: 'Rubí', value: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)' },
            { label: 'Esmeralda', value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
            { label: 'Lavanda', value: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
            { label: 'Cobre', value: 'linear-gradient(135deg, #c94b4b 0%, #4b134f 100%)' },
        ];
        const solidColors = ['#6366f1','#3b82f6','#06b6d4','#10b981','#84cc16','#f59e0b','#f97316','#ef4444','#ec4899','#a855f7','#8b5cf6','#64748b'];

        const presetHtml = gradientPresets.map(g =>
            `<div onclick="document.getElementById('swal-user-color-preview').style.background='${g.value}';window._selectedUserColor='${g.value}'" title="${g.label}" style="width:28px;height:28px;border-radius:6px;background:${g.value};cursor:pointer;border:2px solid transparent;transition:border-color 0.1s;flex-shrink:0;" onmouseover="this.style.borderColor='#fff'" onmouseout="this.style.borderColor='transparent'"></div>`
        ).join('');
        const solidHtml = solidColors.map(c =>
            `<div onclick="document.getElementById('swal-user-color-preview').style.background='${c}';window._selectedUserColor='${c}'" title="${c}" style="width:22px;height:22px;border-radius:4px;background:${c};cursor:pointer;border:2px solid transparent;transition:border-color 0.1s;flex-shrink:0;" onmouseover="this.style.borderColor='#fff'" onmouseout="this.style.borderColor='transparent'"></div>`
        ).join('');

        window._selectedUserColor = currentColor;

        const { value: form } = await Swal.fire({
            title: 'Editar Usuario',
            html: `
                <div class="text-left space-y-3">
                    <div>
                        <label class="text-xs font-bold text-slate-500 uppercase">Usuario</label>
                        <input value="${user.username}" disabled class="custom-field opacity-50 cursor-not-allowed">
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-500 uppercase">Nueva Contraseña</label>
                        <input id="edit-pass" type="password" placeholder="Dejar vacía para no cambiar" class="custom-field">
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-500 uppercase">Rol</label>
                        <select id="edit-role" class="custom-field">
                            <option value="user" ${user.role === 'user' ? 'selected' : ''}>Usuario</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrador</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-500 uppercase">Región</label>
                        <select id="edit-region" class="custom-field">
                            ${(this.regionsData && this.regionsData.length > 0)
                                ? this.regionsData.map(r => `<option value="${r.name}" ${user.region === r.name ? 'selected' : ''}>${r.name}</option>`).join('')
                                : `<option value="España" ${user.region === 'España' ? 'selected' : ''}>España</option><option value="Latam" ${user.region === 'Latam' ? 'selected' : ''}>Latam</option>`
                            }
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-500 uppercase" style="display:block;margin-bottom:6px;">Color del badge</label>
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                            <div id="swal-user-color-preview" style="width:34px;height:28px;border-radius:6px;background:${currentColor};flex-shrink:0;border:2px solid rgba(255,255,255,0.2);"></div>
                            <span style="font-size:10px;color:#64748b;">Vista previa del badge</span>
                            <div style="width:28px;height:22px;border-radius:4px;background:${currentColor};display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.05em;flex-shrink:0;">${initials}</div>
                        </div>
                        <div style="margin-bottom:6px;">
                            <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">Degradados</div>
                            <div style="display:flex;gap:5px;flex-wrap:wrap;">${presetHtml}</div>
                        </div>
                        <div>
                            <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">Color sólido</div>
                            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                                ${solidHtml}
                                <input type="color" id="swal-user-color-picker" value="#6366f1" style="width:22px;height:22px;border:none;background:none;cursor:pointer;padding:0;border-radius:4px;" title="Personalizado">
                            </div>
                        </div>
                    </div>
                </div>
            `,
            background: '#1e293b', color: '#fff', showCancelButton: true, confirmButtonText: 'Guardar', confirmButtonColor: '#4f46e5', cancelButtonColor: '#475569',
            didOpen: () => {
                document.getElementById('swal-user-color-picker').addEventListener('input', e => {
                    const v = e.target.value;
                    document.getElementById('swal-user-color-preview').style.background = v;
                    window._selectedUserColor = v;
                });
            },
            preConfirm: () => {
                return {
                    password: document.getElementById('edit-pass').value,
                    role: document.getElementById('edit-role').value,
                    region: document.getElementById('edit-region').value,
                    profile_color: window._selectedUserColor || null
                };
            }
        });

        if (form) {
            try {
                await this.apiUpdateUser(id, form);
                this.openAdminPanel();
            } catch (e) {
                Swal.fire({ icon: 'error', title: 'Error', text: e.message, background: '#1e293b', color: '#fff' });
            }
        }
    },

    async deleteUserAccount(id) {
        if (await Swal.fire({ title: '¿Eliminar usuario?', icon: 'warning', showCancelButton: true, background: '#1e293b', color: '#fff', confirmButtonColor: '#ef4444' }).then(r => r.isConfirmed)) {
            await this.apiDeleteUserAccount(id);
            this.openAdminPanel();
        }
    },

    logout() {
        sessionStorage.removeItem('idealer_user');
        window.location.reload();
    },

    async showProfile() {
        const u = this.user;
        if (!u) return;

        const currentColor = u.profile_color || this.getColorForString(u.username);
        const initials = this.getUserInitials(u.username);

        const gradientPresets = [
            { label: 'Índigo', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
            { label: 'Fuego', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
            { label: 'Océano', value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
            { label: 'Aurora', value: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
            { label: 'Atardecer', value: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
            { label: 'Glaciar', value: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)' },
            { label: 'Magma', value: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)' },
            { label: 'Medianoche', value: 'linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)' },
            { label: 'Rubí', value: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)' },
            { label: 'Esmeralda', value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
            { label: 'Lavanda', value: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
            { label: 'Cobre', value: 'linear-gradient(135deg, #c94b4b 0%, #4b134f 100%)' },
        ];
        const solidColors = ['#6366f1','#3b82f6','#06b6d4','#10b981','#84cc16','#f59e0b','#f97316','#ef4444','#ec4899','#a855f7','#8b5cf6','#64748b'];
        const presetHtml = gradientPresets.map(g =>
            `<div onclick="document.getElementById('profile-color-preview').style.background='${g.value}';window._selectedProfileColor='${g.value}'" title="${g.label}" style="width:28px;height:28px;border-radius:6px;background:${g.value};cursor:pointer;border:2px solid transparent;flex-shrink:0;" onmouseover="this.style.borderColor='#fff'" onmouseout="this.style.borderColor='transparent'"></div>`
        ).join('');
        const solidHtml = solidColors.map(c =>
            `<div onclick="document.getElementById('profile-color-preview').style.background='${c}';window._selectedProfileColor='${c}'" title="${c}" style="width:22px;height:22px;border-radius:4px;background:${c};cursor:pointer;border:2px solid transparent;flex-shrink:0;" onmouseover="this.style.borderColor='#fff'" onmouseout="this.style.borderColor='transparent'"></div>`
        ).join('');

        window._selectedProfileColor = currentColor;

        const { value: form } = await Swal.fire({
            title: 'Mi Perfil',
            html: `
                <div class="text-left space-y-3">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <div id="profile-color-preview" style="width:42px;height:36px;border-radius:8px;background:${currentColor};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.06em;border:2px solid rgba(255,255,255,0.15);">${initials}</div>
                        <div>
                            <div class="text-white font-bold text-sm">${u.username}</div>
                            <div class="text-slate-400 text-xs uppercase">${u.role} · ${u.region || 'España'}</div>
                        </div>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-500 uppercase">Nueva Contraseña</label>
                        <input id="profile-pass" type="password" placeholder="Dejar vacía para no cambiar" class="custom-field">
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-500 uppercase" style="display:block;margin-bottom:6px;">Color del badge</label>
                        <div style="margin-bottom:6px;">
                            <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">Degradados</div>
                            <div style="display:flex;gap:5px;flex-wrap:wrap;">${presetHtml}</div>
                        </div>
                        <div>
                            <div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">Color sólido</div>
                            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                                ${solidHtml}
                                <input type="color" id="profile-color-picker" value="#6366f1" style="width:22px;height:22px;border:none;background:none;cursor:pointer;padding:0;border-radius:4px;" title="Personalizado">
                            </div>
                        </div>
                    </div>
                    <div style="border-top:1px solid #334155;margin-top:14px;padding-top:12px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
                        ${u.role === 'admin' ? `
                        <button type="button" onclick="Swal.close();setTimeout(()=>app.openAdminPanel(),200)" style="background:#4338ca;color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:11px;font-weight:700;cursor:pointer;" onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'">👤 Administrar usuarios</button>
                        <button type="button" onclick="Swal.close();setTimeout(()=>app.openRegionManager(),200)" style="background:#0f766e;color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:11px;font-weight:700;cursor:pointer;" onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'">🌍 Gestionar regiones y marcas</button>
                        ` : ''}
                        <button type="button" onclick="app.logout()" style="background:transparent;color:#ef4444;border:1px solid #ef4444;border-radius:6px;padding:6px 12px;font-size:11px;font-weight:700;cursor:pointer;margin-left:auto;" onmouseover="this.style.background='rgba(239,68,68,0.15)'" onmouseout="this.style.background='transparent'">⏻ Cerrar sesión</button>
                    </div>
                </div>
            `,
            background: '#1e293b', color: '#fff', showCancelButton: true, confirmButtonText: 'Guardar', confirmButtonColor: '#4f46e5', cancelButtonColor: '#475569',
            didOpen: () => {
                document.getElementById('profile-color-picker').addEventListener('input', e => {
                    const v = e.target.value;
                    document.getElementById('profile-color-preview').style.background = v;
                    window._selectedProfileColor = v;
                });
            },
            preConfirm: () => {
                return {
                    password: document.getElementById('profile-pass').value,
                    profile_color: window._selectedProfileColor || null
                };
            }
        });

        if (form) {
            try {
                await this.apiUpdateUser(u.id, { password: form.password || undefined, profile_color: form.profile_color });
                // Update local session
                u.profile_color = form.profile_color;
                this.user = u;
                sessionStorage.setItem('idealer_user', JSON.stringify(u));
                Swal.fire({ icon: 'success', title: 'Perfil actualizado', background: '#1e293b', color: '#fff', timer: 1500, showConfirmButton: false });
            } catch (e) {
                Swal.fire({ icon: 'error', title: 'Error', text: e.message, background: '#1e293b', color: '#fff' });
            }
        }
    },

    async resetData() {
        const result = await Swal.fire({
            title: '⚠️ Resetear Todos los Datos',
            html: `<p class="text-slate-300 text-sm">Esta acción eliminará <b>todos los comerciales</b> de la base de datos.</p><p class="text-red-400 text-xs mt-2 font-bold">Esta acción no se puede deshacer.</p>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#475569',
            confirmButtonText: 'Sí, resetear todo',
            cancelButtonText: 'Cancelar',
            background: '#1e293b',
            color: '#fff'
        });
        if (result.isConfirmed) {
            Swal.fire({ title: 'Reseteando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            try {
                // Delete all records from the server
                for (const record of this.db) {
                    await this.apiDelete(record.id);
                }
                this.db = [];
                this.renderAll();
                Swal.fire({ icon: 'success', title: 'Datos reseteados', background: '#1e293b', color: '#fff' });
            } catch (e) {
                Swal.fire('Error', e.message, 'error');
            }
        }
    },

    async runClientMigration() {
        Swal.fire({ title: 'Ejecutando migración de clientes...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        try {
            const res = await fetch('api/records.php?action=link_clients', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                await this.fetchData();
                Swal.fire({ icon: 'success', title: 'Migración completada', html: `<pre class="text-xs text-left text-slate-300 bg-slate-900 p-3 rounded overflow-auto max-h-48">${JSON.stringify(data, null, 2)}</pre>`, background: '#1e293b', color: '#fff', width: '600px' });
            } else {
                const err = await res.json();
                throw new Error(err.error || 'Error desconocido del servidor');
            }
        } catch (e) {
            console.error('Migration Error:', e);
            Swal.fire({ icon: 'error', title: 'Error Crítico', text: e.message, background: '#1e293b', color: '#fff' });
        }
    },

    async migrateData() {
        const lsKey = 'idealer_formaciones_data';
        const raw = localStorage.getItem(lsKey);
        if (!raw) { return Swal.fire({ title: 'Sin datos locales', text: 'No hay datos en localStorage para migrar.', icon: 'info', background: '#1e293b', color: '#fff' }); }

        let records = [];
        try { records = JSON.parse(raw); } catch { return Swal.fire('Error', 'Datos corruptos en localStorage', 'error'); }
        if (!records.length) return Swal.fire('Sin datos', 'El array de localStorage está vacío.', 'info');

        const confirm = await Swal.fire({
            title: `Migrar ${records.length} registros`,
            text: 'Se enviarán los datos de localStorage al servidor.',
            icon: 'question',
            showCancelButton: true,
            background: '#1e293b', color: '#fff',
            confirmButtonColor: '#6366f1'
        });

        if (!confirm.isConfirmed) return;
        Swal.fire({ title: 'Migrando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        let ok = 0; let fail = 0;
        for (const r of records) {
            try { await this.apiCreate(r); ok++; } catch { fail++; }
        }
        await this.fetchData();
        this.renderAll();
        Swal.fire({ icon: fail === 0 ? 'success' : 'warning', title: 'Migración completa', html: `<b>${ok}</b> registros migrados.<br>${fail > 0 ? `<b class="text-red-400">${fail} errores</b>` : ''}`, background: '#1e293b', color: '#fff' });
    }
};
