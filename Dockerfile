FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# El worker de prospección arranca el bot, la cola y el scheduler.
CMD ["npx", "tsx", "prospecting/worker-entry.ts"]
