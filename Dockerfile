FROM alpine

ENV HOST 0.0.0.0


RUN apk --update --upgrade add \
      nodejs-npm \
      nodejs \
      bash \
      git \
      nano 

ADD ./ /root

WORKDIR /root 

RUN npm i && npm run build 





EXPOSE 80


CMD ["npm" , "start"]
# ENTRYPOINT ["ls -al"]

