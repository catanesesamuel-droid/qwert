/**
 * Dashboard Domótico - Lógica completa
 * Gestión de usuarios + Control domótico
 */

// ============================================================
// INICIALIZACIÓN Y AUTENTICACIÓN
// ============================================================

// Verificar autenticación
requireAuth();

// Obtener datos del usuario
const user = getStorage('user');

// Compatibilidad: si tiene 'id' en lugar de 'user_id', convertirlo
if (user && user.id && !user.user_id) {
    user.user_id = user.id;
    setStorage('user', user);
}

// Referencias al DOM - Navbar
const userName = document.getElementById('user-name');
const userRole = document.getElementById('user-role');
const logoutButton = document.getElementById('btn-logout');

// Referencias al DOM - Navegación
const navItems = document.querySelectorAll('.nav-item');
const contentViews = document.querySelectorAll('.content-view');

// Mostrar información del usuario
if (user) {
    userName.textContent = user.username;
    userRole.textContent = user.role === 'admin' ? 'Administrador' : 'Usuario';

    // Ocultar opciones de administración si no es admin
    if (user.role !== 'admin') {
        const adminOnlyElements = document.querySelectorAll('.admin-only');
        adminOnlyElements.forEach(element => {
            element.style.display = 'none';
        });
    }
}

// ============================================================
// NAVEGACIÓN ENTRE VISTAS
// ============================================================

navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        const viewName = item.getAttribute('data-view');
        
        // Remover clase active de todos los items
        navItems.forEach(nav => nav.classList.remove('active'));
        
        // Añadir clase active al item clickeado
        item.classList.add('active');
        
        // Ocultar todas las vistas
        contentViews.forEach(view => view.classList.remove('active'));
        
        // Mostrar la vista correspondiente
        const targetView = document.getElementById(`view-${viewName}`);
        if (targetView) {
            targetView.classList.add('active');
        }
        
        // Actualizar URL hash
        window.location.hash = viewName;
        
        // Cargar datos si es necesario
        loadViewData(viewName);
    });
});

// Función para cargar datos según la vista
function loadViewData(viewName) {
    switch(viewName) {
        case 'usuarios':
            if (user.role === 'admin') {
                loadUsers();
            } else {
                loadCurrentUserProfile();
            }
            break;
        case 'vulnerabilidades':
            // Si implementas vulnerabilidades, cargar aquí
            break;
        default:
            // Otras vistas no necesitan carga especial
            break;
    }
}

// ============================================================
// LOGOUT
// ============================================================

