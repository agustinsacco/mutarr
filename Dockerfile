FROM node:18-slim as base
WORKDIR /mutarr/lib
COPY package.json /mutarr/lib/
RUN apt-get update && apt-get -y install python g++ make && rm -rf /var/cache/apt/*

FROM base as dependencies
COPY package-lock.json /mutarr/lib/
RUN npm set progress=false && \
    npm install --production

FROM dependencies as develop
ENV NODE_ENV=development
RUN npm set progress=false && \
    npm install
COPY . /mutarr/lib/
RUN npm run build

FROM base as release
ENV NODE_ENV=production
COPY --from=dependencies /mutarr/lib/node_modules /mutarr/lib/node_modules
COPY --from=develop /mutarr/lib/next.config.js /mutarr/lib/next.config.js
COPY --from=develop /mutarr/lib/build /mutarr/lib/build
COPY --from=develop /mutarr/lib/config /mutarr/lib/config
COPY --from=develop /mutarr/lib/public /mutarr/lib/public

CMD [ "npm", "start" ]
