FROM node:22-alpine AS base
WORKDIR /app

COPY package*.json ./
COPY client/package*.json client/
COPY server/package*.json server/

RUN npm install
RUN npm install --prefix client
RUN npm install --prefix server

COPY . .

RUN npm --prefix client run build

EXPOSE 4000

CMD ["npm", "run", "start", "--prefix", "server"]
