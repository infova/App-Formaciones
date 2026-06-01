// js/app-regions.js — Gestión de regiones, países y marcas (clientes)
const _appRegions = {

    async openRegionManager() {
        await Promise.all([this.fetchRegions(), this.fetchClients()]);
        const isLight = document.body.classList.contains('light-mode');

        const buildTree = () => {
            let html = '<div class="text-left space-y-2">';
            html += `
                <div class="flex gap-2 mb-3">
                    <input id="new-region-name" class="custom-field h-8 text-xs flex-1" placeholder="Nueva región...">
                    <button onclick="app.createRegion()" class="bg-green-700 hover:bg-green-600 text-white px-3 rounded text-xs font-bold transition flex items-center gap-1"><span class="material-icons-round text-xs">add</span> Región</button>
                </div>`;
            for (const region of (this.regionsData || [])) {
                const flagHtml = region.flag_svg ? `<span class="mr-1">${region.flag_svg}</span>` : '<span class="mr-1">🌎</span>';
                html += `
                <div class="border border-slate-600 rounded-lg overflow-hidden">
                    <div class="flex items-center justify-between p-2.5 bg-slate-800">
                        <span class="flex items-center text-sm font-bold text-white">${flagHtml}${region.name}</span>
                        <span class="flex items-center gap-0.5">
                            <button onclick="app.editRegion(${region.id})" class="text-blue-400 hover:text-blue-300 transition" title="Editar región y SVG"><span class="material-icons-round text-sm">edit</span></button>
                            <button onclick="app.deleteRegion(${region.id})" class="text-red-400 hover:text-red-300 transition" title="Eliminar región"><span class="material-icons-round text-sm">delete</span></button>
                        </span>
                    </div>
                    <div class="bg-slate-900/30 p-2 space-y-2">
                        <div class="flex gap-1.5 mb-2">
                            <input id="new-country-${region.id}" class="custom-field h-7 text-xs flex-1" placeholder="Nuevo país...">
                            <button onclick="app.createCountry(${region.id})" class="bg-blue-700 hover:bg-blue-600 text-white px-2 rounded text-xs font-bold transition">+ País</button>
                        </div>`;
                for (const country of (region.countries || [])) {
                    const countryBrands = (this.clientRecords || []).filter(c => String(c.country_id) === String(country.id));
                    html += `
                        <div class="border border-slate-700/60 rounded overflow-hidden">
                            <div class="flex items-center justify-between px-2.5 py-1.5 bg-slate-800/70">
                                <span class="text-xs font-bold text-slate-200">${country.flag_svg ? `<span style="display:inline-flex;align-items:center;width:18px;height:14px;overflow:hidden;margin-right:4px;flex-shrink:0;">${country.flag_svg}</span>` : ''}${country.name}</span>
                                <span class="flex items-center gap-0.5">
                                    <button onclick="app.editCountry(${country.id})" class="text-blue-400 hover:text-blue-300 transition" title="Editar país y SVG"><span class="material-icons-round" style="font-size:14px">edit</span></button>
                                    <button onclick="app.deleteCountry(${country.id})" class="text-red-400 hover:text-red-300 transition" title="Eliminar país"><span class="material-icons-round" style="font-size:14px">delete</span></button>
                                </span>
                            </div>
                            <div class="bg-slate-900/20 px-2.5 py-1.5 space-y-1">
                                <div class="flex gap-1.5 mb-1">
                                    <input id="new-brand-${country.id}" class="custom-field h-6 text-xs flex-1" placeholder="Nueva marca...">
                                    <button onclick="app.createBrand(${country.id})" class="bg-indigo-600 hover:bg-indigo-500 text-white px-2 rounded text-xs font-bold transition">+ Marca</button>
                                </div>`;
                    if (countryBrands.length === 0) {
                        html += `<p class="text-slate-500 text-[10px] italic px-1">Sin marcas</p>`;
                    } else {
                        for (const brand of countryBrands) {
                            const logoThumb = brand.logo_svg
                                ? `<span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:18px;flex-shrink:0;overflow:hidden;">${brand.logo_svg}</span>`
                                : `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${this.getColorForBrand ? this.getColorForBrand(brand.name) : '#6366f1'};"></span>`;
                            html += `
                                <div class="flex justify-between items-center py-0.5">
                                    <span class="flex items-center gap-1.5 text-slate-300 text-xs font-mono">${logoThumb}${brand.name}</span>
                                    <span class="flex items-center gap-0.5">
                                        <button onclick="app.editBrand(${brand.id})" class="text-blue-400 hover:text-blue-300 transition" title="Editar icono SVG"><span class="material-icons-round" style="font-size:14px">edit</span></button>
                                        <button onclick="app.deleteBrand(${brand.id})" class="text-red-400 hover:text-red-300 transition"><span class="material-icons-round" style="font-size:14px">delete</span></button>
                                    </span>
                                </div>`;
                        }
                    }
                    html += `</div></div>`;
                }
                if ((region.countries || []).length === 0) {
                    html += `<p class="text-slate-500 text-[10px] italic px-1 mb-1">Sin países</p>`;
                }
                html += `</div></div>`;
            }
            const orphans = (this.clientRecords || []).filter(c => !c.country_id);
            if (orphans.length > 0) {
                html += `
                <div class="border border-yellow-700/40 rounded-lg overflow-hidden mt-2">
                    <div class="p-2 bg-yellow-900/20"><span class="text-xs font-bold text-yellow-400">⚠ Marcas sin país asignado</span></div>
                    <div class="bg-slate-900/20 px-2.5 py-1.5 space-y-1">`;
                for (const brand of orphans) {
                    const logoThumb = brand.logo_svg
                        ? `<span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:18px;flex-shrink:0;overflow:hidden;">${brand.logo_svg}</span>`
                        : `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${this.getColorForBrand ? this.getColorForBrand(brand.name) : '#6366f1'};"></span>`;
                    html += `
                        <div class="flex justify-between items-center py-0.5">
                            <span class="flex items-center gap-1.5 text-slate-300 text-xs font-mono">${logoThumb}${brand.name}</span>
                            <span class="flex items-center gap-0.5">
                                <button onclick="app.editBrand(${brand.id})" class="text-blue-400 hover:text-blue-300 transition" title="Editar icono SVG"><span class="material-icons-round" style="font-size:14px">edit</span></button>
                                <button onclick="app.deleteBrand(${brand.id})" class="text-red-400 hover:text-red-300 transition"><span class="material-icons-round" style="font-size:14px">delete</span></button>
                            </span>
                        </div>`;
                }
                html += `</div></div>`;
            }
            html += '</div>';
            return html;
        };

        Swal.fire({
            title: 'Gestión de Regiones y Marcas',
            html: buildTree(),
            background: isLight ? '#fff' : '#1e293b',
            color: isLight ? '#1e293b' : '#fff',
            showConfirmButton: false,
            showCloseButton: true,
            width: 540,
            customClass: { popup: 'text-left' }
        });
    },

    async editRegion(id) {
        const region = (this.regionsData || []).find(r => r.id == id);
        if (!region) return;
        const isLight = document.body.classList.contains('light-mode');
        const currentSvg = (region.flag_svg || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const previewHtml = region.flag_svg
            ? `<div style="width:60px;height:40px;display:flex;align-items:center;justify-content:center;overflow:hidden;">${region.flag_svg}</div>`
            : '<span style="font-size:11px;color:#64748b;">Vista previa del icono</span>';
        const { value: formValues, isConfirmed } = await Swal.fire({
            title: `Editar región: ${region.name}`,
            background: isLight ? '#fff' : '#1e293b',
            color: isLight ? '#1e293b' : '#fff',
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#4f46e5',
            cancelButtonColor: '#475569',
            html: `
                <div style="text-align:left;">
                    <div style="margin-bottom:12px;">
                        <label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;color:#94a3b8;">Nombre</label>
                        <input id="swal-region-name" class="swal2-input" style="width:100%;margin:0;box-sizing:border-box;" value="${region.name.replace(/"/g, '&quot;')}">
                    </div>
                    <div>
                        <label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;color:#94a3b8;">Icono SVG inline <span style="font-weight:400;color:#64748b;">(bandera, logo, etc.)</span></label>
                        <textarea id="swal-region-svg" class="swal2-textarea" style="width:100%;margin:0;box-sizing:border-box;height:90px;font-family:monospace;font-size:11px;resize:vertical;" placeholder="&lt;svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 60 40&quot;&gt;...&lt;/svg&gt;">${currentSvg}</textarea>
                        <div id="swal-region-preview" style="min-height:52px;display:flex;align-items:center;justify-content:center;margin-top:6px;padding:6px;border-radius:6px;background:rgba(255,255,255,0.07);">
                            ${previewHtml}
                        </div>
                    </div>
                </div>`,
            didOpen: () => {
                const ta = document.getElementById('swal-region-svg');
                const preview = document.getElementById('swal-region-preview');
                ta.addEventListener('input', () => {
                    const val = ta.value.trim();
                    if (val.toLowerCase().startsWith('<svg')) {
                        preview.innerHTML = `<div style="width:80px;height:40px;display:flex;align-items:center;justify-content:center;overflow:hidden;">${val}</div>`;
                    } else {
                        preview.innerHTML = '<span style="font-size:11px;color:#64748b;">Vista previa del icono</span>';
                    }
                });
            },
            preConfirm: () => {
                const name = (document.getElementById('swal-region-name')?.value || '').trim();
                if (!name) { Swal.showValidationMessage('El nombre es obligatorio'); return false; }
                const flagSvg = (document.getElementById('swal-region-svg')?.value || '').trim();
                return { name, flagSvg };
            }
        });
        if (!isConfirmed || !formValues) return;
        try {
            const res = await fetch('api/regions.php?id=' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: formValues.name, flag_svg: formValues.flagSvg || null })
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            await Promise.all([this.fetchRegions(), this.fetchClients()]);
            this.renderFilters();
            Swal.close();
            await this.openRegionManager();
        } catch (e) { Swal.fire('Error', e.message, 'error'); }
    },

    async editCountry(id) {
        let country = null;
        for (const r of (this.regionsData || [])) {
            const c = (r.countries || []).find(c => c.id == id);
            if (c) { country = c; break; }
        }
        if (!country) return;
        const isLight = document.body.classList.contains('light-mode');
        const currentSvg = (country.flag_svg || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const previewHtml = country.flag_svg
            ? `<div style="width:60px;height:40px;display:flex;align-items:center;justify-content:center;overflow:hidden;">${country.flag_svg}</div>`
            : '<span style="font-size:11px;color:#64748b;">Vista previa del icono</span>';
        const { value: formValues, isConfirmed } = await Swal.fire({
            title: `Editar país: ${country.name}`,
            background: isLight ? '#fff' : '#1e293b',
            color: isLight ? '#1e293b' : '#fff',
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#4f46e5',
            cancelButtonColor: '#475569',
            html: `
                <div style="text-align:left;">
                    <div style="margin-bottom:12px;">
                        <label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;color:#94a3b8;">Nombre</label>
                        <input id="swal-country-name" class="swal2-input" style="width:100%;margin:0;box-sizing:border-box;" value="${country.name.replace(/"/g, '&quot;')}">
                    </div>
                    <div>
                        <label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;color:#94a3b8;">Icono SVG inline <span style="font-weight:400;color:#64748b;">(bandera, logo, etc.)</span></label>
                        <textarea id="swal-country-svg" class="swal2-textarea" style="width:100%;margin:0;box-sizing:border-box;height:90px;font-family:monospace;font-size:11px;resize:vertical;" placeholder="&lt;svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 60 40&quot;&gt;...&lt;/svg&gt;">${currentSvg}</textarea>
                        <div id="swal-country-preview" style="min-height:52px;display:flex;align-items:center;justify-content:center;margin-top:6px;padding:6px;border-radius:6px;background:rgba(255,255,255,0.07);">
                            ${previewHtml}
                        </div>
                    </div>
                </div>`,
            didOpen: () => {
                const ta = document.getElementById('swal-country-svg');
                const preview = document.getElementById('swal-country-preview');
                ta.addEventListener('input', () => {
                    const val = ta.value.trim();
                    if (val.toLowerCase().startsWith('<svg')) {
                        preview.innerHTML = `<div style="width:80px;height:40px;display:flex;align-items:center;justify-content:center;overflow:hidden;">${val}</div>`;
                    } else {
                        preview.innerHTML = '<span style="font-size:11px;color:#64748b;">Vista previa del icono</span>';
                    }
                });
            },
            preConfirm: () => {
                const name = (document.getElementById('swal-country-name')?.value || '').trim();
                if (!name) { Swal.showValidationMessage('El nombre es obligatorio'); return false; }
                const flagSvg = (document.getElementById('swal-country-svg')?.value || '').trim();
                return { name, flagSvg };
            }
        });
        if (!isConfirmed || !formValues) return;
        try {
            const res = await fetch('api/countries.php?id=' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: formValues.name, flag_svg: formValues.flagSvg || null })
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            await Promise.all([this.fetchRegions(), this.fetchClients()]);
            this.renderFilters();
            Swal.close();
            await this.openRegionManager();
        } catch (e) { Swal.fire('Error', e.message, 'error'); }
    },

    async createRegion() {
        const name = (document.getElementById('new-region-name')?.value || '').trim();
        if (!name) return;
        try {
            const res = await fetch('api/regions.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            Swal.close();
            await this.openRegionManager();
        } catch (e) { Swal.fire('Error', e.message, 'error'); }
    },

    async deleteRegion(id) {
        const result = await Swal.fire({
            title: '¿Eliminar región?', text: 'Solo se puede si no tiene países.', icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#475569',
            confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar',
            background: '#1e293b', color: '#fff'
        });
        if (result.isConfirmed) {
            try {
                const res = await fetch('api/regions.php?id=' + id, { method: 'DELETE' });
                if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
                Swal.close();
                await this.openRegionManager();
            } catch (e) { Swal.fire('Error', e.message, 'error'); }
        }
    },

    async createCountry(regionId) {
        const name = (document.getElementById('new-country-' + regionId)?.value || '').trim();
        if (!name) return;
        try {
            const res = await fetch('api/countries.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, region_id: regionId })
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            Swal.close();
            await this.openRegionManager();
        } catch (e) { Swal.fire('Error', e.message, 'error'); }
    },

    async deleteCountry(id) {
        const result = await Swal.fire({
            title: '¿Eliminar país?', text: 'Solo se puede si no tiene marcas asignadas.', icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#475569',
            confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar',
            background: '#1e293b', color: '#fff'
        });
        if (result.isConfirmed) {
            try {
                const res = await fetch('api/countries.php?id=' + id, { method: 'DELETE' });
                if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
                Swal.close();
                await this.openRegionManager();
            } catch (e) { Swal.fire('Error', e.message, 'error'); }
        }
    },

    async createBrand(countryId) {
        const name = (document.getElementById('new-brand-' + countryId)?.value || '').trim();
        if (!name) return;
        try {
            await this.apiCreateClient(name, countryId);
            await Promise.all([this.fetchClients(), this.fetchRegions()]);
            this.renderFilters();
            Swal.close();
            await this.openRegionManager();
        } catch (e) { Swal.fire('Error', e.message, 'error'); }
    },

    async deleteBrand(id) {
        const result = await Swal.fire({
            title: '¿Eliminar esta marca?', text: 'Esta acción no se puede deshacer.', icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#475569',
            confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar',
            background: '#1e293b', color: '#fff'
        });
        if (result.isConfirmed) {
            try {
                await this.apiDeleteClient(id);
                await this.fetchClients();
                this.renderFilters();
                Swal.close();
                await this.openRegionManager();
            } catch (e) { Swal.fire('Error', e.message, 'error'); }
        }
    },

    async editBrand(id) {
        const brand = (this.clientRecords || []).find(b => b.id == id);
        if (!brand) return;
        const isLight = document.body.classList.contains('light-mode');
        const currentSvg = (brand.logo_svg || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const currentColor = brand.brand_color || this.getColorForBrand(brand.name);
        const previewHtml = brand.logo_svg
            ? `<div style="width:48px;height:40px;display:flex;align-items:center;justify-content:center;overflow:hidden;">${brand.logo_svg}</div>`
            : '<span style="font-size:11px;color:#64748b;">Vista previa del icono</span>';
        const presetColors = ['#6366f1','#3b82f6','#0ea5e9','#06b6d4','#10b981','#14b8a6','#84cc16','#f59e0b','#f97316','#ef4444','#ec4899','#a855f7','#8b5cf6','#64748b','#0f172a'];
        const swatches = presetColors.map(c =>
            `<span onclick="document.getElementById('swal-brand-color').value='${c}'" title="${c}" style="display:inline-block;width:20px;height:20px;border-radius:4px;background:${c};cursor:pointer;border:2px solid transparent;transition:border-color 0.1s;" onmouseover="this.style.borderColor='#fff'" onmouseout="this.style.borderColor='transparent'"></span>`
        ).join('');
        const { value: formValues, isConfirmed } = await Swal.fire({
            title: `Editar: ${brand.name}`,
            background: isLight ? '#fff' : '#1e293b',
            color: isLight ? '#1e293b' : '#fff',
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#4f46e5',
            cancelButtonColor: '#475569',
            html: `
                <div class="text-left space-y-3" style="text-align:left;">
                    <div>
                        <label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;color:#94a3b8;">Nombre</label>
                        <input id="swal-brand-name" class="swal2-input" style="width:100%;margin:0 0 0 0;box-sizing:border-box;" value="${brand.name.replace(/"/g, '&quot;')}">
                    </div>
                    <div>
                        <label style="display:block;font-size:11px;font-weight:600;margin-bottom:6px;color:#94a3b8;">Color de la marca</label>
                        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                            <input type="color" id="swal-brand-color" value="${currentColor}" style="width:36px;height:32px;border:none;background:none;cursor:pointer;padding:0;border-radius:4px;">
                            <div style="display:flex;gap:4px;flex-wrap:wrap;">${swatches}</div>
                        </div>
                    </div>
                    <div>
                        <label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;color:#94a3b8;">Icono SVG inline <span style="font-weight:400;color:#64748b;">(pega el código &lt;svg ...&gt;...&lt;/svg&gt;)</span></label>
                        <textarea id="swal-brand-svg" class="swal2-textarea" style="width:100%;margin:0;box-sizing:border-box;height:90px;font-family:monospace;font-size:11px;resize:vertical;" placeholder="&lt;svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 100 40&quot;&gt;...&lt;/svg&gt;">${currentSvg}</textarea>
                        <div id="swal-svg-preview" style="min-height:52px;display:flex;align-items:center;justify-content:center;margin-top:6px;padding:6px;border-radius:6px;background:rgba(255,255,255,0.07);">
                            ${previewHtml}
                        </div>
                    </div>
                    <div style="border-top:1px solid rgba(100,116,139,0.3);padding-top:12px;margin-top:4px;">
                        <p style="font-size:10px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">📋 Encuesta de Satisfacción</p>
                        <div style="margin-bottom:8px;">
                            <label style="display:block;font-size:11px;font-weight:600;margin-bottom:4px;color:#94a3b8;">URL de la encuesta</label>
                            <input id="swal-survey-url" class="swal2-input" style="width:100%;margin:0;box-sizing:border-box;font-size:11px;" placeholder="https://forms.office.com/..." value="${(brand.survey_url || '').replace(/"/g, '&quot;')}">
                        </div>
                        <div style="display:flex;align-items:center;gap:10px;">
                            <label style="position:relative;display:inline-flex;align-items:center;cursor:pointer;">
                                <input type="checkbox" id="swal-survey-qr" style="opacity:0;width:0;height:0;position:absolute;" ${brand.survey_qr_enabled ? 'checked' : ''}>
                                <span id="swal-qr-track" style="display:inline-block;width:36px;height:20px;border-radius:10px;background:${brand.survey_qr_enabled ? '#10b981' : '#475569'};transition:background 0.2s;position:relative;flex-shrink:0;">
                                    <span id="swal-qr-thumb" style="position:absolute;top:3px;left:${brand.survey_qr_enabled ? '19px' : '3px'};width:14px;height:14px;border-radius:50%;background:#fff;transition:left 0.2s;"></span>
                                </span>
                                <span style="margin-left:8px;font-size:11px;color:#94a3b8;">Habilitar QR en modal de formación completada</span>
                            </label>
                        </div>
                    </div>
                </div>`,
            didOpen: () => {
                const ta = document.getElementById('swal-brand-svg');
                const preview = document.getElementById('swal-svg-preview');
                ta.addEventListener('input', () => {
                    const val = ta.value.trim();
                    if (val.toLowerCase().startsWith('<svg')) {
                        preview.innerHTML = `<div style="width:80px;height:40px;display:flex;align-items:center;justify-content:center;overflow:hidden;">${val}</div>`;
                    } else {
                        preview.innerHTML = '<span style="font-size:11px;color:#64748b;">Vista previa del icono</span>';
                    }
                });
                // Toggle QR
                const qrChk = document.getElementById('swal-survey-qr');
                const qrTrack = document.getElementById('swal-qr-track');
                const qrThumb = document.getElementById('swal-qr-thumb');
                qrChk.addEventListener('change', function() {
                    qrTrack.style.background = this.checked ? '#10b981' : '#475569';
                    qrThumb.style.left = this.checked ? '19px' : '3px';
                });
            },
            preConfirm: () => {
                const name = (document.getElementById('swal-brand-name')?.value || '').trim();
                if (!name) { Swal.showValidationMessage('El nombre es obligatorio'); return false; }
                const logoSvg = (document.getElementById('swal-brand-svg')?.value || '').trim();
                const brandColor = document.getElementById('swal-brand-color')?.value || null;
                const surveyUrl = (document.getElementById('swal-survey-url')?.value || '').trim() || null;
                const surveyQrEnabled = document.getElementById('swal-survey-qr')?.checked ? 1 : 0;
                return { name, logoSvg, brandColor, surveyUrl, surveyQrEnabled };
            }
        });
        if (!isConfirmed || !formValues) return;
        try {
            const res = await fetch('api/clients.php?id=' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: formValues.name, country_id: brand.country_id, logo_svg: formValues.logoSvg || null, brand_color: formValues.brandColor || null, survey_url: formValues.surveyUrl, survey_qr_enabled: formValues.surveyQrEnabled })
            });
            if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
            await Promise.all([this.fetchClients(), this.fetchRegions()]);
            this.renderFilters();
            Swal.close();
            await this.openRegionManager();
        } catch (e) { Swal.fire('Error', e.message, 'error'); }
    },

    // Alias para compatibilidad
    openClientManager() { return this.openRegionManager(); },

    async createClient() { return this.openRegionManager(); },

    async deleteClient(id) { return this.deleteBrand(id); }
};
