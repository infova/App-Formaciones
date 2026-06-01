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
                        <div class="text-[9px] text-slate-500 uppercase truncate">${u.concesionario || '—'}</div>
                        ${u.tipoFormacion ? `<div class="mt-0.5"><span class="text-[8px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-medium">${u.tipoFormacion}</span></div>` : ''}`;
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
                        <div class="text-[9px] text-slate-400 uppercase truncate mb-1">${u.concesionario}</div>
                        ${u.tipoFormacion ? `<div class="mb-2"><span class="text-[8px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded font-medium">${u.tipoFormacion}</span></div>` : '<div class="mb-2"></div>'}
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
            if (newStatus === 'Realizada') app.openSurveyModal(u);
        } catch (e) {
            u.formacion = formacionBackup;
            if (e.message && e.message.includes('no encontrado')) {
                await app.fetchData();
            } else {
                app.renderAll();
            }
            Swal.fire({ title: 'Error al guardar', text: e.message || 'No se pudo guardar el cambio de estado. Inténtalo de nuevo.', icon: 'error', background: '#1e293b', color: '#fff', confirmButtonColor: '#6366f1' });
        }
    },

    openSurveyModal(u) {
        const brand = (this.clientRecords || []).find(c => c.id == u.client_id);
        const surveyUrl = brand?.survey_url || '';
        const qrEnabled = brand?.survey_qr_enabled && surveyUrl;
        const brandColor = brand?.brand_color || '#6366f1';

        const appName = u.marca || 'Formaciones';
        const assignedBy = u.formacion?.confirmedBy || (this.user?.username || '');
        const emailSubject = encodeURIComponent(`Encuesta de satisfacción — Formación ${appName}`);
        const emailBody = encodeURIComponent(
            `Hola ${u.nombre};\n\n` +
            `Te quería agradecer la implicación y la atención que has tenido durante el día de hoy en la formación de SSC.\n\n` +
            `Te mando un enlace para que valores tu experiencia y me des tu opinión de la formación y si quieres sugerir alguna mejora y comentarme algo, todo me ayudara a crecer y a mejorar\n\n` +
            `Puedes acceder desde este enlace:\n\n` +
            `${surveyUrl || '(URL de encuesta no configurada)'}\n\n` +
            `Muchas gracias.\n\n` +
            `Saludos.`
        );
        const mailtoHref = surveyUrl ? `mailto:${u.email}?subject=${emailSubject}&body=${emailBody}` : '';

        const qrSectionHtml = qrEnabled ? `
            <div style="margin-top:16px;padding-top:14px;border-top:1px solid rgba(100,116,139,0.3);">
                <p style="font-size:10px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;">📱 Código QR — Formación Presencial</p>
                <div style="display:flex;justify-content:center;">
                    <div id="survey-qr-canvas" style="background:#fff;padding:10px;border-radius:8px;display:inline-block;"></div>
                </div>
                <p style="font-size:9px;color:#64748b;text-align:center;margin-top:6px;">Muestra este QR al comercial para que acceda a la encuesta desde su móvil</p>
            </div>` : '';

        const noUrlWarning = !surveyUrl ? `
            <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);border-radius:6px;padding:10px;margin-top:12px;">
                <p style="font-size:10px;color:#f59e0b;margin:0;">⚠ No hay URL de encuesta configurada para <strong>${u.marca || 'esta marca'}</strong>. Configúrala en <em>Gestionar Marcas → Editar marca</em>.</p>
            </div>` : '';

        Swal.fire({
            title: '✅ Formación Completada',
            html: `
                <div style="text-align:left;">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding:10px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);border-radius:8px;">
                        <div style="width:8px;height:8px;border-radius:50%;background:${brandColor};flex-shrink:0;"></div>
                        <div>
                            <p style="font-size:13px;font-weight:700;color:#fff;margin:0;">${u.nombre} ${u.apellidos}</p>
                            <p style="font-size:10px;color:#94a3b8;margin:0;">${u.concesionario || ''} · ${u.marca || ''}</p>
                        </div>
                    </div>
                    <p style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">📧 Enviar Encuesta de Satisfacción</p>
                    ${surveyUrl ? `
                    <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.25);border-radius:8px;padding:10px;font-size:10px;color:#cbd5e1;line-height:1.6;">
                        <strong style="color:#a5b4fc;">Para:</strong> ${u.email || '(sin email)'}<br>
                        <strong style="color:#a5b4fc;">Asunto:</strong> Encuesta de satisfacción — Formación ${appName}<br>
                        <strong style="color:#a5b4fc;">Enlace:</strong> <span style="color:#67e8f9;word-break:break-all;">${surveyUrl}</span>
                    </div>
                    <div style="display:flex;gap:8px;margin-top:10px;">
                        <a href="${mailtoHref}" style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;background:#6366f1;color:#fff;padding:8px 12px;border-radius:6px;font-size:11px;font-weight:700;text-decoration:none;cursor:pointer;">
                            <span class="material-icons-round" style="font-size:14px;">mail</span> Abrir correo
                        </a>
                        <button onclick="navigator.clipboard.writeText('${surveyUrl.replace(/'/g, "\\'")}').then(()=>this.textContent='✓ Copiado').catch(()=>{})" style="flex:1;background:#334155;color:#94a3b8;border:none;padding:8px 12px;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer;">
                            <span class="material-icons-round" style="font-size:14px;vertical-align:middle;">content_copy</span> Copiar enlace
                        </button>
                    </div>` : ''}
                    ${noUrlWarning}
                    ${qrSectionHtml}
                </div>`,
            background: '#1e293b',
            color: '#fff',
            confirmButtonText: 'Cerrar',
            confirmButtonColor: '#475569',
            width: '520px',
            didOpen: () => {
                if (qrEnabled && typeof QRCode !== 'undefined') {
                    new QRCode(document.getElementById('survey-qr-canvas'), {
                        text: surveyUrl,
                        width: 180,
                        height: 180,
                        colorDark: '#1e293b',
                        colorLight: '#ffffff',
                        correctLevel: QRCode.CorrectLevel.M
                    });
                } else if (qrEnabled) {
                    // Fallback si QRCode.js no cargó: mostrar imagen via API externa
                    const el = document.getElementById('survey-qr-canvas');
                    if (el) el.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(surveyUrl)}&size=180x180&margin=2" style="border-radius:4px;" alt="QR">`;
                }
            }
        });
    }
};
