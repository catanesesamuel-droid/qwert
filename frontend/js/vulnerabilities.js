/**
 * Dashboard de Vulnerabilidades - Paso 6
 * Gestión de vulnerabilidades CVE con scroll infinito
 */

// API Base URL (vacío para usar rutas relativas con NGINX)
const API_BASE = '';

// Verificar autenticación
requireAuth();

// Estado global
let vulnerabilities = [];
let metadata = {};
let progressChart = null;
let selectedVulnId = null;

// Referencias DOM
const modal = document.getElementById('confirm-modal');
const modalMessage = document.getElementById('modal-message');
const btnConfirmYes = document.getElementById('btn-confirm-yes');
const btnConfirmNo = document.getElementById('btn-confirm-no');
const btnBackToTop = document.getElementById('btn-back-to-top');
const logoutLink = document.getElementById('logout-link');

// Cargar vulnerabilidades al inicio
document.addEventListener('DOMContentLoaded', () => {
    loadVulnerabilities();
    setupEventListeners();
});

/**
 * Carga todas las vulnerabilidades desde la API
 */
async function loadVulnerabilities() {
    try {
        showMessage('Cargando vulnerabilidades...', 'info', 2000);
        
        const response = await fetch(`${API_BASE}/stats/vulnerabilidades/?page=1&limit=1000`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const data = await response.json();

        console.log('[vulnerabilities] Datos recibidos del backend:', data);

        // Adaptar respuesta del backend a estructura esperada
        vulnerabilities = data.vulnerabilities || [];

        console.log('[vulnerabilities] Total vulnerabilidades:', vulnerabilities.length);
        console.log('[vulnerabilities] Primera vulnerabilidad:', vulnerabilities[0]);

        // Calcular metadata desde las vulnerabilidades
        // NOTA: El backend usa status="active" no "pending"
        const active = vulnerabilities.filter(v => v.status === 'active').length;
        const resolved = vulnerabilities.filter(v => v.status === 'resolved').length;

        // Severities en minúsculas: low, medium, high, critical
        const critical = vulnerabilities.filter(v => v.severity === 'critical').length;
        const high = vulnerabilities.filter(v => v.severity === 'high').length;
        const medium = vulnerabilities.filter(v => v.severity === 'medium').length;
        const low = vulnerabilities.filter(v => v.severity === 'low').length;

        metadata = {
            total_vulnerabilities: data.total || vulnerabilities.length,
            pending: active,  // Usar "active" como pendientes
            resolved: resolved,
            critical: critical,
            high: high,
            medium: medium,
            low: low
        };

        console.log('[vulnerabilities] Metadata calculado:', metadata);

        // Actualizar todas las secciones
        updateSummarySection();
        updateChartSection();
        updatePendingTable();
        updateResolvedTable();

        showMessage('Vulnerabilidades cargadas correctamente', 'success', 2000);
    } catch (error) {
        console.error('Error cargando vulnerabilidades:', error);
        showMessage('Error al cargar vulnerabilidades: ' + error.message, 'error');
    }
}

/**
 * Actualiza la sección de resumen (Sección 1)
 */
function updateSummarySection() {
    document.getElementById('stat-total').textContent = metadata.total_vulnerabilities || 0;
    document.getElementById('stat-pending').textContent = metadata.pending || 0;
    document.getElementById('stat-resolved').textContent = metadata.resolved || 0;
    document.getElementById('stat-critical').textContent = metadata.critical || 0;
}

/**
 * Actualiza el gráfico circular (Sección 2)
 */
function updateChartSection() {
    const ctx = document.getElementById('progressChart').getContext('2d');
    
    // Destruir gráfico anterior si existe
    if (progressChart) {
        progressChart.destroy();
    }
    
    // Crear nuevo gráfico
    progressChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pendientes', 'Resueltas'],
            datasets: [{
                data: [metadata.pending || 0, metadata.resolved || 0],
                backgroundColor: [
                    '#f59e0b', // Pendientes (amarillo/naranja)
                    '#10b981'  // Resueltas (verde)
                ],
                borderWidth: 3,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = metadata.total_vulnerabilities || 0;
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
    
    // Actualizar leyenda
    document.getElementById('legend-pending').textContent = metadata.pending || 0;
    document.getElementById('legend-resolved').textContent = metadata.resolved || 0;
}

/**
 * Actualiza la tabla de vulnerabilidades pendientes (Sección 3)
 */
function updatePendingTable() {
    const tbody = document.getElementById('pending-table-body');
    // CAMBIO: usar 'active' en lugar de 'pending'
    const pending = vulnerabilities.filter(v => v.status === 'active');

    // Ordenar por severidad (critical > high > medium > low) - minúsculas
    const severityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
    pending.sort((a, b) => {
        const orderA = severityOrder[a.severity] !== undefined ? severityOrder[a.severity] : 999;
        const orderB = severityOrder[b.severity] !== undefined ? severityOrder[b.severity] : 999;
        return orderA - orderB;
    });

    if (pending.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">¡No hay vulnerabilidades pendientes! 🎉</td></tr>';
        return;
    }

    tbody.innerHTML = pending.map(vuln => {
        // Formatear fecha
        const date = vuln.created_at ? new Date(vuln.created_at).toLocaleDateString('es-ES') : 'N/A';
        // Truncar descripción para la tabla
        const shortDesc = vuln.description && vuln.description.length > 50
            ? vuln.description.substring(0, 50) + '...'
            : vuln.description || 'Sin descripción';

        return `
        <tr>
            <td><strong>${vuln.name || 'N/A'}</strong></td>
            <td>${shortDesc}</td>
            <td>
                <span class="severity-badge severity-${(vuln.severity || 'low').toLowerCase()}">
                    ${(vuln.severity || 'low').toUpperCase()}
                </span>
            </td>
            <td>-</td>
            <td>-</td>
            <td>${date}</td>
            <td>
                <button class="btn-resolve" onclick="confirmResolve(${vuln.id}, '${(vuln.name || 'Vulnerabilidad').replace(/'/g, "\\'")}')">
                    Resolver
                </button>
            </td>
        </tr>
    `;
    }).join('');
}

/**
 * Actualiza la tabla de vulnerabilidades resueltas (Sección 4)
 */
function updateResolvedTable() {
    const tbody = document.getElementById('resolved-table-body');
    const resolved = vulnerabilities.filter(v => v.status === 'resolved');
    
    // Ordenar por fecha de resolución (más reciente primero)
    resolved.sort((a, b) => {
        return new Date(b.resolved_date) - new Date(a.resolved_date);
    });
    
    if (resolved.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading">No hay vulnerabilidades resueltas todavía</td></tr>';
        return;
    }
    
    tbody.innerHTML = resolved.map(vuln => {
        const created = vuln.created_at ? new Date(vuln.created_at).toLocaleDateString('es-ES') : 'N/A';
        const resolvedDate = vuln.resolved_date ? new Date(vuln.resolved_date).toLocaleDateString('es-ES') : 'N/A';
        const shortDesc = vuln.description && vuln.description.length > 50
            ? vuln.description.substring(0, 50) + '...'
            : vuln.description || 'Sin descripción';

        return `
        <tr>
            <td><strong>${vuln.name || 'N/A'}</strong></td>
            <td>${shortDesc}</td>
            <td>
                <span class="severity-badge severity-${(vuln.severity || 'low').toLowerCase()}">
                    ${(vuln.severity || 'low').toUpperCase()}
                </span>
            </td>
            <td>-</td>
            <td>-</td>
            <td>${created}</td>
            <td><strong style="color: #10b981;">${resolvedDate}</strong></td>
        </tr>
    `;
    }).join('');
}

/**
 * Muestra modal de confirmación antes de resolver
 */
function confirmResolve(vulnId, cve) {
    selectedVulnId = vulnId;
    modalMessage.textContent = `¿Seguro que se ha resuelto la vulnerabilidad ${cve}?`;
    modal.classList.add('show');
}

/**
 * Resuelve la vulnerabilidad
 * NOTA: El backend no tiene endpoint /resolve implementado
 */
async function resolveVulnerability() {
    try {
        showMessage('⚠️ Función "Resolver" no implementada en el backend', 'error', 4000);
        closeModal();
    } catch (error) {
        console.error('Error:', error);
        showMessage('Error: ' + error.message, 'error');
        closeModal();
    }
}

/**
 * Cierra el modal
 */
function closeModal() {
    modal.classList.remove('show');
    selectedVulnId = null;
}

/**
 * Configurar event listeners
 */
function setupEventListeners() {
    // Modal
    btnConfirmYes.addEventListener('click', resolveVulnerability);
    btnConfirmNo.addEventListener('click', closeModal);
    
    // Cerrar modal al hacer click fuera
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
    
    // Volver arriba
    btnBackToTop.addEventListener('click', () => {
        document.querySelector('.scroll-container').scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Logout
    logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        logout();
    });
}

/**
 * Sanitiza HTML (heredada de utils.js pero por si acaso)
 */
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

