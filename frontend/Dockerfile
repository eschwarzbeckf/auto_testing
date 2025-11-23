# Etapa 1: Build (Construcción)
FROM node:18-alpine AS build

WORKDIR /app

# Copiamos solo package.json (package-lock.json no existe aún)
COPY package.json ./

# Usamos npm install en lugar de npm ci para generar el lockfile
RUN npm install

# Copiamos el código fuente
COPY . .

# IMPORTANTE: Declaramos la variable de entorno para el build time
# Esto permite que React sepa dónde está el backend
ARG REACT_APP_API_URL=http://localhost:3000
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Construimos la aplicación para producción
RUN npm run build

# Etapa 2: Serve (Servidor Web Nginx)
FROM nginx:alpine

# Copiamos los archivos construidos de la etapa anterior a la carpeta de Nginx
COPY --from=build /app/build /usr/share/nginx/html

# Exponemos el puerto 80 (estándar web)
EXPOSE 80

# Arrancamos Nginx en primer plano
CMD ["nginx", "-g", "daemon off;"]