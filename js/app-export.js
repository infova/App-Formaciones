// js/app-export.js — Exportación CSV, informes Word y resumen de cierre
const _appExport = {

    exportCSV() {
        try {
            const data = this.getScopedData({ includePeriod: false });
            let csv = "\uFEFFID;FechaAlta;Marca;Nombre;Apellidos;Teléfono;Email;Concesionario;Tipo;S_N_Tablet;ComercialAnterior;Estado;FechaFormacion;F_Config_IT;TipoFormacion;IdSesionGrupal;NombreSesionGrupal;Observaciones\n";
            data.forEach(u => {
                const obs = (u.observaciones || '').replace(/(\r\n|\n|\r)/gm, " ").replace(/;/g, ",");
                const fStatus = u.formacion?.status || 'Pendiente';
                const fDate = u.formacion?.date || '';
                csv += `${u.id};${u.fechaAlta};${u.marca};${u.nombre};${u.apellidos};${u.telefono || ''};${u.email};${u.concesionario};${u.tipoAcceso};${u.tabletSN || u.serial || ''};${u.usuarioAnterior || ''};${fStatus};${fDate};${u.fechaConfig || ''};${u.tipoFormacion || ''};${u.formacion?.groupId || ''};${(u.formacion?.groupTitle || '').replace(/;/g, ',')};${obs}\n`;
            });
            const l = document.createElement("a");
            l.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
            l.download = "Export_Completo.csv";
            l.click();
        } catch (e) { Swal.fire('Error CSV', e.message, 'error'); }
    },

    exportCSVRange() {
        try {
            const type = document.getElementById('export-type').value;
            const sStr = document.getElementById('export-start').value;
            const eStr = document.getElementById('export-end').value;

            if (!sStr || !eStr) return Swal.fire('Fechas', 'Selecciona un rango de fechas.', 'warning');

            const { start: s, end: e } = this.getInclusiveDateRange(sStr, eStr);

            const data = this.getScopedData({ includePeriod: false }).filter(u => {
                let dateToCheck = null;
                if (type === 'alta') {
                    dateToCheck = u.fechaAlta;
                } else if (type === 'formacion') {
                    if (u.formacion && u.formacion.date) {
                        dateToCheck = u.formacion.dateCompleted || u.formacion.date;
                    }
                } else if (type === 'config') {
                    if (u.reqConfig && u.fechaConfig) {
                        dateToCheck = u.fechaConfig;
                    }
                }
                return dateToCheck && this.isDateInRange(dateToCheck, s, e);
            });

            if (data.length === 0) return Swal.fire('Vacio', 'No hay registros en ese rango y criterio.', 'info');

            let csv = "\uFEFFID;FechaAlta;Marca;Nombre;Apellidos;Teléfono;Email;Concesionario;Tipo;S_N_Tablet;ComercialAnterior;Estado;FechaFormacion;F_Config_IT;TipoFormacion;IdSesionGrupal;NombreSesionGrupal;Observaciones\n";
            data.forEach(u => {
                const obs = (u.observaciones || '').replace(/(\r\n|\n|\r)/gm, " ").replace(/;/g, ",");
                const fStatus = u.formacion?.status || 'Pendiente';
                const fDate = u.formacion?.date || '';
                csv += `${u.id};${u.fechaAlta};${u.marca};${u.nombre};${u.apellidos};${u.telefono || ''};${u.email};${u.concesionario};${u.tipoAcceso};${u.tabletSN || u.serial || ''};${u.usuarioAnterior || ''};${fStatus};${fDate};${u.fechaConfig || ''};${u.tipoFormacion || ''};${u.formacion?.groupId || ''};${(u.formacion?.groupTitle || '').replace(/;/g, ',')};${obs}\n`;
            });
            const l = document.createElement('a');
            l.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
            l.download = `Export_${type}_${sStr}_${eStr}.csv`;
            l.click();
        } catch (e) {
            console.error(e);
            Swal.fire('Error Export', e.message, 'error');
        }
    },

    async openWordReport() {
        const { value: dates } = await Swal.fire({
            title: 'Informe Ejecutivo Word',
            html: `
                <div class="text-left">
                    <label class="text-xs text-slate-400 uppercase font-bold">Rango de Fechas</label>
                    <div class="grid grid-cols-2 gap-2 mt-1">
                        <input id="word-start" type="date" class="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none w-full">
                        <input id="word-end" type="date" class="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-white outline-none w-full">
                    </div>
                    <p class="text-[10px] text-slate-500 mt-2">
                        La gráfica, el resumen y el desglose incluirán todo el rango seleccionado.
                    </p>
                </div>
            `,
            background: '#1e293b', color: '#fff',
            showCancelButton: true, confirmButtonText: 'Generar',
            preConfirm: () => {
                const s = document.getElementById('word-start').value;
                const e = document.getElementById('word-end').value;
                if (!s || !e) return Swal.showValidationMessage('Selecciona fechas');
                try {
                    this.getInclusiveDateRange(s, e);
                } catch (error) {
                    return Swal.showValidationMessage(error.message);
                }
                return { start: s, end: e };
            }
        });
        if (dates) this.generateWordDocAdvanced(dates.start, dates.end);
    },

    generateWordDocAdvanced(sStr, eStr) {
        try {
            const { start: startDate, end: endDate } = this.getInclusiveDateRange(sStr, eStr);

            let platform = "";
            const brandName = this.brand === 'all' ? 'Todas' : this.getBrandName();
            if (brandName === 'Kia' || brandName === 'Kia Canarias') platform = "iDealer";
            else if (brandName === 'Hyundai') platform = "SSC";

            const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            const periods = [];
            const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
            const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
            while (cursor <= lastMonth) {
                periods.push({ year: cursor.getFullYear(), month: cursor.getMonth() });
                cursor.setMonth(cursor.getMonth() + 1);
            }

            const ytdData = this.getScopedData({ includePeriod: false }).filter(u =>
                u.formacion &&
                u.formacion.status === 'Realizada' &&
                this.isDateInRange(u.formacion.dateCompleted || u.formacion.date, startDate, endDate)
            );
            const monthlyCounts = periods.map(period => ytdData.filter(u => {
                const date = this.parseLocalDate(u.formacion.dateCompleted || u.formacion.date);
                return date && date.getFullYear() === period.year && date.getMonth() === period.month;
            }).length);
            const targetMonth = periods.length - 1;
            const lastPeriod = periods[targetMonth];
            const targetYear = lastPeriod.year;
            const monthName = months[lastPeriod.month];
            const rangeLabel = `${this.formatDateEU(sStr)} - ${this.formatDateEU(eStr)}`;

            const barColor = brandName === 'Hyundai' ? '#00aad2' : ((brandName === 'Kia' || brandName === 'Kia Canarias') ? '#bb162b' : '#6366f1');
            const shortMonths = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

            let chartHtml = '';
            const periodsByYear = periods.reduce((groups, period, index) => {
                if (!groups[period.year]) groups[period.year] = [];
                groups[period.year].push({ ...period, index });
                return groups;
            }, {});
            Object.keys(periodsByYear).sort().forEach(year => {
                const yearPeriods = periodsByYear[year];
                const yearMax = Math.max(1, ...yearPeriods.map(period => monthlyCounts[period.index]));
                chartHtml += `
                    <div style="margin-bottom:24px; border:1px solid #ddd; padding:20px; background:#f9f9f9;">
                        <h3 style="margin:0 0 15px 0; color:#333; text-align:center;">Asesores formados en ${year}</h3>
                        <table role="presentation" style="width:100%; height:150px; border-collapse:collapse; margin:0 auto;">
                            <tr style="height:120px; vertical-align:bottom;">`;
                yearPeriods.forEach(period => {
                    const count = monthlyCounts[period.index];
                    const pxHeight = Math.round((count / yearMax) * 120);
                    const finalH = count > 0 && pxHeight < 2 ? 2 : pxHeight;
                    chartHtml += `
                        <td style="text-align:center; vertical-align:bottom; padding:0 3px; height:150px;">
                            <div style="font-size:8px; color:#555; margin-bottom:2px;">${count}</div>
                            ${count > 0
                                ? `<table role="presentation" cellspacing="0" cellpadding="0" style="width:75%; margin:0 auto; border-collapse:collapse;"><tr><td style="background:${barColor}; height:${finalH}px; font-size:1px; line-height:1px;">&nbsp;</td></tr></table>`
                                : '<div style="height:1px;">&nbsp;</div>'}
                        </td>`;
                });
                chartHtml += `</tr><tr>`;
                yearPeriods.forEach(period => {
                    chartHtml += `<td style="text-align:center; font-size:9px; color:#666; border-top:1px solid #ccc; padding-top:4px;">${shortMonths[period.month]}</td>`;
                });
                chartHtml += `</tr></table></div>`;
            });

            let trendHtml = "";
            if (targetMonth >= 0) {
                const currentC = monthlyCounts[targetMonth];
                let avgText = "", avgIcon = "", rankText = "";

                if (targetMonth === 0) {
                    avgText = "el <b>primer mes del rango</b> (sin media previa)";
                    avgIcon = "";
                    rankText = "el <b>único mes</b> seleccionado.";
                } else {
                    const prevMonthsCounts = monthlyCounts.slice(0, targetMonth);
                    const sumPrev = prevMonthsCounts.reduce((a, b) => a + b, 0);
                    const avgPrev = Math.round(sumPrev / prevMonthsCounts.length);

                    if (avgPrev > 0) {
                        const diffAvg = currentC - avgPrev;
                        const pctAvg = Math.round((diffAvg / avgPrev) * 100);
                        if (pctAvg > 0) { avgText = `un <b>${pctAvg}% por encima</b> de la media del periodo (${avgPrev})`; avgIcon = "Subida:"; }
                        else if (pctAvg < 0) { avgText = `un <b>${Math.abs(pctAvg)}% por debajo</b> de la media del periodo (${avgPrev})`; avgIcon = "Bajada:"; }
                        else { avgText = `igual a la media del periodo (${avgPrev})`; avgIcon = "Media:"; }
                    } else {
                        avgText = "el primer registro significativo del periodo";
                        avgIcon = "Dato:";
                    }

                    const ytdCountsSoFar = monthlyCounts.slice(0, targetMonth + 1);
                    const sortedCounts = [...ytdCountsSoFar].sort((a, b) => b - a);
                    const rank = sortedCounts.indexOf(currentC) + 1;

                    if (rank === 1) rankText = "el <b>mejor mes</b> del periodo.";
                    else if (rank === 2) rankText = "el <b>2º mejor mes</b> del periodo.";
                    else rankText = `el <b>${rank}º mes</b> en volumen.`;
                }

                trendHtml = `
                    <br><hr><br>
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:15px; border-radius:5px;">
                        <h3 style="margin-top:0; color:#334155;">Análisis Ejecutivo</h3>
                        <p style="font-size:14px; line-height:1.5;">
                            El último mes del rango, <b>${monthName} de ${targetYear}</b>, registra <b>${monthlyCounts[targetMonth]} asesores formados</b>.
                            <br><br>
                            ${avgIcon} Se sitúa ${avgText}.
                            <br>
                            Clasificación: representa ${rankText}
                        </p>
                    </div>`;
            }

            let summaryRows = "", totalYTD = 0;
            for (let m = 0; m <= targetMonth; m++) {
                const c = monthlyCounts[m];
                totalYTD += c;
                const period = periods[m];
                summaryRows += `<tr><td style="padding:5px;border:1px solid #000;">${months[period.month]} ${period.year}</td><td style="padding:5px;border:1px solid #000;">${c}</td></tr>`;
            }
            summaryRows += `<tr style="font-weight:bold;background:#eee;"><td style="padding:5px;border:1px solid #000;">Total del periodo</td><td style="padding:5px;border:1px solid #000;">${totalYTD}</td></tr>`;

            const monthData = [...ytdData];
            const byDealer = {};
            monthData.forEach(u => {
                if (!byDealer[u.concesionario]) byDealer[u.concesionario] = [];
                byDealer[u.concesionario].push(u);
            });

            let detailHtml = "";
            Object.keys(byDealer).sort().forEach(d => {
                const users = byDealer[d].sort((a, b) => this.parseLocalDate(a.formacion.dateCompleted || a.formacion.date) - this.parseLocalDate(b.formacion.dateCompleted || b.formacion.date));
                detailHtml += `<h3 style="margin-top:20px;border-bottom:1px solid #ccc;">${this.escapeHtml(d || 'Sin concesionario')} (${users.length})</h3>`;
                detailHtml += `<table style="width:100%;border-collapse:collapse;margin-bottom:10px;">`;
                detailHtml += `<tr style="background:#f0f0f0;"><th style="text-align:left;padding:5px;border:1px solid #ddd;">Fecha</th><th style="text-align:left;padding:5px;border:1px solid #ddd;">Comercial</th></tr>`;
                users.forEach(u => {
                    const dStr = this.parseLocalDate(u.formacion.dateCompleted || u.formacion.date).toLocaleDateString('es-ES');
                    detailHtml += `<tr><td style="padding:5px;border:1px solid #ddd;">${dStr}</td><td style="padding:5px;border:1px solid #ddd;">${this.escapeHtml(`${u.nombre} ${u.apellidos}`)}</td></tr>`;
                });
                detailHtml += `</table>`;
            });
            if (!detailHtml) detailHtml = '<p>No hay asesores formados en el rango seleccionado.</p>';

            const finalSubject = `Formacion Uso Plataforma ${brandName} ${platform} ${sStr} a ${eStr}`.replace(/\s+/g, ' ').trim();
            const safeFilename = finalSubject.replace(/[\\/:*?"<>|]/g, '-');

            const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>${this.escapeHtml(finalSubject)}</title></head>
            <body style="font-family: Calibri, sans-serif;">
                <p>Os adjuntamos el informe detallado del número total de usuarios formados en <b>${this.escapeHtml(brandName)}</b> entre el <b>${rangeLabel}</b>.</p>
                <br>
                ${chartHtml}
                <table style="width:50%;border-collapse:collapse;border:1px solid #000;">
                    <tr style="background:#334155;color:#fff;">
                        <th style="padding:5px;border:1px solid #000;">Mes</th>
                        <th style="padding:5px;border:1px solid #000;">Nº Asesores formados</th>
                    </tr>
                    ${summaryRows}
                </table>
                <br><hr>
                <h2>Desglose detallado (${rangeLabel})</h2>
                <p>Total de asesores formados en el periodo: <b>${monthData.length}</b></p>
                ${detailHtml}
                ${trendHtml}
            </body></html>`;

            const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${safeFilename}.doc`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) { console.error(e); Swal.fire('Error Word', e.message, 'error'); }
    },

    generateReport() {
        try {
            const sStr = document.getElementById('range-start').value;
            const eStr = document.getElementById('range-end').value;
            if (!sStr || !eStr) return;
            const data = this.getScopedData({ includePeriod: false });
            const { start: s, end: e } = this.getInclusiveDateRange(sStr, eStr);
            let txt = `REPORTE CX CIERRE (${sStr} al ${eStr})\n\n`;
            this.clients.forEach(c => {
                const frm = data.filter(u => u.marca === c && u.reqFormacion && u.formacion && u.formacion.status === 'Realizada' && this.isDateInRange(u.formacion.dateCompleted || u.formacion.date, s, e)).length;
                const it = data.filter(u => u.marca === c && u.reqConfig && u.fechaConfig && this.isDateInRange(u.fechaConfig, s, e)).length;
                if (frm > 0 || it > 0) txt += `- ${c}: ${it} IT / ${frm} Certif.\n`;
            });
            Swal.fire({ title: 'Resumen Cierre', html: `<textarea class="w-full h-40 bg-slate-900 text-[10px] p-2 font-mono">${txt}</textarea>`, background: '#1e293b' });
        } catch (e) { Swal.fire('Error Report', e.message, 'error'); }
    },

    downloadBillingCSV() {
        try {
            const sStr = document.getElementById('range-start').value;
            const eStr = document.getElementById('range-end').value;
            if (!sStr || !eStr) return;
            const data = this.getScopedData({ includePeriod: false });
            const { start: s, end: e } = this.getInclusiveDateRange(sStr, eStr);
            let csv = "\uFEFFConcepto;ID;Marca;Nombre;Teléfono;Concesionario;Fecha\n";
            data.forEach(u => {
                if (u.reqConfig && u.fechaConfig && this.isDateInRange(u.fechaConfig, s, e))
                    csv += `Config IT;${u.id};${u.marca};${u.nombre};${u.telefono || ''};${u.concesionario};${u.fechaConfig}\n`;
                if (u.formacion && u.formacion.status === 'Realizada' && this.isDateInRange(u.formacion.dateCompleted || u.formacion.date, s, e))
                    csv += `Formación;${u.id};${u.marca};${u.nombre};${u.telefono || ''};${u.concesionario};${u.formacion.dateCompleted || u.formacion.date}\n`;
            });
            const l = document.createElement("a");
            l.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
            l.download = `Cierre_${sStr}.csv`;
            l.click();
        } catch (e) { Swal.fire('Error CSV', e.message, 'error'); }
    }
};
