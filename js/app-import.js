// js/app-import.js — Importación masiva de comerciales por CSV
const _appImport = {

    async downloadBulkTemplate() {
        const headers = [
            'id Comercial', 'fecha alta', 'marca', 'año', 'nombre', 'apellidos',
            'telefono', 'email', 'concesionario', 'tipo de acceso', 'Serial Tablet',
            'comercial anterior', 'requiere formacion', 'requiere configuracion IT', 'observaciones', 'tipo formacion'
        ];
        const example = [
            '9999', '2026-01-22', 'Kia', '2026', 'Juan', 'Pérez',
            '600123456', 'juan@example.com', 'Sertisa', 'Tablet', 'SN123456',
            'N/A', 'Si', 'No', 'Comercial de nueva incorporación', 'Presencial'
        ];
        const csv = "\uFEFF" + headers.join(';') + "\n" + example.join(';');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "Plantilla_Importacion_Comerciales.csv";
        link.click();
    },

    openBulkImportSelection() {
        this.openBulkImport();
    },

    async openBulkImport() {
        const { value: file } = await Swal.fire({
            title: 'Importación Masiva de Comerciales',
            html: `
                <div class="text-left space-y-4">
                    <div class="bg-indigo-900/20 p-3 rounded-lg border border-indigo-500/30 text-[10px] text-slate-400 space-y-1.5">
                        <p class="font-bold text-indigo-400 mb-2 uppercase">Cómo rellenar la plantilla:</p>
                        <p>• El archivo debe tener <strong>16 columnas</strong> separadas por <strong>punto y coma (;)</strong>.</p>
                        <p>• La primera fila es la cabecera — no la elimines.</p>
                        <p>• Booleanos (<em>requiere formacion / requiere config IT</em>): escribe <strong>Si</strong> o <strong>No</strong>.</p>
                        <p>• Fechas en formato: <strong>AAAA-MM-DD</strong> (ej: 2026-01-22).</p>
                        <p>• <em>tipo de acceso</em>: <strong>Tablet</strong>, <strong>Licencia Cloud</strong> o <strong>Acceso a Informes</strong>.</p>
                        <p>• <em>tipo formacion</em> (col. 16, opcional): <strong>Presencial</strong>, <strong>AVCT</strong>, <strong>Sesión Teams</strong> o texto libre para otro tipo.</p>
                        <div class="mt-2 bg-slate-800/60 rounded p-2 font-mono text-[9px] text-slate-500 leading-relaxed">
                            1.id · 2.fecha alta · 3.marca · 4.año · 5.nombre · 6.apellidos · 7.telefono · 8.email · 9.concesionario · 10.tipo de acceso · 11.Serial Tablet · 12.comercial anterior · 13.requiere formacion · 14.requiere config IT · 15.observaciones · 16.tipo formacion
                        </div>
                        <button onclick="app.downloadBulkTemplate()" class="mt-3 flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition font-bold uppercase">
                            <span class="material-icons-round text-sm">download</span> Descargar Plantilla CSV
                        </button>
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-xs font-bold text-slate-500 uppercase">Seleccionar Archivo CSV</label>
                        <input type="file" id="bulk-csv" accept=".csv" class="custom-field file:bg-slate-700 file:border-none file:text-white file:rounded file:px-2 file:mr-4">
                    </div>
                </div>
            `,
            background: '#1e293b', color: '#fff', showCancelButton: true, confirmButtonText: 'Procesar', confirmButtonColor: '#6366f1',
            preConfirm: () => {
                const f = document.getElementById('bulk-csv').files[0];
                if (!f) return Swal.showValidationMessage('Debe seleccionar un archivo');
                return f;
            }
        });

        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const content = e.target.result;
                await this.processBulkCSV(content);
            };
            reader.readAsText(file);
        }
    },

    async processBulkCSV(content) {
        const lines = content.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) return Swal.fire('Error', 'El archivo está vacío o no tiene registros', 'error');

        const records = [];
        const errors = [];
        const parseBool = (str) => {
            if (!str) return false;
            const val = str.toLowerCase().trim();
            return val === 'si' || val === 'sí' || val === 'yes' || val === '1' || val === 'true';
        };

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(';').map(v => v.trim());
            const rowNum = i + 1;

            if (values.length < 15) {
                errors.push(`Fila ${rowNum}: Faltan columnas (Se esperan al menos 15, se encontraron ${values.length})`);
                continue;
            }

            const [
                id, fechaAlta, marca, year, nombre, apellidos,
                telefono, email, concesionario, tipoAcceso,
                tabletSN, comercialAnterior, reqFormacion,
                reqConfig, observaciones
            ] = values;
            const tipoFormacion = values[15]?.trim() || '';

            const rowErrors = [];
            const allowedTipoAcceso = ['Tablet', 'Licencia Cloud', 'Acceso a Informes'];

            if (!id) rowErrors.push('ID faltante');
            if (!nombre) rowErrors.push('Nombre faltante');
            if (!marca) rowErrors.push('Marca faltante');
            if (!concesionario) rowErrors.push('Concesionario faltante');

            if (tipoAcceso && !allowedTipoAcceso.includes(tipoAcceso)) {
                rowErrors.push(`Tipo de acceso inválido: "${tipoAcceso}". Valores permitidos: ${allowedTipoAcceso.join(', ')}`);
            }

            if (rowErrors.length > 0) {
                errors.push(`Fila ${rowNum}: ${rowErrors.join(', ')}`);
                continue;
            }

            const record = {
                id,
                fechaAlta: fechaAlta || new Date().toISOString().split('T')[0],
                marca,
                year: year || this.year,
                nombre,
                apellidos: apellidos || '',
                telefono: telefono || '',
                email: email || '',
                concesionario,
                tipoAcceso: tipoAcceso || 'Tablet',
                tabletSN: tabletSN || '',
                comercialAnterior: comercialAnterior || '',
                reqFormacion: parseBool(reqFormacion),
                reqConfig: parseBool(reqConfig),
                tipoFormacion: tipoFormacion,
                observaciones: observaciones || '',
                formacion: { status: 'Pendiente', date: '' }
            };

            records.push(record);
        }

        if (errors.length > 0 && records.length === 0) {
            return Swal.fire({
                title: 'Errores en la Importación',
                html: `<div class="text-left text-xs bg-red-900/20 p-3 rounded border border-red-500/50 max-h-60 overflow-y-auto font-mono text-red-100">${errors.join('<br>')}</div>`,
                background: '#1e293b', color: '#fff'
            });
        }

        const confirmHtml = `
            <div class="text-left space-y-3">
                <p class="text-sm">Se han procesado <strong>${records.length}</strong> registros correctamente.</p>
                ${errors.length > 0 ? `
                <div class="p-3 bg-amber-900/20 rounded border border-amber-500/50">
                    <p class="text-[10px] text-amber-400 font-bold uppercase mb-1">Advertencias (${errors.length}):</p>
                    <div class="text-[9px] text-slate-400 max-h-32 overflow-y-auto font-mono">${errors.join('<br>')}</div>
                </div>
                ` : ''}
                <p class="text-xs text-slate-500 italic">¿Desea proceder con la carga masiva?</p>
            </div>
        `;

        const { isConfirmed } = await Swal.fire({
            title: 'Confirmar Carga Masiva',
            html: confirmHtml,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Sí, importar',
            cancelButtonText: 'Cancelar',
            background: '#1e293b', color: '#fff'
        });

        if (isConfirmed) {
            try {
                Swal.fire({ title: 'Importando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

                const response = await fetch('api/records.php?bulk=true', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'all', records })
                });

                if (!response.ok) throw new Error('Error en el servidor');

                await this.fetchData();
                this.renderAll();
                this.logAction('IMPORTAR_BULK', `${records.length} comerciales importados`);
                Swal.fire({ title: 'Éxito', text: `Se han importado ${records.length} registros`, icon: 'success', background: '#1e293b', color: '#fff' });
            } catch (e) {
                Swal.fire({ title: 'Error', text: e.message, icon: 'error', background: '#1e293b', color: '#fff' });
            }
        }
    }
};
