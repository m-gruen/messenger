FROM node:23-alpine AS build

ARG FRONTEND_PORT
ARG BACKEND_PORT

WORKDIR /app

COPY package*.json .
RUN npm i

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]
