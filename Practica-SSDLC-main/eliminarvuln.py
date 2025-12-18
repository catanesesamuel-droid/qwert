#ELIMINA VULNERABILIDAD
#utiliza el VulnerabilityManager para encapsular la lógica de negocio
#y mantener el endpoint limpio y enfocado en las responsabilidades HTTP.
from vulnerability_manager import VulnerabilityManager
from response_builder import APIResponseBuilder

vulnerability_manager = VulnerabilityManager(vulnerabilities_db)

@app.delete( #elimina una vulnerabilidad por su ID
    "/stats/vulnerabilidades/{vuln_id}", #ruta
    responses={
        200: {
            "description": "Vulnerabilidad eliminada exitosamente",
            "model": dict 
        },
        400: {"description": "Solicitud inválida (ID incorrecto)"},
        401: {"description": "No autenticado"},
        403: {"description": "No tiene permisos de administrador"},
        404: {"description": "Vulnerabilidad no encontrada"},
        409: {"description": "Vulnerabilidad fue eliminada"},
        500: {"description": "Error interno del servidor"}
    },
    tags=["Vulnerabilidades"],
    summary="Eliminar vulnerabilidad",
    description=""  #elimina una vulnerabilidad del sistema.
                    #requiere permisos administrador
                    #todas las eliminaciones se registran para trazabilidad
)


async def delete_vulnerability(
    vuln_id: int, #id
    reason: str = None, #motivo de porque se eliomina
    current_user: dict = Depends(require_admin) #usuario autenticado con rol admin
):

    try:
        #se necarga el gestor de vuln en ejecutar la eliminación
        result = vulnerability_manager.delete_vulnerability(vuln_id, current_user, reason)
        
        #devuelve respuesta para saber si se ha eliminado
        return APIResponseBuilder.success(
            data=result,
            message=result.get("message", "Vulnerabilidad eliminada")
        )
        
    except HTTPException as http_error:
        #reenvía errores HTTP conocidos (404, 403, 409)
        raise http_error
        
    except Exception as unexpected_error:
        #registra errores no controlados en los logs
        logging.error(
            f"Error inesperado eliminando vulnerabilidad {vuln_id}: {str(unexpected_error)}",
            exc_info=True
        )
        #devuelve una respuesta HTTP 500 controlada
        raise HTTPException(
            status_code=500,
            detail=APIResponseBuilder.error(
                error_code="INTERNAL_SERVER_ERROR",
                message="Error interno del servidor",
                details={
                    "vulnerability_id": vuln_id,  #id
                    "error_type": type(unexpected_error).__name__, #tipo de error
                    "suggestion": "Contacte al administrador del sistema" #sugerencia
                }
            )
        )
