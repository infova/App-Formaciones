// js/app-dashboard.js — Dashboard: gráficos, agenda y helpers de chart
const _appDashboard = {

    getChartColor(context) {
        const chart = context.chart;
        const idx = context.datasetIndex;
        const sel = chart.selectedIndices || [];
        if (sel.length > 0) {
            if (sel.includes(idx)) return context.dataset.originalColor;
            return '#33415520';
        }
        return context.dataset.originalColor;
    },

    getChartWidth(context) {
        const chart = context.chart;
        const idx = context.datasetIndex;
        const sel = chart.selectedIndices || [];
        if (sel.length > 0) {
            if (sel.includes(idx)) return 4;
            return 1;
        }
        return 2;
    },

    getChartOrder(context) {
        const chart = context.chart;
        const idx = context.datasetIndex;
        const sel = chart.selectedIndices || [];
        if (sel.length > 0 && sel.includes(idx)) return -1;
        return 0;
    },

    resetAnnualChart() {
        if (!this.chartAnnual) return;
        this.chartAnnual.data.datasets.forEach((_, i) => this.chartAnnual.setDatasetVisibility(i, true));
        this.chartAnnual.hoveredIndex = null;
        this.chartAnnual.selectedIndex = null;
        this.chartAnnual.selectedIndices = [];
        this.chartAnnual.update();
    },

    renderDashboard() {
        const data = this.getData();
        const sStr = document.getElementById('range-start').value;
        const eStr = document.getElementById('range-end').value;

        let cnf = 0, frm = 0;
        let iPadOwnershipChanges = 0, newCloudLicenses = 0, infoAccess = 0;

        if (sStr && eStr) {
            const s = new Date(sStr);
            const e = new Date(eStr);
            e.setHours(23, 59, 59, 999);

            iPadOwnershipChanges = data.filter(u => u.tipoAcceso === 'Tablet' && new Date(u.fechaAlta) >= s && new Date(u.fechaAlta) <= e).length;
            newCloudLicenses = data.filter(u => u.tipoAcceso === 'Licencia Cloud' && new Date(u.fechaAlta) >= s && new Date(u.fechaAlta) <= e).length;
            infoAccess = data.filter(u => u.tipoAcceso === 'Acceso a informes' && new Date(u.fechaAlta) >= s && new Date(u.fechaAlta) <= e).length;

            cnf = data.filter(u => u.reqConfig && u.fechaConfig && new Date(u.fechaConfig) >= s && new Date(u.fechaConfig) <= e).length;
            frm = data.filter(u => u.reqFormacion && u.formacion.status === 'Realizada' && new Date(u.formacion.dateCompleted || u.formacion.date) >= s && new Date(u.formacion.dateCompleted || u.formacion.date) <= e).length;
        }

        document.getElementById('res-config').innerText = cnf;
        document.getElementById('res-formed').innerText = frm;
        document.getElementById('kpi-it').innerText = data.filter(u => u.reqConfig && !u.fechaConfig).length;
        document.getElementById('kpi-train-pending').innerText = data.filter(u => u.reqFormacion && u.formacion.status !== 'Realizada' && u.formacion.status !== 'No Realizada').length;

        const pct = data.filter(u => u.reqFormacion).length > 0
            ? Math.round((data.filter(u => u.reqFormacion && u.formacion.status === 'Realizada').length / data.filter(u => u.reqFormacion).length) * 100)
            : 0;
        document.getElementById('progress-text').innerText = pct + '%';
        document.getElementById('progress-fill').style.width = pct + '%';

        if (this.chartDist) this.chartDist.destroy();
        const isLatamUser = this.user && this.user.region === 'Latam';
        const distLabels = isLatamUser ? ['Nueva Licencia', 'Formación General'] : ['Cambio Titular iPad', 'Nueva Licencia', 'Formación General'];
        const distData   = isLatamUser ? [newCloudLicenses, infoAccess] : [iPadOwnershipChanges, newCloudLicenses, infoAccess];
        const distColors = isLatamUser ? ['#f59e0b', '#8b5cf6'] : ['#3b82f6', '#f59e0b', '#8b5cf6'];
        this.chartDist = new Chart(document.getElementById('chart-dist'), {
            type: 'doughnut',
            data: { labels: distLabels, datasets: [{ data: distData, backgroundColor: distColors, borderWidth: 0 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: { padding: { top: 10, bottom: 50, left: 10, right: 10 } },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#94a3b8', font: { size: 9 }, usePointStyle: true, padding: 5 }
                    }
                }
            }
        });

        // Filtrar marcas por región si hay filtro activo
        const brandsForChart = (this.brand === 'all' && this.regionFilter && this.clientRecords)
            ? this.clientRecords.filter(c => c.region === this.regionFilter).map(c => c.name).filter(n => this.clients.includes(n))
            : this.clients;

        if (this.chartBrands) this.chartBrands.destroy();
        const brandChartColors = brandsForChart.map(c => this.getColorForBrand(c));
        this.chartBrands = new Chart(document.getElementById('chart-brands'), {
            type: 'bar',
            data: {
                labels: brandsForChart,
                datasets: [{
                    label: 'Pendientes',
                    data: brandsForChart.map(c => data.filter(u => u.marca === c && u.reqFormacion && u.formacion.status !== 'Realizada').length),
                    backgroundColor: brandChartColors.map(c => this.hexToRgba(c, 0.72)),
                    borderColor: brandChartColors,
                    borderWidth: 1.5,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8', font: { size: 9 } }, beginAtZero: true },
                    x: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { display: false } }
                }
            }
        });

        const sch = data.filter(u => u.formacion.date && u.formacion.status !== 'Realizada' && u.formacion.status !== 'No Realizada').sort((a, b) => new Date(a.formacion.date) - new Date(b.formacion.date));
        const isLightAgenda = document.body.classList.contains('light-mode');
        document.getElementById('list-agenda').innerHTML = sch.map(u => {
            const assignee = u.formacion.confirmedBy || (app.user ? app.user.username : 'User');
            const brandColor = this.getColorForBrand(u.marca);
            const gradientBg = isLightAgenda
                ? `linear-gradient(135deg, ${this.hexToRgba(brandColor, 0.18)} 0%, rgba(255,255,255,0.88) 45%)`
                : `linear-gradient(135deg, ${this.hexToRgba(brandColor, 0.25)} 0%, rgba(20,30,55,0.82) 45%)`;
            return `
            <div class="flex items-center gap-2 p-1.5 agenda-item rounded text-[10px] relative group" style="background: ${gradientBg}; border-left-color: ${brandColor};">
                <div class="text-white px-2 py-1 rounded font-bold text-center leading-none" style="background: ${brandColor};">
                    ${new Date(u.formacion.date).getDate()}<br>
                    <small>${new Date(u.formacion.date).toLocaleString('es', { month: 'short' }).toUpperCase()}</small>
                </div>
                <div class="flex-1 truncate">
                    <p class="text-white font-bold truncate uppercase">${u.nombre} ${u.apellidos}</p>
                    <p class="text-slate-400 truncate uppercase">${u.marca}</p>
                </div>
                <div class="flex flex-col items-end gap-1">
                    <div class="text-indigo-300 font-bold antialiased text-[10px]">${this.getTimeFromDate(u.formacion.date)}</div>
                    <div class="text-[8px] font-bold px-1.5 py-0.5 rounded shadow-lg text-white uppercase tracking-tighter" style="background: ${this.getColorForString(assignee)}" title="Asignado por: ${assignee}">${this.getUserInitials(assignee)}</div>
                </div>
            </div>`;
        }).join('');

        // LÓGICA GRÁFICO ANUAL
        if (this.chartAnnual) this.chartAnnual.destroy();
        const monthsBase = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        let labelsLine = [];
        let ds = [];

        if (this.year === 'all') {
            const allCompleted = this.db.filter(u => u.formacion && u.formacion.status === 'Realizada' && (u.formacion.dateCompleted || u.formacion.date));
            if (allCompleted.length > 0) {
                const dates = allCompleted.map(u => new Date(u.formacion.dateCompleted || u.formacion.date));
                let minDate = new Date(Math.min(...dates));
                let maxDate = new Date(Math.max(...dates));

                const now = new Date();
                if (maxDate < now) maxDate = now;

                let currYear = minDate.getFullYear();
                let currMonth = minDate.getMonth();
                const endYear = maxDate.getFullYear();
                const endMonth = maxDate.getMonth();

                while (currYear < endYear || (currYear === endYear && currMonth <= endMonth)) {
                    labelsLine.push(`${monthsBase[currMonth]} ${currYear}`);
                    currMonth++;
                    if (currMonth > 11) { currMonth = 0; currYear++; }
                }

                if (this.brand === 'all') {
                    brandsForChart.forEach(c => {
                        const mDots = Array(labelsLine.length).fill(0);
                        allCompleted.filter(u => u.marca === c).forEach(u => {
                            const d = new Date(u.formacion.dateCompleted || u.formacion.date);
                            const label = `${monthsBase[d.getMonth()]} ${d.getFullYear()}`;
                            const idx = labelsLine.indexOf(label);
                            if (idx !== -1) mDots[idx]++;
                        });
                        const color = this.getColorForBrand(c);
                        ds.push({
                            label: c, data: mDots, tension: 0.3, pointRadius: 0,
                            borderWidth: (ctx) => app.getChartWidth(ctx),
                            borderColor: (ctx) => app.getChartColor(ctx),
                            originalColor: color, order: (ctx) => app.getChartOrder(ctx)
                        });
                    });
                } else {
                    const mDots = Array(labelsLine.length).fill(0);
                    allCompleted.filter(u => this.matchesBrand(u)).forEach(u => {
                        const d = new Date(u.formacion.dateCompleted || u.formacion.date);
                        const label = `${monthsBase[d.getMonth()]} ${d.getFullYear()}`;
                        const idx = labelsLine.indexOf(label);
                        if (idx !== -1) mDots[idx]++;
                    });
                    ds.push({ label: this.getBrandName(), data: mDots, backgroundColor: this.getColorForBrand(this.getBrandName()), borderRadius: 4 });
                }
            }
        } else {
            labelsLine = [...monthsBase];
            const yearData = this.db.filter(u => u.year == this.year && u.formacion.status === 'Realizada');

            if (this.brand === 'all') {
                brandsForChart.forEach(c => {
                    const mDots = Array(12).fill(0);
                    yearData.filter(u => u.marca === c).forEach(u => {
                        const d = new Date(u.formacion.dateCompleted || u.formacion.date);
                        const m = d.getMonth(); if (m >= 0 && m < 12) mDots[m]++;
                    });
                    const color = this.getColorForBrand(c);
                    ds.push({
                        label: c, data: mDots, tension: 0.3, pointRadius: 0,
                        borderWidth: (ctx) => app.getChartWidth(ctx),
                        borderColor: (ctx) => app.getChartColor(ctx),
                        originalColor: color, order: (ctx) => app.getChartOrder(ctx)
                    });
                });
            } else {
                const mDots = Array(12).fill(0);
                yearData.filter(u => this.matchesBrand(u)).forEach(u => {
                    const d = new Date(u.formacion.dateCompleted || u.formacion.date);
                    const m = d.getMonth(); if (m >= 0 && m < 12) mDots[m]++;
                });
                ds.push({ label: this.getBrandName(), data: mDots, backgroundColor: this.getColorForBrand(this.getBrandName()), borderRadius: 4 });
            }
        }

        this.chartAnnual = new Chart(document.getElementById('chart-annual'), {
            type: this.brand === 'all' ? 'line' : 'bar',
            data: { labels: labelsLine, datasets: ds },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        display: this.brand === 'all',
                        labels: { color: '#94a3b8', font: { size: 9 }, usePointStyle: true, padding: 15 },
                        onClick: (e, legendItem, legend) => {
                            const index = legendItem.datasetIndex;
                            const ci = legend.chart;
                            if (!ci.selectedIndices) ci.selectedIndices = [];
                            const sIdx = ci.selectedIndices.indexOf(index);
                            if (sIdx > -1) { ci.selectedIndices.splice(sIdx, 1); } else { ci.selectedIndices.push(index); }
                            ci.update('none');
                        }
                    },
                    tooltip: { backgroundColor: '#1e293b', titleColor: '#fff', bodyColor: '#cbd5e1', borderColor: '#334155', borderWidth: 1 }
                },
                onClick: (e, chartElement) => {
                    const chart = e.chart;
                    if (!chart.selectedIndices) chart.selectedIndices = [];
                    if (chartElement.length > 0) {
                        const idx = chartElement[0].datasetIndex;
                        const sIdx = chart.selectedIndices.indexOf(idx);
                        if (sIdx > -1) { chart.selectedIndices.splice(sIdx, 1); } else { chart.selectedIndices.push(idx); }
                    } else {
                        chart.selectedIndices = [];
                        app.resetAnnualChart();
                    }
                    chart.update('none');
                },
                scales: {
                    y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8', font: { size: 9 } }, beginAtZero: true },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 9 }, maxRotation: 45, minRotation: 45 } }
                }
            }
        });
    }
};