logoutButton.addEventListener('click', async (e) => {
    e.preventDefault();
    
    try {
        await getData('/auth/logout');
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
    
    logout();
});

// ============================================================
// GESTIÓN DE USUARIOS (BACKEND)
// ============================================================

// Cargar lista de usuarios (solo para admin)
async function loadUsers() {
    const usersContainer = document.getElementById('users-list-container');
    const profileContainer = document.getElementById('user-profile-container');
    
    if (!usersContainer) return;
    
    // Ocultar perfil, mostrar lista de usuarios
    if (profileContainer) profileContainer.style.display = 'none';
    usersContainer.style.display = 'block';
    
    try {
        const response = await getData('/users');
        
        if (response.success) {
            const users = response.users;
            
            let tableHTML = `
                <table class="users-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Usuario</th>
                            <th>Email</th>
                            <th>Rol</th>
                            <th>Creado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            users.forEach(u => {
                const roleClass = u.role === 'admin' ? 'role-admin' : 'role-user';
                const canDelete = u.username !== 'admin' && u.username !== 'Profe';
                
                tableHTML += `
                    <tr>
                        <td>${u.user_id}</td>
                        <td><strong>${sanitizeHTML(u.username)}</strong></td>
                        <td>${sanitizeHTML(u.email)}</td>
                        <td><span class="role-badge ${roleClass}">${u.role}</span></td>
                        <td>${new Date(u.created_at).toLocaleDateString()}</td>
                        <td class="actions-cell">
                            ${u.role === 'user' ? 
                                `<button class="btn-action btn-promote" onclick="changeUserRole(${u.user_id}, 'admin')">
                                    Hacer Admin
                                </button>` : 
                                `<button class="btn-action btn-demote" onclick="changeUserRole(${u.user_id}, 'user')">
                                    Quitar Admin
                                </button>`
                            }
                            ${canDelete ? 
                                `<button class="btn-action btn-delete" onclick="deleteUser(${u.user_id}, '${u.username}')">
                                    Eliminar
                                </button>` : 
                                `<button class="btn-action btn-delete" disabled>
                                    No eliminar
                                </button>`
                            }
                        </td>
                    </tr>
                `;
            });
            
            tableHTML += `</tbody></table>`;
            usersContainer.innerHTML = tableHTML;
        } else {
            usersContainer.innerHTML = `<p class="error-message">Error al cargar usuarios</p>`;
        }
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        usersContainer.innerHTML = `<p class="error-message">Error al conectar con el servidor</p>`;
    }
}

// Cambiar rol de usuario
async function changeUserRole(userId, newRole) {
    if (!confirm(`¿Cambiar rol del usuario a "${newRole}"?`)) {
        return;
    }
    
    try {
        const response = await putData(`/users/${userId}`, {
            role: newRole
        });
        
        if (response.success) {
            showMessage(`Rol actualizado a "${newRole}" correctamente`, 'success');
            await loadUsers();
        } else {
            showMessage(response.message || 'Error al actualizar rol', 'error');
        }
    } catch (error) {
        console.error('Error cambiando rol:', error);
        showMessage('Error al conectar con el servidor', 'error');
    }
}

// Eliminar usuario
async function deleteUser(userId, username) {
    if (!confirm(`¿Estás seguro de eliminar el usuario "${username}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/users/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(`Usuario "${username}" eliminado correctamente`, 'success');
            await loadUsers();
        } else {
            showMessage(data.message || 'Error al eliminar usuario', 'error');
        }
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        showMessage('Error al conectar con el servidor', 'error');
    }
}

// Cargar perfil del usuario actual
async function loadCurrentUserProfile() {
    const profileContainer = document.getElementById('user-profile-container');
    const usersContainer = document.getElementById('users-list-container');
    
    if (!profileContainer) return;
    
    if (usersContainer) usersContainer.style.display = 'none';
    profileContainer.style.display = 'block';
    
    try {
        const response = await getData(`/users/${user.user_id}`);
        
        if (response.success) {
            const u = response.user;
            
            let profileHTML = `
                <div class="profile-card">
                    <h3>Mi Perfil</h3>
                    <div class="profile-field">
                        <label>Usuario:</label>
                        <span>${sanitizeHTML(u.username)}</span>
                    </div>
                    <div class="profile-field">
                        <label>Email:</label>
                        <span>${sanitizeHTML(u.email)}</span>
                    </div>
                    <div class="profile-field">
                        <label>Hash de Contraseña:</label>
                        <code>${u.password_hash}</code>
                    </div>
                    <div class="profile-field">
                        <label>Rol:</label>
                        <span class="role-badge ${u.role === 'admin' ? 'role-admin' : 'role-user'}">${u.role}</span>
                    </div>
                    <div class="profile-field">
                        <label>Cuenta creada:</label>
                        <span>${new Date(u.created_at).toLocaleString()}</span>
                    </div>
                </div>
            `;
            
            profileContainer.innerHTML = profileHTML;
        } else {
            profileContainer.innerHTML = `<p class="error-message">Error al cargar perfil</p>`;
        }
    } catch (error) {
        console.error('Error cargando perfil:', error);
        profileContainer.innerHTML = `<p class="error-message">Error al conectar con el servidor</p>`;
    }
}

// Exponer funciones globalmente para onclick
window.changeUserRole = changeUserRole;
window.deleteUser = deleteUser;

// ============================================================
// CONTROL DOMÓTICO - ILUMINACIÓN
// ============================================================

// Estado de las luces (simulado - en producción vendría del backend)
let lightsState = {
    livingroom: { on: true, brightness: 75, color: 'neutral' },
    kitchen: { on: false, brightness: 100 },
    bedroom: { on: true, brightness: 30, mode: 'reading' },
    exterior: { on: false, motion: true, schedule: true }
};

// Inicializar controles de luces
function initLightControls() {
    // Switches de encendido/apagado
    const lightSwitches = {
        'light-livingroom': 'livingroom',
        'light-kitchen': 'kitchen',
        'light-bedroom': 'bedroom',
        'light-exterior': 'exterior'
    };
    
    Object.entries(lightSwitches).forEach(([switchId, room]) => {
        const switchEl = document.getElementById(switchId);
        if (switchEl) {
            switchEl.checked = lightsState[room].on;
            switchEl.addEventListener('change', (e) => {
                toggleLight(room, e.target.checked);
            });
        }
    });
    
    // Botones de todas encendidas/apagadas
    const btnAllOn = document.getElementById('btn-all-lights-on');
    const btnAllOff = document.getElementById('btn-all-lights-off');
    
    if (btnAllOn) {
        btnAllOn.addEventListener('click', () => allLights(true));
    }
    
    if (btnAllOff) {
        btnAllOff.addEventListener('click', () => allLights(false));
    }
    
    // Selectores de color/modo
    const colorSelect = document.getElementById('color-livingroom');
    if (colorSelect) {
        colorSelect.addEventListener('change', (e) => {
            lightsState.livingroom.color = e.target.value;
            showNotification('Color de luz actualizado', 'success');
        });
    }
    
    const modeSelect = document.getElementById('mode-bedroom');
    if (modeSelect) {
        modeSelect.addEventListener('change', (e) => {
            lightsState.bedroom.mode = e.target.value;
            showNotification('Modo de luz actualizado', 'success');
        });
    }
}

// Alternar luz individual
function toggleLight(room, isOn) {
    lightsState[room].on = isOn;
    const status = isOn ? 'encendida' : 'apagada';
    showNotification(`Luz ${getRoomName(room)} ${status}`, 'success');
    
    // Aquí enviarías al backend real
    // await postData('/api/lights/toggle', { room, isOn });
}

// Todas las luces encendidas/apagadas
function allLights(turnOn) {
    Object.keys(lightsState).forEach(room => {
        lightsState[room].on = turnOn;
        const switchEl = document.getElementById(`light-${room}`);
        if (switchEl) {
            switchEl.checked = turnOn;
        }
    });
    
    const action = turnOn ? 'encendidas' : 'apagadas';
    showNotification(`Todas las luces ${action}`, 'success');
}

// Actualizar brillo de una luz
function updateBrightness(room, value) {
    lightsState[room].brightness = value;
    const display = document.getElementById(`brightness-${room}`);
    if (display) {
        display.textContent = `${value}%`;
    }
}

// Obtener nombre de habitación en español
function getRoomName(room) {
    const names = {
        livingroom: 'Sala de Estar',
        kitchen: 'Cocina',
        bedroom: 'Dormitorio',
        exterior: 'Exterior'
    };
    return names[room] || room;
}

// Exponer función globalmente
window.updateBrightness = updateBrightness;

// ============================================================
// CONTROL DOMÓTICO - CLIMATIZACIÓN
// ============================================================

// Estado del clima (simulado)
let climateState = {
    current: 22,
    target: 21,
    mode: 'heat',
    acPower: true,
    acTemp: 24,
    acMode: 'cool'
};

// Inicializar controles de clima
function initClimateControls() {
    // Botones de temperatura
    const tempUp = document.getElementById('temp-up');
    const tempDown = document.getElementById('temp-down');
    
    if (tempUp) {
        tempUp.addEventListener('click', () => adjustTargetTemp(1));
    }
    
    if (tempDown) {
        tempDown.addEventListener('click', () => adjustTargetTemp(-1));
    }
    
    // Modos de clima
    const modeButtons = document.querySelectorAll('.btn-mode');
    modeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            modeButtons.forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            const mode = e.currentTarget.getAttribute('data-mode');
            setClimateMode(mode);
        });
    });
    
    // Switch AC
    const acSwitch = document.getElementById('ac-power');
    if (acSwitch) {
        acSwitch.checked = climateState.acPower;
        acSwitch.addEventListener('change', (e) => {
            climateState.acPower = e.target.checked;
            const status = e.target.checked ? 'encendido' : 'apagado';
            showNotification(`Aire acondicionado ${status}`, 'success');
        });
    }
    
    // Select modo AC
    const acModeSelect = document.getElementById('ac-mode');
    if (acModeSelect) {
        acModeSelect.addEventListener('change', (e) => {
            climateState.acMode = e.target.value;
            showNotification('Modo de AC actualizado', 'success');
        });
    }
}

