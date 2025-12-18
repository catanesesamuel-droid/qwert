// js/user-management.js (CORREGIDO)
// Gestión de usuarios para administradores

class UserManagement {
    constructor() {
        this.baseUrl = 'http://localhost:8000/api/users';
        this.currentPage = 1;
        this.pageSize = 10;
        this.totalUsers = 0;
        this.users = [];
        
        // Variables para modales
        this.pendingAction = null;
        this.selectedUser = null;
        
        this.init();
    }
    
    init() {
        // Solo inicializar si el usuario es admin
        const userJson = localStorage.getItem('user');
        if (!userJson) return;
        
        const user = JSON.parse(userJson);
        if (user.role !== 'admin') {
            console.log('Usuario no es admin, ocultando gestión de usuarios');
            return;
        }
        
        console.log('Inicializando gestión de usuarios para admin:', user.username);
        
        // Cargar usuarios al abrir la vista
        this.loadUsers();
        
        // Configurar eventos
        this.setupEventListeners();
        
        // Configurar filtros
        this.setupFilters();
    }
    
    setupEventListeners() {
        // Botón de actualizar
        const refreshBtn = document.getElementById('btn-refresh-users');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadUsers());
        }
        
        // Botones de paginación
        const prevBtn = document.getElementById('btn-prev');
        const nextBtn = document.getElementById('btn-next');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.loadUsers();
                }
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const totalPages = Math.ceil(this.totalUsers / this.pageSize);
                if (this.currentPage < totalPages) {
                    this.currentPage++;
                    this.loadUsers();
                }
            });
        }
        
        // Modal de acciones
        const confirmBtn = document.getElementById('btn-confirm-action');
        const cancelBtn = document.getElementById('btn-cancel-action');
        
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.executePendingAction());
        }
        
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeActionModal());
        }
        
        // Modal de edición
        const editForm = document.getElementById('edit-user-form');
        const cancelEditBtn = document.getElementById('btn-cancel-edit');
        
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateUser();
            });
        }
        
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => this.closeEditModal());
        }
    }
    
    setupFilters() {
        const searchInput = document.getElementById('user-search');
        const roleFilter = document.getElementById('role-filter');
        
        // Búsqueda con debounce
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.applyFilters();
                }, 300);
            });
        }
        
        // Filtro por rol
        if (roleFilter) {
            roleFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }
    }
    
    async loadUsers() {
        try {
            const userJson = localStorage.getItem('user');
            if (!userJson) {
                window.location.href = 'index.html';
                return;
            }
            
            const user = JSON.parse(userJson);
            const token = user.token;
            
            // Calcular offset para paginación
            const skip = (this.currentPage - 1) * this.pageSize;
            
            // Mostrar loading
            this.showLoading(true);
            
            // Hacer la petición al endpoint de listado
            const response = await fetch(`${this.baseUrl}/?skip=${skip}&limit=${this.pageSize}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    this.showError('No tienes permisos para ver usuarios');
                    return;
                }
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            this.users = await response.json();
            this.totalUsers = 100; // Esto debería venir del backend (podrías añadir un count en tu endpoint)
            
            // Actualizar tabla
            this.renderUsersTable();
            
            // Actualizar estadísticas
            this.updateStats();
            
            // Actualizar paginación
            this.updatePagination();
            
        } catch (error) {
            console.error('Error cargando usuarios:', error);
            this.showError('Error al cargar usuarios: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }
    
    renderUsersTable() {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (this.users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-message">
                        <i class="fas fa-users-slash"></i> No hay usuarios
                    </td>
                </tr>
            `;
            return;
        }
        
        this.users.forEach(user => {
            const row = document.createElement('tr');
            
            // Formatear fecha
            const createdDate = user.created_at ? new Date(user.created_at) : new Date();
            const formattedDate = createdDate.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            row.innerHTML = `
                <td>${user.id}</td>
                <td>
                    <div class="user-avatar">
                        <i class="fas fa-user-circle"></i>
                        <span>${user.username}</span>
                    </div>
                </td>
                <td>${user.email || 'No especificado'}</td>
                <td>
                    <span class="role-badge ${user.role}">
                        ${user.role === 'admin' ? 'Administrador' : 'Usuario'}
                    </span>
                </td>
                <td>${formattedDate}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-view" data-id="${user.id}" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action btn-edit" data-id="${user.id}" title="Editar usuario">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-delete" data-id="${user.id}" title="Eliminar usuario" ${user.id === 1 ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Añadir eventos a los botones
        this.addTableEvents();
    }
    
    addTableEvents() {
        // Botones de ver
        document.querySelectorAll('.btn-view').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.currentTarget.dataset.id;
                this.viewUserDetails(userId);
            });
        });
        
        // Botones de editar
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.currentTarget.dataset.id;
                this.openEditModal(userId);
            });
        });
        
        // Botones de eliminar
        document.querySelectorAll('.btn-delete').forEach(btn => {
            if (!btn.disabled) {
                btn.addEventListener('click', (e) => {
                    const userId = e.currentTarget.dataset.id;
                    this.confirmDeleteUser(userId);
                });
            }
        });
    }
    
    async viewUserDetails(userId) {
        try {
            const userJson = localStorage.getItem('user');
            const token = JSON.parse(userJson).token;
            
            const response = await fetch(`${this.baseUrl}/${userId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('No tienes permisos para ver este usuario');
                }
                if (response.status === 404) {
                    throw new Error('Usuario no encontrado');
                }
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const user = await response.json();
            
            // Mostrar detalles en un modal
            this.showUserDetailsModal(user);
            
        } catch (error) {
            console.error('Error obteniendo detalles:', error);
            this.showError(error.message);
        }
    }
    
    showUserDetailsModal(user) {
        const createdDate = user.created_at ? new Date(user.created_at) : new Date();
        const formattedDate = createdDate.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const modal = document.getElementById('user-action-modal');
        const title = document.getElementById('modal-title');
        const message = document.getElementById('modal-message');
        
        if (modal && title && message) {
            title.innerHTML = `<i class="fas fa-user-circle"></i> Detalles de Usuario`;
            message.innerHTML = `
                <div class="user-details">
                    <div class="detail-item">
                        <strong>ID:</strong> ${user.id}
                    </div>
                    <div class="detail-item">
                        <strong>Usuario:</strong> ${user.username}
                    </div>
                    <div class="detail-item">
                        <strong>Email:</strong> ${user.email || 'No especificado'}
                    </div>
                    <div class="detail-item">
                        <strong>Rol:</strong> <span class="role-badge ${user.role}">${user.role === 'admin' ? 'Administrador' : 'Usuario'}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Creado:</strong> ${formattedDate}
                    </div>
                </div>
            `;
            
            const confirmBtn = document.getElementById('btn-confirm-action');
            const cancelBtn = document.getElementById('btn-cancel-action');
            
            confirmBtn.style.display = 'none';
            cancelBtn.textContent = 'Cerrar';
            
            modal.style.display = 'block';
            
            // Cambiar evento del botón cancelar para cerrar
            cancelBtn.onclick = () => this.closeActionModal();
        }
    }
    
    async openEditModal(userId) {
        try {
            const userJson = localStorage.getItem('user');
            const token = JSON.parse(userJson).token;
            
            // Obtener usuario actual
            const response = await fetch(`${this.baseUrl}/${userId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const user = await response.json();
            this.selectedUser = user;
            
            // Rellenar formulario
            document.getElementById('edit-user-id').value = user.id;
            document.getElementById('edit-username').value = user.username;
            document.getElementById('edit-email').value = user.email || '';
            document.getElementById('edit-role').value = user.role;
            
            // Mostrar modal
            document.getElementById('edit-user-modal').style.display = 'block';
            
        } catch (error) {
            console.error('Error obteniendo usuario para editar:', error);
            this.showError('Error al cargar datos del usuario: ' + error.message);
        }
    }
    
    closeEditModal() {
        document.getElementById('edit-user-modal').style.display = 'none';
        this.selectedUser = null;
        document.getElementById('edit-user-form').reset();
    }
    
    async updateUser() {
        try {
            const userId = document.getElementById('edit-user-id').value;
            const newRole = document.getElementById('edit-role').value;
            
            // Validar que el rol haya cambiado
            if (newRole === this.selectedUser.role) {
                this.showError('El rol no ha cambiado');
                return;
            }
            
            const userJson = localStorage.getItem('user');
            const token = JSON.parse(userJson).token;
            
            // Enviar actualización de rol usando el endpoint CORRECTO
            // Según tu update_user_role.py: PUT /users/{user_id}?new_role=valor
            const response = await fetch(`${this.baseUrl}/${userId}?new_role=${encodeURIComponent(newRole)}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error('No tienes permisos para modificar usuarios');
                }
                if (response.status === 400) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || 'Error en la solicitud');
                }
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const updatedUser = await response.json();
            
            // Cerrar modal y recargar usuarios
            this.closeEditModal();
            this.showSuccess(`Rol de usuario ${updatedUser.username} actualizado a ${newRole === 'admin' ? 'Administrador' : 'Usuario'}`);
            this.loadUsers();
            
        } catch (error) {
            console.error('Error actualizando usuario:', error);
            this.showError('Error al actualizar usuario: ' + error.message);
        }
    }
    
    confirmDeleteUser(userId) {
        const user = this.users.find(u => u.id == userId);
        if (!user) return;
        
        // Prevenir eliminación del usuario actual o admin principal
        const currentUser = JSON.parse(localStorage.getItem('user'));
        if (userId == currentUser.id) {
            this.showError('No puedes eliminar tu propio usuario');
            return;
        }
        
        this.selectedUser = user;
        this.pendingAction = 'delete';
        
        const modal = document.getElementById('user-action-modal');
        const title = document.getElementById('modal-title');
        const message = document.getElementById('modal-message');
        
        if (modal && title && message) {
            title.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Confirmar Eliminación`;
            message.innerHTML = `
                ¿Estás seguro de que quieres eliminar al usuario <strong>${user.username}</strong>?
                <br><br>
                <small>Esta acción no se puede deshacer.</small>
            `;
            
            const confirmBtn = document.getElementById('btn-confirm-action');
            const cancelBtn = document.getElementById('btn-cancel-action');
            
            confirmBtn.style.display = 'inline-block';
            confirmBtn.textContent = 'Eliminar';
            confirmBtn.className = 'btn btn-danger';
            
            cancelBtn.textContent = 'Cancelar';
            cancelBtn.className = 'btn btn-secondary';
            
            modal.style.display = 'block';
        }
    }
    
    async executePendingAction() {
        if (!this.pendingAction || !this.selectedUser) return;
        
        try {
            if (this.pendingAction === 'delete') {
                await this.deleteUser(this.selectedUser.id);
            }
            
            this.closeActionModal();
            this.loadUsers();
            
        } catch (error) {
            console.error('Error ejecutando acción:', error);
            this.showError('Error: ' + error.message);
        }
    }
    
    async deleteUser(userId) {
        try {
            const userJson = localStorage.getItem('user');
            const token = JSON.parse(userJson).token;
            
            const response = await fetch(`${this.baseUrl}/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 204) {
                    // DELETE exitoso (204 No Content)
                    this.showSuccess('Usuario eliminado correctamente');
                    return;
                }
                if (response.status === 403) {
                    throw new Error('No tienes permisos para eliminar usuarios');
                }
                if (response.status === 400) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || 'No se puede eliminar este usuario');
                }
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            // Para DELETE, si no hay contenido (204), no hay cuerpo de respuesta
            this.showSuccess('Usuario eliminado correctamente');
            
        } catch (error) {
            console.error('Error eliminando usuario:', error);
            throw error;
        }
    }
    
    closeActionModal() {
        const modal = document.getElementById('user-action-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        this.pendingAction = null;
        this.selectedUser = null;
        
        // Restaurar botones por defecto
        const confirmBtn = document.getElementById('btn-confirm-action');
        const cancelBtn = document.getElementById('btn-cancel-action');
        
        if (confirmBtn && cancelBtn) {
            confirmBtn.style.display = 'inline-block';
            confirmBtn.className = 'btn btn-primary';
            confirmBtn.textContent = 'Confirmar';
            cancelBtn.textContent = 'Cancelar';
        }
    }
    
    applyFilters() {
        const searchTerm = document.getElementById('user-search').value.toLowerCase();
        const roleFilter = document.getElementById('role-filter').value;
        
        const filteredUsers = this.users.filter(user => {
            // Filtro por búsqueda
            const matchesSearch = !searchTerm || 
                user.username.toLowerCase().includes(searchTerm) ||
                (user.email && user.email.toLowerCase().includes(searchTerm));
            
            // Filtro por rol
            const matchesRole = !roleFilter || user.role === roleFilter;
            
            return matchesSearch && matchesRole;
        });
        
        // Renderizar usuarios filtrados
        this.renderFilteredUsers(filteredUsers);
    }
    
    renderFilteredUsers(filteredUsers) {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (filteredUsers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-message">
                        <i class="fas fa-search"></i> No se encontraron usuarios
                    </td>
                </tr>
            `;
            return;
        }
        
        filteredUsers.forEach(user => {
            const row = document.createElement('tr');
            
            const createdDate = user.created_at ? new Date(user.created_at) : new Date();
            const formattedDate = createdDate.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            
            row.innerHTML = `
                <td>${user.id}</td>
                <td>
                    <div class="user-avatar">
                        <i class="fas fa-user-circle"></i>
                        <span>${user.username}</span>
                    </div>
                </td>
                <td>${user.email || 'No especificado'}</td>
                <td>
                    <span class="role-badge ${user.role}">
                        ${user.role === 'admin' ? 'Administrador' : 'Usuario'}
                    </span>
                </td>
                <td>${formattedDate}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-view" data-id="${user.id}" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action btn-edit" data-id="${user.id}" title="Editar usuario">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-delete" data-id="${user.id}" title="Eliminar usuario">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tbody.appendChild(row);
        });
        
        // Re-añadir eventos
        this.addTableEvents();
    }
    
    updateStats() {
        const total = this.users.length;
        const admins = this.users.filter(u => u.role === 'admin').length;
        const normalUsers = total - admins;
        
        document.getElementById('total-users').textContent = total;
        document.getElementById('admin-users').textContent = admins;
        document.getElementById('normal-users').textContent = normalUsers;
    }
    
    updatePagination() {
        const totalPages = Math.ceil(this.totalUsers / this.pageSize);
        const pageInfo = document.getElementById('page-info');
        const prevBtn = document.getElementById('btn-prev');
        const nextBtn = document.getElementById('btn-next');
        
        if (pageInfo) {
            pageInfo.textContent = `Página ${this.currentPage} de ${totalPages}`;
        }
        
        if (prevBtn) {
            prevBtn.disabled = this.currentPage <= 1;
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentPage >= totalPages;
        }
    }
    
    showLoading(show) {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;
        
        if (show) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="loading-message">
                        <i class="fas fa-spinner fa-spin"></i> Cargando usuarios...
                    </td>
                </tr>
            `;
        }
    }
    
    showSuccess(message) {
        const container = document.getElementById('message-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="alert alert-success">
                <i class="fas fa-check-circle"></i> ${message}
            </div>
        `;
        
        setTimeout(() => {
            container.innerHTML = '';
        }, 3000);
    }
    
    showError(message) {
        const container = document.getElementById('message-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="alert alert-error">
                <i class="fas fa-exclamation-circle"></i> ${message}
            </div>
        `;
        
        setTimeout(() => {
            container.innerHTML = '';
        }, 5000);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Verificar si estamos en la vista de gestión de usuarios
    const userManagementView = document.getElementById('view-gestion-usuarios');
    if (userManagementView) {
        window.userManagement = new UserManagement();
    }
});