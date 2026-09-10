// js/app-training-groups.js — Selección múltiple y sesiones formativas grupales
const _appTrainingGroups = {

    getTrainingSession(id) {
        return (this.trainingSessions || []).find(session => session.id === id);
    },

    getTrainingSessionParticipants(session) {
        if (!session) return [];
        return (session.participants || []).map(meta => ({
            meta,
            user: this.db.find(user => String(user.id) === String(meta.recordId)) || null
        }));
    },

    getVisibleTrainingCandidates() {
        const searchEl = document.getElementById('search-kanban');
        const search = (searchEl?.value || '').toLowerCase();
        return this.getData().filter(user =>
            user.reqFormacion &&
            (user.formacion?.status || 'Pendiente') === 'Pendiente' &&
            !user.formacion?.groupId &&
            this.matchesSearch(user, search)
        );
    },

    toggleTrainingSelectionMode() {
        this.trainingSelectionMode = !this.trainingSelectionMode;
        this.selectedTrainingIds.clear();
        this.renderKanban();
    },

    cancelTrainingSelection() {
        this.trainingSelectionMode = false;
        this.selectedTrainingIds.clear();
        this.renderKanban();
    },

    toggleTrainingSelection(id) {
        if (!this.trainingSelectionMode) return;
        const user = this.db.find(item => String(item.id) === String(id));
        if (!user || user.formacion?.groupId || (user.formacion?.status || 'Pendiente') !== 'Pendiente') return;
        const key = String(id);
        if (this.selectedTrainingIds.has(key)) this.selectedTrainingIds.delete(key);
        else this.selectedTrainingIds.add(key);
        this.renderKanban();
    },

    handleTrainingSelectionKeydown(event, id) {
        if (!this.trainingSelectionMode || !['Enter', ' '].includes(event.key)) return;
        event.preventDefault();
        this.toggleTrainingSelection(id);
    },

    selectAllVisibleTraining() {
        const visible = this.getVisibleTrainingCandidates();
        const allSelected = visible.length > 0 && visible.every(user => this.selectedTrainingIds.has(String(user.id)));
        visible.forEach(user => {
            const id = String(user.id);
            if (allSelected) this.selectedTrainingIds.delete(id);
            else this.selectedTrainingIds.add(id);
        });
        this.renderKanban();
    },

    updateTrainingSelectionToolbar() {
        const bar = document.getElementById('kanban-selection-bar');
        const toggle = document.getElementById('btn-training-selection');
        const count = document.getElementById('training-selection-count');
        const create = document.getElementById('btn-create-training-group');
        const selectAll = document.getElementById('btn-select-visible-training');
        if (!bar || !toggle || !count || !create || !selectAll) return;

        bar.classList.toggle('hidden', !this.trainingSelectionMode);
        toggle.classList.toggle('is-active', this.trainingSelectionMode);
        toggle.setAttribute('aria-pressed', this.trainingSelectionMode ? 'true' : 'false');
        toggle.querySelector('.selection-label').textContent = this.trainingSelectionMode ? 'Seleccionando' : 'Seleccionar asesores';

        const selectedCount = this.selectedTrainingIds.size;
        count.textContent = `${selectedCount} asesor${selectedCount === 1 ? '' : 'es'} seleccionado${selectedCount === 1 ? '' : 's'}`;
        create.disabled = selectedCount < 2;
        create.setAttribute('aria-disabled', selectedCount < 2 ? 'true' : 'false');

        const visible = this.getVisibleTrainingCandidates();
        const allSelected = visible.length > 0 && visible.every(user => this.selectedTrainingIds.has(String(user.id)));
        selectAll.disabled = visible.length === 0;
        selectAll.innerHTML = `<span class="material-icons-round text-sm">${allSelected ? 'deselect' : 'select_all'}</span>${allSelected ? 'Deseleccionar visibles' : 'Seleccionar visibles'}`;
    },

    getDefaultTrainingDate() {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        while ([0, 6].includes(date.getDay())) date.setDate(date.getDate() + 1);
        date.setHours(10, 0, 0, 0);
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        return date.toISOString().slice(0, 16);
    },

    getTrainingPlatformName(brand) {
        if (brand === 'Kia' || brand === 'Kia Canarias') return 'Kia iDealer';
        if (brand === 'Hyundai') return 'Hyundai SSC';
        return brand || 'la plataforma';
    },

    formatTrainingEmailDate(value) {
        if (!value) return '[fecha y hora]';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '[fecha y hora]';
        return date.toLocaleString('es-ES', {
            weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    },

    getTrainingEmailDefaults(participants, scheduledAt) {
        const brand = participants[0]?.marca || '';
        const platform = this.getTrainingPlatformName(brand);
        const dateText = this.formatTrainingEmailDate(scheduledAt);
        return {
            subject: `Formación grupal en ${platform}: convocatoria`,
            body: `Hola,\n\nOs convocamos a una formación online para ayudaros a sacar más partido a ${platform}.\n\nFecha y hora: ${dateText}\nDuración: 40 minutos\nModalidad: Sesión Teams\n\nRecibiréis el enlace de acceso antes de la sesión. Si no podéis asistir, por favor indicadnoslo respondiendo a este correo.\n\nGracias y un saludo.`
        };
    },

    replaceTrainingEmailLine(body, label, value, removeWhenEmpty = false) {
        const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const linePattern = new RegExp(`^${escapedLabel}:.*$`, 'mi');
        if (!value && removeWhenEmpty) {
            return body.replace(linePattern, '').replace(/\n{3,}/g, '\n\n').trim();
        }
        const nextLine = `${label}: ${value}`;
        if (linePattern.test(body)) return body.replace(linePattern, nextLine);
        return `${body.trim()}\n\n${nextLine}`;
    },

    syncTrainingEmailBodyFromForm() {
        const bodyField = document.getElementById('tg-body');
        if (!bodyField) return;
        const dateField = document.getElementById('tg-date');
        const durationField = document.getElementById('tg-duration');
        const typeField = document.getElementById('tg-type');
        const linkField = document.getElementById('tg-link');
        const locationField = document.getElementById('tg-location');

        let body = bodyField.value;
        if (dateField) body = this.replaceTrainingEmailLine(body, 'Fecha y hora', this.formatTrainingEmailDate(dateField.value));
        if (durationField) {
            const duration = `${Number(durationField.value) || 40} minutos`;
            const hasDurationLine = /^Duración:.*$/mi.test(body);
            const hasDurationProse = /aproximadamente\s+\d+\s+minutos/i.test(body);
            if (hasDurationLine) body = this.replaceTrainingEmailLine(body, 'Duración', duration);
            else if (hasDurationProse) body = body.replace(/aproximadamente\s+\d+\s+minutos/i, `aproximadamente ${duration}`);
            else body = this.replaceTrainingEmailLine(body, 'Duración', duration);
        }
        if (typeField) body = this.replaceTrainingEmailLine(body, 'Modalidad', typeField.value.trim() || '[modalidad]');
        if (linkField) body = this.replaceTrainingEmailLine(body, 'Enlace de acceso', linkField.value.trim(), true);
        if (locationField) body = this.replaceTrainingEmailLine(body, 'Ubicación', locationField.value.trim(), true);
        bodyField.value = body;
    },

    bindTrainingEmailFormSync() {
        ['tg-date', 'tg-duration', 'tg-type', 'tg-link', 'tg-location'].forEach(id => {
            const field = document.getElementById(id);
            if (!field) return;
            field.addEventListener('input', () => this.syncTrainingEmailBodyFromForm());
            field.addEventListener('change', () => this.syncTrainingEmailBodyFromForm());
        });
    },

    getCommercialEmailCopyButton(user) {
        const email = (user?.email || '').trim();
        const name = `${user?.nombre || ''} ${user?.apellidos || ''}`.trim();
        if (!email) {
            return `<button type="button" class="training-email-copy" disabled title="Este asesor no tiene email" aria-label="${this.escapeAttr(name)} no tiene email"><span class="material-icons-round">content_copy</span></button>`;
        }
        return `<button type="button" class="training-email-copy" data-email="${this.escapeAttr(email)}" onclick="app.copyCommercialEmail(this)" title="Copiar ${this.escapeAttr(email)}" aria-label="Copiar email de ${this.escapeAttr(name)}"><span class="material-icons-round">content_copy</span></button>`;
    },

    getTrainingParticipantsModalHtml(participants) {
        const dealers = [...new Set(participants.map(user => user.concesionario || 'Sin concesionario'))];
        return dealers.map(dealer => {
            const dealerUsers = participants.filter(user => (user.concesionario || 'Sin concesionario') === dealer);
            return `<div class="training-participant-group">
                <div class="training-participant-dealer">${this.escapeHtml(dealer)} <span>${dealerUsers.length}</span></div>
                ${dealerUsers.map(user => `<div class="training-participant-row"><div class="training-participant-name"><span>${this.escapeHtml(`${user.nombre} ${user.apellidos}`)}</span>${this.getCommercialEmailCopyButton(user)}</div><small>${this.escapeHtml(user.email || 'Sin email')}</small></div>`).join('')}
            </div>`;
        }).join('');
    },

    async copyCommercialEmail(button) {
        const email = button?.dataset?.email || '';
        if (!email) return;
        const originalHtml = button.innerHTML;
        const originalLabel = button.getAttribute('aria-label');
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(email);
            } else {
                const fallback = document.createElement('textarea');
                fallback.value = email;
                fallback.style.position = 'fixed';
                fallback.style.opacity = '0';
                document.body.appendChild(fallback);
                fallback.select();
                document.execCommand('copy');
                fallback.remove();
            }
            button.classList.add('is-copied');
            button.innerHTML = '<span class="material-icons-round">check</span>';
            button.setAttribute('aria-label', `Email copiado: ${email}`);
            button.title = `Copiado: ${email}`;
            setTimeout(() => {
                if (!button.isConnected) return;
                button.classList.remove('is-copied');
                button.innerHTML = originalHtml;
                button.setAttribute('aria-label', originalLabel || 'Copiar email');
                button.title = `Copiar ${email}`;
            }, 1600);
        } catch (error) {
            await Swal.fire({ title: 'No se pudo copiar', text: email, icon: 'error', background: '#1e293b', color: '#fff' });
        }
    },

    validateGroupParticipants(participants) {
        if (participants.length < 2) return 'Selecciona al menos dos asesores.';
        const clientIds = new Set(participants.map(user => user.client_id).filter(value => value !== null && value !== undefined && value !== ''));
        const brands = new Set(participants.map(user => (user.marca || '').trim().toLowerCase()).filter(Boolean));
        if (clientIds.size > 1 || brands.size > 1) {
            return 'Los asesores deben pertenecer a la misma marca y país. Puedes crear un grupo separado para cada marca.';
        }
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalid = participants.filter(user => !emailPattern.test((user.email || '').trim()));
        if (invalid.length) {
            return `Revisa el email de: ${invalid.map(user => `${user.nombre} ${user.apellidos}`).join(', ')}.`;
        }
        return '';
    },

    getResponsibleOptions(users, selected) {
        const candidates = users.length ? [...users] : [{ username: this.user?.username || 'Usuario' }];
        if (selected && !candidates.some(user => user.username === selected)) candidates.unshift({ username: selected });
        return candidates.map(user => {
            const username = user.username || '';
            return `<option value="${this.escapeAttr(username)}" ${username === selected ? 'selected' : ''}>${this.escapeHtml(username)}</option>`;
        }).join('');
    },

    async createTrainingGroup() {
        const participants = [...this.selectedTrainingIds]
            .map(id => this.db.find(user => String(user.id) === String(id)))
            .filter(Boolean);
        const validationError = this.validateGroupParticipants(participants);
        if (validationError) {
            await Swal.fire({ title: 'No se puede crear el grupo', text: validationError, icon: 'warning', background: '#1e293b', color: '#fff', confirmButtonColor: '#6366f1' });
            return;
        }

        const scheduledAt = this.getDefaultTrainingDate();
        const defaults = this.getTrainingEmailDefaults(participants, scheduledAt);
        const brand = participants[0]?.marca || 'Formación';
        const dealers = [...new Set(participants.map(user => user.concesionario || 'Sin concesionario'))];
        let users = [];
        if (this.user?.role === 'admin') {
            try { users = await this.apiGetUsers(); } catch (e) { users = []; }
        }
        const responsible = this.user?.username || users[0]?.username || '';
        const participantsHtml = this.getTrainingParticipantsModalHtml(participants);

        const result = await Swal.fire({
            title: 'Crear formación grupal',
            html: `<div class="training-form-layout">
                <section class="training-form-section">
                    <div class="training-form-heading"><span class="material-icons-round">groups</span><div><strong>Participantes</strong><small>${participants.length} asesores · ${dealers.length} concesionarios · pulsa el icono para copiar el email</small></div></div>
                    <div class="training-participants-list">${participantsHtml}</div>
                </section>
                <section class="training-form-section training-form-grid">
                    <div class="training-form-heading training-form-heading-full"><span class="material-icons-round">event</span><div><strong>Datos de la sesión</strong><small>La información se aplicará a todo el grupo</small></div></div>
                    <label class="training-field training-field-full"><span>Nombre de la formación *</span><input id="tg-title" class="custom-field" value="${this.escapeAttr(`Formación grupal ${brand}`)}"></label>
                    <label class="training-field"><span>Fecha y hora *</span><input id="tg-date" type="datetime-local" class="custom-field" value="${scheduledAt}"></label>
                    <label class="training-field"><span>Duración</span><select id="tg-duration" class="custom-field"><option value="30">30 minutos</option><option value="40" selected>40 minutos</option><option value="60">60 minutos</option><option value="90">90 minutos</option><option value="120">120 minutos</option></select></label>
                    <label class="training-field"><span>Modalidad *</span><input id="tg-type" class="custom-field" list="tg-types" value="Sesión Teams"><datalist id="tg-types"><option value="Sesión Teams"><option value="Presencial"><option value="AVCT"></datalist></label>
                    <label class="training-field"><span>Responsable *</span><select id="tg-responsible" class="custom-field">${this.getResponsibleOptions(users, responsible)}</select></label>
                    <label class="training-field training-field-full"><span>Enlace de Teams</span><input id="tg-link" type="url" class="custom-field" placeholder="https://teams.microsoft.com/..."></label>
                    <label class="training-field training-field-full"><span>Ubicación o indicaciones</span><input id="tg-location" class="custom-field" placeholder="Opcional"></label>
                </section>
                <section class="training-form-section training-form-grid">
                    <div class="training-form-heading training-form-heading-full"><span class="material-icons-round">mail</span><div><strong>Convocatoria</strong><small>Se enviará por CCO para proteger las direcciones</small></div></div>
                    <label class="training-field training-field-full"><span>Asunto *</span><input id="tg-subject" class="custom-field" value="${this.escapeAttr(defaults.subject)}"></label>
                    <label class="training-field training-field-full"><span>Mensaje *</span><textarea id="tg-body" class="custom-field training-email-body">${this.escapeHtml(defaults.body)}</textarea></label>
                </section>
            </div>`,
            width: 780,
            background: '#1e293b',
            color: '#fff',
            showCancelButton: true,
            confirmButtonText: 'Crear formación',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#6366f1',
            focusConfirm: false,
            didOpen: () => this.bindTrainingEmailFormSync(),
            preConfirm: () => {
                this.syncTrainingEmailBodyFromForm();
                const form = {
                    title: document.getElementById('tg-title').value.trim(),
                    scheduledAt: document.getElementById('tg-date').value,
                    durationMinutes: Number(document.getElementById('tg-duration').value),
                    trainingType: document.getElementById('tg-type').value.trim(),
                    confirmedBy: document.getElementById('tg-responsible').value,
                    meetingLink: document.getElementById('tg-link').value.trim(),
                    location: document.getElementById('tg-location').value.trim(),
                    emailSubject: document.getElementById('tg-subject').value.trim(),
                    emailBody: document.getElementById('tg-body').value.trim()
                };
                if (!form.title || !form.scheduledAt || !form.trainingType || !form.confirmedBy || !form.emailSubject || !form.emailBody) {
                    Swal.showValidationMessage('Completa todos los campos obligatorios.');
                    return false;
                }
                return form;
            }
        });
        if (!result.isConfirmed) return;

        try {
            Swal.fire({ title: 'Creando formación...', allowOutsideClick: false, background: '#1e293b', color: '#fff', didOpen: () => Swal.showLoading() });
            const session = await this.apiCreateTrainingSession({
                ...result.value,
                participantIds: participants.map(user => String(user.id)),
                createdBy: this.user?.username || ''
            });
            this.trainingSelectionMode = false;
            this.selectedTrainingIds.clear();
            await this.refreshTrainingData();
            this.logAction('CREAR_FORMACION_GRUPAL', `${session.title} — ${participants.length} asesores`);
            const next = await Swal.fire({
                title: 'Formación grupal creada',
                text: `${participants.length} asesores de ${dealers.length} concesionarios.`,
                icon: 'success',
                background: '#1e293b', color: '#fff', confirmButtonColor: '#6366f1',
                confirmButtonText: 'Preparar convocatoria', showCancelButton: true, cancelButtonText: 'Enviar más tarde'
            });
            if (next.isConfirmed) await this.openTrainingGroupEmail(session.id);
        } catch (error) {
            await Swal.fire({ title: 'Error al crear el grupo', text: error.message, icon: 'error', background: '#1e293b', color: '#fff', confirmButtonColor: '#6366f1' });
            await this.refreshTrainingData();
        }
    },

    async editTrainingGroup(id) {
        const session = this.getTrainingSession(id);
        if (!session) return;
        let users = [];
        if (this.user?.role === 'admin') {
            try { users = await this.apiGetUsers(); } catch (e) { users = []; }
        }
        const participantUsers = this.getTrainingSessionParticipants(session).map(item => item.user).filter(Boolean);
        const participantDealers = [...new Set(participantUsers.map(user => user.concesionario || 'Sin concesionario'))];
        const participantsHtml = this.getTrainingParticipantsModalHtml(participantUsers);
        const result = await Swal.fire({
            title: 'Editar formación grupal',
            html: `<div class="training-form-layout">
                <section class="training-form-section">
                    <div class="training-form-heading"><span class="material-icons-round">groups</span><div><strong>Participantes</strong><small>${participantUsers.length} asesores · ${participantDealers.length} concesionarios · pulsa el icono para copiar el email</small></div></div>
                    <div class="training-participants-list">${participantsHtml}</div>
                </section>
                <section class="training-form-section training-form-grid">
                    <label class="training-field training-field-full"><span>Nombre *</span><input id="tg-title" class="custom-field" value="${this.escapeAttr(session.title)}"></label>
                    <label class="training-field"><span>Fecha y hora *</span><input id="tg-date" type="datetime-local" class="custom-field" value="${this.escapeAttr(session.scheduledAt || '')}"></label>
                    <label class="training-field"><span>Duración</span><input id="tg-duration" type="number" min="10" max="480" class="custom-field" value="${session.durationMinutes || 40}"></label>
                    <label class="training-field"><span>Modalidad *</span><input id="tg-type" class="custom-field" value="${this.escapeAttr(session.trainingType || '')}"></label>
                    <label class="training-field"><span>Responsable *</span><select id="tg-responsible" class="custom-field">${this.getResponsibleOptions(users, session.confirmedBy || this.user?.username || '')}</select></label>
                    <label class="training-field training-field-full"><span>Enlace de Teams</span><input id="tg-link" type="url" class="custom-field" value="${this.escapeAttr(session.meetingLink || '')}"></label>
                    <label class="training-field training-field-full"><span>Ubicación o indicaciones</span><input id="tg-location" class="custom-field" value="${this.escapeAttr(session.location || '')}"></label>
                    <label class="training-field training-field-full"><span>Asunto del correo *</span><input id="tg-subject" class="custom-field" value="${this.escapeAttr(session.emailSubject || '')}"></label>
                    <label class="training-field training-field-full"><span>Mensaje *</span><textarea id="tg-body" class="custom-field training-email-body">${this.escapeHtml(session.emailBody || '')}</textarea></label>
                </section>
            </div>`,
            width: 720, background: '#1e293b', color: '#fff', showCancelButton: true,
            confirmButtonText: 'Guardar cambios', cancelButtonText: 'Cancelar', confirmButtonColor: '#6366f1', focusConfirm: false,
            didOpen: () => this.bindTrainingEmailFormSync(),
            preConfirm: () => {
                this.syncTrainingEmailBodyFromForm();
                const form = {
                    title: document.getElementById('tg-title').value.trim(),
                    scheduledAt: document.getElementById('tg-date').value,
                    durationMinutes: Number(document.getElementById('tg-duration').value),
                    trainingType: document.getElementById('tg-type').value.trim(),
                    confirmedBy: document.getElementById('tg-responsible').value,
                    meetingLink: document.getElementById('tg-link').value.trim(),
                    location: document.getElementById('tg-location').value.trim(),
                    emailSubject: document.getElementById('tg-subject').value.trim(),
                    emailBody: document.getElementById('tg-body').value.trim()
                };
                if (!form.title || !form.scheduledAt || !form.trainingType || !form.confirmedBy || !form.emailSubject || !form.emailBody) {
                    Swal.showValidationMessage('Completa todos los campos obligatorios.');
                    return false;
                }
                return form;
            }
        });
        if (!result.isConfirmed) return;
        try {
            await this.apiUpdateTrainingSession(id, result.value);
            await this.refreshTrainingData();
            this.logAction('EDITAR_FORMACION_GRUPAL', session.title);
            await Swal.fire({ title: 'Cambios guardados', icon: 'success', timer: 1600, showConfirmButton: false, background: '#1e293b', color: '#fff' });
        } catch (error) {
            await Swal.fire({ title: 'No se pudo guardar', text: error.message, icon: 'error', background: '#1e293b', color: '#fff' });
        }
    },

    openTrainingGroupDetails(id) {
        const session = this.getTrainingSession(id);
        if (!session) return;
        const participants = this.getTrainingSessionParticipants(session);
        const dealers = [...new Set(participants.map(item => item.user?.concesionario || 'Sin concesionario'))];
        const attended = participants.filter(item => item.meta.attendanceStatus === 'Asistió').length;
        const noShows = participants.filter(item => item.meta.attendanceStatus === 'No presentado').length;
        const final = ['Realizada', 'No Realizada'].includes(session.status);
        const safeId = this.escapeAttr(session.id);
        const rows = participants.map(item => {
            const name = item.user ? `${item.user.nombre} ${item.user.apellidos}` : `Registro ${item.meta.recordId}`;
            const attendance = item.meta.attendanceStatus || 'Pendiente';
            const attendanceClass = attendance === 'Asistió' ? 'is-attended' : attendance === 'No presentado' ? 'is-no-show' : '';
            return `<div class="training-detail-person"><div><div class="training-participant-name"><strong>${this.escapeHtml(name)}</strong>${this.getCommercialEmailCopyButton(item.user)}</div><small>${this.escapeHtml(item.user?.concesionario || '')} · ${this.escapeHtml(item.user?.email || '')}</small></div><span class="training-attendance ${attendanceClass}">${this.escapeHtml(attendance)}</span></div>`;
        }).join('');
        Swal.fire({
            title: this.escapeHtml(session.title),
            html: `<div class="training-detail">
                <div class="training-detail-summary">
                    <div><span class="material-icons-round">groups</span><strong>${participants.length}</strong><small>asesores</small></div>
                    <div><span class="material-icons-round">storefront</span><strong>${dealers.length}</strong><small>concesionarios</small></div>
                    <div><span class="material-icons-round">event</span><strong>${this.escapeHtml(this.formatDateTimeEU(session.scheduledAt) || 'Sin fecha')}</strong><small>${this.escapeHtml(session.trainingType || '')}</small></div>
                </div>
                ${final ? `<div class="training-result-strip"><span>${attended} asistieron</span><span>${noShows} no presentados</span></div>` : ''}
                <div class="training-detail-meta"><span><b>Estado:</b> ${this.escapeHtml(session.status)}</span><span><b>Responsable:</b> ${this.escapeHtml(session.confirmedBy || 'Sin asignar')}</span>${session.meetingLink ? `<a href="${this.escapeAttr(session.meetingLink)}" target="_blank" rel="noopener">Abrir enlace de Teams</a>` : ''}${session.location ? `<span><b>Ubicación:</b> ${this.escapeHtml(session.location)}</span>` : ''}</div>
                <div class="training-detail-list">${rows}</div>
                <div class="training-detail-actions">
                    ${!final ? `<button type="button" onclick="Swal.close(); app.openTrainingGroupEmail('${safeId}')" class="training-action-primary"><span class="material-icons-round">mail</span>Preparar convocatoria</button>` : ''}
                    ${session.status === 'Realizada' ? `<button type="button" onclick="Swal.close(); app.openTrainingGroupSurvey('${safeId}')" class="training-action-primary"><span class="material-icons-round">rate_review</span>Enviar encuesta</button>` : ''}
                    ${!final ? `<button type="button" onclick="Swal.close(); app.editTrainingGroup('${safeId}')" class="training-action-secondary"><span class="material-icons-round">edit</span>Editar</button>` : ''}
                    ${!final ? `<button type="button" onclick="Swal.close(); app.disbandTrainingGroup('${safeId}')" class="training-action-danger"><span class="material-icons-round">link_off</span>Disolver grupo</button>` : ''}
                </div>
            </div>`,
            width: 680, background: '#1e293b', color: '#fff', confirmButtonText: 'Cerrar', confirmButtonColor: '#475569'
        });
    },

    async openTrainingGroupEmail(id) {
        const session = this.getTrainingSession(id);
        if (!session) return;
        const participants = this.getTrainingSessionParticipants(session);
        const validationError = this.validateGroupParticipants(participants.map(item => item.user).filter(Boolean));
        if (validationError) {
            await Swal.fire({ title: 'No se puede preparar el correo', text: validationError, icon: 'warning', background: '#1e293b', color: '#fff' });
            return;
        }
        const emails = [...new Set(participants.map(item => item.user.email.trim().toLowerCase()))];
        const mailto = `mailto:?bcc=${encodeURIComponent(emails.join(','))}&subject=${encodeURIComponent(session.emailSubject || session.title)}&body=${encodeURIComponent(session.emailBody || '')}`;
        const result = await Swal.fire({
            title: 'Preparar convocatoria grupal',
            html: `<div class="training-email-preview">
                <div class="training-privacy-note"><span class="material-icons-round">privacy_tip</span><div><strong>Destinatarios en CCO</strong><small>Las direcciones de otros concesionarios no serán visibles.</small></div></div>
                <p><b>${emails.length} destinatarios</b></p>
                <div class="training-email-addresses">${emails.map(email => `<span>${this.escapeHtml(email)}</span>`).join('')}</div>
                <label><span>Asunto</span><div>${this.escapeHtml(session.emailSubject || session.title)}</div></label>
                <label><span>Mensaje</span><pre>${this.escapeHtml(session.emailBody || '')}</pre></label>
                <button type="button" class="training-copy-button" onclick="app.copyGroupRecipients('${this.escapeAttr(id)}', this)"><span class="material-icons-round">content_copy</span>Copiar destinatarios</button>
            </div>`,
            width: 680, background: '#1e293b', color: '#fff', showCancelButton: true,
            confirmButtonText: 'Abrir correo y marcar convocada', cancelButtonText: 'Cancelar', confirmButtonColor: '#6366f1'
        });
        if (!result.isConfirmed) return;
        try {
            await this.apiUpdateTrainingSession(id, {
                status: session.status === 'Pendiente' ? 'Convocada' : session.status,
                markInvited: true
            });
            await this.refreshTrainingData();
            this.logAction('CONVOCAR_FORMACION_GRUPAL', `${session.title} — ${emails.length} destinatarios`);
            window.location.href = mailto;
        } catch (error) {
            await Swal.fire({ title: 'No se pudo registrar la convocatoria', text: error.message, icon: 'error', background: '#1e293b', color: '#fff' });
        }
    },

    async copyGroupRecipients(id, button = null) {
        const session = this.getTrainingSession(id);
        if (!session) return;
        const emails = [...new Set(this.getTrainingSessionParticipants(session).map(item => item.user?.email).filter(Boolean))];
        try {
            await navigator.clipboard.writeText(emails.join('; '));
            if (button) {
                button.innerHTML = '<span class="material-icons-round">check</span>Destinatarios copiados';
                button.disabled = true;
            }
        } catch (e) {
            Swal.showValidationMessage('No se pudieron copiar los destinatarios');
        }
    },

    async handleTrainingGroupDrop(id, newStatus) {
        const session = this.getTrainingSession(id);
        if (!session || session.status === newStatus) { this.renderKanban(); return; }
        if (newStatus === 'Realizada') {
            await this.completeTrainingGroup(id);
            return;
        }
        if (newStatus === 'No Realizada') {
            const confirm = await Swal.fire({
                title: 'Marcar todo el grupo como no presentado',
                text: 'Todos los participantes quedarán como no presentados.', icon: 'warning',
                background: '#1e293b', color: '#fff', showCancelButton: true,
                confirmButtonText: 'Confirmar', cancelButtonText: 'Cancelar', confirmButtonColor: '#dc2626'
            });
            if (!confirm.isConfirmed) { this.renderKanban(); return; }
        }
        if (['Convocada', 'Confirmada'].includes(newStatus) && !session.invitationSentAt) {
            const confirm = await Swal.fire({
                title: 'Convocatoria no registrada',
                text: 'No consta que se haya preparado el correo grupal. ¿Quieres moverla igualmente?',
                icon: 'question', background: '#1e293b', color: '#fff', showCancelButton: true,
                confirmButtonText: 'Mover igualmente', cancelButtonText: 'Cancelar', confirmButtonColor: '#6366f1'
            });
            if (!confirm.isConfirmed) { this.renderKanban(); return; }
        }
        try {
            await this.apiUpdateTrainingSession(id, { status: newStatus });
            await this.refreshTrainingData();
            this.logAction('MOVER_FORMACION_GRUPAL', `${session.title} → ${newStatus}`);
        } catch (error) {
            this.renderKanban();
            await Swal.fire({ title: 'Error al mover la formación', text: error.message, icon: 'error', background: '#1e293b', color: '#fff' });
        }
    },

    async completeTrainingGroup(id) {
        const session = this.getTrainingSession(id);
        if (!session) return;
        const participants = this.getTrainingSessionParticipants(session);
        const result = await Swal.fire({
            title: 'Registrar asistencia',
            html: `<div class="training-attendance-form">
                <p>Indica el resultado de cada participante antes de cerrar la formación.</p>
                ${participants.map(item => {
                    const recordId = this.escapeAttr(item.meta.recordId);
                    const name = item.user ? `${item.user.nombre} ${item.user.apellidos}` : item.meta.recordId;
                    return `<label><div><strong>${this.escapeHtml(name)}</strong><small>${this.escapeHtml(item.user?.concesionario || '')}</small></div><select class="custom-field" data-attendance data-record-id="${recordId}"><option value="">Seleccionar...</option><option value="Asistió">Asistió</option><option value="No presentado">No presentado</option></select></label>`;
                }).join('')}
            </div>`,
            width: 660, background: '#1e293b', color: '#fff', showCancelButton: true,
            confirmButtonText: 'Finalizar formación', cancelButtonText: 'Cancelar', confirmButtonColor: '#10b981', focusConfirm: false,
            preConfirm: () => {
                const attendance = {};
                const selects = [...document.querySelectorAll('[data-attendance]')];
                const missing = selects.filter(select => !select.value);
                if (missing.length) {
                    Swal.showValidationMessage('Indica la asistencia de todos los participantes.');
                    missing[0].focus();
                    return false;
                }
                selects.forEach(select => { attendance[select.dataset.recordId] = select.value; });
                return attendance;
            }
        });
        if (!result.isConfirmed) { this.renderKanban(); return; }
        try {
            await this.apiUpdateTrainingSession(id, { status: 'Realizada', attendance: result.value });
            await this.refreshTrainingData();
            const attended = Object.values(result.value).filter(value => value === 'Asistió').length;
            this.logAction('FINALIZAR_FORMACION_GRUPAL', `${session.title} — ${attended}/${participants.length} asistentes`);
            const next = await Swal.fire({
                title: attended ? 'Formación completada' : 'Grupo no presentado',
                text: `${attended} de ${participants.length} participantes asistieron.`,
                icon: attended ? 'success' : 'warning', background: '#1e293b', color: '#fff',
                confirmButtonText: attended ? 'Preparar encuesta' : 'Cerrar', confirmButtonColor: '#6366f1',
                showCancelButton: attended > 0, cancelButtonText: 'Enviar más tarde'
            });
            if (attended > 0 && next.isConfirmed) this.openTrainingGroupSurvey(id);
        } catch (error) {
            this.renderKanban();
            await Swal.fire({ title: 'No se pudo finalizar', text: error.message, icon: 'error', background: '#1e293b', color: '#fff' });
        }
    },

    async openTrainingGroupSurvey(id) {
        const session = this.getTrainingSession(id);
        if (!session) return;
        const attendees = this.getTrainingSessionParticipants(session).filter(item => item.meta.attendanceStatus === 'Asistió' && item.user?.email);
        const firstUser = attendees[0]?.user || this.getTrainingSessionParticipants(session)[0]?.user;
        const brand = (this.clientRecords || []).find(client => client.id == session.clientId)
            || (this.clientRecords || []).find(client => client.name === firstUser?.marca);
        const surveyUrl = brand?.survey_url || '';
        if (!surveyUrl) {
            await Swal.fire({ title: 'Encuesta no configurada', text: `No hay URL de encuesta para ${firstUser?.marca || 'esta marca'}.`, icon: 'warning', background: '#1e293b', color: '#fff' });
            return;
        }
        const emails = [...new Set(attendees.map(item => item.user.email.trim().toLowerCase()))];
        const subject = `Encuesta de satisfacción — ${session.title}`;
        const body = `Hola,\n\nMuchas gracias por vuestra participación en la formación. Nos ayudaría mucho que valorarais la experiencia en el siguiente enlace:\n\n${surveyUrl}\n\nGracias y un saludo.`;
        const mailto = `mailto:?bcc=${encodeURIComponent(emails.join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        const result = await Swal.fire({
            title: 'Enviar encuesta al grupo',
            html: `<div class="training-email-preview"><div class="training-privacy-note"><span class="material-icons-round">privacy_tip</span><div><strong>${emails.length} asistentes en CCO</strong><small>Solo se incluyen quienes asistieron.</small></div></div><label><span>Enlace</span><div class="break-all">${this.escapeHtml(surveyUrl)}</div></label></div>`,
            background: '#1e293b', color: '#fff', showCancelButton: true,
            confirmButtonText: 'Abrir correo', cancelButtonText: 'Cancelar', confirmButtonColor: '#6366f1'
        });
        if (result.isConfirmed) window.location.href = mailto;
    },

    async disbandTrainingGroup(id) {
        const session = this.getTrainingSession(id);
        if (!session) return;
        const result = await Swal.fire({
            title: '¿Disolver la formación grupal?',
            text: 'Los asesores volverán a Pendiente como tarjetas individuales.', icon: 'warning',
            background: '#1e293b', color: '#fff', showCancelButton: true,
            confirmButtonText: 'Disolver grupo', cancelButtonText: 'Cancelar', confirmButtonColor: '#dc2626'
        });
        if (!result.isConfirmed) return;
        try {
            await this.apiDeleteTrainingSession(id);
            await this.refreshTrainingData();
            this.logAction('DISOLVER_FORMACION_GRUPAL', session.title);
            await Swal.fire({ title: 'Grupo disuelto', icon: 'success', timer: 1500, showConfirmButton: false, background: '#1e293b', color: '#fff' });
        } catch (error) {
            await Swal.fire({ title: 'No se pudo disolver', text: error.message, icon: 'error', background: '#1e293b', color: '#fff' });
        }
    }
};
