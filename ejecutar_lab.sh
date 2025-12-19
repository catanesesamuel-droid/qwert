#!/bin/bash

# Colores para mensajes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== EJECUTANDO LABORATORIO SSDLC ===${NC}"

# 1. Navegar al directorio del proyecto
echo -e "${YELLOW}[1/4] Navegando al directorio del proyecto...${NC}"
cd ~/Descargas/Practica-SSDLC-main
pwd

# 2. Levantar contenedores Docker
echo -e "${YELLOW}[2/4] Levantando contenedores Docker...${NC}"
docker compose up -d

# 3. Esperar que los servicios estén listos
echo -e "${YELLOW}[3/4] Esperando que los servicios se inicien...${NC}"
sleep 10

# 4. Mostrar información de acceso
echo -e "${YELLOW}[4/4] Información de acceso:${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Laboratorio listo!${NC}"
echo -e "${GREEN}Accede en: https://localhost:8443/${NC}"
echo -e "${GREEN}========================================${NC}"

# 5. Mostrar logs de contenedores (opcional)
echo -e "\n${YELLOW}Logs de contenedores (Ctrl+C para salir):${NC}"
docker compose logs -f
