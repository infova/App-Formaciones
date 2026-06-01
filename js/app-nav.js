// js/app-nav.js — Navegación, filtros, búsqueda y stats del sidebar
const _appNav = {

    renderFilters() {
        const container = document.getElementById('brand-filters');

        const records = this.clientRecords || this.clients.map(n => ({ name: n, region: 'España' }));

        const allRegions = (this.regionsData && this.regionsData.length > 0)
            ? this.regionsData.map(r => r.name)
            : ['España', 'Latam'];
        const userRegion = this.user?.region;
        const regionOrder = (!userRegion || userRegion === 'All' || userRegion === 'España')
            ? allRegions
            : allRegions.filter(r => r === userRegion);

        const regionGroups = {};
        regionOrder.forEach(r => { regionGroups[r] = []; });
        records.forEach(c => {
            const rName = c.region_name || c.region;
            if (regionGroups.hasOwnProperty(rName)) {
                regionGroups[rName].push(c);
            }
        });

        const activeBrandRegion = (() => {
            if (this.brand === 'all') return null;
            const rec = this.clientRecords.find(c => c.id == this.brand);
            return rec ? (rec.region_name || rec.region) : null;
        })();

        const getBrandColor = (name) => this.getColorForBrand ? this.getColorForBrand(name) : '#6366f1';

        let html = `<button onclick="app.setFilter('all')" class="brand-btn px-3 py-1 text-xs rounded transition uppercase ${this.brand === 'all' && !this.regionFilter ? 'btn-active' : 'btn-inactive'}">Todos</button>`;

        regionOrder.forEach(region => {
            const regionClients = regionGroups[region] || [];
            if (regionClients.length === 0) return;

            const regionIsActive = activeBrandRegion === region;
            const _rDef = this.regionsData ? this.regionsData.find(r => r.name === region) : null;
            const _flagHtml = _rDef?.flag_svg
                ? _rDef.flag_svg.replace('style="', 'style="margin-right:3px;flex-shrink:0;')
                : '🌎 ';
            const regionLabel = `${_flagHtml}${region}`;
            const isRegionFilterOn = this.regionFilter === region;
            const regionBtnClass = regionIsActive ? 'region-active' : (isRegionFilterOn ? 'region-filter-on' : 'region-filter-off region-inactive');
            const brandChip = regionIsActive ? `<span class="selected-brand-chip" style="background:${getBrandColor(this.getBrandName())}">${this.getBrandName()}</span>` : '';

            const byCountry = {};
            regionClients.forEach(c => {
                const key = c.country_name || region;
                if (!byCountry[key]) byCountry[key] = [];
                byCountry[key].push(c);
            });

            let dropdownItems = '';
            const countryNames = Object.keys(byCountry);
            countryNames.forEach((countryName, idx) => {
                const sepStyle = idx > 0
                    ? 'margin-top:6px;padding-top:6px;border-top:1px solid rgba(51,65,85,0.7);'
                    : 'padding-top:4px;';
                let countryFlag = '';
                for (const rd of (this.regionsData || [])) {
                    const co = (rd.countries || []).find(co => co.name === countryName);
                    if (co?.flag_svg) { countryFlag = co.flag_svg.replace('style="', 'style="width:13px;height:9px;border-radius:1px;vertical-align:middle;margin-right:4px;flex-shrink:0;') + ' '; break; }
                }
                dropdownItems += `<div style="${sepStyle}padding-left:10px;padding-right:8px;padding-bottom:3px;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#94a3b8;display:flex;align-items:center;">${countryFlag}${countryName}</div>`;
                byCountry[countryName].forEach(c => {
                    const isActiveBrand = this.brand == c.id;
                    const dot = c.logo_svg
                        ? `<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:16px;flex-shrink:0;overflow:hidden;margin-right:2px;">${c.logo_svg}</span>`
                        : `<span class="brand-dot" style="background:${getBrandColor(c.name)}"></span>`;
                    const activeClass = isActiveBrand ? 'active-brand' : '';
                    dropdownItems += `<button onclick="app.setFilter(${c.id})" class="region-dropdown-item ${activeClass}" style="padding-left:18px;${isActiveBrand ? 'background:white;' : ''}">${dot}${c.name}</button>`;
                });
            });

            html += `
                <div class="region-group ${this.openDropdown === region ? 'is-open' : ''}">
                    <button onclick="app.toggleDropdown(event, '${region}')" class="region-btn ${regionBtnClass}" title="${isRegionFilterOn ? 'Desactivar filtro de región' : 'Ver solo gráfica de ' + region}">
                        <span class="material-icons-round region-chart-icon">show_chart</span>
                        ${regionLabel}${brandChip}
                        <span class="region-arrow">▼</span>
                    </button>
                    <div class="region-dropdown">
                        ${dropdownItems}
                    </div>
                </div>`;
        });

        if (this.user && this.user.role === 'admin') {
            html += `<button onclick="app.openRegionManager()" class="px-2 py-1 text-xs rounded transition bg-indigo-600 text-white ml-2 flex items-center justify-center font-bold hover:bg-indigo-500 shadow-lg" title="Gestionar Regiones y Marcas">+</button>`;
        }

        container.innerHTML = html;
    },

    nav(view) {
        if (this.user && this.user.region === 'Latam' && (view === 'it' || view === 'it-archived')) {
            this.nav('dashboard');
            return;
        }
        if (view === 'logs' && (!this.user || this.user.role !== 'admin')) {
            this.nav('dashboard');
            return;
        }
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('bg-slate-800', 'text-white'));
        const navEl = document.getElementById('nav-' + (view === 'it-archived' ? 'it' : view));
        if (navEl) navEl.classList.add('bg-slate-800', 'text-white');
        ['dashboard', 'it', 'it-archived', 'kanban', 'informes', 'logs'].forEach(v => {
            const el = document.getElementById('view-' + v);
            if (el) el.classList.add('hidden');
        });
        document.getElementById('view-' + view).classList.remove('hidden');
        document.getElementById('page-title').innerText = view === 'logs' ? 'ACTIVIDAD' : view.toUpperCase();
        this.renderAll();
        if (view === 'kanban') this.initKanban();
        if (view === 'logs') this.renderLogs();
    },

    setFilter(brand) {
        this.brand = brand;
        this.regionFilter = null;
        this.openDropdown = null;
        this.renderFilters();
        this.renderAll();
    },

    toggleTheme() {
        const isLight = document.body.classList.toggle('light-mode');
        const icon = document.getElementById('theme-icon');
        if (icon) icon.textContent = isLight ? 'dark_mode' : 'light_mode';
        localStorage.setItem('app_theme', isLight ? 'light' : 'dark');
        if (!document.getElementById('view-kanban').classList.contains('hidden')) this.renderKanban();
        if (!document.getElementById('view-dashboard').classList.contains('hidden')) this.renderDashboard();
    },

    toggleDropdown(event, region) {
        event.stopPropagation();
        const isOpen = this.openDropdown === region;
        this.openDropdown = isOpen ? null : region;
        this.regionFilter = isOpen ? null : region;
        if (!isOpen) this.brand = 'all';
        this.renderFilters();
        this.renderAll();
    },

    getData() {
        return this.db.filter(u => {
            if (this.user && this.user.region === 'Latam') {
                if (!this.clients.includes(u.marca)) return false;
            }
            const yearMatch = (this.year === 'all' || u.year === this.year);
            const brandMatch = this.matchesBrand(u);
            let monthMatch = true;
            if (this.month !== 'all') {
                const targetDate = u.formacion.date || u.fechaAlta;
                if (targetDate) {
                    const d = new Date(targetDate);
                    monthMatch = d.getMonth().toString() === this.month;
                } else {
                    monthMatch = false;
                }
            }
            return yearMatch && brandMatch && monthMatch;
        });
    },

    matchesSearch(u, search, context = 'all') {
        if (!search) return true;
        const s = search.trim().toLowerCase();
        let searchObj = u;
        if (context === 'it') {
            searchObj = { ...u };
            delete searchObj.formacion;
        }
        let str = JSON.stringify(searchObj).toLowerCase();
        if (context === 'it' && !u.fechaConfig) str += " pendiente";
        return str.includes(s);
    },

    renderAll() {
        this.year = document.getElementById('global-year').value;
        this.month = document.getElementById('global-month').value;
        this.updateSidebarStats();
        if (!document.getElementById('view-dashboard').classList.contains('hidden')) this.renderDashboard();
        if (!document.getElementById('view-informes').classList.contains('hidden')) this.renderInformes();
        if (!document.getElementById('view-it').classList.contains('hidden')) this.renderIT();
        if (!document.getElementById('view-it-archived').classList.contains('hidden')) this.renderITArchived();
        if (!document.getElementById('view-kanban').classList.contains('hidden')) this.renderKanban();
    },

    updateSidebarStats() {
        const data = this.getData();
        document.getElementById('count-tablets').innerText = data.filter(u => u.tipoAcceso === 'Tablet').length;
        document.getElementById('count-licenses').innerText = data.filter(u => u.tipoAcceso !== 'Tablet').length;
        const container = document.getElementById('sidebar-dynamic-stats');
        container.innerHTML = '';

        const userRegion = this.user?.region;
        const allRegionNames = (this.regionsData && this.regionsData.length > 0)
            ? this.regionsData.map(r => r.name)
            : ['España', 'Latam'];
        const visibleRegions = (!userRegion || userRegion === 'All' || userRegion === 'España')
            ? allRegionNames
            : [userRegion];

        const visibleClients = (this.clientRecords || []).filter(c =>
            visibleRegions.includes(c.region_name || c.region)
        );

        const nameCounts = {};
        visibleClients.forEach(c => { nameCounts[c.name] = (nameCounts[c.name] || 0) + 1; });

        const grouped = {};
        visibleClients.forEach(c => {
            const rk = c.region_name || c.region || 'Sin región';
            const ck = c.country_name || rk;
            if (!grouped[rk]) grouped[rk] = {};
            if (!grouped[rk][ck]) grouped[rk][ck] = [];
            grouped[rk][ck].push(c);
        });

        const regionKeys = Object.keys(grouped);
        const multiRegion = regionKeys.length > 1;

        regionKeys.forEach((rk, ri) => {
            if (multiRegion) {
                const sepStyle = ri > 0 ? 'margin-top:8px;padding-top:6px;border-top:1px solid rgba(51,65,85,0.6);' : 'padding-top:2px;';
                container.innerHTML += `<div style="${sepStyle}font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#6366f1;margin-bottom:3px;">${rk}</div>`;
            }
            const countryKeys = Object.keys(grouped[rk]);
            const multiCountry = countryKeys.length > 1;
            countryKeys.forEach((ck, ci) => {
                if (multiCountry) {
                    const cSep = ci > 0 ? 'margin-top:5px;' : '';
                    container.innerHTML += `<div style="${cSep}font-size:9px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:#64748b;margin-bottom:2px;padding-left:2px;">${ck}</div>`;
                }
                grouped[rk][ck].forEach(c => {
                    const count = data.filter(u =>
                        u.formacion.status === 'Realizada' &&
                        ((u.client_id && u.client_id == c.id) || (!u.client_id && u.marca === c.name))
                    ).length;
                    const color = this.getColorForBrand ? this.getColorForBrand(c.name) : '#6366f1';
                    const indent = multiCountry ? 'padding-left:10px;' : '';
                    const brandIcon = c.logo_svg
                        ? `<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:14px;flex-shrink:0;overflow:hidden;">${c.logo_svg}</span>`
                        : `<span class="w-2 h-2 rounded-full flex-shrink-0" style="background:${color}"></span>`;
                    container.innerHTML += `<div class="flex justify-between items-center" style="font-size:10px;${indent}">
                        <span class="flex items-center gap-2 uppercase font-semibold" style="color:#cbd5e1">
                            ${brandIcon}
                            ${c.name}
                        </span>
                        <span class="font-bold text-white">${count}</span>
                    </div>`;
                });
            });
        });
    },

    sendEmail(id) {
        const u = this.db.find(x => x.id == id);
        if (!u) return;
        let subject = '';
        let appName = '';
        if (u.marca === 'Kia' || u.marca === 'Kia Canarias') { subject = "Formación en Kia iDealer: Mejorando la Experiencia del Cliente"; appName = "Kia iDealer"; }
        else if (u.marca === 'Hyundai') { subject = "Formación en Hyundai SSC Mejorando la Experiencia del Cliente"; appName = "Hyundai SSC"; }
        else { subject = `Formación en ${u.marca}: Mejorando la Experiencia del Cliente`; appName = u.marca; }
        const body = `Hola ${u.nombre},\n\nMe gustaría agendar contigo una breve formación online (aprox. 40 minutos) por Teams para ayudarte a sacar más partido a la plataforma ${appName} y que puedas atender a tus clientes de una forma aún más profesional.\n\nTe propongo estas opciones de fecha y hora:\n\n[Día] [hora]\n[Día] [hora]\n[Día] [hora]\n\nPor favor, indícame qué opción te encaja mejor (o sugiéreme otra alternativa) y te enviaré la convocatoria de Teams.\n\nGracias y quedo pendiente de tu respuesta.`;
        window.location.href = `mailto:${u.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    },

    copyControlSummary() {
        const data = this.getData().filter(u => u.reqFormacion && u.formacion.status !== 'Realizada');
        if (data.length === 0) return Swal.fire({ title: 'Sin pendientes', background: '#1e293b' });
        let dealers = {};
        data.forEach(u => {
            if (!dealers[u.concesionario]) dealers[u.concesionario] = [];
            dealers[u.concesionario].push(`${u.nombre} ${u.apellidos} (${u.formacion.status})`);
        });
        let text = `📢 PENDIENTES DE FORMACIÓN (${this.getBrandName()})\n\n`;
        for (let d in dealers) { text += `📍 ${d}:\n- ${dealers[d].join('\n- ')}\n\n`; }
        navigator.clipboard.writeText(text);
        Swal.fire({ title: 'Copiado', text: 'Resumen listo para pegar.', icon: 'success', background: '#1e293b' });
    }
};