// Ajustar temperatura objetivo
function adjustTargetTemp(delta) {
    climateState.target += delta;
    climateState.target = Math.max(16, Math.min(30, climateState.target));
    
    const display = document.getElementById('target-temp');
    if (display) {
        display.textContent = `${climateState.target}°C`;
    }
    
    showNotification(`Temperatura objetivo: ${climateState.target}°C`, 'info');
}

// Cambiar modo de climatización
function setClimateMode(mode) {
    climateState.mode = mode;
    const modes = {
        heat: 'Calefacción',
        cool: 'Refrigeración',
        auto: 'Automático'
    };
    showNotification(`Modo: ${modes[mode]}`, 'success');
}

// Actualizar temperatura AC
function updateACTemperature(value) {
    climateState.acTemp = value;
    const display = document.getElementById('ac-temp');
    if (display) {
        display.textContent = `${value}°C`;
    }
}

// Exponer función globalmente
window.updateACTemperature = updateACTemperature;

// ============================================================
// CONTROL DOMÓTICO - SEGURIDAD
// ============================================================

// Estado de seguridad (simulado)
let securityState = {
    alarmArmed: false,
    sensors: {
        door: 'closed',
        window: 'closed',
        camera: 'active'
    }
};

// Inicializar controles de seguridad
function initSecurityControls() {
    const btnAlarmArm = document.getElementById('btn-alarm-arm');
    const btnAlarmDisarm = document.getElementById('btn-alarm-disarm');
    
    if (btnAlarmArm) {
        btnAlarmArm.addEventListener('click', () => setAlarm(true));
    }
    
    if (btnAlarmDisarm) {
        btnAlarmDisarm.addEventListener('click', () => setAlarm(false));
    }
}

