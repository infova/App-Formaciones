// js/app-informes.js — Vista Informes: tabla de datos completos
const _appInformes = {

    renderInformes() {
        const search = document.getElementById('search-data').value.toLowerCase();
        const filtered = this.getData().filter(u => this.matchesSearch(u, search));

        const iconId = document.getElementById('sort-icon-informes-id');
        if (iconId) iconId.innerHTML = this.getSortIcon('informes', 'id');
        const iconNombre = document.getElementById('sort-icon-informes-nombre');
        if (iconNombre) iconNombre.innerHTML = this.getSortIcon('informes', 'nombre');
        const iconMarca = document.getElementById('sort-icon-informes-marca');
        if (iconMarca) iconMarca.innerHTML = this.getSortIcon('informes', 'marca');
        const iconDea = document.getElementById('sort-icon-informes-concesionario');
        if (iconDea) iconDea.innerHTML = this.getSortIcon('informes', 'concesionario');
        const iconType = document.getElementById('sort-icon-informes-tipoAcceso');
        if (iconType) iconType.innerHTML = this.getSortIcon('informes', 'tipoAcceso');

        const sorted = this.sortList(filtered, this.sort.informes);

        document.getElementById('data-body').innerHTML = sorted.map(u => {
            let itStatus = 'No req';
            if (u.reqConfig) {
                if (u.isArchived) itStatus = '<span class="text-amber-500 font-bold">Archivado</span>';
                else if (u.fechaConfig) itStatus = '✅ OK';
                else itStatus = 'Pendiente';
            }

            return `<tr class="border-b border-slate-800">
                <td class="p-3 font-mono text-xs text-slate-400">${u.id}</td>
                <td class="p-3 text-xs text-slate-300 uppercase font-medium">${u.nombre} ${u.apellidos}</td>
                <td class="p-3 uppercase text-xs">${u.marca}</td>
                <td class="p-3 text-xs uppercase">${u.concesionario}</td>
                <td class="p-3 text-xs uppercase text-indigo-300">${u.tipoAcceso}</td>
                <td class="p-3 text-xs uppercase">${u.reqFormacion ? (u.formacion.status === 'Realizada' ? '✅ OK' : u.formacion.status) : 'No req'}</td>
                <td class="p-3 text-xs uppercase">${itStatus}</td>
                <td class="p-3 text-right flex justify-end gap-2">
                    <button onclick="app.editUser('${u.id}')" class="text-slate-400 hover:text-white transition"><span class="material-icons-round text-sm">edit</span></button>
                    <button onclick="app.deleteUser('${u.id}')" class="text-slate-400 hover:text-red-400 transition"><span class="material-icons-round text-sm">delete</span></button>
                </td>
            </tr>`;
        }).join('');
    }
};
