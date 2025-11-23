# ACTUALIZADO: Usamos la versión que coincide con la librería instalada (1.56.1)
FROM mcr.microsoft.com/playwright:v1.56.1-jammy

WORKDIR /app

# Copiamos los archivos de configuración
COPY package.json ./

# Instalamos las dependencias
RUN npm install

# Copiamos el código fuente
COPY . .

# Exponemos el puerto
EXPOSE 3000

# Iniciamos el servidor
CMD ["node", "server.js"]