// Activar/Desactivar alarma
function setAlarm(armed) {
    securityState.alarmArmed = armed;
    const statusEl = document.getElementById('alarm-status');
    
    if (statusEl) {
        statusEl.className = armed ? 'alarm-status armed' : 'alarm-status disarmed';
        statusEl.querySelector('span').textContent = armed ? 'Activado' : 'Desactivado';
    }
    
    const status = armed ? 'activado' : 'desactivado';
    showNotification(`Sistema de alarma ${status}`, armed ? 'warning' : 'success');
}

// ============================================================
// RELOJ Y TEMPERATURA EN TIEMPO REAL
// ============================================================

function updateDateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('es-ES');
    
    const timeEl = document.getElementById('current-time');
    if (timeEl) {
        timeEl.textContent = timeString;
    }
    
    // Simular temperatura actual
    const tempEl = document.getElementById('current-temp');
    if (tempEl) {
        tempEl.textContent = `${climateState.current}°C`;
    }
}

// Actualizar cada segundo
setInterval(updateDateTime, 1000);

// ============================================================
// SISTEMA DE NOTIFICACIONES
// ============================================================

function showNotification(message, type = 'info') {
    const container = document.getElementById('message-container');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(notification);
    
    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// ============================================================
// MANEJO DE HASH EN URL
// ============================================================

window.addEventListener('load', () => {
    const hash = window.location.hash.substring(1);
    if (hash) {
        const navItem = document.querySelector(`[data-view="${hash}"]`);
        if (navItem) {
            navItem.click();
        }
    } else {
        // Cargar datos de la vista por defecto (iluminación)
        updateDateTime();
    }
});

// ============================================================
// INICIALIZACIÓN GENERAL
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard domótico cargado para:', user.username);
    
    // Inicializar todos los controles
    initLightControls();
    initClimateControls();
    initSecurityControls();
    updateDateTime();
    
    // Si hay una vista activa, cargar sus datos
    const activeView = document.querySelector('.content-view.active');
    if (activeView) {
        const viewId = activeView.id.replace('view-', '');
        loadViewData(viewId);
    }
});