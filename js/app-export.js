// js/app-export.js — Exportación CSV, informes Word y resumen de cierre
const _appExport = {

    exportCSV() {
        try {
            const data = this.getData();
            let csv = "\uFEFFID;FechaAlta;Marca;Nombre;Apellidos;Teléfono;Email;Concesionario;Tipo;S_N_Tablet;ComercialAnterior;Estado;FechaFormacion;F_Config_IT;Observaciones\n";
            data.forEach(u => {
                const obs = (u.observaciones || '').replace(/(\r\n|\n|\r)/gm, " ").replace(/;/g, ",");
                const fStatus = u.formacion?.status || 'Pendiente';
                const fDate = u.formacion?.date || '';
                csv += `${u.id};${u.fechaAlta};${u.marca};${u.nombre};${u.apellidos};${u.telefono || ''};${u.email};${u.concesionario};${u.tipoAcceso};${u.tabletSN || u.serial || ''};${u.usuarioAnterior || ''};${fStatus};${fDate};${u.fechaConfig || ''};${obs}\n`;
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

            const s = new Date(sStr);
            const e = new Date(eStr);
            e.setHours(23, 59, 59, 999);

            const data = this.getData().filter(u => {
                let dateToCheck = null;
                if (type === 'alta') {
                    dateToCheck = new Date(u.fechaAlta);
                } else if (type === 'formacion') {
                    if (u.formacion && u.formacion.date) {
                        dateToCheck = new Date(u.formacion.dateCompleted || u.formacion.date);
                    }
                } else if (type === 'config') {
                    if (u.reqConfig && u.fechaConfig) {
                        dateToCheck = new Date(u.fechaConfig);
                    }
                }
                return dateToCheck && dateToCheck >= s && dateToCheck <= e;
            });

            if (data.length === 0) return Swal.fire('Vacio', 'No hay registros en ese rango y criterio.', 'info');

            let csv = "\uFEFFID;FechaAlta;Marca;Nombre;Apellidos;Teléfono;Email;Concesionario;Tipo;S_N_Tablet;ComercialAnterior;Estado;FechaFormacion;F_Config_IT;Observaciones\n";
            data.forEach(u => {
                const obs = (u.observaciones || '').replace(/(\r\n|\n|\r)/gm, " ").replace(/;/g, ",");
                const fStatus = u.formacion?.status || 'Pendiente';
                const fDate = u.formacion?.date || '';
                csv += `${u.id};${u.fechaAlta};${u.marca};${u.nombre};${u.apellidos};${u.telefono || ''};${u.email};${u.concesionario};${u.tipoAcceso};${u.tabletSN || u.serial || ''};${u.usuarioAnterior || ''};${fStatus};${fDate};${u.fechaConfig || ''};${obs}\n`;
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
                        * Tabla Resumen: Año acumulado hasta fecha fin.<br>
                        * Desglose: Solo mes de fecha fin.
                    </p>
                    <div class="mt-3 flex items-center gap-2">
                        <input type="checkbox" id="word-sim" class="w-3 h-3 rounded bg-slate-800 border-slate-600">
                        <label for="word-sim" class="text-xs text-indigo-400 font-bold">Simular Datos (Gráfica)</label>
                    </div>
                </div>
            `,
            background: '#1e293b', color: '#fff',
            showCancelButton: true, confirmButtonText: 'Generar',
            preConfirm: () => {
                const s = document.getElementById('word-start').value;
                const e = document.getElementById('word-end').value;
                const sim = document.getElementById('word-sim').checked;
                if (!s || !e) return Swal.showValidationMessage('Selecciona fechas');
                return { start: s, end: e, simulate: sim };
            }
        });
        if (dates) this.generateWordDocAdvanced(dates.start, dates.end, dates.simulate);
    },

    generateWordDocAdvanced(sStr, eStr, simulate = false) {
        try {
            const endDate = new Date(eStr);
            const targetMonth = endDate.getMonth();
            const targetYear = endDate.getFullYear();

            let platform = "";
            if (this.brand === 'Kia' || this.brand === 'Kia Canarias') platform = "iDealer";
            else if (this.brand === 'Hyundai') platform = "SSC";

            const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            const monthName = months[targetMonth];

            const data = this.getData().filter(u => u.formacion && u.formacion.status === 'Realizada');

            const ytdData = data.filter(u => {
                const d = new Date(u.formacion.dateCompleted || u.formacion.date);
                return d.getFullYear() === targetYear && d.getMonth() <= targetMonth;
            });

            let maxCount = 0;
            const monthlyCounts = [];
            for (let m = 0; m < 12; m++) {
                let count = ytdData.filter(u => new Date(u.formacion.dateCompleted || u.formacion.date).getMonth() === m).length;
                if (simulate) count = Math.floor(Math.random() * 50) + 5;
                monthlyCounts.push(count);
                if (count > maxCount) maxCount = count;
            }
            if (maxCount === 0) maxCount = 1;

            const barColor = this.brand === 'Hyundai' ? '#00aad2' : (this.brand === 'Kia' ? '#bb162b' : '#6366f1');
            const shortMonths = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

            let chartHtml = `
                <div style="margin-bottom:30px; border:1px solid #ddd; padding:20px; background:#f9f9f9;">
                    <h3 style="margin:0 0 15px 0; color:#333; text-align:center;">Evolución Anual (${targetYear})</h3>
                    <table style="width:100%; height:150px; border-collapse:collapse; margin:0 auto;">
                        <tr style="height:120px; vertical-align:bottom;">`;

            for (let m = 0; m < 12; m++) {
                const count = monthlyCounts[m];
                const pxHeight = Math.round((count / maxCount) * 120);
                const finalH = count > 0 && pxHeight < 2 ? 2 : pxHeight;
                chartHtml += `
                    <td style="width:8%; text-align:center; vertical-align:bottom; padding:0 2px; height:150px;">
                        <div style="font-size:8px; color:#555; margin-bottom:2px;">${count > 0 ? count : '&nbsp;'}</div>
                        ${count > 0
                            ? `<table cellspacing="0" cellpadding="0" style="width:80%; margin:0 auto; border-collapse:collapse;"><tr><td style="background:${barColor}; height:${finalH}px; font-size:1px; line-height:1px;">&nbsp;</td></tr></table>`
                            : '<div style="height:1px;">&nbsp;</div>'}
                    </td>`;
            }
            chartHtml += `</tr><tr>`;
            for (let m = 0; m < 12; m++) {
                chartHtml += `<td style="text-align:center; font-size:9px; color:#666; border-top:1px solid #ccc; padding-top:4px;">${shortMonths[m]}</td>`;
            }
            chartHtml += `</tr></table></div>`;

            let trendHtml = "";
            if (targetMonth >= 0) {
                const currentC = monthlyCounts[targetMonth];
                let avgText = "", avgIcon = "", rankText = "";

                if (targetMonth === 0) {
                    avgText = "el <b>inicio del ejercicio</b> (sin media previa)";
                    avgIcon = "🏁";
                    rankText = "el <b>primer mes</b> del año.";
                } else {
                    const prevMonthsCounts = monthlyCounts.slice(0, targetMonth);
                    const sumPrev = prevMonthsCounts.reduce((a, b) => a + b, 0);
                    const avgPrev = Math.round(sumPrev / prevMonthsCounts.length);

                    if (avgPrev > 0) {
                        const diffAvg = currentC - avgPrev;
                        const pctAvg = Math.round((diffAvg / avgPrev) * 100);
                        if (pctAvg > 0) { avgText = `un <b>${pctAvg}% por encima</b> de la media anual (${avgPrev})`; avgIcon = "📈"; }
                        else if (pctAvg < 0) { avgText = `un <b>${Math.abs(pctAvg)}% por debajo</b> de la media anual (${avgPrev})`; avgIcon = "📉"; }
                        else { avgText = `igual a la media anual (${avgPrev})`; avgIcon = "="; }
                    } else {
                        avgText = "el primer registro significativo del año";
                        avgIcon = "🔷";
                    }

                    const ytdCountsSoFar = monthlyCounts.slice(0, targetMonth + 1);
                    const sortedCounts = [...ytdCountsSoFar].sort((a, b) => b - a);
                    const rank = sortedCounts.indexOf(currentC) + 1;

                    if (rank === 1) rankText = "el <b>mejor mes</b> del año hasta la fecha.";
                    else if (rank === 2) rankText = "el <b>2º mejor mes</b> del año.";
                    else rankText = `el <b>${rank}º mes</b> en volumen.`;
                }

                trendHtml = `
                    <br><hr><br>
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:15px; border-radius:5px;">
                        <h3 style="margin-top:0; color:#334155;">Análisis Ejecutivo</h3>
                        <p style="font-size:14px; line-height:1.5;">
                            El mes de <b>${monthName}</b> ha cerrado con <b>${monthlyCounts[targetMonth]} formaciones</b>.
                            <br><br>
                            ${avgIcon} Se sitúa ${avgText}.
                            <br>
                            🏆 Representa ${rankText}
                        </p>
                    </div>`;
            }

            let summaryRows = "", totalYTD = 0;
            for (let m = 0; m <= targetMonth; m++) {
                const c = monthlyCounts[m];
                totalYTD += c;
                summaryRows += `<tr><td style="padding:5px;border:1px solid #000;">${months[m]}</td><td style="padding:5px;border:1px solid #000;">${c}</td></tr>`;
            }
            summaryRows += `<tr style="font-weight:bold;background:#eee;"><td style="padding:5px;border:1px solid #000;">Total Acumulado</td><td style="padding:5px;border:1px solid #000;">${totalYTD}</td></tr>`;

            const monthData = ytdData.filter(u => new Date(u.formacion.dateCompleted || u.formacion.date).getMonth() === targetMonth);
            const byDealer = {};
            monthData.forEach(u => {
                if (!byDealer[u.concesionario]) byDealer[u.concesionario] = [];
                byDealer[u.concesionario].push(u);
            });

            let detailHtml = "";
            Object.keys(byDealer).sort().forEach(d => {
                const users = byDealer[d];
                detailHtml += `<h3 style="margin-top:20px;border-bottom:1px solid #ccc;">${d} (${users.length})</h3>`;
                detailHtml += `<table style="width:100%;border-collapse:collapse;margin-bottom:10px;">`;
                detailHtml += `<tr style="background:#f0f0f0;"><th style="text-align:left;padding:5px;border:1px solid #ddd;">Fecha</th><th style="text-align:left;padding:5px;border:1px solid #ddd;">Comercial</th></tr>`;
                users.forEach(u => {
                    const dStr = new Date(u.formacion.dateCompleted || u.formacion.date).toLocaleDateString();
                    detailHtml += `<tr><td style="padding:5px;border:1px solid #ddd;">${dStr}</td><td style="padding:5px;border:1px solid #ddd;">${u.nombre} ${u.apellidos}</td></tr>`;
                });
                detailHtml += `</table>`;
            });

            const brandName = this.brand === 'all' ? 'Todas' : this.brand;
            const finalSubject = `Formacion Uso Plataforma ${brandName} ${platform} ${monthName} ${targetYear}`;

            const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
            <head><meta charset='utf-8'><title>${finalSubject}</title></head>
            <body style="font-family: Calibri, sans-serif;">
                <p>Os adjuntamos el informe detallado del número total de usuarios formados en <b>${brandName}</b> en el mes de <b>${monthName}</b>.</p>
                <br>
                ${chartHtml}
                <table style="width:50%;border-collapse:collapse;border:1px solid #000;">
                    <tr style="background:#334155;color:#fff;">
                        <th style="padding:5px;border:1px solid #000;">Mes</th>
                        <th style="padding:5px;border:1px solid #000;">Nº Formaciones</th>
                    </tr>
                    ${summaryRows}
                </table>
                <br><hr>
                <h2>Desglose Detallado (${monthName})</h2>
                <p>Total Formaciones este mes: <b>${monthData.length}</b></p>
                ${detailHtml}
                ${trendHtml}
            </body></html>`;

            const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${finalSubject}.doc`;
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
            const data = this.getData();
            const s = new Date(sStr);
            const e = new Date(eStr);
            e.setHours(23, 59, 59, 999);
            let txt = `REPORTE CX CIERRE (${sStr} al ${eStr})\n\n`;
            this.clients.forEach(c => {
                const frm = data.filter(u => u.marca === c && u.reqFormacion && u.formacion && u.formacion.status === 'Realizada' && new Date(u.formacion.dateCompleted || u.formacion.date) >= s && new Date(u.formacion.dateCompleted || u.formacion.date) <= e).length;
                const it = data.filter(u => u.marca === c && u.reqConfig && u.fechaConfig && new Date(u.fechaConfig) >= s && new Date(u.fechaConfig) <= e).length;
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
            const data = this.getData();
            const s = new Date(sStr);
            const e = new Date(eStr);
            e.setHours(23, 59, 59, 999);
            let csv = "\uFEFFConcepto;ID;Marca;Nombre;Teléfono;Concesionario;Fecha\n";
            data.forEach(u => {
                if (u.reqConfig && u.fechaConfig && new Date(u.fechaConfig) >= s && new Date(u.fechaConfig) <= e)
                    csv += `Config IT;${u.id};${u.marca};${u.nombre};${u.telefono || ''};${u.concesionario};${u.fechaConfig}\n`;
                if (u.formacion && u.formacion.status === 'Realizada' && new Date(u.formacion.dateCompleted || u.formacion.date) >= s && new Date(u.formacion.dateCompleted || u.formacion.date) <= e)
                    csv += `Formación;${u.id};${u.marca};${u.nombre};${u.telefono || ''};${u.concesionario};${u.formacion.dateCompleted || u.formacion.date}\n`;
            });
            const l = document.createElement("a");
            l.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
            l.download = `Cierre_${sStr}.csv`;
            l.click();
        } catch (e) { Swal.fire('Error CSV', e.message, 'error'); }
    }
};
