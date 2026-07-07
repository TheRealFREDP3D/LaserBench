FROM node:lts-alpine
ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY ["package.json", "pnpm-lock.yaml", "./"]
RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile && mv node_modules ../
COPY . .
EXPOSE 3000
RUN chown -R node /usr/src/app
USER node
CMD ["pnpm", "start"]
