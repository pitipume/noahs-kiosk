FROM node:22-slim
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
# The menu page is dynamic (rendered per request), so building needs no API.
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
