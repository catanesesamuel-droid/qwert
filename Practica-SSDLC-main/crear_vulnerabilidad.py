#CREAR VULNERABILIDAD (ADMIN)
from fastapi import Depends, HTTPException, status
from datetime import datetime

# Variable global para ID (en producción usar DB auto-increment)
vuln_id_counter = 3  # Ya tenemos 2 de ejemplo

@app.post("/stats/vulnerabilidades", 
          response_model=VulnerabilityResponse,
          status_code=status.HTTP_201_CREATED)
async def create_vulnerability(
    vuln_data: VulnerabilityCreate,
    current_user: dict = Depends(require_admin)
):
    #Crear nueva vulnerabilidad (SOLO ADMIN)
    
    #validar que no exista vulnerabilidad con mismo nombre
    existing_names = [v["name"].lower() for v in vulnerabilities_db.values()]
    if vuln_data.name.lower() in existing_names:
        raise HTTPException(
            status_code=400,
            detail=f"Ya existe una vulnerabilidad con el nombre: {vuln_data.name}"
        )
    
    #generar nuevo ID
    global vuln_id_counter
    new_id = vuln_id_counter
    vuln_id_counter += 1
    
    #crear registro de vulnerabilidad
    new_vulnerability = {
        "id": new_id,
        "name": vuln_data.name,
        "description": vuln_data.description,
        "severity": vuln_data.severity.value,
        "created_by": current_user["id"],
        "created_at": datetime.now(),
        "status": "active"
    }
    
    #guardar en base de datos
    vulnerabilities_db[new_id] = new_vulnerability
    
    #registrar en log de auditoría
    log_admin_action(
        current_user, 
        "CREATE_VULNERABILITY", 
        f"Vuln ID: {new_id}, Severity: {vuln_data.severity}"
    )
    
    #devuelve respuesta
    return VulnerabilityResponse(**new_vulnerability)
